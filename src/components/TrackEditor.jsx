import { memo, useEffect, useState } from 'react';
import { TRACKS, rowNames } from '../music/theory';
import { usePlayhead } from '../audio/playhead';
import { Panel } from './Panel';

const HINTS = {
  vel: 'Click: strong note · second click: soft · third click: off',
  prob: 'Click a note to change its probability 100 → 75 → 50 → 25 %. The number shows how many times out of 100 it plays.',
};

export function TrackEditor({
  S, mutate, theory, follow, setFollow, onCell,
  qGrid, setQGrid, onQuantize, canUndo, onUndo, qMessage, onShift, onMoveBar,
}) {
  const t = S.tab;

  return (
    <Panel id="tracks" title="Tracks" summary={`Editing ${TRACKS[t].name} · ${S.len} steps`}>
      <div className="bar spread">
        <div className="tabs" role="tablist">
          {TRACKS.map((tr, i) => (
            <button key={tr.id} role="tab" className="tab" aria-selected={S.tab === i}
              style={{ '--c': `var(--t${i})` }}
              onClick={() => mutate((d) => { d.tab = i; })}>
              {tr.name}
            </button>
          ))}
        </div>
        <div className="bar">
          <label htmlFor="emode">
            Click edits
            <select id="emode" value={S.emode} onChange={(e) => mutate((d) => { d.emode = e.target.value; })}>
              <option value="vel">Velocity</option>
              <option value="prob">Probability</option>
            </select>
          </label>
          <label htmlFor="follow">
            <input type="checkbox" id="follow" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            Follow
          </label>
        </div>
      </div>

      <div className="bar">
        <label htmlFor="qgrid">
          Quantize to
          <select id="qgrid" value={qGrid} onChange={(e) => setQGrid(+e.target.value)}>
            <option value="2">Eighths (every 2 steps)</option>
            <option value="4">Quarters (every 4 steps)</option>
          </select>
        </label>
        <button onClick={onQuantize}>Quantize track</button>
        <button onClick={onUndo} disabled={!canUndo}>Undo</button>
        <span className="shift-group" role="group" aria-label="Shift track">
          <span className="label">Shift</span>
          <button onClick={() => onShift(-1)} aria-label="Shift track one step left" title="One step earlier">◀</button>
          <button onClick={() => onShift(1)} aria-label="Shift track one step right" title="One step later">▶</button>
        </span>
        <span className="hint" aria-live="polite">{qMessage}</span>
      </div>

      <PlayGrid
        track={t}
        names={rowNames(t, theory, S.kit)}
        G={S.g[t]}
        P={S.p[t]}
        page={S.page}
        len={S.len}
        follow={follow}
        setFollow={setFollow}
        mutate={mutate}
        onCell={onCell}
        onMoveBar={onMoveBar}
      />
      <p className="hint">{HINTS[S.emode]}</p>
    </Panel>
  );
}

/** Páginas + cuadrícula. Es lo único que se redibuja con el cursor de reproducción. */
const PlayGrid = memo(function PlayGrid({ track, names, G, P, page, len, follow, setFollow, mutate, onCell, onMoveBar }) {
  const [dragFrom, setDragFrom] = useState(null);
  const [allTracks, setAllTracks] = useState(true);
  const step = usePlayhead();
  const pageCount = len / 16;
  const livePage = step >= 0 ? Math.floor(step / 16) : -1;

  // "Seguir": cambia de página sola mientras suena.
  useEffect(() => {
    if (follow && livePage >= 0 && livePage !== page) mutate((d) => { d.page = livePage; });
  }, [follow, livePage, page, mutate]);

  return (
    <>
      {pageCount > 1 && (
        <div className="pages">
          {[...Array(pageCount).keys()].map((p) => (
            <button key={p} className={`page${livePage === p ? ' live' : ''}${dragFrom === p ? ' dragging' : ''}`} aria-current={page === p}
              draggable title="Drag to reorder bars"
              onDragStart={(e) => { setDragFrom(p); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { if (dragFrom !== null) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) onMoveBar(dragFrom, p, allTracks); setDragFrom(null); }}
              onDragEnd={() => setDragFrom(null)}
              onClick={() => { setFollow(false); mutate((d) => { d.page = p; }); }}>
              ⠿ {p * 16 + 1}–{p * 16 + 16}
            </button>
          ))}
          <label htmlFor="moveAll" className="hint">
            <input type="checkbox" id="moveAll" checked={allTracks} onChange={(e) => setAllTracks(e.target.checked)} />
            Move bars on all tracks
          </label>
        </div>
      )}
      <div className="scroll">
        <div className="grid" style={{ '--c': `var(--t${track})` }}>
          {names.map((name, r) => {
            const dead = track === 3 && name === '—';
            return (
              <Row key={`${track}-${r}`} name={name} r={r} dead={dead} G={G} P={P} page={page} step={step} onCell={onCell} />
            );
          })}
        </div>
      </div>
    </>
  );
});

function Row({ name, r, dead, G, P, page, step, onCell }) {
  return (
    <>
      <div className="name">{name}</div>
      {[...Array(16).keys()].map((k) => {
        const c = page * 16 + k;
        const g = G[r][c];
        const p = P[r][c];
        const showProb = g && p < 100;
        const cls = ['cell', k % 4 === 0 && 'q', g === 1 && 'on', g === 2 && 'soft', step === c && 'now']
          .filter(Boolean).join(' ');
        return (
          <button key={c} className={cls} disabled={dead} aria-pressed={g > 0}
            aria-label={`${name} step ${c + 1}${g === 2 ? ' soft' : ''}${showProb ? `, ${p}%` : ''}`}
            onClick={() => onCell(r, c)}>
            {showProb ? p : ''}
          </button>
        );
      })}
    </>
  );
}
