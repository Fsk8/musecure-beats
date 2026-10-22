// Lecturas del contrato de beats (gratis, no requieren sesión).
import { CONTRACT_ID } from './config';

export const getBeats = (provider, limit = 12) => provider.callFunction(CONTRACT_ID, 'get_beats', { limit });
export const getTotalBeats = (provider) => provider.callFunction(CONTRACT_ID, 'total_beats', {});

const YOCTO_PER_NEAR = 10n ** 24n;

/** "1500000000000000000000000" → "1.5" */
export function yoctoToNear(yocto, decimals = 3) {
  const v = BigInt(yocto || 0);
  const whole = v / YOCTO_PER_NEAR;
  const frac = (v % YOCTO_PER_NEAR).toString().padStart(24, '0').slice(0, decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}
