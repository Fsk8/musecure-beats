// Lectura de archivos en IPFS a través de gateways públicos.
// Si un gateway falla (caído o sin CORS), se prueba el siguiente.

export const GATEWAYS = [
  'https://gateway.lighthouse.storage/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
];

export const ipfsUrl = (cid, i = 0) => `${GATEWAYS[i]}${cid}`;

/** Tiempo máximo por gateway: si uno no responde, se pasa al siguiente. */
const TIMEOUT_MS = 9000;

/** Descarga un archivo de IPFS como Blob. */
export async function fetchIpfs(cid) {
  let lastError;
  for (let i = 0; i < GATEWAYS.length; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(ipfsUrl(cid, i), { signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.blob();
    } catch (e) {
      lastError = e.name === 'AbortError' ? new Error('gateway timed out') : e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Could not download from IPFS (${lastError?.message || lastError})`);
}
