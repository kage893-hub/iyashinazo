import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// 寂れた温泉街の住人たち
// ---------------------------------------------------------------

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

/** 頭にのせる白い手ぬぐい */
function towel(parent, x, y, z, w = 0.36) {
  const g = group(parent, x, y, z);
  add(g, G.box(w, 0.06, w * 0.7), mat('#fbfbf6'), 0, 0, 0);
  add(g, G.box(w * 0.98, 0.02, 0.04), mat('#5a8ad8'), 0, 0.035, -w * 0.2, { cast: false });
  return g;
}

// ---------------------------------------------------------------
// カピバラの湯守
// ---------------------------------------------------------------
export function makeCapybara() {
  const c = new Creature('capybara');
  const b = c.body;
  const fur = mat('#a8794a');
  const furD = mat('#8a5f38');
  const yukata = mat('#5a7ab8');
  for (const [x, z] of [[-0.2, 0.15], [0.2, 0.15]]) add(b, G.cyl(0.08, 0.09, 0.25, 10), furD, x, 0.12, z);
  // 浴衣の胴
  add(b, G.box(0.66, 0.62, 0.52), yukata, 0, 0.55, 0, { scale: [1, 1, 1] });
  add(b, G.sphere(0.36, 18, 12), yukata, 0, 0.55, 0, { scale: [0.95, 0.95, 0.75] });
  add(b, G.box(0.68, 0.12, 0.54), mat('#e8c25a'), 0, 0.5, 0);
  // 襟（白いV）
  for (const s of [-1, 1]) add(b, G.box(0.06, 0.4, 0.02), mat('#f4f0e6'), s * 0.07, 0.7, 0.27, { rot: [0, 0, -s * 0.45], cast: false });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.36, 0.7, 0.05);
    arm.rotation.z = s * 0.25;
    add(arm, G.capsule(0.09, 0.2), yukata, 0, -0.15, 0);
    add(arm, G.sphere(0.075), fur, 0, -0.3, 0.02);
  }
  // 大きくて四角っぽい頭
  const head = (c.head = group(b, 0, 1.08, 0.08));
  add(head, G.box(0.46, 0.4, 0.56), fur, 0, 0, 0.02);
  add(head, G.sphere(0.25, 16, 12), fur, 0, 0.0, -0.08, { scale: [0.95, 0.85, 1] });
  add(head, G.box(0.42, 0.3, 0.2), furD, 0, -0.05, 0.27);
  add(head, G.box(0.16, 0.04, 0.02), mat('#3a2418'), 0, 0.03, 0.375, { cast: false });
  for (const s of [-1, 1]) add(head, G.sphere(0.035, 8, 6), mat('#3a2418'), s * 0.08, 0.02, 0.37, { scale: [1, 0.6, 0.5], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.2, 0.1, 0.12, 0.04));
  for (const s of [-1, 1]) add(head, G.sphere(0.06, 10, 8), furD, s * 0.21, 0.2, -0.08, { scale: [1, 0.8, 0.5] });
  cheeks(head, 0.2, -0.03, 0.2, 0.04);
  towel(head, 0, 0.23, -0.02, 0.34);
  // ゆず
  add(head, G.sphere(0.06, 10, 8), mat('#f2b31a'), 0.08, 0.3, 0.02);
  c.extra = (dt, t) => { head.rotation.x = Math.sin(t * 0.6 + c.phase) * 0.05; };
  return c;
}

// ---------------------------------------------------------------
// タヌキの番頭
// ---------------------------------------------------------------
export function makeTanuki() {
  const c = new Creature('tanuki');
  const b = c.body;
  const fur = mat('#8a6a4e');
  const dark = mat('#3a2c24');
  const cream = mat('#e8d8be');
  for (const s of [-1, 1]) add(b, G.sphere(0.12), dark, s * 0.17, 0.08, 0.1, { scale: [1, 0.6, 1.3] });
  add(b, G.sphere(0.4, 20, 14), fur, 0, 0.45, 0, { scale: [1, 1, 0.92] });
  add(b, G.sphere(0.28, 18, 12), cream, 0, 0.4, 0.17, { scale: [1, 1.05, 0.65] });
  // 前かけ
  add(b, G.box(0.42, 0.42, 0.04), mat('#2b3a6a'), 0, 0.4, 0.37, { rot: [-0.15, 0, 0] });
  add(b, G.circle(0.09, 16), mat('#f4ead2'), 0, 0.45, 0.4, { rot: [-0.15, 0, 0], cast: false });
  // しっぽ（しま）
  const tail = group(b, 0, 0.3, -0.35);
  tail.rotation.x = -0.6;
  for (let i = 0; i < 3; i++) add(tail, G.sphere(0.13 - i * 0.01), i % 2 ? dark : fur, 0, 0, -0.1 - i * 0.13);
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.36, 0.55, 0.05);
    arm.rotation.z = s * 0.4;
    add(arm, G.capsule(0.08, 0.15), dark, 0, -0.12, 0);
  }
  const head = (c.head = group(b, 0, 0.95, 0.05));
  add(head, G.sphere(0.32, 20, 14), fur, 0, 0, 0, { scale: [1.1, 0.95, 1] });
  add(head, G.sphere(0.15, 14, 10), cream, 0, -0.08, 0.24, { scale: [1.2, 0.8, 0.8] });
  add(head, G.sphere(0.045, 8, 6), dark, 0, -0.04, 0.37);
  // 目のまわりの黒いもよう
  c.lids = [];
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.1, 12, 10), dark, s * 0.13, 0.02, 0.24, { scale: [1.2, 0.8, 0.5], rot: [0, 0, -s * 0.3] });
    const e = beadEye(head, s * 0.13, 0.03, 0.29, 0.04);
    add(e, G.sphere(0.02, 6, 4), mat('#ffffff'), 0.01, 0.015, 0.025, { cast: false });
    c.eyes.push(e);
    const lid = add(head, G.box(0.1, 0.015, 0.02), mat('#e8d8be'), s * 0.13, 0.03, 0.3, { cast: false });
    c.lids.push(lid);
  }
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.08, 12, 10), fur, s * 0.22, 0.24, -0.04, { scale: [1, 1, 0.5] });
    add(head, G.sphere(0.05, 10, 8), dark, s * 0.22, 0.24, -0.02, { scale: [1, 1, 0.4], cast: false });
  }
  cheeks(head, 0.22, -0.08, 0.2, 0.04);
  c.setSleeping = (on) => {
    c.sleeping = on;
    c.eyes.forEach((e) => { e.visible = !on; });
    c.lids.forEach((l) => { l.visible = on; });
    c.body.rotation.x = on ? 0.15 : 0;
  };
  c.extra = (dt, t) => { if (c.sleeping) c.head.rotation.z = Math.sin(t * 0.7) * 0.1; };
  return c;
}

// ---------------------------------------------------------------
// キツネの提灯屋
// ---------------------------------------------------------------
export function makeFox() {
  const c = new Creature('fox');
  const b = c.body;
  const fur = mat('#e0823a');
  const white = mat('#fbf4ea');
  const happi = mat('#c8382e');
  for (const s of [-1, 1]) add(b, G.cyl(0.07, 0.08, 0.3, 10), mat('#3a2a24'), s * 0.13, 0.15, 0.03);
  add(b, G.cyl(0.24, 0.32, 0.6, 18), happi, 0, 0.55, 0);
  add(b, G.box(0.06, 0.55, 0.03), mat('#f4ead2'), 0.08, 0.6, 0.27, { rot: [0, 0, 0.2], cast: false });
  add(b, G.cyl(0.33, 0.33, 0.06, 18), mat('#2b2b30'), 0, 0.4, 0);
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.3, 0.75, 0.04);
    arm.rotation.z = s * 0.35;
    add(arm, G.capsule(0.07, 0.22), happi, 0, -0.15, 0);
    add(arm, G.sphere(0.065), fur, 0, -0.32, 0);
    if (s > 0) c.armR = arm;
  }
  // 手に小さな提灯
  const lan = group(c.armR, 0, -0.42, 0.08);
  add(lan, G.cyl(0.005, 0.005, 0.12, 4), mat('#3a2a24'), 0, 0.05, 0, { cast: false });
  add(lan, G.sphere(0.08, 12, 10), mat('#ff6a3a', { emissive: '#ff6a3a', emissiveIntensity: 0.3 }), 0, -0.06, 0, { scale: [1, 1.3, 1] });
  c.handLantern = lan;
  // しっぽ
  const tail = (c.tail = group(b, 0, 0.35, -0.28));
  tail.rotation.x = -0.9;
  add(tail, G.sphere(0.16, 14, 10), fur, 0, 0, -0.2, { scale: [0.9, 0.9, 1.8] });
  add(tail, G.sphere(0.1, 12, 8), white, 0, 0, -0.5, { scale: [0.9, 0.9, 1.2] });
  const head = (c.head = group(b, 0, 1.05, 0.03));
  add(head, G.sphere(0.25, 20, 14), fur, 0, 0, 0, { scale: [1.1, 0.95, 1] });
  add(head, G.cone(0.13, 0.28, 14), fur, 0, -0.06, 0.24, { rot: [Math.PI / 2, 0, 0] });
  add(head, G.sphere(0.12, 12, 10), white, 0, -0.1, 0.17, { scale: [1.2, 0.7, 1] });
  add(head, G.sphere(0.035, 8, 6), mat('#2a1a18'), 0, -0.05, 0.38);
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.1, 0.04, 0.2, 0.04));
  for (const s of [-1, 1]) {
    const ear = group(head, s * 0.15, 0.2, -0.02);
    ear.rotation.z = -s * 0.25;
    add(ear, G.cone(0.09, 0.26, 4), fur, 0, 0.12, 0, { rot: [0, Math.PI / 4, 0] });
    add(ear, G.cone(0.04, 0.08, 4), mat('#3a2a24'), 0, 0.23, 0, { rot: [0, Math.PI / 4, 0], cast: false });
  }
  cheeks(head, 0.17, -0.05, 0.16, 0.035);
  // ねじりはちまき
  add(head, G.torus(0.25, 0.03, 6, 24), mat('#f4ead2'), 0, 0.08, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  c.extra = (dt, t) => { c.tail.rotation.y = Math.sin(t * 1.4 + c.phase) * 0.4; };
  return c;
}

// ---------------------------------------------------------------
// ニホンザル（子ザル・湯につかるサル）
// ---------------------------------------------------------------
export function makeMonkey({ kid = true, bathing = false } = {}) {
  const c = new Creature('monkey');
  const b = c.body;
  const fur = mat('#b8a88e');
  const furD = mat('#9a8a72');
  const face = mat('#e88a8a');
  add(b, G.sphere(0.3, 18, 12), fur, 0, 0.32, 0, { scale: [1, 1.05, 0.9] });
  for (const s of [-1, 1]) add(b, G.sphere(0.12), furD, s * 0.15, 0.08, 0.12, { scale: [1, 0.6, 1.3] });
  c.arms = [];
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.26, 0.42, 0.06);
    arm.rotation.z = s * 0.5;
    add(arm, G.capsule(0.06, 0.18), fur, 0, -0.13, 0);
    add(arm, G.sphere(0.06), face, 0, -0.27, 0.02);
    c.arms.push(arm);
  }
  const head = (c.head = group(b, 0, 0.72, 0.03));
  add(head, G.sphere(0.24, 18, 14), fur, 0, 0, 0);
  add(head, G.sphere(0.16, 14, 10), face, 0, -0.03, 0.12, { scale: [1.1, 1, 0.8] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.07, 10, 8), face, s * 0.23, 0, 0, { scale: [0.6, 1, 0.8] });
    c.eyes.push(beadEye(head, s * 0.06, 0.02, 0.24, 0.03));
  }
  add(head, G.sphere(0.02, 6, 4), mat('#8a3a3a'), 0, -0.05, 0.26);
  if (bathing) towel(head, 0, 0.22, 0, 0.26);
  if (kid) {
    // ぶるぶる震える／うれしいとはねる
    c.cold = true;
    c.extra = (dt, t) => {
      if (c.cold) {
        c.body.position.x = Math.sin(t * 40) * 0.012;
        c.arms[0].rotation.z = -0.9; c.arms[1].rotation.z = 0.9;
      } else {
        c.body.position.x = 0;
        c.arms[0].rotation.z = -0.5 + Math.sin(t * 6) * 0.3; c.arms[1].rotation.z = 0.5 - Math.sin(t * 6) * 0.3;
      }
    };
  }
  if (bathing) c.root.scale.setScalar(0.9);
  return c;
}
