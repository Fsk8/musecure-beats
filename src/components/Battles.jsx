import { useCallback, useEffect, useState } from 'react';
import { Panel } from './Panel';
import { Cover } from './Gallery';
import { useNear } from '../near/NearProvider';
import { yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerAccountUrl, explorerTxUrl, shortAccount } from '../near/config';
import { nearToYocto, payContract } from '../near/register';
import { fetchIpfs, ipfsUrl } from '../near/ipfs';

const near = (yocto) => `${yoctoToNear(yocto, 3)} Ⓝ`;
const view = (provider, method, args) => provider.callFunction(CONTRACT_ID, method, args);

/** "2d 4h" / "3h 12m" / "5m" */
function timeLeft(ms) {
  if (ms <= 0) return 'ended';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m % 60}m`;
  return `${Math.max(1, m)}m`;
}

function phase(b, now) {
  if (b.settled) return 'settled';
  if (now < Number(b.starts_ms)) return 'upcoming';
  if (now < Number(b.ends_ms)) return 'open';
  return 'judging';
}

/** Reseñas del crítico (JSON en IPFS) con la prueba de NEAR AI si la hay. */
function Reviews({ battle, beats }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!battle.review_cid) return;
    fetchIpfs(battle.review_cid).then((r) => r.json()).then(setReport).catch((e) => setError(e.message));
  }, [battle.review_cid]);

  const reviewOf = (id) => report?.reviews?.find((r) => r.token_id === id);
  const att = report?.attestation;
  return (
    <div className="battle-results">
      <ol className="credit-list">
        {battle.results.map((r) => (
          <li key={r.token_id}>
            <strong>#{r.rank} · {beats[r.token_id]?.title || `Beat #${r.token_id}`}</strong>
            {' '}— {r.score}/100{r.prize !== '0' && <> · <span className="ok-text">won {near(r.prize)}</span></>}
            {reviewOf(r.token_id) && <p className="hint">“{reviewOf(r.token_id).review}”</p>}
          </li>
        ))}
      </ol>
      {battle.results.length === 0 && <p className="hint">No entries: the prize went back to the organizer.</p>}
      {error && <p className="hint warn-text">Could not load the reviews: {error}</p>}
      {report && (
        <p className="hint">
          Critic: {report.critic?.mode === 'nearai'
            ? <>{report.critic.model} on NEAR AI Cloud (private TEE inference).{' '}
              {att ? <>Response signed by <code>{shortAccount(att.signing_address)}</code>{att.signature_valid ? ' ✓ signature valid' : ''}.</> : 'No signature attached.'}</>
            : 'test critic (no AI key configured yet).'}
          {' '}<a href={ipfsUrl(battle.review_cid)} target="_blank" rel="noreferrer">Full reviews & proof (IPFS)</a>
        </p>
      )}
    </div>
  );
}

function FundBox({ battle, onChanged }) {
  const { status, account, login } = useNear();
  const [amount, setAmount] = useState('0.5');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (status === 'signed-out') {
    return <button className="mini" onClick={login}>Sign in to fund the prize</button>;
  }
  if (status !== 'active') return <p className="hint">Activate your NEAR account to fund the prize.</p>;
  async function fund() {
    setBusy(true);
    setMsg('');
    try {
      const tx = await payContract(account, 'fund_battle', { battle_id: battle.id }, nearToYocto(amount));
      setMsg(<>Thanks! <a href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">View transaction</a></>);
      onChanged();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bar">
      <input type="number" min="0.01" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="NEAR to add" style={{ width: '6em' }} />
      <button className="mini" onClick={fund} disabled={busy}>{busy ? 'Funding…' : 'Add to prize'}</button>
      {msg && <span className="hint">{msg}</span>}
    </div>
  );
}

function BattleCard({ battle, now, onRemix, onChanged }) {
  const { provider } = useNear();
  const [seed, setSeed] = useState(null);
  const [beats, setBeats] = useState({});
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const p = phase(battle, now);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, ids] = await Promise.all([
          view(provider, 'get_beat', { token_id: battle.seed_id }),
          view(provider, 'get_battle_entries', { battle_id: battle.id }),
        ]);
        const list = await Promise.all(ids.map((id) => view(provider, 'get_beat', { token_id: id })));
        if (!alive) return;
        setSeed(s);
        setEntries(list);
        setBeats(Object.fromEntries(list.map((b) => [b.token_id, b])));
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, [provider, battle.id, battle.seed_id, battle.entry_count, battle.settled]);

  const label = {
    upcoming: `Starts in ${timeLeft(Number(battle.starts_ms) - now)}`,
    open: `Open · ${timeLeft(Number(battle.ends_ms) - now)} left`,
    judging: 'Closed · the critic is judging',
    settled: 'Settled',
  }[p];

  return (
    <article className="beat-card">
      <div className="bar spread">
        <strong>{battle.title}</strong>
        <span className={p === 'open' ? 'ok-text' : 'hint'}>{label}</span>
      </div>
      {seed && <Cover beat={seed} />}
      <p className="hint">
        Seed: #{battle.seed_id} “{seed?.title || '…'}” by {seed ? shortAccount(seed.creator) : '…'}
        {seed && seed.remix_price !== '0' && <> · remix license {near(seed.remix_price)}</>}
      </p>
      {battle.rules && <p><strong>Rules:</strong> {battle.rules}</p>}
      <div className="stats">
        <div className="stat"><span className="label">Prize pool</span><strong>{near(battle.pool)}</strong></div>
        <div className="stat"><span className="label">Entries</span><strong>{battle.entry_count}</strong></div>
        <div className="stat"><span className="label">Split</span><strong>50 · 30 · 20 %</strong></div>
      </div>

      {p === 'open' && seed && (
        <div className="bar">
          <button className="primary" onClick={() => onRemix(seed)} disabled={!seed.remix_allowed}>Remix the seed</button>
          {!seed.remix_allowed && <span className="hint warn-text">The seed owner closed remixes.</span>}
        </div>
      )}
      {p === 'open' && <p className="hint">Make your remix, keep at least 30 % of the seed, and register it as an <strong>Open</strong> beat before the deadline. It enters automatically.</p>}
      {(p === 'open' || p === 'upcoming') && <FundBox battle={battle} onChanged={onChanged} />}

      {!battle.settled && entries.length > 0 && (
        <ul className="credit-list">
          {entries.map((b) => <li key={b.token_id}>#{b.token_id} “{b.title}” by {shortAccount(b.creator)}</li>)}
        </ul>
      )}
      {battle.settled && <Reviews battle={battle} beats={beats} />}
      {error && <p className="hint warn-text">{error}</p>}
    </article>
  );
}

/**
 * Remix Battles: retos semanales sobre un beat semilla. Un crítico (agente de IA en NEAR AI Cloud)
 * califica cada remix y el contrato reparte el premio. El premio entra como ingreso del beat ganador:
 * se reparte entre dueño y autores, y una parte sube a la semilla.
 */
export function Battles({ onOpenProject }) {
  const { provider } = useNear();
  const [battles, setBattles] = useState(null);
  const [critic, setCritic] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, c] = await Promise.all([view(provider, 'get_battles', { limit: 10 }), view(provider, 'get_critic', {})]);
      setBattles(list);
      setCritic(c);
    } catch (e) {
      setError(`Could not read the battles: ${e?.message || e}`);
    }
  }, [provider]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('msb:beats-changed', load);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { window.removeEventListener('msb:beats-changed', load); clearInterval(t); };
  }, [load]);

  async function remix(seed) {
    try {
      const text = await (await fetchIpfs(seed.project_cid)).text();
      onOpenProject(text, seed);
    } catch (e) {
      setError(`Could not open the seed: ${e.message}`);
    }
  }

  return (
    <Panel plain id="battles" title="Remix Battles">
      <p className="hint">
        Every week a seed beat. Remix it, and <strong>The Critic</strong> — an AI agent running on NEAR AI Cloud —
        scores every entry and the contract pays the prize. The critic's key can only call <code>settle_battle</code>:
        it can rank, it can't take the money.
        {critic && <> Critic account: <a href={explorerAccountUrl(critic)} target="_blank" rel="noreferrer">{shortAccount(critic)}</a>.</>}
      </p>
      {battles === null && !error && <p className="hint">Loading…</p>}
      {battles && battles.length === 0 && <p className="hint">No battles yet. The first one is coming soon.</p>}
      {battles?.map((b) => <BattleCard key={b.id} battle={b} now={now} onRemix={remix} onChanged={load} />)}
      {error && <p className="hint warn-text">{error}</p>}
    </Panel>
  );
}
