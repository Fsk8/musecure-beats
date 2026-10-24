// Función de Vercel: prepara el registro de un beat en MuSecure (Monad).
//
// 1. Verifica la sesión de Privy y que la cuenta NEAR sea la del usuario y la dueña del NFT.
// 2. Calcula la dirección EVM propia del beat (Chain Signatures: contrato de Beats + "beat-<id>").
// 3. Pide a MuSecure gas de testnet para esa dirección y la firma del score (como servidor aliado).
// 4. Arma la transacción registerWork sin firmar y devuelve su hash: eso es lo que firmará la red MPC.
//
// Variables de entorno (servidor): PRIVY_APP_SECRET, VITE_PRIVY_APP_ID, PRIVY_JWKS_URL (o PRIVY_VERIFICATION_KEY),
//   MUSECURE_API_URL (ej. https://mu-secure-core-functions-anhj.vercel.app), PARTNER_API_KEY,
//   opcionales: MONAD_RPC_URL, MUSECURE_REGISTRY_ADDRESS.

import { encodeFunctionData, formatEther, keccak256, serializeTransaction } from 'viem';
import { verifyPrivy } from './_lib/privy-auth.js';
import {
  HEX64, IMPLICIT, REGISTRY_ABI, TOKEN_ID, assertBeatOwner, assertNearWalletOf, beatEvmAddress, monad, monadClient,
  musecureApi, readJson, registryAddress,
} from './_lib/musecure.js';

/** Beats no pasa por el análisis de catálogo de MuSecure: se registra con score 0 y la metadata lo aclara. */
const SCORE = 0;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  const missing = ['PRIVY_APP_SECRET', 'VITE_PRIVY_APP_ID', 'MUSECURE_API_URL', 'PARTNER_API_KEY'].filter((k) => !process.env[k]);
  if (missing.length) return res.status(500).json({ error: `Missing server variables: ${missing.join(', ')}` });

  try {
    const did = await verifyPrivy(req);
    const { accountId, tokenId, metadataCid } = await readJson(req);
    if (!IMPLICIT.test(String(accountId || ''))) return res.status(400).json({ error: 'Invalid NEAR account' });
    if (!TOKEN_ID.test(String(tokenId || ''))) return res.status(400).json({ error: 'Invalid beat' });
    if (!/^[a-zA-Z0-9]{20,100}$/.test(String(metadataCid || ''))) return res.status(400).json({ error: 'Invalid metadata CID' });

    await assertNearWalletOf(did, accountId);
    const beat = await assertBeatOwner(accountId, tokenId);
    const fingerprint = beat.musecure_fingerprint;
    if (!HEX64.test(String(fingerprint || ''))) return res.status(400).json({ error: 'The beat has no MuSecure fingerprint' });

    const client = monadClient();
    const registry = registryAddress();
    const fingerprintHash = `0x${fingerprint}`;
    if (await client.readContract({ address: registry, abi: REGISTRY_ABI, functionName: 'workExists', args: [fingerprintHash] })) {
      return res.status(409).json({ error: 'This audio is already registered on MuSecure', alreadyRegistered: true });
    }

    const evmAddress = await beatEvmAddress(tokenId);

    // Gas: la tesorería de MuSecure no envía nada si la dirección ya tiene saldo suficiente.
    const airdrop = await musecureApi('/api/airdrop-gas', { address: evmAddress });
    const { signature: scoreSig } = await musecureApi('/api/sign-music', {
      fingerprintHash, score: SCORE, ipfsCid: metadataCid, soulbound: false, userAddress: evmAddress, chainId: monad.id,
    });

    const fee = await client.readContract({ address: registry, abi: REGISTRY_ABI, functionName: 'registrationFee' });
    const data = encodeFunctionData({
      abi: REGISTRY_ABI, functionName: 'registerWork', args: [fingerprintHash, metadataCid, BigInt(SCORE), false, scoreSig],
    });
    const [nonce, fees] = await Promise.all([
      client.getTransactionCount({ address: evmAddress, blockTag: 'pending' }),
      client.estimateFeesPerGas(),
    ]);
    // Si el gas recién se envió, la estimación puede fallar por saldo: se usa un límite fijo generoso.
    let gas = 600000n;
    try {
      gas = (await client.estimateGas({ account: evmAddress, to: registry, data, value: fee })) * 13n / 10n;
    } catch { /* se usa el límite fijo */ }

    const tx = {
      type: 'eip1559',
      chainId: monad.id,
      nonce,
      to: registry,
      data,
      value: fee,
      gas,
      maxFeePerGas: fees.maxFeePerGas * 13n / 10n,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas * 13n / 10n,
    };
    const payload = keccak256(serializeTransaction(tx));

    // BigInt no viaja en JSON: se mandan como texto y /api/musecure-broadcast los reconstruye.
    const txJson = Object.fromEntries(Object.entries(tx).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v]));
    return res.status(200).json({
      evmAddress,
      payload: payload.slice(2),
      tx: txJson,
      fee: formatEther(fee),
      airdrop: airdrop.skipped ? 'ya tenía saldo' : `${airdrop.amount} MON`,
    });
  } catch (err) {
    console.error('[musecure-prepare]', err?.message);
    return res.status(err.status || 500).json({ error: err.message || 'Could not prepare the MuSecure registration' });
  }
}
