use super::*;
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::testing_env;

fn acc(name: &str) -> AccountId {
    name.parse().unwrap()
}

const HASH_A: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

fn set_caller(caller: &str, deposit: NearToken) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("beats.testnet"))
        .predecessor_account_id(acc(caller))
        .signer_account_id(acc(caller))
        .attached_deposit(deposit)
        .account_balance(NearToken::from_near(100))
        .block_timestamp(1_700_000_000_000_000_000);
    testing_env!(b.build());
}

fn near(n: u128) -> NearToken {
    NearToken::from_near(n)
}

fn milli(n: u128) -> NearToken {
    NearToken::from_millinear(n)
}

fn zero() -> NearToken {
    NearToken::from_yoctonear(0)
}

fn whole(list: &[(&str, u32)]) -> Credits {
    Credits::Whole { credits: list.iter().map(|(a, b)| Credit { account_id: acc(a), bps: *b }).collect() }
}

fn args(title: &str, credits: Credits, price: NearToken) -> RegisterArgs {
    RegisterArgs {
        title: title.into(),
        audio_cid: "bafyaudio".into(),
        project_cid: "bafyproject".into(),
        audio_hash: HASH_A.into(),
        project_hash: HASH_B.into(),
        remix_price: price,
        credits,
        license_uri: Some("ipfs://bafylicencia".into()),
        lease_price: zero(),
        musecure_fingerprint: None,
    }
}

fn setup() -> Contract {
    set_caller("owner.testnet", zero());
    Contract::new(acc("owner.testnet"))
}

/// Original "1" de Favio (60 %) e Ingrid (40 %), a nombre de Favio.
fn with_original(price: NearToken) -> Contract {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    c.register_beat(args("Original", whole(&[("favio.testnet", 6000), ("ingrid.testnet", 4000)]), price));
    c
}

/// Transferencias programadas en la última llamada.
fn transfers() -> Vec<(String, u128)> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| {
            let to = r.receiver_id.to_string();
            r.actions.into_iter().filter_map(move |a| match a {
                near_sdk::mock::MockAction::Transfer { deposit, .. } => Some((to.clone(), deposit.as_yoctonear())),
                _ => None,
            })
        })
        .collect()
}

// ---------- registro y créditos

#[test]
fn register_whole_credits() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let v = c.register_beat(args("Súper Beat", whole(&[("favio.testnet", 6000), ("ingrid.testnet", 4000)]), near(1)));
    assert_eq!(v.token_id, "1");
    assert_eq!(v.owner_id, acc("favio.testnet"));
    assert_eq!(v.creator, acc("favio.testnet"));
    assert_eq!(v.payout.len(), 2);
    assert!(v.remix_allowed);
    assert_eq!(v.license_uri.as_deref(), Some("ipfs://bafylicencia"));
    assert_eq!(c.total_beats(), 1);
    assert_eq!(c.nft_token("1".into()).unwrap().owner_id, acc("favio.testnet"));
    assert!(get_logs().iter().any(|l| l.contains("nft_mint")));
}

#[test]
#[should_panic(expected = "no pueden sumar más de 100")]
fn credits_cannot_exceed_100() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    c.register_beat(args("Mal", whole(&[("favio.testnet", 6000), ("ingrid.testnet", 5000)]), zero()));
}

#[test]
fn partial_credits_remainder_goes_to_creator() {
    // Como en MuSecureCredits: Ingrid 30 %, el resto (70 %) es del creador.
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let v = c.register_beat(args("Parcial", whole(&[("ingrid.testnet", 3000)]), zero()));
    assert_eq!(
        v.payout,
        vec![
            Split { recipient: Recipient::Account(acc("ingrid.testnet")), bps: 3000 },
            Split { recipient: Recipient::Account(acc("favio.testnet")), bps: 7000 },
        ]
    );
}

#[test]
fn no_credits_means_all_to_creator() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let v = c.register_beat(args("Solo", whole(&[]), zero()));
    assert_eq!(v.payout, vec![Split { recipient: Recipient::Account(acc("favio.testnet")), bps: 10000 }]);
}

#[test]
#[should_panic(expected = "aparece dos veces")]
fn credits_no_duplicates() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    c.register_beat(args("Mal", whole(&[("favio.testnet", 5000), ("favio.testnet", 5000)]), zero()));
}

#[test]
#[should_panic(expected = "SHA-256")]
fn hash_must_be_sha256_hex() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let mut a = args("Mal", whole(&[("favio.testnet", 10000)]), zero());
    a.audio_hash = "nope".into();
    c.register_beat(a);
}

#[test]
#[should_panic(expected = "comillas")]
fn title_cannot_break_metadata_json() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    c.register_beat(args("Mal\",\"x\":\"y", whole(&[("favio.testnet", 10000)]), zero()));
}

#[test]
fn per_track_credits_flatten() {
    // Favio hizo batería y lead; Ingrid el bajo; los acordes 50/50. Cada pista pesa 25 %.
    let one = |name: &str, who: &str| TrackCredits {
        name: name.into(),
        weight_bps: 2500,
        credits: vec![Credit { account_id: acc(who), bps: 10000 }],
    };
    let tracks = vec![
        one("Batería", "favio.testnet"),
        one("Bajo", "ingrid.testnet"),
        one("Lead", "favio.testnet"),
        TrackCredits {
            name: "Acordes".into(),
            weight_bps: 2500,
            credits: vec![
                Credit { account_id: acc("favio.testnet"), bps: 5000 },
                Credit { account_id: acc("ingrid.testnet"), bps: 5000 },
            ],
        },
    ];
    assert_eq!(
        own_payout(&Credits::PerTrack { tracks }, &acc("favio.testnet")),
        vec![
            Split { recipient: Recipient::Account(acc("favio.testnet")), bps: 6250 },
            Split { recipient: Recipient::Account(acc("ingrid.testnet")), bps: 3750 },
        ]
    );
}

#[test]
fn per_track_partial_remainder_to_creator() {
    // Bajo: Ingrid 50 %, el otro 50 % de esa pista es del creador (Favio).
    let tracks = vec![
        TrackCredits { name: "Batería".into(), weight_bps: 2500, credits: vec![] },
        TrackCredits { name: "Bajo".into(), weight_bps: 2500, credits: vec![Credit { account_id: acc("ingrid.testnet"), bps: 5000 }] },
        TrackCredits { name: "Lead".into(), weight_bps: 2500, credits: vec![] },
        TrackCredits { name: "Acordes".into(), weight_bps: 2500, credits: vec![] },
    ];
    let payout = own_payout(&Credits::PerTrack { tracks }, &acc("favio.testnet"));
    assert_eq!(
        payout,
        vec![
            Split { recipient: Recipient::Account(acc("favio.testnet")), bps: 8750 },
            Split { recipient: Recipient::Account(acc("ingrid.testnet")), bps: 1250 },
        ]
    );
}

#[test]
fn per_track_rounding_sums_to_100() {
    let three = |w| TrackCredits {
        name: "x".into(),
        weight_bps: w,
        credits: vec![
            Credit { account_id: acc("a.testnet"), bps: 3333 },
            Credit { account_id: acc("b.testnet"), bps: 3333 },
            Credit { account_id: acc("c.testnet"), bps: 3334 },
        ],
    };
    let payout = own_payout(&Credits::PerTrack { tracks: vec![three(3333), three(3333), three(3334), three(0)] }, &acc("a.testnet"));
    assert_eq!(payout.iter().map(|s| s.bps).sum::<u32>(), BPS);
}

// ---------- remix y licencia

#[test]
fn remix_income_splits_owner_and_authors() {
    let mut c = with_original(near(2));
    set_caller("pepe.testnet", near(2));
    let r = c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));

    assert_eq!(r.parent_id.as_deref(), Some("1"));
    assert_eq!(
        r.payout,
        vec![
            Split { recipient: Recipient::Beat("1".into()), bps: 2000 },
            Split { recipient: Recipient::Account(acc("pepe.testnet")), bps: 8000 },
        ]
    );
    let parent = c.get_beat("1".into()).unwrap();
    assert_eq!(parent.authors_balance, near(1));
    assert_eq!(parent.total_earned, near(2));
    assert_eq!(parent.remix_count, 1);
    assert_eq!(c.get_owner_earnings(acc("favio.testnet")), near(1));
    assert_eq!(c.get_remixes("1".into()), vec!["2".to_string()]);
}

#[test]
#[should_panic(expected = "La licencia de remix cuesta")]
fn remix_requires_price() {
    let mut c = with_original(near(2));
    set_caller("pepe.testnet", near(1));
    c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));
}

#[test]
#[should_panic(expected = "no permite remixes")]
fn owner_can_close_remixes() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_license("1".into(), zero(), false);
    set_caller("pepe.testnet", zero());
    c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));
}

#[test]
#[should_panic(expected = "Solo el dueño")]
fn only_owner_sets_license() {
    let mut c = with_original(zero());
    set_caller("ingrid.testnet", zero()); // es autora, pero no dueña
    c.set_license("1".into(), near(5), true);
}

// ---------- cobros

#[test]
fn claim_cascades_to_parent_and_owners_withdraw() {
    let mut c = with_original(zero());
    set_caller("pepe.testnet", zero());
    c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));

    // Un fan apoya el remix con 10 NEAR: 5 para Pepe como dueño, 5 al saldo de autores.
    set_caller("fan.testnet", near(10));
    c.support("2".into());
    assert_eq!(c.get_owner_earnings(acc("pepe.testnet")), near(5));
    assert_eq!(c.get_beat("2".into()).unwrap().authors_balance, near(5));

    // Reparto de autores del remix: 4 NEAR a Pepe, 1 NEAR entra como ingreso del original.
    set_caller("anyone.testnet", zero());
    assert_eq!(c.claim("2".into()), near(5));
    assert_eq!(transfers(), vec![("pepe.testnet".to_string(), near(4).as_yoctonear())]);
    let original = c.get_beat("1".into()).unwrap();
    assert_eq!(original.authors_balance, milli(500));
    assert_eq!(c.get_owner_earnings(acc("favio.testnet")), milli(500));

    // Reparto de autores del original: 60/40 de 0,5 NEAR.
    set_caller("anyone.testnet", zero());
    c.claim("1".into());
    let t = transfers();
    assert!(t.contains(&("favio.testnet".to_string(), milli(300).as_yoctonear())));
    assert!(t.contains(&("ingrid.testnet".to_string(), milli(200).as_yoctonear())));

    // Pepe retira lo que ganó como dueño.
    set_caller("pepe.testnet", zero());
    assert_eq!(c.withdraw(), near(5));
    assert_eq!(transfers(), vec![("pepe.testnet".to_string(), near(5).as_yoctonear())]);
    assert_eq!(c.get_owner_earnings(acc("pepe.testnet")), zero());
}

#[test]
#[should_panic(expected = "no tiene saldo")]
fn claim_without_balance() {
    let mut c = with_original(zero());
    c.claim("1".into());
}

#[test]
#[should_panic(expected = "No tienes ganancias")]
fn withdraw_without_earnings() {
    let mut c = with_original(zero());
    set_caller("ingrid.testnet", zero());
    c.withdraw();
}

// ---------- venta del NFT

#[test]
fn buy_pays_seller_royalty_and_change() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.list_for_sale("1".into(), Some(near(10)));

    set_caller("coleccionista.testnet", near(12));
    c.buy("1".into());

    let v = c.get_beat("1".into()).unwrap();
    assert_eq!(v.owner_id, acc("coleccionista.testnet"));
    assert_eq!(v.sale_price, None);
    assert_eq!(v.authors_balance, near(1)); // 10 % de regalía para los autores
    let t = transfers();
    assert!(t.contains(&("favio.testnet".to_string(), near(9).as_yoctonear())));
    assert!(t.contains(&("coleccionista.testnet".to_string(), near(2).as_yoctonear())));

    // Desde ahora, la mitad de los ingresos va al nuevo dueño; los autores no cambian.
    set_caller("fan.testnet", near(2));
    c.support("1".into());
    assert_eq!(c.get_owner_earnings(acc("coleccionista.testnet")), near(1));
    assert_eq!(c.get_owner_earnings(acc("favio.testnet")), zero());
    assert_eq!(c.get_beat("1".into()).unwrap().authors_balance, near(2));
}

#[test]
#[should_panic(expected = "no está a la venta")]
fn buy_requires_listing() {
    let mut c = with_original(zero());
    set_caller("coleccionista.testnet", near(5));
    c.buy("1".into());
}

#[test]
#[should_panic(expected = "El precio es")]
fn buy_requires_full_price() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.list_for_sale("1".into(), Some(near(10)));
    set_caller("coleccionista.testnet", near(9));
    c.buy("1".into());
}

#[test]
fn transfer_keeps_credits_and_clears_listing() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.list_for_sale("1".into(), Some(near(10)));
    set_caller("favio.testnet", NearToken::from_yoctonear(1));
    c.nft_transfer(acc("amiga.testnet"), "1".into(), None, None);
    let v = c.get_beat("1".into()).unwrap();
    assert_eq!(v.owner_id, acc("amiga.testnet"));
    assert_eq!(v.sale_price, None);
    assert_eq!(v.payout[0].recipient, Recipient::Account(acc("favio.testnet")));
}

// ---------- NEP-199

#[test]
fn nft_payout_resolves_parent_authors() {
    let mut c = with_original(zero());
    set_caller("pepe.testnet", zero());
    c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));

    // Venta de 100 000 yocto: 10 % regalía = 10 000.
    // Autores del remix: original 20 % (Favio 60 %, Ingrid 40 %) y Pepe 80 %.
    let p = c.nft_payout("2".into(), U128(100_000), Some(10)).payout;
    assert_eq!(p[&acc("favio.testnet")], U128(1_200));
    assert_eq!(p[&acc("ingrid.testnet")], U128(800));
    assert_eq!(p[&acc("pepe.testnet")], U128(98_000)); // 8 000 de autor + 90 000 de dueño
    assert_eq!(p.values().map(|v| v.0).sum::<u128>(), 100_000);
}

#[test]
#[should_panic(expected = "max_len_payout")]
fn nft_payout_respects_max_len() {
    let c = with_original(zero());
    c.nft_payout("1".into(), U128(100_000), Some(1));
}

#[test]
fn list_newest_first() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    for t in ["A", "B", "C"] {
        c.register_beat(args(t, whole(&[("favio.testnet", 10000)]), zero()));
    }
    let titles: Vec<String> = c.get_beats(None, Some(2)).into_iter().map(|b| b.title).collect();
    assert_eq!(titles, vec!["C", "B"]);
}

// ---------- licencias no exclusivas

fn with_leases(price: NearToken) -> Contract {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_lease_price("1".into(), price);
    c
}

#[test]
fn buy_lease_splits_income() {
    let mut c = with_leases(near(2));
    set_caller("artista.testnet", near(2));
    c.buy_lease("1".into());
    assert!(c.has_lease("1".into(), acc("artista.testnet")));
    assert!(!c.has_lease("1".into(), acc("otro.testnet")));
    let v = c.get_beat("1".into()).unwrap();
    assert_eq!(v.lease_count, 1);
    assert_eq!(v.authors_balance, near(1));
    assert_eq!(c.get_owner_earnings(acc("favio.testnet")), near(1));
}

#[test]
#[should_panic(expected = "exactamente")]
fn lease_requires_exact_payment() {
    let mut c = with_leases(near(2));
    set_caller("artista.testnet", near(3));
    c.buy_lease("1".into());
}

#[test]
#[should_panic(expected = "Ya tienes una licencia")]
fn one_lease_per_account() {
    let mut c = with_leases(near(2));
    set_caller("artista.testnet", near(2));
    c.buy_lease("1".into());
    set_caller("artista.testnet", near(2));
    c.buy_lease("1".into());
}

#[test]
#[should_panic(expected = "no vende licencias")]
fn lease_needs_price() {
    let mut c = with_original(zero());
    set_caller("artista.testnet", near(1));
    c.buy_lease("1".into());
}

#[test]
fn selling_exclusive_closes_new_leases_but_keeps_old_ones() {
    let mut c = with_leases(near(2));
    set_caller("artista.testnet", near(2));
    c.buy_lease("1".into());

    set_caller("favio.testnet", zero());
    c.list_for_sale("1".into(), Some(near(10)));
    set_caller("coleccionista.testnet", near(10));
    c.buy("1".into());

    let v = c.get_beat("1".into()).unwrap();
    assert!(v.exclusive_sold);
    assert_eq!(v.lease_price, zero());
    assert!(c.has_lease("1".into(), acc("artista.testnet"))); // la licencia comprada sigue valiendo
}

#[test]
#[should_panic(expected = "ya se vendió")]
fn no_new_leases_after_exclusive_sale() {
    let mut c = with_leases(near(2));
    set_caller("favio.testnet", NearToken::from_yoctonear(1));
    c.nft_transfer(acc("coleccionista.testnet"), "1".into(), None, None);
    set_caller("coleccionista.testnet", zero());
    c.set_lease_price("1".into(), near(1));
}

// ---------- catálogo unido con MuSecure (Monad)

#[test]
fn find_beats_by_musecure_fingerprint() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let mut a = args("Con huella", whole(&[]), zero());
    a.musecure_fingerprint = Some("ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef0123456789".into());
    c.register_beat(a);
    c.register_beat(args("Sin huella", whole(&[]), zero()));

    let found = c.get_beats_by_fingerprint("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789".into());
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].title, "Con huella");
    assert_eq!(
        found[0].musecure_fingerprint.as_deref(),
        Some("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789")
    );
}
