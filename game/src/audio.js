// audio.js — every sound in Stormwake is synthesised with WebAudio: no
// audio files, no network. A lazy AudioContext wakes on the first user
// gesture. The score is a slow storm sequencer: a deep bass line, a minor
// arpeggio and a bed of filtered wind noise; the effects are short
// oscillator and noise shapes (flare shots, hits, bursts, pickups,
// thunder, the Gale Mother's roar).

const BASS_LINE = [55, 55, 43.65, 49.0]; // A1 A1 F1 G1
const ARP_NOTES = [220, 261.63, 329.63, 440, 349.23, 261.63, 196, 246.94]; // Am F C G colour

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.step = 0;
    this.nextNoteAt = 0;
    this.windGain = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startWind();
    this.nextNoteAt = this.ctx.currentTime + 0.1;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.03);
    }
  }

  startWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.045;
    src.connect(filter).connect(this.windGain).connect(this.master);
    src.start();
  }

  // Called every frame from the game loop; schedules the sequencer.
  update(intensity) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(0.035 + intensity * 0.05, ctx.currentTime, 0.4);
    }
    while (this.nextNoteAt < ctx.currentTime + 0.18) {
      this.scheduleStep(this.step, this.nextNoteAt, intensity);
      this.step++;
      this.nextNoteAt += 0.24;
    }
  }

  scheduleStep(step, at, intensity) {
    const bar = Math.floor(step / 8) % 4;
    if (step % 8 === 0) this.tone(BASS_LINE[bar], at, 1.6, 'sine', 0.20);
    if (step % 2 === 0) {
      const note = ARP_NOTES[step / 2 % ARP_NOTES.length | 0];
      this.tone(note, at, 0.34, 'triangle', 0.05 + intensity * 0.03);
    }
    if (intensity > 0.55 && step % 4 === 2) {
      this.tone(ARP_NOTES[(step + 3) % ARP_NOTES.length] * 2, at, 0.2, 'sine', 0.035);
    }
  }

  tone(freq, at, dur, type, vol, slideTo) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  noise(at, dur, vol, freq, type = 'bandpass') {
    const ctx = this.ctx;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(at);
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  shoot() {
    if (!this.ctx || this.muted) return;
    this.tone(880 + Math.random() * 120, this.now(), 0.09, 'square', 0.045, 320);
  }

  hit() {
    if (!this.ctx || this.muted) return;
    this.noise(this.now(), 0.06, 0.10, 1800);
  }

  burst(big) {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    this.noise(t, big ? 0.5 : 0.25, big ? 0.30 : 0.16, big ? 300 : 700, 'lowpass');
    this.tone(big ? 90 : 140, t, big ? 0.5 : 0.25, 'sine', 0.22, 40);
  }

  hurt() {
    if (!this.ctx || this.muted) return;
    this.tone(160, this.now(), 0.22, 'sawtooth', 0.14, 70);
  }

  pickup() {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    this.tone(660, t, 0.09, 'sine', 0.10);
    this.tone(990, t + 0.07, 0.14, 'sine', 0.10);
  }

  powerup() {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.06, 0.16, 'triangle', 0.10));
  }

  thunder() {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    this.noise(t, 1.1, 0.28, 160, 'lowpass');
    this.noise(t + 0.05, 0.5, 0.14, 480, 'lowpass');
  }

  roar() {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    this.tone(70, t, 1.4, 'sawtooth', 0.20, 46);
    this.tone(93, t + 0.1, 1.2, 'sawtooth', 0.14, 58);
    this.noise(t, 1.0, 0.10, 240, 'lowpass');
  }

  waveHorn() {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    this.tone(196, t, 0.5, 'triangle', 0.14);
    this.tone(294, t + 0.12, 0.55, 'triangle', 0.12);
  }
}
