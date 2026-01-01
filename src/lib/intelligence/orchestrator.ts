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
        this.openai = new OpenAIProvider(config.openaiModel || "gpt-5.2", config.temperature || 0.2);
    }

    async orchestrate(objective: string, maxRounds: number = 5): Promise<AdminTask[]> {
        const CRITIQUE_PROMPT = `
You are a ruthless executive strategist. Review the following task breakdown and ATTACK it:
1. Find weak reasoning, vague instructions, missing edge cases
2. Challenge role assignments - is this REALLY the right C-level owner?
3. Demand more specific, actionable steps
4. Call out any fluff or corporate BS
5. Rewrite the ENTIRE JSON with your improvements

If the tasks are already perfect and you cannot improve them further, respond with "[CONVERGED]" followed by the final JSON.

Current Tasks:
`;

        let currentResponse = "";
        let lastResponse = "";
        
        // Round 1: Gemini generates initial draft
        console.log(`[Duel] Round 1/5: Gemini drafting...`);
        currentResponse = await this.gemini.call(ORCHESTRATOR_SYSTEM, `Objective: ${objective}`);
        
        // Rounds 2-5: Alternating critique and refinement
        for (let round = 2; round <= maxRounds; round++) {
            const isGeminiTurn = round % 2 === 0;
            const attacker = isGeminiTurn ? this.openai : this.gemini;
            const attackerName = isGeminiTurn ? "OpenAI" : "Gemini";
            
            console.log(`[Duel] Round ${round}/${maxRounds}: ${attackerName} attacking...`);
            
            lastResponse = currentResponse;
            currentResponse = await attacker.call(
                ORCHESTRATOR_SYSTEM + CRITIQUE_PROMPT,
                currentResponse
            );
            
            // Check for convergence
            if (currentResponse.toUpperCase().includes("[CONVERGED]")) {
                console.log(`[Duel] Converged at round ${round}`);
                break;
            }
        }

        // Extract final JSON
        try {
            const jsonMatch = currentResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback to last response if current fails
            const lastMatch = lastResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (lastMatch) {
                return JSON.parse(lastMatch[0]);
            }
            throw new Error("Failed to generate valid task JSON");
        } catch (error) {
            console.error("Orchestration failed:", error);
            return [];
        }
    }
}
