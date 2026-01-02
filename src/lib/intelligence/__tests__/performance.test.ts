import { StrategyDuel } from '../strategy-duel';
import { IntelligenceConfig } from '../types';

jest.mock('../llm-providers');

describe('Performance Benchmarks', () => {
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

  describe('Parallel vs Sequential Performance', () => {
    it('should complete 5 rounds faster with parallel execution', async () => {
      const API_DELAY = 100;
      
      mockGeminiCall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        return 'Gemini response';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, API_DELAY));
        return 'OpenAI response';
      });

      const config: IntelligenceConfig = {
        maxIterations: 5,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const startTime = Date.now();
      await duel.run('Performance test');
      const elapsed = Date.now() - startTime;

      const expectedParallelTime = 5 * API_DELAY;
      const expectedSequentialTime = 5 * 2 * API_DELAY;
      
      expect(elapsed).toBeLessThan(expectedSequentialTime);
      expect(elapsed).toBeGreaterThanOrEqual(expectedParallelTime * 0.9);
      
      console.log(`Parallel execution: ${elapsed}ms (expected ~${expectedParallelTime}ms)`);
      console.log(`Sequential would be: ~${expectedSequentialTime}ms`);
      console.log(`Speedup: ${(expectedSequentialTime / elapsed).toFixed(2)}x`);
    });

    it('should demonstrate 2x speedup for debate rounds', async () => {
      const callDurations: number[] = [];
      
      mockGeminiCall.mockImplementation(async () => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        callDurations.push(Date.now() - start);
        return 'Response';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        callDurations.push(Date.now() - start);
        return 'Response';
      });

      const config: IntelligenceConfig = {
        maxIterations: 3,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const startTime = Date.now();
      await duel.run('Test');
      const totalTime = Date.now() - startTime;

      const totalCallTime = callDurations.reduce((sum, d) => sum + d, 0);
      const efficiency = totalTime / totalCallTime;
      
      expect(efficiency).toBeLessThan(0.7);
      
      console.log(`Total execution: ${totalTime}ms`);
      console.log(`Sum of all calls: ${totalCallTime}ms`);
      console.log(`Efficiency ratio: ${efficiency.toFixed(2)} (lower = more parallel)`);
    });
  });

  describe('Real-world Performance Expectations', () => {
    it('should complete 5-round duel in under 4 minutes with 30s API calls', async () => {
      const REALISTIC_API_DELAY = 30000;
      
      mockGeminiCall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Response';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Response';
      });

      const config: IntelligenceConfig = {
        maxIterations: 5,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const startTime = Date.now();
      await duel.run('Test');
      const elapsed = Date.now() - startTime;

      const scaledExpectedTime = (elapsed / 100) * REALISTIC_API_DELAY;
      const fourMinutes = 4 * 60 * 1000;
      
      expect(scaledExpectedTime).toBeLessThan(fourMinutes);
      
      console.log(`Scaled to 30s API calls: ${(scaledExpectedTime / 1000).toFixed(1)}s`);
      console.log(`Expected: < 240s (4 minutes)`);
    }, 10000);
  });

  describe('Call Count Verification', () => {
    it('should make exactly 2N API calls for N rounds', async () => {
      mockGeminiCall.mockResolvedValue('Response');
      mockOpenAICall.mockResolvedValue('Response');

      const config: IntelligenceConfig = {
        maxIterations: 5,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      await duel.run('Test');

      expect(mockGeminiCall).toHaveBeenCalledTimes(5);
      expect(mockOpenAICall).toHaveBeenCalledTimes(5);
    });
  });
});
