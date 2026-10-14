import * as THREE from 'three';
import { waterize, sway } from '../../lib/livefx.js';
import { add, mat, glow, G, group, rng, signTex, canvasTex, roundRectShape, FONT } from '../../lib/util.js';
import { bench, leafMat } from '../station/diorama.js';
import { boardsTex, planksTex, stoneTex, gravelTex } from '../station/textures.js';
import { placeOnPath, RAIL_Y } from '../station/train.js';
import { gableRoof, hipRoof } from '../edo/diorama.js';

// ---------------------------------------------------------------
// 潮の港町の箱庭
// 島は x[-15,15] z[-11,11]。島の上面（y=0）が海の底（砂地）で、
// 町は高さ Q の石の岸壁の上にある。海の水位は潮で変わる。
//  ・奥：線路（z=-6）と駅、白い家なみ
//  ・中：岸壁の通り（郵便局・魚市場・網小屋）、広場の潮時計
//  ・手前：港。左は岩山と洞窟、まん中に桟橋と漁船、石橋の防波堤、
//    右は砂州と灯台の小島。線路は右で海の中の「潮の道」へ下りる。
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
export const Q = 1.6; // 岸壁の高さ
export const CW = 0.4; // 潮の道（海の中の線路の土手）の高さ
export const PLAT = 0.75; // ホームの高さ（岸壁から）
export const TIDE_Y = [0.2, 0.8, 1.3]; // 干潮・中潮・満潮
export const TIDE_NAME = ['干潮', '中潮', '満潮'];

const white = () => mat('#f6f4ee', { roughness: 0.85 });
const blueTile = '#3a6ab0';

/** 点の列（[x,z]）を Shape に（shape の y = -z） */
function shapeOf(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}
const arcPts = (cx, cz, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
});

/** 上から見た形を高さ h だけ立ち上げたかたまり */
function slab(parent, pts, h, topMat, sideMat, y0 = 0) {
  const geo = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: h, bevelEnabled: false, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  return add(parent, geo, [topMat, sideMat], 0, y0, 0);
}

/** 白い壁と青い屋根の家（正面は +z） */
function whiteHouse(parent, x, y, z, { w = 3, d = 2.4, h = 2.4, roof = blueTile, door = '#3a6ab0', win = 2, floors = 1 } = {}) {
  const g = group(parent, x, y, z);
  const wallM = white();
  add(g, G.box(w, h, d), wallM, 0, h / 2, 0);
  add(g, G.box(w + 0.06, 0.12, d + 0.06), mat('#d8d4ca'), 0, 0.06, 0, { cast: false });
  // 窓（青い鎧戸）
  const shut = mat('#4a7ac0');
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < win; i++) {
      const wx = -w / 2 + ((i + 0.5) * w) / win;
      const wy = h * (floors > 1 ? 0.32 + f * 0.4 : 0.6);
      add(g, G.box(0.42, 0.5, 0.04), mat('#2a3a50'), wx, wy, d / 2 + 0.01, { cast: false });
      for (const s of [-1, 1]) add(g, G.box(0.2, 0.52, 0.04), shut, wx + s * 0.32, wy, d / 2 + 0.03, { cast: false });
    }
  }
  const r = gableRoof(g, 0, h, 0, w - 0.1, d, { pitch: 0.42, color: roof, over: 0.22 });
  void door;
  return { g, roof: r };
}

/** 松 */
function pine(parent, x, y, z, s = 1, seed = 1) {
  const r = rng(seed);
  const g = group(parent, x, y, z);
  g.scale.setScalar(s);
  add(g, G.cyl(0.1, 0.16, 1.8, 7), mat('#6a4a3a'), 0.1, 0.9, 0, { rot: [0, 0, -0.15] });
  const leaf = leafMat('#3e7a4a', 0.05);
  for (let i = 0; i < 4; i++) add(g, G.sphere(0.55 - i * 0.06, 9, 6), leaf, 0.25 + (r() - 0.5) * 0.6, 1.4 + i * 0.32, (r() - 0.5) * 0.5, { scale: [1.4, 0.45, 1.1] });
  return g;
}

/** 海の中の線路（枕木・バラスト・レール）。島の外は光るレール */
export function buildPortRails(parent, path, x0, x1, gaps = []) {
  const root = group(parent);
  const L = path.getLength();
  const dummy = new THREE.Object3D();
  const land = [], sky = [];
  const inGap = (p) => gaps.some(([a, b]) => p.x > a && p.x < b);
  for (let s = 0.3; s < L - 0.3; s += 0.6) {
    const p = path.getPointAt(s / L);
    if (inGap(p)) continue;
    (p.x > x0 && p.x < x1 ? land : sky).push(s);
  }
  const inst = (geo, material, list, dy, cast = true) => {
    const m = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((s, i) => { placeOnPath(path, dummy, s); dummy.translateY(dy); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.castShadow = cast; m.receiveShadow = true;
    root.add(m);
  };
  inst(G.sharpBox(0.64, 0.16, 2.3), mat('#a39887', { roughness: 1 }), land, -RAIL_Y + 0.08, false);
  inst(G.box(0.26, 0.1, 1.6), mat('#5a4434'), land, -0.17);
  inst(G.box(0.26, 0.1, 1.6), new THREE.MeshStandardMaterial({ color: '#4c5a80', emissive: '#7fd8ff', emissiveIntensity: 0.7, roughness: 0.5 }), sky, -0.17);
  // レール：島の上はふつうの鉄、外は光る
  const steel = mat('#9aa0aa', { metalness: 0.75, roughness: 0.35 });
  const glowRail = new THREE.MeshStandardMaterial({ color: '#d8e4ff', metalness: 0.6, roughness: 0.3, emissive: '#6fb8ff', emissiveIntensity: 0.5 });
  const runs = [];
  let cur = null, curLand = null;
  for (let s = 0; s <= L; s += 0.5) {
    const p = path.getPointAt(Math.min(1, s / L));
    const isLand = inGap(p) ? 'gap' : p.x > x0 && p.x < x1;
    if (cur && curLand === isLand) cur.push(s);
    else { if (cur && isLand !== 'gap' && curLand !== 'gap') cur.push(s); cur = [s]; curLand = isLand; runs.push({ list: cur, land: isLand }); }
  }
  for (const run of runs) {
    if (run.list.length < 2 || run.land === 'gap') continue;
    for (const side of [-1, 1]) {
      const pts = run.list.map((s) => {
        placeOnPath(path, dummy, s);
        dummy.updateMatrixWorld();
        return new THREE.Vector3(0, -0.065, side * 0.55).applyMatrix4(dummy.matrixWorld);
      });
      add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, run.land ? 0.055 : 0.06, 6), run.land ? steel : glowRail, 0, 0, 0, { cast: run.land });
    }
  }
  return root;
}

/** 潮時計の文字盤 */
const dialTex = () => canvasTex(512, 512, (ctx, w, h) => {
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#2a5aa0'; ctx.beginPath(); ctx.arc(cx, cy, 250, 0, 7); ctx.fill();
  ctx.fillStyle = '#f8f6ee'; ctx.beginPath(); ctx.arc(cx, cy, 228, 0, 7); ctx.fill();
  // 波もよう
  ctx.strokeStyle = '#a8c8e8'; ctx.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let x = -200; x <= 200; x += 8) ctx.lineTo(cx + x, cy + 110 + i * 26 + Math.sin(x / 22) * 8);
    ctx.stroke();
  }
  ctx.fillStyle = '#2a3a6a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 74px ${FONT}`;
  [[-55, '満'], [0, '中'], [55, '干']].forEach(([a, ch]) => {
    const r = (a * Math.PI) / 180;
    ctx.fillText(ch, cx + Math.sin(r) * 160, cy - Math.cos(r) * 160);
  });
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('しおどけい', cx, cy + 66);
  // 月
  ctx.fillStyle = '#e8c860'; ctx.beginPath(); ctx.arc(cx, cy - 20, 36, 0, 7); ctx.fill();
  ctx.fillStyle = '#f8f6ee'; ctx.beginPath(); ctx.arc(cx + 16, cy - 30, 32, 0, 7); ctx.fill();
});

/** 潮位標（干・中・満の目盛り） */
const gaugeTex = () => canvasTex(64, 512, (ctx, w, h) => {
  ctx.fillStyle = '#f8f6ee'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#f8f6ee' : '#d8402e'; ctx.fillRect(0, (i * h) / 16, w * 0.35, h / 16); }
  ctx.fillStyle = '#2a3a6a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 34px ${FONT}`;
  // 柱は y=0..2.0 → 画像の下=0
  TIDE_Y.forEach((y, i) => {
    const py = h - (y / 2.0) * h;
    ctx.fillRect(w * 0.35, py - 2, w * 0.65, 4);
    ctx.fillText(['干', '中', '満'][i], w * 0.68, py - 22);
  });
});

/** 郵便ポスト・看板などに使う小さな文字板 */
const plateTex = (text, bg = '#2a5aa0', fg = '#ffffff', w = 384, h = 96, size = 52) => signTex(text, { w, h, bg, fg, border: '#f4f6fa', size });

export function buildPortDiorama(scene) {
  const root = group(scene);
  const R = { root, buoys: [], gulls: [], floaters: [] };
  const wood = mat('#7a5a3e');
  const darkWood = mat('#5a4030');
  const rock = mat('#8a8478', { flatShading: true, roughness: 1 });

  // ---------------- 海の底（砂地） ----------------
  const sand = new THREE.MeshStandardMaterial({ map: gravelTex('#e2d2a8', [10, 7]), roughness: 1 });
  add(root, new THREE.ShapeGeometry(roundRectShape(29.6, 21.6, 2.4), 12), sand, 0, 0.003, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // 海藻と岩（水の中でゆれる）
  const weed = sway(mat('#2a6a4a', { roughness: 0.8 }), { amp: 0.1, speed: 0.6, base: 0 });
  const r0 = rng(41);
  for (let i = 0; i < 26; i++) {
    const x = -7 + r0() * 21, z = 2 + r0() * 8.5;
    if (x > -4 && x < 0 && z < 8) continue;
    if (r0() < 0.5) add(root, G.cone(0.09, 0.35 + r0() * 0.3, 5), weed, x, 0.2, z, { cast: false });
    else add(root, G.dodeca(0.15 + r0() * 0.25), rock, x, 0.05, z, { rot: [r0() * 3, r0() * 3, 0], cast: false });
  }

  // ---------------- 岸壁（町の地面） ----------------
  const paveTex = stoneTex('#e8e4da', [0.28, 0.5]);
  paveTex.wrapS = paveTex.wrapT = THREE.RepeatWrapping;
  const pave = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.95 });
  const wallTex = stoneTex('#b8b0a0', [0.42, 0.8]);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  const quayWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1 });
  const quayPts = [
    ...arcPts(-12.4, -8.4, 2.3, Math.PI, Math.PI * 1.5, 8),
    [3.5, -10.7], [3.5, -4.7], [9.0, -4.7], [9.0, 1.2],
    [-14.7, 1.2],
  ];
  R.quay = slab(root, quayPts, Q, pave, quayWall);
  // 岸壁のふちの白い縁石
  add(root, G.box(23.7, 0.08, 0.3), mat('#f4f2ec'), -5.7, Q + 0.04, 1.05, { cast: false });
  add(root, G.box(0.3, 0.08, 5.9), mat('#f4f2ec'), 8.85, Q + 0.04, -1.75, { cast: false });

  // ---------------- 岩山と洞窟（左手前） ----------------
  const cliffTop = new THREE.MeshStandardMaterial({ color: '#8ab06a', roughness: 1 });
  const cliffSide = mat('#9a8e7c', { flatShading: true, roughness: 1 });
  const cliffPts = [
    [-14.7, 1.2], [-9.0, 1.2], [-8.6, 2.6], [-8.9, 3.8], [-9.0, 4.6], [-9.0, 6.4], [-8.5, 7.6], [-8.8, 9.0], [-9.6, 10.7],
    ...arcPts(-12.4, 8.4, 2.3, Math.PI / 2, Math.PI, 8),
  ];
  R.cliff = group(root);
  slab(R.cliff, cliffPts, 3.4, cliffTop, cliffSide);
  // ごつごつ
  const r1 = rng(43);
  for (let i = 0; i < 22; i++) {
    const z = 1.6 + r1() * 8.8;
    add(R.cliff, G.dodeca(0.35 + r1() * 0.5), cliffSide, -9.0 + (r1() - 0.3) * 0.6, r1() * 3.0, z, { rot: [r1() * 3, r1() * 3, 0] });
    if (z > 4.2 && z < 6.8) continue;
  }
  // 洞窟の入口（干潮のときだけ入れる）
  const cave = (R.cave = group(root, -8.96, 0, 5.5));
  const archS = new THREE.Shape();
  archS.moveTo(-0.75, 0); archS.lineTo(0.75, 0); archS.lineTo(0.75, 0.55);
  archS.absarc(0, 0.55, 0.75, 0, Math.PI, false);
  archS.lineTo(-0.75, 0);
  add(cave, new THREE.ShapeGeometry(archS, 12), mat('#10141c', { roughness: 1 }), 0, 0.01, 0, { rot: [0, Math.PI / 2, 0], cast: false });
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI;
    add(cave, G.dodeca(0.22), cliffSide, 0.05, 0.55 + Math.sin(a) * 0.85, Math.cos(a) * 0.85, { rot: [i, i * 2, 0] });
  }
  // 洞窟の中の網（流されてきた）
  const net = (R.caveNet = group(root, -8.6, 0.05, 5.6));
  net.userData.dynamic = true;
  const netM = mat('#5a8a6a', { roughness: 1 });
  add(net, G.sphere(0.32, 10, 8), netM, 0, 0.12, 0, { scale: [1.2, 0.45, 1] });
  for (let i = 0; i < 5; i++) add(net, G.sphere(0.06, 8, 6), mat('#e8c84a'), Math.cos(i * 1.3) * 0.32, 0.18, Math.sin(i * 1.3) * 0.25, { cast: false });
  // 岩山の上：見晴らし台・松・旗
  const top = group(root, 0, 3.4, 0);
  pine(top, -13.0, 0, 3.0, 1.0, 3);
  pine(top, -11.0, 0, 9.0, 0.85, 5);
  bench(top, -11.3, 0, 5.4, -Math.PI / 2, 1.4);
  add(top, G.cyl(0.04, 0.04, 2.6, 6), mat('#e8e8e8'), -12.6, 1.3, 6.6);
  R.flag = add(top, G.box(0.9, 0.5, 0.02), new THREE.MeshStandardMaterial({ map: canvasTex(128, 72, (c, w, h) => {
    c.fillStyle = '#3a6ab0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w * 0.4, h / 2, 18, 0, 7); c.fill();
    c.fillStyle = '#3a6ab0'; c.beginPath(); c.arc(w * 0.46, h * 0.42, 15, 0, 7); c.fill();
  }), side: THREE.DoubleSide }), -12.15, 2.3, 6.6, { cast: false });
  R.flag.userData.keep = true;

  // ---------------- 駅（ホーム） ----------------
  const platStone = new THREE.MeshStandardMaterial({ map: stoneTex('#d8d4ca', [8, 1]), roughness: 0.95 });
  add(root, G.box(10, PLAT, 2.35), platStone, -7.6, Q + PLAT / 2, -3.78);
  add(root, G.box(10.1, 0.06, 0.3), mat('#f4f2ec'), -7.6, Q + PLAT + 0.03, -4.8);
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, PLAT * (3 - i) / 3, 0.35), platStone, -3.9, Q + PLAT * (3 - i) / 6, -2.42 + i * 0.35);
  const shelter = group(root, -10.0, Q + PLAT, -3.6);
  for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) add(shelter, G.box(0.1, 2.1, 0.1), white(), x, 1.05, z);
  add(shelter, G.box(2.6, 0.1, 1.8), mat(blueTile), 0, 2.15, 0, { rot: [0.08, 0, 0] });
  bench(shelter, 0, 0, 0.1, 0, 1.4);
  const sign = (R.stationSign = group(root, -6.2, Q + PLAT, -4.45));
  for (const s of [-1, 1]) add(sign, G.cyl(0.05, 0.05, 1.9, 8), mat('#e8e8e8'), s * 1.0, 0.95, 0);
  add(sign, G.box(2.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#f8f8f4'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2a5aa0'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#1a3a6a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 62px ${FONT}`; ctx.fillText('しおのみなと', w / 2, 70);
    ctx.font = `500 22px ${FONT}`; ctx.fillText('SHIO-NO-MINATO', w / 2, 120);
    ctx.fillStyle = '#2a5aa0'; ctx.fillRect(8, 140, w - 16, 52);
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'left'; ctx.fillText('← えどのしゅく', 22, 167);
    ctx.textAlign = 'right'; ctx.fillText('じょうかまち →', w - 22, 167);
  }), roughness: 0.7 }), 0, 1.5, 0.02);

  // ---------------- 線路の坂と、海の中の「潮の道」 ----------------
  // 坂（x=3 → 10 で岸壁の高さから潮の道の高さへ）
  const rampS = new THREE.Shape();
  rampS.moveTo(3.0, 0); rampS.lineTo(3.0, Q);
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    // 線路の Bezier（3,Q)→(6,Q)→(7,CW)→(10,CW) の y
    const y = (1 - t) ** 3 * Q + 3 * (1 - t) ** 2 * t * Q + 3 * (1 - t) * t * t * CW + t ** 3 * CW;
    const x = (1 - t) ** 3 * 3 + 3 * (1 - t) ** 2 * t * 6 + 3 * (1 - t) * t * t * 7 + t ** 3 * 10;
    rampS.lineTo(x, y);
  }
  rampS.lineTo(10, 0); rampS.lineTo(3.0, 0);
  const rampGeo = new THREE.ExtrudeGeometry(rampS, { depth: 2.5, bevelEnabled: false });
  add(root, rampGeo, [quayWall, quayWall], 0, 0, TRACK_Z - 1.25);
  R.causeway = add(root, G.box(4.75, CW, 2.5), quayWall, 12.375, CW / 2, TRACK_Z);
  // 潮の道の両わきの杭
  for (let x = 10.4; x < 14.6; x += 1.0) for (const s of [-1, 1]) add(root, G.cyl(0.07, 0.08, 1.0, 6), darkWood, x, 0.5, TRACK_Z + s * 1.35);

  // ---------------- 奥の家なみ（線路のむこう） ----------------
  [[-12.6, 2.6, 3.2, 1], [-9.4, 2.8, 2.6, 2], [-6.2, 2.4, 3.6, 1], [-2.8, 3.0, 2.8, 2], [0.6, 2.6, 3.2, 1]].forEach(([x, w, h, fl], i) => {
    whiteHouse(root, x, Q, -9.0 + (i % 2) * 0.3, { w, d: 2.2, h, floors: fl, win: 2, roof: i % 2 ? '#2a5aa0' : blueTile });
  });

  // ---------------- 通りの店 ----------------
  // 郵便局（タコ）
  const po = (R.postOffice = group(root, -0.4, Q, -2.55));
  add(po, G.box(3.0, 2.6, 2.2), white(), 0, 1.3, 0);
  add(po, G.box(1.0, 1.6, 0.06), mat('#2a5aa0'), 0, 0.8, 1.11, { cast: false });
  add(po, G.box(0.9, 1.5, 0.02), mat('#9ac0e0', { roughness: 0.2 }), 0, 0.85, 1.14, { cast: false });
  for (const s of [-1, 1]) {
    add(po, G.box(0.5, 0.55, 0.04), mat('#2a3a50'), s * 1.0, 1.4, 1.11, { cast: false });
    add(po, G.box(0.56, 0.06, 0.12), mat('#f4f2ec'), s * 1.0, 1.1, 1.14, { cast: false });
  }
  add(po, G.box(2.6, 0.45, 0.06), new THREE.MeshStandardMaterial({ map: plateTex('ゆうびん　タコ局') }), 0, 2.15, 1.13, { cast: false });
  gableRoof(po, 0, 2.6, 0, 2.9, 2.2, { pitch: 0.42, color: blueTile, over: 0.25 });
  // ポスト
  const post = (R.mailbox = group(root, 1.55, Q, -0.9));
  add(post, G.cyl(0.22, 0.22, 1.0, 16), mat('#2a5aa0'), 0, 0.5, 0);
  add(post, G.sphere(0.22, 16, 8), mat('#2a5aa0'), 0, 1.0, 0, { scale: [1, 0.5, 1] });
  add(post, G.box(0.26, 0.04, 0.05), mat('#1a2a4a'), 0, 0.82, 0.21, { cast: false });
  add(post, G.box(0.24, 0.16, 0.02), mat('#f4f2ec'), 0, 0.6, 0.22, { cast: false });

  // 魚市場（ペリカン）— 青白しまの日よけ
  const mk = (R.market = group(root, 3.7, Q, -2.55));
  add(mk, G.box(3.4, 2.4, 0.15), white(), 0, 1.2, -1.02);
  for (const s of [-1, 1]) add(mk, G.box(0.15, 2.4, 2.2), white(), s * 1.62, 1.2, 0);
  add(mk, G.box(3.5, 0.15, 2.4), white(), 0, 2.45, 0);
  const awnTex = canvasTex(256, 64, (c, w, h) => { for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#f8f8f4' : '#3a7ac0'; c.fillRect((i * w) / 10, 0, w / 10 + 1, h); } });
  add(mk, G.box(3.7, 0.06, 1.2), new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.9 }), 0, 2.25, 1.55, { rot: [0.35, 0, 0] });
  for (let i = 0; i < 10; i++) add(mk, G.cone(0.17, 0.18, 3), mat(i % 2 ? '#f8f8f4' : '#3a7ac0'), -1.665 + i * 0.37, 1.95, 2.07, { rot: [Math.PI, 0, 0], cast: false });
  add(mk, G.box(2.4, 0.42, 0.06), new THREE.MeshStandardMaterial({ map: plateTex('うおいち　ペリカン屋', '#f8f8f4', '#1a3a6a') }), 0, 2.75, 1.0, { cast: false });
  // 売り台（氷）
  add(mk, G.box(2.6, 0.7, 0.8), wood, 0, 0.35, 0.55);
  add(mk, G.box(2.5, 0.08, 0.72), mat('#dceef8', { roughness: 0.25 }), 0, 0.74, 0.55, { cast: false });
  R.noFish = add(mk, G.box(0.9, 0.28, 0.03), new THREE.MeshStandardMaterial({ map: signTex('本日 入荷なし', { w: 256, h: 80, size: 34, bg: '#f4f0e0' }) }), 0, 1.0, 0.92, { rot: [-0.3, 0, 0], cast: false });
  R.noFish.userData.keep = true;
  R.fishDisplay = group(mk);
  R.fishDisplay.userData.dynamic = true;
  for (let i = 0; i < 6; i++) {
    const f = group(R.fishDisplay, -1.0 + i * 0.4, 0.82, 0.45 + (i % 2) * 0.2, 0.3);
    add(f, G.sphere(0.12, 10, 8), mat(i % 3 ? '#9ab0c8' : '#c8a0a0', { metalness: 0.4, roughness: 0.35 }), 0, 0, 0, { scale: [1.6, 0.5, 0.6] });
    add(f, G.cone(0.08, 0.12, 4), mat('#7a90a8'), -0.22, 0, 0, { rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.3], cast: false });
  }
  // 灯台の油の樽
  const barrel = (R.oilBarrel = group(mk, 1.15, 0, -0.45));
  add(barrel, G.cyl(0.28, 0.25, 0.7, 14), mat('#8a5a3a'), 0, 0.35, 0);
  for (const y of [0.12, 0.58]) add(barrel, G.cyl(0.29, 0.29, 0.05, 14), mat('#3a3a40'), 0, y, 0, { cast: false });
  add(barrel, G.box(0.3, 0.16, 0.02), new THREE.MeshStandardMaterial({ map: signTex('灯台', { w: 128, h: 64, size: 34 }) }), 0, 0.4, 0.27, { cast: false });

  // 網小屋（カニの漁師）
  const shed = (R.shed = group(root, 7.3, Q, -2.55));
  add(shed, G.box(2.6, 2.1, 2.2), new THREE.MeshStandardMaterial({ map: boardsTex('#8a6a4a', [2, 1]), roughness: 0.9 }), 0, 1.05, 0);
  add(shed, G.box(0.9, 1.5, 0.05), mat('#3a6ab0'), -0.6, 0.75, 1.11, { cast: false });
  gableRoof(shed, 0, 2.1, 0, 2.5, 2.2, { pitch: 0.45, color: '#5a6a7a', over: 0.25 });
  add(shed, G.box(1.6, 0.36, 0.05), new THREE.MeshStandardMaterial({ map: plateTex('あみごや', '#f4f0e0', '#2a3a5a', 256, 72, 40) }), 0.4, 1.8, 1.14, { cast: false });
  // 干してある網と浮き玉
  add(shed, G.box(0.9, 1.1, 0.03), mat('#6a9a7a', { transparent: true, opacity: 0.8 }), 0.7, 0.9, 1.2, { cast: false });
  for (let i = 0; i < 4; i++) add(shed, G.sphere(0.12, 12, 10), mat('#8ad0e8', { transparent: true, opacity: 0.75, roughness: 0.1 }), 1.5, 0.15 + (i % 2) * 0.2, 0.6 + i * 0.25, { cast: false });

  // ---------------- 広場の潮時計（やぐら） ----------------
  const tc = (R.tideClock = group(root, -8.6, Q, -0.7));
  add(tc, G.box(1.8, 0.3, 1.8), mat('#d8d4ca'), 0, 0.15, 0);
  add(tc, G.box(1.4, 3.4, 1.4), white(), 0, 1.95, 0);
  add(tc, G.box(1.55, 0.14, 1.55), mat('#f4f2ec'), 0, 3.7, 0);
  hipRoof(tc, 0, 3.75, 0, 1.9, 1.9, 1.2, blueTile);
  add(tc, G.sphere(0.12, 10, 8), mat('#d8b04a', { metalness: 0.7, roughness: 0.3 }), 0, 5.0, 0);
  add(tc, G.cyl(0.62, 0.62, 0.06, 32), mat('#2a5aa0'), 0, 2.9, 0.72, { rot: [Math.PI / 2, 0, 0] });
  add(tc, G.circle(0.58, 40), new THREE.MeshStandardMaterial({ map: dialTex(), roughness: 0.6 }), 0, 2.9, 0.76, { cast: false });
  const hand = (R.clockHand = group(tc, 0, 2.9, 0.79));
  hand.userData.dynamic = true;
  add(hand, G.box(0.06, 0.48, 0.02), mat('#1a2a4a'), 0, 0.2, 0, { cast: false });
  add(hand, G.cone(0.07, 0.12, 4), mat('#1a2a4a'), 0, 0.46, 0, { scale: [1, 1, 0.3], cast: false });
  add(hand, G.cyl(0.06, 0.06, 0.04, 12), mat('#d8b04a', { metalness: 0.7 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  // 歯車の穴（直すと金の歯車が入る）
  add(tc, G.circle(0.3, 24), mat('#20283a'), 0, 1.45, 0.71, { cast: false });
  const gear = (R.clockGear = group(tc, 0, 1.45, 0.74));
  gear.userData.dynamic = true;
  const gold = mat('#e0b84a', { metalness: 0.75, roughness: 0.3 });
  add(gear, G.cyl(0.22, 0.22, 0.06, 20), gold, 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(gear, G.box(0.07, 0.08, 0.06), gold, Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0, { rot: [0, 0, a], cast: false });
  }
  add(gear, G.circle(0.07, 12), mat('#c8d8f0'), 0, 0, 0.035, { cast: false });
  add(tc, G.box(0.7, 0.3, 0.04), new THREE.MeshStandardMaterial({ map: signTex('月の歯車', { w: 192, h: 72, size: 34, bg: '#f4f0e0' }) }), 0, 1.0, 0.72, { cast: false });

  // ---------------- 潮位標（岸壁の前の海に立つ柱） ----------------
  const gauge = (R.gauge = group(root, -6.0, 0, 1.75));
  add(gauge, G.box(0.22, 2.0, 0.08), new THREE.MeshStandardMaterial({ map: gaugeTex(), roughness: 0.7 }), 0, 1.0, 0.0);
  add(gauge, G.box(0.1, 2.0, 0.1), mat('#5a6a7a'), 0, 1.0, -0.09);

  // ---------------- 通りの小物 ----------------
  // 係船柱と鎖（岸壁のふち）
  const bollard = mat('#2a2e38', { metalness: 0.4, roughness: 0.6 });
  for (const x of [-13.5, -11.0, -6.8, -4.6, -1.4, 1.2, 4.8]) {
    add(root, G.cyl(0.13, 0.16, 0.36, 12), bollard, x, Q + 0.18, 0.9);
    add(root, G.sphere(0.15, 12, 8), bollard, x, Q + 0.38, 0.9, { scale: [1, 0.5, 1] });
  }
  // 街灯（朝なので消えている）
  for (const [x, z] of [[-11.8, -1.6], [-5.2, -1.2], [2.0, 0.4], [8.6, 0.4]]) {
    const lp = group(root, x, Q, z);
    add(lp, G.cyl(0.05, 0.07, 2.4, 8), mat('#2a3a5a'), 0, 1.2, 0);
    add(lp, G.sphere(0.16, 12, 10), mat('#f4f0e0', { emissive: '#ffd890', emissiveIntensity: 0.2 }), 0, 2.5, 0);
    add(lp, G.cone(0.2, 0.14, 8), mat('#2a3a5a'), 0, 2.68, 0);
  }
  // 植木鉢とベンチ
  for (const [x, z] of [[-13.6, -1.4], [-6.4, -1.4], [-2.4, -1.0], [5.9, -1.0]]) {
    const pg = group(root, x, Q, z);
    add(pg, G.cyl(0.2, 0.15, 0.32, 12), mat('#3a6ab0'), 0, 0.16, 0);
    add(pg, G.sphere(0.3, 10, 8), leafMat('#5a9a4a', 0.04), 0, 0.5, 0);
    for (let i = 0; i < 3; i++) add(pg, G.sphere(0.06, 6, 4), mat(['#f4f4f8', '#f0d040', '#e86a8a'][i]), Math.cos(i * 2) * 0.2, 0.65, Math.sin(i * 2) * 0.2, { cast: false });
  }
  bench(root, -11.4, Q, 0.2, Math.PI, 1.4);
  // 木箱とたる
  for (const [x, z, k] of [[5.6, -0.6, 0], [5.9, -0.2, 1], [-13.2, -0.4, 0]]) {
    if (k) add(root, G.cyl(0.22, 0.2, 0.5, 12), mat('#8a5a3a'), x, Q + 0.25, z);
    else add(root, G.box(0.5, 0.4, 0.5), new THREE.MeshStandardMaterial({ map: boardsTex('#a8845a', [1, 1]) }), x, Q + 0.2, z);
  }

  // ---------------- 桟橋と漁船 ----------------
  const deck = new THREE.MeshStandardMaterial({ map: planksTex('#a8845a', '#6e4a2e', 10), roughness: 0.9 });
  const pier = (R.pier = group(root, -3.0, 0, 0));
  add(pier, G.box(1.4, 0.14, 5.6), deck, 0, Q - 0.07, 4.0);
  // 杭は床板の下でとめる（てっぺんが床とかさなるとチカチカする）
  for (let z = 1.8; z <= 6.6; z += 1.2) for (const s of [-1, 1]) add(pier, G.cyl(0.08, 0.09, Q - 0.16, 8), darkWood, s * 0.6, (Q - 0.16) / 2, z);
  for (const s of [-1, 1]) add(pier, G.cyl(0.06, 0.06, 0.6, 6), darkWood, s * 0.62, Q + 0.3, 6.7);
  // はしご
  for (const s of [-1, 1]) add(pier, G.box(0.05, Q, 0.05), wood, 0.72, Q / 2, 5.6 + s * 0.18);
  for (let i = 0; i < 6; i++) add(pier, G.box(0.04, 0.04, 0.36), wood, 0.72, 0.2 + i * 0.26, 5.6, { cast: false });

  const boat = (R.boat = group(root, -1.5, TIDE_Y[2] - 0.12, 4.5));
  boat.userData.dynamic = true;
  const hull = mat('#f4f2ec');
  add(boat, G.box(0.95, 0.42, 2.4), hull, 0, 0.21, 0);
  add(boat, G.box(0.97, 0.08, 2.42), mat('#2a5aa0'), 0, 0.15, 0, { cast: false });
  add(boat, G.cone(0.48, 0.7, 4), hull, 0, 0.21, 1.5, { rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1, 1, 0.6] });
  add(boat, G.box(0.85, 0.04, 2.2), deck, 0, 0.42, 0, { cast: false });
  // 操舵室
  add(boat, G.box(0.7, 0.55, 0.6), mat('#f8f8f4'), 0, 0.7, -0.6);
  add(boat, G.box(0.8, 0.08, 0.7), mat('#3a6ab0'), 0, 1.0, -0.6);
  add(boat, G.box(0.5, 0.2, 0.02), mat('#2a3a50'), 0, 0.78, -0.29, { cast: false });
  // マスト（満潮だと石橋につかえる）
  add(boat, G.cyl(0.04, 0.05, 1.25, 8), darkWood, 0, 0.75 + 0.62 - 0.25, 0.2);
  R.boatFlag = add(boat, G.box(0.02, 0.18, 0.3), mat('#d8402e', { side: THREE.DoubleSide }), 0, 1.38, 0.05, { cast: false });
  // 網（あとで積まれる）と魚箱
  R.boatNet = group(boat, 0, 0.44, 0.6);
  add(R.boatNet, G.sphere(0.26, 10, 8), netM, 0, 0.08, 0, { scale: [1.2, 0.45, 1] });
  R.boatFish = group(boat, 0.1, 0.44, 0.75);
  add(R.boatFish, G.box(0.5, 0.2, 0.36), new THREE.MeshStandardMaterial({ map: boardsTex('#c8a070', [1, 1]) }), 0, 0.1, 0);
  for (let i = 0; i < 3; i++) add(R.boatFish, G.sphere(0.08, 8, 6), mat('#9ab0c8', { metalness: 0.4, roughness: 0.35 }), -0.14 + i * 0.14, 0.22, 0, { scale: [1.6, 0.5, 0.6], cast: false });
  // 浮き（ブイ）
  for (const [x, z, c] of [[1.2, 6.4, '#d8402e'], [5.0, 7.6, '#f0d040'], [11.5, -8.6, '#d8402e'], [6.6, -8.8, '#f4f4f4'], [13.0, 1.4, '#f0d040'], [-6.0, 7.0, '#f4f4f4']]) {
    const b = group(root, x, 0, z);
    b.userData.dynamic = true;
    add(b, G.sphere(0.2, 12, 10), mat(c, { roughness: 0.5 }), 0, 0.05, 0);
    add(b, G.cyl(0.02, 0.02, 0.4, 4), mat('#2a2a30'), 0, 0.3, 0, { cast: false });
    R.buoys.push({ o: b, ph: x * 0.7 + z });
  }

  // ---------------- 石橋の防波堤（漁船は橋の下をくぐって沖へ） ----------------
  const bw = (R.bridge = group(root, 0, 0, 8.6));
  const arch = new THREE.Shape();
  arch.moveTo(-9.2, 0); arch.lineTo(2.4, 0); arch.lineTo(2.4, 2.6); arch.lineTo(-9.2, 2.6); arch.lineTo(-9.2, 0);
  const hole = new THREE.Path();
  hole.moveTo(-2.7, 0); hole.lineTo(-0.3, 0); hole.lineTo(-0.3, 1.6);
  hole.absellipse(-1.5, 1.6, 1.2, 0.6, 0, Math.PI, false);
  hole.lineTo(-2.7, 0);
  arch.holes.push(hole);
  const bwTex = stoneTex('#c8c0b0', [0.4, 0.8]);
  bwTex.wrapS = bwTex.wrapT = THREE.RepeatWrapping;
  const bwM = new THREE.MeshStandardMaterial({ map: bwTex, roughness: 1 });
  const bwGeo = new THREE.ExtrudeGeometry(arch, { depth: 0.9, bevelEnabled: false, curveSegments: 14 });
  add(bw, bwGeo, [new THREE.MeshStandardMaterial({ map: bwTex, roughness: 1 }), bwM], 0, 0, -0.45);
  add(bw, G.box(11.7, 0.1, 1.0), mat('#e8e4da'), -3.4, 2.65, 0, { cast: false });
  for (let x = -8.8; x <= 2.2; x += 0.55) for (const s of [-1, 1]) add(bw, G.box(0.1, 0.3, 0.1), mat('#f4f2ec'), x, 2.85, s * 0.42, { cast: false });
  for (const s of [-1, 1]) add(bw, G.box(11.4, 0.08, 0.1), mat('#f4f2ec'), -3.3, 3.02, s * 0.42, { cast: false });
  // 防波堤の先の赤い灯台（小）
  const mini = group(bw, 2.0, 2.6, 0);
  add(mini, G.cyl(0.22, 0.28, 1.1, 14), mat('#d8402e'), 0, 0.55, 0);
  add(mini, G.cyl(0.18, 0.18, 0.3, 14), mat('#f4f2ec', { emissive: '#ffd890', emissiveIntensity: 0.3 }), 0, 1.25, 0);
  add(mini, G.cone(0.25, 0.25, 14), mat('#d8402e'), 0, 1.52, 0);

  // ---------------- 階段と砂州（干潮のときだけ灯台へ歩いて渡れる） ----------------
  const stairs = (R.stairs = group(root, 7.0, 0, 1.2));
  const stepM = new THREE.MeshStandardMaterial({ map: stoneTex('#d8d2c4', [2, 1]), roughness: 0.95 });
  const N = 8;
  for (let i = 0; i < N; i++) {
    const h = Q - (i * Q) / N;
    add(stairs, G.sharpBox(1.9, h, 0.36), stepM, 0, h / 2, 0.18 + i * 0.36);
  }
  for (const s of [-1, 1]) add(stairs, G.box(0.16, 0.5, 2.9), white(), s * 1.03, Q * 0.45, 1.45, { rot: [-0.5, 0, 0] });
  const bar = (R.sandbar = group(root));
  const sandM = new THREE.MeshStandardMaterial({ color: '#e8d8b0', roughness: 1 });
  const barPts = [[7.0, 4.4], [7.8, 4.9], [8.7, 5.2], [9.6, 5.3], [10.4, 5.4]];
  barPts.forEach(([x, z], i) => add(bar, G.sphere(0.9, 14, 8), sandM, x, -0.48, z, { scale: [1.4, 1, 0.9], rot: [0, i * 0.3, 0], cast: false }));
  // 潮だまり（干潮で見える）
  R.tidePool = group(root, 8.4, 0, 6.6);
  for (let i = 0; i < 6; i++) add(R.tidePool, G.dodeca(0.25 + (i % 3) * 0.08), rock, Math.cos(i) * 0.8, 0.1, Math.sin(i) * 0.6, { rot: [i, i, 0] });
  const star = (x, z, c) => {
    const st = group(root, x, 0.05, z);
    for (let k = 0; k < 5; k++) add(st, G.cone(0.05, 0.22, 4), mat(c), Math.cos((k / 5) * Math.PI * 2) * 0.09, 0, Math.sin((k / 5) * Math.PI * 2) * 0.09, { rot: [0, -(k / 5) * Math.PI * 2, Math.PI / 2], scale: [1, 1, 0.4], cast: false });
    return st;
  };
  star(8.0, 6.2, '#f08a3a'); star(9.1, 6.9, '#d8402e'); star(6.4, 5.2, '#f0b040');

  // ---------------- 灯台の小島（右手前） ----------------
  const islet = (R.islet = group(root, 12.1, 0, 5.6));
  slab(islet, [[-1.9, -1.2], [-0.6, -2.0], [1.4, -1.6], [2.2, 0.2], [1.5, 1.9], [-0.4, 2.1], [-1.9, 1.0]], 1.95, new THREE.MeshStandardMaterial({ color: '#9aba7a', roughness: 1 }), cliffSide);
  const r2 = rng(47);
  for (let i = 0; i < 14; i++) {
    const a = r2() * Math.PI * 2;
    add(islet, G.dodeca(0.3 + r2() * 0.35), cliffSide, Math.cos(a) * 1.9, r2() * 1.4, Math.sin(a) * 1.7, { rot: [r2() * 3, r2() * 3, 0] });
  }
  // 小島へ上がる石段
  for (let i = 0; i < 4; i++) add(islet, G.sharpBox(0.9, 0.5 * (i + 1), 0.4), stepM, -1.9 - (3 - i) * 0.0, 0.25 * (i + 1), -0.6 + 0.0, { rot: [0, 0.3, 0] });
  const lh = (R.lighthouse = group(islet, 0.3, 1.95, -0.1));
  const lhTex = canvasTex(64, 256, (c, w, h) => {
    c.fillStyle = '#f8f8f4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a5aa0'; c.fillRect(0, h * 0.22, w, h * 0.12); c.fillRect(0, h * 0.58, w, h * 0.12);
  });
  add(lh, G.cyl(0.55, 0.78, 4.6, 24), new THREE.MeshStandardMaterial({ map: lhTex, roughness: 0.7 }), 0, 2.3, 0);
  add(lh, G.box(0.5, 0.9, 0.08), mat('#2a5aa0'), -0.72, 0.45, 0, { rot: [0, Math.PI / 2, 0], cast: false });
  for (let i = 0; i < 3; i++) add(lh, G.box(0.24, 0.3, 0.04), mat('#2a3a50'), Math.cos(i * 2.1 + 2.6) * 0.66, 1.4 + i * 1.1, Math.sin(i * 2.1 + 2.6) * 0.66, { rot: [0, -(i * 2.1 + 2.6) + Math.PI / 2, 0], cast: false });
  add(lh, G.cyl(0.85, 0.85, 0.12, 24), mat('#2a3a5a'), 0, 4.66, 0);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; add(lh, G.box(0.04, 0.4, 0.04), mat('#2a3a5a'), Math.cos(a) * 0.82, 4.9, Math.sin(a) * 0.82, { cast: false }); }
  add(lh, G.torus(0.82, 0.025, 6, 32), mat('#2a3a5a'), 0, 5.1, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  // ランプ室
  add(lh, G.cyl(0.48, 0.48, 0.8, 16, true), new THREE.MeshStandardMaterial({ color: '#c8e4f4', transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), 0, 5.12, 0, { cast: false });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(lh, G.box(0.04, 0.8, 0.04), mat('#2a3a5a'), Math.cos(a) * 0.48, 5.12, Math.sin(a) * 0.48, { cast: false }); }
  R.lampMat = new THREE.MeshStandardMaterial({ color: '#fff8e0', emissive: '#ffe08a', emissiveIntensity: 0, roughness: 0.3 });
  R.lampMat.userData.lamp = true;
  add(lh, G.sphere(0.24, 16, 12), R.lampMat, 0, 5.1, 0, { cast: false });
  add(lh, G.cone(0.6, 0.5, 16), mat('#2a5aa0'), 0, 5.77, 0);
  add(lh, G.sphere(0.08, 8, 6), mat('#d8b04a', { metalness: 0.7 }), 0, 6.06, 0);
  // 光の帯（灯ると回る）
  const beam = (R.beam = group(lh, 0, 5.1, 0));
  beam.userData.dynamic = true;
  const beamM = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const cone = new THREE.ConeGeometry(1.4, 12, 20, 1, true);
    cone.translate(0, -6, 0);
    const m = add(beam, cone, beamM, 0, 0, 0, { rot: [0, 0, s * Math.PI / 2], cast: false, receive: false });
    m.userData.noPick = true;
    m.userData.keep = true;
  }
  beam.visible = false;
  R.lampLight = new THREE.PointLight('#ffe8a8', 0, 14, 1.4);
  R.lampLight.position.set(0, 5.1, 0);
  lh.add(R.lampLight);
  // 灯台守の小屋
  const hut = group(islet, 1.2, 1.95, 1.0);
  add(hut, G.box(1.2, 1.0, 1.0), white(), 0, 0.5, 0);
  gableRoof(hut, 0, 1.0, 0, 1.1, 1.0, { pitch: 0.45, color: blueTile, over: 0.15 });
  add(hut, G.box(0.36, 0.7, 0.04), mat('#2a5aa0'), -0.2, 0.35, 0.51, { cast: false });

  // ---------------- 海（潮で高さが変わる。横から見ると水槽のような断面） ----------------
  const waterGeo = new THREE.ExtrudeGeometry(roundRectShape(29.4, 21.4, 2.4), { depth: 1, bevelEnabled: false, curveSegments: 10 });
  waterGeo.rotateX(-Math.PI / 2);
  R.waterMat = waterize(new THREE.MeshStandardMaterial({ color: '#3a8ac8', emissive: '#103050', emissiveIntensity: 0.25, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.78 }), { strength: 0.26, scale: 0.8 });
  const water = (R.water = add(root, waterGeo, R.waterMat, 0, 0, 0, { cast: false }));
  water.userData.noPick = true;
  water.userData.dynamic = true;
  water.renderOrder = 1;
  water.scale.y = TIDE_Y[2];

  return R;
}
