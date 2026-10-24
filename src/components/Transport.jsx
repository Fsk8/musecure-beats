import { cutHz } from '../audio/engine';

export function Transport({
  S, mutate, playing, onTogglePlay, onLenChange, onRandomTrack, onAskRandomAll, onRandomSounds, onClearTrack, lite, onLiteChange, children,
}) {
  return (
    <>
    {/* Barra fija: queda visible al bajar por la página */}
    <div className="transport-bar" role="toolbar" aria-label="Playback">
      <div className="bar">
        <button id="play" className="primary" onClick={onTogglePlay}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <label htmlFor="tempo">
          BPM
          <input id="tempo" type="range" min="70" max="160" value={S.bpm}
            onChange={(e) => mutate((d) => { d.bpm = +e.target.value; })} />
          <span className="num">{S.bpm}</span>
        </label>
        <label htmlFor="metro" className="switch">
          <input id="metro" type="checkbox" role="switch" checked={S.metro}
            onChange={(e) => mutate((d) => { d.metro = e.target.checked; })} />
          Metronome
        </label>
        <label htmlFor="lite" className="switch" title="Simpler live sounds for slow computers. Exported WAVs keep full quality.">
          <input id="lite" type="checkbox" role="switch" checked={lite}
            onChange={(e) => onLiteChange(e.target.checked)} />
          Lite mode
        </label>
      </div>
    </div>

    <section className="panel">
      <div className="bar">
        <label htmlFor="swing">
          Swing
          <input id="swing" type="range" min="0" max="70" value={S.swing}
            onChange={(e) => mutate((d) => { d.swing = +e.target.value; })} />
          <span className="num">{S.swing}%</span>
        </label>
        <label htmlFor="len">
          Length
          <select id="len" value={S.len} onChange={(e) => onLenChange(+e.target.value)}>
            <option value="16">16 steps · 1 bar</option>
            <option value="32">32 steps · 2 bars</option>
            <option value="64">64 steps · 4 bars</option>
          </select>
        </label>
      </div>
      <div className="master">
        <strong>Master filter</strong>
        <input id="cut" type="range" min="0" max="100" value={S.cut} aria-label="Master filter"
          onChange={(e) => mutate((d) => { d.cut = +e.target.value; })} />
        <span className="num">{S.cut >= 100 ? 'open' : `${Math.round(cutHz(S.cut))} Hz`}</span>
        <button onClick={() => mutate((d) => { d.cut = 100; })}>Open</button>
      </div>

      <div className="bar">
        <button onClick={onRandomTrack}>Surprise me (track)</button>
        <button id="randAll" onClick={onAskRandomAll}>Surprise me (all)</button>
        <button onClick={onRandomSounds} title="Changes kit and sounds without touching the notes">Surprise me (sounds)</button>
        <button onClick={onClearTrack}>Clear track</button>
      </div>
      {children}
    </section>
    </>
  );
}

export function ConfirmRandomAll({ isRemix, onYes, onNo }) {
  return (
    <div className="warn" role="alertdialog" aria-labelledby="warnText">
      <p id="warnText">
        This replaces all 4 tracks with a new beat and erases what you have now.
        {isRemix && ' Since this is a remix, almost nothing of the original will remain: you can register it as a new work, with no remix license.'}
        {' '}Continue?
      </p>
      <div className="bar">
        <button className="danger" onClick={onYes}>Yes, change everything</button>
        <button autoFocus onClick={onNo}>Cancel</button>
      </div>
    </div>
  );
}
