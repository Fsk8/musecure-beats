// Lecturas del contrato de beats (gratis, no requieren sesión).
import { CONTRACT_ID } from './config';

export const getBeats = (provider, limit = 12) => provider.callFunction(CONTRACT_ID, 'get_beats', { limit });

/** Todos los beats del contrato, de 50 en 50 (del más nuevo al más antiguo). */
export async function getAllBeats(provider) {
  const all = [];
  for (let from = 0; ; from += 50) {
    const page = await provider.callFunction(CONTRACT_ID, 'get_beats', { from_index: from, limit: 50 });
    all.push(...page);
    if (page.length < 50) return all;
  }
}
export const hasLease = (provider, tokenId, accountId) =>
  provider.callFunction(CONTRACT_ID, 'has_lease', { token_id: tokenId, account_id: accountId });
export const getOwnerEarnings = (provider, accountId) =>
  provider.callFunction(CONTRACT_ID, 'get_owner_earnings', { account_id: accountId });
export const getBeatMedia = (provider, tokenId) => provider.callFunction(CONTRACT_ID, 'beat_media', { token_id: tokenId });
export const getTotalBeats = (provider) => provider.callFunction(CONTRACT_ID, 'total_beats', {});

const YOCTO_PER_NEAR = 10n ** 24n;

/** "1500000000000000000000000" → "1.5" */
export function yoctoToNear(yocto, decimals = 3) {
  const v = BigInt(yocto || 0);
  const whole = v / YOCTO_PER_NEAR;
  const frac = (v % YOCTO_PER_NEAR).toString().padStart(24, '0').slice(0, decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}
