export type ModelProvider = "gemini" | "openai" | "claude";

export interface Iteration {
    index: number;
    provider: ModelProvider;
    model: string;
    timestamp: string;
    rawResponse: string;
    extractedCode: string;
    isFenced: boolean;
    isConverged: boolean;
    diffSummary?: string;
}

export interface RefinementSession {
    id: string;
    task: string;
    iterations: Iteration[];
    status: "idle" | "running" | "completed" | "error";
    adjudication?: AdjudicationResult;
    error?: string;
    finalRating?: FinalRating;
}

export interface AdjudicationResult {
    score: number; // 0-100 parity score
    analysis: string;
    meetsOriginalIntent: boolean;
}

export interface DuelScorecard {
    geminiErrors: string[];
    openaiErrors: string[];
    geminiScore: number;
    openaiScore: number;
    agreements: string[];
    disagreements: string[];
    winner: "gemini" | "openai" | "tie";
    consensusReached: boolean;
    recommendedAction: string;
}

export interface DuelState {
    phase: "init" | "duel" | "scoring" | "review" | "complete";
    round: number;
    maxRounds: number;
    geminiCode: string;
    openaiCode: string;
    scorecard?: DuelScorecard;
    awaitingUserDecision: boolean;
}

export interface AdminTask {
    id: string;
    title: string;
    status: "todo" | "in-progress" | "done";
    priority: "low" | "medium" | "high";
    assignee: "CEO" | "CTO" | "COO" | "CFO";
    dueDate: string;
    agentPrompt?: string; // If present, this task is AI-suitable

    // Enriched AI Data
    instructions?: string; // High-level "How-To"
    steps?: TaskStep[]; // Agentic Sub-Tasks
    challenges?: string[]; // Potential pitfalls
}

export interface TaskStep {
    label: string;
    agentPersona: string;
    instructions: string;
    prompt: string;
    completionCriteria: string;
    recommendedApp?: "Antigravity" | "Windsurf" | "Cursor"; // Tool Recommendation
}

export interface FinalRating {
    gemini: RatingResult;
    openai: RatingResult;
}

export interface RatingResult {
    score: number;
    suggestions: string[];
    rawResponse: string;
}

export interface IntelligenceConfig {
    geminiModel?: string; // e.g. "gemini-2.5-pro"
    openaiModel?: string; // e.g. "gpt-4o"
    claudeModel?: string; // e.g. "claude-sonnet-4-20250514"
    temperature?: number;
    maxIterations?: number;
}

// ═══════════════════════════════════════════════════════════════
// SYNTHESIS CASCADE TYPES (3-Model Architecture)
// ═══════════════════════════════════════════════════════════════

export interface CascadeConfig {
    geminiModel: string;
    openaiModel: string;
    claudeModel: string;
    temperature: number;
    maxValidationRounds: number;
}

export type CascadePhase = "generation" | "critique" | "synthesis" | "validation" | "complete" | "error";

export interface ModelOutput {
    provider: ModelProvider;
    model: string;
    content: string;
    timestamp: string;
    latencyMs: number;
}

export interface CritiqueOutput extends ModelOutput {
    targetProviders: ModelProvider[]; // Who this critique is about
    strengths: string[];
    weaknesses: string[];
}

export interface ValidationVote {
    provider: ModelProvider;
    model: string;
    accept: boolean;
    reasoning: string;
    timestamp: string;
}

export interface CascadeRound {
    index: number;
    phase: CascadePhase;
    generations?: ModelOutput[];
    critiques?: CritiqueOutput[];
    synthesis?: ModelOutput;
    votes?: ValidationVote[];
    synthesizer?: ModelProvider;
}

export interface CascadeSession {
    id: string;
    topic: string;
    rounds: CascadeRound[];
    status: "running" | "completed" | "error";
    finalOutput?: string;
    consensusReached: boolean;
    totalLatencyMs: number;
    error?: string;
}

export interface DuelTurn {
    provider: ModelProvider;
    model: string;
    content: string;
    timestamp: string;
    isAgreement: boolean;
}

export interface DuelRound {
    index: number;
    turns: DuelTurn[];
}

export interface DuelSession {
    id: string;
    topic: string;
    rounds: DuelRound[];
    status: "running" | "completed" | "error";
    consensus?: string;
    error?: string;
}
