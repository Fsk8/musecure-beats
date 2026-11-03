//! Historial por NFT (v5): quién lo tuvo, cuánto ganó cada dueño, cuánto se pagó a los autores,
//! y cuándo firmó la cuenta propia del beat. También protege al comprador: la cuenta del beat no
//! puede firmar mientras el NFT está a la venta, ni puede venderse justo después de firmar.

use super::*;

/// Tiempo mínimo entre una firma de la cuenta del beat y su venta, para que ninguna firma pedida
/// por el vendedor llegue después de que el NFT cambió de manos (la red MPC responde en segundos).
pub const SIGN_SETTLE_MS: u64 = 10 * 60 * 1000;

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Holder {
    pub account_id: AccountId,
    /// Desde cuándo lo tiene (0 = desconocido: beats anteriores a la v5).
    pub since_ms: U64,
    /// Precio pagado al recibirlo (None: acuñado, regalado o desconocido).
    pub price: Option<NearToken>,
    /// Parte de dueño que ganó mientras lo tuvo.
    pub earned: NearToken,
}

#[near(serializers = [borsh])]
#[derive(Default)]
pub struct Ledger {
    pub holders: Vec<Holder>,
    /// Todo lo que cobraron los dueños por este beat (suma de las partes de dueño).
    pub owners_earned: u128,
    /// Todo lo que se repartió a los autores (y a los originales) con `claim`.
    pub authors_paid: u128,
    pub signatures: u32,
    pub last_sign_ms: u64,
}

#[near(serializers = [json])]
pub struct BeatHistory {
    pub token_id: TokenId,
    pub holders: Vec<Holder>,
    pub total_earned: NearToken,
    pub owners_earned: NearToken,
    pub authors_paid: NearToken,
    pub authors_pending: NearToken,
    pub signatures: u32,
    pub last_sign_ms: U64,
}

impl Contract {
    /// El historial de un beat. Los beats anteriores a la v5 empiezan con su creador y su dueño actual.
    pub(crate) fn ledger_mut(&mut self, token_id: &TokenId) -> &mut Ledger {
        if !self.ledger.contains_key(token_id) {
            let (creator, created) = {
                let b = self.beat(token_id);
                (b.creator.clone(), b.created_at_ms)
            };
            let owner = self.owner_of(token_id);
            let mut holders = vec![Holder { account_id: creator.clone(), since_ms: U64(created), price: None, earned: NearToken::from_yoctonear(0) }];
            if owner != creator {
                holders.push(Holder { account_id: owner, since_ms: U64(0), price: None, earned: NearToken::from_yoctonear(0) });
            }
            self.ledger.insert(token_id.clone(), Ledger { holders, ..Default::default() });
        }
        self.ledger.get_mut(token_id).unwrap()
    }

    /// Anota un nuevo dueño (después de la transferencia).
    pub(crate) fn record_holder(&mut self, token_id: &TokenId, to: &AccountId, price: Option<NearToken>) {
        let now = env::block_timestamp_ms();
        let l = self.ledger_mut(token_id);
        if l.holders.last().map(|h| &h.account_id) == Some(to) {
            return;
        }
        l.holders.push(Holder { account_id: to.clone(), since_ms: U64(now), price, earned: NearToken::from_yoctonear(0) });
    }

    /// La parte de dueño de un ingreso: queda anotada a nombre de quien tenía el NFT en ese momento.
    pub(crate) fn record_owner_income(&mut self, token_id: &TokenId, owner: &AccountId, amount: NearToken) {
        let l = self.ledger_mut(token_id);
        l.owners_earned += amount.as_yoctonear();
        if let Some(h) = l.holders.last_mut().filter(|h| &h.account_id == owner) {
            h.earned = h.earned.saturating_add(amount);
        }
    }

    pub(crate) fn record_authors_paid(&mut self, token_id: &TokenId, amount: u128) {
        self.ledger_mut(token_id).authors_paid += amount;
    }

    pub(crate) fn record_signature(&mut self, token_id: &TokenId) {
        let now = env::block_timestamp_ms();
        let l = self.ledger_mut(token_id);
        l.signatures += 1;
        l.last_sign_ms = now;
    }

    /// Protección del comprador: no se vende un beat cuya cuenta firmó hace poco.
    pub(crate) fn assert_signatures_settled(&self, token_id: &TokenId) {
        if let Some(l) = self.ledger.get(token_id) {
            require!(
                l.last_sign_ms == 0 || env::block_timestamp_ms() >= l.last_sign_ms + SIGN_SETTLE_MS,
                "The beat account signed less than 10 minutes ago: wait before selling (protects the buyer)"
            );
        }
    }
}

#[near]
impl Contract {
    /// Historial del NFT: dueños (con lo que ganó cada uno), lo ganado, lo pagado a autores y las firmas.
    pub fn get_beat_history(&self, token_id: TokenId) -> BeatHistory {
        let b = self.beat(&token_id);
        let (holders, owners_earned, authors_paid, signatures, last_sign_ms) = match self.ledger.get(&token_id) {
            Some(l) => (l.holders.clone(), l.owners_earned, l.authors_paid, l.signatures, l.last_sign_ms),
            None => {
                let owner = self.owner_of(&token_id);
                let mut h = vec![Holder { account_id: b.creator.clone(), since_ms: U64(b.created_at_ms), price: None, earned: NearToken::from_yoctonear(0) }];
                if owner != b.creator {
                    h.push(Holder { account_id: owner, since_ms: U64(0), price: None, earned: NearToken::from_yoctonear(0) });
                }
                (h, 0, 0, 0, 0)
            }
        };
        BeatHistory {
            token_id: token_id.clone(),
            holders,
            total_earned: b.total_earned,
            owners_earned: NearToken::from_yoctonear(owners_earned),
            authors_paid: NearToken::from_yoctonear(authors_paid),
            authors_pending: b.authors_balance,
            signatures,
            last_sign_ms: U64(last_sign_ms),
        }
    }
}
