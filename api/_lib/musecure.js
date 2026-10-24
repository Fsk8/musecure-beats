// Puente MuSecure Beats (NEAR) → MuSecure (Monad) con Chain Signatures.
// Cada beat NFT tiene su propia dirección EVM, derivada por la red MPC de NEAR a partir del
// contrato de Beats y la ruta "beat-<id>". Solo el dueño actual del NFT puede pedir firmas para ella
// (método sign_for_beat del contrato), así que el certificado de MuSecure queda a nombre del beat
// y su control viaja con el NFT.

import { JsonRpcProvider } from '@near-js/providers';
import { createPublicClient, defineChain, getAddress, http, keccak256, parseAbi, toHex } from 'viem';
import { PrivyClient } from '@privy-io/node';

export const NEAR_RPC = 'https://test.rpc.fastnear.com';
export const MPC_CONTRACT = 'v1.signer-prod.testnet';
/** Ruta de derivación de la cuenta propia de cada beat (igual que dynamic::beat_path en el contrato). */
export const beatPath = (tokenId) => `beat-${tokenId}`;
export const BEATS_CONTRACT = process.env.VITE_NEAR_CONTRACT || 'musecure-beats-favio.testnet';

export const monad = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'] } },
});

export const REGISTRY_ABI = parseAbi([
  'function workExists(bytes32 fingerprintHash) view returns (bool)',
  'function registrationFee() view returns (uint256)',
  'function registerWork(bytes32 fingerprintHash, string ipfsCid, uint256 authenticityScore, bool soulbound, bytes scoreSig) payable returns (uint256)',
]);

export const registryAddress = () => getAddress(process.env.MUSECURE_REGISTRY_ADDRESS || '0xA6d7331cB2438007cEFF711005d1E90ff01f53D4');
export const monadClient = () => createPublicClient({ chain: monad, transport: http() });
export const nearProvider = () => new JsonRpcProvider({ url: NEAR_RPC });

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Decode(str) {
  let n = 0n;
  for (const ch of str) {
    const i = B58.indexOf(ch);
    if (i < 0) throw new Error('invalid base58');
    n = n * 58n + BigInt(i);
  }
  const hex = n.toString(16).padStart(2, '0');
  const bytes = Uint8Array.from((hex.length % 2 ? `0${hex}` : hex).match(/../g).map((b) => parseInt(b, 16)));
  const zeros = [...str].findIndex((c) => c !== '1');
  return Uint8Array.from([...new Array(zeros < 0 ? str.length : zeros).fill(0), ...bytes]);
}

/** "secp256k1:<base58 de 64 bytes>" (formato NEAR) → dirección EVM. */
export function evmAddressFromNearKey(nearKey) {
  const raw = base58Decode(String(nearKey).split(':')[1]);
  if (raw.length !== 64) throw new Error('Derived key has an unexpected length');
  return getAddress(`0x${keccak256(toHex(raw)).slice(-40)}`);
}

/** Dirección EVM de un beat: la deriva el contrato MPC para (contrato de Beats, "beat-<id>"). */
export async function beatEvmAddress(tokenId) {
  const key = await nearProvider().callFunction(MPC_CONTRACT, 'derived_public_key', {
    path: beatPath(tokenId),
    predecessor: BEATS_CONTRACT,
    domain_id: 0,
  });
  return evmAddressFromNearKey(key);
}

let privy = null;
const privyClient = () => {
  if (!privy) privy = new PrivyClient({ appId: process.env.VITE_PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET });
  return privy;
};

/** Comprueba que la cuenta NEAR (implícita) es la wallet NEAR de Privy de ese usuario. */
export async function assertNearWalletOf(userDid, accountId) {
  const user = await privyClient().users()._get(userDid);
  const accounts = user?.linked_accounts ?? user?.linkedAccounts ?? [];
  const owns = accounts.some((a) => a?.type === 'wallet' && (a?.chain_type ?? a?.chainType) === 'near' && a?.address === accountId);
  if (!owns) throw Object.assign(new Error('That NEAR account does not belong to your session'), { status: 403 });
}

export async function getBeat(tokenId) {
  const beat = await nearProvider().callFunction(BEATS_CONTRACT, 'get_beat', { token_id: String(tokenId) });
  if (!beat) throw Object.assign(new Error('The beat does not exist'), { status: 404 });
  return beat;
}

/** Solo el dueño actual del NFT controla la cuenta del beat. */
export async function assertBeatOwner(accountId, tokenId) {
  const beat = await getBeat(tokenId);
  if (beat.owner_id !== accountId) throw Object.assign(new Error('Only the NFT owner can use the beat account'), { status: 403 });
  return beat;
}

/** Llama a una API de MuSecure como servidor aliado. */
export async function musecureApi(path, body) {
  const base = (process.env.MUSECURE_API_URL || '').replace(/\/$/, '');
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Partner-Key': process.env.PARTNER_API_KEY || '' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.success === false) {
    throw Object.assign(new Error(`MuSecure ${path}: ${data.error || r.status}`), { status: 502 });
  }
  return data;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

export const HEX64 = /^[0-9a-f]{64}$/;
export const TOKEN_ID = /^\d{1,12}$/;
export const IMPLICIT = /^[0-9a-f]{64}$/;
