import { useState } from 'react';
import { Monk } from './Monk';

// Franja de bienvenida: dice en 5 segundos qué es la app, por qué es especial y por dónde empezar.

// Oculta solo hasta recargar la página: cada visita vuelve a mostrarla.
export function Hero({ playing, onPlay, onTour, onOpen }) {
  const [gone, setGone] = useState(false);
  if (gone) {
    return <button className="mini hero-show" onClick={() => setGone(false)}>ⓘ What is MuSecure Beats?</button>;
  }
  const hide = () => setGone(true);
  return (
    <section className="hero" aria-label="What is MuSecure Beats">
      <div className="hero-text">
        <h2>Make a beat. Mint it on NEAR. It earns every time someone remixes it.</h2>
        <ul className="hero-pillars">
          <li><button className="link" onClick={() => onOpen('gallery')}><strong>An NFT that owns money</strong></button> — each beat keeps and pays its authors, has its own wallet on Monad, and can hide its source for the owner only.</li>
          <li><button className="link" onClick={() => onOpen('tree')}><strong>Royalties that flow up</strong></button> — every remix pays its original, forever, across the whole tree.</li>
          <li><button className="link" onClick={() => onOpen('battles')}><strong>Weekly battles judged by an AI</strong></button> — The Monk scores every remix on NEAR AI, and the contract pays the winners.</li>
        </ul>
        <div className="bar">
          <button className="primary" onClick={onPlay}>{playing ? '■ Stop' : '▶ Play the example beat'}</button>
          <button className="accent" onClick={onTour}>Take the 1-minute tour</button>
          <button className="mini" onClick={hide}>Hide</button>
        </div>
      </div>
      <div className="hero-monk" aria-hidden="true"><Monk mood={playing ? 'listening' : 'calm'} bpm={96} fader={0.6} size={120} /></div>
    </section>
  );
}
