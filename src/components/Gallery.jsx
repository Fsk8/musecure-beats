import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { getBeatMedia, getBeats, hasLease, yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerAccountUrl, explorerNftUrl, explorerTokenUrl, explorerTxUrl, shortAccount } from '../near/config';
import { fetchIpfs, ipfsUrl } from '../near/ipfs';
import { nearToYocto, payContract, sha256Hex } from '../near/register';
import { MONAD_EXPLORER, anchorInMusecure, beatAccountStatus } from '../near/musecure';

const pct = (bps) => `${(bps / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} %`;

/** Hash largo con botón para copiarlo entero. */
function Hash({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* sin portapapeles */ }
  };
  return (
    <div className="hash-row">
      <span className="label">{label}</span>
      <code title={value}>{value.slice(0, 10)}…{value.slice(-6)}</code>
      <button className="mini" onClick={copy} aria-label={`Copy ${label}`}>{copied ? '✓' : 'Copy'}</button>
    </div>
  );
}

function Account({ id }) {
  return <a href={explorerAccountUrl(id)} target="_blank" rel="noreferrer" title={id}>{shortAccount(id)}</a>;
}

function CreditsView({ credits }) {
  if (credits?.Whole) {
    const list = credits.Whole.credits;
    if (!list.length) return <p className="hint">No credits: 100 % to the creator.</p>;
    return (
      <ul className="credit-list">
        {list.map((c) => <li key={c.account_id}><Account id={c.account_id} /> · {pct(c.bps)}</li>)}
      </ul>
    );
  }
  if (credits?.PerTrack) {
    return (
      <ul className="credit-list">
        {credits.PerTrack.tracks.map((t) => (
          <li key={t.name}>
            <strong>{t.name}</strong> ({pct(t.weight_bps)}):{' '}
            {t.credits.length ? t.credits.map((c, i) => (
              <span key={c.account_id}>{i > 0 && ', '}<Account id={c.account_id} /> {pct(c.bps)}</span>
            )) : 'creator'}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

/**
 * Comprueba que el audio en IPFS es el registrado: lo descarga, calcula su SHA-256 y lo compara
 * con el hash guardado en el contrato.
 */
function VerifyAudio({ beat }) {
  const [state, setState] = useState('');
  async function verify() {
    setState('checking');
    try {
      const hash = await sha256Hex(await fetchIpfs(beat.audio_cid));
      setState(hash === beat.audio_hash ? 'ok' : 'mismatch');
    } catch (e) {
      setState(`error:${e?.message || e}`);
    }
  }
  return (
    <div className="bar">
      <button onClick={verify} disabled={state === 'checking'}>
        {state === 'checking' ? 'Verifying…' : 'Verify audio'}
      </button>
      {state === 'ok' && <span className="ok-text">✓ The audio on IPFS matches the registered hash</span>}
      {state === 'mismatch' && <span className="warn-text">✗ The audio does not match the registered hash</span>}
      {state.startsWith('error:') && <span className="hint">{state.slice(6)}</span>}
    </div>
  );
}

/**
 * Licencia no exclusiva: permite usar el beat (por ejemplo, para grabar encima) sin ser dueño del NFT.
 * Una por cuenta; el pago se reparte mitad para el dueño y mitad para los autores.
 */
function LeaseBox({ beat: b, onChanged }) {
  const { status, account, accountId, balance, provider, login, refresh } = useNear();
  const [owned, setOwned] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!accountId) { setOwned(null); return; }
    let alive = true;
    hasLease(provider, b.token_id, accountId).then((v) => alive && setOwned(v)).catch(() => alive && setOwned(null));
    return () => { alive = false; };
  }, [provider, b.token_id, accountId, b.lease_count]);

  if (b.exclusive_sold || b.lease_price === '0') return null;
  const price = yoctoToNear(b.lease_price);

  async function buy() {
    setError('');
    if (balance !== null && Number(yoctoToNear(b.lease_price, 6)) + 0.01 > balance) {
      setError(`Not enough balance: the license costs ${price} Ⓝ and you have ${balance.toFixed(3)} Ⓝ`);
      return;
    }
    if (!window.confirm(`Buy the non-exclusive license for "${b.title}" for ${price} Ⓝ?`)) return;
    setBusy(true);
    try {
      setTxHash(await payContract(account, 'buy_lease', { token_id: b.token_id }, b.lease_price));
      setOwned(true);
      refresh();
      onChanged();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  let action;
  if (owned) action = <span className="ok-text">✓ You hold a non-exclusive license for this beat</span>;
  else if (accountId && accountId === b.owner_id) action = <span className="hint">You are the owner: no license needed.</span>;
  else if (status === 'signed-out') action = <button onClick={login}>Sign in to buy the license ({price} Ⓝ)</button>;
  else if (status !== 'active') action = <span className="hint">Activate your account to buy the license.</span>;
  else action = <button className="primary" onClick={buy} disabled={busy}>{busy ? 'Buying…' : `Buy non-exclusive license · ${price} Ⓝ`}</button>;

  return (
    <div className="lease-box">
      {action}
      {txHash && <a className="hint" href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">View transaction</a>}
      {error && <span className="hint warn-text">{error}</span>}
    </div>
  );
}

/**
 * Cuenta propia del NFT en Monad (Chain Signatures) y registro en MuSecure desde ella.
 * Solo el dueño actual del NFT puede usarla: si el NFT se vende, el control pasa al comprador.
 */
function AnchorBox({ beat: b }) {
  const { status, account, accountId, getAccessToken, refresh } = useNear();
  const [registered, setRegistered] = useState(null);
  const [acct, setAcct] = useState(null);
  const [step, setStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    beatAccountStatus(b.token_id)
      .then((r) => { if (alive) { setAcct(r); setRegistered(r.registered); } })
      .catch(() => alive && setRegistered(null));
    return () => { alive = false; };
  }, [b.token_id]);

  const mine = accountId && accountId === b.owner_id;
  const accountLine = acct && (
    <span className="hint">
      NFT account on Monad: <a href={`${MONAD_EXPLORER}/address/${acct.evmAddress}`} target="_blank" rel="noreferrer">{acct.evmAddress.slice(0, 8)}…{acct.evmAddress.slice(-6)}</a>
      {' '}· {Number(acct.balance).toFixed(3)} MON · controlled by the NFT owner
    </span>
  );
  if (!b.musecure_fingerprint) return <div className="lease-box">{accountLine}<span className="hint">No MuSecure fingerprint: cannot be registered on MuSecure.</span></div>;

  async function anchor() {
    setError('');
    setResult(null);
    try {
      const r = await anchorInMusecure({ account, accountId, beat: b, contractId: CONTRACT_ID, getAccessToken, onStep: setStep });
      setResult(r);
      setRegistered(true);
      refresh();
    } catch (e) {
      if (e.alreadyRegistered) setRegistered(true);
      setError(e?.message || String(e));
    } finally {
      setStep('');
    }
  }

  return (
    <div className="lease-box">
      {accountLine}
      {registered === true && <span className="ok-text">✓ Registered on MuSecure (Monad) under the NFT account</span>}
      {registered === false && !mine && <span className="hint">Not registered on MuSecure yet.</span>}
      {registered === false && mine && status === 'active' && (
        <button onClick={anchor} disabled={Boolean(step)} title="Sign the MuSecure (Monad) registration from the NFT account, via Chain Signatures">
          {step || 'Register on MuSecure from the NFT account'}
        </button>
      )}
      {result && (
        <span className="hint">
          <a href={`${MONAD_EXPLORER}/tx/${result.hash}`} target="_blank" rel="noreferrer">Monad transaction</a>
          {result.nearTx && <> · <a href={explorerTxUrl(result.nearTx)} target="_blank" rel="noreferrer">NEAR signature</a></>}
          {' · '}from <a href={`${MONAD_EXPLORER}/address/${result.evmAddress}`} target="_blank" rel="noreferrer">the NFT account</a>
        </span>
      )}
      {error && <span className="hint warn-text">{error}</span>}
    </div>
  );
}

/** Apoyar un beat con NEAR (mitad para el dueño, mitad para los autores). */
function SupportBox({ beat: b, onChanged }) {
  const { status, account, balance, refresh } = useNear();
  const [amount, setAmount] = useState('0.1');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  if (status !== 'active') return <p className="hint">Sign in to support this beat.</p>;

  async function support() {
    setMsg(null);
    try {
      const yocto = nearToYocto(amount);
      if (yocto === '0') throw new Error('Enter how much NEAR to send');
      if (balance !== null && Number(amount.replace(',', '.')) + 0.01 > balance) throw new Error(`Not enough balance (${balance.toFixed(3)} Ⓝ)`);
      setBusy(true);
      const tx = await payContract(account, 'support', { token_id: b.token_id }, yocto);
      setMsg({ ok: true, tx });
      refresh();
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lease-box">
      <label htmlFor={`sup-${b.token_id}`}>Support with
        <input id={`sup-${b.token_id}`} className="text pct" type="number" min="0" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} /> Ⓝ
      </label>
      <button onClick={support} disabled={busy}>{busy ? 'Sending…' : 'Support'}</button>
      {msg?.ok && <span className="ok-text">✓ Thank you! <a href={explorerTxUrl(msg.tx)} target="_blank" rel="noreferrer">View transaction</a></span>}
      {msg && !msg.ok && <span className="hint warn-text">{msg.text}</span>}
    </div>
  );
}

/**
 * Reparte el saldo de autores del beat entre sus acreditados (y el original, si es remix).
 * Cualquiera puede hacerlo: el dinero siempre va a los acreditados, nunca a quien presiona el botón.
 */
function ClaimBox({ beat: b, onChanged }) {
  const { status, account, refresh } = useNear();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  if (b.authors_balance === '0' && !msg) return null;

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      const tx = await payContract(account, 'claim', { token_id: b.token_id });
      setMsg({ ok: true, tx });
      refresh();
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lease-box">
      {b.authors_balance !== '0' && <span>Authors' balance to distribute: <strong>{yoctoToNear(b.authors_balance)} Ⓝ</strong></span>}
      {b.authors_balance !== '0' && status === 'active' && (
        <button onClick={claim} disabled={busy} title="Sends each credited account its share. Anyone can do it.">
          {busy ? 'Distributing…' : 'Distribute to authors'}
        </button>
      )}
      {msg?.ok && <span className="ok-text">✓ Distributed <a href={explorerTxUrl(msg.tx)} target="_blank" rel="noreferrer">View transaction</a></span>}
      {msg && !msg.ok && <span className="hint warn-text">{msg.text}</span>}
    </div>
  );
}

/** Portada dinámica generada por el contrato (SVG on chain con las notas, nivel e insignias). */
function Cover({ beat: b }) {
  const { provider } = useNear();
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    getBeatMedia(provider, b.token_id).then((m) => alive && setSrc(m)).catch(() => {});
    return () => { alive = false; };
  }, [provider, b.token_id, b.level, b.remix_count, b.lease_count, b.total_earned]);
  if (!src) return null;
  return <img className="cover" src={src} alt={`NFT #${b.token_id} cover: ${b.title}`} loading="lazy" />;
}

/**
 * Buy the NFT itself (the exclusive). The buyer becomes the owner: exclusive license, owner earnings,
 * and control of the NFT's own account on other chains (and its MuSecure certificate). 10 % goes to the authors.
 */
function BuyBox({ beat: b, onChanged }) {
  const { status, account, accountId, balance, login, refresh } = useNear();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tx, setTx] = useState('');

  if (!b.sale_price && !tx) return null;
  if (tx) {
    return (
      <div className="success" role="status">
        <strong>You now own NFT #{b.token_id}.</strong>
        <span className="hint">
          You hold the exclusive, receive the owner earnings and control the NFT's account on Monad (and its MuSecure certificate).
          {' '}<a href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">View transaction</a>
        </span>
      </div>
    );
  }
  const price = yoctoToNear(b.sale_price);
  const royalty = yoctoToNear((BigInt(b.sale_price) * 1000n) / 10000n);

  async function buy() {
    setError('');
    if (balance !== null && Number(yoctoToNear(b.sale_price, 6)) + 0.01 > balance) {
      setError(`Not enough balance: the NFT costs ${price} Ⓝ and you have ${balance.toFixed(3)} Ⓝ`);
      return;
    }
    if (!window.confirm(
      `Buy NFT #${b.token_id} "${b.title}" for ${price} Ⓝ?\n\n`
      + `You become the owner: exclusive license, owner earnings, and control of the NFT's account on Monad. `
      + `${royalty} Ⓝ (10 %) goes to the authors. New non-exclusive licenses close; existing ones remain valid.`,
    )) return;
    setBusy(true);
    try {
      setTx(await payContract(account, 'buy', { token_id: b.token_id }, b.sale_price));
      refresh();
      onChanged();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  let action;
  if (accountId && accountId === b.owner_id) action = <span className="hint">Your NFT is listed for {price} Ⓝ.</span>;
  else if (status === 'signed-out') action = <button onClick={login}>Sign in to buy the NFT ({price} Ⓝ)</button>;
  else if (status !== 'active') action = <span className="hint">Activate your account to buy the NFT.</span>;
  else action = <button className="primary" onClick={buy} disabled={busy}>{busy ? 'Buying…' : `Buy NFT (exclusive) · ${price} Ⓝ`}</button>;

  return (
    <div className="lease-box">
      {action}
      <span className="hint">10 % resale royalty to the authors · the NFT's Monad account moves to the buyer</span>
      {error && <span className="hint warn-text">{error}</span>}
    </div>
  );
}

/** Owner controls: sell the NFT, and set remix and non-exclusive license prices. */
function OwnerBox({ beat: b, onChanged }) {
  const { account, accountId } = useNear();
  const [salePrice, setSalePrice] = useState(b.sale_price ? yoctoToNear(b.sale_price, 6) : '1');
  const [remixPrice, setRemixPrice] = useState(yoctoToNear(b.remix_price, 6));
  const [remixAllowed, setRemixAllowed] = useState(b.remix_allowed);
  const [leasePrice, setLeasePrice] = useState(yoctoToNear(b.lease_price, 6));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  if (!accountId || accountId !== b.owner_id) return null;

  async function run(label, method, args) {
    setBusy(label);
    setMsg(null);
    try {
      const hash = await payContract(account, method, args);
      setMsg({ ok: true, text: `${label}: done`, hash });
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: e?.message || String(e) });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="owner-box">
      <span className="label">Owner controls</span>
      <div className="lease-box">
        {b.sale_price ? (
          <>
            <span>Listed for <strong>{yoctoToNear(b.sale_price)} Ⓝ</strong></span>
            <button onClick={() => run('Cancel listing', 'list_for_sale', { token_id: b.token_id, price: null })} disabled={Boolean(busy)}>
              {busy === 'Cancel listing' ? 'Cancelling…' : 'Cancel listing'}
            </button>
          </>
        ) : (
          <>
            <label htmlFor={`sale-${b.token_id}`}>Sell the NFT for
              <input id={`sale-${b.token_id}`} className="text pct" type="number" min="0" step="0.01" value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)} /> Ⓝ
            </label>
            <button onClick={() => {
              try { run('List for sale', 'list_for_sale', { token_id: b.token_id, price: nearToYocto(salePrice) }); } catch (e) { setMsg({ ok: false, text: e.message }); }
            }} disabled={Boolean(busy) || !Number(salePrice)}>
              {busy === 'List for sale' ? 'Listing…' : 'List for sale'}
            </button>
          </>
        )}
      </div>
      <p className="hint">Selling transfers the exclusive, future owner earnings and the NFT's Monad account. Credits never change: authors keep earning, plus 10 % of every resale.</p>
      <div className="lease-box">
        <label htmlFor={`rp-${b.token_id}`}>Remix price
          <input id={`rp-${b.token_id}`} className="text pct" type="number" min="0" step="0.01" value={remixPrice}
            onChange={(e) => setRemixPrice(e.target.value)} /> Ⓝ
        </label>
        <label htmlFor={`ra-${b.token_id}`} className="switch">
          <input id={`ra-${b.token_id}`} type="checkbox" role="switch" checked={remixAllowed} onChange={(e) => setRemixAllowed(e.target.checked)} />
          Remixes allowed
        </label>
        <button onClick={() => {
          try { run('Remix license', 'set_license', { token_id: b.token_id, remix_price: nearToYocto(remixPrice), remix_allowed: remixAllowed }); } catch (e) { setMsg({ ok: false, text: e.message }); }
        }} disabled={Boolean(busy)}>Save</button>
      </div>
      {!b.exclusive_sold && (
        <div className="lease-box">
          <label htmlFor={`lp-${b.token_id}`}>Non-exclusive license
            <input id={`lp-${b.token_id}`} className="text pct" type="number" min="0" step="0.01" value={leasePrice}
              onChange={(e) => setLeasePrice(e.target.value)} /> Ⓝ
          </label>
          <button onClick={() => {
            try { run('License price', 'set_lease_price', { token_id: b.token_id, price: nearToYocto(leasePrice) }); } catch (e) { setMsg({ ok: false, text: e.message }); }
          }} disabled={Boolean(busy)}>Save</button>
        </div>
      )}
      {msg?.ok && <span className="ok-text">✓ {msg.text} <a href={explorerTxUrl(msg.hash)} target="_blank" rel="noreferrer">View transaction</a></span>}
      {msg && !msg.ok && <span className="hint warn-text">{msg.text}</span>}
    </div>
  );
}

function BeatCard({ beat: b, playing, onPlay, onOpen, onChanged }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');

  async function openProject() {
    setOpening(true);
    setOpenError('');
    try {
      await onOpen(b);
    } catch (e) {
      setOpenError(e?.message || String(e));
    } finally {
      setOpening(false);
    }
  }

  return (
    <li className="beat-card">
      <Cover beat={b} />
      <div className="beat-top">
        <strong>{b.title}</strong>
        <span className="num">#{b.token_id}{b.level ? ` · Lv ${b.level}` : ''}</span>
      </div>
      {b.badges?.length > 0 && <div className="badges">{b.badges.map((x) => <span key={x} className="badge">{x}</span>)}</div>}
      <div className="beat-meta">
        <span>Creator: <Account id={b.creator} /></span>
        {b.owner_id !== b.creator && <span>Owner: <Account id={b.owner_id} /></span>}
        {b.parent_id && <span>Remix of #{b.parent_id}</span>}
        {b.remix_count > 0 && <span>{b.remix_count} remix{b.remix_count > 1 ? 'es' : ''}</span>}
        <span>{new Date(Number(b.created_at_ms)).toLocaleDateString()}</span>
      </div>
      <div className="bar">
        <button className={playing ? 'primary' : ''} onClick={() => onPlay(b)}>{playing ? '■ Stop' : '▶ Listen'}</button>
        <button onClick={openProject} disabled={opening || !b.remix_allowed}
          title={b.remix_allowed ? 'Opens the project in the sequencer; when registered it becomes a remix of this beat' : 'The owner does not allow remixes'}>
          {opening ? 'Opening…' : !b.remix_allowed ? 'Remix not allowed'
            : `Remix${b.remix_price === '0' ? ' (free)' : ` (${yoctoToNear(b.remix_price)} Ⓝ)`}`}
        </button>
        <button aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'Details'}</button>
      </div>
      {openError && <p className="hint warn-text">{openError}</p>}
      {b.sale_price && <span className="badge ok">For sale · {yoctoToNear(b.sale_price)} Ⓝ</span>}
      <BuyBox beat={b} onChanged={onChanged} />
      <LeaseBox beat={b} onChanged={onChanged} />
      {open && (
        <div className="beat-details">
          <div className="beat-meta">
            <span>Remix: {b.remix_allowed ? (b.remix_price === '0' ? 'free' : `${yoctoToNear(b.remix_price)} Ⓝ`) : 'not allowed'}</span>
            <span>Non-exclusive license: {b.exclusive_sold ? 'closed (exclusive sold)' : b.lease_price === '0' ? 'not for sale' : `${yoctoToNear(b.lease_price)} Ⓝ`}</span>
            {b.lease_count > 0 && <span>{b.lease_count} licenses sold</span>}
            {b.sale_price && <span>For sale (exclusive): {yoctoToNear(b.sale_price)} Ⓝ</span>}
            {b.total_earned !== '0' && <span>Earned: {yoctoToNear(b.total_earned)} Ⓝ</span>}
          </div>
          <OwnerBox beat={b} onChanged={onChanged} />
          <span className="label">Credits</span>
          <CreditsView credits={b.credits} />
          <ClaimBox beat={b} onChanged={onChanged} />
          <span className="label">Support</span>
          <p className="hint">Half goes to the NFT owner and half to the authors (if it is a remix, a share flows up to the original).</p>
          <SupportBox beat={b} onChanged={onChanged} />
          <span className="label">Fingerprints</span>
          <Hash label="Audio SHA-256" value={b.audio_hash} />
          <Hash label="Project SHA-256" value={b.project_hash} />
          <Hash label="MuSecure fingerprint" value={b.musecure_fingerprint} />
          <div className="beat-meta">
            <a href={explorerTokenUrl(CONTRACT_ID, b.token_id)} target="_blank" rel="noreferrer">NFT on NearBlocks</a>
            <a href={explorerAccountUrl(b.creator)} target="_blank" rel="noreferrer">Creator transactions</a>
            <a href={ipfsUrl(b.audio_cid)} target="_blank" rel="noreferrer">Audio on IPFS</a>
            <a href={ipfsUrl(b.project_cid)} target="_blank" rel="noreferrer">Project on IPFS</a>
            {b.license_uri && <a href={b.license_uri.replace(/^ipfs:\/\//, ipfsUrl(''))} target="_blank" rel="noreferrer">License</a>}
          </div>
          <VerifyAudio beat={b} />
          <span className="label">MuSecure (Monad)</span>
          <AnchorBox beat={b} />
        </div>
      )}
    </li>
  );
}

/** Beats registrados en el contrato, del más nuevo al más antiguo. Lectura gratis, sin sesión. */
export function Gallery({ onOpenProject }) {
  const { provider } = useNear();
  const [beats, setBeats] = useState(null);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setBeats(await getBeats(provider, 24));
    } catch (e) {
      setError(`Could not read the contract: ${e?.message || e}`);
    }
  }, [provider]);

  useEffect(() => { load(); }, [load]);

  // Se recarga cuando se registra un beat nuevo desde la app.
  useEffect(() => {
    window.addEventListener('msb:beats-changed', load);
    return () => window.removeEventListener('msb:beats-changed', load);
  }, [load]);

  // Un solo reproductor para toda la galería: suena un beat a la vez.
  useEffect(() => () => audioRef.current?.pause(), []);
  function play(b) {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => setPlayingId(null));
    }
    const a = audioRef.current;
    if (playingId === b.token_id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    window.dispatchEvent(new Event('msb:stop-sequencer'));
    a.src = ipfsUrl(b.audio_cid);
    a.loop = true;
    a.play().catch((e) => setError(`Could not play: ${e?.message || e}`));
    setPlayingId(b.token_id);
  }

  // Si se toca el secuenciador, se para la galería.
  useEffect(() => {
    const stop = () => { audioRef.current?.pause(); setPlayingId(null); };
    window.addEventListener('msb:stop-gallery', stop);
    return () => window.removeEventListener('msb:stop-gallery', stop);
  }, []);

  async function open(b) {
    const text = await (await fetchIpfs(b.project_cid)).text();
    onOpenProject(text, b);
  }

  const summary = beats ? `${beats.length} ${beats.length === 1 ? 'beat' : 'beats'} on NEAR testnet` : 'Loading…';

  return (
    <Panel plain id="gallery" title="Beats on NEAR" summary={summary}>
      <div className="bar spread">
        <span className="hint">
          <a href={explorerAccountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">Contract: {CONTRACT_ID}</a>
          {' · '}
          <a href={explorerNftUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">NFT collection</a>
        </span>
        <button onClick={load}>Refresh</button>
      </div>
      {error && <p className="hint">{error}</p>}
      {beats && beats.length === 0 && <p className="hint">No beats registered yet.</p>}
      {beats && beats.length > 0 && (
        <ul className="beat-list">
          {beats.map((b) => (
            <BeatCard key={b.token_id} beat={b} playing={playingId === b.token_id} onPlay={play} onOpen={open} onChanged={() => window.dispatchEvent(new Event('msb:beats-changed'))} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
