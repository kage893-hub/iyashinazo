import * as THREE from 'three';
import { add, mat, G, group, canvasTex } from './util.js';
import { Creature, beadEye, black, shine } from './creatures.js';

// ---------------------------------------------------------------
// 天空の街の住人たち
// ---------------------------------------------------------------

/** 白目＋黒目（暗い顔のキャラ用） */
function whiteEye(parent, x, y, z, r = 0.07) {
  const g = group(parent, x, y, z);
  add(g, G.sphere(r, 14, 10), mat('#ffffff'), 0, 0, 0, { scale: [1, 1.1, 0.5], cast: false });
  add(g, G.sphere(r * 0.6, 12, 8), black(), 0, -r * 0.05, r * 0.3, { scale: [1, 1.1, 0.5], cast: false });
  add(g, G.sphere(r * 0.2, 6, 4), shine(), r * 0.2, r * 0.25, r * 0.5, { cast: false });
  return g;
}

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

// ---------------------------------------------------------------
// ヒツジの町長
// ---------------------------------------------------------------
export function makeSheep() {
  const c = new Creature('sheep');
  const b = c.body;
  const wool = mat('#fbf8f2', { roughness: 1 });
  const face = mat('#3a3038');
  // 足
  for (const s of [-1, 1]) add(b, G.cyl(0.07, 0.08, 0.3, 10), face, s * 0.17, 0.15, 0.05);
  for (const s of [-1, 1]) add(b, G.sphere(0.09), face, s * 0.17, 0.03, 0.1, { scale: [1, 0.6, 1.3] });
  // もこもこの体
  const puffs = [[0, 0.62, 0, 0.42], [0.25, 0.75, 0.1, 0.25], [-0.25, 0.75, 0.1, 0.25], [0.28, 0.48, 0.05, 0.24], [-0.28, 0.48, 0.05, 0.24],
    [0, 0.88, 0.15, 0.25], [0.12, 0.45, 0.28, 0.22], [-0.12, 0.45, 0.28, 0.22], [0, 0.75, -0.25, 0.28]];
  for (const [x, y, z, r] of puffs) add(b, G.sphere(r), wool, x, y, z);
  // 町長のたすき
  add(b, G.box(0.16, 0.9, 0.04), mat('#d84a5a'), 0, 0.65, 0.4, { rot: [0.15, 0, 0.6] });
  add(b, G.cyl(0.07, 0.07, 0.03, 16), mat('#e8c25a', { metalness: 0.7, roughness: 0.3 }), 0.1, 0.58, 0.43, { rot: [Math.PI / 2, 0, 0] });
  // 腕（もこもこ）
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.42, 0.7, 0.1);
    arm.rotation.z = s * 0.4;
    add(arm, G.sphere(0.13), wool, 0, -0.1, 0);
    add(arm, G.sphere(0.07), face, 0, -0.22, 0.02);
    if (s > 0) c.armR = arm;
  }
  // 頭
  const head = (c.head = group(b, 0, 1.12, 0.12));
  add(head, G.sphere(0.27, 20, 16), face, 0, 0, 0.05, { scale: [0.9, 1.05, 1.1] });
  for (const [x, y, z, r] of [[0, 0.22, -0.02, 0.17], [0.15, 0.16, -0.05, 0.13], [-0.15, 0.16, -0.05, 0.13], [0, 0.12, -0.15, 0.17]]) add(head, G.sphere(r), wool, x, y, z);
  for (const s of [-1, 1]) add(head, G.sphere(0.12), face, s * 0.3, 0.02, -0.02, { scale: [1.4, 0.45, 0.7], rot: [0, 0, s * -0.3] });
  for (const s of [-1, 1]) c.eyes.push(whiteEye(head, s * 0.1, 0.03, 0.29, 0.06));
  add(head, G.sphere(0.03, 8, 6), mat('#e88a9a'), 0, -0.12, 0.32);
  cheeks(head, 0.18, -0.08, 0.25, 0.045);
  // 小さなシルクハット
  const hat = group(head, 0.05, 0.38, 0.0);
  hat.rotation.z = -0.15;
  add(hat, G.cyl(0.2, 0.2, 0.025, 20), mat('#2a2430'), 0, 0, 0);
  add(hat, G.cyl(0.13, 0.13, 0.22, 20), mat('#2a2430'), 0, 0.11, 0);
  add(hat, G.cyl(0.135, 0.135, 0.05, 20), mat('#d84a5a'), 0, 0.04, 0);
  c.extra = (dt, t) => {
    if (c.wave > 0) { c.wave -= dt; c.armR.rotation.z = -2.2 + Math.sin(t * 10) * 0.35; } else c.armR.rotation.z += (0.4 - c.armR.rotation.z) * 0.15;
  };
  c.wave = 0;
  return c;
}

// ---------------------------------------------------------------
// アルパカの仕立て屋
// ---------------------------------------------------------------
export function makeAlpaca() {
  const c = new Creature('alpaca');
  const b = c.body;
  const fluff = mat('#f2e2c6', { roughness: 1 });
  const fluff2 = mat('#e9d3ae', { roughness: 1 });
  for (const s of [-1, 1]) add(b, G.cyl(0.08, 0.07, 0.35, 10), fluff2, s * 0.16, 0.17, 0.08);
  for (const [x, y, z, r] of [[0, 0.55, 0, 0.4], [0.2, 0.62, 0.12, 0.24], [-0.2, 0.62, 0.12, 0.24], [0, 0.45, 0.25, 0.25], [0, 0.72, -0.15, 0.28]]) add(b, G.sphere(r), fluff, x, y, z);
  // エプロン
  add(b, G.box(0.42, 0.45, 0.05), mat('#6a8ac8'), 0, 0.5, 0.4, { rot: [-0.15, 0, 0] });
  add(b, G.box(0.18, 0.12, 0.03), mat('#4a6aa8'), 0, 0.45, 0.43, { rot: [-0.15, 0, 0] });
  // 首
  const neck = group(b, 0, 0.85, 0.08);
  add(neck, G.cyl(0.15, 0.2, 0.55, 14), fluff, 0, 0.25, 0);
  for (let i = 0; i < 3; i++) add(neck, G.sphere(0.17), fluff, 0, 0.1 + i * 0.18, 0.02);
  // メジャー
  add(neck, G.torus(0.2, 0.025, 6, 20, Math.PI * 1.5), mat('#f2c33a'), 0, 0.12, 0, { rot: [Math.PI / 2, 0, 0.6], cast: false });
  add(neck, G.box(0.04, 0.35, 0.01), mat('#f2c33a'), 0.18, -0.05, 0.12, { cast: false });
  // 頭
  const head = (c.head = group(b, 0, 1.45, 0.12));
  add(head, G.sphere(0.24, 20, 16), fluff, 0, 0, 0, { scale: [0.95, 1, 1] });
  add(head, G.sphere(0.15, 16, 12), mat('#f7eedc'), 0, -0.07, 0.2, { scale: [1, 0.8, 1.1] });
  add(head, G.sphere(0.025, 6, 4), mat('#6a5040'), 0, -0.02, 0.36);
  add(head, G.box(0.05, 0.035, 0.02), mat('#ffffff'), 0, -0.13, 0.33, { cast: false });
  for (const [x, y, z, r] of [[0, 0.2, 0, 0.14], [0.1, 0.17, 0.06, 0.1], [-0.1, 0.17, 0.06, 0.1], [0, 0.15, 0.12, 0.1]]) add(head, G.sphere(r), fluff2, x, y, z);
  for (const s of [-1, 1]) {
    const ear = group(head, s * 0.15, 0.2, -0.05);
    ear.rotation.z = -s * 0.35;
    add(ear, G.cone(0.06, 0.24, 8), fluff, 0, 0.12, 0, { scale: [1, 1, 0.6] });
  }
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.1, 0.04, 0.2, 0.045));
  cheeks(head, 0.15, -0.05, 0.17, 0.04);
  // まるめがね
  for (const s of [-1, 1]) add(head, G.torus(0.06, 0.008, 6, 18), mat('#8a6a3a', { metalness: 0.6 }), s * 0.1, 0.04, 0.24, { cast: false });
  // 針山の腕
  const arm = group(b, 0.38, 0.6, 0.15);
  arm.rotation.z = 0.5;
  add(arm, G.sphere(0.12), fluff, 0, -0.1, 0);
  add(arm, G.sphere(0.08), mat('#d84a5a'), 0.05, -0.2, 0.05);
  for (let i = 0; i < 4; i++) add(arm, G.cyl(0.005, 0.005, 0.1, 4), mat('#c0c4cc'), 0.05 + Math.cos(i * 1.6) * 0.04, -0.15, 0.05 + Math.sin(i * 1.6) * 0.04, { cast: false });
  c.extra = (dt, t) => { neck.rotation.x = Math.sin(t * 0.8 + c.phase) * 0.05; };
  return c;
}

// ---------------------------------------------------------------
// ツバメの郵便屋
// ---------------------------------------------------------------
export function makeSwallow() {
  const c = new Creature('swallow');
  const b = c.body;
  const navy = mat('#25306a', { roughness: 0.4, metalness: 0.1 });
  const white = mat('#fbfbff');
  add(b, G.sphere(0.22, 18, 14), navy, 0, 0.3, -0.02, { scale: [0.9, 0.95, 1.25] });
  add(b, G.sphere(0.18, 16, 12), white, 0, 0.25, 0.08, { scale: [0.9, 0.95, 1.1] });
  // 尾（ふたまた）
  for (const s of [-1, 1]) add(b, G.box(0.04, 0.02, 0.45), navy, s * 0.07, 0.24, -0.42, { rot: [0.25, s * 0.25, 0] });
  // 翼
  c.wings = [];
  for (const s of [-1, 1]) {
    const w = group(b, s * 0.17, 0.35, 0);
    add(w, G.sphere(0.2), navy, s * 0.05, 0, -0.08, { scale: [0.3, 0.55, 1.4] });
    c.wings.push(w);
  }
  for (const s of [-1, 1]) add(b, G.cyl(0.012, 0.012, 0.12, 4), mat('#3a2a20'), s * 0.06, 0.06, 0.02);
  // 郵便かばん
  add(b, G.box(0.16, 0.13, 0.08), mat('#c8643c'), 0.17, 0.2, 0.08, { rot: [0, 0.3, 0] });
  add(b, G.box(0.04, 0.4, 0.01), mat('#8a4a2a'), 0, 0.33, 0.2, { rot: [0, 0, 0.7], cast: false });
  const head = (c.head = group(b, 0, 0.55, 0.06));
  add(head, G.sphere(0.15, 16, 12), navy, 0, 0, 0);
  add(head, G.sphere(0.1, 12, 10), mat('#d8463a'), 0, -0.06, 0.08, { scale: [1, 0.8, 0.8] });
  add(head, G.cone(0.03, 0.08, 6), black(), 0, -0.01, 0.17, { rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.08, 0.03, 0.11, 0.03));
  // 郵便帽
  add(head, G.cyl(0.1, 0.11, 0.07, 16), mat('#2a3a6a'), 0, 0.13, -0.01);
  add(head, new THREE.CylinderGeometry(0.11, 0.11, 0.015, 16, 1, false, -Math.PI / 2, Math.PI), black(), 0, 0.1, 0.04);
  add(head, G.cyl(0.02, 0.02, 0.01, 8), mat('#e8c25a', { metalness: 0.7 }), 0, 0.14, 0.1, { rot: [Math.PI / 2, 0, 0], cast: false });
  c.flap = 0;
  c.extra = (dt, t) => {
    const f = c.flap > 0 ? Math.sin(t * 30) * 0.9 : Math.sin(t * 2) > 0.95 ? Math.sin(t * 30) * 0.5 : 0;
    if (c.flap > 0) c.flap -= dt;
    c.wings[0].rotation.z = -f; c.wings[1].rotation.z = f;
  };
  return c;
}

// ---------------------------------------------------------------
// カメの時計台守（おじいさん）
// ---------------------------------------------------------------
function shellTex() {
  return canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#6a8a4a'; ctx.fillRect(0, 0, w, h);
    const r = 20;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 9; x++) {
        const cx = x * r * 1.6 + (y % 2) * r * 0.8, cy = y * r * 1.4 + 6;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          ctx.lineTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
        }
        ctx.closePath();
        ctx.fillStyle = (x + y) % 2 ? '#7a9a52' : '#86a85c';
        ctx.fill();
        ctx.strokeStyle = '#3e5a2a'; ctx.lineWidth = 3; ctx.stroke();
      }
    }
  });
}

export function makeTortoise() {
  const c = new Creature('tortoise');
  const b = c.body;
  const skin = mat('#b8c48a');
  const shell = new THREE.MeshStandardMaterial({ map: shellTex(), roughness: 0.7 });
  for (const [x, z] of [[-0.3, 0.25], [0.3, 0.25], [-0.3, -0.25], [0.3, -0.25]]) add(b, G.sphere(0.13), skin, x, 0.1, z, { scale: [1, 0.8, 1] });
  add(b, new THREE.SphereGeometry(0.55, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.18, 0, { scale: [1, 0.85, 1.1] });
  add(b, G.torus(0.55, 0.06, 8, 32), mat('#c9b47a'), 0, 0.18, 0, { rot: [Math.PI / 2, 0, 0], scale: [1, 1.1, 1] });
  // しっぽ
  add(b, G.cone(0.06, 0.18, 8), skin, 0, 0.15, -0.65, { rot: [-Math.PI / 2 - 0.3, 0, 0] });
  // 首と頭
  add(b, G.cyl(0.1, 0.12, 0.3, 12), skin, 0, 0.35, 0.55, { rot: [0.8, 0, 0] });
  const head = (c.head = group(b, 0, 0.5, 0.72));
  add(head, G.sphere(0.2, 18, 14), skin, 0, 0, 0, { scale: [1, 0.9, 1.1] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.09, 0.05, 0.17, 0.035));
  // 白いまゆ毛とひげ
  for (const s of [-1, 1]) add(head, G.sphere(0.05, 8, 6), mat('#ffffff'), s * 0.1, 0.12, 0.15, { scale: [1.4, 0.6, 0.6], cast: false });
  add(head, G.cone(0.06, 0.18, 8), mat('#ffffff'), 0, -0.2, 0.12, { rot: [Math.PI, 0, 0] });
  add(head, G.torus(0.06, 0.008, 4, 12, Math.PI), mat('#5a6a3a'), 0, -0.06, 0.2, { rot: [0, 0, Math.PI], cast: false });
  for (const s of [-1, 1]) add(head, G.torus(0.05, 0.008, 6, 16), mat('#c9a03a', { metalness: 0.7 }), s * 0.09, 0.05, 0.2, { cast: false });
  // ナイトキャップ
  const cap = group(head, 0, 0.15, -0.02);
  cap.rotation.z = 0.3;
  add(cap, G.cone(0.16, 0.35, 14), mat('#5a7ac8'), 0, 0.12, 0);
  add(cap, G.torus(0.15, 0.04, 8, 16), mat('#ffffff'), 0, -0.04, 0, { rot: [Math.PI / 2, 0, 0] });
  add(cap, G.sphere(0.05), mat('#ffffff'), 0.07, 0.3, 0);
  c.extra = (dt, t) => { head.position.z = 0.72 + Math.sin(t * 0.7 + c.phase) * 0.03; };
  return c;
}

// ---------------------------------------------------------------
// モモンガの気球乗り
// ---------------------------------------------------------------
export function makeMomonga() {
  const c = new Creature('momonga');
  const b = c.body;
  const fur = mat('#9a8a7a');
  const belly = mat('#f2e8d8');
  add(b, G.sphere(0.25, 18, 14), fur, 0, 0.3, 0, { scale: [1, 1.05, 0.9] });
  add(b, G.sphere(0.2, 16, 12), belly, 0, 0.27, 0.08, { scale: [1, 1, 0.8] });
  // 飛膜
  for (const s of [-1, 1]) add(b, G.sphere(0.2), fur, s * 0.24, 0.3, -0.02, { scale: [0.6, 0.9, 0.25], rot: [0, 0, s * 0.3] });
  // しっぽ
  add(b, G.sphere(0.15), fur, 0, 0.35, -0.3, { scale: [0.8, 1.6, 0.4], rot: [-0.4, 0, 0] });
  // 赤いマフラー
  add(b, G.torus(0.16, 0.05, 8, 18), mat('#d84a3a'), 0, 0.48, 0.02, { rot: [Math.PI / 2, 0, 0] });
  add(b, G.box(0.08, 0.2, 0.03), mat('#d84a3a'), 0.13, 0.4, 0.12, { rot: [0, 0, 0.5] });
  const head = (c.head = group(b, 0, 0.66, 0.02));
  add(head, G.sphere(0.21, 18, 14), fur, 0, 0, 0);
  add(head, G.sphere(0.12, 14, 10), belly, 0, -0.06, 0.12, { scale: [1.2, 0.8, 0.8] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.07, 10, 8), fur, s * 0.15, 0.17, -0.02, { scale: [1, 1, 0.5] });
    add(head, G.sphere(0.04, 8, 6), mat('#e8b0b0'), s * 0.15, 0.17, 0.0, { scale: [1, 1, 0.4], cast: false });
  }
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.085, 0.02, 0.17, 0.055));
  add(head, G.sphere(0.022, 6, 4), mat('#4a3030'), 0, -0.04, 0.21);
  cheeks(head, 0.13, -0.05, 0.15, 0.035);
  // ゴーグル
  const gog = group(head, 0, 0.12, 0.12);
  gog.rotation.x = -0.4;
  for (const s of [-1, 1]) {
    add(gog, G.torus(0.05, 0.015, 6, 14), mat('#8a6a3a', { metalness: 0.6 }), s * 0.06, 0, 0, { cast: false });
    add(gog, G.circle(0.045, 12), mat('#9fd8ff', { emissive: '#4a9ad8', emissiveIntensity: 0.3 }), s * 0.06, 0, 0.005, { cast: false });
  }
  add(head, G.torus(0.2, 0.015, 4, 24), mat('#5a4030'), 0, 0.1, 0, { rot: [Math.PI / 2 - 0.4, 0, 0], cast: false });
  c.armR = group(b, 0.22, 0.45, 0.05);
  add(c.armR, G.sphere(0.06), fur, 0, -0.06, 0);
  c.wave = 0;
  c.extra = (dt, t) => {
    if (c.wave > 0) { c.wave -= dt; c.armR.rotation.z = -2.4 + Math.sin(t * 12) * 0.4; c.armR.position.y = 0.6; } else { c.armR.rotation.z = 0.3; c.armR.position.y = 0.45; }
  };
  return c;
}

// ---------------------------------------------------------------
// 空クジラ
// ---------------------------------------------------------------
export function makeWhale() {
  const c = new Creature('whale');
  const b = c.body;
  const blue = mat('#5a7ec0', { roughness: 0.6 });
  const belly = mat('#e8f0ff', { roughness: 0.7 });
  // 体（+Z が頭）
  add(b, G.sphere(1, 32, 20), blue, 0, 0, 0, { scale: [1.15, 1.0, 2.4] });
  add(b, G.sphere(1, 28, 16), belly, 0, -0.32, 0.25, { scale: [1.0, 0.7, 2.0] });
  for (let i = 0; i < 6; i++) add(b, G.box(0.05, 0.02, 2.4), mat('#c8d4f0'), -0.5 + i * 0.2, -0.95, 0.4, { rot: [0.1, 0, 0], cast: false });
  // 目と、ねむっているときの線
  c.lids = [];
  for (const s of [-1, 1]) {
    c.eyes.push(beadEye(b, s * 1.02, 0.15, 1.3, 0.11));
    const lid = add(b, G.torus(0.1, 0.02, 6, 14, Math.PI), mat('#1a2040'), s * 1.04, 0.13, 1.3, { rot: [0, s * Math.PI / 2, Math.PI], cast: false });
    c.lids.push(lid);
  }
  cheeks(b, 1.0, -0.15, 1.6, 0.15);
  // 口
  add(b, G.torus(0.5, 0.025, 6, 24, Math.PI * 0.6), mat('#2a3060'), 0, -0.15, 2.0, { rot: [Math.PI / 2 - 0.2, 0, Math.PI * 0.2 + Math.PI], cast: false });
  // ひれ
  c.fins = [];
  for (const s of [-1, 1]) {
    const f = group(b, s * 1.0, -0.4, 0.6);
    add(f, G.sphere(0.4), blue, s * 0.35, 0, 0, { scale: [1.4, 0.15, 0.7] });
    c.fins.push(f);
  }
  // 尾びれ
  const tail = (c.tail = group(b, 0, 0.1, -2.2));
  add(tail, G.cone(0.5, 1.4, 16), blue, 0, 0, -0.5, { rot: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.6] });
  for (const s of [-1, 1]) add(tail, G.sphere(0.5), blue, s * 0.55, 0, -1.2, { scale: [1.3, 0.15, 0.6], rot: [0, s * 0.4, 0] });
  // 背中の小さな雲
  for (const [x, z, r] of [[0.2, 0.2, 0.3], [-0.2, -0.3, 0.35], [0.1, -0.8, 0.25]]) add(b, G.sphere(r), mat('#ffffff', { roughness: 1 }), x, 0.92, z);
  c.sleeping = false;
  c.setSleeping = (on) => {
    c.sleeping = on;
    c.lids.forEach((l) => { l.visible = on; });
    c.eyes.forEach((e) => { e.visible = !on; });
  };
  c.extra = (dt, t) => {
    const sp = c.sleeping ? 0.6 : 1.6;
    tail.rotation.x = Math.sin(t * sp + c.phase) * 0.25;
    c.fins[0].rotation.z = Math.sin(t * sp * 1.3) * 0.25;
    c.fins[1].rotation.z = -Math.sin(t * sp * 1.3) * 0.25;
  };
  return c;
}
