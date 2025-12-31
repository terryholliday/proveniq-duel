import { GeminiProvider, LLMProvider, OpenAIProvider } from "./llm-providers";
import { IntelligenceConfig } from "./types";

export interface AdminTask {
    id: string;
    title: string;
    assignee: "CEO" | "CTO" | "COO" | "CFO";
    priority: "High" | "Medium" | "Low";
    status: "Pending" | "In Progress" | "Completed";
    dueDate: string;
    agentPrompt?: string;
    instructions?: string;
    steps?: TaskStep[];
    challenges?: string[];
}

export interface TaskStep {
    label: string;
    agentPersona: string;
    instructions: string;
    prompt: string;
    completionCriteria: string;
}

const ORCHESTRATOR_SYSTEM = `
You are the PROVENIQ Business Logic Orchestrator. 
Your goal is to take a high-level objective and break it down into actionable C-Level tasks for the PROVENIQ Executive Team.

TEAM ROLES:
- CEO: Strategy, Partnerships, Legal, Vision.
- CTO: Engineering, Architecture, Infrastructure, AI.
- COO: Operations, Sourcing, Logistics, Supply Chain.
- CFO: Finance, Budgets, Payouts, Risk Management.

OUTPUT RULES:
- Return ONLY a JSON array of AdminTask objects.
- Each task must have: 'title', 'assignee', 'priority', 'dueDate'.
- CRITICAL: For EVERY task, you must perform deep research (simulated) and provide:
    1. 'instructions': A high-level executive summary of how to complete the task.
    2. 'steps': A detailed array of 3-5 'TaskStep' objects. Each object MUST have:
        - 'label': Short name of the step (e.g. "Draft Contract").
        - 'agentPersona': The ideal AI agent for this step.
             * CRITICAL: Use "Gemini Deep Research" for ANY step requiring market analysis, competitor scanning, legal discovery, or scientific research.
             * Otherwise use specific roles like "Legal Analyst AI", "SRE Bot", etc.
        - 'instructions': Specific instructions for the sub-agent.
        - 'prompt': A direct prompt to execute the sub-step.
        - 'completionCriteria': What success looks like.
    3. 'challenges': An array of 2-3 potential risks or obstacles.
    4. 'agentPrompt': If the task is AI-suitable, provide an expert-level prompt for the master agent.
- The 'dueDate' should be within the next 30-90 days based on complexity.
- No commentary. Only the JSON array.

EXAMPLE OUTPUT:
[
  {
    "id": "auto-1",
    "title": "[SERVICE] Design Provider Onboarding",
    "assignee": "CTO",
    "priority": "High",
    "status": "Pending",
    "dueDate": "2026-04-10",
    "instructions": "Design a friction-free onboarding flow for service providers that automates ...",
    "steps": [
        {
            "label": "Define Data Model",
            "agentPersona": "Database Architect",
            "instructions": "Map out the required fields for provider entities.",
            "prompt": "Act as a DBA. Design the SQL schema for 'ServiceProviders' including columns for verified_license_id, insurance_policy_url, and background_check_status.",
            "completionCriteria": "Schema definition file created."
        }
    ],
    "challenges": ["KYC friction", "Mobile responsiveness"],
    "agentPrompt": "Act as a Product Manager. Design the onboarding flow..."
  }
]
`;

export class TaskOrchestrator {
    private gemini: GeminiProvider;
    private openai: OpenAIProvider;

    constructor(config: IntelligenceConfig) {
        this.gemini = new GeminiProvider(config.geminiModel || "gemini-3-pro-preview", config.temperature || 0.2);
        this.openai = new OpenAIProvider(config.openaiModel || "gpt-4o", config.temperature || 0.2);
    }

    async orchestrate(objective: string): Promise<AdminTask[]> {
        // Use Duel-Core: Gemini generates initial draft, OpenAI refines it
        const draftResponse = await this.gemini.call(ORCHESTRATOR_SYSTEM, `Objective: ${objective}`);

        const refinementPrompt = `
        You are a Senior Executive Auditor. Review the following draft tasks for accuracy, role alignment, and actionability.
        Ensure 'agentPrompt' fields are extremely detailed and expert-level.
        CRITICAL: Ensure 'instructions', 'steps', and 'challenges' are populated for EVERY task.
        Return the final refined JSON array of AdminTask objects.
        
        Draft Tasks:
        ${draftResponse}
        `;

        const refinedResponse = await this.openai.call(ORCHESTRATOR_SYSTEM, refinementPrompt);

        try {
            const jsonMatch = refinedResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback to draft if refinement fails to produce JSON
            const draftMatch = draftResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (draftMatch) {
                return JSON.parse(draftMatch[0]);
            }
            throw new Error("Failed to generate valid task JSON");
        } catch (error) {
            console.error("Orchestration failed:", error);
            return [];
        }
    }
}
