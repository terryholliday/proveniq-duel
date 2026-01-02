import { StrategyDuel } from '../strategy-duel';
import { IntelligenceConfig } from '../types';

jest.mock('../llm-providers');

describe('StrategyDuel', () => {
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

  describe('Parallel Execution', () => {
    it('should execute Round 1 in parallel', async () => {
      let geminiStartTime = 0;
      let openaiStartTime = 0;
      
      mockGeminiCall.mockImplementation(async () => {
        geminiStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'Gemini response';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        openaiStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'OpenAI response';
      });

      const config: IntelligenceConfig = {
        maxIterations: 1,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      await duel.run('Test topic');

      const timeDiff = Math.abs(geminiStartTime - openaiStartTime);
      expect(timeDiff).toBeLessThan(50);
    });

    it('should execute subsequent rounds in parallel', async () => {
      const callTimestamps: number[] = [];
      
      mockGeminiCall.mockImplementation(async () => {
        callTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'Gemini response';
      });
      
      mockOpenAICall.mockImplementation(async () => {
        callTimestamps.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'OpenAI response';
      });

      const config: IntelligenceConfig = {
        maxIterations: 2,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      await duel.run('Test topic');

      expect(callTimestamps.length).toBe(4);
      
      const round2Diff = Math.abs(callTimestamps[2] - callTimestamps[3]);
      expect(round2Diff).toBeLessThan(50);
    });
  });

  describe('Consensus Detection', () => {
    it('should detect consensus when both models agree', async () => {
      mockGeminiCall
        .mockResolvedValueOnce('Initial Gemini')
        .mockResolvedValueOnce('[AGREE] Gemini agrees');
      
      mockOpenAICall
        .mockResolvedValueOnce('Initial OpenAI')
        .mockResolvedValueOnce('[AGREE] OpenAI agrees');

      const config: IntelligenceConfig = {
        maxIterations: 5,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const session = await duel.run('Test topic');

      expect(session.status).toBe('completed');
      expect(session.consensus).toContain('Consensus reached');
      expect(session.rounds.length).toBe(2);
    });

    it('should continue if only one model agrees', async () => {
      mockGeminiCall.mockResolvedValue('Gemini response');
      mockOpenAICall.mockResolvedValue('OpenAI response');

      const config: IntelligenceConfig = {
        maxIterations: 3,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const session = await duel.run('Test topic');

      expect(session.rounds.length).toBe(3);
      expect(session.status).toBe('completed');
    });
  });

  describe('Session Structure', () => {
    it('should create valid session with all required fields', async () => {
      mockGeminiCall.mockResolvedValue('Gemini response');
      mockOpenAICall.mockResolvedValue('OpenAI response');

      const config: IntelligenceConfig = {
        maxIterations: 2,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const session = await duel.run('Test topic');

      expect(session).toMatchObject({
        id: expect.any(String),
        topic: 'Test topic',
        rounds: expect.any(Array),
        status: 'completed'
      });

      expect(session.rounds[0]).toMatchObject({
        index: 0,
        turns: expect.arrayContaining([
          expect.objectContaining({
            provider: 'gemini',
            content: expect.any(String),
            timestamp: expect.any(String)
          }),
          expect.objectContaining({
            provider: 'openai',
            content: expect.any(String),
            timestamp: expect.any(String)
          })
        ])
      });
    });

    it('should call onUpdate callback for each round', async () => {
      mockGeminiCall.mockResolvedValue('Response');
      mockOpenAICall.mockResolvedValue('Response');

      const config: IntelligenceConfig = {
        maxIterations: 3,
        temperature: 0.7
      };

      const onUpdate = jest.fn();
      const duel = new StrategyDuel(config);
      await duel.run('Test topic', onUpdate);

      expect(onUpdate).toHaveBeenCalledTimes(3);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          rounds: expect.any(Array)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockGeminiCall.mockRejectedValue(new Error('API Error'));
      mockOpenAICall.mockResolvedValue('Response');

      const config: IntelligenceConfig = {
        maxIterations: 2,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const session = await duel.run('Test topic');

      expect(session.status).toBe('error');
      expect(session.error).toBe('API Error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Duel failed:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Max Iterations', () => {
    it('should respect maxIterations config', async () => {
      mockGeminiCall.mockResolvedValue('Response');
      mockOpenAICall.mockResolvedValue('Response');

      const config: IntelligenceConfig = {
        maxIterations: 3,
        temperature: 0.7
      };

      const duel = new StrategyDuel(config);
      const session = await duel.run('Test topic');

      expect(session.rounds.length).toBe(3);
      expect(session.consensus).toContain('Max rounds reached');
    });
  });
});
