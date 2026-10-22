import { useState } from 'react';
import { useNear } from '../near/NearProvider';
import { shortAccount } from '../near/config';

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
    return <div className="account muted">Login desactivado: falta VITE_PRIVY_APP_ID en .env.local</div>;
  }
  if (status === 'signed-out') {
    return (
      <div className="account">
        <button className="primary" onClick={login}>Entrar con email</button>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="account">
        <span className="pill warn">{error}</span>
        <button onClick={logout}>Salir</button>
      </div>
    );
  }

  return (
    <div className="account">
      <span className="muted">{email}</span>
      {accountId ? (
        <button className="chip" onClick={copy} title={accountId}>
          {copied ? 'Copiada' : shortAccount(accountId)}
        </button>
      ) : (
        <span className="pill">Creando tu cuenta NEAR…</span>
      )}
      {status === 'active' && <span className="pill ok">{balance?.toFixed(3)} Ⓝ</span>}
      {status === 'activating' && <span className="pill">Activando tu cuenta…</span>}
      {status === 'inactive' && (
        <button className="pill warn" onClick={activate} title={activationError || 'Activar cuenta'}>
          {activationError ? 'No se pudo activar: reintentar' : 'Activar cuenta'}
        </button>
      )}
      <button onClick={logout}>Salir</button>
    </div>
  );
}
