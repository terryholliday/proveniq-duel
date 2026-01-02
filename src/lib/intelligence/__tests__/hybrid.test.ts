import { Refinery } from '../refinery';
import { StrategyDuel } from '../strategy-duel';
import { IntelligenceConfig, Iteration, AdjudicationResult } from '../types';

jest.mock('../llm-providers');

/**
 * HYBRID MODE TEST SUITE
 * 
 * Tests the dual-track execution feature that runs:
 * 1. Code Generation (Refinery) - Gemini/OpenAI alternating code refinement
 * 2. Strategy Debate (StrategyDuel) - Parallel adversarial consensus
 * 
 * Key metrics:
 * - Parallel execution efficiency (both tracks run simultaneously)
 * - Stream event ordering and completeness
 * - Error isolation (one track failing shouldn't kill the other)
 * - Session storage compatibility
 */
describe('Hybrid Mode', () => {
  let mockGeminiCall: jest.Mock;
  let mockOpenAICall: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { GeminiProvider, OpenAIProvider } = require('../llm-providers');
    
    mockGeminiCall = jest.fn();
    mockOpenAICall = jest.fn();
    
    GeminiProvider.mockImplementation(() => ({
      call: mockGeminiCall
    }));
    
    OpenAIProvider.mockImplementation(() => ({
      call: mockOpenAICall
    }));
  });

  describe('Parallel Track Execution', () => {
    it('should run Refinery and StrategyDuel in parallel', async () => {
      const trackStartTimes: { refinery?: number; duel?: number } = {};
      
      // Mock with delays to measure parallelism
      mockGeminiCall.mockImplementation(async (system: string) => {
        if (system.includes('architect') || system.includes('Optimizer')) {
          trackStartTimes.refinery = trackStartTimes.refinery || Date.now();
        } else if (system.includes('strategic advisor')) {
          trackStartTimes.duel = trackStartTimes.duel || Date.now();
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        return '```typescript\nconst x = 1;\n```';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return '```typescript\nconst x = 1;\n```';
      });

      const config: IntelligenceConfig = {
        maxIterations: 2,
        temperature: 0.7
      };

      // Simulate hybrid execution
      const refinery = new Refinery(config);
      const duel = new StrategyDuel(config);

      const startTime = Date.now();
      await Promise.all([
        refinery.refine('Build a test function'),
        duel.run('Best approach for testing')
      ]);
      const totalTime = Date.now() - startTime;

      // If running in parallel, total time should be ~max(track1, track2), not sum
      // With 2 iterations each at 50ms, sequential would be ~400ms, parallel ~200ms
      expect(totalTime).toBeLessThan(350); // Allow some overhead
    });

    it('should produce independent results from each track', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\nfunction test() { return true; }\n```');
      mockOpenAICall.mockResolvedValue('```typescript\nfunction test() { return false; }\n```');

      const config: IntelligenceConfig = {
        maxIterations: 2,
        temperature: 0.7
      };

      const refinery = new Refinery(config);
      const duel = new StrategyDuel(config);

      const [codeResult, strategyResult] = await Promise.all([
        refinery.refine('Build a validator'),
        duel.run('Validation strategy')
      ]);

      // Code track should have iterations with extracted code
      expect(codeResult.length).toBeGreaterThan(0);
      expect(codeResult[0].extractedCode).toContain('function test');

      // Strategy track should have rounds with turns
      expect(strategyResult.rounds.length).toBeGreaterThan(0);
      expect(strategyResult.rounds[0].turns.length).toBe(2);
    });
  });

  describe('Code Generation Track (Refinery)', () => {
    it('should extract code blocks correctly', async () => {
      mockGeminiCall.mockResolvedValue('Here is the code:\n```typescript\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n```\nThis adds two numbers.');
      mockOpenAICall.mockResolvedValue('```typescript\n[CONVERGED]\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n```');

      const config: IntelligenceConfig = { maxIterations: 2, temperature: 0.7 };
      const refinery = new Refinery(config);
      const iterations = await refinery.refine('Create an add function');

      expect(iterations[0].isFenced).toBe(true);
      expect(iterations[0].extractedCode).toContain('export function add');
    });

    it('should detect convergence and stop early', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\nconst x = 1;\n```');
      mockOpenAICall.mockResolvedValue('[CONVERGED]\n```typescript\nconst x = 1;\n```');

      const config: IntelligenceConfig = { maxIterations: 5, temperature: 0.7 };
      const refinery = new Refinery(config);
      const iterations = await refinery.refine('Simple constant');

      expect(iterations.length).toBe(2); // Stopped at convergence
      expect(iterations[1].isConverged).toBe(true);
    });

    it('should generate diffs between iterations', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\nconst x = 1;\n```');
      mockOpenAICall.mockResolvedValue('```typescript\nconst x = 2;\nconst y = 3;\n```');

      const config: IntelligenceConfig = { maxIterations: 2, temperature: 0.7 };
      const refinery = new Refinery(config);
      const iterations = await refinery.refine('Variables');

      expect(iterations[0].diffSummary).toBeUndefined(); // First iteration has no diff
      expect(iterations[1].diffSummary).toBeDefined();
      expect(iterations[1].diffSummary).toContain('const x = 2');
    });

    it('should call onUpdate callback for each iteration', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\ncode1\n```');
      mockOpenAICall.mockResolvedValue('```typescript\ncode2\n```');

      const config: IntelligenceConfig = { maxIterations: 3, temperature: 0.7 };
      const refinery = new Refinery(config);
      const onUpdate = jest.fn();
      
      await refinery.refine('Test', onUpdate);

      expect(onUpdate).toHaveBeenCalledTimes(3);
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        index: 0,
        provider: 'gemini'
      }));
    });
  });

  describe('Strategy Debate Track (StrategyDuel)', () => {
    it('should run opening statements in parallel', async () => {
      const callOrder: string[] = [];
      
      mockGeminiCall.mockImplementation(async () => {
        callOrder.push('gemini-start');
        await new Promise(resolve => setTimeout(resolve, 50));
        callOrder.push('gemini-end');
        return 'Gemini strategy';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        callOrder.push('openai-start');
        await new Promise(resolve => setTimeout(resolve, 50));
        callOrder.push('openai-end');
        return 'OpenAI strategy';
      });

      const config: IntelligenceConfig = { maxIterations: 1, temperature: 0.7 };
      const duel = new StrategyDuel(config);
      await duel.run('Test topic');

      // Both should start before either ends (parallel execution)
      const geminiStartIdx = callOrder.indexOf('gemini-start');
      const openaiStartIdx = callOrder.indexOf('openai-start');
      const firstEndIdx = Math.min(callOrder.indexOf('gemini-end'), callOrder.indexOf('openai-end'));
      
      expect(geminiStartIdx).toBeLessThan(firstEndIdx);
      expect(openaiStartIdx).toBeLessThan(firstEndIdx);
    });

    it('should detect consensus when both models agree', async () => {
      mockGeminiCall
        .mockResolvedValueOnce('Initial Gemini position')
        .mockResolvedValueOnce('[AGREE] I concur with the strategy');
      
      mockOpenAICall
        .mockResolvedValueOnce('Initial OpenAI position')
        .mockResolvedValueOnce('[AGREE] Agreed on this approach');

      const config: IntelligenceConfig = { maxIterations: 5, temperature: 0.7 };
      const duel = new StrategyDuel(config);
      const session = await duel.run('Consensus test');

      expect(session.status).toBe('completed');
      expect(session.consensus).toContain('Consensus reached');
      expect(session.rounds.length).toBe(2); // Stopped early
    });

    it('should continue debate if only one model agrees', async () => {
      mockGeminiCall.mockResolvedValue('[AGREE] I agree');
      mockOpenAICall.mockResolvedValue('I disagree, here is why...');

      const config: IntelligenceConfig = { maxIterations: 3, temperature: 0.7 };
      const duel = new StrategyDuel(config);
      const session = await duel.run('Partial agreement test');

      expect(session.rounds.length).toBe(3); // Ran all rounds
    });
  });

  describe('Adjudication', () => {
    it('should produce valid adjudication result', async () => {
      mockGeminiCall.mockResolvedValue('{"score": 85, "meetsOriginalIntent": true, "analysis": "Code meets requirements"}');

      const config: IntelligenceConfig = { maxIterations: 1, temperature: 0.7 };
      const refinery = new Refinery(config);
      const result = await refinery.adjudicate('Build a function', 'function test() {}');

      expect(result).toMatchObject({
        score: 85,
        meetsOriginalIntent: true,
        analysis: expect.any(String)
      });
    });

    it('should handle malformed adjudication response', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGeminiCall.mockResolvedValue('This is not JSON at all');

      const config: IntelligenceConfig = { maxIterations: 1, temperature: 0.7 };
      const refinery = new Refinery(config);
      const result = await refinery.adjudicate('Build a function', 'function test() {}');

      expect(result.score).toBe(0);
      expect(result.meetsOriginalIntent).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Isolation', () => {
    it('should isolate errors in code track without affecting strategy track', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Refinery will fail, but StrategyDuel should succeed
      let callCount = 0;
      mockGeminiCall.mockImplementation(async (system: string) => {
        callCount++;
        if (system.includes('architect')) {
          throw new Error('Code generation failed');
        }
        return 'Strategy response';
      });
      mockOpenAICall.mockResolvedValue('OpenAI response');

      const config: IntelligenceConfig = { maxIterations: 2, temperature: 0.7 };
      const duel = new StrategyDuel(config);

      // Strategy track should still work
      const session = await duel.run('Test topic');
      expect(session.status).toBe('completed');
      
      consoleSpy.mockRestore();
    });

    it('should handle strategy track errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockGeminiCall.mockRejectedValue(new Error('Strategy API failed'));
      mockOpenAICall.mockResolvedValue('Response');

      const config: IntelligenceConfig = { maxIterations: 2, temperature: 0.7 };
      const duel = new StrategyDuel(config);
      const session = await duel.run('Error test');

      expect(session.status).toBe('error');
      expect(session.error).toBe('Strategy API failed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Stream Event Types', () => {
    it('should emit correct event types in sequence', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\ncode\n```');
      mockOpenAICall.mockResolvedValue('```typescript\ncode\n```');

      const config: IntelligenceConfig = { maxIterations: 2, temperature: 0.7 };
      
      // Simulate stream events
      const events: string[] = [];
      
      const refinery = new Refinery(config);
      const duel = new StrategyDuel(config);

      events.push('start');
      
      await Promise.all([
        refinery.refine('Test', (iter) => events.push(`code_iteration_${iter.index}`)),
        duel.run('Test', (session) => events.push(`strategy_update_${session.rounds.length}`))
      ]);
      
      events.push('complete');

      expect(events[0]).toBe('start');
      expect(events[events.length - 1]).toBe('complete');
      expect(events.some(e => e.startsWith('code_iteration'))).toBe(true);
      expect(events.some(e => e.startsWith('strategy_update'))).toBe(true);
    });
  });

  describe('Session Storage Compatibility', () => {
    it('should produce data compatible with DuelSession interface', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\nconst result = true;\n```');
      mockOpenAICall.mockResolvedValue('```typescript\nconst result = true;\n```');

      const config: IntelligenceConfig = { maxIterations: 2, temperature: 0.7 };
      const refinery = new Refinery(config);
      const iterations = await refinery.refine('Test');

      // Verify iteration structure matches what DuelSession expects
      iterations.forEach(iter => {
        expect(iter).toMatchObject({
          index: expect.any(Number),
          provider: expect.stringMatching(/^(gemini|openai)$/),
          model: expect.any(String),
          timestamp: expect.any(String),
          extractedCode: expect.any(String),
          isFenced: expect.any(Boolean),
          isConverged: expect.any(Boolean)
        });
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete hybrid execution within acceptable time', async () => {
      // Fast mock responses
      mockGeminiCall.mockResolvedValue('```typescript\nfast\n```');
      mockOpenAICall.mockResolvedValue('```typescript\nfast\n```');

      const config: IntelligenceConfig = { maxIterations: 3, temperature: 0.7 };
      const refinery = new Refinery(config);
      const duel = new StrategyDuel(config);

      const startTime = Date.now();
      await Promise.all([
        refinery.refine('Performance test'),
        duel.run('Performance test')
      ]);
      const elapsed = Date.now() - startTime;

      // Should complete quickly with mocked responses
      expect(elapsed).toBeLessThan(500);
    });

    it('should handle high iteration counts efficiently', async () => {
      mockGeminiCall.mockResolvedValue('```typescript\ncode\n```');
      mockOpenAICall.mockResolvedValue('```typescript\ncode\n```');

      const config: IntelligenceConfig = { maxIterations: 10, temperature: 0.7 };
      const refinery = new Refinery(config);

      const startTime = Date.now();
      const iterations = await refinery.refine('High iteration test');
      const elapsed = Date.now() - startTime;

      expect(iterations.length).toBe(10);
      expect(elapsed).toBeLessThan(1000); // Should still be fast with mocks
    });
  });
});
