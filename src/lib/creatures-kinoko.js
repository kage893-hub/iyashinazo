import * as THREE from 'three';
import { add, mat, glow, G, group, canvasTex } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// 巨大キノコの森の住人たち（みんな虫とキノコ）
// 原点は足元。+Z が正面。カエルの機関士（高さ約1.4）とくらべた大きさで作る。
// ---------------------------------------------------------------

const domeCache = new Map();
/** 半球（キノコのかさ・どんぐりのぼうし） */
export function dome(r, seg = 28) {
  const k = `${r},${seg}`;
  if (!domeCache.has(k)) domeCache.set(k, new THREE.SphereGeometry(r, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2));
  return domeCache.get(k);
}

function cheeks(parent, x, y, z, r = 0.05) {
  for (const s of [-1, 1]) add(parent, G.sphere(r, 10, 8), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * x, y, z, { scale: [1, 0.6, 0.4], cast: false });
}

/** 2点をむすぶ円柱 */
function seg(parent, a, b, r0, r1, m) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const mesh = add(parent, G.cyl(r1, r0, len, 6), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

/** 曲がった虫の足（付け根→ひざ→足先は地面）。yaw で前後に開く */
function bugLeg(parent, x, y, z, { dir = 1, len = 0.3, thick = 0.035, m, yaw = 0, drop = 0.25 }) {
  const g = group(parent, x, y, z, yaw);
  const hip = new THREE.Vector3(0, 0, 0);
  const knee = new THREE.Vector3(dir * len, len * 0.45 + drop * 0.2, 0);
  const foot = new THREE.Vector3(dir * (len * 1.35 + drop * 0.3), -y, 0);
  seg(g, hip, knee, thick, thick * 0.9, m);
  seg(g, knee, foot, thick * 0.9, thick * 0.55, m);
  add(g, G.sphere(thick * 1.05, 8, 6), m, knee.x, knee.y, knee.z, { cast: false });
  return g;
}

// ---------------------------------------------------------------
// キノコの長老（白い柄に顔、赤いかさに白い水玉、こけのひげ）
// ---------------------------------------------------------------
export function makeElder() {
  const c = new Creature('elder');
  const b = c.body;
  const stem = mat('#f4ead6');
  const stemD = mat('#d8c8a8');
  // 根もとのふくらみ・足
  add(b, G.sphere(0.36, 18, 12), stemD, 0, 0.18, 0, { scale: [1.1, 0.55, 1.1] });
  for (const s of [-1, 1]) add(b, G.sphere(0.12), stemD, s * 0.2, 0.06, 0.18, { scale: [1.2, 0.6, 1.4] });
  // 柄（からだ）
  add(b, G.cyl(0.3, 0.36, 0.8, 20), stem, 0, 0.6, 0);
  // つば（えりまき）
  add(b, G.cyl(0.42, 0.34, 0.06, 20), mat('#efe2c4'), 0, 0.92, 0);
  // 腕と杖
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.3, 0.75, 0.05);
    arm.rotation.z = s * 0.45;
    add(arm, G.capsule(0.06, 0.2), stem, 0, -0.13, 0);
    add(arm, G.sphere(0.07), stem, 0, -0.27, 0.02);
    if (s > 0) c.armR = arm;
  }
  const cane = group(b, 0.48, 0, 0.18);
  add(cane, G.cyl(0.03, 0.035, 0.85, 8), mat('#7a5232'), 0, 0.42, 0);
  add(cane, G.sphere(0.07, 10, 8), mat('#5a8a3a'), 0, 0.88, 0);
  // 頭（柄の上に顔、その上にかさ）
  const head = (c.head = group(b, 0, 1.2, 0));
  add(head, G.sphere(0.32, 20, 14), stem, 0, 0, 0, { scale: [1, 0.9, 0.95] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.12, 0.04, 0.27, 0.045));
  // まゆげ（白くてふさふさ）
  for (const s of [-1, 1]) add(head, G.capsule(0.03, 0.1), mat('#ffffff'), s * 0.13, 0.13, 0.27, { rot: [0, 0, s * 1.3], cast: false });
  cheeks(head, 0.2, -0.04, 0.24, 0.045);
  // こけのひげ
  const moss = mat('#7aa84a', { roughness: 1 });
  add(head, G.sphere(0.2, 14, 10), moss, 0, -0.2, 0.17, { scale: [1.1, 0.9, 0.6] });
  add(head, G.cone(0.13, 0.32, 10), moss, 0, -0.38, 0.2, { rot: [Math.PI - 0.2, 0, 0] });
  // 赤いかさ＋白い水玉
  const capM = mat('#d8402e', { roughness: 0.55 });
  const cap = group(head, 0, 0.2, 0);
  add(cap, dome(0.62), capM, 0, 0, 0, { scale: [1, 0.62, 1] });
  add(cap, G.cyl(0.6, 0.6, 0.04, 28), mat('#f0e2c6'), 0, -0.01, 0);
  const dot = mat('#fff8ee');
  for (const [a, e] of [[0, 0.95], [1.2, 0.6], [2.3, 0.85], [3.4, 0.55], [4.4, 0.9], [5.4, 0.6], [0.6, 0.3], [3.0, 0.25]]) {
    const r = 0.62;
    const ph = e * 1.2;
    const x = Math.sin(ph) * Math.cos(a) * r, z = Math.sin(ph) * Math.sin(a) * r, y = Math.cos(ph) * r * 0.62;
    const d = add(cap, G.sphere(0.08, 10, 8), dot, x, y, z, { scale: [1, 0.35, 1], cast: false });
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y / (0.62 * 0.62), z).normalize());
  }
  c.extra = (dt, t) => { cap.rotation.z = Math.sin(t * 0.7 + c.phase) * 0.04; };
  return c;
}

// ---------------------------------------------------------------
// カタツムリの郵便屋さん（のんびり屋）
// ---------------------------------------------------------------
export function makeSnail() {
  const c = new Creature('snail');
  const b = c.body;
  const skin = mat('#e8c890', { roughness: 0.4 });
  const skinD = mat('#d0a870', { roughness: 0.4 });
  // からだ（細長いなめくじ形）
  add(b, G.capsule(0.22, 1.1, 8, 16), skin, 0, 0.2, 0.05, { rot: [Math.PI / 2, 0, 0], scale: [1.15, 1, 0.75] });
  // 首（立ち上がる）
  add(b, G.capsule(0.19, 0.42, 8, 14), skin, 0, 0.55, 0.62, { rot: [0.35, 0, 0] });
  // 殻（うずまき）
  const shellTex = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c8783a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#a8582a' : '#e09a52'; ctx.fillRect(0, (i * h) / 9, w, h / 18); }
  });
  const shellM = new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.45 });
  const shell = group(b, 0, 0.7, -0.15);
  add(shell, G.sphere(0.5, 24, 18), shellM, 0, 0, 0, { scale: [0.8, 1, 1] });
  add(shell, G.torus(0.3, 0.12, 10, 24), mat('#8a4a22'), 0.36, 0.02, 0, { rot: [0, Math.PI / 2, 0], scale: [1, 1, 0.6] });
  add(shell, G.torus(0.14, 0.07, 8, 18), mat('#8a4a22'), 0.4, 0.05, 0, { rot: [0, Math.PI / 2, 0], scale: [1, 1, 0.6] });
  for (const s of [-1, 1]) add(shell, G.sphere(0.06), mat('#f4c070'), s * 0.36, 0.05, 0, { scale: [0.6, 1, 1] });
  // 郵便かばん
  add(b, G.box(0.36, 0.28, 0.12), mat('#3a6ab0'), 0.32, 0.35, 0.3, { rot: [0, 0.4, 0] });
  add(b, G.box(0.38, 0.06, 0.13), mat('#e8c25a'), 0.32, 0.47, 0.3, { rot: [0, 0.4, 0] });
  // 頭
  const head = (c.head = group(b, 0, 0.82, 0.74));
  add(head, G.sphere(0.2, 18, 14), skin, 0, 0, 0);
  add(head, G.torus(0.08, 0.012, 6, 16, Math.PI), mat('#6a4a2a'), 0, -0.06, 0.18, { rot: [0.2, 0, Math.PI], cast: false });
  cheeks(head, 0.13, -0.04, 0.15, 0.035);
  // 目は触角の先
  for (const s of [-1, 1]) {
    const st = group(head, s * 0.08, 0.12, 0.02);
    st.rotation.z = -s * 0.3;
    add(st, G.cyl(0.025, 0.035, 0.32, 8), skinD, 0, 0.16, 0);
    add(st, G.sphere(0.06, 12, 10), skin, 0, 0.33, 0);
    c.eyes.push(beadEye(st, 0, 0.34, 0.04, 0.035));
  }
  // 郵便帽
  const capG = group(head, 0, 0.18, -0.04);
  add(capG, G.cyl(0.13, 0.15, 0.1, 16), mat('#3a6ab0'), 0, 0, 0);
  add(capG, new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), mat('#22447a'), 0, -0.04, 0.06, { scale: [1, 1, 1.2] });
  add(capG, G.sphere(0.03), mat('#f2d36b', { metalness: 0.6, roughness: 0.3 }), 0, 0.02, 0.14);
  c.extra = (dt, t) => { shell.rotation.z = Math.sin(t * 0.8 + c.phase) * 0.03; };
  return c;
}

// ---------------------------------------------------------------
// アリ（隊長はどんぐりのぼうしのヘルメット）
// ---------------------------------------------------------------
export function makeAnt({ captain = false, color = '#3a2420' } = {}) {
  const c = new Creature('ant');
  const b = c.body;
  const shell = mat(color, { roughness: 0.3 });
  const legM = mat('#2a1a16', { roughness: 0.5 });
  // おしり・胸（立ち上がった姿勢）
  add(b, G.sphere(0.24, 16, 12), shell, 0, 0.3, -0.22, { scale: [0.9, 0.85, 1.25] });
  add(b, G.sphere(0.13, 14, 10), shell, 0, 0.48, 0.0, { scale: [0.9, 1.3, 0.9] });
  // 足（下の2組で立つ）
  for (const s of [-1, 1]) {
    bugLeg(b, s * 0.08, 0.36, -0.05, { dir: s, len: 0.18, thick: 0.025, m: legM, drop: 0.12 });
    bugLeg(b, s * 0.08, 0.3, -0.25, { dir: s, len: 0.18, thick: 0.025, m: legM, drop: 0.08, yaw: s * 0.5 });
  }
  // 腕
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.1, 0.58, 0.05);
    arm.rotation.z = s * 0.7;
    add(arm, G.cyl(0.025, 0.022, 0.24, 6), legM, 0, -0.1, 0.02);
    if (s > 0) c.armR = arm;
  }
  // 頭
  const head = (c.head = group(b, 0, 0.74, 0.04));
  add(head, G.sphere(0.17, 16, 12), shell, 0, 0, 0, { scale: [1.05, 0.95, 1] });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.08, 0.03, 0.14, 0.035));
  cheeks(head, 0.11, -0.04, 0.12, 0.03);
  add(head, G.torus(0.04, 0.008, 6, 12, Math.PI), mat('#f0d8c8'), 0, -0.06, 0.155, { rot: [0.2, 0, Math.PI], cast: false });
  for (const s of [-1, 1]) {
    const an = group(head, s * 0.06, 0.13, 0.04);
    an.rotation.z = -s * 0.5;
    an.rotation.x = -0.3;
    add(an, G.cyl(0.012, 0.012, 0.22, 5), legM, 0, 0.1, 0, { cast: false });
    add(an, G.cyl(0.012, 0.012, 0.14, 5), legM, s * 0.04, 0.24, 0.03, { rot: [0.5, 0, -s * 0.9], cast: false });
  }
  if (captain) {
    // どんぐりのぼうし
    const cap = group(head, 0, 0.1, -0.01);
    add(cap, dome(0.2, 16), mat('#8a6a3a', { roughness: 1 }), 0, 0, 0, { scale: [1, 0.55, 1] });
    add(cap, G.cyl(0.02, 0.03, 0.08, 6), mat('#5a3a1a'), 0, 0.12, 0);
    // 肩かけ（赤いたすき）
    add(b, G.box(0.06, 0.34, 0.24), mat('#c83a2a'), 0, 0.5, 0.02, { rot: [0, 0, 0.6], scale: [1, 1, 1.05] });
    c.armR.rotation.z = 1.2; // 敬礼っぽく
  }
  return c;
}

// ---------------------------------------------------------------
// テントウムシの子ども
// ---------------------------------------------------------------
export function makeLadybug(spots = 7) {
  const c = new Creature('ladybug');
  const b = c.body;
  const red = mat('#e0382a', { roughness: 0.25 });
  const blk = mat('#1e1a1c', { roughness: 0.35 });
  add(b, dome(0.3, 22), red, 0, 0.18, -0.02, { scale: [1, 0.9, 1.1] });
  add(b, G.cyl(0.29, 0.29, 0.05, 22), blk, 0, 0.17, -0.02, { scale: [1, 1, 1.1] });
  add(b, G.torus(0.3, 0.014, 4, 24, Math.PI), blk, 0, 0.18, -0.02, { rot: [0, Math.PI / 2, 0], scale: [1.1, 0.9, 1], cast: false });
  const pos = [[0.14, 0.15], [-0.14, 0.15], [0.17, -0.12], [-0.17, -0.12], [0.07, -0.26], [-0.07, -0.26], [0, 0.0]];
  for (let i = 0; i < Math.min(spots, pos.length); i++) {
    const [x, z] = pos[i];
    const y = Math.sqrt(Math.max(0, 0.3 * 0.3 - x * x - z * z * 0.8)) * 0.9 + 0.18;
    add(b, G.sphere(0.06, 10, 8), blk, x, y - 0.01, z - 0.02, { scale: [1, 0.35, 1], cast: false });
  }
  for (const s of [-1, 1]) for (const z of [0.1, -0.05, -0.2]) bugLeg(b, s * 0.2, 0.12, z, { dir: s, len: 0.1, thick: 0.02, m: blk, drop: 0.04 });
  const head = (c.head = group(b, 0, 0.24, 0.3));
  add(head, G.sphere(0.15, 16, 12), blk, 0, 0, 0, { scale: [1.1, 0.9, 0.9] });
  for (const s of [-1, 1]) add(head, G.sphere(0.06, 10, 8), mat('#fffaf0'), s * 0.08, 0.03, 0.08, { scale: [1, 1, 0.6], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.08, 0.03, 0.12, 0.03));
  cheeks(head, 0.1, -0.04, 0.11, 0.03);
  for (const s of [-1, 1]) {
    add(head, G.cyl(0.008, 0.008, 0.16, 4), blk, s * 0.05, 0.16, 0.04, { rot: [0.2, 0, -s * 0.4], cast: false });
    add(head, G.sphere(0.025), blk, s * 0.085, 0.24, 0.06, { cast: false });
  }
  return c;
}

// ---------------------------------------------------------------
// ホタルの灯り番（おしりが光る。寝ているときは消える）
// ---------------------------------------------------------------
export function makeFirefly() {
  const c = new Creature('firefly');
  const b = c.body;
  const dark = mat('#2a2a34', { roughness: 0.4 });
  const orange = mat('#e8703a', { roughness: 0.4 });
  c.lampMat = glow('#fff07a', 0.2);
  // おしり（光る）
  c.lamp = add(b, G.sphere(0.2, 16, 12), c.lampMat, 0, 0.3, -0.3, { scale: [0.9, 0.85, 1.1] });
  c.lamp.userData.keep = true;
  c.light = new THREE.PointLight('#ffe060', 0, 5, 1.6);
  c.light.position.set(0, 0.35, -0.4);
  b.add(c.light);
  add(b, G.sphere(0.2, 16, 12), dark, 0, 0.42, -0.05, { scale: [0.95, 1.2, 0.95] });
  // はね（背中に2枚）
  for (const s of [-1, 1]) add(b, G.sphere(0.18, 14, 8), mat('#3a3a48', { roughness: 0.3 }), s * 0.1, 0.48, -0.18, { scale: [0.55, 0.25, 1.3], rot: [0.35, 0, s * 0.15] });
  for (const s of [-1, 1]) {
    bugLeg(b, s * 0.12, 0.3, 0.05, { dir: s, len: 0.14, thick: 0.02, m: dark, drop: 0.12 });
    bugLeg(b, s * 0.12, 0.28, -0.15, { dir: s, len: 0.14, thick: 0.02, m: dark, drop: 0.1, yaw: s * 0.5 });
  }
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.15, 0.55, 0.05);
    arm.rotation.z = s * 0.6;
    add(arm, G.cyl(0.02, 0.02, 0.2, 6), dark, 0, -0.08, 0.02);
  }
  const head = (c.head = group(b, 0, 0.7, 0.04));
  add(head, G.sphere(0.16, 16, 12), orange, 0, 0.0, 0, { scale: [1.15, 0.9, 1] });
  add(head, G.sphere(0.12, 14, 10), dark, 0, -0.04, 0.06);
  for (const s of [-1, 1]) add(head, G.sphere(0.05, 10, 8), mat('#fffaf0'), s * 0.07, -0.01, 0.15, { scale: [1, 1, 0.6], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.07, -0.01, 0.18, 0.028));
  cheeks(head, 0.1, -0.07, 0.14, 0.028);
  for (const s of [-1, 1]) add(head, G.cyl(0.01, 0.01, 0.24, 4), dark, s * 0.06, 0.16, 0.06, { rot: [0.35, 0, -s * 0.35], cast: false });
  // ナイトキャップ
  c.nightcap = group(head, 0.02, 0.1, -0.02);
  add(c.nightcap, G.cone(0.13, 0.32, 12), mat('#6a8ad8'), 0, 0.12, 0, { rot: [0, 0, -0.5] });
  add(c.nightcap, G.sphere(0.04), mat('#ffffff'), 0.15, 0.24, 0);
  c.setLamp = (k) => { c.lampMat.emissiveIntensity = 0.2 + k * 2.6; c.light.intensity = k * 2.2; };
  c.extra = (dt, t) => {
    if (c.lampOn) {
      const k = 0.85 + Math.sin(t * 2.4 + c.phase) * 0.15;
      c.lampMat.emissiveIntensity = 2.8 * k;
      c.light.intensity = 2.2 * k;
    }
  };
  return c;
}

// ---------------------------------------------------------------
// クモの機織り職人（ふわふわ、毛糸のショール）
// ---------------------------------------------------------------
export function makeSpider() {
  const c = new Creature('spider');
  const b = c.body;
  const fur = mat('#6a4a7a', { roughness: 1 });
  const furD = mat('#4a3256', { roughness: 1 });
  // おなか（うしろ）
  add(b, G.sphere(0.38, 20, 14), fur, 0, 0.55, -0.3, { scale: [1, 0.9, 1.1] });
  add(b, G.sphere(0.12, 10, 8), mat('#e8c8f0'), 0, 0.7, -0.6, { scale: [1, 0.6, 0.4], cast: false });
  // からだ
  add(b, G.sphere(0.24, 18, 12), furD, 0, 0.55, 0.1);
  // 8本足
  for (const s of [-1, 1]) {
    [0.25, 0.08, -0.08, -0.22].forEach((z, i) => {
      bugLeg(b, s * 0.18, 0.55, z, { dir: s, len: 0.35, thick: 0.035, m: furD, drop: 0.32, yaw: -s * (0.55 - i * 0.37) });
    });
  }
  // ショール（毛糸）
  add(b, G.torus(0.2, 0.06, 8, 20), mat('#f0a8c0', { roughness: 1 }), 0, 0.68, 0.14, { rot: [Math.PI / 2 - 0.3, 0, 0] });
  const head = (c.head = group(b, 0, 0.84, 0.2));
  add(head, G.sphere(0.2, 18, 14), fur, 0, 0, 0);
  for (const s of [-1, 1]) add(head, G.sphere(0.07, 12, 10), mat('#fffaf0'), s * 0.08, 0.03, 0.15, { scale: [1, 1.1, 0.6], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.08, 0.03, 0.19, 0.04));
  // 小さな目が4つ
  for (const [x, y] of [[-0.05, 0.13], [0.05, 0.13], [-0.13, 0.1], [0.13, 0.1]]) add(head, G.sphere(0.018), mat('#16161c'), x, y, 0.16, { cast: false });
  cheeks(head, 0.13, -0.05, 0.15, 0.035);
  add(head, G.torus(0.05, 0.01, 6, 12, Math.PI), mat('#2a1a2a'), 0, -0.07, 0.18, { rot: [0.2, 0, Math.PI], cast: false });
  // めがね（編みもの用）
  for (const s of [-1, 1]) add(head, G.torus(0.065, 0.008, 6, 16), mat('#c8a04a', { metalness: 0.6, roughness: 0.3 }), s * 0.08, 0.03, 0.21, { cast: false });
  return c;
}

// ---------------------------------------------------------------
// 力持ちのカブトムシ（大きい。寝ているときはつのを下げている）
// ---------------------------------------------------------------
export function makeBeetle() {
  const c = new Creature('beetle');
  const b = c.body;
  const shell = mat('#5a2e1a', { roughness: 0.18, metalness: 0.15 });
  const dark = mat('#2e1810', { roughness: 0.3 });
  // 背中（つやつや）
  add(b, G.sphere(1.0, 28, 18), shell, 0, 0.85, -0.3, { scale: [0.9, 0.62, 1.25] });
  add(b, G.sphere(0.9, 20, 12), dark, 0, 0.62, -0.3, { scale: [0.88, 0.4, 1.2] });
  // 胸
  add(b, G.sphere(0.6, 22, 14), shell, 0, 0.9, 0.85, { scale: [1.05, 0.75, 0.75] });
  // 6本足
  for (const s of [-1, 1]) {
    [[0.85, -0.3], [0.2, 0], [-0.6, 0.4]].forEach(([z, yaw]) => bugLeg(b, s * 0.6, 0.6, z, { dir: s, len: 0.42, thick: 0.085, m: dark, drop: 0.2, yaw: s * yaw }));
  }
  // 頭とつの
  const head = (c.head = group(b, 0, 0.82, 1.3));
  add(head, G.sphere(0.36, 18, 14), dark, 0, 0, 0, { scale: [1.05, 0.8, 1] });
  for (const s of [-1, 1]) add(head, G.sphere(0.09, 12, 10), mat('#fffaf0'), s * 0.2, 0.08, 0.24, { scale: [1, 1, 0.6], cast: false });
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.2, 0.08, 0.29, 0.05));
  cheeks(head, 0.24, -0.08, 0.26, 0.05);
  const horn = (c.horn = group(head, 0, 0.1, 0.25));
  add(horn, G.cyl(0.07, 0.14, 1.0, 10), shell, 0, 0.45, 0.2, { rot: [0.45, 0, 0] });
  for (const s of [-1, 1]) add(horn, G.cyl(0.035, 0.06, 0.38, 8), shell, s * 0.12, 1.0, 0.48, { rot: [0.2, 0, -s * 0.55] });
  // 胸のつの（小さい）
  add(b, G.cone(0.1, 0.45, 10), shell, 0, 1.3, 1.0, { rot: [1.1, 0, 0] });
  c.setAwake = (on) => {
    c.sleeping = !on;
    horn.rotation.x = on ? 0 : 0.55;
    head.position.set(0, on ? 0.82 : 0.66, on ? 1.3 : 1.45);
    for (const e of c.eyes) e.scale.y = on ? 1 : 0.1;
  };
  return c;
}
