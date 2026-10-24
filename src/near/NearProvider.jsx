// Contexto de NEAR: proveedor RPC para lecturas y, con sesión de Privy, la cuenta NEAR del usuario.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useCreateWallet, useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { JsonRpcProvider } from '@near-js/providers';
import { Account } from '@near-js/accounts';
import { NEAR } from '@near-js/tokens';
import { PRIVY_APP_ID, RPC_URL } from './config';
import { PrivySigner } from './privySigner';

const provider = new JsonRpcProvider({ url: RPC_URL });

/**
 * status:
 * - 'no-auth'   la app no tiene Privy configurado (solo lectura)
 * - 'signed-out'
 * - 'creating'  creando la wallet NEAR del usuario
 * - 'activating' pidiendo NEAR de patrocinio para crear la cuenta en la blockchain
 * - 'inactive'  la cuenta existe en Privy pero aún no en la blockchain (sin NEAR)
 * - 'active'
 * - 'error'
 */
const NearContext = createContext({
  provider,
  status: 'no-auth',
  accountId: '',
  account: null,
  balance: null,
  email: '',
  error: '',
  activationError: '',
  activate: () => {},
  login: () => {},
  logout: () => {},
  refresh: () => {},
  getAccessToken: async () => null,
});

export const useNear = () => useContext(NearContext);

export function NearRoot({ children }) {
  // Sin App ID la app funciona en solo lectura con el valor por defecto del contexto.
  if (!PRIVY_APP_ID) return children;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email'],
        appearance: { accentColor: '#e0563f', showWalletLoginFirst: false },
      }}
    >
      <PrivyNear>{children}</PrivyNear>
    </PrivyProvider>
  );
}

function PrivyNear({ children }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const [balance, setBalance] = useState(null);
  const [chainState, setChainState] = useState('checking');
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const creating = useRef(false);
  const autoActivated = useRef('');

  // Con el mismo App ID que MuSecure el usuario puede tener también una wallet EVM:
  // buscamos específicamente la de NEAR.
  const nearWallet = user?.linkedAccounts?.find((a) => a.type === 'wallet' && a.chainType === 'near');
  const accountId = nearWallet?.address || '';

  useEffect(() => {
    if (!ready || !authenticated || nearWallet || creating.current) return;
    creating.current = true;
    createWallet({ chainType: 'near' })
      .catch((e) => setError(`Could not create your NEAR account: ${e?.message || e}`))
      .finally(() => { creating.current = false; });
  }, [ready, authenticated, nearWallet, createWallet]);

  // Las funciones de Privy pueden cambiar de identidad en cada render. Si la cuenta dependiera de ellas,
  // se reconstruiría sin parar y dispararía consultas a la red en bucle. Por eso viven en refs y la
  // cuenta depende solo de su ID.
  const signRef = useRef(signRawHash);
  const tokenRef = useRef(getAccessToken);
  signRef.current = signRawHash;
  tokenRef.current = getAccessToken;

  const account = useMemo(
    () => (accountId
      ? new Account(accountId, provider, new PrivySigner((args) => signRef.current(args), accountId, provider))
      : null),
    [accountId],
  );

  // Al cambiar de cuenta, se vuelve a comprobar si existe en la red.
  useEffect(() => { setChainState('checking'); }, [accountId]);

  const refresh = useCallback(async () => {
    if (!account) return;
    try {
      const b = await account.getBalance();
      setBalance(Number(NEAR.toDecimal(b)));
      setChainState('active');
    } catch {
      // Una cuenta implícita no existe en la blockchain hasta que recibe NEAR.
      setBalance(0);
      setChainState('inactive');
    }
  }, [account]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Pide a /api/activate que envíe NEAR de patrocinio y espera a que la cuenta aparezca en la red. */
  const activate = useCallback(async () => {
    if (!account || !accountId) return;
    setActivating(true);
    setActivationError('');
    try {
      const token = await tokenRef.current();
      const r = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Activation failed (${r.status})`);
      for (let i = 0; i < 10; i++) {
        try {
          const b = await account.getBalance();
          setBalance(Number(NEAR.toDecimal(b)));
          setChainState('active');
          return;
        } catch {
          await new Promise((ok) => setTimeout(ok, 1500));
        }
      }
      throw new Error('The network is slow to confirm. Try again in a few seconds.');
    } catch (e) {
      setActivationError(e?.message || String(e));
    } finally {
      setActivating(false);
    }
  }, [account, accountId]);

  // Activación automática, una vez por cuenta.
  useEffect(() => {
    if (chainState === 'inactive' && accountId && autoActivated.current !== accountId) {
      autoActivated.current = accountId;
      activate();
    }
  }, [chainState, accountId, activate]);

  let status = 'signed-out';
  if (error) status = 'error';
  else if (authenticated && !accountId) status = 'creating';
  else if (authenticated && accountId && activating) status = 'activating';
  else if (authenticated && accountId) status = chainState === 'active' ? 'active' : chainState === 'inactive' ? 'inactive' : 'creating';

  const email = user?.email?.address || user?.google?.email || '';
  const finalStatus = ready ? status : 'creating';
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  const loginRef = useRef(login);
  loginRef.current = login;
  const doLogin = useCallback(() => loginRef.current(), []);
  const getToken = useCallback(() => tokenRef.current(), []);
  const doLogout = useCallback(async () => { setError(''); setBalance(null); await logoutRef.current(); }, []);

  // Un objeto estable: los componentes que usan la cuenta solo se redibujan cuando algo cambia de verdad.
  const value = useMemo(() => ({
    provider,
    status: finalStatus,
    accountId,
    account: finalStatus === 'active' ? account : null,
    balance,
    email,
    error,
    activationError,
    activate,
    login: doLogin,
    logout: doLogout,
    refresh,
    getAccessToken: getToken,
  }), [finalStatus, accountId, account, balance, email, error, activationError, activate, doLogin, doLogout, refresh, getToken]);
  return <NearContext.Provider value={value}>{children}</NearContext.Provider>;
}
