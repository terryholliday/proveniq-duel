/**
 * HYBRID MODE INTEGRATION TEST
 * 
 * This script calls REAL LLM APIs (Gemini + OpenAI) to test the hybrid feature.
 * It measures and reports:
 * - Initial prompt lengths (system + user)
 * - Output lengths for each LLM
 * - Response times
 * - Token estimates
 * 
 * Run with: npx ts-node --project tsconfig.json src/lib/intelligence/__tests__/hybrid-integration.ts
 */

import * as path from 'path';

// Load environment variables manually
const fs = require('fs');
const envPath = path.resolve(__dirname, '../../../../.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line: string) => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#')) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

import { Refinery } from '../refinery';
import { StrategyDuel } from '../strategy-duel';
import { TaskOrchestrator } from '../orchestrator';
import { IntelligenceConfig, Iteration, DuelSession, DuelScorecard } from '../types';

// ═══════════════════════════════════════════════════════════════
// METRICS TRACKING
// ═══════════════════════════════════════════════════════════════

interface LLMMetrics {
    provider: 'gemini' | 'openai';
    model: string;
    systemPromptLength: number;
    userPromptLength: number;
    totalInputLength: number;
    outputLength: number;
    responseTimeMs: number;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
}

interface TestResults {
    testName: string;
    task: string;
    metrics: LLMMetrics[];
    totalTimeMs: number;
    success: boolean;
    error?: string;
}

// Rough token estimation (4 chars ≈ 1 token)
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function formatBytes(chars: number): string {
    return `${chars.toLocaleString()} chars (~${estimateTokens(String(chars)).toLocaleString()} tokens)`;
}

// ═══════════════════════════════════════════════════════════════
// INSTRUMENTED PROVIDERS
// ═══════════════════════════════════════════════════════════════

import OpenAI from "openai";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

class InstrumentedOpenAI {
    private client: OpenAI;
    private model: string;
    private temperature: number;
    public metrics: LLMMetrics[] = [];

    constructor(model: string, temperature: number) {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.model = model;
        this.temperature = temperature;
    }

    async call(systemInstruction: string, userPayload: string): Promise<string> {
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
        const output = response.choices[0].message.content || "";
        
        this.metrics.push({
            provider: 'openai',
            model: this.model,
            systemPromptLength: systemInstruction.length,
            userPromptLength: userPayload.length,
            totalInputLength: systemInstruction.length + userPayload.length,
            outputLength: output.length,
            responseTimeMs: elapsed,
            estimatedInputTokens: estimateTokens(systemInstruction + userPayload),
            estimatedOutputTokens: estimateTokens(output),
        });
        
        return output;
    }
}

class InstrumentedGemini {
    private genAI: GoogleGenerativeAI;
    private model: string;
    private temperature: number;
    public metrics: LLMMetrics[] = [];

    constructor(model: string, temperature: number) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        this.model = model;
        this.temperature = temperature;
    }

    async call(systemInstruction: string, userPayload: string): Promise<string> {
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
        const output = result.response.text();
        
        this.metrics.push({
            provider: 'gemini',
            model: this.model,
            systemPromptLength: systemInstruction.length,
            userPromptLength: userPayload.length,
            totalInputLength: systemInstruction.length + userPayload.length,
            outputLength: output.length,
            responseTimeMs: elapsed,
            estimatedInputTokens: estimateTokens(systemInstruction + userPayload),
            estimatedOutputTokens: estimateTokens(output),
        });
        
        return output;
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════

const TEST_PROMPTS = {
    codeGeneration: `Create a TypeScript function that validates an email address using regex. 
Include proper error handling and return type annotations. 
The function should handle edge cases like empty strings and null values.`,

    strategyDebate: `What is the best approach for implementing a multi-tenant SaaS architecture? 
Consider database isolation, authentication, billing, and scalability.`,

    taskOrchestration: `Launch a new B2B marketplace for industrial equipment rentals. 
We need to onboard suppliers, build a verification system, implement payments, and create a mobile app.`
};

// ═══════════════════════════════════════════════════════════════
// TEST RUNNERS
// ═══════════════════════════════════════════════════════════════

async function testCodeGeneration(): Promise<TestResults> {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST 1: CODE GENERATION (Refinery)');
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    const allMetrics: LLMMetrics[] = [];
    
    try {
        const gemini = new InstrumentedGemini('gemini-2.5-flash', 0.7);
        const openai = new InstrumentedOpenAI('gpt-4o', 0.7);
        
        // Simulate refinery flow: Gemini generates, OpenAI reviews
        console.log('\n[Phase 1] Gemini generating initial code...');
        const architectPrompt = `You are an expert software architect. Write a complete, functional solution for the user's request. Focus on clean structure and readability.

CRITICAL OUTPUT RULES:
1) Output ONLY one single markdown code block fenced as \`\`\` (or appropriate language).
2) The code must be complete and runnable as-is.
3) Do not output diffs, explanations, or extra text outside the code block.`;
        
        const geminiOutput = await gemini.call(architectPrompt, `Request:\n${TEST_PROMPTS.codeGeneration}`);
        console.log(`   ✓ Gemini responded (${gemini.metrics[0].outputLength} chars)`);
        
        console.log('\n[Phase 2] OpenAI reviewing and refining...');
        const reviewerPrompt = `You are a Senior Code Optimizer. You have been given a codebase generated by a junior model.
Your job is to:
1) Analyze it for bugs, security issues, missing edge cases, and inefficiencies.
2) Rewrite the ENTIRE code with improvements applied.

CRITICAL OUTPUT RULES:
1) Output ONLY one single markdown code block fenced with \`\`\`.
2) Do not output diffs. Do not output commentary. Only the full runnable code.
3) If the code is already optimal and no further improvements are possible, start your response with "[CONVERGED]" followed by the code block.`;
        
        const openaiOutput = await openai.call(reviewerPrompt, `Current Code:\n\n${geminiOutput}`);
        console.log(`   ✓ OpenAI responded (${openai.metrics[0].outputLength} chars)`);
        
        allMetrics.push(...gemini.metrics, ...openai.metrics);
        
        return {
            testName: 'Code Generation',
            task: TEST_PROMPTS.codeGeneration,
            metrics: allMetrics,
            totalTimeMs: Date.now() - startTime,
            success: true
        };
    } catch (error: any) {
        return {
            testName: 'Code Generation',
            task: TEST_PROMPTS.codeGeneration,
            metrics: allMetrics,
            totalTimeMs: Date.now() - startTime,
            success: false,
            error: error.message
        };
    }
}

async function testStrategyDebate(): Promise<TestResults> {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST 2: STRATEGY DEBATE (StrategyDuel)');
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    const allMetrics: LLMMetrics[] = [];
    
    try {
        const gemini = new InstrumentedGemini('gemini-2.5-flash', 0.7);
        const openai = new InstrumentedOpenAI('gpt-4o', 0.7);
        
        const openerPrompt = `You are a strategic advisor participating in a high-stakes debate.
Your goal is to provide the most insightful, robust, and actionable strategy for the user's topic.

Topic:
${TEST_PROMPTS.strategyDebate}

Provide your initial strategic analysis. Be bold, specific, and comprehensive.`;
        
        // Round 1: Opening statements (parallel)
        console.log('\n[Round 1] Opening statements (parallel)...');
        const [geminiR1, openaiR1] = await Promise.all([
            gemini.call(openerPrompt, `Please provide your initial strategy for: ${TEST_PROMPTS.strategyDebate}`),
            openai.call(openerPrompt, `Please provide your initial strategy for: ${TEST_PROMPTS.strategyDebate}`)
        ]);
        console.log(`   ✓ Gemini: ${gemini.metrics[0].outputLength} chars`);
        console.log(`   ✓ OpenAI: ${openai.metrics[0].outputLength} chars`);
        
        // Round 2: Rebuttals (parallel)
        console.log('\n[Round 2] Rebuttals (parallel)...');
        const debaterPrompt = (opponentArg: string) => `You are a strategic advisor in a debate. You have just heard an argument from your counterpart.

Counterpart's Argument:
${opponentArg}

Your goal is to:
1. Critically analyze their points. Identify weaknesses, blind spots, or generic advice.
2. Defend your previous position if it was strong, or pivot if they made a better point.
3. Propose a refined strategy that incorporates the best of both views but maintains your unique perspective.
4. If you believe you and your counterpart have reached a solid consensus and no further debate will add value, start your response with "[AGREE]".

Focus on synthesis and elevation of the strategy. Do not just argue for the sake of arguing.`;
        
        const [geminiR2, openaiR2] = await Promise.all([
            gemini.call(debaterPrompt(openaiR1), 'Your rebuttal/refinement:'),
            openai.call(debaterPrompt(geminiR1), 'Your rebuttal/refinement:')
        ]);
        console.log(`   ✓ Gemini: ${gemini.metrics[1].outputLength} chars`);
        console.log(`   ✓ OpenAI: ${openai.metrics[1].outputLength} chars`);
        
        allMetrics.push(...gemini.metrics, ...openai.metrics);
        
        return {
            testName: 'Strategy Debate',
            task: TEST_PROMPTS.strategyDebate,
            metrics: allMetrics,
            totalTimeMs: Date.now() - startTime,
            success: true
        };
    } catch (error: any) {
        return {
            testName: 'Strategy Debate',
            task: TEST_PROMPTS.strategyDebate,
            metrics: allMetrics,
            totalTimeMs: Date.now() - startTime,
            success: false,
            error: error.message
        };
    }
}

async function testTaskOrchestration(): Promise<TestResults> {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST 3: TASK ORCHESTRATION');
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    const allMetrics: LLMMetrics[] = [];
    
    try {
        const gemini = new InstrumentedGemini('gemini-2.5-flash', 0.2);
        const openai = new InstrumentedOpenAI('gpt-4o', 0.2);
        
        const orchestratorPrompt = `You are the PROVENIQ Business Logic Orchestrator. 
Your goal is to take a high-level objective and break it down into actionable C-Level tasks for the PROVENIQ Executive Team.

TEAM ROLES:
- CEO: Strategy, Partnerships, Legal, Vision.
- CTO: Engineering, Architecture, Infrastructure, AI.
- COO: Operations, Sourcing, Logistics, Supply Chain.
- CFO: Finance, Budgets, Payouts, Risk Management.

OUTPUT RULES:
- Return ONLY a JSON array of AdminTask objects.
- Each task must have: 'id', 'title', 'assignee', 'priority', 'status', 'dueDate'.
- Include 'instructions', 'steps' (array of 3-5 TaskStep objects), and 'challenges'.
- No commentary. Only the JSON array.`;
        
        // Round 1: Both generate task breakdowns
        console.log('\n[Round 1] Task breakdown generation (parallel)...');
        const [geminiTasks, openaiTasks] = await Promise.all([
            gemini.call(orchestratorPrompt, `Objective: ${TEST_PROMPTS.taskOrchestration}`),
            openai.call(orchestratorPrompt, `Objective: ${TEST_PROMPTS.taskOrchestration}`)
        ]);
        console.log(`   ✓ Gemini: ${gemini.metrics[0].outputLength} chars`);
        console.log(`   ✓ OpenAI: ${openai.metrics[0].outputLength} chars`);
        
        // Round 2: Cross-critique
        console.log('\n[Round 2] Cross-critique (parallel)...');
        const critiquePrompt = `You are a ruthless executive strategist. Review the following task breakdown and ATTACK it:
1. Find weak reasoning, vague instructions, missing edge cases
2. Challenge role assignments - is this REALLY the right C-level owner?
3. Demand more specific, actionable steps
4. Call out any fluff or corporate BS
5. Rewrite the ENTIRE JSON with your improvements

If the tasks are already perfect and you cannot improve them further, respond with "[CONVERGED]" followed by the final JSON.

Current Tasks:`;
        
        const [geminiCritique, openaiCritique] = await Promise.all([
            gemini.call(orchestratorPrompt + '\n' + critiquePrompt, openaiTasks),
            openai.call(orchestratorPrompt + '\n' + critiquePrompt, geminiTasks)
        ]);
        console.log(`   ✓ Gemini critique: ${gemini.metrics[1].outputLength} chars`);
        console.log(`   ✓ OpenAI critique: ${openai.metrics[1].outputLength} chars`);
        
        allMetrics.push(...gemini.metrics, ...openai.metrics);
        
        return {
            testName: 'Task Orchestration',
            task: TEST_PROMPTS.taskOrchestration,
            metrics: allMetrics,
            totalTimeMs: Date.now() - startTime,
            success: true
        };
    } catch (error: any) {
        return {
            testName: 'Task Orchestration',
            task: TEST_PROMPTS.taskOrchestration,
            metrics: allMetrics,
            totalTimeMs: Date.now() - startTime,
            success: false,
            error: error.message
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateReport(results: TestResults[]): string {
    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    HYBRID MODE INTEGRATION TEST RESULTS                       ║
║                         ${new Date().toISOString()}                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

`;

    for (const result of results) {
        report += `
┌──────────────────────────────────────────────────────────────────────────────┐
│ TEST: ${result.testName.padEnd(68)}│
├──────────────────────────────────────────────────────────────────────────────┤
│ Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}                                                          │
│ Total Time: ${(result.totalTimeMs / 1000).toFixed(2)}s                                                       │
${result.error ? `│ Error: ${result.error.substring(0, 60)}...                              │\n` : ''}└──────────────────────────────────────────────────────────────────────────────┘

TASK PROMPT:
${result.task}

LLM METRICS:
┌─────────┬──────────────────┬────────────────┬───────────────┬────────────────┬──────────┐
│ Provider│ Model            │ Input Length   │ Output Length │ Est. Tokens    │ Time     │
├─────────┼──────────────────┼────────────────┼───────────────┼────────────────┼──────────┤`;

        for (const m of result.metrics) {
            report += `
│ ${m.provider.padEnd(7)} │ ${m.model.padEnd(16)} │ ${m.totalInputLength.toString().padStart(12)} │ ${m.outputLength.toString().padStart(13)} │ ${(m.estimatedInputTokens + m.estimatedOutputTokens).toString().padStart(14)} │ ${(m.responseTimeMs / 1000).toFixed(2).padStart(6)}s │`;
        }
        
        report += `
└─────────┴──────────────────┴────────────────┴───────────────┴────────────────┴──────────┘

DETAILED BREAKDOWN:
`;
        for (let i = 0; i < result.metrics.length; i++) {
            const m = result.metrics[i];
            report += `
  [${i + 1}] ${m.provider.toUpperCase()} (${m.model})
      System Prompt: ${formatBytes(m.systemPromptLength)}
      User Prompt:   ${formatBytes(m.userPromptLength)}
      Total Input:   ${formatBytes(m.totalInputLength)}
      Output:        ${formatBytes(m.outputLength)}
      Response Time: ${(m.responseTimeMs / 1000).toFixed(2)}s
`;
        }
        
        report += '\n' + '─'.repeat(80) + '\n';
    }

    // Summary
    const allMetrics = results.flatMap(r => r.metrics);
    const geminiMetrics = allMetrics.filter(m => m.provider === 'gemini');
    const openaiMetrics = allMetrics.filter(m => m.provider === 'openai');
    
    const sumInput = (metrics: LLMMetrics[]) => metrics.reduce((sum, m) => sum + m.totalInputLength, 0);
    const sumOutput = (metrics: LLMMetrics[]) => metrics.reduce((sum, m) => sum + m.outputLength, 0);
    const sumTime = (metrics: LLMMetrics[]) => metrics.reduce((sum, m) => sum + m.responseTimeMs, 0);
    const sumTokens = (metrics: LLMMetrics[]) => metrics.reduce((sum, m) => sum + m.estimatedInputTokens + m.estimatedOutputTokens, 0);

    report += `
╔══════════════════════════════════════════════════════════════════════════════╗
║                              AGGREGATE SUMMARY                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

GEMINI TOTALS:
  Total Calls:        ${geminiMetrics.length}
  Total Input:        ${formatBytes(sumInput(geminiMetrics))}
  Total Output:       ${formatBytes(sumOutput(geminiMetrics))}
  Total Est. Tokens:  ${sumTokens(geminiMetrics).toLocaleString()}
  Total Time:         ${(sumTime(geminiMetrics) / 1000).toFixed(2)}s
  Avg Response Time:  ${(sumTime(geminiMetrics) / geminiMetrics.length / 1000).toFixed(2)}s

OPENAI TOTALS:
  Total Calls:        ${openaiMetrics.length}
  Total Input:        ${formatBytes(sumInput(openaiMetrics))}
  Total Output:       ${formatBytes(sumOutput(openaiMetrics))}
  Total Est. Tokens:  ${sumTokens(openaiMetrics).toLocaleString()}
  Total Time:         ${(sumTime(openaiMetrics) / 1000).toFixed(2)}s
  Avg Response Time:  ${(sumTime(openaiMetrics) / openaiMetrics.length / 1000).toFixed(2)}s

COMBINED:
  Total API Calls:    ${allMetrics.length}
  Total Input:        ${formatBytes(sumInput(allMetrics))}
  Total Output:       ${formatBytes(sumOutput(allMetrics))}
  Total Est. Tokens:  ${sumTokens(allMetrics).toLocaleString()}
  Total Time:         ${(sumTime(allMetrics) / 1000).toFixed(2)}s
`;

    return report;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║           PROVENIQ DUEL - HYBRID MODE INTEGRATION TEST                       ║');
    console.log('║                     REAL API CALLS WITH METRICS                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    
    console.log('\nChecking API keys...');
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found');
        process.exit(1);
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found');
        process.exit(1);
    }
    console.log('✓ API keys found');
    
    const results: TestResults[] = [];
    
    // Run tests
    results.push(await testCodeGeneration());
    results.push(await testStrategyDebate());
    results.push(await testTaskOrchestration());
    
    // Generate and print report
    const report = generateReport(results);
    console.log(report);
    
    // Write report to file
    const fs = await import('fs');
    const reportPath = path.resolve(__dirname, '../../../../INTEGRATION_TEST_RESULTS.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
}

main().catch(console.error);
