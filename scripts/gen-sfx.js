// Sinh các file WAV hiệu ứng âm thanh ngắn cho game (không cần asset ngoài).
// Chạy: node scripts/gen-sfx.js  -> ghi vào assets/sfx/*.wav
const fs = require('fs');
const path = require('path');

const SR = 44100;

// Ghi buffer mẫu float [-1,1] thành file WAV PCM 16-bit mono.
function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
  console.log('wrote', file, samples.length, 'samples');
}

// Bao biên độ tấn công/suy giảm đơn giản để tránh tiếng "tách".
function env(i, n, attack = 0.005, release = 0.06) {
  const t = i / SR;
  const dur = n / SR;
  const a = Math.min(1, t / attack);
  const r = Math.min(1, (dur - t) / release);
  return Math.max(0, Math.min(a, r));
}

// Tiếng "ăn mồi": một nốt ngắn vui tai, quét tần số lên nhẹ.
function makeEat() {
  const n = Math.floor(SR * 0.12);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 620 + 340 * (t / (n / SR)); // 620 -> 960 Hz
    const s = Math.sin(2 * Math.PI * f * t);
    const sq = Math.sign(Math.sin(2 * Math.PI * (f / 2) * t)) * 0.15;
    out[i] = (s * 0.5 + sq) * env(i, n) * 0.6;
  }
  return out;
}

// Tiếng "combo": hai nốt lên nhanh (arpeggio) khi ăn liên tiếp.
function makeCombo() {
  const n = Math.floor(SR * 0.18);
  const out = new Float32Array(n);
  const notes = [740, 988, 1319]; // A5, B5, E6
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const idx = Math.min(notes.length - 1, Math.floor((t / (n / SR)) * notes.length));
    const f = notes[idx];
    out[i] = Math.sin(2 * Math.PI * f * t) * env(i, n, 0.003, 0.05) * 0.55;
  }
  return out;
}

// Tiếng "chết": tụt tần số (thua cuộc) kèm chút nhiễu.
function makeDeath() {
  const n = Math.floor(SR * 0.42);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 400 - 260 * (t / (n / SR)); // 400 -> 140 Hz
    const saw = 2 * (f * t - Math.floor(0.5 + f * t)); // răng cưa
    const noise = (Math.random() * 2 - 1) * 0.12;
    out[i] = (saw * 0.4 + noise) * env(i, n, 0.004, 0.14) * 0.6;
  }
  return out;
}

const dir = path.join(__dirname, '..', 'assets', 'sfx');
fs.mkdirSync(dir, { recursive: true });
writeWav(path.join(dir, 'eat.wav'), makeEat());
writeWav(path.join(dir, 'combo.wav'), makeCombo());
writeWav(path.join(dir, 'death.wav'), makeDeath());
