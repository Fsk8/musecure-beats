// Sonidos de lead, bajo y acordes como datos (sin Tone.js): el motor los aplica y la interfaz los lista.
// En modo liviano, los osciladores "fat" (varias voces desafinadas) se reducen a uno solo.

/** @typedef {{ name: string, osc: object, env: object, filter: number, vol: number }} Preset */

export const LEADS = {
  tri: { name: 'Suave (triangular)', osc: { type: 'triangle' }, env: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.4 }, filter: 18000, vol: 0 },
  saw: { name: 'Supersaw', osc: { type: 'fatsawtooth', count: 3, spread: 24 }, env: { attack: 0.005, decay: 0.25, sustain: 0.3, release: 0.3 }, filter: 2600, vol: 4 },
  square: { name: 'Chip (cuadrada)', osc: { type: 'square' }, env: { attack: 0.002, decay: 0.12, sustain: 0.25, release: 0.1 }, filter: 6000, vol: -3 },
  pluck: { name: 'Pluck', osc: { type: 'sawtooth' }, env: { attack: 0.002, decay: 0.18, sustain: 0, release: 0.15 }, filter: 1800, vol: 5 },
  bell: { name: 'Campana (FM)', osc: { type: 'fmsine', modulationIndex: 6, harmonicity: 3.5 }, env: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.9 }, filter: 9000, vol: -4 },
  organ: { name: 'Órgano', osc: { type: 'custom', partials: [1, 0.6, 0.4, 0.25, 0.15] }, env: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 }, filter: 7000, vol: -8 },
  flute: { name: 'Flauta', osc: { type: 'sine' }, env: { attack: 0.08, decay: 0.2, sustain: 0.6, release: 0.3 }, filter: 5000, vol: -7 },
  brass: { name: 'Metal (brass)', osc: { type: 'sawtooth' }, env: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.2 }, filter: 1500, vol: -2 },
  keys: { name: 'Teclas lo-fi', osc: { type: 'fattriangle', count: 2, spread: 10 }, env: { attack: 0.004, decay: 0.4, sustain: 0.1, release: 0.4 }, filter: 1400, vol: 8 },
  pulse: { name: 'Pulso', osc: { type: 'pulse', width: 0.25 }, env: { attack: 0.004, decay: 0.2, sustain: 0.35, release: 0.2 }, filter: 3200, vol: -6 },
};

export const BASSES = {
  classic: { name: 'Clásico (sierra)', osc: { type: 'sawtooth' }, Q: 2, env: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.15 }, fenv: { attack: 0.005, decay: 0.15, sustain: 0.2, baseFrequency: 120, octaves: 2.6 }, porta: 0, vol: 0 },
  synth: { name: 'Synth bass (con sub)', osc: { type: 'fatsawtooth', count: 2, spread: 18 }, Q: 6, env: { attack: 0.003, decay: 0.25, sustain: 0.35, release: 0.1 }, fenv: { attack: 0.002, decay: 0.22, sustain: 0.1, baseFrequency: 90, octaves: 3.6 }, porta: 0.03, vol: -2, sub: true },
  sub: { name: 'Sub (senoidal)', osc: { type: 'sine' }, Q: 0, env: { attack: 0.005, decay: 0.3, sustain: 0.7, release: 0.15 }, fenv: { attack: 0.01, decay: 0.1, sustain: 1, baseFrequency: 400, octaves: 0 }, porta: 0, vol: -6 },
  b808: { name: '808 (largo)', osc: { type: 'sine' }, Q: 0, env: { attack: 0.002, decay: 1.2, sustain: 0.2, release: 0.6 }, fenv: { attack: 0.001, decay: 0.1, sustain: 1, baseFrequency: 500, octaves: 0 }, porta: 0.05, vol: -5 },
  acid: { name: 'Acid (resonante)', osc: { type: 'sawtooth' }, Q: 12, env: { attack: 0.002, decay: 0.2, sustain: 0.2, release: 0.08 }, fenv: { attack: 0.001, decay: 0.12, sustain: 0.05, baseFrequency: 150, octaves: 4.2 }, porta: 0.04, vol: 0 },
  reese: { name: 'Reese (oscuro)', osc: { type: 'fatsawtooth', count: 3, spread: 35 }, Q: 1, env: { attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.2 }, fenv: { attack: 0.05, decay: 0.4, sustain: 0.6, baseFrequency: 200, octaves: 1.5 }, porta: 0, vol: 0 },
  funk: { name: 'Funk (cuadrada)', osc: { type: 'square' }, Q: 3, env: { attack: 0.002, decay: 0.14, sustain: 0.1, release: 0.06 }, fenv: { attack: 0.002, decay: 0.1, sustain: 0.1, baseFrequency: 180, octaves: 2.5 }, porta: 0, vol: 0 },
  fm: { name: 'FM metálico', osc: { type: 'fmsquare', modulationIndex: 2, harmonicity: 1 }, Q: 1, env: { attack: 0.002, decay: 0.25, sustain: 0.3, release: 0.1 }, fenv: { attack: 0.002, decay: 0.2, sustain: 0.3, baseFrequency: 200, octaves: 2 }, porta: 0, vol: -4 },
  round: { name: 'Redondo (triangular)', osc: { type: 'triangle' }, Q: 1, env: { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.15 }, fenv: { attack: 0.01, decay: 0.2, sustain: 0.5, baseFrequency: 300, octaves: 1.5 }, porta: 0, vol: -3 },
  growl: { name: 'Growl (pulso)', osc: { type: 'pulse', width: 0.15 }, Q: 8, env: { attack: 0.003, decay: 0.3, sustain: 0.4, release: 0.1 }, fenv: { attack: 0.05, decay: 0.25, sustain: 0.2, baseFrequency: 100, octaves: 3 }, porta: 0.02, vol: -8 },
};

/** `len`: cuánto dura cada acorde. `chorus`: cuánto chorus (0–1). */
export const PADS = {
  dreamy: { name: 'Dreamy (pad)', osc: { type: 'fatsawtooth', count: 3, spread: 28 }, env: { attack: 0.35, decay: 0.6, sustain: 0.75, release: 2.2 }, filter: 1600, chorus: 0.6, vol: -13, len: '2n' },
  soft: { name: 'Suave', osc: { type: 'fatsine', count: 2, spread: 12 }, env: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.8 }, filter: 18000, chorus: 0, vol: -9, len: '4n' },
  strings: { name: 'Cuerdas', osc: { type: 'fatsawtooth', count: 2, spread: 20 }, env: { attack: 0.5, decay: 0.4, sustain: 0.8, release: 1.4 }, filter: 2400, chorus: 0.4, vol: -10, len: '2n' },
  organ: { name: 'Órgano', osc: { type: 'custom', partials: [1, 0.7, 0.5, 0.3, 0.2, 0.1] }, env: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.15 }, filter: 6000, chorus: 0.3, vol: -13, len: '4n' },
  epiano: { name: 'Piano eléctrico', osc: { type: 'fmsine', modulationIndex: 3, harmonicity: 1 }, env: { attack: 0.003, decay: 1.2, sustain: 0.15, release: 0.8 }, filter: 7000, chorus: 0.35, vol: -9, len: '4n' },
  stab: { name: 'Stab (corto)', osc: { type: 'sawtooth' }, env: { attack: 0.003, decay: 0.15, sustain: 0, release: 0.12 }, filter: 3000, chorus: 0, vol: -4, len: '16n' },
  glass: { name: 'Cristal', osc: { type: 'fmtriangle', modulationIndex: 8, harmonicity: 4 }, env: { attack: 0.01, decay: 1.4, sustain: 0.1, release: 1.2 }, filter: 9000, chorus: 0.2, vol: -10, len: '2n' },
  warm: { name: 'Pad cálido', osc: { type: 'fattriangle', count: 3, spread: 20 }, env: { attack: 0.6, decay: 0.5, sustain: 0.8, release: 1.8 }, filter: 1200, chorus: 0.5, vol: -12, len: '2n' },
  pluck: { name: 'Pluck', osc: { type: 'square' }, env: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.2 }, filter: 2000, chorus: 0.2, vol: -8, len: '8n' },
  choir: { name: 'Coro', osc: { type: 'fatsine', count: 3, spread: 30 }, env: { attack: 0.4, decay: 0.3, sustain: 0.8, release: 1.6 }, filter: 2800, chorus: 0.7, vol: -11, len: '2n' },
};

/** Versión liviana de un oscilador: sin voces extra. */
export function liteOsc(osc) {
  if (!osc.type.startsWith('fat')) return osc;
  return { type: osc.type.slice(3) };
}
