import { NextRequest, NextResponse } from "next/server";
import { TaskOrchestrator } from "@/lib/intelligence/orchestrator";
import { IntelligenceConfig } from "@/lib/intelligence/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { objective, config } = body as { objective: string; config: IntelligenceConfig };

        if (!objective) {
            return NextResponse.json({ error: "Objective is required" }, { status: 400 });
        }

        const defaultConfig: IntelligenceConfig = {
            geminiModel: "gemini-3-pro-preview",
            openaiModel: "gpt-5.2",
            temperature: 0.7,
            maxIterations: 1,
            ...config,
        };

        const orchestrator = new TaskOrchestrator(defaultConfig);
        const tasks = await orchestrator.orchestrate(objective);

        // Push tasks to PROVENIQ Main
        // Since we are now INSIDE Main, we can just call the task API directly or via fetch to localhost
        // We will keep the fetch pattern for consistency/decoupling
        const pushResults = await Promise.all(
            tasks.map(async (task) => {
                try {
                    // Assuming the app is running on these ports, but in production we might want a relative path or direct DB call.
                    // For now, we use localhost:3004 (MAIN port)
                    const res = await fetch("http://localhost:3004/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(task),
                    });
                    return { id: task.id, pushed: res.ok };
                } catch (err) {
                    return { id: task.id, pushed: false, error: "Network error calling Task API" };
                }
            })
        );

        return NextResponse.json({ tasks, pushResults });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        console.error("Orchestration API Error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
