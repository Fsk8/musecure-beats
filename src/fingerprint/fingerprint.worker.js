// Web Worker: decodifica el audio con FFmpeg (WASM) y calcula la huella de MuSecure.
// Mismo preprocesamiento que MuSecure: mono, 11025 Hz, float32.
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import coreJsUrl from '@ffmpeg/core?url';
import coreWasmUrl from '@ffmpeg/core/wasm?url';
import { SAMPLE_RATE, fingerprintFromPcm } from './core';

let ffmpegInstance = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(coreJsUrl, 'text/javascript'),
    wasmURL: await toBlobURL(coreWasmUrl, 'application/wasm'),
  });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function virtualInputName(file) {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot) : '.audio';
  const safe = ext.replace(/[^.a-zA-Z0-9]/g, '') || '.audio';
  return `input${safe}`;
}

async function decodeAudioToPCM(file, onProgress) {
  const ffmpeg = await getFFmpeg();
  const inputName = virtualInputName(file);
  const outputName = 'output.raw';

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  const progress = ({ progress: p }) => onProgress(p * 100);
  ffmpeg.on('progress', progress);
  try {
    await ffmpeg.exec(['-i', inputName, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', outputName]);
  } finally {
    ffmpeg.off('progress', progress);
  }

  const rawData = await ffmpeg.readFile(outputName);
  const pcm = new Float32Array(rawData.buffer);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  return { pcm, duration: pcm.length / SAMPLE_RATE };
}

const post = (msg) => self.postMessage(msg);

self.onmessage = async (event) => {
  const { type, payload } = event.data;
  if (type !== 'GENERATE_FINGERPRINT') return;
  const { file } = payload;
  try {
    post({ type: 'PROGRESS', payload: { stage: 'Cargando FFmpeg…', percent: 0 } });
    const { pcm, duration } = await decodeAudioToPCM(file, (p) =>
      post({ type: 'PROGRESS', payload: { stage: 'Decodificando audio…', percent: p * 0.6 } }),
    );
    post({ type: 'PROGRESS', payload: { stage: 'Calculando huella acústica…', percent: 70 } });
    const { fingerprint, sha256 } = await fingerprintFromPcm(pcm);
    post({ type: 'FINGERPRINT_RESULT', payload: { fingerprint, sha256, duration, fileName: file.name } });
  } catch (err) {
    post({ type: 'ERROR', payload: { message: err?.message ?? 'Error desconocido en el worker' } });
  }
};
