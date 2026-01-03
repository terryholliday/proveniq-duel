// ═══════════════════════════════════════════════════════════════
// SYNTHESIS CASCADE API ROUTE (STREAMING)
// 3-Model Truth-Finding Architecture with Server-Sent Events
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import { SynthesisCascade } from "@/lib/intelligence/synthesis-cascade";
import { CascadeConfig, CascadeSession } from "@/lib/intelligence/types";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, config } = body as {
            topic: string;
            config?: Partial<CascadeConfig>;
        };

        if (!topic || typeof topic !== "string") {
            return new Response(
                JSON.stringify({ error: "Topic is required and must be a string" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate API keys are present
        if (!process.env.OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        if (!process.env.GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
        if (!process.env.CLAUDE_API_KEY) {
            return new Response(
                JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`[Cascade API] Starting streaming cascade for topic: ${topic.substring(0, 100)}...`);

        // Create SSE stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event: string, data: any) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    const cascade = new SynthesisCascade(config);
                    
                    // Run cascade with progress callback
                    const session = await cascade.run(topic, (update: CascadeSession) => {
                        sendEvent("progress", update);
                    });

                    // Send final result
                    sendEvent("complete", session);
                    console.log(`[Cascade API] Completed. Status: ${session.status}, Consensus: ${session.consensusReached}`);
                    
                } catch (error: any) {
                    console.error("[Cascade API] Stream error:", error);
                    sendEvent("error", { error: error.message || "Cascade execution failed" });
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error: any) {
        console.error("[Cascade API] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export async function GET() {
    return new Response(JSON.stringify({
        name: "Synthesis Cascade",
        description: "3-Model Truth-Finding Architecture",
        models: {
            gemini: "gemini-2.5-pro-preview-05-06",
            openai: "gpt-4o",
            claude: "claude-sonnet-4-20250514",
        },
        phases: [
            "generation - All 3 models produce solutions in parallel",
            "critique - Each model critiques the other two",
            "synthesis - Rotating synthesizer merges best elements",
            "validation - Other two vote Accept/Reject (2/3 required)",
        ],
        endpoints: {
            POST: {
                body: {
                    topic: "string (required) - The topic/prompt for the cascade",
                    config: "object (optional) - Override default configuration",
                },
            },
        },
    }), { headers: { "Content-Type": "application/json" } });
}
