// Función de Vercel: arma la transacción con la firma de la red MPC de NEAR y la envía a Monad.
// Antes de enviar, comprueba que la firma corresponde a la dirección derivada del usuario:
// así nadie puede usar este endpoint para mandar transacciones ajenas.

import { recoverTransactionAddress, serializeTransaction } from 'viem';
import { verifyPrivy } from './_lib/privy-auth.js';
import { IMPLICIT, assertNearWalletOf, deriveEvmAddress, monadClient, readJson } from './_lib/musecure.js';

const BIG = ['nonce', 'value', 'gas', 'maxFeePerGas', 'maxPriorityFeePerGas'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Usa POST' });
  }
  try {
    const did = await verifyPrivy(req);
    const { accountId, tx: txJson, signature } = await readJson(req);
    if (!IMPLICIT.test(String(accountId || ''))) return res.status(400).json({ error: 'Cuenta NEAR inválida' });
    await assertNearWalletOf(did, accountId);

    // Respuesta del contrato MPC: { big_r: { affine_point }, s: { scalar }, recovery_id }
    const r = signature?.big_r?.affine_point;
    const s = signature?.s?.scalar;
    const recoveryId = Number(signature?.recovery_id);
    if (!/^0[23][0-9a-fA-F]{64}$/.test(String(r)) || !/^[0-9a-fA-F]{64}$/.test(String(s)) || ![0, 1].includes(recoveryId)) {
      return res.status(400).json({ error: 'Firma MPC con formato inesperado' });
    }

    const tx = { ...txJson };
    for (const k of BIG) tx[k] = BigInt(tx[k]);
    tx.nonce = Number(tx.nonce);
    const signed = serializeTransaction(tx, { r: `0x${r.slice(2)}`, s: `0x${s}`, yParity: recoveryId });

    const expected = await deriveEvmAddress(accountId);
    const signer = await recoverTransactionAddress({ serializedTransaction: signed });
    if (signer.toLowerCase() !== expected.toLowerCase()) {
      return res.status(400).json({ error: 'La firma no corresponde a tu dirección derivada' });
    }

    const client = monadClient();
    const hash = await client.sendRawTransaction({ serializedTransaction: signed });
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 25000 }).catch(() => null);
    if (receipt && receipt.status !== 'success') return res.status(502).json({ error: 'La transacción falló en Monad', hash });
    return res.status(200).json({ hash, confirmed: Boolean(receipt) });
  } catch (err) {
    console.error('[musecure-broadcast]', err?.message);
    return res.status(err.status || 500).json({ error: err.shortMessage || err.message || 'No se pudo enviar a Monad' });
  }
}
