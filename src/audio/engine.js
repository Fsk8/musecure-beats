// Motor de audio con Tone.js. Lee el estado actual en cada paso a través de getState/getTheory.
import * as Tone from 'tone';
import { TRACKS, VEL } from '../music/theory';

/** Segundos que dura una vuelta del beat. */
export const loopSeconds = (S) => (S.len * 60) / S.bpm / 4;
/** Cola al final del WAV para que terminen el reverb y el delay. */
export const TAIL_SECONDS = 2;
export const cutHz = (v) => 80 * Math.pow(250, v / 100);
const noop = () => {};
/** Largo máximo de cada golpe pre-renderizado (el bombo acústico es el más largo). */
const DRUM_SAMPLE_SECONDS = 1.6;

/** Recorta el silencio final de un sample para no ocupar memoria de más. */
function trimSilence(buffer, threshold = 1e-4) {
  const d = buffer.getChannelData(0);
  let end = d.length - 1;
  while (end > 0 && Math.abs(d[end]) < threshold) end--;
  const len = Math.min(d.length, end + 256);
  if (len >= d.length) return buffer;
  const out = new AudioBuffer({ length: len, numberOfChannels: 1, sampleRate: buffer.sampleRate });
  out.copyToChannel(d.subarray(0, len), 0);
  return out;
}

let contextReady = false;

function safe(fn) {
  try { fn(); } catch (e) { console.warn('[audio]', e?.message || e); }
}

export class AudioEngine {
  constructor({ getState, getTheory, onStep }) {
    this.getState = getState;
    this.getTheory = getTheory;
    this.onStep = onStep;
    this.ready = false;
    this.pos = 0;
    this.kitNodes = [];
    this.drum = [noop, noop, noop, noop];
    this.arpChord = null;
    this.arpIndex = 0;
    this.applied = {};
  }

  /** Debe llamarse desde un clic: los navegadores solo permiten audio tras una interacción. */
  async init({ offline = false } = {}) {
    if (this.ready) return;
    this.offline = offline;
    if (!offline) {
      // Búfer de audio más grande ("playback"): el navegador tolera mejor los picos de trabajo.
      // Se hace una sola vez y antes de crear cualquier nodo, para no mezclar contextos.
      if (!contextReady) {
        contextReady = true;
        try {
          Tone.setContext(new Tone.Context({ latencyHint: 'playback', lookAhead: 0.2 }));
        } catch (e) {
          console.warn('[audio] contexto por defecto:', e?.message || e);
        }
      }
      await Tone.start();
      Tone.getContext().lookAhead = this.lite ? 0.3 : 0.2;
    }

    this.masterFilter = new Tone.Filter({ type: 'lowpass', frequency: 20000, Q: 4, rolloff: -24 });
    // Limitador final: evita que la suma de las pistas sature (chasquidos digitales).
    this.limiter = new Tone.Limiter(-1.5);
    Tone.getDestination().volume.value = -3;
    Tone.getDestination().chain(this.masterFilter, this.limiter);

    const reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.02, wet: 1 }).toDestination();
    this.reverbReady = reverb.ready;
    const delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.35, wet: 1 }).toDestination();
    // Envíos con nodos propios (no send/receive de Tone, que comparte buses entre contextos
    // y rompería el render offline).
    const revIn = new Tone.Gain(1).connect(reverb);
    const delIn = new Tone.Gain(1).connect(delay);

    this.channels = TRACKS.map(() => new Tone.Channel().toDestination());
    const sendTo = (bus) => this.channels.map((c) => {
      const g = new Tone.Gain(0).connect(bus);
      c.connect(g);
      return g;
    });
    this.revSends = sendTo(revIn);
    this.delSends = sendTo(delIn);

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2 },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.15 },
      filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.2, baseFrequency: 120, octaves: 2.6 },
    }).connect(this.channels[1]);
    // Sub-grave (una octava abajo) solo para el synth bass: una sola voz senoidal, muy liviana.
    this.sub = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.12 },
      filter: { Q: 0 },
      filterEnvelope: { baseFrequency: 300, octaves: 0 },
      volume: -8,
    }).connect(this.channels[1]);

    this.leadFilter = new Tone.Filter(18000, 'lowpass').connect(this.channels[2]);
    this.lead = new Tone.PolySynth(Tone.Synth, { volume: -8, maxPolyphony: 10 }).connect(this.leadFilter);

    // Acordes: chorus + filtro suave antes del canal. applyPad elige el carácter.
    this.padChorus = new Tone.Chorus({ frequency: 0.6, delayTime: 4, depth: 0.7, spread: 180, wet: 0.6 })
      .connect(this.channels[3]).start();
    this.padFilter = new Tone.Filter({ type: 'lowpass', frequency: 1800, Q: 0.7, rolloff: -12 }).connect(this.padChorus);
    this.pad = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 12 }).connect(this.padFilter);

    this.arpSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.12, sustain: 0.1, release: 0.15 },
      volume: -16,
    }).connect(this.channels[3]);

    // Metrónomo: canal propio, fuera del mezclador.
    this.metro = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
      volume: -10,
    }).toDestination();

    this.ready = true;
    this.sync(this.getState());
    Tone.getTransport().scheduleRepeat((time) => this.tick(time), '16n');
  }

  /**
   * Modo liviano para equipos con poco procesador: osciladores simples, sin chorus y más margen
   * de programación. Solo afecta lo que suena en vivo; el WAV renderizado sale siempre con calidad completa.
   */
  setLite(lite) {
    this.lite = Boolean(lite);
    if (!this.ready) return;
    if (!this.offline) Tone.getContext().lookAhead = this.lite ? 0.3 : 0.2;
    this.applyPad(this.getState().pad);
    this.applyWave(this.getState().wave);
    this.applyBass(this.getState().bassSound);
  }

  get playing() {
    return Tone.getTransport().state === 'started';
  }

  start() {
    this.pos = 0;
    this.arpChord = null;
    Tone.getTransport().start();
  }

  stop() {
    Tone.getTransport().stop();
    this.pos = 0;
    this.arpChord = null;
    this.onStep(-1);
  }

  /** Aplica al audio los ajustes del estado que cambiaron desde la última vez. */
  sync(S) {
    if (!this.ready) return;
    const a = this.applied;
    if (a.bpm !== S.bpm) Tone.getTransport().bpm.value = S.bpm;
    if (a.swing !== S.swing) {
      Tone.getTransport().swingSubdivision = '16n';
      Tone.getTransport().swing = S.swing / 100;
    }
    if (a.cut !== S.cut) this.masterFilter.frequency.rampTo(S.cut >= 100 ? 20000 : cutHz(S.cut), 0.05);
    if (a.wave !== S.wave) this.applyWave(S.wave);
    // A tempos rápidos los acordes se encadenan: voces más livianas para no saturar el procesador.
    const fast = S.bpm >= 130;
    if (a.bassSound !== S.bassSound) this.applyBass(S.bassSound);
    if (a.pad !== S.pad || this.fast !== fast) { this.fast = fast; this.applyPad(S.pad); }
    if (a.kit !== S.kit) this.buildKit(S.kit);
    if (a.arp !== S.arp) this.arpChord = null;
    // Con algún solo activo, solo suenan las pistas en solo (y que no estén en mute).
    const anySolo = S.mix.some((m) => m.solo);
    const silent = S.mix.map((m) => m.mute || (anySolo && !m.solo));
    S.mix.forEach((m, i) => {
      const prev = a.mix?.[i];
      if (prev && prev.vol === m.vol && a.silent[i] === silent[i] && prev.rev === m.rev && prev.del === m.del) return;
      this.channels[i].volume.value = m.vol;
      this.channels[i].mute = silent[i];
      this.revSends[i].gain.value = m.rev / 100;
      this.delSends[i].gain.value = m.del / 100;
    });
    this.applied = { bassSound: S.bassSound, pad: S.pad, bpm: S.bpm, swing: S.swing, cut: S.cut, wave: S.wave, kit: S.kit, arp: S.arp, mix: S.mix, silent };
  }

  applyBass(sound) {
    this.bassSound = sound;
    if (sound === 'synth') {
      // Synth bass: dos sierras desafinadas, filtro resonante con barrido y un poco de glide.
      this.bass.set({
        oscillator: this.lite ? { type: 'sawtooth' } : { type: 'fatsawtooth', count: 2, spread: 18 },
        filter: { Q: 6 },
        envelope: { attack: 0.003, decay: 0.25, sustain: 0.35, release: 0.1 },
        filterEnvelope: { attack: 0.002, decay: 0.22, sustain: 0.1, baseFrequency: 90, octaves: 3.6 },
        portamento: 0.03,
        volume: -4,
      });
    } else {
      this.bass.set({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2 },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.15 },
        filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.2, baseFrequency: 120, octaves: 2.6 },
        portamento: 0,
        volume: 0,
      });
    }
  }

  /** Toca el bajo (y el sub si corresponde). */
  playBass(note, dur, time, vel) {
    this.bass.triggerAttackRelease(note, dur, time, vel);
    if (this.bassSound === 'synth') {
      this.sub.triggerAttackRelease(Tone.Frequency(note).transpose(-12).toNote(), dur, time, vel);
    }
  }

  applyPad(sound) {
    if (sound === 'dreamy') {
      // Sierras desafinadas, ataque lento y cola larga, filtradas y con chorus.
      this.pad.set({
        oscillator: this.lite ? { type: 'sawtooth' } : { type: 'fatsawtooth', count: this.fast ? 2 : 3, spread: 28 },
        envelope: { attack: 0.35, decay: 0.6, sustain: 0.75, release: this.fast ? 1.2 : 2.2 },
        volume: -16,
      });
      this.padFilter.frequency.value = 1600;
      this.padChorus.wet.value = this.lite ? 0 : 0.6;
    } else {
      this.pad.set({
        oscillator: this.lite ? { type: 'sine' } : { type: 'fatsine', count: 2, spread: 12 },
        envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.8 },
        volume: -6,
      });
      this.padFilter.frequency.value = 18000;
      this.padChorus.wet.value = 0;
    }
  }

  get padLength() {
    return this.getState().pad === 'dreamy' ? '2n' : '4n';
  }

  applyWave(wave) {
    if (wave === 'saw') {
      this.lead.set({
        oscillator: this.lite ? { type: 'sawtooth' } : { type: 'fatsawtooth', count: 3, spread: 24 },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.3, release: 0.3 },
      });
      this.leadFilter.frequency.value = 2600;
    } else {
      this.lead.set({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.4 },
      });
      this.leadFilter.frequency.value = 18000;
    }
  }

  /**
   * Arma el kit de batería. Primero con síntesis en vivo (suena de inmediato) y, en segundo plano,
   * pre-renderiza cada golpe una sola vez como sample: tocar un sample cuesta mucho menos procesador
   * que sintetizarlo, y suena igual porque sale de los mismos sintetizadores.
   */
  buildKit(kit) {
    this.kitNodes.forEach((n) => n.dispose());
    this.kitNodes = [];
    const keep = (n) => {
      this.kitNodes.push(n);
      return n;
    };
    this.drum = this.createKitVoices(kit, this.channels[0], keep);
    if (!this.offline) this.sampleKit(kit);
  }

  /** Golpes que dependen de la armonía (el rasgueo andino) siguen en vivo. */
  static LIVE_ROWS = { andino: [3] };

  async sampleKit(kit) {
    const version = (this.kitVersion = (this.kitVersion || 0) + 1);
    const live = AudioEngine.LIVE_ROWS[kit] || [];
    const sr = Tone.getContext().sampleRate;
    const buffers = [];
    try {
      for (let r = 0; r < 4; r++) {
        if (live.includes(r)) { buffers.push(null); continue; }
        // El contexto global se cambia y se restaura en el mismo bloque síncrono. (Tone.Offline deja
        // un hueco asíncrono en el que el resto de la app usaría el contexto offline y dejaría de sonar.)
        const ctx = new Tone.OfflineContext(1, DRUM_SAMPLE_SECONDS, sr);
        const prev = Tone.getContext();
        Tone.setContext(ctx);
        try {
          this.createKitVoices(kit, ctx.destination, (n) => n)[r](0.01, 1);
        } finally {
          Tone.setContext(prev);
        }
        buffers.push(trimSilence((await ctx.render()).get()));
        if (version !== this.kitVersion) return; // cambiaron de kit mientras renderizaba
      }
    } catch (e) {
      console.warn('[audio] batería en vivo (no se pudo pre-renderizar):', e?.message || e);
      return;
    }
    const raw = Tone.getContext().rawContext;
    const input = this.channels[0];
    this.drum = this.drum.map((liveVoice, r) => {
      const buffer = buffers[r];
      if (!buffer) return liveVoice;
      return (t, v) => {
        const src = raw.createBufferSource();
        const g = raw.createGain();
        src.buffer = buffer;
        g.gain.value = v;
        src.connect(g);
        Tone.connect(g, input);
        src.onended = () => { src.disconnect(); g.disconnect(); };
        src.start(Math.max(t - 0.01, raw.currentTime));
      };
    });
  }

  /** Crea los sintetizadores del kit conectados a `dest` y devuelve una función de disparo por fila. */
  createKitVoices(kit, dest, keep) {
    const ch0 = dest;
    let out = ch0;

    if (kit === 'lofi') {
      // Saturación + filtros para el color de cassette (sin AudioWorklet).
      const hp = keep(new Tone.Filter(110, 'highpass').connect(ch0));
      const lp = keep(new Tone.Filter({ frequency: 2600, type: 'lowpass', rolloff: -24 }).connect(hp));
      out = keep(new Tone.Distortion({ distortion: 0.35, wet: 0.6, oversample: '2x' }).connect(lp));
    }

    if (kit === 'classic') {
      const k = keep(new Tone.MembraneSynth({ octaves: 6, pitchDecay: 0.04 }).connect(out));
      const s = keep(new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.18, sustain: 0 }, volume: -8 }).connect(out));
      const h = keep(new Tone.MetalSynth({ envelope: { decay: 0.05 }, harmonicity: 5.1, resonance: 3000, volume: -24 }).connect(out));
      const c = keep(new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.002, decay: 0.12, sustain: 0 }, volume: -10 }).connect(out));
      return [
        (t, v) => k.triggerAttackRelease('C1', '8n', t, v),
        (t, v) => s.triggerAttackRelease('16n', t, v),
        (t, v) => h.triggerAttackRelease('C6', '32n', t, v),
        (t, v) => c.triggerAttackRelease('16n', t, v),
      ];
    }

    if (kit === '808') {
      const k = keep(new Tone.MembraneSynth({ octaves: 8, pitchDecay: 0.09, envelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.2 } }).connect(out));
      const sf = keep(new Tone.Filter(1800, 'bandpass').connect(out));
      const s = keep(new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.22, sustain: 0 }, volume: -2 }).connect(sf));
      const st = keep(new Tone.MembraneSynth({ octaves: 2, pitchDecay: 0.02, envelope: { decay: 0.12, sustain: 0 }, volume: -10 }).connect(out));
      const hf = keep(new Tone.Filter(8000, 'highpass').connect(out));
      const h = keep(new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.04, sustain: 0 }, volume: -14 }).connect(hf));
      const cf = keep(new Tone.Filter(1200, 'bandpass').connect(out));
      const c = keep(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 }, volume: -4 }).connect(cf));
      return [
        (t, v) => k.triggerAttackRelease('A0', '2n', t, v),
        (t, v) => { s.triggerAttackRelease('16n', t, v); st.triggerAttackRelease('G2', '16n', t, v); },
        (t, v) => h.triggerAttackRelease('32n', t, v),
        (t, v) => {
          c.triggerAttackRelease('16n', t, v);
          c.triggerAttackRelease('16n', t + 0.012, v * 0.8);
          c.triggerAttackRelease('16n', t + 0.025, v * 0.6);
        },
      ];
    }

    if (kit === 'acoustic') {
      const k = keep(new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.03, envelope: { decay: 0.3, sustain: 0 }, volume: -2 }).connect(out));
      const sf = keep(new Tone.Filter(900, 'highpass').connect(out));
      const s = keep(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.25, sustain: 0 }, volume: -6 }).connect(sf));
      const sb = keep(new Tone.MembraneSynth({ octaves: 1.5, pitchDecay: 0.01, envelope: { decay: 0.1, sustain: 0 }, volume: -12 }).connect(out));
      const h = keep(new Tone.MetalSynth({ envelope: { decay: 0.09 }, harmonicity: 5.1, modulationIndex: 24, resonance: 5000, volume: -26 }).connect(out));
      const tm = keep(new Tone.MembraneSynth({ octaves: 2.5, pitchDecay: 0.05, envelope: { decay: 0.4, sustain: 0 }, volume: -6 }).connect(out));
      return [
        (t, v) => k.triggerAttackRelease('D1', '8n', t, v),
        (t, v) => { s.triggerAttackRelease('16n', t, v); sb.triggerAttackRelease('D3', '16n', t, v); },
        (t, v) => h.triggerAttackRelease('C6', '32n', t, v),
        (t, v) => tm.triggerAttackRelease('G2', '8n', t, v),
      ];
    }

    if (kit === 'lofi') {
      const k = keep(new Tone.MembraneSynth({ octaves: 5, pitchDecay: 0.05, envelope: { decay: 0.35, sustain: 0 } }).connect(out));
      const s = keep(new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.003, decay: 0.2, sustain: 0 }, volume: 2 }).connect(out));
      const h = keep(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0 }, volume: -18 }).connect(out));
      const rm = keep(new Tone.MembraneSynth({ octaves: 1, pitchDecay: 0.005, envelope: { decay: 0.05, sustain: 0 }, volume: -8 }).connect(out));
      return [
        (t, v) => k.triggerAttackRelease('C1', '8n', t, v),
        (t, v) => s.triggerAttackRelease('16n', t, v),
        (t, v) => h.triggerAttackRelease('32n', t, v),
        (t, v) => rm.triggerAttackRelease('E4', '32n', t, v),
      ];
    }

    if (kit === 'andino') {
      // Aproximaciones sintetizadas; se reemplazan por samples grabados más adelante.
      const k = keep(new Tone.MembraneSynth({ octaves: 3, pitchDecay: 0.08, envelope: { attack: 0.002, decay: 1.1, sustain: 0, release: 0.3 } }).connect(out));
      const kp = keep(new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -10 }).connect(out));
      const cf = keep(new Tone.Filter(4500, 'highpass').connect(out));
      const cj = keep(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.004, decay: 0.11, sustain: 0 }, volume: -10 }).connect(cf));
      const pf = keep(new Tone.Filter(1400, 'bandpass').connect(out));
      const pl = keep(new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.002, decay: 0.1, sustain: 0 }, volume: -6 }).connect(pf));
      const strings = [0, 1, 2, 3].map(() =>
        keep(new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3800, resonance: 0.92, volume: -4 }).connect(out)),
      );
      return [
        (t, v) => { k.triggerAttackRelease('F1', '4n', t, v); kp.triggerAttackRelease('32n', t, v); },
        (t, v) => { cj.triggerAttackRelease('32n', t, v); cj.triggerAttackRelease('32n', t + 0.035, v * 0.7); },
        (t, v) => pl.triggerAttackRelease('16n', t, v),
        (t) => {
          // Rasgueo del acorde de I, dos octavas arriba.
          const chord = this.getTheory().chords.filter(Boolean).at(-1);
          const notes = [...chord, chord[0]].map((n) => Tone.Frequency(n).transpose(24 - 12 * this.getState().oct[3]).toNote());
          notes.forEach((n, i) => strings[i].triggerAttack(n, t + i * 0.018));
        },
      ];
    }
    return [noop, noop, noop, noop];
  }

  tick(time) {
    // Un error en una sola nota (p. ej. dos golpes al mismo instante) no debe cortar el resto del paso.
    try { this.tickSafe(time); } catch (e) { console.warn('[audio]', e?.message || e); }
  }

  tickSafe(time) {
    const S = this.getState();
    const T = this.getTheory();
    const c = this.pos;
    this.pos = (this.pos + 1) % S.len;

    const hit = (tr, r) => S.g[tr][r][c] && Math.random() * 100 < S.p[tr][r][c];
    const vel = (tr, r) => VEL[S.g[tr][r][c]];

    if (S.metro && !this.recording && c % 4 === 0) {
      // Acento en el primer tiempo de cada compás.
      this.metro.triggerAttackRelease(c % 16 === 0 ? 'C6' : 'G5', '32n', time, c % 16 === 0 ? 1 : 0.6);
    }

    // Las pistas en mute (o fuera del solo) no se calculan: ahorra procesador.
    const off = this.applied.silent || [];
    for (let r = 0; r < 4; r++) if (!off[0] && hit(0, r)) safe(() => this.drum[r](time, vel(0, r)));
    for (let r = 7; r >= 0; r--) {
      if (!off[1] && hit(1, r)) {
        safe(() => this.playBass(T.bass[r], '16n', time, vel(1, r)));
        break; // el bajo es monofónico: suena la nota más grave marcada
      }
    }
    T.lead.forEach((n, r) => {
      if (!off[2] && hit(2, r)) safe(() => this.lead.triggerAttackRelease(n, '8n', time, vel(2, r)));
    });
    T.chords.forEach((chord, r) => {
      if (!chord || off[3] || !hit(3, r)) return;
      if (S.arp === 'off') safe(() => this.pad.triggerAttackRelease(chord, this.padLength, time, vel(3, r)));
      else {
        this.arpChord = { notes: chord.map((n) => Tone.Frequency(n).transpose(12).toNote()), vel: vel(3, r) };
        this.arpIndex = 0;
      }
    });

    if (S.arp !== 'off' && this.arpChord && !off[3]) {
      const N = this.arpChord.notes;
      const L = N.length;
      let i;
      if (S.arp === 'up') i = this.arpIndex % L;
      else if (S.arp === 'down') i = L - 1 - (this.arpIndex % L);
      else if (S.arp === 'updown') {
        const cycle = 2 * L - 2;
        const k = this.arpIndex % cycle;
        i = k < L ? k : cycle - k;
      } else i = Math.floor(Math.random() * L);
      this.arpSynth.triggerAttackRelease(N[i], '16n', time, this.arpChord.vel);
      this.arpIndex++;
    }

    if (!this.offline) Tone.getDraw().schedule(() => this.onStep(c), time);
  }

  /**
   * Graba una vuelta completa del beat (más la cola de reverb y delay) y devuelve el audio como AudioBuffer.
   * Se escucha mientras graba. El metrónomo no queda en la grabación.
   */
  async recordLoop(loops = 1, onProgress = () => {}) {
    await this.init();
    if (this.playing) this.stop();
    const S = this.getState();
    const loopSec = loopSeconds(S) * loops;
    const tailSec = TAIL_SECONDS;
    this.cancelled = false;

    const recorder = new Tone.Recorder();
    Tone.getDestination().connect(recorder);
    this.recording = true;
    recorder.start();

    const t0 = Tone.now() + 0.1;
    this.pos = 0;
    this.arpChord = null;
    Tone.getTransport().start(t0);
    Tone.getTransport().stop(t0 + loopSec);

    const totalMs = (0.1 + loopSec + tailSec) * 1000;
    const started = performance.now();
    await new Promise((resolve) => {
      const id = setInterval(() => {
        const elapsed = performance.now() - started;
        onProgress(Math.min(1, elapsed / totalMs));
        if (elapsed >= totalMs || this.cancelled) { clearInterval(id); resolve(); }
      }, 100);
    });

    if (this.cancelled) Tone.getTransport().stop();
    const blob = await recorder.stop();
    Tone.getDestination().disconnect(recorder);
    recorder.dispose();
    this.recording = false;
    this.pos = 0;
    this.onStep(-1);
    if (this.cancelled) return null;

    // El grabador entrega audio comprimido; se decodifica para convertirlo a WAV.
    const buffer = await Tone.getContext().rawContext.decodeAudioData(await blob.arrayBuffer());
    return buffer;
  }

  /**
   * Renderiza el beat fuera de tiempo real (Tone.Offline): no depende de la potencia del equipo,
   * así que el WAV sale sin cortes y más rápido que escucharlo. Mismo resultado que recordLoop.
   */
  async renderOffline(loops = 1, onProgress = () => {}) {
    await this.init();
    if (this.playing) this.stop();
    const S = this.getState();
    const loopSec = loopSeconds(S) * loops;
    onProgress(0.05);
    const buffer = await Tone.Offline(async (context) => {
      const eng = new AudioEngine({ getState: this.getState, getTheory: this.getTheory, onStep: noop });
      eng.recording = true; // sin metrónomo
      await eng.init({ offline: true });
      await eng.reverbReady;
      context.transport.start(0);
      context.transport.stop(loopSec);
    }, loopSec + TAIL_SECONDS, 2, 44100);
    onProgress(1);
    return buffer.get();
  }

  /** Detiene una grabación en curso sin generar archivo. */
  cancelRecording() {
    this.cancelled = true;
  }

  /** Suena una nota al marcarla en la cuadrícula. */
  preview(track, row, vel = 1) {
    if (!this.ready) return;
    const now = Tone.now();
    const T = this.getTheory();
    if (track === 0) this.drum[row](now, vel);
    if (track === 1) this.playBass(T.bass[row], '8n', now, vel);
    if (track === 2) this.lead.triggerAttackRelease(T.lead[row], '8n', now, vel);
    if (track === 3 && T.chords[row]) this.pad.triggerAttackRelease(T.chords[row], this.padLength, now, vel);
  }
}
