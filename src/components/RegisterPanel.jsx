import { useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { shortAccount } from '../near/config';
import { TRACKS } from '../music/theory';
import { collectEmails, nearToYocto, registerBeat, resolveEmails, sha256Hex, toCredits, uploadToIpfs } from '../near/register';
import { generateFingerprint } from '../fingerprint';

const emptyRow = () => ({ account: '', pct: '' });

/** Lista editable de acreditados: cuenta NEAR + porcentaje. */
function CreditRows({ rows, setRows, idPrefix }) {
  const update = (i, key, value) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <div className="credit-rows">
      {rows.map((r, i) => (
        <div className="credit-row" key={i}>
          <input className="text" id={`${idPrefix}-acc-${i}`} aria-label="Email o cuenta NEAR" placeholder="email o cuenta.testnet"
            value={r.account} onChange={(e) => update(i, 'account', e.target.value)} />
          <input className="text pct" id={`${idPrefix}-pct-${i}`} aria-label="Porcentaje" type="number" min="0" max="100" step="0.01"
            placeholder="%" value={r.pct} onChange={(e) => update(i, 'pct', e.target.value)} />
          <button aria-label="Quitar" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {rows.length < 10 && <button onClick={() => setRows([...rows, emptyRow()])}>+ Acreditar a alguien</button>}
    </div>
  );
}

export function RegisterPanel({ title, buildFiles }) {
  const { status, account, accountId, login, refresh, activate, activationError, getAccessToken } = useNear();
  const [mode, setMode] = useState('whole');
  const [whole, setWhole] = useState([]);
  const [tracks, setTracks] = useState(TRACKS.map(() => ({ weight: 25, rows: [] })));
  const [remixPrice, setRemixPrice] = useState('0');
  const [leasePrice, setLeasePrice] = useState('0');
  const [licenseUri, setLicenseUri] = useState('');
  const [step, setStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const busy = Boolean(step);
  const weightSum = tracks.reduce((s, t) => s + Number(t.weight || 0), 0);

  function buildCredits(emailMap) {
    if (mode === 'whole') return { Whole: { credits: toCredits(whole, 'Créditos', emailMap) } };
    if (Math.round(weightSum * 100) !== 10000) throw new Error('Los pesos de las pistas deben sumar 100 %');
    return {
      PerTrack: {
        tracks: tracks.map((t, i) => ({
          name: TRACKS[i].name,
          weight_bps: Math.round(Number(t.weight) * 100),
          credits: toCredits(t.rows, `Pista ${TRACKS[i].name}`, emailMap),
        })),
      },
    };
  }

  async function submit() {
    setError('');
    setWarning('');
    setResult(null);
    try {
      const cleanTitle = (title || '').trim();
      if (!cleanTitle) throw new Error('Ponle nombre al beat en "Guardar y exportar"');
      if (/["\\]/.test(cleanTitle)) throw new Error('El nombre no puede tener comillas ni barras invertidas');
      const emails = collectEmails(mode === 'whole' ? [whole] : tracks.map((t) => t.rows));
      // Valida porcentajes y repetidos antes de crear cuentas en Privy (cuentas provisorias por email).
      buildCredits(Object.fromEntries(emails.map((e, i) => [e, `pendiente${i}.check`])));
      if (emails.length) setStep('Preparando las cuentas de los colaboradores…');
      const emailMap = await resolveEmails(emails, getAccessToken);
      const credits = buildCredits(emailMap);
      const remix_price = nearToYocto(remixPrice);
      const lease_price = nearToYocto(leasePrice);
      const license_uri = licenseUri.trim() || null;
      if (license_uri && /["\\]/.test(license_uri)) throw new Error('El enlace de la licencia no puede tener comillas');

      setStep('Grabando una vuelta del beat…');
      const { wav, project, baseName } = await buildFiles();

      setStep('Calculando huellas SHA-256…');
      const [audio_hash, project_hash] = await Promise.all([sha256Hex(wav), sha256Hex(project)]);

      // Huella acústica de MuSecure: une este beat con el catálogo de MuSecure (Monad).
      // Si falla (por ejemplo, no carga FFmpeg), el registro sigue sin ella.
      let musecure_fingerprint = null;
      try {
        const fp = await generateFingerprint(new File([wav], `${baseName}.wav`, { type: 'audio/wav' }),
          (stage, pct) => setStep(`Huella acústica: ${stage} ${Math.round(pct)}%`));
        musecure_fingerprint = fp.sha256;
      } catch (e) {
        setWarning(`Se registró sin huella acústica de MuSecure: ${e?.message || e}`);
      }

      setStep('Subiendo a IPFS…');
      const [audio_cid, project_cid] = await Promise.all([
        uploadToIpfs(wav, `${baseName}.wav`),
        uploadToIpfs(project, `${baseName}.musecure.json`),
      ]);

      setStep('Firmando en NEAR…');
      const beat = await registerBeat(account, {
        title: cleanTitle,
        audio_cid,
        project_cid,
        audio_hash,
        project_hash,
        remix_price,
        credits,
        license_uri,
        lease_price,
        musecure_fingerprint,
      });
      setResult(beat);
      refresh();
      window.dispatchEvent(new Event('msb:beats-changed'));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setStep('');
    }
  }

  const summary = result ? `Registrado: #${result.token_id}` : status === 'active' ? 'Listo para registrar' : 'Requiere iniciar sesión';

  return (
    <Panel id="register" title="Registrar en NEAR" defaultOpen={false} summary={summary}>
      {status === 'no-auth' && <p className="hint">Configura VITE_PRIVY_APP_ID para iniciar sesión y registrar.</p>}
      {status === 'signed-out' && (
        <div className="bar">
          <p className="hint">Inicia sesión para registrar tu beat a tu nombre.</p>
          <button className="primary" onClick={login}>Entrar con email</button>
        </div>
      )}
      {status === 'activating' && <p className="hint">Activando tu cuenta NEAR ({shortAccount(accountId)})…</p>}
      {status === 'inactive' && (
        <div className="bar">
          <p className="hint">Tu cuenta NEAR ({shortAccount(accountId)}) todavía no está activa.{activationError ? ` ${activationError}` : ''}</p>
          <button className="primary" onClick={activate}>Activar cuenta</button>
        </div>
      )}

      {status === 'active' && (
        <>
          <p className="hint">
            Se registra <strong>{title || 'Sin nombre'}</strong>: el audio (una vuelta en WAV) y el proyecto quedan en IPFS, y sus
            huellas en el contrato, a nombre de {shortAccount(accountId)}.
          </p>

          <div className="bar">
            <span className="label">Créditos</span>
            <div className="seg" role="radiogroup" aria-label="Modo de créditos">
              <button role="radio" aria-checked={mode === 'whole'} onClick={() => setMode('whole')}>Por conjunto</button>
              <button role="radio" aria-checked={mode === 'tracks'} onClick={() => setMode('tracks')}>Por pista</button>
            </div>
          </div>

          {mode === 'whole' && (
            <>
              <CreditRows rows={whole} setRows={setWhole} idPrefix="whole" />
              <p className="hint">Lo que no repartas es tuyo. Sin acreditados, el 100 % es del creador.</p>
              <p className="hint">
                Con un email, el colaborador recibe una cuenta NEAR ligada a ese email aunque nunca haya entrado, y ve el crédito
                al iniciar sesión (en MuSecure Beats o con el mismo login de MuSecure). El email no queda publicado.
              </p>
            </>
          )}

          {mode === 'tracks' && (
            <div className="track-credits">
              {TRACKS.map((t, i) => (
                <div className="ch" key={t.id} style={{ '--c': `var(--t${i})` }}>
                  <div className="top">
                    <strong>{t.name}</strong>
                    <label htmlFor={`w${i}`}>
                      Peso
                      <input id={`w${i}`} className="text pct" type="number" min="0" max="100" value={tracks[i].weight}
                        onChange={(e) => setTracks(tracks.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} />
                      %
                    </label>
                  </div>
                  <CreditRows rows={tracks[i].rows} idPrefix={`t${i}`}
                    setRows={(rows) => setTracks(tracks.map((x, j) => (j === i ? { ...x, rows } : x)))} />
                </div>
              ))}
              <p className={`hint${Math.round(weightSum * 100) !== 10000 ? ' warn-text' : ''}`}>
                Los pesos suman {weightSum} %. Deben sumar 100 %. Lo no acreditado de cada pista es del creador.
              </p>
            </div>
          )}

          <div className="bar">
            <label htmlFor="remixPrice">Licencia de remix
              <input id="remixPrice" className="text pct" type="number" min="0" step="0.01" value={remixPrice}
                onChange={(e) => setRemixPrice(e.target.value)} /> Ⓝ
            </label>
            <label htmlFor="leasePrice">Licencia no exclusiva
              <input id="leasePrice" className="text pct" type="number" min="0" step="0.01" value={leasePrice}
                onChange={(e) => setLeasePrice(e.target.value)} /> Ⓝ
            </label>
            <label htmlFor="licenseUri">Texto de licencia (opcional)
              <input id="licenseUri" className="text" placeholder="ipfs://… o https://…" value={licenseUri}
                onChange={(e) => setLicenseUri(e.target.value)} />
            </label>
          </div>
          <p className="hint">0 = remix libre / no vender licencias no exclusivas. Lo puedes cambiar después como dueño.</p>

          <div className="bar">
            <button className="primary" onClick={submit} disabled={busy}>
              {busy ? step : 'Registrar beat'}
            </button>
          </div>
        </>
      )}

      {error && <p className="hint warn-text" role="alert">{error}</p>}
      {warning && <p className="hint">{warning}</p>}
      {result && (
        <div className="success" role="status">
          <strong>¡Registrado! Beat #{result.token_id}: {result.title}</strong>
          <span className="hint">Audio: ipfs://{result.audio_cid}</span>
          <span className="hint">SHA-256 del audio: {result.audio_hash.slice(0, 16)}…</span>
          {result.musecure_fingerprint && (
            <span className="hint">Huella MuSecure: {result.musecure_fingerprint.slice(0, 16)}…</span>
          )}
        </div>
      )}
    </Panel>
  );
}
