import { NextRequest, NextResponse } from "next/server";
import { StrategyDuel } from "@/lib/intelligence/strategy-duel";
import { IntelligenceConfig } from "@/lib/intelligence/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, config } = body as { topic: string; config: IntelligenceConfig };

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const defaultConfig: IntelligenceConfig = {
            geminiModel: "gemini-2.5-flash",
            openaiModel: "gpt-4o",
            temperature: 0.7,
            maxIterations: 5,
            ...config,
        };

        const duel = new StrategyDuel(defaultConfig);
        const session = await duel.run(topic);

        return NextResponse.json(session);
    } catch (error: any) {
        console.error("Strategy Duel API Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
