import * as THREE from 'three';
import { rng } from './util.js';

// ---------------------------------------------------------------
// ステージごとの遠景：雲の奥に、うすく「世界の続き」を描く。
//  江戸なら富士山、港なら水平線、温泉なら雪山と遠くの里の灯り…
// すべて霧の影響を受けない半透明の板（シルエット）で、下へいくほど
// 雲海にとけて消える。set(k) で状態（夜→朝、霧→晴れ など）に合わせて色を変える。
// ---------------------------------------------------------------

const C = (c) => new THREE.Color(c);

/** 色・透明度を 2状態で持つマテリアル */
function silMat(list, a, b, oa = 0.7, ob = oa, extra = {}) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...extra });
  list.push({ m, a: C(a), b: C(b), oa, ob });
  return m;
}

/**
 * 山なみの帯（ぐるりと一周、または a0〜a1 の範囲）
 * 上の縁は top 色（雪など）、下は透明になって雲にとける
 */
function ridge(group, mats, { r = 230, y0 = -46, h = [10, 34], seed = 1, freq = 5, a0 = 0, a1 = Math.PI * 2, color, color2 = color, op = 0.7, op2 = op, snow = 0, seg = 160 }) {
  const rnd = rng(seed);
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = a0 + (a1 - a0) * t;
    const n = 0.5 + 0.28 * Math.sin(a * freq + ph[0]) + 0.16 * Math.sin(a * freq * 2.3 + ph[1]) + 0.08 * Math.sin(a * freq * 5.1 + ph[2]);
    const top = y0 + h[0] + (h[1] - h[0]) * n;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    pos.push(x, y0 - 14, z, x, top, z);
    // 下：透明 / 上：不透明（雪山はてっぺんが白く）
    col.push(1, 1, 1, 0, 1 + snow, 1 + snow, 1 + snow, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  const m = silMat(mats, color, color2, op, op2);
  const mesh = new THREE.Mesh(g, m);
  group.add(mesh);
  return mesh;
}

/** 富士山のような独立峰（山頂は雪） */
function peak(group, mats, { a, r = 240, y0 = -50, h = 80, w = 70, color, color2 = color, op = 0.75, op2 = op, snowLine = 0.72 }) {
  const N = 28;
  const pos = [], col = [], idx = [];
  // 横から見た三角形を、扇形の帯で（すそ野はゆるやかに広がる）
  const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
  const tx = -Math.sin(a), tz = Math.cos(a); // 接線
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * 2 - 1; // -1..1
    const prof = Math.pow(1 - Math.abs(u), 1.7); // すそ野の曲線
    const top = y0 + h * prof;
    const x = cx + tx * u * w, z = cz + tz * u * w;
    pos.push(x, y0 - 14, z, x, top, z);
    const snow = prof > snowLine ? 2.6 : 1;
    col.push(1, 1, 1, 0, snow, snow, snow, 1);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  // 雪の境目をギザギザに：中央付近の頂点を追加せず、色の補間でやわらかく見せる
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, silMat(mats, color, color2, op, op2));
  group.add(mesh);
  return mesh;
}

/** もくもくの入道雲（球のかたまり） */
function cumulus(group, mats, { a, r = 220, y0 = -30, s = 1, seed = 1, color, color2 = color, op = 0.6, op2 = op }) {
  const rnd = rng(seed);
  const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false });
  mats.push({ m, a: C(color), b: C(color2), oa: op, ob: op2, plain: true });
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
  const tx = -Math.sin(a), tz = Math.cos(a);
  for (let i = 0; i < 14; i++) {
    const u = (rnd() - 0.5) * 2;
    const lvl = rnd();
    const rad = (10 + rnd() * 10) * s * (1 - lvl * 0.45);
    const b = new THREE.Mesh(geo, m);
    b.position.set(cx + tx * u * 26 * s * (1 - lvl * 0.6), y0 + lvl * 46 * s, cz + tz * u * 26 * s * (1 - lvl * 0.6));
    b.scale.set(rad, rad * 0.8, rad);
    group.add(b);
  }
}

/** 水平線：島のずっと下にひろがる海（遠くほど空にとける） */
function horizonSea(group, mats, { y = -34, r0 = 120, r1 = 295, color, color2 = color, op = 0.85, op2 = op }) {
  const seg = 96;
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    pos.push(c * r0, y, s * r0, c * r1, y, s * r1);
    col.push(1, 1, 1, 0, 1.15, 1.15, 1.2, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, silMat(mats, color, color2, op, op2));
  group.add(mesh);
  return mesh;
}

/** 遠くの小さな灯り（里の家々） */
function lights(group, mats, { n = 40, r = 226, y = [-40, -22], a0 = 0, a1 = Math.PI * 2, seed = 3, color = '#ffb860', op = 0.9, op2 = op, size = 1.6 }) {
  const rnd = rng(seed);
  const pos = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * rnd();
    pos.push(Math.cos(a) * r, y[0] + (y[1] - y[0]) * rnd(), Math.sin(a) * r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const m = new THREE.PointsMaterial({ map: tex, size, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  mats.push({ m, a: C(color), b: C(color), oa: op, ob: op2, plain: true });
  group.add(new THREE.Points(g, m));
}

/** 遠くの帆船・島などの小さなシルエット */
function sail(group, mats, { a, r = 250, y = -34, s = 1, color, color2 = color, op = 0.6, op2 = op }) {
  const sh = new THREE.Shape();
  sh.moveTo(-3, 0); sh.lineTo(3, 0); sh.lineTo(2.2, -1.2); sh.lineTo(-2.4, -1.2); sh.lineTo(-3, 0);
  sh.moveTo(-0.2, 0.2); sh.lineTo(-0.2, 7); sh.lineTo(-3.2, 1.0); sh.lineTo(-0.2, 1.0);
  sh.moveTo(0.3, 0.2); sh.lineTo(0.3, 6); sh.lineTo(2.8, 1.0); sh.lineTo(0.3, 1.0);
  const g = new THREE.ShapeGeometry(sh);
  const cnt = g.attributes.position.count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(cnt * 4).fill(1), 4));
  const mesh = new THREE.Mesh(g, silMat(mats, color, color2, op, op2));
  mesh.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
  mesh.scale.setScalar(s);
  mesh.lookAt(0, y, 0);
  group.add(mesh);
}

// 方向の目安：カメラはふだん +z 側から見ているので、奥は a ≈ -π/2（z が負）
const BACK = -Math.PI / 2;

const KINDS = {
  // はざま駅：夕暮れの、世界のあいだ。紫の山なみと、遠くの尖った峰
  station(g, M) {
    ridge(g, M, { r: 255, y0: -30, h: [12, 36], seed: 11, freq: 4, color: '#b07898', color2: '#30306a', op: 0.6, op2: 0.7 });
    peak(g, M, { a: BACK + 0.55, r: 262, y0: -40, h: 82, w: 54, color: '#a07092', color2: '#2c2c66', op: 0.55, op2: 0.65, snowLine: 2 });
    ridge(g, M, { r: 236, y0: -34, h: [6, 22], seed: 12, freq: 7, color: '#8a5a80', color2: '#222252', op: 0.7, op2: 0.78 });
  },
  // 天空の街：雲の上。入道雲の峰と、うすい青の遠い山
  sky(g, M) {
    ridge(g, M, { r: 258, y0: -30, h: [8, 24], seed: 21, freq: 5, color: '#8890a8', color2: '#8ab0e0', op: 0.45, op2: 0.5 });
    for (const [a, s, seed] of [[BACK - 0.5, 1.3, 1], [BACK + 0.35, 1.6, 2], [BACK + 1.2, 1.1, 3], [BACK - 1.4, 1.2, 4], [0.9, 1.4, 5], [2.2, 1.1, 6]]) {
      cumulus(g, M, { a, r: 228, y0: -22, s, seed, color: '#9aa0b0', color2: '#ffffff', op: 0.6, op2: 0.8 });
    }
  },
  // 江戸：藍の山なみと、奥に富士山
  edo(g, M) {
    peak(g, M, { a: BACK - 0.35, r: 268, y0: -42, h: 108, w: 96, color: '#323c70', color2: '#7a88c4', op: 0.78, op2: 0.66, snowLine: 0.64 });
    ridge(g, M, { r: 252, y0: -32, h: [8, 26], seed: 31, freq: 5, color: '#26305c', color2: '#7a82b0', op: 0.7, op2: 0.58 });
    ridge(g, M, { r: 234, y0: -36, h: [4, 18], seed: 32, freq: 9, color: '#1c244c', color2: '#6070a0', op: 0.74, op2: 0.6 });
  },
  // 港：水平線と、遠くの帆船・島
  port(g, M) {
    horizonSea(g, M, { color: '#c8d4dc', color2: '#3a7ec0', op: 0.35, op2: 0.85 });
    ridge(g, M, { r: 270, y0: -38, h: [0, 10], seed: 41, freq: 3, a0: BACK + 0.6, a1: BACK + 1.5, color: '#c8d0d8', color2: '#6a8aa8', op: 0.25, op2: 0.6, seg: 60 });
    ridge(g, M, { r: 260, y0: -38, h: [0, 7], seed: 42, freq: 4, a0: BACK - 1.6, a1: BACK - 0.9, color: '#c8d0d8', color2: '#5a7a9a', op: 0.25, op2: 0.6, seg: 50 });
    sail(g, M, { a: BACK - 0.25, r: 240, y: -33, s: 1.3, color: '#d8e0e8', color2: '#f8f8f4', op: 0.3, op2: 0.8 });
    sail(g, M, { a: BACK + 0.4, r: 255, y: -33, s: 1.0, color: '#d8e0e8', color2: '#f8f8f4', op: 0.25, op2: 0.7 });
    sail(g, M, { a: 0.4, r: 235, y: -33, s: 1.1, color: '#d8e0e8', color2: '#f8f8f4', op: 0.25, op2: 0.7 });
  },
  // 城下町：みどりの丘と青い山なみ、遠くの町の灯り（夜）
  hero(g, M) {
    ridge(g, M, { r: 258, y0: -30, h: [14, 40], seed: 61, freq: 4, color: '#7a9ac8', color2: '#222a5a', op: 0.6, op2: 0.75, snow: 0.6 });
    ridge(g, M, { r: 238, y0: -34, h: [6, 20], seed: 62, freq: 7, color: '#5a9a6a', color2: '#1a2a40', op: 0.7, op2: 0.8 });
    lights(g, M, { n: 30, r: 232, y: [-26, -14], a0: BACK - 1.4, a1: BACK + 1.4, seed: 63, color: '#ffc070', op: 0, op2: 0.9, size: 1.8 });
  },
  // 温泉：雪をかぶった山なみと、遠くの湯の里の灯り
  onsen(g, M) {
    ridge(g, M, { r: 254, y0: -30, h: [18, 54], seed: 51, freq: 6, color: '#283058', color2: '#36406e', op: 0.8, op2: 0.8, snow: 1.4 });
    ridge(g, M, { r: 236, y0: -34, h: [8, 30], seed: 52, freq: 9, color: '#181e3c', color2: '#242a4e', op: 0.85, op2: 0.85, snow: 0.6 });
    lights(g, M, { n: 34, r: 230, y: [-24, -10], a0: BACK - 1.3, a1: BACK + 1.3, seed: 53, color: '#ffb060', op: 0.35, op2: 0.95, size: 2.0 });
  },
};

export function makeBackdrop(kind) {
  const group = new THREE.Group();
  group.renderOrder = -5;
  group.userData.noPick = true;
  const mats = [];
  KINDS[kind]?.(group, mats);
  // 港の海は、島のはるか下にひろがる（ほかは雲の上まで山がつき出す）
  group.position.y = kind === 'port' ? -18 : 0;
  group.traverse((o) => { o.userData.noPick = true; o.renderOrder = -5; o.frustumCulled = false; });
  const set = (k) => {
    for (const e of mats) {
      e.m.color.copy(e.a).lerp(e.b, k);
      e.m.opacity = e.oa + (e.ob - e.oa) * k;
    }
  };
  set(0);
  return { group, set };
}
