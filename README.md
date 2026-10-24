# MuSecure Beats

Secuenciador musical en el navegador: haces un beat jugando y, más adelante, lo registras on chain con autoría, créditos y regalías por remix. Forma parte del ecosistema [MuSecure](https://github.com/Fsk8/MuSecure-Core-Functions).

Estado actual: prototipo de sonido, sin blockchain todavía. El beat se guarda en el navegador (localStorage).

## Qué hace hoy

- 4 pistas: batería, bajo, lead y acordes, cada una con volumen, mute, reverb y delay.
- Largo de 16, 32 o 64 pasos, con páginas de 16.
- Raíz, escala y modo: la melodía, el bajo y los acordes siempre siguen la escala elegida.
- Kits de batería: clásico, 808, acústico, lo-fi y andino (sintetizados).
- Velocidad y probabilidad por nota, swing, filtro maestro y arpegiador.
- Alinear pista (cuantizar) a corcheas o negras, con deshacer.
- "Sorpréndeme" por pista o para todo el beat.

## Cómo probarlo

1. `pnpm install` (si no tienes pnpm: `npm install -g pnpm`)
2. `pnpm dev` y abre la dirección que muestra la terminal (normalmente http://localhost:5173).
3. Presiona **▶ Tocar**: suena el beat de ejemplo.
4. Haz clic en una celda de la cuadrícula: la nota suena y queda marcada.
5. Cambia **Escala** a "Frigio": el mismo patrón suena en otro modo.
6. Presiona **Alinear pista**: las notas a destiempo pasan al pulso más cercano.

## Configuración (login y contrato)

1. Copia `.env.example` como `.env.local`.
2. Completa `VITE_PRIVY_APP_ID` con el App ID de tu app en [Privy](https://dashboard.privy.io/).
3. En el dashboard de Privy, agrega `http://localhost:5173` y tu dirección de Vercel como dominios permitidos.
4. Completa `LIGHTHOUSE_API_KEY` con tu API key de Lighthouse. No lleva el prefijo `VITE_`, así que solo la usa el servidor (`api/upload.js`) y nunca llega al navegador.
5. Para la activación automática de cuentas, completa `NEAR_SPONSOR_ACCOUNT_ID`, `NEAR_SPONSOR_PRIVATE_KEY` y `PRIVY_JWKS_URL` (ver `.env.example`). La cuenta patrocinadora regala 0,05 NEAR de testnet a cada usuario nuevo con sesión de Privy.
6. Para acreditar colaboradores por email, completa `PRIVY_APP_SECRET` (el mismo App Secret que usa MuSecure). El servidor le pide a Privy la cuenta NEAR ligada a ese email y la crea si la persona nunca entró, igual que `/api/resolve-collaborators` en MuSecure. El email no se guarda ni en la blockchain ni en IPFS.
7. En Vercel, agrega todas las variables en *Settings → Environment Variables*.

Sin App ID la app funciona igual, pero en solo lectura: se puede crear música y ver los beats registrados, sin iniciar sesión.

## Registro en MuSecure (Monad) con Chain Signatures

Cada beat registrado en NEAR se puede certificar también en MuSecure (Monad), sin wallets nuevas:

1. En la galería, abre **Detalles** de un beat tuyo y presiona **Registrar en MuSecure (Monad) con Chain Signatures**.
2. La app sube la metadata en el formato de MuSecure (`src/near/musecure.js`) y el servidor (`api/musecure-prepare.js`):
   comprueba que la cuenta NEAR y el beat son tuyos, calcula tu dirección EVM derivada (contrato MPC `v1.signer-prod.testnet`,
   ruta `musecure`), pide gas de testnet a la tesorería de MuSecure y la firma del score, y arma la transacción `registerWork`.
3. Tu cuenta NEAR firma una sola transacción al contrato MPC; la red MPC de NEAR devuelve la firma ECDSA de la transacción de Monad.
4. `api/musecure-broadcast.js` verifica que la firma corresponde a tu dirección derivada y la envía a Monad.

El beat aparece en el Explorer de MuSecure con el atributo "Origen: MuSecure Beats (NEAR)". Se registra con score 0 y la
metadata aclara que no pasó por el análisis de catálogo de MuSecure.

## Código reutilizado de MuSecure

`src/fingerprint/` es un port del worker de huella acústica de [MuSecure](https://github.com/Fsk8/MuSecure-Core-Functions) (`src/workers/audioFingerprint.worker.ts`), proyecto previo del mismo equipo. El algoritmo no cambia y se usan las mismas versiones de FFmpeg, para que el mismo audio produzca la misma huella en ambas apps. Está aislado como módulo para convertirlo más adelante en un paquete compartido del ecosistema (`@musecure/fingerprint`).

## Estructura

```
src/
  music/theory.js     escalas, acordes, nombres de filas (sin audio)
  music/patterns.js   estado del beat, aleatorio, cuantizar, reto
  audio/engine.js     motor de audio con Tone.js
  state/useBeatState.js  estado persistido en localStorage
  components/         Transport, SoundPanel, Mixer, TrackEditor, Challenge, AccountBar, Gallery
  near/               Privy + NEAR: configuración, firmante, cuenta, lecturas y registro
  fingerprint/        huella acústica de MuSecure (FFmpeg en un Web Worker)
  App.jsx             une estado, motor y componentes
api/upload.js         función de Vercel: sube a IPFS con Lighthouse (la clave queda en el servidor)
api/activate.js       función de Vercel: activa cuentas nuevas de Privy con NEAR de patrocinio
api/resolve-collaborators.js  función de Vercel: email del colaborador → su cuenta NEAR de Privy
api/_lib/             código compartido: verificación de sesión de Privy y puente a MuSecure (Chain Signatures)
api/musecure-*.js     funciones de Vercel para registrar beats en MuSecure (Monad)
contracts/beats/      contrato de NEAR en Rust (NFT NEP-171, créditos, remix, regalías)
```

El contrato tiene su propia guía en [contracts/beats/README.md](contracts/beats/README.md).

## Stack

React 18 + Vite 5, Tone.js 14, pnpm 10. Desplegado en Vercel.

pnpm no ejecuta scripts de instalación de dependencias por defecto. El de esbuild queda bloqueado y no hace falta: la build funciona sin él.

## Próximos pasos

- Login con Privy (cuenta NEAR por email) y gas patrocinado con meta transacciones (NEP-366).
- Contrato NFT (NEP-171) en NEAR testnet: registrar beat, créditos por pista o por conjunto, remix con regalías en cascada.
- Subir el WAV y el JSON del patrón a IPFS al registrar.
- Unir el catálogo con MuSecure (Monad) por la huella de audio, y más adelante anclar cada registro en MuSecureRegistry con Chain Signatures.
