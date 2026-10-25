# Contrato de MuSecure Beats (NEAR)

Cada beat registrado es un NFT (NEP-171) que guarda dinero. Separa dos derechos, como en la industria musical:

- **Autoría** (como el publishing): los créditos. No se venden ni se pierden. Los autores reciben el **50 %** de cada ingreso y un **10 %** de cada reventa del NFT.
- **Propiedad** (como el máster o una licencia exclusiva): el dueño del NFT. Recibe el otro **50 %** de los ingresos, decide la licencia de remix y puede vender el NFT. El texto de la licencia exclusiva se enlaza en `license_uri`.

Ingresos de un beat: licencias no exclusivas, licencias de remix, apoyos y la parte que le toca como original de sus remixes (el 20 % de la parte de autores del remix).

Tres tipos de licencia, como en el mercado de beats:

- **No exclusiva** (lease): muchas cuentas, precio fijo, pago exacto, una por cuenta. Mismas reglas que MuSecureLicensing.
- **Exclusiva**: la tiene el dueño del NFT. Cuando el NFT cambia de manos, se cierran las licencias no exclusivas nuevas; las ya compradas siguen valiendo.
- **Remix**: permiso para crear una obra derivada que queda acreditada al original.

Créditos como en MuSecureCredits: hasta 10 acreditados y la suma puede ser menor a 100 %; lo que falta es del creador.

| Método | Qué hace | Quién puede |
| --- | --- | --- |
| `register_beat(args)` | Registra un beat con créditos por conjunto o por pista. El contrato paga el almacenamiento. | Cualquiera |
| `remix(parent_id, args)` | Paga la licencia del original y registra el remix. | Cualquiera, si el dueño lo permite |
| `buy_lease(token_id)` | Compra una licencia no exclusiva (pago exacto, una por cuenta). | Cualquiera, mientras no se haya vendido la exclusiva |
| `support(token_id)` | Apoya un beat con NEAR (ingreso 50/50). | Cualquiera |
| `claim(token_id)` | Reparte el saldo de autores. Lo que toca al original entra como ingreso suyo. | Cualquiera |
| `withdraw()` | Retira tus ganancias como dueño de NFTs. | El dueño |
| `set_license(token_id, remix_price, remix_allowed)` | Cambia el precio de remix o cierra los remixes. | Solo el dueño |
| `set_lease_price(token_id, price)` | Precio de la licencia no exclusiva (0 = no se venden). | Solo el dueño |
| `list_for_sale(token_id, price)` | Pone el NFT a la venta (`null` lo retira). | Solo el dueño |
| `buy(token_id)` | Compra el NFT: 10 % a los autores, el resto al vendedor. | Cualquiera |
| `nft_payout`, `nft_transfer_payout` | NEP-199: regalías para marketplaces externos. | Marketplaces aprobados |
| `nft_approve`, `nft_revoke`… | NEP-178: aprobar a un marketplace. | Solo el dueño |
| `get_beat`, `get_beats`, `get_remixes`, `has_lease`, `get_beats_by_fingerprint`, `get_owner_earnings`, `total_beats` | Vistas (gratis). | Cualquiera |

Transferir o vender el NFT cambia quién recibe la parte de dueño, pero nunca la de autores.

## Probar

```bash
cargo test
```

## Desplegar en testnet (en tu Mac)

### 1. Herramientas (solo la primera vez)

```bash
# Rust (si no lo tienes)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# cargo-near y near-cli
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/latest/download/cargo-near-installer.sh | sh
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh
```

Este proyecto fija Rust 1.97 en `rust-toolchain.toml`; rustup lo instala solo la primera vez que corres `cargo` en esta carpeta.

### 2. Compilar

```bash
cd contracts/beats
cargo test
cargo near build non-reproducible-wasm
```

El resultado queda en `target/near/musecure_beats_contract.wasm`.

### 3. Crear la cuenta del contrato

Elige un nombre libre, por ejemplo `musecure-beats.testnet`:

```bash
near account create-account sponsor-by-faucet-service musecure-beats.testnet autogenerate-new-keypair save-to-keychain network-config testnet create
```

### 4. Desplegar e inicializar

```bash
near contract deploy musecure-beats.testnet use-file target/near/musecure_beats_contract.wasm with-init-call new json-args '{"owner_id":"musecure-beats.testnet","mpc_contract":"v1.signer-prod.testnet"}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-keychain send
```

### 5. Probar en testnet

Ver beats (gratis):

```bash
near contract call-function as-read-only musecure-beats.testnet get_beats json-args '{}' network-config testnet now
```

Registrar uno de prueba (con tu cuenta personal, que puedes crear igual que en el paso 3):

```bash
near contract call-function as-transaction musecure-beats.testnet register_beat json-args '{"args":{"title":"Prueba","audio_cid":"bafytest","project_cid":"bafytest","audio_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","project_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","remix_price":"0","license_uri":null,"lease_price":"0","musecure_fingerprint":null,"credits":{"Whole":{"credits":[{"account_id":"TU-CUENTA.testnet","bps":10000}]}}}}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as TU-CUENTA.testnet network-config testnet sign-with-keychain send
```

Si algún comando pide datos de forma interactiva, responde según lo que pregunte; near-cli completa el resto.

## Relación con MuSecure (Monad)

- **Mismo modelo de licencias:** las licencias no exclusivas siguen las reglas de MuSecureLicensing y los créditos las de MuSecureCredits.
- **Catálogo unido:** cada beat guarda `musecure_fingerprint`, la misma huella acústica que usa MuSecureRegistry como `fingerprintHash` (SHA-256 de 120 cuadros de chroma del audio, calculados con FFmpeg a 11025 Hz mono). Con `get_beats_by_fingerprint` la app muestra juntas las licencias de una obra en Monad y en NEAR.
- **Siguiente paso:** anclar cada registro también en MuSecureRegistry con Chain Signatures, para que una cuenta de NEAR registre la obra en Monad sin otra wallet. Falta confirmar el soporte de Monad Testnet.

## Decisiones actuales

- **50/50 entre dueño y autores** (`OWNER_BPS`), **10 % de regalía en reventas** (`RESALE_ROYALTY_BPS`) y **20 % al original** dentro de la parte de autores de un remix (`PARENT_BPS`). Son constantes para empezar; se pueden ajustar o volver configurables.
- **El contrato paga el almacenamiento** de cada registro, para que el usuario no necesite NEAR. En testnet basta con el saldo del faucet; para mainnet hará falta un límite por cuenta o que el relayer filtre.
- **Porcentajes en "bps"**: 10000 = 100 %. 6000 = 60 %.
- **Al cambiar de manos el NFT se cierran las licencias nuevas**, también si es un regalo y no una venta.
- **Títulos sin comillas ni barras invertidas**: los metadatos se arman como JSON y así no se pueden romper.


## v2: NFT dinámico y cuenta propia de cada beat

- **Portada on chain:** `nft_token`, `nft_tokens` y `nft_tokens_for_owner` devuelven `metadata.media` como un SVG
  (data URI) generado en cada lectura con las notas del beat (`art`), su nivel (1–10) y sus insignias
  (Original/Remix, Remixado, Semilla, Licenciado, Popular, Gana regalías, 1 NEAR ganado, Exclusiva vendida, Colaborativo).
  `metadata.extra` suma `level`, `badges`, `audio`, `remix_count` y `lease_count`. Nada de esto se guarda: siempre está al día.
- **Cuenta propia del beat en otras blockchains (Chain Signatures):** `sign_for_beat(token_id, payload)` pide al contrato MPC
  (`v1.signer-prod.testnet`) que firme con la clave derivada de *este contrato* y la ruta `beat-<id>`. Solo el dueño actual del
  NFT puede llamarlo (1 yoctoNEAR, ≥250 Tgas). Así cada NFT tiene su propia dirección EVM, y **al transferir el NFT, el control
  de esa dirección pasa al nuevo dueño** sin puentes. `beat_account_path(token_id)` devuelve la ruta.

El estado cambió (`art` en cada beat, `mpc_contract` en el contrato): la v2 se despliega en una cuenta nueva.

## v3: sealed projects

- `set_sealed_project(token_id, cid)` (owner only, once): stores the CID of the project encrypted with Lighthouse **to the NFT's own
  EVM address**, and closes remixes (they need the open project). `BeatView.sealed_cid` exposes it.
- Lighthouse releases the key only to a signature from that address, and only the current NFT owner can obtain one
  (`sign_for_beat`). Selling the NFT moves access to the buyer.
- Upgrade from v2 keeps every beat: deploy with `with-init-call migrate json-args '{}'`.

## v4: Remix Battles

Upgrade (keeps state):

```bash
cargo near build non-reproducible-wasm
near contract deploy musecure-beats-v2.testnet use-file target/near/musecure_beats_contract.wasm \
  with-init-call migrate json-args '{}' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```

Critic account with a key that can ONLY call `settle_battle` (0 deposit):

```bash
near account create-account fund-myself critic.musecure-beats-v2.testnet '1 NEAR' \
  autogenerate-new-keypair save-to-keychain sign-as musecure-beats-v2.testnet network-config testnet sign-with-keychain send
near account add-key critic.musecure-beats-v2.testnet grant-function-call-access \
  --allowance '0.5 NEAR' --contract-account-id musecure-beats-v2.testnet --function-names 'settle_battle' \
  autogenerate-new-keypair save-to-keychain network-config testnet sign-with-keychain send
# Opcional: borrar la full access key del crítico para que solo quede la restringida.
```

Admin (the `owner_id` from `new`):

```bash
near contract call-function as-transaction musecure-beats-v2.testnet set_critic \
  json-args '{"critic":"critic.musecure-beats-v2.testnet"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' \
  sign-as <ADMIN> network-config testnet sign-with-keychain send
near contract call-function as-transaction musecure-beats-v2.testnet create_battle \
  json-args '{"seed_id":"1","title":"Week 1","rules":"Keep the bassline, change the drums","starts_ms":"<ms>","ends_ms":"<ms>"}' \
  prepaid-gas '30 Tgas' attached-deposit '1 NEAR' sign-as <ADMIN> network-config testnet sign-with-keychain send
```
