// Función de Vercel: activa la cuenta NEAR de un usuario nuevo enviándole un poco de NEAR de testnet
// desde una cuenta patrocinadora. Así el usuario puede registrar beats sin saber qué es NEAR.
//
// Seguridad:
// - Solo usuarios con sesión real de Privy: se verifica su token con la clave pública de verificación.
// - Solo cuentas implícitas (64 hex, las que crea Privy) y solo si todavía no existen en la blockchain.
// - Monto fijo y pequeño. La clave de la cuenta patrocinadora vive solo en el servidor.
//
// Variables de entorno (servidor):
//   NEAR_SPONSOR_ACCOUNT_ID   cuenta patrocinadora, ej. musecure-sponsor-favio.testnet
//   NEAR_SPONSOR_PRIVATE_KEY  ed25519:... (de ~/.near-credentials/testnet/<cuenta>.json)
//   PRIVY_JWKS_URL            endpoint JWKS del dashboard de Privy (recomendado: sigue funcionando si Privy rota la clave)
//   PRIVY_VERIFICATION_KEY    o, en su lugar, la clave de verificación en PEM (una sola línea con \n)
//   VITE_PRIVY_APP_ID         el mismo App ID que usa el frontend

import { verifyPrivy } from './_lib/privy-auth.js';
import { JsonRpcProvider } from '@near-js/providers';
import { Account } from '@near-js/accounts';
import { KeyPairSigner } from '@near-js/signers';

const RPC_URL = 'https://test.rpc.fastnear.com';
const ACTIVATION_YOCTO = '50000000000000000000000'; // 0,05 NEAR: alcanza para cientos de registros
const IMPLICIT_RE = /^[0-9a-f]{64}$/;

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function accountExists(provider, accountId) {
  try {
    await provider.viewAccount(accountId);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  const missing = ['NEAR_SPONSOR_ACCOUNT_ID', 'NEAR_SPONSOR_PRIVATE_KEY', 'VITE_PRIVY_APP_ID']
    .filter((k) => !process.env[k]);
  if (!process.env.PRIVY_JWKS_URL && !process.env.PRIVY_VERIFICATION_KEY) missing.push('PRIVY_JWKS_URL');
  if (missing.length) return res.status(500).json({ error: `Missing server variables: ${missing.join(', ')}` });

  try {
    const userDid = await verifyPrivy(req);
    const { accountId } = await readJson(req);
    if (!IMPLICIT_RE.test(String(accountId || ''))) {
      return res.status(400).json({ error: 'Only Privy implicit accounts (64 hex characters) can be activated' });
    }

    const provider = new JsonRpcProvider({ url: RPC_URL });
    if (await accountExists(provider, accountId)) {
      return res.status(200).json({ activated: false, alreadyActive: true });
    }

    const sponsor = new Account(
      process.env.NEAR_SPONSOR_ACCOUNT_ID,
      provider,
      KeyPairSigner.fromSecretKey(process.env.NEAR_SPONSOR_PRIVATE_KEY),
    );
    const outcome = await sponsor.transfer({ receiverId: accountId, amount: ACTIVATION_YOCTO });
    console.log(`Cuenta activada ${accountId} para ${userDid}`);
    return res.status(200).json({ activated: true, txHash: outcome?.transaction?.hash || null });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Could not activate the account' });
  }
}
