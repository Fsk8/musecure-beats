// Registro de un beat: huellas SHA-256, subida a IPFS y llamada al contrato.
import { CONTRACT_ID } from './config';

const GAS = BigInt('30000000000000'); // 30 Tgas (un registro usa ~0,4 Tgas)

export async function sha256Hex(data) {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToIpfs(blob, filename) {
  const r = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': blob.type, 'X-Filename': filename },
    body: blob,
  });
  let data = {};
  try {
    data = await r.json();
  } catch {
    // respuesta vacía o no JSON
  }
  if (!r.ok || !data.cid) throw new Error(data.error || `Upload failed (${r.status})`);
  return data.cid;
}

/** "1.5" NEAR → "1500000000000000000000000" yocto. Vacío o 0 → "0". */
export function nearToYocto(value) {
  const s = String(value ?? '').trim().replace(',', '.');
  if (!s || Number(s) === 0) return '0';
  if (!/^\d+(\.\d{0,24})?$/.test(s)) throw new Error(`"${value}" is not a valid NEAR amount`);
  const [whole, frac = ''] = s.split('.');
  return (BigInt(whole) * 10n ** 24n + BigInt(frac.padEnd(24, '0'))).toString();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s) => String(s || '').includes('@');

/** Emails de todas las filas de créditos (en minúsculas, sin repetir). */
export function collectEmails(rowLists) {
  const out = new Set();
  for (const rows of rowLists) {
    for (const r of rows) {
      const v = r.account.trim().toLowerCase();
      if (!isEmail(v)) continue;
      if (!EMAIL_RE.test(v)) throw new Error(`"${r.account}" is not a valid email`);
      out.add(v);
    }
  }
  return [...out];
}

/**
 * Pide al servidor la cuenta NEAR de Privy de cada email (la crea si la persona nunca entró).
 * @returns {Promise<Record<string,string>>} email → cuenta NEAR
 */
export async function resolveEmails(emails, getAccessToken) {
  if (!emails.length) return {};
  const token = await getAccessToken();
  const r = await fetch('/api/resolve-collaborators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ emails }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Could not resolve the emails (${r.status})`);
  if (data.failed?.length) {
    throw new Error(`Could not prepare an account for: ${data.failed.join(', ')}. Ask them to sign in to MuSecure Beats once with that email, or use their NEAR account.`);
  }
  return data.accounts || {};
}

const ACCOUNT_RE = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/** Valida una lista [{account, pct}] y la convierte al formato del contrato. */
export function toCredits(rows, what, emailMap = {}) {
  const out = [];
  const seen = new Set();
  let total = 0;
  for (const row of rows) {
    const typed = row.account.trim().toLowerCase();
    if (!typed && !row.pct) continue;
    const account = isEmail(typed) ? emailMap[typed] || '' : typed;
    if (isEmail(typed) && !account) throw new Error(`${what}: missing account for ${typed}`);
    if (!ACCOUNT_RE.test(account) || account.length < 2 || account.length > 64) {
      throw new Error(`${what}: "${row.account}" is not a valid NEAR account`);
    }
    if (seen.has(account)) throw new Error(`${what}: ${typed} appears twice (or is the same account as another entry)`);
    seen.add(account);
    const bps = Math.round(Number(row.pct) * 100);
    if (!Number.isFinite(bps) || bps <= 0) throw new Error(`${what}: the percentage for ${account} must be greater than 0`);
    total += bps;
    out.push({ account_id: account, bps });
  }
  if (total > 10000) throw new Error(`${what}: percentages add up to more than 100 %`);
  if (out.length > 10) throw new Error(`${what}: at most 10 credited accounts`);
  return out;
}

/**
 * Llama a un método del contrato (licencias, apoyos, cobros). `depositYocto` es lo que se paga ("0" si nada).
 * Devuelve el hash de la transacción.
 */
export async function payContract(account, methodName, args, depositYocto = '0') {
  const outcome = await account.callFunctionRaw({
    contractId: CONTRACT_ID,
    methodName,
    args,
    gas: GAS * 2n, // claim puede transferir a varios acreditados
    deposit: BigInt(depositYocto),
  });
  const failure = outcome?.status?.Failure;
  if (failure) throw new Error(contractError(failure));
  return outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
}

/** Extrae el mensaje del contrato (los require! en español) de un error de ejecución. */
export function contractError(failure) {
  const text = JSON.stringify(failure);
  const m = text.match(/Smart contract panicked: ([^"\\]+)/);
  return m ? m[1] : `The contract rejected the operation: ${text}`;
}

/**
 * Registra el beat. Si `remixOf` viene, se registra como remix de ese beat pagando su licencia de remix.
 * Devuelve el beat creado y el hash de la transacción (para el explorador).
 */
export async function registerBeat(account, args, remixOf = null) {
  const outcome = await account.callFunctionRaw({
    contractId: CONTRACT_ID,
    methodName: remixOf ? 'remix' : 'register_beat',
    args: remixOf ? { parent_id: remixOf.token_id, args } : { args },
    gas: remixOf ? GAS * 2n : GAS,
    deposit: remixOf ? BigInt(remixOf.remix_price || '0') : 0n,
  });
  const failure = outcome?.status?.Failure;
  if (failure) throw new Error(contractError(failure));
  const value = outcome?.status?.SuccessValue;
  // base64 → bytes → UTF-8 (los títulos pueden tener tildes y ñ).
  const beat = value ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)))) : null;
  return { ...beat, txHash: outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null };
}
