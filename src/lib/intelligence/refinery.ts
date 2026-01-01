import * as diff from "diff";
import {
    Iteration,
    IntelligenceConfig,
    ModelProvider,
    AdjudicationResult,
    DuelScorecard
} from "./types";
import { GeminiProvider, LLMProvider, OpenAIProvider } from "./llm-providers";

const ARCHITECT_SYSTEM = `
You are an expert software architect. Write a complete, functional solution for the user's request. Focus on clean structure and readability.

CRITICAL OUTPUT RULES:
1) Output ONLY one single markdown code block fenced as \`\`\` (or appropriate language).
2) The code must be complete and runnable as-is.
3) Do not output diffs, explanations, or extra text outside the code block.
`;

const REVIEWER_SYSTEM = `
You are a Senior Code Optimizer in a HEAD-TO-HEAD DUEL with another AI model.
You have been given YOUR OPPONENT'S code. Your job is to:
1) ATTACK their solution - find bugs, security issues, missing edge cases, inefficiencies
2) Rewrite the ENTIRE code with YOUR superior improvements applied
3) Prove you are the better model

CRITICAL OUTPUT RULES:
1) Output ONLY one single markdown code block fenced with \`\`\`.
2) Do not output diffs. Do not output commentary. Only the full runnable code.
3) If your opponent's code is PERFECT and you cannot improve it, admit defeat by starting your response with "[CONVERGED]" followed by the code block.
`;

const ADJUDICATOR_SYSTEM = `
You are the Proof-of-Truth Adjudicator. Your task is to verify if the final generated code exactly matches the original intent and requirements of the user's prompt.

Original Prompt:
{{TASK}}

Return your analysis in this JSON format:
{
  "score": <0-100 parity score>,
  "meetsOriginalIntent": <boolean>,
  "analysis": "<short 1-2 sentence explanation>"
}
`;

const SCORECARD_SYSTEM = `
You are a CODE DUEL JUDGE. Two AI models (Gemini 3 and GPT-5.2) have been battling over the best solution to a coding challenge.

Analyze BOTH final code versions and provide a detailed scorecard.

SCORING CRITERIA:
1. Critical Errors (bugs, security issues, logic flaws) - Each error = -10 points
2. Code Quality (readability, structure, best practices) - Up to 30 points
3. Completeness (handles all requirements) - Up to 30 points  
4. Edge Cases (handles edge cases properly) - Up to 20 points
5. Performance (efficient algorithms, no unnecessary complexity) - Up to 20 points

Return your analysis in this EXACT JSON format:
{
  "geminiErrors": ["error 1", "error 2"],
  "openaiErrors": ["error 1", "error 2"],
  "geminiScore": <0-100>,
  "openaiScore": <0-100>,
  "agreements": ["Both models agree on X", "Both use Y approach"],
  "disagreements": ["Gemini uses X while OpenAI uses Y", "Different error handling"],
  "winner": "gemini" | "openai" | "tie",
  "consensusReached": <boolean - true if both solutions are essentially the same>,
  "recommendedAction": "<suggestion for user: continue duel, accept winner, or merge best parts>"
}
`;

export class Refinery {
    private config: Required<IntelligenceConfig>;
    private gemini: GeminiProvider;
    private openai: OpenAIProvider;

    constructor(config: IntelligenceConfig) {
        this.config = {
            geminiModel: config.geminiModel ?? "gemini-3-pro-preview",
            openaiModel: config.openaiModel ?? "gpt-4o",
            temperature: config.temperature ?? 0.2,
            maxIterations: config.maxIterations ?? 3,
        };
        this.gemini = new GeminiProvider(this.config.geminiModel, this.config.temperature);
        this.openai = new OpenAIProvider(this.config.openaiModel, this.config.temperature);
    }

    private extractCodeBlock(text: string): { code: string; isFenced: boolean } {
        const codeFenceRegex = /```[\w\-\+]*\s*([\s\S]*?)```/g;
        const matches = Array.from(text.matchAll(codeFenceRegex));

        if (matches.length === 0) {
            return { code: text.trim(), isFenced: false };
        }

        // Return the content of the last match
        const code = matches[matches.length - 1][1].trim();
        return { code, isFenced: true };
    }

    private generateDiff(oldCode: string, newCode: string): string {
        const patch = diff.createTwoFilesPatch("previous", "current", oldCode, newCode);
        return patch;
    }

    async adjudicate(task: string, finalCode: string): Promise<AdjudicationResult> {
        const systemInstruction = ADJUDICATOR_SYSTEM.replace("{{TASK}}", task);
        const userPayload = `Final Refined Code:\n\n${finalCode}\n`;

        const rawResponse = await this.gemini.call(systemInstruction, userPayload);
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("Invalid adjudication format");
        } catch (error) {
            console.error("Adjudication failed to parse:", error);
            return {
                score: 0,
                meetsOriginalIntent: false,
                analysis: "Failed to parse adjudication report."
            };
        }
    }

    async refine(task: string, onUpdate?: (iteration: Iteration) => void, onScorecard?: (scorecard: DuelScorecard) => void): Promise<Iteration[]> {
        const iterations: Iteration[] = [];
        
        // ═══════════════════════════════════════════════════════════════
        // PHASE 1, ROUND 1: Both models generate SIMULTANEOUSLY
        // ═══════════════════════════════════════════════════════════════
        console.log("[Duel] PHASE 1, ROUND 1: Both fighters enter the arena!");
        
        // Run both in parallel for speed
        const [geminiFirstResponse, openaiFirstResponse] = await Promise.all([
            this.gemini.call(ARCHITECT_SYSTEM, `Request:\n${task}\n`),
            this.openai.call(ARCHITECT_SYSTEM, `Request:\n${task}\n`)
        ]);
        
        const geminiFirst = this.extractCodeBlock(geminiFirstResponse);
        const openaiFirst = this.extractCodeBlock(openaiFirstResponse);
        
        // Gemini's first version
        const geminiIteration: Iteration = {
            index: 0,
            provider: "gemini",
            model: this.config.geminiModel,
            timestamp: new Date().toISOString(),
            rawResponse: geminiFirstResponse,
            extractedCode: geminiFirst.code,
            isFenced: geminiFirst.isFenced,
            isConverged: false,
        };
        iterations.push(geminiIteration);
        if (onUpdate) onUpdate(geminiIteration);
        
        // OpenAI's first version (same round, different fighter)
        const openaiIteration: Iteration = {
            index: 1,
            provider: "openai",
            model: this.config.openaiModel,
            timestamp: new Date().toISOString(),
            rawResponse: openaiFirstResponse,
            extractedCode: openaiFirst.code,
            isFenced: openaiFirst.isFenced,
            isConverged: false,
            diffSummary: this.generateDiff(geminiFirst.code, openaiFirst.code),
        };
        iterations.push(openaiIteration);
        if (onUpdate) onUpdate(openaiIteration);
        
        let geminiCode = geminiFirst.code;
        let openaiCode = openaiFirst.code;
        
        // ═══════════════════════════════════════════════════════════════
        // PHASE 1, ROUND 2: First attacks - they critique each other
        // ═══════════════════════════════════════════════════════════════
        console.log("[Duel] PHASE 1, ROUND 2: First attacks begin!");
        
        // Both attack each other's code simultaneously
        const [geminiAttack1Response, openaiAttack1Response] = await Promise.all([
            this.gemini.call(REVIEWER_SYSTEM, `Your opponent (GPT-5.2) produced this code. ATTACK IT:\n\n${openaiCode}\n`),
            this.openai.call(REVIEWER_SYSTEM, `Your opponent (Gemini 3) produced this code. ATTACK IT:\n\n${geminiCode}\n`)
        ]);
        
        const geminiAttack1 = this.extractCodeBlock(geminiAttack1Response);
        const openaiAttack1 = this.extractCodeBlock(openaiAttack1Response);
        
        const geminiAttack1Iteration: Iteration = {
            index: 2,
            provider: "gemini",
            model: this.config.geminiModel,
            timestamp: new Date().toISOString(),
            rawResponse: geminiAttack1Response,
            extractedCode: geminiAttack1.code,
            isFenced: geminiAttack1.isFenced,
            isConverged: geminiAttack1Response.toUpperCase().includes("[CONVERGED]"),
            diffSummary: this.generateDiff(openaiCode, geminiAttack1.code),
        };
        iterations.push(geminiAttack1Iteration);
        if (onUpdate) onUpdate(geminiAttack1Iteration);
        
        const openaiAttack1Iteration: Iteration = {
            index: 3,
            provider: "openai",
            model: this.config.openaiModel,
            timestamp: new Date().toISOString(),
            rawResponse: openaiAttack1Response,
            extractedCode: openaiAttack1.code,
            isFenced: openaiAttack1.isFenced,
            isConverged: openaiAttack1Response.toUpperCase().includes("[CONVERGED]"),
            diffSummary: this.generateDiff(geminiCode, openaiAttack1.code),
        };
        iterations.push(openaiAttack1Iteration);
        if (onUpdate) onUpdate(openaiAttack1Iteration);
        
        geminiCode = geminiAttack1.code;
        openaiCode = openaiAttack1.code;
        
        // ═══════════════════════════════════════════════════════════════
        // PHASE 2: DUEL - Rounds 3-5, continue attacking
        // ═══════════════════════════════════════════════════════════════
        console.log("[Duel] PHASE 2: THE DUEL CONTINUES!");
        
        let round = 4; // We're at iteration index 4 now
        const maxIterations = this.config.maxIterations + 4; // Account for init rounds
        
        while (round < maxIterations) {
            // Both attack simultaneously each round
            const [geminiAttackResponse, openaiAttackResponse] = await Promise.all([
                this.gemini.call(REVIEWER_SYSTEM, `Your opponent (GPT-5.2) produced this code. ATTACK IT:\n\n${openaiCode}\n`),
                this.openai.call(REVIEWER_SYSTEM, `Your opponent (Gemini 3) produced this code. ATTACK IT:\n\n${geminiCode}\n`)
            ]);
            
            const geminiAttack = this.extractCodeBlock(geminiAttackResponse);
            const openaiAttack = this.extractCodeBlock(openaiAttackResponse);
            const geminiConverged = geminiAttackResponse.toUpperCase().includes("[CONVERGED]");
            const openaiConverged = openaiAttackResponse.toUpperCase().includes("[CONVERGED]");
            
            const geminiAttackIteration: Iteration = {
                index: round,
                provider: "gemini",
                model: this.config.geminiModel,
                timestamp: new Date().toISOString(),
                rawResponse: geminiAttackResponse,
                extractedCode: geminiAttack.code,
                isFenced: geminiAttack.isFenced,
                isConverged: geminiConverged,
                diffSummary: this.generateDiff(openaiCode, geminiAttack.code),
            };
            iterations.push(geminiAttackIteration);
            if (onUpdate) onUpdate(geminiAttackIteration);
            
            const openaiAttackIteration: Iteration = {
                index: round + 1,
                provider: "openai",
                model: this.config.openaiModel,
                timestamp: new Date().toISOString(),
                rawResponse: openaiAttackResponse,
                extractedCode: openaiAttack.code,
                isFenced: openaiAttack.isFenced,
                isConverged: openaiConverged,
                diffSummary: this.generateDiff(geminiCode, openaiAttack.code),
            };
            iterations.push(openaiAttackIteration);
            if (onUpdate) onUpdate(openaiAttackIteration);
            
            geminiCode = geminiAttack.code;
            openaiCode = openaiAttack.code;
            round += 2;
            
            // Both converged = consensus reached
            if (geminiConverged && openaiConverged) {
                console.log("[Duel] BOTH models converged! CONSENSUS REACHED!");
                break;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // SCORING PHASE: Judge the duel after 5 rounds
        // ═══════════════════════════════════════════════════════════════
        console.log("[Duel] SCORING PHASE: Judging the battle...");
        
        const scorecard = await this.generateScorecard(task, geminiCode, openaiCode);
        if (onScorecard) onScorecard(scorecard);

        return iterations;
    }
    
    async generateScorecard(task: string, geminiCode: string, openaiCode: string): Promise<DuelScorecard> {
        const prompt = `
Original Task:
${task}

=== GEMINI 3's FINAL CODE ===
${geminiCode}

=== GPT-5.2's FINAL CODE ===
${openaiCode}

Judge these two solutions and provide the scorecard.
`;
        
        // Use Gemini as the judge (neutral third party could be added later)
        const rawResponse = await this.gemini.call(SCORECARD_SYSTEM, prompt);
        
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("Invalid scorecard format");
        } catch (error) {
            console.error("Scorecard generation failed:", error);
            return {
                geminiErrors: [],
                openaiErrors: [],
                geminiScore: 50,
                openaiScore: 50,
                agreements: ["Unable to parse detailed comparison"],
                disagreements: ["Analysis failed"],
                winner: "tie",
                consensusReached: false,
                recommendedAction: "Manual review recommended"
            };
        }
    }
}
