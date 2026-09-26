import { store } from './storage';

let actx: AudioContext | null = null;
let muted = store.get('olly.muted', false);

export const isMuted = () => muted;
export function setMuted(value: boolean) {
  muted = value;
  store.set('olly.muted', value);
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, slideTo?: number, delay = 0) {
  if (muted) return;
  try {
    actx ??= new AudioContext();
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {}
}

export const sfx = {
  woof() { tone(420, 0.09, 'square', 0.09, 180); tone(380, 0.12, 'square', 0.09, 150, 0.13); },
  bonk() { tone(120, 0.08, 'triangle', 0.12, 70); },
  sniff() { for (let i = 0; i < 4; i++) tone(900 + i * 120, 0.05, 'sawtooth', 0.03, 1400, i * 0.07); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.07, undefined, i * 0.09)); },
};
