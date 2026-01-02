import { StrategyDuel } from '../src/lib/intelligence/strategy-duel';
import { IntelligenceConfig, DuelSession } from '../src/lib/intelligence/types';

async function testLiveDuel() {
  console.log('='.repeat(80));
  console.log('LIVE DUEL PERFORMANCE TEST');
  console.log('='.repeat(80));
  console.log();

  if (!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY) {
    console.error('❌ Missing API keys. Set OPENAI_API_KEY and GEMINI_API_KEY');
    process.exit(1);
  }

  const config: IntelligenceConfig = {
    geminiModel: 'gemini-2.5-flash',
    openaiModel: 'gpt-4o',
    temperature: 0.7,
    maxIterations: 3,
  };

  const topic = 'Should Proveniq use Antigravity for design authority and Windsurf for code execution?';

  console.log(`📋 Topic: ${topic}`);
  console.log(`⚙️  Config:`, config);
  console.log();

  const duel = new StrategyDuel(config);
  
  const roundTimes: number[] = [];
  let lastUpdate = Date.now();
  
  const startTime = Date.now();
  
  const session = await duel.run(topic, (updatedSession: DuelSession) => {
    const now = Date.now();
    const roundTime = now - lastUpdate;
    roundTimes.push(roundTime);
    
    const currentRound = updatedSession.rounds.length;
    console.log(`✅ Round ${currentRound} completed in ${(roundTime / 1000).toFixed(1)}s`);
    
    lastUpdate = now;
  });

  const totalTime = Date.now() - startTime;

  console.log();
  console.log('='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  console.log(`Status: ${session.status}`);
  console.log(`Total Rounds: ${session.rounds.length}`);
  console.log(`Total Time: ${(totalTime / 1000).toFixed(1)}s (${(totalTime / 60000).toFixed(2)} minutes)`);
  console.log();
  console.log('Round Breakdown:');
  roundTimes.forEach((time, idx) => {
    console.log(`  Round ${idx + 1}: ${(time / 1000).toFixed(1)}s`);
  });
  console.log();
  console.log(`Average per round: ${(totalTime / session.rounds.length / 1000).toFixed(1)}s`);
  console.log();

  if (session.consensus) {
    console.log('Consensus:');
    console.log(session.consensus.substring(0, 200) + '...');
  }

  console.log();
  console.log('='.repeat(80));
  console.log('PERFORMANCE ANALYSIS');
  console.log('='.repeat(80));
  
  const avgRoundTime = totalTime / session.rounds.length;
  const expectedSequential = avgRoundTime * 2;
  const speedup = expectedSequential / avgRoundTime;
  
  console.log(`Expected if sequential: ${(expectedSequential * session.rounds.length / 1000).toFixed(1)}s`);
  console.log(`Actual parallel time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`Estimated speedup: ${speedup.toFixed(2)}x`);
  console.log();

  if (totalTime < 240000) {
    console.log('✅ PASS: Completed in under 4 minutes');
  } else {
    console.log('⚠️  WARN: Took longer than 4 minutes');
  }

  console.log('='.repeat(80));
}

testLiveDuel().catch(console.error);
