// Función de Vercel: mensaje de Lighthouse que debe firmar la cuenta propia de un beat (y su hash
// EIP-191, que es lo que el dueño del NFT pide firmar a la red MPC con sign_for_beat).
import { TOKEN_ID, readJson } from './_lib/musecure.js';
import { authMessageFor } from './_lib/seal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  try {
    const { tokenId } = await readJson(req);
    if (!TOKEN_ID.test(String(tokenId || ''))) return res.status(400).json({ error: 'Invalid beat' });
    return res.status(200).json(await authMessageFor(tokenId));
  } catch (err) {
    console.error('[seal-message]', err?.message);
    return res.status(err.status || 502).json({ error: err.message });
  }
}
