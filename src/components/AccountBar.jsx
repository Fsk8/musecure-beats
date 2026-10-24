import { useCallback, useEffect, useState } from 'react';
import { useNear } from '../near/NearProvider';
import { explorerTxUrl, shortAccount } from '../near/config';
import { getOwnerEarnings, yoctoToNear } from '../near/contract';
import { payContract } from '../near/register';

/** Ganancias como dueño de NFTs (ventas de licencias, apoyos, remixes): se acumulan en el contrato hasta retirarlas. */
function Earnings() {
  const { provider, account, accountId, refresh } = useNear();
  const [earned, setEarned] = useState('0');
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    if (!accountId) return;
    getOwnerEarnings(provider, accountId).then(setEarned).catch(() => {});
  }, [provider, accountId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('msb:beats-changed', load);
    return () => window.removeEventListener('msb:beats-changed', load);
  }, [load]);

  async function withdraw() {
    setBusy(true);
    setErr('');
    try {
      setTx(await payContract(account, 'withdraw', {}));
      setEarned('0');
      setTimeout(refresh, 2000); // la transferencia llega en el bloque siguiente
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (tx) return <a className="pill ok" href={explorerTxUrl(tx)} target="_blank" rel="noreferrer">✓ Withdrawn · view transaction</a>;
  if (earned === '0') return null;
  return (
    <button className="pill ok" onClick={withdraw} disabled={busy} title={err || 'Withdraw your owner earnings to your account'}>
      {busy ? 'Withdrawing…' : `Earnings: ${yoctoToNear(earned)} Ⓝ · Withdraw`}
    </button>
  );
}

export function AccountBar() {
  const { status, accountId, balance, email, error, activationError, activate, login, logout } = useNear();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sin permiso de portapapeles: la cuenta sigue visible en el título del botón
    }
  };

  if (status === 'no-auth') {
    return <div className="account muted">Login disabled: VITE_PRIVY_APP_ID is missing in .env.local</div>;
  }
  if (status === 'signed-out') {
    return (
      <div className="account">
        <button className="primary" onClick={login}>Sign in with email</button>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="account">
        <span className="pill warn">{error}</span>
        <button onClick={logout}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="account">
      <span className="muted">{email}</span>
      {accountId ? (
        <button className="chip" onClick={copy} title={accountId}>
          {copied ? 'Copied' : shortAccount(accountId)}
        </button>
      ) : (
        <span className="pill">Creating your NEAR account…</span>
      )}
      {status === 'active' && <span className="pill ok">{balance?.toFixed(3)} Ⓝ</span>}
      {status === 'active' && <Earnings />}
      {status === 'activating' && <span className="pill">Activating your account…</span>}
      {status === 'inactive' && (
        <button className="pill warn" onClick={activate} title={activationError || 'Activate account'}>
          {activationError ? 'Activation failed: retry' : 'Activate account'}
        </button>
      )}
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
