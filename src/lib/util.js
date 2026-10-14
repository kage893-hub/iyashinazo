import * as THREE from 'three';

// ---------------------------------------------------------------
// 小さなジオメトリ・マテリアルのヘルパー群
// ---------------------------------------------------------------

const matCache = new Map();

/** 色ごとにキャッシュされた標準マテリアル（opts を渡すと新規作成） */
export function mat(color, opts) {
  // 同じ色・同じ設定なら同じマテリアルを共有する（結合しやすくするため）。
  // あとから値を書きかえるマテリアルは new で個別に作ること。
  const key = `${color}|${opts ? JSON.stringify(opts) : ''}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...(opts || {}) }));
  }
  return matCache.get(key);
}

export function glow(color, intensity = 2, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, ...opts,
  });
}

/**
 * メッシュを作って parent に追加する
 * o: { rot:[x,y,z], scale:[x,y,z] | number, cast, receive, name }
 */
export function add(parent, geo, material, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale !== undefined) {
    if (typeof o.scale === 'number') m.scale.setScalar(o.scale);
    else m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
  }
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.receive !== false;
  if (o.name) m.name = o.name;
  parent.add(m);
  return m;
}

export function group(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  if (parent) parent.add(g);
  return g;
}

// ジオメトリはサイズごとにキャッシュ
const geoCache = new Map();
function cached(key, fn) {
  if (!geoCache.has(key)) geoCache.set(key, fn());
  return geoCache.get(key);
}

/**
 * 角をほんの少し丸めた箱（模型のように角に光がのる）。
 * 各面を 3×3 に分け、外側の帯を角へ寄せて、角の頂点を丸めた位置と向きにする。
 */
// 面ごとの UV の向き（BoxGeometry と同じ並び：px nx py ny pz nz）
const FACE_UV = [
  { n: [1, 0, 0], u: 2, v: 1, ud: -1, vd: -1 },
  { n: [-1, 0, 0], u: 2, v: 1, ud: 1, vd: -1 },
  { n: [0, 1, 0], u: 0, v: 2, ud: 1, vd: 1 },
  { n: [0, -1, 0], u: 0, v: 2, ud: 1, vd: -1 },
  { n: [0, 0, 1], u: 0, v: 1, ud: 1, vd: -1 },
  { n: [0, 0, -1], u: 0, v: 1, ud: -1, vd: -1 },
];

function roundedBox(w, h, d) {
  const m = Math.min(w, h, d);
  const r = Math.min(0.035, m * 0.2);
  if (m < 0.08) return new THREE.BoxGeometry(w, h, d); // 小さな部品はそのまま
  const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const half = [w / 2, h / 2, d / 2];
  const size = [w, h, d];
  const p = new THREE.Vector3(), inner = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const a = p.toArray();
    // 1/3 の位置にある頂点を、角から r の位置へ
    for (let k = 0; k < 3; k++) {
      const hk = half[k];
      if (Math.abs(Math.abs(a[k]) - hk / 3) < 1e-6) a[k] = Math.sign(a[k]) * (hk - r);
    }
    // UV も動かした位置にあわせる（看板の文字が伸びないように）
    const n0 = [nor.getX(i), nor.getY(i), nor.getZ(i)];
    const f = FACE_UV.find((F) => F.n[0] === Math.round(n0[0]) && F.n[1] === Math.round(n0[1]) && F.n[2] === Math.round(n0[2]));
    if (f) uv.setXY(i, (a[f.u] * f.ud) / size[f.u] + 0.5, 0.5 - (a[f.v] * f.vd) / size[f.v]);
    p.fromArray(a);
    inner.set(
      THREE.MathUtils.clamp(p.x, -half[0] + r, half[0] - r),
      THREE.MathUtils.clamp(p.y, -half[1] + r, half[1] - r),
      THREE.MathUtils.clamp(p.z, -half[2] + r, half[2] - r),
    );
    dir.subVectors(p, inner);
    const len = dir.length();
    if (len > 1e-6) {
      dir.divideScalar(len);
      p.copy(inner).addScaledVector(dir, r);
      nor.setXYZ(i, dir.x, dir.y, dir.z);
    }
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  return g;
}

export const G = {
  box: (w, h, d) => cached(`b${w},${h},${d}`, () => roundedBox(w, h, d)),
  sharpBox: (w, h, d) => cached(`B${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  sphere: (r, ws, hs) => {
    // 小さな球は分割数を減らして軽くする
    if (ws === undefined) { ws = r < 0.08 ? 8 : r < 0.2 ? 12 : 18; hs = r < 0.08 ? 6 : r < 0.2 ? 9 : 12; }
    if (hs === undefined) hs = Math.max(6, Math.round(ws * 0.66));
    return cached(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
  },
  cyl: (rt, rb, h, seg = 20, open = false) =>
    cached(`c${rt},${rb},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)),
  cone: (r, h, seg = 16) => cached(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  torus: (r, t, rs = 8, ts = 24, arc = Math.PI * 2) =>
    cached(`t${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc)),
  capsule: (r, l, cs = 6, rs = 12) => cached(`p${r},${l}`, () => new THREE.CapsuleGeometry(r, l, cs, rs)),
  ico: (r, d = 0) => cached(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  dodeca: (r) => cached(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0)),
  oct: (r) => cached(`o${r}`, () => new THREE.OctahedronGeometry(r, 0)),
  plane: (w, h) => cached(`pl${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
  circle: (r, seg = 24) => cached(`ci${r},${seg}`, () => new THREE.CircleGeometry(r, seg)),
};

/** 角丸長方形の Shape */
export function roundRectShape(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** シード付き乱数 */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';

/** Canvas に描いてテクスチャにする */
export function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** 看板などのテキスト用テクスチャ */
export function signTex(text, { w = 512, h = 128, bg = '#f4ead2', fg = '#3b2a1e', border = '#6b4a2e', size = 72, weight = 700, sub } = {}) {
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(4, h * 0.06);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 長い文字は、板からはみ出さないように小さくする
    let fs = size;
    ctx.font = `${weight} ${fs}px ${FONT}`;
    while (fs > 12 && ctx.measureText(text).width > w * 0.88) { fs -= 2; ctx.font = `${weight} ${fs}px ${FONT}`; }
    ctx.fillText(text, w / 2, sub ? h * 0.42 : h / 2 + fs * 0.04);
    if (sub) {
      ctx.font = `500 ${Math.round(size * 0.38)}px ${FONT}`;
      ctx.fillText(sub, w / 2, h * 0.8);
    }
  });
}

/** ふんわり丸いスプライト用テクスチャ */
let softTex = null;
export function softCircleTexture() {
  if (softTex) return softTex;
  softTex = canvasTex(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return softTex;
}

let puffTex = null;
export function puffTexture() {
  if (puffTex) return puffTex;
  puffTex = canvasTex(128, 128, (ctx, w, h) => {
    const r = rng(7);
    for (let i = 0; i < 9; i++) {
      const x = w / 2 + (r() - 0.5) * w * 0.35;
      const y = h / 2 + (r() - 0.5) * h * 0.35;
      const rad = w * (0.18 + r() * 0.16);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
  return puffTex;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** 名前付き Object3D を親方向に辿って userData.key を探す */
export function findUp(obj, key) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData[key] !== undefined) return o.userData[key];
    o = o.parent;
  }
  return undefined;
}

/** グループ内の全メッシュの影設定 */
export function shadows(obj, cast = true, receive = true) {
  obj.traverse((m) => {
    if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; }
  });
  return obj;
}
