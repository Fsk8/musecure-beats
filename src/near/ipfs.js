// Lectura de archivos en IPFS a través de gateways públicos.
// Si un gateway falla (caído o sin CORS), se prueba el siguiente.

export const GATEWAYS = [
  'https://gateway.lighthouse.storage/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
];

export const ipfsUrl = (cid, i = 0) => `${GATEWAYS[i]}${cid}`;

/** Descarga un archivo de IPFS como Blob. */
export async function fetchIpfs(cid) {
  let lastError;
  for (let i = 0; i < GATEWAYS.length; i++) {
    try {
      const r = await fetch(ipfsUrl(cid, i));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.blob();
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`No se pudo descargar de IPFS (${lastError?.message || lastError})`);
}
