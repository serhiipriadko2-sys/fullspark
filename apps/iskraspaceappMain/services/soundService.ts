
class SoundService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  private init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.1; // Low volume default
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (e) {
      console.error("AudioContext initialization failed", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.1;
    }
  }

  // Play a simple tone (sine, square, etc.)
  async playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1, attack = 0.01) {
    if (this.isMuted) return;
    
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Check and resume context if suspended (browsers block auto-play)
    if (this.ctx.state === 'suspended') {
        try {
            await this.ctx.resume();
        } catch (e) {
            // Interaction required
            console.debug("Audio context resume failed (needs gesture)", e);
            return;
        }
    }

    try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
        
        // Garbage collect nodes after playing
        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, duration * 1000 + 100);

    } catch (e) {
        console.warn("Error generating tone", e);
    }
  }

  // UI Interaction Sounds
  playClick() {
    this.playTone(800, 'sine', 0.05, 0.005);
  }

  playHover() {
    // Very subtle chirp
    this.playTone(1200, 'sine', 0.02, 0.001);
  }

  // Ritual Sounds based on Canon
  playRitualShatter() {
    if (this.isMuted) return;
    
    // Dissonant crunch
    this.playTone(100, 'sawtooth', 0.5);
    setTimeout(() => this.playTone(87, 'square', 0.4), 50);
    setTimeout(() => this.playTone(50, 'sawtooth', 0.6), 100);
  }

  playRitualConnect() {
     // 440Hz pure light
     this.playTone(440, 'sine', 1.5, 0.5);
     setTimeout(() => this.playTone(660, 'sine', 1.0, 0.5), 200);
  }
  
  playVoiceActive(voice: string) {
      // Specific frequencies for voices
      const freqs: Record<string, number> = {
          'KAIN': 240,
          'SAM': 660,
          'ANHANTRA': 110,
          'PINO': 880,
          'HUNDUN': 80,
          'ISKRIV': 700,
          'ISKRA': 440,
          'MAKI': 520,
          'SIBYL': 333
      };
      const f = freqs[voice] || 440;
      this.playTone(f, 'triangle', 0.3, 0.1);
  }
  
  playTypewriter() {
      // Very quiet mechanical click
      if (Math.random() > 0.7) { // Don't play on every letter
          this.playTone(2000 + Math.random() * 500, 'square', 0.01, 0.001);
      }
  }
}

export const soundService = new SoundService();
