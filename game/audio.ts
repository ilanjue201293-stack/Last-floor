type SoundName = "click" | "door" | "reward" | "hit" | "combo" | "danger" | "checkpoint" | "boss" | "gameover" | "victory" | "dash";

class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.context) {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.08;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  setVolume(volume: number) {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, volume)) * 0.16;
  }

  play(name: SoundName, enabled: boolean, volume: number) {
    if (!enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.setVolume(volume);

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const values: Record<SoundName, [number, number, number, OscillatorType]> = {
      click: [300, 340, 0.05, "sine"],
      door: [110, 180, 0.24, "triangle"],
      reward: [540, 840, 0.16, "sine"],
      hit: [120, 70, 0.12, "sawtooth"],
      combo: [420, 880, 0.11, "square"],
      danger: [180, 80, 0.2, "square"],
      checkpoint: [260, 680, 0.26, "triangle"],
      boss: [80, 55, 0.34, "sawtooth"],
      gameover: [170, 55, 0.42, "triangle"],
      victory: [440, 990, 0.48, "sine"],
      dash: [160, 700, 0.1, "sine"],
    };
    const [start, end, duration, type] = values[name];
    osc.type = type;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

export const audio = new AudioEngine();
