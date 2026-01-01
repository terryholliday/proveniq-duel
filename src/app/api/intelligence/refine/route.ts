import { NextRequest, NextResponse } from "next/server";
import { Refinery } from "@/lib/intelligence/refinery";
import { IntelligenceConfig } from "@/lib/intelligence/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { task, config } = body as { task: string; config: IntelligenceConfig };

        if (!task) {
            return NextResponse.json({ error: "Task is required" }, { status: 400 });
        }

        const defaultConfig: IntelligenceConfig = {
            geminiModel: "gemini-3-pro-preview",
            openaiModel: "gpt-5.2",
            temperature: 0.2,
            maxIterations: 5,
            ...config,
        };

        const refinery = new Refinery(defaultConfig);
        const iterations = await refinery.refine(task);

        // Always check the final results against the original intent of the prompt
        let adjudication;
        if (iterations.length > 0) {
            const finalCode = iterations[iterations.length - 1].extractedCode;
            adjudication = await refinery.adjudicate(task, finalCode);
        }

        return NextResponse.json({ iterations, adjudication });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred";
        console.error("Refinement API Error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
