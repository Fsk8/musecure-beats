// Huella acústica de MuSecure: algoritmo puro (sin FFmpeg ni Worker).
// Portado sin cambios de MuSecure (src/workers/audioFingerprint.worker.ts) para que el mismo
// audio produzca el mismo hash en ambas apps. Si cambias algo aquí, el hash deja de coincidir
// con MuSecureRegistry.

export const SAMPLE_RATE = 11025;
const FRAME_SIZE = 4096;
const OVERLAP = 0.75;
/** La huella usa como máximo 120 transiciones (~11 s de audio). */
const MAX_FRAMES = 120;

function hamming(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
  }
  return w;
}

function fft(real, imag) {
  const n = real.length;
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = real[i + k];
        const uIm = imag[i + k];
        const vRe = real[i + k + len / 2] * curRe - imag[i + k + len / 2] * curIm;
        const vIm = real[i + k + len / 2] * curIm + imag[i + k + len / 2] * curRe;
        real[i + k] = uRe + vRe;
        imag[i + k] = uIm + vIm;
        real[i + k + len / 2] = uRe - vRe;
        imag[i + k + len / 2] = uIm - vIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

export function computeChromaFeatures(pcm) {
  const hop = Math.floor(FRAME_SIZE * (1 - OVERLAP));
  const win = hamming(FRAME_SIZE);
  const chromaFrames = [];
  const numBins = 12;

  for (let start = 0; start + FRAME_SIZE <= pcm.length; start += hop) {
    const real = new Float32Array(FRAME_SIZE);
    const imag = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      real[i] = pcm[start + i] * win[i];
    }
    fft(real, imag);

    const chroma = new Array(numBins).fill(0);
    const freqPerBin = SAMPLE_RATE / FRAME_SIZE;
    for (let k = 1; k < FRAME_SIZE / 2; k++) {
      const freq = k * freqPerBin;
      if (freq < 27.5 || freq > 4186) continue;
      const magnitude = Math.sqrt(real[k] ** 2 + imag[k] ** 2);
      const midiNote = 12 * Math.log2(freq / 440) + 69;
      const chromaBin = ((Math.round(midiNote) % 12) + 12) % 12;
      chroma[chromaBin] += magnitude;
    }
    const sum = chroma.reduce((a, b) => a + b, 0) || 1;
    chromaFrames.push(chroma.map((v) => v / sum));
  }
  return chromaFrames;
}

export function chromaFramesToFingerprint(frames) {
  const fingerprint = [];
  for (let i = 1; i < frames.length; i++) {
    let bits = 0;
    for (let j = 0; j < 12; j++) {
      const diff = frames[i][j] - frames[i - 1][j];
      const q = diff > 0.01 ? 1 : diff < -0.01 ? 2 : 0;
      bits |= q << (j * 2);
    }
    fingerprint.push(bits >>> 0);
    if (fingerprint.length >= MAX_FRAMES) break;
  }
  return fingerprint;
}

export async function fingerprintSha256(data) {
  const buffer = new Uint8Array(data.length * 4);
  const view = new DataView(buffer.buffer);
  data.forEach((v, i) => view.setUint32(i * 4, v, false));
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** PCM mono a 11025 Hz → { fingerprint, sha256 }. */
export async function fingerprintFromPcm(pcm) {
  const fingerprint = chromaFramesToFingerprint(computeChromaFeatures(pcm));
  return { fingerprint, sha256: await fingerprintSha256(fingerprint) };
}
