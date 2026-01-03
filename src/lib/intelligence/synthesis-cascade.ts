// ═══════════════════════════════════════════════════════════════
// SYNTHESIS CASCADE - 3-Model Truth-Finding Architecture
// ═══════════════════════════════════════════════════════════════
// Phase 1: Generation - All 3 models produce solutions (parallel)
// Phase 2: Critique - Each model critiques the other two (parallel)
// Phase 3: Synthesis - Rotating synthesizer merges best elements
// Phase 4: Validation - Other two vote Accept/Reject (2/3 required)
// ═══════════════════════════════════════════════════════════════

import {
    CascadeConfig,
    CascadeSession,
    CascadeRound,
    CascadePhase,
    ModelOutput,
    CritiqueOutput,
    ValidationVote,
    ModelProvider,
} from "./types";
import { GeminiProvider, OpenAIProvider, ClaudeProvider, LLMProvider } from "./llm-providers";

// Latest models as of Jan 2026
const DEFAULT_CONFIG: CascadeConfig = {
    geminiModel: "gemini-3-pro-preview",
    openaiModel: "gpt-5.2",
    claudeModel: "claude-sonnet-4-20250514",
    temperature: 0.7,
    maxValidationRounds: 3,
};

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────

const GENERATION_PROMPT = `
You are a world-class strategic advisor and code architect.
Your task is to provide the most insightful, robust, and actionable solution for the given topic.

Be bold, specific, and comprehensive. Do not hedge or provide generic advice.
If code is requested, provide complete, runnable code with all imports and dependencies.

Topic:
{{TOPIC}}
`;

const CRITIQUE_PROMPT = `
You are a critical analyst reviewing solutions from two other AI models.
Your job is to identify strengths and weaknesses in their approaches.

SOLUTION FROM {{PROVIDER_A}} ({{MODEL_A}}):
───────────────────────────────────────
{{SOLUTION_A}}

SOLUTION FROM {{PROVIDER_B}} ({{MODEL_B}}):
───────────────────────────────────────
{{SOLUTION_B}}

Provide your critique in this exact format:

## {{PROVIDER_A}} Critique
**Strengths:**
- [list specific strengths]

**Weaknesses:**
- [list specific weaknesses or blind spots]

## {{PROVIDER_B}} Critique
**Strengths:**
- [list specific strengths]

**Weaknesses:**
- [list specific weaknesses or blind spots]

## Key Insights
[What would the ideal solution incorporate from each?]
`;

const SYNTHESIS_PROMPT = `
You are the SYNTHESIZER. Your job is to create the BEST possible solution by combining the strengths of three AI models while avoiding their weaknesses.

ORIGINAL TOPIC:
{{TOPIC}}

═══════════════════════════════════════════════════════════════
GEMINI's SOLUTION:
{{GEMINI_SOLUTION}}

CRITIQUE OF GEMINI:
{{GEMINI_CRITIQUE}}

═══════════════════════════════════════════════════════════════
OPENAI's SOLUTION:
{{OPENAI_SOLUTION}}

CRITIQUE OF OPENAI:
{{OPENAI_CRITIQUE}}

═══════════════════════════════════════════════════════════════
CLAUDE's SOLUTION:
{{CLAUDE_SOLUTION}}

CRITIQUE OF CLAUDE:
{{CLAUDE_CRITIQUE}}

═══════════════════════════════════════════════════════════════

INSTRUCTIONS:
1. Identify the strongest elements from each solution
2. Address the weaknesses identified in the critiques
3. Synthesize into a single, optimal solution
4. Ensure completeness - the output must be immediately usable
5. Do NOT simply pick one solution - you must genuinely synthesize

Output your synthesized solution directly. No preamble.
`;

const VALIDATION_PROMPT = `
You are a VALIDATOR. A synthesized solution has been created from three AI models' outputs.
Your job is to vote: ACCEPT or REJECT.

ORIGINAL TOPIC:
{{TOPIC}}

SYNTHESIZED SOLUTION:
{{SYNTHESIS}}

Vote ACCEPT if:
- The synthesis genuinely incorporates the best elements
- It addresses the original topic comprehensively
- It is complete and immediately usable
- It represents an improvement over any single model's output

Vote REJECT if:
- The synthesis missed critical elements
- It introduced new errors or inconsistencies
- It is incomplete or unusable
- A single model's output was actually better

Respond in this exact format:
VOTE: [ACCEPT or REJECT]
REASONING: [Your detailed reasoning]
`;

// ─────────────────────────────────────────────────────────────────
// SYNTHESIS CASCADE CLASS
// ─────────────────────────────────────────────────────────────────

export class SynthesisCascade {
    private config: CascadeConfig;
    private gemini: GeminiProvider;
    private openai: OpenAIProvider;
    private claude: ClaudeProvider;
    private providers: Map<ModelProvider, LLMProvider>;
    private synthesizerRotation: ModelProvider[] = ["claude", "gemini", "openai"];
    private currentSynthesizerIndex = 0;

    constructor(config?: Partial<CascadeConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        this.gemini = new GeminiProvider(this.config.geminiModel, this.config.temperature);
        this.openai = new OpenAIProvider(this.config.openaiModel, this.config.temperature);
        this.claude = new ClaudeProvider(this.config.claudeModel, this.config.temperature);
        
        this.providers = new Map<ModelProvider, LLMProvider>([
            ["gemini", this.gemini],
            ["openai", this.openai],
            ["claude", this.claude],
        ]);
    }

    private getModelName(provider: ModelProvider): string {
        switch (provider) {
            case "gemini": return this.config.geminiModel;
            case "openai": return this.config.openaiModel;
            case "claude": return this.config.claudeModel;
        }
    }

    private async callProvider(
        provider: ModelProvider,
        systemPrompt: string,
        userPrompt: string
    ): Promise<ModelOutput> {
        const llm = this.providers.get(provider)!;
        const model = this.getModelName(provider);
        const startTime = Date.now();
        
        const content = await llm.call(systemPrompt, userPrompt);
        
        return {
            provider,
            model,
            content,
            timestamp: new Date().toISOString(),
            latencyMs: Date.now() - startTime,
        };
    }

    private getNextSynthesizer(): ModelProvider {
        const synthesizer = this.synthesizerRotation[this.currentSynthesizerIndex];
        this.currentSynthesizerIndex = (this.currentSynthesizerIndex + 1) % 3;
        return synthesizer;
    }

    private getValidators(synthesizer: ModelProvider): ModelProvider[] {
        return (["gemini", "openai", "claude"] as ModelProvider[]).filter(p => p !== synthesizer);
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 1: GENERATION
    // ─────────────────────────────────────────────────────────────
    private async runGeneration(topic: string): Promise<ModelOutput[]> {
        console.log("[Cascade] Phase 1: Generation - All models producing solutions...");
        
        const systemPrompt = GENERATION_PROMPT.replace("{{TOPIC}}", topic);
        
        const [geminiOutput, openaiOutput, claudeOutput] = await Promise.all([
            this.callProvider("gemini", systemPrompt, "Provide your solution:"),
            this.callProvider("openai", systemPrompt, "Provide your solution:"),
            this.callProvider("claude", systemPrompt, "Provide your solution:"),
        ]);

        return [geminiOutput, openaiOutput, claudeOutput];
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 2: CRITIQUE
    // ─────────────────────────────────────────────────────────────
    private async runCritique(generations: ModelOutput[]): Promise<CritiqueOutput[]> {
        console.log("[Cascade] Phase 2: Critique - Each model critiquing others...");
        
        const geminiSolution = generations.find(g => g.provider === "gemini")!.content;
        const openaiSolution = generations.find(g => g.provider === "openai")!.content;
        const claudeSolution = generations.find(g => g.provider === "claude")!.content;

        // Each model critiques the other two
        const buildCritiquePrompt = (
            providerA: ModelProvider,
            modelA: string,
            solutionA: string,
            providerB: ModelProvider,
            modelB: string,
            solutionB: string
        ) => {
            return CRITIQUE_PROMPT
                .replace(/\{\{PROVIDER_A\}\}/g, providerA.toUpperCase())
                .replace(/\{\{MODEL_A\}\}/g, modelA)
                .replace("{{SOLUTION_A}}", solutionA)
                .replace(/\{\{PROVIDER_B\}\}/g, providerB.toUpperCase())
                .replace(/\{\{MODEL_B\}\}/g, modelB)
                .replace("{{SOLUTION_B}}", solutionB);
        };

        const [geminiCritique, openaiCritique, claudeCritique] = await Promise.all([
            // Gemini critiques OpenAI and Claude
            this.callProvider(
                "gemini",
                buildCritiquePrompt(
                    "openai", this.config.openaiModel, openaiSolution,
                    "claude", this.config.claudeModel, claudeSolution
                ),
                "Provide your critique:"
            ),
            // OpenAI critiques Gemini and Claude
            this.callProvider(
                "openai",
                buildCritiquePrompt(
                    "gemini", this.config.geminiModel, geminiSolution,
                    "claude", this.config.claudeModel, claudeSolution
                ),
                "Provide your critique:"
            ),
            // Claude critiques Gemini and OpenAI
            this.callProvider(
                "claude",
                buildCritiquePrompt(
                    "gemini", this.config.geminiModel, geminiSolution,
                    "openai", this.config.openaiModel, openaiSolution
                ),
                "Provide your critique:"
            ),
        ]);

        // Parse critiques into structured format
        const parseCritique = (output: ModelOutput, targets: ModelProvider[]): CritiqueOutput => {
            return {
                ...output,
                targetProviders: targets,
                strengths: [], // Could parse from content if needed
                weaknesses: [],
            };
        };

        return [
            parseCritique(geminiCritique, ["openai", "claude"]),
            parseCritique(openaiCritique, ["gemini", "claude"]),
            parseCritique(claudeCritique, ["gemini", "openai"]),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 3: SYNTHESIS
    // ─────────────────────────────────────────────────────────────
    private async runSynthesis(
        topic: string,
        generations: ModelOutput[],
        critiques: CritiqueOutput[],
        synthesizer: ModelProvider
    ): Promise<ModelOutput> {
        console.log(`[Cascade] Phase 3: Synthesis - ${synthesizer.toUpperCase()} synthesizing...`);

        const geminiSolution = generations.find(g => g.provider === "gemini")!.content;
        const openaiSolution = generations.find(g => g.provider === "openai")!.content;
        const claudeSolution = generations.find(g => g.provider === "claude")!.content;

        // Aggregate critiques for each provider
        const getCritiquesFor = (provider: ModelProvider): string => {
            return critiques
                .filter(c => c.targetProviders.includes(provider))
                .map(c => `[From ${c.provider.toUpperCase()}]: ${c.content}`)
                .join("\n\n");
        };

        const systemPrompt = SYNTHESIS_PROMPT
            .replace("{{TOPIC}}", topic)
            .replace("{{GEMINI_SOLUTION}}", geminiSolution)
            .replace("{{GEMINI_CRITIQUE}}", getCritiquesFor("gemini"))
            .replace("{{OPENAI_SOLUTION}}", openaiSolution)
            .replace("{{OPENAI_CRITIQUE}}", getCritiquesFor("openai"))
            .replace("{{CLAUDE_SOLUTION}}", claudeSolution)
            .replace("{{CLAUDE_CRITIQUE}}", getCritiquesFor("claude"));

        return this.callProvider(synthesizer, systemPrompt, "Create the synthesized solution:");
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 4: VALIDATION
    // ─────────────────────────────────────────────────────────────
    private async runValidation(
        topic: string,
        synthesis: ModelOutput,
        validators: ModelProvider[]
    ): Promise<ValidationVote[]> {
        console.log(`[Cascade] Phase 4: Validation - ${validators.map(v => v.toUpperCase()).join(" & ")} voting...`);

        const systemPrompt = VALIDATION_PROMPT
            .replace("{{TOPIC}}", topic)
            .replace("{{SYNTHESIS}}", synthesis.content);

        const votePromises = validators.map(async (validator) => {
            const output = await this.callProvider(validator, systemPrompt, "Cast your vote:");
            
            // Parse vote from response
            const acceptMatch = output.content.match(/VOTE:\s*(ACCEPT|REJECT)/i);
            const reasoningMatch = output.content.match(/REASONING:\s*([\s\S]*)/i);
            
            return {
                provider: validator,
                model: this.getModelName(validator),
                accept: acceptMatch ? acceptMatch[1].toUpperCase() === "ACCEPT" : false,
                reasoning: reasoningMatch ? reasoningMatch[1].trim() : output.content,
                timestamp: output.timestamp,
            };
        });

        return Promise.all(votePromises);
    }

    // ─────────────────────────────────────────────────────────────
    // MAIN ORCHESTRATOR
    // ─────────────────────────────────────────────────────────────
    async run(
        topic: string,
        onUpdate?: (session: CascadeSession) => void
    ): Promise<CascadeSession> {
        const startTime = Date.now();
        
        const session: CascadeSession = {
            id: crypto.randomUUID(),
            topic,
            rounds: [],
            status: "running",
            consensusReached: false,
            totalLatencyMs: 0,
        };

        try {
            // PHASE 1: Generation
            const generations = await this.runGeneration(topic);
            
            let round: CascadeRound = {
                index: 0,
                phase: "generation",
                generations,
            };
            session.rounds.push(round);
            if (onUpdate) onUpdate({ ...session });

            // PHASE 2: Critique
            const critiques = await this.runCritique(generations);
            round = {
                index: 1,
                phase: "critique",
                critiques,
            };
            session.rounds.push(round);
            if (onUpdate) onUpdate({ ...session });

            // PHASE 3 & 4: Synthesis + Validation Loop
            let validationRound = 0;
            let currentGenerations = generations;
            let currentCritiques = critiques;

            while (validationRound < this.config.maxValidationRounds) {
                const synthesizer = this.getNextSynthesizer();
                const validators = this.getValidators(synthesizer);

                // Synthesis
                const synthesis = await this.runSynthesis(
                    topic,
                    currentGenerations,
                    currentCritiques,
                    synthesizer
                );

                // Validation
                const votes = await this.runValidation(topic, synthesis, validators);
                const acceptCount = votes.filter(v => v.accept).length;
                const consensusReached = acceptCount >= 2; // 2/3 majority (2 validators)

                round = {
                    index: session.rounds.length,
                    phase: consensusReached ? "complete" : "validation",
                    synthesis,
                    votes,
                    synthesizer,
                };
                session.rounds.push(round);
                if (onUpdate) onUpdate({ ...session });

                if (consensusReached) {
                    session.status = "completed";
                    session.consensusReached = true;
                    session.finalOutput = synthesis.content;
                    break;
                }

                // If rejected, the synthesis becomes a new "generation" for next round
                // and we need new critiques
                validationRound++;
                
                if (validationRound < this.config.maxValidationRounds) {
                    console.log(`[Cascade] Validation failed (${acceptCount}/2). Re-critiquing...`);
                    
                    // Add synthesis as a new generation alongside originals
                    currentGenerations = [
                        ...generations,
                        { ...synthesis, provider: synthesizer },
                    ];
                    
                    // Re-run critique phase with rejection feedback
                    currentCritiques = await this.runCritique(generations);
                }
            }

            // If we exhausted validation rounds without consensus
            if (!session.consensusReached) {
                session.status = "completed";
                session.consensusReached = false;
                // Use the last synthesis as final output
                const lastSynthesis = session.rounds
                    .filter(r => r.synthesis)
                    .pop()?.synthesis;
                session.finalOutput = lastSynthesis?.content || generations[0].content;
            }

        } catch (error: any) {
            console.error("[Cascade] Error:", error);
            session.status = "error";
            session.error = error.message;
        }

        session.totalLatencyMs = Date.now() - startTime;
        return session;
    }
}

// Export default config for reference
export { DEFAULT_CONFIG as CASCADE_DEFAULT_CONFIG };
