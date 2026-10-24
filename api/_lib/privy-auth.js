// Verificación de la sesión de Privy (token de acceso), compartida por las funciones de /api.
// La carpeta empieza con "_" para que Vercel no la publique como ruta.
import { createRemoteJWKSet, importSPKI, jwtVerify } from 'jose';

let jwks = null;
/** Claves públicas de Privy, descargadas y guardadas en caché por jose. */
function getJwks(url) {
  if (!jwks) jwks = createRemoteJWKSet(new URL(url));
  return jwks;
}

export async function verifyPrivy(req) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw Object.assign(new Error('Missing Privy session'), { status: 401 });
  const key = process.env.PRIVY_JWKS_URL
    ? getJwks(process.env.PRIVY_JWKS_URL)
    : await importSPKI((process.env.PRIVY_VERIFICATION_KEY || '').replace(/\\n/g, '\n'), 'ES256');
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: 'privy.io',
      audience: process.env.VITE_PRIVY_APP_ID,
      algorithms: ['ES256'],
    });
    return payload.sub;
  } catch {
    throw Object.assign(new Error('Invalid or expired Privy session. Please sign in again.'), { status: 401 });
  }
}

