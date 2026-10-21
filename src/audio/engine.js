// Motor de audio con Tone.js. Lee el estado actual en cada paso a través de getState/getTheory.
import * as Tone from 'tone';
import { TRACKS, VEL } from '../music/theory';

const sendDb = (v) => (v <= 0 ? -Infinity : Tone.gainToDb(v / 100));
/** Segundos que dura una vuelta del beat. */
export const loopSeconds = (S) => (S.len * 60) / S.bpm / 4;
/** Cola al final del WAV para que terminen el reverb y el delay. */
export const TAIL_SECONDS = 2;
export const cutHz = (v) => 80 * Math.pow(250, v / 100);
const noop = () => {};

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
  async init() {
    if (this.ready) return;
    // Un poco más de margen de programación: evita cortes cuando la página está ocupada.
    await Tone.start();
    Tone.getContext().lookAhead = 0.15;

    this.masterFilter = new Tone.Filter({ type: 'lowpass', frequency: 20000, Q: 4, rolloff: -24 });
    // Limitador final: evita que la suma de las pistas sature (chasquidos digitales).
    this.limiter = new Tone.Limiter(-1.5);
    Tone.Destination.volume.value = -3;
    Tone.Destination.chain(this.masterFilter, this.limiter);

    const reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.02, wet: 1 }).toDestination();
    const delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.35, wet: 1 }).toDestination();
    new Tone.Channel().receive('rev').connect(reverb);
    new Tone.Channel().receive('del').connect(delay);

    this.channels = TRACKS.map(() => new Tone.Channel().toDestination());
    this.revSends = this.channels.map((c) => c.send('rev', -Infinity));
    this.delSends = this.channels.map((c) => c.send('del', -Infinity));

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2 },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.15 },
      filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.2, baseFrequency: 120, octaves: 2.6 },
    }).connect(this.channels[1]);

    this.leadFilter = new Tone.Filter(18000, 'lowpass').connect(this.channels[2]);
    this.lead = new Tone.PolySynth(Tone.Synth, { volume: -8 }).connect(this.leadFilter);

    // Acordes: chorus + filtro suave antes del canal. applyPad elige el carácter.
    this.padChorus = new Tone.Chorus({ frequency: 0.6, delayTime: 4, depth: 0.7, spread: 180, wet: 0.6 })
      .connect(this.channels[3]).start();
    this.padFilter = new Tone.Filter({ type: 'lowpass', frequency: 1800, Q: 0.7, rolloff: -12 }).connect(this.padChorus);
    this.pad = new Tone.PolySynth(Tone.Synth).connect(this.padFilter);

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
    Tone.Transport.scheduleRepeat((time) => this.tick(time), '16n');
  }

  get playing() {
    return Tone.Transport.state === 'started';
  }

  start() {
    this.pos = 0;
    this.arpChord = null;
    Tone.Transport.start();
  }

  stop() {
    Tone.Transport.stop();
    this.pos = 0;
    this.arpChord = null;
    this.onStep(-1);
  }

  /** Aplica al audio los ajustes del estado que cambiaron desde la última vez. */
  sync(S) {
    if (!this.ready) return;
    const a = this.applied;
    if (a.bpm !== S.bpm) Tone.Transport.bpm.value = S.bpm;
    if (a.swing !== S.swing) {
      Tone.Transport.swingSubdivision = '16n';
      Tone.Transport.swing = S.swing / 100;
    }
    if (a.cut !== S.cut) this.masterFilter.frequency.rampTo(S.cut >= 100 ? 20000 : cutHz(S.cut), 0.05);
    if (a.wave !== S.wave) this.applyWave(S.wave);
    if (a.pad !== S.pad) this.applyPad(S.pad);
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
      this.revSends[i].gain.value = sendDb(m.rev);
      this.delSends[i].gain.value = sendDb(m.del);
    });
    this.applied = { pad: S.pad, bpm: S.bpm, swing: S.swing, cut: S.cut, wave: S.wave, kit: S.kit, arp: S.arp, mix: S.mix, silent };
  }

  applyPad(sound) {
    if (sound === 'dreamy') {
      // Sierras desafinadas, ataque lento y cola larga, filtradas y con chorus.
      this.pad.set({
        oscillator: { type: 'fatsawtooth', count: 3, spread: 28 },
        envelope: { attack: 0.35, decay: 0.6, sustain: 0.75, release: 2.2 },
        volume: -16,
      });
      this.padFilter.frequency.value = 1600;
      this.padChorus.wet.value = 0.6;
    } else {
      this.pad.set({
        oscillator: { type: 'fatsine', count: 2, spread: 12 },
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
        oscillator: { type: 'fatsawtooth', count: 3, spread: 24 },
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

  buildKit(kit) {
    this.kitNodes.forEach((n) => n.dispose());
    this.kitNodes = [];
    const keep = (n) => {
      this.kitNodes.push(n);
      return n;
    };
    const ch0 = this.channels[0];
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
      this.drum = [
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
      this.drum = [
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
      this.drum = [
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
      this.drum = [
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
      this.drum = [
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
  }

  tick(time) {
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

    for (let r = 0; r < 4; r++) if (hit(0, r)) this.drum[r](time, vel(0, r));
    for (let r = 7; r >= 0; r--) {
      if (hit(1, r)) {
        this.bass.triggerAttackRelease(T.bass[r], '16n', time, vel(1, r));
        break; // el bajo es monofónico: suena la nota más grave marcada
      }
    }
    T.lead.forEach((n, r) => {
      if (hit(2, r)) this.lead.triggerAttackRelease(n, '8n', time, vel(2, r));
    });
    T.chords.forEach((chord, r) => {
      if (!chord || !hit(3, r)) return;
      if (S.arp === 'off') this.pad.triggerAttackRelease(chord, this.padLength, time, vel(3, r));
      else {
        this.arpChord = { notes: chord.map((n) => Tone.Frequency(n).transpose(12).toNote()), vel: vel(3, r) };
        this.arpIndex = 0;
      }
    });

    if (S.arp !== 'off' && this.arpChord) {
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

    Tone.Draw.schedule(() => this.onStep(c), time);
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
    Tone.Destination.connect(recorder);
    this.recording = true;
    recorder.start();

    const t0 = Tone.now() + 0.1;
    this.pos = 0;
    this.arpChord = null;
    Tone.Transport.start(t0);
    Tone.Transport.stop(t0 + loopSec);

    const totalMs = (0.1 + loopSec + tailSec) * 1000;
    const started = performance.now();
    await new Promise((resolve) => {
      const id = setInterval(() => {
        const elapsed = performance.now() - started;
        onProgress(Math.min(1, elapsed / totalMs));
        if (elapsed >= totalMs || this.cancelled) { clearInterval(id); resolve(); }
      }, 100);
    });

    if (this.cancelled) Tone.Transport.stop();
    const blob = await recorder.stop();
    Tone.Destination.disconnect(recorder);
    recorder.dispose();
    this.recording = false;
    this.pos = 0;
    this.onStep(-1);
    if (this.cancelled) return null;

    // El grabador entrega audio comprimido; se decodifica para convertirlo a WAV.
    const buffer = await Tone.getContext().rawContext.decodeAudioData(await blob.arrayBuffer());
    return buffer;
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
    if (track === 1) this.bass.triggerAttackRelease(T.bass[row], '8n', now, vel);
    if (track === 2) this.lead.triggerAttackRelease(T.lead[row], '8n', now, vel);
    if (track === 3 && T.chords[row]) this.pad.triggerAttackRelease(T.chords[row], this.padLength, now, vel);
  }
}
