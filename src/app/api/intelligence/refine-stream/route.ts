import { NextRequest } from "next/server";
import { Refinery } from "@/lib/intelligence/refinery";
import { IntelligenceConfig, Iteration, DuelScorecard } from "@/lib/intelligence/types";

// Battle commentary generator
function generateBattleCommentary(iteration: Iteration, phase: "initial" | "duel", prevIteration?: Iteration): string {
    const model = iteration.provider === "gemini" ? "Gemini 3" : "GPT-5.2";
    const opponent = iteration.provider === "gemini" ? "GPT-5.2" : "Gemini 3";
    
    // Phase 1: Initial generation
    if (phase === "initial") {
        const initialLines = [
            `${model} enters the arena! Generating first version... 🎮`,
            `${model} steps up to the challenge! Writing code... ⚡`,
            `${model} accepts the duel! Crafting solution... 🛠️`,
        ];
        return initialLines[Math.floor(Math.random() * initialLines.length)];
    }
    
    // Phase 2: Duel attacks
    const punchLines = [
        `${model} ATTACKS ${opponent}'s code! 💥`,
        `${model} spots vulnerabilities in ${opponent}'s solution! 🎯`,
        `${model} calls out ${opponent}'s sloppy logic! 🔥`,
        `${model} rewrites ${opponent}'s code. No mercy! ⚔️`,
        `${model} lands a clean hit on ${opponent}! 👊`,
        `${model} exposes ${opponent}'s hallucination! CRITICAL HIT! 💀`,
        `${model} tears apart ${opponent}'s edge cases! 🥊`,
        `${model} finds bugs ${opponent} missed! 🐛`,
        `${model} optimizes what ${opponent} couldn't! ⚡`,
    ];
    
    const convergenceLines = [
        `${model} admits defeat... "${opponent}'s code is perfect." 🤝`,
        `${model} throws in the towel. ${opponent} WINS! 🏆`,
        `${model} can't improve ${opponent}'s code. CONVERGENCE! ✨`,
        `${model} concedes. The duel is over! 🎖️`,
    ];
    
    if (iteration.isConverged) {
        return convergenceLines[Math.floor(Math.random() * convergenceLines.length)];
    }
    
    // Check for significant changes
    if (iteration.diffSummary) {
        const diffLines = iteration.diffSummary.split('\n').length;
        if (diffLines > 50) {
            return `${model} DEMOLISHES ${opponent}'s code! ${diffLines} lines changed! 💣`;
        } else if (diffLines > 20) {
            return `${model} makes MAJOR revisions to ${opponent}'s work! 🔨`;
        }
    }
    
    return punchLines[Math.floor(Math.random() * punchLines.length)];
}

// Calculate who's "winning" based on attack rounds only (not init phase)
function calculateScore(iterations: Iteration[]): { gemini: number; openai: number } {
    let gemini = 0;
    let openai = 0;
    
    // Only count scores from attack rounds (index 2+), not initial generation
    iterations.forEach((iter, idx) => {
        // Skip initial generation phase (index 0-1)
        if (idx < 2) return;
        
        // Points based on finding issues (smaller diff = opponent's code was good)
        // Larger diff = more issues found = more points for attacker
        const diffLines = iter.diffSummary?.split('\n').filter(l => l.startsWith('+') || l.startsWith('-')).length || 0;
        const points = Math.min(Math.floor(diffLines / 2), 25); // Max 25 points per attack
        
        if (iter.provider === "gemini") {
            gemini += points;
        } else {
            openai += points;
        }
        
        // Convergence = opponent admits defeat, bonus to the one who wrote good code
        if (iter.isConverged) {
            // The attacker converged, meaning defender's code was good
            if (iter.provider === "gemini") {
                openai += 30; // GPT's code was so good Gemini converged
            } else {
                gemini += 30; // Gemini's code was so good GPT converged
            }
        }
    });
    
    return { gemini, openai };
}

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    const body = await req.json();
    
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { task, config } = body as { task: string; config: IntelligenceConfig };

                if (!task) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Task is required" })}\n\n`));
                    controller.close();
                    return;
                }

                const defaultConfig: IntelligenceConfig = {
                    geminiModel: "gemini-3-pro-preview",
                    openaiModel: "gpt-5.2",
                    temperature: 0.2,
                    maxIterations: 5,
                    ...config,
                };

                // Send initial status
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: "start", 
                    message: "🎮 PHASE 1: Both fighters enter the arena!",
                    round: 0,
                    maxRounds: (defaultConfig.maxIterations || 5) + 2,
                    phase: "initial"
                })}\n\n`));

                const refinery = new Refinery(defaultConfig);
                const iterations: Iteration[] = [];
                
                let scorecard: DuelScorecard | undefined = undefined;
                
                // Use the onUpdate callback to stream each iteration
                await refinery.refine(task, (iteration) => {
                    iterations.push(iteration);
                    
                    // Clear phase logic:
                    // Index 0-1: GENERATION (both create first versions)
                    // Index 2+: BATTLE (they attack each other)
                    const isGenerationPhase = iteration.index <= 1;
                    const phase: "initial" | "duel" = isGenerationPhase ? "initial" : "duel";
                    
                    // Round numbering: Generation is "prep", attacks are rounds 1-5
                    const attackRound = isGenerationPhase ? 0 : Math.floor((iteration.index - 2) / 2) + 1;
                    
                    const commentary = generateBattleCommentary(iteration, phase, iterations[iterations.length - 2]);
                    const scores = calculateScore(iterations);
                    
                    // Send phase transition when first attack begins
                    if (iteration.index === 2) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: "phase",
                            message: "⚔️ BATTLE PHASE: The attacks begin!",
                            phase: "duel"
                        })}\n\n`));
                    }
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "round",
                        round: attackRound,
                        maxRounds: 5,
                        attacker: iteration.provider === "gemini" ? "Gemini 3" : "GPT-5.2",
                        defender: iteration.provider === "gemini" ? "GPT-5.2" : "Gemini 3",
                        phase,
                        isGeneration: isGenerationPhase,
                        commentary,
                        isConverged: iteration.isConverged,
                        scores,
                        iteration
                    })}\n\n`));
                }, (sc: DuelScorecard) => {
                    scorecard = sc;
                });

                // Scoring phase - show scorecard
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: "scoring", 
                    message: "📊 SCORING PHASE: Analyzing critical errors and comparing solutions..." 
                })}\n\n`));

                // Send the scorecard with agreements/disagreements
                const sc = scorecard as DuelScorecard | undefined;
                if (sc) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "scorecard",
                        scorecard: sc,
                        message: sc.consensusReached 
                            ? "✅ CONSENSUS REACHED! Both models agree on the solution."
                            : "⚠️ NO CONSENSUS - Models disagree on key aspects."
                    })}\n\n`));
                }

                // Final completion with user decision prompt
                const finalScores = calculateScore(iterations);
                const winner = sc?.winner === "gemini" ? "Gemini 3" : 
                               sc?.winner === "openai" ? "GPT-5.2" : "TIE";

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: "review",
                    message: sc?.consensusReached 
                        ? `🏆 DUEL COMPLETE! Winner: ${winner}. Consensus reached!`
                        : `⚔️ DUEL PAUSED! Winner: ${winner}. No consensus - your decision needed.`,
                    winner,
                    scores: finalScores,
                    scorecard: sc,
                    iterations,
                    awaitingUserDecision: !sc?.consensusReached,
                    geminiCode: iterations.filter(i => i.provider === "gemini").pop()?.extractedCode,
                    openaiCode: iterations.filter(i => i.provider === "openai").pop()?.extractedCode
                })}\n\n`));

                controller.close();
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "An unexpected error occurred";
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`));
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
}
