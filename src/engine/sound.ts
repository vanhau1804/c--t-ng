export type SoundKind = 'pick' | 'move' | 'capture' | 'check' | 'win' | 'lose';

export interface SoundPlayer {
  /** Gọi ngay trong lúc người chơi chạm vào trang để trình duyệt cho phép phát tiếng. */
  unlock(): void;
  play(kind: SoundKind): void;
  setEnabled(on: boolean): void;
  dispose(): void;
}

export const silentSound: SoundPlayer = { unlock() {}, play() {}, setEnabled() {}, dispose() {} };

/** Âm thanh tạo bằng Web Audio, không cần tệp âm thanh nào. */
export function createSound(): SoundPlayer {
  let ac: AudioContext | null = null;
  let enabled = true;

  const ctx = (): AudioContext | null => {
    try {
      if (!ac) {
        const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
        const AC = w.AudioContext ?? w.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended') void ac.resume();
      return ac;
    } catch {
      return null;
    }
  };

  return {
    unlock() {
      ctx();
    },
    setEnabled(on) {
      enabled = on;
    },
    play(kind) {
      if (!enabled) return;
      const a = ctx();
      if (!a) return;
      try {
        const t0 = a.currentTime;
        const out = a.createGain();
        out.gain.value = 0.8;
        out.connect(a.destination);

        const noise = (dur: number) => {
          const n = Math.max(1, Math.floor(a.sampleRate * dur));
          const buf = a.createBuffer(1, n, a.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
          return buf;
        };
        // tiếng gõ gỗ: một tiếng "cạch" ngắn cộng một tiếng trầm
        const knock = (at: number, vol: number, freq: number, body: number) => {
          const src = a.createBufferSource();
          src.buffer = noise(0.06);
          const bp = a.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = freq;
          bp.Q.value = 1.2;
          const g = a.createGain();
          g.gain.setValueAtTime(vol, at);
          g.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
          src.connect(bp);
          bp.connect(g);
          g.connect(out);
          src.start(at);
          const o = a.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(body, at);
          o.frequency.exponentialRampToValueAtTime(body * 0.5, at + 0.1);
          const og = a.createGain();
          og.gain.setValueAtTime(vol * 0.9, at);
          og.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
          o.connect(og);
          og.connect(out);
          o.start(at);
          o.stop(at + 0.14);
        };
        const tone = (at: number, freq: number, dur: number, vol: number, type: OscillatorType = 'sine') => {
          const o = a.createOscillator();
          o.type = type;
          o.frequency.value = freq;
          const g = a.createGain();
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          o.connect(g);
          g.connect(out);
          o.start(at);
          o.stop(at + dur + 0.05);
        };

        if (kind === 'pick') knock(t0, 0.16, 2200, 420);
        else if (kind === 'move') knock(t0, 0.55, 1500, 230);
        else if (kind === 'capture') {
          knock(t0, 0.7, 1200, 190);
          knock(t0 + 0.09, 0.5, 1700, 260);
        } else if (kind === 'check') {
          // tiếng chiêng báo chiếu tướng
          for (const [f, v, d] of [[220, 0.26, 1.3], [330, 0.16, 1.0], [554, 0.12, 0.8], [880, 0.08, 0.5]]) tone(t0, f, d, v);
          knock(t0, 0.35, 900, 150);
          tone(t0 + 0.25, 1320, 0.4, 0.14, 'triangle');
        } else if (kind === 'win') {
          [523, 659, 784, 1047].forEach((f, i) => tone(t0 + i * 0.13, f, 0.5, 0.25, 'triangle'));
        } else if (kind === 'lose') {
          [392, 330, 262, 196].forEach((f, i) => tone(t0 + i * 0.18, f, 0.6, 0.22));
        }
      } catch {
        /* lỗi âm thanh không được làm hỏng ván cờ */
      }
    },
    dispose() {
      if (ac && ac.state !== 'closed') void ac.close();
      ac = null;
    }
  };
}
