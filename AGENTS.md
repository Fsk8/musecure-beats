# AGENTS.md — MuSecure Beats

Guide for coding agents and reviewers. Everything here can be checked in the code or on chain.

## What this is

A browser beat sequencer where each beat can be registered as an NFT on NEAR that **owns money**, **pays cascading royalties** to the beat it remixes, **controls its own EVM address** (NEAR Chain Signatures), can keep its project **sealed** to its owner, and can win weekly **Remix Battles** judged by an AI critic ("The Monk", running on NEAR AI Cloud). Built for the NEAR Hackathon (Nov 2026), tracks: NFTs, Games, Open.

- Live app: https://musecure-beats.vercel.app
- Contract (testnet): `musecure-beats-v2.testnet`
- Full product README: `README.md` (includes "Honest limits")

## Run and test

```bash
pnpm install
pnpm test            # JS unit tests (node:test, no network): music logic, MIDI export, critic features
pnpm test:contract   # Rust contract tests (cargo test, 68 tests): money flows, licenses, battles, migration
pnpm dev             # app on http://localhost:5173 (read-only without VITE_PRIVY_APP_ID)
pnpm build
```

Contract build/deploy: `contracts/beats/README.md` (`cargo near build non-reproducible-wasm`; upgrades use `migrate`).

## Map

| Path | What |
|---|---|
| `contracts/beats/src/lib.rs` | NEP-171 NFT + credits, royalties, licenses, sales, sealing, Chain Signatures |
| `contracts/beats/src/battles.rs` | Remix Battles: create, fund, settle (critic only) |
| `contracts/beats/src/ledger.rs` | History per NFT and buyer protections (v5) |
| `contracts/beats/src/dynamic.rs` | On-chain SVG cover, level and badges |
| `contracts/beats/src/tests.rs` | Contract unit tests |
| `api/` | Vercel functions: account activation, IPFS upload, collaborator wallets by email, MuSecure bridge (`musecure-*`), sealing (`seal-*`), the critic (`critic-run`) |
| `api/_lib/critic.js` | The Monk: musical features, NEAR AI call, TEE signature, IPFS report |
| `src/music/` | Pure logic: scales (`theory.js`), patterns and remix similarity (`patterns.js`), MIDI export (`midi.js`) |
| `src/audio/` | Tone.js engine (offline WAV render) and sound presets |
| `src/near/` | Privy + NEAR client: contract calls, sealing, MuSecure bridge, IPFS |
| `src/components/` | React UI (Gallery, Battles, Monk, RoyaltyTree, RegisterPanel, Guide, …) |
| `tests/` | JS tests |

## Claims → where to verify

| Claim | Code |
|---|---|
| Income splits 50 % owner / 50 % inside the NFT for authors | `lib.rs` `credit_income` |
| Anyone can trigger the authors' payout; it always goes to the authors | `lib.rs` `claim` |
| A remix sends 20 % of its authors' share up to the original, in cascade | `lib.rs` `remix`, `with_parent`, `claim` (`Recipient::Beat`) |
| Resale: 90 % seller, 10 % authors; NEP-199 payouts for marketplaces | `lib.rs` `buy`, `nft_payout` |
| Non-exclusive licenses are verifiable credentials | `lib.rs` `buy_lease`, `has_lease` |
| Each NFT has its own EVM address; only the current owner can make it sign | `lib.rs` `sign_for_beat`, `beat_account_path` |
| Sealed project: only the current owner can open it, access moves with a sale | `lib.rs` `set_sealed_project`; `api/_lib/seal.js` `verifyBeatSignature`, `decryptForBeat` |
| Cover, level and badges are generated on chain | `dynamic.rs` `svg`, `badges`, `level`; `lib.rs` `with_dynamic_metadata` |
| Only open remixes of the seed made inside the window can enter a battle | `battles.rs` `battle_entries` |
| The critic must score every entry; prizes 50/30/20 are paid as income of the winning NFTs | `battles.rs` `settle_battle` |
| The critic cannot move funds | `battles.rs` `settle_battle` takes no deposit; its key is a function-call key restricted to `settle_battle` (`contracts/beats/README.md`) |
| The Monk's reviews are signed by NEAR AI (TEE) and published with request/response | `api/_lib/critic.js` `nearAiReviews`, `judgeBattle` |
| Control of the NFT's account and access moves on transfer; the seller can't keep them | `lib.rs` `sign_for_beat`, `buy`, `on_owner_change`; `ledger.rs` `assert_signatures_settled` (threat model in README) |
| History per NFT: holders, prices, earned, paid to authors, signatures | `ledger.rs` `get_beat_history`, `record_holder`, `record_owner_income` |
| Exact duplicate audio is detected before registering | `lib.rs` `get_beats_by_fingerprint`; `src/components/RegisterPanel.jsx` (duplicate warning) |

Live transactions: the "Live proof" table in `README.md`.

## Conventions

- UI text in English; code comments in Spanish (the team's language).
- Secrets live only in server env vars (no `VITE_` prefix): see `.env.example`. Never commit `.env.local`.
- Money is handled in yoctoNEAR strings/`u128`; the contract holds funds and enforces every split.

## Known limits (also in README)

Trusted server pieces (activation, IPFS key, MuSecure bridge, critic server); remix similarity is checked in the app, not the contract; The Monk judges sequencer features, not audio; testnet only, not audited.
