import * as THREE from 'three';
import { waterize, sway } from '../../lib/livefx.js';
import { add, mat, glow, G, group, rng, canvasTex, roundRectShape, FONT } from '../../lib/util.js';
import { dome } from '../../lib/creatures-kinoko.js';
import { grassTex } from '../station/textures.js';

// ---------------------------------------------------------------
// 巨大キノコの森の箱庭（虫の目線の、雨上がりの森の地面）
// 島は x[-15,15] z[-11,11]、線路は z=-6、ホーム上面 y=0.75
// カエルの機関士（高さ約1.4）を物差しに、キノコは家ほど、5円玉は車輪ほどの大きさ。
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
const FLOOR = 0.75;

// 宝さがしの地図（アリの単位）。1マス＝アリ1ぴき＝0.5
export const MAP = { cols: 12, rows: 10, x0: -9.75, z0: 3.6, cell: 0.5, stump: [1, 9], answer: [9, 3] };
export const cellPos = (c, r) => new THREE.Vector3(MAP.x0 + (c + 0.5) * MAP.cell, 0, MAP.z0 + (r + 0.5) * MAP.cell);

// ---------------- テクスチャ ----------------
const floorTex = () => canvasTex(512, 512, (ctx, w, h) => {
  const r = rng(81);
  ctx.fillStyle = '#5e7a44'; ctx.fillRect(0, 0, w, h);
  // こけのむら
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(130,170,80,${0.18 + r() * 0.2})` : `rgba(70,60,40,${0.12 + r() * 0.15})`;
    ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, Math.PI * 2); ctx.fill();
  }
  // 落ち葉のかけら・小石
  for (let i = 0; i < 700; i++) {
    const c = r();
    ctx.fillStyle = c > 0.7 ? `rgba(200,180,120,${0.3 + r() * 0.3})` : c > 0.4 ? `rgba(160,200,110,${0.2 + r() * 0.3})` : `rgba(40,50,30,${0.2 + r() * 0.2})`;
    ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 5);
  }
}, { repeat: [6, 4] });

const soilTex = (repeat = [3, 3]) => canvasTex(256, 256, (ctx, w, h) => {
  const r = rng(82);
  ctx.fillStyle = '#6a4a32'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(140,100,70,${0.2 + r() * 0.3})` : `rgba(40,26,18,${0.2 + r() * 0.3})`;
    ctx.beginPath(); ctx.arc(r() * w, r() * h, 1 + r() * 3, 0, Math.PI * 2); ctx.fill();
  }
}, { repeat });

const barkTex = (repeat = [2, 1]) => canvasTex(256, 256, (ctx, w, h) => {
  const r = rng(83);
  ctx.fillStyle = '#7a5a3e'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {
    const x = r() * w;
    ctx.strokeStyle = `rgba(50,32,20,${0.4 + r() * 0.4})`; ctx.lineWidth = 2 + r() * 4;
    ctx.beginPath(); ctx.moveTo(x, 0);
    for (let y = 0; y <= h; y += 16) ctx.lineTo(x + Math.sin(y * 0.05 + i) * 6, y);
    ctx.stroke();
  }
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(160,130,90,${r() * 0.3})`; ctx.fillRect(r() * w, r() * h, 2, 6); }
}, { repeat });

let _gill = null;
const gillTex = () => _gill || (_gill = canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#e8d8bc'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(150,120,90,0.55)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * 20, h / 2 + Math.sin(a) * 20); ctx.lineTo(w / 2 + Math.cos(a) * 128, h / 2 + Math.sin(a) * 128); ctx.stroke();
  }
  ctx.fillStyle = '#d8c8a8'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 22, 0, Math.PI * 2); ctx.fill();
}));

const leafTex = (base = '#6aa84a', vein = '#cfe8a0') => canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = vein; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2, 0); ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    const y = h - (i * h) / 8;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.quadraticCurveTo(w / 2 + s * w * 0.2, y - 10, w / 2 + s * w * 0.48, y - 34); ctx.stroke(); }
  }
});

const coinTex = (text, base, ink, sub) => canvasTex(256, 256, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w * 0.6);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, base); g.addColorStop(1, base);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 92px ${FONT}`; ctx.fillText(text, w / 2, h / 2 + 4);
  if (sub) { ctx.font = `700 26px ${FONT}`; ctx.fillText(sub, w / 2, h * 0.78); }
});

// ---------------- 部品 ----------------
/** キノコ（柄・かさ・ひだ・水玉） */
export function mushroom(parent, x, z, { h = 4, r = 2, cap = '#c8583a', stem = '#efe4cc', spots = null, tilt = 0, ry = 0, flat = 0.55, glowCol = null, seed = 1 } = {}) {
  const g = group(parent, x, 0, z, ry);
  g.rotation.z = tilt;
  const sr = r * 0.2;
  add(g, G.cyl(sr, sr * 1.45, h, 18), mat(stem, { roughness: 0.9 }), 0, h / 2, 0);
  add(g, G.sphere(sr * 1.5, 16, 10), mat(stem, { roughness: 0.9 }), 0, 0.05, 0, { scale: [1, 0.4, 1] });
  const capM = glowCol ? glow(cap, 0.25, { roughness: 0.5, emissive: glowCol }) : mat(cap, { roughness: 0.55 });
  const c = add(g, dome(r, 32), capM, 0, h - 0.02, 0, { scale: [1, flat, 1] });
  add(g, G.circle(r * 0.99, 32), new THREE.MeshStandardMaterial({ map: gillTex(), roughness: 1, side: THREE.DoubleSide }), 0, h - 0.01, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  if (spots) {
    const rr = rng(seed);
    const sm = mat(spots, { roughness: 0.7 });
    const n = Math.round(6 + r * 3);
    for (let i = 0; i < n; i++) {
      const a = rr() * Math.PI * 2, ph = 0.25 + rr() * 1.1;
      const px = Math.sin(ph) * Math.cos(a) * r, pz = Math.sin(ph) * Math.sin(a) * r, py = Math.cos(ph) * r * flat;
      const d = add(g, G.sphere(r * (0.08 + rr() * 0.06), 10, 8), sm, px, h + py - 0.02, pz, { scale: [1, 0.3, 1], cast: false });
      d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(px, py / (flat * flat), pz).normalize());
    }
  }
  return { g, cap: c, capM, top: h + r * flat };
}

/** 背の高い草の葉（虫から見ると大木） */
function blade(parent, x, z, h, { lean = 0.6, w = 0.45, ry = 0, color = '#5f9a3e' } = {}) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.quadraticCurveTo(-w * 0.35, h * 0.55, lean, h);
  s.quadraticCurveTo(w * 0.3, h * 0.5, w / 2, 0);
  const m = sway(new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide }), { amp: 0.06, speed: 0.8 });
  return add(parent, new THREE.ShapeGeometry(s, 8), m, x, 0, z, { rot: [0, ry, 0] });
}

/** 大きな葉っぱ（茎の先に、ななめに広がる） */
function bigLeaf(parent, x, z, { h = 2, len = 2.4, wid = 1.4, ry = 0, tilt = 0.5, color = '#6aa84a' } = {}) {
  const g = group(parent, x, 0, z, ry);
  add(g, G.cyl(0.05, 0.08, h, 8), mat('#4f8a3a'), 0, h / 2, 0);
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(wid * 0.6, len * 0.15, wid * 0.55, len * 0.75, 0, len);
  s.bezierCurveTo(-wid * 0.55, len * 0.75, -wid * 0.6, len * 0.15, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 10);
  // UV を葉の形にあわせる
  const uv = geo.attributes.uv, p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / wid + 0.5, p.getY(i) / len);
  const leafM = new THREE.MeshStandardMaterial({ map: leafTex(color), roughness: 0.6, side: THREE.DoubleSide });
  const lf = add(g, geo, leafM, 0, h, 0, { rot: [-Math.PI / 2 + tilt, 0, 0] });
  return { g, leaf: lf, tip: new THREE.Vector3(0, h + Math.sin(tilt) * len * 0.6, -Math.cos(tilt) * len * 0.6) };
}

/** 雨のしずく（すきとおった玉） */
const dropMat = () => new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.42, emissive: '#6ab8e8', emissiveIntensity: 0.12, depthWrite: false });
export function dewdrop(parent, x, y, z, r, m = dropMat()) {
  const g = group(parent, x, y, z);
  add(g, G.sphere(r, 20, 14), m, 0, r * 0.85, 0, { scale: [1, 0.85, 1], cast: false });
  add(g, G.sphere(r * 0.22, 8, 6), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.9 }), -r * 0.35, r * 1.25, r * 0.45, { cast: false });
  g.traverse((o) => { o.userData.noPick = true; });
  return g;
}

function pebble(parent, x, z, s, seed, color = '#9a9488') {
  const m = add(parent, G.dodeca(s), mat(color, { flatShading: true, roughness: 1 }), x, s * 0.35, z, { rot: [seed, seed * 2, seed * 3], scale: [1, 0.6, 0.9] });
  return m;
}

function acorn(parent, x, z, ry = 0, lying = true) {
  const g = group(parent, x, 0, z, ry);
  const body = group(g, 0, lying ? 0.5 : 0, 0);
  if (lying) body.rotation.z = Math.PI / 2 - 0.2;
  add(body, G.sphere(0.48, 18, 14), mat('#a8683a', { roughness: 0.35 }), 0, 0.6, 0, { scale: [1, 1.35, 1] });
  add(body, dome(0.52, 18), mat('#7a5a32', { roughness: 1 }), 0, 0.95, 0, { scale: [1, 0.55, 1] });
  add(body, G.cyl(0.05, 0.07, 0.25, 6), mat('#5a3a1a'), 0, 1.3, 0);
  return g;
}

export function buildKinokoDiorama(scene) {
  const root = group(scene);
  const R = { root, glowMats: [], drips: [] };
  const r = rng(77);

  // ---------------- 地面 ----------------
  const floor = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(29.6, 21.6, 2.4), 12), floor, 0, 0.002, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // 土の小道
  const path = new THREE.MeshStandardMaterial({ map: soilTex([6, 1]), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, transparent: true, opacity: 0.85 });
  add(root, new THREE.ShapeGeometry(roundRectShape(22, 1.6, 0.8), 8), path, 1.0, 0.01, -1.6, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(root, new THREE.ShapeGeometry(roundRectShape(1.6, 7.5, 0.8), 8), path, -2.2, 0.011, 2.0, { rot: [-Math.PI / 2, 0, 0], cast: false });

  // ---------------- ホーム（木の皮の板） ----------------
  const bark = new THREE.MeshStandardMaterial({ map: barkTex([5, 1]), roughness: 0.95 });
  add(root, G.box(10, FLOOR, 2.35), bark, -8, FLOOR / 2, -3.78);
  add(root, G.box(10.1, 0.06, 0.3), mat('#d8c8a0'), -8, FLOOR + 0.03, -4.8);
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, FLOOR * (3 - i) / 3, 0.35), bark, -4.3, FLOOR * (3 - i) / 6, -2.42 + i * 0.35);
  // 駅名標（細いキノコの柄に板）
  const sign = (R.stationSign = group(root, -7.2, FLOOR, -4.45));
  for (const s of [-1, 1]) add(sign, G.cyl(0.07, 0.09, 1.9, 8), mat('#efe4cc'), s * 1.0, 0.95, 0);
  add(sign, G.box(2.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#3a2a1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 64px ${FONT}`; ctx.fillText('きのこのもり', w / 2, h * 0.42);
    ctx.font = `700 26px ${FONT}`; ctx.fillText('← ゆげのさと　　　からくりのまち →', w / 2, h * 0.8);
  }), roughness: 0.8 }), 0, 1.6, 0);
  sign.children.forEach((m) => { m.castShadow = true; });
  // ペットボトルのふた（ホームのいす）
  const capStool = group(root, -10.6, FLOOR, -3.4);
  add(capStool, G.cyl(0.5, 0.5, 0.6, 28), mat('#e84a3a', { roughness: 0.4 }), 0, 0.3, 0);
  add(capStool, G.torus(0.5, 0.03, 6, 28), mat('#c83a2a'), 0, 0.02, 0, { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; add(capStool, G.box(0.03, 0.5, 0.04), mat('#c83a2a'), Math.cos(a) * 0.5, 0.3, Math.sin(a) * 0.5, { rot: [0, -a, 0], cast: false }); }
  R.capStool = capStool;

  // ---------------- 線路の奥：巨大なキノコと草の森 ----------------
  const back = [
    [-13.2, -9.2, 7.5, 3.2, '#b8683a', null, 0.08], [-7.5, -9.8, 9.5, 3.8, '#d8b890', '#fff4e0', -0.05], [-1.0, -9.0, 6.5, 2.6, '#c84a3a', '#fff8ee', 0.06],
    [4.8, -9.6, 8.5, 3.4, '#a87a4a', null, -0.04], [10.6, -9.2, 7.0, 3.0, '#d86a3a', '#ffe8c8', 0.05], [1.8, -10.2, 4.5, 1.8, '#e8c8a0', null, 0.1],
  ];
  back.forEach(([x, z, h, rr, c, sp, t], i) => {
    const m = mushroom(root, x, z, { h, r: rr, cap: c, spots: sp, tilt: t, seed: 10 + i });
    R.drips.push(new THREE.Vector3(x + rr * 0.8, h - 0.2, z + rr * 0.3));
  });
  for (let i = 0; i < 26; i++) {
    const x = -14 + i * 1.12 + r() * 0.6, z = -10.4 + r() * 1.6;
    blade(root, x, z, 3 + r() * 4, { lean: (r() - 0.5) * 2.2, w: 0.35 + r() * 0.3, ry: r() * 3, color: r() > 0.5 ? '#5f9a3e' : '#7aae4a' });
  }
  // 鉛筆（遠いむかしの巨人の落とし物）：線路の奥に横たわる丸太
  const pencil = (R.pencil = group(root, -8.0, 0.55, -8.2, 0.08));
  add(pencil, G.cyl(0.55, 0.55, 8.4, 6), mat('#f0c040', { roughness: 0.5 }), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  add(pencil, G.cone(0.55, 1.5, 6), mat('#e8c89a', { roughness: 0.9 }), 4.95, 0, 0, { rot: [0, 0, -Math.PI / 2] });
  add(pencil, G.cone(0.18, 0.5, 6), mat('#3a3a40', { roughness: 0.4 }), 5.5, 0, 0, { rot: [0, 0, -Math.PI / 2] });
  add(pencil, G.cyl(0.58, 0.58, 0.6, 16), mat('#c8c8b8', { metalness: 0.6, roughness: 0.35 }), -4.5, 0, 0, { rot: [0, 0, Math.PI / 2] });
  add(pencil, G.cyl(0.55, 0.55, 0.7, 16), mat('#f09aa0', { roughness: 0.8 }), -5.15, 0, 0, { rot: [0, 0, Math.PI / 2] });

  // ---------------- 長老のキノコの家 ----------------
  const house = (R.elderHouse = group(root, -11.8, 0, 0.8));
  const hm = mushroom(house, 0, 0, { h: 5.2, r: 2.6, cap: '#c8402e', spots: '#fff8ee', seed: 3 });
  void hm;
  // 柄のとびらと窓
  add(house, G.cyl(0.42, 0.42, 0.08, 20, false), mat('#7a4a2a'), 0, 0.65, 0.62, { rot: [Math.PI / 2 - 0.12, 0, 0], scale: [1, 1, 1.5] });
  add(house, G.sphere(0.05), mat('#e8c25a', { metalness: 0.6, roughness: 0.3 }), 0.22, 0.65, 0.7);
  const winM = glow('#ffd890', 0.9);
  R.glowMats.push(winM);
  for (const [y, a] of [[2.4, 0.4], [3.6, -0.5]]) add(house, G.circle(0.24, 16), winM, Math.sin(a) * 0.72, y, Math.cos(a) * 0.72, { rot: [0, a, 0], cast: false });
  add(house, G.box(0.9, 0.08, 0.5), mat('#7a5232'), 0, 0.04, 1.0);

  // ---------------- 胞子のキノコ（赤＝大きく、青＝小さく） ----------------
  const red = (R.redShroom = group(root, -1.6, 0, 1.3));
  const redM = mushroom(red, 0, 0, { h: 1.6, r: 0.95, cap: '#e8402e', spots: '#fff8ee', glowCol: '#ff6a4a', seed: 41, flat: 0.7 });
  R.redCapM = redM.capM; R.redTop = new THREE.Vector3(-1.6, redM.top, 1.3);
  const blue = (R.blueShroom = group(root, 1.0, 0, 0.6));
  const blueM = mushroom(blue, 0, 0, { h: 1.3, r: 0.85, cap: '#3a7ae8', spots: '#e8f4ff', glowCol: '#5aa0ff', seed: 42, flat: 0.7 });
  R.blueCapM = blueM.capM; R.blueTop = new THREE.Vector3(1.0, blueM.top, 0.6);
  // 立て札（赤は「おおきく」、青は「ちいさく」）
  const sizeSign = (txt, col) => new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 54px ${FONT}`; ctx.fillText(txt, w / 2, h / 2 + 2);
  }), roughness: 0.8 });
  for (const [p, txt, col, ry] of [[[-2.7, 2.1], 'おおきく', '#c83a2a', 0.3], [[2.0, 1.5], 'ちいさく', '#2a5ac8', -0.3]]) {
    const sg = group(root, p[0], 0, p[1], ry);
    add(sg, G.cyl(0.04, 0.05, 0.8, 6), mat('#7a5232'), 0, 0.4, 0);
    add(sg, G.box(0.7, 0.35, 0.04), sizeSign(txt, col), 0, 0.82, 0);
  }

  // ---------------- 光るキノコ（道しるべ） ----------------
  const lampM = glow('#8af0d0', 0.9, { roughness: 0.4 });
  R.glowMats.push(lampM);
  for (const [x, z, s] of [[-3.2, -0.4, 1], [0.6, -0.5, 0.8], [4.4, -0.6, 1], [-5.8, 3.0, 0.9], [8.6, 1.8, 0.8], [-13.4, 3.6, 1.1], [13.6, 0.4, 0.9], [-0.4, 9.6, 0.8], [12.4, 9.6, 1]]) {
    const g = group(root, x, 0, z);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + x, d = i ? 0.22 : 0;
      add(g, G.cyl(0.03 * s, 0.045 * s, (0.5 - i * 0.12) * s, 6), mat('#e8f4ec'), Math.cos(a) * d, (0.25 - i * 0.06) * s, Math.sin(a) * d);
      add(g, dome((0.16 - i * 0.03) * s, 14), lampM, Math.cos(a) * d, (0.5 - i * 0.12) * s, Math.sin(a) * d, { scale: [1, 0.6, 1], cast: false });
    }
  }

  // ---------------- カタツムリの郵便車とポスト ----------------
  const cart = (R.cart = group(root, -6.6, 0, 1.9, -0.2));
  const wood = mat('#a8784a');
  add(cart, G.box(1.5, 0.5, 0.9), wood, 0, 0.75, 0);
  add(cart, G.box(1.6, 0.08, 1.0), mat('#8a5a32'), 0, 1.02, 0);
  for (let i = 0; i < 5; i++) add(cart, G.box(0.42, 0.04, 0.3), mat(i % 2 ? '#f4ead2' : '#fff8ee'), -0.45 + i * 0.22, 1.08 + i * 0.05, (i % 2 - 0.5) * 0.2, { rot: [0, i * 0.3, 0], cast: false });
  add(cart, G.cyl(0.03, 0.03, 1.3, 6), mat('#5a3a1a'), -0.45, 0.42, 0, { rot: [Math.PI / 2, 0, 0] });
  add(cart, G.cyl(0.03, 0.03, 1.3, 6), mat('#5a3a1a'), 0.45, 0.42, 0, { rot: [Math.PI / 2, 0, 0] });
  // 車輪：うしろの2つは、どんぐりのぼうし。前の右がひとつ足りない
  const wheel = (x, z) => {
    const w = group(cart, x, 0.42, z);
    add(w, G.cyl(0.38, 0.38, 0.12, 20), mat('#8a6a3a', { roughness: 1 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
    add(w, G.cyl(0.1, 0.1, 0.16, 10), mat('#5a3a1a'), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
    return w;
  };
  wheel(-0.45, 0.62); wheel(-0.45, -0.62); wheel(0.45, -0.62);
  // 足りない車輪の場所に、あとで5円玉がはまる
  const goenWheel = (R.goenWheel = group(cart, 0.45, 0.42, 0.64));
  goenWheel.userData.dynamic = true;
  goenWheel.visible = false;
  add(cart, G.box(0.4, 0.08, 0.08), mat('#5a3a1a'), 0.95, 0.75, 0, { rot: [0, 0, -0.3] });
  // ペンのキャップのポスト
  const post = (R.post = group(root, -9.4, 0, 2.6));
  add(post, G.cyl(0.42, 0.45, 2.2, 20), mat('#2a5ac8', { roughness: 0.35 }), 0, 1.1, 0);
  add(post, G.sphere(0.42, 20, 10), mat('#2a5ac8', { roughness: 0.35 }), 0, 2.2, 0, { scale: [1, 0.35, 1] });
  add(post, G.box(0.12, 1.4, 0.1), mat('#c8d0e0', { metalness: 0.6, roughness: 0.3 }), 0, 1.4, 0.47);
  add(post, G.box(0.36, 0.06, 0.04), mat('#1a2a5a'), 0, 1.0, -0.43);
  add(post, G.box(0.5, 0.25, 0.04), new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c83a2a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 34px ${FONT}`; ctx.fillText('〒 ポスト', w / 2, h / 2 + 2);
  }) }), 0, 1.65, -0.45, { rot: [0, Math.PI, 0] });
  // 消しゴムのベンチ
  const eraser = (R.eraser = group(root, -2.6, 0, 10.0, -0.25));
  add(eraser, G.box(2.2, 0.75, 1.0), mat('#f8f6f0', { roughness: 0.9 }), 0, 0.375, 0);
  add(eraser, G.box(1.3, 0.78, 1.04), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a6ac8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, h * 0.3, w, h * 0.4);
    ctx.fillStyle = '#2a2a3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 36px ${FONT}`; ctx.fillText('MONO?', w / 2, h / 2 + 2);
  }), roughness: 0.8 }), 0.35, 0.38, 0);

  // ---------------- 宝さがしの広場（ふかふかの土）と切り株 ----------------
  const fw = MAP.cols * MAP.cell, fd = MAP.rows * MAP.cell;
  const fx = MAP.x0 + fw / 2, fz = MAP.z0 + fd / 2;
  const fieldM = new THREE.MeshStandardMaterial({ map: soilTex([3, 2.5]), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const field = (R.field = group(root, fx, 0, fz));
  add(field, new THREE.ShapeGeometry(roundRectShape(fw + 0.6, fd + 0.6, 1.2), 10), fieldM, 0, 0.02, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // 切り株（地図の出発点）
  const sp = cellPos(...MAP.stump);
  const stump = (R.stump = group(root, sp.x, 0, sp.z));
  add(stump, G.cyl(0.42, 0.5, 0.42, 18), new THREE.MeshStandardMaterial({ map: barkTex([2, 1]), roughness: 1 }), 0, 0.21, 0);
  add(stump, G.cyl(0.4, 0.4, 0.02, 18), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8c890'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(140,90,50,0.6)'; ctx.lineWidth = 2;
    for (let i = 1; i < 9; i++) { ctx.beginPath(); ctx.arc(w / 2, h / 2, i * 7, 0, Math.PI * 2); ctx.stroke(); }
  }), roughness: 1 }), 0, 0.43, 0);
  // 掘った穴と指ぬき（はじめは見えない）
  const ap = cellPos(...MAP.answer);
  const hole = (R.digHole = group(root, ap.x, 0, ap.z));
  hole.userData.dynamic = true;
  add(hole, G.circle(0.5, 20), mat('#2a1a10', { roughness: 1 }), 0, 0.03, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(hole, G.torus(0.55, 0.14, 8, 20), mat('#6a4a32', { roughness: 1 }), 0, 0.04, 0, { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.6] });
  hole.visible = false;
  // 指ぬき（地面から掘り出したあと、そばに置かれる）
  const thim = (R.thimble = group(root, ap.x + 0.9, 0, ap.z + 0.3));
  thim.userData.dynamic = true;
  const tPts = [];
  for (let i = 0; i <= 12; i++) { const k = i / 12; tPts.push(new THREE.Vector2(0.42 - Math.pow(k, 3) * 0.12 + (k > 0.92 ? -Math.pow((k - 0.92) / 0.08, 2) * 0.3 : 0), k * 0.85)); }
  const dimple = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d8dce4'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(80,90,110,0.55)';
    for (let y = 6; y < h; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < w; x += 10) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
  }, { repeat: [4, 2] });
  add(thim, new THREE.LatheGeometry(tPts, 24), new THREE.MeshStandardMaterial({ map: dimple, metalness: 0.3, roughness: 0.35, side: THREE.DoubleSide }), 0, 0, 0, { rot: [Math.PI, 0, 0] });
  thim.children[0].position.y = 0.85;
  R.thimbleWater = add(thim, G.circle(0.38, 20), waterize(new THREE.MeshStandardMaterial({ color: '#9ad8f0', roughness: 0.05, transparent: true, opacity: 0.8 })), 0, 0.82, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  R.thimbleWater.visible = false;
  thim.visible = false;

  // ---------------- 5円玉（ぬかるみに半分うまっている） ----------------
  const mud = (R.mud = group(root, -1.0, 0, 8.2));
  add(mud, G.circle(1.3, 24), waterize(new THREE.MeshStandardMaterial({ color: '#5a4430', roughness: 0.2, polygonOffset: true, polygonOffsetFactor: -3 })), 0, 0.025, 0, { rot: [-Math.PI / 2, 0, 0], cast: false, scale: [1.2, 1, 1] });
  const goenShape = new THREE.Shape();
  goenShape.absarc(0, 0, 0.8, 0, Math.PI * 2);
  const holeP = new THREE.Path(); holeP.absarc(0, 0, 0.18, 0, Math.PI * 2, true); goenShape.holes.push(holeP);
  const goenGeo = new THREE.ExtrudeGeometry(goenShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 32 });
  goenGeo.translate(0, 0, -0.05);
  R.goenGeo = goenGeo;
  R.goenMat = mat('#e8b84a', { metalness: 0.35, roughness: 0.3, emissive: '#3a2a08', emissiveIntensity: 0.4 });
  const goen = (R.goen = group(mud, 0.1, 0.0, 0.0, 0.5));
  goen.userData.dynamic = true;
  const gm = add(goen, goenGeo, R.goenMat, 0, 0, 0);
  void gm;
  // 稲穂のもよう（かんたんに）
  for (let i = 0; i < 7; i++) add(goen, G.box(0.04, 0.14, 0.03), mat('#a8782a', { metalness: 0.3, roughness: 0.4 }), -0.45 + i * 0.15, -0.42, 0.075, { rot: [0, 0, 0.3], cast: false });
  goen.position.y = 0.22; // 下半分は泥の中
  goen.rotation.x = -0.12;

  // ---------------- あまつゆ草と、しずくの葉 ----------------
  const flower = (R.flower = group(root, -12.6, 0, 7.0));
  add(flower, G.cyl(0.06, 0.09, 1.6, 8), mat('#5a8a3a'), 0, 0.8, 0);
  const bud = (R.bud = group(flower, 0, 1.6, 0));
  bud.userData.dynamic = true;
  bud.rotation.z = 1.0; // しおれて、うなだれている
  add(bud, G.cyl(0.04, 0.06, 0.5, 6), mat('#6a8a4a'), 0.0, 0.25, 0);
  add(bud, G.sphere(0.24, 14, 10), mat('#a898b0', { roughness: 0.9 }), 0, 0.62, 0, { scale: [0.8, 1.2, 0.8] });
  const bloom = (R.bloom = group(flower, 0, 1.6, 0));
  bloom.userData.dynamic = true;
  bloom.visible = false;
  const petM = mat('#ff9ab8', { roughness: 0.5 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(bloom, G.sphere(0.32, 14, 10), petM, Math.cos(a) * 0.32, 0.3, Math.sin(a) * 0.32, { scale: [1, 0.25, 0.6], rot: [0, -a, 0.35] }); }
  R.nectarMat = glow('#ffd84a', 1.2);
  add(bloom, G.sphere(0.17, 14, 10), R.nectarMat, 0, 0.36, 0);
  for (const [x, z, ry] of [[0.4, 0.2, 0.6], [-0.3, -0.3, 2.4]]) bigLeaf(flower, x, z, { h: 0.2, len: 0.8, wid: 0.45, ry, tilt: 1.1, color: '#6a9a4a' });
  // しずくの葉（高いところ。大きくなれば届く）
  const dl = bigLeaf(root, -11.0, 5.0, { h: 2.9, len: 2.2, wid: 1.6, ry: 0.5, tilt: 0.45, color: '#5fa04a' });
  R.dewLeaf = dl.g;
  const tip = dl.g.localToWorld(dl.tip.clone());
  R.dewTip = tip;
  R.dewDrop = dewdrop(root, tip.x, tip.y - 0.05, tip.z, 0.32);
  R.dewDrop.userData.dynamic = true;
  for (const [dx, dz, rr] of [[0.35, -0.3, 0.14], [-0.3, 0.2, 0.1]]) dewdrop(root, tip.x + dx, tip.y + 0.06, tip.z + dz, rr);

  // ---------------- 小川と100円玉の橋 ----------------
  const rill = (R.rill = group(root, 3.6, 0, 4.0));
  const rillM = waterize(new THREE.MeshStandardMaterial({ color: '#8ac8d8', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -3 }), { strength: 0.5 });
  add(rill, new THREE.ShapeGeometry(roundRectShape(1.2, 13.6, 0.55), 8), rillM, 0, 0.03, 0.4, { rot: [-Math.PI / 2, 0, 0], cast: false });
  for (let i = 0; i < 26; i++) {
    const s = i % 2 ? 1 : -1;
    pebble(rill, s * (0.7 + r() * 0.2), -6.2 + i * 0.52, 0.12 + r() * 0.12, i, r() > 0.5 ? '#a8a296' : '#8a8478');
  }
  const coin = (R.coin100 = group(root, 3.6, 0.08, 4.6, 0.25));
  const coinFace = new THREE.MeshStandardMaterial({ map: coinTex('100', '#d8dce4', '#6a7080', '桜'), metalness: 0.35, roughness: 0.3 });
  const coinSide = mat('#b8bcc4', { metalness: 0.35, roughness: 0.35 });
  add(coin, new THREE.CylinderGeometry(0.85, 0.85, 0.1, 40), [coinSide, coinFace, coinFace], 0, 0, 0);
  add(coin, G.box(0.25, 0.08, 0.6), mat('#8a7a5a'), -0.95, -0.05, 0, { cast: false });
  add(coin, G.box(0.25, 0.08, 0.6), mat('#8a7a5a'), 0.95, -0.05, 0, { cast: false });

  // ---------------- アリの巣と、小さな立て札 ----------------
  const nest = (R.nest = group(root, 7.2, 0, 0.0));
  add(nest, G.sphere(1.6, 24, 12), new THREE.MeshStandardMaterial({ map: soilTex([2, 1]), roughness: 1 }), 0, -0.2, 0, { scale: [1, 0.55, 0.9] });
  add(nest, G.circle(0.3, 16), mat('#1a100a'), 0, 0.42, 1.3, { rot: [-0.55, 0, 0], scale: [1, 0.8, 1], cast: false });
  add(nest, G.torus(0.32, 0.07, 6, 16), mat('#6a4a32', { roughness: 1 }), 0, 0.42, 1.28, { rot: [-0.55, 0, 0], scale: [1, 0.8, 1] });
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2; add(nest, G.sphere(0.05 + r() * 0.05, 6, 4), mat('#8a6a4a'), Math.cos(a) * 1.3 * r(), 0.55 + r() * 0.15, Math.sin(a) * 1.1 * r(), { cast: false }); }
  const tiny = (R.antSign = group(root, 8.4, 0, 1.55, -0.35));
  add(tiny, G.cyl(0.02, 0.025, 0.42, 5), mat('#7a5232'), 0, 0.21, 0);
  R.antSignBoard = add(tiny, G.box(0.36, 0.22, 0.02), new THREE.MeshStandardMaterial({ map: canvasTex(128, 80, (ctx, w, h) => {
    // 遠目には読めない、ごく小さな字
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = '#3a2a1e';
    for (let y = 14; y < h - 8; y += 12) for (let x = 10; x < w - 10; x += 7) if ((x * y) % 5) ctx.fillRect(x, y, 4, 5);
  }), roughness: 0.8 }), 0, 0.46, 0);
  // ビスケットのかけら（アリたちが運んでいる）
  const crumb = (R.crumb = group(root, 10.4, 0, 4.2, 0.4));
  add(crumb, G.box(1.3, 0.35, 1.0), mat('#e0b070', { roughness: 0.9 }), 0, 0.18, 0, { rot: [0, 0, 0.08] });
  for (let i = 0; i < 6; i++) add(crumb, G.cyl(0.05, 0.05, 0.05, 6), mat('#a8783a'), -0.45 + (i % 3) * 0.45, 0.37, -0.25 + Math.floor(i / 3) * 0.5, { cast: false });

  // ---------------- テントウムシの子どもたちと、ボタンのテーブル ----------------
  const btn = (R.button = group(root, 6.4, 0, 7.0));
  const bt = group(btn, 0, 0.55, 0);
  add(bt, G.cyl(0.75, 0.75, 0.14, 32), mat('#7ab8e8', { roughness: 0.35 }), 0, 0, 0);
  add(bt, G.torus(0.68, 0.05, 6, 32), mat('#5a98c8', { roughness: 0.35 }), 0, 0.07, 0, { rot: [Math.PI / 2, 0, 0] });
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) add(bt, G.cyl(0.07, 0.07, 0.15, 10), mat('#1a2a3a'), x, 0.005, z, { cast: false });
  for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [0, 0.45]]) add(btn, G.cyl(0.05, 0.06, 0.5, 6), mat('#7a5232'), x, 0.25, z);
  // 葉っぱのお皿と木の実
  add(bt, G.sphere(0.08, 10, 8), mat('#d83a5a'), 0.3, 0.13, 0.25, { cast: false });
  add(bt, G.sphere(0.07, 10, 8), mat('#3a5ad8'), -0.32, 0.12, 0.2, { cast: false });

  // ---------------- 釣鐘草（ホタルの寝床） ----------------
  const bell = (R.bell = group(root, 9.9, 0, 7.4, -0.4));
  const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 1.2, 0), new THREE.Vector3(0.5, 2.1, 0), new THREE.Vector3(0.95, 2.0, 0)]);
  add(bell, new THREE.TubeGeometry(stem, 16, 0.06, 6), mat('#4f8a3a'), 0, 0, 0);
  const bellG = (R.bellFlower = group(bell, 1.0, 1.95, 0));
  bellG.scale.setScalar(0.72);
  const bPts = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; bPts.push(new THREE.Vector2(0.12 + Math.sin(k * Math.PI * 0.5) * 0.5 + (k > 0.8 ? (k - 0.8) * 1.2 : 0), -k * 0.9)); }
  R.bellMat = new THREE.MeshStandardMaterial({ color: '#a890e8', roughness: 0.5, side: THREE.DoubleSide, emissive: '#ffe070', emissiveIntensity: 0 });
  add(bellG, new THREE.LatheGeometry(bPts, 18), R.bellMat, 0, 0, 0);
  bigLeaf(bell, -0.2, 0.2, { h: 0.3, len: 1.0, wid: 0.5, ry: 2.2, tilt: 1.0, color: '#6a9a4a' });

  // ---------------- クモの巣（影絵のスクリーン） ----------------
  const web = (R.web = group(root, 12.2, 0, 3.0, -0.55));
  for (const s of [-1, 1]) {
    const st = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 1.6, 0, 0), new THREE.Vector3(s * 1.7, 1.8, 0.1), new THREE.Vector3(s * 1.4, 3.8, 0)]);
    add(web, new THREE.TubeGeometry(st, 12, 0.08, 6), mat('#5f9a3e'), 0, 0, 0);
  }
  const webTex = canvasTex(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250); ctx.stroke(); }
    ctx.lineWidth = 1.5;
    for (let k = 1; k < 13; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; const rr = k * 19 + Math.sin(i * 1.7 + k) * 3; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,240,255,0.9)';
    for (let i = 0; i < 26; i++) { const a = i * 2.39, rr = 30 + (i * 37) % 200; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3, 0, Math.PI * 2); ctx.fill(); }
  });
  const webM = new THREE.MeshBasicMaterial({ map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  R.webScreen = add(web, G.circle(1.55, 32), webM, 0, 2.0, 0.02, { cast: false });
  // 影絵の型（クモが巣に編んだ、大きなつのの形）と、うつった影
  const hornShape = () => {
    const s = new THREE.Shape();
    // Y字のつの（下が太く、上でふたまた）
    s.moveTo(-0.16, -0.9); s.lineTo(0.16, -0.9);
    s.quadraticCurveTo(0.14, -0.1, 0.1, 0.15);
    s.quadraticCurveTo(0.33, 0.4, 0.53, 0.84); s.lineTo(0.4, 0.9);
    s.quadraticCurveTo(0.18, 0.55, 0, 0.38);
    s.quadraticCurveTo(-0.18, 0.55, -0.4, 0.9); s.lineTo(-0.53, 0.84);
    s.quadraticCurveTo(-0.33, 0.4, -0.1, 0.15);
    s.quadraticCurveTo(-0.14, -0.1, -0.16, -0.9);
    return s;
  };
  R.hornShape = hornShape;
  // 型：つのの輪郭を、太い点線で（キャンバスに描いて板にはる）
  const stTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const pts = hornShape().getPoints(16);
    const k = w / 2.0;
    ctx.beginPath();
    pts.forEach((p, i) => { const x = w / 2 + p.x * k, y = h / 2 - p.y * k; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,248,210,0.95)'; ctx.lineWidth = 9; ctx.setLineDash([14, 9]); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,96,58,0.9)'; ctx.lineWidth = 4; ctx.stroke();
  });
  R.stencil = add(web, G.plane(2.0, 2.0), new THREE.MeshBasicMaterial({ map: stTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 0, 2.0, 0.04, { cast: false });
  R.stencil.scale.setScalar(1.25);
  R.stencil.visible = false;
  R.stencil.userData.noPick = true;
  R.stencil.userData.keep = true;
  R.shadow = add(web, new THREE.ShapeGeometry(hornShape(), 8), new THREE.MeshBasicMaterial({ color: '#1a1424', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }), 0, 2.0, 0.05, { cast: false });
  R.shadow.scale.setScalar(1.25);
  R.shadow.userData.keep = true;
  R.shadow.userData.noPick = true;
  // 影絵の台（二つの曲がった小枝を重ねて、つのをつくる）
  const stand = (R.stand = group(web, 0, 0, 1.6));
  add(stand, G.cyl(0.3, 0.36, 0.2, 12), mat('#9a9488', { flatShading: true }), 0, 0.1, 0);
  const tw = mat('#7a5a3a');
  for (const s of [-1, 1]) {
    add(stand, G.cyl(0.025, 0.035, 0.5, 6), tw, s * 0.025, 0.45, 0);
    add(stand, G.cyl(0.025, 0.035, 0.32, 6), tw, s * 0.08, 0.8, 0, { rot: [0, 0, -s * 0.5] });
  }

  // ---------------- 線路をふさぐ枯れ枝 ----------------
  const branch = (R.branch = group(root, 9.2, 0, -6.0));
  branch.userData.dynamic = true;
  const bm = new THREE.MeshStandardMaterial({ map: barkTex([1, 3]), roughness: 1 });
  add(branch, G.cyl(0.36, 0.48, 7.6, 10), bm, 0, 0.5, 0.2, { rot: [Math.PI / 2, 0, 0.12] });
  for (const [z, a, l] of [[-2.2, 0.9, 1.8], [1.0, -0.8, 1.6], [2.6, 0.7, 1.3], [-0.6, 2.4, 1.4]]) {
    const tg = group(branch, 0, 0.6, z, a);
    add(tg, G.cyl(0.08, 0.14, l, 6), bm, 0, 0.1, l / 2, { rot: [Math.PI / 2 - 0.25, 0, 0] });
    for (let i = 0; i < 3; i++) add(tg, G.sphere(0.22, 8, 6), mat(i % 2 ? '#a8783a' : '#c89a4a', { flatShading: true }), (i - 1) * 0.2, 0.3 + i * 0.1, l * (0.6 + i * 0.15), { scale: [1, 0.3, 0.7], rot: [i, i, 0] });
  }

  // ---------------- 丸太のトンネル（出口） ----------------
  const log = (R.logTunnel = group(root, 14.6, 0, TRACK_Z));
  const logM = new THREE.MeshStandardMaterial({ map: barkTex([4, 1]), roughness: 1, side: THREE.DoubleSide });
  add(log, new THREE.CylinderGeometry(2.0, 2.0, 3.4, 24, 1, true), logM, 0, 1.6, 0, { rot: [0, 0, Math.PI / 2] });
  add(log, G.torus(2.0, 0.18, 8, 24), new THREE.MeshStandardMaterial({ map: canvasTex(64, 64, (ctx, w, h) => { ctx.fillStyle = '#d8b880'; ctx.fillRect(0, 0, w, h); }), roughness: 1 }), -1.7, 1.6, 0, { rot: [0, Math.PI / 2, 0] });
  add(log, G.sphere(0.6, 10, 8), mat('#6aa04a', { roughness: 1 }), -0.6, 3.5, 0.6, { scale: [1.4, 0.4, 1] });
  add(log, G.sphere(0.5, 10, 8), mat('#7ab05a', { roughness: 1 }), 0.8, 3.45, -0.6, { scale: [1.4, 0.4, 1] });
  mushroom(log, -0.4, 1.6, { h: 0.7, r: 0.4, cap: '#e8a050' }).g.position.y = 3.2;

  // ---------------- 手前と左右のかざり（草・しずく・どんぐり・小石） ----------------
  for (const [x, z, h, lean, ry] of [[-14.2, 9.6, 3.2, 0.8, 0.4], [-13.4, 10.2, 2.4, -0.5, 1.2], [14.0, 9.6, 3.0, -0.7, 2.0], [14.4, 7.4, 2.6, 0.5, 0.6], [-14.4, -2.0, 3.6, 0.7, 1.0], [14.4, -2.4, 3.4, -0.8, 2.6], [-14.2, 3.6, 2.8, 0.4, 0.2], [12.6, 10.4, 2.2, 0.6, 1.4]]) {
    blade(root, x, z, h, { lean, w: 0.4, ry });
  }
  for (const [x, z, s, ry] of [[-13.0, -1.8, 1.2, 0.6], [14.0, 8.4, 1.0, 2.1], [-0.6, 10.2, 0.9, 1.2], [8.0, 10.0, 1.1, 0.2]]) bigLeaf(root, x, z, { h: 0.4 * s, len: 1.8 * s, wid: 1.1 * s, ry, tilt: 1.1 });
  acorn(root, 1.5, 8.3, 0.9);
  acorn(root, -13.6, 5.2, 2.0, false);
  acorn(root, 12.4, 7.0, 1.4);
  for (const [x, z, s] of [[-4.0, -0.3, 0.3], [2.4, 2.8, 0.25], [6.0, 4.6, 0.35], [-10.6, 9.8, 0.4], [12.8, -0.6, 0.45], [-2.6, 7.0, 0.3], [9.4, 2.6, 0.22]]) pebble(root, x, z, s, x + z);
  // 地面のしずく
  for (const [x, z, rr] of [[-3.4, 3.0, 0.18], [1.8, 3.6, 0.22], [5.0, 5.6, 0.16], [8.4, 5.8, 0.2], [-1.6, -0.2, 0.14], [11.0, 8.6, 0.24], [-13.0, 8.6, 0.2], [0.4, 7.2, 0.16]]) dewdrop(root, x, 0, z, rr);
  // 小さなキノコのむれ（手前）
  for (const [x, z, h, rr, c, sp, t] of [[-6.6, 9.8, 1.0, 0.5, '#d8583a', '#fff8ee', 0.1], [-6.0, 10.2, 0.6, 0.3, '#d8583a', '#fff8ee', -0.2], [7.0, 9.8, 0.9, 0.5, '#c8a070', null, 0.1], [1.2, 10.0, 0.7, 0.35, '#e8c8a0', null, -0.15], [13.2, 2.0, 1.2, 0.6, '#b8683a', null, 0.08], [-13.4, -0.6, 1.3, 0.6, '#e8a050', null, -0.1]]) {
    mushroom(root, x, z, { h, r: rr, cap: c, spots: sp, tilt: t, seed: Math.round(x * 3 + z) });
  }
  // 雨だれの出どころ（手前のキノコ）
  R.drips.push(new THREE.Vector3(-11.8 + 2.2, 4.8, 0.8 + 1.0), new THREE.Vector3(-13.0, 6.8, -8.6));
  return R;
}
