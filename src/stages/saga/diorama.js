import * as THREE from 'three';
import { add, mat, G, group, rng, canvasTex, FONT } from '../../lib/util.js';
import { waterize, sway } from '../../lib/livefx.js';
import { createSagaStation } from './station.js';
import { createMallageSaga } from './mallage.js';
import { createKawakuboProperty } from './kawakubo.js';

// 佐賀平野の縮景。北は-z、東は+x。地域間の距離だけを圧縮し、
// 写真を参照する3施設の形状・敷地内の配置はそれぞれのモデルで保つ。
export const ISLAND = { w: 160, d: 156 };
export const TRACK_Z = 8;
const C = {
  grass: '#96a779', rice: '#b6b77d', soil: '#a49b7d', edge: '#8f9478',
  asphalt: '#777d79', line: '#ecebdb', paving: '#c8c8b7', creek: '#567f76',
  leaf: '#6d8e58', wood: '#a4825d', dark: '#526359', white: '#f1ecdb', teal: '#4d8075',
};
const dynamic = (g, visible = true) => { g.userData.dynamic = true; g.visible = visible; return g; };
const noPick = (g) => { g.traverse((o) => { o.userData.noPick = true; }); return g; };
const FIELD_RECTS = [
  [-73, -67, -56, -49], [-50, -67, -30, -49], [-26, -67, -11, -55],
  [-73, -45, -56, -38], [-50, -45, -29, -38], [-25, -50, -11, -38],
  [-73, -33, -56, -15], [-50, -33, -29, -15], [-25, -33, -11, -15],
  [45, -67, 72, -52], [46, -48, 72, -34], [48, -29, 72, -15], [49, -11, 72, 5],
];

function rod(parent, a, b, r, material, sides = 8) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), v = q.clone().sub(p);
  const m = add(parent, G.cyl(r, r, v.length(), sides), material,
    (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}

function groundTexture() {
  return canvasTex(3200, 3120, (ctx, W, H) => {
    const X = (x) => (x + 80) / 160 * W, Z = (z) => (z + 78) / 156 * H, K = W / 160;
    const rect = (x0, z0, x1, z1, color) => {
      ctx.fillStyle = color; ctx.fillRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
    };
    const r = rng(20261016);
    ctx.fillStyle = C.grass; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 35000; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(237,232,191,.055)' : 'rgba(66,91,52,.06)';
      ctx.fillRect(r() * W, r() * H, 1 + r() * 5, 1 + r() * 3);
    }
    FIELD_RECTS.forEach(([x0, z0, x1, z1], i) => {
      rect(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, '#8e9470');
      rect(x0, z0, x1, z1, ['#b1b676', '#a9b783', '#bfba7d', '#91a77a'][i % 4]);
      ctx.strokeStyle = i % 2 ? 'rgba(73,101,58,.25)' : 'rgba(239,222,148,.34)'; ctx.lineWidth = 2;
      for (let x = x0 + 0.25; x < x1; x += 0.45) {
        ctx.beginPath(); ctx.moveTo(X(x), Z(z0 + 0.15)); ctx.lineTo(X(x), Z(z1 - 0.15)); ctx.stroke();
      }
      for (let j = 0; j < 450; j++) {
        ctx.fillStyle = j % 2 ? 'rgba(222,210,144,.24)' : 'rgba(99,116,64,.14)';
        ctx.fillRect(X(x0 + r() * (x1 - x0)), Z(z0 + r() * (z1 - z0)), 2, 4);
      }
    });
    // 佐賀駅周辺は都市の舗道。モールの敷地はモデル側の駐車場を優先する。
    rect(-56, -3, -3.5, 28.5, '#b7bbaa');
    rect(-53, 23, -4.5, 28, C.paving);
    ctx.strokeStyle = 'rgba(102,112,98,.18)'; ctx.lineWidth = 1;
    for (let x = -53; x <= -4.5; x += 0.9) { ctx.beginPath(); ctx.moveTo(X(x), Z(23)); ctx.lineTo(X(x), Z(28)); ctx.stroke(); }
    for (let z = 23; z <= 28; z += 0.9) { ctx.beginPath(); ctx.moveTo(X(-53), Z(z)); ctx.lineTo(X(-4.5), Z(z)); ctx.stroke(); }
    const road = (x0, z0, x1, z1, center = true) => {
      rect(x0 - 0.25, z0 - 0.25, x1 + 0.25, z1 + 0.25, '#a6ad99');
      rect(x0, z0, x1, z1, C.asphalt);
      if (!center) return;
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.setLineDash([1.3 * K, 1.2 * K]);
      ctx.beginPath();
      if (x1 - x0 > z1 - z0) { ctx.moveTo(X(x0), Z((z0 + z1) / 2)); ctx.lineTo(X(x1), Z((z0 + z1) / 2)); }
      else { ctx.moveTo(X((x0 + x1) / 2), Z(z0)); ctx.lineTo(X((x0 + x1) / 2), Z(z1)); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    // 駅・商業地を結ぶ幹線は建物の西側を通す。
    road(-2.6, -29.0, 2.6, 75.5);
    road(-63.5, 29.0, 2.6, 34.0);
    road(-63.5, 3.0, -59.0, 72.5);
    road(-63.5, 68.0, 71.5, 72.5);
    road(60.0, 16.0, 64.5, 72.5);
    // 川久保は細い生活道路。中央線や大きな看板を付けない。
    road(4.6, -69, 7.4, -29.2, false);
    road(4.6, -32.0, 57, -29.0, false);
    road(-1.3, -29.5, 7.4, -26.7, false);
    road(4.6, -57.5, 42, -54.7, false);
    rect(-75, -13.3, 2.6, -11.7, '#b0a88a');
    // 写真の敷地の前は土と草の路肩。左の作業場へだけ細い進入路をつなぐ。
    rect(9.2, -36.1, 38.2, -32.0, '#a6a084');
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(94,112,64,.2)' : 'rgba(218,213,179,.15)';
      ctx.fillRect(X(9.2 + r() * 29), Z(-36.1 + r() * 4.1), 2 + r() * 5, 1 + r() * 4);
    }
    rect(10.9, -36.0, 15.0, -31.9, '#aaa99a');
    // バルーンの小さな芝生広場。周りの平野から不自然に切り離さない。
    ctx.fillStyle = '#a0ad81'; ctx.beginPath(); ctx.ellipse(X(-35), Z(48), 13 * K, 11.5 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c0b592'; ctx.lineWidth = 1.6 * K; ctx.beginPath();
    ctx.moveTo(X(-35), Z(34)); ctx.lineTo(X(-35), Z(39)); ctx.stroke();
    rect(-10.5, 33.8, -8.5, 64.0, '#beb69d');
    // 横断歩道は駅前とモールへの接続だけに控えめに。
    ctx.fillStyle = '#e7e6d8';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(X(-3.1), Z(38 + i * 0.55), 6.2 * K, 0.27 * K);
      ctx.fillRect(X(-18 + i * 0.55), Z(28.6), 0.27 * K, 5.8 * K);
    }
    // クリークの川底を地表に描き、上に別の水面を重ねる。
    rect(-54.1, -70, -51.9, -10, '#6d806e');
    rect(-75, -37.1, -13, -34.9, '#6d806e');
    rect(43.1, -69, 44.9, 10, '#6d806e');
  });
}

function textFace(parent, title, sub, w, h, y, bg = C.white, fg = '#3b5750') {
  const tex = canvasTex(768, Math.round(768 * h / w), (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#9ca68b'; ctx.lineWidth = 5; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
    let fs = H * (sub ? 0.3 : 0.46); ctx.font = `800 ${fs}px ${FONT}`;
    while (ctx.measureText(title).width > W * 0.88) { fs -= 2; ctx.font = `800 ${fs}px ${FONT}`; }
    ctx.fillText(title, W / 2, H * (sub ? 0.37 : 0.52));
    if (sub) { ctx.font = `600 ${H * 0.18}px ${FONT}`; ctx.fillText(sub, W / 2, H * 0.76); }
  });
  const f = add(parent, G.plane(w, h), new THREE.MeshBasicMaterial({ map: tex }), 0, y, 0.11, { cast: false });
  f.userData.keep = true;
  return f;
}

function board(parent, x, z, title, sub, { w = 2.6, h = 1.2, y = 1.5, ry = 0 } = {}) {
  const g = group(parent, x, 0, z, ry);
  add(g, G.box(w + 0.12, h + 0.12, 0.14), mat(C.wood), 0, y, 0);
  for (const xx of [-w * 0.34, w * 0.34]) add(g, G.box(0.07, y + 0.3, 0.08), mat('#787d67'), xx, (y + 0.3) / 2, 0);
  textFace(g, title, sub, w, h, y);
  return g;
}

function tree(parent, x, z, seed, scale = 1) {
  const g = group(parent, x, 0, z), r = rng(seed), bark = mat('#7c775c');
  add(g, G.cyl(0.12, 0.19, 2.1, 8), bark, 0, 1.05, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + r();
    rod(g, [0, 1.1, 0], [Math.cos(a) * 0.6, 2.7, Math.sin(a) * 0.6], 0.055, bark);
  }
  for (let i = 0; i < 8; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.75;
    add(g, G.sphere(0.63 + r() * 0.22, 9, 7), mat(['#6a8a55', '#809a61', '#91a46e'][i % 3]),
      Math.cos(a) * d, 2.7 + r() * 0.75, Math.sin(a) * d, { scale: [1, 0.82, 1] });
  }
  g.scale.setScalar(scale);
  return noPick(g);
}

function plainHouse(parent, x, z, w, d, h, seed, ry = 0) {
  const g = group(parent, x, 0, z, ry), r = rng(seed), wall = ['#cfccb8', '#c9c5b0', '#b9c1af', '#d2cbb8'][seed % 4];
  add(g, G.box(w, h, d), mat(wall), 0, h / 2, 0);
  const rise = Math.min(1.1, w * 0.2), slope = Math.atan2(rise, w / 2), length = Math.hypot(w / 2 + 0.2, rise);
  for (const side of [-1, 1]) add(g, G.box(length, 0.1, d + 0.5), mat('#69756b'), side * w / 4, h + rise / 2, 0,
    { rot: [0, 0, -side * slope] });
  add(g, G.box(w + 0.18, 0.18, d + 0.18), mat('#9a9f8c'), 0, 0.09, 0);
  for (const side of [-1, 1]) {
    for (let y = 1; y < h; y += 1.7) for (const xx of [-w * 0.26, w * 0.26]) {
      add(g, G.box(w * 0.22, 0.68, 0.035), mat('#a3aaa0'), xx, y, side * (d / 2 + 0.02));
      add(g, G.box(w * 0.22 - 0.08, 0.6, 0.04), mat(r() > 0.35 ? '#687d76' : '#b6b7a2'), xx, y, side * (d / 2 + 0.04));
    }
  }
  add(g, G.box(0.8, 1.7, 0.055), mat('#786f5a'), 0, 0.9, d / 2 + 0.05);
  add(g, G.box(1.15, 0.08, 0.5), mat('#8c9586'), 0, 1.85, d / 2 + 0.2, { rot: [0.06, 0, 0] });
  return noPick(g);
}

function creek(parent, x0, z0, x1, z1, width, water, gaps = []) {
  const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0);
  const g = noPick(group(parent, (x0 + x1) / 2, 0, (z0 + z1) / 2));
  const w = horizontal ? len : width, d = horizontal ? width : len;
  add(g, G.plane(w, d), water, 0, -0.022, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const start = horizontal ? Math.min(x0, x1) : Math.min(z0, z1);
  const end = start + len, ranges = []; let cursor = start;
  for (const [a, b] of gaps) { if (a > cursor) ranges.push([cursor, a]); cursor = b; }
  if (cursor < end) ranges.push([cursor, end]);
  for (const [a,b] of ranges) for (const side of [-1, 1]) {
    const part = b - a, mid = (a + b - start - end) / 2;
    add(g, G.box(horizontal ? part : 0.12, 0.1, horizontal ? 0.12 : part), mat('#9a9d83'),
      horizontal ? mid : side * (width / 2 + 0.1), 0, horizontal ? side * (width / 2 + 0.1) : mid);
  }
  return g;
}

function riceDetails(parent) {
  const locations = [], transform = new THREE.Object3D(), r = rng(1693);
  FIELD_RECTS.forEach(([x0, z0, x1, z1], index) => {
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 0.9) for (let z = z0 + 0.5; z < z1 - 0.3; z += 1.05) {
      locations.push({ x: x + (r() - 0.5) * 0.08, z: z + (r() - 0.5) * 0.12, h: 0.22 + r() * 0.12, index });
    }
  });
  const material = sway(mat('#aeb477', { side: THREE.DoubleSide }), { amp: 0.045, speed: 0.7, base: 0 });
  const shape = new THREE.Shape(); shape.moveTo(-0.17, 0); shape.quadraticCurveTo(-0.13, 0.75, -0.03, 1);
  shape.lineTo(0.02, 0.23); shape.quadraticCurveTo(0.2, 0.87, 0.2, 0.95); shape.lineTo(0.11, 0); shape.closePath();
  const grass = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape, 4), material, locations.length * 2);
  const colors = ['#aab674', '#9cab77', '#c2bb7b', '#a7b87e'];
  locations.forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      transform.position.set(p.x, -0.015, p.z); transform.rotation.set(0, k * Math.PI / 2, 0);
      transform.scale.set(1, p.h, 1); transform.updateMatrix(); grass.setMatrixAt(i * 2 + k, transform.matrix);
      grass.setColorAt(i * 2 + k, new THREE.Color(colors[p.index % 4]));
    }
  });
  grass.userData.noPick = true; grass.receiveShadow = true; grass.castShadow = false;
  parent.add(grass); return grass;
}

function busStop(parent) {
  const g = group(parent, -13, 0, 25), metal = mat('#7f9987');
  add(g, G.cyl(0.45, 0.55, 0.16, 12), mat('#aaa994'), 0, 0.08, 0);
  add(g, G.cyl(0.055, 0.055, 2.9, 8), metal, 0, 1.55, 0);
  add(g, G.cyl(0.48, 0.48, 0.09, 24), mat('#e6e9d5'), 0, 2.8, 0, { rot: [Math.PI / 2, 0, 0] });
  const sign = group(g, 0, 0, 0.06); textFace(sign, '佐賀駅', '臨時便', 0.87, 0.68, 2.8, '#f2f1d9', '#4c7e67');
  add(g, G.box(0.78, 1.1, 0.08), metal, 0, 1.65, 0);
  const table = canvasTex(256, 384, (c, W, H) => {
    c.fillStyle = '#f7f2df'; c.fillRect(0, 0, W, H); c.fillStyle = '#456258';
    c.textAlign = 'center'; c.font = `700 35px ${FONT}`; c.fillText('のりば案内', W / 2, 48);
    c.strokeStyle = '#99a28b'; c.lineWidth = 2;
    for (let y = 85; y < H - 20; y += 39) { c.beginPath(); c.moveTo(25, y); c.lineTo(W - 25, y); c.stroke(); }
    for (const x of [88, 160]) { c.beginPath(); c.moveTo(x, 85); c.lineTo(x, H - 26); c.stroke(); }
  });
  add(g, G.plane(0.68, 1.01), new THREE.MeshBasicMaterial({ map: table }), 0, 1.65, 0.055, { cast: false });
  return g;
}

function makeBus(parent) {
  const g = dynamic(group(parent, -18.6, 0, 30.2)), white = mat('#eee9d7'), green = mat('#638f77');
  add(g, G.box(6.0, 2.0, 2.3), white, 0, 1.55, 0);
  add(g, G.box(6.05, 0.5, 2.33), green, 0, 0.95, 0);
  add(g, G.box(6.04, 0.1, 2.32), mat('#d8be7c'), 0, 1.31, 0);
  add(g, G.box(5.8, 0.12, 2.14), white, -0.05, 2.62, 0);
  for (const side of [-1, 1]) {
    for (let x = -2.05; x < 2; x += 1.0) add(g, G.box(0.85, 0.83, 0.035), mat('#617f7c'), x, 2.04, side * 1.165);
    for (const x of [-1.85, 1.85]) {
      add(g, G.cyl(0.5, 0.5, 0.24, 14), mat('#3d4740'), x, 0.52, side * 1.05, { rot: [Math.PI / 2, 0, 0] });
      add(g, G.cyl(0.25, 0.25, 0.25, 12), mat('#a5b0a0'), x, 0.52, side * 1.07, { rot: [Math.PI / 2, 0, 0] });
    }
  }
  add(g, G.box(0.03, 0.9, 1.98), mat('#597979'), 3.02, 2.02, 0);
  for (const side of [-1, 1]) add(g, G.box(0.04, 0.24, 0.45), mat('#e4dfb6'), 3.04, 1.03, side * 0.77);
  const destination = group(g, 3.05, 0, 0, Math.PI / 2);
  textFace(destination, '佐賀めぐり', '', 1.72, 0.3, 2.51, '#2f4941', '#e5e1bd');
  g.userData.parkedPosition = g.position.clone();
  return g;
}

function makeSluice(parent) {
  const g = group(parent, -39, 0, -36), concrete = mat('#afb09a'), steel = mat('#798c7d');
  for (const x of [-1.2, 1.2]) add(g, G.box(0.42, 1.05, 2.4), concrete, x, 0.43, 0);
  add(g, G.box(2.9, 0.2, 2.45), concrete, 0, 1.01, 0);
  add(g, G.box(0.1, 1.22, 1.65), mat('#7a897b'), 0, 0.18, 0);
  for (const z of [-0.85, 0.85]) add(g, G.box(0.15, 1.5, 0.15), steel, 0, 1.14, z);
  add(g, G.box(0.14, 0.13, 1.85), steel, 0, 1.88, 0);
  const wheel = dynamic(group(g, 0, 2.15, 0));
  add(wheel, G.torus(0.38, 0.045, 7, 24), mat('#9d5146'), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2; rod(wheel, [0, 0, 0], [Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], 0.025, mat('#9d5146'));
  }
  g.userData.wheel = wheel;
  return g;
}

function makeBalloon(parent) {
  const g = dynamic(group(parent, -35, 0, 48));
  const colors = ['#cf886b', '#e4c777', '#739d8a', '#93b4b5', '#ede2b5', '#cd9275', '#e5c97d', '#6e9b87', '#9ababb', '#ece2bd'];
  const points = [[0.52, 3.0], [0.8, 3.35], [2.0, 4.5], [3.5, 6.9], [4.35, 9.6], [4.18, 11.6], [3.25, 13.8], [1.6, 15.25], [0, 15.75]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  for (let i = 0; i < colors.length; i++) {
    const start = i * Math.PI * 2 / colors.length;
    add(g, new THREE.LatheGeometry(points, 9, start, Math.PI * 2 / colors.length), mat(colors[i], { roughness: 0.85 }));
    const seam = new THREE.CatmullRomCurve3(points.slice(0, -1).map((p) => new THREE.Vector3(Math.sin(start) * p.x, p.y, Math.cos(start) * p.x)));
    add(g, new THREE.TubeGeometry(seam, 36, 0.016, 5, false), mat('#e6dec1'));
  }
  const basket = group(g);
  add(basket, G.box(1.8, 1.1, 1.5), mat('#ae8a5d'), 0, 0.75, 0);
  add(basket, G.box(1.9, 0.13, 1.6), mat('#8a6e4f'), 0, 1.3, 0);
  for (let y = 0.35; y <= 1.2; y += 0.16) add(basket, G.box(1.82, 0.025, 1.52), mat('#c8ac77'), 0, y, 0);
  for (const x of [-0.7, 0.7]) for (const z of [-0.58, 0.58]) rod(basket, [x, 1.3, z], [x * 0.55, 3.15, z * 0.55], 0.025, mat('#81775b'));
  add(basket, G.box(0.7, 0.12, 0.6), mat('#879082'), 0, 2.4, 0);
  add(basket, G.cyl(0.16, 0.16, 0.45, 10), mat('#788579'), 0, 2.7, 0);
  g.userData.basket = basket;
  g.userData.groundPosition = g.position.clone();
  return g;
}

function makeBalloonPad(parent) {
  const g = group(parent, -35, 0, 48);
  add(g, G.circle(7.8, 64), mat('#b5b792'), 0, -0.015, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const ring = add(g, G.torus(7.5, 0.065, 5, 64), mat('#e6dfb7'), 0, 0.02, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  ring.userData.noPick = true;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    add(g, G.box(0.11, 0.018, 0.7), mat('#e5dfb4'), Math.sin(a) * 6.7, 0.025, Math.cos(a) * 6.7, { rot: [0, a, 0], cast: false });
  }
  const wind = group(g, -9.4, 0, -2.2), pole = mat('#909e8b');
  add(wind, G.cyl(0.055, 0.07, 5.1, 8), pole, 0, 2.55, 0);
  const sleeve = dynamic(group(wind, 0, 4.8, 0));
  for (let i = 0; i < 5; i++) add(sleeve, G.cyl(0.24 - i * 0.028, 0.212 - i * 0.028, 0.34, 10, true),
    mat(i % 2 ? '#e2dfc0' : '#c88569', { side: THREE.DoubleSide }), 0.17 + i * 0.32, 0, 0, { rot: [0, 0, -Math.PI / 2] });
  g.userData.windsock = sleeve;
  return g;
}

function makeSketchDesk(parent) {
  const g = group(parent, 19, 0, -28), wood = mat('#aa9470');
  for (const x of [-0.85, 0.85]) for (const z of [-0.4, 0.4]) add(g, G.box(0.075, 1.15, 0.075), wood, x, 0.575, z);
  add(g, G.box(2.25, 0.12, 1.25), wood, 0, 1.18, 0, { rot: [-0.1, 0, 0] });
  add(g, G.box(1.18, 0.035, 0.83), mat('#eee8d1'), -0.25, 1.29, 0, { rot: [-0.1, 0, 0] });
  for (const x of [0.56, 0.64, 0.72]) add(g, G.cyl(0.018, 0.018, 0.65, 5), mat('#8d7a57'), x, 1.34, 0.15,
    { rot: [Math.PI / 2, 0.22, 0] });
  const complete = dynamic(group(g, -0.25, 0, 0), false);
  const texture = canvasTex(640, 448, (c, W, H) => {
    c.fillStyle = '#f6edd5'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#777e67'; c.lineWidth = 4;
    c.strokeRect(26, 24, W - 52, H - 48);
    // 写真そのものを複写せず、旅先で描く三つの風景の小さな絵葉書。
    c.fillStyle = '#c1cbae'; c.fillRect(58, 75, 524, 257);
    c.fillStyle = '#e4d8ae'; c.fillRect(155, 176, 315, 126);
    c.fillStyle = '#7f8674'; c.beginPath(); c.moveTo(113, 179); c.lineTo(296, 108); c.lineTo(501, 179); c.closePath(); c.fill();
    c.fillStyle = '#8b9579'; c.fillRect(67, 306, 502, 15);
    c.fillStyle = '#5d6d57'; c.font = `700 35px ${FONT}`; c.textAlign = 'center'; c.fillText('佐賀の旅だより', W / 2, 390);
  });
  add(complete, G.plane(1.15, 0.81), new THREE.MeshBasicMaterial({ map: texture }), 0, 1.318, 0,
    { rot: [-Math.PI / 2 - 0.1, 0, 0], cast: false });
  return { desk: g, complete };
}

function mapBoard(parent) {
  const g = board(parent, -43, 26.7, '佐賀のよりみち', '', { w: 4.3, h: 2.6, y: 2.0 });
  const texture = canvasTex(1024, 640, (c, W, H) => {
    c.fillStyle = '#eee9d6'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#c1c8ac'; c.lineWidth = 8; c.strokeRect(7, 7, W - 14, H - 14);
    c.textAlign = 'center'; c.fillStyle = '#3d6259'; c.font = `800 52px ${FONT}`; c.fillText('佐賀のよりみち', W / 2, 72);
    const point = (x, z) => [(x + 60) / 120 * 850 + 80, (z + 58) / 124 * 430 + 125];
    c.strokeStyle = '#c3c5ad'; c.lineWidth = 22; c.lineJoin = 'round';
    c.beginPath(); [[-28, 8], [0, 8], [0, -31], [22, -31], [22, -45]].forEach(([x,z], i) => { const p=point(x,z); if(i)c.lineTo(...p);else c.moveTo(...p); }); c.stroke();
    c.beginPath(); [[0,8],[0,45],[31,45]].forEach(([x,z],i)=>{const p=point(x,z);if(i)c.lineTo(...p);else c.moveTo(...p);});c.stroke();
    c.beginPath(); [[0,45],[-35,45],[-35,48]].forEach(([x,z],i)=>{const p=point(x,z);if(i)c.lineTo(...p);else c.moveTo(...p);});c.stroke();
    const labels = [[-28,8,'佐賀駅',-44,-15],[22,-45,'川久保',40,-17],[31,38,'モラージュ佐賀',10,-20],[-39,-36,'田んぼ',-2,-20],[-35,48,'バルーン広場',0,43]];
    labels.forEach(([x,z,t,dx,dy],i)=>{const p=point(x,z);c.fillStyle=i===0?'#bf825f':'#6d9176';c.beginPath();c.arc(...p,12,0,Math.PI*2);c.fill();c.fillStyle='#3d5c4e';c.font=`700 ${i===2?31:33}px ${FONT}`;c.fillText(t,p[0]+dx,p[1]+dy);});
    c.fillStyle='#6f8066';c.font=`600 23px ${FONT}`;c.fillText('北 ↑　　旅の箱庭案内',W-210,112);
  });
  const art = add(g, G.plane(4.21, 2.51), new THREE.MeshBasicMaterial({ map: texture }), 0, 2.0, 0.122, { cast: false });
  art.userData.keep = true;
  return g;
}

export function buildSagaDiorama(scene) {
  const root = group(scene), R = { root };
  root.name = 'saga-wide-diorama';
  // モラージュ駐車場・家の庭を下から支える。施設の地表より低くし重なりを防ぐ。
  R.ground = add(root, G.plane(ISLAND.w, ISLAND.d), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }),
    0, -0.035, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  R.ground.userData.noPick = true;

  R.station = createSagaStation(root); R.station.root.position.set(-28, 0, 8); R.station.root.scale.setScalar(0.45);
  R.mallage = createMallageSaga(root); R.mallage.root.position.set(31, 0, 30); R.mallage.root.scale.setScalar(0.16);
  R.property = createKawakuboProperty(root); R.property.root.position.set(22, 0, -45); R.property.root.scale.setScalar(0.95);

  const rural = group(root), water = waterize(mat(C.creek, { roughness: 0.33 }), { strength: 0.13, scale: 0.5 });
  creek(rural, -53, -70, -53, -10, 1.35, water, [[-36.9,-35.1]]);
  creek(rural, -75, -36, -13, -36, 1.35, water, [[-53.9,-52.1],[-27.8,-26.4]]);
  creek(rural, 44, -69, 44, 10, 1.0, water);
  // 北西の田園を横断する小橋。住宅を囲む広場は設けない。
  for (const [x,z,ry] of [[-53,-12.5,Math.PI/2]]) {
    const bridge = noPick(group(rural,x,0,z,ry));
    add(bridge,G.box(3.2,0.16,3.1),mat('#b5b7a0'),0,0.06,0);
    for(const side of [-1,1]){add(bridge,G.box(0.1,0.55,3.0),mat('#9aab93'),side*1.5,0.4,0);}
  }
  R.rice = riceDetails(rural);
  R.waterOn = dynamic(group(root), false);
  creek(R.waterOn, -38, -36, -26.9, -36, 0.78, water);
  creek(R.waterOn, -27.1, -35.9, -27.1, -14.3, 0.58, water);
  R.sluice = makeSluice(root);

  // 背景は低い住宅と普通の店舗だけ。3つの必須建築に架空のランドマークを足さない。
  const town = group(root); R.town = town;
  const buildings = [
    [-72,-7,5.3,6.7,3.7,11],[-69,5,6.1,7.0,4.4,12],[-70,20,7.0,5.5,3.8,13],
    [-70,41,5.8,6.2,4.4,14],[-70,56,5.3,6.1,3.6,15],[-49,-4,6.2,4.6,3.4,16],
    [-28,-73,5.0,5.5,3.7,17],[-15,-73,5.7,5.6,4.0,18],[-4,-63,4.4,5.0,3.6,19],
    [-4,-48,4.4,5.8,4.0,20],[-4,-37,4.7,5.5,3.4,21],
    [57,-74,5.2,5.0,3.6,22],[70,-74,6.0,5.1,3.8,23],[69,13,5.0,5.4,4.0,24],
    [-50,63,5.0,5.0,3.2,28],[-21,64,4.5,5.2,3.6,29],
  ];
  buildings.forEach(([x,z,w,d,h,seed])=>plainHouse(town,x,z,w,d,h,seed,seed%3===0?Math.PI/2:0));
  for (const [x,z] of [[-55,25.8],[-42,26.0],[-24,26.5],[-5,25.8],[-56,36.5],[-56,49],[-56,60],
    [-5,38],[-5,52],[-5,64],[5.5,52],[5.5,65],[59,25],[59,42],
    [-75,-69],[-76,-14],[-10,-73],[1,-72],[40,-68],[40,-57],[73,-6]]) tree(root,x,z,Math.round((x+80)*99+z),0.75+(Math.abs(z)%3)*0.06);
  // 西側道路の白い欄干と街灯は主な建築の前へ置かない。
  for (const [x,z] of [[-57,26],[-4,27],[-5.2,43],[-5.2,60],[57.5,48],[57.5,64]]) {
    const pole=noPick(group(root,x,0,z));
    add(pole,G.cyl(0.055,0.08,4.8,8),mat('#829381'),0,2.4,0);
    rod(pole,[0,4.7,0],[0.75,4.9,0],0.045,mat('#829381'));
    add(pole,G.box(0.8,0.12,0.32),mat('#e5e6cf'),0.75,4.85,0);
  }

  R.busStop = busStop(root);
  R.busClue = board(root,-9.5,26,'佐賀の臨時便','のりかえ案内',{w:2.6,h:1.1,y:1.35});
  R.mapBoard = mapBoard(root);
  R.marketBoard = group(root,35.4,0,41.0);
  for(const x of [-0.9,0.9])for(const z of [-0.32,0.32])add(R.marketBoard,G.box(0.07,0.9,0.07),mat(C.wood),x,0.45,z);
  add(R.marketBoard,G.box(2.3,0.12,1.0),mat('#c2ab7b'),0,0.95,0);
  const baskets=mat('#8f9471');
  for(const x of [-0.72,0,0.72]){add(R.marketBoard,G.box(0.58,0.25,0.65),baskets,x,1.12,0);for(let i=0;i<3;i++)add(R.marketBoard,G.sphere(0.12,7,5),mat(['#c18c65','#c8b775','#809d6a'][i]),x+(i-1)*0.13,1.31,0);}
  R.shoppingClue = board(root,35.4,43.6,'佐賀のよりみち市','ならべかえ案内',{w:2.6,h:1.1,y:1.35});
  R.sluiceClue = board(root,-34,-32.6,'佐賀平野のクリーク','水の道しるべ',{w:3.0,h:1.15,y:1.4});
  R.balloonPad = makeBalloonPad(root); R.balloon = makeBalloon(root);
  R.balloonClue = board(root,-23.2,51,'佐賀の空へ','気球の出発案内',{w:2.8,h:1.15,y:1.4});
  const sketch = makeSketchDesk(root); R.sketchDesk=sketch.desk;R.sketchComplete=sketch.complete;
  R.sketchClue = board(root,22.5,-27.6,'川久保の風景','旅だよりの机',{w:2.6,h:1.05,y:1.3});
  R.marketFlags = dynamic(group(root), false);
  for(const [x,z] of [[33.0,42.5],[37.5,42.0]]){
    const f=group(R.marketFlags,x,0,z);add(f,G.cyl(0.025,0.025,2.6,6),mat('#9a9d7c'),0,1.3,0);
    add(f,G.box(0.65,1.5,0.025),mat(x<35?'#b9a77a':'#80a58d'),0.35,1.7,0);
  }
  R.bus = makeBus(root);
  R.npcPlaces = {
    station: new THREE.Vector3(-30.5,0,24.0), magpie:new THREE.Vector3(15.8,0,-28.1),
    rabbit:new THREE.Vector3(31.5,0,41.8), crane:new THREE.Vector3(-42.1,0,-32.4),
    momonga:new THREE.Vector3(-42.5,0,53.4),
  };
  root.updateMatrixWorld(true);
  return R;
}
