import * as THREE from 'three';
import { add, mat, G, group, canvasTex } from './util.js';

// ---------------------------------------------------------------
// 箱庭の住人たち（すべて人間以外の生き物）
// 原点は足元。+Z が正面。
// ---------------------------------------------------------------

const _v = new THREE.Vector3();
export const black = () => mat('#16161c', { roughness: 0.25 });
export const shine = () => mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.2 });

/** つぶらな黒目 */
export function beadEye(parent, x, y, z, r = 0.06) {
  const g = group(parent, x, y, z);
  add(g, G.sphere(r, 14, 10), black(), 0, 0, 0, { scale: [1, 1.15, 0.6], cast: false });
  add(g, G.sphere(r * 0.32, 8, 6), shine(), r * 0.32, r * 0.38, r * 0.45, { cast: false });
  return g;
}

export class Creature {
  constructor(kind) {
    this.kind = kind;
    this.root = new THREE.Group();
    this.body = group(this.root);
    this.eyes = [];
    this.phase = Math.random() * 10;
    this.blinkT = 1 + Math.random() * 3;
    this.talkT = 0;
    this.hopT = 0;
    this.lookTarget = null;
    this.head = null;
    this.sleeping = false;
    // ちょっとしたしぐさ（ときどき あたりを見回す・首をかしげる・はねる）
    this.idleT = 4 + Math.random() * 8;
    this.idle = null; // { kind, t, dur, dir }
    this.greetCool = 0;
    this.noIdleHop = false;
  }

  talk(sec = 1.4) { this.talkT = sec; }

  hop() { this.hopT = 0.5; }

  update(dt, t) {
    const p = this.phase;
    // 呼吸
    const breath = this.sleeping ? Math.sin(t * 1.2 + p) * 0.035 : Math.sin(t * 2.2 + p) * 0.018;
    this.body.scale.set(1 - breath * 0.4, 1 + breath, 1 - breath * 0.4);
    // まばたき
    if (!this.sleeping) {
      this.blinkT -= dt;
      let s = 1;
      if (this.blinkT < 0.12) s = Math.abs(this.blinkT - 0.06) / 0.06;
      if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3.5;
      for (const e of this.eyes) e.scale.y = Math.min(1, Math.max(0.08, s));
    }
    // おしゃべり・ジャンプ
    let y = 0;
    this._updateIdle(dt);
    const idle = this.idle;
    const idleK = idle ? Math.sin(Math.min(1, idle.t / idle.dur) * Math.PI) : 0; // 0→1→0
    if (this.talkT > 0) {
      this.talkT -= dt;
      y = Math.abs(Math.sin(t * 13)) * 0.05;
      if (this.head) this.head.rotation.z = Math.sin(t * 6.5) * 0.06;
    } else if (this.head) {
      const tilt = idle && idle.kind === 'tilt' && !this.sleeping ? 0.28 * idle.dir * Math.min(1, idleK * 2) : 0;
      this.head.rotation.z += (tilt - this.head.rotation.z) * Math.min(1, dt * 6);
    }
    if (idle && idle.kind === 'stretch' && !this.sleeping) {
      const k = idleK * 0.06;
      this.body.scale.set(this.body.scale.x * (1 - k * 0.5), this.body.scale.y * (1 + k), this.body.scale.z * (1 - k * 0.5));
    }
    if (this.hopT > 0) {
      this.hopT -= dt;
      const k = 1 - this.hopT / 0.5;
      y += Math.sin(k * Math.PI) * 0.35;
    }
    this.body.position.y = y;
    // 首をかしげるアイドル／話すときはカメラのほうを向く
    if (this.head && !this.sleeping) {
      let yaw = Math.sin(t * 0.5 + p) * 0.18;
      if (idle && idle.kind === 'look') yaw = 0.75 * idle.dir * Math.min(1, idleK * 1.6);
      if ((this.talkT > 0 || (idle && idle.kind === 'greet')) && this.camPos) {
        const w = this.root.getWorldPosition(_v);
        const a = Math.atan2(this.camPos.x - w.x, this.camPos.z - w.z) - this.root.rotation.y;
        yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(Math.sin(a), Math.cos(a))));
      }
      this.head.rotation.y += (yaw - this.head.rotation.y) * Math.min(1, dt * 5);
      if (this.talkT <= 0) this.head.rotation.x = Math.sin(t * 0.37 + p * 2) * 0.04;
    }
    if (this.extra) this.extra(dt, t);
  }

  /** ときどき しぐさをする。カメラが近づくと こちらを見てあいさつ */
  _updateIdle(dt) {
    if (this.idle) {
      this.idle.t += dt;
      if (this.idle.t >= this.idle.dur) this.idle = null;
    }
    this.greetCool -= dt;
    if (this.sleeping || this.talkT > 0 || !this.root.visible) return;
    if (this.camPos && this.greetCool <= 0 && !this.idle) {
      const w = this.root.getWorldPosition(_v);
      if (w.distanceTo(this.camPos) < 9) {
        this.idle = { kind: 'greet', t: 0, dur: 1.6, dir: 1 };
        if (!this.noIdleHop) this.hop();
        this.greetCool = 25;
        return;
      }
    }
    this.idleT -= dt;
    if (this.idleT > 0 || this.idle) return;
    this.idleT = 7 + Math.random() * 10;
    const kinds = ['look', 'look', 'tilt', 'stretch'];
    if (!this.noIdleHop) kinds.push('hop');
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === 'hop') { this.hopT = 0.5; return; }
    this.idle = { kind, t: 0, dur: kind === 'look' ? 2.2 : 1.4, dir: Math.random() < 0.5 ? -1 : 1 };
  }
}

// ---------------------------------------------------------------
// ネコの駅長
// ---------------------------------------------------------------
export function makeCat() {
  const c = new Creature('cat');
  const b = c.body;
  const fur = mat('#f0a457');
  const furDark = mat('#c9773a');
  const white = mat('#fff8ef');
  const navy = mat('#25355e', { roughness: 0.7 });
  const gold = mat('#e8c25a', { metalness: 0.7, roughness: 0.3 });
  const pink = mat('#f39aa6');

  // 足
  add(b, G.sphere(0.15), white, -0.17, 0.1, 0.1, { scale: [1, 0.65, 1.35] });
  add(b, G.sphere(0.15), white, 0.17, 0.1, 0.1, { scale: [1, 0.65, 1.35] });
  // 制服の胴体
  add(b, G.cyl(0.3, 0.42, 0.72, 24), navy, 0, 0.5, 0);
  add(b, G.cyl(0.43, 0.43, 0.06, 24), gold, 0, 0.18, 0);
  for (let i = 0; i < 3; i++) add(b, G.sphere(0.035, 10, 8), gold, 0, 0.36 + i * 0.16, 0.395 - i * 0.04);
  add(b, G.torus(0.24, 0.06, 8, 20), white, 0, 0.87, 0, { rot: [Math.PI / 2, 0, 0] });
  // 腕
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.36, 0.8, 0);
    arm.rotation.z = s * 0.35;
    add(arm, G.capsule(0.085, 0.3), navy, 0, -0.2, 0);
    add(arm, G.sphere(0.09), white, 0, -0.4, 0);
    if (s < 0) c.armL = arm; else c.armR = arm;
  }
  // 頭
  const head = (c.head = group(b, 0, 1.25, 0));
  add(head, G.sphere(0.45, 28, 20), fur, 0, 0, 0, { scale: [1.12, 0.95, 1] });
  // しま模様
  for (const [x, ry] of [[-0.14, 0.2], [0, 0], [0.14, -0.2]]) {
    add(head, G.box(0.06, 0.2, 0.05), furDark, x, 0.3, 0.32, { rot: [-0.7, ry, 0], cast: false });
  }
  add(head, G.sphere(0.21), white, 0, -0.13, 0.31, { scale: [1.35, 0.85, 0.85] });
  add(head, G.sphere(0.045, 10, 8), pink, 0, -0.04, 0.48, { scale: [1.3, 0.85, 1] });
  // 口（ω）
  for (const s of [-1, 1]) {
    add(head, G.torus(0.045, 0.012, 6, 12, Math.PI), mat('#5a3a30'), s * 0.045, -0.11, 0.475, { rot: [0, 0, Math.PI], cast: false });
  }
  // 目
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.17, 0.05, 0.39, 0.065));
  // ほっぺ
  for (const s of [-1, 1]) add(head, G.sphere(0.06, 10, 8), mat('#ff9e9e', { transparent: true, opacity: 0.55 }), s * 0.28, -0.09, 0.33, { scale: [1, 0.6, 0.4], cast: false });
  // ひげ
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      add(head, G.box(0.28, 0.008, 0.008), mat('#fff'), s * 0.36, -0.08 + i * 0.045, 0.34, { rot: [0, s * 0.25, s * (i - 1) * 0.15], cast: false });
    }
  }
  // 耳
  for (const s of [-1, 1]) {
    const ear = group(head, s * 0.3, 0.32, -0.02);
    ear.rotation.z = -s * 0.32;
    add(ear, G.cone(0.15, 0.3, 4), fur, 0, 0.1, 0, { rot: [0, Math.PI / 4, 0] });
    add(ear, G.cone(0.09, 0.2, 4), pink, 0, 0.07, 0.05, { rot: [0, Math.PI / 4, 0], cast: false });
    if (s < 0) c.earL = ear; else c.earR = ear;
  }
  // 駅長帽
  const cap = group(head, 0, 0.36, 0.02);
  cap.rotation.x = -0.12;
  add(cap, G.cyl(0.27, 0.28, 0.16, 24), navy, 0, 0, 0);
  add(cap, G.cyl(0.33, 0.27, 0.08, 24), navy, 0, 0.11, 0);
  add(cap, G.cyl(0.285, 0.285, 0.045, 24), gold, 0, -0.03, 0);
  add(cap, G.cyl(0.07, 0.07, 0.02, 5), gold, 0, 0.03, 0.28, { rot: [Math.PI / 2, 0, 0] });
  add(cap, new THREE.CylinderGeometry(0.28, 0.28, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), black(), 0, -0.07, 0.07, { scale: [1, 1, 0.9] });
  // しっぽ
  const tail = (c.tail = group(b, 0, 0.3, -0.32));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, -0.05, -0.3),
    new THREE.Vector3(0.15, 0.25, -0.45), new THREE.Vector3(0.2, 0.6, -0.35),
  ]);
  add(tail, new THREE.TubeGeometry(curve, 20, 0.065, 8), fur);
  add(tail, G.sphere(0.07), furDark, 0.2, 0.6, -0.35);

  c.extra = (dt, t) => {
    c.tail.rotation.z = Math.sin(t * 1.6 + c.phase) * 0.35;
    c.tail.rotation.y = Math.sin(t * 0.9) * 0.2;
    const tw = Math.sin(t * 7) > 0.97 ? 0.25 : 0;
    c.earL.rotation.x = tw;
    if (c.wave > 0) {
      c.wave -= dt;
      c.armR.rotation.z = -2.4 + Math.sin(t * 10) * 0.35;
    } else {
      c.armR.rotation.z += (0.35 - c.armR.rotation.z) * 0.15;
    }
  };
  c.wave = 0;
  return c;
}

// ---------------------------------------------------------------
// フクロウの切符係
// ---------------------------------------------------------------
export function makeOwl() {
  const c = new Creature('owl');
  c.noIdleHop = true;
  const b = c.body;
  const brown = mat('#8b6646');
  const dark = mat('#5e4430');
  const cream = mat('#efe0c2');
  const face = mat('#f3e8d2');
  const amber = mat('#f0b23a', { roughness: 0.3 });
  const orange = mat('#e09a3a');

  add(b, G.sphere(0.5, 28, 20), brown, 0, 0.55, 0, { scale: [1, 1.12, 0.92] });
  add(b, G.sphere(0.38, 24, 16), cream, 0, 0.45, 0.2, { scale: [1, 1.1, 0.7] });
  // 胸の模様
  for (let i = 0; i < 6; i++) {
    const x = ((i % 3) - 1) * 0.12;
    const y = 0.3 + Math.floor(i / 3) * 0.16;
    add(b, G.cone(0.035, 0.07, 3), dark, x, y, 0.44, { rot: [Math.PI / 2 + 0.3, 0, Math.PI], cast: false });
  }
  // 翼
  for (const s of [-1, 1]) add(b, G.sphere(0.3), dark, s * 0.46, 0.5, -0.02, { scale: [0.35, 0.85, 0.75], rot: [0, 0, s * 0.15] });
  // 足
  for (const s of [-1, 1]) add(b, G.sphere(0.07), orange, s * 0.15, 0.02, 0.25, { scale: [1.3, 0.6, 1.2] });

  const head = (c.head = group(b, 0, 0.85, 0.05));
  // 顔盤
  for (const s of [-1, 1]) add(head, G.cyl(0.2, 0.2, 0.05, 24), face, s * 0.17, 0.02, 0.38, { rot: [Math.PI / 2, 0, 0], cast: false });
  // 大きな目＋まぶた
  c.lids = [];
  for (const s of [-1, 1]) {
    const eg = group(head, s * 0.17, 0.03, 0.41);
    add(eg, G.sphere(0.11, 20, 14), amber, 0, 0, 0, { scale: [1, 1, 0.45], cast: false });
    add(eg, G.sphere(0.06, 14, 10), black(), 0, 0, 0.03, { scale: [1, 1, 0.5], cast: false });
    add(eg, G.sphere(0.022, 8, 6), shine(), 0.03, 0.035, 0.06, { cast: false });
    c.eyes.push(eg);
    const lid = add(head, G.sphere(0.125, 20, 14), mat('#c9a77d'), s * 0.17, 0.03, 0.42, { scale: [1, 1, 0.55], cast: false });
    c.lids.push(lid);
  }
  // めがね
  for (const s of [-1, 1]) add(head, G.torus(0.13, 0.012, 6, 28), mat('#d4b14a', { metalness: 0.8, roughness: 0.3 }), s * 0.17, 0.03, 0.47, { cast: false });
  add(head, G.box(0.08, 0.012, 0.012), mat('#d4b14a', { metalness: 0.8, roughness: 0.3 }), 0, 0.05, 0.47, { cast: false });
  // くちばし
  add(head, G.cone(0.055, 0.14, 4), orange, 0, -0.1, 0.45, { rot: [Math.PI + 0.35, 0, 0] });
  // 羽角
  for (const s of [-1, 1]) add(head, G.cone(0.08, 0.22, 4), dark, s * 0.28, 0.27, -0.02, { rot: [0, 0, -s * 0.5] });
  // 緑のバイザー帽
  add(head, G.cyl(0.36, 0.36, 0.06, 28), mat('#3f7d5a', { transparent: true, opacity: 0.85 }), 0, 0.2, 0.12, { rot: [0.25, 0, 0] });
  add(head, G.torus(0.33, 0.03, 6, 28), mat('#2f5d44'), 0, 0.22, 0.02, { rot: [Math.PI / 2 + 0.1, 0, 0] });

  c.setSleeping = (on) => {
    c.sleeping = on;
    for (const l of c.lids) l.visible = on;
    for (const e of c.eyes) e.scale.y = on ? 0.1 : 1;
  };
  c.extra = (dt, t) => {
    if (c.sleeping) {
      c.head.rotation.z = Math.sin(t * 0.8) * 0.12;
      c.head.rotation.x = 0.15;
      c.head.rotation.y = 0;
    }
  };
  c.setSleeping(true);
  return c;
}

// ---------------------------------------------------------------
// カエルの機関士
// ---------------------------------------------------------------
export function makeFrog() {
  const c = new Creature('frog');
  const b = c.body;
  const green = mat('#6db24a');
  const belly = mat('#e7efb2');
  const red = mat('#d2463a');

  // 足
  for (const s of [-1, 1]) add(b, G.sphere(0.16), green, s * 0.24, 0.07, 0.18, { scale: [1.3, 0.45, 1.5] });
  // 胴（作業着）
  add(b, G.sphere(0.45, 24, 18), mat('#3d5f8f'), 0, 0.45, 0, { scale: [1.05, 0.95, 0.95] });
  add(b, G.box(0.36, 0.3, 0.1), mat('#3d5f8f'), 0, 0.62, 0.36, { rot: [-0.2, 0, 0] });
  for (const s of [-1, 1]) add(b, G.box(0.06, 0.4, 0.06), mat('#2c4670'), s * 0.15, 0.78, 0.25, { rot: [-0.3, 0, 0] });
  // 腕
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.42, 0.6, 0.05);
    arm.rotation.z = s * 0.5;
    add(arm, G.capsule(0.07, 0.25), green, 0, -0.15, 0);
    add(arm, G.sphere(0.085), green, 0, -0.32, 0.02, { scale: [1.2, 0.8, 1.2] });
    if (s > 0) c.armR = arm;
  }
  // 油さし
  const can = group(c.armR, 0, -0.42, 0.05);
  add(can, G.cyl(0.08, 0.1, 0.16, 14), mat('#c0a050', { metalness: 0.7, roughness: 0.35 }), 0, -0.05, 0);
  add(can, G.cyl(0.012, 0.02, 0.25, 6), mat('#c0a050', { metalness: 0.7, roughness: 0.35 }), 0.1, 0.05, 0, { rot: [0, 0, -0.9] });

  // 頭
  const head = (c.head = group(b, 0, 0.98, 0));
  add(head, G.sphere(0.42, 28, 20), green, 0, 0, 0, { scale: [1.3, 0.82, 1.05] });
  const throat = add(head, G.sphere(0.35, 24, 16), belly, 0, -0.1, 0.12, { scale: [1.25, 0.6, 0.95] });
  throat.userData.keep = true;
  // 口
  add(head, G.torus(0.3, 0.016, 6, 28, Math.PI), mat('#2a4a20'), 0, -0.02, 0.33, { rot: [0.25, 0, Math.PI], cast: false });
  // 目
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.17, 20, 14), green, s * 0.25, 0.27, 0.06);
    add(head, G.sphere(0.13, 20, 14), mat('#fffdf2'), s * 0.25, 0.3, 0.14, { scale: [1, 1, 0.7], cast: false });
    c.eyes.push(beadEye(head, s * 0.25, 0.3, 0.23, 0.07));
  }
  for (const s of [-1, 1]) add(head, G.sphere(0.06, 10, 8), mat('#ff9e9e', { transparent: true, opacity: 0.6 }), s * 0.38, -0.05, 0.28, { scale: [1, 0.6, 0.4], cast: false });
  // 機関士帽（青白ストライプ）
  const stripe = canvasTex(128, 32, (ctx, w, h) => {
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#f2f2f2' : '#3b5ea8'; ctx.fillRect(i * 8, 0, 8, h); }
  });
  const capMat = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.8 });
  const cap = group(head, 0, 0.3, -0.18);
  cap.rotation.x = -0.35;
  add(cap, G.cyl(0.25, 0.28, 0.24, 24), capMat, 0, 0.05, 0);
  add(cap, G.sphere(0.25, 20, 10), capMat, 0, 0.16, 0, { scale: [1, 0.35, 1] });
  add(cap, new THREE.CylinderGeometry(0.27, 0.27, 0.025, 20, 1, false, -Math.PI / 2, Math.PI), mat('#2a3a6a'), 0, -0.06, 0.08, { scale: [1, 1, 1.1] });
  // 赤いスカーフ
  add(b, G.cyl(0.36, 0.43, 0.12, 24), red, 0, 0.74, 0);
  add(b, G.cone(0.12, 0.25, 4), red, 0.12, 0.62, 0.36, { rot: [0.4, 0, 0.3] });

  c.extra = (dt, t) => {
    // のどをふくらませる
    const k = Math.max(0, Math.sin(t * 1.3 + c.phase * 3)) ** 8;
    throat.scale.y = 0.6 + k * 0.2;
  };
  return c;
}

// ---------------------------------------------------------------
// ウサギの旅人
// ---------------------------------------------------------------
export function makeRabbit() {
  const c = new Creature('rabbit');
  const b = c.body;
  const white = mat('#fbf6f0');
  const pink = mat('#f5a7b4');
  const scarf = mat('#5d8fc9');

  add(b, G.sphere(0.36, 24, 18), white, 0, 0.36, 0, { scale: [1, 1.05, 0.95] });
  add(b, G.sphere(0.12), white, 0, 0.25, -0.34); // しっぽ
  for (const s of [-1, 1]) add(b, G.sphere(0.11), white, s * 0.17, 0.07, 0.24, { scale: [1, 0.6, 1.5] });
  for (const s of [-1, 1]) add(b, G.sphere(0.09), white, s * 0.3, 0.42, 0.15, { scale: [0.8, 1.2, 0.8] });
  // マフラー
  add(b, G.torus(0.2, 0.07, 10, 22), scarf, 0, 0.66, 0, { rot: [Math.PI / 2, 0, 0] });
  add(b, G.box(0.12, 0.3, 0.05), scarf, 0.12, 0.5, 0.2, { rot: [0.15, 0, 0.15] });

  const head = (c.head = group(b, 0, 0.93, 0));
  add(head, G.sphere(0.33, 26, 18), white, 0, 0, 0, { scale: [1.1, 0.95, 1] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.13, 0.03, 0.29, 0.055));
  add(head, G.sphere(0.035, 10, 8), pink, 0, -0.06, 0.33, { scale: [1.3, 0.9, 1] });
  for (const s of [-1, 1]) add(head, G.sphere(0.055, 10, 8), mat('#ffb0b8', { transparent: true, opacity: 0.6 }), s * 0.2, -0.08, 0.25, { scale: [1, 0.6, 0.4], cast: false });
  // 耳
  c.ears = [];
  for (const s of [-1, 1]) {
    const ear = group(head, s * 0.13, 0.25, -0.02);
    ear.rotation.z = -s * 0.15;
    add(ear, G.capsule(0.075, 0.45), white, 0, 0.3, 0, { scale: [1, 1, 0.55] });
    add(ear, G.capsule(0.045, 0.38), pink, 0, 0.3, 0.025, { scale: [1, 1, 0.4], cast: false });
    c.ears.push(ear);
  }
  c.ears[0].rotation.x = 0.9; // 片耳がたれている
  // 麦わら帽子
  const straw = mat('#e8c47e');
  const hat = group(head, 0.05, 0.25, 0);
  hat.rotation.z = -0.15;
  add(hat, G.cyl(0.36, 0.36, 0.025, 28), straw, 0, 0, 0);
  add(hat, G.cyl(0.18, 0.21, 0.15, 24), straw, 0, 0.08, 0);
  add(hat, G.cyl(0.215, 0.215, 0.05, 24), mat('#d45a6a'), 0, 0.03, 0);

  c.sad = true;
  c.extra = (dt, t) => {
    c.ears[1].rotation.x = Math.sin(t * 1.1 + c.phase) * 0.12 + (c.sad ? 0.35 : 0);
    c.ears[0].rotation.x = 0.9 + Math.sin(t * 1.4) * 0.05;
    if (c.sad) c.head.rotation.x = 0.2;
  };
  return c;
}

// ---------------------------------------------------------------
// カラス
// ---------------------------------------------------------------
export function makeCrow() {
  const c = new Creature('crow');
  c.noIdleHop = true;
  const b = c.body;
  const black1 = mat('#1d1f2b', { roughness: 0.35, metalness: 0.15 });
  const beak = mat('#3a3a44', { roughness: 0.4 });

  add(b, G.sphere(0.3, 22, 16), black1, 0, 0.35, 0, { scale: [0.9, 0.95, 1.25] });
  for (const s of [-1, 1]) add(b, G.sphere(0.24), black1, s * 0.22, 0.38, -0.08, { scale: [0.35, 0.75, 1.2], rot: [0.2, 0, s * 0.1] });
  add(b, G.box(0.24, 0.04, 0.4), black1, 0, 0.3, -0.42, { rot: [-0.35, 0, 0] });
  for (const s of [-1, 1]) add(b, G.cyl(0.018, 0.018, 0.14, 6), beak, s * 0.1, 0.06, 0.05);

  const head = (c.head = group(b, 0, 0.62, 0.22));
  add(head, G.sphere(0.2, 22, 16), black1, 0, 0, 0);
  add(head, G.cone(0.075, 0.28, 8), beak, 0, -0.03, 0.27, { rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.12, 0.05, 0.13, 0.04));
  // 頭のアホ毛
  add(head, G.cone(0.03, 0.14, 4), black1, 0, 0.21, 0, { rot: [-0.3, 0, 0] });

  // くちばしにくわえたゼンマイ鍵
  const key = (c.key = group(head, 0.06, -0.08, 0.33));
  const brass = mat('#e2b54a', { metalness: 0.8, roughness: 0.25, emissive: '#5a3a00', emissiveIntensity: 0.4 });
  add(key, G.box(0.03, 0.22, 0.03), brass, 0, -0.05, 0, { cast: false });
  add(key, G.torus(0.05, 0.016, 6, 12), brass, -0.045, 0.08, 0, { rot: [0, 0, 0.6], cast: false });
  add(key, G.torus(0.05, 0.016, 6, 12), brass, 0.045, 0.08, 0, { rot: [0, 0, -0.6], cast: false });

  c.extra = (dt, t) => {
    // ときどき首をかしげる
    const k = Math.sin(t * 0.7 + c.phase);
    c.head.rotation.z = k > 0.8 ? 0.4 : 0;
  };
  return c;
}

// ---------------------------------------------------------------
// ネズミ
// ---------------------------------------------------------------
export function makeMouse(color = '#d64a4a', leader = false) {
  const c = new Creature('mouse');
  c.noIdleHop = true;
  const b = c.body;
  const fur = mat('#b9aeb4');
  const pink = mat('#f4a4b2');

  add(b, G.sphere(0.13, 18, 12), fur, 0, 0.13, 0, { scale: [1, 0.95, 1.2] });
  add(b, G.torus(0.075, 0.025, 6, 14), mat(color), 0, 0.22, 0.05, { rot: [Math.PI / 2, 0, 0] });
  const head = (c.head = group(b, 0, 0.27, 0.08));
  add(head, G.sphere(0.1, 18, 12), fur, 0, 0, 0, { scale: [1, 0.95, 1.1] });
  add(head, G.sphere(0.03, 8, 6), pink, 0, -0.01, 0.11);
  for (const s of [-1, 1]) {
    add(head, G.cyl(0.065, 0.065, 0.02, 16), fur, s * 0.09, 0.09, -0.01, { rot: [Math.PI / 2, 0, s * 0.3] });
    add(head, G.cyl(0.045, 0.045, 0.022, 16), pink, s * 0.09, 0.09, 0.0, { rot: [Math.PI / 2, 0, s * 0.3], cast: false });
    c.eyes.push(beadEye(head, s * 0.045, 0.02, 0.085, 0.022));
  }
  const tail = (c.tail = group(b, 0, 0.08, -0.14));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.0, -0.12),
    new THREE.Vector3(-0.02, 0.08, -0.22), new THREE.Vector3(0.04, 0.16, -0.25),
  ]);
  add(tail, new THREE.TubeGeometry(curve, 12, 0.012, 5), pink, 0, 0, 0, { cast: false });
  if (leader) {
    // どんぐり帽子
    add(head, G.sphere(0.07, 14, 8), mat('#8a5a2e'), 0, 0.09, 0, { scale: [1.2, 0.6, 1.2] });
    add(head, G.cyl(0.01, 0.01, 0.05, 6), mat('#5a3a1e'), 0, 0.14, 0);
  }
  c.extra = (dt, t) => {
    c.tail.rotation.y = Math.sin(t * 3 + c.phase) * 0.5;
  };
  return c;
}
