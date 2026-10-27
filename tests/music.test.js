// Tests de la lógica pura del secuenciador (sin audio ni navegador): node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALES, TRACKS, computeTheory } from '../src/music/theory.js';
import {
  REMIX_MIN_SIMILARITY, beatArt, defaultState, moveBar, parseProjectFile, projectFile, remixSimilarity, rotateTrack,
  withExampleBeat,
} from '../src/music/patterns.js';
import { beatToMidi, noteToMidi } from '../src/music/midi.js';

const example = () => { const S = defaultState(); withExampleBeat(S); return S; };
const clone = (x) => JSON.parse(JSON.stringify(x));

test('every melodic note stays inside the chosen scale', () => {
  for (const [key, [, iv]] of Object.entries(SCALES)) {
    const t = computeTheory(0, key);
    for (const name of [...t.lead, ...t.bass]) {
      assert.ok(iv.includes(noteToMidi(name) % 12), `${name} is outside ${key}`);
    }
  }
});

test('exotic scales are available (Hijaz, Hirajoshi)', () => {
  assert.deepEqual(SCALES.hij[1], [0, 1, 4, 5, 7, 8, 10]);
  assert.deepEqual(SCALES.hir[1], [0, 2, 3, 7, 8]);
});

test('a beat is 100 % similar to itself and an untouched remix is a remix', () => {
  const S = example();
  assert.equal(remixSimilarity(S, clone(S)).overall, 100);
  assert.ok(remixSimilarity(S, clone(S)).overall >= REMIX_MIN_SIMILARITY);
});

test('clearing the melodic tracks drops similarity below the remix threshold', () => {
  const S = example();
  S.g[1][3][0] = 1; S.g[2][2][4] = 1; S.g[3][6][0] = 1; // notas melódicas en el original
  const R = clone(S);
  for (const t of [1, 2, 3]) R.g[t] = R.g[t].map((row) => row.map(() => 0));
  assert.ok(remixSimilarity(S, R).overall < REMIX_MIN_SIMILARITY);
});

test('shifting a track left then right gives it back unchanged', () => {
  const S = example();
  const a = rotateTrack(S.g[0], S.p[0], S.len, -1);
  const b = rotateTrack(a.g, a.p, S.len, 1);
  assert.deepEqual(b.g, S.g[0]);
});

test('moving bars keeps every note', () => {
  const S = example();
  S.len = 32;
  const before = S.g.flat(2).filter(Boolean).length;
  const M = clone(S);
  moveBar(M, 0, 1, [0, 1, 2, 3]); // cambia el beat en su lugar
  assert.equal(M.g.flat(2).filter(Boolean).length, before);
  assert.deepEqual(M.g[0][0].slice(16, 32), S.g[0][0].slice(0, 16)); // el compás 1 pasó a la posición 2
});

test('a saved project opens back identical', () => {
  const S = example();
  const opened = parseProjectFile(projectFile(S));
  assert.deepEqual(opened.g, S.g);
  assert.equal(opened.bpm, S.bpm);
  assert.throws(() => parseProjectFile('not json'), /not a valid project/);
});

test('cover art string matches the format the contract validates', () => {
  const art = beatArt(example());
  const parts = art.split('|');
  assert.equal(parts.length, 1 + TRACKS.length);
  const len = Number(parts[0]);
  assert.ok([16, 32, 64].includes(len));
  for (const track of parts.slice(1)) assert.match(track, new RegExp(`^[0-7.]{${len}}$`));
});

test('MIDI export: valid header, one track per instrument, drums on channel 10', () => {
  const S = example();
  const bytes = beatToMidi(S, 2);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd');
  assert.equal((bytes[10] << 8) | bytes[11], TRACKS.length + 1); // pista de tempo + 4 instrumentos
  const noteOnCh10 = bytes.some((b, i) => b === 0x99 && bytes[i + 1] === 36); // kick en el canal 10
  assert.ok(noteOnCh10);
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('A#2'), 46);
});
