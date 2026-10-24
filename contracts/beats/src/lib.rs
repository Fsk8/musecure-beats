//! MuSecure Beats: cada beat registrado es un NFT (NEP-171) que guarda dinero.
//!
//! Dos derechos separados, como en la industria musical:
//! - **Autoría** (como el publishing): los créditos. No se venden ni se pierden.
//!   Los autores reciben la mitad de cada ingreso y una regalía en cada reventa del NFT.
//! - **Propiedad** (como el máster o una licencia exclusiva): el dueño del NFT.
//!   Recibe la otra mitad de los ingresos, decide la licencia de remix y puede vender el NFT.
//!
//! Ingresos de un beat: licencias no exclusivas, licencias de remix, apoyos y la parte que le toca
//! como original de sus remixes.
//!
//! Licencias, como en el mercado de beats:
//! - **No exclusiva** (lease): muchas cuentas, precio fijo, una por cuenta. Mismas reglas que
//!   MuSecureLicensing en Monad. Se cierran al cambiar de manos la exclusiva; las ya compradas siguen.
//! - **Exclusiva**: la tiene el dueño del NFT.
//! - **Remix**: permiso para crear una obra derivada que queda acreditada al original.
//!
//! Créditos como en MuSecureCredits: pueden sumar menos de 100 %; el resto es del creador.
//! El contrato paga el almacenamiento de cada registro, para que el usuario no necesite NEAR
//! (el gas lo paga el relayer con meta transacciones).

use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApproval;
use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::events::NftMint;
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, NonFungibleTokenResolver, Token, TokenId};
use near_sdk::collections::LazyOption;
use near_sdk::json_types::{U128, U64};
use near_sdk::store::{LookupMap, LookupSet};
use near_sdk::{
    assert_one_yocto, env, near, require, AccountId, BorshStorageKey, Gas, GasWeight, NearToken, PanicOnDefault,
    Promise, PromiseOrValue,
};

mod dynamic;
use dynamic::{beat_path, svg, svg_data_uri, validate_art, Stats};

/// Contrato MPC de Chain Signatures en testnet.
pub const DEFAULT_MPC_CONTRACT: &str = "v1.signer-prod.testnet";
use std::collections::HashMap;

/// Base de los porcentajes: 10000 = 100 %.
pub const BPS: u32 = 10_000;
/// Parte de cada ingreso que va al dueño del NFT (el resto, a los autores).
pub const OWNER_BPS: u32 = 5_000;
/// Parte de lo que gana un remix que va al beat original, dentro de la parte de autores (20 %).
pub const PARENT_BPS: u32 = 2_000;
/// Regalía para los autores en cada reventa del NFT (10 %).
pub const RESALE_ROYALTY_BPS: u32 = 1_000;
pub const MAX_CREDITS: usize = 10;
pub const TRACK_COUNT: usize = 4;
/// Profundidad máxima al resolver originales en cascada para marketplaces externos (NEP-199).
const MAX_PAYOUT_DEPTH: u8 = 3;
const MAX_TITLE: usize = 60;
const MAX_CID: usize = 100;
const MAX_URI: usize = 200;

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    NonFungibleToken,
    Metadata,
    TokenMetadata,
    Enumeration,
    Approval,
    Beats,
    Remixes,
    OwnerEarnings,
    Leases,
    ByFingerprint,
    Sealed,
}

/// A quién va una parte de los ingresos de autoría: una cuenta o otro beat (el original de un remix).
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum Recipient {
    Account(AccountId),
    Beat(TokenId),
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Split {
    pub recipient: Recipient,
    pub bps: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Credit {
    pub account_id: AccountId,
    pub bps: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct TrackCredits {
    /// "Batería", "Bajo", "Lead", "Acordes".
    pub name: String,
    /// Peso de la pista en el beat (las 4 suman 10000).
    pub weight_bps: u32,
    pub credits: Vec<Credit>,
}

/// Cómo se acredita el beat: una lista para todo o una por pista.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum Credits {
    Whole { credits: Vec<Credit> },
    PerTrack { tracks: Vec<TrackCredits> },
}

#[near(serializers = [borsh])]
pub struct Beat {
    pub creator: AccountId,
    pub title: String,
    pub audio_cid: String,
    pub project_cid: String,
    pub audio_hash: String,
    pub project_hash: String,
    /// Texto de la licencia exclusiva que tiene el dueño del NFT (por ejemplo, ipfs://...).
    pub license_uri: Option<String>,
    pub created_at_ms: u64,
    pub parent_id: Option<TokenId>,
    pub remix_price: NearToken,
    pub remix_allowed: bool,
    pub credits: Credits,
    /// Reparto de la parte de autores, ya calculado (incluye al original si es un remix).
    pub payout: Vec<Split>,
    /// Saldo de autores pendiente de repartir con `claim`.
    pub authors_balance: NearToken,
    /// Todo lo que ha generado el beat (ingresos + regalías de reventa).
    pub total_earned: NearToken,
    pub remix_count: u32,
    /// Precio si el dueño lo puso a la venta.
    pub sale_price: Option<NearToken>,
    /// Precio de la licencia no exclusiva. 0 = no se venden.
    pub lease_price: NearToken,
    pub lease_count: u32,
    /// true cuando la exclusiva cambió de manos: ya no se venden licencias nuevas.
    pub exclusive_sold: bool,
    /// Huella de MuSecure (SHA-256 del fingerprint Chromaprint) para unir el catálogo con Monad.
    pub musecure_fingerprint: Option<String>,
    /// Notas del beat en forma compacta para dibujar la portada on chain (ver `dynamic::validate_art`).
    pub art: Option<String>,
}

#[near(serializers = [json])]
pub struct RegisterArgs {
    pub title: String,
    pub audio_cid: String,
    pub project_cid: String,
    /// SHA-256 en hexadecimal (64 caracteres) del WAV y del JSON del proyecto.
    pub audio_hash: String,
    pub project_hash: String,
    /// Precio de la licencia para remezclar este beat. "0" = remix libre.
    pub remix_price: NearToken,
    pub credits: Credits,
    pub license_uri: Option<String>,
    /// Precio de la licencia no exclusiva. "0" = no se venden.
    pub lease_price: NearToken,
    /// Opcional: huella de la misma obra en MuSecure (64 hex).
    pub musecure_fingerprint: Option<String>,
    /// Opcional: notas compactas para la portada dinámica.
    pub art: Option<String>,
}

#[near(serializers = [json])]
pub struct BeatView {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub creator: AccountId,
    pub title: String,
    pub audio_cid: String,
    pub project_cid: String,
    pub audio_hash: String,
    pub project_hash: String,
    pub license_uri: Option<String>,
    pub created_at_ms: U64,
    pub parent_id: Option<TokenId>,
    pub remix_price: NearToken,
    pub remix_allowed: bool,
    pub credits: Credits,
    pub payout: Vec<Split>,
    pub authors_balance: NearToken,
    pub total_earned: NearToken,
    pub remix_count: u32,
    pub sale_price: Option<NearToken>,
    pub lease_price: NearToken,
    pub lease_count: u32,
    pub exclusive_sold: bool,
    pub musecure_fingerprint: Option<String>,
    pub art: Option<String>,
    /// CID del proyecto cifrado si está sellado (solo el dueño del NFT puede abrirlo).
    pub sealed_cid: Option<String>,
    /// NFT dinámico: nivel (1–10) e insignias, calculados en cada lectura.
    pub level: u32,
    pub badges: Vec<String>,
}

/// NEP-199: a quién paga un marketplace externo al vender el NFT.
#[near(serializers = [json])]
#[derive(Debug)]
pub struct Payout {
    pub payout: HashMap<AccountId, U128>,
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    beats: LookupMap<TokenId, Beat>,
    remixes: LookupMap<TokenId, Vec<TokenId>>,
    /// Ganancias de dueños pendientes de retirar con `withdraw`.
    owner_earnings: LookupMap<AccountId, NearToken>,
    /// "token_id:cuenta" de quienes compraron licencia no exclusiva.
    leases: LookupSet<String>,
    /// Huella de MuSecure -> beats registrados con ella.
    by_fingerprint: LookupMap<String, Vec<TokenId>>,
    next_id: u64,
    /// Contrato MPC de Chain Signatures: firma por la cuenta propia de cada beat en otras blockchains.
    mpc_contract: AccountId,
    /// Proyecto sellado: CID del proyecto cifrado (Lighthouse) a nombre de la cuenta propia del beat.
    /// Solo quien puede firmar por esa cuenta (el dueño del NFT) obtiene la llave.
    sealed: LookupMap<TokenId, String>,
}

/// Estado de la v2 (antes de los proyectos sellados), para migrar sin perder beats.
#[near(serializers = [borsh])]
struct ContractV2 {
    tokens: NonFungibleToken,
    metadata: LazyOption<NFTContractMetadata>,
    beats: LookupMap<TokenId, Beat>,
    remixes: LookupMap<TokenId, Vec<TokenId>>,
    owner_earnings: LookupMap<AccountId, NearToken>,
    leases: LookupSet<String>,
    by_fingerprint: LookupMap<String, Vec<TokenId>>,
    next_id: u64,
    mpc_contract: AccountId,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId, mpc_contract: Option<AccountId>) -> Self {
        let metadata = NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "MuSecure Beats".to_string(),
            symbol: "MSBEAT".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        };
        Self {
            tokens: NonFungibleToken::new(
                StorageKey::NonFungibleToken,
                owner_id,
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                Some(StorageKey::Approval),
            ),
            metadata: LazyOption::new(StorageKey::Metadata, Some(&metadata)),
            beats: LookupMap::new(StorageKey::Beats),
            remixes: LookupMap::new(StorageKey::Remixes),
            owner_earnings: LookupMap::new(StorageKey::OwnerEarnings),
            leases: LookupSet::new(StorageKey::Leases),
            by_fingerprint: LookupMap::new(StorageKey::ByFingerprint),
            next_id: 1,
            mpc_contract: mpc_contract.unwrap_or_else(|| DEFAULT_MPC_CONTRACT.parse().unwrap()),
            sealed: LookupMap::new(StorageKey::Sealed),
        }
    }

    /// Migra el estado de la v2 agregando los proyectos sellados. Lo llama el propio contrato al actualizarse.
    #[private]
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let old: ContractV2 = env::state_read().unwrap_or_else(|| env::panic_str("No v2 state to migrate"));
        Self {
            tokens: old.tokens,
            metadata: old.metadata,
            beats: old.beats,
            remixes: old.remixes,
            owner_earnings: old.owner_earnings,
            leases: old.leases,
            by_fingerprint: old.by_fingerprint,
            next_id: old.next_id,
            mpc_contract: old.mpc_contract,
            sealed: LookupMap::new(StorageKey::Sealed),
        }
    }

    // ---------- crear

    /// Registra un beat nuevo. El NFT queda a nombre de quien llama.
    pub fn register_beat(&mut self, args: RegisterArgs) -> BeatView {
        let payout = own_payout(&args.credits, &env::predecessor_account_id());
        self.internal_register(args, None, payout)
    }

    /// Remezcla un beat: hay que adjuntar al menos su `remix_price`, que entra como ingreso del original.
    #[payable]
    pub fn remix(&mut self, parent_id: TokenId, args: RegisterArgs) -> BeatView {
        let attached = env::attached_deposit();
        {
            let parent = self.beat(&parent_id);
            require!(parent.remix_allowed, "The owner of this beat does not allow remixes right now");
            require!(
                attached >= parent.remix_price,
                format!("The remix license costs {} yoctoNEAR", parent.remix_price.as_yoctonear())
            );
        }
        self.beat_mut(&parent_id).remix_count += 1;
        self.credit_income(&parent_id, attached);

        let payout = with_parent(&parent_id, own_payout(&args.credits, &env::predecessor_account_id()));
        let view = self.internal_register(args, Some(parent_id.clone()), payout);

        let mut children = self.remixes.get(&parent_id).cloned().unwrap_or_default();
        children.push(view.token_id.clone());
        self.remixes.insert(parent_id.clone(), children);

        log_event(
            "remix",
            &format!(
                r#"{{"parent_id":"{}","token_id":"{}","paid":"{}"}}"#,
                parent_id,
                view.token_id,
                attached.as_yoctonear()
            ),
        );
        view
    }

    // ---------- cuenta propia del beat en otras blockchains (Chain Signatures)

    /// Firma `payload` (hash de 32 bytes en hex) con la clave de la cuenta propia de este beat.
    /// La clave la deriva la red MPC de NEAR a partir de este contrato y la ruta `beat-<id>`:
    /// el beat tiene su propia dirección en Monad, Ethereum, etc. Solo el dueño actual del NFT puede
    /// pedir firmas, así que **al vender el NFT, el control de esas cuentas pasa al comprador**.
    /// Adjunta 1 yoctoNEAR y ~300 Tgas; el gas restante se reenvía al contrato MPC.
    #[payable]
    pub fn sign_for_beat(&mut self, token_id: TokenId, payload: String) -> Promise {
        assert_one_yocto();
        require!(
            env::predecessor_account_id() == self.owner_of(&token_id),
            "Only the NFT owner can sign for the beat account"
        );
        require!(
            payload.len() == 64 && payload.chars().all(|c| c.is_ascii_hexdigit()),
            "payload: must be 32 bytes in hex"
        );
        require!(env::prepaid_gas() >= Gas::from_tgas(250), "Attach at least 250 Tgas");
        log_event(
            "sign_for_beat",
            &format!(r#"{{"token_id":"{}","path":"{}","payload":"{}"}}"#, token_id, beat_path(&token_id), payload.to_lowercase()),
        );
        let args = format!(
            r#"{{"request":{{"payload_v2":{{"Ecdsa":"{}"}},"path":"{}","domain_id":0}}}}"#,
            payload.to_lowercase(),
            beat_path(&token_id)
        );
        Promise::new(self.mpc_contract.clone()).function_call_weight(
            "sign".to_string(),
            args.into_bytes(),
            NearToken::from_yoctonear(1),
            Gas::from_tgas(0),
            GasWeight(1),
        )
    }

    /// Sella el proyecto: guarda el CID del proyecto cifrado a nombre de la cuenta propia del beat
    /// (solo el dueño del NFT puede abrirlo) y cierra los remixes, que necesitan el proyecto abierto.
    /// Se puede llamar una sola vez por beat.
    pub fn set_sealed_project(&mut self, token_id: TokenId, cid: String) {
        self.assert_owner(&token_id);
        validate_text(&cid, 1, MAX_CID, "The sealed project CID");
        require!(!self.sealed.contains_key(&token_id), "The project is already sealed");
        self.beat_mut(&token_id).remix_allowed = false;
        log_event("seal", &format!(r#"{{"token_id":"{}","cid":"{}"}}"#, token_id, cid));
        self.sealed.insert(token_id, cid);
    }

    /// Ruta de derivación de la cuenta propia del beat (para calcular su dirección con el contrato MPC).
    pub fn beat_account_path(&self, token_id: TokenId) -> String {
        self.beat(&token_id);
        beat_path(&token_id)
    }

    pub fn get_mpc_contract(&self) -> AccountId {
        self.mpc_contract.clone()
    }

    /// Portada dinámica del beat como data URI (la misma que muestra `nft_token`).
    pub fn beat_media(&self, token_id: TokenId) -> String {
        let b = self.beat(&token_id);
        svg_data_uri(&svg(&b.title, &token_id, b.art.as_deref(), &self.stats(&token_id)))
    }

    // ---------- ingresos y cobros

    /// Apoya un beat con NEAR: mitad para el dueño, mitad para los autores.
    #[payable]
    pub fn support(&mut self, token_id: TokenId) {
        let attached = env::attached_deposit();
        require!(attached > NearToken::from_yoctonear(0), "Attach NEAR to support the beat");
        self.beat(&token_id);
        self.credit_income(&token_id, attached);
        log_event("support", &format!(r#"{{"token_id":"{}","amount":"{}"}}"#, token_id, attached.as_yoctonear()));
    }

    /// Reparte el saldo de autores de un beat según su `payout`. Cualquiera puede llamarlo:
    /// el dinero siempre va a los acreditados. Lo que toca al original entra como ingreso suyo.
    pub fn claim(&mut self, token_id: TokenId) -> NearToken {
        let (balance, payout) = {
            let beat = self.beat(&token_id);
            (beat.authors_balance.as_yoctonear(), beat.payout.clone())
        };
        require!(balance > 0, "This beat has no authors' balance to distribute");

        let mut distributed: u128 = 0;
        for split in &payout {
            let amount = balance * split.bps as u128 / BPS as u128;
            if amount == 0 {
                continue;
            }
            match &split.recipient {
                Recipient::Account(account) => {
                    // La transferencia se programa al soltar la promesa.
                    let _ = Promise::new(account.clone()).transfer(NearToken::from_yoctonear(amount));
                }
                Recipient::Beat(parent_id) => self.credit_income(parent_id, NearToken::from_yoctonear(amount)),
            }
            distributed += amount;
        }

        // El redondeo (unos pocos yocto) queda en el saldo del beat.
        self.beat_mut(&token_id).authors_balance = NearToken::from_yoctonear(balance - distributed);
        log_event("claim", &format!(r#"{{"token_id":"{}","amount":"{}"}}"#, token_id, distributed));
        NearToken::from_yoctonear(distributed)
    }

    /// Retira las ganancias acumuladas como dueño de NFTs.
    pub fn withdraw(&mut self) -> NearToken {
        let account = env::predecessor_account_id();
        let amount = self.owner_earnings.remove(&account).unwrap_or(NearToken::from_yoctonear(0));
        require!(amount > NearToken::from_yoctonear(0), "You have no owner earnings to withdraw");
        let _ = Promise::new(account.clone()).transfer(amount);
        log_event("withdraw", &format!(r#"{{"account_id":"{}","amount":"{}"}}"#, account, amount.as_yoctonear()));
        amount
    }

    // ---------- licencias no exclusivas (mismas reglas que MuSecureLicensing)

    /// Compra una licencia no exclusiva pagando EXACTAMENTE el precio vigente. Una por cuenta.
    /// El pago exacto protege al comprador si el precio cambia mientras su transacción está pendiente.
    #[payable]
    pub fn buy_lease(&mut self, token_id: TokenId) {
        let buyer = env::predecessor_account_id();
        let attached = env::attached_deposit();
        {
            let beat = self.beat(&token_id);
            require!(!beat.exclusive_sold, "The exclusive for this beat was already sold: no new licenses");
            require!(!beat.lease_price.is_zero(), "This beat does not sell non-exclusive licenses");
            require!(attached == beat.lease_price, format!("The payment must be exactly {} yoctoNEAR", beat.lease_price.as_yoctonear()));
        }
        let key = lease_key(&token_id, &buyer);
        require!(!self.leases.contains(&key), "You already hold a license for this beat");
        self.leases.insert(key);
        self.beat_mut(&token_id).lease_count += 1;
        self.credit_income(&token_id, attached);
        log_event("lease", &format!(
            r#"{{"token_id":"{}","buyer":"{}","price":"{}"}}"#, token_id, buyer, attached.as_yoctonear()
        ));
    }

    // ---------- dueño del NFT

    /// El dueño fija el precio de la licencia no exclusiva (0 = dejar de venderlas).
    pub fn set_lease_price(&mut self, token_id: TokenId, price: NearToken) {
        self.assert_owner(&token_id);
        let beat = self.beat_mut(&token_id);
        require!(!beat.exclusive_sold || price.is_zero(), "The exclusive was already sold: new licenses cannot be opened");
        beat.lease_price = price;
    }

    /// El dueño decide el precio de remix y si se permite remezclar.
    pub fn set_license(&mut self, token_id: TokenId, remix_price: NearToken, remix_allowed: bool) {
        self.assert_owner(&token_id);
        require!(
            !(remix_allowed && self.sealed.contains_key(&token_id)),
            "This beat's project is sealed: remixes need the open project"
        );
        let beat = self.beat_mut(&token_id);
        beat.remix_price = remix_price;
        beat.remix_allowed = remix_allowed;
    }

    /// Pone el NFT a la venta (o lo retira con `price: null`).
    pub fn list_for_sale(&mut self, token_id: TokenId, price: Option<NearToken>) {
        self.assert_owner(&token_id);
        if let Some(p) = price {
            require!(p > NearToken::from_yoctonear(0), "The price must be greater than 0");
        }
        self.beat_mut(&token_id).sale_price = price;
    }

    /// Compra un NFT a la venta. El 10 % va a los autores y el resto al vendedor; el sobrante se devuelve.
    #[payable]
    pub fn buy(&mut self, token_id: TokenId) {
        let buyer = env::predecessor_account_id();
        let attached = env::attached_deposit();
        let seller = self.owner_of(&token_id);
        let price = self.beat(&token_id).sale_price.unwrap_or_else(|| env::panic_str("This beat is not for sale"));
        require!(buyer != seller, "You already own this beat");
        require!(attached >= price, format!("The price is {} yoctoNEAR", price.as_yoctonear()));

        let royalty = NearToken::from_yoctonear(price.as_yoctonear() * RESALE_ROYALTY_BPS as u128 / BPS as u128);
        {
            let beat = self.beat_mut(&token_id);
            beat.authors_balance = beat.authors_balance.saturating_add(royalty);
            beat.total_earned = beat.total_earned.saturating_add(royalty);
        }
        self.on_owner_change(&token_id);
        self.tokens.internal_transfer(&seller, &buyer, &token_id, None, Some("Purchase on MuSecure Beats".into()));

        let _ = Promise::new(seller.clone()).transfer(price.saturating_sub(royalty));
        let change = attached.saturating_sub(price);
        if change > NearToken::from_yoctonear(0) {
            let _ = Promise::new(buyer.clone()).transfer(change);
        }
        log_event(
            "sale",
            &format!(
                r#"{{"token_id":"{}","seller":"{}","buyer":"{}","price":"{}","royalty":"{}"}}"#,
                token_id,
                seller,
                buyer,
                price.as_yoctonear(),
                royalty.as_yoctonear()
            ),
        );
    }

    // ---------- vistas

    pub fn get_beat(&self, token_id: TokenId) -> Option<BeatView> {
        self.view(&token_id)
    }

    /// Beats del más nuevo al más antiguo.
    pub fn get_beats(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<BeatView> {
        let skip = from_index.unwrap_or(0);
        let limit = limit.unwrap_or(20).min(50);
        let newest = self.next_id.saturating_sub(1);
        (1..=newest)
            .rev()
            .skip(skip as usize)
            .take(limit as usize)
            .filter_map(|id| self.view(&id.to_string()))
            .collect()
    }

    pub fn get_remixes(&self, token_id: TokenId) -> Vec<TokenId> {
        self.remixes.get(&token_id).cloned().unwrap_or_default()
    }

    pub fn has_lease(&self, token_id: TokenId, account_id: AccountId) -> bool {
        self.leases.contains(&lease_key(&token_id, &account_id))
    }

    /// Beats registrados con esa huella de MuSecure (la misma obra en Monad).
    pub fn get_beats_by_fingerprint(&self, fingerprint: String) -> Vec<BeatView> {
        self.by_fingerprint
            .get(&fingerprint.to_lowercase())
            .map(|ids| ids.iter().filter_map(|id| self.view(id)).collect())
            .unwrap_or_default()
    }

    pub fn get_owner_earnings(&self, account_id: AccountId) -> NearToken {
        self.owner_earnings.get(&account_id).copied().unwrap_or(NearToken::from_yoctonear(0))
    }

    pub fn total_beats(&self) -> u64 {
        self.next_id - 1
    }

    // ---------- NEP-199: regalías para marketplaces externos

    /// Cómo repartir `balance` si el NFT se vende: 10 % a los autores (resolviendo originales) y el resto al dueño.
    pub fn nft_payout(&self, token_id: TokenId, balance: U128, max_len_payout: Option<u32>) -> Payout {
        let owner = self.owner_of(&token_id);
        let total = balance.0;
        let royalty = total * RESALE_ROYALTY_BPS as u128 / BPS as u128;

        let mut map: HashMap<AccountId, u128> = HashMap::new();
        let mut paid = 0u128;
        for (account, bps) in self.author_accounts(&token_id, MAX_PAYOUT_DEPTH) {
            let amount = royalty * bps as u128 / BPS as u128;
            *map.entry(account).or_insert(0) += amount;
            paid += amount;
        }
        *map.entry(owner).or_insert(0) += total - paid;

        if let Some(max) = max_len_payout {
            require!(map.len() as u32 <= max, "The payout has more receivers than max_len_payout");
        }
        Payout { payout: map.into_iter().map(|(a, v)| (a, U128(v))).collect() }
    }

    #[payable]
    pub fn nft_transfer_payout(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        balance: U128,
        max_len_payout: Option<u32>,
    ) -> Payout {
        assert_one_yocto();
        let payout = self.nft_payout(token_id.clone(), balance, max_len_payout);
        self.on_owner_change(&token_id);
        self.tokens.internal_transfer(&env::predecessor_account_id(), &receiver_id, &token_id, approval_id, memo);
        payout
    }

    // ---------- interno

    fn beat(&self, token_id: &TokenId) -> &Beat {
        self.beats.get(token_id).unwrap_or_else(|| env::panic_str("The beat does not exist"))
    }

    fn beat_mut(&mut self, token_id: &TokenId) -> &mut Beat {
        self.beats.get_mut(token_id).unwrap_or_else(|| env::panic_str("The beat does not exist"))
    }

    fn owner_of(&self, token_id: &TokenId) -> AccountId {
        self.tokens.owner_by_id.get(token_id).unwrap_or_else(|| env::panic_str("The beat does not exist"))
    }

    fn assert_owner(&self, token_id: &TokenId) {
        require!(
            env::predecessor_account_id() == self.owner_of(token_id),
            "Only the NFT owner can do this"
        );
    }

    /// La exclusiva cambia de manos: se retira la venta publicada y se cierran las licencias nuevas.
    fn on_owner_change(&mut self, token_id: &TokenId) {
        let beat = self.beat_mut(token_id);
        beat.sale_price = None;
        beat.lease_price = NearToken::from_yoctonear(0);
        beat.exclusive_sold = true;
    }

    /// Un ingreso del beat: la mitad para el dueño actual, la mitad al saldo de autores.
    fn credit_income(&mut self, token_id: &TokenId, amount: NearToken) {
        if amount.is_zero() {
            return;
        }
        let owner = self.owner_of(token_id);
        let owner_part = NearToken::from_yoctonear(amount.as_yoctonear() * OWNER_BPS as u128 / BPS as u128);
        let authors_part = amount.saturating_sub(owner_part);

        let current = self.get_owner_earnings(owner.clone());
        self.owner_earnings.insert(owner, current.saturating_add(owner_part));

        let beat = self.beat_mut(token_id);
        beat.authors_balance = beat.authors_balance.saturating_add(authors_part);
        beat.total_earned = beat.total_earned.saturating_add(amount);
    }

    /// Autores como cuentas, resolviendo los originales hasta `depth` niveles.
    /// Más allá, la parte de un original va a su creador.
    fn author_accounts(&self, token_id: &TokenId, depth: u8) -> Vec<(AccountId, u32)> {
        let beat = self.beat(token_id);
        let mut out = Vec::new();
        for split in &beat.payout {
            match &split.recipient {
                Recipient::Account(a) => out.push((a.clone(), split.bps)),
                Recipient::Beat(parent) if depth > 1 => {
                    for (a, b) in self.author_accounts(parent, depth - 1) {
                        out.push((a, split.bps * b / BPS));
                    }
                }
                Recipient::Beat(parent) => out.push((self.beat(parent).creator.clone(), split.bps)),
            }
        }
        out
    }

    fn internal_register(&mut self, args: RegisterArgs, parent_id: Option<TokenId>, payout: Vec<Split>) -> BeatView {
        validate_text(&args.title, 1, MAX_TITLE, "The title");
        validate_text(&args.audio_cid, 1, MAX_CID, "The audio CID");
        validate_text(&args.project_cid, 1, MAX_CID, "The project CID");
        validate_hash(&args.audio_hash, "audio_hash");
        validate_hash(&args.project_hash, "project_hash");
        if let Some(uri) = &args.license_uri {
            validate_text(uri, 1, MAX_URI, "The license link");
        }
        if let Some(art) = &args.art {
            validate_art(art);
        }
        let fingerprint = args.musecure_fingerprint.as_ref().map(|f| {
            validate_hash(f, "musecure_fingerprint");
            f.to_lowercase()
        });

        let creator = env::predecessor_account_id();
        let token_id = self.next_id.to_string();
        self.next_id += 1;
        let now_ms = env::block_timestamp_ms();

        let metadata = TokenMetadata {
            title: Some(args.title.clone()),
            description: Some("Beat registered on MuSecure Beats. The owner of this NFT holds the exclusive license to the beat.".to_string()),
            // La portada se genera en cada lectura (NFT dinámico): no se guarda aquí.
            media: None,
            media_hash: None,
            copies: Some(1),
            issued_at: Some(now_ms.to_string()),
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: Some(format!(
                r#"{{"project_cid":"{}","audio_hash":"{}","project_hash":"{}","parent_id":{},"license_uri":{},"musecure_fingerprint":{}}}"#,
                args.project_cid,
                args.audio_hash,
                args.project_hash,
                json_opt(parent_id.as_deref()),
                json_opt(args.license_uri.as_deref()),
                json_opt(fingerprint.as_deref())
            )),
            reference: Some(format!("ipfs://{}", args.project_cid)),
            reference_hash: None,
        };
        // Sin cuenta de reembolso: el contrato paga el almacenamiento del NFT.
        self.tokens.internal_mint_with_refund(token_id.clone(), creator.clone(), Some(metadata), None);
        NftMint { owner_id: &creator, token_ids: &[&token_id], memo: None }.emit();

        self.beats.insert(
            token_id.clone(),
            Beat {
                creator,
                title: args.title,
                audio_cid: args.audio_cid,
                project_cid: args.project_cid,
                audio_hash: args.audio_hash,
                project_hash: args.project_hash,
                license_uri: args.license_uri,
                created_at_ms: now_ms,
                parent_id,
                remix_price: args.remix_price,
                remix_allowed: true,
                credits: args.credits,
                payout,
                authors_balance: NearToken::from_yoctonear(0),
                total_earned: NearToken::from_yoctonear(0),
                remix_count: 0,
                sale_price: None,
                lease_price: args.lease_price,
                lease_count: 0,
                exclusive_sold: false,
                musecure_fingerprint: fingerprint.clone(),
                art: args.art,
            },
        );
        if let Some(f) = fingerprint {
            let mut ids = self.by_fingerprint.get(&f).cloned().unwrap_or_default();
            ids.push(token_id.clone());
            self.by_fingerprint.insert(f, ids);
        }
        self.view(&token_id).unwrap()
    }

    fn view(&self, token_id: &TokenId) -> Option<BeatView> {
        let b = self.beats.get(token_id)?;
        let owner_id = self.tokens.owner_by_id.get(token_id)?;
        Some(BeatView {
            token_id: token_id.clone(),
            owner_id,
            creator: b.creator.clone(),
            title: b.title.clone(),
            audio_cid: b.audio_cid.clone(),
            project_cid: b.project_cid.clone(),
            audio_hash: b.audio_hash.clone(),
            project_hash: b.project_hash.clone(),
            license_uri: b.license_uri.clone(),
            created_at_ms: U64(b.created_at_ms),
            parent_id: b.parent_id.clone(),
            remix_price: b.remix_price,
            remix_allowed: b.remix_allowed,
            credits: b.credits.clone(),
            payout: b.payout.clone(),
            authors_balance: b.authors_balance,
            total_earned: b.total_earned,
            remix_count: b.remix_count,
            sale_price: b.sale_price,
            lease_price: b.lease_price,
            lease_count: b.lease_count,
            exclusive_sold: b.exclusive_sold,
            musecure_fingerprint: b.musecure_fingerprint.clone(),
            art: b.art.clone(),
            sealed_cid: self.sealed.get(token_id).cloned(),
            level: dynamic::level(&self.stats(token_id)),
            badges: dynamic::badges(&self.stats(token_id)).into_iter().map(String::from).collect(),
        })
    }

    /// Estado dinámico de un beat: generación (cuántos originales tiene encima), remixes, licencias, ganancias.
    fn stats(&self, token_id: &TokenId) -> Stats {
        let b = self.beat(token_id);
        let mut generation = 0;
        let mut parent = b.parent_id.clone();
        while let Some(p) = parent {
            generation += 1;
            if generation > 20 {
                break;
            }
            parent = self.beats.get(&p).and_then(|pb| pb.parent_id.clone());
        }
        let credited = match &b.credits {
            Credits::Whole { credits } => !credits.is_empty(),
            Credits::PerTrack { tracks } => tracks.iter().any(|t| !t.credits.is_empty()),
        };
        Stats {
            generation,
            remix_count: b.remix_count,
            lease_count: b.lease_count,
            total_earned_yocto: b.total_earned.as_yoctonear(),
            exclusive_sold: b.exclusive_sold,
            credited,
        }
    }

    /// Completa la metadata NEP-177 con la parte dinámica: portada SVG, nivel e insignias.
    fn with_dynamic_metadata(&self, mut token: Token) -> Token {
        let Some(b) = self.beats.get(&token.token_id) else { return token };
        let stats = self.stats(&token.token_id);
        if let Some(meta) = token.metadata.as_mut() {
            meta.media = Some(svg_data_uri(&svg(&b.title, &token.token_id, b.art.as_deref(), &stats)));
            let badges: Vec<String> = dynamic::badges(&stats).iter().map(|x| format!("\"{x}\"")).collect();
            let dynamic_part = format!(
                r#","level":{},"badges":[{}],"audio":"ipfs://{}","remix_count":{},"lease_count":{}"#,
                dynamic::level(&stats),
                badges.join(","),
                b.audio_cid,
                stats.remix_count,
                stats.lease_count
            );
            meta.extra = meta.extra.take().map(|e| match e.strip_suffix('}') {
                Some(body) => format!("{body}{dynamic_part}}}"),
                None => e,
            });
        }
        token
    }
}

// ---------- reparto de autoría

/// Como en MuSecureCredits: hasta 10 acreditados, cada uno > 0, sin repetir, y la suma
/// no puede pasar de 100 %. Devuelve la suma.
fn validate_credits(credits: &[Credit], what: &str) -> u32 {
    require!(credits.len() <= MAX_CREDITS, format!("{what}: at most {MAX_CREDITS} credited accounts"));
    let mut seen = std::collections::HashSet::new();
    let mut sum = 0u32;
    for c in credits {
        require!(c.bps > 0, format!("{what}: each percentage must be greater than 0"));
        require!(seen.insert(&c.account_id), format!("{what}: {} appears twice", c.account_id));
        sum += c.bps;
    }
    require!(sum <= BPS, format!("{what}: percentages cannot add up to more than 100 % (10000)"));
    sum
}

/// Suma una parte a una cuenta, conservando el orden de aparición.
fn add_share(order: &mut Vec<AccountId>, acc: &mut HashMap<AccountId, u32>, account: &AccountId, bps: u32) {
    if bps == 0 {
        return;
    }
    if !acc.contains_key(account) {
        order.push(account.clone());
    }
    *acc.entry(account.clone()).or_insert(0) += bps;
}

/// Reparto propio del beat (sin el original), ya aplanado a cuentas.
/// Lo que los créditos no cubren es del creador.
pub fn own_payout(credits: &Credits, creator: &AccountId) -> Vec<Split> {
    let mut order: Vec<AccountId> = Vec::new();
    let mut acc: HashMap<AccountId, u32> = HashMap::new();
    match credits {
        Credits::Whole { credits } => {
            let sum = validate_credits(credits, "Créditos");
            for c in credits {
                add_share(&mut order, &mut acc, &c.account_id, c.bps);
            }
            add_share(&mut order, &mut acc, creator, BPS - sum);
        }
        Credits::PerTrack { tracks } => {
            require!(tracks.len() == TRACK_COUNT, "Credits are expected for all 4 tracks");
            require!(
                tracks.iter().map(|t| t.weight_bps).sum::<u32>() == BPS,
                "Track weights must add up to 100 % (10000)"
            );
            for t in tracks {
                if t.weight_bps == 0 {
                    continue;
                }
                let sum = validate_credits(&t.credits, &format!("Pista {}", t.name));
                for c in &t.credits {
                    add_share(&mut order, &mut acc, &c.account_id, t.weight_bps * c.bps / BPS);
                }
                add_share(&mut order, &mut acc, creator, t.weight_bps * (BPS - sum) / BPS);
            }
        }
    }
    let mut splits: Vec<Split> = order
        .into_iter()
        .map(|a| {
            let bps = acc[&a];
            Split { recipient: Recipient::Account(a), bps }
        })
        .collect();
    fix_rounding(&mut splits);
    splits
}

/// Agrega al original (PARENT_BPS) y escala el resto.
pub fn with_parent(parent_id: &TokenId, own: Vec<Split>) -> Vec<Split> {
    let rest = BPS - PARENT_BPS;
    let mut splits = vec![Split { recipient: Recipient::Beat(parent_id.clone()), bps: PARENT_BPS }];
    splits.extend(own.into_iter().map(|s| Split { bps: s.bps * rest / BPS, ..s }).filter(|s| s.bps > 0));
    fix_rounding(&mut splits);
    splits
}

/// Ajusta el último reparto para que el total sea exactamente 10000.
fn fix_rounding(splits: &mut [Split]) {
    let sum: u32 = splits.iter().map(|s| s.bps).sum();
    if let Some(last) = splits.last_mut() {
        last.bps = last.bps + BPS - sum;
    }
}

fn validate_text(value: &str, min: usize, max: usize, what: &str) {
    let len = value.chars().count();
    require!(len >= min && len <= max, format!("{what} must have between {min} and {max} characters"));
    require!(!value.contains('"') && !value.contains('\\'), format!("{what} cannot contain quotes or backslashes"));
}

fn validate_hash(value: &str, what: &str) {
    require!(
        value.len() == 64 && value.chars().all(|c| c.is_ascii_hexdigit()),
        format!("{what} must be a hex SHA-256 (64 characters)")
    );
}

fn lease_key(token_id: &TokenId, account: &AccountId) -> String {
    format!("{token_id}:{account}")
}

fn json_opt(v: Option<&str>) -> String {
    v.map(|s| format!("\"{}\"", s)).unwrap_or_else(|| "null".to_string())
}

fn log_event(event: &str, data: &str) {
    env::log_str(&format!(
        r#"EVENT_JSON:{{"standard":"musecure_beats","version":"1.0.0","event":"{event}","data":[{data}]}}"#
    ));
}

// ---------- NEP-171 (núcleo), NEP-178 (aprobaciones), NEP-181 (enumeración), NEP-177 (metadatos)

#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>) {
        self.tokens.nft_transfer(receiver_id, token_id.clone(), approval_id, memo);
        self.on_owner_change(&token_id);
    }

    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        self.on_owner_change(&token_id);
        self.tokens.nft_transfer_call(receiver_id, token_id, approval_id, memo, msg)
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id).map(|t| self.with_dynamic_metadata(t))
    }
}

#[near]
impl NonFungibleTokenResolver for Contract {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        self.tokens.nft_resolve_transfer(previous_owner_id, receiver_id, token_id, approved_account_ids)
    }
}

#[near]
impl NonFungibleTokenApproval for Contract {
    #[payable]
    fn nft_approve(&mut self, token_id: TokenId, account_id: AccountId, msg: Option<String>) -> Option<Promise> {
        self.tokens.nft_approve(token_id, account_id, msg)
    }

    #[payable]
    fn nft_revoke(&mut self, token_id: TokenId, account_id: AccountId) {
        self.tokens.nft_revoke(token_id, account_id)
    }

    #[payable]
    fn nft_revoke_all(&mut self, token_id: TokenId) {
        self.tokens.nft_revoke_all(token_id)
    }

    fn nft_is_approved(&self, token_id: TokenId, approved_account_id: AccountId, approval_id: Option<u64>) -> bool {
        self.tokens.nft_is_approved(token_id, approved_account_id, approval_id)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }

    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit).into_iter().map(|t| self.with_dynamic_metadata(t)).collect()
    }

    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }

    fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens
            .nft_tokens_for_owner(account_id, from_index, limit)
            .into_iter()
            .map(|t| self.with_dynamic_metadata(t))
            .collect()
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.get().unwrap()
    }
}

#[cfg(test)]
mod tests;
