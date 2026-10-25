use super::*;
use battles::ScoreInput;
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
        art: None,
    }
}

fn setup() -> Contract {
    set_caller("owner.testnet", zero());
    Contract::new(acc("owner.testnet"), None)
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
#[should_panic(expected = "cannot add up to more than 100")]
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
#[should_panic(expected = "appears twice")]
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
#[should_panic(expected = "quotes")]
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
#[should_panic(expected = "The remix license costs")]
fn remix_requires_price() {
    let mut c = with_original(near(2));
    set_caller("pepe.testnet", near(1));
    c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));
}

#[test]
#[should_panic(expected = "does not allow remixes")]
fn owner_can_close_remixes() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_license("1".into(), zero(), false);
    set_caller("pepe.testnet", zero());
    c.remix("1".into(), args("Remix", whole(&[("pepe.testnet", 10000)]), zero()));
}

#[test]
#[should_panic(expected = "Only the NFT owner")]
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
#[should_panic(expected = "no authors")]
fn claim_without_balance() {
    let mut c = with_original(zero());
    c.claim("1".into());
}

#[test]
#[should_panic(expected = "no owner earnings")]
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
#[should_panic(expected = "not for sale")]
fn buy_requires_listing() {
    let mut c = with_original(zero());
    set_caller("coleccionista.testnet", near(5));
    c.buy("1".into());
}

#[test]
#[should_panic(expected = "The price is")]
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
#[should_panic(expected = "exactly")]
fn lease_requires_exact_payment() {
    let mut c = with_leases(near(2));
    set_caller("artista.testnet", near(3));
    c.buy_lease("1".into());
}

#[test]
#[should_panic(expected = "already hold a license")]
fn one_lease_per_account() {
    let mut c = with_leases(near(2));
    set_caller("artista.testnet", near(2));
    c.buy_lease("1".into());
    set_caller("artista.testnet", near(2));
    c.buy_lease("1".into());
}

#[test]
#[should_panic(expected = "does not sell non-exclusive")]
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
#[should_panic(expected = "already sold")]
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

// ---------- NFT dinámico y cuenta propia del beat

const ART: &str = "16|0...0...0...0...|..2...2.......2.|4.3.2.1.........|6.......4.......";

#[test]
fn dynamic_metadata_has_svg_cover_and_badges() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let mut a = args("Beat <Dinámico>", whole(&[("ingrid.testnet", 3000)]), near(1));
    a.art = Some(ART.into());
    c.register_beat(a);
    let token = c.nft_token("1".into()).unwrap();
    let meta = token.metadata.unwrap();
    let media = meta.media.unwrap();
    assert!(media.starts_with("data:image/svg+xml;base64,"));
    use near_sdk::base64::Engine as _;
    let svg = String::from_utf8(near_sdk::base64::engine::general_purpose::STANDARD.decode(&media[26..]).unwrap()).unwrap();
    assert!(svg.contains("Beat &lt;Dinámico&gt;"), "el título se escapa");
    assert!(svg.contains("Original") && svg.contains("Collaborative"));
    let extra = meta.extra.unwrap();
    assert!(extra.contains(r#""level":1"#) && extra.contains(r#""badges":["Original","Collaborative"]"#), "{extra}");
    assert!(extra.ends_with('}'));
}

#[test]
fn badges_and_level_evolve_with_remixes() {
    let mut c = with_original(milli(100));
    set_caller("ana.testnet", milli(100));
    c.remix("1".into(), args("Remix", whole(&[]), zero()));
    let original = c.get_beat("1".into()).unwrap();
    assert!(original.badges.contains(&"Remixed".to_string()));
    assert!(original.badges.contains(&"Earns royalties".to_string()));
    assert_eq!(original.level, 3);
    let remix = c.get_beat("2".into()).unwrap();
    assert_eq!(remix.badges[0], "Remix");
}

#[test]
#[should_panic(expected = "art: each track")]
fn art_must_match_length() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let mut a = args("Mal", whole(&[]), zero());
    a.art = Some("16|0...|....|....|....".into());
    c.register_beat(a);
}

#[test]
#[should_panic(expected = "art: invalid characters")]
fn art_rejects_bad_chars() {
    let mut c = setup();
    set_caller("favio.testnet", zero());
    let mut a = args("Mal", whole(&[]), zero());
    a.art = Some("16|<script>........|................|................|................".into());
    c.register_beat(a);
}

fn set_caller_gas(caller: &str, deposit: NearToken, tgas: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("beats.testnet"))
        .predecessor_account_id(acc(caller))
        .signer_account_id(acc(caller))
        .attached_deposit(deposit)
        .prepaid_gas(Gas::from_tgas(tgas))
        .account_balance(NearToken::from_near(100));
    testing_env!(b.build());
}

#[test]
fn owner_can_sign_for_beat_account() {
    let mut c = with_original(zero());
    set_caller_gas("favio.testnet", NearToken::from_yoctonear(1), 300);
    let _ = c.sign_for_beat("1".into(), HASH_A.into());
    let receipts = get_created_receipts();
    assert_eq!(receipts.len(), 1);
    assert_eq!(receipts[0].receiver_id, acc(DEFAULT_MPC_CONTRACT));
    let call = receipts[0].actions.iter().find_map(|a| match a {
        near_sdk::mock::MockAction::FunctionCallWeight { method_name, args, attached_deposit, .. } => {
            Some((String::from_utf8(method_name.clone()).unwrap(), String::from_utf8(args.clone()).unwrap(), *attached_deposit))
        }
        _ => None,
    }).expect("llamada a sign");
    assert_eq!(call.0, "sign");
    assert_eq!(call.1, format!(r#"{{"request":{{"payload_v2":{{"Ecdsa":"{HASH_A}"}},"path":"beat-1","domain_id":0}}}}"#));
    assert_eq!(call.2, NearToken::from_yoctonear(1));
    assert_eq!(c.beat_account_path("1".into()), "beat-1");
}

#[test]
#[should_panic(expected = "Only the NFT owner")]
fn only_owner_signs_for_beat() {
    let mut c = with_original(zero());
    set_caller_gas("ingrid.testnet", NearToken::from_yoctonear(1), 300);
    let _ = c.sign_for_beat("1".into(), HASH_A.into());
}

#[test]
fn new_owner_controls_beat_account_after_transfer() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", NearToken::from_yoctonear(1));
    c.nft_transfer(acc("compradora.testnet"), "1".into(), None, None);
    set_caller_gas("compradora.testnet", NearToken::from_yoctonear(1), 300);
    let _ = c.sign_for_beat("1".into(), HASH_B.into());
    assert_eq!(get_created_receipts().len(), 1);
}

#[test]
#[should_panic(expected = "250 Tgas")]
fn sign_for_beat_needs_gas() {
    let mut c = with_original(zero());
    set_caller_gas("favio.testnet", NearToken::from_yoctonear(1), 100);
    let _ = c.sign_for_beat("1".into(), HASH_A.into());
}

#[test]
fn dump_sample_cover() {
    // Solo para mirar la portada: MSB_DUMP_SVG=/ruta/archivo.svg cargo test dump_sample_cover
    if let Ok(path) = std::env::var("MSB_DUMP_SVG") {
        let s = Stats { generation: 1, remix_count: 3, lease_count: 4, total_earned_yocto: 2 * 10u128.pow(24), exclusive_sold: false, credited: true, battle_wins: 0 };
        let art = "32|0.0.0...0.0.0...0.0.0...0.0.0.0.|....2.......2.......2.......2...|4.3.2.1.0.1.2.3.4.5.6.7.6.5.4.3.|6.......4.......5.......3.......";
        std::fs::write(path, dynamic::svg("Noche en Cochabamba", "7", Some(art), &s)).unwrap();
    }
}

// ---------- proyecto sellado

#[test]
fn owner_seals_project_and_remixes_close() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_sealed_project("1".into(), "bafysealed".into());
    let v = c.get_beat("1".into()).unwrap();
    assert_eq!(v.sealed_cid.as_deref(), Some("bafysealed"));
    assert!(!v.remix_allowed);
}

#[test]
#[should_panic(expected = "Only the NFT owner")]
fn only_owner_seals() {
    let mut c = with_original(zero());
    set_caller("ingrid.testnet", zero());
    c.set_sealed_project("1".into(), "bafysealed".into());
}

#[test]
#[should_panic(expected = "already sealed")]
fn seal_only_once() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_sealed_project("1".into(), "bafysealed".into());
    c.set_sealed_project("1".into(), "bafyother".into());
}

#[test]
#[should_panic(expected = "project is sealed")]
fn sealed_beat_cannot_reopen_remixes() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_sealed_project("1".into(), "bafysealed".into());
    c.set_license("1".into(), zero(), true);
}


#[test]
fn migrate_from_v3_keeps_beats() {
    let mut c = with_original(zero());
    set_caller("favio.testnet", zero());
    c.set_sealed_project("1".into(), "bafysealed".into());
    let mut v3 = ContractV3 {
        tokens: std::mem::replace(&mut c.tokens, NonFungibleToken::new(StorageKey::NonFungibleToken, acc("x.testnet"), Some(StorageKey::TokenMetadata), Some(StorageKey::Enumeration), Some(StorageKey::Approval))),
        metadata: LazyOption::new(StorageKey::Metadata, None),
        beats: std::mem::replace(&mut c.beats, LookupMap::new(StorageKey::Beats)),
        remixes: LookupMap::new(StorageKey::Remixes),
        owner_earnings: LookupMap::new(StorageKey::OwnerEarnings),
        leases: LookupSet::new(StorageKey::Leases),
        by_fingerprint: LookupMap::new(StorageKey::ByFingerprint),
        next_id: c.next_id,
        mpc_contract: acc(DEFAULT_MPC_CONTRACT),
        sealed: std::mem::replace(&mut c.sealed, LookupMap::new(StorageKey::Sealed)),
    };
    v3.beats.flush();
    v3.sealed.flush();
    near_sdk::env::state_write(&v3);
    set_caller("beats.testnet", zero());
    let migrated = Contract::migrate();
    let b = migrated.get_beat("1".into()).unwrap();
    assert_eq!(b.title, "Original");
    assert_eq!(b.sealed_cid.as_deref(), Some("bafysealed"));
    assert!(migrated.get_battles(None).is_empty());
    assert!(migrated.get_critic().is_none());
}

// ---------- Remix Battles

const T0: u64 = 1_700_000_000_000; // ms de set_caller

fn at(caller: &str, deposit: NearToken, ms: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc("beats.testnet"))
        .predecessor_account_id(acc(caller))
        .signer_account_id(acc(caller))
        .attached_deposit(deposit)
        .account_balance(NearToken::from_near(100))
        .block_timestamp(ms * 1_000_000);
    testing_env!(b.build());
}

/// Semilla "1", batalla 0 de T0 a T0+1000 con 10 NEAR, crítico "critic.testnet".
fn with_battle() -> Contract {
    let mut c = with_original(zero());
    at("owner.testnet", near(10), T0 - 10);
    let id = c.create_battle("1".into(), "Week 1".into(), "Keep the bass".into(), U64(T0), U64(T0 + 1000));
    assert_eq!(id, 0);
    at("owner.testnet", zero(), T0 - 10);
    c.set_critic(Some(acc("critic.testnet")));
    c
}

fn enter(c: &mut Contract, who: &str, ms: u64) -> TokenId {
    at(who, zero(), ms);
    c.remix("1".into(), args(&format!("Remix {who}"), whole(&[]), zero())).token_id
}

fn sc(t: &str, score: u32) -> ScoreInput {
    ScoreInput { token_id: t.into(), score }
}

#[test]
#[should_panic(expected = "Only the contract admin")]
fn only_admin_creates_battles() {
    let mut c = with_original(zero());
    at("favio.testnet", zero(), T0);
    c.create_battle("1".into(), "x".into(), "".into(), U64(T0), U64(T0 + 1));
}

#[test]
fn battle_entries_and_funding() {
    let mut c = with_battle();
    enter(&mut c, "early.testnet", T0 - 1); // antes de abrir
    let a = enter(&mut c, "ana.testnet", T0 + 10);
    let b = enter(&mut c, "beto.testnet", T0 + 20);
    enter(&mut c, "late.testnet", T0 + 1000); // ya cerró
    assert_eq!(c.get_battle_entries(0), vec![a, b]);
    at("fan.testnet", near(2), T0 + 30);
    assert_eq!(c.fund_battle(0), near(12));
    let v = c.get_battle(0).unwrap();
    assert_eq!(v.entry_count, 2);
    assert_eq!(v.pool, near(12));
}

#[test]
fn sealed_remix_is_not_an_entry() {
    let mut c = with_battle();
    let a = enter(&mut c, "ana.testnet", T0 + 10);
    at("ana.testnet", zero(), T0 + 11);
    c.set_sealed_project(a, "bafysealed".into());
    assert!(c.get_battle_entries(0).is_empty());
}

#[test]
fn settle_pays_50_30_20_and_badge() {
    let mut c = with_battle();
    let a = enter(&mut c, "ana.testnet", T0 + 10);
    let b = enter(&mut c, "beto.testnet", T0 + 20);
    let d = enter(&mut c, "dani.testnet", T0 + 30);
    let e = enter(&mut c, "eva.testnet", T0 + 40);
    at("critic.testnet", zero(), T0 + 1000);
    let res = c.settle_battle(0, vec![sc(&a, 70), sc(&b, 90), sc(&d, 80), sc(&e, 10)], "bafyreviews".into());
    let order: Vec<_> = res.iter().map(|r| (r.token_id.clone(), r.prize)).collect();
    assert_eq!(order, vec![(b.clone(), near(5)), (d.clone(), near(3)), (a.clone(), near(2)), (e.clone(), zero())]);
    // El premio es ingreso: mitad al dueño del remix, mitad a sus autores.
    assert_eq!(c.get_owner_earnings(acc("beto.testnet")), milli(2500));
    assert_eq!(c.get_beat(b.clone()).unwrap().authors_balance, milli(2500));
    assert!(c.get_beat(b.clone()).unwrap().badges.contains(&"Battle winner".to_string()));
    assert!(!c.get_beat(d).unwrap().badges.contains(&"Battle winner".to_string()));
    let v = c.get_battle(0).unwrap();
    assert!(v.settled);
    assert_eq!(v.review_cid.as_deref(), Some("bafyreviews"));
}

#[test]
fn settle_with_two_entries_normalizes() {
    let mut c = with_battle();
    let a = enter(&mut c, "ana.testnet", T0 + 10);
    let b = enter(&mut c, "beto.testnet", T0 + 20);
    at("critic.testnet", zero(), T0 + 1000);
    let res = c.settle_battle(0, vec![sc(&a, 50), sc(&b, 50)], "bafy".into());
    // Empate: gana el que llegó antes. 5/8 y 3/8 de 10 NEAR.
    assert_eq!(res[0].token_id, a);
    assert_eq!(res[0].prize, NearToken::from_yoctonear(near(10).as_yoctonear() * 5 / 8));
    assert_eq!(res[1].prize, NearToken::from_yoctonear(near(10).as_yoctonear() * 3 / 8));
}

#[test]
fn settle_without_entries_returns_pool_to_admin() {
    let mut c = with_battle();
    at("critic.testnet", zero(), T0 + 1000);
    assert!(c.settle_battle(0, vec![], "bafy".into()).is_empty());
    assert_eq!(c.get_owner_earnings(acc("owner.testnet")), near(10));
}

#[test]
#[should_panic(expected = "Only the critic")]
fn only_critic_settles() {
    let mut c = with_battle();
    at("owner.testnet", zero(), T0 + 1000);
    c.settle_battle(0, vec![], "bafy".into());
}

#[test]
#[should_panic(expected = "still open")]
fn cannot_settle_early() {
    let mut c = with_battle();
    at("critic.testnet", zero(), T0 + 999);
    c.settle_battle(0, vec![], "bafy".into());
}

#[test]
#[should_panic(expected = "Score every entry")]
fn critic_must_score_everyone() {
    let mut c = with_battle();
    let a = enter(&mut c, "ana.testnet", T0 + 10);
    enter(&mut c, "beto.testnet", T0 + 20);
    at("critic.testnet", zero(), T0 + 1000);
    c.settle_battle(0, vec![sc(&a, 90)], "bafy".into());
}

#[test]
#[should_panic(expected = "not an entry")]
fn critic_cannot_reward_outsiders() {
    let mut c = with_battle();
    enter(&mut c, "ana.testnet", T0 + 10);
    at("critic.testnet", zero(), T0 + 1000);
    c.settle_battle(0, vec![sc("1", 90)], "bafy".into());
}

#[test]
#[should_panic(expected = "already settled")]
fn cannot_settle_twice() {
    let mut c = with_battle();
    at("critic.testnet", zero(), T0 + 1000);
    c.settle_battle(0, vec![], "bafy".into());
    c.settle_battle(0, vec![], "bafy".into());
}

#[test]
#[should_panic(expected = "This battle is closed")]
fn cannot_fund_after_close() {
    let mut c = with_battle();
    at("fan.testnet", near(1), T0 + 1000);
    c.fund_battle(0);
}
