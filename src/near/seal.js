// Proyecto sellado: el proyecto del beat se cifra (Lighthouse) a nombre de la cuenta propia del NFT.
// Para cifrarlo o abrirlo, el dueño del NFT pide a la red MPC de NEAR (sign_for_beat) que firme el
// mensaje de Lighthouse por esa cuenta. Si el NFT cambia de dueño, el acceso pasa al comprador.

import { CONTRACT_ID } from './config';
import { SIGN_DEPOSIT, SIGN_GAS, decodeResult, post } from './musecure';
import { payContract } from './register';

/** Placeholder de project_cid para beats con proyecto sellado (no hay proyecto público en IPFS). */
export const SEALED_PLACEHOLDER = 'sealed';
export const isSealed = (beat) => Boolean(beat.sealed_cid) || beat.project_cid === SEALED_PLACEHOLDER;

/** La cuenta propia del beat firma el mensaje de Lighthouse (vía sign_for_beat → red MPC). */
async function signAsBeat(account, tokenId, onStep) {
  const auth = await post('/api/seal-message', { tokenId });
  onStep('Signing as the NFT account (Chain Signatures)…');
  const outcome = await account.callFunctionRaw({
    contractId: CONTRACT_ID,
    methodName: 'sign_for_beat',
    args: { token_id: tokenId, payload: auth.hash },
    gas: SIGN_GAS,
    deposit: SIGN_DEPOSIT,
  });
  return { message: auth.message, signature: decodeResult(outcome) };
}

/** Cifra el proyecto a nombre del NFT y lo registra en el contrato (set_sealed_project). */
export async function sealProject({ account, accountId, tokenId, projectText, getAccessToken, onStep }) {
  onStep('Preparing the seal…');
  const { message, signature } = await signAsBeat(account, tokenId, onStep);
  onStep('Encrypting the project for the NFT…');
  const { cid } = await post('/api/seal-upload', { accountId, tokenId, project: projectText, message, signature }, await getAccessToken());
  onStep('Saving the seal on NEAR…');
  await payContract(account, 'set_sealed_project', { token_id: tokenId, cid });
  return cid;
}

/** Abre el proyecto sellado (solo el dueño del NFT). Devuelve el texto del proyecto. */
export async function openSealedProject({ account, accountId, beat, getAccessToken, onStep }) {
  onStep('Preparing…');
  const { message, signature } = await signAsBeat(account, beat.token_id, onStep);
  onStep('Opening the sealed project…');
  const { project } = await post('/api/seal-open', { accountId, tokenId: beat.token_id, message, signature }, await getAccessToken());
  return project;
}
