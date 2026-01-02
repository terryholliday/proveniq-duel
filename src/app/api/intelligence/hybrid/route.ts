import { NextRequest } from "next/server";
import { Refinery } from "@/lib/intelligence/refinery";
import { StrategyDuel } from "@/lib/intelligence/strategy-duel";
import { IntelligenceConfig } from "@/lib/intelligence/types";

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const body = await req.json();
                const { task, config } = body as { task: string; config?: IntelligenceConfig };

                if (!task) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Task is required" })}\n\n`));
                    controller.close();
                    return;
                }

                const defaultConfig: IntelligenceConfig = {
                    geminiModel: "gemini-3-pro-preview",
                    openaiModel: "gpt-5.2",
                    temperature: 0.7,
                    maxIterations: 3,
                    ...config,
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: "start", 
                    message: "🚀 Initializing dual-track execution: Code Generation + Strategic Analysis"
                })}\n\n`));

                // Run both in parallel
                const [codeResult, strategyResult] = await Promise.all([
                    // Code generation track
                    (async () => {
                        const refinery = new Refinery(defaultConfig);
                        const iterations: any[] = [];
                        
                        await refinery.refine(task, (iteration) => {
                            iterations.push(iteration);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                type: "code_iteration",
                                iteration
                            })}\n\n`));
                        });

                        const finalCode = iterations[iterations.length - 1]?.extractedCode || "";
                        const adjudication = await refinery.adjudicate(task, finalCode);
                        
                        return { iterations, adjudication };
                    })(),

                    // Strategy debate track
                    (async () => {
                        const duel = new StrategyDuel(defaultConfig);
                        
                        const session = await duel.run(task, (updatedSession) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                type: "strategy_update",
                                session: updatedSession
                            })}\n\n`));
                        });

                        return session;
                    })()
                ]);

                // Send completion
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: "complete",
                    codeIterations: codeResult.iterations,
                    adjudication: codeResult.adjudication,
                    strategySession: strategyResult
                })}\n\n`));

                controller.close();
            } catch (error: any) {
                console.error("Hybrid execution error:", error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: "error",
                    message: error.message || "An unexpected error occurred"
                })}\n\n`));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
