// Estado del beat y operaciones sobre patrones (sin audio ni UI).
import { KITS, MAX_STEPS, PROBS, TRACKS } from './theory';
import { BASSES, LEADS, PADS } from '../audio/presets';

export const STORAGE_KEY = 'msb2';

export const emptyGrid = (rows, value = 0) =>
  Array.from({ length: rows }, () => Array(MAX_STEPS).fill(value));

export function defaultState() {
  return {
    title: 'My beat',
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
    // Beat original si este es un remix: viaja con el proyecto (guardar/abrir) y no se pierde.
    remixOf: null,
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
  if (!PADS[S.pad]) S.pad = base.pad;
  if (!BASSES[S.bassSound]) S.bassSound = base.bassSound;
  if (!LEADS[S.wave]) S.wave = base.wave;
  if (!KITS[S.kit]) S.kit = base.kit;
  const r = S.remixOf;
  S.remixOf = r && typeof r.token_id === 'string' && /^\d+$/.test(String(r.remix_price ?? ''))
    ? {
      token_id: r.token_id, title: String(r.title || ''), creator: String(r.creator || ''), remix_price: String(r.remix_price),
      project_cid: typeof r.project_cid === 'string' ? r.project_cid : null,
    }
    : null;
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
    throw new Error('This file is not a valid project (not JSON).');
  }
  if (data?.format !== PROJECT_FORMAT) {
    throw new Error('This file is not a MuSecure Beats project.');
  }
  const S = normalizeState(data.beat);
  if (!S) throw new Error('The project is incomplete or damaged.');
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
/** Estilos de batería: posiciones de bombo y caja dentro de un compás de 16 pasos. */
const pick = (n, from) => [...from].sort(() => Math.random() - 0.5).slice(0, n);
const DRUM_STYLES = [
  () => ({ kick: [0, 8], snare: [4, 12], ghost: 0.04 }), // backbeat clásico
  () => ({ kick: [0, 10], snare: [4, 12], ghost: 0.12 }), // breakbeat
  () => ({ kick: [0, 3, 10], snare: [8], ghost: 0.06 }), // half-time
  () => ({ kick: [0, 4, 8, 12], snare: [4, 12], ghost: 0 }), // four on the floor
  () => ({ kick: [0, 4, 8, 12], snare: [3, 6, 11, 14], ghost: 0 }), // dembow
  () => ({ kick: [0, ...pick(2, [6, 7, 10, 11, 14])], snare: [8], ghost: 0.05 }), // trap
  () => ({ kick: [0, ...pick(2, [2, 3, 6, 7, 9, 10, 11, 14, 15])], snare: pick(2, [4, 5, 6, 10, 12, 13, 14]), ghost: 0.08 }), // libre
];

/** Progresiones típicas (grados: 0 = I, 3 = IV, 4 = V, 5 = vi...). */
const PROGRESSIONS = [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3], [1, 4, 0, 0], [0, 3, 0, 4], [0, 6, 5, 4], [5, 4, 3, 4]];
/** Ritmos de acordes dentro del compás: en qué pasos suenan y cada cuántos pasos cambia el acorde. */
const CHORD_RHYTHMS = [
  { hits: [0, 8], every: 8 },
  { hits: [0], every: 16 },
  { hits: [0, 4, 8, 12], every: 8 },
  { hits: [0, 6, 8, 14], every: 8 },
  { hits: [0, 3, 6, 10], every: 16 },
];

export function randomTrack(t, len, theory) {
  const G = emptyGrid(TRACKS[t].rows);
  const P = emptyGrid(TRACKS[t].rows, 100);
  const vv = () => (Math.random() < 0.3 ? 2 : 1);
  const pp = () => (Math.random() < 0.2 ? PROBS[1 + Math.floor(Math.random() * 3)] : 100);

  // Batería: se elige un estilo al azar (no siempre caja en 2 y 4).
  const style = DRUM_STYLES[Math.floor(Math.random() * DRUM_STYLES.length)]();
  const hatMode = Math.floor(Math.random() * 4);
  const hat = (b) => [
    () => Math.random() < 0.6, // libre
    () => b % 2 === 0, // corcheas
    () => b % 4 === 2, // a contratiempo
    () => Math.random() < 0.85, // semicorcheas casi seguidas
  ][hatMode]();

  // --- Melodía y armonía: también con estilos, para que no salga siempre lo mismo.
  // Progresión de acordes (grados de la escala; 0 = I). Se usa en acordes y en el bajo "fundamental".
  const avail = theory ? [...Array(7).keys()].filter((deg) => theory.chords[6 - deg]) : [0];
  const prog = (() => {
    const options = PROGRESSIONS.map((pr) => pr.filter((deg) => avail.includes(deg))).filter((pr) => pr.length >= 3);
    return options.length ? options[Math.floor(Math.random() * options.length)] : [0, ...pick(3, avail)];
  })();
  const degAt = (c, every) => prog[Math.floor(c / every) % prog.length];
  const chordRhythm = CHORD_RHYTHMS[Math.floor(Math.random() * CHORD_RHYTHMS.length)];
  const chordAt = (c) => {
    if (!chordRhythm.hits.includes(c % 16)) return;
    G[6 - degAt(c, chordRhythm.every)][c] = c % 16 === chordRhythm.hits[0] ? 1 : vv();
  };

  // Bajo: fundamental de la progresión, rebote de octava, caminante o libre (filas: 7 = tónica, 0 = octava).
  const bassStyle = Math.floor(Math.random() * 4);
  let walk = 7;
  const bassAt = (c) => {
    const b = c % 16;
    const rootRow = 7 - (degAt(c, 16) % 8);
    if (bassStyle === 0 && (b % 4 === 0 || (b % 4 === 3 && Math.random() < 0.3))) G[rootRow][c] = b % 4 ? 2 : 1;
    if (bassStyle === 1 && b % 2 === 0) G[b % 4 === 0 ? rootRow : Math.max(0, rootRow - 4)][c] = b % 4 ? 2 : 1;
    if (bassStyle === 2 && b % 2 === 0) {
      walk = Math.min(7, Math.max(0, walk + [-1, 1, -2, 2][Math.floor(Math.random() * 4)]));
      G[b === 0 ? rootRow : walk][c] = b % 4 ? 2 : 1;
    }
    if (bassStyle === 3 && Math.random() < 0.35) { const r = Math.random() < 0.5 ? 7 : Math.floor(Math.random() * 8); G[r][c] = vv(); P[r][c] = pp(); }
  };

  // Lead: un motivo corto que se repite con variaciones (así suena a melodía y no a notas sueltas).
  const motifLen = [4, 8, 8, 16][Math.floor(Math.random() * 4)];
  const motif = (() => {
    const m = Array(motifLen).fill(null);
    let r = Math.floor(Math.random() * 8);
    const notes = 2 + Math.floor(Math.random() * Math.max(2, motifLen / 2));
    pick(notes, [...Array(motifLen).keys()]).sort((x, y) => x - y).forEach((i) => {
      r = Math.min(7, Math.max(0, r + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      m[i] = r;
    });
    return m;
  })();
  const leadAt = (c) => {
    const r = motif[c % motifLen];
    if (r === null) return;
    const rep = Math.floor(c / motifLen);
    if (rep > 0 && Math.random() < 0.15) return; // a veces falta una nota
    const shifted = rep % 2 === 1 && Math.random() < 0.5 ? Math.min(7, Math.max(0, r + (Math.random() < 0.5 ? 1 : -1))) : r;
    G[shifted][c] = vv(); P[shifted][c] = pp();
  };

  for (let c = 0; c < len; c++) {
    if (t === 0) {
      const b = c % 16; // posición dentro del compás
      if (style.kick.includes(b)) G[0][c] = 1;
      if (style.snare.includes(b)) G[1][c] = 1;
      if (hat(b)) { G[2][c] = b % 4 ? 2 : 1; P[2][c] = pp(); }
      if (Math.random() < 0.08) { G[3][c] = vv(); P[3][c] = pp(); }
      // Variaciones: bombos y cajas fantasma (suaves) sueltos.
      if (Math.random() < 0.1 && !G[0][c]) { G[0][c] = 2; P[0][c] = pp(); }
      if (Math.random() < style.ghost && !G[1][c]) { G[1][c] = 2; P[1][c] = pp(); }
    }
    if (t === 1) bassAt(c);
    if (t === 2) leadAt(c);
    if (t === 3) chordAt(c);
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

/** Umbral: por debajo de este porcentaje de notas conservadas, el beat puede registrarse como obra original. */
export const REMIX_MIN_SIMILARITY = 30;

/**
 * Cuánto del beat original se conserva en el remix: porcentaje de las notas del original que siguen
 * en el mismo lugar (fila y paso), promediado entre las pistas. Si el remix es más largo, se compara cada vuelta.
 * Agregar notas no baja la similitud; quitar o mover las del original, sí.
 * @returns {{ overall: number, tracks: number[], parentNotes: number }}
 */
export function remixSimilarity(parent, S) {
  let total = 0;
  const tracks = TRACKS.map((_, t) => {
    let k = 0;
    let n = 0;
    parent.g[t].forEach((row, r) => {
      for (let c = 0; c < parent.len; c++) {
        if (!row[c]) continue;
        n++;
        // ¿Está la nota en alguna vuelta del remix (mismo paso dentro del largo del original)?
        let found = false;
        for (let c2 = c % parent.len; c2 < S.len && !found; c2 += parent.len) found = Boolean(S.g[t][r][c2]);
        if (found) k++;
      }
    });
    total += n;
    if (!n) return null;
    // Corrección por azar: con una pista muy llena, muchas notas "coinciden" sin querer.
    // Se descuenta la coincidencia esperada si las notas del remix estuvieran al azar.
    let filled = 0;
    let cells = 0;
    S.g[t].forEach((row) => { for (let c = 0; c < S.len; c++) { cells++; if (row[c]) filled++; } });
    const chance = cells ? filled / cells : 0;
    const observed = k / n;
    const score = chance >= 1 ? 0 : Math.max(0, (observed - chance) / (1 - chance));
    return Math.round(score * 100);
  });
  // Promedio por pista (no por nota). La batería se muestra pero no cuenta si hay pistas melódicas:
  // los ritmos se parecen entre sí por naturaleza, y la identidad de un beat está en bajo, lead y acordes.
  const melodic = tracks.slice(1).filter((v) => v !== null);
  const measured = melodic.length ? melodic : tracks.filter((v) => v !== null);
  const overall = measured.length ? Math.round(measured.reduce((a, v) => a + v, 0) / measured.length) : 100;
  return { overall, tracks, parentNotes: total };
}

/** Desplaza una pista un paso a la izquierda (-1) o a la derecha (+1), dando la vuelta dentro del largo. */
export function rotateTrack(G, P, len, dir) {
  const rot = (rows) => rows.map((row) => row.map((v, c) => (c < len ? row[(c - dir + len) % len] : v)));
  return { g: rot(G), p: rot(P) };
}

/** Mueve el compás `from` (de 16 pasos) a la posición `to` en las pistas indicadas. */
export function moveBar(S, from, to, tracks) {
  if (from === to) return;
  const bars = S.len / 16;
  const order = [...Array(bars).keys()];
  order.splice(to, 0, order.splice(from, 1)[0]);
  const reorder = (row) => {
    const copy = row.slice();
    order.forEach((src, dst) => { for (let k = 0; k < 16; k++) copy[dst * 16 + k] = row[src * 16 + k]; });
    return copy;
  };
  tracks.forEach((t) => {
    S.g[t] = S.g[t].map(reorder);
    S.p[t] = S.p[t].map(reorder);
  });
}

/**
 * Notas del beat en forma compacta para la portada on chain del NFT:
 * "<largo>|<pista0>|…|<pista3>", un carácter por paso con la fila de la nota más aguda (0–7) o ".".
 */
export function beatArt(S) {
  const tracks = S.g.map((rows) => {
    let out = '';
    for (let c = 0; c < S.len; c++) {
      const r = rows.findIndex((row) => row[c]);
      out += r < 0 ? '.' : String(Math.min(r, 7));
    }
    return out;
  });
  return [S.len, ...tracks].join('|');
}
