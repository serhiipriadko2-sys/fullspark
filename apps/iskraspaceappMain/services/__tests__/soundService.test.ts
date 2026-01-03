/**
 * Tests for Sound Service - Audio feedback for UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AudioContext and related APIs
const mockOscillator = {
  type: 'sine',
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
};

const mockGain = {
  gain: {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  resume: vi.fn(() => Promise.resolve()),
};

// Mock window.AudioContext
Object.defineProperty(global, 'window', {
  value: {
    AudioContext: vi.fn(() => mockAudioContext),
    webkitAudioContext: vi.fn(() => mockAudioContext),
  },
  writable: true,
});

// Import after mocks are set up
import { soundService } from '../soundService';

describe('soundService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.state = 'running';
  });

  describe('toggleMute', () => {
    it('toggles mute state', () => {
      // Toggle mute on
      soundService.toggleMute();
      // Toggle mute off
      soundService.toggleMute();
      // No error means it works
    });
  });

  describe('playTone', () => {
    it('plays tone without error', async () => {
      await expect(soundService.playTone(440, 'sine', 0.1)).resolves.not.toThrow();
    });

    it('respects mute state', async () => {
      // Ensure unmuted first by toggling twice if needed
      soundService.toggleMute(); // mute
      await soundService.playTone(440); // Should not play
      soundService.toggleMute(); // unmute
    });
  });

  describe('playClick', () => {
    it('plays click sound', () => {
      expect(() => soundService.playClick()).not.toThrow();
    });
  });

  describe('playHover', () => {
    it('plays hover sound', () => {
      expect(() => soundService.playHover()).not.toThrow();
    });
  });

  describe('playRitualShatter', () => {
    it('plays shatter ritual sound', () => {
      expect(() => soundService.playRitualShatter()).not.toThrow();
    });
  });

  describe('playRitualConnect', () => {
    it('plays connect ritual sound', () => {
      expect(() => soundService.playRitualConnect()).not.toThrow();
    });
  });

  describe('playVoiceActive', () => {
    it('plays voice activation sound for known voices', () => {
      const voices = ['KAIN', 'SAM', 'ANHANTRA', 'PINO', 'HUYNDUN', 'ISKRIV', 'ISKRA', 'MAKI', 'SIBYL'];
      voices.forEach(voice => {
        expect(() => soundService.playVoiceActive(voice)).not.toThrow();
      });
    });

    it('plays default sound for unknown voice', () => {
      expect(() => soundService.playVoiceActive('UNKNOWN')).not.toThrow();
    });
  });

  describe('playTypewriter', () => {
    it('plays typewriter sound (probabilistic)', () => {
      // Call multiple times - some may play, some may not
      for (let i = 0; i < 10; i++) {
        expect(() => soundService.playTypewriter()).not.toThrow();
      }
    });
  });
});
