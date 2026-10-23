// Teoría musical y constantes del secuenciador. Sin dependencias de audio.

export const MAX_STEPS = 64;

export const ROOTS = [
  ['C', 'Do'], ['C#', 'Do#'], ['D', 'Re'], ['D#', 'Re#'], ['E', 'Mi'], ['F', 'Fa'],
  ['F#', 'Fa#'], ['G', 'Sol'], ['G#', 'Sol#'], ['A', 'La'], ['A#', 'La#'], ['B', 'Si'],
];

export const SCALES = {
  pmen: ['Pentatónica menor', [0, 3, 5, 7, 10]],
  pmay: ['Pentatónica mayor', [0, 2, 4, 7, 9]],
  blues: ['Blues', [0, 3, 5, 6, 7, 10]],
  jon: ['Mayor (jónico)', [0, 2, 4, 5, 7, 9, 11]],
  eol: ['Menor natural (eólico)', [0, 2, 3, 5, 7, 8, 10]],
  dor: ['Dórico', [0, 2, 3, 5, 7, 9, 10]],
  fri: ['Frigio', [0, 1, 3, 5, 7, 8, 10]],
  lid: ['Lidio', [0, 2, 4, 6, 7, 9, 11]],
  mix: ['Mixolidio', [0, 2, 4, 5, 7, 9, 10]],
  loc: ['Locrio', [0, 1, 3, 5, 6, 8, 10]],
  arm: ['Menor armónica', [0, 2, 3, 5, 7, 8, 11]],
};

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export const TRACKS = [
  { id: 'drums', name: 'Batería', rows: 4 },
  { id: 'bass', name: 'Bajo', rows: 8 },
  { id: 'lead', name: 'Lead', rows: 8 },
  { id: 'chords', name: 'Acordes', rows: 7 },
];

export const KITS = {
  classic: { name: 'Clásico', rows: ['Bombo', 'Caja', 'Hi-hat', 'Palmas'] },
  '808': { name: '808', rows: ['Bombo 808', 'Caja 808', 'Hi-hat 808', 'Clap 808'] },
  acoustic: { name: 'Acústico', rows: ['Bombo', 'Caja', 'Hi-hat', 'Tom'] },
  lofi: { name: 'Lo-fi', rows: ['Bombo lo-fi', 'Caja lo-fi', 'Hat lo-fi', 'Rim lo-fi'] },
  andino: { name: 'Andino', rows: ['Bombo legüero', 'Chajchas', 'Palmas', 'Charango'] },
  trap: { name: 'Trap', rows: ['Bombo 808 largo', 'Caja trap', 'Hi-hat', 'Clap'] },
  house: { name: 'House', rows: ['Bombo house', 'Clap', 'Hat abierto', 'Shaker'] },
  techno: { name: 'Techno', rows: ['Bombo techno', 'Rim', 'Hat metálico', 'Hat abierto'] },
  dembow: { name: 'Dembow', rows: ['Bombo', 'Caja dembow', 'Hi-hat', 'Timbal'] },
  jazz: { name: 'Jazz (escobillas)', rows: ['Bombo suave', 'Escobilla', 'Hi-hat', 'Aro'] },
};

/** Velocidad por valor de celda: 0 apagado, 1 fuerte, 2 suave. */
export const VEL = [0, 1, 0.35];
export const PROBS = [100, 75, 50, 25];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const midiToNote = (m) => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);

/** Rango del selector de octava por pista. */
export const OCT_RANGE = [-2, 2];

/**
 * Calcula las notas de cada pista para una raíz y escala.
 * Las filas van de agudo (arriba) a grave (abajo), como en la cuadrícula.
 */
export function computeTheory(root, scaleKey, oct = [0, 0, 0, 0]) {
  const iv = SCALES[scaleKey][1];
  const base = 60 + root - (root > 5 ? 12 : 0);
  const deg = (i) =>
    base + iv[((i % iv.length) + iv.length) % iv.length] + 12 * Math.floor(i / iv.length);

  const shift = (track) => 12 * (oct[track] || 0);
  const lead = [...Array(8).keys()].map((i) => deg(i) + shift(2)).reverse().map(midiToNote);
  const bass = [...Array(8).keys()].map((i) => deg(i) - 24 + shift(1)).reverse().map(midiToNote);
  const chords = [...Array(7).keys()]
    .map((i) => (i < iv.length
      ? [deg(i), deg(i + 2), deg(i + 4)].map((m) => midiToNote(m - 12 + shift(3)))
      : null))
    .reverse();
  const chordNames = chords.map((c, r) => {
    const degree = 6 - r;
    return c ? `${ROMAN[degree]} ${c[0].replace(/-?\d/, '')}` : '—';
  });

  return { lead, bass, chords, chordNames };
}

export function rowNames(track, theory, kit) {
  if (track === 0) return KITS[kit].rows;
  if (track === 1) return theory.bass;
  if (track === 2) return theory.lead;
  return theory.chordNames;
}
