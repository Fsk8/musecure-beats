//! Remix Battles: retos semanales sobre un beat semilla.
//!
//! - El admin crea la batalla (semilla, reglas, ventana de tiempo) y cualquiera puede sumar al premio.
//! - Participan los remixes abiertos (no sellados) de la semilla creados dentro de la ventana.
//! - Al cerrar, el crítico (un agente con una llave restringida a `settle_battle`) entrega una nota
//!   por cada participante y el CID de sus reseñas. El contrato ordena y paga 50/30/20 % del premio
//!   como ingreso de cada beat ganador: se reparte entre dueño y autores, y 20 % de la parte de autores
//!   sube a la semilla. El crítico no puede mover fondos a ningún otro lado.

use super::*;

pub const MAX_RULES: usize = 500;
pub const MAX_ENTRIES: usize = 100;
/// Reparto del premio entre los 3 primeros (si hay menos, se normaliza entre los que haya).
pub const PRIZE_WEIGHTS: [u128; 3] = [5, 3, 2];

#[near(serializers = [borsh])]
pub struct Battle {
    pub seed_id: TokenId,
    pub title: String,
    pub rules: String,
    pub starts_ms: u64,
    pub ends_ms: u64,
    pub pool: NearToken,
    pub settled: bool,
    pub review_cid: Option<String>,
    pub results: Vec<BattleResult>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct BattleResult {
    pub token_id: TokenId,
    pub score: u32,
    pub rank: u32,
    pub prize: NearToken,
}

/// Lo que entrega el crítico por cada participante (nota de 0 a 100).
#[near(serializers = [json])]
pub struct ScoreInput {
    pub token_id: TokenId,
    pub score: u32,
}

#[near(serializers = [json])]
pub struct BattleView {
    pub id: u64,
    pub seed_id: TokenId,
    pub title: String,
    pub rules: String,
    pub starts_ms: U64,
    pub ends_ms: U64,
    pub pool: NearToken,
    pub settled: bool,
    pub review_cid: Option<String>,
    pub results: Vec<BattleResult>,
    pub entry_count: u32,
}

#[near]
impl Contract {
    // ---------- admin

    /// Crea una batalla. Solo el admin (dueño del contrato). Puede llevar un premio inicial.
    #[payable]
    pub fn create_battle(&mut self, seed_id: TokenId, title: String, rules: String, starts_ms: U64, ends_ms: U64) -> u64 {
        self.assert_admin();
        require!(self.beats.contains_key(&seed_id), "Seed beat not found");
        require!(!title.is_empty() && title.len() <= MAX_TITLE, "Invalid title");
        require!(rules.len() <= MAX_RULES, "Rules are too long");
        require!(ends_ms.0 > starts_ms.0, "The battle must end after it starts");
        let id = self.next_battle_id;
        self.next_battle_id += 1;
        let pool = env::attached_deposit();
        self.battles.insert(
            id,
            Battle {
                seed_id: seed_id.clone(),
                title,
                rules,
                starts_ms: starts_ms.0,
                ends_ms: ends_ms.0,
                pool,
                settled: false,
                review_cid: None,
                results: Vec::new(),
            },
        );
        log_event("battle_created", &format!(r#"{{"battle_id":{id},"seed_id":"{seed_id}","pool":"{}"}}"#, pool.as_yoctonear()));
        id
    }

    /// Cuenta del crítico: la única que puede cerrar batallas.
    pub fn set_critic(&mut self, critic: Option<AccountId>) {
        self.assert_admin();
        self.critic = critic;
    }

    // ---------- cualquiera

    /// Suma NEAR al premio de una batalla abierta.
    #[payable]
    pub fn fund_battle(&mut self, battle_id: u64) -> NearToken {
        let amount = env::attached_deposit();
        require!(!amount.is_zero(), "Attach some NEAR to fund the prize");
        let battle = self.battles.get_mut(&battle_id).unwrap_or_else(|| env::panic_str("Battle not found"));
        require!(!battle.settled, "This battle is already settled");
        require!(now_ms() < battle.ends_ms, "This battle is closed");
        battle.pool = battle.pool.saturating_add(amount);
        let pool = battle.pool;
        log_event(
            "battle_funded",
            &format!(r#"{{"battle_id":{battle_id},"by":"{}","amount":"{}"}}"#, env::predecessor_account_id(), amount.as_yoctonear()),
        );
        pool
    }

    // ---------- crítico

    /// Cierra la batalla con la nota del crítico para CADA participante. Sin depósito, para que la
    /// llave del crítico (function-call, sin poder adjuntar NEAR) pueda llamarlo.
    pub fn settle_battle(&mut self, battle_id: u64, scores: Vec<ScoreInput>, review_cid: String) -> Vec<BattleResult> {
        require!(Some(env::predecessor_account_id()) == self.critic, "Only the critic can settle battles");
        require!(!review_cid.is_empty() && review_cid.len() <= MAX_CID, "Invalid review CID");
        let (seed_id, ends_ms, settled, pool) = {
            let b = self.battles.get(&battle_id).unwrap_or_else(|| env::panic_str("Battle not found"));
            (b.seed_id.clone(), b.ends_ms, b.settled, b.pool)
        };
        require!(!settled, "This battle is already settled");
        require!(now_ms() >= ends_ms, "The battle is still open");

        let entries = self.battle_entries(battle_id);
        require!(scores.len() == entries.len(), "Score every entry, no more and no less");
        let mut ranked: Vec<(TokenId, u32)> = Vec::with_capacity(scores.len());
        for s in scores {
            require!(s.score <= 100, "Scores go from 0 to 100");
            require!(entries.contains(&s.token_id), format!("Beat {} is not an entry of this battle", s.token_id));
            require!(!ranked.iter().any(|(t, _)| t == &s.token_id), "Duplicated entry");
            ranked.push((s.token_id, s.score));
        }
        // Mayor nota primero; en empate gana el que llegó antes (id menor).
        ranked.sort_by(|a, b| b.1.cmp(&a.1).then(id_num(&a.0).cmp(&id_num(&b.0))));

        let winners = ranked.len().min(PRIZE_WEIGHTS.len());
        let total_weight: u128 = PRIZE_WEIGHTS[..winners].iter().sum();
        let mut paid = 0u128;
        let mut results = Vec::with_capacity(ranked.len());
        for (i, (token_id, score)) in ranked.into_iter().enumerate() {
            let prize = if i < winners {
                // El último ganador se lleva el resto, para no dejar yocto sueltos.
                let amount = if i + 1 == winners {
                    pool.as_yoctonear() - paid
                } else {
                    pool.as_yoctonear() * PRIZE_WEIGHTS[i] / total_weight
                };
                paid += amount;
                NearToken::from_yoctonear(amount)
            } else {
                NearToken::from_yoctonear(0)
            };
            if !prize.is_zero() {
                self.credit_income(&token_id, prize);
            }
            if i == 0 {
                let wins = self.battle_wins.get(&token_id).copied().unwrap_or(0);
                self.battle_wins.insert(token_id.clone(), wins + 1);
            }
            results.push(BattleResult { token_id, score, rank: i as u32 + 1, prize });
        }
        // Sin participantes, el premio vuelve al admin (retirable con `withdraw`).
        if winners == 0 && !pool.is_zero() {
            let admin = self.tokens.owner_id.clone();
            let current = self.get_owner_earnings(admin.clone());
            self.owner_earnings.insert(admin, current.saturating_add(pool));
        }

        let battle = self.battles.get_mut(&battle_id).unwrap();
        battle.settled = true;
        battle.review_cid = Some(review_cid.clone());
        battle.results = results.clone();
        let winners_json: Vec<String> = results
            .iter()
            .filter(|r| !r.prize.is_zero())
            .map(|r| format!(r#"{{"token_id":"{}","score":{},"prize":"{}"}}"#, r.token_id, r.score, r.prize.as_yoctonear()))
            .collect();
        log_event(
            "battle_settled",
            &format!(r#"{{"battle_id":{battle_id},"seed_id":"{seed_id}","review_cid":"{review_cid}","winners":[{}]}}"#, winners_json.join(",")),
        );
        results
    }

    // ---------- vistas

    pub fn get_critic(&self) -> Option<AccountId> {
        self.critic.clone()
    }

    pub fn get_battle(&self, battle_id: u64) -> Option<BattleView> {
        self.battles.get(&battle_id).map(|b| self.battle_view(battle_id, b))
    }

    /// Las más nuevas primero.
    pub fn get_battles(&self, limit: Option<u32>) -> Vec<BattleView> {
        let limit = limit.unwrap_or(20).min(50) as u64;
        (0..self.next_battle_id)
            .rev()
            .take(limit as usize)
            .filter_map(|id| self.battles.get(&id).map(|b| self.battle_view(id, b)))
            .collect()
    }

    /// Participantes: remixes abiertos de la semilla creados dentro de la ventana.
    pub fn get_battle_entries(&self, battle_id: u64) -> Vec<TokenId> {
        self.battle_entries(battle_id)
    }

    pub fn get_battle_wins(&self, token_id: TokenId) -> u32 {
        self.battle_wins.get(&token_id).copied().unwrap_or(0)
    }
}

impl Contract {
    fn assert_admin(&self) {
        require!(env::predecessor_account_id() == self.tokens.owner_id, "Only the contract admin can do this");
    }

    fn battle_entries(&self, battle_id: u64) -> Vec<TokenId> {
        let b = self.battles.get(&battle_id).unwrap_or_else(|| env::panic_str("Battle not found"));
        self.remixes
            .get(&b.seed_id)
            .map(|children| {
                children
                    .iter()
                    .filter(|t| {
                        let beat = self.beat(t);
                        beat.created_at_ms >= b.starts_ms && beat.created_at_ms < b.ends_ms && !self.sealed.contains_key(*t)
                    })
                    .take(MAX_ENTRIES)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    fn battle_view(&self, id: u64, b: &Battle) -> BattleView {
        BattleView {
            id,
            seed_id: b.seed_id.clone(),
            title: b.title.clone(),
            rules: b.rules.clone(),
            starts_ms: U64(b.starts_ms),
            ends_ms: U64(b.ends_ms),
            pool: b.pool,
            settled: b.settled,
            review_cid: b.review_cid.clone(),
            results: b.results.clone(),
            entry_count: self.battle_entries(id).len() as u32,
        }
    }
}

fn now_ms() -> u64 {
    env::block_timestamp_ms()
}

fn id_num(t: &TokenId) -> u64 {
    t.parse().unwrap_or(u64::MAX)
}
