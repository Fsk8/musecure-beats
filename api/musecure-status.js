// Función de Vercel: ¿este beat ya está registrado en MuSecure (Monad)? Lectura pública, sin sesión.
import { HEX64, REGISTRY_ABI, monadClient, readJson, registryAddress } from './_lib/musecure.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Usa POST' });
  }
  try {
    const { fingerprint } = await readJson(req);
    if (!HEX64.test(String(fingerprint || ''))) return res.status(400).json({ error: 'Huella inválida' });
    const exists = await monadClient().readContract({
      address: registryAddress(), abi: REGISTRY_ABI, functionName: 'workExists', args: [`0x${fingerprint}`],
    });
    res.setHeader('Cache-Control', 's-maxage=30');
    return res.status(200).json({ registered: Boolean(exists) });
  } catch (err) {
    return res.status(502).json({ error: err.shortMessage || err.message });
  }
}
