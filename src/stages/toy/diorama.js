import * as THREE from 'three';
import { waterize } from '../../lib/livefx.js';
import { add, mat, glow, G, group, rng, canvasTex, roundRectShape, FONT } from '../../lib/util.js';
import { blockMat } from '../../lib/creatures-toy.js';

// ---------------------------------------------------------------
// からくりおもちゃの街の箱庭（1.5倍の大きさ）
// 島は x[-22.5,22.5] z[-16.5,16.5]、線路は z=-7、ホーム上面 y=0.75
// 地面は道路のプリントのプレイマット。家は積み木とブリキ。
// ---------------------------------------------------------------

export const ISLAND = { w: 45, d: 33 };
export const TRACK_Z = -7.0;
const FLOOR = 0.75;
export const CANAL = [15.4, 18.2];
export const OVAL = { x: -3, z: 3.5, rx: 6.0, rz: 3.6 };

// ゼンマイ行進の迷路（# は積み木、S はスタート、G はハンドル）
export const MAZE = ['..#.G', '.#..#', '...#.', '##...', '..S#.'];
export const MAZE_POS = { x: 10.0, z: 11.0, cell: 1.3 };
export const mazeCell = (c, r) => new THREE.Vector3(MAZE_POS.x + (c - 2) * MAZE_POS.cell, 0, MAZE_POS.z + (r - 2) * MAZE_POS.cell);

// 楽譜の積み木の色（赤＝ド 橙＝レ 黄＝ミ 緑＝ソ 青＝ラ）
export const NOTE_COLORS = ['#e8402e', '#f08a2a', '#f0c830', '#4ab04a', '#3a7ae8'];
export const SCORE = [[2, 3, 4, 3], [2, 1, 2, 0]]; // ⚀ と ⚁ の楽譜（音の番号）

// ---------------- テクスチャ ----------------
/** 道路のプリントのプレイマット（ワールド座標で描く） */
const matTex = () => canvasTex(1800, 1320, (ctx, w, h) => {
  const K = 40;
  const X = (x) => (x + 22.5) * K, Z = (z) => (z + 16.5) * K;
  ctx.fillStyle = '#7ac85a'; ctx.fillRect(0, 0, w, h);
  // 原っぱのもよう（四角いパッチ）
  const r = rng(91);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(30,90,30,0.08)'; ctx.fillRect(r() * w, r() * h, 60 + r() * 120, 60 + r() * 120); }
  // 道路
  const road = (x0, z0, x1, z1) => {
    ctx.fillStyle = '#6a6e78'; ctx.fillRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
    ctx.strokeStyle = '#f4f0e0'; ctx.lineWidth = 6; ctx.setLineDash([30, 24]);
    ctx.beginPath();
    if (x1 - x0 > z1 - z0) { ctx.moveTo(X(x0), Z((z0 + z1) / 2)); ctx.lineTo(X(x1), Z((z0 + z1) / 2)); } else { ctx.moveTo(X((x0 + x1) / 2), Z(z0)); ctx.lineTo(X((x0 + x1) / 2), Z(z1)); }
    ctx.stroke(); ctx.setLineDash([]);
  };
  road(-22.5, -3.1, 15.4, -0.9);
  road(-12.6, -0.9, -10.4, 16.5);
  road(3.3, -0.9, 5.5, 16.5);
  // 横断歩道
  ctx.fillStyle = '#f4f0e0';
  for (let i = 0; i < 6; i++) ctx.fillRect(X(-12.6) + 4, Z(1.2) + i * 14, (2.2 * K) - 8, 7);
  for (let i = 0; i < 6; i++) ctx.fillRect(X(3.3) + 4, Z(1.2) + i * 14, (2.2 * K) - 8, 7);
  // 駐車場のわく・池・木のプリント（ただの絵）
  ctx.strokeStyle = '#f4f0e0'; ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) ctx.strokeRect(X(-21) + i * 52, Z(-0.2), 46, 80);
  ctx.fillStyle = '#4a9a3a';
  for (const [x, z] of [[-20, 8], [-6.5, 15], [13.8, 1.5], [20.5, 13], [-1, -4.3], [12, -3.6]]) { ctx.beginPath(); ctx.arc(X(x), Z(z), 26, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(X(x) - 4, Z(z) + 18, 8, 16); ctx.fillStyle = '#4a9a3a'; }
});

const facesTex = (cols) => canvasTex(256, 64, (ctx, w, h) => {
  cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect((i * w) / cols.length, 0, w / cols.length, h); });
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 4;
  for (let i = 0; i <= cols.length; i++) { ctx.beginPath(); ctx.moveTo((i * w) / cols.length, 0); ctx.lineTo((i * w) / cols.length, h); ctx.stroke(); }
}, { repeat: [2, 1] });

const woodTex = (base = '#c8925a', repeat = [1, 1]) => canvasTex(256, 256, (ctx, w, h) => {
  const r = rng(92);
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(90,50,20,${0.08 + r() * 0.12})`; ctx.lineWidth = 1 + r() * 3; const y = r() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 10, w * 0.6, y - 10, w, y + r() * 6); ctx.stroke(); }
}, { repeat });

const clockTex = () => canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#fbf4e2'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 124, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 10; ctx.stroke();
  ctx.fillStyle = '#3a2a1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 30px ${FONT}`;
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; ctx.fillText(String(i), w / 2 + Math.cos(a) * 96, h / 2 + Math.sin(a) * 96); }
});

// ---------------- 部品 ----------------
const BLOCK_COLS = ['#e8402e', '#3a7ae8', '#f0c830', '#4ab04a', '#f08a2a', '#b05ad8'];

/** 積み木の家（四角い箱＋三角屋根、窓とドア） */
function blockHouse(parent, x, z, { w = 3, d = 2.6, h = 2.2, ry = 0, wall = '#f4e0b0', roof = '#e8402e', letter = null, seed = 1 } = {}) {
  const g = group(parent, x, 0, z, ry);
  add(g, G.box(w, h, d), mat(wall, { roughness: 0.55 }), 0, h / 2, 0);
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - 0.2, 0); s.lineTo(w / 2 + 0.2, 0); s.lineTo(0, h * 0.55); s.lineTo(-w / 2 - 0.2, 0);
  add(g, new THREE.ExtrudeGeometry(s, { depth: d + 0.2, bevelEnabled: false }), mat(roof, { roughness: 0.5 }), 0, h, -d / 2 - 0.1);
  const winM = glow('#ffe0a0', 0.5);
  for (const k of [-1, 1]) add(g, G.box(0.55, 0.55, 0.06), winM, k * w * 0.27, h * 0.62, d / 2 + 0.02, { cast: false });
  add(g, G.box(0.7, 1.1, 0.08), mat(BLOCK_COLS[seed % 6], { roughness: 0.5 }), 0, 0.55, d / 2 + 0.02);
  add(g, G.sphere(0.06, 8, 6), mat('#f0c830'), 0.22, 0.55, d / 2 + 0.08, { cast: false });
  if (letter) add(g, G.box(0.9, 0.9, 0.9), blockMat(letter, BLOCK_COLS[(seed + 2) % 6]), w / 2 + 0.6, 0.45, d / 2 - 0.3, { rot: [0, 0.3, 0] });
  return { g, win: winM };
}

/** ブリキの家（円筒＋とんがり屋根） */
function tinHouse(parent, x, z, { r = 1.2, h = 2.6, body = '#9ab0c8', roof = '#3a7ae8', ry = 0 } = {}) {
  const g = group(parent, x, 0, z, ry);
  const t = (c) => mat(c, { roughness: 0.38, metalness: 0.25 });
  add(g, G.cyl(r, r, h, 24), t(body), 0, h / 2, 0);
  for (let i = 0; i < 3; i++) add(g, G.torus(r + 0.01, 0.04, 6, 24), t('#e8c25a'), 0, 0.4 + i * (h - 0.6) / 2, 0, { rot: [Math.PI / 2, 0, 0] });
  add(g, G.cone(r + 0.25, 1.6, 24), t(roof), 0, h + 0.8, 0);
  add(g, G.sphere(0.12, 10, 8), t('#e8402e'), 0, h + 1.65, 0);
  const winM = glow('#ffe0a0', 0.5);
  add(g, G.circle(0.3, 16), winM, 0, h * 0.65, r + 0.01, { cast: false });
  add(g, G.box(0.7, 1.1, 0.1), t('#2a5ac8'), 0, 0.55, r - 0.02);
  return { g, win: winM };
}

/** ペロペロキャンディの街灯 */
function candyLamp(parent, x, z, mats, color = '#ff8ab0') {
  const g = group(parent, x, 0, z);
  add(g, G.cyl(0.06, 0.08, 2.6, 8), mat('#fbf6f0'), 0, 1.3, 0);
  const m = glow(color, 0.6);
  mats.push(m);
  add(g, G.sphere(0.32, 18, 12), m, 0, 2.85, 0, { scale: [1, 1, 0.45] });
  add(g, G.torus(0.2, 0.05, 6, 18), glow('#ffffff', 0.4), 0, 2.85, 0.13, { cast: false });
  return g;
}

/** 色えんぴつのさく */
function crayonFence(parent, x0, x1, z, seed) {
  const r = rng(seed);
  for (let x = x0; x <= x1; x += 0.42) {
    const c = BLOCK_COLS[Math.floor(r() * 6)];
    const h = 1.1 + r() * 0.35;
    add(parent, G.cyl(0.16, 0.16, h, 6), mat(c, { roughness: 0.5 }), x, h / 2, z);
    add(parent, G.cone(0.16, 0.34, 6), mat('#f0d0a0'), x, h + 0.17, z);
    add(parent, G.cone(0.06, 0.12, 6), mat(c), x, h + 0.29, z, { cast: false });
  }
}

/** 歯車（歯の数 n、半径 r） */
export function gearMesh(n, r, m, thick = 0.12) {
  const s = new THREE.Shape();
  const ri = r * 0.84;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.25) / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2, a3 = ((i + 0.75) / n) * Math.PI * 2;
    const P = (rr, a) => [Math.cos(a) * rr, Math.sin(a) * rr];
    if (i === 0) s.moveTo(...P(ri, a0));
    s.lineTo(...P(r, a1)); s.lineTo(...P(r, a2)); s.lineTo(...P(ri, a3)); s.lineTo(...P(ri, ((i + 1) / n) * Math.PI * 2));
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.18, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  geo.translate(0, 0, -thick / 2);
  return new THREE.Mesh(geo, m);
}

export function buildToyDiorama(scene) {
  const root = group(scene);
  const R = { root, lampMats: [], winMats: [] };
  const r = rng(93);

  // ---------------- 地面（プレイマット） ----------------
  const matM = new THREE.MeshStandardMaterial({ map: matTex(), roughness: 0.9 });
  add(root, new THREE.ShapeGeometry(roundRectShape(ISLAND.w - 0.4, ISLAND.d - 0.4, 3), 12), matM, 0, 0.003, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // UV をワールド座標にあわせる
  {
    const m = root.children[root.children.length - 1];
    const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + 22.5) / 45, 1 - (-p.getY(i) + 16.5) / 33);
  }

  // ---------------- ホーム（積み木） ----------------
  const faces = new THREE.MeshStandardMaterial({ map: facesTex(['#e8402e', '#f0c830', '#3a7ae8', '#4ab04a', '#f08a2a']), roughness: 0.55 });
  add(root, G.box(10, FLOOR, 2.35), faces, -13, FLOOR / 2, TRACK_Z + 2.22);
  add(root, G.box(10.1, 0.06, 0.3), mat('#fbf6f0'), -13, FLOOR + 0.03, TRACK_Z + 1.2);
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, FLOOR * (3 - i) / 3, 0.35), mat(BLOCK_COLS[i], { roughness: 0.55 }), -8.6, FLOOR * (3 - i) / 6, TRACK_Z + 3.58 + i * 0.35);
  const sign = (R.stationSign = group(root, -12.0, FLOOR, TRACK_Z + 1.55));
  for (const s of [-1, 1]) add(sign, G.cyl(0.06, 0.06, 1.9, 8), mat('#e8402e'), s * 1.0, 0.95, 0);
  add(sign, G.box(2.3, 0.9, 0.08), new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fbf6f0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a7ae8'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#2a2a3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 60px ${FONT}`; ctx.fillText('おもちゃのまち', w / 2, h * 0.42);
    ctx.font = `700 26px ${FONT}`; ctx.fillText('← きのこのもり　　　　　？？？ →', w / 2, h * 0.8);
  }), roughness: 0.6 }), 0, 1.6, 0);
  // ホームの積み木のベンチ
  for (const x of [-16.5, -10.0]) { add(root, G.box(1.6, 0.4, 0.6), mat('#3a7ae8', { roughness: 0.5 }), x, FLOOR + 0.2, TRACK_Z + 2.9); add(root, G.box(1.6, 0.5, 0.15), mat('#f0c830', { roughness: 0.5 }), x, FLOOR + 0.55, TRACK_Z + 3.25); }

  // ---------------- はね橋と、おもちゃの川 ----------------
  const canalW = CANAL[1] - CANAL[0], cx = (CANAL[0] + CANAL[1]) / 2;
  add(root, G.box(canalW + 0.3, 0.12, ISLAND.d - 1.4), mat('#2a5ac8', { roughness: 0.4 }), cx, 0.0, 0);
  for (const s of [-1, 1]) add(root, G.box(0.18, 0.4, ISLAND.d - 1.4), mat('#5a9ae8', { roughness: 0.4 }), cx + s * (canalW / 2 + 0.06), 0.2, 0);
  const water = waterize(new THREE.MeshStandardMaterial({ color: '#7ac8f0', roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.85 }), { strength: 0.4 });
  add(root, G.plane(canalW, ISLAND.d - 1.5), water, cx, 0.16, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // はね橋（西側に蝶番。はじめは上がっている）
  const db = (R.drawbridge = group(root, CANAL[0], 0.2, TRACK_Z));
  db.userData.dynamic = true;
  add(db, G.box(canalW, 0.18, 2.4), new THREE.MeshStandardMaterial({ map: woodTex('#e8402e'), roughness: 0.5 }), canalW / 2, 0, 0);
  for (const s of [-1, 1]) add(db, G.box(canalW, 0.12, 0.1), mat('#c8ccd4', { metalness: 0.4, roughness: 0.35 }), canalW / 2, 0.15, s * 0.55, { cast: false });
  for (let i = 0; i < 5; i++) add(db, G.box(0.24, 0.08, 1.6), mat('#5a4434'), 0.3 + i * 0.55, 0.1, 0, { cast: false });
  db.rotation.z = 1.2;
  // 橋のたもとの塔（積み木）と鎖
  for (const s of [-1, 1]) {
    add(root, G.box(0.9, 3.2, 0.9), blockMat(s < 0 ? 'は' : 'し', s < 0 ? '#3a7ae8' : '#e8402e'), CANAL[0] - 0.6, 1.6, TRACK_Z + s * 1.7);
    add(root, G.box(1.0, 0.25, 1.0), mat('#f0c830'), CANAL[0] - 0.6, 3.33, TRACK_Z + s * 1.7);
  }
  // 木琴の橋（川をわたる。けんばんの色と音）
  const xylo = (R.xylo = group(root, cx, 0.32, 9.5));
  const XN = ['ド', 'レ', 'ミ', 'ソ', 'ラ'];
  for (const s of [-1, 1]) add(xylo, G.box(canalW + 1.2, 0.14, 0.18), mat('#c8925a'), 0, -0.05, s * 0.85);
  XN.forEach((n, i) => {
    const keyM = new THREE.MeshStandardMaterial({ map: canvasTex(128, 256, (ctx, w, h) => {
      ctx.fillStyle = NOTE_COLORS[i]; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, w, 20);
      ctx.fillStyle = '#fffaf0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 64px ${FONT}`; ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(n, 0, 0); ctx.restore();
    }), roughness: 0.4 });
    add(xylo, G.box(0.56, 0.12, 2.0 - i * 0.12), keyM, -canalW / 2 - 0.2 + i * 0.75, 0.06, 0);
    for (const s of [-1, 1]) add(xylo, G.sphere(0.05, 6, 4), mat('#c8ccd4'), -canalW / 2 - 0.2 + i * 0.75, 0.13, s * 0.7, { cast: false });
  });
  // ばち
  add(root, G.cyl(0.03, 0.03, 0.9, 6), mat('#c8925a'), CANAL[1] + 1.0, 0.1, 10.9, { rot: [0, 0.3, Math.PI / 2] });
  add(root, G.sphere(0.1, 10, 8), mat('#e8402e'), CANAL[1] + 1.45, 0.1, 10.75);

  // ---------------- 時計塔（オルゴールの大ゼンマイ） ----------------
  const tw = (R.tower = group(root, 3, 0, -12.6));
  add(tw, G.box(4.6, 3.0, 4.6), blockMat('と', '#3a7ae8'), 0, 1.5, 0);
  add(tw, G.box(3.6, 6.2, 3.6), mat('#f4e0b0', { roughness: 0.55 }), 0, 6.1, 0);
  for (const s of [-1, 1]) add(tw, G.box(0.25, 6.2, 0.25), mat('#e8402e'), s * 1.8, 6.1, 1.8);
  add(tw, G.box(4.2, 2.8, 4.2), mat('#e8402e', { roughness: 0.5 }), 0, 10.6, 0);
  add(tw, G.cone(3.3, 3.2, 4), mat('#3a7ae8', { roughness: 0.5 }), 0, 13.6, 0, { rot: [0, Math.PI / 4, 0] });
  add(tw, G.sphere(0.3, 12, 8), mat('#f0c830', { metalness: 0.3, roughness: 0.3 }), 0, 15.35, 0);
  // 文字盤と針
  add(tw, G.circle(1.2, 32), new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.6 }), 0, 10.6, 2.12, { cast: false });
  const hands = (R.hands = group(tw, 0, 10.6, 2.16));
  hands.userData.dynamic = true;
  R.hourHand = add(hands, G.box(0.1, 0.62, 0.04), mat('#2a2a3a'), 0, 0.26, 0, { cast: false });
  R.minHand = add(hands, G.box(0.07, 0.95, 0.04), mat('#2a2a3a'), 0, 0.42, 0.02, { cast: false });
  R.hourPivot = group(hands); R.minPivot = group(hands);
  R.hourPivot.add(R.hourHand); R.minPivot.add(R.minHand);
  R.hourPivot.rotation.z = -2.2; R.minPivot.rotation.z = 0.5;
  add(hands, G.sphere(0.09, 8, 6), mat('#f0c830'), 0, 0, 0.04, { cast: false });
  // 歯車の窓（中で歯車が回る）
  add(tw, G.box(2.4, 2.0, 0.1), mat('#5a3a24'), 0, 5.6, 1.82);
  add(tw, G.box(2.1, 1.7, 0.06), new THREE.MeshStandardMaterial({ color: '#3a3040', roughness: 0.9 }), 0, 5.6, 1.86, { cast: false });
  const gw = (R.gearWin = group(tw, 0, 5.6, 1.92));
  gw.userData.dynamic = true;
  const gm = mat('#e8c25a', { metalness: 0.35, roughness: 0.35 });
  R.winGears = [[-0.65, 0.2, 12, 0.45], [0.15, -0.25, 24, 0.75], [0.8, 0.45, 8, 0.32]].map(([x, y, n, rr], i) => {
    const m = gearMesh(n, rr, i === 1 ? mat('#c8ccd4', { metalness: 0.35, roughness: 0.35 }) : gm, 0.06);
    m.position.set(x, y, 0);
    m.visible = i === 0; // 大ゼンマイの歯車だけ。ほかはなくなっている
    m.userData.n = n;
    gw.add(m);
    return m;
  });
  R.gearPlate = add(tw, G.box(1.2, 0.36, 0.05), new THREE.MeshStandardMaterial({ map: canvasTex(256, 80, (ctx, w, h) => {
    ctx.fillStyle = '#e8c25a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#5a3a14'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 30px ${FONT}`; ctx.fillText('はぐるま', w / 2, h / 2 + 2);
  }), metalness: 0.3, roughness: 0.4 }), 0, 4.35, 1.88, { cast: false });
  // 大ゼンマイ（東側の大きな蝶の鍵）
  const bk = (R.bigKey = group(tw, 2.3, 7.4, 0));
  bk.userData.dynamic = true;
  bk.rotation.y = Math.PI / 2;
  const km = mat('#e2b54a', { metalness: 0.35, roughness: 0.32 });
  add(bk, G.cyl(0.2, 0.2, 1.2, 12), km, 0, 0, 0.6, { rot: [Math.PI / 2, 0, 0] });
  for (const k of [-1, 1]) add(bk, G.sphere(1.1, 18, 12), km, 0, k * 1.0, 1.3, { scale: [0.2, 0.85, 0.65] });
  add(bk, G.sphere(0.32, 12, 8), km, 0, 0, 1.3);
  // 巻き台（ここにハンドルをさす）
  const crank = (R.crank = group(root, 6.6, 0, -10.2));
  add(crank, G.box(1.2, 1.2, 1.2), blockMat('ま', '#4ab04a'), 0, 0.6, 0);
  add(crank, G.cyl(0.12, 0.12, 0.3, 10), mat('#5a5a6a', { metalness: 0.4 }), 0, 0.9, 0.7, { rot: [Math.PI / 2, 0, 0] });
  const ch = (R.crankHandle = group(crank, 0, 0.9, 0.85));
  ch.userData.dynamic = true;
  add(ch, G.box(0.12, 0.9, 0.1), mat('#e8402e', { roughness: 0.4 }), 0, 0.4, 0);
  add(ch, G.cyl(0.08, 0.08, 0.4, 10), mat('#f0c830'), 0, 0.82, 0.2, { rot: [Math.PI / 2, 0, 0] });
  ch.visible = false;

  // ---------------- 町の入口の門「はるの まち」 ----------------
  const gate = (R.gate = group(root, -11.5, 0, 0.9));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add(gate, G.box(0.9, 0.9, 0.9), blockMat((s < 0 ? ['あ', 'い', 'う'] : ['か', 'き', 'く'])[2 - i], BLOCK_COLS[(i + (s > 0 ? 3 : 0)) % 6]), s * 1.9, 0.45 + i * 0.9, 0, { rot: [0, i * 0.08 * s, 0] });
  ['は', 'る', 'の', 'ま', 'ち'].forEach((ch2, i) => add(gate, G.box(0.85, 0.85, 0.85), blockMat(ch2, BLOCK_COLS[i % 6]), -1.8 + i * 0.9, 3.15, 0));

  // ---------------- オルゴール（ウサギがのる台） ----------------
  const mb = (R.musicBox = group(root, OVAL.x, 0, OVAL.z));
  const wood = new THREE.MeshStandardMaterial({ map: woodTex('#b8743a'), roughness: 0.5 });
  add(mb, G.box(3.0, 1.1, 2.0), wood, 0, 0.55, 0);
  add(mb, G.box(3.06, 0.12, 2.06), mat('#e8c25a', { metalness: 0.3, roughness: 0.35 }), 0, 1.1, 0);
  // ふた（うしろが蝶番で、開いている）
  const lid = group(mb, 0, 1.12, -1.0);
  lid.rotation.x = -1.95;
  add(lid, G.box(3.0, 0.12, 2.0), wood, 0, 0.06, 1.0);
  add(lid, G.box(2.6, 0.02, 1.6), new THREE.MeshStandardMaterial({ color: '#c8d0e8', roughness: 0.1, metalness: 0.5 }), 0, 0.13, 1.0, { cast: false });
  // 中の太鼓（ピンつき）とくし歯
  const drum = (R.drum = group(mb, -0.3, 1.25, -0.45));
  drum.userData.dynamic = true;
  add(drum, G.cyl(0.24, 0.24, 1.6, 20), mat('#e8c25a', { metalness: 0.35, roughness: 0.3 }), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2; add(drum, G.cyl(0.015, 0.015, 0.08, 4), mat('#c8ccd4'), -0.7 + r() * 1.4, Math.cos(a) * 0.26, Math.sin(a) * 0.26, { rot: [a, 0, 0], cast: false }); }
  for (let i = 0; i < 12; i++) add(mb, G.box(0.06, 0.03, 0.42 - i * 0.012), mat('#c8ccd4', { metalness: 0.4, roughness: 0.3 }), -0.95 + i * 0.12, 1.2, -0.05);
  // ウサギの回る台
  const ped = (R.pedestal = group(mb, 0.8, 1.16, 0.45));
  ped.userData.dynamic = true;
  add(ped, G.cyl(0.42, 0.46, 0.14, 24), mat('#f4a8c0', { roughness: 0.4 }), 0, 0.07, 0);
  add(ped, G.torus(0.44, 0.03, 6, 24), mat('#e8c25a'), 0, 0.12, 0, { rot: [Math.PI / 2, 0, 0] });
  // 横のねじ（巻くところ）
  add(mb, G.cyl(0.08, 0.08, 0.3, 8), mat('#e8c25a'), 1.65, 0.6, 0, { rot: [0, 0, Math.PI / 2] });

  // ---------------- おもちゃの線路（楕円） ----------------
  const ov = (R.oval = group(root));
  const ovCurve = (R.ovalCurve = new THREE.EllipseCurve(OVAL.x, OVAL.z, OVAL.rx, OVAL.rz, 0, Math.PI * 2, false));
  for (const off of [-0.35, 0.35]) {
    const pts = ovCurve.getPoints(80).map((p) => {
      const n = new THREE.Vector2(p.x - OVAL.x, p.y - OVAL.z).normalize();
      return new THREE.Vector3(p.x + n.x * off, 0.12, p.y + n.y * off);
    });
    add(ov, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.05, 6, true), mat('#c8ccd4', { metalness: 0.35, roughness: 0.35 }), 0, 0, 0, { cast: false });
  }
  {
    const n = 64;
    const inst = new THREE.InstancedMesh(G.box(0.16, 0.08, 1.0), mat('#b8743a'), n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const p = ovCurve.getPoint(t), q = ovCurve.getPoint((t + 0.001) % 1);
      d.position.set(p.x, 0.05, p.y);
      d.rotation.set(0, -Math.atan2(q.y - p.y, q.x - p.x), 0);
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
    }
    inst.receiveShadow = true;
    ov.add(inst);
  }
  // 小さな駅（楕円の手前）
  const mini = group(root, OVAL.x - 3.6, 0, OVAL.z + OVAL.rz + 0.4);
  add(mini, G.box(2.0, 0.3, 0.7), mat('#f0c830', { roughness: 0.5 }), 0, 0.15, 0);
  for (const s of [-1, 1]) add(mini, G.cyl(0.04, 0.04, 1.1, 6), mat('#e8402e'), s * 0.85, 0.85, 0);
  add(mini, G.box(2.1, 0.08, 0.8), mat('#3a7ae8'), 0, 1.4, 0);

  // ---------------- 積み木の恐竜の、おしりの下の楽譜（⚀） ----------------
  const pips = (n) => canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fbf6f0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = n === 1 ? '#e8402e' : '#2a2a3a';
    const P = { 1: [[64, 64]], 2: [[36, 36], [92, 92]] }[n];
    for (const [x, y] of P) { ctx.beginPath(); ctx.arc(x, y, n === 1 ? 20 : 15, 0, Math.PI * 2); ctx.fill(); }
  });
  const scoreRow = (parent, notes, n, s = 0.55) => {
    const g = group(parent);
    add(g, G.box(s, s, s), new THREE.MeshStandardMaterial({ map: pips(n), roughness: 0.5 }), 0, s / 2, 0);
    notes.forEach((k, i) => add(g, G.box(s, s, s), mat(NOTE_COLORS[k], { roughness: 0.45 }), (i + 1) * (s + 0.06), s / 2, 0));
    return g;
  };
  R.score1 = scoreRow(root, SCORE[0], 1);
  R.score1.position.set(-16.2, 0, 7.2);
  // ⚁ はブリキの機関車の貨車にのせる（index.js で）
  R.scoreRow = scoreRow;

  // ---------------- 砂場（ロボット犬の歯車箱がうまっている） ----------------
  const sb = (R.sandbox = group(root, 9.2, 0, 2.4));
  for (const [x, z, w2, d2] of [[0, -1.6, 4.4, 0.25], [0, 1.6, 4.4, 0.25], [-2.1, 0, 0.25, 3.2], [2.1, 0, 0.25, 3.2]]) add(sb, G.box(w2, 0.4, d2), mat('#e8402e', { roughness: 0.5 }), x, 0.2, z);
  add(sb, G.box(4.0, 0.22, 3.0), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (ctx, w, h) => {
    const rr = rng(94); ctx.fillStyle = '#f0d8a0'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { ctx.fillStyle = rr() > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(160,120,60,0.25)'; ctx.fillRect(rr() * w, rr() * h, 2, 2); }
  }), roughness: 1 }), 0, 0.11, 0);
  // 砂の山（あとで掘る）と、おもちゃのバケツ・スコップ・砂の城
  R.sandMound = add(sb, G.sphere(0.6, 14, 8), mat('#e8cc90', { roughness: 1 }), -0.9, 0.12, 0.4, { scale: [1, 0.45, 1] });
  R.sandMound.userData.keep = true;
  const bucket = group(sb, 1.0, 0.22, 0.7);
  add(bucket, G.cyl(0.32, 0.24, 0.5, 18, true), mat('#3a7ae8', { roughness: 0.4, side: THREE.DoubleSide }), 0, 0.25, 0);
  add(bucket, G.torus(0.27, 0.02, 4, 16, Math.PI), mat('#f0c830'), 0, 0.5, 0, { rot: [0, 0.4, 0] });
  add(sb, G.box(0.18, 0.04, 0.7), mat('#f0c830', { roughness: 0.4 }), 0.3, 0.25, -0.6, { rot: [0, 0.8, 0] });
  const castle = group(sb, 1.0, 0.22, -0.6);
  add(castle, G.cyl(0.45, 0.5, 0.45, 12), mat('#e8cc90', { roughness: 1 }), 0, 0.22, 0);
  add(castle, G.cyl(0.25, 0.3, 0.35, 10), mat('#e8cc90', { roughness: 1 }), 0, 0.6, 0);
  add(castle, G.cone(0.08, 0.2, 4), mat('#e8402e'), 0, 0.9, 0);
  // 歯車箱（はじめは砂の中）
  const gbox = (R.gearBox = group(sb, -0.9, 0.2, 0.4));
  gbox.userData.dynamic = true;
  add(gbox, G.box(0.7, 0.4, 0.5), mat('#5a7a9a', { metalness: 0.3, roughness: 0.4 }), 0, 0.2, 0);
  add(gbox, G.box(0.72, 0.06, 0.52), mat('#e8c25a'), 0, 0.42, 0);
  gbox.visible = false;

  // ---------------- 積み木の迷路（ゼンマイ行進） ----------------
  const mz = (R.maze = group(root));
  const C = MAZE_POS.cell;
  add(mz, G.box(C * 5 + 0.3, 0.06, C * 5 + 0.3), mat('#fbf0d8', { roughness: 0.8 }), MAZE_POS.x, 0.03, MAZE_POS.z);
  // マスの線
  for (let i = 0; i <= 5; i++) {
    add(mz, G.box(C * 5, 0.02, 0.04), mat('#d8c8a8'), MAZE_POS.x, 0.065, MAZE_POS.z - C * 2.5 + i * C, { cast: false });
    add(mz, G.box(0.04, 0.02, C * 5), mat('#d8c8a8'), MAZE_POS.x - C * 2.5 + i * C, 0.065, MAZE_POS.z, { cast: false });
  }
  const wallLetters = ['め', 'い', 'ろ', 'あ', 'そ', 'ぼ', 'う'];
  let wi = 0;
  MAZE.forEach((row, rr) => [...row].forEach((ch2, c) => {
    if (ch2 !== '#') return;
    const p = mazeCell(c, rr);
    add(mz, G.box(1.1, 1.1, 1.1), blockMat(wallLetters[wi % 7], BLOCK_COLS[wi % 6]), p.x, 0.55, p.z, { rot: [0, (wi % 3 - 1) * 0.06, 0] });
    wi++;
  }));
  // まわりの低いさく
  const fm = mat('#f0c830', { roughness: 0.5 });
  const half = C * 2.5 + 0.2;
  add(mz, G.box(half * 2, 0.35, 0.15), fm, MAZE_POS.x, 0.18, MAZE_POS.z - half);
  for (const s of [-1, 1]) add(mz, G.box(0.15, 0.35, half * 2), fm, MAZE_POS.x + s * half, 0.18, MAZE_POS.z);
  for (const s of [-1, 1]) add(mz, G.box(half - C * 0.5, 0.35, 0.15), fm, MAZE_POS.x + s * (half + C * 0.5) / 2, 0.18, MAZE_POS.z + half);
  // 奥のハンドル
  const gp = mazeCell(4, 0);
  const hd = (R.mazeHandle = group(root, gp.x, 0, gp.z));
  hd.userData.dynamic = true;
  add(hd, G.box(0.12, 0.9, 0.1), mat('#e8402e', { roughness: 0.4 }), 0, 0.1, 0, { rot: [Math.PI / 2, 0, 0.3] });
  add(hd, G.cyl(0.08, 0.08, 0.4, 10), mat('#f0c830'), 0.15, 0.25, 0.3, { rot: [0, 0, 0] });
  add(hd, G.cyl(0.12, 0.12, 0.08, 12), mat('#5a5a6a', { metalness: 0.4 }), -0.12, 0.08, -0.42, { rot: [Math.PI / 2, 0, 0] });
  // 矢印タイル（正解のときだけ置く）
  R.mazeArrows = group(root);
  R.mazeArrows.userData.dynamic = true;
  R.mazeArrows.visible = false;
  R.arrowTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a7ae8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(64, 14); ctx.lineTo(108, 64); ctx.lineTo(80, 64); ctx.lineTo(80, 114); ctx.lineTo(48, 114); ctx.lineTo(48, 64); ctx.lineTo(20, 64); ctx.closePath(); ctx.fill();
  });
  // 迷路の看板
  const ms = group(root, MAZE_POS.x - 3.0, 0, MAZE_POS.z + 3.2, 0.3);
  add(ms, G.cyl(0.05, 0.05, 1.2, 6), mat('#c8925a'), 0, 0.6, 0);
  add(ms, G.box(1.4, 0.55, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(256, 100, (ctx, w, h) => {
    ctx.fillStyle = '#fbf6f0'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#4ab04a'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#2a2a3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 40px ${FONT}`; ctx.fillText('つみきめいろ', w / 2, h / 2 + 2);
  }), roughness: 0.6 }), 0, 1.25, 0);

  // ---------------- 家なみ ----------------
  const houses = [
    blockHouse(root, -18.8, -12.6, { w: 3.4, h: 2.6, roof: '#3a7ae8', wall: '#fbe8c0', letter: 'あ', seed: 1 }),
    blockHouse(root, -11.6, -13.2, { w: 3.0, h: 3.2, roof: '#4ab04a', wall: '#f8d8d8', seed: 2 }),
    tinHouse(root, 11.2, -12.4, { r: 1.4, h: 3.0, body: '#e8c25a', roof: '#e8402e' }),
    blockHouse(root, 20.3, -12.0, { w: 2.8, h: 2.4, roof: '#f08a2a', wall: '#e0f0ff', seed: 4 }),
    blockHouse(root, -19.0, 12.4, { w: 3.2, h: 2.4, roof: '#e8402e', wall: '#e8f4d8', letter: 'る', seed: 5 }),
    tinHouse(root, 0.4, 13.8, { r: 1.2, h: 2.4, body: '#9ab0c8', roof: '#3a7ae8' }),
    blockHouse(root, 20.2, 2.8, { w: 2.6, h: 2.2, roof: '#b05ad8', wall: '#fbe8c0', ry: -Math.PI / 2, seed: 3 }),
  ];
  for (const h of houses) R.winMats.push(h.win);
  // ブリキのロケット（川の東）
  const rk = group(root, 20.6, 0, 10.4);
  add(rk, G.cyl(0.55, 0.65, 2.6, 20), mat('#fbf6f0', { roughness: 0.35, metalness: 0.2 }), 0, 1.6, 0);
  add(rk, G.cone(0.55, 1.2, 20), mat('#e8402e', { roughness: 0.35 }), 0, 3.5, 0);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(rk, G.box(0.08, 0.9, 0.6), mat('#e8402e'), Math.cos(a) * 0.65, 0.5, Math.sin(a) * 0.65, { rot: [0, -a, 0] }); }
  add(rk, G.circle(0.22, 16), mat('#7ac8f0', { roughness: 0.1 }), 0, 2.2, 0.62, { cast: false });
  // 色えんぴつのさく（奥）
  crayonFence(root, -21.5, -15.6, -15.6, 95);
  crayonFence(root, -6.0, -1.2, -15.6, 96);
  crayonFence(root, 7.0, 14.8, -15.6, 97);
  // 大きなビー玉（はざま駅の思い出）
  add(root, G.sphere(0.8, 24, 16), new THREE.MeshStandardMaterial({ color: '#5fc6e8', roughness: 0.05, transparent: true, opacity: 0.75 }), -20.6, 0.8, 3.6);
  // ペロペロキャンディの街灯
  for (const [x, z, c] of [[-9.2, -1.0, '#ff8ab0'], [-13.6, 3.0, '#8ac8ff'], [2.4, -1.0, '#ffd870'], [6.2, 6.0, '#9af08a'], [-9.6, 8.4, '#ff8ab0'], [13.6, -1.0, '#8ac8ff'], [2.4, 9.6, '#ffd870'], [-16.0, -1.0, '#9af08a']]) candyLamp(root, x, z, R.lampMats, c);
  // 積み木の山・転がる積み木
  for (const [x, z, n] of [[-20.8, 6.6, 3], [14.0, 14.6, 2], [-0.6, -15.2, 2], [21.2, -5.0, 3]]) {
    for (let i = 0; i < n; i++) add(root, G.box(0.8, 0.8, 0.8), mat(BLOCK_COLS[(i + Math.abs(Math.round(x))) % 6], { roughness: 0.5 }), x + (i % 2) * 0.3, 0.4 + i * 0.8, z, { rot: [0, i * 0.4, 0] });
  }
  for (const [x, z, ry] of [[8.0, 15.4, 0.4], [-3.0, 15.2, 1.1], [-15.4, 15.0, 0.7], [13.0, 6.0, 0.2]]) add(root, G.cyl(0.4, 0.4, 0.8, 3), mat(BLOCK_COLS[Math.abs(Math.round(x)) % 6], { roughness: 0.5 }), x, 0.35, z, { rot: [Math.PI / 2, ry, 0] });
  return R;
}
