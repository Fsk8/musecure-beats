import { useNear } from '../near/NearProvider';

/**
 * Un solo mensaje por estado de cuenta, igual en toda la app. No muestra nada si la cuenta está activa.
 * `what`: lo que la persona quiere hacer, en minúscula ("buy the license (0.5 Ⓝ)").
 */
export function AccountGate({ what }) {
  const { status, login, activate, activationError, error } = useNear();
  switch (status) {
    case 'active':
      return null;
    case 'signed-out':
      return <button onClick={login}>Sign in with email to {what}</button>;
    case 'creating':
    case 'activating':
      return <span className="hint">Setting up your NEAR account… one moment, then you can {what}.</span>;
    case 'inactive':
      return (
        <span className="gate">
          <button className="primary" onClick={activate}>{activationError ? 'Retry activation' : 'Activate account'}</button>
          <span className="hint">{activationError || `Free, one click. Then you can ${what}.`}</span>
        </span>
      );
    case 'error':
      return <span className="hint warn-text">Account problem: {error || 'unknown error'}. Sign out and sign in again.</span>;
    default: // 'no-auth'
      return <span className="hint">Sign-in is not available on this deployment.</span>;
  }
}

/** Confirmación antes de mover dinero, con el monto y adónde va. */
export function confirmPay(amountNear, what, detail = '') {
  return window.confirm(`${what} for ${amountNear} NEAR?${detail ? `\n\n${detail}` : ''}`);
}
