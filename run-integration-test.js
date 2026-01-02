/**
 * HYBRID MODE INTEGRATION TEST - Standalone JS
 * Calls REAL LLM APIs and measures prompt/output lengths
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#') && key.trim()) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

const OpenAI = require('openai').default;
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// ═══════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════

const allMetrics = [];

function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

function formatBytes(chars) {
    return `${chars.toLocaleString()} chars (~${estimateTokens(String(chars)).toLocaleString()} tokens)`;
}

// ═══════════════════════════════════════════════════════════════
// LLM CLIENTS
// ═══════════════════════════════════════════════════════════════

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callOpenAI(model, systemPrompt, userPrompt) {
    const startTime = Date.now();
    
    const response = await openaiClient.chat.completions.create({
        model: model,
        temperature: 0.7,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });
    
    const elapsed = Date.now() - startTime;
    const output = response.choices[0].message.content || "";
    
    const metrics = {
        provider: 'openai',
        model: model,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        totalInputLength: systemPrompt.length + userPrompt.length,
        outputLength: output.length,
        responseTimeMs: elapsed,
        estimatedInputTokens: estimateTokens(systemPrompt + userPrompt),
        estimatedOutputTokens: estimateTokens(output),
    };
    allMetrics.push(metrics);
    
    return { output, metrics };
}

async function callGemini(model, systemPrompt, userPrompt) {
    const startTime = Date.now();
    
    const geminiModel = geminiClient.getGenerativeModel({
        model: model,
        systemInstruction: systemPrompt,
    });

    const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7 },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });

    const elapsed = Date.now() - startTime;
    const output = result.response.text();
    
    const metrics = {
        provider: 'gemini',
        model: model,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        totalInputLength: systemPrompt.length + userPrompt.length,
        outputLength: output.length,
        responseTimeMs: elapsed,
        estimatedInputTokens: estimateTokens(systemPrompt + userPrompt),
        estimatedOutputTokens: estimateTokens(output),
    };
    allMetrics.push(metrics);
    
    return { output, metrics };
}

// ═══════════════════════════════════════════════════════════════
// TEST PROMPTS
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

const ARCHITECT_SYSTEM = `You are an expert software architect. Write a complete, functional solution for the user's request. Focus on clean structure and readability.

CRITICAL OUTPUT RULES:
1) Output ONLY one single markdown code block fenced as \`\`\` (or appropriate language).
2) The code must be complete and runnable as-is.
3) Do not output diffs, explanations, or extra text outside the code block.`;

const REVIEWER_SYSTEM = `You are a Senior Code Optimizer. You have been given a codebase generated by a junior model.
Your job is to:
1) Analyze it for bugs, security issues, missing edge cases, and inefficiencies.
2) Rewrite the ENTIRE code with improvements applied.

CRITICAL OUTPUT RULES:
1) Output ONLY one single markdown code block fenced with \`\`\`.
2) Do not output diffs. Do not output commentary. Only the full runnable code.
3) If the code is already optimal, start your response with "[CONVERGED]" followed by the code block.`;

const STRATEGY_OPENER = `You are a strategic advisor participating in a high-stakes debate.
Your goal is to provide the most insightful, robust, and actionable strategy for the user's topic.
Provide your initial strategic analysis. Be bold, specific, and comprehensive.`;

const STRATEGY_DEBATER = (opponentArg) => `You are a strategic advisor in a debate. You have just heard an argument from your counterpart.

Counterpart's Argument:
${opponentArg}

Your goal is to:
1. Critically analyze their points. Identify weaknesses, blind spots, or generic advice.
2. Defend your previous position if it was strong, or pivot if they made a better point.
3. Propose a refined strategy that incorporates the best of both views.
4. If you've reached consensus, start your response with "[AGREE]".`;

const ORCHESTRATOR_SYSTEM = `You are the PROVENIQ Business Logic Orchestrator. 
Break down the objective into actionable C-Level tasks.

TEAM ROLES:
- CEO: Strategy, Partnerships, Legal, Vision.
- CTO: Engineering, Architecture, Infrastructure, AI.
- COO: Operations, Sourcing, Logistics, Supply Chain.
- CFO: Finance, Budgets, Payouts, Risk Management.

OUTPUT: Return ONLY a JSON array with tasks having: id, title, assignee, priority, status, dueDate, instructions, steps, challenges.`;

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

async function testCodeGeneration() {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST 1: CODE GENERATION (Refinery)');
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    
    console.log('\n[Phase 1] Gemini generating initial code...');
    const gemini1 = await callGemini('gemini-2.5-flash', ARCHITECT_SYSTEM, `Request:\n${TEST_PROMPTS.codeGeneration}`);
    console.log(`   ✓ Gemini responded (${gemini1.metrics.outputLength} chars, ${(gemini1.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    
    console.log('\n[Phase 2] OpenAI reviewing and refining...');
    const openai1 = await callOpenAI('gpt-4o', REVIEWER_SYSTEM, `Current Code:\n\n${gemini1.output}`);
    console.log(`   ✓ OpenAI responded (${openai1.metrics.outputLength} chars, ${(openai1.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    
    console.log(`\n   Total time: ${((Date.now() - startTime)/1000).toFixed(2)}s`);
    
    return { name: 'Code Generation', time: Date.now() - startTime };
}

async function testStrategyDebate() {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST 2: STRATEGY DEBATE (StrategyDuel)');
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    
    console.log('\n[Round 1] Opening statements (parallel)...');
    const [gemini1, openai1] = await Promise.all([
        callGemini('gemini-2.5-flash', STRATEGY_OPENER, `Topic: ${TEST_PROMPTS.strategyDebate}`),
        callOpenAI('gpt-4o', STRATEGY_OPENER, `Topic: ${TEST_PROMPTS.strategyDebate}`)
    ]);
    console.log(`   ✓ Gemini: ${gemini1.metrics.outputLength} chars (${(gemini1.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    console.log(`   ✓ OpenAI: ${openai1.metrics.outputLength} chars (${(openai1.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    
    console.log('\n[Round 2] Rebuttals (parallel)...');
    const [gemini2, openai2] = await Promise.all([
        callGemini('gemini-2.5-flash', STRATEGY_DEBATER(openai1.output), 'Your rebuttal:'),
        callOpenAI('gpt-4o', STRATEGY_DEBATER(gemini1.output), 'Your rebuttal:')
    ]);
    console.log(`   ✓ Gemini: ${gemini2.metrics.outputLength} chars (${(gemini2.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    console.log(`   ✓ OpenAI: ${openai2.metrics.outputLength} chars (${(openai2.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    
    console.log(`\n   Total time: ${((Date.now() - startTime)/1000).toFixed(2)}s`);
    
    return { name: 'Strategy Debate', time: Date.now() - startTime };
}

async function testTaskOrchestration() {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST 3: TASK ORCHESTRATION');
    console.log('═'.repeat(70));
    
    const startTime = Date.now();
    
    console.log('\n[Round 1] Task breakdown generation (parallel)...');
    const [gemini1, openai1] = await Promise.all([
        callGemini('gemini-2.5-flash', ORCHESTRATOR_SYSTEM, `Objective: ${TEST_PROMPTS.taskOrchestration}`),
        callOpenAI('gpt-4o', ORCHESTRATOR_SYSTEM, `Objective: ${TEST_PROMPTS.taskOrchestration}`)
    ]);
    console.log(`   ✓ Gemini: ${gemini1.metrics.outputLength} chars (${(gemini1.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    console.log(`   ✓ OpenAI: ${openai1.metrics.outputLength} chars (${(openai1.metrics.responseTimeMs/1000).toFixed(2)}s)`);
    
    console.log(`\n   Total time: ${((Date.now() - startTime)/1000).toFixed(2)}s`);
    
    return { name: 'Task Orchestration', time: Date.now() - startTime };
}

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

function generateReport(testResults) {
    const geminiMetrics = allMetrics.filter(m => m.provider === 'gemini');
    const openaiMetrics = allMetrics.filter(m => m.provider === 'openai');
    
    const sum = (arr, key) => arr.reduce((s, m) => s + m[key], 0);
    const avg = (arr, key) => arr.length ? sum(arr, key) / arr.length : 0;

    let report = `
# HYBRID MODE INTEGRATION TEST RESULTS
**Date:** ${new Date().toISOString()}

## Test Summary
| Test | Time |
|------|------|
${testResults.map(t => `| ${t.name} | ${(t.time/1000).toFixed(2)}s |`).join('\n')}

## Detailed LLM Metrics

| # | Provider | Model | System Prompt | User Prompt | Total Input | Output | Est. Tokens | Time |
|---|----------|-------|---------------|-------------|-------------|--------|-------------|------|
${allMetrics.map((m, i) => `| ${i+1} | ${m.provider} | ${m.model} | ${m.systemPromptLength} | ${m.userPromptLength} | ${m.totalInputLength} | ${m.outputLength} | ${m.estimatedInputTokens + m.estimatedOutputTokens} | ${(m.responseTimeMs/1000).toFixed(2)}s |`).join('\n')}

## Aggregate Summary

### GEMINI (${geminiMetrics.length} calls)
- **Total Input:** ${sum(geminiMetrics, 'totalInputLength').toLocaleString()} chars (~${sum(geminiMetrics, 'estimatedInputTokens').toLocaleString()} tokens)
- **Total Output:** ${sum(geminiMetrics, 'outputLength').toLocaleString()} chars (~${sum(geminiMetrics, 'estimatedOutputTokens').toLocaleString()} tokens)
- **Total Time:** ${(sum(geminiMetrics, 'responseTimeMs')/1000).toFixed(2)}s
- **Avg Response:** ${(avg(geminiMetrics, 'responseTimeMs')/1000).toFixed(2)}s

### OPENAI (${openaiMetrics.length} calls)
- **Total Input:** ${sum(openaiMetrics, 'totalInputLength').toLocaleString()} chars (~${sum(openaiMetrics, 'estimatedInputTokens').toLocaleString()} tokens)
- **Total Output:** ${sum(openaiMetrics, 'outputLength').toLocaleString()} chars (~${sum(openaiMetrics, 'estimatedOutputTokens').toLocaleString()} tokens)
- **Total Time:** ${(sum(openaiMetrics, 'responseTimeMs')/1000).toFixed(2)}s
- **Avg Response:** ${(avg(openaiMetrics, 'responseTimeMs')/1000).toFixed(2)}s

### COMBINED
- **Total API Calls:** ${allMetrics.length}
- **Total Input:** ${sum(allMetrics, 'totalInputLength').toLocaleString()} chars
- **Total Output:** ${sum(allMetrics, 'outputLength').toLocaleString()} chars
- **Total Est. Tokens:** ${(sum(allMetrics, 'estimatedInputTokens') + sum(allMetrics, 'estimatedOutputTokens')).toLocaleString()}
- **Total Time:** ${(sum(allMetrics, 'responseTimeMs')/1000).toFixed(2)}s

## Prompt Length Analysis

### System Prompts (Initial)
| Prompt Type | Length | Est. Tokens |
|-------------|--------|-------------|
| Architect (Code Gen) | ${ARCHITECT_SYSTEM.length} | ${estimateTokens(ARCHITECT_SYSTEM)} |
| Reviewer (Code Gen) | ${REVIEWER_SYSTEM.length} | ${estimateTokens(REVIEWER_SYSTEM)} |
| Strategy Opener | ${STRATEGY_OPENER.length} | ${estimateTokens(STRATEGY_OPENER)} |
| Orchestrator | ${ORCHESTRATOR_SYSTEM.length} | ${estimateTokens(ORCHESTRATOR_SYSTEM)} |

### User Prompts (Test Cases)
| Test Case | Length | Est. Tokens |
|-----------|--------|-------------|
| Code Generation | ${TEST_PROMPTS.codeGeneration.length} | ${estimateTokens(TEST_PROMPTS.codeGeneration)} |
| Strategy Debate | ${TEST_PROMPTS.strategyDebate.length} | ${estimateTokens(TEST_PROMPTS.strategyDebate)} |
| Task Orchestration | ${TEST_PROMPTS.taskOrchestration.length} | ${estimateTokens(TEST_PROMPTS.taskOrchestration)} |
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
    console.log('✓ OPENAI_API_KEY found');
    console.log('✓ GEMINI_API_KEY found');
    
    const testResults = [];
    
    try {
        testResults.push(await testCodeGeneration());
        testResults.push(await testStrategyDebate());
        testResults.push(await testTaskOrchestration());
        
        const report = generateReport(testResults);
        console.log(report);
        
        // Save report
        const reportPath = path.resolve(__dirname, 'INTEGRATION_TEST_RESULTS.md');
        fs.writeFileSync(reportPath, report);
        console.log(`\n📄 Report saved to: ${reportPath}`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
}

main();
