import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel } from './Panel';
import { Cover } from './Gallery';
import { useNear } from '../near/NearProvider';
import { yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerAccountUrl, explorerTxUrl, shortAccount } from '../near/config';
import { nearToYocto, payContract } from '../near/register';
import { fetchIpfs, ipfsUrl } from '../near/ipfs';
import {
  Bubble, MONK_LINES, Monk, canSpeak, fallbackMantra, pickLine, setVoiceEnabled, speak, stopSpeaking, useTypewriter,
  verdictCard, voiceEnabled,
} from './Monk';

const APP_URL = 'https://musecure-beats.vercel.app';

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
function useReport(cid) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!cid) return;
    fetchIpfs(cid).then(async (b) => JSON.parse(await b.text())).then(setReport).catch((e) => setError(e.message));
  }, [cid]);
  return { report, error };
}

const LISTEN_SECONDS = 9;

/**
 * La escena del veredicto: The Monk escucha cada remix (del último al primero), mueve la cabeza al
 * tempo del beat, y dice su nota, su reseña y su mantra. Al final, el ganador: el fader sube y se ilumina.
 */
function Verdict({ battle, beats, report, onClose }) {
  const order = [...battle.results].reverse();
  const [i, setI] = useState(0);
  const [stage, setStage] = useState('listen'); // listen | speak | final
  const [left, setLeft] = useState(LISTEN_SECONDS);
  const audioRef = useRef(null);
  const r = order[i];
  const beat = r && beats[r.token_id];
  const rev = r && report?.reviews?.find((x) => x.token_id === r.token_id);
  const winner = r && r.rank === 1;
  const text = stage === 'speak' || stage === 'final' ? (rev?.review || 'No words. Only the score.') : '';
  const { shown, done } = useTypewriter(text);
  const mantra = rev?.mantra || (r ? fallbackMantra(r.score) : '');
  const monkRef = useRef(null);
  const [voice, setVoice] = useState(voiceEnabled);

  // The Monk dice su reseña y su mantra en voz alta.
  useEffect(() => {
    if ((stage !== 'speak' && stage !== 'final') || !voice) return undefined;
    const intro = stage === 'final' ? 'And the winner is.' : '';
    speak([intro, text, mantra]);
    return () => stopSpeaking();
  }, [stage, i, voice]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), []);

  // Reproduce el remix mientras The Monk escucha.
  useEffect(() => {
    if (stage !== 'listen' || !beat) return undefined;
    window.dispatchEvent(new Event('msb:stop-sequencer'));
    window.dispatchEvent(new Event('msb:stop-gallery'));
    const a = new Audio(ipfsUrl(beat.audio_cid));
    a.loop = true;
    a.volume = 0.8;
    a.play().catch(() => {});
    audioRef.current = a;
    setLeft(LISTEN_SECONDS);
    const t = setInterval(() => setLeft((v) => {
      if (v <= 1) { clearInterval(t); setStage(winner ? 'final' : 'speak'); return 0; }
      return v - 1;
    }), 1000);
    return () => { clearInterval(t); a.pause(); };
  }, [stage, beat, winner]);

  // Al hablar, la música baja; en el ganador, vuelve a sonar.
  useEffect(() => {
    if (stage === 'speak') audioRef.current?.pause();
    if (stage === 'final' && beat) {
      const a = new Audio(ipfsUrl(beat.audio_cid));
      a.loop = true;
      a.volume = 0.6;
      a.play().catch(() => {});
      audioRef.current = a;
      return () => a.pause();
    }
    return undefined;
  }, [stage, beat]);

  if (!r) return null;
  const mood = stage === 'listen' ? 'listening'
    : winner ? (done ? 'pleased' : 'surprised')
      : r.score >= 70 ? 'pleased' : r.score >= 45 ? 'calm' : 'bored';
  const fader = stage === 'listen' ? 0.15 : winner ? 1 : Math.max(0.05, r.score / 110);
  const bpm = rev?.features?.bpm || 90;

  function next() {
    stopSpeaking();
    audioRef.current?.pause();
    if (i + 1 < order.length) { setI(i + 1); setStage('listen'); } else onClose();
  }

  return (
    <div className="verdict" role="dialog" aria-label={`Verdict of ${battle.title}`}>
      <div className="verdict-progress" aria-hidden="true">
        {order.map((x, k) => <span key={x.token_id} className={k <= i ? 'on' : ''} />)}
      </div>
      <div className="verdict-stage">
        <div ref={monkRef}><Monk mood={mood} bpm={bpm} fader={fader} size={150} /></div>
        <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 220 }}>
          <span className="label">{winner ? 'And the winner is' : `Place #${r.rank}`}</span>
          <span className="verdict-title">“{beat?.title || `Beat #${r.token_id}`}” · {shortAccount(beat?.creator || '')}</span>
          {stage === 'listen' ? (
            <Bubble small>Listening… {left}s</Bubble>
          ) : (
            <>
              <span className="verdict-score">{r.score}<span className="hint">/100</span>
                {r.prize !== '0' && <span className="ok-text" style={{ fontSize: 14, marginLeft: 10 }}>+{near(r.prize)}</span>}
              </span>
              <Bubble>
                {shown}
                {done && <span className="mantra">“{mantra}”</span>}
              </Bubble>
            </>
          )}
        </div>
      </div>
      {stage === 'final' && done && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, k) => (
            <i key={k} style={{ left: `${(k * 37) % 100}%`, background: ['#ffcf4a', '#ff6e57', '#7ef0c1', '#6f8cff', '#c27bf0'][k % 5], animationDelay: `${(k % 8) * 0.08}s` }} />
          ))}
        </div>
      )}
      {stage === 'final' && done && (
        <ShareVerdict monkRef={monkRef} battle={battle} beat={beat} result={r} mantra={mantra} />
      )}
      <div className="bar">
        {canSpeak() && (
          <button className="mini" aria-pressed={voice} onClick={() => { setVoiceEnabled(!voice); setVoice(!voice); }}>
            {voice ? '🔊 Voice on' : '🔇 Voice off'}
          </button>
        )}
        {stage === 'listen'
          ? <button onClick={() => setStage(winner ? 'final' : 'speak')}>Skip listening</button>
          : <button className="primary" onClick={next} disabled={!done}>{i + 1 < order.length ? 'Next' : 'Close'}</button>}
        <button className="mini" onClick={() => { stopSpeaking(); audioRef.current?.pause(); onClose(); }}>Exit</button>
      </div>
    </div>
  );
}

/** Imagen del veredicto para publicar (X, Instagram…): descargar, compartir o abrir el post en X. */
function ShareVerdict({ monkRef, battle, beat, result, mantra }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const title = beat?.title || `Beat #${result.token_id}`;
  const prize = result.prize !== '0' ? near(result.prize) : '';
  const postText = `The Monk has spoken: "${title}" wins ${battle.title} on MuSecure Beats with ${result.score}/100${prize ? ` and ${prize}` : ''}.\n\n"${mantra}"\n\nJudged by an AI on @NEARProtocol AI Cloud, paid on chain.`;

  async function makeCard() {
    return verdictCard({
      svgEl: monkRef.current?.querySelector('svg'),
      battleTitle: battle.title,
      beatTitle: title,
      creator: shortAccount(beat?.creator || ''),
      score: result.score,
      mantra,
      prize,
      url: APP_URL,
    });
  }

  async function download() {
    setBusy(true);
    try {
      const blob = await makeCard();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `monk-verdict-${battle.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setMsg('Image saved. Attach it to your post.');
    } catch (e) {
      setMsg(`Could not create the image: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await makeCard();
      const file = new File([blob], `monk-verdict-${battle.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: postText, url: APP_URL });
      } else {
        await download();
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(postText)}&url=${encodeURIComponent(APP_URL)}`;
  return (
    <div className="bar">
      <button className="primary" onClick={share} disabled={busy}>{busy ? 'Creating…' : 'Share the verdict'}</button>
      <button className="mini" onClick={download} disabled={busy}>Download image</button>
      <a className="mini" href={xUrl} target="_blank" rel="noreferrer">Post on X</a>
      {msg && <span className="hint">{msg}</span>}
    </div>
  );
}

function Reviews({ battle, beats, report, error }) {
  const reviewOf = (id) => report?.reviews?.find((r) => r.token_id === id);
  const att = report?.attestation;
  return (
    <div className="battle-results">
      <ol className="credit-list">
        {battle.results.map((r) => (
          <li key={r.token_id}>
            <strong>#{r.rank} · {beats[r.token_id]?.title || `Beat #${r.token_id}`}</strong>
            {' '}— {r.score}/100{r.prize !== '0' && <> · <span className="ok-text">won {near(r.prize)}</span></>}
            {reviewOf(r.token_id) && <p className="hint">“{reviewOf(r.token_id).review}”{reviewOf(r.token_id).mantra && <em> — {reviewOf(r.token_id).mantra}</em>}</p>}
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
  const [watching, setWatching] = useState(false);
  const { report, error: reportError } = useReport(battle.settled ? battle.review_cid : null);
  const p = phase(battle, now);
  const line = pickLine(battle.settled && battle.results.length === 0 ? MONK_LINES.empty : MONK_LINES[p], battle.id + Math.floor(now / 60000));

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
      {!watching && (
        <div className="monk-host">
          <Monk mood={p === 'judging' ? 'listening' : 'calm'} fader={battle.settled ? 1 : 0.3} size={96} />
          <Bubble small>{line}</Bubble>
        </div>
      )}
      {battle.settled && battle.results.length > 0 && !watching && (
        <div className="bar"><button className="primary" onClick={() => setWatching(true)}>▶ Hear the verdict</button></div>
      )}
      {watching && <Verdict battle={battle} beats={beats} report={report} onClose={() => setWatching(false)} />}
      {battle.settled && <Reviews battle={battle} beats={beats} report={report} error={reportError} />}
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
      try { sessionStorage.setItem('msb-battle-seed', String(seed.token_id)); } catch { /* sin almacenamiento */ }
      onOpenProject(text, seed);
    } catch (e) {
      setError(`Could not open the seed: ${e.message}`);
    }
  }

  return (
    <Panel plain id="battles" title="Remix Battles">
      <p className="hint">
        Every week a seed beat. Remix it, and <strong>The Monk</strong> — our critic, an AI agent running on NEAR AI Cloud —
        listens to every entry, scores it, and the contract pays the prize. The critic's key can only call <code>settle_battle</code>:
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
