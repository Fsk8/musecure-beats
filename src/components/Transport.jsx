import { cutHz } from '../audio/engine';

export function Transport({
  S, mutate, playing, onTogglePlay, onLenChange, onRandomTrack, onAskRandomAll, onClearTrack, children,
}) {
  return (
    <section className="panel">
      <div className="bar">
        <button id="play" className="primary" onClick={onTogglePlay}>
          {playing ? '■ Parar' : '▶ Tocar'}
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
          Metrónomo
        </label>
        <label htmlFor="swing">
          Swing
          <input id="swing" type="range" min="0" max="70" value={S.swing}
            onChange={(e) => mutate((d) => { d.swing = +e.target.value; })} />
          <span className="num">{S.swing}%</span>
        </label>
        <label htmlFor="len">
          Largo
          <select id="len" value={S.len} onChange={(e) => onLenChange(+e.target.value)}>
            <option value="16">16 pasos · 1 compás</option>
            <option value="32">32 pasos · 2 compases</option>
            <option value="64">64 pasos · 4 compases</option>
          </select>
        </label>
      </div>

      <div className="master">
        <strong>Filtro maestro</strong>
        <input id="cut" type="range" min="0" max="100" value={S.cut} aria-label="Filtro maestro"
          onChange={(e) => mutate((d) => { d.cut = +e.target.value; })} />
        <span className="num">{S.cut >= 100 ? 'abierto' : `${Math.round(cutHz(S.cut))} Hz`}</span>
        <button onClick={() => mutate((d) => { d.cut = 100; })}>Abrir</button>
      </div>

      <div className="bar">
        <button onClick={onRandomTrack}>Sorpréndeme (pista)</button>
        <button id="randAll" onClick={onAskRandomAll}>Sorpréndeme (todo)</button>
        <button onClick={onClearTrack}>Borrar pista</button>
        <button disabled title="Llega con el contrato en NEAR">Registrar beat</button>
      </div>
      {children}
    </section>
  );
}

export function ConfirmRandomAll({ onYes, onNo }) {
  return (
    <div className="warn" role="alertdialog" aria-labelledby="warnText">
      <p id="warnText">
        Esto reemplaza las 4 pistas con un beat nuevo y borra lo que tienes ahora. ¿Seguimos?
      </p>
      <div className="bar">
        <button className="danger" onClick={onYes}>Sí, cambiar todo</button>
        <button autoFocus onClick={onNo}>Cancelar</button>
      </div>
    </div>
  );
}
