import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine, loopSeconds } from './audio/engine';
import { playhead } from './audio/playhead';
import { KITS, ROOTS, SCALES, TRACKS, VEL, computeTheory } from './music/theory';
import {
  defaultState, emptyGrid, extendPattern, fileSafeName, nextCell, parseProjectFile, projectFile,
  beatArt, moveBar, quantizeTrack, randomTrack, rotateTrack,
} from './music/patterns';
import { audioBufferToWav, downloadBlob } from './io/files';
import { midiBlob } from './music/midi';
import { useBeatState } from './state/useBeatState';
import { BASSES, LEADS, PADS } from './audio/presets';
import { Transport, ConfirmRandomAll } from './components/Transport';
import { SoundPanel } from './components/SoundPanel';
import { Mixer } from './components/Mixer';
import { TrackEditor } from './components/TrackEditor';
import { MonkPath } from './components/MonkPath';
import { SavePanel } from './components/SavePanel';
import { AccountBar } from './components/AccountBar';
import { Gallery } from './components/Gallery';
import { Drawer } from './components/Drawer';
import { Earnings } from './components/Earnings';
import { Battles } from './components/Battles';
import { Guide } from './components/Guide';
import { Hero } from './components/Hero';
import { RoyaltyTree } from './components/RoyaltyTree';
import { RegisterPanel } from './components/RegisterPanel';

// Paneles de exploración: más anchos y por encima del estudio.
const WIDE = new Set(['gallery', 'battles', 'tree']);

export default function App() {
  const [S, mutate, replaceState] = useBeatState();
  const octKey = S.oct.join(',');
  const theory = useMemo(() => computeTheory(S.root, S.scale, S.oct), [S.root, S.scale, octKey]);

  const [playing, setPlaying] = useState(false);
  const [follow, setFollow] = useState(true);
  const [confirmAll, setConfirmAll] = useState(false);
  const [qGrid, setQGrid] = useState(2);
  const [undoBuf, setUndoBuf] = useState(null);
  const [qMessage, setQMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [recProgress, setRecProgress] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [wavLoops, setWavLoops] = useState(4);
  // Panel lateral abierto: 'save' | 'register' | 'gallery' | null.
  const [drawer, setDrawer] = useState(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const toggleDrawer = (id) => setDrawer((d) => (d === id ? null : id));
  // Botones como "Registrar beat" piden abrir un panel con este evento.
  useEffect(() => {
    const onOpen = (e) => { if (['save', 'register', 'gallery', 'earnings', 'battles', 'tree', 'guide'].includes(e.detail)) setDrawer(e.detail); };
    const onTree = (e) => { setTreeRoot(e.detail); setDrawer('tree'); };
    window.addEventListener('msb:open-panel', onOpen);
    window.addEventListener('msb:open-tree', onTree);
    return () => { window.removeEventListener('msb:open-panel', onOpen); window.removeEventListener('msb:open-tree', onTree); };
  }, []);
  const [treeRoot, setTreeRoot] = useState(null);
  // Tema: oscuro por defecto; la elección se guarda en este navegador.
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('msb-theme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('msb-theme', theme); } catch { /* solo esta sesión */ }
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  // Una vez registrado, el beat abierto pasa a ser el nuevo remix: se quita el vínculo pendiente.
  const clearRemix = () => mutate((d) => { d.remixOf = null; });
  /** Al registrar: avisa al tutorial (¿era remix? ¿de la semilla de una batalla?) y suelta el vínculo de remix. */
  const onRegistered = (beat) => {
    let battleSeed = null;
    try { battleSeed = sessionStorage.getItem('msb-battle-seed'); sessionStorage.removeItem('msb-battle-seed'); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new CustomEvent('msb:registered', { detail: { beat, remixOf: S.remixOf, battleSeed } }));
    clearRemix();
  };
  // Preferencia del equipo, no del beat: por eso no va en el proyecto.
  const [lite, setLite] = useState(() => { try { return localStorage.getItem('msb-lite') === '1'; } catch { return false; } });

  // El motor lee siempre la versión más reciente del estado a través de refs.
  const stateRef = useRef(S);
  const theoryRef = useRef(theory);
  stateRef.current = S;
  theoryRef.current = theory;

  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new AudioEngine({
      getState: () => stateRef.current,
      getTheory: () => theoryRef.current,
      onStep: playhead.set,
    });
  }
  const engine = engineRef.current;

  useEffect(() => {
    engine.sync(S);
  }, [S, engine]);

  useEffect(() => {
    engine.setLite(lite);
    try { localStorage.setItem('msb-lite', lite ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }, [lite, engine]);

  // Si el largo baja, la página actual puede quedar fuera.
  useEffect(() => {
    if (S.page >= S.len / 16) mutate((d) => { d.page = 0; });
  }, [S.len, S.page, mutate]);

  async function togglePlay() {
    await engine.init();
    if (engine.playing) {
      engine.stop();
      setPlaying(false);
    } else {
      window.dispatchEvent(new Event('msb:stop-gallery'));
      engine.start();
      setPlaying(true);
    }
  }

  // La galería pide parar el secuenciador cuando empieza a sonar un beat registrado.
  useEffect(() => {
    const stop = () => { if (engine.playing) { engine.stop(); setPlaying(false); } };
    window.addEventListener('msb:stop-sequencer', stop);
    return () => window.removeEventListener('msb:stop-sequencer', stop);
  }, [engine]);

  /**
   * Stems para quien tiene licencia: cada pista por separado en WAV, renderizadas del proyecto en IPFS.
   * No toca el beat abierto. `onProgress(texto)` informa el avance.
   */
  async function renderStems(projectText, beat, onProgress) {
    const project = parseProjectFile(projectText);
    for (let t = 0; t < TRACKS.length; t++) {
      onProgress(`Rendering ${TRACKS[t].name} (${t + 1}/${TRACKS.length})…`);
      const solo = { ...project, mix: project.mix.map((m, i) => ({ ...m, mute: false, solo: i === t })) };
      // eslint-disable-next-line no-await-in-loop
      const buffer = await engine.renderOffline(1, () => {}, solo);
      downloadBlob(audioBufferToWav(buffer), `${fileSafeName(beat.title)}-${beat.token_id}-${TRACKS[t].id}.wav`);
    }
  }

  /** El dueño abre su proyecto sellado (ya descifrado) para seguir trabajándolo. No es un remix: es suyo. */
  function openSealedFromGallery(text, beat) {
    const loaded = parseProjectFile(text);
    if (!window.confirm(`This replaces your open beat with your sealed project "${beat.title}". Continue?`)) return;
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setUndoBuf(null);
    replaceState({ ...loaded, remixOf: null, tab: S.tab, page: 0, emode: S.emode });
    setSaveMessage(`Opened your sealed project #${beat.token_id} "${beat.title}".`);
    setDrawer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Abre en el secuenciador el proyecto de un beat registrado (descargado de IPFS) para remixarlo. */
  function openFromGallery(text, beat, opts = {}) {
    const loaded = parseProjectFile(text);
    if (!window.confirm(`This replaces your open beat with "${beat.title}". Save it first if you want to keep it. Continue?`)) return;
    // Remix desde una batalla: se marca recién ahora (después de confirmar), para el tutorial.
    try {
      if (opts.battle) sessionStorage.setItem('msb-battle-seed', String(beat.token_id));
      else sessionStorage.removeItem('msb-battle-seed');
    } catch { /* sin almacenamiento */ }
    const link = { token_id: beat.token_id, title: beat.title, creator: beat.creator, remix_price: beat.remix_price, project_cid: beat.project_cid };
    loaded.remixOf = link;
    // Sin nombre: el panel de registro pide uno propio (sugiere "My remix of …").
    loaded.title = '';
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setUndoBuf(null);
    replaceState({ ...loaded, tab: S.tab, page: 0, emode: S.emode });
    setSaveMessage(`Opened for remixing: #${beat.token_id} "${beat.title}". When you register it, it will be its remix.`);
    setDrawer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Empieza un beat desde cero (sin notas y sin vínculo de remix). */
  function newBeat() {
    if (!window.confirm('Start a new beat from scratch? Your current beat will be replaced; save it first if you want to keep it.')) return;
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setUndoBuf(null);
    replaceState({ ...defaultState(), title: 'New beat', tab: S.tab, emode: S.emode });
    setSaveMessage('New beat.');
  }

  function handleCell(r, c) {
    const t = S.tab;
    const [g, p] = nextCell(S.emode, S.g[t][r][c], S.p[t][r][c]);
    mutate((d) => { d.g[t][r][c] = g; d.p[t][r][c] = p; });
    if (g) engine.preview(t, r, VEL[g]);
  }

  function handleLenChange(newLen) {
    mutate((d) => {
      extendPattern(d, d.len, newLen);
      d.len = newLen;
    });
  }

  function randomizeCurrent() {
    const { g, p } = randomTrack(S.tab, S.len, theory);
    mutate((d) => { d.g[d.tab] = g; d.p[d.tab] = p; });
  }

  function randomizeAll() {
    const fresh = TRACKS.map((_, t) => randomTrack(t, S.len, theory));
    mutate((d) => {
      fresh.forEach(({ g, p }, t) => { d.g[t] = g; d.p[t] = p; });
    });
    setConfirmAll(false);
  }

  /** Cambia kit y sonidos al azar, sin tocar las notas ni la escala. */
  function randomizeSounds() {
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    mutate((d) => {
      d.kit = any(Object.keys(KITS));
      d.wave = any(Object.keys(LEADS));
      d.bassSound = any(Object.keys(BASSES));
      d.pad = any(Object.keys(PADS));
      d.arp = any(['off', 'off', 'up', 'down', 'updown', 'rand']);
    });
  }

  /** Corre la pista actual un paso (dir -1 izquierda, +1 derecha). */
  function shiftTrack(dir) {
    const { g, p } = rotateTrack(S.g[S.tab], S.p[S.tab], S.len, dir);
    mutate((d) => { d.g[d.tab] = g; d.p[d.tab] = p; });
  }

  /** Arrastrar un compás a otro lugar: en la pista actual o en todas. */
  function handleMoveBar(from, to, allTracks) {
    mutate((d) => {
      moveBar(d, from, to, allTracks ? [0, 1, 2, 3] : [d.tab]);
      d.page = to;
    });
  }

  function clearTrack() {
    mutate((d) => {
      d.g[d.tab] = emptyGrid(TRACKS[d.tab].rows);
      d.p[d.tab] = emptyGrid(TRACKS[d.tab].rows, 100);
    });
  }

  function quantize() {
    const t = S.tab;
    setUndoBuf({ t, g: structuredClone(S.g[t]), p: structuredClone(S.p[t]) });
    const { g, p, moved } = quantizeTrack(S.g[t], S.p[t], qGrid, S.len);
    mutate((d) => { d.g[t] = g; d.p[t] = p; });
    setQMessage(moved ? `${moved} note${moved > 1 ? 's' : ''} quantized` : 'Already quantized');
  }

  function undoQuantize() {
    if (!undoBuf) return;
    mutate((d) => { d.g[undoBuf.t] = undoBuf.g; d.p[undoBuf.t] = undoBuf.p; });
    setUndoBuf(null);
    setQMessage('Undone');
  }

  function saveProject() {
    const blob = new Blob([projectFile(S)], { type: 'application/json' });
    downloadBlob(blob, `${fileSafeName(S.title)}.musecure.json`);
    setSaveMessage(`Project saved: ${fileSafeName(S.title)}.musecure.json (check your downloads folder).`);
  }

  async function openProject(file) {
    try {
      const loaded = parseProjectFile(await file.text());
      if (engine.playing) { engine.stop(); setPlaying(false); }
      setUndoBuf(null);
      replaceState({ ...loaded, tab: S.tab, page: 0, emode: S.emode });
      setSaveMessage(`Opened: ${loaded.title}`);
    } catch (err) {
      setSaveMessage(err.message);
    }
  }

  async function exportWav() {
    setRecording(true);
    setRecProgress(0);
    setPlaying(false);
    setSaveMessage('');
    try {
      const buffer = await engine.renderOffline(wavLoops, setRecProgress);
      if (!buffer) { setSaveMessage('Render cancelled.'); return; }
      downloadBlob(audioBufferToWav(buffer), `${fileSafeName(S.title)}.wav`);
      setSaveMessage(`WAV ready: ${fileSafeName(S.title)}.wav (${buffer.duration.toFixed(1)} s).`);
    } catch (err) {
      setSaveMessage(`Could not render the WAV: ${err.message}. Try an up-to-date Chrome or Firefox.`);
    } finally {
      setRecording(false);
    }
  }

  /**
   * Archivos para registrar: el WAV (las vueltas que elija la persona) y el proyecto en JSON.
   * La huella de MuSecure se calcula siempre sobre UNA vuelta, para que el mismo beat dé la misma
   * huella sin importar cuántas vueltas tenga el WAV.
   */
  async function buildRegisterFiles({ asRemix = false, loops = 1 } = {}) {
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setRecording(true);
    try {
      const buffer = await engine.renderOffline(loops, setRecProgress);
      if (!buffer) throw new Error('Render cancelled');
      const wav = audioBufferToWav(buffer);
      let fingerprintWav = wav;
      if (loops > 1) {
        const one = await engine.renderOffline(1, () => {});
        if (!one) throw new Error('Render cancelled');
        fingerprintWav = audioBufferToWav(one);
      }
      return {
        wav,
        fingerprintWav,
        // Si se registra como obra original, el proyecto publicado no lleva el vínculo de remix.
        project: new Blob([projectFile(asRemix ? S : { ...S, remixOf: null })], { type: 'application/json' }),
        baseName: fileSafeName(S.title),
        art: beatArt(S),
      };
    } finally {
      setRecording(false);
    }
  }

  const subtitle = `${KITS[S.kit].name} · ${ROOTS[S.root][0]} ${SCALES[S.scale][0].toLowerCase()} · ${S.len} steps`;

  const drawerTitles = { save: 'Save & export', register: 'Register on NEAR', gallery: 'Gallery', earnings: 'My earnings', battles: 'Battles', tree: 'Royalty tree', guide: 'How it works' };

  return (
    <>
    <div className={`wrap${drawer && !WIDE.has(drawer) ? ' with-drawer' : ''}`}>
      <header>
        <div className="brand">
          <h1>MuSecure <span>Beats</span></h1>
          <div className="sub"><strong>{S.title || 'Untitled'}</strong> · {subtitle}</div>
        </div>
        <div className="header-right">
          <button className="mini help" aria-pressed={drawer === 'guide'} onClick={() => toggleDrawer('guide')}>❓ How it works</button>
          <button className="mini theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          <AccountBar />
        </div>
      </header>

      {S.remixOf && (
        <div className="remix-strip" role="status">
          <span>You are editing a <strong>remix of #{S.remixOf.token_id} "{S.remixOf.title}"</strong>.</span>
          <button className="mini" onClick={() => setDrawer('register')}>View similarity</button>
        </div>
      )}

      <nav className="side-nav" aria-label="Panels">
        <div className="nav-group" aria-label="Studio">
          <span className="nav-label">Studio</span>
          <button onClick={newBeat}>+ New beat</button>
          <button aria-pressed={drawer === 'save'} onClick={() => toggleDrawer('save')}>Save & export</button>
        </div>
        <div className="nav-group" aria-label="Own it">
          <span className="nav-label">Own it</span>
          <button className="primary" aria-pressed={drawer === 'register'} onClick={() => toggleDrawer('register')}>
            Register on NEAR{S.remixOf ? ` · remix of #${S.remixOf.token_id}` : ''}
          </button>
          <button aria-pressed={drawer === 'earnings'} onClick={() => toggleDrawer('earnings')}>My earnings</button>
        </div>
        <div className="nav-group" aria-label="Explore">
          <span className="nav-label">Explore</span>
          <button className="accent" aria-pressed={drawer === 'gallery'} onClick={() => toggleDrawer('gallery')}>Gallery</button>
          <button className="accent" aria-pressed={drawer === 'battles'} onClick={() => toggleDrawer('battles')}>⚔️ Battles</button>
          <button className="accent" aria-pressed={drawer === 'tree'} onClick={() => toggleDrawer('tree')}>🌳 Royalty tree</button>
        </div>
      </nav>

      <Hero playing={playing} onPlay={togglePlay} onTour={() => setDrawer('guide')} onOpen={setDrawer} />

      <Transport
        S={S}
        mutate={mutate}
        playing={playing}
        onTogglePlay={togglePlay}
        onLenChange={handleLenChange}
        onAskRandomAll={() => setConfirmAll(true)}
        lite={lite}
        onLiteChange={setLite}
      >
        {confirmAll && <ConfirmRandomAll isRemix={Boolean(S.remixOf)} onYes={randomizeAll} onNo={() => setConfirmAll(false)} />}
      </Transport>

      <MonkPath beat={S} />


      <SoundPanel S={S} mutate={mutate} onRandomSounds={randomizeSounds} />
      <Mixer S={S} mutate={mutate} />

      <TrackEditor
        S={S}
        mutate={mutate}
        onRandomTrack={randomizeCurrent}
        onClearTrack={clearTrack}
        theory={theory}
        follow={follow}
        setFollow={setFollow}
        onCell={handleCell}
        qGrid={qGrid}
        setQGrid={setQGrid}
        onQuantize={quantize}
        canUndo={Boolean(undoBuf)}
        onUndo={undoQuantize}
        onShift={shiftTrack}
        onMoveBar={handleMoveBar}
        qMessage={qMessage}
      />



      <p className="note">
        Prototype. Every sound is synthesized, including the Andean kit (an approximation).
        Your beat is saved automatically in this browser only: use "Save project" to keep a copy.
      </p>
    </div>

    <Drawer open={Boolean(drawer)} wide={WIDE.has(drawer)} title={drawerTitles[drawer] || ''} onClose={closeDrawer}>
      <div hidden={drawer !== 'save'}>
      <SavePanel
        title={S.title}
        onTitle={(v) => mutate((d) => { d.title = v; })}
        onSaveProject={saveProject}
        onOpenProject={openProject}
        loops={wavLoops}
        onLoops={setWavLoops}
        loopSec={loopSeconds(S)}
        onExportWav={exportWav}
        onExportMidi={() => {
          downloadBlob(midiBlob(S, wavLoops), `${fileSafeName(S.title)}.mid`);
          setSaveMessage(`MIDI ready: ${fileSafeName(S.title)}.mid (${wavLoops} ${wavLoops === 1 ? 'loop' : 'loops'}, 4 tracks).`);
        }}
        onCancel={() => engine.cancelRecording()}
        recording={recording}
        progress={recProgress}
        message={saveMessage}
      />
      </div>
      <div hidden={drawer !== 'register'}>
      <RegisterPanel title={S.title} onTitle={(v) => mutate((d) => { d.title = v; })} loopSec={loopSeconds(S)} buildFiles={buildRegisterFiles} remixOf={S.remixOf} beat={S} onRegistered={onRegistered} />
      </div>
      <div hidden={drawer !== 'guide'}>
        {drawer === 'guide' && <Guide />}
      </div>
      <div hidden={drawer !== 'tree'}>
        {drawer === 'tree' && <RoyaltyTree initialRoot={treeRoot} />}
      </div>
      <div hidden={drawer !== 'battles'}>
        {drawer === 'battles' && <Battles onOpenProject={openFromGallery} />}
      </div>
      <div hidden={drawer !== 'earnings'}>
        {drawer === 'earnings' && <Earnings />}
      </div>
      <div hidden={drawer !== 'gallery'}>
      <Gallery onOpenProject={openFromGallery} onRenderStems={renderStems} onOpenSealed={openSealedFromGallery} />
      </div>
    </Drawer>
    </>
  );
}
