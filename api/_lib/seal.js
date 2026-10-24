// Proyectos sellados: el proyecto se cifra con Lighthouse a nombre de la dirección EVM propia del beat.
// Lighthouse entrega la llave solo a quien firma su mensaje de autenticación con esa dirección, y esa
// firma solo la puede pedir el dueño actual del NFT (sign_for_beat → red MPC de NEAR).
// El servidor nunca guarda llaves: sin una firma nueva del dueño, tampoco puede descifrar.

import lighthouseModule from '@lighthouse-web3/sdk';
import { hashMessage, recoverMessageAddress } from 'viem';
import { beatEvmAddress } from './musecure.js';

const lighthouse = lighthouseModule.default || lighthouseModule;

/** Mensaje de Lighthouse que la dirección del beat debe firmar, y su hash EIP-191 (lo que firma la red MPC). */
export async function authMessageFor(tokenId) {
  const address = await beatEvmAddress(tokenId);
  const { data } = await lighthouse.getAuthMessage(address);
  if (!data?.message) throw Object.assign(new Error('Lighthouse returned no auth message'), { status: 502 });
  return { address, message: data.message, hash: hashMessage(data.message).slice(2) };
}

/** Respuesta del contrato MPC → firma EVM de 65 bytes (r, s, v). */
export function mpcToEvmSignature(sig) {
  const r = sig?.big_r?.affine_point;
  const s = sig?.s?.scalar;
  const rec = Number(sig?.recovery_id);
  if (!/^0[23][0-9a-fA-F]{64}$/.test(String(r)) || !/^[0-9a-fA-F]{64}$/.test(String(s)) || ![0, 1].includes(rec)) {
    throw Object.assign(new Error('Unexpected MPC signature format'), { status: 400 });
  }
  return `0x${r.slice(2)}${s}${(27 + rec).toString(16)}`;
}

/** Comprueba que la firma del mensaje es de la dirección del beat. Devuelve la firma lista para Lighthouse. */
export async function verifyBeatSignature(tokenId, message, mpcSignature) {
  const signature = mpcToEvmSignature(mpcSignature);
  const [address, signer] = await Promise.all([
    beatEvmAddress(tokenId),
    recoverMessageAddress({ message, signature }),
  ]);
  if (signer.toLowerCase() !== address.toLowerCase()) {
    throw Object.assign(new Error('The signature does not match the beat address'), { status: 400 });
  }
  return { address, signature };
}

export async function encryptForBeat(text, address, signature, name) {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  const res = await lighthouse.textUploadEncrypted(text, apiKey, address, signature, name);
  const cid = res?.data?.[0]?.Hash ?? res?.data?.Hash;
  if (!cid) throw Object.assign(new Error('Lighthouse returned no CID'), { status: 502 });
  return cid;
}

export async function decryptForBeat(cid, address, signature) {
  const { data } = await lighthouse.fetchEncryptionKey(cid, address, signature);
  if (!data?.key) throw Object.assign(new Error('Lighthouse did not release the key'), { status: 403 });
  const decrypted = await lighthouse.decryptFile(cid, data.key);
  return Buffer.from(decrypted).toString('utf8');
}
