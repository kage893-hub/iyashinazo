import * as THREE from 'three';
import { sway, waterize, lightPool } from '../../lib/livefx.js';
import { add, mat, glow, G, group, rng, signTex, canvasTex, roundRectShape, FONT } from '../../lib/util.js';
import { bench, leafMat } from '../station/diorama.js';
import { grassTex, boardsTex, planksTex, shinglesTex, stoneTex } from '../station/textures.js';
import { chochin } from '../onsen/diorama.js';

// ---------------------------------------------------------------
// 江戸の宿場町の箱庭
// 島は x[-15,15] z[-11,11]、線路は z=-6、ホーム上面 y=0.75
// 左に浅草寺（雷門・本堂・五重塔）、中ほどに宿場の通り、右に町木戸と番所、
// 手前を川が流れ、太鼓橋と渡し場がある。
// ※ 現代日本（STAGE 10）は「この場所の二百年後」なので、配置をそろえる。
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
const FLOOR = 0.75;
const RIVER_Z0 = 6.4, RIVER_Z1 = 8.7;

const vermilion = () => mat('#c8402e', { roughness: 0.7 });
const tileTex = (c = '#4a4c56', r = [3, 2]) => shinglesTex(c, r);

/** 暖簾のテクスチャ（一文字） */
const norenTex = (ch, bg = '#2b3a6a', fg = '#fbf4e2') => canvasTex(512, 150, (ctx, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // 三枚に分かれたすき間
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 1; i < 3; i++) ctx.fillRect((i * w) / 3 - 3, h * 0.25, 6, h);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 104px ${FONT}`;
  ctx.fillText(ch, w / 2, h * 0.55);
});

/** 縦書きの看板 */
const tateTex = (text, { bg = '#2a1a14', fg = '#f4dc9a', w = 96, h = 256 } = {}) => canvasTex(w, h, (ctx) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg; ctx.lineWidth = 4; ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const n = text.length;
  const size = Math.min(w * 0.62, (h - 30) / n);
  ctx.font = `900 ${size}px ${FONT}`;
  [...text].forEach((ch, i) => ctx.fillText(ch, w / 2, 18 + size * (i + 0.5)));
});

/** 雷門の大提灯 */
const kaminariTex = () => canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#c8302a'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,10,10,0.35)'; ctx.lineWidth = 3;
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, (i * h) / 10); ctx.lineTo(w, (i * h) / 10); ctx.stroke(); }
  ctx.fillStyle = '#1a0a08'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText('雷', w * 0.25, h * 0.5);
  ctx.fillText('門', w * 0.75, h * 0.5);
});

/** 切妻の瓦屋根（棟は x 方向） */
export function gableRoof(parent, x, y, z, w, d, { pitch = 0.5, color = '#4a4c56', thick = 0.12, over = 0.3 } = {}) {
  const g = group(parent, x, y, z);
  const tile = new THREE.MeshStandardMaterial({ map: tileTex(color, [Math.max(1, Math.round(w)), 2]), roughness: 0.85 });
  const run = d / 2 + over;
  const len = run / Math.cos(pitch);
  for (const s of [-1, 1]) add(g, G.box(w + over * 2, thick, len), tile, 0, Math.tan(pitch) * run / 2, s * run / 2, { rot: [s * pitch, 0, 0] });
  add(g, G.box(w + over * 2 - 0.06, 0.14, 0.2), mat('#2e3038'), 0, Math.tan(pitch) * run + 0.03, 0);
  // 妻面（三角）
  const gab = new THREE.Shape();
  gab.moveTo(-d / 2, 0); gab.lineTo(d / 2, 0); gab.lineTo(0, Math.tan(pitch) * (d / 2)); gab.lineTo(-d / 2, 0);
  for (const s of [-1, 1]) add(g, new THREE.ExtrudeGeometry(gab, { depth: 0.08, bevelEnabled: false }), mat('#f0e8d6'), s * (w / 2) - (s > 0 ? 0.08 : 0), 0, 0, { rot: [0, Math.PI / 2, 0] });
  return g;
}

/** 宝形（ほうぎょう）の屋根：四方に流れる */
export function hipRoof(parent, x, y, z, w, d, h, color = '#3e4048') {
  const g = group(parent, x, y, z);
  const m = new THREE.MeshStandardMaterial({ map: tileTex(color, [3, 3]), roughness: 0.85, flatShading: true });
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  add(g, geo, m, 0, h / 2, 0, { scale: [w, h, d] });
  return g;
}

/**
 * 町家（正面は +z）。1階は雨戸（夜）／のれんと品物（朝）。
 */
function machiya(parent, x, z, { w = 3, d = 2.2, ch = '店', noren = '#2b3a6a', sign = '', open = false, goods } = {}) {
  const g = group(parent, x, 0, z);
  const wood = mat('#5a3a26');
  const plaster = mat('#efe6d2');
  const boards = new THREE.MeshStandardMaterial({ map: boardsTex('#6a4a32', [2, 1]), roughness: 0.9 });
  add(g, G.box(w + 0.2, 0.16, d + 0.2), mat('#8a8478'), 0, 0.08, 0);
  add(g, G.box(w - 0.1, 0.04, d - 0.1), new THREE.MeshStandardMaterial({ map: planksTex('#a8784e', '#6e4a2e', 8) }), 0, 0.18, 0, { cast: false });
  const H1 = 2.0;
  // 柱と壁（後ろ・左右）
  for (const s of [-1, 1]) for (const k of [-1, 1]) add(g, G.box(0.16, H1, 0.16), wood, s * (w / 2 - 0.08), H1 / 2 + 0.16, k * (d / 2 - 0.08));
  add(g, G.box(w - 0.3, H1, 0.1), boards, 0, H1 / 2 + 0.16, -d / 2 + 0.06);
  for (const s of [-1, 1]) add(g, G.box(0.1, H1, d - 0.3), boards, s * (w / 2 - 0.06), H1 / 2 + 0.16, 0);
  // 正面の上の小壁と庇
  add(g, G.box(w, 0.3, 0.14), wood, 0, H1 + 0.02, d / 2 - 0.08);
  const eave = new THREE.MeshStandardMaterial({ map: tileTex('#4a4c56', [3, 1]), roughness: 0.85 });
  add(g, G.box(w + 0.4, 0.1, 0.9), eave, 0, H1 + 0.24, d / 2 + 0.3, { rot: [0.35, 0, 0] });
  // 2階（白壁と虫籠窓）
  const H2 = 1.05;
  add(g, G.box(w - 0.2, H2, d - 0.5), plaster, 0, H1 + 0.16 + H2 / 2, -0.2);
  add(g, G.box(w * 0.55, 0.32, 0.04), mat('#3a2a20'), 0, H1 + 0.16 + H2 * 0.55, d / 2 - 0.44, { cast: false });
  for (let i = 0; i < 7; i++) add(g, G.box(0.04, 0.32, 0.05), plaster, -w * 0.25 + (i + 0.5) * (w * 0.55) / 7, H1 + 0.16 + H2 * 0.55, d / 2 - 0.43, { cast: false });
  const roof = gableRoof(g, 0, H1 + 0.16 + H2, -0.2, w - 0.2, d - 0.5, { pitch: 0.45, over: 0.35 });
  // 屋根看板
  if (sign) {
    const sg = add(g, G.box(Math.min(2.2, w * 0.7), 0.42, 0.06), new THREE.MeshStandardMaterial({ map: signTex(sign, { w: 384, h: 96, bg: '#2a1a14', fg: '#f4dc9a', border: '#c8a050', size: 56 }) }), 0, H1 + 0.62, d / 2 + 0.55, { rot: [-0.25, 0, 0] });
    void sg;
  }
  // 夜：雨戸
  const shutter = group(g);
  shutter.userData.dynamic = true;
  add(shutter, G.box(w - 0.3, H1 - 0.1, 0.06), new THREE.MeshStandardMaterial({ map: boardsTex('#7a5a3e', [3, 1]), roughness: 0.9 }), 0, (H1 - 0.1) / 2 + 0.2, d / 2 - 0.1);
  // 朝：のれんと品物
  const openG = group(g);
  openG.userData.dynamic = true;
  const nm = new THREE.MeshStandardMaterial({ map: norenTex(ch, noren), side: THREE.DoubleSide, roughness: 0.9 });
  const nor = group(openG, 0, H1 - 0.05, d / 2 + 0.03);
  add(nor, G.box(w - 0.6, 0.7, 0.02), nm, 0, -0.35, 0, { cast: false });
  // 店先の台
  add(openG, G.box(w * 0.7, 0.5, 0.6), wood, 0, 0.45, d / 2 - 0.45);
  if (goods) goods(openG, w, d);
  shutter.visible = !open;
  openG.visible = open;
  return { g, shutter, openG, noren: nor, roof };
}

/** 柳：かたむいた幹、まるい樹冠、そこから長くしだれる枝 */
function willow(parent, x, z, s = 1, seed = 1) {
  const r = rng(seed);
  const g = group(parent, x, 0, z);
  g.scale.setScalar(s);
  const bark = mat('#5a4a3a', { flatShading: true });
  // 幹（少しかたむき、上で二またに）
  add(g, G.cyl(0.13, 0.2, 1.7, 7), bark, 0.08, 0.85, 0, { rot: [0, 0, -0.1] });
  add(g, G.cyl(0.07, 0.11, 1.0, 6), bark, -0.15, 2.0, 0.05, { rot: [0.1, 0, 0.45] });
  add(g, G.cyl(0.07, 0.11, 1.0, 6), bark, 0.4, 2.05, -0.05, { rot: [-0.1, 0, -0.5] });
  // 樹冠（小さな葉のかたまりをいくつか）
  const crown = mat('#7aa85a', { flatShading: true });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    add(g, G.ico(0.42 + r() * 0.15, 1), crown, 0.12 + Math.cos(a) * 0.45, 2.55 + r() * 0.25, Math.sin(a) * 0.4, { scale: [1.2, 0.6, 1.1] });
  }
  add(g, G.ico(0.5, 1), crown, 0.12, 2.8, 0, { scale: [1.3, 0.55, 1.2] });
  // しだれる枝（細長い葉のすだれ。風でゆれる）
  const leaves = [leafMat('#8ab86a', 0.12), leafMat('#9cc878', 0.12), leafMat('#76a456', 0.12)];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const rr = 0.55 + r() * 0.5;
    const len = 1.1 + r() * 0.9;
    const top = 2.65 + r() * 0.2 - rr * 0.25;
    add(g, G.box(0.07, len, 0.035), leaves[i % 3], 0.12 + Math.cos(a) * rr, top - len / 2, Math.sin(a) * rr, { rot: [Math.sin(a) * 0.12, -a, -Math.cos(a) * 0.12], cast: i % 2 === 0 });
  }
  return g;
}

export function buildEdoDiorama(scene) {
  const root = group(scene);
  const R = { root, lampMats: [], lampLights: [], shops: [], snow: [] };
  const wood = mat('#6a4a32');
  const darkWood = mat('#4a3424');
  const stone = mat('#9a948a', { flatShading: true, roughness: 1 });

  // ---------------- 地面 ----------------
  const grass = new THREE.MeshStandardMaterial({ map: grassTex('#7fa060', [10, 7]), roughness: 1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(29.6, 21.6, 2.4), 12), grass, 0, 0.002, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // 土の通り（宿場の往来）と、浅草寺の参道
  const dirt = new THREE.MeshStandardMaterial({ color: '#c8b08a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(21, 2.8, 0.8), 8), dirt, 2.5, 0.01, 0.9, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(root, new THREE.ShapeGeometry(roundRectShape(6, 3.2, 0.8), 8), dirt, 8.6, 0.011, 3.4, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(root, new THREE.ShapeGeometry(roundRectShape(4.6, 6.2, 0.8), 8), dirt, 2.0, 0.011, 3.6, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const sando = new THREE.MeshStandardMaterial({ map: stoneTex('#b8b2a6', [6, 1]), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
  add(root, G.box(1.6, 0.02, 4.2), sando, -10.6, 0.01, 3.9, { cast: false });
  add(root, new THREE.ShapeGeometry(roundRectShape(2.6, 4.6, 0.5), 6), dirt, -5.2, 0.011, 4.2, { rot: [-Math.PI / 2, 0, 0], cast: false });

  // ---------------- ホームと駅名標 ----------------
  const platStone = new THREE.MeshStandardMaterial({ map: stoneTex('#b8b2a6', [8, 1]), roughness: 0.95 });
  add(root, G.box(10, FLOOR, 2.35), platStone, -7.6, FLOOR / 2, -3.78);
  add(root, G.box(10.1, 0.06, 0.3), mat('#d8d2c4'), -7.6, FLOOR + 0.03, -4.8);
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, FLOOR * (3 - i) / 3, 0.35), platStone, -3.9, FLOOR * (3 - i) / 6, -2.42 + i * 0.35);
  const kiosk = group(root, -10.0, FLOOR, -3.6);
  for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) add(kiosk, G.box(0.12, 2.1, 0.12), wood, x, 1.05, z);
  add(kiosk, G.box(2.6, 0.12, 1.8), new THREE.MeshStandardMaterial({ map: tileTex('#4a4c56', [3, 2]) }), 0, 2.2, 0, { rot: [0.1, 0, 0] });
  bench(kiosk, 0, 0, 0.1, 0, 1.4);
  const sign = (R.stationSign = group(root, -6.2, FLOOR, -4.45));
  for (const s of [-1, 1]) add(sign, G.cyl(0.05, 0.05, 1.9, 8), wood, s * 1.0, 0.95, 0);
  add(sign, G.box(2.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a3424'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#3a2418'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 62px ${FONT}`; ctx.fillText('えどのしゅく', w / 2, 70);
    ctx.font = `500 22px ${FONT}`; ctx.fillText('EDO-NO-SHUKU', w / 2, 120);
    ctx.fillStyle = '#2b3a6a'; ctx.fillRect(8, 140, w - 16, 52);
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'left'; ctx.fillText('← てんくうのまち', 22, 167);
    ctx.textAlign = 'right'; ctx.fillText('しおのみなと →', w - 22, 167);
  }), roughness: 0.7 }), 0, 1.5, 0.02);

  // ---------------- 浅草寺（左） ----------------
  const temple = (R.temple = group(root));
  // 本堂（正面は手前 +z。組み立ては +x 向きで作って回す）
  const hondo = (R.hondo = group(temple, -10.6, 0, 0.1, -Math.PI / 2));
  add(hondo, G.box(3.4, 0.5, 3.6), mat('#8a8478'), 0, 0.25, 0);
  for (let i = 0; i < 3; i++) add(hondo, G.box(0.4, 0.5 * (3 - i) / 3, 1.6), mat('#8a8478'), 1.9 + i * 0.4, 0.5 * (3 - i) / 6, 0);
  const red = vermilion();
  for (const [x, z] of [[-1.4, -1.6], [1.4, -1.6], [-1.4, 1.6], [1.4, 1.6], [1.4, -0.55], [1.4, 0.55]]) add(hondo, G.cyl(0.11, 0.11, 2.2, 10), red, x, 1.6, z);
  add(hondo, G.box(2.7, 2.0, 3.1), mat('#e8dcc4'), -0.15, 1.5, 0);
  add(hondo, G.box(0.08, 1.4, 1.0), mat('#2a1a14'), 1.22, 1.3, 0, { cast: false });
  add(hondo, G.box(3.2, 0.3, 3.6), red, 0, 2.75, 0);
  // 大きな屋根（宝形＋そり）
  hipRoof(hondo, 0, 2.9, 0, 5.0, 5.2, 2.0);
  add(hondo, G.box(0.08, 0.6, 1.6), new THREE.MeshStandardMaterial({ map: tateTex('浅草寺', { w: 128, h: 96 * 3 }) }), 1.62, 2.4, 0, { rot: [0, Math.PI / 2, Math.PI / 2], cast: false });
  // 賽銭箱と大きな提灯
  add(hondo, G.box(0.5, 0.4, 0.9), wood, 2.4, 0.7, 0);
  const lanL = chochin(hondo, 1.9, 2.15, 0, { s: 1.6, color: '#c8302a', ch: '志', mats: R.lampMats });
  lanL.m.userData.base = 1.2;
  // 五重塔（左奥）
  const pagoda = (R.pagoda = group(temple, -13.5, 0, 3.9));
  add(pagoda, G.box(2.0, 0.4, 2.0), mat('#8a8478'), 0, 0.2, 0);
  let y = 0.4;
  for (let i = 0; i < 5; i++) {
    const s = 1.5 - i * 0.16;
    add(pagoda, G.box(s, 0.95, s), i % 2 ? mat('#e8dcc4') : red, 0, y + 0.47, 0);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(pagoda, G.box(0.09, 0.99, 0.09), red, px * s / 2, y + 0.47, pz * s / 2);
    hipRoof(pagoda, 0, y + 0.95, 0, s + 1.0, s + 1.0, 0.32);
    y += 1.12;
  }
  add(pagoda, G.cyl(0.05, 0.05, 1.9, 8), mat('#d8b04a', { metalness: 0.8, roughness: 0.3 }), 0, y + 0.95, 0);
  for (let i = 0; i < 6; i++) add(pagoda, G.torus(0.14, 0.025, 6, 14), mat('#d8b04a', { metalness: 0.8, roughness: 0.3 }), 0, y + 0.4 + i * 0.18, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  // 雷門（参道の入口、正面は +x）
  const kmon = (R.kaminarimon = group(temple, -10.6, 0, 5.3, -Math.PI / 2));
  for (const z of [-1.0, 1.0]) for (const x of [-0.35, 0.35]) add(kmon, G.cyl(0.12, 0.12, 2.6, 10), red, x, 1.3, z);
  add(kmon, G.box(1.0, 0.3, 2.6), red, 0, 2.7, 0);
  gableRoof(kmon, 0, 2.85, 0, 1.0, 1.9, { pitch: 0.5, over: 0.45 }).rotation.y = Math.PI / 2;
  // 大提灯「雷門」
  const ochochin = (R.ochochin = group(kmon, 0, 1.6, 0));
  const kmMat = new THREE.MeshStandardMaterial({ map: kaminariTex(), emissive: '#ffb050', emissiveMap: kaminariTex(), emissiveIntensity: 0, roughness: 0.6 });
  kmMat.userData.lamp = true;
  kmMat.userData.base = 1.0;
  R.lampMats.push(kmMat);
  add(ochochin, G.cyl(0.55, 0.55, 1.2, 20), kmMat, 0, 0, 0, { rot: [0, Math.PI / 2, 0] });
  for (const yy of [-0.62, 0.62]) add(ochochin, G.cyl(0.5, 0.5, 0.08, 20), mat('#2a1a14'), 0, yy, 0);
  // 鳥居代わりの灯籠（参道）
  for (const x of [-11.9, -9.3]) {
    const t = group(temple, x, 0, 4.4);
    add(t, G.box(0.45, 0.15, 0.45), stone, 0, 0.07, 0);
    add(t, G.cyl(0.09, 0.11, 0.7, 8), stone, 0, 0.5, 0);
    add(t, G.box(0.42, 0.32, 0.42), stone, 0, 1.0, 0);
    const tm = new THREE.MeshStandardMaterial({ color: '#ffcf6a', emissive: '#ff9a3a', emissiveIntensity: 1.6 });
    tm.userData.lamp = true;
    tm.userData.base = 1.6;
    R.lampMats.push(tm);
    add(t, G.box(0.22, 0.16, 0.44), tm, 0, 1.0, 0, { cast: false });
    add(t, G.cone(0.42, 0.32, 4), stone, 0, 1.33, 0, { rot: [0, Math.PI / 4, 0] });
  }

  // ---------------- 時の鐘（鐘楼） ----------------
  const bt = (R.bellTower = group(root, -5.2, 0, 4.6));
  add(bt, G.box(2.4, 0.5, 2.4), stone, 0, 0.25, 0);
  for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) add(bt, G.cyl(0.09, 0.11, 2.6, 8), wood, x, 1.8, z);
  add(bt, G.box(2.2, 0.16, 2.2), wood, 0, 3.1, 0);
  hipRoof(bt, 0, 3.15, 0, 3.0, 3.0, 1.1);
  // 鐘（青銅）
  const bronze = mat('#5a7a6a', { metalness: 0.6, roughness: 0.45 });
  R.bell = group(bt, 0, 2.95, 0);
  add(R.bell, G.cyl(0.42, 0.5, 1.1, 20), bronze, 0, -0.65, 0);
  add(R.bell, G.sphere(0.42, 18, 10), bronze, 0, -0.1, 0, { scale: [1, 0.35, 1] });
  add(R.bell, G.torus(0.48, 0.035, 6, 24), bronze, 0, -1.05, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(R.bell, G.torus(0.44, 0.025, 6, 24), bronze, 0, -0.55, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(R.bell, G.torus(0.1, 0.035, 6, 12), bronze, 0, 0.05, 0, { cast: false });
  // 撞木（しゅもく）：ロープでつるした丸太。綱が切れて、ぶらんと下がっている
  const shumoku = (R.shumoku = group(bt, 0.9, 2.3, 0));
  shumoku.userData.dynamic = true;
  add(shumoku, G.cyl(0.11, 0.11, 1.3, 10), mat('#b89a6a'), 0.55, 0, 0, { rot: [0, 0, Math.PI / 2] });
  for (const x of [0.2, 0.9]) add(shumoku, G.cyl(0.012, 0.012, 0.8, 4), mat('#d8c090'), x, 0.42, 0, { cast: false });
  // 引き綱（直すと見える）
  R.bellRope = add(shumoku, G.cyl(0.025, 0.025, 1.5, 6), mat('#d8b070'), 1.2, -0.75, 0.15, { rot: [0.2, 0, 0.1] });
  R.bellRope.userData.keep = true;
  R.brokenRope = add(shumoku, G.cyl(0.02, 0.02, 0.3, 6), mat('#a89060'), 1.2, -0.15, 0, { rot: [0.4, 0, 0.2] });
  R.brokenRope.userData.keep = true;
  shumoku.rotation.z = -0.05;

  // ---------------- 宿場の通り（町家） ----------------
  const shopDefs = [
    { id: 'kawaraban', x: -0.6, w: 3.0, ch: '瓦', noren: '#3a5a3a', sign: '瓦版　ねこ屋', open: true,
      goods: (gg, w, d) => {
        for (let i = 0; i < 6; i++) add(gg, G.box(0.36, 0.02, 0.5), mat('#f4ead2'), -0.8 + (i % 3) * 0.42, 0.72 + Math.floor(i / 3) * 0.03, d / 2 - 0.45, { rot: [0, (i - 3) * 0.1, 0], cast: false });
        // 刷り台と版木
        add(gg, G.box(0.6, 0.12, 0.45), mat('#8a5a3a'), 0.75, 0.76, d / 2 - 0.45);
      } },
    { id: 'dango', x: 2.9, w: 3.0, ch: '団', noren: '#c8582e', sign: 'だんご　りす屋',
      goods: (gg, w, d) => {
        for (let i = 0; i < 5; i++) {
          const k = group(gg, -0.8 + i * 0.4, 0.72, d / 2 - 0.45, 0.6);
          add(k, G.cyl(0.008, 0.008, 0.36, 4), mat('#c8a070'), 0, 0.16, 0, { rot: [0, 0, 0.5], cast: false });
          for (let j = 0; j < 3; j++) add(k, G.sphere(0.05, 8, 6), mat(i % 2 ? '#e8b860' : '#f4f0e6'), -0.06 + j * 0.06, 0.06 + j * 0.1, 0, { cast: false });
        }
        // 炭火の焼き台
        R.grillMat = glow('#ff6a1e', 0);
        add(gg, G.box(0.7, 0.08, 0.35), R.grillMat, 0.6, 0.73, d / 2 - 0.45, { cast: false });
      } },
    { id: 'gofuku', x: 6.4, w: 3.0, ch: '呉', noren: '#6a3a6a', sign: '呉服　つる屋',
      goods: (gg, w, d) => {
        ['#c8382e', '#2b5a9a', '#e8b84a', '#4a8a5a'].forEach((c, i) => add(gg, G.box(0.32, 0.12, 0.5), mat(c), -0.6 + i * 0.4, 0.74, d / 2 - 0.45));
        add(gg, G.box(0.5, 1.1, 0.06), mat('#e88aa0'), 1.0, 1.3, -0.2, { cast: false });
      } },
  ];
  for (const sd of shopDefs) {
    const m = machiya(root, sd.x, -2.45, { w: sd.w, d: 2.2, ch: sd.ch, noren: sd.noren, sign: sd.sign, open: sd.open, goods: sd.goods });
    m.id = sd.id;
    m.alwaysOpen = !!sd.open;
    R.shops.push(m);
    R[sd.id] = m.g;
  }
  // 瓦版屋の行灯（夜明け前から灯っている）
  const andon = group(R.kawaraban, -1.15, 0.2, 0.75);
  add(andon, G.box(0.3, 0.04, 0.3), darkWood, 0, 0.02, 0);
  const andonMat = new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffb050', emissiveIntensity: 1.6 });
  andonMat.userData.lamp = true;
  R.andonMat = andonMat;
  add(andon, G.box(0.26, 0.4, 0.26), andonMat, 0, 0.26, 0, { cast: false });
  R.andonLight = new THREE.PointLight('#ffb060', 2.2, 5, 1.6);
  R.andonLight.position.set(-1.15, 1.0, 1.0);
  R.kawaraban.add(R.andonLight);
  // 軒先の提灯（夜は灯る）
  R.streetLanterns = [];
  for (const [x, z] of [[-2.1, -1.0], [1.4, -1.0], [4.9, -1.0], [8.0, -1.0]]) {
    const c = chochin(root, x, 2.0, z, { s: 0.9, color: '#f4ead2', ch: '宿', mats: R.streetLanterns });
    c.m.emissiveIntensity = 1.4;
  }
  R.streetLight = [];
  for (const x of [-1.0, 5.0]) {
    const L = new THREE.PointLight('#ffb060', 2.4, 7, 1.6);
    L.position.set(x, 2.0, 0.3);
    root.add(L);
    R.streetLight.push(L);
  }

  // ---------------- 町木戸と番所（右） ----------------
  const kido = (R.kido = group(root, 10.2, 0, TRACK_Z));
  for (const s of [-1, 1]) add(kido, G.box(0.3, 3.4, 0.3), darkWood, 0, 1.7, s * 1.55);
  add(kido, G.box(0.36, 0.3, 3.6), darkWood, 0, 3.25, 0);
  gableRoof(kido, 0, 3.4, 0, 3.4, 0.8, { pitch: 0.55, over: 0.2 }).rotation.y = Math.PI / 2;
  R.kidoDoors = [];
  for (const s of [-1, 1]) {
    const dg = group(kido, 0, 0, s * 1.4);
    dg.userData.dynamic = true;
    const door = add(dg, G.box(0.12, 2.6, 1.38), new THREE.MeshStandardMaterial({ map: boardsTex('#6a4a32', [1, 2]), roughness: 0.9 }), 0, 1.45, -s * 0.69);
    for (const yy of [0.6, 1.5, 2.4]) add(dg, G.box(0.16, 0.1, 1.38), darkWood, 0, yy, -s * 0.69);
    void door;
    R.kidoDoors.push(dg);
  }
  // 木戸の柵
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(root, G.box(0.1, 1.4, 0.1), wood, 10.2, 0.7, TRACK_Z + s * (2.0 + i * 0.5));
  for (const s of [-1, 1]) add(root, G.box(0.08, 0.08, 1.8), wood, 10.2, 1.2, TRACK_Z + s * 2.75);
  // 番所
  const ban = (R.bansho = group(root, 11.6, 0, -2.4));
  add(ban, G.box(2.4, 0.16, 2.0), mat('#8a8478'), 0, 0.08, 0);
  for (const [x, z] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) add(ban, G.box(0.14, 2.0, 0.14), darkWood, x, 1.16, z);
  add(ban, G.box(2.1, 1.6, 0.08), new THREE.MeshStandardMaterial({ map: boardsTex('#7a5a3e', [2, 1]) }), 0, 0.96, -0.9);
  for (const s of [-1, 1]) add(ban, G.box(0.08, 1.6, 1.7), new THREE.MeshStandardMaterial({ map: boardsTex('#7a5a3e', [2, 1]) }), s * 1.1, 0.96, 0);
  gableRoof(ban, 0, 2.16, 0, 2.2, 1.8, { pitch: 0.5, over: 0.3 });
  add(ban, G.box(0.36, 1.1, 0.05), new THREE.MeshStandardMaterial({ map: tateTex('自身番', { w: 96, h: 256 }) }), -0.75, 1.5, 0.95, { cast: false });
  const banLan = chochin(ban, 0.75, 1.75, 1.05, { s: 0.9, color: '#f4ead2', ch: '番', mats: R.streetLanterns });
  banLan.m.emissiveIntensity = 1.4;
  // 突棒・刺股（飾り）
  for (let i = 0; i < 3; i++) add(ban, G.cyl(0.02, 0.02, 2.0, 4), mat('#6a5a4a'), 1.25, 1.0, -0.6 + i * 0.25, { rot: [0, 0, 0.12] });

  // ---------------- 井戸と茶店の縁台 ----------------
  const well = (R.well = group(root, 2.1, 0, 4.5));
  add(well, G.cyl(0.55, 0.6, 0.65, 16, true), new THREE.MeshStandardMaterial({ map: stoneTex('#a8a090', [3, 1]), side: THREE.DoubleSide }), 0, 0.33, 0);
  add(well, G.circle(0.5, 16), mat('#1a2a3a'), 0, 0.3, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  for (const s of [-1, 1]) add(well, G.box(0.1, 1.6, 0.1), wood, s * 0.6, 0.8, 0);
  add(well, G.box(1.4, 0.1, 0.1), wood, 0, 1.6, 0);
  gableRoof(well, 0, 1.65, 0, 1.2, 0.9, { pitch: 0.5, over: 0.15 });
  add(well, G.cyl(0.08, 0.08, 0.12, 10), darkWood, 0, 1.5, 0, { rot: [0, 0, Math.PI / 2] });
  // 桶（キュウリが冷やしてある）
  const oke = (R.oke = group(well, 0.85, 0, 0.35));
  add(oke, G.cyl(0.25, 0.22, 0.35, 14), mat('#b8905a'), 0, 0.18, 0);
  add(oke, G.cyl(0.255, 0.255, 0.04, 14), mat('#3a3a40'), 0, 0.28, 0);
  add(oke, G.circle(0.22, 14), mat('#6aa8c0', { roughness: 0.1 }), 0, 0.3, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  R.cucumbers = group(oke);
  R.cucumbers.userData.dynamic = true;
  for (let i = 0; i < 3; i++) add(R.cucumbers, G.capsule(0.035, 0.22), mat('#3a8a2a'), -0.08 + i * 0.08, 0.33, 0, { rot: [Math.PI / 2, i * 0.4, 0], cast: false });
  // 茶店の縁台と野点傘
  const chaya = group(root, 5.4, 0, 4.4);
  add(chaya, G.box(1.6, 0.08, 0.6), mat('#c8382e'), 0, 0.5, 0);
  for (const [x, z] of [[-0.7, -0.25], [0.7, -0.25], [-0.7, 0.25], [0.7, 0.25]]) add(chaya, G.box(0.08, 0.5, 0.08), wood, x, 0.25, z);
  add(chaya, G.cyl(0.03, 0.03, 2.2, 6), wood, 0.9, 1.1, -0.4);
  const kasa = add(chaya, G.cone(1.1, 0.5, 16, true), mat('#c8382e', { side: THREE.DoubleSide }), 0.9, 2.1, -0.4);
  void kasa;
  add(chaya, G.cyl(0.07, 0.07, 0.05, 10), mat('#f4ead2'), -0.4, 0.57, 0);

  // ---------------- 火の見やぐら（右手前） ----------------
  const hino = (R.hinomi = group(root, 12.2, 0, 3.4));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(hino, G.box(0.12, 4.75, 0.12), darkWood, 0.55 * sx, 2.35, 0.55 * sz, { rot: [-sz * 0.065, 0, sx * 0.065] });
  }
  for (const [yy, r] of [[1.2, 0.62], [2.6, 0.52], [3.9, 0.44]]) {
    for (const s of [-1, 1]) {
      add(hino, G.box(r * 2 + 0.1, 0.07, 0.07), darkWood, 0, yy, s * r);
      add(hino, G.box(0.07, 0.07, r * 2 + 0.1), darkWood, s * r, yy, 0);
    }
  }
  // はしご（手前）
  for (const s of [-1, 1]) add(hino, G.box(0.05, 4.6, 0.05), wood, s * 0.18, 2.3, 0.75, { rot: [-0.09, 0, 0] });
  for (let i = 0; i < 10; i++) add(hino, G.box(0.36, 0.035, 0.035), wood, 0, 0.35 + i * 0.44, 0.78 - i * 0.04);
  add(hino, G.box(1.1, 0.1, 1.1), darkWood, 0, 4.7, 0);
  for (const s of [-1, 1]) { add(hino, G.box(1.1, 0.3, 0.04), darkWood, 0, 4.9, s * 0.53); add(hino, G.box(0.04, 0.3, 1.1), darkWood, s * 0.53, 4.9, 0); }
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) add(hino, G.box(0.06, 0.9, 0.06), darkWood, x, 5.2, z);
  hipRoof(hino, 0, 5.6, 0, 1.5, 1.5, 0.6);
  add(hino, G.cyl(0.12, 0.16, 0.32, 12), mat('#7a6a3a', { metalness: 0.6 }), 0, 5.35, 0);

  // ---------------- 川・石垣・太鼓橋・渡し場 ----------------
  const water = (R.waterMat = waterize(new THREE.MeshStandardMaterial({ color: '#3a5a8a', emissive: '#1a2a4a', emissiveIntensity: 0.3, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.92 }), { strength: 0.3 }));
  add(root, G.box(29.4, 0.05, RIVER_Z1 - RIVER_Z0), water, 0, 0.03, (RIVER_Z0 + RIVER_Z1) / 2, { cast: false });
  const ishigaki = new THREE.MeshStandardMaterial({ map: stoneTex('#8a8478', [12, 1]), roughness: 1 });
  for (const z of [RIVER_Z0 - 0.12, RIVER_Z1 + 0.12]) add(root, G.box(29.4, 0.32, 0.24), ishigaki, 0, 0.12, z);
  // 川向こうの土手の柳
  [[-11, 9.8], [-5.5, 9.9], [6, 9.8], [11.5, 9.7]].forEach(([x, z], i) => willow(root, x, z, 0.8, 30 + i));
  // 太鼓橋
  const br = (R.bridge = group(root, 2.0, 0, (RIVER_Z0 + RIVER_Z1) / 2));
  const deck = new THREE.MeshStandardMaterial({ map: planksTex('#a8784e', '#6e4a2e', 10), roughness: 0.9 });
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = -0.75 + (i / (N - 1)) * 1.5;
    const zz = Math.sin(a) * 2.2, yy = Math.cos(a) * 1.4 - 0.75;
    add(br, G.box(1.6, 0.1, 0.42), deck, 0, yy, zz, { rot: [Math.atan(0.636 * Math.tan(a)), 0, 0] });
    if (i % 2 === 0) for (const s of [-1, 1]) add(br, G.box(0.08, 0.5, 0.08), red, s * 0.78, yy + 0.28, zz);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < N - 1; i++) {
      const a0 = -0.75 + (i / (N - 1)) * 1.5, a1 = -0.75 + ((i + 1) / (N - 1)) * 1.5;
      const p0 = new THREE.Vector3(s * 0.78, Math.cos(a0) * 1.4 - 0.75 + 0.52, Math.sin(a0) * 2.2);
      const p1 = new THREE.Vector3(s * 0.78, Math.cos(a1) * 1.4 - 0.75 + 0.52, Math.sin(a1) * 2.2);
      const len = p0.distanceTo(p1);
      add(br, G.box(0.08, 0.08, len + 0.02), red, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2, { rot: [-Math.atan2(p1.y - p0.y, p1.z - p0.z), 0, 0] });
    }
    // 擬宝珠
    add(br, G.sphere(0.08, 8, 6), mat('#d8b04a', { metalness: 0.7 }), s * 0.78, Math.cos(-0.75) * 1.4 - 0.75 + 0.62, Math.sin(-0.75) * 2.2);
    add(br, G.sphere(0.08, 8, 6), mat('#d8b04a', { metalness: 0.7 }), s * 0.78, Math.cos(0.75) * 1.4 - 0.75 + 0.62, Math.sin(0.75) * 2.2);
  }
  // 橋の下で光るもの（十手）— 朝になると見える
  const jit = (R.jitteInRiver = group(root, 2.6, 0.06, 7.7));
  jit.userData.dynamic = true;
  add(jit, G.cyl(0.02, 0.02, 0.4, 6), mat('#c8d0d8', { metalness: 0.9, roughness: 0.2 }), 0, 0, 0, { rot: [0, 0.5, Math.PI / 2] });
  add(jit, G.sphere(0.035, 6, 4), mat('#c8382e'), -0.18, 0, -0.1);
  // 渡し場
  const pier = (R.pier = group(root, 8.0, 0, RIVER_Z0 - 0.3));
  add(pier, G.box(1.2, 0.14, 1.8), deck, 0, 0.32, 0.6);
  for (const [x, z] of [[-0.5, 1.4], [0.5, 1.4]]) add(pier, G.cyl(0.07, 0.07, 1.0, 6), darkWood, x, 0.1, z);
  add(pier, G.box(0.4, 1.2, 0.05), new THREE.MeshStandardMaterial({ map: tateTex('渡し場', { w: 96, h: 256 }) }), -0.75, 0.9, 0.0, { cast: false });
  add(pier, G.cyl(0.04, 0.04, 1.4, 6), darkWood, -0.75, 0.7, -0.02);
  // 小舟
  const boat = (R.boat = group(root, 8.0, 0.08, 7.9));
  boat.userData.dynamic = true;
  add(boat, G.box(2.4, 0.2, 0.8), mat('#8a6a4a'), 0, 0.1, 0);
  for (const s of [-1, 1]) add(boat, G.box(2.4, 0.25, 0.08), mat('#6a4a32'), 0, 0.22, s * 0.38);
  add(boat, G.box(0.5, 0.3, 0.6), mat('#6a4a32'), 1.2, 0.2, 0, { rot: [0, 0, -0.4] });
  add(boat, G.cyl(0.025, 0.025, 2.4, 5), mat('#c8a060'), -0.8, 0.9, 0.2, { rot: [0.3, 0, 0.4] });
  // 舫い綱（巻いた綱。あげると消える）
  R.boatRope = add(boat, G.torus(0.14, 0.04, 6, 14), mat('#c8a060'), 0.6, 0.27, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  R.boatRope.userData.keep = true;

  // 常夜灯（橋のたもと）
  const joya = group(root, 0.4, 0, 5.5);
  add(joya, G.box(0.6, 0.2, 0.6), stone, 0, 0.1, 0);
  add(joya, G.cyl(0.12, 0.14, 1.0, 8), stone, 0, 0.7, 0);
  add(joya, G.box(0.5, 0.4, 0.5), stone, 0, 1.4, 0);
  const jm = new THREE.MeshStandardMaterial({ color: '#ffcf6a', emissive: '#ff9a3a', emissiveIntensity: 1.6 });
  jm.userData.lamp = true;
  jm.userData.base = 1.6;
  R.lampMats.push(jm);
  add(joya, G.box(0.3, 0.22, 0.52), jm, 0, 1.4, 0, { cast: false });
  add(joya, G.cone(0.5, 0.4, 4), stone, 0, 1.8, 0, { rot: [0, Math.PI / 4, 0] });
  R.joyaLight = new THREE.PointLight('#ffb060', 1.8, 5, 1.6);
  R.joyaLight.position.set(0.4, 1.5, 5.6);
  root.add(R.joyaLight);

  // 天水桶と植木（通りのにぎわい）
  for (const [x, z] of [[-2.4, -0.9], [8.3, -0.9]]) {
    const tg = group(root, x, 0, z);
    for (let i = 0; i < 3; i++) add(tg, G.cyl(0.22 - i * 0.04, 0.22 - i * 0.04, 0.28, 12), mat('#8a6a4a'), 0, 0.14 + i * 0.28, 0);
  }
  for (const [x, z] of [[4.6, -1.0], [-1.6, 3.2], [9.0, 5.0]]) {
    const pg = group(root, x, 0, z);
    add(pg, G.cyl(0.16, 0.12, 0.28, 10), mat('#8a5a3a'), 0, 0.14, 0);
    add(pg, G.sphere(0.28, 10, 8), mat('#4a7a3a', { flatShading: true }), 0, 0.48, 0);
    add(pg, G.sphere(0.06, 6, 4), mat('#e86a8a'), 0.12, 0.62, 0.12);
  }
  // 夜の灯りが地面に落ちる光だまり（夜明けとともに消える）
  R.nightPools = [
    lightPool(root, -0.6, 0.03, -0.3, 3.0, 1.6, '#ffb860'),
    lightPool(root, -2.1, 0.03, -0.4, 1.4, 1.4, '#ffc070'),
    lightPool(root, 1.4, 0.03, -0.4, 1.4, 1.4, '#ffc070'),
    lightPool(root, 4.9, 0.03, -0.4, 1.4, 1.4, '#ffc070'),
    lightPool(root, 8.0, 0.03, -0.4, 1.4, 1.4, '#ffc070'),
    lightPool(root, 0.4, 0.03, 5.5, 2.0, 2.0, '#ffb860'),
    lightPool(root, 12.3, 0.03, -1.1, 1.6, 1.4, '#ffc070'),
    lightPool(root, -10.6, 0.03, 4.4, 3.4, 1.6, '#ffb860'),
  ];
  return R;
}
