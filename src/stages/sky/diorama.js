import * as THREE from 'three';
import { add, mat, glow, G, group, rng, signTex, roundRectShape } from '../../lib/util.js';
import { lampPost, bench, flowerPatch, tree, bush, windowFrame } from '../station/diorama.js';
import { grassTex, boardsTex, planksTex, shinglesTex, stoneTex } from '../station/textures.js';
import { cobbleTex, stripeTex, plasterTex, clockFace2Tex, skySignTex, rainbowColors } from './textures.js';

// ---------------------------------------------------------------
// 天空の街の箱庭
// 島は x[-15,15] z[-11,11]、線路は z=-6、ホーム上面 y=0.75
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
const FLOOR = 0.75;
export const BELL_COLORS = ['#e8443a', '#f4f6ff', '#f2c33a', '#3a7ee8', '#4ab06a'];

/** 白い塔の家（青いとんがり屋根） */
function towerHouse(parent, x, z, { r = 1.0, h = 2.6, roof = '#4a72c8', ry = 0, vane = true, seed = 1 } = {}) {
  const g = group(parent, x, 0, z, ry);
  const wallM = new THREE.MeshStandardMaterial({ map: plasterTex(), roughness: 0.9 });
  add(g, G.cyl(r * 1.08, r * 1.12, 0.3, 18), mat('#c8c2b6'), 0, 0.15, 0);
  add(g, G.cyl(r, r, h, 18), wallM, 0, h / 2 + 0.3, 0);
  add(g, G.cyl(r * 1.05, r * 1.05, 0.08, 18), mat('#5a7ac8'), 0, h + 0.3, 0);
  add(g, G.cone(r * 1.35, r * 1.9, 18), shinglesMat(roof), 0, h + 0.3 + r * 0.95, 0);
  // 扉と窓
  add(g, G.box(0.5, 0.95, 0.1), mat('#7a5a3a'), 0, 0.78, r - 0.02);
  add(g, G.cyl(0.25, 0.25, 0.1, 12, false), mat('#7a5a3a'), 0, 1.25, r - 0.02, { rot: [Math.PI / 2, 0, 0] });
  const win = glow('#ffe7a0', 0.6);
  win.userData.lamp = true;
  for (const a of [0.9, -0.9]) {
    add(g, G.circle(0.18, 14), win, Math.sin(a) * (r + 0.01), h * 0.75 + 0.3, Math.cos(a) * (r + 0.01), { rot: [0, a, 0], cast: false });
    add(g, G.torus(0.19, 0.035, 6, 14), mat('#5a7ac8'), Math.sin(a) * (r + 0.02), h * 0.75 + 0.3, Math.cos(a) * (r + 0.02), { rot: [0, a, 0], cast: false });
  }
  // 窓辺の花
  add(g, G.box(0.5, 0.12, 0.16), mat('#c8643c'), Math.sin(0.9) * (r + 0.08), h * 0.75 + 0.05, Math.cos(0.9) * (r + 0.08), { rot: [0, 0.9, 0] });
  for (let i = 0; i < 4; i++) add(g, G.sphere(0.05), mat(['#ff8fa8', '#ffd25a', '#ffffff'][i % 3]), Math.sin(0.9) * (r + 0.08) + Math.cos(0.9) * (i - 1.5) * 0.11, h * 0.75 + 0.15, Math.cos(0.9) * (r + 0.08) - Math.sin(0.9) * (i - 1.5) * 0.11, { cast: false });
  let vaneG = null;
  if (vane) {
    vaneG = group(g, 0, h + 0.3 + r * 1.9, 0);
    add(vaneG, G.cyl(0.02, 0.02, 0.5, 6), mat('#3a3a40'), 0, 0.25, 0);
    const arrow = group(vaneG, 0, 0.45, 0);
    add(arrow, G.box(0.5, 0.03, 0.03), mat('#e2bf62', { metalness: 0.7 }), 0, 0, 0);
    add(arrow, G.cone(0.06, 0.12, 4), mat('#e2bf62', { metalness: 0.7 }), 0.27, 0, 0, { rot: [0, 0, -Math.PI / 2] });
    add(arrow, G.box(0.02, 0.14, 0.14), mat('#e2bf62', { metalness: 0.7 }), -0.24, 0, 0, { rot: [Math.PI / 4, 0, 0] });
    arrow.userData.dynamic = true;
    vaneG.userData.arrow = arrow;
  }
  return { g, vane: vaneG, win };
}

const shingleCache = new Map();
function shinglesMat(c) {
  if (!shingleCache.has(c)) shingleCache.set(c, new THREE.MeshStandardMaterial({ map: shinglesTex(c, [4, 2]), roughness: 0.85 }));
  return shingleCache.get(c);
}

/** 雲のかたまり */
function cloudPuff(parent, x, y, z, s = 1, color = '#ffffff', seed = 1, n = 6) {
  const r = rng(seed);
  const g = group(parent, x, y, z);
  const m = mat(color, { roughness: 1 });
  for (let i = 0; i < n; i++) {
    add(g, G.ico(0.5 * s * (0.7 + r() * 0.6), 2), m, (r() - 0.5) * 1.6 * s, (r() - 0.3) * 0.5 * s, (r() - 0.5) * 0.9 * s, { cast: false });
  }
  return g;
}

/** 歯車の形 */
export function gearGeometry(r = 0.5, teeth = 10, depth = 0.12) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.8 : r;
    if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

export function buildSkyDiorama(scene) {
  const root = group(scene);
  const R = { root, lights: [], lampGlass: [], vanes: [] };
  const plaster = new THREE.MeshStandardMaterial({ map: plasterTex(), roughness: 0.9 });
  const wood = mat('#8a5d3b');
  const darkWood = mat('#5b3a29');
  const gold = mat('#e2bf62', { metalness: 0.75, roughness: 0.3 });
  const blueTrim = mat('#4a72c8');

  // ---------------- 地面と雲のすそ ----------------
  const grass = new THREE.MeshStandardMaterial({ map: grassTex('#9cc96a', [10, 7]), roughness: 1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(29.6, 21.6, 2.4), 12), grass, 0, 0.002, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const r0 = rng(21);
  const skirt = group(root);
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    // 角丸長方形の外周に沿って雲を置く
    let x, z;
    const per = t * 4;
    if (per < 1) { x = -15 + per * 30; z = 11.2; } else if (per < 2) { x = 15.2; z = 11 - (per - 1) * 22; } else if (per < 3) { x = 15 - (per - 2) * 30; z = -11.2; } else { x = -15.2; z = -11 + (per - 3) * 22; }
    const s = 0.9 + r0() * 0.9;
    add(skirt, G.ico(s, 2), mat('#eef3fb', { roughness: 1 }), x + (r0() - 0.5), -0.6 - r0() * 1.2, z + (r0() - 0.5), { cast: false, scale: [1.3, 0.7, 1.1] });
  }

  const cobble = new THREE.MeshStandardMaterial({ map: cobbleTex('#ece6d8', [5, 5]), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
  add(root, new THREE.CircleGeometry(4.9, 40), cobble, 0, 0.012, 2.5, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const pathMat = new THREE.MeshStandardMaterial({ map: cobbleTex('#e2dccc', [2, 6]), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
  const paths = [
    [-7.2, 4.6, 5.2, 1.6, 0.6, 0.35], // 時計台へ
    [6.4, 4.0, 5.0, 1.6, 0.6, -0.15], // 郵便局へ
    [-6.4, 0.6, 4.4, 1.5, 0.6, -0.4], // 仕立て屋へ
    [7.6, 0.2, 7.2, 1.4, 0.6, 0.55], // 気球へ
    [-4.3, -1.6, 1.6, 2.4, 0.6, 0], // ホームへ
    [4.5, -6.6, 1.4, 6.2, 0.6, 0.0], // 風車へ（線路をまたぐ）
    [11.3, 6.6, 3.0, 1.3, 0.5, -0.7], // バラのアーチへ
  ];
  for (const [x, z, w, d, rr, ry] of paths) {
    add(root, new THREE.ShapeGeometry(roundRectShape(w, d, rr), 8), pathMat, x, 0.01, z, { rot: [-Math.PI / 2, 0, ry], cast: false });
  }

  // ---------------- ホーム ----------------
  const platStone = new THREE.MeshStandardMaterial({ map: stoneTex('#eef0f4', [8, 1]), roughness: 0.9 });
  add(root, G.box(11, FLOOR, 2.35), platStone, -7.5, FLOOR / 2, -3.78);
  add(root, G.box(11.1, 0.06, 0.3), mat('#ffffff'), -7.5, FLOOR + 0.03, -4.8);
  add(root, G.box(11.1, 0.02, 0.06), mat('#7ab0f0'), -7.5, FLOOR + 0.065, -4.58, { cast: false });
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, FLOOR * (3 - i) / 3, 0.35), platStone, -4.3, FLOOR * (3 - i) / 6, -2.42 + i * 0.35);
  // 駅名標
  const sign = (R.stationSign = group(root, -6.2, FLOOR, -4.45));
  for (const s of [-1, 1]) add(sign, G.cyl(0.05, 0.05, 1.9, 8), mat('#3a5a9a'), s * 1.0, 0.95, 0);
  add(sign, G.box(2.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ map: skySignTex(), roughness: 0.6 }), 0, 1.5, 0.02);
  // あずまや
  const kiosk = (R.kiosk = group(root, -10.2, FLOOR, -3.6));
  for (const [x, z] of [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]]) add(kiosk, G.cyl(0.06, 0.06, 2.2, 8), mat('#ffffff'), x, 1.1, z);
  add(kiosk, G.cone(1.6, 1.0, 6), shinglesMat('#4a72c8'), 0, 2.7, 0, { rot: [0, Math.PI / 6, 0] });
  add(kiosk, G.sphere(0.12), gold, 0, 3.25, 0);
  bench(kiosk, 0, 0, 0.2, 0, 1.4);
  const pl1 = lampPost(root, -2.6, -4.45, { y: FLOOR, lights: R.lights, intensity: 1.2 });
  R.lampGlass.push(pl1.glass);

  // ---------------- 噴水 ----------------
  const ft = (R.fountain = group(root, 0, 0, 2.5));
  const fStone = new THREE.MeshStandardMaterial({ map: stoneTex('#f2f0ea', [6, 1]), roughness: 0.9 });
  add(ft, new THREE.CylinderGeometry(1.7, 1.8, 0.55, 32, 1, true), fStone, 0, 0.275, 0);
  add(ft, new THREE.CylinderGeometry(1.5, 1.5, 0.55, 32, 1, true), mat('#d8d4cc', { side: THREE.BackSide }), 0, 0.275, 0, { cast: false });
  add(ft, G.torus(1.6, 0.13, 8, 36), mat('#ffffff'), 0, 0.56, 0, { rot: [Math.PI / 2, 0, 0] });
  const water = new THREE.MeshStandardMaterial({ color: '#8fd0f0', emissive: '#3a90c8', emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
  add(ft, G.circle(1.52, 32), water, 0, 0.42, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(ft, G.cyl(0.25, 0.35, 1.3, 16), fStone, 0, 0.9, 0);
  add(ft, G.cyl(0.8, 0.5, 0.2, 24), fStone, 0, 1.6, 0);
  add(ft, G.circle(0.72, 24), water, 0, 1.71, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  cloudPuff(ft, 0, 2.1, 0, 0.55, '#ffffff', 5, 5);
  R.fountainTop = new THREE.Vector3(0, 2.4, 2.5);
  // 噴水に浮かぶ雲のわた
  R.fountainCotton = cloudPuff(ft, 0.9, 0.55, 0.55, 0.3, '#ffffff', 9, 4);
  R.fountainCotton.userData.dynamic = true;

  // ---------------- 時計台（鐘楼） ----------------
  const tw = (R.tower = group(root, -9.6, 0, 5.2));
  add(tw, G.cyl(1.65, 1.75, 0.5, 20), mat('#c8c2b6'), 0, 0.25, 0);
  add(tw, G.cyl(1.4, 1.5, 6.0, 20), plaster, 0, 3.5, 0);
  add(tw, G.cyl(1.48, 1.48, 0.15, 20), blueTrim, 0, 6.55, 0);
  add(tw, G.box(0.8, 1.4, 0.12), mat('#7a5a3a'), 0, 1.2, 1.42);
  add(tw, G.cyl(0.4, 0.4, 0.12, 14), mat('#7a5a3a'), 0, 1.9, 1.42, { rot: [Math.PI / 2, 0, 0] });
  windowFrame(tw, 0, 3.3, 1.43, 0.4, 0.6, 0, glow('#ffe7a0', 0.5), mat('#4a72c8'));
  // 時計
  add(tw, G.cyl(0.75, 0.75, 0.1, 32), blueTrim, 0, 5.2, 1.43, { rot: [Math.PI / 2, 0, 0] });
  add(tw, G.cyl(0.65, 0.65, 0.02, 32), new THREE.MeshStandardMaterial({ map: clockFace2Tex() }), 0, 5.2, 1.49, { rot: [Math.PI / 2, Math.PI / 2, 0], cast: false });
  R.clockHand = group(tw, 0, 5.2, 1.51);
  add(R.clockHand, G.box(0.05, 0.5, 0.02), mat('#2a3a6a'), 0, 0.2, 0, { cast: false });
  R.clockHand.userData.dynamic = true;
  // 鐘楼
  add(tw, G.cyl(1.55, 1.55, 0.2, 20), mat('#ffffff'), 0, 6.7, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    add(tw, G.cyl(0.1, 0.1, 1.9, 8), mat('#ffffff'), Math.cos(a) * 1.35, 7.7, Math.sin(a) * 1.35);
  }
  add(tw, G.cyl(1.55, 1.55, 0.2, 20), mat('#ffffff'), 0, 8.7, 0);
  add(tw, G.cone(1.9, 2.4, 20), shinglesMat('#4a72c8'), 0, 10.0, 0);
  add(tw, G.cyl(0.03, 0.03, 0.9, 6), mat('#3a3a40'), 0, 11.6, 0);
  R.flag = add(tw, G.box(0.5, 0.3, 0.02), mat('#e8574a'), 0.27, 11.85, 0, { cast: false });
  R.flag.userData.keep = true;
  // 5つの鐘
  R.bells = [];
  add(tw, G.box(2.6, 0.08, 0.08), darkWood, 0, 8.4, 0.3);
  for (let i = 0; i < 5; i++) {
    const bg = group(tw, -1.0 + i * 0.5, 8.35, 0.3);
    const s = 1.15 - i * 0.08;
    add(bg, G.cyl(0.01, 0.01, 0.15, 4), mat('#3a3a40'), 0, -0.07, 0, { cast: false });
    add(bg, new THREE.CylinderGeometry(0.1 * s, 0.2 * s, 0.32 * s, 16, 1, true), mat('#e2bf62', { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }), 0, -0.28, 0);
    add(bg, G.sphere(0.1 * s, 12, 6), mat('#e2bf62', { metalness: 0.85, roughness: 0.25 }), 0, -0.13, 0, { scale: [1, 0.6, 1] });
    add(bg, G.sphere(0.045, 8, 6), mat('#3a3a40'), 0, -0.44 * s, 0, { cast: false });
    // 色のリボン
    add(bg, G.box(0.06, 0.18, 0.02), mat(BELL_COLORS[i]), 0, -0.02, 0.06, { cast: false });
    bg.userData.dynamic = true;
    R.bells.push(bg);
  }

  // 宝箱
  const chest = (R.chest = group(root, -6.8, 0, 6.8, -0.4));
  const chestWood = new THREE.MeshStandardMaterial({ map: planksTex('#a8693e', '#6e4a2e', 4), roughness: 0.8 });
  add(chest, G.box(1.0, 0.55, 0.65), chestWood, 0, 0.28, 0);
  for (const x of [-0.42, 0.42]) add(chest, G.box(0.06, 0.57, 0.67), gold, x, 0.28, 0);
  R.chestLid = group(chest, 0, 0.55, -0.32);
  const lidGeo = new THREE.CylinderGeometry(0.33, 0.33, 1.0, 16, 1, false, 0, Math.PI);
  lidGeo.rotateZ(Math.PI / 2);
  lidGeo.rotateX(Math.PI / 2);
  add(R.chestLid, lidGeo, chestWood, 0, 0, 0.32, { scale: [1, 0.55, 1] });
  for (const x of [-0.42, 0.42]) add(R.chestLid, G.box(0.06, 0.2, 0.67), gold, x, 0.08, 0.32);
  R.chestLid.userData.dynamic = true;
  // 鈴の錠前
  for (let i = 0; i < 5; i++) add(chest, G.sphere(0.045, 10, 8), mat(BELL_COLORS[i], { metalness: 0.4, roughness: 0.3 }), -0.2 + i * 0.1, 0.36, 0.34, { cast: false });
  add(chest, G.box(0.6, 0.18, 0.03), gold, 0, 0.36, 0.33, { cast: false });
  R.gearInChest = group(chest, 0, 0.45, 0);
  add(R.gearInChest, gearGeometry(0.28, 10, 0.08), gold, 0, 0, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  R.gearInChest.userData.dynamic = true;
  R.gearInChest.visible = false;

  // ---------------- 仕立て屋 ----------------
  const tailor = towerHouse(root, -10.9, -0.4, { r: 1.7, h: 2.5, roof: '#d8708a', ry: 0.7, seed: 3 });
  R.tailor = tailor.g;
  R.vanes.push(tailor.vane);
  const tsign = group(R.tailor, 0.0, 2.25, 1.78);
  add(tsign, G.box(1.3, 0.42, 0.06), new THREE.MeshStandardMaterial({ map: signTex('したてや', { w: 256, h: 96, bg: '#fff0f4', fg: '#a83a5a', border: '#d8708a', size: 48 }) }), 0, 0, 0);
  // 布の物干し
  const lineG = group(root, -8.6, 0, -2.6);
  for (const x of [-1.2, 1.2]) add(lineG, G.cyl(0.04, 0.04, 1.8, 6), wood, x, 0.9, 0);
  add(lineG, G.cyl(0.008, 0.008, 2.4, 4), mat('#ffffff'), 0, 1.7, 0, { rot: [0, 0, Math.PI / 2], cast: false });
  ['#f2a0b8', '#a8d0f8', '#fff2a8', '#c8f0c0'].forEach((c, i) => {
    add(lineG, G.box(0.4, 0.55 - i * 0.05, 0.01), mat(c, { side: THREE.DoubleSide }), -0.8 + i * 0.52, 1.42, 0, { cast: true });
  });

  // ---------------- 郵便局 ----------------
  const post = (R.post = group(root, 9.3, 0, 4.6));
  add(post, G.box(3.6, 0.3, 2.8), mat('#c8c2b6'), 0, 0.15, 0);
  add(post, G.box(3.4, 2.4, 2.6), plaster, 0, 1.5, 0);
  const prRoof = new THREE.MeshStandardMaterial({ map: shinglesTex('#c85a4a', [3, 2]), roughness: 0.85 });
  for (const s of [-1, 1]) add(post, G.box(2.1, 0.12, 3.0), prRoof, s * 0.93, 3.15, 0, { rot: [0, 0, -s * 0.5] });
  const gab = new THREE.Shape();
  gab.moveTo(-1.7, 0); gab.lineTo(1.7, 0); gab.lineTo(0, 0.95); gab.lineTo(-1.7, 0);
  for (const z of [1.3, -1.3]) add(post, new THREE.ExtrudeGeometry(gab, { depth: 0.1, bevelEnabled: false }), plaster, 0, 2.7, z - 0.05);
  add(post, G.box(0.8, 1.5, 0.08), mat('#3a5a9a'), -0.6, 1.05, 1.31);
  add(post, G.sphere(0.04), gold, -0.35, 1.05, 1.37);
  windowFrame(post, 0.85, 1.6, 1.31, 0.9, 0.7, 0, glow('#ffe7a0', 0.5), mat('#c85a4a'));
  add(post, G.box(1.8, 0.4, 0.06), new THREE.MeshStandardMaterial({ map: signTex('ゆうびん', { w: 256, h: 64, bg: '#c85a4a', fg: '#fff6dc', border: '#fff6dc', size: 42 }) }), 0, 2.45, 1.34);
  // つばめの止まり木（看板の腕）
  add(post, G.box(0.06, 0.06, 0.9), darkWood, -1.75, 2.3, 1.55);
  add(post, G.box(0.5, 0.35, 0.04), new THREE.MeshStandardMaterial({ map: signTex('✉', { w: 128, h: 96, bg: '#fff6dc', fg: '#c85a4a', border: '#c85a4a', size: 70 }) }), -1.75, 2.05, 1.95, { rot: [0, Math.PI / 2, 0] });
  R.swallowPerch = new THREE.Vector3(9.3 - 1.75, 2.34, 4.6 + 1.85);
  // ポスト（丸い巣箱のよう）
  add(post, G.cyl(0.3, 0.3, 1.0, 16), mat('#d8463a'), 1.9, 0.5, 1.6);
  add(post, G.sphere(0.3, 16, 8), mat('#d8463a'), 1.9, 1.0, 1.6, { scale: [1, 0.6, 1] });
  // ひさしの下の巣（雲のわた）
  const nest = (R.nest = group(post, 1.3, 2.6, 1.42));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(nest, G.cyl(0.015, 0.015, 0.3, 4), mat('#8a6a3a'), Math.cos(a) * 0.14, 0, Math.sin(a) * 0.1 + 0.05, { rot: [Math.random(), a, Math.PI / 2], cast: false });
  }
  add(nest, G.sphere(0.16, 12, 6, 0), mat('#8a6a3a'), 0, -0.04, 0.05, { scale: [1, 0.5, 0.7] });
  R.nestCotton = cloudPuff(nest, 0, 0.1, 0.05, 0.16, '#ffffff', 12, 3);
  R.nestCotton.userData.dynamic = true;

  // ---------------- バラのアーチ（手紙） ----------------
  const arch = (R.arch = group(root, 12.3, 0, 7.9, -0.4));
  for (const x of [-0.8, 0.8]) add(arch, G.cyl(0.06, 0.06, 2.0, 8), mat('#ffffff'), x, 1.0, 0);
  add(arch, G.torus(0.8, 0.06, 8, 20, Math.PI), mat('#ffffff'), 0, 2.0, 0);
  const ar = rng(66);
  for (let i = 0; i < 26; i++) {
    const a = ar() * Math.PI;
    const side = i < 8 ? (i % 2 ? -0.8 : 0.8) : null;
    const px = side ?? Math.cos(a) * 0.8, py = side !== null ? 0.3 + ar() * 1.6 : 2.0 + Math.sin(a) * 0.8;
    add(arch, G.sphere(0.13), mat('#5f9a4a', { flatShading: true }), px + (ar() - 0.5) * 0.15, py, (ar() - 0.5) * 0.2, { cast: false });
    if (i % 2) add(arch, G.sphere(0.07), mat(ar() > 0.5 ? '#ff7aa0' : '#ffffff'), px, py + 0.08, 0.12, { cast: false });
  }
  // アーチのすき間もクリックできるように、見えない当たり判定を置く
  const hit = add(arch, G.box(1.7, 2.6, 0.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 1.3, 0, { cast: false, receive: false });
  hit.userData.keep = true;
  R.letter = group(arch, 0.55, 1.5, 0.2);
  add(R.letter, G.box(0.34, 0.24, 0.02), mat('#fbf6ea'), 0, 0, 0, { cast: false });
  add(R.letter, G.sphere(0.035, 8, 6), mat('#d84a3a'), 0, 0, 0.015, { scale: [1, 1, 0.4], cast: false });
  R.letter.rotation.z = 0.3;
  R.letter.userData.dynamic = true;
  flowerPatch(root, 12.8, 9.4, 0.9, 14, 81, ['#ff7aa0', '#ffffff', '#ffb0c8']);

  // ---------------- 気球と巻き上げ機 ----------------
  const winch = (R.winch = group(root, 11.8, 0, -0.3, -0.3));
  add(winch, G.box(1.2, 0.3, 0.8), mat('#7a6a5a'), 0, 0.15, 0);
  for (const x of [-0.5, 0.5]) add(winch, G.box(0.1, 0.8, 0.6), darkWood, x, 0.6, 0);
  R.winchDrum = group(winch, 0, 0.75, 0);
  add(R.winchDrum, G.cyl(0.28, 0.28, 0.85, 14), wood, 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  add(R.winchDrum, G.cyl(0.3, 0.3, 0.6, 14), mat('#c9b08a'), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  const crank = group(R.winchDrum, 0.6, 0, 0);
  add(crank, G.box(0.05, 0.45, 0.05), mat('#8a5a3a'), 0, 0.2, 0);
  add(crank, G.cyl(0.03, 0.03, 0.25, 6), mat('#8a5a3a'), 0.12, 0.42, 0, { rot: [0, 0, Math.PI / 2] });
  R.winchDrum.userData.dynamic = true;
  R.rustMat = mat('#a8603a', { roughness: 1 });
  R.rust = add(winch, G.sphere(0.08, 8, 6), R.rustMat, 0.5, 0.95, 0.31, { scale: [1.5, 1, 0.4], cast: false });
  R.rust.userData.keep = true;
  add(winch, G.box(0.9, 0.25, 0.04), new THREE.MeshStandardMaterial({ map: signTex('まきあげき', { w: 256, h: 64, bg: '#f4ead2', size: 36 }) }), 0, 0.15, 0.42);

  R.balloonBase = new THREE.Vector3(11.8, 8.2, -2.2);
  const bl = (R.balloon = group(root, R.balloonBase.x, R.balloonBase.y, R.balloonBase.z));
  bl.userData.dynamic = true;
  const env = new THREE.MeshStandardMaterial({ map: stripeTex('#e8574a', '#fff4e0', 12), roughness: 0.7 });
  add(bl, G.sphere(1.7, 32, 20), env, 0, 3.0, 0, { scale: [1, 1.15, 1] });
  add(bl, G.cone(1.2, 1.3, 24, 1), env, 0, 1.2, 0, { rot: [Math.PI, 0, 0] });
  add(bl, G.torus(0.42, 0.05, 6, 16), mat('#8a6a3a'), 0, 0.6, 0, { rot: [Math.PI / 2, 0, 0] });
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
    add(bl, G.cyl(0.012, 0.012, 1.0, 4), mat('#c9b08a'), x * 0.9, 0.15, z * 0.9, { cast: false, rot: [z * 0.3, 0, -x * 0.3] });
  }
  const basket = (R.basket = group(bl, 0, -0.55, 0));
  add(basket, G.box(0.95, 0.6, 0.95), new THREE.MeshStandardMaterial({ map: boardsTex('#b98a58', [2, 1]), roughness: 0.9 }), 0, 0, 0);
  add(basket, G.box(1.0, 0.08, 1.0), mat('#8a5a3a'), 0, 0.3, 0);
  for (const [x, z] of [[-0.5, 0.3], [0.5, -0.2]]) add(basket, G.sphere(0.13, 8, 6), mat('#c9b08a'), x, -0.05, z, { scale: [0.8, 1.1, 0.8] });
  R.basketCotton = cloudPuff(basket, 0.35, 0.36, 0.45, 0.17, '#ffffff', 14, 3);
  R.basketCotton.userData.dynamic = true;
  R.rope = add(root, G.cyl(0.02, 0.02, 1, 4), mat('#c9b08a'), 0, 0, 0, { cast: false });
  R.rope.userData.keep = true;
  R.rope.userData.noPick = true;

  // ---------------- 大風車 ----------------
  const mill = (R.windmill = group(root, 8.8, 0, -9.3));
  add(mill, G.sphere(3.4, 24, 10, 0), mat('#8fc06a', { roughness: 1 }), 0, -0.4, 0, { scale: [1.1, 0.35, 0.75] });
  add(mill, G.cyl(1.05, 1.5, 6.0, 20), plaster, 0, 3.6, 0);
  for (const y of [1.0, 3.5, 6.0]) add(mill, G.torus(1.5 - (y - 0.6) * 0.075, 0.06, 6, 24), blueTrim, 0, y, 0, { rot: [Math.PI / 2, 0, 0] });
  add(mill, G.box(0.8, 1.3, 0.1), mat('#7a5a3a'), 0, 1.2, 1.45, { rot: [-0.07, 0, 0] });
  windowFrame(mill, 0, 4.4, 1.2, 0.4, 0.5, 0, glow('#ffe7a0', 0.5), blueTrim);
  add(mill, G.sphere(1.25, 20, 12), shinglesMat('#4a72c8'), 0, 6.7, 0, { scale: [1, 0.8, 1.15] });
  add(mill, G.cyl(0.25, 0.3, 0.8, 12), darkWood, 0, 7.0, 1.2, { rot: [Math.PI / 2, 0, 0] });
  R.sails = group(mill, 0, 7.0, 1.7);
  R.sails.userData.dynamic = true;
  add(R.sails, G.cyl(0.3, 0.3, 0.3, 14), darkWood, 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  add(R.sails, G.sphere(0.18, 12, 8), gold, 0, 0, 0.2);
  const cloth = mat('#f7f2e6', { side: THREE.DoubleSide, roughness: 0.9 });
  R.sailCloths = [];
  for (let i = 0; i < 4; i++) {
    const arm = group(R.sails, 0, 0, 0);
    arm.rotation.z = (i * Math.PI) / 2 + 0.3;
    add(arm, G.box(0.14, 4.6, 0.1), wood, 0, 2.4, 0);
    for (const x of [-0.25, 0.6]) add(arm, G.box(0.04, 3.8, 0.04), wood, x, 2.8, 0.05, { cast: false });
    for (let k = 0; k < 7; k++) add(arm, G.box(0.9, 0.04, 0.04), wood, 0.18, 1.0 + k * 0.6, 0.05, { cast: false });
    const c = add(arm, G.plane(0.82, 3.7), cloth, 0.18, 2.8, 0.09);
    c.userData.keep = true;
    R.sailCloths.push(c);
    arm.userData.dynamic = true;
  }
  // 破れた帆（はじめの状態）
  R.tornCloth = group(R.sailCloths[2].parent, 0.18, 0, 0.09);
  for (let k = 0; k < 3; k++) add(R.tornCloth, G.plane(0.25, 0.7 - k * 0.15), cloth, -0.25 + k * 0.28, 1.2 + k * 0.1, 0, { rot: [0, 0, (k - 1) * 0.2] });
  R.tornCloth.userData.dynamic = true;
  // 歯車の窓
  add(mill, G.torus(0.42, 0.06, 8, 24), gold, 0, 2.6, 1.42, { rot: [-0.07, 0, 0] });
  add(mill, G.circle(0.38, 20), mat('#2a2030'), 0, 2.6, 1.4, { rot: [-0.07, 0, 0], cast: false });
  R.millGear = group(mill, 0, 2.6, 1.46);
  add(R.millGear, gearGeometry(0.34, 10, 0.08), gold, 0, 0, 0, { cast: false });
  R.millGear.rotation.x = -0.07;
  R.millGear.userData.dynamic = true;
  R.millGear.visible = false;

  // ---------------- 風穴 ----------------
  // 列車のうしろに隠れないよう、高い岩がけの上にある
  const CAVE_Y = 3.2;
  const rock = mat('#9a948a', { flatShading: true, roughness: 1 });
  const cliff = group(root, -11.4, 0, -10.0);
  const cl = rng(8);
  // 岩は洞穴の口より下にとどめる（口と看板が埋もれないように）
  for (let i = 0; i < 14; i++) {
    const r = 0.9 + cl() * 0.4;
    const yy = Math.min(CAVE_Y - r - 0.15, 0.3 + (i / 13) * (CAVE_Y - 1.0));
    add(cliff, G.dodeca(r), rock, (cl() - 0.5) * 3.0, yy, -0.3 - cl() * 0.6, { rot: [cl(), cl(), cl()] });
  }
  // 洞穴の前の平らな岩だな（看板が立つ）
  add(cliff, G.box(4.0, 0.35, 2.0), mat('#a8a294', { flatShading: true, roughness: 1 }), 0, CAVE_Y - 0.17, 0.4);
  add(cliff, G.box(3.6, CAVE_Y - 0.3, 1.6), rock, 0, (CAVE_Y - 0.3) / 2, 0.2);
  for (let i = 0; i < 9; i++) {
    const r = 0.45 + cl() * 0.3;
    add(cliff, G.dodeca(r), rock, -1.7 + (i % 5) * 0.85 + (cl() - 0.5) * 0.3, 0.4 + Math.floor(i / 5) * 1.1 + cl() * 0.3, 0.95 + cl() * 0.2, { rot: [cl(), cl(), cl()] });
  }
  for (let i = 0; i < 5; i++) add(cliff, G.sphere(0.45 + cl() * 0.25, 8, 6), mat('#8ab86a', { flatShading: true }), (cl() - 0.5) * 3.2, CAVE_Y + 0.02, 0.9 + cl() * 0.4, { scale: [1.2, 0.35, 0.8] });
  const cave = (R.cave = group(root, -11.4, CAVE_Y, -9.9));
  const cr = rng(5);
  for (let i = 0; i < 16; i++) {
    const a = (i / 15) * Math.PI;
    add(cave, G.dodeca(0.5 + cr() * 0.35), rock, Math.cos(a) * 1.6, Math.sin(a) * 1.6 + 0.2, (cr() - 0.5) * 0.6, { rot: [cr(), cr(), cr()] });
  }
  for (let i = 0; i < 6; i++) add(cave, G.dodeca(0.6 + cr() * 0.4), rock, (cr() - 0.5) * 3.2, 1.2 + cr() * 1.6, -0.9 - cr() * 0.6, { rot: [cr(), cr(), cr()] });
  add(cave, G.circle(1.25, 20, 0), mat('#2a2a3a'), 0, 0.6, 0.15, { scale: [1, 0.9, 1], cast: false });
  add(cave, G.box(1.0, 0.4, 0.06), new THREE.MeshStandardMaterial({ map: signTex('風穴', { w: 192, h: 72, bg: '#f4ead2', size: 46 }) }), 1.55, 0.75, 1.05, { rot: [0, -0.25, 0] });
  add(cave, G.cyl(0.04, 0.04, 0.6, 6), wood, 1.55, 0.3, 1.0);
  R.caveMouth = new THREE.Vector3(-11.4, CAVE_Y + 0.8, -9.6);

  // ---------------- 風の配管 ----------------
  R.pipeMat = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.7, roughness: 0.35, emissive: '#5ad8ff', emissiveIntensity: 0 });
  const pipes = (R.pipes = group(root));
  const pipeRun = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
      const len = a.distanceTo(b);
      const m = add(pipes, G.cyl(0.13, 0.13, len, 10), R.pipeMat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      add(pipes, G.sphere(0.16, 10, 8), R.pipeMat, b.x, b.y, b.z);
    }
  };
  pipeRun([[-10.2, 3.3, -10.3], [-10.0, 0.35, -10.3]]);
  pipeRun([[-10.0, 0.35, -10.3], [4.6, 0.35, -10.3], [4.6, 0.35, -9.6]]);
  pipeRun([[5.9, 0.35, -9.6], [7.3, 0.35, -9.6]]);
  for (let x = -9; x < 4.6; x += 2.2) add(pipes, G.box(0.12, 0.3, 0.3), mat('#7a6a5a'), x, 0.15, -10.3);
  // 配管盤
  const panel = (R.pipePanel = group(root, 5.25, 0, -9.3));
  add(panel, G.box(1.3, 1.5, 0.6), mat('#5a7ac8', { metalness: 0.3, roughness: 0.5 }), 0, 0.75, 0);
  add(panel, G.box(1.1, 1.1, 0.04), mat('#1e2a44'), 0, 0.9, 0.31);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) add(panel, G.box(0.2, 0.2, 0.03), mat('#c8a050', { metalness: 0.6 }), -0.36 + c * 0.24, 1.26 - r * 0.24, 0.33, { cast: false });
  R.panelLampMat = glow('#ff5a4a', 1.6);
  add(panel, G.sphere(0.07, 10, 8), R.panelLampMat, 0.5, 1.6, 0.25, { cast: false });
  add(panel, G.box(1.2, 0.25, 0.04), new THREE.MeshStandardMaterial({ map: signTex('風の配管盤', { w: 256, h: 56, bg: '#f4ead2', size: 32 }) }), 0, 0.2, 0.31);

  // ---------------- 線路をふさぐ雨雲 ----------------
  const storm = (R.storm = group(root, 23, 0, TRACK_Z));
  storm.userData.dynamic = true;
  const sr = rng(8);
  R.stormMat = new THREE.MeshStandardMaterial({ color: '#6a6f88', roughness: 1, flatShading: true, transparent: true, opacity: 1 });
  for (let i = 0; i < 40; i++) {
    const x = (sr() - 0.5) * 13, y = 1 + sr() * 7, z = (sr() - 0.5) * 7;
    const s = 1.2 + sr() * 1.8;
    const m = add(storm, G.ico(1, 1), R.stormMat, x, y, z, { scale: [s * 1.3, s * 0.9, s], rot: [sr(), sr(), sr()], cast: false });
    m.userData.noPick = false;
  }
  R.stormLight = new THREE.PointLight('#c8d8ff', 0, 30, 1.5);
  R.stormLight.position.set(0, 5, 3);
  storm.add(R.stormLight);
  // 雨
  const rainGeo = new THREE.BufferGeometry();
  const rp = new Float32Array(160 * 6);
  for (let i = 0; i < 160; i++) {
    const x = (sr() - 0.5) * 12, y = sr() * 4 - 1, z = (sr() - 0.5) * 6;
    rp.set([x, y, z, x - 0.05, y - 0.5, z], i * 6);
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  R.rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#a8c0e8', transparent: true, opacity: 0.6 }));
  R.rain.userData.noPick = true;
  storm.add(R.rain);

  // 虹（最後に出る）
  const rb = (R.rainbow = group(root, 24, -6, -16));
  rb.userData.dynamic = true;
  R.rainbowMats = [];
  rainbowColors().forEach((c, i) => {
    const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false });
    R.rainbowMats.push(m);
    const mesh = add(rb, new THREE.TorusGeometry(16 - i * 0.55, 0.28, 6, 64, Math.PI), m, 0, 0, 0, { cast: false, receive: false });
    mesh.userData.noPick = true;
  });
  rb.visible = false;

  // ---------------- 家並みと飾り ----------------
  for (const [x, z, r, h, roof, ry] of [
    [-12.9, 8.5, 1.0, 2.4, '#4a72c8', 0.6], [13.3, 2.6, 0.9, 2.2, '#4a72c8', -0.8],
    [-3.6, -9.7, 0.8, 2.0, '#d8708a', 0.1], [13.3, -8.9, 0.8, 2.4, '#5a8ad8', -0.6], [-13.4, 4.4, 0.8, 1.8, '#5a8ad8', 1.2],
  ]) {
    const hse = towerHouse(root, x, z, { r, h, roof, ry });
    R.vanes.push(hse.vane);
    R.lampGlass.push(hse.win);
  }
  // 手前は低い花壇だけにして、広場を見やすく
  for (const [x, z] of [[-4.5, 9.3], [4.5, 9.3]]) {
    add(root, G.box(2.4, 0.3, 0.7), mat('#d8d0c0'), x, 0.15, z);
    const fg = group(root, x, 0.3, z);
    flowerPatch(fg, 0, 0, 0.9, 14, Math.floor(x * 7 + 50));
  }

  // 雲の木
  const cloudTrees = [[-13.2, 1.6, 0.8], [-1.2, -9.3, 0.6], [-7.0, -8.9, 0.6], [13.6, 5.2, 0.55], [-13.6, -6.6, 0.6], [1.6, -9.6, 0.5]];
  cloudTrees.forEach(([x, z, s], i) => tree(root, x, z, { scale: s, seed: 30 + i, colors: ['#ffffff', '#fdf0f6', '#f2f6ff', '#ffe8f0'] }));
  bush(root, -5.6, -0.4, 0.8, 41, '#7fb35a');
  bush(root, 5.6, -0.8, 0.8, 42, '#7fb35a');
  bush(root, 2.6, 8.9, 0.7, 43, '#8fc06a');

  // 広場の灯りとベンチ
  for (const [x, z] of [[3.6, 6.0], [-3.6, 6.0], [3.4, -0.9], [-3.4, -0.9]]) {
    const lp = lampPost(root, x, z, { lights: x > 0 && z > 0 ? R.lights : null, withLight: x > 0 && z > 0, intensity: 1.2 });
    R.lampGlass.push(lp.glass);
  }
  bench(root, 0, 0, 7.7, Math.PI, 1.6);
  bench(root, -5.4, 0, 3.0, Math.PI / 2, 1.4);
  flowerPatch(root, -2.2, 7.3, 0.6, 10, 91);
  flowerPatch(root, 2.4, 7.2, 0.6, 10, 92);
  flowerPatch(root, -12.6, -3.2, 0.9, 12, 93);
  flowerPatch(root, 6.8, 1.6, 0.8, 12, 94, ['#9fd0ff', '#ffffff', '#ffd25a']);

  // ふわふわ浮かぶ小雲
  R.driftClouds = [];
  for (const [x, y, z, s, sd] of [[-6, 9, -2, 1.0, 101], [5, 11, 3, 1.3, 102], [-1, 12.5, -6, 0.9, 103], [10, 10, 8, 0.8, 104]]) {
    const c = cloudPuff(root, x, y, z, s, '#ffffff', sd, 6);
    c.traverse((o) => { o.userData.noPick = true; if (o.isMesh) o.castShadow = true; });
    c.userData.dynamic = true;
    R.driftClouds.push({ c, x, y, z });
  }

  for (const v of R.vanes) if (v) v.userData.dynamic = true;
  return R;
}
