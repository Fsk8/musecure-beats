import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { getBeats, yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerAccountUrl, explorerNftUrl, explorerTokenUrl, shortAccount } from '../near/config';
import { fetchIpfs, ipfsUrl } from '../near/ipfs';
import { sha256Hex } from '../near/register';

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
      <button className="mini" onClick={copy} aria-label={`Copiar ${label}`}>{copied ? '✓' : 'Copiar'}</button>
    </div>
  );
}

function Account({ id }) {
  return <a href={explorerAccountUrl(id)} target="_blank" rel="noreferrer" title={id}>{shortAccount(id)}</a>;
}

function CreditsView({ credits }) {
  if (credits?.Whole) {
    const list = credits.Whole.credits;
    if (!list.length) return <p className="hint">Sin acreditados: 100 % del autor.</p>;
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
            )) : 'del autor'}
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
        {state === 'checking' ? 'Verificando…' : 'Verificar audio'}
      </button>
      {state === 'ok' && <span className="ok-text">✓ El audio en IPFS coincide con el hash registrado</span>}
      {state === 'mismatch' && <span className="warn-text">✗ El audio no coincide con el hash registrado</span>}
      {state.startsWith('error:') && <span className="hint">{state.slice(6)}</span>}
    </div>
  );
}

function BeatCard({ beat: b, playing, onPlay, onOpen }) {
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
      <div className="beat-top">
        <strong>{b.title}</strong>
        <span className="num">#{b.token_id}</span>
      </div>
      <div className="beat-meta">
        <span>Autor: <Account id={b.creator} /></span>
        {b.owner_id !== b.creator && <span>Dueño: <Account id={b.owner_id} /></span>}
        {b.parent_id && <span>Remix de #{b.parent_id}</span>}
        {b.remix_count > 0 && <span>{b.remix_count} remix{b.remix_count > 1 ? 'es' : ''}</span>}
        <span>{new Date(Number(b.created_at_ms)).toLocaleDateString()}</span>
      </div>
      <div className="bar">
        <button className={playing ? 'primary' : ''} onClick={() => onPlay(b)}>{playing ? '■ Parar' : '▶ Escuchar'}</button>
        <button onClick={openProject} disabled={opening || !b.remix_allowed}
          title={b.remix_allowed ? 'Abre el proyecto en el secuenciador; al registrarlo queda como remix de este beat' : 'El dueño no permite remixes'}>
          {opening ? 'Abriendo…' : !b.remix_allowed ? 'Remix no permitido'
            : `Remixar${b.remix_price === '0' ? ' (libre)' : ` (${yoctoToNear(b.remix_price)} Ⓝ)`}`}
        </button>
        <button aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Ocultar detalles' : 'Detalles'}</button>
      </div>
      {openError && <p className="hint warn-text">{openError}</p>}
      {open && (
        <div className="beat-details">
          <div className="beat-meta">
            <span>Remix: {b.remix_allowed ? (b.remix_price === '0' ? 'libre' : `${yoctoToNear(b.remix_price)} Ⓝ`) : 'no permitido'}</span>
            <span>Licencia no exclusiva: {b.exclusive_sold ? 'cerrada (vendido en exclusiva)' : b.lease_price === '0' ? 'no a la venta' : `${yoctoToNear(b.lease_price)} Ⓝ`}</span>
            {b.lease_count > 0 && <span>{b.lease_count} licencias vendidas</span>}
            {b.sale_price && <span>En venta (exclusiva): {yoctoToNear(b.sale_price)} Ⓝ</span>}
            {b.total_earned !== '0' && <span>Ganado: {yoctoToNear(b.total_earned)} Ⓝ</span>}
          </div>
          <span className="label">Créditos</span>
          <CreditsView credits={b.credits} />
          <span className="label">Huellas</span>
          <Hash label="SHA-256 del audio" value={b.audio_hash} />
          <Hash label="SHA-256 del proyecto" value={b.project_hash} />
          <Hash label="Huella MuSecure" value={b.musecure_fingerprint} />
          <div className="beat-meta">
            <a href={explorerTokenUrl(CONTRACT_ID, b.token_id)} target="_blank" rel="noreferrer">NFT en NearBlocks</a>
            <a href={explorerAccountUrl(b.creator)} target="_blank" rel="noreferrer">Transacciones del autor</a>
            <a href={ipfsUrl(b.audio_cid)} target="_blank" rel="noreferrer">Audio en IPFS</a>
            <a href={ipfsUrl(b.project_cid)} target="_blank" rel="noreferrer">Proyecto en IPFS</a>
            {b.license_uri && <a href={b.license_uri.replace(/^ipfs:\/\//, ipfsUrl(''))} target="_blank" rel="noreferrer">Licencia</a>}
          </div>
          <VerifyAudio beat={b} />
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
      setError(`No se pudo leer el contrato: ${e?.message || e}`);
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
    a.play().catch((e) => setError(`No se pudo reproducir: ${e?.message || e}`));
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

  const summary = beats ? `${beats.length} ${beats.length === 1 ? 'beat' : 'beats'} en NEAR testnet` : 'Cargando…';

  return (
    <Panel id="gallery" title="Beats en NEAR" summary={summary}>
      <div className="bar spread">
        <span className="hint">
          <a href={explorerAccountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">Contrato: {CONTRACT_ID}</a>
          {' · '}
          <a href={explorerNftUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">Colección NFT</a>
        </span>
        <button onClick={load}>Actualizar</button>
      </div>
      {error && <p className="hint">{error}</p>}
      {beats && beats.length === 0 && <p className="hint">Todavía no hay beats registrados.</p>}
      {beats && beats.length > 0 && (
        <ul className="beat-list">
          {beats.map((b) => (
            <BeatCard key={b.token_id} beat={b} playing={playingId === b.token_id} onPlay={play} onOpen={open} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
