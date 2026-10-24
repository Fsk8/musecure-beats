// Función de Vercel: cifra el proyecto de un beat con Lighthouse a nombre de la cuenta propia del NFT.
// Requiere: sesión de Privy, que la cuenta NEAR sea la dueña del NFT y una firma de la red MPC por el beat.
import { verifyPrivy } from './_lib/privy-auth.js';
import { IMPLICIT, TOKEN_ID, assertBeatOwner, assertNearWalletOf, readJson } from './_lib/musecure.js';
import { encryptForBeat, verifyBeatSignature } from './_lib/seal.js';

const MAX_PROJECT = 200_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  if (!process.env.LIGHTHOUSE_API_KEY) return res.status(500).json({ error: 'LIGHTHOUSE_API_KEY is missing on the server' });
  try {
    const did = await verifyPrivy(req);
    const { accountId, tokenId, project, message, signature } = await readJson(req);
    if (!IMPLICIT.test(String(accountId || ''))) return res.status(400).json({ error: 'Invalid NEAR account' });
    if (!TOKEN_ID.test(String(tokenId || ''))) return res.status(400).json({ error: 'Invalid beat' });
    if (typeof project !== 'string' || !project || project.length > MAX_PROJECT) return res.status(400).json({ error: 'Invalid project' });
    if (typeof message !== 'string' || !message) return res.status(400).json({ error: 'Missing auth message' });
    await assertNearWalletOf(did, accountId);
    await assertBeatOwner(accountId, tokenId);
    const { address, signature: evmSig } = await verifyBeatSignature(tokenId, message, signature);
    const cid = await encryptForBeat(project, address, evmSig, `beat-${tokenId}.musecure.json`);
    return res.status(200).json({ cid, address });
  } catch (err) {
    console.error('[seal-upload]', err?.message);
    return res.status(err.status || 500).json({ error: err.message || 'Could not seal the project' });
  }
}
