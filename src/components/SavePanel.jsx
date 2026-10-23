import { useRef } from 'react';
import { TAIL_SECONDS } from '../audio/engine';
import { Panel } from './Panel';

const LOOP_OPTIONS = [1, 4, 8, 12, 16];

const fmtTime = (sec) => {
  const s = Math.round(sec);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`;
};

export function SavePanel({
  title, onTitle, onSaveProject, onOpenProject, loops, onLoops, loopSec, onExportWav, onCancel,
  recording, progress, message,
}) {
  const fileInput = useRef(null);
  const totalSec = loopSec * loops + TAIL_SECONDS;

  return (
    <Panel plain id="save" title="Guardar y exportar" defaultOpen={false}
      summary={recording ? `Grabando… quedan ${fmtTime(totalSec * (1 - progress))}` : title || 'Sin nombre'}>
      <div className="bar">
        <label htmlFor="title">
          Nombre
          <input id="title" type="text" className="text" maxLength={60} value={title}
            onChange={(e) => onTitle(e.target.value)} />
        </label>
        <button onClick={onSaveProject} disabled={recording}>Guardar proyecto (.json)</button>
        <button onClick={() => fileInput.current?.click()} disabled={recording}>Abrir proyecto</button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onOpenProject(file);
            e.target.value = '';
          }} />
      </div>
      <div className="bar">
        <label htmlFor="loops">
          Vueltas
          <select id="loops" value={loops} disabled={recording} onChange={(e) => onLoops(+e.target.value)}>
            {LOOP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'vuelta' : 'vueltas'} · {fmtTime(loopSec * n + TAIL_SECONDS)}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-soft" onClick={onExportWav} disabled={recording}>
          {recording ? `Grabando… quedan ${fmtTime(totalSec * (1 - progress))}` : 'Exportar WAV'}
        </button>
        {recording && <button onClick={onCancel}>Cancelar</button>}
      </div>
      {recording && (
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <p className="hint" aria-live="polite">
        {message || `El proyecto guarda notas, escala, kit y mezcla para volver a abrirlo. El WAV se renderiza aparte (sin cortes, aunque el equipo esté ocupado), con ${TAIL_SECONDS} s de cola para el reverb y el delay.`}
      </p>
    </Panel>
  );
}
