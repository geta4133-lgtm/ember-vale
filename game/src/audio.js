// Audio: tiny WebAudio synth — no files, all generated.
let ctx = null;
function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
function tone({ freq = 440, dur = 0.1, type = 'square', vol = 0.15, slide = 0, delay = 0 }) {
  const a = ac(); const t0 = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise({ dur = 0.2, vol = 0.2, delay = 0 }) {
  const a = ac(); const t0 = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); const g = a.createGain();
  src.buffer = buf; g.gain.value = vol;
  src.connect(g); g.connect(a.destination); src.start(t0);
}
export const Sfx = {
  shoot: () => tone({ freq: 760, dur: 0.07, type: 'square', vol: 0.08, slide: -320 }),
  hit: () => tone({ freq: 190, dur: 0.08, type: 'sawtooth', vol: 0.1, slide: -60 }),
  kill: () => { noise({ dur: 0.14, vol: 0.16 }); tone({ freq: 130, dur: 0.16, type: 'triangle', vol: 0.14, slide: -70 }); },
  hurt: () => tone({ freq: 110, dur: 0.22, type: 'sawtooth', vol: 0.22, slide: -55 }),
  xp: () => tone({ freq: 880, dur: 0.06, type: 'sine', vol: 0.09, slide: 240 }),
  level: () => { tone({ freq: 523, dur: 0.1, vol: 0.13 }); tone({ freq: 659, dur: 0.1, vol: 0.13, delay: 0.09 }); tone({ freq: 784, dur: 0.16, vol: 0.15, delay: 0.18 }); },
  boss: () => { tone({ freq: 82, dur: 0.5, type: 'sawtooth', vol: 0.2 }); noise({ dur: 0.4, vol: 0.12 }); },
  wave: () => tone({ freq: 392, dur: 0.14, type: 'triangle', vol: 0.12, slide: 120 }),
  over: () => { tone({ freq: 330, dur: 0.25, vol: 0.15 }); tone({ freq: 262, dur: 0.3, vol: 0.15, delay: 0.22 }); tone({ freq: 196, dur: 0.5, vol: 0.16, delay: 0.5 }); },
};
