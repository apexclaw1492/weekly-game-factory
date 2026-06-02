export class SoundSynth {
  private static audioCtx: AudioContext | null = null;

  private static createContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  static unlock(): void {
    try {
      const ctx = this.createContext();
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
    } catch {
      // Audio is optional; gameplay must never depend on it.
    }
  }

  private static getContext(): AudioContext | null {
    const ctx = this.createContext();
    return ctx.state === 'running' ? ctx : null;
  }

  static playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.05
  ): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Fail silently if audio context is blocked
    }
  }

  static playShoot(): void {
    this.playTone(880, 0.06, 'square', 0.03);
  }

  static playHit(): void {
    this.playTone(220, 0.12, 'sawtooth', 0.05);
    setTimeout(() => this.playTone(160, 0.08, 'sawtooth', 0.03), 60);
  }

  static playExplosion(): void {
    this.playTone(120, 0.25, 'sawtooth', 0.08);
  }

  static playSplit(): void {
    this.playTone(440, 0.08, 'square', 0.04);
    setTimeout(() => this.playTone(660, 0.06, 'square', 0.03), 40);
  }

  static playDeath(): void {
    this.playTone(180, 0.2, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(90, 0.3, 'sawtooth', 0.06), 100);
  }

  static playThrust(): void {
    if (Math.random() < 0.15) {
      this.playTone(120, 0.06, 'sawtooth', 0.015);
    }
  }

  static playLevelUp(): void {
    [400, 500, 600, 800].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.12, 'sine', 0.05), i * 100);
    });
  }

  static playFlip(): void {
    this.playTone(200, 0.15, 'sine', 0.06);
    setTimeout(() => this.playTone(350, 0.1, 'sine', 0.04), 50);
  }

  static playCollect(): void {
    this.playTone(800, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.06), 80);
  }

  static playNearMiss(): void {
    this.playTone(400, 0.08, 'sawtooth', 0.03);
  }

  static playBoost(): void {
    this.playTone(600, 0.1, 'square', 0.04);
  }

  static playPowerUp(): void {
    this.playTone(500, 0.06, 'sine', 0.04);
    setTimeout(() => this.playTone(700, 0.06, 'sine', 0.04), 70);
    setTimeout(() => this.playTone(900, 0.1, 'sine', 0.04), 140);
  }
}
