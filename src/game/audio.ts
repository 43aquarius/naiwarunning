/* WebAudio 程序化音效与循环背景音乐（实时合成）+ 奶蛙桌宠语音（mp3 素材）。 */
import { fetchPetBuffer } from './pet';

type SfxName = 'coin' | 'jump' | 'slide' | 'lane' | 'land' | 'step' | 'hit' | 'caught' | 'shieldUp' | 'zone' | 'buy' | 'click';

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  enabled = true;
  volume = 0.55;
  mode: 'menu' | 'running' | 'off' = 'off';
  paused = false;
  private lastAt: Partial<Record<SfxName, number>> = {};
  private musicTimer: number | null = null;
  private musicStep = 0;
  private idleTimer: number | null = null;
  private idleStep = 0;

  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    this.updateMix();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    this.updateMix();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.updateMix();
  }

  private updateMix() {
    if (!this.ctx || !this.master || !this.musicGain) return;
    const t = this.ctx.currentTime;
    this.master.gain.linearRampToValueAtTime(this.enabled ? this.volume : 0, t + 0.05);
    const target = this.paused ? 0 : this.mode === 'running' ? 0.5 : this.mode === 'menu' ? 0.4 : 0;
    this.musicGain.gain.linearRampToValueAtTime(target, t + 0.15);
  }

  enterMenu() {
    this.mode = 'menu';
    this.paused = false;
    this.startIdleLoop();
    this.updateMix();
  }

  beginRun() {
    this.mode = 'running';
    this.paused = false;
    this.stopIdleLoop();
    this.startRunLoop();
    this.updateMix();
  }

  pause() { this.paused = true; this.updateMix(); }
  resume() { this.paused = false; this.updateMix(); }

  stopAll() {
    this.mode = 'off';
    this.stopRunLoop();
    this.stopIdleLoop();
    this.updateMix();
  }

  /* ---- 音效合成 ---- */
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq = 1200, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
    src.start(t0);
  }

  play(name: SfxName) {
    if (!this.enabled || this.paused || !this.ctx) return;
    const now = this.ctx.currentTime;
    switch (name) {
      case 'coin':
        if (now - (this.lastAt.coin ?? -99) < 0.07) return;
        this.lastAt.coin = now;
        this.tone(1560, 0.1, 'sine', 0.14);
        this.tone(2340, 0.16, 'sine', 0.1, undefined, 0.05);
        break;
      case 'jump':
        this.tone(340, 0.22, 'sine', 0.2, 720);
        this.noise(0.1, 0.05, 800);
        break;
      case 'slide':
        this.noise(0.28, 0.16, 600);
        this.tone(220, 0.2, 'sawtooth', 0.05, 120);
        break;
      case 'lane':
        this.tone(500, 0.09, 'triangle', 0.14, 700);
        break;
      case 'land':
        this.tone(150, 0.14, 'sine', 0.2, 70);
        this.noise(0.08, 0.1, 300);
        break;
      case 'step':
        if (now - (this.lastAt.step ?? -99) < 0.14) return;
        this.lastAt.step = now;
        this.noise(0.05, 0.05, 900);
        break;
      case 'hit':
        if (now - (this.lastAt.hit ?? -99) < 0.3) return;
        this.lastAt.hit = now;
        this.tone(180, 0.3, 'square', 0.2, 60);
        this.noise(0.2, 0.18, 400);
        break;
      case 'caught':
        this.tone(392, 0.25, 'triangle', 0.2);
        this.tone(330, 0.25, 'triangle', 0.2, undefined, 0.22);
        this.tone(262, 0.5, 'triangle', 0.22, 180, 0.44);
        break;
      case 'shieldUp':
        this.tone(660, 0.12, 'sine', 0.16);
        this.tone(990, 0.2, 'sine', 0.14, undefined, 0.1);
        break;
      case 'zone':
        this.tone(523, 0.15, 'sine', 0.12);
        this.tone(784, 0.25, 'sine', 0.12, undefined, 0.12);
        break;
      case 'buy':
        this.tone(784, 0.1, 'sine', 0.16);
        this.tone(1175, 0.2, 'sine', 0.14, undefined, 0.09);
        break;
      case 'click':
        this.tone(880, 0.05, 'sine', 0.08);
        break;
    }
  }

  /* 桌宠语音：smile.mp3 / laugh.mp3（走 sfxGain，受总开关与音量控制）。
   * laugh 延迟 300ms 播放，对齐原桌宠"音画同步"逻辑。 */
  petVoice(kind: 'smile' | 'laugh', delayMs = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    fetchPetBuffer(ctx, kind).then(buf => {
      if (!buf || !this.ctx || !this.sfxGain || !this.enabled) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.value = kind === 'laugh' ? 0.9 : 0.7;
      src.connect(gain); gain.connect(this.sfxGain);
      src.start(this.ctx.currentTime + delayMs / 1000);
    }).catch(() => {});
  }

  event(name: string) {
    if (this.mode !== 'running') return;
    if (name === 'shieldHit') { this.play('hit'); return; }
    if (name === 'shield' || name === 'shieldFull') { this.play('shieldUp'); return; }
    if (name === 'zone') { this.play('zone'); return; }
    if (name === 'magnet') { this.play('shieldUp'); return; }
    if (['coin', 'jump', 'slide', 'lane', 'land', 'step', 'hit', 'caught'].includes(name)) {
      this.play(name as SfxName);
    }
  }

  /* ---- 背景音乐：轻快五声音阶琶音（跑步模式） ---- */
  private startRunLoop() {
    this.stopRunLoop();
    const bpm = 132;
    const stepMs = (60_000 / bpm) / 2;
    const melody = [
      523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880, 783.99,
      523.25, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 587.33,
      493.88, 587.33, 698.46, 587.33, 523.25, 659.25, 783.99, 659.25,
      523.25, 587.33, 659.25, 523.25, 493.88, 440, 493.88, 523.25,
    ];
    const bass = [130.81, 130.81, 174.61, 174.61, 146.83, 146.83, 196, 196];
    this.musicTimer = window.setInterval(() => {
      if (!this.enabled || this.paused || !this.ctx || !this.musicGain) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      const note = melody[this.musicStep % melody.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.11, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(gain); gain.connect(this.musicGain);
      osc.start(t0); osc.stop(t0 + 0.24);
      if (this.musicStep % 4 === 0) {
        const b = bass[(this.musicStep / 4) % bass.length];
        const bosc = ctx.createOscillator();
        const bgain = ctx.createGain();
        bosc.type = 'triangle';
        bosc.frequency.value = b;
        bgain.gain.setValueAtTime(0.2, t0);
        bgain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
        bosc.connect(bgain); bgain.connect(this.musicGain);
        bosc.start(t0); bosc.stop(t0 + 0.42);
      }
      /* 轻打击 */
      if (this.musicStep % 2 === 1) {
        const len = Math.floor(ctx.sampleRate * 0.03);
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        g.gain.value = 0.35;
        src.connect(g); g.connect(this.musicGain);
        src.start(t0);
      }
      this.musicStep++;
    }, stepMs);
  }

  private stopRunLoop() {
    if (this.musicTimer !== null) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  /* ---- 待机音乐：舒缓琶音（菜单） ---- */
  private startIdleLoop() {
    this.stopIdleLoop();
    const melody = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25];
    this.idleTimer = window.setInterval(() => {
      if (!this.enabled || this.paused || !this.ctx || !this.musicGain) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      const note = melody[this.idleStep % melody.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.13, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
      osc.connect(gain); gain.connect(this.musicGain);
      osc.start(t0); osc.stop(t0 + 1.15);
      this.idleStep++;
    }, 700);
  }

  private stopIdleLoop() {
    if (this.idleTimer !== null) { clearInterval(this.idleTimer); this.idleTimer = null; }
  }
}
