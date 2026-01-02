import { GeminiProvider, OpenAIProvider } from '../llm-providers';

const mockCreate = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }));
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    })
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
  },
  HarmBlockThreshold: {
    BLOCK_NONE: 'BLOCK_NONE'
  }
}));

describe('LLM Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.GEMINI_API_KEY = 'test-key';
  });

  describe('OpenAIProvider', () => {
    it('should call OpenAI API with correct parameters', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test response from OpenAI' } }]
      });

      const provider = new OpenAIProvider('gpt-4o', 0.7);
      const result = await provider.call('System instruction', 'User prompt');

      expect(result).toBe('Test response from OpenAI');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'System instruction' },
          { role: 'user', content: 'User prompt' }
        ]
      });
    });

    it('should log timing information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }]
      });

      const provider = new OpenAIProvider('gpt-4o', 0.7);
      await provider.call('System', 'User');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[OpenAI] Starting call'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[OpenAI] Completed in'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('GeminiProvider', () => {
    it('should call Gemini API with correct parameters', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Test response from Gemini'
        }
      });

      const provider = new GeminiProvider('gemini-2.5-flash', 0.7);
      const result = await provider.call('System instruction', 'User prompt');

      expect(result).toBe('Test response from Gemini');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'User prompt' }] }],
        generationConfig: { temperature: 0.7 },
        safetySettings: expect.any(Array)
      });
    });

    it('should log timing information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Response'
        }
      });

      const provider = new GeminiProvider('gemini-2.5-flash', 0.7);
      await provider.call('System', 'User');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Gemini] Starting call'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Gemini] Completed in'));
      
      consoleSpy.mockRestore();
    });
  });
});
