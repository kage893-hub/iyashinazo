import * as THREE from 'three';
import { waterize, sway, lightPool } from '../../lib/livefx.js';
import { add, mat, glow, G, group, rng, canvasTex, roundRectShape, FONT } from '../../lib/util.js';
import { hipRoof, gableRoof } from '../edo/diorama.js';
import { stoneTex, planksTex } from '../station/textures.js';
import { layoutX, layoutZ, applyJapanLayout } from './layout.js';
import { addTokyoStationDetails } from './station-details.js';

// ---------------------------------------------------------------
// 現代日本（とうきょう）の箱庭：江戸の宿場町の二百年後。
// 建物は江戸と共通の旧座標で定義し、layout.js で街区の間隔を広げる。
// 島は72×56。模型の縮尺を保ち、むかし目にも同じ配置変換を適用する。
//  江戸 → いま
//   浅草寺・雷門・五重塔 → そのまま（仲見世がふえる）
//   瓦版屋(-0.6) → 大型ビジョンのビル、団子屋(2.9) → ラーメン屋、呉服屋(6.4) → ファッションビル
//   番所(11.6,-2.4) → 交番、火の見やぐら(12.2,3.4) → 東京タワー、町木戸(10.2,-6) → 踏切と信号
//   井戸(2.1,4.5) → 自動販売機、茶店(5.4,4.4) → 喫茶店、渡し場(8,6) → 水上バス乗り場
//   太鼓橋(2.0) → 首都高の高架のわきに残る橋
// まわりに：秋葉原（左）、上野公園（左手前）、下町（手前）、お台場とレインボーブリッジ（右手前）、
//           東京駅（右）、山手線の高架と新宿の高層ビル（奥）
// ---------------------------------------------------------------

export const ISLAND = { w: 72, d: 56 };
export const TRACK_Z = -6.0;
export const FLOOR = 0.75;
export const RIVER_Z0 = 6.4, RIVER_Z1 = 8.7;
export const HW = { z: 10.0, y: 3.8, w: 2.2 }; // 首都高
export const VIA = { z: -10.6, y: 3.0 }; // 山手線の高架
export const TOWER = new THREE.Vector3(12.2, 0, 3.4);
export const STATION = { x: 22.5, z: -1.4 };

// ---------------- テクスチャ ----------------
/** 地面：道路・歩道・広場をワールド座標で描いた一枚の地図 */
const legacyGroundTex = () => canvasTex(2400, 1760, (ctx, w, h) => {
  const K = 40;
  const X = (x) => (x + 30) * K, Z = (z) => (z + 22) * K;
  const rect = (x0, z0, x1, z1, c) => { ctx.fillStyle = c; ctx.fillRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0)); };
  const r = rng(201);
  // 歩道のタイル
  ctx.fillStyle = '#b4b0a6'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(80,76,70,0.18)'; ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // 線路の奥（高架の下とビル街）
  rect(-30, -22, 30, -8.6, '#8e8a84');
  // 浅草寺の境内（玉砂利）と参道（石だたみ）
  rect(-15, -2.4, -5.8, 6.3, '#d6ccb4');
  for (let i = 0; i < 3000; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(120,110,90,0.2)'; ctx.fillRect(X(-15) + r() * 8.8 * K, Z(-2.4) + r() * 8.7 * K, 2, 2); }
  rect(-11.4, 1.6, -9.8, 6.3, '#a8a49a');
  // 道路
  const road = (x0, z0, x1, z1, center = true) => {
    rect(x0, z0, x1, z1, '#4a4c54');
    for (let i = 0; i < 900 * (x1 - x0) * (z1 - z0) / 100; i++) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(X(x0) + r() * (x1 - x0) * K, Z(z0) + r() * (z1 - z0) * K, 2, 2); }
    if (!center) return;
    ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 4; ctx.setLineDash([26, 20]);
    ctx.beginPath();
    if (x1 - x0 > z1 - z0) { ctx.moveTo(X(x0), Z((z0 + z1) / 2)); ctx.lineTo(X(x1), Z((z0 + z1) / 2)); } else { ctx.moveTo(X((x0 + x1) / 2), Z(z0)); ctx.lineTo(X((x0 + x1) / 2), Z(z1)); }
    ctx.stroke(); ctx.setLineDash([]);
  };
  // 境内は歩行者の広場。車道を本堂の下へ通さない。
  road(-30, -0.5, -17.3, 2.3);
  road(-5.8, -0.5, 30, 2.3);
  road(9.0, -8.6, 11.4, -0.5);        // 踏切へむかう道（江戸の町木戸）
  road(-17.3, -8.6, -14.9, 6.2);      // 中央通り（浅草寺と秋葉原のあいだ）
  road(-30, 10.6, 4.0, 12.6);         // 手前の通り（下町・上野）
  road(-17.3, 12.6, -14.9, 22);
  // 歩行者天国のスクランブル交差点（江戸の宿場の四つ角）
  ctx.fillStyle = '#f2f0e8';
  const zebra = (cx, cz, len, wid, vertical) => {
    for (let i = 0; i < 9; i++) {
      if (vertical) ctx.fillRect(X(cx - wid / 2) + i * (wid * K / 9) + 3, Z(cz - len / 2), wid * K / 18, len * K);
      else ctx.fillRect(X(cx - len / 2), Z(cz - wid / 2) + i * (wid * K / 9) + 3, len * K, wid * K / 18);
    }
  };
  zebra(2.0, -0.2, 0.65, 3.4, true); zebra(2.0, 2.0, 0.65, 3.4, true);
  zebra(-0.05, 0.9, 0.65, 1.5, false); zebra(4.05, 0.9, 0.65, 1.5, false);
  ctx.save(); ctx.translate(X(2.0), Z(0.9));
  for (const a of [0.42, -0.42]) {
    ctx.save(); ctx.rotate(a);
    for (let i = 0; i < 13; i++) ctx.fillRect(-74 + i * 12, -8, 5, 16);
    ctx.restore();
  }
  ctx.restore();
  // ほかの横断歩道
  for (const [cx, cz] of [[-16.1, -1.0], [-16.1, 2.8], [10.2, -1.0], [-16.1, 13.2], [-16.1, 10.1]]) zebra(cx, cz, 0.9, 2.4, true);
  for (const [cx, cz] of [[-18.0, 0.9], [-13.6, 0.9], [12.0, 0.9], [-18.0, 11.6], [-13.6, 11.6]]) zebra(cx, cz, 0.9, 2.0, false);
  // 渋谷の駅前広場（江戸の井戸と茶店のあたり）
  rect(-0.6, 2.3, 4.6, 6.2, '#c8c0b0');
  for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? '#bcb4a4' : '#d0c8b8'; ctx.fillRect(X(-0.6) + i * 17.3, Z(2.3) + j * 19.5, 17, 19); }
  // 東京駅の駅前広場
  rect(15.6, 0.5, 29.6, 6.2, '#c4beb4');
  ctx.strokeStyle = '#f2f0e8'; ctx.lineWidth = 4;
  for (let i = 0; i < 7; i++) ctx.strokeRect(X(18) + i * 70, Z(4.6), 60, 50);
  // 上野公園（芝と土の道）
  rect(-29.6, 12.6, -17.3, 21.6, '#7aa85a');
  ctx.fillStyle = '#c8b48a'; ctx.beginPath(); ctx.ellipse(X(-23.4), Z(17), 5.8 * K, 4.6 * K, 0, 0, Math.PI * 2); ctx.fill();
  rect(-29.6, 16.3, -17.3, 17.3, '#c8b48a');
  // 下町の路地
  rect(-14.9, 12.6, 4.0, 21.6, '#a8a49c');
  rect(-8.4, 12.6, -7.2, 21.6, '#8a8680');
  // 東京タワーの足もと（芝生）
  rect(9.0, 1.2 + 1.1, 15.4, 5.9, '#78a858');
  // お台場の手前（海辺の遊歩道）
  rect(4.0, 10.6, 29.6, 12.6, '#c0b8a8');
  // マンホール
  for (const [x, z] of [[-6, 0.4], [8, 1.6], [-22, 0.6], [20, 1.4], [-10, 11.2], [-24, 11.8], [5.5, 1.2]]) { ctx.fillStyle = '#3a3c42'; ctx.beginPath(); ctx.arc(X(x), Z(z), 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6a6c72'; ctx.lineWidth = 3; ctx.stroke(); }
});

/** 道路・広場の地図にも模型と同じ街区変換を適用する。 */
function groundTex() {
  const old = legacyGroundTex();
  const tex = canvasTex(ISLAND.w * 40, ISLAND.d * 40, (ctx) => {
    ctx.fillStyle = '#b4b0a6'; ctx.fillRect(0, 0, ISLAND.w * 40, ISLAND.d * 40);
    const xs = [-30, -16, -6, 8, 16, 30], zs = [-22, -2.4, 6.4, 22];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
      ctx.drawImage(old.image, (x0 + 30) * 40, (z0 + 22) * 40, (x1 - x0) * 40, (z1 - z0) * 40,
        (layoutX(x0) + ISLAND.w / 2) * 40, (layoutZ(z0) + ISLAND.d / 2) * 40,
        (layoutX(x1) - layoutX(x0)) * 40, (layoutZ(z1) - layoutZ(z0)) * 40);
    }
  });
  old.dispose();
  return tex;
}

/** ビルの窓（昼の色と、夜にともる窓） */
const winCache = new Map();
function windowTex(wall, glass, seed, lit = 0.55) {
  const k = `${wall}|${glass}|${seed}`;
  if (winCache.has(k)) return winCache.get(k);
  const r = rng(seed);
  const draw = (night) => (ctx, w, h) => {
    ctx.fillStyle = night ? '#000000' : wall; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) {
      const on = r() < lit;
      if (night) { ctx.fillStyle = on ? (r() > 0.3 ? '#ffe2a8' : '#cfe4ff') : '#000000'; }
      else ctx.fillStyle = glass;
      ctx.fillRect(x * 21.3 + 4, y * 32 + 6, 13, 20);
    }
  };
  const day = canvasTex(128, 256, draw(false));
  r.reset?.();
  const night = canvasTex(128, 256, draw(true));
  const v = { day, night };
  winCache.set(k, v);
  return v;
}

/** 看板（ネオン）：夜に光る文字の板 */
function neonTex(text, { fg = '#ff5aa0', bg = '#1a1424', vertical = false, w = 128, h = 384, size } = {}) {
  return canvasTex(vertical ? w : h, vertical ? h : w, (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = fg; ctx.shadowBlur = 10;
    if (vertical) {
      const n = [...text].length;
      const s = size || Math.min(W * 0.7, (H - 24) / n);
      ctx.font = `900 ${s}px ${FONT}`;
      [...text].forEach((ch, i) => ctx.fillText(ch, W / 2, 12 + (H - 24) * (i + 0.5) / n));
    } else {
      const s = size || Math.min(H * 0.62, (W - 20) / ([...text].length * 0.95));
      ctx.font = `900 ${s}px ${FONT}`;
      ctx.fillText(text, W / 2, H / 2 + 2);
    }
  });
}

const brickTex = () => canvasTex(256, 128, (ctx, w, h) => {
  ctx.fillStyle = '#e8e0d0'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 9; x++) {
    ctx.fillStyle = (x * 7 + y * 3) % 5 ? '#b0503a' : '#a04634';
    ctx.fillRect(x * 30 + (y % 2 ? 15 : 0) - 15 + 1, y * 8 + 1, 28, 6);
  }
}, { repeat: [3, 2] });

// ---------------- 小物 ----------------
/** 2点をむすぶ柱（鉄骨・ケーブル） */
function seg(parent, a, b, r, m, cast = true) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const mesh = add(parent, G.box(r, len, r), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, { cast });
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

/** ビル（窓のテクスチャ・屋上の小物つき） */
function building(parent, x, z, w, d, h, { wall = '#c8c4bc', glass = '#7a90a8', seed = 1, lit = 0.55, roof = true, ry = 0, R } = {}) {
  const g = group(parent, x, 0, z, ry);
  const t = windowTex(wall, glass, seed, lit);
  const day = t.day.clone(); day.needsUpdate = true; day.wrapS = day.wrapT = THREE.RepeatWrapping; day.repeat.set(Math.max(1, Math.round(w / 1.6)), Math.max(1, Math.round(h / 3)));
  const night = t.night.clone(); night.needsUpdate = true; night.wrapS = night.wrapT = THREE.RepeatWrapping; night.repeat.copy(day.repeat);
  const m = new THREE.MeshStandardMaterial({ map: day, emissive: '#ffffff', emissiveMap: night, emissiveIntensity: 0, roughness: 0.6 });
  R && R.winMats.push(m);
  add(g, G.box(w, h, d), m, 0, h / 2, 0);
  add(g, G.box(w + 0.08, 0.16, d + 0.08), mat('#8a8680'), 0, h + 0.02, 0);
  if (roof) {
    const r = rng(seed * 7);
    add(g, G.box(w * 0.3, 0.5, d * 0.3), mat('#9a9690'), (r() - 0.5) * w * 0.4, h + 0.3, (r() - 0.5) * d * 0.4);
    if (r() > 0.4) add(g, G.cyl(0.25, 0.25, 0.6, 10), mat('#d8d4cc'), (r() - 0.5) * w * 0.5, h + 0.35, (r() - 0.5) * d * 0.5);
    if (h > 9 && r() > 0.3) add(g, G.cyl(0.03, 0.03, 1.6, 4), mat('#c8c8d0'), w * 0.3, h + 0.85, d * 0.2, { cast: false });
  }
  return g;
}

/** ネオンの看板（縦・横） */
function neon(parent, text, x, y, z, { w = 0.5, h = 1.6, fg = '#ff5aa0', bg = '#1a1424', vertical = true, ry = 0, R } = {}) {
  const t = neonTex(text, { fg, bg, vertical });
  const m = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.2, roughness: 0.5 });
  R && R.neonMats.push(m);
  const b = add(parent, G.box(w, h, 0.08), m, x, y, z, { rot: [0, ry, 0] });
  return b;
}

function streetLamp(parent, x, z, R, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  add(g, G.cyl(0.05, 0.07, 2.8, 8), mat('#5a5e66', { metalness: 0.3 }), 0, 1.4, 0);
  add(g, G.box(0.05, 0.05, 0.6), mat('#5a5e66'), 0, 2.78, 0.28);
  const m = glow('#fff0c8', 0.15);
  R && R.lampMats.push(m);
  add(g, G.box(0.2, 0.08, 0.32), m, 0, 2.72, 0.55, { cast: false });
  return g;
}

function trafficLight(parent, x, z, ry, R) {
  const g = group(parent, x, 0, z, ry);
  add(g, G.cyl(0.05, 0.06, 2.6, 8), mat('#6a6e76'), 0, 1.3, 0);
  add(g, G.box(0.9, 0.28, 0.2), mat('#3a3c44'), 0.35, 2.55, 0.1);
  const cols = ['#3ad86a', '#f0c030', '#e83a2a'];
  cols.forEach((c, i) => {
    const m = glow(c, i === 2 ? 1.2 : 0.15);
    R && R.signalLamps.push({ m, i });
    add(g, G.circle(0.09, 12), m, 0.08 + i * 0.27, 2.55, 0.205, { cast: false });
  });
  // 歩行者用
  add(g, G.box(0.24, 0.4, 0.16), mat('#3a3c44'), 0, 1.9, 0.1);
  add(g, G.box(0.16, 0.14, 0.02), glow('#3ad86a', 0.6), 0, 1.98, 0.19, { cast: false });
  return g;
}

/** 電柱（電線は別にまとめて張る） */
function pole(parent, x, z) {
  const g = group(parent, x, 0, z);
  add(g, G.cyl(0.08, 0.11, 4.2, 8), mat('#a8a49c'), 0, 2.1, 0);
  add(g, G.box(0.9, 0.08, 0.08), mat('#5a5e66'), 0, 3.8, 0);
  add(g, G.cyl(0.14, 0.14, 0.4, 10), mat('#7a7e86'), 0.25, 3.4, 0);
  for (const s of [-0.38, 0, 0.38]) add(g, G.sphere(0.04, 6, 4), mat('#f0f0e8'), s, 3.87, 0, { cast: false });
  return new THREE.Vector3(x, 3.85, z);
}

function wires(parent, pts) {
  const m = mat('#2a2a30');
  for (let i = 0; i < pts.length - 1; i++) {
    for (const dx of [-0.38, 0, 0.38]) {
      const a = pts[i].clone().add(new THREE.Vector3(dx, 0, 0)), b = pts[i + 1].clone().add(new THREE.Vector3(dx, 0, 0));
      const mid = a.clone().lerp(b, 0.5); mid.y -= 0.35;
      const wire = add(parent, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 10, 0.012, 3), m, 0, 0, 0, { cast: false });
      wire.userData.layoutStretch = true;
    }
  }
}

function tree(parent, x, z, { s = 1, color = '#4a8a3a', pink = false } = {}) {
  const g = group(parent, x, 0, z);
  g.scale.setScalar(s);
  add(g, G.cyl(0.1, 0.14, 1.4, 8), mat('#6a4a32'), 0, 0.7, 0);
  const c = pink ? '#f4b8cc' : color;
  const lm = sway(mat(c, { roughness: 0.9 }), { amp: 0.03 });
  for (const [dx, dy, dz, r] of [[0, 1.7, 0, 0.75], [0.4, 1.5, 0.2, 0.5], [-0.35, 1.55, -0.2, 0.55], [0.1, 2.05, -0.1, 0.5]]) add(g, G.sphere(r, 12, 8), lm, dx, dy, dz);
  return g;
}

function bicycle(parent, x, z, ry, color = '#d8402e') {
  const g = group(parent, x, 0, z, ry);
  for (const s of [-1, 1]) add(g, G.torus(0.24, 0.03, 6, 18), mat('#2a2a30'), s * 0.38, 0.27, 0);
  add(g, G.box(0.8, 0.04, 0.04), mat(color), 0, 0.45, 0, { rot: [0, 0, 0.1] });
  add(g, G.box(0.04, 0.4, 0.04), mat(color), -0.1, 0.45, 0);
  add(g, G.box(0.2, 0.05, 0.12), mat('#2a2a30'), -0.12, 0.66, 0);
  add(g, G.box(0.04, 0.05, 0.4), mat('#8a8e96'), 0.36, 0.74, 0);
  add(g, G.box(0.24, 0.16, 0.26), mat('#c8c8d0'), 0.48, 0.6, 0);
  return g;
}

function car(parent, x, y, z, ry, color, taxi = false) {
  const g = group(parent, x, y, z, ry);
  add(g, G.box(1.5, 0.36, 0.72), mat(color, { roughness: 0.35, metalness: 0.2 }), 0, 0.3, 0);
  add(g, G.box(0.8, 0.3, 0.64), mat(taxi ? color : '#2a3040', { roughness: 0.2 }), -0.05, 0.62, 0);
  add(g, G.box(0.78, 0.22, 0.66), mat('#9ab0c8', { roughness: 0.1, metalness: 0.3 }), -0.05, 0.62, 0, { scale: [1.02, 1, 1.01], cast: false });
  for (const s of [-1, 1]) for (const k of [-1, 1]) add(g, G.cyl(0.14, 0.14, 0.1, 10), mat('#1a1a20'), s * 0.48, 0.14, k * 0.36, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(g, G.box(0.04, 0.1, 0.5), glow('#fff4d0', 0.8), 0.76, 0.34, 0, { cast: false });
  add(g, G.box(0.04, 0.08, 0.5), glow('#ff3a2a', 0.8), -0.76, 0.34, 0, { cast: false });
  if (taxi) add(g, G.box(0.22, 0.12, 0.1), glow('#fff0a0', 0.6), 0, 0.84, 0, { cast: false });
  return g;
}

/** 屋形船 */
function yakatabune(parent, x, z, ry, R) {
  const g = group(parent, x, 0.05, z, ry);
  add(g, G.box(3.2, 0.36, 1.1), mat('#6a4a32'), 0, 0.15, 0);
  add(g, G.cone(0.55, 0.9, 4), mat('#6a4a32'), 1.9, 0.18, 0, { rot: [0, 0, -Math.PI / 2], scale: [1, 1, 1.4] });
  const sh = new THREE.MeshStandardMaterial({ color: '#f4ead2', emissive: '#ffcf8a', emissiveIntensity: 0.3, roughness: 0.8 });
  R && R.lampMats.push(sh);
  add(g, G.box(2.6, 0.6, 0.95), sh, -0.1, 0.62, 0);
  add(g, G.box(2.9, 0.08, 1.2), mat('#3a3a44'), -0.1, 0.97, 0);
  for (let i = 0; i < 6; i++) {
    const m = glow('#ff5a3a', 0.5);
    R && R.lampMats.push(m);
    add(g, G.sphere(0.08, 8, 6), m, -1.3 + i * 0.5, 0.9, 0.62, { scale: [1, 1.3, 1], cast: false });
  }
  return g;
}

export function buildJapanDiorama(scene) {
  const root = group(scene);
  const R = { root, winMats: [], neonMats: [], lampMats: [], signalLamps: [], detail: [], towerLights: [], drips: [], hwMats: [] };
  const far = (R.far = group(root)); // 重いときに簡略化する遠景の小物
  far.userData.dynamic = true;
  const r = rng(203);

  // ---------------- 地面 ----------------
  const gm = new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.92 });
  const ground = add(root, new THREE.ShapeGeometry(roundRectShape(ISLAND.w - 0.4, ISLAND.d - 0.4, 3), 12), gm, 0, 0.003, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  ground.userData.layoutFixed = true;
  {
    const p = ground.geometry.attributes.position, uv = ground.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + ISLAND.w / 2) / ISLAND.w, 1 - (-p.getY(i) + ISLAND.d / 2) / ISLAND.d);
  }
  // 歩道のふち石（大通り）
  for (const z of [-0.6, 2.4]) for (const [a, b] of [[-29.7, -17.3], [-5.8, 29.7]]) {
    add(root, G.box(b - a, 0.08, 0.12), mat('#d8d4cc'), (a + b) / 2, 0.04, z, { cast: false });
  }

  // ---------------- 川（隅田川）と石垣、手前の海（お台場） ----------------
  const water = (R.waterMat = waterize(new THREE.MeshStandardMaterial({ color: '#2a4a6a', emissive: '#0a1a30', emissiveIntensity: 0.4, roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.93 }), { strength: 0.3 }));
  add(root, G.box(59.4, 0.05, RIVER_Z1 - RIVER_Z0), water, 0, 0.03, (RIVER_Z0 + RIVER_Z1) / 2, { cast: false });
  const embank = new THREE.MeshStandardMaterial({ map: stoneTex('#9a968e', [24, 1]), roughness: 1 });
  for (const z of [RIVER_Z0 - 0.12, RIVER_Z1 + 0.12]) add(root, G.box(59.4, 0.4, 0.24), embank, 0, 0.16, z);
  // 川ぞいの手すり
  for (let x = -29; x <= 29; x += 1.2) {
    if (Math.abs(x - 2) < 1.6 || Math.abs(x - 8) < 1.2) continue;
    add(root, G.box(0.05, 0.5, 0.05), mat('#6a6e76'), x, 0.5, RIVER_Z0 - 0.22, { cast: false });
  }
  add(root, G.box(59.4, 0.05, 0.05), mat('#6a6e76'), 0, 0.74, RIVER_Z0 - 0.22, { cast: false });
  // 海（右手前）
  const bay = new THREE.Shape();
  bay.moveTo(4.4, -13.0); bay.lineTo(29.8, -13.0); bay.lineTo(29.8, -21.8); bay.lineTo(4.4, -21.8); bay.lineTo(4.4, -13.0);
  add(root, new THREE.ShapeGeometry(roundRectShape(25.4, 9.0, 1.2), 8), water, 17.1, 0.035, 17.3, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(root, G.box(25.4, 0.36, 0.24), embank, 17.1, 0.15, 12.75);
  add(root, G.box(0.24, 0.36, 9.0), embank, 4.4, 0.15, 17.3);

  // ---------------- 線路の奥：山手線の高架と、高架下の飲み屋 ----------------
  const via = (R.viaduct = group(root));
  add(via, G.box(59.6, 0.5, 2.4), mat('#b8b4ac'), 0, VIA.y, VIA.z);
  for (const s of [-1, 1]) add(via, G.box(59.6, 0.5, 0.15), mat('#c8c4bc'), 0, VIA.y + 0.45, VIA.z + s * 1.15);
  for (const s of [-1, 1]) add(via, G.box(59.6, 0.08, 0.1), mat('#8a8e96', { metalness: 0.4 }), 0, VIA.y + 0.3, VIA.z + s * 0.5, { cast: false });
  for (let x = -28; x <= 28; x += 4) {
    add(via, G.box(0.5, VIA.y, 2.0), mat('#a8a49c'), x, VIA.y / 2, VIA.z);
  }
  // 高架下の焼き鳥屋（赤ちょうちん）
  for (let i = 0; i < 4; i++) {
    const x = -2 + i * 4;
    add(via, G.box(3.4, 2.4, 1.6), mat(['#5a3a2a', '#3a2a24', '#4a3424', '#5a4030'][i]), x, 1.2, VIA.z + 0.1);
    const nm = new THREE.MeshStandardMaterial({ map: neonTex(['やきとり', 'もつ焼', 'おでん', 'ホッピー'][i], { fg: '#fff4d0', bg: '#c8302a', vertical: false, w: 96, h: 320 }), emissive: '#ffffff', emissiveMap: neonTex(['やきとり', 'もつ焼', 'おでん', 'ホッピー'][i], { fg: '#fff4d0', bg: '#c8302a', vertical: false, w: 96, h: 320 }), emissiveIntensity: 0.25 });
    R.neonMats.push(nm);
    add(via, G.box(2.4, 0.5, 0.05), nm, x, 2.15, VIA.z + 0.92, { cast: false });
    for (let k = 0; k < 4; k++) {
      const lm = glow('#ff4a2a', 0.4);
      R.lampMats.push(lm);
      add(via, G.sphere(0.13, 10, 8), lm, x - 1.2 + k * 0.8, 1.7, VIA.z + 1.05, { scale: [1, 1.3, 1], cast: false });
    }
    add(via, G.box(2.2, 0.06, 0.6), mat('#2a2a30'), x, 1.6, VIA.z + 1.2, { rot: [0.3, 0, 0], cast: false });
  }
  // 山手線の電車（4両）。index.js で走らせる
  const yama = (R.yamanote = group(root, 0, VIA.y + 0.25, VIA.z));
  yama.userData.dynamic = true;
  const silver = mat('#d8dce4', { roughness: 0.3, metalness: 0.3 });
  const yg = mat('#3ab04a', { roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const car4 = group(yama, -i * 3.3, 0, 0);
    add(car4, G.box(3.1, 1.1, 1.2), silver, 0, 0.6, 0);
    add(car4, G.box(3.12, 0.18, 1.22), yg, 0, 0.95, 0);
    const wm = new THREE.MeshStandardMaterial({ color: '#2a3a4a', emissive: '#fff0c8', emissiveIntensity: 0.0, roughness: 0.2 });
    R.winMats.push(wm);
    add(car4, G.box(2.8, 0.36, 1.24), wm, 0, 0.7, 0, { cast: false });
    if (i === 0) add(car4, G.box(0.1, 0.5, 0.9), mat('#1a2a3a'), 1.56, 0.75, 0, { cast: false });
  }

  // ---------------- 奥：新宿の高層ビルと都庁 ----------------
  const sky = (R.skyline = group(root));
  const sk = [
    [-27, -15.5, 4, 4, 11, '#c8ccd4', '#5a7aa0'], [-22.5, -18.5, 3.6, 3.6, 15, '#a8b0bc', '#4a6a90'], [-17.5, -15.0, 3.2, 3.2, 9, '#d8d0c4', '#7a8aa0'],
    [-6.2, -15.5, 3.4, 3.0, 12, '#bcc4cc', '#5a7a9a'], [0.2, -18.6, 4.2, 3.6, 18, '#c0c8d0', '#3a5a80'], [4.6, -15.2, 3.0, 3.0, 10, '#d4ccc0', '#6a7a90'],
    [16.0, -16.0, 4.2, 3.6, 14, '#c8ccd4', '#4a6a90'], [21.4, -19.2, 3.6, 3.6, 17, '#b0b8c4', '#4a6a8a'], [26.6, -15.4, 4, 3.6, 12, '#d0c8bc', '#6a7a9a'],
    [-25.6, -20.4, 3, 2.4, 8, '#c8c4bc', '#7a8a9a'], [10.4, -20.0, 3.0, 2.8, 9, '#c8c4bc', '#7a8a9a'],
  ];
  sk.forEach(([x, z, w, d, h, wall, glass], i) => building(sky, x, z, w, d, h, { wall, glass, seed: 300 + i, lit: 0.6, R }));
  // 都庁（ふたごの塔）
  const tocho = (R.tocho = group(sky, -12.0, 0, -17.0));
  const tm = windowTex('#c8c4bc', '#6a7a90', 341, 0.5);
  const tmat = new THREE.MeshStandardMaterial({ map: tm.day, emissive: '#ffffff', emissiveMap: tm.night, emissiveIntensity: 0, roughness: 0.6 });
  tm.day.wrapS = tm.day.wrapT = THREE.RepeatWrapping; tm.night.wrapS = tm.night.wrapT = THREE.RepeatWrapping;
  tm.day.repeat.set(2, 4); tm.night.repeat.set(2, 4);
  R.winMats.push(tmat);
  add(tocho, G.box(6.0, 9.0, 3.6), tmat, 0, 4.5, 0);
  for (const s of [-1, 1]) {
    add(tocho, G.box(2.4, 8.0, 2.8), tmat, s * 1.6, 13.0, 0);
    add(tocho, G.box(2.0, 2.4, 2.4), tmat, s * 1.6, 18.2, 0, { rot: [0, Math.PI / 4, 0] });
    add(tocho, G.box(1.4, 0.3, 1.4), mat('#8a8680'), s * 1.6, 19.5, 0, { rot: [0, Math.PI / 4, 0] });
  }
  add(tocho, G.box(1.0, 1.4, 2.6), tmat, 0, 9.8, 0);
  // とんがり屋根の時計の塔（代々木のあの塔のような）
  const yoyo = group(sky, 9.6, 0, -15.6);
  add(yoyo, G.box(3.0, 12, 3.0), new THREE.MeshStandardMaterial({ map: windowTex('#c0c4cc', '#4a5a80', 351).day, emissive: '#ffffff', emissiveMap: windowTex('#c0c4cc', '#4a5a80', 351).night, emissiveIntensity: 0 }), 0, 6, 0);
  R.winMats.push(yoyo.children[0].material);
  add(yoyo, G.box(2.4, 3.0, 2.4), mat('#b8bcc4'), 0, 13.5, 0);
  add(yoyo, G.circle(0.7, 24), new THREE.MeshStandardMaterial({ color: '#fbf6e8', emissive: '#fff0c0', emissiveIntensity: 0.2 }), 0, 13.6, 1.21, { cast: false });
  add(yoyo, G.cone(0.9, 4.5, 4), mat('#a8acb4', { metalness: 0.3 }), 0, 17.2, 0, { rot: [0, Math.PI / 4, 0] });
  // 屋上の赤い航空灯
  R.beacons = [];
  for (const [x, y, z] of [[-13.6, 19.8, -17], [-10.4, 19.8, -17], [0.2, 18.8, -18.6], [21.4, 17.2, -19.2], [9.6, 19.6, -15.6]]) {
    const bm = glow('#ff2a1a', 1.2);
    R.beacons.push(bm);
    add(sky, G.sphere(0.14, 8, 6), bm, x, y, z, { cast: false });
  }

  // ---------------- 浅草駅（江戸のホームの場所） ----------------
  const platTile = new THREE.MeshStandardMaterial({ map: stoneTex('#c8c4bc', [8, 1]), roughness: 0.9 });
  add(root, G.box(10, FLOOR, 2.35), platTile, -7.6, FLOOR / 2, -3.78);
  add(root, G.box(10.1, 0.06, 0.32), mat('#f0d040'), -7.6, FLOOR + 0.03, -4.75);
  for (let i = 0; i < 3; i++) add(root, G.box(1.5, FLOOR * (3 - i) / 3, 0.35), platTile, -3.9, FLOOR * (3 - i) / 6, -2.42 + i * 0.35);
  // ホームの屋根
  const canopy = group(root, -7.6, FLOOR, -3.6);
  for (let i = 0; i < 4; i++) add(canopy, G.cyl(0.07, 0.07, 2.4, 8), mat('#5a6a7a'), -4 + i * 2.7, 1.2, 0.5);
  add(canopy, G.box(10, 0.12, 2.2), mat('#7a8a9a', { metalness: 0.3 }), 0, 2.45, 0.1, { rot: [0.06, 0, 0] });
  const pl = glow('#f4f8ff', 0.15);
  R.lampMats.push(pl);
  for (let i = 0; i < 4; i++) add(canopy, G.box(1.4, 0.05, 0.12), pl, -3.6 + i * 2.4, 2.36, 0.1, { cast: false });
  // 駅名標
  const sign = (R.stationSign = group(root, -10.4, FLOOR, -4.45));
  for (const s of [-1, 1]) add(sign, G.cyl(0.05, 0.05, 1.9, 8), mat('#5a6a7a'), s * 1.0, 0.95, -0.07);
  const sgm = new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fbfbf8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3ab04a'; ctx.fillRect(0, 128, w, 18);
    ctx.fillStyle = '#2a2a30'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 64px ${FONT}`; ctx.fillText('あさくさ', w / 2, 62);
    ctx.font = `500 22px ${FONT}`; ctx.fillText('ASAKUSA', w / 2, 112);
    ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('← おもちゃのまち', 18, 176);
    ctx.textAlign = 'right'; ctx.fillText('とうきょう（終点）→', w - 18, 176);
  }), emissive: '#ffffff', emissiveIntensity: 0.0, roughness: 0.6 });
  sgm.emissiveMap = sgm.map;
  R.lampMats.push(sgm);
  add(sign, G.box(2.3, 0.9, 0.06), sgm, 0, 1.5, 0.02);
  // ホームの時計（午後8時で止まっている）
  const clk = (R.platformClock = group(root, -4.6, FLOOR, -4.5));
  add(clk, G.cyl(0.05, 0.05, 2.2, 8), mat('#5a6a7a'), 0, 1.1, 0);
  add(clk, G.cyl(0.36, 0.36, 0.12, 24), mat('#2a2a30'), 0, 2.4, 0, { rot: [Math.PI / 2, 0, 0] });
  const clockFace = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fbfbf8'; ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2a30';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.save(); ctx.translate(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); ctx.rotate(a); ctx.fillRect(-4, -12, 8, 24); ctx.restore(); }
    ctx.lineCap = 'round';
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin((8 / 12) * Math.PI * 2) * 60, 128 - Math.cos((8 / 12) * Math.PI * 2) * 60); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128, 128 - 96); ctx.stroke();
  });
  for (const s of [-1, 1]) add(clk, G.circle(0.32, 24), new THREE.MeshStandardMaterial({ map: clockFace, emissive: '#ffffff', emissiveMap: clockFace, emissiveIntensity: 0.25 }), 0, 2.4, s * 0.065, { rot: [0, s < 0 ? Math.PI : 0, 0], cast: false });
  // ホームの自動販売機（飾り）とベンチ
  add(root, G.box(0.9, 1.7, 0.6), mat('#d8402e', { roughness: 0.4 }), -11.8, FLOOR + 0.85, -3.4);
  add(root, G.box(0.7, 0.9, 0.04), glow('#f4f8ff', 0.4), -11.8, FLOOR + 1.1, -3.08, { cast: false });
  for (const x of [-9.2, -6.4]) { add(root, G.box(1.4, 0.08, 0.5), mat('#3a7ae8'), x, FLOOR + 0.42, -3.2); add(root, G.box(1.4, 0.4, 0.06), mat('#3a7ae8'), x, FLOOR + 0.62, -3.42); for (const s of [-1, 1]) add(root, G.box(0.06, 0.42, 0.4), mat('#8a8e96'), x + s * 0.6, FLOOR + 0.21, -3.2); }

  // ---------------- 浅草寺（江戸と同じ場所） ----------------
  const temple = (R.temple = group(root));
  const red = mat('#c8402e', { roughness: 0.6 });
  const hondo = (R.hondo = group(temple, -10.6, 0, 0.1, -Math.PI / 2));
  add(hondo, G.box(3.6, 0.6, 3.8), mat('#9a948a'), 0, 0.3, 0);
  for (let i = 0; i < 3; i++) add(hondo, G.box(0.4, 0.6 * (3 - i) / 3, 1.8), mat('#9a948a'), 2.0 + i * 0.4, 0.6 * (3 - i) / 6, 0);
  for (const [x, z] of [[-1.5, -1.7], [1.5, -1.7], [-1.5, 1.7], [1.5, 1.7], [1.5, -0.6], [1.5, 0.6]]) add(hondo, G.cyl(0.12, 0.12, 2.4, 10), red, x, 1.8, z);
  add(hondo, G.box(2.9, 2.2, 3.3), mat('#f0e6d4'), -0.15, 1.7, 0);
  add(hondo, G.box(3.4, 0.32, 3.8), red, 0, 3.05, 0);
  hipRoof(hondo, 0, 3.2, 0, 5.4, 5.6, 2.2);
  add(hondo, G.box(0.08, 1.4, 1.0), mat('#2a1a14'), 1.32, 1.45, 0, { cast: false });
  add(hondo, G.box(0.5, 0.45, 1.0), mat('#5a3a26'), 2.5, 0.8, 0);
  const big = glow('#e84a2a', 0.15, { map: neonTex('志', { fg: '#1a1010', bg: '#e8402e', vertical: true, w: 128, h: 160 }) });
  R.lampMats.push(big);
  add(hondo, G.cyl(0.5, 0.5, 1.1, 18), big, 2.0, 2.2, 0);
  // 常香炉（けむり）
  const kou = (R.incense = group(root, -10.6, 0, 3.0));
  add(kou, G.cyl(0.5, 0.6, 0.7, 14), mat('#5a5048', { metalness: 0.4 }), 0, 0.5, 0);
  add(kou, G.cone(0.6, 0.6, 8), mat('#4a4038', { metalness: 0.4 }), 0, 1.25, 0);
  for (const s of [-1, 1]) add(kou, G.cyl(0.06, 0.06, 0.5, 6), mat('#4a4038'), s * 0.35, 0.15, 0);
  // 五重塔
  const pagoda = (R.pagoda = group(temple, -13.5, 0, 3.9));
  add(pagoda, G.box(2.0, 0.4, 2.0), mat('#9a948a'), 0, 0.2, 0);
  let py = 0.4;
  for (let i = 0; i < 5; i++) {
    const s = 1.5 - i * 0.16;
    add(pagoda, G.box(s, 0.95, s), i % 2 ? mat('#f0e6d4') : red, 0, py + 0.47, 0);
    hipRoof(pagoda, 0, py + 0.95, 0, s + 1.0, s + 1.0, 0.32);
    py += 1.12;
  }
  add(pagoda, G.cyl(0.05, 0.05, 1.9, 8), mat('#d8b04a', { metalness: 0.6, roughness: 0.3 }), 0, py + 0.95, 0);
  R.pagodaLight = [];
  // 雷門と大提灯
  const kmon = (R.kaminarimon = group(temple, -10.6, 0, 5.3, -Math.PI / 2));
  for (const z of [-1.1, 1.1]) for (const x of [-0.38, 0.38]) add(kmon, G.cyl(0.13, 0.13, 2.8, 10), red, x, 1.4, z);
  add(kmon, G.box(1.1, 0.32, 2.9), red, 0, 2.9, 0);
  gableRoof(kmon, 0, 3.05, 0, 1.1, 2.1, { pitch: 0.5, over: 0.5 }).rotation.y = Math.PI / 2;
  const kmTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d8402e'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,10,10,0.35)'; ctx.lineWidth = 3;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, (i * h) / 10); ctx.lineTo(w, (i * h) / 10); ctx.stroke(); }
    ctx.fillStyle = '#1a0a0a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 92px ${FONT}`; ctx.fillText('雷', w / 4, h / 2); ctx.fillText('門', (w * 3) / 4, h / 2);
  });
  const kmMat = new THREE.MeshStandardMaterial({ map: kmTex, emissive: '#ffb050', emissiveMap: kmTex, emissiveIntensity: 0.2, roughness: 0.6 });
  R.lampMats.push(kmMat);
  const och = (R.ochochin = group(kmon, 0, 1.7, 0));
  add(och, G.cyl(0.6, 0.6, 1.3, 40), kmMat, 0, 0, 0, { rot: [0, Math.PI / 2, 0] });
  for (const yy of [-0.68, 0.68]) add(och, G.cyl(0.55, 0.55, 0.08, 20), mat('#2a1a14'), 0, yy, 0);
  // 仲見世（参道の両がわの小さな店）
  const nakaShops = [['人形焼', '#c8402e'], ['雷おこし', '#d87a2a'], ['せんべい', '#8a5a3a'], ['扇子', '#3a5a8a']];
  R.nakamise = [];
  nakaShops.forEach(([name, col], i) => {
    const sx = i < 2 ? -12.1 : -9.1;
    const sz = 3.55 + (i % 2) * 0.8;
    const g = group(root, sx, 0, sz, i < 2 ? Math.PI / 2 : -Math.PI / 2);
    add(g, G.box(0.75, 1.5, 0.9), mat('#f0e6d4'), 0, 0.75, -0.1);
    add(g, G.box(0.85, 0.1, 1.15), mat(col), 0, 1.55, 0.05);
    add(g, G.box(0.7, 0.4, 0.4), mat('#8a5a3a'), 0, 0.45, 0.35);
    const nm = new THREE.MeshStandardMaterial({ map: neonTex(name, { fg: '#fff4d0', bg: col, vertical: false, w: 96, h: 300 }), emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.6 });
    nm.emissiveMap = nm.map;
    R.lampMats.push(nm);
    add(g, G.box(0.8, 0.24, 0.04), nm, 0, 1.32, 0.42, { cast: false });
    R.nakamise.push(g);
  });
  // リスの和菓子屋（いちばん奥、本堂の右）
  const wag = (R.wagashi = group(root, -7.8, 0, 3.6));
  add(wag, G.box(1.6, 2.0, 1.4), mat('#f0e6d4'), 0, 1.0, 0);
  add(wag, G.box(1.8, 0.12, 1.7), mat('#2b3a6a'), 0, 2.05, 0.15, { rot: [0.15, 0, 0] });
  add(wag, G.box(1.2, 0.5, 0.5), mat('#6a4a32'), 0, 0.5, 0.75);
  for (let i = 0; i < 5; i++) add(wag, G.sphere(0.08, 8, 6), mat(['#f4b8cc', '#fbf6f0', '#8ab86a', '#e8c890', '#f4b8cc'][i]), -0.4 + i * 0.2, 0.8, 0.75, { cast: false });
  const wm = new THREE.MeshStandardMaterial({ map: neonTex('和菓子　りす屋', { fg: '#fbf4e2', bg: '#2b3a6a', vertical: false, w: 96, h: 420 }), emissive: '#ffffff', emissiveIntensity: 0.15 });
  wm.emissiveMap = wm.map;
  R.lampMats.push(wm);
  add(wag, G.box(1.5, 0.3, 0.05), wm, 0, 1.75, 0.72, { cast: false });
  // 銀座線の地下鉄の入口
  const sub = (R.subway = group(root, -6.6, 0, 0.9));
  add(sub, G.box(1.6, 0.9, 2.2), mat('#c8ccd4', { roughness: 0.3, metalness: 0.2 }), 0, 0.45, 0);
  add(sub, G.box(1.7, 0.1, 2.3), mat('#7a8a9a'), 0, 1.6, 0);
  for (const s of [-1, 1]) add(sub, G.box(0.06, 0.8, 2.2), mat('#a8c8e8', { roughness: 0.05, transparent: true, opacity: 0.6 }), s * 0.8, 1.2, 0, { cast: false });
  add(sub, G.box(1.2, 0.06, 1.6), mat('#3a3c44'), 0, 0.92, 0.2, { rot: [0.35, 0, 0], cast: false });
  const gz = new THREE.MeshStandardMaterial({ map: neonTex('G 銀座線', { fg: '#ffffff', bg: '#f08a1a', vertical: false, w: 96, h: 300 }), emissive: '#ffffff', emissiveIntensity: 0.4 });
  gz.emissiveMap = gz.map;
  R.lampMats.push(gz);
  add(sub, G.box(1.2, 0.36, 0.05), gz, 0, 1.95, 1.1, { cast: false });
  add(sub, G.cyl(0.03, 0.03, 0.4, 6), mat('#7a8a9a'), 0, 1.75, 1.1, { cast: false });
  // 時の鐘（今も同じ場所。まわりに柵）
  const bt = (R.bellTower = group(root, -5.2, 0, 4.6));
  add(bt, G.box(2.4, 0.5, 2.4), mat('#9a948a', { flatShading: true }), 0, 0.25, 0);
  const wood = mat('#6a4a32');
  for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) add(bt, G.cyl(0.09, 0.11, 2.6, 8), wood, x, 1.8, z);
  add(bt, G.box(2.2, 0.16, 2.2), wood, 0, 3.1, 0);
  hipRoof(bt, 0, 3.15, 0, 3.0, 3.0, 1.1);
  const bronze = mat('#5a7a6a', { metalness: 0.4, roughness: 0.45 });
  R.bell = group(bt, 0, 2.95, 0);
  R.bell.userData.dynamic = true;
  add(R.bell, G.cyl(0.42, 0.5, 1.1, 20), bronze, 0, -0.65, 0);
  add(R.bell, G.sphere(0.42, 18, 10), bronze, 0, -0.1, 0, { scale: [1, 0.35, 1] });
  add(R.bell, G.torus(0.48, 0.035, 6, 24), bronze, 0, -1.05, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  R.shumoku = group(bt, 0.9, 2.3, 0);
  R.shumoku.userData.dynamic = true;
  add(R.shumoku, G.cyl(0.11, 0.11, 1.3, 10), mat('#b89a6a'), 0.55, 0, 0, { rot: [0, 0, Math.PI / 2] });
  add(R.shumoku, G.cyl(0.025, 0.025, 1.5, 6), mat('#d8b070'), 1.2, -0.75, 0.15, { rot: [0.2, 0, 0.1] });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(bt, G.box(0.06, 0.6, 0.06), mat('#3a3a40'), Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5, { cast: false }); }
  add(bt, G.torus(1.5, 0.03, 4, 32), mat('#3a3a40'), 0, 0.58, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  const plq = new THREE.MeshStandardMaterial({ map: neonTex('時の鐘', { fg: '#2a1a14', bg: '#e8dcc0', vertical: false, w: 96, h: 240 }) });
  add(bt, G.box(0.9, 0.36, 0.04), plq, 0, 0.75, 1.55, { cast: false });

  // ---------------- 渋谷（江戸の宿場の通り） ----------------
  const shib = (R.shibuya = group(root));
  // 1) 大型ビジョンのビル（瓦版屋のあと）
  const qf = (R.visionBldg = building(shib, -0.6, -2.5, 3.0, 2.4, 8.0, { wall: '#d8dce4', glass: '#5a7a9a', seed: 401, R }));
  R.visionCanvas = document.createElement('canvas');
  R.visionCanvas.width = 512; R.visionCanvas.height = 320;
  R.visionTex = new THREE.CanvasTexture(R.visionCanvas);
  R.visionTex.colorSpace = THREE.SRGBColorSpace;
  R.visionMat = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffffff', emissiveMap: R.visionTex, emissiveIntensity: 1.0, roughness: 0.4 });
  R.vision = add(qf, G.box(2.7, 1.7, 0.08), R.visionMat, 0, 5.2, 1.25, { cast: false });
  add(qf, G.box(2.9, 1.9, 0.06), mat('#2a2a30'), 0, 5.2, 1.21);
  // 2) ラーメン屋（団子屋のあと）
  const ramen = (R.ramen = group(shib, 2.9, 0, -2.45));
  add(ramen, G.box(2.8, 2.6, 2.2), mat('#e8dcc8'), 0, 1.3, 0);
  add(ramen, G.box(3.0, 1.2, 2.3), mat('#8a3a2a'), 0, 3.2, -0.05);
  add(ramen, G.box(3.0, 0.14, 0.6), mat('#c8302a'), 0, 2.2, 1.35, { rot: [0.25, 0, 0] });
  add(ramen, G.box(2.4, 1.3, 0.06), new THREE.MeshStandardMaterial({ color: '#ffd8a0', emissive: '#ffb860', emissiveIntensity: 0.3, roughness: 0.4 }), 0, 0.95, 1.11, { cast: false });
  R.lampMats.push(ramen.children[ramen.children.length - 1].material);
  const rn = new THREE.MeshStandardMaterial({ map: neonTex('ラーメン', { fg: '#ffffff', bg: '#c8302a', vertical: false, w: 100, h: 340 }), emissive: '#ffffff', emissiveIntensity: 0.3 });
  rn.emissiveMap = rn.map;
  R.neonMats.push(rn);
  add(ramen, G.box(2.4, 0.6, 0.06), rn, 0, 3.2, 1.11, { cast: false });
  for (const s of [-1, 1]) {
    const lm = glow('#ff4a2a', 0.4);
    R.lampMats.push(lm);
    add(ramen, G.sphere(0.2, 10, 8), lm, s * 1.15, 1.95, 1.4, { scale: [1, 1.35, 1], cast: false });
  }
  // のれん
  add(ramen, G.box(1.2, 0.5, 0.02), mat('#2a2a3a'), 0, 1.6, 1.16, { cast: false });
  // 3) ファッションビル（呉服屋のあと）：銀色の円筒に「109」
  const f109 = (R.fashion = group(shib, 6.6, 0, -2.5));
  add(f109, G.cyl(1.3, 1.3, 9.0, 28), mat('#c8ccd4', { roughness: 0.3, metalness: 0.3 }), 0, 4.5, 0);
  for (let i = 0; i < 8; i++) add(f109, G.cyl(1.32, 1.32, 0.12, 28), mat('#a8acb4', { metalness: 0.4 }), 0, 1 + i * 1.05, 0);
  const n109 = new THREE.MeshStandardMaterial({ map: neonTex('109', { fg: '#ffffff', bg: '#c83a6a', vertical: true, w: 128, h: 384, size: 100 }), emissive: '#ffffff', emissiveIntensity: 0.3 });
  n109.emissiveMap = n109.map;
  R.neonMats.push(n109);
  add(f109, G.box(0.6, 3.2, 0.1), n109, 0, 7.0, 1.33, { cast: false });
  // そのほかのビル（通りの奥・左右）
  building(shib, -4.2, -2.5, 2.4, 2.2, 5.0, { wall: '#c8bcb0', glass: '#6a7a8a', seed: 404, R });
  // ネオン看板
  neon(qf, 'カラオケ', -1.6, 3.2, 1.25, { fg: '#5ae0ff', R });
  neon(shib, 'ゲーム', 4.95, 3.6, -1.25, { fg: '#ffd84a', R, h: 1.4 });
  neon(shib, 'くすり', -2.95, 3.0, -1.35, { fg: '#ff6a5a', R, h: 1.3 });
  // センター街のゲート
  const cg = (R.centerGate = group(shib, -2.2, 0, 0.9));
  for (const s of [-1, 1]) add(cg, G.cyl(0.08, 0.08, 4.0, 8), mat('#8a8e96', { metalness: 0.4 }), 0, 2.0, s * 1.6);
  const cgm = new THREE.MeshStandardMaterial({ map: neonTex('センター街', { fg: '#ffffff', bg: '#c83a3a', vertical: false, w: 96, h: 384 }), emissive: '#ffffff', emissiveIntensity: 0.2 });
  cgm.emissiveMap = cgm.map;
  R.neonMats.push(cgm);
  add(cg, G.box(0.1, 0.6, 3.4), cgm, 0, 3.8, 0, { cast: false, rot: [0, Math.PI / 2, 0], scale: [1, 1, 1] });
  // ハチ公の像（犬の銅像。駅前広場）
  const hachi = (R.hachiko = group(root, -0.1, 0, 3.4, 0.3));
  add(hachi, G.box(0.9, 0.9, 0.7), mat('#9a948a', { flatShading: true }), 0, 0.45, 0);
  const brz = mat('#6a6050', { metalness: 0.5, roughness: 0.4 });
  add(hachi, G.sphere(0.24, 12, 10), brz, 0, 1.12, -0.05, { scale: [0.9, 0.9, 1.3] });
  add(hachi, G.sphere(0.16, 12, 10), brz, 0, 1.38, 0.24);
  for (const s of [-1, 1]) { add(hachi, G.cone(0.06, 0.12, 4), brz, s * 0.08, 1.54, 0.22, { rot: [0, Math.PI / 4, 0] }); add(hachi, G.cyl(0.04, 0.05, 0.3, 6), brz, s * 0.1, 1.04, 0.2); }
  add(hachi, G.sphere(0.07, 8, 6), brz, 0, 1.34, 0.4, { scale: [1, 0.8, 1] });
  add(hachi, G.box(0.3, 0.12, 0.02), mat('#d8c890'), 0, 0.6, 0.36, { cast: false });
  // 自動販売機（江戸の井戸のあと）
  const vm = (R.vending = group(root, 2.1, 0, 4.5));
  add(vm, G.box(1.0, 1.8, 0.7), mat('#f4f4f0', { roughness: 0.4 }), 0, 0.9, 0);
  add(vm, G.box(0.86, 0.9, 0.04), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8f0f8'; ctx.fillRect(0, 0, w, h);
    const cols = ['#d8402e', '#3a7ae8', '#4ab04a', '#f0c030', '#f4f4f0', '#8a5a3a', '#c83a8a', '#3ac8c8', '#f08a2a'];
    for (let i = 0; i < 9; i++) { const x = (i % 3) * 42 + 8, y = Math.floor(i / 3) * 42 + 4; ctx.fillStyle = cols[i]; ctx.fillRect(x + 6, y + 2, 14, 30); ctx.fillStyle = '#2a2a30'; ctx.font = '900 12px sans-serif'; ctx.fillText(String(i + 1), x + 24, y + 30); }
  }), emissive: '#ffffff', emissiveIntensity: 0.3 }), 0, 1.25, 0.36, { cast: false });
  R.vendGlow = vm.children[1].material;
  R.lampMats.push(R.vendGlow);
  add(vm, G.box(0.3, 0.12, 0.05), mat('#2a2a30'), 0.3, 0.35, 0.36, { cast: false });
  add(vm, G.box(0.6, 0.18, 0.05), mat('#2a2a30'), -0.1, 0.25, 0.36, { cast: false });
  // 足もとに残る、井戸の石の縁（ほんの少し）
  add(root, G.torus(0.62, 0.08, 4, 20, Math.PI * 0.9), mat('#8a8478', { flatShading: true }), 2.1, 0.04, 4.5, { rot: [Math.PI / 2, 0, 0.6], cast: false });
  // 喫茶店（江戸の茶店のあと）
  const cafe = (R.cafe = group(root, 5.6, 0, 4.4, -Math.PI / 2));
  add(cafe, G.box(2.4, 2.2, 1.8), new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.8 }), 0, 1.1, 0);
  const awn = canvasTex(128, 32, (ctx, w, h) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#2a6a4a' : '#f4f0e6'; ctx.fillRect(i * 16, 0, 16, h); } });
  add(cafe, G.box(2.6, 0.08, 0.8), new THREE.MeshStandardMaterial({ map: awn }), 0, 1.75, 1.2, { rot: [0.35, 0, 0] });
  add(cafe, G.box(1.8, 1.1, 0.04), new THREE.MeshStandardMaterial({ color: '#ffe0a8', emissive: '#ffb860', emissiveIntensity: 0.3 }), 0, 0.85, 0.91, { cast: false });
  R.lampMats.push(cafe.children[cafe.children.length - 1].material);
  const kn = new THREE.MeshStandardMaterial({ map: neonTex('純喫茶 つる', { fg: '#fff4d0', bg: '#4a2a1a', vertical: false, w: 96, h: 320 }), emissive: '#ffffff', emissiveIntensity: 0.25 });
  kn.emissiveMap = kn.map;
  R.neonMats.push(kn);
  add(cafe, G.box(1.6, 0.36, 0.05), kn, 0, 2.0, 0.92, { cast: false });
  for (const s of [-1, 1]) { add(cafe, G.cyl(0.3, 0.3, 0.05, 14), mat('#f4f0e6'), s * 0.7, 0.7, 1.8); add(cafe, G.cyl(0.03, 0.03, 0.7, 6), mat('#5a5e66'), s * 0.7, 0.35, 1.8); }
  // 信号（スクランブル交差点の四すみ）
  for (const [x, z, ry] of [[-0.8, -0.8, 0], [4.8, -0.8, -Math.PI / 2], [-0.8, 2.6, Math.PI / 2], [4.8, 2.6, Math.PI]]) trafficLight(root, x, z, ry, R);

  // ---------------- 交番（江戸の番所のあと）と踏切・信号（町木戸のあと） ----------------
  const koban = (R.koban = group(root, 11.6, 0, -2.4));
  add(koban, G.box(2.0, 2.2, 1.8), mat('#f4f4f0', { roughness: 0.5 }), 0, 1.1, 0);
  add(koban, G.box(2.2, 0.2, 2.0), mat('#5a6070'), 0, 2.3, 0);
  add(koban, G.box(1.0, 1.5, 0.05), new THREE.MeshStandardMaterial({ color: '#c8e0f0', emissive: '#f4f8ff', emissiveIntensity: 0.3, roughness: 0.1 }), -0.3, 0.9, 0.92, { cast: false });
  R.lampMats.push(koban.children[koban.children.length - 1].material);
  R.kobanLamp = glow('#ff2a1a', 1.0);
  add(koban, G.sphere(0.2, 12, 10), R.kobanLamp, 0, 2.6, 0.6);
  const kbn = new THREE.MeshStandardMaterial({ map: neonTex('交番 KOBAN', { fg: '#ffffff', bg: '#2a3a6a', vertical: false, w: 80, h: 300 }), emissive: '#ffffff', emissiveIntensity: 0.3 });
  kbn.emissiveMap = kbn.map;
  R.lampMats.push(kbn);
  add(koban, G.box(1.6, 0.36, 0.05), kbn, 0, 1.95, 0.92, { cast: false });
  // 踏切
  const fumi = (R.crossing = group(root, 10.2, 0, TRACK_Z));
  R.crossingArms = [];
  R.crossingLamps = [];
  for (const s of [-1, 1]) {
    const pz = s * 1.75;
    const g = group(fumi, s * 1.4, 0, pz);
    add(g, G.cyl(0.07, 0.07, 2.2, 8), mat('#e8e4d8'), 0, 1.1, 0);
    const stripe = canvasTex(32, 128, (ctx, w, h) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#1a1a1a' : '#f0c020'; ctx.fillRect(0, i * 16, w, 16); } });
    add(g, G.box(0.16, 0.9, 0.16), new THREE.MeshStandardMaterial({ map: stripe }), 0, 0.45, 0);
    add(g, G.box(0.6, 0.06, 0.06), mat('#2a2a30'), 0, 2.0, 0);
    for (const k of [-1, 1]) { const lm = glow('#ff2a1a', 0.1); R.crossingLamps.push(lm); add(g, G.circle(0.1, 12), lm, k * 0.24, 2.0, 0.05 * -s, { cast: false, rot: [0, s > 0 ? Math.PI : 0, 0] }); }
    add(g, G.box(0.42, 0.16, 0.04), mat('#f4f4f0'), 0, 2.35, 0, { rot: [0, 0, 0.5] });
    add(g, G.box(0.42, 0.16, 0.04), mat('#f4f4f0'), 0, 2.35, 0, { rot: [0, 0, -0.5] });
    const arm = group(g, 0, 0.9, 0);
    arm.userData.dynamic = true;
    const armTex = canvasTex(256, 16, (ctx, w, h) => { for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#1a1a1a' : '#f0c020'; ctx.fillRect(i * 16, 0, 16, h); } });
    add(arm, G.box(0.06, 0.06, 2.6), new THREE.MeshStandardMaterial({ map: armTex }), 0, 0, -s * 1.3);
    arm.rotation.x = -s * 1.35; // 上がっている
    R.crossingArms.push({ arm, s });
  }
  // 鉄道の信号（終点の手前）
  const sig = (R.railSignal = group(root, 13.6, 0, TRACK_Z - 1.6));
  add(sig, G.cyl(0.07, 0.08, 3.2, 8), mat('#6a6e76'), 0, 1.6, 0);
  add(sig, G.box(0.5, 1.0, 0.3), mat('#2a2a30'), 0, 3.2, 0);
  R.sigRed = glow('#ff2a1a', 1.6);
  R.sigGreen = glow('#3ae07a', 0.05);
  add(sig, G.circle(0.14, 14), R.sigRed, 0, 3.45, 0.16, { cast: false });
  add(sig, G.circle(0.14, 14), R.sigGreen, 0, 3.0, 0.16, { cast: false });

  // ---------------- 東京タワー（江戸の火の見やぐらのあと） ----------------
  const tw = (R.tower = group(root, TOWER.x, 0, TOWER.z));
  const orange = mat('#f05a28', { roughness: 0.5 });
  const white = mat('#f4f2ec', { roughness: 0.5 });
  const H = 22, B = 2.6;
  const legAt = (y) => { const k = y / 15; return B * Math.pow(1 - Math.min(1, k), 1.35) + 0.45 * Math.min(1, k); };
  R.towerLightMat = glow('#ffb04a', 0.0);
  const lvls = [0, 1.6, 3.4, 5.4, 7.6, 9.0, 10.6, 12.4, 14.4];
  for (let i = 0; i < lvls.length - 1; i++) {
    const y0 = lvls[i], y1 = lvls[i + 1];
    const a0 = legAt(y0), a1 = legAt(y1);
    const m = i % 2 ? white : orange;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      seg(tw, new THREE.Vector3(sx * a0, y0, sz * a0), new THREE.Vector3(sx * a1, y1, sz * a1), 0.22 - i * 0.015, m);
    }
    // 筋交い（四面）
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      seg(tw, new THREE.Vector3(ax * a0, y0, az * a0), new THREE.Vector3(bx * a1, y1, bz * a1), 0.07, m, false);
      seg(tw, new THREE.Vector3(bx * a0, y0, bz * a0), new THREE.Vector3(ax * a1, y1, az * a1), 0.07, m, false);
      seg(tw, new THREE.Vector3(ax * a1, y1, az * a1), new THREE.Vector3(bx * a1, y1, bz * a1), 0.09, m, false);
    }
    // ライトアップの点
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(tw, G.sphere(0.09, 6, 4), R.towerLightMat, sx * (a1 + 0.08), y1, sz * (a1 + 0.08), { cast: false });
  }
  // 足もとのアーチ
  for (const ry of [0, Math.PI / 2]) {
    const arch = new THREE.TorusGeometry(1.6, 0.12, 6, 20, Math.PI);
    for (const s of [-1, 1]) add(tw, arch, orange, 0, 0, s * B * 0.92, { rot: [0, ry, 0] });
  }
  // 足もとのビル（フットタウン）
  building(tw, 0, 0, 4.2, 3.0, 1.8, { wall: '#e8e4dc', glass: '#7a90a8', seed: 501, R, roof: false });
  // 大展望台と特別展望台
  const deck = new THREE.MeshStandardMaterial({ color: '#f4f2ec', emissive: '#fff0c8', emissiveIntensity: 0, roughness: 0.4 });
  R.winMats.push(deck);
  add(tw, G.box(2.2, 1.0, 2.2), deck, 0, 9.2, 0);
  add(tw, G.box(2.0, 0.5, 2.0), mat('#5a7aa0', { roughness: 0.1 }), 0, 9.25, 0, { scale: [1.12, 1, 1.12], cast: false });
  add(tw, G.box(1.2, 0.6, 1.2), deck, 0, 14.6, 0);
  // アンテナ
  for (let i = 0; i < 4; i++) add(tw, G.cyl(0.18 - i * 0.03, 0.22 - i * 0.03, 2.0, 8), i % 2 ? white : orange, 0, 15.9 + i * 2.0, 0);
  add(tw, G.cyl(0.03, 0.06, 1.2, 6), white, 0, 23.4, 0);
  const tipM = glow('#ff2a1a', 1.0);
  R.beacons.push(tipM);
  add(tw, G.sphere(0.12, 8, 6), tipM, 0, 24.0, 0, { cast: false });
  R.towerTop = new THREE.Vector3(TOWER.x, 9.9, TOWER.z + 1.2);

  // ---------------- 水上バス乗り場（江戸の渡し場のあと）と水上バス ----------------
  const pier = (R.pier = group(root, 8.0, 0, RIVER_Z0 - 0.3));
  add(pier, G.box(2.6, 0.2, 1.6), mat('#8a8e96'), 0, 0.4, 0.2);
  add(pier, G.box(2.8, 0.1, 1.8), mat('#4a6a8a'), 0, 2.2, 0.2);
  for (const [x, z] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.9], [1.2, 0.9]]) add(pier, G.cyl(0.05, 0.05, 1.8, 6), mat('#8a8e96'), x, 1.3, z);
  const pn = new THREE.MeshStandardMaterial({ map: neonTex('水上バス のりば', { fg: '#ffffff', bg: '#2a6ab0', vertical: false, w: 96, h: 340 }), emissive: '#ffffff', emissiveIntensity: 0.2 });
  pn.emissiveMap = pn.map;
  R.lampMats.push(pn);
  add(pier, G.box(2.2, 0.36, 0.05), pn, 0, 2.48, 1.1, { cast: false });
  // 時刻表と潮見表の看板
  R.timetable = group(root, 6.6, 0, RIVER_Z0 - 1.1);
  add(R.timetable, G.cyl(0.04, 0.04, 1.3, 6), mat('#5a6070'), 0, 0.65, 0);
  add(R.timetable, G.box(0.8, 0.6, 0.05), mat('#f4f4f0'), 0, 1.3, 0);
  add(R.timetable, G.box(0.7, 0.5, 0.02), new THREE.MeshStandardMaterial({ map: canvasTex(128, 96, (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2a6ab0'; ctx.fillRect(0, 0, w, 18); ctx.fillStyle = '#2a2a30'; for (let i = 0; i < 5; i++) ctx.fillRect(10, 26 + i * 13, 100 - (i % 2) * 20, 5); }) }), 0, 1.3, 0.04, { cast: false });
  R.tideBoard = group(root, 9.6, 0, RIVER_Z0 - 1.1);
  add(R.tideBoard, G.cyl(0.04, 0.04, 1.3, 6), mat('#5a6070'), 0, 0.65, 0);
  add(R.tideBoard, G.box(0.8, 0.6, 0.05), new THREE.MeshStandardMaterial({ map: canvasTex(128, 96, (ctx, w, h) => { ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x < w; x++) ctx.lineTo(x, 50 + Math.sin(x / 14) * 22); ctx.stroke(); ctx.fillStyle = '#2a2a30'; ctx.font = '900 16px sans-serif'; ctx.fillText('潮見表', 36, 18); }) }), 0, 1.3, 0);
  const wb = (R.waterBus = group(root, 8.0, 0.08, 7.75));
  wb.userData.dynamic = true;
  const hull = new THREE.SphereGeometry(1, 24, 12);
  add(wb, hull, mat('#d8dce4', { roughness: 0.2, metalness: 0.4 }), 0, 0.3, 0, { scale: [2.0, 0.5, 0.75] });
  add(wb, hull, mat('#5aa0d8', { roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8 }), -0.2, 0.62, 0, { scale: [1.5, 0.45, 0.62] });
  add(wb, G.box(3.2, 0.06, 1.2), mat('#a8b0bc', { metalness: 0.4 }), 0, 0.32, 0, { cast: false });
  const wbl = glow('#9ae0ff', 0.2);
  R.lampMats.push(wbl);
  add(wb, G.box(3.0, 0.05, 1.42), wbl, 0, 0.36, 0, { cast: false });
  // 屋形船
  yakatabune(root, -20.5, 7.5, 0.05, R);
  yakatabune(root, 21.0, 7.6, Math.PI - 0.05, R);
  yakatabune(root, 14.0, 16.0, 0.4, R);

  // ---------------- 太鼓橋（江戸のまま。首都高の高架のわき） ----------------
  const br = (R.bridge = group(root, 2.0, 0, (RIVER_Z0 + RIVER_Z1) / 2));
  const archPts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; archPts.push(new THREE.Vector3(0, 0.25 + Math.sin(t * Math.PI) * 0.9, -1.8 + t * 3.6)); }
  const deckM = new THREE.MeshStandardMaterial({ map: planksTex('#8a6a4a', '#5a3a26', 10), roughness: 0.9 });
  for (let i = 0; i < 16; i++) {
    const a = archPts[i], b = archPts[i + 1];
    const m = add(br, G.box(1.6, 0.12, a.distanceTo(b) + 0.02), deckM, 0, (a.y + b.y) / 2, (a.z + b.z) / 2);
    m.rotation.x = -Math.atan2(b.y - a.y, b.z - a.z);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 16; i += 2) add(br, G.box(0.08, 0.5, 0.08), mat('#c8402e'), s * 0.78, archPts[i].y + 0.25, archPts[i].z);
    add(br, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts.map((p) => p.clone().add(new THREE.Vector3(s * 0.78, 0.5, 0)))), 24, 0.04, 5), mat('#c8402e'), 0, 0, 0);
    for (const k of [0, 16]) add(br, G.sphere(0.09, 8, 6), mat('#c8a040', { metalness: 0.5 }), s * 0.78, archPts[k].y + 0.58, archPts[k].z, { cast: false });
  }
  // 十手（川底。タワーに灯りがともると見える）
  const jit = (R.jitte = group(root, 2.7, 0.07, 7.9));
  jit.userData.dynamic = true;
  add(jit, G.cyl(0.03, 0.03, 0.62, 6), mat('#9aa4b0', { metalness: 0.6, roughness: 0.3, emissive: '#5a6a7a', emissiveIntensity: 0.3 }), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
  add(jit, G.box(0.04, 0.03, 0.18), mat('#9aa4b0', { metalness: 0.6 }), 0.1, 0, 0.07, { cast: false });
  add(jit, G.sphere(0.05, 6, 4), mat('#c8382e'), -0.32, 0, 0);
  R.jitteGlint = add(jit, G.sphere(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff4c0', transparent: true, opacity: 0, depthWrite: false }), 0.1, 0.1, 0, { cast: false });
  R.jitteGlint.userData.keep = true;
  jit.visible = false;

  // ---------------- 首都高（川ぞいの高架） ----------------
  const hw = (R.highway = group(root));
  hw.userData.dynamic = true;
  // 手前から街をのぞくときに透けるよう、首都高だけのマテリアルにする
  const hwM = (c) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, transparent: true, opacity: 1 }); R.hwMats.push(m); return m; };
  const hwDeck = hwM('#a8a49c'), hwWall = hwM('#c8c4bc'), hwPier = hwM('#9a968e'), hwLine = hwM('#f4f0e0');
  add(hw, G.box(59.6, 0.45, HW.w), hwDeck, 0, HW.y, HW.z);
  for (const s of [-1, 1]) add(hw, G.box(59.6, 0.5, 0.14), hwWall, 0, HW.y + 0.45, HW.z + s * (HW.w / 2 - 0.07));
  for (let x = -27; x <= 27; x += 6) { add(hw, G.cyl(0.32, 0.36, HW.y, 10), hwDeck, x, HW.y / 2, HW.z); add(hw, G.box(0.9, 0.5, HW.w), hwPier, x, HW.y - 0.4, HW.z); }
  add(hw, G.box(59.6, 0.03, 0.06), hwLine, 0, HW.y + 0.24, HW.z, { cast: false });
  // 緑の案内標識と電光掲示板
  const hs = group(hw, -8, HW.y + 0.25, HW.z);
  add(hs, G.box(0.1, 1.8, 0.1), hwPier, 0, 0.9, -1.0);
  const hsm = new THREE.MeshStandardMaterial({ map: canvasTex(384, 128, (ctx, w, h) => { ctx.fillStyle = '#2a7a4a'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 40px ${FONT}`; ctx.fillText('← 浅草　　渋谷 →', w / 2, h / 2 - 12); ctx.font = `700 22px ${FONT}`; ctx.fillText('首都高速', w / 2, h - 26); }), emissive: '#ffffff', emissiveIntensity: 0.1 });
  hsm.emissiveMap = hsm.map;
  hsm.transparent = true;
  R.hwMats.push(hsm);
  add(hs, G.box(2.4, 0.8, 0.06), hsm, 0, 1.9, -1.0, { cast: false });
  R.ledCanvas = document.createElement('canvas'); R.ledCanvas.width = 512; R.ledCanvas.height = 96;
  R.ledTex = new THREE.CanvasTexture(R.ledCanvas); R.ledTex.colorSpace = THREE.SRGBColorSpace;
  R.ledMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: R.ledTex, emissiveIntensity: 1.0, transparent: true });
  R.hwMats.push(R.ledMat);
  const led = (R.led = group(hw, 6, HW.y + 0.25, HW.z));
  add(led, G.box(0.1, 1.8, 0.1), hwPier, -1.4, 0.9, 1.0);
  add(led, G.box(0.1, 1.8, 0.1), hwPier, 1.4, 0.9, 1.0);
  add(led, G.box(3.0, 0.6, 0.1), hwM('#1a1a20'), 0, 1.85, 1.0);
  add(led, G.box(2.8, 0.48, 0.02), R.ledMat, 0, 1.85, 1.06, { cast: false });
  // 高架の上の車（index.js で走らせる）
  R.hwCars = [];
  const carCols = ['#f4f4f0', '#2a2a30', '#d8402e', '#3a5a9a', '#f0c030', '#9aa0aa'];
  for (let i = 0; i < 10; i++) {
    const lane = i % 2 ? 0.5 : -0.5;
    const c = car(far, 0, HW.y + 0.22, HW.z + lane, lane > 0 ? Math.PI : 0, carCols[i % carCols.length], i % 4 === 2);
    c.scale.setScalar(0.85);
    c.userData.dynamic = true;
    R.hwCars.push({ g: c, dir: lane > 0 ? -1 : 1, x: -30 + i * 6.3, v: 3 + (i % 3) });
  }
  // 大通りの車
  R.roadCars = [];
  for (let i = 0; i < 5; i++) {
    const lane = i % 2 ? 1.6 : 0.2;
    const c = car(far, 0, 0, lane, lane > 1 ? Math.PI : 0, i === 0 || i === 3 ? '#f0c030' : carCols[(i + 2) % 6], i === 0 || i === 3);
    c.scale.setScalar(0.85);
    c.userData.dynamic = true;
    const minX = i < 2 ? -29 : -4.6, maxX = i < 2 ? -18 : 29;
    R.roadCars.push({ g: c, dir: lane > 1 ? -1 : 1, x: minX + (i + 0.5) / 5 * (maxX - minX), minX, maxX, v: 2.2 });
  }

  // ---------------- 東京駅（赤レンガの駅舎・終点） ----------------
  const st = (R.station = group(root, STATION.x, 0, STATION.z));
  const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.85 });
  add(st, G.box(13, 3.6, 3.0), brick, 0, 1.8, 0);
  for (const y of [1.1, 2.4, 3.55]) add(st, G.box(13.1, 0.12, 3.1), mat('#f0ece2'), 0, y, 0);
  add(st, G.box(13.2, 0.3, 3.2), mat('#4a5a5a'), 0, 3.75, 0);
  // 窓
  const stWin = new THREE.MeshStandardMaterial({ color: '#f4f0e6', emissive: '#ffe0a0', emissiveIntensity: 0, roughness: 0.4 });
  R.winMats.push(stWin);
  for (let i = 0; i < 18; i++) for (const y of [1.7, 3.0]) add(st, G.box(0.26, 0.5, 0.04), stWin, -6.0 + i * 0.7, y, 1.51, { cast: false });
  // ドーム（南北）
  for (const s of [-1, 1]) {
    const dm = group(st, s * 5.6, 0, 0);
    add(dm, G.box(2.6, 4.4, 3.4), brick, 0, 2.2, 0);
    add(dm, G.cyl(1.25, 1.35, 0.8, 8), mat('#f0ece2'), 0, 4.8, 0);
    add(dm, G.sphere(1.3, 24, 16), mat('#4a6a6a', { roughness: 0.6 }), 0, 5.2, 0, { scale: [1, 0.9, 1] });
    add(dm, G.cyl(0.08, 0.12, 0.8, 6), mat('#4a6a6a'), 0, 6.6, 0);
    add(dm, G.box(1.2, 1.6, 0.05), new THREE.MeshStandardMaterial({ color: '#f4f0e6', emissive: '#ffe0a0', emissiveIntensity: 0 }), 0, 1.0, 1.71, { cast: false });
    R.winMats.push(dm.children[dm.children.length - 1].material);
  }
  // まんなかの入口と駅名
  add(st, G.box(2.4, 4.4, 3.3), brick, 0, 2.2, 0);
  add(st, G.cone(1.6, 1.1, 4), mat('#4a5a5a'), 0, 4.9, 0, { rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.9] });
  const stn = new THREE.MeshStandardMaterial({ map: neonTex('東京駅', { fg: '#f4f0e6', bg: '#4a3a2a', vertical: false, w: 80, h: 240 }), emissive: '#ffffff', emissiveIntensity: 0.15 });
  stn.emissiveMap = stn.map;
  R.lampMats.push(stn);
  add(st, G.box(1.6, 0.4, 0.05), stn, 0, 3.4, 1.66, { cast: false });
  addTokyoStationDetails(st, R);
  // 駅のホーム（駅舎のうら）
  add(root, G.box(14, FLOOR, 1.6), platTile, STATION.x, FLOOR / 2, TRACK_Z + 2.0);
  add(root, G.box(14.1, 0.06, 0.32), mat('#f0d040'), STATION.x, FLOOR + 0.03, TRACK_Z + 1.3);
  // 駅前広場：タクシーとバス
  car(root, 17.6, 0, 5.6, 0.0, '#f0c030', true);
  car(root, 19.6, 0, 5.6, 0.0, '#2a2a30', true);
  car(root, 24.4, 0, 5.6, 0.0, '#f0c030', true);
  const bus = group(root, 27.0, 0, 5.6);
  add(bus, G.box(3.4, 1.2, 1.0), mat('#f4f4f0', { roughness: 0.4 }), 0, 0.8, 0);
  add(bus, G.box(3.42, 0.2, 1.02), mat('#3a7ae8'), 0, 0.45, 0);
  add(bus, G.box(3.0, 0.4, 1.04), new THREE.MeshStandardMaterial({ color: '#2a3a4a', emissive: '#fff0c8', emissiveIntensity: 0 }), 0, 1.0, 0, { cast: false });
  R.winMats.push(bus.children[bus.children.length - 1].material);
  for (const s of [-1, 1]) for (const k of [-1, 1]) add(bus, G.cyl(0.2, 0.2, 0.12, 10), mat('#1a1a20'), s * 1.1, 0.2, k * 0.5, { rot: [Math.PI / 2, 0, 0] });
  // 丸の内のビルは奥へ置き、駅前と再会の仲間を手前から隠さない。
  building(root, 25.0, -20.5, 3.0, 2.0, 6.0, { wall: '#d8d0c4', glass: '#6a7a90', seed: 601, R });
  building(root, 21.0, -13.8, 2.6, 3.0, 9.0, { wall: '#c8ccd4', glass: '#4a6a8a', seed: 602, R });

  // ---------------- 秋葉原（左） ----------------
  const aki = (R.akiba = group(root));
  const akiB = [
    [-27.8, -2.6, 2.6, 2.4, 7.5, '#d8d0c4'], [-24.8, -2.6, 2.6, 2.4, 9.0, '#c8ccd4'], [-21.8, -2.6, 2.6, 2.4, 6.5, '#e0d8cc'], [-18.9, -2.6, 2.4, 2.4, 8.0, '#bcc4cc'],
    [-27.6, 4.6, 3.0, 2.6, 6.0, '#c8c0b4'], [-19.2, 4.6, 3.0, 2.6, 7.0, '#d0d4dc'],
  ];
  akiB.forEach(([x, z, w, d, h, wall], i) => building(aki, x, z, w, d, h, { wall, glass: '#5a6a8a', seed: 700 + i, lit: 0.7, R }));
  const akiSigns = [['アキバ', '#ff5aa0'], ['でんき', '#5ae0ff'], ['アニメ', '#ffd84a'], ['ゲーム', '#8aff6a'], ['カード', '#ff8a3a'], ['フィギュア', '#c08aff']];
  akiSigns.forEach(([t, c], i) => {
    const [x, z, w, d, h] = akiB[i];
    neon(aki, t, x + w / 2 - 0.3, Math.min(h - 1.2, 4.8), z + d / 2 + 0.1, { fg: c, h: 2.4, w: 0.55, R });
  });
  // ゲームセンター（ガラスの店先とUFOキャッチャー）
  const gc = (R.gameCenter = group(aki, -23.4, 0, 4.6, Math.PI));
  add(gc, G.box(4.4, 3.6, 2.6), mat('#3a2a5a'), 0, 1.8, 0);
  add(gc, G.box(4.0, 2.0, 0.05), new THREE.MeshStandardMaterial({ color: '#c8e0f8', roughness: 0.05, transparent: true, opacity: 0.35 }), 0, 1.1, -1.32, { cast: false });
  for (let i = 0; i < 3; i++) {
    const u = group(gc, -1.2 + i * 1.2, 0, -0.7);
    add(u, G.box(0.9, 0.9, 0.8), mat(['#ff5aa0', '#5ae0ff', '#ffd84a'][i], { roughness: 0.3 }), 0, 0.45, 0);
    add(u, G.box(0.86, 0.9, 0.76), mat('#e8f4ff', { roughness: 0.05, transparent: true, opacity: 0.4 }), 0, 1.35, 0, { cast: false });
    for (let k = 0; k < 4; k++) add(u, G.sphere(0.1, 8, 6), mat(['#f4b8cc', '#8ac8ff', '#ffe08a', '#c8f0a8'][k]), -0.2 + (k % 2) * 0.35, 1.0, -0.15 + Math.floor(k / 2) * 0.3, { cast: false });
    const ul = glow(['#ff5aa0', '#5ae0ff', '#ffd84a'][i], 0.2);
    R.neonMats.push(ul);
    add(u, G.box(0.9, 0.12, 0.8), ul, 0, 1.86, 0, { cast: false });
  }
  const gcn = new THREE.MeshStandardMaterial({ map: neonTex('GAME', { fg: '#ff5aa0', bg: '#1a1424', vertical: false, w: 96, h: 300 }), emissive: '#ffffff', emissiveIntensity: 0.2 });
  gcn.emissiveMap = gcn.map;
  R.neonMats.push(gcn);
  add(gc, G.box(3.0, 0.7, 0.08), gcn, 0, 3.0, -1.35, { cast: false, rot: [0, Math.PI, 0] });
  // ガチャガチャのならび
  for (let i = 0; i < 6; i++) {
    const gg = group(aki, -26.2 + i * 0.6, 0, 3.0);
    add(gg, G.box(0.5, 0.7, 0.45), mat(['#d8402e', '#3a7ae8', '#f0c030', '#4ab04a', '#c83a8a', '#f08a2a'][i], { roughness: 0.3 }), 0, 0.35, 0);
    add(gg, G.sphere(0.21, 12, 8), mat('#e8f4ff', { roughness: 0.05, transparent: true, opacity: 0.5 }), 0, 0.92, 0, { cast: false });
    for (let k = 0; k < 3; k++) add(gg, G.sphere(0.07, 6, 4), mat(['#f4b8cc', '#8ac8ff', '#ffe08a'][k]), -0.07 + k * 0.07, 0.85, 0.02, { cast: false });
  }
  // 電気街のアーチ
  const ag = group(aki, -16.1, 0, -4.0);
  for (const s of [-1, 1]) add(ag, G.cyl(0.08, 0.08, 4.2, 8), mat('#8a8e96'), s * 1.5, 2.1, 0);
  const agm = new THREE.MeshStandardMaterial({ map: neonTex('秋葉原電気街', { fg: '#ffffff', bg: '#2a5ac8', vertical: false, w: 80, h: 384 }), emissive: '#ffffff', emissiveIntensity: 0.25 });
  agm.emissiveMap = agm.map;
  R.neonMats.push(agm);
  add(ag, G.box(3.4, 0.6, 0.08), agm, 0, 4.0, 0, { cast: false, rot: [0, Math.PI / 2, 0] });
  ag.rotation.y = Math.PI / 2;
  // 歩道橋（中央通りをまたぐ）
  const fb = (R.footbridge = group(root, -16.1, 0, 4.4));
  add(fb, G.box(3.8, 0.2, 1.1), mat('#5a7aa0'), 0, 2.8, 0);
  for (const s of [-1, 1]) {
    add(fb, G.box(3.8, 0.5, 0.06), mat('#5a7aa0'), 0, 3.15, s * 0.52);
    add(fb, G.box(0.2, 2.8, 0.2), mat('#5a7aa0'), s * 1.9, 1.4, 0);
    const stair = add(fb, G.box(0.9, 0.12, 3.4), mat('#5a7aa0'), s * 2.4, 1.4, -1.1, { rot: [0.9, 0, 0] });
    void stair;
  }

  // ---------------- 上野公園（左手前） ----------------
  const ueno = (R.ueno = group(root));
  const pond = new THREE.Shape();
  pond.absellipse(0, 0, 4.4, 3.2, 0, Math.PI * 2);
  add(ueno, new THREE.ShapeGeometry(pond, 32), water, -23.4, 0.04, 17.0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  // はすの葉
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 3.6; add(ueno, G.circle(0.22 + r() * 0.12, 10), mat('#4a8a3a', { side: THREE.DoubleSide }), -23.4 + Math.cos(a) * rr * 1.1, 0.06, 17 + Math.sin(a) * rr * 0.75, { rot: [-Math.PI / 2, 0, 0], cast: false }); }
  // スワンボート
  for (const [x, z, ry] of [[-24.6, 16.2, 0.4], [-21.8, 17.8, 2.4]]) {
    const sb = group(ueno, x, 0.05, z, ry);
    add(sb, G.box(0.9, 0.3, 0.6), mat('#f4f4f0'), 0, 0.15, 0);
    add(sb, G.cyl(0.08, 0.1, 0.6, 8), mat('#f4f4f0'), 0.42, 0.55, 0, { rot: [0, 0, 0.3] });
    add(sb, G.sphere(0.12, 10, 8), mat('#f4f4f0'), 0.5, 0.88, 0);
    add(sb, G.cone(0.04, 0.12, 6), mat('#f08a2a'), 0.62, 0.86, 0, { rot: [0, 0, -Math.PI / 2] });
  }
  // 動物園の門とパンダの看板
  const zoo = group(ueno, -27.0, 0, 13.4);
  for (const s of [-1, 1]) add(zoo, G.box(0.5, 2.6, 0.5), mat('#e8dcc8'), s * 1.5, 1.3, 0);
  const zn = new THREE.MeshStandardMaterial({ map: neonTex('上野どうぶつえん', { fg: '#2a2a30', bg: '#fbf6e8', vertical: false, w: 80, h: 384 }) });
  add(zoo, G.box(3.6, 0.5, 0.2), zn, 0, 2.6, 0);
  // 盆おどりのやぐら（夏まつり）
  const yag = (R.yagura = group(ueno, -20.4, 0, 13.6));
  add(yag, G.box(2.0, 1.4, 2.0), mat('#8a5a3a'), 0, 0.7, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(yag, G.cyl(0.06, 0.06, 2.6, 6), mat('#6a4a32'), x * 0.9, 1.3, z * 0.9);
  add(yag, G.box(2.4, 0.12, 2.4), mat('#c8402e'), 0, 2.6, 0);
  add(yag, G.box(2.1, 0.5, 0.04), mat('#fbf6e8'), 0, 1.2, 1.02, { cast: false });
  R.yaguraLamps = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const lm = glow(i % 2 ? '#ff5a3a' : '#fff0c8', 0.1);
    R.yaguraLamps.push(lm);
    R.lampMats.push(lm);
    add(yag, G.sphere(0.1, 8, 6), lm, Math.cos(a) * 3.2, 2.6 - Math.abs(Math.sin(a * 2)) * 0.3, Math.sin(a) * 3.2, { scale: [1, 1.3, 1], cast: false });
  }
  // 木（夏の緑と、少しだけ桜）
  for (const [x, z, s, pink] of [[-28.6, 20.6, 1.2, false], [-25.6, 21.0, 1.0, false], [-19.0, 20.8, 1.1, false], [-18.0, 17.2, 1.0, true], [-28.8, 15.6, 1.0, false], [-28.4, 11.8, 0.9, true], [-22.0, 12.6, 0.8, false]]) tree(ueno, x, z, { s, pink });
  // 川ぞいの桜並木（隅田川）
  for (let x = -28; x <= -16; x += 2.4) tree(root, x, 5.7, { s: 0.8, pink: true });

  // ---------------- 下町（手前） ----------------
  const shita = (R.shitamachi = group(root));
  // 銭湯（えんとつ）
  const sento = group(shita, -11.2, 0, 15.6);
  add(sento, G.box(3.6, 2.4, 2.6), mat('#e8dcc8'), 0, 1.2, 0);
  gableRoof(sento, 0, 2.4, 0, 3.6, 2.6, { pitch: 0.45, color: '#3a3a44' });
  add(sento, G.cyl(0.3, 0.4, 7.0, 12), mat('#c8c4bc'), 1.4, 3.5, -0.8);
  add(sento, G.box(1.4, 0.8, 0.02), mat('#2b3a6a'), 0, 1.2, 1.31, { cast: false });
  const sn = new THREE.MeshStandardMaterial({ map: neonTex('松の湯', { fg: '#fbf6e8', bg: '#2a1a14', vertical: false, w: 80, h: 240 }), emissive: '#ffffff', emissiveIntensity: 0.15 });
  sn.emissiveMap = sn.map;
  R.lampMats.push(sn);
  add(sento, G.box(1.4, 0.4, 0.05), sn, 0, 2.15, 1.32, { cast: false });
  // 家なみ（2階建て）
  const houseC = ['#e8dcc8', '#d8d0c0', '#c8d0d8', '#e0d4c4', '#d0c8b8'];
  [[-4.4, 15.2], [-1.6, 15.6], [1.6, 15.2], [-4.4, 19.4], [-1.4, 19.8], [-11.2, 19.8], [-13.6, 19.2]].forEach(([x, z], i) => {
    const h = group(shita, x, 0, z, i % 2 ? 0.05 : -0.05);
    add(h, G.box(2.4, 3.2, 2.2), mat(houseC[i % 5]), 0, 1.6, 0);
    gableRoof(h, 0, 3.2, 0, 2.4, 2.2, { pitch: 0.45, color: ['#3a3a44', '#5a3a2a', '#3a4a5a'][i % 3] });
    const wmm = new THREE.MeshStandardMaterial({ color: '#c8d8e8', emissive: '#ffe0a0', emissiveIntensity: 0, roughness: 0.2 });
    R.winMats.push(wmm);
    add(h, G.box(0.8, 0.6, 0.04), wmm, -0.5, 2.3, 1.11, { cast: false });
    add(h, G.box(0.6, 1.1, 0.04), mat('#6a4a32'), 0.55, 0.55, 1.11, { cast: false });
    add(h, G.cyl(0.18, 0.14, 0.3, 10), mat('#a8603a'), -0.9, 0.15, 1.35);
    add(h, G.sphere(0.24, 10, 8), mat('#4a8a3a'), -0.9, 0.45, 1.35);
  });
  // 赤ちょうちんの居酒屋
  const izk = group(shita, -7.8, 0, 13.6);
  add(izk, G.box(1.0, 0.6, 0.02), mat('#2a2a3a'), 0, 1.5, 0.95, { cast: false });
  add(izk, G.box(2.2, 2.4, 1.8), mat('#5a3a2a'), 0, 1.2, 0);
  for (const s of [-1, 1]) { const lm = glow('#ff4a2a', 0.4); R.lampMats.push(lm); add(izk, G.sphere(0.22, 10, 8), lm, s * 0.8, 1.9, 1.05, { scale: [1, 1.35, 1], cast: false }); }
  // コンビニ
  const conv = (R.conbini = group(shita, 1.2, 0, 12.0 + 1.6));
  add(conv, G.box(3.4, 2.4, 2.4), mat('#f4f4f0'), 0, 1.2, 0);
  const cstripe = canvasTex(256, 32, (ctx, w, h) => { ctx.fillStyle = '#3a7ae8'; ctx.fillRect(0, 0, w, h / 3); ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, h / 3, w, h / 3); ctx.fillStyle = '#4ab04a'; ctx.fillRect(0, (2 * h) / 3, w, h / 3); });
  add(conv, G.box(3.42, 0.36, 2.42), new THREE.MeshStandardMaterial({ map: cstripe, emissive: '#ffffff', emissiveMap: cstripe, emissiveIntensity: 0.1 }), 0, 2.1, 0, { cast: false });
  R.lampMats.push(conv.children[conv.children.length - 1].material);
  add(conv, G.box(3.0, 1.4, 0.04), new THREE.MeshStandardMaterial({ color: '#e8f4ff', emissive: '#f4f8ff', emissiveIntensity: 0.4 }), 0, 0.9, 1.21, { cast: false });
  R.lampMats.push(conv.children[conv.children.length - 1].material);
  // ポストと自転車
  const post = group(shita, -2.9, 0, 12.9);
  add(post, G.box(0.4, 1.0, 0.36), mat('#d8302a', { roughness: 0.4 }), 0, 0.5, 0);
  add(post, G.box(0.44, 0.08, 0.4), mat('#d8302a'), 0, 1.04, 0);
  bicycle(shita, -6.0, 13.2, 0.2);
  bicycle(shita, -5.3, 13.4, 0.15, '#3a7ae8');
  bicycle(shita, 3.4, 12.9, -0.2, '#f4f4f0');
  // 電柱と電線（下町の路地）
  const pts = [[-14, 13.0], [-9.6, 13.0], [-5.2, 13.0], [-0.8, 13.0], [3.6, 13.0]].map(([x, z]) => pole(shita, x, z));
  wires(shita, pts);
  const pts2 = [[-29, 1.2 + 1.6], [-24.5, 2.8], [-20, 2.8]].map(([x, z]) => pole(aki, x, z));
  wires(aki, pts2);

  // ---------------- お台場（右手前）：レインボーブリッジと丸い展望台のビル ----------------
  const od = (R.odaiba = group(root));
  const rbA = new THREE.Vector3(5.2, 2.6, 21.2), rbB = new THREE.Vector3(29.6, 2.6, 14.4);
  const rbDir = rbB.clone().sub(rbA);
  const rbLen = rbDir.length();
  const rb = group(od, rbA.x, 0, rbA.z);
  rb.rotation.y = -Math.atan2(rbDir.z, rbDir.x);
  add(rb, G.box(rbLen, 0.3, 1.4), mat('#e8e8ec'), rbLen / 2, 2.6, 0);
  for (const s of [-1, 1]) add(rb, G.box(rbLen, 0.25, 0.08), mat('#c8ccd4'), rbLen / 2, 2.85, s * 0.66);
  R.rainbowMats = [];
  for (const tx of [rbLen * 0.3, rbLen * 0.7]) {
    for (const s of [-1, 1]) add(rb, G.box(0.36, 7.2, 0.36), mat('#f4f4f0'), tx, 3.6, s * 0.7);
    add(rb, G.box(0.36, 0.5, 1.8), mat('#f4f4f0'), tx, 6.6, 0);
    add(rb, G.box(0.36, 0.4, 1.8), mat('#f4f4f0'), tx, 3.4, 0);
  }
  // ケーブル（つり橋）とライト
  for (const s of [-1, 1]) {
    const cp = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30, x = t * rbLen;
      const t1 = rbLen * 0.3, t2 = rbLen * 0.7;
      let y;
      if (x < t1) y = 2.9 + (x / t1) * (x / t1) * 4.1;
      else if (x > t2) y = 2.9 + ((rbLen - x) / (rbLen - t2)) ** 2 * 4.1;
      else { const u = (x - t1) / (t2 - t1); y = 7.0 - Math.sin(u * Math.PI) * 3.6; }
      cp.push(new THREE.Vector3(x, y, s * 0.7));
    }
    add(rb, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), 60, 0.06, 5), mat('#f4f4f0'), 0, 0, 0, { cast: false });
    cp.forEach((p, i) => {
      if (i % 3) return;
      add(rb, G.box(0.02, Math.max(0.05, p.y - 2.9), 0.02), mat('#d8d8dc'), p.x, (p.y + 2.9) / 2, p.z, { cast: false });
      const lm = glow(['#ff6a8a', '#ffd84a', '#5ae0ff', '#8aff6a', '#c08aff'][i % 5], 0.0);
      R.rainbowMats.push(lm);
      add(rb, G.sphere(0.07, 6, 4), lm, p.x, p.y + 0.08, p.z, { cast: false });
    });
  }
  for (let x = -0.5; x > -3; x -= 1.2) add(rb, G.box(1.4, 0.3, 1.4), mat('#e8e8ec'), x, 2.6 - (-x) * 0.6, 0);
  // 丸い展望台のビル（小さな島の上）
  const sph = group(od, 23.8, 0, 18.4);
  add(sph, G.box(4.6, 0.4, 3.6), mat('#c8c4bc'), 0, 0.2, 0);
  for (const s of [-1, 1]) add(sph, G.box(1.0, 5.0, 2.6), new THREE.MeshStandardMaterial({ map: windowTex('#d8dce4', '#5a7aa0', 801).day, emissive: '#ffffff', emissiveMap: windowTex('#d8dce4', '#5a7aa0', 801).night, emissiveIntensity: 0 }), s * 1.6, 2.7, 0);
  R.winMats.push(sph.children[1].material, sph.children[2].material);
  add(sph, G.box(4.2, 0.4, 0.4), mat('#c8ccd4'), 0, 3.6, 0);
  add(sph, G.box(4.2, 0.4, 0.4), mat('#c8ccd4'), 0, 5.0, 0);
  add(sph, G.sphere(1.2, 20, 14), mat('#c8ccd4', { metalness: 0.5, roughness: 0.2 }), 0, 4.6, 0);
  // 灯台のような明かり
  const lh = group(od, 6.8, 0, 12.0);
  add(lh, G.cyl(0.24, 0.3, 1.8, 10), mat('#f4f4f0'), 0, 0.9, 0);
  const lhm = glow('#ff3a2a', 0.8);
  R.beacons.push(lhm);
  add(lh, G.sphere(0.2, 10, 8), lhm, 0, 1.95, 0, { cast: false });

  // ---------------- 街灯・木・電柱（そのほか） ----------------
  for (const [x, z] of [[-13.6, -0.8], [-6.0, 2.8], [8.2, 2.8], [14.8, -0.8], [18.0, 2.8], [24.0, 2.8], [-22.0, -0.8], [-26.0, 2.8], [-12.0, 10.2], [-2.0, 10.2], [-24.0, 10.2], [10.0, 12.2], [20.0, 12.2], [27.0, 12.2]]) streetLamp(root, x, z, R, z > 5 ? Math.PI : 0);
  for (const [x, z] of [[9.6, 5.4], [14.8, 5.4], [9.6, 1.4], [14.8, 1.6]]) tree(root, x, z, { s: 0.7 });
  for (const [x, z] of [[-14.4, -1.6], [-6.8, -1.6], [-7.0, 5.8]]) tree(root, x, z, { s: 0.75 });

  // 夜の光だまり（灯りがともると明るくなる）
  R.pools = [];
  for (const [x, z, w, d, c] of [[2.0, 0.9, 8, 5, '#ffcf8a'], [-10.6, 4.2, 4, 4, '#ffb060'], [-22, 1.6, 8, 5, '#c08aff'], [STATION.x, 2.8, 12, 4, '#ffe0a0'], [-20.4, 13.6, 6, 6, '#ffb060'], [TOWER.x, TOWER.z, 7, 7, '#ffb04a']]) {
    const p = lightPool(root, x, 0.02, z, w, d, c);
    p.material.opacity = 0;
    R.pools.push(p);
  }
  applyJapanLayout(root);
  R.towerTop = R.tower.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 9.9, 1.2));
  return R;
}
