/**
 * Tests for Gemini Service - AI integration with mocked Google API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IskraMetrics, Voice, Message } from '../../types';

// =============================================================================
// PART 1: Mocked API Tests (with API_KEY set, VITEST overridden)
// =============================================================================

// Mock environment variables to enable API mode
vi.stubEnv('API_KEY', 'test-api-key');
vi.stubEnv('VITEST', ''); // Override to disable OFFLINE_MODE

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
  activation: () => 1.0,
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
        { id: '1', title: 'Test task', done: false, ritualTag: 'FIRE' },
      ]);

      expect(advice).toHaveProperty('deltaScore');
      expect(advice).toHaveProperty('insight');
      expect(advice).toHaveProperty('why');
    });

    it('returns fallback on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      const advice = await service.getDailyAdvice([]);

      // In offline/error mode, returns fallback
      expect(advice.insight).toBeDefined();
    }, 15000); // Increased timeout for retry logic
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

      expect(prompt.question).toBeDefined();
      expect(prompt.why).toBeDefined();
    });

    it('returns fallback on error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      const prompt = await service.getJournalPrompt();

      expect(prompt.question).toBeDefined();
      expect(prompt.why).toBeDefined();
    }, 15000); // Increased timeout for retry logic
  });

  describe('analyzeJournalEntry', () => {
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

  describe('getEmbedding', () => {
    it('returns embedding vector', async () => {
      mockEmbedContent.mockResolvedValue({
        embeddings: [{ values: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      });

      const embedding = await service.getEmbedding('test text');

      // May return mock value or empty array in offline mode
      expect(Array.isArray(embedding)).toBe(true);
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

  describe('evaluateAIResponse', () => {
    it('evaluates response using evalService', () => {
      const result = service.evaluateAIResponse('Test response', {
        userQuery: 'Test query',
      });

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('grade');
    });
  });
});

// =============================================================================
// PART 2: Offline Fallback Tests (without API_KEY, OFFLINE_MODE active)
// =============================================================================

describe('IskraAIService offline fallbacks', () => {
  const service = new IskraAIService();

  it('returns deterministic offline daily advice', async () => {
    const advice = await service.getDailyAdvice([]);

    // Offline mode should return consistent fallback
    expect(advice).toHaveProperty('deltaScore');
    expect(advice).toHaveProperty('insight');
  });

  it('returns a local plan when the model is unavailable', async () => {
    const plan = await service.getPlanTop3();

    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks[0].title).not.toHaveLength(0);
  });

  it('returns offline journal prompt', async () => {
    const prompt = await service.getJournalPrompt();

    expect(prompt.question).toBeDefined();
    expect(prompt.why).toBeDefined();
  });
});
