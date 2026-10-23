import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine, loopSeconds } from './audio/engine';
import { playhead } from './audio/playhead';
import { KITS, ROOTS, SCALES, TRACKS, VEL, computeTheory } from './music/theory';
import {
  challengeDone, defaultState, emptyGrid, extendPattern, fileSafeName, nextCell, parseProjectFile, projectFile,
  moveBar, quantizeTrack, randomTrack, rotateTrack,
} from './music/patterns';
import { audioBufferToWav, downloadBlob } from './io/files';
import { useBeatState } from './state/useBeatState';
import { Transport, ConfirmRandomAll } from './components/Transport';
import { SoundPanel } from './components/SoundPanel';
import { Mixer } from './components/Mixer';
import { TrackEditor } from './components/TrackEditor';
import { Challenge } from './components/Challenge';
import { SavePanel } from './components/SavePanel';
import { AccountBar } from './components/AccountBar';
import { Gallery } from './components/Gallery';
import { Drawer } from './components/Drawer';
import { RegisterPanel } from './components/RegisterPanel';

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
    const onOpen = (e) => { if (['save', 'register', 'gallery'].includes(e.detail)) setDrawer(e.detail); };
    window.addEventListener('msb:open-panel', onOpen);
    return () => window.removeEventListener('msb:open-panel', onOpen);
  }, []);
  // Una vez registrado, el beat abierto pasa a ser el nuevo remix: se quita el vínculo pendiente.
  const clearRemix = () => mutate((d) => { d.remixOf = null; });
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

  /** Abre en el secuenciador el proyecto de un beat registrado (descargado de IPFS) para remixarlo. */
  function openFromGallery(text, beat) {
    const loaded = parseProjectFile(text);
    if (!window.confirm(`Se reemplazará el beat que tienes abierto por "${beat.title}". Si quieres conservarlo, guárdalo antes. ¿Continuar?`)) return;
    const link = { token_id: beat.token_id, title: beat.title, creator: beat.creator, remix_price: beat.remix_price, project_cid: beat.project_cid };
    loaded.remixOf = link;
    loaded.title = `${beat.title} (remix)`;
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setUndoBuf(null);
    replaceState({ ...loaded, tab: S.tab, page: 0, emode: S.emode });
    setSaveMessage(`Abierto para remixar: #${beat.token_id} "${beat.title}". Al registrarlo quedará como su remix.`);
    setDrawer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Empieza un beat desde cero (sin notas y sin vínculo de remix). */
  function newBeat() {
    if (!window.confirm('¿Empezar un beat nuevo desde cero? El beat actual se reemplaza; si quieres conservarlo, guárdalo antes.')) return;
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setUndoBuf(null);
    replaceState({ ...defaultState(), title: 'Nuevo beat', tab: S.tab, emode: S.emode });
    setSaveMessage('Beat nuevo.');
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
      d.wave = any(['tri', 'saw']);
      d.bassSound = any(['classic', 'synth']);
      d.pad = any(['dreamy', 'soft']);
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
    setQMessage(moved ? `${moved} nota${moved > 1 ? 's' : ''} alineada${moved > 1 ? 's' : ''}` : 'Ya estaba alineada');
  }

  function undoQuantize() {
    if (!undoBuf) return;
    mutate((d) => { d.g[undoBuf.t] = undoBuf.g; d.p[undoBuf.t] = undoBuf.p; });
    setUndoBuf(null);
    setQMessage('Deshecho');
  }

  function saveProject() {
    const blob = new Blob([projectFile(S)], { type: 'application/json' });
    downloadBlob(blob, `${fileSafeName(S.title)}.musecure.json`);
    setSaveMessage(`Proyecto guardado: ${fileSafeName(S.title)}.musecure.json (revisa tu carpeta de descargas).`);
  }

  async function openProject(file) {
    try {
      const loaded = parseProjectFile(await file.text());
      if (engine.playing) { engine.stop(); setPlaying(false); }
      setUndoBuf(null);
      replaceState({ ...loaded, tab: S.tab, page: 0, emode: S.emode });
      setSaveMessage(`Abierto: ${loaded.title}`);
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
      if (!buffer) { setSaveMessage('Grabación cancelada.'); return; }
      downloadBlob(audioBufferToWav(buffer), `${fileSafeName(S.title)}.wav`);
      setSaveMessage(`WAV listo: ${fileSafeName(S.title)}.wav (${buffer.duration.toFixed(1)} s).`);
    } catch (err) {
      setSaveMessage(`No se pudo grabar el WAV: ${err.message}. Prueba en Chrome o Firefox actualizados.`);
    } finally {
      setRecording(false);
    }
  }

  /** Archivos para registrar: una vuelta en WAV y el proyecto en JSON. */
  async function buildRegisterFiles({ asRemix = false } = {}) {
    if (engine.playing) { engine.stop(); setPlaying(false); }
    setRecording(true);
    try {
      const buffer = await engine.renderOffline(1, setRecProgress);
      if (!buffer) throw new Error('Grabación cancelada');
      return {
        wav: audioBufferToWav(buffer),
        // Si se registra como obra original, el proyecto publicado no lleva el vínculo de remix.
        project: new Blob([projectFile(asRemix ? S : { ...S, remixOf: null })], { type: 'application/json' }),
        baseName: fileSafeName(S.title),
      };
    } finally {
      setRecording(false);
    }
  }

  const subtitle = `${KITS[S.kit].name} · ${ROOTS[S.root][1]} ${SCALES[S.scale][0].toLowerCase()} · ${S.len} pasos`;

  const drawerTitles = { save: 'Guardar y exportar', register: 'Registrar en NEAR', gallery: 'Beats en NEAR' };

  return (
    <>
    <div className={`wrap${drawer ? ' with-drawer' : ''}`}>
      <header>
        <div className="brand">
          <h1>MuSecure <span>Beats</span></h1>
          <div className="sub"><strong>{S.title || 'Sin nombre'}</strong> · {subtitle}</div>
        </div>
        <AccountBar />
      </header>

      {S.remixOf && (
        <div className="remix-strip" role="status">
          <span>Estás editando un <strong>remix de #{S.remixOf.token_id} "{S.remixOf.title}"</strong>.</span>
          <button className="mini" onClick={() => setDrawer('register')}>Ver similitud</button>
        </div>
      )}

      <nav className="side-nav" aria-label="Paneles">
        <button onClick={newBeat}>+ Nuevo beat</button>
        <button aria-pressed={drawer === 'save'} onClick={() => toggleDrawer('save')}>Guardar y exportar</button>
        <button aria-pressed={drawer === 'register'} onClick={() => toggleDrawer('register')}>
          Registrar en NEAR{S.remixOf ? ` · remix de #${S.remixOf.token_id}` : ''}
        </button>
        <button aria-pressed={drawer === 'gallery'} onClick={() => toggleDrawer('gallery')}>Galería</button>
      </nav>

      <Transport
        S={S}
        mutate={mutate}
        playing={playing}
        onTogglePlay={togglePlay}
        onLenChange={handleLenChange}
        onRandomTrack={randomizeCurrent}
        onAskRandomAll={() => setConfirmAll(true)}
        onClearTrack={clearTrack}
        onRandomSounds={randomizeSounds}
        lite={lite}
        onLiteChange={setLite}
      >
        {confirmAll && <ConfirmRandomAll isRemix={Boolean(S.remixOf)} onYes={randomizeAll} onNo={() => setConfirmAll(false)} />}
      </Transport>


      <SoundPanel S={S} mutate={mutate} />
      <Mixer S={S} mutate={mutate} />

      <TrackEditor
        S={S}
        mutate={mutate}
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

      <Challenge done={challengeDone(S)} />


      <p className="note">
        Prototipo. Todos los sonidos son sintetizados, también el kit andino (una aproximación).
        Tu beat se guarda automáticamente solo en este navegador: usa "Guardar proyecto" para tener una copia.
      </p>
    </div>

    <Drawer open={Boolean(drawer)} title={drawerTitles[drawer] || ''} onClose={closeDrawer}>
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
        onCancel={() => engine.cancelRecording()}
        recording={recording}
        progress={recProgress}
        message={saveMessage}
      />
      </div>
      <div hidden={drawer !== 'register'}>
      <RegisterPanel title={S.title} buildFiles={buildRegisterFiles} remixOf={S.remixOf} beat={S} onRegistered={clearRemix} />
      </div>
      <div hidden={drawer !== 'gallery'}>
      <Gallery onOpenProject={openFromGallery} />
      </div>
    </Drawer>
    </>
  );
}
