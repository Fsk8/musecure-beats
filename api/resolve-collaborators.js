// Función de Vercel: convierte los emails de los colaboradores en su cuenta NEAR de Privy.
// Si el colaborador nunca entró, Privy le crea de antemano una wallet NEAR ligada a su email:
// el crédito queda a su nombre desde el primer día y lo ve al iniciar sesión con ese email.
// Mismo enfoque que /api/resolve-collaborators de MuSecure, pero con wallets NEAR.
//
// Privacidad: el email nunca se guarda en la blockchain ni en IPFS; solo viaja a Privy.
//
// Variables de entorno (servidor):
//   VITE_PRIVY_APP_ID   App ID (el mismo del frontend)
//   PRIVY_APP_SECRET    App Secret de Privy. Solo servidor: nunca con prefijo VITE_.
//   PRIVY_JWKS_URL o PRIVY_VERIFICATION_KEY  para verificar la sesión de quien registra

import { PrivyClient } from '@privy-io/node';
import { verifyPrivy } from './_lib/privy-auth.js';

const MAX_COLLABORATORS = 40; // hasta 10 por pista × 4 pistas
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NEAR_WALLET = [{ chain_type: 'near' }];

let client = null;
function getClient() {
  if (!client) client = new PrivyClient({ appId: process.env.VITE_PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET });
  return client;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

/** Cuenta NEAR de la wallet embebida de Privy (no una wallet externa). */
function embeddedNear(user) {
  const accounts = user?.linked_accounts ?? user?.linkedAccounts ?? [];
  const w = accounts.find(
    (a) => a?.type === 'wallet'
      && (a?.chain_type ?? a?.chainType) === 'near'
      && (a?.wallet_client ?? a?.walletClient ?? 'privy') === 'privy',
  );
  return w?.address ?? null;
}

async function findByEmail(privy, email) {
  try {
    return await privy.users().getByEmailAddress({ address: email });
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/** Devuelve la cuenta NEAR del email. Reintentar es seguro: no crea duplicados. */
async function resolveOne(privy, email) {
  let user = await findByEmail(privy, email);
  if (!user) {
    try {
      user = await privy.users().create({ linked_accounts: [{ type: 'email', address: email }], wallets: NEAR_WALLET });
    } catch (err) {
      user = await findByEmail(privy, email); // otra petición lo creó al mismo tiempo
      if (!user) throw err;
    }
  }
  const current = embeddedNear(user);
  if (current) return current;
  // Ya existe (por ejemplo, usuario de MuSecure con wallet EVM) pero sin wallet NEAR.
  const updated = await privy.users().pregenerateWallets(user.id, { wallets: NEAR_WALLET });
  const created = embeddedNear(updated);
  if (!created) throw new Error('Privy returned no NEAR wallet');
  return created;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  const missing = ['VITE_PRIVY_APP_ID', 'PRIVY_APP_SECRET'].filter((k) => !process.env[k]);
  if (!process.env.PRIVY_JWKS_URL && !process.env.PRIVY_VERIFICATION_KEY) missing.push('PRIVY_JWKS_URL');
  if (missing.length) return res.status(500).json({ error: `Missing server variables: ${missing.join(', ')}` });

  try {
    // Solo alguien con sesión puede usar el App Secret para crear usuarios.
    await verifyPrivy(req);
    const { emails } = await readJson(req);
    if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'Missing email list' });
    const unique = [...new Set(emails.map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : '')))];
    if (unique.length > MAX_COLLABORATORS) return res.status(400).json({ error: `At most ${MAX_COLLABORATORS} emails` });
    const bad = unique.find((e) => e.length > 254 || !EMAIL_RE.test(e));
    if (bad !== undefined) return res.status(400).json({ error: `"${bad}" is not a valid email` });

    const privy = getClient();
    const settled = await Promise.allSettled(unique.map((email) => resolveOne(privy, email)));
    const accounts = {};
    const failed = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') accounts[unique[i]] = r.value;
      else {
        // Sin el email en los logs: es un dato personal.
        console.error(`[resolve-collaborators] fallo #${i}:`, r.reason?.status, r.reason?.message);
        failed.push(unique[i]);
      }
    });
    return res.status(200).json({ accounts, failed });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Could not resolve the emails' });
  }
}
