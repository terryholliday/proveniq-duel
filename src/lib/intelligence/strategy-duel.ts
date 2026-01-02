import {
    IntelligenceConfig,
    ModelProvider,
    DuelSession,
    DuelRound,
    DuelTurn
} from "./types";
import { GeminiProvider, OpenAIProvider, LLMProvider } from "./llm-providers";

const SYSTEM_PROMPT_OPENER = `
You are a strategic advisor participating in a high-stakes debate.
Your goal is to provide the most insightful, robust, and actionable strategy for the user's topic.

Topic:
{{TOPIC}}

Provide your initial strategic analysis. Be bold, specific, and comprehensive.
`;

const SYSTEM_PROMPT_DEBATER = `
You are a strategic advisor in a debate. You have just heard an argument from your counterpart.

Counterpart's Argument:
{{OPPONENT_ARGUMENT}}

Your goal is to:
1. Critically analyze their points. Identify weaknesses, blind spots, or generic advice.
2. Defend your previous position if it was strong, or pivot if they made a better point.
3. Propose a refined strategy that incorporates the best of both views but maintains your unique perspective.
4. If you believe you and your counterpart have reached a solid consensus and no further debate will add value, start your response with "[AGREE]".

Focus on synthesis and elevation of the strategy. Do not just argue for the sake of arguing.
`;

const TOOLING_DECISION_RULE = `
## Tooling Decision (Locked)
✅ You should use BOTH — with strict separation of concerns

**This is not optional if you want institutional reliability.**

### Antigravity — Design Authority / Canon Freezer

**Role**
- Governance
- Threat modeling
- Policy validation
- Auditor / insurer language
- Schema correctness
- Non-determinism & privacy guardrails

**Use Antigravity to:**
- Validate the Golden Master Prompt
- Freeze schemas, policies, event taxonomies
- Review changes only if v2.0 is ever proposed
- Produce audit-facing artifacts (SOC 2, insurer diligence)
- Model guidance: Use the lowest-cost Antigravity model that reliably follows long structured specs. If it drops constraints → bump one tier, but do not default high

### Windsurf — Execution Engine

**Role**
- Code generation
- Backend + mobile implementation
- Ledger plumbing
- Async pipelines
- Tests
- CI/CD artifacts

**Use Windsurf to:**
- Implement exactly what the Golden Master specifies
- Generate code, migrations, APIs, workers
- Create Jira/Linear tickets
- Run red-team test cases

### Rule
**Windsurf may not reinterpret policy.**
If something is unclear, it must quote the Golden Master verbatim and stop.
`;

export class StrategyDuel {
    private config: IntelligenceConfig;
    private gemini: GeminiProvider;
    private openai: OpenAIProvider;

    constructor(config: IntelligenceConfig) {
        this.config = config;
        this.gemini = new GeminiProvider(config.geminiModel ?? "gemini-2.5-flash", config.temperature ?? 0.7);
        this.openai = new OpenAIProvider(config.openaiModel ?? "gpt-4o", config.temperature ?? 0.7);
    }

    private async generateTurn(
        providerType: ModelProvider,
        prompt: string,
        systemPrompt: string
    ): Promise<DuelTurn> {
        const provider: LLMProvider = providerType === "gemini" ? this.gemini : this.openai;
        const modelName = providerType === "gemini"
            ? (this.config.geminiModel ?? "gemini-2.5-flash")
            : (this.config.openaiModel ?? "gpt-4o");

        const rawResponse = await provider.call(systemPrompt, prompt);
        const isAgreement = rawResponse.includes("[AGREE]");

        // Clean up the response if it starts with the agreement token
        const content = isAgreement ? rawResponse.replace("[AGREE]", "").trim() : rawResponse;

        return {
            provider: providerType,
            model: modelName,
            content,
            timestamp: new Date().toISOString(),
            isAgreement
        };
    }

    async run(topic: string, onUpdate?: (session: DuelSession) => void): Promise<DuelSession> {
        const session: DuelSession = {
            id: crypto.randomUUID(),
            topic,
            rounds: [],
            status: "running"
        };

        try {
            // Round 1: Opening Statements (Parallel)
            const round1Index = 0;
            const openerPrompt = `Please provide your initial strategy for: ${topic}`;
            const openerSystem = SYSTEM_PROMPT_OPENER.replace("{{TOPIC}}", topic);

            const [geminiTurn1, openaiTurn1] = await Promise.all([
                this.generateTurn("gemini", openerPrompt, openerSystem),
                this.generateTurn("openai", openerPrompt, openerSystem)
            ]);

            const round1: DuelRound = {
                index: round1Index,
                turns: [geminiTurn1, openaiTurn1]
            };
            session.rounds.push(round1);
            if (onUpdate) onUpdate(session);

            // Rounds 2+: Debate Loop
            const maxRounds = this.config.maxIterations ?? 5;
            let lastGeminiContent = geminiTurn1.content;
            let lastOpenaiContent = openaiTurn1.content;

            for (let i = 1; i < maxRounds; i++) {
                // Both models respond to opponent's PREVIOUS round in parallel
                const geminiSystem = SYSTEM_PROMPT_DEBATER.replace("{{OPPONENT_ARGUMENT}}", lastOpenaiContent);
                const openaiSystem = SYSTEM_PROMPT_DEBATER.replace("{{OPPONENT_ARGUMENT}}", lastGeminiContent);

                const [geminiTurn, openaiTurn] = await Promise.all([
                    this.generateTurn("gemini", "Your rebuttal/refinement:", geminiSystem),
                    this.generateTurn("openai", "Your rebuttal/refinement:", openaiSystem)
                ]);

                const round: DuelRound = {
                    index: i,
                    turns: [geminiTurn, openaiTurn]
                };
                session.rounds.push(round);
                if (onUpdate) onUpdate(session);

                lastGeminiContent = geminiTurn.content;
                lastOpenaiContent = openaiTurn.content;

                // Check for consensus
                if (geminiTurn.isAgreement && openaiTurn.isAgreement) {
                    session.status = "completed";
                    session.consensus = `Consensus reached in round ${i + 1}. Both models agreed on a unified strategy.\n\n${TOOLING_DECISION_RULE}`;
                    break;
                }
            }

            if (session.status === "running") {
                session.status = "completed";
                session.consensus = `Max rounds reached. Review the final arguments for the most refined strategy.\n\n${TOOLING_DECISION_RULE}`;
            }

        } catch (error: any) {
            console.error("Duel failed:", error);
            session.status = "error";
            session.error = error.message;
        }

        return session;
    }
}
