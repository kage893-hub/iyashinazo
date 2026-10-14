import * as THREE from 'three';
import { add, mat, G, group, canvasTex } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// 潮の港町の住人たち
// ---------------------------------------------------------------

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

const stripeTex = (a, b, n = 8) => canvasTex(128, 32, (ctx, w, h) => {
  for (let i = 0; i < n * 2; i++) { ctx.fillStyle = i % 2 ? a : b; ctx.fillRect((i * w) / (n * 2), 0, w / (n * 2) + 1, h); }
});

// ---------------------------------------------------------------
// アザラシの灯台守 — まるい体、紺の帽子、青白しまのマフラー
// ---------------------------------------------------------------
export function makeSeal() {
  const c = new Creature('seal');
  c.noIdleHop = true;
  const b = c.body;
  const fur = mat('#b8bec8');
  const spot = mat('#8a909c');
  const belly = mat('#e8ecf0');
  // 尾びれ
  for (const s of [-1, 1]) add(b, G.sphere(0.12, 10, 8), fur, s * 0.1, 0.05, -0.42, { scale: [1.1, 0.35, 1.4], rot: [0, s * 0.5, 0] });
  // 体（ずんぐり、少し前のめり）
  add(b, G.sphere(0.36, 20, 16), fur, 0, 0.36, -0.08, { scale: [1, 0.95, 1.25] });
  add(b, G.sphere(0.3, 18, 14), belly, 0, 0.36, 0.08, { scale: [0.95, 1, 0.9] });
  for (let i = 0; i < 5; i++) add(b, G.sphere(0.035, 6, 4), spot, Math.sin(i * 2.1) * 0.25, 0.42 + Math.cos(i * 1.7) * 0.12, -0.3 + i * 0.02, { cast: false });
  // 前ひれ
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.3, 0.32, 0.12);
    arm.rotation.z = s * 0.7;
    add(arm, G.sphere(0.11, 10, 8), fur, 0, -0.08, 0, { scale: [0.5, 1.3, 0.9] });
    if (s > 0) c.armR = arm;
  }
  // マフラー（青と白のしま）
  const scarf = new THREE.MeshStandardMaterial({ map: stripeTex('#f4f6fa', '#3a6ab0', 6), roughness: 0.9 });
  add(b, G.cyl(0.25, 0.3, 0.12, 20), scarf, 0, 0.66, 0.02);
  add(b, G.box(0.1, 0.28, 0.03), scarf, 0.12, 0.52, 0.27, { rot: [0.2, 0, 0.2], cast: false });
  const head = (c.head = group(b, 0, 0.88, 0.06));
  add(head, G.sphere(0.27, 20, 16), fur, 0, 0, 0, { scale: [1.05, 0.95, 1] });
  add(head, G.sphere(0.13, 14, 10), belly, 0, -0.07, 0.2, { scale: [1.3, 0.8, 0.9] });
  add(head, G.sphere(0.045, 8, 6), mat('#2a2a30'), 0, -0.02, 0.32, { scale: [1.3, 0.8, 1] });
  for (const s of [-1, 1]) {
    c.eyes.push(beadEye(head, s * 0.11, 0.06, 0.22, 0.05));
    for (const k of [-1, 0, 1]) add(head, G.box(0.16, 0.007, 0.007), mat('#f4f4f4'), s * 0.17, -0.07 + k * 0.025, 0.24, { rot: [0, s * -0.3, s * k * 0.15], cast: false });
  }
  cheeks(head, 0.17, -0.05, 0.17, 0.04);
  // 灯台守の帽子（紺、金のふち）
  const cap = group(head, 0, 0.2, -0.02);
  cap.rotation.x = -0.15;
  add(cap, G.cyl(0.2, 0.22, 0.14, 20), mat('#22305a'), 0, 0.05, 0);
  add(cap, G.cyl(0.24, 0.24, 0.05, 20), mat('#22305a'), 0, 0.13, 0.01, { scale: [1, 1, 1.05] });
  add(cap, G.cyl(0.205, 0.205, 0.03, 20), mat('#d8b04a', { metalness: 0.6, roughness: 0.4 }), 0, 0.0, 0, { cast: false });
  add(cap, new THREE.CylinderGeometry(0.21, 0.21, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), mat('#141a30'), 0, -0.02, 0.07, { scale: [1, 1, 1.2] });
  c.extra = (dt, t) => { if (c.armR) c.armR.rotation.x = c.talkT > 0 ? Math.sin(t * 8) * 0.3 : 0; };
  return c;
}

// ---------------------------------------------------------------
// タコの郵便屋 — 赤い頭、八本の足、郵便帽とかばん
// ---------------------------------------------------------------
export function makeOcto() {
  const c = new Creature('octo');
  const b = c.body;
  const skin = mat('#e86a5a');
  const skinL = mat('#f4a090');
  // 足（ゆらゆら）
  c.legs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const leg = group(b, Math.sin(a) * 0.16, 0.18, Math.cos(a) * 0.16);
    leg.rotation.y = a;
    for (let k = 0; k < 4; k++) add(leg, G.sphere(0.075 - k * 0.012, 8, 6), k % 2 ? skinL : skin, 0, 0.0 - k * 0.04, 0.06 + k * 0.08, { cast: k < 2 });
    c.legs.push(leg);
  }
  // 胴と頭（ひとつながり）
  add(b, G.sphere(0.22, 16, 12), skin, 0, 0.32, 0, { scale: [1, 0.9, 1] });
  const head = (c.head = group(b, 0, 0.62, -0.02));
  add(head, G.sphere(0.3, 20, 16), skin, 0, 0.06, -0.04, { scale: [1, 1.15, 1] });
  for (let i = 0; i < 4; i++) add(head, G.sphere(0.035, 6, 4), skinL, -0.12 + i * 0.08, 0.26 - (i % 2) * 0.06, 0.14, { cast: false });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.09, 12, 10), mat('#fffaf2'), s * 0.11, -0.04, 0.22, { scale: [1, 1, 0.6], cast: false });
    c.eyes.push(beadEye(head, s * 0.11, -0.04, 0.27, 0.045));
  }
  add(head, G.torus(0.04, 0.014, 6, 12), mat('#a83a2e'), 0, -0.14, 0.24, { cast: false });
  cheeks(head, 0.2, -0.12, 0.18, 0.04);
  // 郵便帽（青、白いふち）
  const cap = group(head, 0, 0.3, -0.02);
  cap.rotation.x = -0.2;
  add(cap, G.cyl(0.18, 0.2, 0.12, 20), mat('#2a5aa8'), 0, 0.04, 0);
  add(cap, G.cyl(0.21, 0.21, 0.025, 20), mat('#f4f6fa'), 0, 0.1, 0, { cast: false });
  add(cap, new THREE.CylinderGeometry(0.19, 0.19, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), mat('#1a3a7a'), 0, -0.02, 0.07, { scale: [1, 1, 1.25] });
  // かばん
  const bag = group(b, 0.22, 0.32, 0.12);
  add(bag, G.box(0.18, 0.2, 0.08), mat('#8a5a3a'), 0, 0, 0);
  add(bag, G.box(0.19, 0.08, 0.085), mat('#6a4028'), 0, 0.07, 0.003, { cast: false });
  add(bag, G.box(0.03, 0.5, 0.015), mat('#6a4028'), -0.15, 0.2, -0.04, { rot: [0, 0, 0.6], cast: false });
  add(bag, G.box(0.08, 0.1, 0.005), mat('#f4f0e6'), 0, 0.14, -0.01, { rot: [0, 0, 0.2], cast: false });
  c.extra = (dt, t) => {
    c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 2 + i * 0.8) * 0.15; });
  };
  return c;
}

// ---------------------------------------------------------------
// カニの漁師 — 赤い甲羅、大きなはさみ、ねじりはちまき
// ---------------------------------------------------------------
export function makeCrab() {
  const c = new Creature('crab');
  const b = c.body;
  const shell = mat('#d8482e');
  const shellD = mat('#a8321e');
  const belly = mat('#f4c8a0');
  // 足（左右3本ずつ）
  c.legs = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const leg = group(b, s * 0.26, 0.22, -0.12 + i * 0.12);
    leg.rotation.z = s * 0.7;
    add(leg, G.cyl(0.025, 0.03, 0.3, 6), shellD, s * 0.12, -0.02, 0, { rot: [0, 0, s * 1.0] });
    add(leg, G.cyl(0.02, 0.025, 0.22, 6), shellD, s * 0.22, -0.14, 0, { rot: [0, 0, s * 0.2] });
    c.legs.push(leg);
  }
  // 甲羅
  add(b, G.sphere(0.3, 20, 14), shell, 0, 0.36, 0, { scale: [1.3, 0.6, 1] });
  add(b, G.sphere(0.24, 16, 12), belly, 0, 0.3, 0.06, { scale: [1.3, 0.45, 0.9] });
  for (let i = 0; i < 6; i++) add(b, G.sphere(0.03, 6, 4), mat('#f07a5a'), -0.25 + i * 0.1, 0.5, -0.05 + Math.sin(i) * 0.08, { cast: false });
  // はさみ
  c.claws = [];
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.36, 0.42, 0.16);
    arm.rotation.z = s * 0.5;
    add(arm, G.cyl(0.04, 0.05, 0.22, 8), shell, 0, 0.08, 0);
    const claw = group(arm, 0, 0.24, 0);
    add(claw, G.sphere(0.12, 12, 10), shell, 0, 0, 0, { scale: [0.8, 1.2, 0.7] });
    const pin = group(claw, s * 0.04, 0.1, 0);
    add(pin, G.cone(0.045, 0.16, 8), shellD, 0, 0.06, 0);
    add(claw, G.cone(0.05, 0.16, 8), shellD, -s * 0.04, 0.16, 0);
    c.claws.push(pin);
    if (s > 0) c.armR = arm;
  }
  // 目（つきだした柄の先）と顔
  const head = (c.head = group(b, 0, 0.5, 0.18));
  for (const s of [-1, 1]) {
    add(head, G.cyl(0.025, 0.03, 0.2, 6), shell, s * 0.09, 0.08, 0);
    add(head, G.sphere(0.07, 10, 8), mat('#fffaf2'), s * 0.09, 0.2, 0.0);
    c.eyes.push(beadEye(head, s * 0.09, 0.2, 0.05, 0.045));
  }
  add(head, G.torus(0.05, 0.012, 6, 12, Math.PI), mat('#6a1a10'), 0, -0.04, 0.08, { rot: [0, 0, Math.PI], cast: false });
  cheeks(head, 0.2, 0.0, 0.06, 0.04);
  // ねじりはちまき（白と紺）
  const hachi = new THREE.MeshStandardMaterial({ map: stripeTex('#f4f6fa', '#2a3a6a', 10), roughness: 0.9 });
  add(b, G.torus(0.33, 0.035, 6, 24), hachi, 0, 0.5, 0, { rot: [Math.PI / 2, 0, 0], scale: [1.25, 0.95, 1] });
  add(b, G.box(0.05, 0.14, 0.04), hachi, 0.25, 0.48, -0.26, { rot: [0.5, 0, 0.5], cast: false });
  c.extra = (dt, t) => {
    c.claws.forEach((p, i) => { p.rotation.z = (i ? -1 : 1) * (0.2 + Math.max(0, Math.sin(t * (c.talkT > 0 ? 9 : 1.4) + i)) * 0.35); });
    c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 3 + i) * 0.06; });
  };
  return c;
}

// ---------------------------------------------------------------
// ペリカンの魚屋 — 白い体、大きなくちばし、青白しまの前かけ
// ---------------------------------------------------------------
export function makePelican() {
  const c = new Creature('pelican');
  c.noIdleHop = true;
  const b = c.body;
  const white = mat('#f8f6f0');
  const grey = mat('#c8ccd4');
  for (const s of [-1, 1]) add(b, G.sphere(0.09, 10, 8), mat('#f0a040'), s * 0.12, 0.04, 0.08, { scale: [1.3, 0.4, 1.6] });
  for (const s of [-1, 1]) add(b, G.cyl(0.03, 0.03, 0.3, 6), mat('#f0a040'), s * 0.12, 0.18, 0);
  add(b, G.sphere(0.32, 18, 14), white, 0, 0.6, -0.02, { scale: [1, 1.15, 1.1] });
  // 前かけ
  const apron = new THREE.MeshStandardMaterial({ map: stripeTex('#f4f6fa', '#3a7ac0', 5), roughness: 0.9, side: THREE.DoubleSide });
  add(b, G.cyl(0.3, 0.33, 0.42, 18, true), apron, 0, 0.5, 0.02, { cast: false });
  // つばさ
  for (const s of [-1, 1]) {
    const w = group(b, s * 0.3, 0.72, -0.04);
    w.rotation.z = s * 0.12;
    add(w, G.sphere(0.15, 10, 8), grey, 0, -0.1, 0, { scale: [0.45, 1.4, 1.1] });
    if (s > 0) c.armR = w;
  }
  add(b, G.cone(0.12, 0.25, 8), grey, 0, 0.5, -0.36, { rot: [-1.9, 0, 0] });
  add(b, G.cyl(0.09, 0.13, 0.32, 12), white, 0, 1.0, 0.02);
  const head = (c.head = group(b, 0, 1.2, 0.04));
  add(head, G.sphere(0.17, 16, 12), white, 0, 0, 0);
  add(head, G.sphere(0.07, 8, 6), mat('#f4e090'), 0, 0.13, -0.04, { scale: [1.2, 0.6, 1.2] });
  // 大きなくちばしと袋
  add(head, G.box(0.11, 0.05, 0.5), mat('#f0b040'), 0, -0.02, 0.32, { rot: [0.1, 0, 0] });
  add(head, G.sphere(0.12, 12, 10), mat('#f4c870'), 0, -0.11, 0.3, { scale: [0.75, 0.7, 1.9] });
  add(head, G.sphere(0.03, 6, 4), mat('#e88a2a'), 0, -0.04, 0.57, { cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.1, 0.04, 0.12, 0.035));
  cheeks(head, 0.13, -0.04, 0.1, 0.03);
  // ねじりはちまき
  add(head, G.torus(0.165, 0.025, 6, 20), new THREE.MeshStandardMaterial({ map: stripeTex('#f4f6fa', '#3a7ac0', 8) }), 0, 0.06, 0, { rot: [Math.PI / 2 - 0.15, 0, 0] });
  return c;
}

// ---------------------------------------------------------------
// カモメ（港のにぎわい）
// ---------------------------------------------------------------
export function makeGull() {
  const c = new Creature('gull');
  c.noIdleHop = true;
  const b = c.body;
  const white = mat('#fbfbf8');
  const grey = mat('#9aa4b4');
  for (const s of [-1, 1]) add(b, G.cyl(0.012, 0.012, 0.1, 4), mat('#f0b040'), s * 0.04, 0.05, 0, { cast: false });
  add(b, G.sphere(0.12, 12, 10), white, 0, 0.16, 0, { scale: [0.9, 0.9, 1.4] });
  for (const s of [-1, 1]) add(b, G.sphere(0.08, 8, 6), grey, s * 0.08, 0.19, -0.04, { scale: [0.4, 0.7, 1.8] });
  add(b, G.cone(0.04, 0.14, 6), mat('#2a2a30'), 0, 0.2, -0.2, { rot: [-1.8, 0, 0], cast: false });
  const head = (c.head = group(b, 0, 0.28, 0.1));
  add(head, G.sphere(0.075, 10, 8), white, 0, 0, 0);
  add(head, G.cone(0.022, 0.1, 6), mat('#f0b040'), 0, -0.01, 0.1, { rot: [Math.PI / 2, 0, 0], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.045, 0.02, 0.05, 0.015));
  c.root.scale.setScalar(1.3);
  return c;
}
