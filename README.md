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

## Estructura

```
src/
  music/theory.js     escalas, acordes, nombres de filas (sin audio)
  music/patterns.js   estado del beat, aleatorio, cuantizar, reto
  audio/engine.js     motor de audio con Tone.js
  state/useBeatState.js  estado persistido en localStorage
  components/         Transport, SoundPanel, Mixer, TrackEditor, Challenge
  App.jsx             une estado, motor y componentes
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
