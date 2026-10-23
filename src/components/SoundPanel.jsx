import { KITS, ROOTS, SCALES } from '../music/theory';
import { Panel } from './Panel';

export function SoundPanel({ S, mutate }) {
  const set = (key, cast = (v) => v) => (e) => mutate((d) => { d[key] = cast(e.target.value); });

  return (
    <Panel id="sound" title="Sonido"
      summary={`${KITS[S.kit].name} · ${ROOTS[S.root][1]} ${SCALES[S.scale][0].toLowerCase()} · acordes ${S.pad === 'dreamy' ? 'dreamy' : 'suaves'}`}>
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
          Raíz
          <select id="root" value={S.root} onChange={set('root', Number)}>
            {ROOTS.map(([en, es], i) => (
              <option key={en} value={i}>{`${es} (${en})`}</option>
            ))}
          </select>
        </label>
        <label htmlFor="scale">
          Escala
          <select id="scale" value={S.scale} onChange={set('scale')}>
            {Object.entries(SCALES).map(([k, [name]]) => (
              <option key={k} value={k}>{name}</option>
            ))}
          </select>
        </label>
        <label htmlFor="wave">
          Lead
          <select id="wave" value={S.wave} onChange={set('wave')}>
            <option value="tri">Suave (triangular)</option>
            <option value="saw">Saw (sierra)</option>
          </select>
        </label>
        <label htmlFor="bassSound">
          Bajo
          <select id="bassSound" value={S.bassSound} onChange={set('bassSound')}>
            <option value="classic">Clásico (sierra)</option>
            <option value="synth">Synth bass (con sub)</option>
          </select>
        </label>
        <label htmlFor="pad">
          Sonido acordes
          <select id="pad" value={S.pad} onChange={set('pad')}>
            <option value="dreamy">Dreamy (pad)</option>
            <option value="soft">Suave (el anterior)</option>
          </select>
        </label>
        <label htmlFor="arp">
          Acordes
          <select id="arp" value={S.arp} onChange={set('arp')}>
            <option value="off">Plaqué (todas juntas)</option>
            <option value="up">Arpegio ↑</option>
            <option value="down">Arpegio ↓</option>
            <option value="updown">Arpegio ↑↓</option>
            <option value="rand">Arpegio al azar</option>
          </select>
        </label>
      </div>
    </Panel>
  );
}
