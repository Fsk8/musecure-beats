import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from './Panel';
import { Bubble, Monk } from './Monk';

// The Monk's Path: el tutorial del juego. Dos partes:
// - Path: los pasos para entrar al juego (hacer un beat, registrarlo, remixar, entrar a una batalla).
// - Drills: ejercicios de estudio sobre el beat abierto, que se revisan en vivo (estilo "Challenge 1").
// El progreso se guarda en este navegador. Una vez cumplido, un reto queda cumplido.

const KEY = 'msb-monk-path';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sin almacenamiento: solo esta sesión */ } };

const DRUMS = 0; const BASS = 1; const LEAD = 2; const CHORDS = 3;
const KICK = 0; const SNARE = 1; const HAT = 2;
const on = (S, t, row, step) => Boolean(S.g[t]?.[row]?.[step]);
const anyRow = (S, t, step) => (S.g[t] || []).some((row) => row[step]);
const count = (S, t, from = 0, to = 16) => {
  let n = 0;
  for (let c = from; c < Math.min(to, S.len); c++) if (anyRow(S, t, c)) n++;
  return n;
};
const steps16 = [...Array(16).keys()];

/** Retos del camino: se cumplen con acciones en la app (eventos), no con el beat abierto. */
export const PATH = [
  { id: 'pulse', title: 'Find the pulse', task: 'Kick on steps 1 and 9, snare on 5 and 13, at least 4 lead notes and one chord.',
    check: (S) => on(S, DRUMS, KICK, 0) && on(S, DRUMS, KICK, 8) && on(S, DRUMS, SNARE, 4) && on(S, DRUMS, SNARE, 12)
      && S.g[LEAD].flat().filter(Boolean).length >= 4 && S.g[CHORDS].flat().some(Boolean),
    praise: 'A heartbeat. Everything starts here.' },
  { id: 'color', title: 'Choose your color', task: 'Change the scale or the key, and listen to every track follow it.', event: 'color',
    praise: 'Same notes, new light. Remember this.' },
  { id: 'register', title: 'Make it yours', task: 'Register a beat on NEAR. It becomes an NFT that owns its money.', event: 'register',
    praise: 'Now it exists. Now it can earn.' },
  { id: 'remix', title: 'Honor the seed', task: 'Remix someone else\'s beat from the Gallery and register it. The original gets paid.', event: 'remix',
    praise: 'You took, and you gave back. Good.' },
  { id: 'battle', title: 'Face the Monk', task: 'Open Battles, press "Remix the seed" and register your remix before the deadline.', event: 'battle',
    praise: 'You came. I will listen.' },
];

/** Ejercicios de estudio: se revisan en vivo sobre los primeros 16 pasos del beat abierto. */
export const DRILLS = [
  { id: 'four', title: 'Four on the floor', task: 'Kick on every beat: steps 1, 5, 9 and 13.',
    check: (S) => [0, 4, 8, 12].every((c) => on(S, DRUMS, KICK, c)), praise: 'Steady. Like breathing.' },
  { id: 'hats', title: 'Hi-hat runner', task: 'Hi-hat on every other step: 1, 3, 5 … 15 (eight hits).',
    check: (S) => steps16.filter((c) => c % 2 === 0).every((c) => on(S, DRUMS, HAT, c)), praise: 'The engine hums.' },
  { id: 'lock', title: 'Lock the low end', task: 'A bass note on every step where the kick plays (at least 3 kicks).',
    check: (S) => {
      const kicks = steps16.filter((c) => on(S, DRUMS, KICK, c));
      return kicks.length >= 3 && kicks.every((c) => anyRow(S, BASS, c));
    }, praise: 'Kick and bass, one body.' },
  { id: 'sync', title: 'Off the grid', task: 'Put a kick or snare on an in-between step (2, 4, 6 …) for some syncopation.',
    check: (S) => steps16.some((c) => c % 2 === 1 && (on(S, DRUMS, KICK, c) || on(S, DRUMS, SNARE, c))), praise: 'Now it leans. Now it moves.' },
  { id: 'answer', title: 'Call and response', task: 'Lead notes in the first half (steps 1–8) and in the second half (9–16), at least 2 each.',
    check: (S) => count(S, LEAD, 0, 8) >= 2 && count(S, LEAD, 8, 16) >= 2, praise: 'A question. An answer. A story.' },
  { id: 'prog', title: 'Change the harmony', task: 'Use at least 3 different chords in the chords track.',
    check: (S) => (S.g[CHORDS] || []).filter((row) => row.slice(0, S.len).some(Boolean)).length >= 3, praise: 'The ground shifts. Good.' },
  { id: 'space', title: 'Leave space', task: 'Keep half of the first 16 steps free of drums, and still have a groove (at least 4 drum hits).',
    check: (S) => { const d = count(S, DRUMS); return d >= 4 && d <= 8; }, praise: 'Silence is also an instrument.' },
];

const ALL = [...PATH, ...DRILLS];

export function MonkPath({ beat: S }) {
  const [done, setDone] = useState(load);
  const [said, setSaid] = useState('');
  const first = useRef(true);
  const scaleKey = `${S.root}|${S.scale}`;
  const lastScale = useRef(scaleKey);

  function complete(id) {
    setDone((d) => {
      if (d[id]) return d;
      const next = { ...d, [id]: Date.now() };
      save(next);
      setSaid(ALL.find((x) => x.id === id)?.praise || '');
      return next;
    });
  }

  // Retos que se revisan sobre el beat abierto. El beat con el que abre la app no cuenta: hay que tocarlo.
  const initialBeat = useRef(S);
  useEffect(() => {
    if (S === initialBeat.current) return;
    for (const c of ALL) if (c.check && !done[c.id] && c.check(S)) complete(c.id);
  }, [S]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambio de escala o tonalidad (no cuenta la carga inicial).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (lastScale.current !== scaleKey) complete('color');
    lastScale.current = scaleKey;
  }, [scaleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Registro: lo avisa App con { remixOf, battleSeed }.
  useEffect(() => {
    const onReg = (e) => {
      complete('register');
      const { remixOf, battleSeed } = e.detail || {};
      if (remixOf) complete('remix');
      if (remixOf && battleSeed && String(remixOf.token_id) === String(battleSeed)) complete('battle');
    };
    window.addEventListener('msb:registered', onReg);
    return () => window.removeEventListener('msb:registered', onReg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pathDone = PATH.filter((c) => done[c.id]).length;
  const drillsDone = DRILLS.filter((c) => done[c.id]).length;
  const current = PATH.find((c) => !done[c.id]);
  const line = useMemo(() => {
    if (said) return said;
    if (!current) return 'You walked the whole path. Now the drills never end.';
    return pathDone === 0 ? 'Welcome. Sit. We start with the pulse.' : `Next: ${current.title.toLowerCase()}.`;
  }, [said, current, pathDone]);

  useEffect(() => {
    if (!said) return undefined;
    const t = setTimeout(() => setSaid(''), 6000);
    return () => clearTimeout(t);
  }, [said]);

  function reset() {
    if (!window.confirm('Start the path again? Your progress on this browser will be cleared.')) return;
    save({});
    setDone({});
  }

  const item = (c) => (
    <li key={c.id} className={`path-item${done[c.id] ? ' done' : ''}${c === current ? ' current' : ''}`}>
      <span className="path-check" aria-hidden="true">{done[c.id] ? '✓' : ''}</span>
      <span>
        <strong>{c.title}</strong>
        <span className="hint block">{c.task}</span>
      </span>
    </li>
  );

  return (
    <Panel id="challenge" title="The Monk's Path" summary={`Path ${pathDone}/${PATH.length} · Drills ${drillsDone}/${DRILLS.length}`}>
      <div className="monk-host">
        <Monk mood={said ? 'pleased' : 'calm'} fader={pathDone / PATH.length} size={84} />
        <Bubble small={!said}>{line}</Bubble>
      </div>
      <div className="path-grid">
        <div>
          <span className="label">The path</span>
          <ol className="path-list">{PATH.map(item)}</ol>
        </div>
        <div>
          <span className="label">Studio drills · checked live on your open beat</span>
          <ul className="path-list">{DRILLS.map(item)}</ul>
        </div>
      </div>
      <div className="bar spread">
        <span className="hint">Progress is saved on this browser.</span>
        <button className="mini" onClick={reset}>Start over</button>
      </div>
    </Panel>
  );
}
