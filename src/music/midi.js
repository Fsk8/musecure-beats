// Exportar el beat como MIDI (Standard MIDI File, tipo 1): una pista por instrumento, para arrastrarla
// a cualquier DAW (Ableton, Logic, FL Studio, Reaper…) y tocarla con sus propios instrumentos.
//
// - Batería en el canal 10 con las notas General MIDI (kick 36, snare 38, hi-hat 42, clap 39).
// - Bajo, lead y acordes con las notas de la escala elegida, igual que suenan en la app (incluye octavas).
// - Celdas fuertes = velocidad 100, suaves = 45. El swing y la probabilidad no se exportan (el DAW los aplica).

import { computeTheory, TRACKS } from './theory.js';

const PPQ = 480;
const STEP = PPQ / 4; // un paso = semicorchea
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const GM_DRUMS = [36, 38, 42, 39];
const VELOCITY = [0, 100, 45];

/** "C#4" → 61 */
export function noteToMidi(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return null;
  return NOTE_NAMES.indexOf(m[1]) + 12 * (Number(m[2]) + 1);
}

const vlq = (n) => {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
};
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const text = (s) => [...new TextEncoder().encode(s)];

/** Eventos {tick, bytes} → bytes de un bloque MTrk. */
function trackChunk(name, events, extra = []) {
  const all = [{ tick: 0, bytes: [0xff, 0x03, ...vlq(text(name).length), ...text(name)] }, ...extra, ...events]
    .sort((a, b) => a.tick - b.tick || (a.bytes[0] & 0xf0) - (b.bytes[0] & 0xf0)); // note-off antes que note-on
  const data = [];
  let last = 0;
  for (const e of all) {
    data.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  data.push(...vlq(0), 0xff, 0x2f, 0x00);
  return [...text('MTrk'), ...u32(data.length), ...data];
}

function note(events, ch, pitch, vel, start, length) {
  if (pitch === null || pitch < 0 || pitch > 127) return;
  events.push({ tick: start, bytes: [0x90 | ch, pitch, vel] });
  events.push({ tick: start + length, bytes: [0x80 | ch, pitch, 0] });
}

/**
 * Proyecto del secuenciador → archivo MIDI (Uint8Array).
 * `loops`: cuántas veces repetir el patrón.
 */
export function beatToMidi(S, loops = 1) {
  const theory = computeTheory(S.root, S.scale, S.oct);
  const len = S.len;
  const total = len * loops;
  const tracks = [[], [], [], []];

  for (let l = 0; l < loops; l++) {
    for (let c = 0; c < len; c++) {
      const tick = (l * len + c) * STEP;
      // Batería
      GM_DRUMS.forEach((pitch, row) => {
        const v = S.g[0]?.[row]?.[c];
        if (v) note(tracks[0], 9, pitch, VELOCITY[v] || 100, tick, STEP);
      });
      // Bajo y lead: una nota por fila activa
      for (const [t, names, steps] of [[1, theory.bass, 2], [2, theory.lead, 1]]) {
        names.forEach((name, row) => {
          const v = S.g[t]?.[row]?.[c];
          if (v) note(tracks[t], t, noteToMidi(name), VELOCITY[v] || 100, tick, STEP * steps - 10);
        });
      }
      // Acordes: suenan hasta el próximo acorde (máximo 4 pasos)
      theory.chords.forEach((chord, row) => {
        const v = S.g[3]?.[row]?.[c];
        if (!v || !chord) return;
        let dur = 1;
        while (dur < 4 && c + dur < len && !(S.g[3] || []).some((r) => r[c + dur])) dur++;
        for (const name of chord) note(tracks[3], 3, noteToMidi(name), VELOCITY[v] || 100, tick, STEP * dur - 10);
      });
    }
  }

  const usPerBeat = Math.round(60000000 / (S.bpm || 96));
  const tempo = { tick: 0, bytes: [0xff, 0x51, 0x03, (usPerBeat >> 16) & 255, (usPerBeat >> 8) & 255, usPerBeat & 255] };
  const sig = { tick: 0, bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8] };
  const endMark = { tick: total * STEP, bytes: [0xff, 0x01, 0x00] }; // marca el largo exacto del loop

  const header = [...text('MThd'), ...u32(6), 0, 1, 0, TRACKS.length + 1, (PPQ >> 8) & 255, PPQ & 255];
  const chunks = [trackChunk(S.title || 'MuSecure Beats', [], [tempo, sig, endMark])];
  TRACKS.forEach((t, i) => chunks.push(trackChunk(t.name, tracks[i])));
  return new Uint8Array([...header, ...chunks.flat()]);
}

export const midiBlob = (S, loops = 1) => new Blob([beatToMidi(S, loops)], { type: 'audio/midi' });
