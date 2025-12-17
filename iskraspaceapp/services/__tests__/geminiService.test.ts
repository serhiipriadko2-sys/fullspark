/**
 * Tests for Gemini Service - AI integration with mocked Google API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IskraMetrics, Voice, Message } from '../../types';

// Mock environment variable BEFORE imports
vi.stubEnv('API_KEY', 'test-api-key');

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockGenerateContent, mockGenerateContentStream, mockEmbedContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGenerateContentStream: vi.fn(),
  mockEmbedContent: vi.fn(),
}));

// Mock Google GenAI
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
      embedContent: mockEmbedContent,
    },
  })),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array',
    INTEGER: 'integer',
  },
  Modality: {},
}));

// Mock dependencies
vi.mock('../voiceEngine', () => ({
  getSystemInstructionForVoice: vi.fn(() => 'Test system instruction'),
}));

vi.mock('../searchService', () => ({
  searchService: {
    searchHybrid: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../evalService', () => ({
  evaluateResponse: vi.fn(() => ({
    overall: 0.85,
    grade: 'A',
    flags: [],
    metrics: {
      accuracy: { score: 0.9, signals: [] },
      usefulness: { score: 0.8, signals: [] },
    },
  })),
}));

vi.mock('../policyEngine', () => ({
  policyEngine: {
    decide: vi.fn(() => ({
      classification: {
        playbook: 'ROUTINE',
        risk: 'low',
        stakes: 'low',
        suggestedVoices: ['ISKRA'],
      },
      config: {
        deltaRequired: false,
        siftDepth: 'light',
      },
      preActions: [],
    })),
    getConfig: vi.fn(() => ({})),
  },
}));

vi.mock('../deltaProtocol', () => ({
  deltaProtocol: {},
  enforceDeltaProtocol: vi.fn((text) => text),
  DELTA_PROTOCOL_INSTRUCTION: 'Delta protocol instruction',
}));

// Import after mocks
import { IskraAIService } from '../geminiService';

const createMetrics = (overrides: Partial<IskraMetrics> = {}): IskraMetrics => ({
  rhythm: 75,
  trust: 0.8,
  clarity: 0.7,
  pain: 0.2,
  drift: 0.2,
  chaos: 0.3,
  echo: 0.4,
  silence_mass: 0.2,
  mirror_sync: 0.7,
  interrupt: 0,
  ctxSwitch: 0,
  ...overrides,
});

const createVoice = (): Voice => ({
  name: 'ISKRA',
  description: 'Test voice',
  symbol: '⟡',
  color: '#fff',
});

describe('IskraAIService', () => {
  let service: IskraAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IskraAIService();
  });

  describe('getDailyAdvice', () => {
    it('returns daily advice with AI-generated insight', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          insight: 'Test insight from AI',
          why: 'Test reason',
        }),
      });

      const advice = await service.getDailyAdvice([
        { id: '1', title: 'Test task', completed: false, ritualTag: 'FIRE' },
      ]);

      expect(advice).toHaveProperty('deltaScore');
      expect(advice).toHaveProperty('insight');
      expect(advice).toHaveProperty('why');
      expect(advice.insight).toBe('Test insight from AI');
    });

    it('returns fallback on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      const advice = await service.getDailyAdvice([]);

      expect(advice.insight).toContain('Не удалось');
    }, 15000); // Increased timeout for retry logic

    it('calls API with task context', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ insight: 'test', why: 'test' }),
      });

      await service.getDailyAdvice([
        { id: '1', title: 'Important task', completed: false, ritualTag: 'SUN' },
      ]);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('Important task'),
        })
      );
    });
  });

  describe('getPlanTop3', () => {
    it('returns plan with 3 tasks', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          tasks: [
            { title: 'Task 1', ritualTag: 'FIRE' },
            { title: 'Task 2', ritualTag: 'WATER' },
            { title: 'Task 3', ritualTag: 'SUN' },
          ],
        }),
      });

      const plan = await service.getPlanTop3();

      expect(plan.tasks).toHaveLength(3);
      expect(plan.tasks[0]).toHaveProperty('title');
      expect(plan.tasks[0]).toHaveProperty('ritualTag');
    });

    it('returns fallback plan on error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      const plan = await service.getPlanTop3();

      expect(plan.tasks).toHaveLength(3);
      expect(plan.tasks[0].title).toBeDefined();
    }, 15000); // Increased timeout for retry logic
  });

  describe('getJournalPrompt', () => {
    it('returns journal prompt', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          question: 'Test reflective question?',
          why: 'Because reflection matters',
        }),
      });

      const prompt = await service.getJournalPrompt();

      expect(prompt.question).toBe('Test reflective question?');
      expect(prompt.why).toBe('Because reflection matters');
    });

    it('returns fallback on error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      const prompt = await service.getJournalPrompt();

      expect(prompt.question).toBeDefined();
      expect(prompt.why).toBeDefined();
    }, 15000); // Increased timeout for retry logic
  });

  describe('analyzeJournalEntry', () => {
    it('analyzes journal entry', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          reflection: 'Deep reflection on your entry',
          mood: 'Contemplative',
          signature: '⟡',
        }),
      });

      // Mock navigator.onLine
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      const analysis = await service.analyzeJournalEntry('Today I felt...');

      expect(analysis.reflection).toBe('Deep reflection on your entry');
      expect(analysis.mood).toBe('Contemplative');
      expect(analysis.signature).toBe('⟡');
    });

    it('returns offline fallback when offline', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const analysis = await service.analyzeJournalEntry('Test entry');

      expect(analysis.reflection).toContain('локально');
      expect(analysis.mood).toBe('Тишина');
    });
  });

  describe('getChatResponseStream', () => {
    it('streams chat response', async () => {
      const mockChunks = [
        { text: 'Hello, ' },
        { text: 'this is ' },
        { text: 'Iskra.' },
      ];

      mockGenerateContentStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        },
      });

      const voice = createVoice();
      const metrics = createMetrics();
      const history: Message[] = [{ role: 'user', text: 'Hello' }];

      const chunks: string[] = [];
      for await (const chunk of service.getChatResponseStream(history, voice, metrics)) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toBe('Hello, this is Iskra.');
    });

    it('yields error message on API failure', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('Stream error'));

      const voice = createVoice();
      const metrics = createMetrics();
      const history: Message[] = [{ role: 'user', text: 'Hello' }];

      const chunks: string[] = [];
      for await (const chunk of service.getChatResponseStream(history, voice, metrics)) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toContain('разрыв');
    });
  });

  describe('getChatResponseStreamWithEval', () => {
    it('streams response and returns eval result', async () => {
      mockGenerateContentStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { text: 'Test response' };
        },
      });

      const voice = createVoice();
      const metrics = createMetrics();
      const history: Message[] = [{ role: 'user', text: 'Test question' }];

      const stream = service.getChatResponseStreamWithEval(history, voice, metrics);

      // Collect chunks and get return value
      let fullText = '';
      let result;
      while (true) {
        const { value, done } = await stream.next();
        if (done) {
          result = value;
          break;
        }
        fullText += value;
      }

      expect(fullText).toBe('Test response');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('grade');
    });
  });

  describe('getChatResponseStreamWithPolicy', () => {
    it('applies policy decision to response', async () => {
      mockGenerateContentStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { text: 'Policy-routed response' };
        },
      });

      const voice = createVoice();
      const metrics = createMetrics();
      const history: Message[] = [{ role: 'user', text: 'Important decision' }];

      const stream = service.getChatResponseStreamWithPolicy(history, voice, metrics);

      let fullText = '';
      let result;
      while (true) {
        const { value, done } = await stream.next();
        if (done) {
          result = value;
          break;
        }
        fullText += value;
      }

      expect(result).toHaveProperty('eval');
      expect(result).toHaveProperty('policy');
      expect(result.policy.classification.playbook).toBe('ROUTINE');
    });
  });

  describe('getEmbedding', () => {
    it('returns embedding vector', async () => {
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      });

      const embedding = await service.getEmbedding('test text');

      expect(embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('returns empty array on error', async () => {
      mockEmbedContent.mockRejectedValue(new Error('Embedding error'));

      const embedding = await service.getEmbedding('test');

      expect(embedding).toEqual([]);
    }, 15000); // Increased timeout for retry logic
  });

  describe('getTextToSpeech', () => {
    it('returns base64 audio data', async () => {
      const audio = await service.getTextToSpeech('Test text', 'ISKRA');

      expect(typeof audio).toBe('string');
      expect(audio.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeConversation', () => {
    it('returns conversation analysis', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          summary: 'Conversation summary',
          keyPoints: ['Point 1', 'Point 2'],
          mainThemes: ['Theme 1'],
          brainstormIdeas: ['Idea 1'],
          connectionQuality: { score: 85, assessment: 'Good connection' },
          unspokenQuestions: ['Hidden question'],
        }),
      });

      const history = [
        { role: 'user' as const, text: 'Hello' },
        { role: 'assistant' as const, text: 'Hi there' },
      ];

      const analysis = await service.analyzeConversation(history);

      expect(analysis.summary).toBe('Conversation summary');
      expect(analysis.keyPoints).toContain('Point 1');
      expect(analysis.connectionQuality.score).toBe(85);
    });

    it('returns error analysis on failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Analysis failed'));

      const analysis = await service.analyzeConversation([]);

      expect(analysis.summary).toContain('Ошибка');
      expect(analysis.connectionQuality.score).toBe(0);
    }, 15000); // Increased timeout for retry logic
  });

  describe('performDeepResearch', () => {
    it('returns research report', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          title: 'Research Title',
          synthesis: 'Deep synthesis',
          keyPatterns: ['Pattern 1'],
          tensionPoints: ['Tension 1'],
          unseenConnections: ['Connection 1'],
          reflectionQuestion: 'What have you learned?',
        }),
      });

      const contextNodes = [{
        id: '1',
        title: 'Test node',
        content: { text: 'Content' },
        timestamp: new Date().toISOString(),
        type: 'insight' as const,
        layer: 'archive' as const,
        tags: [],
        evidence: [],
      }];

      const report = await service.performDeepResearch('test topic', contextNodes);

      expect(report.title).toBe('Research Title');
      expect(report.synthesis).toBe('Deep synthesis');
      expect(report.keyPatterns).toContain('Pattern 1');
    });

    it('uses audit mode instructions when specified', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          title: 'Audit',
          synthesis: 'Audit findings',
          keyPatterns: [],
          tensionPoints: [],
          unseenConnections: [],
          reflectionQuestion: 'Question',
        }),
      });

      await service.performDeepResearch('test', [], 'audit');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('AUDIT'),
        })
      );
    });
  });

  describe('generateFocusArtifact', () => {
    it('generates unique artifact', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          title: 'Ritual of Clarity',
          description: 'A personal ritual for focus',
          action: 'Breathe deeply for 5 minutes',
          rune: '☉',
        }),
      });

      const artifact = await service.generateFocusArtifact([]);

      expect(artifact.title).toBe('Ritual of Clarity');
      expect(artifact.rune).toBe('☉');
    });

    it('returns fallback artifact on error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Generation failed'));

      const artifact = await service.generateFocusArtifact([]);

      expect(artifact.title).toBe('Дар Тишины');
      expect(artifact.rune).toBe('≈');
    }, 15000); // Increased timeout for retry logic
  });

  describe('evaluateAIResponse', () => {
    it('evaluates response using evalService', () => {
      const result = service.evaluateAIResponse('Test response', {
        userQuery: 'Test query',
      });

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('grade');
    });
  });

  describe('getRuneInterpretationStream', () => {
    it('streams rune interpretation', async () => {
      mockGenerateContentStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { text: '**Зеркало:** Test interpretation' };
        },
      });

      const chunks: string[] = [];
      for await (const chunk of service.getRuneInterpretationStream(
        'What should I do?',
        ['Fehu', 'Uruz', 'Thurisaz'],
        createVoice()
      )) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toContain('Зеркало');
    });

    it('yields error message on failure', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('Stream error'));

      const chunks: string[] = [];
      for await (const chunk of service.getRuneInterpretationStream(
        'Question',
        ['Rune1'],
        createVoice()
      )) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toContain('Разрыв');
    });
  });
});
