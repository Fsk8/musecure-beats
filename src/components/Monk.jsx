import { useEffect, useState } from 'react';

/**
 * The Monk: el crítico de las Remix Battles. Un robot productor que alcanzó la iluminación escuchando.
 * Barba de cables de audio, ojos LED casi siempre cerrados, una consola con un solo fader en el regazo.
 *
 * mood: 'calm' | 'listening' | 'surprised' | 'pleased' | 'bored'
 * bpm:  tempo al que mueve la cabeza mientras escucha
 * fader: 0..1, cuánto sube el fader (1 = ganador, se ilumina)
 */
export function Monk({ mood = 'calm', bpm = 90, fader = 0.3, size = 160 }) {
  const beat = 60 / Math.max(40, Math.min(200, bpm || 90));
  const open = mood === 'surprised';
  const glow = fader >= 0.99;
  return (
    <svg
      className={`monk monk-${mood}${glow ? ' monk-glow' : ''}`}
      viewBox="0 0 200 230"
      width={size}
      height={size * 1.15}
      role="img"
      aria-label={`The Monk, ${mood}`}
      style={{ '--beat': `${beat * 2}s` }}
    >
      {/* aura */}
      <ellipse className="monk-aura" cx="100" cy="120" rx="92" ry="100" />
      {/* cojín */}
      <ellipse cx="100" cy="212" rx="72" ry="13" fill="#7a3cff" opacity=".35" />
      <g className="monk-float">
        {/* cojín de meditación */}
        <ellipse cx="100" cy="196" rx="70" ry="16" fill="#b0418a" />
        <ellipse cx="100" cy="191" rx="64" ry="11" fill="#d1569f" />

        {/* piernas cruzadas */}
        <rect x="38" y="164" width="78" height="22" rx="11" fill="#8b93ad" transform="rotate(-6 77 175)" />
        <rect x="84" y="164" width="78" height="22" rx="11" fill="#9ea6bf" transform="rotate(6 123 175)" />
        {/* pies de metal (descalzo) */}
        <g fill="#c7cde0" stroke="#6b728c" strokeWidth="1.5">
          <path d="M150 162 q16 -2 18 10 q-2 8 -18 6 z" />
          <path d="M50 162 q-16 -2 -18 10 q2 8 18 6 z" />
          <circle cx="164" cy="165" r="1.6" /><circle cx="167" cy="169" r="1.6" />
          <circle cx="36" cy="165" r="1.6" /><circle cx="33" cy="169" r="1.6" />
        </g>

        {/* torso */}
        <rect x="62" y="104" width="76" height="66" rx="18" fill="#a9b0c8" stroke="#6b728c" strokeWidth="2" />
        <rect x="74" y="114" width="52" height="8" rx="4" fill="#6b728c" opacity=".35" />

        {/* brazos hacia la consola */}
        <path d="M66 120 q-18 22 4 42" stroke="#8b93ad" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M134 120 q18 22 -4 42" stroke="#8b93ad" strokeWidth="12" fill="none" strokeLinecap="round" />

        {/* consola con un solo fader */}
        <g transform="translate(70 148)">
          <rect width="60" height="26" rx="6" fill="#20243a" stroke="#454b6a" strokeWidth="2" />
          <rect x="8" y="12" width="44" height="3" rx="1.5" fill="#454b6a" />
          <rect className="monk-fader-trail" x="8" y="12" width={44 * fader} height="3" rx="1.5" />
          <rect className="monk-fader" x={4 + 44 * fader} y="6" width="9" height="15" rx="2" />
          <circle cx="54" cy="6" r="2" className="monk-led" />
        </g>

        {/* cabeza: se mueve con el beat */}
        <g className="monk-head">
          {/* cuello */}
          <rect x="90" y="92" width="20" height="16" rx="4" fill="#8b93ad" />
          {/* cráneo */}
          <rect x="62" y="30" width="76" height="62" rx="24" fill="#c7cde0" stroke="#6b728c" strokeWidth="2" />
          {/* antena-auricular */}
          <path d="M66 52 q-8 -26 34 -30 q42 4 34 30" stroke="#454b6a" strokeWidth="5" fill="none" />
          <rect x="56" y="48" width="12" height="22" rx="5" fill="#454b6a" />
          <rect x="132" y="48" width="12" height="22" rx="5" fill="#454b6a" />
          {/* visor */}
          <rect x="72" y="50" width="56" height="26" rx="12" fill="#20243a" />
          {/* ojos LED */}
          {open ? (
            <g className="monk-eyes-open">
              <circle cx="88" cy="63" r="6.5" />
              <circle cx="112" cy="63" r="6.5" />
            </g>
          ) : mood === 'pleased' ? (
            <g className="monk-eyes" fill="none" strokeWidth="3" strokeLinecap="round">
              <path d="M81 66 q7 -8 14 0" />
              <path d="M105 66 q7 -8 14 0" />
            </g>
          ) : mood === 'bored' ? (
            <g className="monk-eyes" strokeWidth="3" strokeLinecap="round">
              <path d="M81 62 h14" /><path d="M105 62 h14" />
              <path d="M83 66 h10" opacity=".5" /><path d="M107 66 h10" opacity=".5" />
            </g>
          ) : (
            <g className="monk-eyes" fill="none" strokeWidth="3" strokeLinecap="round">
              <path d="M81 61 q7 7 14 0" />
              <path d="M105 61 q7 7 14 0" />
            </g>
          )}
          {/* barba: larga, esponjosa, con cables de audio enredados (se mece) */}
          <g className="monk-beard"><g transform="matrix(1 0 0 0.82 0 14)">
            <path className="beard-hair" d="M66 74 C60 96 66 118 78 134 C84 146 92 156 100 160 C108 156 116 146 122 134 C134 118 140 96 134 74
              C128 82 120 86 112 86 C106 90 94 90 88 86 C80 86 72 82 66 74 Z" />
            <g className="beard-strands" fill="none" strokeLinecap="round" strokeWidth="1.6">
              <path d="M76 96 C78 110 82 122 88 134" /><path d="M90 98 C90 116 94 132 98 148" />
              <path d="M110 98 C110 116 106 132 102 148" /><path d="M124 96 C122 110 118 122 112 134" />
              <path d="M84 112 C86 122 90 130 94 138" /><path d="M116 112 C114 122 110 130 106 138" />
            </g>
            {/* cables enredados en la barba, con jacks en la punta */}
            <g fill="none" strokeLinecap="round" strokeWidth="2.6">
              <path d="M82 92 C76 110 92 118 84 140" stroke="#ffcf4a" />
              <path d="M104 94 C112 112 96 126 106 152" stroke="#ff6e57" />
              <path d="M120 90 C128 106 114 118 120 132" stroke="#6f8cff" />
            </g>
            <g fill="#c7cde0">
              <rect x="81" y="138" width="6" height="8" rx="1.5" />
              <rect x="103" y="150" width="6" height="8" rx="1.5" />
              <rect x="117" y="130" width="6" height="8" rx="1.5" />
            </g>
            {/* bigote */}
            <path className="beard-hair" d="M78 80 C86 74 96 76 100 80 C104 76 114 74 122 80 C116 88 106 86 100 84 C94 86 84 88 78 80 Z" />
          </g></g>
          {/* boca */}
          {open ? <circle cx="100" cy="90" r="3.5" fill="#454b6a" />
            : mood === 'pleased' ? <path d="M93 89 q7 5 14 0" stroke="#454b6a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              : <path d="M95 90 h10" stroke="#454b6a" strokeWidth="2.5" strokeLinecap="round" />}
        </g>

        {/* notas que flotan cuando escucha */}
        {mood === 'listening' && (
          <g className="monk-notes" fill="#ffcf4a">
            <text x="150" y="44" fontSize="18">♪</text>
            <text x="34" y="60" fontSize="14">♫</text>
          </g>
        )}
      </g>
    </svg>
  );
}

/** Texto que aparece letra por letra, como si The Monk lo dijera. */
export function useTypewriter(text, speed = 22) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return undefined;
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return { shown: (text || '').slice(0, n), done: n >= (text || '').length };
}

export function Bubble({ children, small = false }) {
  return <div className={`monk-bubble${small ? ' small' : ''}`}>{children}</div>;
}

/** Frases de The Monk para cada momento de una batalla. */
export const MONK_LINES = {
  upcoming: ['Soon, a seed. Sit with it before you touch it.', 'Rest your ears. They will need it.'],
  open: ['The seed is waiting. Listen first. Then remove.', 'Keep what is true. Change what is loud.', 'Less. Then less again.', 'I will hear everything. Even what you hide.'],
  judging: ['Silence, please. I am listening.', 'Every remix deserves one honest ear.'],
  settled: ['I have spoken. Press play and hear why.', 'The fader has decided.'],
  empty: ['No one came. The silence was beautiful, though.'],
};

export function pickLine(list, seed = 0) {
  return list[Math.abs(seed) % list.length];
}

/** Mantra de respaldo para batallas juzgadas antes de que The Monk tuviera voz. */
export function fallbackMantra(score) {
  if (score >= 80) return 'This one breathes. Leave it alone.';
  if (score >= 60) return 'Good bones. Remove one more thing.';
  if (score >= 40) return 'You are hiding behind the seed.';
  return 'Start again. Listen longer.';
}

// ---------- voz de The Monk (síntesis de voz del navegador: sin servidor, sin costo)

const VOICE_KEY = 'msb-monk-voice';
export function voiceEnabled() {
  try { return localStorage.getItem(VOICE_KEY) !== 'off'; } catch { return true; }
}
export function setVoiceEnabled(on) {
  try { localStorage.setItem(VOICE_KEY, on ? 'on' : 'off'); } catch { /* preferencia: si no se guarda, no pasa nada */ }
  if (!on) stopSpeaking();
}
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** La voz más grave y calmada disponible en inglés. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const prefer = ['Daniel', 'Google UK English Male', 'Fred', 'Alex', 'Microsoft Guy', 'Microsoft David', 'Aaron', 'Arthur'];
  for (const name of prefer) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices[0] || null;
}

/** Dice las frases una tras otra, lento y grave. Devuelve una promesa que termina al callar. */
export function speak(lines) {
  if (!canSpeak() || !voiceEnabled()) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = pickVoice();
  const list = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  return new Promise((resolve) => {
    list.forEach((text, k) => {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'en-US';
      u.rate = 0.86;
      u.pitch = 0.55;
      if (k === list.length - 1) { u.onend = resolve; u.onerror = resolve; }
      synth.speak(u);
    });
    if (!list.length) resolve();
  });
}
export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// ---------- tarjeta para compartir el veredicto

/** Copia el SVG con los estilos ya calculados en línea, para poder dibujarlo en un canvas. */
function svgWithInlineStyles(svg) {
  const clone = svg.cloneNode(true);
  const src = svg.querySelectorAll('*');
  const dst = clone.querySelectorAll('*');
  const props = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-linecap'];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    props.forEach((p) => dst[i].setAttribute(p, cs.getPropertyValue(p)));
    dst[i].removeAttribute('class');
  });
  clone.removeAttribute('class');
  clone.setAttribute('width', '400');
  clone.setAttribute('height', '460');
  return new XMLSerializer().serializeToString(clone);
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Imagen 1200×630 (formato de X/Twitter) con The Monk, el ganador, la nota y el mantra. */
export async function verdictCard({ svgEl, battleTitle, beatTitle, creator, score, mantra, prize, url }) {
  const W = 1200; const H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1b1530'); g.addColorStop(1, '#12141f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(122,60,255,.25)';
  ctx.beginPath(); ctx.arc(250, 330, 250, 0, Math.PI * 2); ctx.fill();

  if (svgEl) {
    const blob = new Blob([svgWithInlineStyles(svgEl)], { type: 'image/svg+xml' });
    const src = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      ctx.drawImage(img, 50, 90, 400, 460);
    } catch { /* sin personaje, la tarjeta igual sirve */ }
    URL.revokeObjectURL(src);
  }

  const x = 500; const max = W - x - 60;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffcf4a';
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  ctx.fillText('THE MONK HAS SPOKEN', x, 70);
  ctx.fillStyle = '#9aa0bd';
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  ctx.fillText(battleTitle, x, 106);

  ctx.fillStyle = '#eceef7';
  ctx.font = '800 54px Inter, system-ui, sans-serif';
  let y = 160;
  for (const l of wrap(ctx, `“${beatTitle}”`, max).slice(0, 2)) { ctx.fillText(l, x, y); y += 62; }
  ctx.fillStyle = '#9aa0bd';
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillText(`by ${creator}`, x, y + 4);
  y += 52;

  ctx.fillStyle = '#7ef0c1';
  ctx.font = '800 96px Inter, system-ui, sans-serif';
  ctx.fillText(String(score), x, y);
  const sw = ctx.measureText(String(score)).width;
  ctx.fillStyle = '#9aa0bd';
  ctx.font = '600 34px Inter, system-ui, sans-serif';
  ctx.fillText('/100', x + sw + 8, y + 50);
  if (prize) {
    ctx.fillStyle = '#ffcf4a';
    ctx.fillText(`+${prize}`, x + sw + 110, y + 50);
  }
  y += 120;

  ctx.fillStyle = '#eceef7';
  ctx.font = 'italic 500 30px Georgia, serif';
  for (const l of wrap(ctx, `“${mantra}”`, max).slice(0, 2)) { ctx.fillText(l, x, y); y += 40; }

  ctx.fillStyle = '#9aa0bd';
  ctx.font = '500 20px Inter, system-ui, sans-serif';
  ctx.fillText('Judged by an AI on NEAR AI Cloud · signed in a TEE · paid on NEAR', x, H - 76);
  ctx.fillStyle = '#ff6e57';
  ctx.font = '700 22px Inter, system-ui, sans-serif';
  ctx.fillText(url.replace(/^https?:\/\//, ''), x, H - 46);

  return new Promise((res) => c.toBlob(res, 'image/png'));
}
