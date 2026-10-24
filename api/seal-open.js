// Función de Vercel: abre el proyecto sellado de un beat. Lighthouse solo entrega la llave con una firma
// nueva de la cuenta propia del NFT, que solo puede pedir su dueño actual.
import { verifyPrivy } from './_lib/privy-auth.js';
import { IMPLICIT, TOKEN_ID, assertBeatOwner, assertNearWalletOf, readJson } from './_lib/musecure.js';
import { decryptForBeat, verifyBeatSignature } from './_lib/seal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  try {
    const did = await verifyPrivy(req);
    const { accountId, tokenId, message, signature } = await readJson(req);
    if (!IMPLICIT.test(String(accountId || ''))) return res.status(400).json({ error: 'Invalid NEAR account' });
    if (!TOKEN_ID.test(String(tokenId || ''))) return res.status(400).json({ error: 'Invalid beat' });
    await assertNearWalletOf(did, accountId);
    const beat = await assertBeatOwner(accountId, tokenId);
    if (!beat.sealed_cid) return res.status(400).json({ error: 'This beat has no sealed project' });
    const { address, signature: evmSig } = await verifyBeatSignature(tokenId, message, signature);
    const project = await decryptForBeat(beat.sealed_cid, address, evmSig);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ project });
  } catch (err) {
    console.error('[seal-open]', err?.message);
    return res.status(err.status || 500).json({ error: err.message || 'Could not open the sealed project' });
  }
}
