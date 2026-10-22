// Configuración de NEAR y Privy. Los valores vienen de .env.local (ver .env.example).

export const NETWORK_ID = 'testnet';
export const RPC_URL = 'https://test.rpc.fastnear.com';
export const CONTRACT_ID = import.meta.env.VITE_NEAR_CONTRACT || 'musecure-beats-favio.testnet';
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

export const explorerAccountUrl = (accountId) => `https://testnet.nearblocks.io/address/${accountId}`;
export const explorerTxUrl = (hash) => `https://testnet.nearblocks.io/txns/${hash}`;

/** Cuentas implícitas (64 hex) se acortan para mostrarlas. */
export const shortAccount = (id = '') => (id.length > 24 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
