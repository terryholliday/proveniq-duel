export type ModelProvider = "gemini" | "openai";

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
    geminiModel?: string; // e.g. "gemini-3"
    openaiModel?: string; // e.g. "gpt-5.2"
    temperature?: number;
    maxIterations?: number;
}
