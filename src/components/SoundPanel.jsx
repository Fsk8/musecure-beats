import { KITS, ROOTS, SCALES } from '../music/theory';
import { Panel } from './Panel';
import { BASSES, LEADS, PADS } from '../audio/presets';

export function SoundPanel({ S, mutate, onRandomSounds }) {
  const set = (key, cast = (v) => v) => (e) => mutate((d) => { d[key] = cast(e.target.value); });

  return (
    <Panel id="sound" title="Sound"
      summary={`${KITS[S.kit].name} · ${ROOTS[S.root][0]} ${SCALES[S.scale][0].toLowerCase()} · chords ${(PADS[S.pad] || PADS.dreamy).name.toLowerCase()}`}>
      <div className="fields">
        <label htmlFor="kit">
          Kit
          <select id="kit" value={S.kit} onChange={set('kit')}>
            {Object.entries(KITS).map(([k, kit]) => (
              <option key={k} value={k}>{kit.name}</option>
            ))}
          </select>
        </label>
        <label htmlFor="root">
          Root
          <select id="root" value={S.root} onChange={set('root', Number)}>
            {ROOTS.map(([en, es], i) => (
              <option key={en} value={i}>{en}</option>
            ))}
          </select>
        </label>
        <label htmlFor="scale">
          Scale
          <select id="scale" value={S.scale} onChange={set('scale')}>
            {Object.entries(SCALES).map(([k, [name]]) => (
              <option key={k} value={k}>{name}</option>
            ))}
          </select>
        </label>
        <label htmlFor="wave">
          Lead
          <select id="wave" value={S.wave} onChange={set('wave')}>
            {Object.entries(LEADS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
          </select>
        </label>
        <label htmlFor="bassSound">
          Bass
          <select id="bassSound" value={S.bassSound} onChange={set('bassSound')}>
            {Object.entries(BASSES).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
          </select>
        </label>
        <label htmlFor="pad">
          Chord sound
          <select id="pad" value={S.pad} onChange={set('pad')}>
            {Object.entries(PADS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
          </select>
        </label>
        <label htmlFor="arp">
          Chords
          <select id="arp" value={S.arp} onChange={set('arp')}>
            <option value="off">Block (all together)</option>
            <option value="up">Arpeggio ↑</option>
            <option value="down">Arpeggio ↓</option>
            <option value="updown">Arpeggio ↑↓</option>
            <option value="rand">Random arpeggio</option>
          </select>
        </label>
      </div>
      <div className="bar">
        <button onClick={onRandomSounds} title="Changes kit and sounds without touching the notes">🎲 Surprise me (sounds)</button>
      </div>
    </Panel>
  );
}
