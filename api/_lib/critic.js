// El crítico: un NPC que escucha (lee) los remixes de cada Remix Battle, los califica y reparte el premio.
//
// 1. Lee cada proyecto desde IPFS y calcula rasgos musicales objetivos (tempo, escala, densidad,
//    síncopa, cuánto conserva de la semilla, qué pistas cambió).
// 2. Le pasa esos rasgos y las reglas del reto a un modelo en NEAR AI Cloud (inferencia privada en TEE).
//    NEAR AI firma cada respuesta: guardamos la firma para que cualquiera verifique que la reseña
//    salió de ese modelo sin cambios.
// 3. Sube las reseñas a IPFS y llama a settle_battle con una llave que SOLO puede llamar a ese método.
//
// Sin NEARAI_API_KEY usa un crítico de prueba (determinista, a partir de los mismos rasgos).

import { createHash } from 'node:crypto';
import { verifyMessage } from 'viem';
import { BEATS_CONTRACT, nearProvider } from './musecure.js';

export const NEARAI_URL = 'https://cloud-api.near.ai/v1';
export const NEARAI_MODEL = process.env.NEARAI_MODEL || 'Qwen/Qwen3.6-35B-A3B-FP8';
const GATEWAYS = ['https://gateway.lighthouse.storage/ipfs/', 'https://dweb.link/ipfs/', 'https://ipfs.io/ipfs/'];
const TRACKS = ['Drums', 'Bass', 'Lead', 'Chords'];
const SCALES = {
  pmen: 'Minor pentatonic', pmay: 'Major pentatonic', blues: 'Blues', jon: 'Major', eol: 'Natural minor',
  dor: 'Dorian', fri: 'Phrygian', lid: 'Lydian', mix: 'Mixolydian', loc: 'Locrian', arm: 'Harmonic minor', hij: 'Hijaz', hir: 'Hirajoshi',
};
const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const view = (method, args) => nearProvider().callFunction(BEATS_CONTRACT, method, args);

export async function fetchIpfsJson(cid) {
  let last;
  for (const g of GATEWAYS) {
    try {
      const r = await fetch(g + cid, { signal: AbortSignal.timeout(15000) });
      if (r.ok) return await r.json();
      last = new Error(`IPFS ${r.status}`);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/** Proyecto del secuenciador (formato msb) → estado del beat. */
async function loadProject(beat) {
  const data = await fetchIpfsJson(beat.project_cid);
  const s = data?.beat;
  if (!s?.g || !s?.len) throw new Error(`Beat ${beat.token_id}: unreadable project`);
  return s;
}

// ---------- rasgos musicales

const notesOf = (s, t) => {
  let n = 0;
  for (const row of s.g[t] || []) for (let c = 0; c < s.len; c++) if (row[c]) n++;
  return n;
};

/** Notas fuera del tiempo fuerte (ni 1 ni 3 de cada grupo de 4) / total, en batería y bajo. */
function syncopation(s) {
  let off = 0;
  let all = 0;
  for (const t of [0, 1]) {
    for (const row of s.g[t] || []) {
      for (let c = 0; c < s.len; c++) {
        if (!row[c]) continue;
        all++;
        if (c % 4 !== 0 && c % 4 !== 2) off++;
      }
    }
  }
  return all ? Math.round((off / all) * 100) : 0;
}

/** Igual que remixSimilarity del frontend: cuánto de la semilla sigue en el remix (0–100), por pista. */
export function similarity(parent, s) {
  const tracks = TRACKS.map((_, t) => {
    let k = 0;
    let n = 0;
    (parent.g[t] || []).forEach((row, r) => {
      for (let c = 0; c < parent.len; c++) {
        if (!row[c]) continue;
        n++;
        let found = false;
        for (let c2 = c % parent.len; c2 < s.len && !found; c2 += parent.len) found = Boolean(s.g[t]?.[r]?.[c2]);
        if (found) k++;
      }
    });
    if (!n) return null;
    let filled = 0;
    let cells = 0;
    (s.g[t] || []).forEach((row) => { for (let c = 0; c < s.len; c++) { cells++; if (row[c]) filled++; } });
    const chance = cells ? filled / cells : 0;
    const score = chance >= 1 ? 0 : Math.max(0, (k / n - chance) / (1 - chance));
    return Math.round(score * 100);
  });
  const melodic = tracks.slice(1).filter((v) => v !== null);
  const measured = melodic.length ? melodic : tracks.filter((v) => v !== null);
  const overall = measured.length ? Math.round(measured.reduce((a, v) => a + v, 0) / measured.length) : 100;
  return { overall, tracks };
}

export function features(seed, s) {
  const sim = similarity(seed, s);
  return {
    bpm: s.bpm,
    steps: s.len,
    key: `${ROOTS[s.root] ?? '?'} ${SCALES[s.scale] ?? s.scale}`,
    same_key_as_seed: s.root === seed.root && s.scale === seed.scale,
    bpm_change: s.bpm - seed.bpm,
    swing: s.swing || 0,
    kit: s.kit,
    sounds: { lead: s.wave, bass: s.bassSound, chords: s.pad },
    notes_per_track: Object.fromEntries(TRACKS.map((name, t) => [name, notesOf(s, t)])),
    syncopation_pct: syncopation(s),
    // Melódico (bajo, lead, acordes) = el criterio de 30 % para ser remix. Total = las 4 pistas.
    kept_melodic_pct: sim.overall,
    kept_all_tracks_pct: sim.tracks.filter((v) => v !== null).length ? Math.round(sim.tracks.filter((v) => v !== null).reduce((a, v) => a + v, 0) / sim.tracks.filter((v) => v !== null).length) : 100,
    kept_per_track_pct: Object.fromEntries(TRACKS.map((name, t) => [name, sim.tracks[t]])),
    muted_tracks: TRACKS.filter((_, t) => s.mix?.[t]?.mute),
  };
}

// ---------- calificación

const SYSTEM = `You are "The Monk", a robot music producer who has reached enlightenment through listening. You sit cross-legged, eyes closed, beard of tangled audio cables, one giant fader in your lap. You are the judge of MuSecure Beats Remix Battles, where producers remix a weekly seed beat.
How you speak: calm, few words, zen and precise. Short sentences. Gentle but merciless honesty. You talk about space, breath, restraint and truth in sound. You may address the producer directly. Occasional dry humor. Never use emojis, hype words, or exclamation marks.
You cannot hear audio: you receive objective features computed from each remix's sequencer project, plus the week's rules. Treat the numbers as what you "felt" while listening, and always ground your words in them.
Judge each remix on: (1) following the rules, (2) creativity (kept_all_tracks_pct around 30-70% is the sweet spot; kept_melodic_pct must stay >= 30 for it to count as a remix), (3) groove and arrangement (density balance, syncopation, tempo, swing), (4) coherence.
For each remix give an integer score from 0 to 100, a review (2-3 sentences, in your voice, specific to the numbers) and a mantra (one short line of advice, max 8 words). Never give two remixes the same score unless they are truly identical.
Answer ONLY with JSON: {"reviews":[{"token_id":"<id>","score":<0-100>,"review":"<text>","mantra":"<text>"}]} with one entry per remix, in any order.`;

function userPrompt(battle, seedFeatures, entries) {
  return JSON.stringify({
    battle: { title: battle.title, rules: battle.rules || '(no extra rules)' },
    seed: { token_id: battle.seed_id, features: seedFeatures },
    remixes: entries.map((e) => ({ token_id: e.token_id, title: e.title, features: e.features })),
  });
}

/** Crítico de prueba: determinista, mismo criterio a grandes rasgos. */
function mockReviews(entries) {
  return entries.map((e) => {
    const f = e.features;
    const kept = f.kept_all_tracks_pct;
    const creativity = 40 - Math.min(40, Math.abs(kept - 50) * 0.8);
    const notes = Object.values(f.notes_per_track);
    const active = notes.filter((n) => n > 0).length;
    const groove = Math.min(30, f.syncopation_pct * 0.5 + active * 3);
    const tid = Number(e.token_id) || 0;
    const score = Math.max(0, Math.min(100, Math.round(20 + creativity + groove + (tid % 7))));
    return {
      token_id: e.token_id,
      score,
      mantra: kept > 80 ? 'Let go of the seed.' : 'Remove one more thing.',
      review: `Test critic: keeps ${kept}% of the seed with ${f.syncopation_pct}% syncopation at ${f.bpm} BPM. ${kept > 80 ? 'Too close to the original.' : kept < 20 ? 'Barely recognizable as a remix.' : 'A healthy balance of respect and risk.'}`,
    };
  });
}

/** Una llamada a NEAR AI para toda la batalla, más la firma TEE de la respuesta. */
async function nearAiReviews(battle, seedFeatures, entries) {
  const key = process.env.NEARAI_API_KEY;
  const body = JSON.stringify({
    model: NEARAI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt(battle, seedFeatures, entries) },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });
  const r = await fetch(`${NEARAI_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(120000),
  });
  const responseText = await r.text();
  if (!r.ok) throw new Error(`NEAR AI replied ${r.status}: ${responseText.slice(0, 200)}`);
  const completion = JSON.parse(responseText);
  let content = completion.choices?.[0]?.message?.content || '';
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(json)?|```$/gm, '').trim();
  const parsed = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));

  // Firma de la respuesta (inferencia verificable). Si falla, la reseña sigue valiendo pero sin prueba.
  let attestation = null;
  try {
    const sr = await fetch(`${NEARAI_URL}/signature/${encodeURIComponent(completion.id)}?model=${encodeURIComponent(NEARAI_MODEL)}&signing_algo=ecdsa`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (sr.ok) {
      const sig = await sr.json();
      const expected = `${sha256(body)}:${sha256(responseText)}`;
      let validSignature = false;
      try {
        validSignature = await verifyMessage({ address: sig.signing_address, message: sig.text, signature: sig.signature });
      } catch { /* formato inesperado: se guarda igual para verificar a mano */ }
      attestation = {
        chat_id: completion.id,
        text: sig.text,
        signature: sig.signature,
        signing_address: sig.signing_address,
        signing_algo: sig.signing_algo || 'ecdsa',
        signature_valid: validSignature,
        hashes_match: typeof sig.text === 'string' && sig.text.endsWith(expected),
        request_sha256: sha256(body),
        response_sha256: sha256(responseText),
        verify: `${NEARAI_URL}/attestation/report?model=${NEARAI_MODEL}&signing_algo=ecdsa`,
      };
    }
  } catch { /* sin firma */ }
  return { reviews: parsed.reviews || [], attestation, request: JSON.parse(body), response: responseText };
}

/** Normaliza lo que diga el modelo: una nota entera 0–100 para CADA participante. */
function normalize(reviews, entries) {
  return entries.map((e) => {
    const r = reviews.find((x) => String(x.token_id) === e.token_id) || {};
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    return { token_id: e.token_id, title: e.title, score, review: String(r.review || 'No review.').slice(0, 600), mantra: String(r.mantra || '').slice(0, 80) };
  });
}

/** Califica una batalla. No toca la blockchain. */
export async function judgeBattle(battle) {
  const entryIds = await view('get_battle_entries', { battle_id: battle.id });
  const seedBeat = await view('get_beat', { token_id: battle.seed_id });
  const seed = await loadProject(seedBeat);
  const seedFeatures = features(seed, seed);
  delete seedFeatures.kept_melodic_pct;
  delete seedFeatures.kept_all_tracks_pct;
  delete seedFeatures.kept_per_track_pct;

  const entries = [];
  for (const id of entryIds) {
    const beat = await view('get_beat', { token_id: id });
    try {
      entries.push({ token_id: id, title: beat.title, creator: beat.creator, features: features(seed, await loadProject(beat)) });
    } catch (e) {
      // Proyecto ilegible: participa con nota 0 (hay que calificar a todos).
      entries.push({ token_id: id, title: beat.title, creator: beat.creator, features: null, error: e.message });
    }
  }
  const readable = entries.filter((e) => e.features);

  let mode = readable.length ? 'test' : 'no-entries';
  let raw = { reviews: [] };
  if (readable.length && process.env.NEARAI_API_KEY) {
    raw = await nearAiReviews(battle, seedFeatures, readable);
    mode = 'nearai';
  } else if (readable.length) {
    raw = { reviews: mockReviews(readable) };
  }
  const reviews = normalize(raw.reviews, entries).map((r) => {
    const e = entries.find((x) => x.token_id === r.token_id);
    return e.error ? { ...r, score: 0, review: `Could not read the project (${e.error}).` } : { ...r, features: e.features };
  });

  return {
    format: 'musecure-beats-critic',
    version: 1,
    contract: BEATS_CONTRACT,
    battle_id: battle.id,
    battle: { title: battle.title, rules: battle.rules, seed_id: battle.seed_id },
    critic: mode === 'nearai' ? { mode, persona: 'The Monk', provider: 'NEAR AI Cloud (private TEE inference)', model: NEARAI_MODEL } : { mode, note: mode === 'no-entries' ? 'No readable entries: nothing to judge' : 'Test critic (no NEAR AI key configured)' },
    judged_at: new Date().toISOString(),
    reviews,
    attestation: raw.attestation || null,
    request: raw.request || null,
    response: raw.response || null,
  };
}

export async function uploadJson(obj, name) {
  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }), name);
  const r = await fetch('https://upload.lighthouse.storage/api/v0/add?cid-version=1', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.LIGHTHOUSE_API_KEY}` },
    body: form,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Lighthouse replied ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text).Hash;
}

export const getBattles = () => view('get_battles', { limit: 20 });
