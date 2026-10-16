import * as THREE from 'three';
import { pixTex, pixMat, pixText } from '../../lib/pixel.js';
import { add, group, rng } from '../../lib/util.js';
import { lightPool } from '../../lib/livefx.js';
import { mats, box, plane, roof, tower, wall, chest, crestTex } from '../hero/diorama.js';
import { GLYPHS } from '../hero/panels.js';
import { RECIPE_CLUES } from './panels.js';

// ---------------------------------------------------------------
// 魔王城（HD-2D 風）
// 島は x[-22.5,22.5] z[-16.5,16.5]。すき間を広く、見通しよく。
//  ・左（x<-9）：城の外。駅・墓石・魔界文字の石碑。城壁の門に骸骨の門番
//  ・中：中庭（こわれた噴水・紫の炎の燭台・肖像画の回廊）
//  ・中の左：図書室の塔、魔女ネコの台所　中の右：地下牢、宝物庫
//  ・奥：丘の上の天守。玉座のテラスに魔王
//  ・右：溶岩の谷と、跳ね橋（線路が通る）
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
export const HILL = 2.6;
export const ISLAND = { w: 45, d: 33 };
export const GATE_X = -9.0;

const C = {
  stone: () => pixTex('mstone', 32, 32, (p) => {
    p.rect(0, 0, 32, 32, '#4a4458');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const x = c * 11 + (r % 2 ? 5 : 0), y = r * 8;
      const tone = ['#6e6680', '#78708a', '#686078'][(r + c) % 3];
      for (const k of [-33, 0]) { p.rect(x + k + 1, y + 1, 10, 6, tone); p.rect(x + k + 1, y + 1, 10, 1, '#8a82a0'); }
    }
  }, [0.5, 0.5]),
  floor: () => pixTex('mfloor', 32, 32, (p) => {
    const r = rng(5);
    p.rect(0, 0, 32, 32, '#3a3646');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const tone = ['#5a5468', '#544e62', '#625a70'][Math.floor(r() * 3)];
      p.rect(x * 8 + 1, y * 8 + 1, 7, 7, tone);
      p.px(x * 8 + 2, y * 8 + 2, '#5e5672');
      if (r() < 0.2) p.px(x * 8 + 5, y * 8 + 5, '#2e2a38');
    }
  }, [0.5, 0.5]),
  ground: () => pixTex('mground', 32, 32, (p) => {
    const r = rng(9);
    p.rect(0, 0, 32, 32, '#4a4a3a');
    for (let i = 0; i < 80; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), r() > 0.5 ? '#3a3a2e' : '#5a5a46');
    for (let i = 0; i < 18; i++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32); p.px(x, y, '#6a7a4a'); p.px(x, y - 1, '#6a7a4a'); }
  }, [0.5, 0.5]),
  lava: () => pixTex('lava', 32, 32, (p) => {
    const r = rng(13);
    p.rect(0, 0, 32, 32, '#c83a1a');
    for (let i = 0; i < 26; i++) { const x = Math.floor(r() * 30), y = Math.floor(r() * 32); p.rect(x, y, 3, 1, '#f8a02a'); }
    for (let i = 0; i < 12; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), '#fff0a0');
    for (let i = 0; i < 10; i++) { const x = Math.floor(r() * 30), y = Math.floor(r() * 32); p.rect(x, y, 2, 2, '#7a1a10'); }
  }, [0.5, 0.5]),
  roofP: () => pixTex('roofP', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#4a2a6a');
    for (let r = 0; r < 4; r++) { p.rect(0, r * 4 + 3, 16, 1, '#2a1448'); for (let k = 0; k < 4; k++) p.px((k * 4 + (r % 2 ? 2 : 0)) % 16, r * 4, '#6a4a8a'); }
  }),
  carpet: () => pixTex('carpet', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#8a1a2a');
    p.rect(0, 0, 1, 16, '#f0c840'); p.rect(15, 0, 1, 16, '#f0c840');
    for (let y = 2; y < 16; y += 6) { p.px(7, y, '#f0c840'); p.px(8, y + 1, '#f0c840'); }
  }),
  book: () => pixTex('books', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#3a2414');
    const cs = ['#8a2a2a', '#2a5a8a', '#4a7a3a', '#8a6a2a', '#5a3a7a'];
    for (let s = 0; s < 3; s++) for (let i = 0; i < 8; i++) { p.rect(i * 2, s * 5 + 1, 2, 4, cs[(i + s * 3) % 5]); p.px(i * 2, s * 5 + 2, '#f0c840'); }
  }),
};

/** 魔界文字（星座の形）を、黒い板に光る線で描く */
function glyphBoard(text, { w = 3.6, h = 1.0, color = '#c8a0ff' } = {}) {
  const chars = [...text];
  const S = 24;
  const cv = document.createElement('canvas');
  cv.width = chars.length * S * 4; cv.height = S * 4;
  const x = cv.getContext('2d');
  x.fillStyle = '#140c20'; x.fillRect(0, 0, cv.width, cv.height);
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 3;
  chars.forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    const [pts, edges] = g;
    const ox = i * S * 4 + 8, oy = 8, k = (S * 4 - 16) / 20;
    for (const [a, b] of edges) { x.beginPath(); x.moveTo(ox + pts[a][0] * k, oy + pts[a][1] * k); x.lineTo(ox + pts[b][0] * k, oy + pts[b][1] * k); x.stroke(); }
    for (const [px, py] of pts) x.fillRect(ox + px * k - 4, oy + py * k - 4, 8, 8);
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 1 });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

/** 紫の炎の燭台 */
function brazier(R, parent, x, z, { h = 1.4, dark = false } = {}) {
  const g = group(parent, x, 0, z);
  add(g, new THREE.CylinderGeometry(0.12, 0.2, h, 6), R.iron, 0, h / 2, 0);
  add(g, new THREE.CylinderGeometry(0.42, 0.24, 0.32, 8), R.iron, 0, h + 0.1, 0);
  const fl = add(g, new THREE.ConeGeometry(0.3, 0.8, 6), dark ? R.darkFlameMat : R.flameMat, 0, h + 0.62, 0, { cast: false });
  fl.userData.keep = true;
  g.userData.flame = fl;
  R.flames.push(fl);
  return g;
}

/** 枯れ木 */
function deadTree(parent, x, z, s = 1, seed = 1) {
  const r = rng(seed);
  const g = group(parent, x, 0, z);
  g.scale.setScalar(s);
  const bark = new THREE.MeshStandardMaterial({ color: '#3a2e2a', roughness: 1, flatShading: true });
  add(g, new THREE.CylinderGeometry(0.14, 0.26, 2.4, 6), bark, 0, 1.2, 0, { rot: [0, 0, 0.06] });
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, l = 0.9 + r() * 0.8;
    add(g, new THREE.CylinderGeometry(0.04, 0.08, l, 5), bark, Math.cos(a) * 0.35, 1.9 + r() * 0.6, Math.sin(a) * 0.35, { rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9] });
  }
  return g;
}

/** 墓石 */
function grave(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  const m = new THREE.MeshStandardMaterial({ color: '#7a7488', roughness: 1, flatShading: true });
  add(g, new THREE.BoxGeometry(0.6, 0.8, 0.18), m, 0, 0.4, 0, { rot: [0, 0, (x % 2) * 0.08] });
  add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.18, 10, 1, false, 0, Math.PI), m, 0, 0.8, 0, { rot: [Math.PI / 2, Math.PI / 2, 0] });
  return g;
}

/** 肖像画（額縁つき）。lantern に照らすと絵の中の光るもの（ゴーストのいる場所）が見える */
function portraitTex(kind, ghost) {
  return pixTex(`portrait-${kind}-${ghost ? 1 : 0}`, 16, 20, (p) => {
    p.rect(0, 0, 16, 20, '#c8982a'); p.rect(1, 1, 14, 18, '#8a6418');
    p.rect(2, 2, 12, 16, '#2a2440');
    const K = '#1a1420';
    if (kind === 'brothers') { // 小さな兄弟ドラゴン
      p.disc(6, 11, 3, '#6a3aa8'); p.disc(10.5, 12, 2.2, '#e8603a');
      p.px(5, 10, K); p.px(7, 10, K); p.px(10, 11, K); p.px(11, 11, K);
      p.rect(3, 15, 10, 1, '#4a8a3a');
    } else if (kind === 'fountain') {
      p.rect(4, 13, 8, 3, '#7a7488'); p.rect(7, 8, 2, 5, '#7a7488'); p.rect(5, 7, 6, 1, '#7a7488');
      if (ghost) { p.disc(8, 5, 1.6, '#e8f0ff'); p.px(7, 5, K); p.px(9, 5, K); }
    } else if (kind === 'kitchen') {
      p.disc(8, 13, 3.5, '#2a2a30'); p.rect(4, 10, 8, 1, '#3a3a40'); p.rect(5, 9, 6, 1, '#5ac85a');
      if (ghost) { p.disc(8, 6, 1.6, '#e8f0ff'); p.px(7, 6, K); p.px(9, 6, K); }
    } else if (kind === 'library') {
      for (let i = 0; i < 3; i++) p.rect(3, 4 + i * 5, 10, 4, ['#8a2a2a', '#2a5a8a', '#4a7a3a'][i]);
      if (ghost) { p.disc(11, 5, 1.6, '#e8f0ff'); p.px(10, 5, K); p.px(12, 5, K); }
    } else if (kind === 'candle') { // 消えた燭台（ここだけは暗いときに見える）
      p.rect(7, 9, 2, 8, '#5a5a6a'); p.rect(5, 8, 6, 1, '#5a5a6a');
      p.disc(8, 6, 1.6, ghost ? '#1a1420' : '#c8a0ff');
      if (ghost) { p.px(7, 6, '#e8f0ff'); p.px(9, 6, '#e8f0ff'); }
    }
  });
}

export function buildMaouDiorama(scene) {
  const M = mats();
  const root = group(scene);
  const R = { root, flames: [], banners: [], portraits: [], lavaTex: null, ghostSpots: {} };
  R.iron = new THREE.MeshStandardMaterial({ color: '#2a2630', roughness: 0.6, metalness: 0.4 });
  R.flameMat = new THREE.MeshBasicMaterial({ color: '#b878ff', transparent: true, opacity: 0.9 });
  R.darkFlameMat = new THREE.MeshBasicMaterial({ color: '#b878ff', transparent: true, opacity: 0.9 });
  const stone = pixMat(C.stone());
  const floor = new THREE.MeshStandardMaterial({ map: C.floor(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const roofP = pixMat(C.roofP());
  R.stoneMat = stone;

  // ---------------- 地面 ----------------
  plane(root, 44.4, 32.4, new THREE.MeshStandardMaterial({ map: C.ground(), roughness: 1 }), 0, 0.004, 0);
  plane(root, 23, 17, floor, 3.0, 0.012, 6.6); // 中庭の石畳
  plane(root, 16, 3.0, floor, -14.5, 0.013, -3.0); // 駅前
  plane(root, 4, 2.6, floor, -10.5, 0.014, 3.0); // 門への道

  // ---------------- 駅（城の外） ----------------
  box(root, 11.5, 0.75, 2.3, stone, -12.6, 0.375, -3.75);
  box(root, 11.6, 0.06, 0.3, new THREE.MeshStandardMaterial({ color: '#c8a0ff', emissive: '#6a3aa8', emissiveIntensity: 0.4 }), -12.6, 0.78, -4.75, { cast: false });
  const st = group(root, -15.5, 0.75, -3.7);
  for (const [px, pz] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) box(st, 0.14, 2.2, 0.14, R.iron, px, 1.1, pz);
  box(st, 3.4, 0.14, 1.9, roofP, 0, 2.28, 0, { rot: [0.1, 0, 0] });
  for (let i = 0; i < 3; i++) box(root, 1.5, 0.75 * (3 - i) / 3, 0.35, stone, -7.6, 0.75 * (3 - i) / 6, -2.42 + i * 0.35);
  const sign = (R.stationSign = group(root, -11.0, 0.75, -4.45));
  for (const s of [-1, 1]) box(sign, 0.1, 1.9, 0.1, R.iron, s * 1.0, 0.95, 0);
  add(sign, new THREE.PlaneGeometry(2.3, 0.6), new THREE.MeshStandardMaterial({ map: pixText('まおうじょう', { w: 96, h: 24, size: 14, bg: '#2a1a3a', fg: '#e8c8ff', border: '#8a5ac8' }), roughness: 1 }), 0, 1.55, 0.06, { cast: false });
  add(sign, new THREE.PlaneGeometry(2.3, 0.3), new THREE.MeshStandardMaterial({ map: pixText('←じょうかまち　ゆげのさと→', { w: 140, h: 12, size: 10, bg: '#4a2a6a', fg: '#ffffff', border: '#2a1448' }), roughness: 1 }), 0, 1.12, 0.06, { cast: false });
  // 墓石と枯れ木（ちょっとこわい、でもかわいい）
  [[-20.5, 3.0], [-19.2, 4.6], [-20.8, 6.6], [-18.6, 8.4], [-20.2, 10.4], [-17.4, 12.6]].forEach(([x, z], i) => grave(root, x, z, (i - 3) * 0.12));
  deadTree(root, -15.5, 8.0, 1.1, 3);
  deadTree(root, -20.5, 14.2, 0.9, 5);
  deadTree(root, 20.8, 12.0, 1.0, 7);
  // 魔界文字の石碑（対応表。駅前の広場に立っている）
  const stele = (R.stele = group(root, -14.4, 0, 2.6, 0.25));
  const steleM = new THREE.MeshStandardMaterial({ color: '#5a5468', roughness: 1, flatShading: true });
  box(stele, 2.0, 0.3, 0.8, steleM, 0, 0.15, 0);
  box(stele, 1.6, 2.2, 0.4, steleM, 0, 1.4, 0);
  const sb = glyphBoard('あいうえお', { w: 1.3, h: 0.28, color: '#d8b8ff' });
  sb.position.set(0, 2.15, 0.21); stele.add(sb);
  const sb2 = glyphBoard('さしたとま', { w: 1.3, h: 0.28, color: '#d8b8ff' });
  sb2.position.set(0, 1.75, 0.21); stele.add(sb2);
  add(stele, new THREE.PlaneGeometry(1.3, 0.5), new THREE.MeshStandardMaterial({ map: pixText('魔界文字', { w: 56, h: 16, size: 11, bg: '#3a3448', fg: '#e8d8ff', border: '#5a5468' }) }), 0, 1.15, 0.21, { cast: false });

  // ---------------- 城壁と門（x = -9） ----------------
  const cw = group(root);
  const wallZ = (z0, z1) => { const g2 = group(cw, GATE_X, 0, (z0 + z1) / 2, Math.PI / 2); wall(g2, -(z1 - z0) / 2, (z1 - z0) / 2, 0, 0, 2.6, { th: 0.8 }); };
  wallZ(-1.6, 0.4);
  wallZ(5.6, 16.0);
  for (const z of [0.6, 5.4]) tower(cw, GATE_X, 0, z, 0.9, 4.0, roofP);
  R.gate = group(root, GATE_X, 0, 3.0);
  box(R.gate, 1.0, 1.0, 4.2, stone, 0, 3.4, 0);
  for (let z = -1.8; z <= 1.81; z += 0.6) box(R.gate, 1.04, 0.4, 0.32, stone, 0, 4.1, z);
  // 鉄格子の門扉（開くと上へあがる）
  R.portcullis = group(R.gate, 0, 0, 0);
  R.portcullis.userData.dynamic = true;
  for (let z = -1.8; z <= 1.81; z += 0.3) box(R.portcullis, 0.08, 2.9, 0.08, R.iron, 0, 1.45, z);
  for (const y of [0.6, 1.5, 2.4]) box(R.portcullis, 0.08, 0.08, 4.0, R.iron, 0, y, 0);
  // 門の上の、合言葉の魔界文字（ランタンで照らすと見える）
  R.passGlyph = glyphBoard('おとうと', { w: 2.4, h: 0.55, color: '#e8c8ff' });
  R.passGlyph.position.set(-0.52, 3.4, 0);
  R.passGlyph.rotation.y = -Math.PI / 2;
  R.passGlyph.userData.noPick = true;
  R.gate.add(R.passGlyph);
  // 門の外の、門番の詰め所（小さな屋根）
  const hut = group(root, -11.0, 0, 5.6);
  for (const [px, pz] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) box(hut, 0.12, 2.0, 0.12, R.iron, px, 1.0, pz);
  box(hut, 1.8, 0.12, 1.6, roofP, 0, 2.05, 0, { rot: [0.12, 0, 0] });

  // ---------------- 丘の上の天守と、玉座のテラス ----------------
  const hillTop = new THREE.MeshStandardMaterial({ map: C.floor(), roughness: 1 });
  box(root, 30, HILL, 7.6, [stone, stone, hillTop, stone, stone, stone], 0, HILL / 2, -12.4);
  const castle = (R.castle = group(root));
  wall(castle, -14.6, -3.2, -9.0, HILL, 1.4);
  wall(castle, 3.2, 14.6, -9.0, HILL, 1.4);
  wall(castle, -14.6, 14.6, -15.9, HILL, 1.6);
  const keep = (R.keep = group(castle, 0, HILL, -13.4));
  box(keep, 9.0, 7.0, 4.4, stone, 0, 3.5, 0);
  for (let x = -4.3; x <= 4.3; x += 0.9) for (const z of [-2.2, 2.2]) box(keep, 0.42, 0.45, 0.42, stone, x, 7.22, z);
  // 赤く光る窓
  R.keepWin = new THREE.MeshStandardMaterial({ color: '#3a1020', emissive: '#ff5a3a', emissiveIntensity: 0.6 });
  for (const x of [-3.2, 3.2]) for (const y of [2.4, 5.0]) box(keep, 0.6, 1.0, 0.06, R.keepWin, x, y, 2.22, { cast: false });
  for (const x of [-1.8, 1.8]) R.banners.push(add(keep, new THREE.PlaneGeometry(1.0, 1.6), pixMat(pixTex('mcrest', 16, 24, (p) => {
    p.rect(0, 0, 16, 24, '#4a2a6a'); p.tri(0, 20, 16, 20, 8, 24, '#4a2a6a'); p.rect(0, 0, 16, 1, '#f0c840');
    p.disc(8, 10, 4.5, '#e8603a'); p.tri(5, 5, 7, 2, 7, 7, '#f4ecd0'); p.tri(11, 5, 9, 2, 9, 7, '#f4ecd0'); p.px(7, 10, '#1a1420'); p.px(9, 10, '#1a1420');
  }), { side: THREE.DoubleSide }), x, 4.8, 2.24, { cast: false }));
  tower(castle, 0, HILL + 7.0, -14.2, 1.6, 3.2, roofP, { flag: '#8a3ac8' });
  for (const [x, z] of [[-13.6, -15.2], [13.6, -15.2]]) tower(castle, x, HILL, z, 1.4, 6.4, roofP, { flag: '#c83a48' });
  for (const [x, z] of [[-14.2, -9.2], [14.2, -9.2]]) tower(castle, x, HILL, z, 1.0, 3.6, roofP);
  // 玉座のテラス（前に張り出した、屋根のない広間）
  const ter = (R.terrace = group(root, 0, HILL, -9.6));
  box(ter, 8.0, 0.3, 4.2, stone, 0, 0.15, 0);
  plane(ter, 1.6, 4.0, pixMat(C.carpet()), 0, 0.32, 0.2);
  for (const x of [-3.7, 3.7]) for (const z of [-1.6, 1.6]) {
    add(ter, new THREE.CylinderGeometry(0.22, 0.26, 2.6, 8), stone, x, 1.6, z);
    add(ter, new THREE.CylinderGeometry(0.34, 0.34, 0.2, 8), stone, x, 2.95, z);
  }
  // 玉座
  const throne = (R.throne = group(ter, 0, 0.3, -1.4));
  box(throne, 2.6, 0.6, 1.6, M.planks, 0, 0.3, 0);
  box(throne, 2.6, 3.0, 0.4, new THREE.MeshStandardMaterial({ color: '#6a1a3a', roughness: 0.8 }), 0, 1.5, -0.6);
  box(throne, 2.8, 0.25, 0.5, M.gold, 0, 3.1, -0.6);
  for (const s of [-1, 1]) box(throne, 0.3, 1.2, 1.6, M.gold, s * 1.35, 0.9, 0);
  // テラスへの石段（中庭から）
  const stairs = (R.stairs = group(root));
  // 丘のふちにそって、右へ下りる石段（線路はまたがない）
  for (let i = 0; i < 8; i++) {
    const h = HILL - (i * HILL) / 8;
    box(stairs, 0.7, h, 1.2, stone, 4.6 + i * 0.7, h / 2, -8.0);
  }
  // 夕食会のテーブル（最後にあらわれる）
  R.feast = group(ter, 0, 0.3, 0.9);
  R.feast.userData.dynamic = true;
  box(R.feast, 4.6, 0.12, 1.4, M.planks, 0, 0.8, 0);
  for (const sx of [-2.1, 2.1]) for (const sz of [-0.55, 0.55]) box(R.feast, 0.12, 0.8, 0.12, M.planks, sx, 0.4, sz);
  box(R.feast, 4.4, 0.04, 1.2, new THREE.MeshStandardMaterial({ color: '#f4ecf8' }), 0, 0.88, 0, { cast: false });
  add(R.feast, new THREE.CylinderGeometry(0.42, 0.32, 0.36, 12), new THREE.MeshStandardMaterial({ color: '#2a2a30' }), 0, 1.08, 0);
  add(R.feast, new THREE.CircleGeometry(0.38, 12), new THREE.MeshStandardMaterial({ color: '#e85a2a', emissive: '#c83a1a', emissiveIntensity: 0.6 }), 0, 1.27, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  for (let i = 0; i < 6; i++) add(R.feast, new THREE.CylinderGeometry(0.16, 0.12, 0.06, 10), new THREE.MeshStandardMaterial({ color: '#f4f4f8' }), -1.8 + i * 0.72, 0.92, (i % 2 ? 0.35 : -0.35), { cast: false });
  for (const x of [-1.4, 1.4]) { add(R.feast, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), new THREE.MeshStandardMaterial({ color: '#f4ecd0' }), x, 1.1, 0); add(R.feast, new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd870' }), x, 1.36, 0, { cast: false }); }
  R.feast.visible = false;
  // 飾りつけ（ゴーストがつるす旗）
  R.garland = group(ter, 0, 2.9, 1.6);
  R.garland.userData.dynamic = true;
  const gc = ['#e85a7a', '#f8d040', '#5ac8f0', '#b878ff', '#7ae87a'];
  for (let i = 0; i < 13; i++) {
    const x = -3.6 + i * 0.6, y = -Math.sin((i / 12) * Math.PI) * 0.5;
    add(R.garland, new THREE.ConeGeometry(0.18, 0.34, 3), new THREE.MeshStandardMaterial({ color: gc[i % 5], side: THREE.DoubleSide }), x, y - 0.12, 0, { rot: [Math.PI, 0, 0], cast: false });
  }
  R.garland.visible = false;

  // ---------------- 中庭 ----------------
  // こわれた噴水（水はなく、紫の苔）
  const ft = (R.fountain = group(root, 2.5, 0, 6.2));
  add(ft, new THREE.CylinderGeometry(2.0, 2.1, 0.55, 8), stone, 0, 0.275, 0);
  add(ft, new THREE.CylinderGeometry(1.75, 1.75, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#2a2438' }), 0, 0.56, 0, { cast: false });
  add(ft, new THREE.CylinderGeometry(0.35, 0.45, 1.3, 8), stone, 0, 0.95, 0);
  add(ft, new THREE.CylinderGeometry(0.85, 0.6, 0.25, 8), stone, 0.1, 1.65, 0, { rot: [0, 0, 0.25] });
  for (let i = 0; i < 4; i++) add(ft, new THREE.DodecahedronGeometry(0.25, 0), stone, Math.cos(i * 1.7) * 1.2, 0.68, Math.sin(i * 1.7) * 1.1, { rot: [i, i, 0] });
  // 紫の炎の燭台（中庭の四すみ）。ひとつだけ炎の消えたものがある
  for (const [x, z] of [[-5.0, 1.4], [10.0, 1.4], [-5.0, 11.4]]) brazier(R, root, x, z);
  R.darkBrazier = brazier(R, root, 8.0, 10.0, { dark: true });
  // 肖像画の回廊（中庭の奥、線路の手前）
  const gal = (R.gallery = group(root, 2.5, 0, -0.2));
  box(gal, 13.0, 0.3, 1.4, stone, 0, 0.15, 0);
  for (let i = 0; i < 6; i++) add(gal, new THREE.CylinderGeometry(0.16, 0.18, 2.8, 8), stone, -6 + i * 2.4, 1.7, -0.45);
  box(gal, 13.0, 0.3, 0.6, stone, 0, 3.15, -0.45);
  R.portraitKinds = ['brothers', 'fountain', 'kitchen', 'library', 'candle'];
  R.portraitKinds.forEach((k, i) => {
    const m = pixMat(portraitTex(k, false));
    const mesh = add(gal, new THREE.PlaneGeometry(1.4, 1.75), m, -4.8 + i * 2.4, 1.75, -0.35, { cast: false });
    R.portraits.push({ kind: k, mesh, plain: m, ghost: k === 'brothers' ? m : pixMat(portraitTex(k, true)) });
  });

  // ---------------- 図書室の塔（中の左手前） ----------------
  const lib = (R.library = group(root, -5.2, 0, 4.8));
  const libT = tower(lib, 0, 0, 0, 1.9, 5.6, roofP);
  void libT;
  add(lib, new THREE.PlaneGeometry(1.0, 1.6), M.door, 0, 0.8, 1.92, { cast: false });
  // 外から見える本棚（塔の前のアーチの中）
  const shelf = (R.shelf = group(lib, 1.95, 0, 0.6, Math.PI / 2 - 0.3));
  box(shelf, 1.8, 2.6, 0.4, pixMat(C.book()), 0, 1.3, 0);
  box(shelf, 1.9, 0.1, 0.45, M.wood, 0, 2.62, 0);
  R.saltJar = group(shelf, 0.5, 2.82, 0);
  R.saltJar.userData.dynamic = true;
  add(R.saltJar, new THREE.CylinderGeometry(0.14, 0.14, 0.3, 8), new THREE.MeshStandardMaterial({ color: '#c8d8ff', emissive: '#8ab0ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), 0, 0, 0, { cast: false });
  add(R.saltJar, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8), M.wood, 0, 0.18, 0, { cast: false });

  // ---------------- 魔女ネコの台所（中の左奥） ----------------
  const kit = (R.kitchen = group(root, -5.0, 0, 12.6));
  box(kit, 4.4, 0.2, 3.2, stone, 0, 0.1, 0);
  box(kit, 4.4, 2.6, 0.3, stone, 0, 1.4, -1.45);
  for (const s of [-1, 1]) box(kit, 0.3, 2.6, 3.2, stone, s * 2.05, 1.4, 0);
  // 屋根は奥だけ（上から大鍋と料理番が見えるように）
  box(kit, 4.9, 0.16, 1.6, roofP, 0, 2.95, -0.9, { rot: [-0.35, 0, 0] });
  // 大鍋（ぐつぐつ）
  R.cauldron = group(kit, -0.3, 0.2, 0.2);
  add(R.cauldron, new THREE.SphereGeometry(0.75, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), new THREE.MeshStandardMaterial({ color: '#1a1a22', roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), 0, 0.75, 0);
  R.soupMat = new THREE.MeshStandardMaterial({ color: '#5ac85a', emissive: '#2a8a2a', emissiveIntensity: 0.6 });
  add(R.cauldron, new THREE.CircleGeometry(0.62, 14), R.soupMat, 0, 1.1, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  R.cookFire = add(R.cauldron, new THREE.ConeGeometry(0.4, 0.4, 6), new THREE.MeshBasicMaterial({ color: '#ff8a2a' }), 0, 0.12, 0, { cast: false });
  R.cookFire.userData.keep = true;
  // 猫や壁に隠れない、台所の横の立て看板。文字はランタンの光で浮かぶ。
  const bb = (R.blackboard = group(kit, 3.2, 0, 0.9));
  for (const x of [-0.7, 0.7]) box(bb, 0.12, 1.2, 0.16, M.wood, x, 0.6, -0.04);
  box(bb, 2.0, 1.4, 0.08, new THREE.MeshStandardMaterial({ color: '#1a2a22' }), 0, 1.6, 0);
  box(bb, 2.14, 1.54, 0.1, M.wood, 0, 1.6, -0.06);
  R.recipeGlow = group(bb, 0, 0, 0.05);
  R.recipeGlow.userData.dynamic = true;
  ['ほのおのシチュー', ...RECIPE_CLUES].forEach((text, i) => {
    const line = add(R.recipeGlow, new THREE.PlaneGeometry(1.9, 0.28), new THREE.MeshBasicMaterial({ map: pixText(text, { w: 256, h: 40, size: 18, bg: '#1a2a22', fg: '#e8d8ff', border: '#1a2a22' }) }), 0, 2.1 - i * 0.32, 0, { cast: false });
    line.userData.noPick = true;
    line.userData.keep = true;
  });
  // 野菜かご
  box(kit, 0.6, 0.3, 0.45, M.planks, 1.4, 0.35, 0.8);

  // ---------------- 地下牢（中の右手前）：屋根のない、牢の区画 ----------------
  const dg = (R.dungeon = group(root, 11.2, 0, 4.6));
  box(dg, 5.0, 0.2, 3.6, floor, 0, 0.1, 0);
  for (const s of [-1, 1]) box(dg, 0.3, 1.6, 3.6, stone, s * 2.35, 0.9, 0);
  box(dg, 5.0, 1.6, 0.3, stone, 0, 0.9, -1.65);
  box(dg, 0.25, 1.6, 3.0, stone, 0, 0.9, -0.15);
  // 鉄格子（手前）
  for (let x = -2.1; x <= 2.11; x += 0.3) box(dg, 0.06, 1.5, 0.06, R.iron, x, 0.85, 1.7);
  box(dg, 4.6, 0.08, 0.08, R.iron, 0, 1.6, 1.7);
  // かげキノコ（暗いときだけ見える）
  R.mushroom = group(dg, -1.3, 0.2, -0.6);
  R.mushroom.userData.dynamic = true;
  for (const [x, z, s] of [[0, 0, 1], [0.3, 0.2, 0.7], [-0.25, 0.25, 0.6]]) {
    add(R.mushroom, new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.25 * s, 6), new THREE.MeshStandardMaterial({ color: '#d8d0e8' }), x, 0.12 * s, z, { cast: false });
    add(R.mushroom, new THREE.SphereGeometry(0.18 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3a2a5a', emissive: '#6a4aa8', emissiveIntensity: 0.5 }), x, 0.24 * s, z, { cast: false });
  }
  // わら・おけ
  box(dg, 1.4, 0.2, 1.0, M.hay, 1.2, 0.3, -0.6);

  // ---------------- 宝物庫（中の右奥）：正面が開いた小部屋 ----------------
  const tr = (R.treasury = group(root, 11.4, 0, 12.6));
  box(tr, 4.6, 0.25, 3.2, stone, 0, 0.125, 0);
  box(tr, 4.6, 2.6, 0.3, stone, 0, 1.4, -1.45);
  for (const s of [-1, 1]) box(tr, 0.3, 2.6, 3.2, stone, s * 2.15, 1.4, 0);
  box(tr, 5.1, 0.16, 1.6, roofP, 0, 2.95, -0.9, { rot: [-0.35, 0, 0] });
  // 金貨の山と、ふつうの宝箱
  for (let i = 0; i < 10; i++) add(tr, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8), M.gold, -1.5 + (i % 5) * 0.18, 0.28 + Math.floor(i / 5) * 0.05, -0.8 + (i % 3) * 0.1, { cast: false });
  chest(tr, 1.4, -0.7, -0.3);

  // ---------------- 溶岩の谷と跳ね橋（右） ----------------
  R.lavaTex = C.lava().clone();
  R.lavaTex.repeat.set(0.5, 0.5);
  R.lavaTex.needsUpdate = true;
  R.lavaMat = new THREE.MeshStandardMaterial({ map: R.lavaTex, emissive: '#ffffff', emissiveMap: R.lavaTex, emissiveIntensity: 1.1, roughness: 0.6 });
  plane(root, 2.8, 32.6, R.lavaMat, 18.4, 0.03, 0);
  for (const x of [16.95, 19.85]) box(root, 0.3, 0.3, 32.6, stone, x, 0.1, 0);
  R.lavaLight = new THREE.PointLight('#ff6a2a', 3, 12, 1.4);
  R.lavaLight.position.set(18.4, 1.2, 4);
  root.add(R.lavaLight);
  // 溶岩トマト（谷のふちに生えている）
  R.tomato = group(root, 16.2, 0, 10.2);
  R.tomato.userData.dynamic = true;
  add(R.tomato, new THREE.CylinderGeometry(0.03, 0.04, 0.7, 5), new THREE.MeshStandardMaterial({ color: '#3a6a2a' }), 0, 0.35, 0);
  for (const [x, y] of [[0.15, 0.55], [-0.12, 0.42]]) add(R.tomato, new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: '#f04a1a', emissive: '#c82a0a', emissiveIntensity: 0.5 }), x, y, 0, { cast: false });
  add(R.tomato, new THREE.ConeGeometry(0.22, 0.3, 5), new THREE.MeshStandardMaterial({ color: '#4a8a3a', flatShading: true }), 0, 0.75, 0);
  // 跳ね橋（上がっていると立っている）
  R.drawbridge = group(root, 17.0, 0.18, TRACK_Z);
  R.drawbridge.userData.dynamic = true;
  box(R.drawbridge, 2.9, 0.18, 2.6, M.planks, 1.45, 0, 0);
  for (const s of [-1, 1]) box(R.drawbridge, 2.9, 0.12, 0.1, new THREE.MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.7, roughness: 0.35 }), 1.45, 0.15, s * 0.55, { cast: false });
  R.chains = [];
  for (const s of [-1, 1]) {
    const c = add(root, new THREE.CylinderGeometry(0.04, 0.04, 1, 5), R.iron, 0, 0, 0, { cast: false });
    c.userData.dynamic = true;
    R.chains.push({ m: c, s });
  }
  for (const s of [-1, 1]) tower(root, 16.3, 0, TRACK_Z + s * 2.3, 0.8, 3.6, roofP);

  // 紫の炎の光だまり
  R.pools = [[-5.0, 1.4], [10.0, 1.4], [-5.0, 11.4]].map(([x, z]) => lightPool(root, x, 0.03, z, 3.0, 3.0, '#b878ff'));
  R.flameLights = [[-5.0, 1.4], [10.0, 1.4], [-5.0, 11.4]].map(([x, z]) => { const L = new THREE.PointLight('#b878ff', 2.2, 7, 1.6); L.position.set(x, 2.2, z); root.add(L); return L; });
  void crestTex;
  return R;
}
