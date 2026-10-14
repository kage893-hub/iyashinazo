import * as THREE from 'three';
import { add, mat, glow, G, group, rng, signTex, roundRectShape, softCircleTexture } from '../../lib/util.js';
import {
  planksTex, boardsTex, shinglesTex, stoneTex, gravelTex, grassTex,
  clockFaceTex, timetableTex, stationSignTex, waterTex,
} from './textures.js';
import { TRACK_Z } from './train.js';

// ---------------------------------------------------------------
// はざま駅の箱庭（建物・小物）
// 座標：島は x[-15,15] z[-11,11]、地面 y=0、ホーム上面 y=0.75
// ---------------------------------------------------------------

const FLOOR = 0.75;
const WALL_H = 3.0;
const WALL_TOP = FLOOR + WALL_H;

/** 開口部つきの壁（ローカル X 方向に len、厚み th） */
export function wall(parent, len, h, th, openings, matUpper, matLower, wainscot = 0.9) {
  const g = group(parent);
  const xs = [0, len];
  for (const o of openings) xs.push(o.a, o.b);
  const uniq = [...new Set(xs)].sort((a, b) => a - b);
  for (let i = 0; i < uniq.length - 1; i++) {
    const a = uniq[i], b = uniq[i + 1];
    const mid = (a + b) / 2;
    const op = openings.find((o) => mid > o.a && mid < o.b);
    const spans = op ? [[0, op.y0], [op.y1, h]] : [[0, h]];
    for (const [y0, y1] of spans) {
      if (y1 - y0 < 0.001) continue;
      // 腰板で上下に分ける
      const parts = [];
      if (y0 < wainscot && y1 > wainscot) parts.push([y0, wainscot, matLower], [wainscot, y1, matUpper]);
      else parts.push([y0, y1, y1 <= wainscot ? matLower : matUpper]);
      for (const [p0, p1, m] of parts) {
        add(g, new THREE.BoxGeometry(b - a, p1 - p0, th), m, (a + b) / 2, (p0 + p1) / 2, 0);
      }
    }
  }
  return g;
}

/** 窓枠＋ガラス */
export function windowFrame(parent, x, y, z, w, h, ry, glassMat, frameMat) {
  const g = group(parent, x, y, z, ry);
  const t = 0.07;
  const e = 0.015; // 壁の切り口と面が重なってちらつかないよう、枠を少しだけ内側に
  add(g, G.box(w + t * 2, t, 0.28), frameMat, 0, h / 2 + t / 2 - e, 0);
  add(g, G.box(w + t * 2, t, 0.34), frameMat, 0, -h / 2 - t / 2 + e, 0.02);
  add(g, G.box(t, h, 0.28), frameMat, -w / 2 - t / 2 + e, 0, 0);
  add(g, G.box(t, h, 0.28), frameMat, w / 2 + t / 2 - e, 0, 0);
  add(g, G.box(0.04, h, 0.06), frameMat, 0, 0, 0);
  add(g, G.box(w, 0.04, 0.06), frameMat, 0, 0, 0);
  add(g, G.box(w, h, 0.02), glassMat, 0, 0, 0, { cast: false });
  return g;
}

export function lampPost(parent, x, z, { h = 2.6, lights, y = 0, withLight = true, intensity = 3 } = {}) {
  const g = group(parent, x, y, z);
  const iron = mat('#2f3b36', { metalness: 0.5, roughness: 0.5 });
  add(g, G.cyl(0.14, 0.2, 0.25, 10), iron, 0, 0.12, 0);
  add(g, G.cyl(0.05, 0.07, h, 10), iron, 0, h / 2, 0);
  add(g, G.torus(0.09, 0.025, 6, 12), iron, 0, h * 0.6, 0, { rot: [Math.PI / 2, 0, 0] });
  const head = group(g, 0, h + 0.05, 0);
  add(head, G.cyl(0.14, 0.1, 0.06, 8), iron, 0, 0, 0);
  const glass = glow('#ffd58a', 1.6);
  glass.userData.lamp = true;
  add(head, G.cyl(0.16, 0.11, 0.38, 8), glass, 0, 0.22, 0, { cast: false });
  add(head, G.cone(0.24, 0.2, 8), iron, 0, 0.5, 0);
  add(head, G.sphere(0.04, 8, 6), iron, 0, 0.62, 0);
  if (withLight && lights) {
    const L = new THREE.PointLight('#ffc477', intensity, 9, 1.6);
    L.position.set(0, h + 0.3, 0);
    g.add(L);
    lights.push(L);
  }
  return { g, glass };
}

export function bench(parent, x, y, z, ry = 0, w = 1.6) {
  const g = group(parent, x, y, z, ry);
  const wood = mat('#a8693e');
  const iron = mat('#33363c', { metalness: 0.4, roughness: 0.5 });
  for (const s of [-1, 1]) {
    add(g, G.box(0.06, 0.45, 0.5), iron, s * (w / 2 - 0.15), 0.22, 0);
    add(g, G.box(0.06, 0.5, 0.06), iron, s * (w / 2 - 0.15), 0.7, -0.25);
  }
  for (let i = 0; i < 3; i++) add(g, G.box(w, 0.05, 0.14), wood, 0, 0.45, -0.17 + i * 0.17);
  for (let i = 0; i < 2; i++) add(g, G.box(w, 0.12, 0.04), wood, 0, 0.66 + i * 0.2, -0.27, { rot: [-0.12, 0, 0] });
  return g;
}

export function flowerPatch(parent, x, z, r, count, seed, colors = ['#ff8fa8', '#ffd25a', '#ffffff', '#b58cff', '#ff6a5a']) {
  const rr = rng(seed);
  const stem = mat('#4f8a3a');
  for (let i = 0; i < count; i++) {
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r;
    const fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d;
    const h = 0.15 + rr() * 0.2;
    add(parent, G.cyl(0.012, 0.012, h, 4), stem, fx, h / 2, fz, { cast: false });
    add(parent, G.sphere(0.055, 8, 6), mat(colors[Math.floor(rr() * colors.length)]), fx, h, fz, { scale: [1, 0.6, 1], cast: false });
  }
}

export function tree(parent, x, z, { scale = 1, colors = ['#e2763a', '#f0a24a', '#d24f32', '#f4c15a'], seed = 1, hollow = false } = {}) {
  const r = rng(seed);
  const g = group(parent, x, 0, z);
  g.scale.setScalar(scale);
  const bark = mat('#6b4a33', { roughness: 1 });
  add(g, G.cyl(0.32, 0.5, 3.0, 10), bark, 0, 1.5, 0);
  // 根
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    add(g, G.cone(0.18, 0.9, 6), bark, Math.cos(a) * 0.45, 0.12, Math.sin(a) * 0.45, { rot: [Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3] });
  }
  // 枝
  for (const [rx, rz, len] of [[0.6, 0.2, 1.4], [-0.5, -0.3, 1.2], [0.1, 0.7, 1.1]]) {
    add(g, G.cyl(0.08, 0.16, len, 6), bark, rx * 0.6, 2.8, rz * 0.6, { rot: [rz, 0, -rx] });
  }
  // 葉のかたまり
  const leaves = group(g, 0, 0, 0);
  const clusters = [[0, 4.0, 0, 1.7], [1.2, 3.6, 0.3, 1.2], [-1.1, 3.5, -0.2, 1.25], [0.2, 3.3, 1.1, 1.1], [-0.3, 3.4, -1.0, 1.15], [0.5, 4.7, -0.3, 1.0], [-0.6, 4.5, 0.5, 0.95]];
  for (const [cx, cy, cz, cr] of clusters) {
    add(leaves, G.ico(cr, 1), mat(colors[Math.floor(r() * colors.length)], { flatShading: true, roughness: 0.9 }), cx, cy, cz, { rot: [r(), r(), r()] });
  }
  let hollowMesh = null;
  if (hollow) {
    hollowMesh = add(g, G.circle(0.2, 16), mat('#2a1a10'), 0, 1.1, 0.43, { scale: [0.9, 1.3, 1], cast: false });
    add(g, G.torus(0.2, 0.05, 6, 16), bark, 0, 1.1, 0.42, { scale: [0.9, 1.3, 1], cast: false });
  }
  return { g, leaves, hollowMesh };
}

export function bush(parent, x, z, s = 1, seed = 1, color = '#5f9a4a') {
  const r = rng(seed);
  const g = group(parent, x, 0, z);
  for (let i = 0; i < 4; i++) {
    add(g, G.ico(0.45 * s * (0.7 + r() * 0.5), 1), mat(color, { flatShading: true }), (r() - 0.5) * s, 0.3 * s, (r() - 0.5) * s * 0.7);
  }
  return g;
}

export function fence(parent, x0, z0, x1, z1) {
  const wood = mat('#c9a77a');
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const g = group(parent, x0, 0, z0, -Math.atan2(dz, dx));
  const n = Math.max(2, Math.round(len / 0.45));
  for (let i = 0; i <= n; i++) {
    add(g, G.box(0.08, 0.6, 0.06), wood, (i / n) * len, 0.3, 0);
    add(g, G.cone(0.06, 0.1, 4), wood, (i / n) * len, 0.65, 0, { rot: [0, Math.PI / 4, 0] });
  }
  add(g, G.box(len, 0.06, 0.04), wood, len / 2, 0.42, 0.04);
  add(g, G.box(len, 0.06, 0.04), wood, len / 2, 0.2, 0.04);
  return g;
}

/** 箱庭のすべてを組み立て、ギミック用の参照を返す */
export function buildStationDiorama(scene) {
  const root = group(scene);
  const R = { root, lights: [], lampGlass: [], windowGlass: [] };

  // ---------------- 地面 ----------------
  const grass = new THREE.MeshStandardMaterial({ map: grassTex('#86b35c', [10, 7]), roughness: 1 });
  const groundShape = roundRectShape(29.6, 21.6, 2.4);
  const ground = add(root, new THREE.ShapeGeometry(groundShape, 12), grass, 0, 0.002, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  ground.userData.noPick = false;

  const gravel = new THREE.MeshStandardMaterial({ map: gravelTex('#d2c09c', [3, 3]), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const paths = [
    [-7, 6.6, 9.6, 4.8, 1.2], // 駅前広場
    [3.8, 6.4, 13.5, 2.4, 1.0], // 東への小道
    [1.2, 1.9, 2.4, 6.6, 0.8], // ホームへの小道
    [9.6, 3.2, 3.6, 2.6, 0.6],
  ];
  for (const [x, z, w, d, r] of paths) {
    add(root, new THREE.ShapeGeometry(roundRectShape(w, d, r), 8), gravel, x, 0.012, z, { rot: [-Math.PI / 2, 0, 0], cast: false });
  }

  // ---------------- ホーム ----------------
  const platStone = new THREE.MeshStandardMaterial({ map: stoneTex('#cbbfa6', [8, 1]), roughness: 0.95 });
  add(root, G.box(22.3, FLOOR, 2.6), platStone, -1.35, FLOOR / 2, -2.7);
  add(root, G.box(22.4, 0.06, 0.32), mat('#efe6d2'), -1.35, FLOOR + 0.03, -3.86);
  add(root, G.box(22.4, 0.02, 0.06), mat('#e8c04a'), -1.35, FLOOR + 0.065, -3.62, { cast: false });
  // ホームへの階段
  for (let i = 0; i < 3; i++) add(root, G.box(1.6, FLOOR * (3 - i) / 3, 0.35), platStone, 1.2, FLOOR * (3 - i) / 6, -1.22 + i * 0.35);

  // 駅名標
  const sign = group(root, -0.4, FLOOR, -3.5);
  const post = mat('#2b3a5c');
  for (const s of [-1, 1]) add(sign, G.cyl(0.05, 0.05, 1.9, 8), post, s * 1.0, 0.95, 0);
  const signBoard = add(sign, G.box(2.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ map: stationSignTex(), roughness: 0.6 }), 0, 1.5, 0.02);
  add(sign, G.box(2.4, 0.06, 0.1), post, 0, 1.98, 0);
  R.stationSign = sign;

  // ホームの灯り・ベンチ・植え込み
  const pl1 = lampPost(root, 3.0, -3.55, { y: FLOOR, lights: R.lights, intensity: 2 });
  const pl2 = lampPost(root, 8.6, -3.55, { y: FLOOR, lights: R.lights, intensity: 2 });
  const pl3 = lampPost(root, -11.8, -3.55, { y: FLOOR, withLight: false });
  R.lampGlass.push(pl1.glass, pl2.glass, pl3.glass);
  R.platformBench = bench(root, 6.0, FLOOR, -1.85, Math.PI, 1.6);
  for (let i = 0; i < 3; i++) {
    const bx = -0.2 + i * 2.6;
    add(root, G.box(1.0, 0.3, 0.4), mat('#8a5d3b'), bx + 1.6, FLOOR + 0.15, -1.6);
    flowerPatch(root, 0, 0, 0, 0, 1);
    const fg = group(root, bx + 1.6, FLOOR + 0.3, -1.6);
    flowerPatch(fg, 0, 0, 0.4, 7, 30 + i);
  }
  // 木箱とりんご
  const crate = group(root, 9.0, FLOOR, -2.2, 0.3);
  add(crate, G.box(0.7, 0.5, 0.5), new THREE.MeshStandardMaterial({ map: planksTex('#b98a58', '#7a5634', 4) }), 0, 0.25, 0);
  for (let i = 0; i < 5; i++) add(crate, G.sphere(0.09, 10, 8), mat('#d8402e'), -0.2 + (i % 3) * 0.2, 0.55, -0.1 + Math.floor(i / 3) * 0.2);
  add(crate, G.box(0.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ map: planksTex('#b98a58', '#7a5634', 4) }), 0.15, 0.7, 0.05, { rot: [0, 0.5, 0] });

  // ---------------- 駅舎 ----------------
  const bld = group(root);
  R.building = bld;
  const plaster = mat('#f3e6cb');
  const wood = mat('#7a5038');
  const darkWood = mat('#5b3a29');
  const trim = mat('#3f5f73');
  // 基礎と床
  add(bld, G.box(8.2, FLOOR, 5.6), new THREE.MeshStandardMaterial({ map: stoneTex('#b6a88e', [4, 1]), roughness: 1 }), -7, FLOOR / 2, 1.3);
  const floorMat = new THREE.MeshStandardMaterial({ map: planksTex('#b07f53', '#6e4a2e', 10, [1, 1]), roughness: 0.85 });
  add(bld, G.box(7.9, 0.02, 5.3), floorMat, -7, FLOOR + 0.01, 1.3, { cast: false });
  // 入口の階段
  for (let i = 0; i < 2; i++) add(bld, G.box(7.0, FLOOR * (2 - i) / 2 - 0.0, 0.42), mat('#c7b89c'), -7, (FLOOR * (2 - i) / 2) / 2, 4.2 + i * 0.42);
  // 後ろの壁（ホーム側、扉つき）
  const back = wall(bld, 8, WALL_H, 0.2, [{ a: 4.4, b: 5.6, y0: 0, y1: 2.2 }], plaster, wood);
  back.position.set(-11, FLOOR, -1.3);
  // 左右の壁（窓つき）
  const left = wall(bld, 5.4, WALL_H, 0.2, [{ a: 2.6, b: 4.0, y0: 1.0, y1: 2.2 }], plaster, wood);
  left.position.set(-10.9, FLOOR, 4.0);
  left.rotation.y = Math.PI / 2;
  const right = wall(bld, 5.4, WALL_H, 0.2, [{ a: 1.6, b: 3.4, y0: 1.0, y1: 2.2 }], plaster, wood);
  right.position.set(-3.1, FLOOR, 4.0);
  right.rotation.y = Math.PI / 2;
  const winGlass = new THREE.MeshStandardMaterial({ color: '#bfe3ff', emissive: '#ffcf8a', emissiveIntensity: 0.25, transparent: true, opacity: 0.35, roughness: 0.1 });
  windowFrame(bld, -10.9, FLOOR + 1.6, 0.7, 1.4, 1.2, Math.PI / 2, winGlass, darkWood);
  windowFrame(bld, -3.1, FLOOR + 1.6, 1.5, 1.8, 1.2, Math.PI / 2, winGlass, darkWood);
  // 扉枠
  add(bld, G.box(1.4, 0.12, 0.3), darkWood, -6.0, FLOOR + 2.245, -1.3);
  for (const s of [-1, 1]) add(bld, G.box(0.1, 2.2, 0.3), darkWood, -6.0 + s * 0.635, FLOOR + 1.1, -1.3);
  // 角柱
  for (const [x, z] of [[-11, -1.3], [-3, -1.3], [-11, 4.0], [-3, 4.0]]) add(bld, G.box(0.3, WALL_H + 0.1, 0.3), darkWood, x, FLOOR + (WALL_H + 0.1) / 2, z);
  // 正面の梁と三つの丸窓（黄・青・赤）
  // 梁は角柱（太さ0.3）より細く・短くして、面が重ならないようにする
  // （上から中をのぞくときは、この正面の梁ごと消して見やすくする）
  const frontCut = (R.frontCut = group(bld));
  frontCut.userData.dynamic = true;
  add(frontCut, G.box(7.9, 0.95, 0.26), plaster, -7, WALL_TOP - 0.47, 4.0);
  add(frontCut, G.box(8.4, 0.1, 0.36), darkWood, -7, WALL_TOP - 0.95, 4.0);
  add(frontCut, G.box(8.4, 0.1, 0.36), darkWood, -7, WALL_TOP + 0.02, 4.0);
  R.roundWindows = group(frontCut);
  const roundCols = ['#ffcf3a', '#3a8cff', '#ff4a3a'];
  roundCols.forEach((c, i) => {
    const x = -9.2 + i * 2.2;
    const gm = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.3, roughness: 0.2 });
    gm.userData.lamp = true;
    R.lampGlass.push({ material: gm, base: 1.3 });
    add(R.roundWindows, G.cyl(0.3, 0.3, 0.34, 24), gm, x, WALL_TOP - 0.47, 4.0, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(R.roundWindows, G.torus(0.32, 0.05, 8, 24), mat('#d8b25a', { metalness: 0.7, roughness: 0.3 }), x, WALL_TOP - 0.47, 4.17, { cast: false });
    // 十字の桟
    add(R.roundWindows, G.box(0.6, 0.03, 0.02), darkWood, x, WALL_TOP - 0.47, 4.175, { cast: false });
    add(R.roundWindows, G.box(0.03, 0.6, 0.02), darkWood, x, WALL_TOP - 0.47, 4.175, { cast: false });
  });
  // 内部の梁
  R.innerBeam = add(bld, G.box(7.8, 0.16, 0.16), darkWood, -7, WALL_TOP - 0.1, 1.4);
  R.innerBeam.userData.keep = true;

  // 屋根（持ち上げ可能）
  const roof = (R.roof = group(bld));
  const roofMat = new THREE.MeshStandardMaterial({ map: shinglesTex('#3f6177', [3, 3]), roughness: 0.85, transparent: true, opacity: 1 });
  const pitch = 0.52;
  const run = 4.5;
  const slopeLen = run / Math.cos(pitch) + 0.1;
  const ridgeY = WALL_TOP + 0.1 + Math.tan(pitch) * 4.0;
  for (const s of [-1, 1]) {
    add(roof, G.box(slopeLen, 0.16, 6.3), roofMat, -7 + s * (run / 2), ridgeY - Math.tan(pitch) * run / 2, 1.35, { rot: [0, 0, -s * pitch] });
  }
  const ridgeMat = new THREE.MeshStandardMaterial({ color: '#2f4a5a', roughness: 0.8, transparent: true });
  add(roof, G.cyl(0.12, 0.12, 6.4, 10), ridgeMat, -7, ridgeY + 0.05, 1.35, { rot: [Math.PI / 2, 0, 0] });
  // 妻面（三角）
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-4, 0); gableShape.lineTo(4, 0); gableShape.lineTo(0, ridgeY - WALL_TOP - 0.05); gableShape.lineTo(-4, 0);
  const gableMat = new THREE.MeshStandardMaterial({ color: '#f3e6cb', roughness: 0.8, transparent: true });
  for (const z of [4.0, -1.3]) {
    add(roof, new THREE.ExtrudeGeometry(gableShape, { depth: 0.2, bevelEnabled: false }), gableMat, -7, WALL_TOP + 0.05, z - 0.1);
  }
  // 駅名の看板
  const nameMat = new THREE.MeshStandardMaterial({ map: signTex('はざま駅', { w: 512, h: 160, bg: '#2b3a5c', fg: '#f5dc8a', border: '#d8b25a', size: 96 }), transparent: true, roughness: 0.5 });
  add(roof, G.box(2.6, 0.8, 0.08), nameMat, -7, WALL_TOP + 0.85, 4.16);
  // 風見鶏（星）
  const vane = group(roof, -7, ridgeY + 0.1, 3.9);
  add(vane, G.cyl(0.03, 0.03, 0.9, 6), new THREE.MeshStandardMaterial({ color: '#2f3b36', transparent: true }), 0, 0.45, 0);
  add(vane, G.oct(0.16), glow('#ffd36a', 1.2, { transparent: true }), 0, 0.95, 0, { scale: [1, 1.3, 0.4] });
  R.vane = vane;
  roof.traverse((o) => { if (o.isMesh) o.userData.roof = true; });
  R.roofMats = [];
  roof.traverse((o) => { if (o.isMesh && !R.roofMats.includes(o.material)) R.roofMats.push(o.material); });

  // ---- 内装 ----
  // 切符売り場のブース
  const booth = group(bld);
  const BOOTH_H = 2.25;
  const boothWall = wall(booth, 2.2, BOOTH_H, 0.16, [{ a: 0.5, b: 1.7, y0: 0.95, y1: 1.85 }], mat('#e9d6b0'), wood, 0.95);
  boothWall.position.set(-10.8, FLOOR, 0.95);
  const boothSide = wall(booth, 2.2, BOOTH_H, 0.16, [], mat('#e9d6b0'), wood, 0.95);
  boothSide.position.set(-8.6, FLOOR, 0.95);
  boothSide.rotation.y = Math.PI / 2;
  add(booth, G.box(2.3, 0.08, 0.24), darkWood, -9.7, FLOOR + BOOTH_H + 0.04, 0.95);
  add(booth, G.box(1.5, 0.08, 0.5), darkWood, -9.65, FLOOR + 0.95, 1.15);
  add(booth, G.box(1.24, 0.06, 0.06), darkWood, -9.65, FLOOR + 1.9, 1.03);
  const kippu = new THREE.MeshStandardMaterial({ map: signTex('きっぷ', { w: 256, h: 96, bg: '#3f7d5a', fg: '#fff6dc', border: '#e2bf62', size: 60 }), roughness: 0.6 });
  add(booth, G.box(1.1, 0.42, 0.05), kippu, -9.65, FLOOR + BOOTH_H + 0.3, 0.95);
  for (const s of [-1, 1]) add(booth, G.box(0.04, 0.3, 0.04), darkWood, -9.65 + s * 0.4, FLOOR + BOOTH_H + 0.1, 0.95);
  // 棚と切符
  add(booth, G.box(1.8, 0.06, 0.4), darkWood, -9.8, FLOOR + 1.9, -1.0);
  for (let i = 0; i < 8; i++) add(booth, G.box(0.08, 0.2, 0.06), mat(['#f5e6c0', '#cfe8ff', '#ffd6d6'][i % 3]), -10.5 + i * 0.18, FLOOR + 2.03, -1.0, { cast: false });
  // スツール
  add(booth, G.cyl(0.3, 0.25, 0.75, 14), darkWood, -9.7, FLOOR + 0.375, 0.35);
  // 呼び鈴
  const bell = (R.bell = group(bld, -9.2, FLOOR + 0.99, 1.25));
  add(bell, G.cyl(0.11, 0.13, 0.03, 16), mat('#3a2a20'), 0, 0.015, 0);
  add(bell, G.sphere(0.1, 16, 10, 0), mat('#e2bf62', { metalness: 0.85, roughness: 0.2 }), 0, 0.03, 0, { scale: [1, 0.7, 1] });
  add(bell, G.cyl(0.015, 0.015, 0.06, 6), mat('#e2bf62', { metalness: 0.85, roughness: 0.2 }), 0, 0.12, 0);

  // 壁掛け時計（後ろの壁）
  const clock = (R.clock = group(bld, -8.0, FLOOR + 2.15, -1.12));
  add(clock, G.cyl(0.5, 0.5, 0.14, 32), darkWood, 0, 0.55, 0, { rot: [Math.PI / 2, 0, 0] });
  add(clock, G.cyl(0.43, 0.43, 0.02, 32), new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.5 }), 0, 0.55, 0.075, { rot: [Math.PI / 2, Math.PI / 2, 0], cast: false });
  add(clock, G.torus(0.45, 0.035, 8, 32), mat('#d8b25a', { metalness: 0.8, roughness: 0.3 }), 0, 0.55, 0.08, { cast: false });
  R.hourHand = group(clock, 0, 0.55, 0.095);
  add(R.hourHand, G.box(0.05, 0.24, 0.015), mat('#2a1d14'), 0, 0.1, 0, { cast: false });
  R.minuteHand = group(clock, 0, 0.55, 0.105);
  add(R.minuteHand, G.box(0.03, 0.36, 0.015), mat('#2a1d14'), 0, 0.15, 0, { cast: false });
  add(clock, G.sphere(0.03, 8, 6), mat('#d8b25a'), 0, 0.55, 0.11, { cast: false });
  // 振り子の箱
  add(clock, G.box(0.46, 0.9, 0.12), darkWood, 0, -0.32, 0);
  add(clock, G.box(0.34, 0.72, 0.02), new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.3 }), 0, -0.32, 0.065, { cast: false });
  R.pendulum = group(clock, 0, 0.0, 0.08);
  add(R.pendulum, G.box(0.02, 0.5, 0.01), mat('#d8b25a', { metalness: 0.8, roughness: 0.3 }), 0, -0.25, 0, { cast: false });
  add(R.pendulum, G.cyl(0.08, 0.08, 0.02, 16), mat('#e2bf62', { metalness: 0.9, roughness: 0.2 }), 0, -0.52, 0, { rot: [Math.PI / 2, 0, 0], cast: false });

  // 時刻表
  R.timetable = group(bld, -4.3, FLOOR + 1.85, -1.14);
  add(R.timetable, G.box(1.9, 1.45, 0.06), darkWood, 0, 0, 0);
  add(R.timetable, G.plane(1.76, 1.32), new THREE.MeshStandardMaterial({ map: timetableTex(), roughness: 0.6 }), 0, 0, 0.035, { cast: false });

  // ポスター
  const poster = new THREE.MeshStandardMaterial({ map: signTex('ようこそ 異界の旅へ', { w: 256, h: 320, bg: '#f7e9cf', fg: '#7b2b3a', border: '#c9a35a', size: 26 }), roughness: 0.7 });
  add(bld, G.plane(0.7, 0.9), poster, -10.79, FLOOR + 1.9, 2.95, { rot: [0, Math.PI / 2, 0], cast: false });

  // ベンチ
  R.bench1 = bench(bld, -7.3, FLOOR, 1.95, 0, 1.7);
  R.bench2 = bench(bld, -4.9, FLOOR, 1.95, 0, 1.7);

  // ウサギのトランク
  const suitcase = (R.suitcase = group(bld, -5.95, FLOOR, 2.75, 0.4));
  add(suitcase, G.box(0.6, 0.42, 0.22), mat('#c86a4a'), 0, 0.21, 0);
  add(suitcase, G.box(0.62, 0.04, 0.24), mat('#7a3a2a'), 0, 0.3, 0, { cast: false });
  add(suitcase, G.torus(0.08, 0.02, 6, 12, Math.PI), mat('#3a2a20'), 0, 0.42, 0, { cast: false });

  // ストーブ
  const stove = (R.stove = group(bld, -3.95, FLOOR, 3.15));
  const iron = mat('#2b2b30', { metalness: 0.5, roughness: 0.45 });
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(stove, G.cyl(0.04, 0.03, 0.2, 6), iron, lx, 0.1, lz);
  add(stove, G.cyl(0.3, 0.36, 0.25, 18), iron, 0, 0.32, 0);
  add(stove, G.cyl(0.36, 0.3, 0.5, 18), iron, 0, 0.69, 0);
  add(stove, G.cyl(0.32, 0.36, 0.06, 18), iron, 0, 0.97, 0);
  // 煙突：下半分はそのまま、上半分は屋根といっしょに外れる（上からのぞくときに邪魔にならないよう）
  add(stove, G.cyl(0.08, 0.08, 1.2, 10), iron, 0, 1.57, 0, { cast: false });
  R.stovePipeTop = add(stove, G.cyl(0.08, 0.08, 2.8, 10), iron, 0, 3.57, 0, { cast: false });
  R.stovePipeTop.userData.keep = true;
  R.stoveGlowMat = glow('#ff6a1e', 2.2);
  R.stoveGlowMat.userData.lamp = true;
  add(stove, G.box(0.26, 0.2, 0.02), R.stoveGlowMat, 0, 0.62, 0.345, { cast: false, rot: [-0.12, 0, 0] });
  add(stove, G.box(0.32, 0.03, 0.04), mat('#c8a050', { metalness: 0.7 }), 0, 0.74, 0.35, { cast: false });
  R.fireStoneInStove = add(stove, G.dodeca(0.08), glow('#ff8a3a', 3), 0, 0.6, 0.3, { cast: false });
  R.stoveLight = new THREE.PointLight('#ff7a30', 2.5, 4.5, 1.8);
  R.stoveLight.position.set(0, 0.9, 0.6);
  stove.add(R.stoveLight);
  // 火ばさみ立て（空）
  add(stove, G.cyl(0.07, 0.07, 0.4, 10), iron, 0.48, 0.2, 0.05);

  // 荷物の山（ネズミが隠れる）
  const luggage = (R.luggage = group(bld, -10.0, FLOOR, 3.1, 0.2));
  const trunkMat = (c) => mat(c, { roughness: 0.7 });
  add(luggage, G.box(1.0, 0.5, 0.6), trunkMat('#6a4a7a'), 0, 0.25, 0);
  add(luggage, G.box(1.02, 0.06, 0.62), mat('#d8b25a', { metalness: 0.6 }), 0, 0.42, 0, { cast: false });
  add(luggage, G.box(0.8, 0.42, 0.5), trunkMat('#3f6a5a'), 0.05, 0.71, 0, { rot: [0, 0.2, 0] });
  R.luggageLid = group(luggage, 0.05, 0.92, -0.25);
  add(R.luggageLid, G.box(0.8, 0.08, 0.5), trunkMat('#35594b'), 0, 0.04, 0.25, { rot: [0, 0.2, 0] });
  R.luggageLid.rotation.x = -0.18;
  add(luggage, G.cyl(0.25, 0.25, 0.35, 16), trunkMat('#e8a0a0'), -0.75, 0.175, 0.2);
  add(luggage, G.cyl(0.26, 0.26, 0.04, 16), trunkMat('#c86a7a'), -0.75, 0.36, 0.2);
  R.luggageSpot = new THREE.Vector3(-10.0, FLOOR + 1.0, 3.1);

  // ペンダントライト
  for (const x of [-8.2, -5.6]) {
    add(bld, G.cyl(0.01, 0.01, 0.8, 4), mat('#222'), x, WALL_TOP - 0.5, 1.4, { cast: false });
    add(bld, G.cone(0.28, 0.22, 16, 1), mat('#3f7d5a', { side: THREE.DoubleSide }), x, WALL_TOP - 0.95, 1.4, { cast: false });
    const bulb = glow('#ffe0a0', 2.2);
    bulb.userData.lamp = true;
    R.lampGlass.push({ material: bulb, base: 2.2 });
    add(bld, G.sphere(0.09, 10, 8), bulb, x, WALL_TOP - 1.07, 1.4, { cast: false });
  }
  R.roomLight = new THREE.PointLight('#ffcf8a', 5, 10, 1.5);
  R.roomLight.position.set(-6.9, WALL_TOP - 1.2, 1.4);
  bld.add(R.roomLight);
  R.lights.push(R.roomLight);

  // 入口の鉢植え（ビー玉）
  const plant = (R.plant = group(root, -2.35, 0, 4.75));
  add(plant, G.cyl(0.34, 0.24, 0.55, 16), mat('#c8643c'), 0, 0.275, 0);
  add(plant, G.torus(0.33, 0.05, 8, 18), mat('#b4552f'), 0, 0.54, 0, { rot: [Math.PI / 2, 0, 0] });
  add(plant, G.cyl(0.3, 0.3, 0.04, 16), mat('#4a3020'), 0, 0.5, 0, { cast: false });
  const leafM = mat('#4f9a4a', { flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    add(plant, G.sphere(0.1, 8, 6), leafM, Math.cos(a) * 0.18, 0.75 + (i % 3) * 0.12, Math.sin(a) * 0.18, { scale: [0.8, 2.6, 0.5], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
  }
  add(plant, G.sphere(0.12, 10, 8), mat('#ff7aa0'), 0, 1.2, 0, { scale: [1, 0.7, 1] });
  R.marble = add(plant, G.sphere(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: '#7fd8ff', emissive: '#5fc6e8', emissiveIntensity: 1.6, roughness: 0.05 }), 0.14, 0.54, 0.16, { cast: false });

  // 駅舎まわりの花壇
  for (const [x, z] of [[-10.0, 4.95], [-4.0, 4.95]]) {
    add(root, G.box(1.6, 0.25, 0.5), mat('#8a5d3b'), x, 0.125, z + 0.6);
    const fg = group(root, x, 0.25, z + 0.6);
    flowerPatch(fg, 0, 0, 0.6, 12, Math.floor(x * 10));
  }

  // ---------------- 駅前広場 ----------------
  const plazaLamp = lampPost(root, -11.6, 7.3, { lights: R.lights, intensity: 2.5 });
  const plazaLamp2 = lampPost(root, 5.9, 4.6, { lights: R.lights, intensity: 2.5 });
  R.lampGlass.push(plazaLamp.glass, plazaLamp2.glass);

  // 丸ポスト
  const post2 = (R.mailbox = group(root, -1.4, 0, 7.4, -0.2));
  const red = mat('#d2382c', { roughness: 0.5 });
  add(post2, G.cyl(0.32, 0.34, 0.12, 20), mat('#3a3a40'), 0, 0.06, 0);
  add(post2, G.cyl(0.28, 0.28, 1.2, 24), red, 0, 0.72, 0);
  add(post2, G.sphere(0.28, 24, 10, 0), red, 0, 1.32, 0, { scale: [1, 0.5, 1] });
  add(post2, G.cyl(0.3, 0.3, 0.06, 24), red, 0, 1.33, 0);
  add(post2, G.box(0.3, 0.05, 0.08), mat('#1a1a1e'), 0, 1.12, 0.26, { cast: false });
  add(post2, G.plane(0.22, 0.22), new THREE.MeshStandardMaterial({ map: signTex('〒', { w: 128, h: 128, bg: '#ffffff', fg: '#d2382c', border: null, size: 96 }) }), 0, 0.8, 0.285, { cast: false });
  R.mailboxSpot = new THREE.Vector3(-1.4, 1.5, 7.4);

  // 井戸
  const well = (R.well = group(root, 1.0, 0, 5.9));
  const wellStone = new THREE.MeshStandardMaterial({ map: stoneTex('#a7a092', [4, 1]), roughness: 1 });
  add(well, new THREE.CylinderGeometry(0.85, 0.9, 0.85, 20, 1, true), wellStone, 0, 0.425, 0);
  add(well, new THREE.CylinderGeometry(0.68, 0.68, 0.85, 20, 1, true), mat('#5a5048', { side: THREE.BackSide }), 0, 0.425, 0, { cast: false });
  add(well, G.torus(0.77, 0.1, 8, 24), mat('#9a9286'), 0, 0.86, 0, { rot: [Math.PI / 2, 0, 0] });
  add(well, G.circle(0.68, 20), new THREE.MeshStandardMaterial({ map: waterTex(), roughness: 0.1, emissive: '#1a3a5a', emissiveIntensity: 0.3 }), 0, 0.35, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  for (const s of [-1, 1]) add(well, G.box(0.14, 2.1, 0.14), wood, s * 0.85, 1.05, 0);
  for (const s of [-1, 1]) add(well, G.box(1.1, 0.06, 1.4), mat('#8a4a3a'), s * 0.48, 2.25, 0, { rot: [0, 0, -s * 0.55] });
  R.wellAxle = group(well, 0, 1.7, 0);
  add(R.wellAxle, G.cyl(0.08, 0.08, 1.7, 10), wood, 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  add(R.wellAxle, G.cyl(0.14, 0.14, 0.5, 12), mat('#c9a77a'), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  const crank = group(R.wellAxle, 0.95, 0, 0);
  add(crank, G.box(0.05, 0.4, 0.05), mat('#3a3a40'), 0, 0.2, 0);
  add(crank, G.cyl(0.03, 0.03, 0.25, 6), mat('#3a3a40'), 0.12, 0.38, 0, { rot: [0, 0, Math.PI / 2] });
  R.bucket = group(well, 0, 1.15, 0);
  R.rope = add(well, G.cyl(0.015, 0.015, 1, 4), mat('#c9b08a'), 0, 1.4, 0, { cast: false });
  add(R.bucket, G.cyl(0.18, 0.14, 0.28, 12), new THREE.MeshStandardMaterial({ map: boardsTex('#9a6a44', [2, 1]) }), 0, 0, 0);
  add(R.bucket, G.torus(0.17, 0.015, 6, 14), mat('#3a3a40'), 0, 0.1, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(R.bucket, G.torus(0.16, 0.012, 6, 14, Math.PI), mat('#3a3a40'), 0, 0.14, 0, { cast: false });
  R.broochInBucket = add(R.bucket, G.torus(0.06, 0.025, 8, 16, Math.PI * 1.4), glow('#ffe08a', 1.5), 0, 0.2, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  R.broochInBucket.visible = false;

  // ネズミの切り株の家
  const stump = (R.stump = group(root, 4.6, 0, 7.0));
  const bark = mat('#7a5a3e', { roughness: 1 });
  add(stump, G.cyl(0.55, 0.65, 0.75, 14), bark, 0, 0.375, 0);
  add(stump, G.cyl(0.53, 0.53, 0.02, 20), new THREE.MeshStandardMaterial({ map: (() => {
    const t = signTex('', { w: 128, h: 128, bg: '#c9a07a', border: null });
    return t;
  })() }), 0, 0.76, 0, { cast: false });
  for (let i = 1; i < 4; i++) add(stump, G.torus(i * 0.13, 0.008, 4, 24), mat('#8a6040'), 0, 0.765, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(stump, G.circle(0.16, 16), mat('#4a2c1a'), 0, 0.22, 0.6, { scale: [1, 1.3, 1], cast: false });
  add(stump, G.torus(0.16, 0.025, 6, 16, Math.PI), mat('#c9a77a'), 0, 0.22, 0.6, { scale: [1, 1.3, 1], cast: false });
  add(stump, G.sphere(0.02, 6, 4), mat('#e2bf62'), 0.08, 0.2, 0.62, { cast: false });
  const stumpWin = glow('#ffcf6a', 1.8);
  stumpWin.userData.lamp = true;
  R.lampGlass.push({ material: stumpWin, base: 1.8 });
  add(stump, G.circle(0.07, 12), stumpWin, 0.35, 0.48, 0.48, { rot: [0, 0.6, 0], cast: false });
  add(stump, G.cyl(0.05, 0.06, 0.25, 8), mat('#8a8a90'), -0.3, 0.88, -0.2);
  // きのこ
  for (const [mx, mz, ms] of [[-0.6, 0.35, 1], [-0.75, 0.05, 0.7], [0.65, -0.3, 0.8]]) {
    add(stump, G.cyl(0.03 * ms, 0.04 * ms, 0.14 * ms, 6), mat('#f2e8d8'), mx, 0.07 * ms, mz);
    add(stump, G.sphere(0.09 * ms, 10, 6, 0), glow('#ff9ac0', 0.6), mx, 0.15 * ms, mz, { scale: [1, 0.6, 1] });
  }
  // 戦利品のハンドル
  R.handleTrophy = group(stump, 0.05, 0.78, 0.05);
  makeValveWheel(R.handleTrophy);
  R.handleTrophy.rotation.x = -Math.PI / 2 + 0.25;
  R.handleTrophy.position.y = 0.86;

  // 倉庫
  const shed = (R.shed = group(root, 9.3, 0, 4.0));
  const shedWall = new THREE.MeshStandardMaterial({ map: boardsTex('#8a5d3b', [2, 1]), roughness: 0.9 });
  add(shed, G.box(3.1, 0.15, 2.5), mat('#7a6a5a'), 0, 0.075, 0);
  add(shed, G.box(3.2, 2.4, 0.15), shedWall, 0, 1.2, -1.25);
  add(shed, G.box(0.15, 2.4, 2.6), shedWall, -1.55, 1.2, 0);
  add(shed, G.box(0.15, 2.4, 2.6), shedWall, 1.55, 1.2, 0);
  // 正面の壁（入口）
  add(shed, G.box(0.85, 2.4, 0.15), shedWall, -1.2, 1.2, 1.25);
  add(shed, G.box(0.75, 2.4, 0.15), shedWall, 1.2, 1.2, 1.25);
  add(shed, G.box(1.8, 0.4, 0.15), shedWall, 0.0, 2.2, 1.25);
  const shedRoofMat = mat('#9a3f32');
  for (const s of [-1, 1]) add(shed, G.box(1.95, 0.12, 3.1), shedRoofMat, s * 0.85, 2.75, 0, { rot: [0, 0, -s * 0.5] });
  const sg = new THREE.Shape();
  sg.moveTo(-1.6, 0); sg.lineTo(1.6, 0); sg.lineTo(0, 0.85); sg.lineTo(-1.6, 0);
  for (const z of [1.25, -1.25]) add(shed, new THREE.ExtrudeGeometry(sg, { depth: 0.1, bevelEnabled: false }), shedWall, 0, 2.4, z - 0.05);
  // 中身
  add(shed, G.box(3.0, 0.02, 2.4), mat('#4a3c30'), 0, 0.16, 0, { cast: false });
  R.shedLight = new THREE.PointLight('#ffcf8a', 0, 4, 1.5);
  R.shedLight.position.set(0, 1.9, 0.3);
  shed.add(R.shedLight);
  add(shed, G.box(1.2, 0.05, 0.3), wood, 0.6, 1.4, -1.05);
  R.tongs = group(shed, -0.2, 1.3, -1.1);
  add(R.tongs, G.box(0.04, 1.1, 0.04), mat('#3d3d48', { metalness: 0.6, roughness: 0.4 }), -0.04, 0, 0, { rot: [0, 0, 0.05] });
  add(R.tongs, G.box(0.04, 1.1, 0.04), mat('#3d3d48', { metalness: 0.6, roughness: 0.4 }), 0.04, 0, 0, { rot: [0, 0, -0.05] });
  add(R.tongs, G.torus(0.06, 0.02, 6, 12), mat('#8a5a3a'), 0, 0.58, 0, { cast: false });
  // スコップ・ロープ・木箱
  add(shed, G.cyl(0.025, 0.025, 1.2, 6), wood, 0.9, 0.8, -1.0, { rot: [0, 0, 0.25] });
  add(shed, G.box(0.25, 0.32, 0.04), mat('#8a8f99', { metalness: 0.6 }), 1.05, 0.25, -1.0, { rot: [0, 0, 0.25] });
  add(shed, G.torus(0.25, 0.06, 6, 16), mat('#c9b08a'), -1.0, 0.25, -0.6, { rot: [Math.PI / 2, 0, 0] });
  add(shed, G.box(0.6, 0.45, 0.5), new THREE.MeshStandardMaterial({ map: planksTex('#b98a58', '#7a5634', 4) }), 0.9, 0.38, 0.0);
  // 引き戸
  R.shedDoor = group(shed, -0.05, 0, 1.36);
  add(R.shedDoor, G.box(1.65, 2.0, 0.08), new THREE.MeshStandardMaterial({ map: boardsTex('#a06a42', [1, 1]) }), 0, 1.15, 0);
  add(R.shedDoor, G.box(1.65, 0.1, 0.1), darkWood, 0, 1.15, 0.02, { rot: [0, 0, 0.88] });
  add(R.shedDoor, G.box(0.06, 0.25, 0.06), mat('#3a3a40', { metalness: 0.5 }), -0.65, 1.1, 0.06);
  add(shed, G.box(3.2, 0.06, 0.1), mat('#3a3a40', { metalness: 0.5 }), 0, 2.2, 1.42);
  // 錠前（三色リング）
  R.lock = group(shed, 0.83, 1.15, 1.47);
  add(R.lock, G.box(0.26, 0.22, 0.1), mat('#c8a050', { metalness: 0.8, roughness: 0.3 }), 0, 0, 0);
  add(R.lock, G.torus(0.09, 0.025, 6, 14, Math.PI), mat('#a0a4ac', { metalness: 0.8 }), 0, 0.11, 0, { cast: false });
  R.lockRings = [];
  for (let i = 0; i < 3; i++) {
    const ring = add(R.lock, G.cyl(0.055, 0.055, 0.05, 12), mat('#ffffff'), -0.075 + i * 0.075, -0.03, 0.065, { rot: [Math.PI / 2, 0, 0], cast: false });
    R.lockRings.push(ring);
  }
  // 倉庫の札
  add(shed, G.box(0.9, 0.3, 0.04), new THREE.MeshStandardMaterial({ map: signTex('倉庫', { w: 256, h: 96, bg: '#f4ead2', size: 56 }) }), -1.15, 2.05, 1.34);

  // 大きな木（右手前・うろあり）
  const bigTree = tree(root, 12.4, 7.6, { scale: 1.15, seed: 4, hollow: true });
  R.bigTree = bigTree.g;
  R.treeSpot = new THREE.Vector3(12.4, 1.3, 8.15);
  // 奥の木
  tree(root, -12.9, -8.6, { scale: 1.0, seed: 8, colors: ['#5f9a4a', '#7fb35a', '#4a8a3e', '#94c06a'] });
  tree(root, 13.3, -9.3, { scale: 0.8, seed: 12 });
  tree(root, -13.6, 8.7, { scale: 0.75, seed: 15, colors: ['#f2a8c0', '#f7c6d6', '#e48aa8'] });
  bush(root, -13.4, 3.0, 1.1, 2);
  bush(root, -6.8, -9.6, 1.2, 3);
  bush(root, 6.0, -9.6, 1.0, 4, '#6fa85a');
  bush(root, 13.6, 1.0, 1.2, 5);
  bush(root, 10.6, 9.4, 0.9, 6, '#7aa85a');
  bush(root, -4.5, 9.4, 0.8, 7);

  // 池（カエルのふるさと）
  const pond = (R.pond = group(root, -7.6, 0, -8.3));
  add(pond, new THREE.ShapeGeometry(roundRectShape(4.6, 2.6, 1.2), 10), new THREE.MeshStandardMaterial({ map: waterTex(), roughness: 0.08, metalness: 0.1, emissive: '#1a3a5a', emissiveIntensity: 0.25 }), 0, 0.03, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const pr = rng(77);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    add(pond, G.dodeca(0.2 + pr() * 0.15), mat('#9a948a', { flatShading: true }), Math.cos(a) * 2.35, 0.08, Math.sin(a) * 1.35, { rot: [pr(), pr(), pr()] });
  }
  for (let i = 0; i < 5; i++) {
    const lp = add(pond, new THREE.CircleGeometry(0.28, 14, 0.4, Math.PI * 1.8), mat('#5f9a3a', { side: THREE.DoubleSide }), -1.3 + i * 0.6 + pr() * 0.3, 0.05, -0.6 + pr() * 1.0, { rot: [-Math.PI / 2, 0, pr() * 6], cast: false });
    if (i % 2) add(pond, G.sphere(0.07, 8, 6), mat('#ffb0d0'), lp.position.x, 0.1, lp.position.z, { scale: [1, 0.6, 1] });
  }
  for (let i = 0; i < 7; i++) add(pond, G.cyl(0.02, 0.025, 0.9, 4), mat('#6a8a3a'), 1.9 + pr() * 0.4, 0.45, -0.8 + pr() * 1.5, { rot: [pr() * 0.2, 0, pr() * 0.2], cast: false });

  // 給水塔
  const tower = (R.waterTower = group(root, 2.05, 0, -8.2));
  const towerWood = mat('#6e4b35');
  for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    add(tower, G.box(0.18, 3.4, 0.18), towerWood, lx, 1.7, lz);
  }
  for (const y of [1.0, 2.3]) {
    for (const s of [-1, 1]) {
      add(tower, G.box(1.8, 0.08, 0.08), towerWood, 0, y, s * 0.8, { rot: [0, 0, 0.6] });
      add(tower, G.box(0.08, 0.08, 1.8), towerWood, s * 0.8, y, 0, { rot: [0.6, 0, 0] });
    }
  }
  add(tower, G.box(2.0, 0.15, 2.0), towerWood, 0, 3.35, 0);
  const tankMat = new THREE.MeshStandardMaterial({ map: boardsTex('#8a5d3b', [3, 1]), roughness: 0.9 });
  add(tower, G.cyl(1.15, 1.15, 1.7, 24), tankMat, 0, 4.25, 0);
  for (const y of [3.6, 4.25, 4.9]) add(tower, G.torus(1.16, 0.04, 6, 32), mat('#3a3a40', { metalness: 0.5 }), 0, y, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(tower, G.cone(1.35, 0.9, 24), mat('#9a3f32'), 0, 5.55, 0);
  add(tower, G.sphere(0.1, 8, 6), mat('#e2bf62', { metalness: 0.7 }), 0, 6.05, 0);
  add(tower, G.plane(0.7, 0.7), new THREE.MeshStandardMaterial({ map: signTex('水', { w: 128, h: 128, bg: '#f4ead2', fg: '#2b5a8a', size: 92 }), transparent: true }), 0, 4.25, 1.16, { cast: false });
  // 給水アーム
  R.spout = group(tower, 0, 3.75, 0.95);
  add(R.spout, G.cyl(0.12, 0.12, 1.9, 12), mat('#3a3a40', { metalness: 0.5, roughness: 0.4 }), 0, 0, 0.95, { rot: [Math.PI / 2, 0, 0] });
  add(R.spout, G.cyl(0.16, 0.12, 0.2, 12), mat('#3a3a40', { metalness: 0.5 }), 0, -0.05, 1.9);
  R.spout.rotation.x = -0.95;
  // バルブ
  add(tower, G.cyl(0.08, 0.08, 3.4, 8), mat('#3a3a40', { metalness: 0.5 }), 0.95, 1.7, 1.0);
  add(tower, G.box(0.24, 0.24, 0.24), mat('#3a3a40', { metalness: 0.5 }), 0.95, 1.2, 1.0);
  add(tower, G.cyl(0.03, 0.03, 0.25, 8), mat('#a0a4ac', { metalness: 0.8 }), 0.95, 1.2, 1.2, { rot: [Math.PI / 2, 0, 0] });
  R.valveWheel = group(tower, 0.95, 1.2, 1.32);
  makeValveWheel(R.valveWheel);
  R.valveWheel.visible = false;
  // 水の流れ
  R.waterStream = add(root, G.cyl(0.09, 0.12, 1, 10, true), new THREE.MeshStandardMaterial({ color: '#8fd4ff', emissive: '#3a9ad8', emissiveIntensity: 0.6, transparent: true, opacity: 0.75 }), 0, 0, 0, { cast: false });
  R.waterStream.visible = false;
  R.waterStream.userData.noPick = true;

  // 信号機
  const signal = (R.signal = group(root, 12.7, 0, -6.9, -0.5));
  const sigIron = mat('#3a3f48', { metalness: 0.5, roughness: 0.5 });
  add(signal, G.box(0.7, 0.3, 0.7), mat('#a8a49a'), 0, 0.15, 0);
  add(signal, G.cyl(0.1, 0.12, 5.2, 10), sigIron, 0, 2.9, 0);
  for (let i = 0; i < 12; i++) add(signal, G.box(0.3, 0.03, 0.03), sigIron, 0, 0.5 + i * 0.38, 0.16, { cast: false });
  for (const s of [-1, 1]) add(signal, G.box(0.03, 4.6, 0.03), sigIron, s * 0.15, 2.6, 0.16, { cast: false });
  add(signal, G.box(0.8, 0.06, 0.8), sigIron, 0, 5.2, 0);
  const head = group(signal, 0, 4.3, 0.12);
  add(head, G.box(0.5, 1.15, 0.3), mat('#1e2228'), 0, 0, 0);
  R.sigRed = new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2a1a', emissiveIntensity: 3, roughness: 0.2 });
  R.sigBlue = new THREE.MeshStandardMaterial({ color: '#1a4a3a', emissive: '#30ffc0', emissiveIntensity: 0, roughness: 0.2 });
  add(head, G.cyl(0.16, 0.16, 0.06, 18), R.sigRed, 0, 0.27, 0.16, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(head, G.cyl(0.16, 0.16, 0.06, 18), R.sigBlue, 0, -0.27, 0.16, { rot: [Math.PI / 2, 0, 0], cast: false });
  for (const y of [0.27, -0.27]) add(head, G.cyl(0.2, 0.2, 0.25, 18, true), mat('#1e2228', { side: THREE.DoubleSide }), 0, y + 0.12, 0.2, { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5] });
  R.sigLight = new THREE.PointLight('#ff3a2a', 1.5, 4, 2);
  R.sigLight.position.set(0, 4.3, 0.8);
  signal.add(R.sigLight);
  // カラスの巣
  const nest = group(signal, 0, 5.25, 0);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add(nest, G.cyl(0.02, 0.02, 0.5, 4), mat('#7a5a3a'), Math.cos(a) * 0.25, 0.08, Math.sin(a) * 0.25, { rot: [Math.random(), a, Math.PI / 2 + Math.random() * 0.4], cast: false });
  }
  add(nest, G.sphere(0.04, 6, 4), glow('#ffd36a', 1), 0.15, 0.12, 0.05, { cast: false });
  add(nest, G.sphere(0.035, 6, 4), glow('#a0e0ff', 1), -0.12, 0.12, -0.08, { cast: false });
  R.crowSpot = new THREE.Vector3(12.7, 5.3, -6.9);

  // 信号所
  const box = (R.signalBox = group(root, 11.6, 0, -2.4));
  const sbWall = new THREE.MeshStandardMaterial({ map: boardsTex('#d8c49a', [2, 1]), roughness: 0.9 });
  add(box, G.box(2.2, 0.3, 2.0), mat('#8a8070'), 0, 0.15, 0);
  add(box, G.box(2.2, 2.3, 0.12), sbWall, 0, 1.45, -0.95);
  add(box, G.box(0.12, 2.3, 2.0), sbWall, -1.05, 1.45, 0);
  add(box, G.box(0.12, 2.3, 2.0), sbWall, 1.05, 1.45, 0);
  add(box, G.box(0.6, 2.3, 0.12), sbWall, -0.8, 1.45, 0.95);
  add(box, G.box(0.6, 2.3, 0.12), sbWall, 0.8, 1.45, 0.95);
  add(box, G.box(1.0, 0.3, 0.12), sbWall, 0, 2.45, 0.95);
  add(box, G.box(2.6, 0.12, 2.4), mat('#3f6177'), 0, 2.66, 0, { rot: [0.12, 0, 0] });
  windowFrame(box, -1.05, 1.7, 0.1, 1.0, 0.7, Math.PI / 2, winGlass, darkWood);
  add(box, G.box(1.2, 0.3, 0.04), new THREE.MeshStandardMaterial({ map: signTex('信号所', { w: 256, h: 96, bg: '#2b3a5c', fg: '#f5dc8a', border: '#d8b25a', size: 54 }) }), 0, 2.2, 1.03);
  R.sigBoxDoor = group(box, -0.5, 0, 1.0);
  add(R.sigBoxDoor, G.box(1.0, 2.0, 0.07), new THREE.MeshStandardMaterial({ map: boardsTex('#5a7a5a', [1, 1]) }), 0.5, 1.3, 0);
  add(R.sigBoxDoor, G.sphere(0.05, 8, 6), mat('#e2bf62', { metalness: 0.8 }), 0.88, 1.3, 0.06);
  // 中のレバー
  R.levers = [];
  const leverCols = ['#e8e8e8', '#e8e8e8', '#e8e8e8', '#e8e8e8'];
  for (let i = 0; i < 4; i++) {
    const lv = group(box, -0.55 + i * 0.37, 0.35, -0.3);
    add(lv, G.box(0.06, 1.1, 0.06), mat('#c43a2e'), 0, 0.55, 0);
    add(lv, G.box(0.1, 0.1, 0.1), mat(leverCols[i]), 0, 1.1, 0);
    lv.rotation.x = -0.35;
    R.levers.push(lv);
  }
  add(box, G.box(1.6, 0.3, 0.3), mat('#3a3a40'), 0, 0.42, -0.3);

  // 柵
  fence(root, -14.2, 10.2, -5.5, 10.2);
  fence(root, 5.5, 10.2, 10.5, 10.2);
  fence(root, -14.6, 9.4, -14.6, 1.5);
  fence(root, 14.6, 3.5, 14.6, -1.5);

  // 草むら（インスタンス）
  const tuftGeo = new THREE.ConeGeometry(0.06, 0.35, 4);
  tuftGeo.translate(0, 0.17, 0);
  const tuftMat = mat('#6fa04a', { flatShading: true });
  const blocked = [
    [-11.4, -2.6, -1.6, 5.2], [-14, 10, -4.2, -1.2], [-14.5, 15, -6.6, -3.8], [-10, -5, 4.0, 9.2],
    [-2.5, 10.5, 5.0, 8.0], [7.4, 11.2, 2.4, 5.8], [0.2, 2.2, -1.4, 5.5], [-10.2, -5, -9.8, -6.8],
    [0.8, 3.3, -9.5, -6.9], [10.2, 13, -3.8, -1.2],
  ];
  const tr = rng(99);
  const dummy = new THREE.Object3D();
  const tufts = [];
  for (let i = 0; i < 900 && tufts.length < 520; i++) {
    const x = (tr() - 0.5) * 28.5, z = (tr() - 0.5) * 20.5;
    if (blocked.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.set((tr() - 0.5) * 0.4, tr() * 6, (tr() - 0.5) * 0.4);
    dummy.scale.setScalar(0.6 + tr() * 0.9);
    dummy.updateMatrix();
    tufts.push(dummy.matrix.clone());
  }
  const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftMat, tufts.length);
  tufts.forEach((m, i) => tuftInst.setMatrixAt(i, m));
  tuftInst.receiveShadow = true;
  tuftInst.userData.noPick = true;
  root.add(tuftInst);
  // 野の花
  flowerPatch(root, -12.8, 1.5, 1.0, 14, 51);
  flowerPatch(root, 13.0, -0.5, 0.8, 10, 52);
  flowerPatch(root, 7.0, 9.0, 1.2, 16, 53);
  flowerPatch(root, -3.5, -8.5, 1.2, 14, 54, ['#b58cff', '#ffffff', '#8fd4ff']);
  // 光るきのこ
  for (const [x, z] of [[11.4, 8.6], [13.4, 6.6], [-12.2, -7.6], [-13.8, -9.0]]) {
    add(root, G.cyl(0.03, 0.04, 0.15, 6), mat('#f2e8d8'), x, 0.075, z);
    add(root, G.sphere(0.1, 10, 6, 0), glow('#8fe3ff', 0.9), x, 0.16, z, { scale: [1, 0.6, 1] });
  }
  // 石
  for (let i = 0; i < 18; i++) {
    const x = (tr() - 0.5) * 27, z = (tr() - 0.5) * 19;
    if (blocked.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue;
    add(root, G.dodeca(0.12 + tr() * 0.15), mat('#a39d92', { flatShading: true }), x, 0.05, z, { rot: [tr(), tr(), tr()], scale: [1, 0.6, 1] });
  }

  // 窓のガラス参照
  R.windowGlass.push(winGlass);

  // 動くもの・表示を切り替えるものは結合しない
  for (const o of [R.roof, R.vane, R.hourHand, R.minuteHand, R.pendulum, R.tongs, R.luggageLid, R.wellAxle, R.bucket,
    R.handleTrophy, R.shedDoor, R.lock, R.spout, R.valveWheel, R.sigBoxDoor, ...R.levers]) o.userData.dynamic = true;
  for (const o of [R.rope, R.marble, R.broochInBucket, R.fireStoneInStove, R.waterStream]) o.userData.keep = true;
  return R;
}

/** 給水塔の赤いハンドル */
function makeValveWheel(parent) {
  const red = mat('#c43a2e', { roughness: 0.5 });
  add(parent, G.torus(0.22, 0.035, 8, 24), red, 0, 0, 0, { cast: false });
  for (let i = 0; i < 4; i++) add(parent, G.box(0.44, 0.04, 0.04), red, 0, 0, 0, { rot: [0, 0, (i * Math.PI) / 4], cast: false });
  add(parent, G.cyl(0.05, 0.05, 0.08, 10), mat('#8a8f99', { metalness: 0.7 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
}

export { softCircleTexture };
