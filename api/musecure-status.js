// Función de Vercel: la cuenta propia de un beat en Monad (dirección, saldo) y si ya está registrado
// en MuSecure. Lectura pública, sin sesión.
import { formatEther } from 'viem';
import { HEX64, REGISTRY_ABI, TOKEN_ID, beatEvmAddress, getBeat, monadClient, readJson, registryAddress } from './_lib/musecure.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  try {
    const { tokenId } = await readJson(req);
    if (!TOKEN_ID.test(String(tokenId || ''))) return res.status(400).json({ error: 'Invalid beat' });
    const beat = await getBeat(tokenId);
    const client = monadClient();
    const evmAddress = await beatEvmAddress(tokenId);
    const [balance, registered] = await Promise.all([
      client.getBalance({ address: evmAddress }),
      HEX64.test(String(beat.musecure_fingerprint || ''))
        ? client.readContract({ address: registryAddress(), abi: REGISTRY_ABI, functionName: 'workExists', args: [`0x${beat.musecure_fingerprint}`] })
        : false,
    ]);
    res.setHeader('Cache-Control', 's-maxage=20');
    return res.status(200).json({ evmAddress, balance: formatEther(balance), registered: Boolean(registered) });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.shortMessage || err.message });
  }
}
