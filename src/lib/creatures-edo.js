import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// 江戸の宿場町の住人たち
// ---------------------------------------------------------------

/** 上半分だけの球（ほおかむり・三角巾） */
const _hemi = new Map();
function hemi(r) {
  if (!_hemi.has(r)) _hemi.set(r, new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  return _hemi.get(r);
}

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

// ---------------------------------------------------------------
// 狛犬（浅草寺の門番）— 石の体、くるくるのたてがみ。二百年先にもいる。
// ---------------------------------------------------------------
export function makeKomainu({ open = true } = {}) {
  const c = new Creature('komainu');
  c.noIdleHop = !open; // 「うん」のほうはじっとしている
  const stone = mat('#b8b0a0', { flatShading: true, roughness: 0.95 });
  const mane = mat('#8a8274', { flatShading: true, roughness: 1 });
  // 台座（体は台座の上に）
  add(c.root, G.box(0.9, 0.4, 0.8), mat('#8a8478', { roughness: 1 }), 0, 0.2, 0);
  const b = group(c.body, 0, 0.4, 0);
  // おすわりした体
  add(b, G.sphere(0.32, 14, 10), stone, 0, 0.35, -0.05, { scale: [1, 1.1, 1.1] });
  for (const s of [-1, 1]) {
    add(b, G.cyl(0.07, 0.09, 0.35, 8), stone, s * 0.14, 0.18, 0.18);
    add(b, G.sphere(0.09, 10, 8), stone, s * 0.14, 0.02, 0.22, { scale: [1, 0.6, 1.3] });
  }
  // くるくるの尾
  for (let i = 0; i < 3; i++) add(b, G.sphere(0.1 - i * 0.015, 10, 8), mane, (i - 1) * 0.07, 0.5 + i * 0.08, -0.35 - i * 0.05);
  // 赤い前かけ
  add(b, G.cyl(0.24, 0.3, 0.2, 14, true), mat('#c8382e', { side: THREE.DoubleSide }), 0, 0.5, 0.05);
  const head = (c.head = group(b, 0, 0.82, 0.08));
  add(head, G.sphere(0.27, 16, 12), stone, 0, 0, 0, { scale: [1.1, 1, 1] });
  // たてがみ（巻き毛）
  for (let i = 0; i < 9; i++) {
    const a = -1.3 + (i / 8) * 2.6;
    add(head, G.sphere(0.09, 8, 6), mane, Math.sin(a) * 0.3, Math.cos(a) * 0.22 + 0.02, -0.1, { scale: [1, 1, 0.8] });
  }
  add(head, G.sphere(0.14, 12, 10), stone, 0, -0.06, 0.2, { scale: [1.3, 0.9, 1] });
  add(head, G.sphere(0.04, 8, 6), mat('#3a3430'), 0, -0.01, 0.33);
  // 口（「あ」はあいている、「うん」はとじている）
  if (open) add(head, G.box(0.16, 0.05, 0.04), mat('#8a3a3a'), 0, -0.13, 0.3, { cast: false });
  else add(head, G.box(0.16, 0.015, 0.02), mat('#3a3430'), 0, -0.12, 0.31, { cast: false });
  for (const s of [-1, 1]) {
    // 太いまゆ
    add(head, G.box(0.12, 0.035, 0.03), mane, s * 0.1, 0.11, 0.24, { rot: [0, 0, s * 0.2], cast: false });
    c.eyes.push(beadEye(head, s * 0.1, 0.05, 0.25, 0.04));
    add(head, G.sphere(0.07, 8, 6), mane, s * 0.26, 0.08, 0.02, { scale: [0.7, 1.2, 0.6] });
  }
  return c;
}

// ---------------------------------------------------------------
// ツルの鐘つき番 — ほっそり、赤い頭、紺の作務衣
// ---------------------------------------------------------------
export function makeCrane() {
  const c = new Creature('crane');
  c.noIdleHop = true;
  const b = c.body;
  const white = mat('#f8f6f0');
  const black = mat('#2a2a30');
  const samue = mat('#2b3a6a');
  for (const s of [-1, 1]) add(b, G.cyl(0.025, 0.025, 0.55, 6), mat('#4a4a50'), s * 0.08, 0.27, 0);
  add(b, G.sphere(0.28, 16, 12), samue, 0, 0.72, 0, { scale: [0.9, 1.15, 1] });
  // 黒い尾羽
  add(b, G.cone(0.16, 0.32, 8), black, 0, 0.62, -0.28, { rot: [-1.9, 0, 0] });
  for (const s of [-1, 1]) {
    const w = group(b, s * 0.25, 0.8, -0.02);
    w.rotation.z = s * 0.15;
    add(w, G.sphere(0.13, 10, 8), white, 0, -0.08, 0, { scale: [0.45, 1.3, 1] });
  }
  // 長い首
  add(b, G.cyl(0.06, 0.09, 0.45, 10), white, 0, 1.12, 0.04, { rot: [0.15, 0, 0] });
  add(b, G.cyl(0.065, 0.075, 0.18, 10), black, 0, 1.25, 0.06, { rot: [0.15, 0, 0] });
  const head = (c.head = group(b, 0, 1.42, 0.08));
  add(head, G.sphere(0.14, 14, 10), white, 0, 0, 0);
  add(head, G.sphere(0.07, 10, 8), mat('#d83a3a'), 0, 0.1, 0.0, { scale: [1, 0.5, 1] });
  add(head, G.cone(0.035, 0.32, 8), mat('#a8a070'), 0, -0.02, 0.25, { rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.08, 0.03, 0.1, 0.025));
  cheeks(head, 0.09, -0.03, 0.08, 0.025);
  return c;
}

// ---------------------------------------------------------------
// ネコの瓦版売り — 縞ネコ、ほおかむり、たすき
// ---------------------------------------------------------------
export function makeKawarabanCat() {
  const c = new Creature('cat');
  const b = c.body;
  const fur = mat('#d8a060');
  const stripe = mat('#a8703a');
  const white = mat('#fbf4ea');
  const kimono = mat('#5a7a4a');
  for (const s of [-1, 1]) add(b, G.sphere(0.11), white, s * 0.13, 0.07, 0.08, { scale: [1, 0.6, 1.3] });
  add(b, G.cyl(0.22, 0.3, 0.58, 16), kimono, 0, 0.42, 0);
  add(b, G.cyl(0.31, 0.31, 0.07, 16), mat('#e8c25a'), 0, 0.42, 0);
  // たすき（赤）
  add(b, G.box(0.05, 0.65, 0.04), mat('#c8382e'), 0, 0.55, 0.24, { rot: [0, 0, 0.6], cast: false });
  add(b, G.box(0.05, 0.65, 0.04), mat('#c8382e'), 0, 0.55, 0.24, { rot: [0, 0, -0.6], cast: false });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.27, 0.62, 0.04);
    arm.rotation.z = s * 0.35;
    add(arm, G.capsule(0.065, 0.18), kimono, 0, -0.13, 0);
    add(arm, G.sphere(0.06), white, 0, -0.28, 0);
    if (s > 0) c.armR = arm;
  }
  // 手に瓦版
  add(c.armR, G.box(0.22, 0.3, 0.01), mat('#f4ead2'), -0.05, -0.36, 0.08, { rot: [0.3, 0, 0.3], cast: false });
  const tail = (c.tail = group(b, 0, 0.25, -0.25));
  for (let i = 0; i < 5; i++) add(tail, G.sphere(0.055, 8, 6), i % 2 ? stripe : fur, 0, i * 0.08, -i * 0.04);
  const head = (c.head = group(b, 0, 0.92, 0.02));
  add(head, G.sphere(0.25, 18, 14), fur, 0, 0, 0, { scale: [1.1, 0.95, 1] });
  for (let i = 0; i < 3; i++) add(head, G.box(0.04, 0.12, 0.02), stripe, (i - 1) * 0.07, 0.17, 0.17, { rot: [-0.6, 0, 0], cast: false });
  add(head, G.sphere(0.11, 12, 10), white, 0, -0.08, 0.17, { scale: [1.3, 0.75, 0.9] });
  add(head, G.sphere(0.025, 8, 6), mat('#e87a8a'), 0, -0.03, 0.27);
  for (const s of [-1, 1]) {
    add(head, G.cone(0.08, 0.17, 4), fur, s * 0.15, 0.22, -0.02, { rot: [0, Math.PI / 4, -s * 0.25] });
    c.eyes.push(beadEye(head, s * 0.09, 0.03, 0.21, 0.035));
    for (const k of [-1, 1]) add(head, G.box(0.14, 0.008, 0.008), mat('#5a4a3a'), s * 0.17, -0.06 + k * 0.025, 0.2, { rot: [0, 0, s * k * 0.15], cast: false });
  }
  // ほおかむり（豆しぼりの手ぬぐい）
  add(head, hemi(0.27), mat('#f4f0e6'), 0, 0.02, -0.03, { rot: [-0.35, 0, 0], scale: [1.08, 1, 1.05] });
  add(head, G.box(0.1, 0.07, 0.04), mat('#f4f0e6'), 0, -0.2, 0.12, { cast: false });
  cheeks(head, 0.16, -0.06, 0.17, 0.035);
  c.extra = (dt, t) => { c.tail.rotation.x = Math.sin(t * 1.5 + c.phase) * 0.3; };
  return c;
}

// ---------------------------------------------------------------
// イヌの岡っ引き — 柴犬、羽織、十手（持っているときだけ見える）
// ---------------------------------------------------------------
export function makeShiba() {
  const c = new Creature('dog');
  const b = c.body;
  const fur = mat('#d88a3a');
  const white = mat('#fbf0e0');
  const haori = mat('#3a3a4a');
  for (const s of [-1, 1]) add(b, G.cyl(0.07, 0.08, 0.28, 10), mat('#2a2a30'), s * 0.13, 0.14, 0.03);
  add(b, G.cyl(0.24, 0.32, 0.6, 18), haori, 0, 0.55, 0);
  add(b, G.box(0.18, 0.5, 0.04), mat('#c8b890'), 0, 0.58, 0.26, { cast: false });
  add(b, G.cyl(0.33, 0.33, 0.06, 18), mat('#8a2a2a'), 0, 0.42, 0);
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.3, 0.75, 0.04);
    arm.rotation.z = s * 0.3;
    add(arm, G.capsule(0.075, 0.2), haori, 0, -0.15, 0);
    add(arm, G.sphere(0.065), white, 0, -0.3, 0);
    if (s > 0) c.armR = arm;
  }
  // 十手（あとで見つかる）
  const jitte = (c.jitte = group(c.armR, 0, -0.32, 0.06));
  add(jitte, G.cyl(0.018, 0.018, 0.42, 6), mat('#9aa4b0', { metalness: 0.7, roughness: 0.3 }), 0, 0.12, 0.05, { rot: [0.5, 0, 0] });
  add(jitte, G.box(0.02, 0.1, 0.02), mat('#9aa4b0', { metalness: 0.7 }), 0.04, 0.18, 0.09, { rot: [0.5, 0, 0], cast: false });
  add(jitte, G.sphere(0.03, 6, 4), mat('#c8382e'), 0, -0.08, -0.06);
  jitte.visible = false;
  // くるんと巻いたしっぽ
  const tail = (c.tail = group(b, 0, 0.55, -0.3));
  add(tail, G.torus(0.09, 0.05, 8, 14), fur, 0, 0.05, 0, { rot: [0, Math.PI / 2, 0] });
  const head = (c.head = group(b, 0, 1.08, 0.04));
  add(head, G.sphere(0.26, 18, 14), fur, 0, 0, 0, { scale: [1.1, 0.95, 1] });
  add(head, G.sphere(0.13, 12, 10), white, 0, -0.08, 0.2, { scale: [1.2, 0.8, 1.1] });
  add(head, G.sphere(0.04, 8, 6), mat('#2a1a18'), 0, -0.04, 0.34);
  for (const s of [-1, 1]) {
    add(head, G.cone(0.08, 0.18, 4), fur, s * 0.15, 0.22, -0.02, { rot: [0, Math.PI / 4, -s * 0.2] });
    add(head, G.sphere(0.06, 8, 6), white, s * 0.1, 0.08, 0.2, { scale: [1, 0.5, 0.5], cast: false });
    c.eyes.push(beadEye(head, s * 0.1, 0.04, 0.22, 0.035));
  }
  cheeks(head, 0.17, -0.06, 0.17, 0.035);
  c.sad = true;
  c.extra = (dt, t) => {
    c.tail.rotation.z = c.sad ? 0 : Math.sin(t * 9) * 0.4;
    if (c.sad && c.talkT <= 0) c.head.rotation.x = 0.2;
  };
  return c;
}

// ---------------------------------------------------------------
// カッパの渡し守 — 頭にお皿、背中に甲羅
// ---------------------------------------------------------------
export function makeKappa() {
  const c = new Creature('kappa');
  const b = c.body;
  const skin = mat('#6aaa5a');
  const skinD = mat('#4a8a3a');
  const shell = mat('#7a6a3a', { flatShading: true });
  for (const s of [-1, 1]) add(b, G.sphere(0.1), skinD, s * 0.14, 0.06, 0.08, { scale: [1.2, 0.5, 1.4] });
  add(b, G.sphere(0.3, 16, 12), skin, 0, 0.38, 0, { scale: [1, 1.1, 0.9] });
  add(b, G.sphere(0.22, 14, 10), mat('#d8d890'), 0, 0.36, 0.14, { scale: [1, 1.1, 0.6] });
  add(b, G.sphere(0.3, 10, 8), shell, 0, 0.42, -0.14, { scale: [1, 1.1, 0.55] });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.28, 0.48, 0.04);
    arm.rotation.z = s * 0.4;
    add(arm, G.capsule(0.06, 0.18), skin, 0, -0.13, 0);
    add(arm, G.sphere(0.065, 8, 6), skinD, 0, -0.27, 0);
    if (s > 0) c.armR = arm;
  }
  const head = (c.head = group(b, 0, 0.85, 0.02));
  add(head, G.sphere(0.25, 18, 14), skin, 0, 0, 0);
  // くちばし
  add(head, G.sphere(0.1, 12, 8), mat('#e8c84a'), 0, -0.07, 0.22, { scale: [1.3, 0.5, 1] });
  // ざんばら髪とお皿
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(head, G.cone(0.05, 0.14, 5), mat('#2a4a3a'), Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2, { rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9] });
  }
  add(head, G.cyl(0.13, 0.13, 0.04, 16), mat('#e8f0f4', { roughness: 0.3 }), 0, 0.22, 0);
  add(head, G.cyl(0.1, 0.1, 0.045, 16), mat('#9ad0e0', { roughness: 0.1 }), 0, 0.225, 0, { cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.1, 0.04, 0.21, 0.04));
  cheeks(head, 0.17, -0.05, 0.17, 0.035);
  return c;
}

// ---------------------------------------------------------------
// リスの団子屋 — 大きなしっぽ、白い前かけ
// ---------------------------------------------------------------
export function makeSquirrel() {
  const c = new Creature('squirrel');
  const b = c.body;
  const fur = mat('#c8783a');
  const cream = mat('#f4e0c0');
  for (const s of [-1, 1]) add(b, G.sphere(0.09), fur, s * 0.12, 0.06, 0.08, { scale: [1, 0.6, 1.3] });
  add(b, G.sphere(0.27, 16, 12), fur, 0, 0.34, 0, { scale: [1, 1.15, 0.9] });
  add(b, G.box(0.34, 0.34, 0.03), mat('#fbfbf6'), 0, 0.32, 0.23, { rot: [-0.1, 0, 0] });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.24, 0.48, 0.06);
    arm.rotation.z = s * 0.45;
    add(arm, G.capsule(0.05, 0.14), fur, 0, -0.1, 0);
    if (s > 0) c.armR = arm;
  }
  // ふさふさのしっぽ
  const tail = (c.tail = group(b, 0, 0.25, -0.22));
  add(tail, G.sphere(0.2, 12, 10), fur, 0, 0.2, -0.12, { scale: [0.8, 1.3, 0.7] });
  add(tail, G.sphere(0.17, 12, 10), fur, 0, 0.52, -0.05, { scale: [0.9, 1, 0.8] });
  add(tail, G.sphere(0.1, 10, 8), cream, 0, 0.6, 0.05, { scale: [0.9, 0.8, 0.6] });
  const head = (c.head = group(b, 0, 0.78, 0.03));
  add(head, G.sphere(0.21, 16, 12), fur, 0, 0, 0);
  add(head, G.sphere(0.12, 12, 10), cream, 0, -0.07, 0.13, { scale: [1.2, 0.8, 0.9] });
  add(head, G.sphere(0.025, 6, 4), mat('#3a2418'), 0, -0.03, 0.24);
  for (const s of [-1, 1]) {
    add(head, G.cone(0.06, 0.14, 6), fur, s * 0.12, 0.2, -0.02, { rot: [0, 0, -s * 0.2] });
    c.eyes.push(beadEye(head, s * 0.08, 0.03, 0.18, 0.035));
  }
  // 三角巾
  add(head, hemi(0.22), mat('#e8a0b0'), 0, 0.03, -0.02, { rot: [-0.3, 0, 0], scale: [1.02, 0.85, 1.02] });
  cheeks(head, 0.14, -0.05, 0.15, 0.03);
  c.extra = (dt, t) => { c.tail.rotation.x = Math.sin(t * 2 + c.phase) * 0.12; };
  return c;
}

// ---------------------------------------------------------------
// スズメ（朝の町のにぎわい）
// ---------------------------------------------------------------
export function makeSparrow() {
  const c = new Creature('sparrow');
  const b = c.body;
  const brown = mat('#9a6a3a');
  add(b, G.sphere(0.13, 12, 10), brown, 0, 0.14, 0, { scale: [1, 0.95, 1.1] });
  add(b, G.sphere(0.09, 10, 8), mat('#f4ead2'), 0, 0.12, 0.06, { scale: [1, 1, 0.7] });
  add(b, G.cone(0.05, 0.14, 6), brown, 0, 0.17, -0.15, { rot: [-1.9, 0, 0] });
  const head = (c.head = group(b, 0, 0.27, 0.04));
  add(head, G.sphere(0.09, 12, 10), mat('#7a4a2a'), 0, 0, 0);
  add(head, G.sphere(0.04, 8, 6), mat('#2a2a30'), 0, -0.04, 0.05, { scale: [1.4, 0.8, 1] });
  add(head, G.cone(0.025, 0.06, 6), mat('#3a3430'), 0, -0.01, 0.1, { rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.05, 0.02, 0.06, 0.018));
  c.root.scale.setScalar(1.2);
  // ちょんちょん跳ねる
  c.extra = (dt, t) => {
    const k = (t * 1.3 + c.phase) % 4;
    c.body.position.y = k < 0.3 ? Math.sin((k / 0.3) * Math.PI) * 0.08 : 0;
  };
  return c;
}
