// ---------------------------------------------------------------
// Web Audio だけで鳴らす BGM と効果音（外部ファイル不要）
// ---------------------------------------------------------------

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// オルゴール風のメロディ（拍, MIDI, 長さ）— 8小節ループ
const MELODY = [
  [0, 72, 1], [1, 69, 0.5], [1.5, 72, 0.5], [2, 77, 1], [3, 76, 1],
  [4, 76, 1.5], [5.5, 74, 0.5], [6, 72, 2],
  [8, 74, 1], [9, 72, 0.5], [9.5, 70, 0.5], [10, 74, 1], [11, 77, 1],
  [12, 72, 3],
  [16, 69, 1], [17, 74, 1], [18, 77, 1], [19, 76, 1],
  [20, 74, 1.5], [21.5, 72, 0.5], [22, 70, 1], [23, 74, 1],
  [24, 72, 1], [25, 76, 1], [26, 79, 1], [27, 76, 0.5], [27.5, 74, 0.5],
  [28, 72, 3],
];
const CHORDS = [
  [53, 57, 60], [57, 60, 64], [58, 62, 65], [53, 57, 60],
  [50, 53, 57], [55, 58, 62], [48, 52, 55], [48, 52, 55],
];

// 天空の街：明るく風の吹くような旋律（ハ長調）
const SKY_MELODY = [
  [0, 79, 1], [1, 84, 1], [2, 83, 0.5], [2.5, 81, 0.5], [3, 79, 1],
  [4, 77, 1.5], [5.5, 76, 0.5], [6, 77, 1], [7, 81, 1],
  [8, 79, 1], [9, 74, 1], [10, 76, 0.5], [10.5, 77, 0.5], [11, 79, 1],
  [12, 76, 3],
  [16, 81, 1], [17, 84, 1], [18, 83, 1], [19, 81, 1],
  [20, 79, 1.5], [21.5, 77, 0.5], [22, 76, 1], [23, 74, 1],
  [24, 74, 1], [25, 77, 1], [26, 79, 0.5], [26.5, 81, 0.5], [27, 83, 1],
  [28, 84, 3],
];
const SKY_CHORDS = [
  [48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55],
  [57, 60, 64], [53, 57, 60], [55, 59, 65], [48, 52, 55],
];

// 寂れた温泉街：ヨナ抜き風のゆったりした旋律（ニ調）
const ONSEN_MELODY = [
  [0, 74, 1], [1, 71, 1], [2, 69, 2],
  [4, 67, 1], [5, 69, 0.5], [5.5, 71, 0.5], [6, 69, 2],
  [8, 74, 1], [9, 76, 1], [10, 74, 1], [11, 71, 1],
  [12, 69, 3],
  [16, 67, 1], [17, 69, 1], [18, 71, 1.5], [19.5, 69, 0.5],
  [20, 67, 1], [21, 64, 1], [22, 62, 2],
  [24, 64, 1], [25, 67, 1], [26, 69, 1], [27, 71, 1],
  [28, 69, 3],
];
const ONSEN_CHORDS = [
  [50, 57, 62], [55, 62, 67], [52, 59, 64], [57, 64, 69],
  [50, 57, 62], [55, 62, 67], [57, 64, 69], [50, 57, 62],
];

// 江戸の宿場町：琴のような都節（みやこぶし）風の旋律（ホ調）
const EDO_MELODY = [
  [0, 76, 1], [1, 77, 0.5], [1.5, 76, 0.5], [2, 72, 1], [3, 71, 1],
  [4, 69, 2], [6, 71, 1], [7, 72, 1],
  [8, 76, 1.5], [9.5, 77, 0.5], [10, 81, 1], [11, 77, 1],
  [12, 76, 3],
  [16, 72, 1], [17, 71, 1], [18, 69, 0.5], [18.5, 71, 0.5], [19, 72, 1],
  [20, 71, 1.5], [21.5, 69, 0.5], [22, 65, 2],
  [24, 64, 1], [25, 65, 1], [26, 69, 1], [27, 71, 1],
  [28, 69, 3],
];
const EDO_CHORDS = [
  [52, 59, 64], [57, 64, 69], [52, 59, 64], [53, 57, 64],
  [57, 64, 69], [52, 59, 64], [53, 60, 65], [45, 52, 57],
];

/** 0.5 秒の無音 WAV（data URI） */
function silentWav() {
  const rate = 8000, n = 4000;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  let bin = '';
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

export const SONGS = {
  station: { melody: MELODY, chords: CHORDS, tempo: 74 },
  sky: { melody: SKY_MELODY, chords: SKY_CHORDS, tempo: 88 },
  onsen: { melody: ONSEN_MELODY, chords: ONSEN_CHORDS, tempo: 64 },
  edo: { melody: EDO_MELODY, chords: EDO_CHORDS, tempo: 70 },
};

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmOn = false;
    this.tempo = 74;
    this.song = SONGS.station;
  }

  setSong(id) {
    this.song = SONGS[id] || SONGS.station;
    this.tempo = this.song.tempo;
  }

  /** ユーザー操作後に初期化（自動再生制限のため） */
  /**
   * iPhone 対策：
   *  ・マナーモード（消音スイッチ）でも鳴るよう、音声の種類を「再生」にする
   *  ・touchend / click のときに、無音を一度鳴らして音を解禁する
   *  ・アプリを切りかえて戻ったときに再開する
   */
  installUnlock() {
    if (this._unlockInstalled) return;
    this._unlockInstalled = true;
    const unlock = () => this.unlock();
    for (const ev of ['touchend', 'click', 'keydown']) document.addEventListener(ev, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    });
  }

  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!this._unlocked) {
      this._unlocked = true;
      // 無音を一瞬鳴らす（古い iOS で音を解禁する定番の方法）
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(ctx.destination);
      src.start(0);
      // 古い iOS で消音スイッチを無視させるため、無音の <audio> をループ再生
      try {
        const el = new Audio(silentWav());
        el.loop = true;
        el.setAttribute('playsinline', '');
        el.volume = 0.01;
        el.play().catch(() => {});
        this._silentEl = el;
      } catch (e) { /* ignore */ }
    }
  }

  init() {
    this.installUnlock();
    if (this.ctx) {
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.reverb.connect(wet).connect(this.master);

    this.bgm = ctx.createGain();
    this.bgm.gain.value = 0.32;
    this.bgm.connect(this.master);
    this.bgm.connect(this.reverb);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(this.master);
    const sfxWet = ctx.createGain();
    sfxWet.gain.value = 0.4;
    this.sfx.connect(sfxWet).connect(this.reverb);

    this.noiseBuf = this._noise(2);
  }

  _impulse(sec) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  _noise(sec) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1);
  }

  // ---------- 低レベル ----------
  tone(freq, { dur = 0.3, type = 'sine', gain = 0.2, attack = 0.005, when = 0, slide, vib, out } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    if (vib) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = vib[0];
      lg.gain.value = vib[1];
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out || this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.3, freq = 1000, q = 1, type = 'bandpass', gain = 0.2, attack = 0.01, when = 0, sweep, out } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out || this.sfx);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /** 金属的な鐘の音（倍音を重ねる） */
  bellTone(base, { dur = 2, gain = 0.15, when = 0, partials = [1, 2.76, 5.4, 8.93] } = {}) {
    partials.forEach((p, i) => {
      this.tone(base * p, { dur: dur / (1 + i * 0.6), gain: gain / (1 + i * 1.2), when, attack: 0.002 });
    });
  }

  // ---------- 効果音 ----------
  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'click': this.tone(880, { dur: 0.06, gain: 0.06 }); break;
      case 'select': this.tone(660, { dur: 0.08, gain: 0.08 }); this.tone(990, { dur: 0.1, gain: 0.06, when: 0.05 }); break;
      case 'open': this.noise({ dur: 0.25, freq: 2500, sweep: 900, gain: 0.05, q: 0.7 }); break;
      case 'close': this.noise({ dur: 0.2, freq: 900, sweep: 2500, gain: 0.04, q: 0.7 }); break;
      case 'item':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, { dur: 0.5, gain: 0.1, when: i * 0.07 }));
        this.bellTone(2093, { dur: 1.2, gain: 0.04, when: 0.3 });
        break;
      case 'solve':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, { dur: 0.9, gain: 0.1, when: i * 0.09, type: 'triangle' }));
        this.bellTone(1047, { dur: 2, gain: 0.05, when: 0.45 });
        break;
      case 'quest':
        [659, 880, 1319].forEach((f, i) => this.tone(f, { dur: 0.7, gain: 0.09, when: i * 0.1, type: 'triangle' }));
        break;
      case 'wrong':
        this.tone(220, { dur: 0.18, gain: 0.06, type: 'square' });
        this.tone(165, { dur: 0.25, gain: 0.06, type: 'square', when: 0.12 });
        break;
      case 'bell': this.bellTone(1760, { dur: 1.6, gain: 0.12, partials: [1, 2.4, 3.9, 5.6] }); break;
      case 'chime': this.bellTone(220, { dur: 3, gain: 0.22 }); break;
      case 'whistle':
        this.tone(740, { dur: 1.8, gain: 0.07, attack: 0.15, type: 'triangle', vib: [6, 6] });
        this.tone(932, { dur: 1.8, gain: 0.06, attack: 0.15, type: 'triangle', vib: [6, 6] });
        this.tone(1109, { dur: 1.8, gain: 0.04, attack: 0.15, vib: [6, 6] });
        this.noise({ dur: 1.8, freq: 3000, q: 3, gain: 0.04, attack: 0.15 });
        break;
      case 'chuff': this.noise({ dur: 0.22, freq: 600, sweep: 300, q: 0.8, gain: 0.12, type: 'lowpass' }); break;
      case 'steam': this.noise({ dur: 1.2, freq: 4000, sweep: 2000, q: 0.5, gain: 0.06, type: 'highpass', attack: 0.05 }); break;
      case 'water':
        this.noise({ dur: 2.8, freq: 700, q: 0.6, gain: 0.14, attack: 0.3, type: 'lowpass' });
        this.noise({ dur: 2.8, freq: 2500, q: 2, gain: 0.03, attack: 0.3 });
        break;
      case 'fire':
        this.noise({ dur: 1.0, freq: 300, sweep: 3000, q: 0.6, gain: 0.12, type: 'lowpass', attack: 0.05 });
        this.tone(110, { dur: 0.8, gain: 0.08, slide: 60 });
        break;
      case 'unlock':
        this.noise({ dur: 0.06, freq: 4000, q: 4, gain: 0.12 });
        this.noise({ dur: 0.08, freq: 2500, q: 4, gain: 0.12, when: 0.12 });
        this.tone(330, { dur: 0.3, gain: 0.08, when: 0.12, type: 'triangle' });
        break;
      case 'dial': this.noise({ dur: 0.04, freq: 5000, q: 6, gain: 0.08 }); break;
      case 'lever':
        this.noise({ dur: 0.18, freq: 400, q: 1.5, gain: 0.2 });
        this.tone(120, { dur: 0.2, gain: 0.12, type: 'triangle', when: 0.05 });
        break;
      case 'clunk':
        this.noise({ dur: 0.3, freq: 250, q: 1, gain: 0.2, type: 'lowpass' });
        this.tone(80, { dur: 0.3, gain: 0.15, type: 'triangle' });
        break;
      case 'creak':
        this.tone(180, { dur: 0.5, gain: 0.04, type: 'sawtooth', slide: 140, vib: [18, 12] });
        break;
      case 'crank':
        for (let i = 0; i < 6; i++) this.noise({ dur: 0.05, freq: 2000 + i * 120, q: 5, gain: 0.07, when: i * 0.15 });
        break;
      case 'splash': this.noise({ dur: 0.5, freq: 1200, sweep: 400, q: 0.8, gain: 0.12 }); break;
      case 'pop': this.tone(500, { dur: 0.12, gain: 0.1, slide: 1200 }); break;
      case 'meow':
        this.tone(560, { dur: 0.55, gain: 0.08, type: 'triangle', slide: 480, vib: [5, 20], attack: 0.06 });
        break;
      case 'hoot':
        this.tone(410, { dur: 0.3, gain: 0.1, slide: 370, attack: 0.04 });
        this.tone(410, { dur: 0.45, gain: 0.1, slide: 360, attack: 0.04, when: 0.35 });
        break;
      case 'caw':
        this.tone(620, { dur: 0.22, gain: 0.05, type: 'sawtooth', slide: 430 });
        this.tone(600, { dur: 0.25, gain: 0.05, type: 'sawtooth', slide: 410, when: 0.28 });
        break;
      case 'ribbit':
        for (let i = 0; i < 2; i++) this.tone(150, { dur: 0.14, gain: 0.1, type: 'square', when: i * 0.18, slide: 120, vib: [40, 30] });
        break;
      case 'squeak':
        this.tone(2300, { dur: 0.08, gain: 0.05, slide: 3000 });
        this.tone(2500, { dur: 0.09, gain: 0.05, slide: 3200, when: 0.1 });
        break;
      case 'baa':
        this.tone(380, { dur: 0.6, gain: 0.08, type: 'sawtooth', slide: 360, vib: [11, 25], attack: 0.04 });
        break;
      case 'chirp':
        for (let i = 0; i < 3; i++) this.tone(2600 + i * 200, { dur: 0.07, gain: 0.05, slide: 3400, when: i * 0.09 });
        break;
      case 'whale':
        this.tone(140, { dur: 2.2, gain: 0.12, type: 'triangle', slide: 220, vib: [3, 8], attack: 0.4 });
        this.tone(280, { dur: 2.0, gain: 0.04, slide: 420, attack: 0.5 });
        break;
      case 'whoosh': this.noise({ dur: 1.6, freq: 300, sweep: 2400, q: 0.7, gain: 0.14, type: 'bandpass', attack: 0.4 }); break;
      case 'thunder':
        this.noise({ dur: 2.2, freq: 180, sweep: 60, q: 0.5, gain: 0.25, type: 'lowpass', attack: 0.02 });
        break;
      case 'loom':
        for (let i = 0; i < 6; i++) this.noise({ dur: 0.08, freq: 1200, q: 2, gain: 0.08, when: i * 0.18 });
        break;
      case 'knock': // ししおどし
        this.tone(320, { dur: 0.25, gain: 0.14, type: 'triangle', slide: 260 });
        this.noise({ dur: 0.08, freq: 1500, q: 3, gain: 0.08 });
        break;
      case 'ponpoko':
        for (let i = 0; i < 3; i++) this.tone(200, { dur: 0.12, gain: 0.12, type: 'triangle', when: i * 0.16, slide: 160 });
        break;
      case 'kon':
        this.tone(900, { dur: 0.3, gain: 0.06, type: 'triangle', slide: 1300 });
        this.tone(1300, { dur: 0.3, gain: 0.05, type: 'triangle', slide: 900, when: 0.3 });
        break;
      case 'kii':
        this.tone(1500, { dur: 0.15, gain: 0.05, type: 'square', slide: 2200 });
        this.tone(1600, { dur: 0.15, gain: 0.05, type: 'square', slide: 2400, when: 0.18 });
        break;
      case 'ice':
        for (let i = 0; i < 8; i++) this.tone(2000 + Math.random() * 3000, { dur: 0.15, gain: 0.03, when: i * 0.1 });
        this.noise({ dur: 1.5, freq: 3000, q: 1, gain: 0.05, attack: 0.2 });
        break;
      case 'gong': // 時の鐘（ゴーン……）
        this.bellTone(98, { dur: 4.5, gain: 0.32, partials: [1, 2.0, 2.76, 4.1, 5.4] });
        this.noise({ dur: 0.15, freq: 300, q: 1, gain: 0.08 });
        break;
      case 'hyoshigi': // 拍子木（カン、カン）
        for (let i = 0; i < 2; i++) { this.tone(1900, { dur: 0.08, gain: 0.1, type: 'triangle', when: i * 0.22 }); this.noise({ dur: 0.05, freq: 3000, q: 4, gain: 0.08, when: i * 0.22 }); }
        break;
      case 'wan':
        this.tone(520, { dur: 0.12, gain: 0.09, type: 'sawtooth', slide: 380 });
        this.tone(560, { dur: 0.12, gain: 0.08, type: 'sawtooth', slide: 400, when: 0.2 });
        break;
      case 'kappa':
        this.tone(700, { dur: 0.2, gain: 0.06, type: 'triangle', slide: 1100, vib: [18, 40] });
        break;
      case 'crane':
        this.tone(1300, { dur: 0.35, gain: 0.05, type: 'triangle', slide: 1700 });
        break;
      case 'paper':
        this.noise({ dur: 0.18, freq: 3500, q: 0.8, gain: 0.06, sweep: 2000 });
        break;
      case 'twinkle':
        [1568, 2093, 2637].forEach((f, i) => this.tone(f, { dur: 0.6, gain: 0.04, when: i * 0.06 }));
        break;
      default: break;
    }
  }

  /** セリフ送りの「ポポポ」声 */
  blip(pitch = 600) {
    if (!this.ctx || this.muted) return;
    const f = pitch * (0.9 + Math.random() * 0.25);
    this.tone(f, { dur: 0.06, gain: 0.035, type: 'triangle', slide: f * 1.05 });
  }

  // ---------- BGM ----------
  startBGM() {
    if (!this.ctx || this.bgmOn) return;
    this.bgmOn = true;
    this._startWind();
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._schedule(), 50);
  }

  stopBGM() {
    this.bgmOn = false;
    clearInterval(this.timer);
  }

  _schedule() {
    if (!this.ctx) return;
    const spb = 60 / this.tempo;
    const half = spb / 2;
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const beat = (this.step / 2) % 32; // 0..31.5
      const bar = Math.floor(beat / 4);
      const when = this.nextTime - this.ctx.currentTime;
      const chord = this.song.chords[bar];
      // メロディ
      for (const [b, m, d] of this.song.melody) {
        if (Math.abs(b - beat) < 0.01) this._musicBox(midiHz(m), when, 0.11, 1.6 + d * 0.4);
      }
      // アルペジオ
      const inBar = beat % 4;
      const arp = [0, 1, 2, 1, 2, 0, 1, 2];
      const idx = Math.round(inBar * 2);
      if (idx % 2 === 0 || Math.random() < 0.5) {
        this._musicBox(midiHz(chord[arp[idx]] + 12), when, 0.035, 1.2);
      }
      // ベースとパッド（小節頭）
      if (inBar === 0) {
        this.tone(midiHz(chord[0] - 12), { dur: spb * 3.5, gain: 0.07, when, attack: 0.05, out: this.bgm });
        chord.forEach((m) => {
          this.tone(midiHz(m), { dur: spb * 4, gain: 0.018, when, attack: 0.8, type: 'triangle', out: this.bgm });
        });
      }
      // 夜は虫の声
      if ((this.night || 0) > 0.5 && Math.random() < 0.18) {
        const base = 3800 + Math.random() * 900;
        for (let k = 0; k < 3; k++) this.tone(base, { dur: 0.04, gain: 0.006, when: when + Math.random() * 0.3 + k * 0.06, out: this.sfx });
      }
      this.nextTime += half;
      this.step++;
    }
  }

  /** そよ風の環境音 */
  _startWind() {
    if (this.wind) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0.025;
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 0.015;
    lfo.connect(lg).connect(g.gain);
    const lfo2 = ctx.createOscillator();
    const lg2 = ctx.createGain();
    lfo2.frequency.value = 0.11; lg2.gain.value = 250;
    lfo2.connect(lg2).connect(f.frequency);
    src.connect(f).connect(g).connect(this.master);
    src.start(); lfo.start(); lfo2.start();
    this.wind = g;
  }

  _musicBox(f, when, gain, dur) {
    this.tone(f, { dur, gain, when, attack: 0.003, out: this.bgm });
    this.tone(f * 2.01, { dur: dur * 0.5, gain: gain * 0.25, when, attack: 0.003, out: this.bgm });
    this.tone(f * 3.98, { dur: dur * 0.25, gain: gain * 0.08, when, attack: 0.002, out: this.bgm });
  }
}
