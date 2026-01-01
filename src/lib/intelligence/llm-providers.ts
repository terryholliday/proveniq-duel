import OpenAI from "openai";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { ModelProvider } from "./types";

export abstract class LLMProvider {
    abstract call(systemInstruction: string, userPayload: string): Promise<string>;
}

export class OpenAIProvider extends LLMProvider {
    private client: OpenAI;
    private model: string;
    private temperature: number;

    constructor(model: string, temperature: number) {
        super();
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.model = model;
        this.temperature = temperature;
    }

    async call(systemInstruction: string, userPayload: string): Promise<string> {
        console.log(`[OpenAI] Starting call with model: ${this.model}`);
        const startTime = Date.now();
        const response = await this.client.chat.completions.create({
            model: this.model,
            temperature: this.temperature,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPayload },
            ],
        });
        const elapsed = Date.now() - startTime;
        console.log(`[OpenAI] Completed in ${elapsed}ms`);
        return response.choices[0].message.content || "";
    }
}

export class GeminiProvider extends LLMProvider {
    private genAI: GoogleGenerativeAI;
    private model: string;
    private temperature: number;

    constructor(model: string, temperature: number) {
        super();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        this.model = model;
        this.temperature = temperature;
    }

    async call(systemInstruction: string, userPayload: string): Promise<string> {
        console.log(`[Gemini] Starting call with model: ${this.model}`);
        const startTime = Date.now();
        
        const model = this.genAI.getGenerativeModel({
            model: this.model,
            systemInstruction,
        });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: userPayload }] }],
            generationConfig: { temperature: this.temperature },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        const elapsed = Date.now() - startTime;
        console.log(`[Gemini] Completed in ${elapsed}ms`);
        return result.response.text();
    }
}
