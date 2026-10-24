import { useEffect, useMemo, useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { yoctoToNear } from '../near/contract';
import { CONTRACT_ID, explorerTokenUrl, explorerTxUrl, shortAccount } from '../near/config';
import { TRACKS } from '../music/theory';
import { REMIX_MIN_SIMILARITY, parseProjectFile, remixSimilarity } from '../music/patterns';
import { fetchIpfs } from '../near/ipfs';
import { collectEmails, nearToYocto, registerBeat, resolveEmails, sha256Hex, toCredits, uploadToIpfs } from '../near/register';
import { generateFingerprint } from '../fingerprint';
import { SEALED_PLACEHOLDER, sealProject } from '../near/seal';

const emptyRow = () => ({ account: '', pct: '' });

/** Lista editable de acreditados: cuenta NEAR + porcentaje. */
function CreditRows({ rows, setRows, idPrefix }) {
  const update = (i, key, value) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <div className="credit-rows">
      {rows.map((r, i) => (
        <div className="credit-row" key={i}>
          <input className="text" id={`${idPrefix}-acc-${i}`} aria-label="Email or NEAR account" placeholder="email or account.testnet"
            value={r.account} onChange={(e) => update(i, 'account', e.target.value)} />
          <input className="text pct" id={`${idPrefix}-pct-${i}`} aria-label="Percentage" type="number" min="0" max="100" step="0.01"
            placeholder="%" value={r.pct} onChange={(e) => update(i, 'pct', e.target.value)} />
          <button aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {rows.length < 10 && <button onClick={() => setRows([...rows, emptyRow()])}>+ Credit someone</button>}
    </div>
  );
}

/** Proyecto del beat original (de IPFS), para medir cuánto conserva el remix. */
function useParentProject(cid) {
  const [state, setState] = useState({ cid: null, project: null, error: '' });
  useEffect(() => {
    if (!cid || state.cid === cid) return;
    let alive = true;
    setState({ cid, project: null, error: '' });
    fetchIpfs(cid)
      .then((b) => b.text())
      .then((t) => alive && setState({ cid, project: parseProjectFile(t), error: '' }))
      .catch((e) => alive && setState({ cid, project: null, error: e?.message || String(e) }));
    return () => { alive = false; };
  }, [cid]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

export function RegisterPanel({ title, buildFiles, remixOf: linkedRemix, beat, onRegistered }) {
  const parent = useParentProject(linkedRemix?.project_cid);
  const similarity = useMemo(
    () => (parent.project && beat ? remixSimilarity(parent.project, beat) : null),
    [parent.project, beat],
  );
  // Por debajo del umbral se puede registrar como obra original. Sin medición posible, sigue siendo remix.
  const canDetach = Boolean(similarity && similarity.overall < REMIX_MIN_SIMILARITY);
  const [asOriginal, setAsOriginal] = useState(false);
  useEffect(() => { if (!canDetach) setAsOriginal(false); }, [canDetach]);
  const remixOf = linkedRemix && !(canDetach && asOriginal) ? linkedRemix : null;

  const { status, account, accountId, balance, login, refresh, activate, activationError, getAccessToken } = useNear();
  const [mode, setMode] = useState('whole');
  const [whole, setWhole] = useState([]);
  const [tracks, setTracks] = useState(TRACKS.map(() => ({ weight: 25, rows: [] })));
  const [remixPrice, setRemixPrice] = useState('0');
  const [leasePrice, setLeasePrice] = useState('0');
  const [licenseUri, setLicenseUri] = useState('');
  // 'open': proyecto público (remixable) · 'sealed': cifrado a nombre de la cuenta del NFT.
  const [privacy, setPrivacy] = useState('open');
  const [pendingSeal, setPendingSeal] = useState(null);
  const [sealStep, setSealStep] = useState('');
  const [step, setStep] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const busy = Boolean(step);
  const weightSum = tracks.reduce((s, t) => s + Number(t.weight || 0), 0);

  function buildCredits(emailMap) {
    if (mode === 'whole') return { Whole: { credits: toCredits(whole, 'Credits', emailMap) } };
    if (Math.round(weightSum * 100) !== 10000) throw new Error('Track weights must add up to 100 %');
    return {
      PerTrack: {
        tracks: tracks.map((t, i) => ({
          name: TRACKS[i].name,
          weight_bps: Math.round(Number(t.weight) * 100),
          credits: toCredits(t.rows, `Track ${TRACKS[i].name}`, emailMap),
        })),
      },
    };
  }

  /** Cifra el proyecto a nombre del NFT recién creado. Si falla, se puede reintentar sin volver a registrar. */
  async function runSeal(tokenId, projectText) {
    setPendingSeal({ tokenId, projectText });
    try {
      await sealProject({ account, accountId, tokenId, projectText, getAccessToken, onStep: setSealStep });
      setPendingSeal(null);
      window.dispatchEvent(new Event('msb:beats-changed'));
    } catch (e) {
      setError(`The beat was registered, but sealing failed: ${e?.message || e}. Retry below.`);
    } finally {
      setSealStep('');
    }
  }

  async function submit() {
    setError('');
    setWarning('');
    setResult(null);
    try {
      const cleanTitle = (title || '').trim();
      if (!cleanTitle) throw new Error('Name your beat in "Save & export"');
      if (/["\\]/.test(cleanTitle)) throw new Error('The name cannot contain quotes or backslashes');
      const emails = collectEmails(mode === 'whole' ? [whole] : tracks.map((t) => t.rows));
      // Valida porcentajes y repetidos antes de crear cuentas en Privy (cuentas provisorias por email).
      buildCredits(Object.fromEntries(emails.map((e, i) => [e, `pending${i}.check`])));
      if (emails.length) setStep('Preparing collaborator accounts…');
      const emailMap = await resolveEmails(emails, getAccessToken);
      const credits = buildCredits(emailMap);
      if (remixOf && balance !== null && Number(yoctoToNear(remixOf.remix_price, 6)) + 0.01 > balance) {
        throw new Error(`Not enough balance: the remix license costs ${yoctoToNear(remixOf.remix_price)} Ⓝ and you have ${balance.toFixed(3)} Ⓝ`);
      }
      const sealed = privacy === 'sealed';
      const remix_price = sealed ? '0' : nearToYocto(remixPrice);
      const lease_price = nearToYocto(leasePrice);
      const license_uri = licenseUri.trim() || null;
      if (license_uri && /["\\]/.test(license_uri)) throw new Error('The license link cannot contain quotes');

      setStep('Rendering one loop of the beat…');
      const { wav, project, baseName, art } = await buildFiles({ asRemix: Boolean(remixOf) });

      setStep('Computing SHA-256 hashes…');
      const [audio_hash, project_hash] = await Promise.all([sha256Hex(wav), sha256Hex(project)]);

      // Huella acústica de MuSecure: une este beat con el catálogo de MuSecure (Monad).
      // Si falla (por ejemplo, no carga FFmpeg), el registro sigue sin ella.
      let musecure_fingerprint = null;
      try {
        const fp = await generateFingerprint(new File([wav], `${baseName}.wav`, { type: 'audio/wav' }),
          (stage, pct) => setStep(`Audio fingerprint: ${stage} ${Math.round(pct)}%`));
        musecure_fingerprint = fp.sha256;
      } catch (e) {
        setWarning(`Registered without a MuSecure audio fingerprint: ${e?.message || e}`);
      }

      setStep('Uploading to IPFS…');
      // Sellado: el proyecto no se publica; después del registro se cifra a nombre del NFT.
      const [audio_cid, project_cid] = await Promise.all([
        uploadToIpfs(wav, `${baseName}.wav`),
        sealed ? Promise.resolve(SEALED_PLACEHOLDER) : uploadToIpfs(project, `${baseName}.musecure.json`),
      ]);

      setStep('Signing on NEAR…');
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
        art,
      }, remixOf);
      setResult(beat);
      onRegistered?.(beat);
      if (sealed) await runSeal(beat.token_id, await project.text());
      refresh();
      window.dispatchEvent(new Event('msb:beats-changed'));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setStep('');
    }
  }

  const summary = result ? `Registered: #${result.token_id}`
    : status !== 'active' ? 'Sign-in required'
      : remixOf ? `Remix of #${remixOf.token_id}` : 'Ready to register';

  return (
    <Panel plain id="register" title="Register on NEAR" defaultOpen={false} summary={summary}>
      {status === 'no-auth' && <p className="hint">Set VITE_PRIVY_APP_ID to sign in and register.</p>}
      {status === 'signed-out' && (
        <div className="bar">
          <p className="hint">Sign in to register your beat under your name.</p>
          <button className="primary" onClick={login}>Sign in with email</button>
        </div>
      )}
      {status === 'activating' && <p className="hint">Activating your NEAR account ({shortAccount(accountId)})…</p>}
      {status === 'inactive' && (
        <div className="bar">
          <p className="hint">Your NEAR account ({shortAccount(accountId)}) is not active yet.{activationError ? ` ${activationError}` : ''}</p>
          <button className="primary" onClick={activate}>Activate account</button>
        </div>
      )}

      {status === 'active' && (
        <>
          {linkedRemix && (
            <div className="remix-banner">
              <strong>Similarity with the original: {similarity ? `${similarity.overall} %` : parent.error ? 'could not measure' : linkedRemix.project_cid ? 'measuring…' : 'no data'}</strong>
              {similarity && (
                <span className="hint">
                  {TRACKS.map((t, i) => (similarity.tracks[i] === null ? null : `${t.name} ${similarity.tracks[i]} %`)).filter(Boolean).join(' · ')}
                  {' '}— original notes still in place.
                </span>
              )}
              {parent.error && <span className="hint">{parent.error}. It will be registered as a remix.</span>}
              {similarity && !canDetach && (
                <span className="hint">Keeps {REMIX_MIN_SIMILARITY} % or more of the original: it is registered as a remix.</span>
              )}
              {canDetach && (
                <label htmlFor="asOriginal" className="switch">
                  <input id="asOriginal" type="checkbox" role="switch" checked={asOriginal} onChange={(e) => setAsOriginal(e.target.checked)} />
                  Keeps less than {REMIX_MIN_SIMILARITY} %: register as an original work (no remix license)
                </label>
              )}
            </div>
          )}
          {remixOf && (
            <div className="remix-banner">
              <strong>Remix of #{remixOf.token_id} "{remixOf.title}"</strong> by {shortAccount(remixOf.creator)}
              <span className="hint">
                Remix license: {remixOf.remix_price === '0' ? 'free' : `${yoctoToNear(remixOf.remix_price)} Ⓝ, paid when you register`}
                {' '}(half to the original's owner, half to its authors). The original also receives 20 % of what your remix's
                authors earn, forever and in cascade.
              </span>
            </div>
          )}
          <p className="hint">
            Registering <strong>{title || 'Untitled'}</strong>: the audio (one WAV loop) and the project go to IPFS, and their
            hashes go to the contract, under {shortAccount(accountId)}.
          </p>

          <div className="bar">
            <span className="label">Credits</span>
            <div className="seg" role="radiogroup" aria-label="Credit mode">
              <button role="radio" aria-checked={mode === 'whole'} onClick={() => setMode('whole')}>Whole beat</button>
              <button role="radio" aria-checked={mode === 'tracks'} onClick={() => setMode('tracks')}>Per track</button>
            </div>
          </div>

          {mode === 'whole' && (
            <>
              <CreditRows rows={whole} setRows={setWhole} idPrefix="whole" />
              <p className="hint">Whatever you do not assign is yours. With no credits, 100 % goes to the creator.</p>
              <p className="hint">
                With an email, the collaborator gets a NEAR account tied to that email even if they never signed in, and sees the
                credit when they sign in (on MuSecure Beats or with the same MuSecure login). The email is never published.
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
                      Weight
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
                Weights add up to {weightSum} %. They must add up to 100 %. Unassigned shares of each track go to the creator.
              </p>
            </div>
          )}

          <div className="bar">
            <span className="label">Project</span>
            <div className="seg" role="radiogroup" aria-label="Project privacy">
              <button role="radio" aria-checked={privacy === 'open'} onClick={() => setPrivacy('open')}>Open (remixable)</button>
              <button role="radio" aria-checked={privacy === 'sealed'} onClick={() => setPrivacy('sealed')}>Sealed</button>
            </div>
          </div>
          <p className="hint">
            {privacy === 'open'
              ? 'The project (notes, kit, mix) is public on IPFS: anyone can remix it, and licensees can download the stems.'
              : 'The project is encrypted to the NFT\'s own account: only the current NFT owner can open it (if the NFT is sold, access moves to the buyer). Remixes and stems for licensees are off; the mix WAV stays public for listening.'}
          </p>

          <div className="bar">
            {privacy === 'open' && (
            <label htmlFor="remixPrice">Remix license
              <input id="remixPrice" className="text pct" type="number" min="0" step="0.01" value={remixPrice}
                onChange={(e) => setRemixPrice(e.target.value)} /> Ⓝ
            </label>
            )}
            <label htmlFor="leasePrice">Non-exclusive license
              <input id="leasePrice" className="text pct" type="number" min="0" step="0.01" value={leasePrice}
                onChange={(e) => setLeasePrice(e.target.value)} /> Ⓝ
            </label>
            <label htmlFor="licenseUri">License text (optional)
              <input id="licenseUri" className="text" placeholder="ipfs://… or https://…" value={licenseUri}
                onChange={(e) => setLicenseUri(e.target.value)} />
            </label>
          </div>
          <p className="hint">0 = free remix / no non-exclusive licenses for sale. You can change it later as the owner.</p>

          <div className="bar">
            <button className="primary" onClick={submit} disabled={busy}>
              {busy ? step : 'Register beat'}
            </button>
          </div>
        </>
      )}

      {error && <p className="hint warn-text" role="alert">{error}</p>}
      {warning && <p className="hint">{warning}</p>}
      {sealStep && <p className="hint">{sealStep}</p>}
      {pendingSeal && !sealStep && (
        <div className="bar">
          <button className="primary" onClick={() => { setError(''); runSeal(pendingSeal.tokenId, pendingSeal.projectText); }}>
            Retry sealing beat #{pendingSeal.tokenId}
          </button>
        </div>
      )}
      {result && (
        <div className="success" role="status">
          <strong>Registered! Beat #{result.token_id}: {result.title}</strong>
          <span className="hint">Audio: ipfs://{result.audio_cid}</span>
          <span className="hint">Audio SHA-256: {result.audio_hash.slice(0, 16)}…</span>
          <span className="hint">
            {result.txHash && <><a href={explorerTxUrl(result.txHash)} target="_blank" rel="noreferrer">View transaction</a> · </>}
            <a href={explorerTokenUrl(CONTRACT_ID, result.token_id)} target="_blank" rel="noreferrer">View NFT on NearBlocks</a>
          </span>
          {result.musecure_fingerprint && (
            <span className="hint">MuSecure fingerprint: {result.musecure_fingerprint.slice(0, 16)}…</span>
          )}
        </div>
      )}
    </Panel>
  );
}
