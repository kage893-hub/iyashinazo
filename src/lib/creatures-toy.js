import * as THREE from 'three';
import { add, mat, glow, G, group, canvasTex, FONT } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// からくりおもちゃの街の住人たち（ぬいぐるみ・ブリキ・積み木）
// 原点は足元。+Z が正面。ゼンマイのおもちゃは、巻くまで止まっている（frozen）。
// ---------------------------------------------------------------

const plastic = (c) => mat(c, { roughness: 0.32 });
const tin = (c) => mat(c, { roughness: 0.38, metalness: 0.25 });

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

/** 背中のゼンマイ（蝶の羽の形）。回すと key.rotation.z が回る */
export function windKey(parent, x, y, z, s = 1, color = '#e2b54a') {
  const g = group(parent, x, y, z);
  const m = tin(color);
  add(g, G.cyl(0.035 * s, 0.035 * s, 0.22 * s, 8), m, 0, 0, -0.11 * s, { rot: [Math.PI / 2, 0, 0] });
  const key = group(g, 0, 0, -0.24 * s);
  for (const k of [-1, 1]) add(key, G.sphere(0.13 * s, 12, 8), m, k * 0.13 * s, 0, 0, { scale: [1, 0.75, 0.25] });
  add(key, G.sphere(0.05 * s, 8, 6), m, 0, 0, 0);
  g.userData.key = key;
  return key;
}

/** ボタンの目（4つ穴） */
function buttonEye(parent, x, y, z, r = 0.06) {
  const g = group(parent, x, y, z);
  add(g, G.cyl(r, r, 0.03, 16), mat('#1a1a22', { roughness: 0.3 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, G.sphere(r * 0.16, 6, 4), mat('#6a6a7a'), a * r * 0.3, b * r * 0.3, 0.016, { cast: false });
  return g;
}

/** ゼンマイのおもちゃを、止めたり動かしたりする共通の仕組み */
function windable(c) {
  c.frozen = true;
  c.keys = [];
  c.spin = 0;
  const base = c.update.bind(c);
  c.update = (dt, t) => {
    for (const k of c.keys) k.rotation.z += dt * c.spin;
    if (c.frozen) return;
    base(dt, t);
  };
  c.setFrozen = (on) => {
    c.frozen = on;
    c.spin = on ? 0 : 1.2;
    if (on) { c.body.position.y = 0; c.body.scale.set(1, 1, 1); for (const e of c.eyes) e.scale.y = 1; }
  };
  return c;
}

// ---------------------------------------------------------------
// クマのぬいぐるみの町長（ゼンマイいらず。つぎはぎ・蝶ネクタイ・町長のたすき）
// ---------------------------------------------------------------
export function makeBear() {
  const c = new Creature('bear');
  const b = c.body;
  const fur = mat('#b07a4a', { roughness: 1 });
  const furL = mat('#e8c8a0', { roughness: 1 });
  for (const s of [-1, 1]) {
    add(b, G.sphere(0.24, 16, 12), fur, s * 0.26, 0.2, 0.1, { scale: [1, 0.8, 1.2] });
    add(b, G.sphere(0.13, 12, 8), furL, s * 0.26, 0.2, 0.36, { scale: [1, 1, 0.3] });
  }
  add(b, G.sphere(0.55, 22, 16), fur, 0, 0.75, 0, { scale: [1, 1.05, 0.9] });
  add(b, G.sphere(0.36, 18, 12), furL, 0, 0.7, 0.28, { scale: [1, 1.1, 0.5] });
  // つぎはぎ（青い布と、ぬい目）
  add(b, G.box(0.24, 0.22, 0.04), mat('#5a8ad8', { roughness: 1 }), -0.32, 0.95, 0.36, { rot: [0, -0.5, 0.2], cast: false });
  for (let i = 0; i < 4; i++) add(b, G.box(0.02, 0.07, 0.02), mat('#2a2a3a'), -0.43 + i * 0.07, 1.08 - i * 0.015, 0.39, { rot: [0, -0.5, 0.2], cast: false });
  // 町長のたすき
  add(b, G.box(0.14, 1.05, 0.06), mat('#d8402e', { roughness: 0.7 }), 0.05, 0.85, 0.42, { rot: [0.25, 0, -0.65] });
  // 腕
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.5, 1.0, 0.05);
    arm.rotation.z = s * 0.55;
    add(arm, G.capsule(0.13, 0.3), fur, 0, -0.22, 0);
    add(arm, G.sphere(0.1, 10, 8), furL, 0, -0.44, 0.06, { scale: [1, 1, 0.5] });
    if (s > 0) c.armR = arm;
  }
  // 頭
  const head = (c.head = group(b, 0, 1.55, 0.02));
  add(head, G.sphere(0.48, 22, 16), fur, 0, 0, 0, { scale: [1.05, 0.95, 0.95] });
  add(head, G.sphere(0.2, 16, 12), furL, 0, -0.1, 0.38, { scale: [1.2, 0.85, 0.8] });
  add(head, G.sphere(0.07, 10, 8), mat('#2a1a14', { roughness: 0.4 }), 0, -0.02, 0.53, { scale: [1.2, 0.8, 0.8] });
  add(head, G.torus(0.07, 0.012, 6, 14, Math.PI), mat('#2a1a14'), 0, -0.16, 0.5, { rot: [0.2, 0, Math.PI], cast: false });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.16, 14, 10), fur, s * 0.36, 0.36, -0.02, { scale: [1, 1, 0.55] });
    add(head, G.sphere(0.09, 10, 8), furL, s * 0.36, 0.36, 0.05, { scale: [1, 1, 0.4] });
  }
  for (const s of [-1, 1]) c.eyes.push(buttonEye(head, s * 0.17, 0.1, 0.44, 0.07));
  cheeks(head, 0.3, -0.08, 0.36, 0.06);
  // 小さなシルクハット
  const hat = group(head, 0.12, 0.42, -0.02);
  hat.rotation.z = -0.2;
  add(hat, G.cyl(0.24, 0.24, 0.03, 18), mat('#2a2a3a'), 0, 0, 0);
  add(hat, G.cyl(0.16, 0.17, 0.3, 18), mat('#2a2a3a'), 0, 0.16, 0);
  add(hat, G.cyl(0.17, 0.17, 0.06, 18), mat('#d8402e'), 0, 0.06, 0);
  // 蝶ネクタイ
  for (const s of [-1, 1]) add(b, G.cone(0.1, 0.18, 8), mat('#e8c25a'), s * 0.09, 1.25, 0.42, { rot: [0, 0, s * Math.PI / 2] });
  return c;
}

// ---------------------------------------------------------------
// ブリキのロボット犬
// ---------------------------------------------------------------
export function makeRobotDog() {
  const c = windable(new Creature('robodog'));
  const b = c.body;
  const body = tin('#9ab0c8');
  const dark = tin('#4a5a70');
  add(b, G.box(0.5, 0.38, 0.8), body, 0, 0.48, 0);
  for (const [x, z] of [[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]]) {
    add(b, G.cyl(0.07, 0.07, 0.3, 10), dark, x, 0.2, z);
    add(b, G.cyl(0.09, 0.09, 0.06, 12), dark, x, 0.04, z + 0.03, { rot: [0, 0, 0] });
  }
  // リベット
  for (const x of [-0.26, 0.26]) for (const z of [-0.3, 0, 0.3]) add(b, G.sphere(0.025, 6, 4), dark, x, 0.6, z, { cast: false });
  // しっぽ（バネ）
  c.tail = group(b, 0, 0.6, -0.42);
  add(c.tail, G.torus(0.05, 0.015, 6, 12), dark, 0, 0.08, -0.04, { rot: [0.4, 0, 0] });
  add(c.tail, G.torus(0.05, 0.015, 6, 12), dark, 0, 0.16, -0.06, { rot: [0.4, 0, 0] });
  add(c.tail, G.sphere(0.05, 8, 6), mat('#e84a3a'), 0, 0.25, -0.08);
  c.keys.push(windKey(b, 0, 0.6, -0.42, 1.1));
  c.keys[0].parent.position.set(0, 0.48, -0.42);
  // 頭
  const head = (c.head = group(b, 0, 0.82, 0.38));
  add(head, G.box(0.46, 0.38, 0.42), body, 0, 0, 0);
  add(head, G.box(0.26, 0.18, 0.24), body, 0, -0.08, 0.28);
  add(head, G.sphere(0.06, 10, 8), mat('#1a1a22'), 0, -0.02, 0.41);
  for (const s of [-1, 1]) {
    add(head, G.cyl(0.08, 0.08, 0.04, 16), mat('#fffaf0'), s * 0.12, 0.06, 0.21, { rot: [Math.PI / 2, 0, 0], cast: false });
    c.eyes.push(beadEye(head, s * 0.12, 0.06, 0.24, 0.045));
    // たれ耳（ブリキの板）
    add(head, G.box(0.06, 0.3, 0.18), dark, s * 0.26, -0.02, -0.02, { rot: [0, 0, s * 0.25] });
  }
  // アンテナ
  add(head, G.cyl(0.015, 0.015, 0.25, 5), dark, 0, 0.3, -0.05, { cast: false });
  c.bulb = add(head, G.sphere(0.05, 8, 6), glow('#ff6a4a', 0.4), 0, 0.44, -0.05, { cast: false });
  c.bulb.userData.keep = true;
  c.extra = (dt, t) => { c.tail.rotation.x = Math.sin(t * 9) * 0.3; c.bulb.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.5; };
  return c;
}

// ---------------------------------------------------------------
// ゼンマイネズミの郵便屋（足は車輪、背中にゼンマイ）
// ---------------------------------------------------------------
export function makeWindMouse() {
  const c = windable(new Creature('mouse'));
  const b = c.body;
  const grey = tin('#b8b8c4');
  const pink = mat('#f4a0b0', { roughness: 0.5 });
  add(b, G.sphere(0.32, 18, 12), grey, 0, 0.36, 0, { scale: [0.85, 0.75, 1.25] });
  for (const s of [-1, 1]) for (const z of [-0.2, 0.2]) add(b, G.cyl(0.07, 0.07, 0.04, 12), tin('#3a3a48'), s * 0.22, 0.08, z, { rot: [0, 0, Math.PI / 2] });
  // 郵便かばん
  add(b, G.box(0.08, 0.2, 0.26), mat('#3a6ab0'), 0.28, 0.38, 0.0);
  add(b, G.box(0.09, 0.05, 0.27), mat('#e8c25a'), 0.29, 0.47, 0.0);
  // しっぽ（はり金）
  add(b, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, -0.36), new THREE.Vector3(0, 0.35, -0.6), new THREE.Vector3(0.1, 0.55, -0.7), new THREE.Vector3(0.05, 0.7, -0.6)]), 10, 0.015, 5), pink, 0, 0, 0, { cast: false });
  c.keys.push(windKey(b, 0, 0.55, -0.18, 0.9));
  c.keys[0].parent.rotation.x = Math.PI / 2;
  c.keys[0].parent.position.set(0, 0.6, -0.12);
  const head = (c.head = group(b, 0, 0.42, 0.36));
  add(head, G.sphere(0.2, 16, 12), grey, 0, 0, 0, { scale: [1, 0.95, 1.1] });
  add(head, G.cone(0.13, 0.26, 12), grey, 0, -0.02, 0.2, { rot: [Math.PI / 2, 0, 0] });
  add(head, G.sphere(0.04, 8, 6), pink, 0, -0.02, 0.34);
  for (const s of [-1, 1]) {
    add(head, G.cyl(0.14, 0.14, 0.03, 18), grey, s * 0.16, 0.2, -0.04, { rot: [Math.PI / 2, 0, s * 0.3] });
    add(head, G.cyl(0.1, 0.1, 0.032, 18), pink, s * 0.16, 0.2, -0.03, { rot: [Math.PI / 2, 0, s * 0.3], cast: false });
    c.eyes.push(beadEye(head, s * 0.08, 0.06, 0.16, 0.035));
  }
  cheeks(head, 0.12, -0.04, 0.12, 0.03);
  // 郵便帽
  add(head, G.cyl(0.09, 0.1, 0.08, 14), mat('#3a6ab0'), 0, 0.2, 0.02, { rot: [-0.2, 0, 0] });
  return c;
}

// ---------------------------------------------------------------
// 積み木の恐竜（大きくてやさしい。ブロックでできている）
// ---------------------------------------------------------------
const letterTex = (ch, bg) => canvasTex(128, 128, (ctx, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = '#fffaf0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 80px ${FONT}`; ctx.fillText(ch, w / 2, h / 2 + 4);
});
export const blockMat = (ch, bg) => new THREE.MeshStandardMaterial({ map: letterTex(ch, bg), roughness: 0.55 });

export function makeBlockDino() {
  const c = windable(new Creature('dino'));
  const b = c.body;
  const green = mat('#5ab84a', { roughness: 0.55 });
  const yellow = mat('#f0c040', { roughness: 0.55 });
  // 足（四角い柱）
  c.legs = [];
  for (const [x, z] of [[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.6], [0.55, -0.6]]) {
    const lg = group(b, x, 0.7, z);
    add(lg, G.box(0.5, 0.75, 0.55), green, 0, -0.35, 0);
    add(lg, G.box(0.56, 0.18, 0.62), yellow, 0, -0.66, 0.04);
    c.legs.push(lg);
  }
  // 胴（文字の積み木）
  add(b, G.box(1.6, 1.0, 1.9), blockMat('き', '#5ab84a'), 0, 1.25, -0.05);
  add(b, G.box(1.3, 0.12, 1.6), yellow, 0, 1.8, -0.05);
  // 背中のとげ（三角の積み木）
  for (let i = 0; i < 4; i++) add(b, G.cone(0.3, 0.45, 4), mat(['#e8503a', '#f0c040', '#3a8ae8', '#e8503a'][i]), 0, 2.05, 0.6 - i * 0.45, { rot: [0, Math.PI / 4, 0] });
  // しっぽ
  c.tail = group(b, 0, 1.1, -1.0);
  add(c.tail, G.box(0.7, 0.6, 0.8), green, 0, 0, -0.35);
  add(c.tail, G.box(0.5, 0.42, 0.7), yellow, 0, -0.1, -0.95);
  add(c.tail, G.box(0.3, 0.26, 0.55), green, 0, -0.2, -1.45);
  // 首と頭
  add(b, G.box(0.7, 0.9, 0.7), green, 0, 2.05, 0.75);
  const head = (c.head = group(b, 0, 2.7, 1.0));
  add(head, G.box(1.0, 0.75, 1.15), blockMat('う', '#5ab84a'), 0, 0, 0.1);
  add(head, G.box(0.9, 0.25, 0.6), yellow, 0, -0.3, 0.45);
  for (const s of [-1, 1]) {
    add(head, G.box(0.22, 0.22, 0.04), mat('#fffaf0'), s * 0.25, 0.14, 0.68, { cast: false });
    c.eyes.push(beadEye(head, s * 0.25, 0.14, 0.7, 0.07));
    add(head, G.sphere(0.04, 6, 4), mat('#2a4a20'), s * 0.15, -0.05, 0.69, { cast: false });
  }
  cheeks(head, 0.38, -0.1, 0.66, 0.07);
  c.keys.push(windKey(b, 0.8, 1.3, -0.4, 2.2));
  c.keys[0].parent.rotation.y = -Math.PI / 2;
  c.extra = (dt, t) => { c.tail.rotation.y = Math.sin(t * 1.4) * 0.15; };
  return c;
}

// ---------------------------------------------------------------
// オルゴールのウサギ（くるくる回る台の上で、両手を上げている）
// ---------------------------------------------------------------
export function makeMusicRabbit() {
  const c = windable(new Creature('rabbit'));
  const b = c.body;
  const white = mat('#fbf6f0', { roughness: 0.3 });
  const pink = mat('#f4a8c0', { roughness: 0.4 });
  add(b, G.sphere(0.22, 16, 12), white, 0, 0.42, 0, { scale: [0.85, 1.15, 0.85] });
  // スカート（花びらのチュチュ）
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; add(b, G.sphere(0.12, 10, 6), pink, Math.cos(a) * 0.2, 0.32, Math.sin(a) * 0.2, { scale: [1, 0.3, 0.6], rot: [0, -a, 0.3] }); }
  add(b, G.cyl(0.04, 0.05, 0.3, 8), white, -0.05, 0.12, 0);
  add(b, G.cyl(0.04, 0.05, 0.3, 8), white, 0.06, 0.15, 0.05, { rot: [0.5, 0, 0.3] });
  for (const s of [-1, 1]) add(b, G.capsule(0.04, 0.24), white, s * 0.14, 0.72, 0.0, { rot: [0, 0, s * 0.35] });
  const head = (c.head = group(b, 0, 0.8, 0.02));
  add(head, G.sphere(0.18, 16, 12), white, 0, 0, 0);
  for (const s of [-1, 1]) {
    add(head, G.capsule(0.05, 0.3), white, s * 0.07, 0.3, -0.02, { rot: [0, 0, -s * 0.15] });
    add(head, G.capsule(0.025, 0.22), pink, s * 0.07, 0.3, 0.02, { rot: [0, 0, -s * 0.15], cast: false });
    c.eyes.push(beadEye(head, s * 0.07, 0.03, 0.15, 0.03));
  }
  cheeks(head, 0.1, -0.04, 0.13, 0.03);
  add(head, G.sphere(0.025, 6, 4), pink, 0, -0.02, 0.18, { cast: false });
  add(head, G.torus(0.06, 0.02, 6, 14), mat('#f0c040', { metalness: 0.3, roughness: 0.3 }), 0, 0.14, 0, { rot: [Math.PI / 2, 0, 0] });
  return c;
}

// ---------------------------------------------------------------
// 小さなブリキの機関車（顔つき。うしろに積み木の貨車）
// ---------------------------------------------------------------
export function makeTinLoco() {
  const c = windable(new Creature('tinloco'));
  const b = c.body;
  const red = tin('#d8402e');
  const blue = tin('#2a5ac8');
  const gold = tin('#e8c25a');
  // 車体（+Z が前）
  add(b, G.box(0.8, 0.22, 1.6), blue, 0, 0.3, 0);
  add(b, G.cyl(0.32, 0.32, 1.0, 18), red, 0, 0.66, 0.25, { rot: [Math.PI / 2, 0, 0] });
  add(b, G.box(0.76, 0.75, 0.6), red, 0, 0.78, -0.45);
  add(b, G.box(0.86, 0.1, 0.7), blue, 0, 1.2, -0.45);
  add(b, G.cyl(0.1, 0.14, 0.36, 12), gold, 0, 1.08, 0.5);
  for (const s of [-1, 1]) for (const z of [-0.5, 0, 0.5]) add(b, G.cyl(0.17, 0.17, 0.08, 16), tin('#2a2a34'), s * 0.42, 0.2, z, { rot: [0, 0, Math.PI / 2] });
  // 顔（前の丸いところ）
  const head = (c.head = group(b, 0, 0.66, 0.76));
  add(head, G.cyl(0.3, 0.3, 0.04, 20), mat('#f4ead8', { roughness: 0.4 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.1, 0.06, 0.03, 0.045));
  cheeks(head, 0.17, -0.05, 0.02, 0.04);
  add(head, G.torus(0.06, 0.012, 6, 12, Math.PI), mat('#2a1a14'), 0, -0.08, 0.03, { rot: [0, 0, Math.PI], cast: false });
  c.keys.push(windKey(b, 0.42, 0.78, -0.45, 1.1));
  c.keys[0].parent.rotation.y = -Math.PI / 2;
  // 貨車（あとで楽譜の積み木をのせる）
  const wag = (c.wagon = group(b, 0, 0, -1.55));
  add(wag, G.box(0.8, 0.3, 1.1), tin('#f0c040'), 0, 0.35, 0);
  for (const s of [-1, 1]) for (const z of [-0.35, 0.35]) add(wag, G.cyl(0.15, 0.15, 0.08, 14), tin('#2a2a34'), s * 0.42, 0.18, z, { rot: [0, 0, Math.PI / 2] });
  add(b, G.box(0.08, 0.06, 0.3), tin('#2a2a34'), 0, 0.26, -0.95);
  return c;
}

// ---------------------------------------------------------------
// ゴムのアヒル
// ---------------------------------------------------------------
export function makeDuck(s = 1) {
  const c = new Creature('duck');
  const b = c.body;
  const y = mat('#f8d040', { roughness: 0.3 });
  add(b, G.sphere(0.3, 16, 12), y, 0, 0.22, 0, { scale: [0.9, 0.75, 1.15] });
  add(b, G.sphere(0.12, 10, 8), y, 0, 0.3, -0.33, { scale: [1, 1.4, 0.8], rot: [-0.6, 0, 0] });
  const head = (c.head = group(b, 0, 0.5, 0.18));
  add(head, G.sphere(0.18, 14, 10), y, 0, 0, 0);
  add(head, G.sphere(0.09, 10, 8), mat('#f08030', { roughness: 0.3 }), 0, -0.04, 0.17, { scale: [1.3, 0.5, 1.2] });
  for (const k of [-1, 1]) c.eyes.push(beadEye(head, k * 0.08, 0.05, 0.14, 0.03));
  c.root.scale.setScalar(s);
  c.noIdleHop = true;
  return c;
}
