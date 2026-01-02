import { GeminiProvider, OpenAIProvider } from "./llm-providers";
import { IntelligenceConfig, DuelScorecard } from "./types";

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

const TASK_SCORECARD_SYSTEM = `
You are a TASK DUEL JUDGE. Two AI models (Gemini 3 and GPT-5.2) have created competing task breakdowns for a business objective.

Analyze BOTH task lists and provide a detailed scorecard.

SCORING CRITERIA:
1. Completeness (covers all aspects of objective) - Up to 25 points
2. Actionability (tasks are specific and executable) - Up to 25 points
3. Role Assignment (correct C-level owners) - Up to 20 points
4. Timeline Realism (due dates are achievable) - Up to 15 points
5. Risk Awareness (challenges identified) - Up to 15 points

Return your analysis in this EXACT JSON format:
{
  "geminiErrors": ["missing X", "vague Y"],
  "openaiErrors": ["missing X", "vague Y"],
  "geminiScore": <0-100>,
  "openaiScore": <0-100>,
  "agreements": ["Both assign X to CTO", "Both identify Y risk"],
  "disagreements": ["Gemini assigns to CEO, OpenAI to COO", "Different timelines"],
  "winner": "gemini" | "openai" | "tie",
  "consensusReached": <boolean>,
  "recommendedAction": "<suggestion for user>"
}
`;

export interface OrchestratorIteration {
    index: number;
    provider: "gemini" | "openai";
    tasks: AdminTask[];
    rawResponse: string;
    isConverged: boolean;
}

export class TaskOrchestrator {
    private gemini: GeminiProvider;
    private openai: OpenAIProvider;
    private config: IntelligenceConfig;

    constructor(config: IntelligenceConfig) {
        this.config = config;
        this.gemini = new GeminiProvider(config.geminiModel || "gemini-3-pro-preview", config.temperature || 0.2);
        this.openai = new OpenAIProvider(config.openaiModel || "gpt-5.2", config.temperature || 0.2);
    }

    private extractTasks(response: string): AdminTask[] {
        try {
            const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        } catch {
            return [];
        }
    }

    async orchestrate(
        objective: string, 
        maxRounds: number = 5,
        onUpdate?: (iteration: OrchestratorIteration) => void,
        onScorecard?: (scorecard: DuelScorecard) => void
    ): Promise<{ geminiTasks: AdminTask[]; openaiTasks: AdminTask[]; scorecard: DuelScorecard | null }> {
        
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

        // ═══════════════════════════════════════════════════════════════
        // PHASE 1, ROUND 1: Both models generate task breakdowns SIMULTANEOUSLY
        // ═══════════════════════════════════════════════════════════════
        console.log("[Orchestrator Duel] PHASE 1, ROUND 1: Both models generating task breakdowns!");
        
        const [geminiFirstResponse, openaiFirstResponse] = await Promise.all([
            this.gemini.call(ORCHESTRATOR_SYSTEM, `Objective: ${objective}`),
            this.openai.call(ORCHESTRATOR_SYSTEM, `Objective: ${objective}`)
        ]);
        
        let geminiTasks = this.extractTasks(geminiFirstResponse);
        let openaiTasks = this.extractTasks(openaiFirstResponse);
        
        if (onUpdate) {
            onUpdate({ index: 0, provider: "gemini", tasks: geminiTasks, rawResponse: geminiFirstResponse, isConverged: false });
            onUpdate({ index: 1, provider: "openai", tasks: openaiTasks, rawResponse: openaiFirstResponse, isConverged: false });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // PHASE 1, ROUND 2: First attacks - they critique each other
        // ═══════════════════════════════════════════════════════════════
        console.log("[Orchestrator Duel] PHASE 1, ROUND 2: First attacks!");
        
        const [geminiAttack1, openaiAttack1] = await Promise.all([
            this.gemini.call(ORCHESTRATOR_SYSTEM + CRITIQUE_PROMPT, JSON.stringify(openaiTasks, null, 2)),
            this.openai.call(ORCHESTRATOR_SYSTEM + CRITIQUE_PROMPT, JSON.stringify(geminiTasks, null, 2))
        ]);
        
        geminiTasks = this.extractTasks(geminiAttack1);
        openaiTasks = this.extractTasks(openaiAttack1);
        
        if (onUpdate) {
            onUpdate({ index: 2, provider: "gemini", tasks: geminiTasks, rawResponse: geminiAttack1, isConverged: geminiAttack1.toUpperCase().includes("[CONVERGED]") });
            onUpdate({ index: 3, provider: "openai", tasks: openaiTasks, rawResponse: openaiAttack1, isConverged: openaiAttack1.toUpperCase().includes("[CONVERGED]") });
        }
        
        // ═══════════════════════════════════════════════════════════════
        // PHASE 2: DUEL - Rounds 3-5, continue attacking
        // ═══════════════════════════════════════════════════════════════
        console.log("[Orchestrator Duel] PHASE 2: THE DUEL CONTINUES!");
        
        let round = 4;
        const maxIterations = maxRounds * 2 + 2;
        
        while (round < maxIterations) {
            const [geminiAttackResponse, openaiAttackResponse] = await Promise.all([
                this.gemini.call(ORCHESTRATOR_SYSTEM + CRITIQUE_PROMPT, JSON.stringify(openaiTasks, null, 2)),
                this.openai.call(ORCHESTRATOR_SYSTEM + CRITIQUE_PROMPT, JSON.stringify(geminiTasks, null, 2))
            ]);
            
            const geminiConverged = geminiAttackResponse.toUpperCase().includes("[CONVERGED]");
            const openaiConverged = openaiAttackResponse.toUpperCase().includes("[CONVERGED]");
            
            geminiTasks = this.extractTasks(geminiAttackResponse);
            openaiTasks = this.extractTasks(openaiAttackResponse);
            
            if (onUpdate) {
                onUpdate({ index: round, provider: "gemini", tasks: geminiTasks, rawResponse: geminiAttackResponse, isConverged: geminiConverged });
                onUpdate({ index: round + 1, provider: "openai", tasks: openaiTasks, rawResponse: openaiAttackResponse, isConverged: openaiConverged });
            }
            
            round += 2;
            
            if (geminiConverged && openaiConverged) {
                console.log("[Orchestrator Duel] BOTH models converged! CONSENSUS REACHED!");
                break;
            }
        }
        
        // ═══════════════════════════════════════════════════════════════
        // SCORING PHASE: Judge the task breakdowns
        // ═══════════════════════════════════════════════════════════════
        console.log("[Orchestrator Duel] SCORING PHASE: Judging the battle...");
        
        const scorecard = await this.generateScorecard(objective, geminiTasks, openaiTasks);
        if (onScorecard) onScorecard(scorecard);
        
        return { geminiTasks, openaiTasks, scorecard };
    }
    
    async generateScorecard(objective: string, geminiTasks: AdminTask[], openaiTasks: AdminTask[]): Promise<DuelScorecard> {
        const prompt = `
Original Objective:
${objective}

=== GEMINI 3's TASK BREAKDOWN ===
${JSON.stringify(geminiTasks, null, 2)}

=== GPT-5.2's TASK BREAKDOWN ===
${JSON.stringify(openaiTasks, null, 2)}

Judge these two task breakdowns and provide the scorecard.
`;
        
        const rawResponse = await this.gemini.call(TASK_SCORECARD_SYSTEM, prompt);
        
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
