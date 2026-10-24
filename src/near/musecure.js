// Anclar un beat de NEAR en MuSecure (Monad) con Chain Signatures.
//
// Cada beat NFT tiene su PROPIA cuenta en Monad: una dirección EVM que la red MPC de NEAR deriva
// del contrato de Beats y la ruta "beat-<id>". El dueño del NFT firma una transacción en NEAR
// (sign_for_beat del contrato de Beats) y la red MPC firma la transacción de Monad por el beat.
// Si el NFT cambia de dueño, el control de esa cuenta (y del certificado de MuSecure) pasa al nuevo dueño.

import { CONTRACT_ID } from './config';
import { uploadToIpfs } from './register';
export const MONAD_EXPLORER = 'https://testnet.monadscan.com';
const SIGN_GAS = 300000000000000n; // 300 Tgas: lo que usa la librería oficial (chainsig.js)
const SIGN_DEPOSIT = 1n; // 1 yoctoNEAR

/** Misma imagen por defecto que usa MuSecure para sus certificados. */
const DEFAULT_IMAGE = 'ipfs://bafybeibvbfxhsexhqy6mipbqk7qmlolhynxfhqq7c7h4yzb5pcl5u4ixe4';

/** Metadata con el mismo formato que LighthouseService.uploadMetadata de MuSecure, más el origen en NEAR. */
export function musecureMetadata(beat, contractId) {
  return {
    name: beat.title,
    description: `MuSecure Certificate of Authenticity for the work "${beat.title}" by ${beat.creator}. Created in MuSecure Beats (NEAR), without catalog analysis.`,
    image: DEFAULT_IMAGE,
    animation_url: `ipfs://${beat.audio_cid}`,
    attributes: [
      { trait_type: 'Artista', value: beat.creator },
      { trait_type: 'Beat account', value: 'The NFT\'s own address via NEAR Chain Signatures (path beat-' + beat.token_id + ')' },
      { trait_type: 'Protección', value: 'Público' },
      { trait_type: 'Tipo de Archivo', value: 'audio/wav' },
      { trait_type: 'AudioCID', value: beat.audio_cid },
      { trait_type: 'Origin', value: 'MuSecure Beats (NEAR)' },
      { trait_type: 'Catalog analysis', value: 'No (created in the sequencer)' },
      { trait_type: 'NEAR contract', value: contractId },
      { trait_type: 'NEAR token', value: beat.token_id },
      { trait_type: 'SHA-256 audio', value: beat.audio_hash },
      { trait_type: 'ProjectCID', value: beat.project_cid },
    ],
  };
}

async function post(path, body, token) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Error ${r.status}`), data);
  return data;
}

/** Cuenta propia del beat en Monad: { evmAddress, balance, registered }. */
export const beatAccountStatus = (tokenId) => post('/api/musecure-status', { tokenId });

/** base64 → JSON (el resultado de la llamada al contrato MPC). */
function decodeResult(outcome) {
  const failure = outcome?.status?.Failure;
  if (failure) throw new Error(`The MPC contract rejected the signature: ${JSON.stringify(failure)}`);
  const value = outcome?.status?.SuccessValue;
  if (!value) throw new Error('The MPC contract returned no signature');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0))));
}

/**
 * Registra el beat en MuSecure. `onStep(texto)` informa el progreso.
 * @returns {{ hash: string, evmAddress: string }}
 */
export async function anchorInMusecure({ account, accountId, beat, contractId, getAccessToken, onStep }) {
  onStep('Uploading MuSecure-format metadata…');
  const meta = new Blob([JSON.stringify(musecureMetadata(beat, contractId))], { type: 'application/json' });
  const metadataCid = await uploadToIpfs(meta, `metadata_${beat.token_id}.json`);

  onStep('Preparing: EVM address, gas and MuSecure signature…');
  const prep = await post('/api/musecure-prepare', { accountId, tokenId: beat.token_id, metadataCid }, await getAccessToken());

  onStep('Signing for the beat account (Chain Signatures)…');
  const outcome = await account.callFunctionRaw({
    contractId: CONTRACT_ID,
    methodName: 'sign_for_beat',
    args: { token_id: beat.token_id, payload: prep.payload },
    gas: SIGN_GAS,
    deposit: SIGN_DEPOSIT,
  });
  const signature = decodeResult(outcome);

  onStep('Sending to Monad…');
  const sent = await post('/api/musecure-broadcast', { accountId, tokenId: beat.token_id, tx: prep.tx, signature }, await getAccessToken());
  return { hash: sent.hash, evmAddress: prep.evmAddress, nearTx: outcome?.transaction?.hash };
}
