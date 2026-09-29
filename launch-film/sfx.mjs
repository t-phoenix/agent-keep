import { writeFileSync } from "node:fs";

const SR = 48000;
const DUR = 90;
const buf = new Float32Array(SR * DUR);

let seed = 42;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;

function add(t0, len, amp, fn) {
  const start = Math.floor(t0 * SR);
  const n = Math.floor(len * SR);
  for (let i = 0; i < n && start + i < buf.length; i++) buf[start + i] += amp * fn(i / SR);
}

const BPM = 100;
const beat = 60 / BPM;
for (let i = 0; i < DUR / beat; i++) {
  const t = i * beat;
  const down = i % 4 === 0;
  add(t, 1.6, down ? 0.11 : 0.035, (u) => Math.sin(2 * Math.PI * 98 * u) * Math.exp(-u * 2.4));
  if (down) add(t, 1.8, 0.045, (u) => Math.sin(2 * Math.PI * 196 * u) * Math.exp(-u * 1.6));
}

for (const t of [0, 5.4, 10.8, 18, 25.2, 32.4, 39.6, 46.2, 52.8, 58.8, 66, 72.6, 79.2]) {
  add(t, 0.4, 0.22, (u) => Math.sin(2 * Math.PI * (72 - 28 * u) * u) * Math.exp(-u * 9));
}

const n = buf.length;
const b = Buffer.alloc(44 + n * 2);
b.write("RIFF", 0);
b.writeUInt32LE(36 + n * 2, 4);
b.write("WAVEfmt ", 8);
b.writeUInt32LE(16, 16);
b.writeUInt16LE(1, 20);
b.writeUInt16LE(1, 22);
b.writeUInt32LE(SR, 24);
b.writeUInt32LE(SR * 2, 28);
b.writeUInt16LE(2, 32);
b.writeUInt16LE(16, 34);
b.write("data", 36);
b.writeUInt32LE(n * 2, 40);
let peak = 0;
for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf[i]));
const gain = peak > 0 ? 0.7 / peak : 1;
for (let i = 0; i < n; i++) {
  const s = Math.max(-1, Math.min(1, buf[i] * gain));
  b.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
}
writeFileSync("out/score.wav", b);
console.log("out/score.wav", "peak", peak.toFixed(3));
