// Live test for 3-Model Synthesis Cascade
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { SynthesisCascade } from "../src/lib/intelligence/synthesis-cascade";

async function testCascade() {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("  SYNTHESIS CASCADE LIVE TEST - 3 Model Architecture");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("");

    // Simple test topic
    const topic = "Write a TypeScript function that validates an email address and returns specific error messages for common mistakes like missing @, invalid domain, etc.";

    console.log("📝 Topic:", topic);
    console.log("");
    console.log("🚀 Starting cascade...");
    console.log("");

    const cascade = new SynthesisCascade();

    try {
        const session = await cascade.run(topic, (update) => {
            const lastRound = update.rounds[update.rounds.length - 1];
            if (lastRound) {
                console.log(`   [Phase: ${lastRound.phase}] Round ${lastRound.index + 1}`);
            }
        });

        console.log("");
        console.log("═══════════════════════════════════════════════════════════════");
        console.log("  RESULTS");
        console.log("═══════════════════════════════════════════════════════════════");
        console.log("");
        console.log("Status:", session.status);
        console.log("Consensus Reached:", session.consensusReached);
        console.log("Total Rounds:", session.rounds.length);
        console.log("Total Latency:", Math.round(session.totalLatencyMs / 1000), "seconds");
        console.log("");

        // Show generation phase results
        const genRound = session.rounds.find(r => r.phase === "generation");
        if (genRound?.generations) {
            console.log("─── GENERATION PHASE ───");
            for (const gen of genRound.generations) {
                console.log(`\n[${gen.provider.toUpperCase()}] (${gen.latencyMs}ms)`);
                console.log(gen.content.slice(0, 500) + "...");
            }
        }

        // Show final output
        if (session.finalOutput) {
            console.log("");
            console.log("═══════════════════════════════════════════════════════════════");
            console.log("  FINAL SYNTHESIZED OUTPUT");
            console.log("═══════════════════════════════════════════════════════════════");
            console.log("");
            console.log(session.finalOutput.slice(0, 2000));
            if (session.finalOutput.length > 2000) {
                console.log(`\n... (${session.finalOutput.length - 2000} more characters)`);
            }
        }

        if (session.error) {
            console.error("\n❌ Error:", session.error);
        }

    } catch (error: any) {
        console.error("❌ Test failed:", error.message);
        console.error(error.stack);
    }
}

testCascade();
