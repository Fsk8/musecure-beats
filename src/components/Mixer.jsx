import { OCT_RANGE, TRACKS } from '../music/theory';
import { Panel } from './Panel';

export function Mixer({ S, mutate }) {
  const setMix = (i, key) => (e) => mutate((d) => { d.mix[i][key] = +e.target.value; });

  const flags = TRACKS.map((t, i) => {
    const m = S.mix[i];
    if (m.mute) return `${t.name}: muted`;
    if (m.solo) return `${t.name}: solo`;
    return null;
  }).filter(Boolean);

  return (
    <Panel id="mixer" title="Mixer" summary={flags.length ? flags.join(' · ') : 'All tracks playing'}>
      <div className="mixer">
        {TRACKS.map((t, i) => {
          const m = S.mix[i];
          return (
            <div key={t.id} className="ch" style={{ '--c': `var(--t${i})` }}>
              <div className="top">
                <strong>{t.name}</strong>
                <div className="chbtns">
                  <button className="mute" aria-pressed={m.mute} aria-label={`Mute ${t.name}`}
                    onClick={() => mutate((d) => { d.mix[i].mute = !d.mix[i].mute; })}>
                    M
                  </button>
                  <button className="solo" aria-pressed={m.solo} aria-label={`Solo ${t.name}`}
                    onClick={() => mutate((d) => { d.mix[i].solo = !d.mix[i].solo; })}>
                    S
                  </button>
                </div>
              </div>
              {i > 0 && (
                <div className="oct" role="group" aria-label={`${t.name} octave`}>
                  <span>Octave</span>
                  <button aria-label={`${t.name} octave down`} disabled={S.oct[i] <= OCT_RANGE[0]}
                    onClick={() => mutate((d) => { d.oct[i] -= 1; })}>−</button>
                  <span className="num" aria-live="polite">{S.oct[i] > 0 ? `+${S.oct[i]}` : S.oct[i]}</span>
                  <button aria-label={`${t.name} octave up`} disabled={S.oct[i] >= OCT_RANGE[1]}
                    onClick={() => mutate((d) => { d.oct[i] += 1; })}>+</button>
                </div>
              )}
              <div className="fx">
                <label htmlFor={`v${i}`}>Vol</label>
                <input type="range" id={`v${i}`} min="-36" max="6" value={m.vol} onChange={setMix(i, 'vol')} />
                <label htmlFor={`r${i}`}>Reverb</label>
                <input type="range" id={`r${i}`} min="0" max="100" value={m.rev} onChange={setMix(i, 'rev')} />
                <label htmlFor={`d${i}`}>Delay</label>
                <input type="range" id={`d${i}`} min="0" max="100" value={m.del} onChange={setMix(i, 'del')} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
