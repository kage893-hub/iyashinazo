import * as THREE from 'three';
import { waterize, lightPool } from '../../lib/livefx.js';
import { add, mat, glow, G, group, rng, signTex, canvasTex, roundRectShape, FONT } from '../../lib/util.js';
import { bench, flowerPatch, tree, bush } from '../station/diorama.js';
import { grassTex, boardsTex, planksTex, shinglesTex, stoneTex } from '../station/textures.js';
import { cobbleTex } from '../sky/textures.js';

// ---------------------------------------------------------------
// 寂れた温泉街の箱庭
// 島は x[-15,15] z[-11,11]、線路は z=-6、ホーム上面 y=0.75
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
const FLOOR = 0.75;

const shojiTex = () => canvasTex(128, 128, (ctx, w, h) => {
  ctx.fillStyle = '#f6f0e0'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo((i * w) / 4, 0); ctx.lineTo((i * w) / 4, h); ctx.stroke(); }
  for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, (i * h) / 3); ctx.lineTo(w, (i * h) / 3); ctx.stroke(); }
});

const norenTex = (ch, bg = '#2b3a6a') => canvasTex(256, 192, (ctx, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 1; i < 3; i++) ctx.fillRect((i * w) / 3 - 2, h * 0.35, 4, h);
  ctx.fillStyle = '#fbf4e2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 120px ${FONT}`;
  ctx.fillText(ch, w / 2, h * 0.5);
});

const lanternTex = (ch) => canvasTex(256, 128, (ctx, w, h) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,60,30,0.35)'; ctx.lineWidth = 2;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, (i * h) / 8); ctx.lineTo(w, (i * h) / 8); ctx.stroke(); }
  if (ch) {
    ctx.fillStyle = '#2a1a14'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 64px ${FONT}`; ctx.fillText(ch, w / 2, h / 2 + 2);
  }
});

/** 赤い提灯（emissive をあとから切り替える） */
export function chochin(parent, x, y, z, { s = 1, color = '#d8402e', ch = '', mats } = {}) {
  const g = group(parent, x, y, z);
  const m = new THREE.MeshStandardMaterial({ color, map: lanternTex(ch), emissive: '#ffb050', emissiveMap: lanternTex(ch), emissiveIntensity: 0, roughness: 0.6 });
  m.userData.lamp = true;
  // 球のUV中央は側面を向くので、文字の中央を正面（+Z）へ回す。
  add(g, G.sphere(0.22 * s, 24, 16), m, 0, 0, 0, { scale: [1, 1.25, 1], rot: [0, -Math.PI / 2, 0] });
  add(g, G.cyl(0.13 * s, 0.13 * s, 0.06 * s, 12), mat('#2a1a14'), 0, 0.27 * s, 0);
  add(g, G.cyl(0.13 * s, 0.13 * s, 0.06 * s, 12), mat('#2a1a14'), 0, -0.27 * s, 0);
  add(g, G.cyl(0.008, 0.008, 0.2, 4), mat('#2a1a14'), 0, 0.38 * s, 0, { cast: false });
  if (mats) mats.push(m);
  return { g, m };
}

/** 瓦屋根の和風の家（正面が開いている／閉じている） */
function wahouse(parent, x, z, { w = 4, d = 3, h = 2.4, ry = 0, wall = '#e8dcc4', roof = '#5a5a66', open = false, snow = true } = {}) {
  const g = group(parent, x, 0, z, ry);
  const wood = mat('#6a4a32');
  const wallM = mat(wall);
  add(g, G.box(w + 0.2, 0.35, d + 0.2), mat('#9a948a'), 0, 0.175, 0);
  // 柱
  for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) add(g, G.box(0.18, h, 0.18), wood, px, h / 2 + 0.35, pz);
  add(g, G.box(w, h, 0.12), wallM, 0, h / 2 + 0.35, -d / 2 + 0.06);
  for (const s of [-1, 1]) add(g, G.box(0.12, h, d), wallM, s * (w / 2 - 0.06), h / 2 + 0.35, 0);
  if (!open) {
    const sh = new THREE.MeshStandardMaterial({ map: shojiTex(), emissive: '#ffcf8a', emissiveMap: shojiTex(), emissiveIntensity: 0, roughness: 0.9 });
    sh.userData.lamp = true;
    add(g, G.box(w - 0.2, h - 0.2, 0.08), sh, 0, h / 2 + 0.35, d / 2 - 0.06);
    g.userData.shoji = sh;
  }
  // 正面の梁（上から中をのぞくときに消せるよう、別グループにしておく）
  const front = group(g);
  front.userData.dynamic = true;
  add(front, G.box(w + 0.1, 0.14, 0.14), wood, 0, h + 0.35, d / 2);
  add(g, G.box(w + 0.1, 0.14, 0.14), wood, 0, h + 0.35, -d / 2);
  // 屋根（切妻・瓦）
  const roofG = group(g, 0, h + 0.4, 0);
  const tile = new THREE.MeshStandardMaterial({ map: shinglesTex(roof, [4, 2]), roughness: 0.85, transparent: true });
  const pitch = 0.5;
  const run = d / 2 + 0.5;
  const len = run / Math.cos(pitch);
  for (const s of [-1, 1]) {
    add(roofG, G.box(w + 0.9, 0.14, len), tile, 0, Math.tan(pitch) * run / 2, s * run / 2, { rot: [s * pitch, 0, 0] });
    if (snow) add(roofG, G.box(w + 0.6, 0.08, len * 0.7), new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: 1, transparent: true }), 0, Math.tan(pitch) * run / 2 + 0.11, s * run / 2 * 0.85, { rot: [s * pitch, 0, 0] });
  }
  add(roofG, G.box(w + 1.0, 0.16, 0.22), mat('#3a3a44', { transparent: true }), 0, Math.tan(pitch) * run + 0.04, 0);
  const gab = new THREE.Shape();
  gab.moveTo(-d / 2, 0); gab.lineTo(d / 2, 0); gab.lineTo(0, Math.tan(pitch) * (d / 2)); gab.lineTo(-d / 2, 0);
  for (const s of [-1, 1]) {
    const gm = add(roofG, new THREE.ExtrudeGeometry(gab, { depth: 0.1, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: wall, transparent: true }), s * (w / 2) - 0.05, -0.05, 0, { rot: [0, Math.PI / 2, 0] });
    void gm;
  }
  roofG.traverse((o) => { if (o.isMesh) o.userData.roof = true; });
  return { g, roof: roofG, front };
}

export function buildOnsenDiorama(scene) {
  const root = group(scene);
  const R = { root, lights: [], lampMats: [], snow: [] };
  const wood = mat('#6a4a32');
  const darkWood = mat('#4a3424');
  const stone = mat('#8f8a82', { flatShading: true, roughness: 1 });

  // ---------------- 地面 ----------------
  const grass = new THREE.MeshStandardMaterial({ map: grassTex('#7d9a62', [10, 7]), roughness: 1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(29.6, 21.6, 2.4), 12), grass, 0, 0.002, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // 石だたみの通り
  const cobble = new THREE.MeshStandardMaterial({ map: cobbleTex('#b8b0a2', [12, 2]), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(25, 2.2, 0.8), 8), cobble, -1, 0.01, 3.6, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const cobble2 = new THREE.MeshStandardMaterial({ map: cobbleTex('#b8b0a2', [3, 3]), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const [x, z, w, d] of [[0.8, 1.6, 3.4, 3.0], [-4.3, -1.6, 1.6, 4.0], [3.6, -3.4, 1.4, 3.0], [-4.2, 5.8, 3.4, 2.6]]) {
    add(root, new THREE.ShapeGeometry(roundRectShape(w, d, 0.5), 8), cobble2, x, 0.012, z, { rot: [-Math.PI / 2, 0, 0], cast: false });
  }
  // 雪だまり（あとで溶ける）
  const snowM = (R.snowMat = new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: 1, transparent: true }));
  const sr = rng(12);
  for (let i = 0; i < 26; i++) {
    const x = (sr() - 0.5) * 27, z = (sr() - 0.5) * 19;
    if (Math.abs(z - 3.6) < 1.4 || (z < -4 && z > -8)) continue;
    const m = add(root, G.sphere(0.6 + sr() * 0.9, 12, 6), snowM, x, -0.05, z, { scale: [1.4, 0.18, 1], cast: false });
    m.userData.noPick = true;
    R.snow.push(m);
  }

  // ---------------- ホーム ----------------
  const platStone = new THREE.MeshStandardMaterial({ map: stoneTex('#b8b2a6', [8, 1]), roughness: 0.95 });
  add(root, G.box(10, FLOOR, 2.35), platStone, -8, FLOOR / 2, -3.78);
  add(root, G.box(10.1, 0.06, 0.3), mat('#d8d2c4'), -8, FLOOR + 0.03, -4.8);
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, FLOOR * (3 - i) / 3, 0.35), platStone, -4.3, FLOOR * (3 - i) / 6, -2.42 + i * 0.35);
  // 木の駅舎（小屋）と駅名標
  const kiosk = group(root, -10.5, FLOOR, -3.6);
  for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) add(kiosk, G.box(0.12, 2.1, 0.12), wood, x, 1.05, z);
  add(kiosk, G.box(2.6, 0.12, 1.8), new THREE.MeshStandardMaterial({ map: shinglesTex('#5a5a66', [3, 2]) }), 0, 2.2, 0, { rot: [0.1, 0, 0] });
  add(kiosk, G.box(2.4, 0.06, 1.5), snowM, 0, 2.3, -0.05, { rot: [0.1, 0, 0] });
  bench(kiosk, 0, 0, 0.1, 0, 1.4);
  const sign = (R.stationSign = group(root, -6.4, FLOOR, -4.45));
  for (const s of [-1, 1]) add(sign, G.cyl(0.05, 0.05, 1.9, 8), wood, s * 1.0, 0.95, 0);
  add(sign, G.box(2.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a3424'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#3a2418'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 62px ${FONT}`; ctx.fillText('ゆげのさと', w / 2, 70);
    ctx.font = `500 22px ${FONT}`; ctx.fillText('YUGE-NO-SATO', w / 2, 120);
    ctx.fillStyle = '#8a3a2e'; ctx.fillRect(8, 140, w - 16, 52);
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'left'; ctx.fillText('← まおうじょう', 22, 167);
    ctx.textAlign = 'right'; ctx.fillText('きのこのもり →', w - 22, 167);
  }), roughness: 0.7 }), 0, 1.5, 0.02);

  // ---------------- 山・トンネル・氷 ----------------
  const mtn = group(root);
  const mr = rng(31);
  // 奥の岩山（右奥が高い）
  for (let i = 0; i < 46; i++) {
    const x = -2 + mr() * 17, z = -9.2 - mr() * 2.2;
    const hgt = 0.6 + Math.max(0, (x + 2) / 17) * 4.5 + mr() * 1.4;
    if (Math.abs(x - 3.6) < 3.0) continue; // 源泉の丘のまわりはあけておく
    add(mtn, G.dodeca(0.9 + mr() * 0.9), stone, x, hgt * 0.5, z, { scale: [1.2, hgt * 0.55, 1], rot: [mr(), mr(), mr()] });
  }
  // トンネルのある岩山（右端・線路をまたぐ）
  for (let i = 0; i < 30; i++) {
    const x = 12.2 + mr() * 2.8, z = -10.5 + mr() * 8.5;
    if (Math.abs(z - TRACK_Z) < 1.4 && x < 13.8) continue;
    add(mtn, G.dodeca(1.0 + mr() * 0.9), stone, x, 1 + mr() * 3.5, z, { rot: [mr(), mr(), mr()] });
  }
  for (let i = 0; i < 8; i++) add(mtn, G.dodeca(1.2 + mr() * 0.5), stone, 12.8 + mr() * 2, 4.2 + mr() * 1.2, TRACK_Z + (mr() - 0.5) * 2.6, { rot: [mr(), mr(), mr()] });
  // 山の雪
  for (let i = 0; i < 18; i++) {
    const x = 4 + mr() * 11, z = -9.4 - mr() * 1.8;
    if (x < 6.8) continue;
    const m = add(mtn, G.sphere(0.9 + mr() * 0.6, 12, 6), snowM, x, 2.6 + (x - 4) * 0.35 + mr() * 0.6, z, { scale: [1.3, 0.35, 1], cast: false });
    m.userData.noPick = true;
    R.snow.push(m);
  }
  // トンネルの入口
  const portal = (R.portal = group(root, 12.15, 0, TRACK_Z));
  const ps = new THREE.MeshStandardMaterial({ map: stoneTex('#9a948a', [3, 2]), roughness: 1 });
  for (const s of [-1, 1]) add(portal, G.box(0.6, 3.2, 0.7), ps, 0, 1.6, s * 1.45);
  add(portal, G.box(0.6, 0.7, 3.6), ps, 0, 3.45, 0);
  add(portal, G.box(0.3, 3.4, 2.3), mat('#151418'), 0.2, 1.6, 0, { cast: false });
  add(portal, G.plane(1.8, 0.5), new THREE.MeshStandardMaterial({ map: signTex('湯けむり隧道', { w: 256, h: 64, bg: '#3a3430', fg: '#e8dcc4', border: '#8a7a6a', size: 30 }) }), -0.72, 3.5, 0, { rot: [0, -Math.PI / 2, 0] });
  // 氷の壁とつらら
  const ice = (R.ice = group(portal, -0.45, 0, 0));
  ice.userData.dynamic = true;
  R.iceMat = new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#4aa8e8', emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
  add(ice, G.box(0.4, 3.0, 2.4), R.iceMat, 0, 1.5, 0);
  const ir = rng(3);
  for (let i = 0; i < 12; i++) {
    add(ice, G.oct(0.35 + ir() * 0.3), R.iceMat, -0.15 - ir() * 0.3, 0.3 + ir() * 2.4, (ir() - 0.5) * 2.2, { scale: [0.8, 1.6, 0.8], rot: [ir(), ir(), ir()] });
  }
  for (let i = 0; i < 9; i++) add(ice, G.cone(0.1, 0.5 + ir() * 0.6, 6), R.iceMat, -0.2, 3.0, -1.2 + i * 0.3, { rot: [Math.PI, 0, 0] });

  // ---------------- 源泉（丘の上） ----------------
  // 上が平らな台地（手前の斜面に石段を刻む）
  const HZ = 0.643;
  const hill = group(root, 3.6, 0, -9.6);
  add(hill, G.cyl(2.0, 4.2, 2.6, 18), mat('#7a7468', { flatShading: true, roughness: 1 }), 0, 1.1, 0, { scale: [1, 1, HZ] });
  // 台地の上の雪
  const topSnow = add(hill, G.cyl(1.85, 1.95, 0.05, 18), snowM, 0, 2.42, 0, { scale: [1, 1, HZ], cast: false });
  topSnow.userData.noPick = true;
  R.snow.push(topSnow);
  // 台地の小さな雪の松と、斜面の岩
  const pine = mat('#2f4a3a', { flatShading: true });
  for (const [x, z, sc] of [[5.0, -10.3, 1], [2.3, -10.3, 0.8]]) {
    const pg = group(root, x, 2.4, z);
    pg.scale.setScalar(sc);
    add(pg, G.cyl(0.07, 0.09, 0.5, 6), mat('#5a3a24'), 0, 0.25, 0);
    for (let k = 0; k < 3; k++) {
      add(pg, G.cone(0.55 - k * 0.13, 0.6, 7), pine, 0, 0.65 + k * 0.38, 0);
      const sc2 = add(pg, G.cone(0.42 - k * 0.11, 0.22, 7), snowM, 0, 0.86 + k * 0.38, 0, { cast: false });
      sc2.userData.noPick = true;
      R.snow.push(sc2);
    }
  }
  for (const [x, y, z, r] of [[1.5, 0.5, -8.3, 0.5], [5.8, 0.4, -8.6, 0.45], [2.0, 1.4, -8.9, 0.35], [5.3, 1.6, -9.0, 0.3]]) {
    add(root, G.dodeca(r), stone, x, y, z, { rot: [x, z, y] });
  }
  // 石段（斜面に沿って 8 段。各段の奥の縁が斜面とそろう）
  const frontZ = -9.6 + (4.2 - 2.2 * (0.2 / 2.6)) * HZ; // 地面(y=0)での斜面の手前
  const run = frontZ - (-9.6 + 2.0 * HZ);
  const stepD = run / 8;
  const stepM = new THREE.MeshStandardMaterial({ map: stoneTex('#a09a90', [1, 1]), roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const top = i === 7 ? 2.42 : 0.3 * (i + 1) + 0.03;
    add(root, G.box(1.2, top, stepD + 0.02), stepM, 3.6, top / 2, frontZ - stepD * (i + 0.5));
    if (i % 2 === 1) { // 段の雪
      const sn = add(root, G.box(0.5, 0.03, stepD * 0.8), snowM, 3.3 + (i % 4) * 0.15, top + 0.015, frontZ - stepD * (i + 0.5), { cast: false });
      sn.userData.noPick = true;
      R.snow.push(sn);
    }
  }
  // 石段の手すり（赤）
  for (const sx of [-0.68, 0.68]) {
    const a = new THREE.Vector3(3.6 + sx, 0.75, frontZ), b = new THREE.Vector3(3.6 + sx, 3.15, frontZ - run);
    const len = a.distanceTo(b);
    const rail = add(root, G.box(0.06, 0.06, len), mat('#c8382e'), a.x, (a.y + b.y) / 2, (a.z + b.z) / 2);
    rail.lookAt(b.x, b.y, b.z);
    for (const k of [0, 0.5, 1]) {
      const p = a.clone().lerp(b, k);
      add(root, G.box(0.06, 0.75, 0.06), mat('#c8382e'), p.x, p.y - 0.375, p.z);
    }
  }
  // 鳥居
  const torii = group(root, 3.6, 2.4, -9.0);
  const red = mat('#c8382e');
  for (const s of [-1, 1]) add(torii, G.cyl(0.08, 0.1, 2.0, 10), red, s * 0.8, 1.0, 0);
  add(torii, G.box(2.2, 0.14, 0.18), mat('#2a2a30'), 0, 2.05, 0);
  add(torii, G.box(1.9, 0.1, 0.14), red, 0, 1.75, 0);
  // 源泉の門（鍵つき）
  const gate = (R.gate = group(root, 3.6, 2.4, -8.7));
  R.gateDoors = [];
  for (const s of [-1, 1]) {
    const dg = group(gate, s * 0.72, 0, 0);
    add(dg, G.box(0.7, 1.4, 0.08), new THREE.MeshStandardMaterial({ map: boardsTex('#7a5a3a', [1, 1]) }), -s * 0.35, 0.7, 0);
    dg.userData.dynamic = true;
    R.gateDoors.push(dg);
  }
  R.gateLock = add(gate, G.box(0.18, 0.2, 0.1), mat('#c8a050', { metalness: 0.8, roughness: 0.3 }), 0, 0.75, 0.08);
  R.gateLock.userData.keep = true;
  add(gate, G.circle(0.05, 10), mat('#3a2a1a'), 0, 0.73, 0.135, { cast: false });
  // 湯口（岩の湯だまり）と湯気
  const src = (R.source = group(root, 3.6, 2.5, -10.0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(src, G.dodeca(0.3), stone, Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.55, { rot: [a, a, 0] });
  }
  R.srcWaterMat = new THREE.MeshStandardMaterial({ color: '#7fc8d8', emissive: '#3a8aa8', emissiveIntensity: 0.15, roughness: 0.05, transparent: true, opacity: 0.85 });
  R.srcWater = add(src, G.circle(0.65, 20), R.srcWaterMat, 0, 0.12, 0, { rot: [-Math.PI / 2, 0, 0], scale: [1, 0.75, 1], cast: false });
  R.srcWater.userData.keep = true;
  add(src, G.box(0.8, 0.5, 0.06), new THREE.MeshStandardMaterial({ map: signTex('源泉', { w: 192, h: 96, bg: '#f4ead2', size: 60 }) }), 1.2, 0.5, 0.4, { rot: [0, -0.5, 0] });
  // 湯分けの升の台
  const masuStand = (R.masuStand = group(root, 2.4, 2.45, -9.6));
  add(masuStand, G.box(0.9, 0.35, 0.6), wood, 0, 0.17, 0);
  add(masuStand, G.box(0.4, 0.3, 0.4), mat('#c8a070'), -0.18, 0.5, 0);
  R.masuSlot = add(masuStand, G.box(0.3, 0.24, 0.3), mat('#c8a070'), 0.22, 0.47, 0);
  R.masuSlot.userData.keep = true;
  R.masuSlot.visible = false;

  // ---------------- 湯樋（源泉 → 銭湯 / トンネル） ----------------
  R.flowMat = new THREE.MeshStandardMaterial({ color: '#9fe0f0', emissive: '#4ab8d8', emissiveIntensity: 0.4, roughness: 0.05, transparent: true, opacity: 0.85 });
  const chan = (R.channels = group(root));
  const flows = (R.flows = []);
  const troughPosts = new Set();
  const trough = (a, b) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const g = group(chan, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
    add(g, G.box(len, 0.06, 0.36), wood, 0, -0.1, 0);
    for (const s of [-1, 1]) add(g, G.box(len, 0.2, 0.05), wood, 0, 0, s * 0.16);
    const w = add(g, G.box(len, 0.02, 0.26), R.flowMat, 0, -0.05, 0, { cast: false });
    w.userData.keep = true;
    w.visible = false;
    flows.push(w);
    // 支柱
    const n = Math.max(1, Math.floor(len / 1.6));
    for (let i = 0; i <= n; i++) {
      const p = A.clone().lerp(B, i / n);
      const key = `${p.x.toFixed(2)},${p.z.toFixed(2)}`;
      if (troughPosts.has(key)) continue;
      troughPosts.add(key);
      if (p.y > 0.4) add(chan, G.box(0.1, p.y - 0.1, 0.1), darkWood, p.x, (p.y - 0.1) / 2, p.z);
    }
  };
  // 線路の上をまたいで銭湯へ
  trough([2.9, 2.6, -9.6], [1.4, 3.6, -7.3]);
  trough([1.4, 3.6, -7.3], [1.4, 3.6, -4.6]);
  trough([1.4, 3.6, -4.6], [0.6, 2.6, -1.6]);
  // 山すそを通ってトンネルの氷へ
  trough([4.4, 2.6, -9.6], [7.6, 2.5, -7.9]);
  trough([7.6, 2.5, -7.9], [11.2, 3.0, -7.4]);
  R.flowEnds = { bath: new THREE.Vector3(0.6, 2.5, -1.6), ice: new THREE.Vector3(11.4, 3.0, -7.0) };

  // ---------------- 共同浴場 ----------------
  const bath = (R.bath = group(root, 0.6, 0, 0.4));
  add(bath, G.box(5.2, 0.4, 3.6), mat('#9a948a'), 0, 0.2, 0);
  const bathWall = new THREE.MeshStandardMaterial({ map: boardsTex('#6a4a32', [3, 1]), roughness: 0.9 });
  add(bath, G.box(5, 2.6, 3.4), bathWall, 0, 1.7, 0);
  add(bath, G.box(5.04, 0.9, 3.44), mat('#e8dcc4'), 0, 2.6, 0);
  // 唐破風の入口
  const ent = group(bath, 0, 0, 1.75);
  for (const s of [-1, 1]) add(ent, G.box(0.18, 2.4, 0.18), darkWood, s * 1.1, 1.6, 0.35);
  const kara = new THREE.TorusGeometry(1.25, 0.16, 8, 20, Math.PI);
  add(ent, kara, mat('#4a4a54'), 0, 2.85, 0.35);
  add(ent, G.box(2.6, 0.14, 0.9), mat('#4a4a54'), 0, 2.85, 0.1);
  R.noren = add(ent, G.plane(1.8, 1.0), new THREE.MeshStandardMaterial({ map: norenTex('ゆ'), side: THREE.DoubleSide, roughness: 0.9 }), 0, 2.1, 0.3, { cast: false });
  R.noren.userData.keep = true;
  // 大屋根
  const btile = new THREE.MeshStandardMaterial({ map: shinglesTex('#4a4a54', [5, 2]), roughness: 0.85 });
  for (const s of [-1, 1]) add(bath, G.box(5.8, 0.16, 2.4), btile, 0, 3.55, s * 1.0, { rot: [s * 0.55, 0, 0] });
  add(bath, G.box(5.9, 0.18, 0.25), mat('#3a3a44'), 0, 4.15, 0);
  R.bathSnow = add(bath, G.box(5.4, 0.08, 1.8), snowM, 0, 3.7, 0.9, { rot: [0.55, 0, 0] });
  R.bathSnow.userData.noPick = true;
  add(bath, G.box(1.6, 0.5, 0.06), new THREE.MeshStandardMaterial({ map: signTex('共同浴場', { w: 256, h: 80, bg: '#3a2a1e', fg: '#f4dc9a', border: '#c8a050', size: 46 }) }), 0, 3.35, 2.5);
  // 釜場（ボイラー）
  const kama = (R.kama = group(root, -3.0, 0, -0.4));
  add(kama, G.box(1.6, 1.4, 1.4), new THREE.MeshStandardMaterial({ map: stoneTex('#8a7a6a', [2, 2]), roughness: 1 }), 0, 0.7, 0);
  add(kama, G.cyl(0.22, 0.26, 3.6, 12), mat('#5a4a40'), 0.3, 2.4, -0.3);
  add(kama, G.box(0.6, 0.5, 0.06), mat('#2a2420'), 0, 0.55, 0.71);
  R.emberMat = new THREE.MeshStandardMaterial({ color: '#3a1a10', emissive: '#ff5a1a', emissiveIntensity: 0.35, roughness: 0.8 });
  R.emberMat.userData.lamp = true;
  add(kama, G.box(0.46, 0.28, 0.04), R.emberMat, 0, 0.5, 0.74, { cast: false });
  R.emberGlow = new THREE.PointLight('#ff6a2a', 0, 3, 2);
  R.emberGlow.position.set(0, 0.6, 1.1);
  kama.add(R.emberGlow);
  add(kama, G.box(0.8, 0.28, 0.04), new THREE.MeshStandardMaterial({ map: signTex('釜場', { w: 192, h: 72, bg: '#f4ead2', size: 44 }) }), 0, 1.15, 0.72);
  // 薪の山
  for (let i = 0; i < 6; i++) add(kama, G.cyl(0.08, 0.08, 0.8, 8), mat('#8a6a4a'), -1.05, 0.1 + Math.floor(i / 3) * 0.16, -0.3 + (i % 3) * 0.17, { rot: [Math.PI / 2, 0, 0] });

  // 露天風呂（からっぽ）。みんなで入れる、大きな岩風呂。地面より高い石の湯船にして、湯は腰の高さ
  const roten = (R.roten = group(root, 6.3, 0, 0.0));
  const rr = rng(44);
  const RX = 2.5, RZ = 1.75;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const s2 = 0.36 + rr() * 0.16;
    add(roten, G.dodeca(s2), stone, Math.cos(a) * (RX + 0.2), 0.32 + rr() * 0.1, Math.sin(a) * (RZ + 0.2), { rot: [rr(), rr(), rr()], scale: [1.1, 1.25, 1.1] });
  }
  // 湯船の底と内側の壁
  add(roten, G.circle(1, 32), mat('#6a6458'), 0, 0.03, 0, { rot: [-Math.PI / 2, 0, 0], scale: [RX, RZ, 1], cast: false });
  add(roten, new THREE.CylinderGeometry(1, 1, 0.55, 32, 1, true), mat('#7a7064', { side: THREE.DoubleSide }), 0, 0.28, 0, { scale: [RX + 0.05, 1, RZ + 0.05], cast: false });
  R.rotenWaterMat = waterize(new THREE.MeshStandardMaterial({ color: '#8fd0e0', emissive: '#4aa8c8', emissiveIntensity: 0.2, roughness: 0.05, transparent: true, opacity: 0 }), { strength: 0.25, scale: 2 });
  R.rotenWater = add(roten, G.circle(1, 32), R.rotenWaterMat, 0, 0.1, 0, { rot: [-Math.PI / 2, 0, 0], scale: [RX, RZ, 1], cast: false });
  R.rotenWater.userData.keep = true;
  R.rotenWater.userData.noPick = true;
  R.rotenWater.userData.full = 0.45;
  // ししおどし
  const shishi = (R.shishi = group(roten, 2.9, 0, -1.3));
  add(shishi, G.box(0.08, 0.6, 0.08), darkWood, 0, 0.3, 0);
  R.shishiTube = group(shishi, 0, 0.5, 0);
  add(R.shishiTube, G.cyl(0.07, 0.07, 0.9, 10), mat('#8ab05a'), 0.15, 0, 0, { rot: [0, 0, Math.PI / 2 - 0.3] });
  R.shishiTube.userData.dynamic = true;
  add(shishi, G.dodeca(0.15), stone, 0.55, 0.1, 0);

  // ---------------- 旅館（たぬき屋） ----------------
  const ry = wahouse(root, -10.2, 3.4, { w: 5.0, d: 3.6, h: 2.5, open: true, wall: '#e8dcc4' });
  R.ryokan = ry.g;
  R.roof = ry.roof;
  R.ryokanFront = ry.front;
  R.roof.userData.dynamic = true;
  R.roofMats = [];
  R.roof.traverse((o) => { if (o.isMesh && !R.roofMats.includes(o.material)) R.roofMats.push(o.material); });
  const rf = (R.ryokanFloor = group(R.ryokan, 0, 0.35, 0));
  add(rf, G.box(4.8, 0.3, 3.4), new THREE.MeshStandardMaterial({ map: planksTex('#a8784e', '#6e4a2e', 8) }), 0, 0.15, 0);
  // 囲炉裏
  const iro = (R.irori = group(rf, 0.9, 0.3, 0.2));
  add(iro, G.box(1.0, 0.12, 1.0), darkWood, 0, 0.06, 0);
  add(iro, G.box(0.8, 0.13, 0.8), mat('#5a5048'), 0, 0.07, 0);
  for (let i = 0; i < 3; i++) add(iro, G.cyl(0.04, 0.04, 0.4, 6), mat('#4a3020'), (i - 1) * 0.12, 0.17, 0, { rot: [0, i, Math.PI / 2] });
  add(iro, G.cyl(0.015, 0.015, 1.4, 4), mat('#2a2a30'), 0, 0.85, 0, { cast: false });
  add(iro, G.cyl(0.14, 0.12, 0.2, 12), mat('#2a2a30', { metalness: 0.5 }), 0, 0.4, 0);
  R.iroriFireMat = new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff6a1a', emissiveIntensity: 0, transparent: true, opacity: 0 });
  R.iroriFire = add(iro, G.cone(0.14, 0.3, 8), R.iroriFireMat, 0, 0.27, 0, { cast: false });
  R.iroriFire.userData.keep = true;
  R.iroriLight = new THREE.PointLight('#ff9a4a', 0, 5, 1.8);
  R.iroriLight.position.set(0, 0.6, 0);
  iro.add(R.iroriLight);
  // 帳場（たぬきの机）と棚
  add(rf, G.box(1.2, 0.4, 0.5), darkWood, -1.4, 0.5, -0.6);
  add(rf, G.box(0.3, 0.06, 0.2), mat('#f4ead2'), -1.5, 0.73, -0.6);
  add(rf, G.box(2.0, 1.2, 0.3), darkWood, -1.1, 0.9, -1.45);
  for (let i = 0; i < 6; i++) add(rf, G.box(0.18, 0.22, 0.2), mat(['#c8382e', '#f4ead2', '#5a7ab8'][i % 3]), -1.85 + i * 0.3, 1.22, -1.4, { cast: false });
  // 火かき棒
  R.poker = group(rf, 1.65, 0.33, 0.7);
  add(R.poker, G.cyl(0.02, 0.02, 0.9, 6), mat('#3a3a40', { metalness: 0.6 }), 0, 0.02, 0, { rot: [0, 0.4, Math.PI / 2] });
  add(R.poker, G.torus(0.05, 0.015, 6, 10), mat('#3a3a40', { metalness: 0.6 }), -0.42, 0.02, 0.18, { rot: [Math.PI / 2, 0, 0] });
  R.poker.userData.dynamic = true;
  // 看板と暖簾
  add(R.ryokanFront, G.box(2.2, 0.55, 0.08), new THREE.MeshStandardMaterial({ map: signTex('たぬき屋', { w: 320, h: 80, bg: '#3a2a1e', fg: '#f4dc9a', border: '#c8a050', size: 50 }) }), 0, 3.1, 1.85);
  R.ryNoren = add(R.ryokan, G.plane(1.6, 0.7), new THREE.MeshStandardMaterial({ map: norenTex('宿', '#7a2e2a'), side: THREE.DoubleSide }), -1.3, 2.4, 1.8, { cast: false });
  R.ryNoren.userData.keep = true;

  // ---------------- キツネの提灯屋 ----------------
  const shop = wahouse(root, 9.0, 5.0, { w: 3.6, d: 2.6, h: 2.2, open: true, wall: '#d8c8a8' });
  R.shop = shop.g;
  add(R.shop, G.box(2.6, 0.7, 0.6), darkWood, 0, 0.7, 0.9);
  // 軒先より前へ張り出した吊り看板。屋根と積雪に文字を埋めない。
  for (const x of [-0.7, 0.7]) {
    add(R.shop, G.cyl(0.03, 0.03, 0.65, 8), darkWood, x, 3.2, 1.15);
    add(R.shop, G.box(0.07, 0.07, 0.9), darkWood, x, 3.5, 1.55);
    add(R.shop, G.cyl(0.025, 0.025, 0.2, 8), darkWood, x, 3.4, 1.94);
  }
  R.shopSign = add(R.shop, G.box(1.8, 0.5, 0.08), new THREE.MeshStandardMaterial({ map: signTex('ちょうちん', { w: 320, h: 80, bg: '#c8382e', fg: '#fff6dc', border: '#f4dc9a', size: 46 }) }), 0, 3.05, 1.94);
  R.shopLanterns = [];
  for (let i = 0; i < 5; i++) {
    const L = chochin(R.shop, -1.3 + i * 0.65, 2.15, 1.2, { s: 0.8, color: i % 2 ? '#f4ead2' : '#d8402e', mats: R.shopLanterns });
    void L;
  }

  // ---------------- 提灯やぐら（3×3） ----------------
  const yg = (R.yagura = group(root, -4.2, 0, 6.2));
  for (const s of [-1, 1]) add(yg, G.box(0.16, 4.2, 0.16), darkWood, s * 1.3, 2.1, 0);
  for (let i = 0; i < 4; i++) add(yg, G.box(2.8, 0.1, 0.1), darkWood, 0, 1.2 + i * 1.0, 0);
  add(yg, G.box(3.2, 0.14, 0.6), mat('#4a4a54'), 0, 4.3, 0);
  R.yaguraLanterns = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const L = chochin(yg, -0.85 + c * 0.85, 3.65 - r * 1.0, 0.05, { s: 0.85, ch: ['ゆ', 'げ', 'の', 'さ', 'と', '湯', '灯', '火', '宿'][r * 3 + c] });
      R.yaguraLanterns.push(L.m);
    }
  }
  add(yg, G.box(1.2, 0.35, 0.05), new THREE.MeshStandardMaterial({ map: signTex('提灯やぐら', { w: 256, h: 72, bg: '#f4ead2', size: 40 }) }), 0, 0.55, 0.1);
  R.yaguraLight = new THREE.PointLight('#ffb060', 0, 12, 1.4);
  R.yaguraLight.position.set(0, 2.6, 1.0);
  yg.add(R.yaguraLight);
  R.lights.push(R.yaguraLight);

  // 通りの提灯（町の灯り）
  R.streetLanterns = [];
  const posts = [[-7.4, 2.25], [-1.6, 2.25], [3.4, 2.6], [-7.4, 5.0], [2.6, 5.0], [9.3, 2.4]];
  for (const [x, z] of posts) {
    add(root, G.box(0.1, 2.3, 0.1), darkWood, x, 1.15, z);
    add(root, G.box(0.5, 0.06, 0.06), darkWood, x + 0.2, 2.25, z);
    chochin(root, x + 0.38, 1.95, z, { s: 0.75, mats: R.streetLanterns });
  }
  R.streetLight = [];
  for (const [x, z] of [[-1.6, 2.25], [9.3, 2.4]]) {
    const L = new THREE.PointLight('#ffb060', 0, 7, 1.6);
    L.position.set(x + 0.4, 1.9, z + 0.3);
    root.add(L);
    R.streetLight.push(L);
  }
  // 石灯籠
  R.toroMats = [];
  for (const [x, z] of [[-1.4, -1.6], [-5.6, 5.4], [11.4, 7.6]]) {
    const t = group(root, x, 0, z);
    add(t, G.box(0.5, 0.15, 0.5), stone, 0, 0.07, 0);
    add(t, G.cyl(0.1, 0.12, 0.8, 8), stone, 0, 0.55, 0);
    add(t, G.box(0.45, 0.35, 0.45), stone, 0, 1.1, 0);
    const tm = new THREE.MeshStandardMaterial({ color: '#ffcf6a', emissive: '#ff9a3a', emissiveIntensity: 0 });
    R.toroMats.push(tm);
    add(t, G.box(0.25, 0.18, 0.25), tm, 0, 1.1, 0.12, { cast: false });
    add(t, G.cone(0.45, 0.35, 4), stone, 0, 1.45, 0, { rot: [0, Math.PI / 4, 0] });
  }

  // ---------------- 小川と太鼓橋 ----------------
  const water = waterize(new THREE.MeshStandardMaterial({ color: '#6aa8c0', emissive: '#2a6a8a', emissiveIntensity: 0.2, roughness: 0.05, transparent: true, opacity: 0.9 }), { strength: 0.3 });
  add(root, new THREE.ShapeGeometry(roundRectShape(1.4, 13, 0.6), 6), water, 12.6, 0.02, 3.4, { rot: [-Math.PI / 2, 0, 0.12], cast: false });
  const br = group(root, 12.4, 0, 3.6);
  add(br, new THREE.TorusGeometry(1.6, 0.12, 6, 20, Math.PI), mat('#c8382e'), 0, -0.85, -0.55, { rot: [0, Math.PI / 2, 0] });
  add(br, new THREE.TorusGeometry(1.6, 0.12, 6, 20, Math.PI), mat('#c8382e'), 0, -0.85, 0.55, { rot: [0, Math.PI / 2, 0] });
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    add(br, G.box(1.1, 0.06, 0.32), wood, -Math.cos(a) * 1.55, -0.85 + Math.sin(a) * 1.45 + 0.05, 0, { rot: [0, 0, Math.cos(a) * 0.9] });
  }

  // ---------------- お地蔵さん・木・竹垣 ----------------
  const jz = (R.jizo = group(root, -7.2, 0, -1.0));
  for (let i = 0; i < 3; i++) {
    const j = group(jz, i * 0.6, 0, 0);
    add(j, G.capsule(0.16, 0.3), mat('#a8a49a'), 0, 0.32, 0);
    add(j, G.sphere(0.15, 12, 10), mat('#a8a49a'), 0, 0.72, 0);
    add(j, G.cone(0.2, 0.22, 10), mat('#d8402e'), 0, 0.5, 0.04, { rot: [0.2, 0, 0] });
    add(j, G.cyl(0.18, 0.18, 0.07, 12), snowM, 0, 0.88, 0, { cast: false });
  }
  const bare = ['#6a5a4a', '#7a6a5a', '#5a4a3a'];
  // 宿の正面は会話カメラの通り道。雪の木は左右へ寄せ、顔を隠さない。
  [[-14.9, 8.7, 0.85], [13.6, -1.8, 0.7], [-13.6, -0.6, 0.75], [-7.5, 10.0, 0.6]].forEach(([x, z, s], i) => tree(root, x, z, { scale: s, seed: 60 + i, colors: ['#e8eef6', '#dfe8f2', '#f4f8ff'] }));
  void bare;
  bush(root, -2.6, 8.6, 0.8, 71, '#4a7a4a');
  bush(root, 3.2, 8.8, 0.9, 72, '#4a7a4a');
  bush(root, -12.6, -7.0, 1.0, 73, '#4a7a4a');
  // 竹垣
  for (const [x0, z0, x1] of [[-6.0, 9.9, 1.5], [5.0, 9.9, 10.5]]) {
    const n = Math.round((x1 - x0) / 0.12);
    for (let i = 0; i <= n; i++) add(root, G.cyl(0.05, 0.05, 0.9, 6), mat('#9ab06a'), x0 + i * 0.12, 0.45, z0, { cast: i % 4 === 0 });
    add(root, G.box(x1 - x0, 0.05, 0.05), darkWood, (x0 + x1) / 2, 0.7, z0 + 0.06);
  }
  // 足湯のベンチと、看板
  bench(root, -0.8, 0, 6.0, 0, 1.5);
  flowerPatch(root, -12.4, 1.6, 0.8, 10, 81, ['#ff8fa8', '#ffffff', '#f4c8d8']);

  R.lampMats = [...R.streetLanterns, ...R.shopLanterns];
  // 灯りがともると地面に落ちる光だまり
  R.poolStreet = [[-7.4, 2.25], [-1.6, 2.25], [3.4, 2.6], [-7.4, 5.0], [2.6, 5.0], [9.3, 2.4]].map(([x, z]) => lightPool(root, x + 0.4, 0.035, z + 0.4, 1.8, 1.8, '#ffb860'));
  R.poolStreet.push(lightPool(root, -4.2, 0.035, 7.4, 3.2, 1.8, '#ffb860'));
  R.poolRyokan = lightPool(root, -10.2, 0.035, 6.0, 4.4, 1.8, '#ff9a50');
  R.poolShop = lightPool(root, 9.0, 0.035, 6.9, 3.4, 1.6, '#ffb860');
  for (const p of [...R.poolStreet, R.poolRyokan, R.poolShop]) p.material.opacity = 0;
  return R;
}
