// Anclar un beat de NEAR en MuSecure (Monad) con Chain Signatures.
//
// El usuario firma UNA transacción en NEAR (al contrato MPC v1.signer-prod.testnet). La red MPC
// devuelve la firma de la transacción de Monad hecha por su dirección EVM derivada.
// No hay wallets nuevas ni claves EVM: todo sale de su cuenta NEAR de Privy.

import { uploadToIpfs } from './register';

export const MPC_CONTRACT = 'v1.signer-prod.testnet';
export const DERIVATION_PATH = 'musecure';
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
      { trait_type: 'Protección', value: 'Público' },
      { trait_type: 'Tipo de Archivo', value: 'audio/wav' },
      { trait_type: 'AudioCID', value: beat.audio_cid },
      { trait_type: 'Origen', value: 'MuSecure Beats (NEAR)' },
      { trait_type: 'Análisis de catálogo', value: 'No (creado en el secuenciador)' },
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

export const musecureStatus = (fingerprint) => post('/api/musecure-status', { fingerprint });

/** base64 → JSON (el resultado de la llamada al contrato MPC). */
function decodeResult(outcome) {
  const failure = outcome?.status?.Failure;
  if (failure) throw new Error(`El contrato MPC rechazó la firma: ${JSON.stringify(failure)}`);
  const value = outcome?.status?.SuccessValue;
  if (!value) throw new Error('El contrato MPC no devolvió una firma');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0))));
}

/**
 * Registra el beat en MuSecure. `onStep(texto)` informa el progreso.
 * @returns {{ hash: string, evmAddress: string }}
 */
export async function anchorInMusecure({ account, accountId, beat, contractId, getAccessToken, onStep }) {
  onStep('Subiendo metadata en formato MuSecure…');
  const meta = new Blob([JSON.stringify(musecureMetadata(beat, contractId))], { type: 'application/json' });
  const metadataCid = await uploadToIpfs(meta, `metadata_${beat.token_id}.json`);

  onStep('Preparando: dirección EVM, gas y firma de MuSecure…');
  const prep = await post('/api/musecure-prepare', {
    accountId, fingerprint: beat.musecure_fingerprint, metadataCid,
  }, await getAccessToken());

  onStep('Firmando con Chain Signatures (red MPC de NEAR)…');
  const outcome = await account.callFunctionRaw({
    contractId: MPC_CONTRACT,
    methodName: 'sign',
    args: { request: { payload_v2: { Ecdsa: prep.payload }, path: DERIVATION_PATH, domain_id: 0 } },
    gas: SIGN_GAS,
    deposit: SIGN_DEPOSIT,
  });
  const signature = decodeResult(outcome);

  onStep('Enviando a Monad…');
  const sent = await post('/api/musecure-broadcast', { accountId, tx: prep.tx, signature }, await getAccessToken());
  return { hash: sent.hash, evmAddress: prep.evmAddress, nearTx: outcome?.transaction?.hash };
}
