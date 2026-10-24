import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { getAllBeats, getOwnerEarnings, yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerAccountUrl, explorerTxUrl } from '../near/config';
import { payContract } from '../near/register';

const BPS = 10000n;
const big = (v) => BigInt(v || 0);
const near = (yocto) => `${yoctoToNear(yocto, 4)} Ⓝ`;

/** Acreditados de un beat (por conjunto o por pista). */
function creditedAccounts(credits) {
  if (credits?.Whole) return credits.Whole.credits.map((c) => c.account_id);
  if (credits?.PerTrack) return credits.PerTrack.tracks.flatMap((t) => t.credits.map((c) => c.account_id));
  return [];
}

/** Mi parte (en bps) del saldo de autores de un beat, según su reparto (payout). */
function myAuthorBps(beat, accountId) {
  return (beat.payout || [])
    .filter((s) => s.recipient?.Account === accountId)
    .reduce((sum, s) => sum + BigInt(s.bps), 0n);
}

/**
 * Panel "Mis ganancias": qué ganó cada beat, qué te toca y qué falta cobrar.
 * Cada NFT guarda su propio dinero (saldo de autores) hasta que se reparte.
 */
export function Earnings() {
  const { provider, status, account, accountId, refresh } = useNear();
  const [beats, setBeats] = useState(null);
  const [ownerEarned, setOwnerEarned] = useState('0');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [txs, setTxs] = useState([]);

  const load = useCallback(async () => {
    if (!accountId) return;
    setError('');
    try {
      const [all, owned] = await Promise.all([getAllBeats(provider), getOwnerEarnings(provider, accountId)]);
      setBeats(all);
      setOwnerEarned(owned);
    } catch (e) {
      setError(`Could not read the contract: ${e?.message || e}`);
    }
  }, [provider, accountId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('msb:beats-changed', load);
    return () => window.removeEventListener('msb:beats-changed', load);
  }, [load]);

  const mine = useMemo(() => {
    if (!beats || !accountId) return [];
    return beats
      .map((b) => {
        const roles = [];
        if (b.creator === accountId) roles.push('Creator');
        if (b.owner_id === accountId) roles.push('Owner');
        if (creditedAccounts(b.credits).includes(accountId)) roles.push('Credited');
        const bps = myAuthorBps(b, accountId);
        return { b, roles, bps, pendingMine: (big(b.authors_balance) * bps) / BPS };
      })
      .filter((x) => x.roles.length);
  }, [beats, accountId]);

  const totals = useMemo(() => mine.reduce((t, x) => ({
    earned: t.earned + big(x.b.total_earned),
    pending: t.pending + big(x.b.authors_balance),
    pendingMine: t.pendingMine + x.pendingMine,
    remixes: t.remixes + x.b.remix_count,
    leases: t.leases + x.b.lease_count,
  }), { earned: 0n, pending: 0n, pendingMine: 0n, remixes: 0, leases: 0 }), [mine]);

  async function run(label, fn) {
    setBusy(label);
    setError('');
    try {
      const hash = await fn();
      if (hash) setTxs((list) => [{ label, hash }, ...list]);
      refresh();
      window.dispatchEvent(new Event('msb:beats-changed'));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy('');
    }
  }

  const withdraw = () => run('Owner earnings withdrawal', () => payContract(account, 'withdraw', {}));
  const claim = (b) => run(`Distribution of #${b.token_id}`, () => payContract(account, 'claim', { token_id: b.token_id }));
  async function claimAll() {
    for (const { b } of mine.filter((x) => big(x.b.authors_balance) > 0n)) {
      // Una transacción por beat: si una falla, se detiene y muestra el error.
      // eslint-disable-next-line no-await-in-loop
      await run(`Distribution of #${b.token_id}`, () => payContract(account, 'claim', { token_id: b.token_id }));
    }
  }

  if (status !== 'active') {
    return <Panel plain id="earnings" title="My earnings"><p className="hint">Sign in to see your earnings.</p></Panel>;
  }

  return (
    <Panel plain id="earnings" title="My earnings">
      <div className="stats">
        <div className="stat"><span className="label">To withdraw (owner)</span><strong>{near(ownerEarned)}</strong></div>
        <div className="stat"><span className="label">Your share to distribute</span><strong>{near(totals.pendingMine)}</strong></div>
        <div className="stat"><span className="label">Earned by your beats</span><strong>{near(totals.earned)}</strong></div>
        <div className="stat"><span className="label">Remixes · licenses</span><strong>{totals.remixes} · {totals.leases}</strong></div>
      </div>

      <div className="bar">
        <button className="primary" onClick={withdraw} disabled={Boolean(busy) || big(ownerEarned) === 0n}>
          {busy.startsWith('Owner') ? 'Withdrawing…' : `Withdraw ${near(ownerEarned)}`}
        </button>
        <button onClick={claimAll} disabled={Boolean(busy) || totals.pending === 0n}
          title="Distributes each beat's authors' balance among its credited accounts">
          {busy.startsWith('Distribution') ? `${busy}…` : `Distribute all (${near(totals.pending)})`}
        </button>
        <button onClick={load} disabled={Boolean(busy)}>Refresh</button>
      </div>
      <p className="hint">
        Every payment is split: half goes to the NFT <strong>owner</strong> (withdraw it here) and the other half is kept
        <strong> inside the NFT</strong> as the authors' balance, until someone distributes it among the credited accounts. If the
        beat is a remix, a share flows up to the original.
      </p>

      {error && <p className="hint warn-text">{error}</p>}
      {txs.length > 0 && (
        <ul className="credit-list">
          {txs.map((t) => <li key={t.hash}>✓ {t.label}: <a href={explorerTxUrl(t.hash)} target="_blank" rel="noreferrer">view transaction</a></li>)}
        </ul>
      )}

      {beats === null && !error && <p className="hint">Loading…</p>}
      {beats && mine.length === 0 && <p className="hint">You have no beats yet as creator, owner or credited author.</p>}
      {mine.length > 0 && (
        <ul className="beat-list">
          {mine.map(({ b, roles, bps, pendingMine }) => (
            <li key={b.token_id} className="beat-card">
              <div className="beat-top"><strong>{b.title}</strong><span className="num">#{b.token_id}</span></div>
              <div className="beat-meta">
                <span>{roles.join(' · ')}</span>
                {bps > 0n && <span>Your authors' share: {(Number(bps) / 100).toLocaleString()} %</span>}
                {b.parent_id && <span>Remix of #{b.parent_id}</span>}
              </div>
              <div className="beat-meta">
                <span>Earned: {near(b.total_earned)}</span>
                <span>In the NFT to distribute: {near(b.authors_balance)}</span>
                {pendingMine > 0n && <span>Yours: {near(pendingMine)}</span>}
                <span>{b.remix_count} remixes · {b.lease_count} licenses</span>
              </div>
              {big(b.authors_balance) > 0n && (
                <div className="bar">
                  <button onClick={() => claim(b)} disabled={Boolean(busy)}>Distribute {near(b.authors_balance)}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="hint">
        Full payment history: <a href={explorerAccountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">contract transactions</a>
        {' · '}<a href={explorerAccountUrl(accountId)} target="_blank" rel="noreferrer">your account's</a>.
      </p>
    </Panel>
  );
}
