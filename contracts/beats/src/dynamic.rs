//! NFT dinámico: la portada (SVG) se genera on chain a partir de las notas del beat, y las
//! insignias y el nivel cambian con lo que le pasa al beat (remixes, licencias, ganancias).
//! Nada de esto se guarda: se calcula en cada lectura, así el NFT siempre está al día.

use near_sdk::base64::{engine::general_purpose::STANDARD, Engine};
use near_sdk::require;

/// Colores de las 4 pistas (batería, bajo, lead, acordes), los mismos de la app.
const TRACK_COLORS: [&str; 4] = ["#ff6e57", "#34c895", "#6f8cff", "#c27bf0"];
const ART_CHARS: &str = "01234567.";
/// Máximo de caracteres de `art`: "64|" + 4 pistas de 64 pasos + separadores.
pub const MAX_ART: usize = 3 + 4 * 64 + 3;

/// `art`: "<largo>|<pista0>|<pista1>|<pista2>|<pista3>". Cada pista tiene un carácter por paso:
/// la fila de la nota más aguda ("0" arriba … "7" abajo) o "." si el paso está vacío.
pub fn validate_art(art: &str) {
    require!(art.len() <= MAX_ART, "art: too long");
    let parts: Vec<&str> = art.split('|').collect();
    require!(parts.len() == 5, "art: expected the length and 4 tracks");
    let len: usize = parts[0].parse().unwrap_or(0);
    require!(matches!(len, 16 | 32 | 64), "art: length must be 16, 32 or 64");
    for track in &parts[1..] {
        require!(track.len() == len, "art: each track needs one character per step");
        require!(track.chars().all(|c| ART_CHARS.contains(c)), "art: invalid characters");
    }
}

/// Lo que define el estado dinámico de un beat.
pub struct Stats {
    pub generation: u32,
    pub remix_count: u32,
    pub lease_count: u32,
    pub total_earned_yocto: u128,
    pub exclusive_sold: bool,
    pub credited: bool,
    pub battle_wins: u32,
}

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;

/// Insignias que se ganan con el uso. El orden importa: es como se muestran.
pub fn badges(s: &Stats) -> Vec<&'static str> {
    let mut out = Vec::new();
    out.push(if s.generation == 0 { "Original" } else { "Remix" });
    if s.remix_count >= 1 { out.push("Remixed"); }
    if s.remix_count >= 3 { out.push("Seed"); }
    if s.lease_count >= 1 { out.push("Licensed"); }
    if s.lease_count >= 10 { out.push("Popular"); }
    if s.total_earned_yocto > 0 { out.push("Earns royalties"); }
    if s.total_earned_yocto >= ONE_NEAR { out.push("1 NEAR earned"); }
    if s.exclusive_sold { out.push("Exclusive sold"); }
    if s.battle_wins >= 1 { out.push("Battle winner"); }
    if s.credited { out.push("Collaborative"); }
    out
}

/// Nivel del 1 al 10: sube con remixes, licencias y ganancias.
pub fn level(s: &Stats) -> u32 {
    let earned = (s.total_earned_yocto / (ONE_NEAR / 2)).min(4) as u32;
    (1 + s.remix_count * 2 + s.lease_count + earned + s.battle_wins * 2).min(10)
}

fn escape(text: &str) -> String {
    text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}

/// Portada del NFT: las notas de cada pista como un mini piano roll, más nivel e insignias.
pub fn svg(title: &str, token_id: &str, art: Option<&str>, s: &Stats) -> String {
    let mut out = String::with_capacity(6000);
    out.push_str(r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" font-family="monospace">"##);
    out.push_str(r##"<rect width="400" height="400" rx="24" fill="#12141f"/>"##);

    let lane_h = 52.0_f64;
    let top = 64.0_f64;
    if let Some(art) = art {
        let parts: Vec<&str> = art.split('|').collect();
        let len: f64 = parts[0].parse().unwrap_or(16.0);
        let step_w = 352.0 / len;
        for (t, track) in parts[1..].iter().enumerate() {
            let y0 = top + t as f64 * (lane_h + 8.0);
            out.push_str(&format!(
                r##"<rect x="24" y="{y0:.1}" width="352" height="{lane_h}" rx="8" fill="{}" fill-opacity="0.08"/>"##,
                TRACK_COLORS[t]
            ));
            for (i, c) in track.chars().enumerate() {
                if let Some(row) = c.to_digit(10) {
                    let y = y0 + 4.0 + row as f64 * ((lane_h - 12.0) / 7.0);
                    out.push_str(&format!(
                        r##"<rect x="{:.1}" y="{y:.1}" width="{:.1}" height="8" rx="2" fill="{}"/>"##,
                        24.0 + i as f64 * step_w + 1.0,
                        (step_w - 2.0).max(1.0),
                        TRACK_COLORS[t]
                    ));
                }
            }
        }
    } else {
        out.push_str(r##"<text x="200" y="190" text-anchor="middle" fill="#9aa0bd" font-size="14">MuSecure Beats</text>"##);
    }

    let title: String = title.chars().take(26).collect();
    out.push_str(&format!(
        r##"<text x="24" y="42" fill="#eceef7" font-size="20" font-weight="bold">{}</text>"##,
        escape(&title)
    ));
    out.push_str(&format!(
        r##"<text x="376" y="42" text-anchor="end" fill="#ffc04d" font-size="16">#{} · Lv {}</text>"##,
        escape(token_id),
        level(s)
    ));

    // Insignias como etiquetas, en una o dos filas.
    let (mut x, mut y) = (24.0_f64, 322.0_f64);
    for b in badges(s) {
        let w = 14.0 + b.chars().count() as f64 * 7.2;
        if x + w > 376.0 {
            x = 24.0;
            y += 30.0;
        }
        out.push_str(&format!(
            r##"<rect x="{x:.1}" y="{y:.1}" width="{w:.1}" height="22" rx="11" fill="#2c3047"/><text x="{:.1}" y="{:.1}" fill="#eceef7" font-size="12">{}</text>"##,
            x + 7.0,
            y + 15.0,
            escape(b)
        ));
        x += w + 6.0;
    }
    out.push_str("</svg>");
    out
}

pub fn svg_data_uri(svg: &str) -> String {
    format!("data:image/svg+xml;base64,{}", STANDARD.encode(svg))
}

/// Ruta de derivación de Chain Signatures de la cuenta propia de cada beat.
pub fn beat_path(token_id: &str) -> String {
    format!("beat-{token_id}")
}
