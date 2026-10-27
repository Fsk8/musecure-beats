// Tests de los rasgos musicales que usa The Monk (servidor): node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { features, similarity } from '../api/_lib/critic.js';
import { defaultState, withExampleBeat } from '../src/music/patterns.js';

const seed = () => { const S = defaultState(); withExampleBeat(S); S.g[1][3][0] = 1; S.g[2][2][4] = 1; return S; };

test('the critic measures the same similarity as the app', () => {
  const S = seed();
  assert.equal(similarity(S, JSON.parse(JSON.stringify(S))).overall, 100);
});

test('features report tempo change, key and what was kept', () => {
  const S = seed();
  const R = JSON.parse(JSON.stringify(S));
  R.bpm = S.bpm - 10;
  R.g[0] = R.g[0].map((row) => row.map(() => 0)); // batería nueva (vacía)
  const f = features(S, R);
  assert.equal(f.bpm_change, -10);
  assert.equal(f.same_key_as_seed, true);
  assert.equal(f.notes_per_track.Drums, 0);
  assert.equal(f.kept_per_track_pct.Drums, 0);
  assert.ok(f.kept_all_tracks_pct < f.kept_melodic_pct);
});
