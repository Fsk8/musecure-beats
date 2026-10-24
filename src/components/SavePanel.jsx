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
    <Panel plain id="save" title="Save & export" defaultOpen={false}
      summary={recording ? `Rendering… ${fmtTime(totalSec * (1 - progress))} left` : title || 'Untitled'}>
      <div className="bar">
        <label htmlFor="title">
          Name
          <input id="title" type="text" className="text" maxLength={60} value={title}
            onChange={(e) => onTitle(e.target.value)} />
        </label>
        <button onClick={onSaveProject} disabled={recording}>Save project (.json)</button>
        <button onClick={() => fileInput.current?.click()} disabled={recording}>Open project</button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onOpenProject(file);
            e.target.value = '';
          }} />
      </div>
      <div className="bar">
        <label htmlFor="loops">
          Loops
          <select id="loops" value={loops} disabled={recording} onChange={(e) => onLoops(+e.target.value)}>
            {LOOP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'loop' : 'loops'} · {fmtTime(loopSec * n + TAIL_SECONDS)}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-soft" onClick={onExportWav} disabled={recording}>
          {recording ? `Rendering… ${fmtTime(totalSec * (1 - progress))} left` : 'Export WAV'}
        </button>
        {recording && <button onClick={onCancel}>Cancel</button>}
      </div>
      {recording && (
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <p className="hint" aria-live="polite">
        {message || `The project file keeps notes, scale, kit and mix so you can reopen it. The WAV is rendered offline (no glitches, even on a busy computer), with a ${TAIL_SECONDS} s tail for reverb and delay.`}
      </p>
    </Panel>
  );
}
