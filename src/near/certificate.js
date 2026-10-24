// Certificado de licencia no exclusiva (SVG). Es un comprobante legible: la prueba real es on chain,
// y cualquiera puede verificarla llamando a has_lease(token_id, account_id) en el contrato.
import { CONTRACT_ID, explorerAccountUrl } from './config';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parte una cadena larga (cuentas implícitas, hashes) en líneas de `n` caracteres. */
const chunks = (s, n) => String(s).match(new RegExp(`.{1,${n}}`, 'g')) || [''];

/** Parte un texto en líneas por palabras, de hasta `n` caracteres. */
function words(s, n) {
  const lines = [];
  let line = '';
  for (const w of String(s).split(' ')) {
    if (line && (line + ' ' + w).length > n) { lines.push(line); line = w; } else line = line ? `${line} ${w}` : w;
  }
  return [...lines, line];
}

export function licenseCertificateSvg({ beat, licensee, verifiedAt = new Date() }) {
  const rows = [];
  let y = 150;
  const row = (label, value, mono = false) => {
    rows.push(`<text x="60" y="${y}" font-size="13" fill="#9aa0bd" letter-spacing="1.5">${esc(label.toUpperCase())}</text>`);
    y += 24;
    for (const line of mono ? chunks(value, 64) : words(value, 58)) {
      rows.push(`<text x="60" y="${y}" font-size="${mono ? 14 : 18}" fill="#eceef7" font-family="${mono ? 'monospace' : 'sans-serif'}">${esc(line)}</text>`);
      y += mono ? 20 : 26;
    }
    y += 14;
  };
  row('Beat', `#${beat.token_id} · ${beat.title}`);
  row('Licensee', licensee, true);
  row('Creator', beat.creator, true);
  row('License', 'Non-exclusive license to use this beat (e.g. record over it and release the result), one per account.');
  if (beat.license_uri) row('License terms', beat.license_uri, true);
  row('Audio SHA-256', beat.audio_hash, true);
  row('Verify on chain', `${CONTRACT_ID} · has_lease({"token_id":"${beat.token_id}","account_id":"${licensee}"})`, true);
  row('Verified', verifiedAt.toISOString().slice(0, 10));

  const h = y + 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${h}" viewBox="0 0 800 ${h}" font-family="sans-serif">
<rect width="800" height="${h}" rx="28" fill="#12141f"/>
<rect x="20" y="20" width="760" height="${h - 40}" rx="20" fill="none" stroke="#ffc04d" stroke-opacity="0.5"/>
<text x="60" y="80" font-size="30" font-weight="bold" fill="#eceef7">MuSecure <tspan fill="#ff6e57">Beats</tspan></text>
<text x="60" y="112" font-size="18" fill="#ffc04d">Non-exclusive license certificate</text>
${rows.join('\n')}
<text x="60" y="${h - 56}" font-size="12" fill="#9aa0bd">This certificate is a readable copy. The license itself lives on NEAR:</text>
<text x="60" y="${h - 38}" font-size="12" fill="#9aa0bd">${esc(explorerAccountUrl(CONTRACT_ID))}</text>
</svg>`;
}
