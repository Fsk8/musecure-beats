// Huella acústica del ecosistema MuSecure.
// Módulo autocontenido: la idea es moverlo a un paquete compartido (@musecure/fingerprint)
// para que todas las apps del ecosistema calculen la misma huella sin duplicar código.

let worker = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./fingerprint.worker.js', import.meta.url), { type: 'module' });
  }
  return worker;
}

/**
 * Calcula la huella de MuSecure de un archivo de audio.
 * El trabajo pesado (FFmpeg, ~30 MB la primera vez) corre en un Worker y no traba la página.
 * @returns {Promise<{ fingerprint: number[], sha256: string, duration: number, fileName: string }>}
 */
export function generateFingerprint(file, onProgress) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    // Al terminar se cierra el Worker para liberar la memoria de FFmpeg (~32 MB).
    // La próxima vez el navegador lo vuelve a cargar desde su caché.
    const release = () => {
      w.removeEventListener('message', onMessage);
      w.terminate();
      if (worker === w) worker = null;
    };
    const onMessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'PROGRESS') onProgress?.(payload.stage, payload.percent);
      if (type === 'FINGERPRINT_RESULT') { release(); resolve(payload); }
      if (type === 'ERROR') { release(); reject(new Error(payload.message)); }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'GENERATE_FINGERPRINT', payload: { file } });
  });
}
