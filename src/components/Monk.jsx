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
          {/* barba de cables (se mece) */}
          <g className="monk-beard" fill="none" strokeLinecap="round" strokeWidth="3.2">
            <path d="M80 84 C70 104 84 112 74 132" stroke="#e8e8ee" />
            <path d="M88 86 C84 108 98 114 88 140" stroke="#ffcf4a" />
            <path d="M96 87 C98 110 90 118 98 146" stroke="#e8e8ee" />
            <path d="M104 87 C110 110 100 120 108 144" stroke="#ff6e57" />
            <path d="M112 86 C118 106 108 116 118 138" stroke="#e8e8ee" />
            <path d="M120 84 C130 102 118 112 128 130" stroke="#6f8cff" />
            {/* puntas: jacks */}
            <g fill="#c7cde0" stroke="none">
              <rect x="71" y="130" width="6" height="8" rx="1.5" />
              <rect x="85" y="138" width="6" height="8" rx="1.5" />
              <rect x="95" y="144" width="6" height="8" rx="1.5" />
              <rect x="105" y="142" width="6" height="8" rx="1.5" />
              <rect x="115" y="136" width="6" height="8" rx="1.5" />
              <rect x="125" y="128" width="6" height="8" rx="1.5" />
            </g>
          </g>
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
          {/* boca */}
          {open ? <circle cx="100" cy="84" r="3" fill="#454b6a" />
            : mood === 'pleased' ? <path d="M93 82 q7 5 14 0" stroke="#454b6a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              : <path d="M95 84 h10" stroke="#454b6a" strokeWidth="2.5" strokeLinecap="round" />}
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
