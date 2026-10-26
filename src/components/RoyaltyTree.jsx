import { useEffect, useMemo, useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { getAllBeats, yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerTokenUrl, shortAccount } from '../near/config';

// Árbol de regalías en vivo: una semilla y todos sus remixes (y los remixes de los remixes), leídos
// del contrato. Las monedas suben por las ramas: 20 % de la parte de autores de cada remix va a su original.

const NODE_W = 156;
const NODE_H = 62;
const GAP_X = 18;
const GAP_Y = 64;
const big = (v) => BigInt(v || 0);
const near = (y, d = 3) => `${yoctoToNear(y, d)} Ⓝ`;
/** Lo que un beat manda a su original: 20 % de la mitad de autores de lo que ganó (estimado). */
const sentUp = (b) => (big(b.total_earned) * 50n * 20n) / 10000n;

function buildTree(rootId, byParent, byId) {
  const walk = (id, depth) => {
    const kids = (byParent.get(id) || []).map((k) => walk(k.token_id, depth + 1));
    const beat = byId.get(id);
    const subtreeEarned = kids.reduce((s, k) => s + k.subtreeEarned, big(beat.total_earned));
    return { beat, depth, kids, subtreeEarned, size: kids.reduce((s, k) => s + k.size, 1) };
  };
  return walk(rootId, 0);
}

/** Posiciones: las hojas en fila, cada padre centrado sobre sus hijos. */
function layout(root) {
  const nodes = [];
  let leaf = 0;
  let maxDepth = 0;
  const place = (n) => {
    maxDepth = Math.max(maxDepth, n.depth);
    if (!n.kids.length) {
      n.x = leaf * (NODE_W + GAP_X);
      leaf++;
    } else {
      n.kids.forEach(place);
      n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
    }
    n.y = n.depth * (NODE_H + GAP_Y);
    nodes.push(n);
  };
  place(root);
  return { nodes, width: Math.max(1, leaf) * (NODE_W + GAP_X), height: (maxDepth + 1) * (NODE_H + GAP_Y) };
}

function Edge({ child, parent, id }) {
  const x1 = child.x + NODE_W / 2; const y1 = child.y;
  const x2 = parent.x + NODE_W / 2; const y2 = parent.y + NODE_H;
  const my = (y1 + y2) / 2;
  const d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
  const flow = sentUp(child.beat);
  const earned = big(child.beat.total_earned);
  // Más dinero → más monedas y más rápido.
  const coins = earned === 0n ? 0 : Math.min(5, 1 + Math.floor(Math.log10(Number(earned / 10n ** 20n) + 1) * 2));
  const width = earned === 0n ? 1.5 : Math.min(6, 2 + coins);
  return (
    <g>
      <path id={id} d={d} fill="none" className={`tree-edge${earned > 0n ? ' live' : ''}`} strokeWidth={width} />
      {Array.from({ length: coins }, (_, k) => (
        <circle key={k} r="4.5" className="tree-coin">
          <animateMotion dur={`${2.6 - coins * 0.2}s`} repeatCount="indefinite" begin={`${(k * 2.6) / Math.max(coins, 1)}s`}>
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}
      {flow > 0n && (
        <text x={(x1 + x2) / 2 + 6} y={my} className="tree-flow">≈ {near(flow.toString(), 4)} ↑</text>
      )}
    </g>
  );
}

function Node({ n, selected, onSelect }) {
  const b = n.beat;
  const winner = b.badges?.includes('Battle winner');
  return (
    <g transform={`translate(${n.x},${n.y})`} className={`tree-node${selected ? ' selected' : ''}`} onClick={() => onSelect(b)}
      role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect(b)} aria-label={`${b.title}, earned ${near(b.total_earned)}`}>
      <rect width={NODE_W} height={NODE_H} rx="12" className={n.depth === 0 ? 'seed' : ''} />
      <text x="10" y="20" className="tree-title">{(winner ? '🏆 ' : '') + (b.title.length > 18 ? `${b.title.slice(0, 17)}…` : b.title)}</text>
      <text x="10" y="37" className="tree-sub">#{b.token_id} · Lv {b.level} · {shortAccount(b.owner_id)}</text>
      <text x="10" y="53" className="tree-money">{near(b.total_earned)} earned</text>
    </g>
  );
}

export function RoyaltyTree({ initialRoot = null }) {
  const { provider } = useNear();
  const [beats, setBeats] = useState(null);
  const [error, setError] = useState('');
  const [rootId, setRootId] = useState(initialRoot);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = () => getAllBeats(provider).then(setBeats).catch((e) => setError(e.message));
    load();
    window.addEventListener('msb:beats-changed', load);
    return () => window.removeEventListener('msb:beats-changed', load);
  }, [provider]);
  useEffect(() => { if (initialRoot) setRootId(initialRoot); }, [initialRoot]);

  const { byId, byParent, roots } = useMemo(() => {
    const byId = new Map((beats || []).map((b) => [b.token_id, b]));
    const byParent = new Map();
    for (const b of beats || []) {
      if (!b.parent_id || !byId.has(b.parent_id)) continue;
      if (!byParent.has(b.parent_id)) byParent.set(b.parent_id, []);
      byParent.get(b.parent_id).push(b);
    }
    for (const list of byParent.values()) list.sort((a, b) => Number(a.token_id) - Number(b.token_id));
    // Semillas: originales con al menos un remix, las más grandes primero.
    const roots = (beats || [])
      .filter((b) => (!b.parent_id || !byId.has(b.parent_id)) && byParent.has(b.token_id))
      .map((b) => buildTree(b.token_id, byParent, byId))
      .sort((a, b) => b.size - a.size || (b.subtreeEarned > a.subtreeEarned ? 1 : -1));
    return { byId, byParent, roots };
  }, [beats]);

  // Si piden el árbol de un remix, se muestra desde su semilla.
  const effectiveRoot = useMemo(() => {
    let id = rootId || roots[0]?.beat.token_id;
    let guard = 0;
    while (id && byId.get(id)?.parent_id && byId.has(byId.get(id).parent_id) && guard++ < 30) id = byId.get(id).parent_id;
    return id;
  }, [rootId, roots, byId]);

  const tree = useMemo(() => (effectiveRoot && byId.has(effectiveRoot) ? buildTree(effectiveRoot, byParent, byId) : null), [effectiveRoot, byParent, byId]);
  const view = useMemo(() => (tree ? layout(tree) : null), [tree]);
  const byNode = useMemo(() => new Map((view?.nodes || []).map((n) => [n.beat.token_id, n])), [view]);
  const sel = selected && byId.get(selected.token_id);

  return (
    <Panel plain id="tree" title="Royalty tree">
      <p className="hint">
        Every remix pays its original: <strong>20 %</strong> of its authors' share flows up the tree, forever. Coins move
        faster and thicker where more money flows. Live from <code>{CONTRACT_ID}</code>.
      </p>
      {beats === null && !error && <p className="hint">Reading the contract…</p>}
      {error && <p className="hint warn-text">Could not read the beats: {error}</p>}
      {beats && roots.length === 0 && <p className="hint">No remixes yet. Remix a beat from the Gallery and its tree appears here.</p>}

      {roots.length > 0 && (
        <label htmlFor="tree-root">Seed
          <select id="tree-root" value={effectiveRoot || ''} onChange={(e) => { setRootId(e.target.value); setSelected(null); }}>
            {roots.map((r) => (
              <option key={r.beat.token_id} value={r.beat.token_id}>
                #{r.beat.token_id} {r.beat.title} · {r.size - 1} remixes · {near(r.subtreeEarned.toString())}
              </option>
            ))}
          </select>
        </label>
      )}

      {tree && view && (
        <>
          <div className="stats">
            <div className="stat"><span className="label">Beats in the tree</span><strong>{tree.size}</strong></div>
            <div className="stat"><span className="label">Generations</span><strong>{Math.max(...view.nodes.map((n) => n.depth)) + 1}</strong></div>
            <div className="stat"><span className="label">Earned by the tree</span><strong>{near(tree.subtreeEarned.toString())}</strong></div>
            <div className="stat"><span className="label">Seed earned</span><strong>{near(tree.beat.total_earned)}</strong></div>
          </div>
          <div className="tree-scroll">
            <svg width={view.width + 8} height={view.height} viewBox={`-4 -4 ${view.width + 8} ${view.height}`} className="tree-svg">
              {view.nodes.filter((n) => n.depth > 0).map((n) => (
                <Edge key={`e${n.beat.token_id}`} id={`edge-${n.beat.token_id}`} child={n} parent={byNode.get(n.beat.parent_id)} />
              ))}
              {view.nodes.map((n) => (
                <Node key={n.beat.token_id} n={n} selected={sel?.token_id === n.beat.token_id} onSelect={setSelected} />
              ))}
            </svg>
          </div>
        </>
      )}

      {sel && (
        <div className="beat-card">
          <strong>#{sel.token_id} “{sel.title}”</strong>
          <span className="hint">
            Creator {shortAccount(sel.creator)} · owner {shortAccount(sel.owner_id)}
            {sel.parent_id && <> · remix of #{sel.parent_id}</>}
          </span>
          <div className="stats">
            <div className="stat"><span className="label">Earned</span><strong>{near(sel.total_earned)}</strong></div>
            <div className="stat"><span className="label">Inside the NFT</span><strong>{near(sel.authors_balance)}</strong></div>
            <div className="stat"><span className="label">Remixes · licenses</span><strong>{sel.remix_count} · {sel.lease_count}</strong></div>
            {sel.parent_id && <div className="stat"><span className="label">≈ Sent to its original</span><strong>{near(sentUp(sel).toString(), 4)}</strong></div>}
          </div>
          {sel.badges?.length > 0 && <span className="hint">{sel.badges.join(' · ')}</span>}
          <a className="hint" href={explorerTokenUrl(CONTRACT_ID, sel.token_id)} target="_blank" rel="noreferrer">View NFT on NearBlocks</a>
        </div>
      )}
      <p className="hint">“Sent to its original” is an estimate (20 % of half of what the remix earned); the exact amount moves when its authors' balance is distributed.</p>
    </Panel>
  );
}
