// Estado del beat y operaciones sobre patrones (sin audio ni UI).
import { MAX_STEPS, PROBS, TRACKS } from './theory';

export const STORAGE_KEY = 'msb2';

export const emptyGrid = (rows, value = 0) =>
  Array.from({ length: rows }, () => Array(MAX_STEPS).fill(value));

export function defaultState() {
  return {
    title: 'Mi beat',
    len: 16,
    bpm: 96,
    swing: 0,
    metro: false,
    cut: 100,
    kit: 'classic',
    arp: 'off',
    root: 0,
    scale: 'pmen',
    wave: 'tri',
    pad: 'dreamy',
    bassSound: 'classic',
    oct: [0, 0, 0, 1], // batería, bajo, lead, acordes
    tab: 0,
    page: 0,
    emode: 'vel',
    mix: TRACKS.map((_, i) => ({
      vol: [-2, -4, -8, -14][i],
      mute: false,
      solo: false,
      rev: [10, 0, 25, 40][i],
      del: [0, 0, 30, 10][i],
    })),
    g: TRACKS.map((t) => emptyGrid(t.rows)),
    p: TRACKS.map((t) => emptyGrid(t.rows, 100)),
  };
}

/** Beat de ejemplo para que la app nunca abra vacía. */
export function withExampleBeat(S) {
  const d = S.g[0];
  [0, 8].forEach((i) => (d[0][i] = 1));
  [4, 12].forEach((i) => (d[1][i] = 1));
  for (let i = 0; i < 16; i += 2) d[2][i] = i % 4 ? 2 : 1;
  d[2][15] = 2;
  S.p[0][2][15] = 50;
  [[7, 0], [7, 3], [4, 6], [7, 8], [5, 11], [3, 14]].forEach(([r, c]) => (S.g[1][r][c] = 1));
  [[5, 0], [4, 3], [3, 6], [2, 10], [4, 12]].forEach(([r, c]) => (S.g[2][r][c] = 1));
  S.g[3][6][0] = 1;
  S.g[3][4][8] = 1;
  return S;
}

/** Completa y corrige un estado guardado (de localStorage o de un archivo). Devuelve null si no es válido. */
export function normalizeState(s) {
  if (!s || !Array.isArray(s.g) || s.g.length !== 4) return null;
  const base = defaultState();
  const mix = Array.isArray(s.mix) ? s.mix.map((m, i) => ({ ...base.mix[i], ...m })) : base.mix;
  const S = { ...base, ...s, mix };
  S.g = S.g.map((G, t) =>
    Array.from({ length: TRACKS[t].rows }, (_, r) =>
      Array.from({ length: MAX_STEPS }, (_, c) => {
        const v = G?.[r]?.[c];
        return v === true ? 1 : v === 1 || v === 2 ? v : 0;
      }),
    ),
  );
  S.p = TRACKS.map((tr, t) =>
    Array.from({ length: tr.rows }, (_, r) =>
      Array.from({ length: MAX_STEPS }, (_, c) => {
        const v = s.p?.[t]?.[r]?.[c];
        return PROBS.includes(v) ? v : 100;
      }),
    ),
  );
  if (![16, 32, 64].includes(S.len)) S.len = 16;
  S.oct = base.oct.map((d, i) => {
    const v = s.oct?.[i];
    return Number.isInteger(v) && v >= -2 && v <= 2 ? v : d;
  });
  if (!['dreamy', 'soft'].includes(S.pad)) S.pad = base.pad;
  if (!['classic', 'synth'].includes(S.bassSound)) S.bassSound = base.bassSound;
  return S;
}

export function loadState() {
  try {
    const S = normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    if (S && S.g.flat(2).some(Boolean)) return S;
  } catch {
    // almacenamiento no disponible: se usa el beat de ejemplo
  }
  return withExampleBeat(defaultState());
}

// ---------- archivo de proyecto (.json)

const PROJECT_FORMAT = 'musecure-beats';
const PROJECT_VERSION = 1;

/** El beat como archivo: notas, escala, kit y mezcla. Sin datos de la pantalla (pestaña, página). */
export function projectFile(S) {
  const { tab, page, emode, ...beat } = S;
  return JSON.stringify(
    { format: PROJECT_FORMAT, version: PROJECT_VERSION, savedAt: new Date().toISOString(), beat },
    null,
    1,
  );
}

/** Lee un archivo de proyecto. Lanza un Error con un mensaje para la persona si no sirve. */
export function parseProjectFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un proyecto válido (no es JSON).');
  }
  if (data?.format !== PROJECT_FORMAT) {
    throw new Error('Este archivo no es un proyecto de MuSecure Beats.');
  }
  const S = normalizeState(data.beat);
  if (!S) throw new Error('El proyecto está incompleto o dañado.');
  return S;
}

export const fileSafeName = (title) =>
  (title || 'beat').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'beat';

export function saveState(S) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch {
    // modo privado o almacenamiento bloqueado
  }
}

/** Siguiente valor de una celda al hacer clic, según el modo de edición. */
export function nextCell(emode, g, p) {
  if (emode === 'vel') {
    const ng = (g + 1) % 3;
    return [ng, ng ? p : 100];
  }
  if (!g) return [1, 100];
  return [g, PROBS[(PROBS.indexOf(p) + 1) % PROBS.length]];
}

/** Al alargar, copia el patrón existente a los compases nuevos. */
export function extendPattern(S, oldLen, newLen) {
  if (newLen <= oldLen) return;
  [S.g, S.p].forEach((A) =>
    A.forEach((G) =>
      G.forEach((row) => {
        for (let c = oldLen; c < newLen; c++) row[c] = row[c % oldLen];
      }),
    ),
  );
}

/** Genera un patrón aleatorio para una pista. */
export function randomTrack(t, len, theory) {
  const G = emptyGrid(TRACKS[t].rows);
  const P = emptyGrid(TRACKS[t].rows, 100);
  const vv = () => (Math.random() < 0.3 ? 2 : 1);
  const pp = () => (Math.random() < 0.2 ? PROBS[1 + Math.floor(Math.random() * 3)] : 100);

  for (let c = 0; c < len; c++) {
    if (t === 0) {
      if (c % 8 === 0) G[0][c] = 1;
      if (c % 8 === 4) G[1][c] = 1;
      if (Math.random() < 0.6) { G[2][c] = c % 4 ? 2 : 1; P[2][c] = pp(); }
      if (Math.random() < 0.08) { G[3][c] = vv(); P[3][c] = pp(); }
      if (Math.random() < 0.12 && !G[0][c]) { G[0][c] = 2; P[0][c] = pp(); }
    }
    if (t === 1 && Math.random() < 0.35) {
      const r = Math.random() < 0.5 ? 7 : Math.floor(Math.random() * 8);
      G[r][c] = vv(); P[r][c] = pp();
    }
    if (t === 2 && Math.random() < 0.4) {
      const r = Math.floor(Math.random() * 8);
      G[r][c] = vv(); P[r][c] = pp();
    }
    if (t === 3 && c % 8 === 0) {
      const ok = [...Array(7).keys()].filter((r) => theory.chords[r]);
      G[ok[Math.floor(Math.random() * ok.length)]][c] = 1;
    }
  }
  return { g: G, p: P };
}

/**
 * Mueve cada nota al pulso más cercano (q = 2 corcheas, q = 4 negras).
 * Si dos notas caen en el mismo pulso, gana la más fuerte y con mayor probabilidad.
 */
export function quantizeTrack(G, P, q, len) {
  const rows = G.length;
  const NG = emptyGrid(rows);
  const NP = emptyGrid(rows, 100);
  let moved = 0;
  G.forEach((row, r) => {
    for (let c = 0; c < len; c++) {
      if (!row[c]) continue;
      const to = (Math.round(c / q) * q) % len;
      if (to !== c) moved++;
      if (!NG[r][to]) { NG[r][to] = row[c]; NP[r][to] = P[r][c]; }
      else { NG[r][to] = Math.min(NG[r][to], row[c]); NP[r][to] = Math.max(NP[r][to], P[r][c]); }
    }
  });
  return { g: NG, p: NP, moved };
}

/** Reto 1 del modo juego. */
export function challengeDone(S) {
  const d = S.g[0];
  return Boolean(
    d[0][0] && d[0][8] && d[1][4] && d[1][12] &&
    S.g[2].flat().filter(Boolean).length >= 4 &&
    S.g[3].flat().some(Boolean),
  );
}
