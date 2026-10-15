import * as THREE from 'three';
import { add, mat, G, group, canvasTex, FONT } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// 現代日本（とうきょう）の住人たち
// 江戸の住人の子孫は、江戸の生き物に今の服装を足して作る。
// ---------------------------------------------------------------

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

// ---------------------------------------------------------------
// 上野のパンダ
// ---------------------------------------------------------------
export function makePanda() {
  const c = new Creature('panda');
  const b = c.body;
  const white = mat('#f6f4ee', { roughness: 0.9 });
  const black = mat('#24242a', { roughness: 0.8 });
  for (const s of [-1, 1]) add(b, G.sphere(0.2, 14, 10), black, s * 0.26, 0.16, 0.12, { scale: [1, 0.75, 1.25] });
  add(b, G.sphere(0.5, 22, 16), white, 0, 0.62, 0, { scale: [1, 1.05, 0.92] });
  add(b, G.cyl(0.5, 0.5, 0.32, 22), black, 0, 0.82, 0, { scale: [1.02, 1, 0.94] });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.44, 0.86, 0.1);
    arm.rotation.z = s * 0.5;
    add(arm, G.capsule(0.13, 0.26), black, 0, -0.2, 0.04);
    if (s > 0) c.armR = arm;
  }
  // 笹
  const sasa = group(c.armR, 0, -0.4, 0.12);
  add(sasa, G.cyl(0.02, 0.02, 0.7, 5), mat('#5a8a3a'), 0, 0.2, 0, { rot: [0.3, 0, 0.3] });
  for (let i = 0; i < 4; i++) add(sasa, G.box(0.06, 0.24, 0.01), mat('#6aa84a'), 0.05 + (i % 2) * 0.06, 0.35 + i * 0.08, 0.08, { rot: [0.3, 0, (i % 2 ? -1 : 1) * 0.8], cast: false });
  const head = (c.head = group(b, 0, 1.28, 0.04));
  add(head, G.sphere(0.4, 22, 16), white, 0, 0, 0, { scale: [1.1, 0.95, 1] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.13, 12, 10), black, s * 0.3, 0.3, -0.04, { scale: [1, 1, 0.6] });
    add(head, G.sphere(0.11, 12, 10), black, s * 0.15, 0.04, 0.32, { scale: [0.8, 1.15, 0.45], rot: [0, 0, s * 0.5] });
    c.eyes.push(beadEye(head, s * 0.15, 0.05, 0.37, 0.04));
  }
  add(head, G.sphere(0.06, 10, 8), black, 0, -0.1, 0.38, { scale: [1.3, 0.8, 0.8] });
  cheeks(head, 0.27, -0.12, 0.3, 0.05);
  return c;
}

// ---------------------------------------------------------------
// 浅草寺のハト
// ---------------------------------------------------------------
export function makePigeon() {
  const c = new Creature('pigeon');
  c.noIdleHop = true;
  const b = c.body;
  const grey = mat('#8a90a4', { roughness: 0.6 });
  add(b, G.sphere(0.2, 14, 10), grey, 0, 0.22, 0, { scale: [0.85, 0.9, 1.3] });
  add(b, G.sphere(0.12, 12, 8), mat('#6a8a7a', { roughness: 0.4, metalness: 0.2 }), 0, 0.32, 0.14, { scale: [1, 0.9, 0.8] });
  add(b, G.box(0.16, 0.03, 0.22), mat('#5a6070'), 0, 0.2, -0.3, { rot: [-0.3, 0, 0] });
  for (const s of [-1, 1]) add(b, G.cyl(0.012, 0.012, 0.1, 4), mat('#e86a6a'), s * 0.06, 0.05, 0.02);
  const head = (c.head = group(b, 0, 0.44, 0.2));
  add(head, G.sphere(0.09, 12, 10), grey, 0, 0, 0);
  add(head, G.cone(0.025, 0.08, 6), mat('#3a3a44'), 0, -0.01, 0.1, { rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.05, 0.02, 0.06, 0.018));
  c.extra = (dt, t) => { head.position.z = 0.2 + Math.max(0, Math.sin(t * 5 + c.phase)) * 0.04; };
  return c;
}

// ---------------------------------------------------------------
// 子孫たちの、いまの服装
// ---------------------------------------------------------------
/** 柴犬のおまわりさん：紺の制帽と金の記章 */
export function dressPolice(c) {
  const cap = group(c.head, 0, 0.2, -0.02);
  cap.rotation.x = -0.12;
  add(cap, G.cyl(0.2, 0.2, 0.12, 20), mat('#1e2a4a'), 0, 0.06, 0);
  add(cap, G.cyl(0.21, 0.21, 0.04, 20), mat('#2a3a6a'), 0, 0.0, 0);
  add(cap, new THREE.CylinderGeometry(0.21, 0.21, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), mat('#111622'), 0, -0.03, 0.06, { scale: [1, 1, 1.25] });
  add(cap, G.sphere(0.04, 8, 6), mat('#e8c25a', { metalness: 0.5, roughness: 0.3 }), 0, 0.07, 0.2, { scale: [1, 1, 0.4] });
  add(c.body, G.box(0.36, 0.14, 0.05), mat('#1e2a4a'), 0, 0.7, 0.22, { cast: false });
  if (c.jitte) c.jitte.visible = false;
  return c;
}

/** カッパの船長：白い船長帽 */
export function dressCaptain(c) {
  const cap = group(c.head, 0, 0.27, 0);
  add(cap, G.cyl(0.17, 0.15, 0.1, 18), mat('#f8f8f4'), 0, 0.05, 0);
  add(cap, G.cyl(0.18, 0.18, 0.03, 18), mat('#1e2a4a'), 0, 0.0, 0);
  add(cap, new THREE.CylinderGeometry(0.18, 0.18, 0.02, 18, 1, false, -Math.PI / 2, Math.PI), mat('#111622'), 0, -0.02, 0.06, { scale: [1, 1, 1.3] });
  add(cap, G.sphere(0.03, 6, 4), mat('#e8c25a'), 0, 0.03, 0.17, { scale: [1, 1, 0.4] });
  return c;
}

/** ネコのアナウンサー：ちょうネクタイとマイク */
export function dressCaster(c) {
  for (const s of [-1, 1]) add(c.body, G.cone(0.06, 0.12, 6), mat('#d8402e'), s * 0.06, 0.72, 0.22, { rot: [0, 0, s * Math.PI / 2] });
  if (c.armR) {
    const mic = group(c.armR, 0, -0.32, 0.08);
    add(mic, G.cyl(0.02, 0.025, 0.2, 8), mat('#2a2a34'), 0, 0.05, 0);
    add(mic, G.sphere(0.05, 10, 8), mat('#9aa0aa', { metalness: 0.4, roughness: 0.4 }), 0, 0.17, 0);
  }
  return c;
}

/** リスの和菓子屋：白いはちまきと前かけ */
export function dressWagashi(c) {
  add(c.head, G.torus(0.25, 0.03, 6, 20), mat('#fbf8f0'), 0, 0.1, 0, { rot: [Math.PI / 2 - 0.15, 0, 0] });
  add(c.body, G.box(0.36, 0.3, 0.04), mat('#2b3a6a'), 0, 0.42, 0.22, { cast: false });
  return c;
}

/** ツルの鐘守：はっぴ */
export function dressHappi(c) {
  add(c.body, G.cyl(0.27, 0.3, 0.42, 16, true), mat('#d8402e', { side: THREE.DoubleSide }), 0, 0.78, 0, { scale: [0.95, 1, 1.05] });
  return c;
}

/** 名札の板（カメラに向かないただの板） */
export function nameTag(parent, text, x, y, z, w = 0.6) {
  const t = canvasTex(256, 96, (ctx, W, H) => {
    ctx.fillStyle = '#fbf8f0'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2b3a6a'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.fillStyle = '#2b3a6a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 46px ${FONT}`; ctx.fillText(text, W / 2, H / 2 + 2);
  });
  return add(parent, G.plane(w, w * 0.375), new THREE.MeshBasicMaterial({ map: t }), x, y, z, { cast: false });
}
