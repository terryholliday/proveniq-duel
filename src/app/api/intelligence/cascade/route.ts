// ═══════════════════════════════════════════════════════════════
// SYNTHESIS CASCADE API ROUTE
// 3-Model Truth-Finding Architecture
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { SynthesisCascade } from "@/lib/intelligence/synthesis-cascade";
import { CascadeConfig } from "@/lib/intelligence/types";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, config } = body as {
            topic: string;
            config?: Partial<CascadeConfig>;
        };

        if (!topic || typeof topic !== "string") {
            return NextResponse.json(
                { error: "Topic is required and must be a string" },
                { status: 400 }
            );
        }

        // Validate API keys are present
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OPENAI_API_KEY not configured" },
                { status: 500 }
            );
        }
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY not configured" },
                { status: 500 }
            );
        }
        if (!process.env.CLAUDE_API_KEY) {
            return NextResponse.json(
                { error: "CLAUDE_API_KEY not configured" },
                { status: 500 }
            );
        }

        console.log(`[Cascade API] Starting synthesis cascade for topic: ${topic.substring(0, 100)}...`);

        const cascade = new SynthesisCascade(config);
        const session = await cascade.run(topic);

        console.log(`[Cascade API] Completed. Status: ${session.status}, Consensus: ${session.consensusReached}, Latency: ${session.totalLatencyMs}ms`);

        return NextResponse.json(session);

    } catch (error: any) {
        console.error("[Cascade API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
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
    });
}
