import * as THREE from 'three';
import { add, mat, glow, G, group, rng, canvasTex, roundRectShape, signTex, FONT } from '../../lib/util.js';
import { waterize, lightPool } from '../../lib/livefx.js';
import { stoneTex, planksTex } from '../station/textures.js';

// 星あかりの博物館。現代日本と同じ大きさの、回遊できる開放式の博物館。
// 各展示の前面と中央の回遊路は空ける。高い屋根は奥半分だけに置く。
export const ISLAND = { w: 60, d: 44 };
export const TRACK_Z = -16;
const FLOOR = 0.75;
const C = {
  stone: '#e9e1cb', edge: '#c1b8a0', dark: '#283c56', blue: '#354b70',
  teal: '#477e82', patina: '#6baba3', brass: '#c89e59', wood: '#826143',
  leaf: '#639184', amber: '#ffe0a0', ink: '#273e50', bone: '#eee2bd',
};
const noPick = (o) => { o.traverse((c) => { c.userData.noPick = true; }); return o; };
const dynamic = (o, visible = true) => { o.userData.dynamic = true; o.visible = visible; return o; };

function line(parent, points, radius, material, closed = false, segments = 32) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  return add(parent, new THREE.TubeGeometry(curve, segments, radius, 6, closed), material);
}

function rod(parent, a, b, radius, material, { cast = true } = {}) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), d = q.clone().sub(p);
  const mesh = add(parent, G.cyl(radius, radius, d.length(), 8), material,
    (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, { cast });
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

function star(parent, x, y, z, radius, material, depth = 0.08) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.43 : radius;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (!i) shape.moveTo(px, py); else shape.lineTo(px, py);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return add(parent, geometry, material, x, y, z);
}

function textFace(parent, text, x, y, z, w, h, options = {}) {
  const texture = signTex(text, {
    w: 768, h: Math.round(768 * h / w), size: 84,
    bg: C.dark, fg: '#f8edcd', border: C.brass, ...options,
  });
  return add(parent, G.plane(w, h), new THREE.MeshBasicMaterial({ map: texture }), x, y, z, { cast: false });
}

function board(parent, x, z, title, lines, { w = 3.35, h = 2.15, y = 1.85 } = {}) {
  const b = group(parent, x, 0, z);
  const wood = mat(C.wood), brass = mat(C.brass, { metalness: 0.25, roughness: 0.45 });
  for (const xx of [-w * 0.35, w * 0.35]) {
    add(b, G.box(0.1, y + 0.3, 0.1), wood, xx, (y + 0.3) / 2, -0.07);
    add(b, G.box(0.44, 0.12, 0.65), brass, xx, 0.06, 0);
  }
  add(b, G.box(w + 0.18, h + 0.18, 0.16), brass, 0, y, 0);
  const t = canvasTex(840, Math.round(840 * h / w), (ctx, W, H) => {
    ctx.fillStyle = '#fbf1d8'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#c8a063'; ctx.lineWidth = 7; ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = 65; ctx.font = `800 ${fs}px ${FONT}`;
    while (ctx.measureText(title).width > W * 0.86) { fs -= 2; ctx.font = `800 ${fs}px ${FONT}`; }
    ctx.fillText(title, W / 2, H * 0.22);
    ctx.strokeStyle = '#c7b48e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W * 0.13, H * 0.38); ctx.lineTo(W * 0.87, H * 0.38); ctx.stroke();
    lines.forEach((s, i) => {
      let size = Math.min(44, H * 0.13); ctx.font = `600 ${size}px ${FONT}`;
      while (ctx.measureText(s).width > W * 0.84) { size -= 1; ctx.font = `600 ${size}px ${FONT}`; }
      ctx.fillText(s, W / 2, H * (0.55 + i * 0.22));
    });
  });
  add(b, G.plane(w, h), new THREE.MeshBasicMaterial({ map: t }), 0, y, 0.091, { cast: false });
  return b;
}

function pad(parent, w, d, color = C.stone) {
  add(parent, G.box(w + 0.28, 0.16, d + 0.28), mat(C.edge), 0, 0.08, 0);
  add(parent, G.box(w, 0.08, d), mat(color), 0, 0.2, 0);
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12])
    add(parent, G.box(0.055, 0.015, d - 0.3), mat(C.brass), x, 0.247, 0, { cast: false });
}

function column(parent, x, z, h = 3.2) {
  const stone = mat(C.stone), brass = mat(C.brass, { metalness: 0.2, roughness: 0.45 });
  add(parent, G.box(0.8, 0.22, 0.8), stone, x, 0.11, z);
  add(parent, G.cyl(0.24, 0.3, h - 0.4, 12), stone, x, h / 2, z);
  add(parent, G.cyl(0.36, 0.3, 0.18, 12), brass, x, h - 0.25, z);
  add(parent, G.box(0.75, 0.22, 0.75), stone, x, h - 0.05, z);
}

function lamp(parent, x, z, h = 2.7) {
  const g = noPick(group(parent, x, 0, z));
  const bronze = mat(C.brass, { metalness: 0.25, roughness: 0.5 });
  add(g, G.cyl(0.21, 0.3, 0.2, 8), mat(C.dark), 0, 0.1, 0);
  add(g, G.cyl(0.055, 0.075, h, 8), bronze, 0, h / 2, 0);
  add(g, G.cyl(0.28, 0.16, 0.18, 6), bronze, 0, h - 0.1, 0);
  add(g, G.cyl(0.23, 0.23, 0.5, 6), glow(C.amber, 0.65), 0, h + 0.2, 0, { cast: false });
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    rod(g, [Math.cos(a) * 0.235, h - 0.03, Math.sin(a) * 0.235],
      [Math.cos(a) * 0.235, h + 0.46, Math.sin(a) * 0.235], 0.018, bronze, { cast: false });
  }
  add(g, G.cone(0.38, 0.3, 6), mat(C.dark), 0, h + 0.6, 0);
  star(g, 0, h + 0.86, 0, 0.12, bronze);
  lightPool(g, 0, 0.023, 0, 2.5, 2.5, '#ffd69a');
  return noPick(g);
}

function bench(parent, x, z, ry = 0) {
  const b = noPick(group(parent, x, 0, z, ry));
  const wood = mat(C.wood), metal = mat(C.dark);
  for (const xx of [-0.85, 0.85]) {
    for (const zz of [-0.23, 0.23]) add(b, G.box(0.1, 0.55, 0.1), metal, xx, 0.275, zz);
    add(b, G.box(0.09, 0.75, 0.09), metal, xx, 0.82, -0.28, { rot: [-0.1, 0, 0] });
    add(b, G.box(0.09, 0.1, 0.7), metal, xx, 0.85, 0);
  }
  for (let i = 0; i < 4; i++) add(b, G.box(2.05, 0.09, 0.14), wood, 0, 0.57, -0.25 + i * 0.17);
  for (let i = 0; i < 3; i++) add(b, G.box(2.05, 0.14, 0.08), wood, 0, 0.82 + i * 0.18, -0.32);
  return noPick(b);
}

function planter(parent, x, z, w, d, seed) {
  const g = noPick(group(parent, x, 0, z)), rand = rng(seed);
  add(g, G.box(w, 0.34, d), mat(C.edge), 0, 0.17, 0);
  add(g, G.box(w - 0.18, 0.07, d - 0.18), mat('#4b5045'), 0, 0.37, 0);
  const colors = ['#e5be86', '#a6ccbf', '#e6d9a7', '#d09baf'];
  const count = Math.round(w * d * 6);
  for (let i = 0; i < count; i++) {
    const xx = (rand() - 0.5) * (w - 0.3), zz = (rand() - 0.5) * (d - 0.3), h = 0.22 + rand() * 0.32;
    add(g, G.sphere(0.13, 8, 6), mat(C.leaf), xx, 0.43, zz, { scale: [1, 0.7, 1], cast: false });
    add(g, G.cyl(0.017, 0.017, h, 4), mat('#527c64'), xx, 0.4 + h / 2, zz, { cast: false });
    const color = mat(colors[Math.floor(rand() * colors.length)]);
    for (let p = 0; p < 5; p++) {
      const a = p * Math.PI * 0.4;
      add(g, G.sphere(0.055, 6, 4), color, xx + Math.cos(a) * 0.065, 0.4 + h, zz + Math.sin(a) * 0.065, { scale: [1, 0.45, 1], cast: false });
    }
    add(g, G.sphere(0.034, 6, 4), mat('#f9df9d'), xx, 0.42 + h, zz, { cast: false });
  }
  return noPick(g);
}

function tree(parent, x, z, seed, s = 1) {
  const t = noPick(group(parent, x, 0, z)), rand = rng(seed);
  add(t, G.cyl(0.15 * s, 0.23 * s, 1.8 * s, 8), mat(C.wood), 0, 0.9 * s, 0);
  for (const side of [-1, 1]) rod(t, [0, 1.05 * s, 0], [side * 0.65 * s, 2 * s, 0], 0.08 * s, mat(C.wood));
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.8 * s;
    add(t, G.ico((0.65 + rand() * 0.3) * s, 1), mat(i % 3 ? '#719b85' : '#8dac88', { flatShading: true }),
      Math.cos(a) * r, (2.1 + rand() * 0.75) * s, Math.sin(a) * r, { scale: [1, 0.8, 1], rot: [rand(), rand(), rand()] });
  }
  add(t, G.cyl(1.3 * s, 1.4 * s, 0.12, 16), mat(C.edge), 0, 0.06, 0);
  return noPick(t);
}

const groundTexture = () => canvasTex(2400, 1760, (ctx, w, h) => {
  const K = 40, X = (x) => (x + 30) * K, Z = (z) => (z + 22) * K;
  const rect = (x0, z0, x1, z1, c) => { ctx.fillStyle = c; ctx.fillRect(X(x0), Z(z0), (x1 - x0) * K, (z1 - z0) * K); };
  ctx.fillStyle = '#90a69b'; ctx.fillRect(0, 0, w, h);
  const r = rng(811);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(230,240,211,0.07)' : 'rgba(40,78,75,0.08)';
    ctx.fillRect(r() * w, r() * h, 3 + r() * 5, 2 + r() * 5);
  }
  // 一筆につながる回遊路。縁の真鍮色と小さな星が夜の目印になる。
  const path = (x0, z0, x1, z1) => {
    rect(x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, '#b69a68');
    rect(x0, z0, x1, z1, '#d3cfb9');
    ctx.strokeStyle = 'rgba(90,103,98,0.17)'; ctx.lineWidth = 1.4;
    for (let x = x0; x < x1; x += 0.65) { ctx.beginPath(); ctx.moveTo(X(x), Z(z0)); ctx.lineTo(X(x), Z(z1)); ctx.stroke(); }
    for (let z = z0; z < z1; z += 0.65) { ctx.beginPath(); ctx.moveTo(X(x0), Z(z)); ctx.lineTo(X(x1), Z(z)); ctx.stroke(); }
  };
  path(-26, -11, 26, -8.8); path(-26, 14.7, 26, 17.3);
  path(-26, -8.8, -23.5, 14.7); path(23.5, -8.8, 26, 14.7);
  path(-23.5, -0.9, 23.5, 1.3); path(-4, -11, 4, 17.3);
  path(-23.5, 10.4, -4, 12.4); path(4, 10.4, 23.5, 12.4);
  path(-23.3, -14.7, -20.7, -8.8);
  // 中庭の円形モザイク。
  ctx.fillStyle = '#d7d3be'; ctx.beginPath(); ctx.arc(X(0), Z(5), 5.1 * K, 0, Math.PI * 2); ctx.fill();
  for (const radius of [4.9, 4.5, 3.7]) {
    ctx.strokeStyle = radius === 4.5 ? '#a68e58' : '#a2b2aa'; ctx.lineWidth = radius === 4.5 ? 6 : 3;
    ctx.beginPath(); ctx.arc(X(0), Z(5), radius * K, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#59777e';
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? 1.1 : i % 4 ? 2.15 : 2.85;
    if (!i) { ctx.beginPath(); ctx.moveTo(X(Math.cos(a) * rr), Z(5 + Math.sin(a) * rr)); }
    else ctx.lineTo(X(Math.cos(a) * rr), Z(5 + Math.sin(a) * rr));
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c19a59'; ctx.beginPath(); ctx.arc(X(0), Z(5), 0.5 * K, 0, Math.PI * 2); ctx.fill();
  const littleStar = (x, z) => {
    ctx.save(); ctx.translate(X(x), Z(z)); ctx.fillStyle = '#c0a66c'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? 3 : 10; if (!i) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  for (let x = -22; x <= 22; x += 3.2) { littleStar(x, 16); littleStar(x, 0.2); }
  for (let z = -8; z < 14; z += 3.1) { littleStar(-24.75, z); littleStar(24.75, z); }
  rect(-30, -18.1, 30, -14.9, '#b7b3a2');
  rect(-30, -17.25, 30, -15.05, '#a19c8e');
});

function progressLamp(R, parent, x, z, symbol) {
  const b = group(parent, x, 0, z);
  add(b, G.box(0.7, 0.35, 0.7), mat(C.edge), 0, 0.175, 0);
  add(b, G.cyl(0.2, 0.25, 0.85, 10), mat(C.teal), 0, 0.75, 0);
  const m = glow('#a9e7db', 0.14);
  R.lampMats.push(m);
  add(b, G.sphere(0.28, 14, 10), m, 0, 1.3, 0, { cast: false });
  add(b, G.torus(0.33, 0.04, 6, 20), mat(C.brass), 0, 1.3, 0, { rot: [0.3, 0.1, 0] });
  textFace(b, symbol, 0, 0.62, 0.26, 0.4, 0.36, { size: 74, border: null, bg: C.teal });
  return b;
}

function makeFossil(R, root) {
  const f = R.fossil = group(root, -17, 0, 6);
  pad(f, 10.5, 6.8, '#d6d4c2');
  const bone = mat(C.bone, { roughness: 0.7 }), brass = mat(C.brass, { metalness: 0.2, roughness: 0.5 });
  const plinth = group(f, 0, 0, -0.45);
  add(plinth, G.box(8.7, 0.24, 2.65), mat(C.dark), 0, 0.37, 0);
  add(plinth, G.box(8.45, 0.04, 2.4), mat('#a8b5ad'), 0, 0.51, 0);
  for (const x of [-2.1, 1.2]) rod(plinth, [x, 0.53, 0], [x, 2.55, 0], 0.035, brass);
  // 首の長い恐竜。尻尾から頭まで一本の輪郭がつながり、欠けた肋骨だけが戻る。
  const spine = [[-4.55, 1.55, 0], [-3.5, 1.9, 0], [-2.5, 2.35, 0], [-1.1, 2.6, 0], [0.5, 2.5, 0], [1.55, 2.75, 0], [2.25, 3.55, 0], [2.55, 4.3, 0]];
  line(plinth, spine, 0.075, bone, false, 60);
  const sc = new THREE.CatmullRomCurve3(spine.map((p) => new THREE.Vector3(...p)));
  for (let i = 0; i < 31; i++) {
    const p = sc.getPoint(i / 30), s = i < 6 ? 0.1 : i > 23 ? 0.12 : 0.16;
    add(plinth, G.sphere(s, 8, 6), bone, p.x, p.y, p.z, { scale: [1.25, 0.9, 0.9] });
  }
  R.fossilRestored = dynamic(group(plinth), false);
  const rib = (parent, x, y, width) => {
    for (const side of [-1, 1]) line(parent, [[x, y, 0], [x + 0.08, y - 0.3, side * width * 0.8], [x + 0.13, y - 0.8, side * width], [x + 0.18, y - 1.08, side * width * 0.42]], 0.045, bone, false, 16);
  };
  for (let i = 0; i < 8; i++) rib(i === 2 || i === 5 ? R.fossilRestored : plinth, -2.15 + i * 0.43, 2.58 - Math.abs(i - 3.5) * 0.05, 0.65 + Math.sin(i / 7 * Math.PI) * 0.24);
  for (const [x, side] of [[-1.9, -1], [-1.7, 1], [0.75, -1], [1.0, 1]]) {
    const leg = x === 0.75 ? R.fossilRestored : plinth;
    const zz = side * 0.63;
    add(leg, G.sphere(0.16, 10, 8), bone, x, 2.3, zz);
    rod(leg, [x, 2.3, zz], [x - 0.15, 1.5, zz * 1.15], 0.095, bone);
    add(leg, G.sphere(0.115, 10, 8), bone, x - 0.15, 1.5, zz * 1.15);
    rod(leg, [x - 0.15, 1.5, zz * 1.15], [x + 0.12, 0.64, zz * 1.25], 0.075, bone);
    add(leg, G.sphere(0.15, 10, 8), bone, x + 0.15, 0.6, zz * 1.25, { scale: [1.6, 0.6, 0.9] });
    for (let j = 0; j < 3; j++) rod(leg, [x + 0.15, 0.6, zz * 1.25 + (j - 1) * 0.075], [x + 0.42, 0.56, zz * 1.25 + (j - 1) * 0.1], 0.032, bone);
  }
  const head = group(plinth, 2.82, 4.42, 0);
  add(head, G.sphere(0.35, 12, 8), bone, 0, 0, 0, { scale: [1.65, 0.85, 0.78] });
  add(head, G.box(0.57, 0.075, 0.38), bone, 0.2, -0.24, 0);
  for (const side of [-1, 1]) {
    add(head, G.sphere(0.1, 10, 8), mat('#4c4e4b'), -0.02, 0.05, side * 0.244, { scale: [1, 1, 0.3] });
    for (let i = 0; i < 4; i++) add(head, G.cone(0.027, 0.09, 4), bone, 0.1 + i * 0.1, -0.16, side * 0.17, { rot: [Math.PI, 0, 0], cast: false });
  }
  // 地層の断面と、順序を見比べる5つの小さな標本。
  const strata = group(f, -4.25, 0.26, -2.35);
  for (let i = 0; i < 5; i++) {
    add(strata, G.box(1.0, 0.29, 0.65), mat(['#766a65', '#8c7a69', '#a58b72', '#bba17e', '#cbb795'][i]), 0, 0.145 + i * 0.3, 0);
    add(strata, G.torus(0.075, 0.024, 6, 12), bone, (i % 2 ? -0.18 : 0.18), 0.15 + i * 0.3, 0.335, { cast: false });
  }
  for (let i = 0; i < 5; i++) {
    const x = -3.0 + i * 1.5;
    add(f, G.box(1.2, 0.48, 0.75), mat(C.stone), x, 0.48, 2.65);
    add(f, G.box(1.05, 0.045, 0.62), mat('#6d7c7c'), x, 0.745, 2.65);
    const stone = add(f, G.dodeca(0.23), mat(['#8c9f98', '#b6a38e', '#94a9a7', '#c4b8a0', '#a3a59c'][i]), x, 0.96, 2.65, { scale: [1.2, 0.75, 1], rot: [0.2, i, 0.1] });
    const spiral = [];
    for (let j = 0; j < 25; j++) { const a = j * 0.48, rr = 0.012 + j * 0.005; spiral.push([x + Math.cos(a) * rr, 0.99 + Math.sin(a) * rr, 2.86]); }
    if (i % 2 === 0) line(f, spiral, 0.012, bone, false, 30);
    stone.userData.noPick = false;
  }
  textFace(f, 'ときを つなぐ 化石', 0, 0.47, 3.1, 3.7, 0.42, { size: 56 });
  for (const x of [-4.6, 4.6]) {
    add(f, G.cyl(0.035, 0.06, 0.65, 8), brass, x, 0.6, 1.8);
    add(f, G.sphere(0.07, 8, 6), brass, x, 0.95, 1.8);
  }
  noPick(line(f, [[-4.6, 0.92, 1.8], [0, 0.7, 1.8], [4.6, 0.92, 1.8]], 0.025, mat('#8c6455')));
  progressLamp(R, f, 4.6, 2.7, '石');
  R.fossilClue = board(root, -23.1, 9.6, '地層の展示', ['下ほど古く、上ほど新しい', '5つの化石をくらべよう']);
}

function makeArchive(R, root) {
  const a = R.archive = group(root, -16, 0, -7);
  pad(a, 10.0, 6.5, '#d8cfb5');
  const wood = new THREE.MeshStandardMaterial({ map: planksTex('#816344', '#5d4b39', 8), roughness: 0.8 });
  add(a, G.box(10.4, 1.1, 0.4), mat(C.stone), 0, 0.78, -3.05);
  for (const x of [-4.9, 4.9]) {
    add(a, G.box(0.35, 1.1, 5.8), mat(C.stone), x, 0.78, -0.2);
    column(a, x, -2.85, 3.6);
  }
  // 奥だけの青緑の銅屋根。手前の棚・机・司書にはかからない。
  add(a, G.box(10.8, 0.22, 2.5), mat(C.teal), 0, 3.6, -2.1, { rot: [-0.11, 0, 0] });
  for (let x = -5.1; x < 5.2; x += 0.6) add(a, G.box(0.045, 0.05, 2.55), mat(C.patina), x, 3.73, -2.1, { rot: [-0.11, 0, 0], cast: false });
  const colors = ['#7d687f', '#b89b6b', '#6f9990', '#a16b63', '#4b697e', '#d1be91', '#72826c'];
  const rand = rng(820);
  const shelf = (parent, x, z, w, rows = 3, ry = 0) => {
    const s = group(parent, x, 0.24, z, ry), height = rows * 0.87 + 0.2;
    add(s, G.box(w, height, 0.18), wood, 0, height / 2, -0.35);
    for (const xx of [-w / 2, w / 2]) add(s, G.box(0.14, height, 0.75), wood, xx, height / 2, 0);
    for (let row = 0; row <= rows; row++) add(s, G.box(w, 0.09, 0.78), wood, 0, 0.1 + row * 0.87, 0);
    for (let row = 0; row < rows; row++) {
      let xx = -w / 2 + 0.17;
      while (xx < w / 2 - 0.18) {
        const bw = 0.13 + rand() * 0.12, bh = 0.49 + rand() * 0.21;
        add(s, G.box(bw, bh, 0.44), mat(colors[Math.floor(rand() * colors.length)]), xx + bw / 2, 0.15 + row * 0.87 + bh / 2, 0.09);
        for (const yy of [0.21, bh - 0.08]) add(s, G.box(bw * 0.74, 0.018, 0.012), mat('#d0bb83'), xx + bw / 2, 0.15 + row * 0.87 + yy, 0.318, { cast: false });
        xx += bw + 0.03;
      }
    }
    return s;
  };
  for (const x of [-3.3, 0, 3.3]) shelf(a, x, -2.45, 2.8);
  shelf(a, -4.3, -0.3, 2.2, 2, Math.PI / 2);
  textFace(a, '収 蔵 書 庫', 0, 3.21, -1.15, 3.7, 0.5, { bg: C.teal, size: 76 });
  // 棚の分類札。棚番号はルートパネルの地図と同じ。
  ['A', 'B', 'C'].forEach((t, i) => textFace(a, t, -3.3 + i * 3.3, 2.92, -2.04, 0.36, 0.28, { size: 76 }));
  // 書庫の配送台とミニチュアの経路図。
  const table = group(a, 0.7, 0, 0.35);
  for (const x of [-1.4, 1.4]) for (const z of [-0.85, 0.85]) add(table, G.box(0.14, 0.95, 0.14), wood, x, 0.7, z);
  add(table, G.box(3.25, 0.15, 2.05), wood, 0, 1.23, 0);
  add(table, G.box(2.9, 0.035, 1.7), mat('#ede3c7'), 0, 1.325, 0);
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) {
    const on = (x + z * 2) % 5 === 0;
    add(table, G.box(0.37, on ? 0.12 : 0.018, 0.32), mat(on ? C.teal : '#a9b7a8'), -1.18 + x * 0.47, 1.36, -0.58 + z * 0.39, { cast: false });
  }
  const cart = group(a, 3.5, 0.24, 1.5, -0.25);
  add(cart, G.box(1.0, 0.1, 0.67), mat(C.teal), 0, 0.3, 0);
  for (const x of [-0.37, 0.37]) for (const z of [-0.23, 0.23]) add(cart, G.cyl(0.12, 0.12, 0.06, 10), mat(C.dark), x, 0.15, z, { rot: [Math.PI / 2, 0, 0] });
  for (const x of [-0.4, 0.4]) rod(cart, [x, 0.3, -0.25], [x, 0.95, -0.25], 0.035, mat(C.brass));
  rod(cart, [-0.4, 0.95, -0.25], [0.4, 0.95, -0.25], 0.035, mat(C.brass));
  for (let i = 0; i < 3; i++) add(cart, G.box(0.68 - i * 0.07, 0.13, 0.44), mat(colors[i + 2]), i * 0.03, 0.43 + i * 0.14, 0.02, { rot: [0, i * 0.1, 0] });
  const desk = group(a, -2.9, 0, 1.7, 0.12);
  for (const x of [-0.65, 0.65]) add(desk, G.box(0.1, 0.95, 0.65), wood, x, 0.7, 0);
  add(desk, G.box(1.65, 0.12, 1.0), wood, 0, 1.22, 0);
  for (const side of [-1, 1]) add(desk, G.box(0.45, 0.055, 0.6), mat('#f3ead6'), side * 0.225, 1.33, 0, { rot: [0, 0, side * 0.12], cast: false });
  for (let i = 0; i < 5; i++) add(desk, G.box(0.32, 0.005, 0.012), mat('#a49372'), 0.23, 1.365, -0.2 + i * 0.08, { cast: false });
  R.archiveLamp = dynamic(group(a, -2.9, 0, 1.7), false);
  add(R.archiveLamp, G.cyl(0.24, 0.28, 0.08, 12), mat(C.brass), 0.55, 1.34, -0.23);
  rod(R.archiveLamp, [0.55, 1.38, -0.23], [0.55, 2.12, -0.23], 0.035, mat(C.brass));
  add(R.archiveLamp, G.cone(0.34, 0.28, 12, true), glow('#edcc86', 0.7), 0.55, 2.12, -0.23);
  star(R.archiveLamp, 0.55, 2.43, -0.23, 0.14, glow('#ffe4aa', 0.8));
  lightPool(R.archiveLamp, 0.15, 1.397, -0.05, 1.25, 0.8, '#ffe0a0');
  noPick(R.archiveLamp);
  progressLamp(R, a, 4.5, 2.7, '本');
  R.archiveClue = board(root, -10.0, -3.0, '収蔵書庫', ['3冊の本を、それぞれの棚へ', '台車は階段を通れません']);
}

function makeGarden(R, root) {
  const g = R.garden = group(root, 17, 0, 6);
  pad(g, 10.7, 6.8, '#c4d2c2');
  const brass = mat(C.brass, { metalness: 0.2, roughness: 0.45 });
  // 鉱石温室の奥半分。透明なガラスはクリックをふさがない。
  const frame = group(g, 0, 0, -1.55);
  for (const x of [-4.75, 0, 4.75]) {
    for (const z of [-1.7, 1.7]) rod(frame, [x, 0.24, z], [x, 3.7, z], 0.065, brass);
    rod(frame, [x, 3.7, -1.7], [x, 5.0, 0], 0.06, brass);
    rod(frame, [x, 5.0, 0], [x, 3.7, 1.7], 0.06, brass);
  }
  for (const z of [-1.7, 0, 1.7]) rod(frame, [-4.75, z ? 3.7 : 5, z], [4.75, z ? 3.7 : 5, z], 0.065, brass);
  const glass = new THREE.MeshStandardMaterial({ color: '#a2d8d1', transparent: true, opacity: 0.19, roughness: 0.14, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) {
    const pane = add(frame, G.plane(9.4, 2.12), glass, 0, 4.35, s * 0.85, { rot: [-s * 0.918, 0, 0], cast: false });
    pane.userData.noPick = true;
    for (const x of [-2.375, 2.375]) rod(frame, [x, 3.7, s * 1.7], [x, 5, 0], 0.035, brass, { cast: false });
  }
  const back = add(frame, G.plane(9.4, 3.35), glass, 0, 1.95, -1.73, { cast: false }); back.userData.noPick = true;
  for (const y of [1.35, 2.5]) rod(frame, [-4.75, y, -1.7], [4.75, y, -1.7], 0.03, brass, { cast: false });
  textFace(frame, '月 の 温 室', 0, 3.37, 1.78, 3.25, 0.46, { bg: C.teal, size: 76 });
  // 低い池と、星の浮かぶ水面。花は正面から見える位置にある。
  const pond = group(g, 0, 0.25, 0);
  add(pond, G.cyl(3.5, 3.7, 0.26, 40), mat(C.edge), 0, 0.13, 0, { scale: [1, 1, 0.64] });
  add(pond, G.cyl(3.34, 3.34, 0.07, 40), mat('#406d73'), 0, 0.29, 0, { scale: [1, 1, 0.64] });
  const water = waterize(new THREE.MeshStandardMaterial({ color: '#71b2b3', roughness: 0.13, metalness: 0.05, transparent: true, opacity: 0.87 }), { strength: 0.25 });
  const surface = add(pond, G.circle(3.28, 48), water, 0, 0.337, 0, { rot: [-Math.PI / 2, 0, 0], scale: [1, 0.64, 1], cast: false });
  surface.userData.noPick = true;
  for (const [x, z, r] of [[-1.8, 0.5, 0.37], [1.75, -0.5, 0.48], [1.05, 1.05, 0.32], [-1.05, -0.95, 0.25]]) {
    add(pond, G.circle(r, 16), mat('#659e87', { side: THREE.DoubleSide }), x, 0.35, z, { rot: [-Math.PI / 2, 0, 0], cast: false });
    noPick(line(pond, [[x - r * 0.7, 0.357, z], [x, 0.358, z], [x + r * 0.75, 0.357, z + r * 0.3]], 0.012, mat('#b8c595'), false, 6));
  }
  rod(pond, [0, 0.3, -0.35], [0, 1.65, -0.35], 0.055, mat(C.leaf));
  for (const side of [-1, 1]) add(pond, G.sphere(0.33, 12, 8), mat('#719d83'), side * 0.23, 0.95, -0.35, { scale: [1.4, 0.25, 0.65], rot: [0, 0, side * 0.45] });
  add(pond, G.sphere(0.23, 16, 10), mat('#d8d4b4'), 0, 1.7, -0.35, { scale: [0.7, 1.2, 0.7] });
  R.gardenBloom = dynamic(group(pond, 0, 1.7, -0.35), false);
  const petals = mat('#f3ecd1', { roughness: 0.5 });
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const p = add(R.gardenBloom, G.sphere(0.3, 14, 8), petals, Math.cos(a) * 0.41, 0.08, Math.sin(a) * 0.41, { scale: [1.8, 0.28, 0.72], rot: [0, -a, Math.sin(a) * 0.12] });
    p.userData.noPick = true;
  }
  add(R.gardenBloom, G.sphere(0.22, 14, 10), glow('#ffdda0', 0.8), 0, 0.18, 0, { scale: [1, 0.65, 1], cast: false });
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    add(R.gardenBloom, G.sphere(0.045, 8, 6), glow('#fff1b9', 0.6), Math.cos(a) * 0.14, 0.34, Math.sin(a) * 0.14, { cast: false });
  }
  // 小さな反り橋。中央の月の花を隠さないよう、池の左手に渡す。
  const bridge = group(g, -2.65, 0.37, 0.0, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const xx = -1.65 + i * 0.3, yy = 0.17 + Math.sin(i / 11 * Math.PI) * 0.28;
    add(bridge, G.box(0.28, 0.1, 1.05), mat(C.wood), xx, yy, 0);
    if (i % 3 === 0 || i === 11) for (const z of [-0.54, 0.54]) rod(bridge, [xx, yy, z], [xx, yy + 0.57, z], 0.035, brass);
  }
  for (const z of [-0.54, 0.54]) line(bridge, [[-1.65, 0.76, z], [0, 1.02, z], [1.65, 0.76, z]], 0.035, brass, false, 20);
  // 計量用の器は両方に大きな容量札をつける。
  const cans = group(g, -3.8, 0.24, 2.55);
  for (const [x, r, h, label, color] of [[-0.15, 0.34, 0.78, '5 L', '#4b8f96'], [0.9, 0.28, 0.6, '3 L', '#bfa46b']]) {
    add(cans, G.cyl(r, r * 0.85, h, 18), mat(color, { roughness: 0.45, metalness: 0.15 }), x, h / 2, 0);
    add(cans, G.torus(r, 0.03, 6, 20), brass, x, h, 0, { rot: [Math.PI / 2, 0, 0] });
    add(cans, G.torus(r * 0.75, 0.035, 6, 18, Math.PI), brass, x, h + 0.05, 0);
    textFace(cans, label, x, h * 0.55, r + 0.015, r * 1.55, h * 0.42, { bg: color, size: 72, border: null });
  }
  rod(cans, [-0.45, 0.4, 0], [-0.85, 0.66, 0], 0.08, mat('#4b8f96'));
  add(cans, G.cyl(0.13, 0.08, 0.07, 10), brass, -0.86, 0.68, 0, { rot: [0, 0, -0.8] });
  // 温室の鉱石棚。結晶は単独メッシュのまま、ゆっくり光を変えられる。
  const rand = rng(830);
  for (const x of [-3.55, 3.55]) {
    add(g, G.box(1.25, 0.85, 1.0), mat(C.stone), x, 0.68, -2.15);
    for (let i = 0; i < 5; i++) {
      const m = glow(['#8cbcc5', '#c3b7da', '#b6d7b8'][i % 3], 0.16, { roughness: 0.35 });
      const crystal = add(g, G.cyl(0.02, 0.14 + rand() * 0.08, 0.45 + rand() * 0.42, 5), m,
        x + (rand() - 0.5) * 0.85, 1.38, -2.15 + (rand() - 0.5) * 0.55, { rot: [(rand() - 0.5) * 0.3, rand(), (rand() - 0.5) * 0.4] });
      crystal.userData.keep = true;
      R.crystals.push(crystal);
    }
  }
  progressLamp(R, g, 4.7, 2.7, '花');
  R.gardenClue = board(root, 23.0, 9.6, '月の温室', ['花に必要な水は4リットル', '5Lじょうろと3Lバケツ']);
}

function makeLightBench(R, root) {
  const l = R.lightBench = group(root, 16, 0, -7);
  pad(l, 10.5, 6.7, '#c7ced0');
  const brass = mat(C.brass, { metalness: 0.25, roughness: 0.45 });
  add(l, G.box(10.8, 1.15, 0.4), mat(C.stone), 0, 0.82, -3.1);
  for (const x of [-5.1, 5.1]) {
    column(l, x, -2.85, 3.4);
    add(l, G.box(0.3, 0.9, 4.1), mat(C.stone), x, 0.7, -0.9);
  }
  add(l, G.box(11.2, 0.22, 1.8), mat(C.blue), 0, 3.45, -2.6, { rot: [-0.12, 0, 0] });
  for (let x = -5.2; x < 5.3; x += 0.6) add(l, G.box(0.04, 0.05, 1.85), mat(C.teal), x, 3.59, -2.6, { rot: [-0.12, 0, 0], cast: false });
  textFace(l, '光 の 実 験 室', 0, 3.0, -1.62, 3.8, 0.5, { bg: C.blue, size: 74 });
  const table = group(l, 0, 0, 0);
  for (const x of [-4.4, 4.4]) for (const z of [-1.75, 1.5]) add(table, G.box(0.18, 0.84, 0.18), mat(C.dark), x, 0.66, z);
  add(table, G.box(9.5, 0.2, 4.1), mat(C.teal), 0, 1.16, -0.1);
  add(table, G.box(9.25, 0.03, 3.86), mat('#283f57'), 0, 1.285, -0.1);
  // 真鍮の罫線は見やすい目盛り。5つの鏡には、それぞれ1〜5の刻印。
  for (let x = -4.0; x <= 4.0; x += 0.5) add(table, G.box(0.012, 0.008, 3.5), mat('#567a82'), x, 1.309, -0.1, { cast: false });
  for (let z = -1.6; z <= 1.5; z += 0.5) add(table, G.box(8.5, 0.008, 0.012), mat('#567a82'), 0, 1.309, z, { cast: false });
  const positions = [[-3.15, -0.9], [-1.65, 0.95], [0, -0.9], [1.65, 0.95], [3.15, -0.9]];
  positions.forEach(([x, z], i) => {
    const m = group(table, x, 1.31, z, i % 2 ? -0.63 : 0.63);
    add(m, G.cyl(0.28, 0.32, 0.08, 16), brass, 0, 0.04, 0);
    add(m, G.cyl(0.035, 0.05, 0.65, 8), brass, 0, 0.4, 0);
    add(m, G.box(0.72, 0.95, 0.12), brass, 0, 0.8, 0);
    add(m, G.box(0.6, 0.81, 0.025), mat('#abd3dd', { metalness: 0.25, roughness: 0.22, emissive: '#89c1d1', emissiveIntensity: 0.08 }), 0, 0.8, 0.079);
    add(m, G.box(0.08, 0.66, 0.008), mat('#e4f6eb'), -0.17, 0.82, 0.097, { rot: [0, 0, -0.2], cast: false });
    textFace(table, String(i + 1), x, 1.205, z + 0.44, 0.25, 0.23, { size: 72, border: null, bg: C.teal });
  });
  const source = group(table, -4.25, 1.6, -1.3);
  add(source, G.cyl(0.24, 0.24, 0.7, 16), brass, 0, 0.25, 0, { rot: [0, 0, Math.PI / 2] });
  add(source, G.sphere(0.17, 12, 8), glow('#ffe8a9', 0.9), 0.36, 0.25, 0, { cast: false });
  add(source, G.box(0.5, 0.32, 0.5), mat(C.dark), 0, -0.13, 0);
  const end = group(table, 4.25, 1.31, 1.3);
  add(end, G.cyl(0.32, 0.38, 0.15, 16), brass, 0, 0.075, 0);
  rod(end, [0, 0.15, 0], [0, 0.75, 0], 0.04, brass);
  star(end, 0, 0.95, 0, 0.37, mat('#d8bb7a'), 0.14);
  R.lightBeam = dynamic(group(table), false);
  const points = [[-3.89, 1.85, -1.3], ...positions.map(([x, z]) => [x, 2.11, z]), [4.25, 2.26, 1.3]];
  const beamMat = glow('#ffe5ab', 1.15), haloMat = new THREE.MeshBasicMaterial({ color: '#ffd79a', transparent: true, opacity: 0.13, depthWrite: false });
  for (let i = 0; i < points.length - 1; i++) {
    rod(R.lightBeam, points[i], points[i + 1], 0.025, beamMat, { cast: false });
    rod(R.lightBeam, points[i], points[i + 1], 0.09, haloMat, { cast: false });
  }
  for (const p of points.slice(1)) add(R.lightBeam, G.sphere(0.085, 10, 8), beamMat, ...p, { cast: false });
  star(R.lightBeam, 4.25, 2.26, 1.31, 0.3, glow('#fff0b6', 0.8));
  noPick(R.lightBeam);
  // 予備のレンズと三角プリズム、実験帳。
  for (let i = 0; i < 3; i++) {
    add(l, G.box(0.8, 0.65, 0.75), mat(C.stone), -3.0 + i * 2.8, 0.57, -2.45);
    const lens = add(l, G.torus(0.29, 0.04, 6, 24), brass, -3.0 + i * 2.8, 1.3, -2.45);
    if (i === 1) lens.rotation.y = 0.5;
    add(l, G.circle(0.25, 20), mat('#9bc4ce', { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), -3.0 + i * 2.8, 1.3, -2.44, { cast: false });
    rod(l, [-3.0 + i * 2.8, 0.9, -2.45], [-3.0 + i * 2.8, 1.07, -2.45], 0.035, brass);
  }
  progressLamp(R, l, 4.7, 2.7, '光');
  R.lightClue = board(root, 22.2, -3.0, '光の実験室', ['5枚すべての鏡を通して', '出口の星へ光をつなごう']);
}

function makeOrrery(R, root) {
  const o = R.orrery = group(root, 0, 0, -6);
  const brass = mat(C.brass, { metalness: 0.25, roughness: 0.4 });
  add(o, G.cyl(6.2, 6.4, 0.26, 64), mat(C.edge), 0, 0.13, 0);
  add(o, G.cyl(6.0, 6.0, 0.1, 64), mat('#c9d0c4'), 0, 0.31, 0);
  for (const r of [5.65, 4.95]) add(o, G.torus(r, 0.035, 6, 72), brass, 0, 0.375, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  // 上半球の後ろ半分を残したカットアウェイ。天球儀の全体が常に見える。
  const shell = add(o, new THREE.SphereGeometry(6.2, 40, 16, Math.PI, Math.PI, 0, Math.PI / 2), mat(C.blue, { side: THREE.DoubleSide, roughness: 0.6 }),
    0, 3.2, 0, { scale: [1, 0.57, 1] });
  shell.userData.roof = true;
  const inner = add(o, new THREE.SphereGeometry(6.09, 40, 16, Math.PI, Math.PI, 0, Math.PI / 2), mat('#203d59', { side: THREE.BackSide, roughness: 0.8 }),
    0, 3.2, 0, { scale: [1, 0.57, 1], cast: false });
  inner.userData.roof = true;
  const wall = add(o, new THREE.CylinderGeometry(6.12, 6.12, 2.85, 40, 1, true, Math.PI / 2, Math.PI), mat(C.stone, { side: THREE.DoubleSide }), 0, 1.775, 0);
  wall.userData.roof = true;
  const rim = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI; rim.push([Math.cos(a) * 6.22, 3.2, Math.sin(a) * 6.22]); }
  line(o, rim, 0.08, brass, false, 48);
  // 放射状の屋根継ぎ目と、切り口の化粧枠。
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + i * Math.PI / 8, pts = [];
    for (let j = 0; j <= 16; j++) { const t = j / 16 * Math.PI / 2; pts.push([Math.cos(a) * Math.sin(t) * 6.23, 3.2 + Math.cos(t) * 3.55, Math.sin(a) * Math.sin(t) * 6.23]); }
    line(o, pts, i === 0 || i === 8 ? 0.075 : 0.035, mat(i % 2 ? C.patina : C.brass), false, 24);
  }
  add(o, G.cyl(0.4, 0.65, 0.28, 16), brass, 0, 6.81, 0);
  add(o, G.sphere(0.2, 14, 10), brass, 0, 7.08, 0);
  star(o, 0, 7.6, 0, 0.39, brass, 0.12);
  for (const x of [-6.05, 6.05]) column(o, x, 0, 3.3);
  // 内壁の星図。線と星は屋根の下側へわずかに浮かせる。
  const rand = rng(840);
  for (let i = 0; i < 33; i++) {
    const a = Math.PI + 0.1 + rand() * (Math.PI - 0.2), t = 0.32 + rand() * 1.1;
    add(o, G.sphere(0.025 + rand() * 0.025, 6, 4), glow('#d6dfba', 0.45),
      Math.cos(a) * Math.sin(t) * 5.99, 3.2 + Math.cos(t) * 3.4, Math.sin(a) * Math.sin(t) * 5.99, { cast: false });
  }
  // 真鍮の台座と3本の傾いた天球環。中心の小さな太陽を惑星が巡る。
  add(o, G.cyl(2.0, 2.35, 0.4, 32), mat(C.dark), 0, 0.59, 0);
  add(o, G.cyl(1.72, 1.95, 0.27, 32), brass, 0, 0.92, 0);
  add(o, G.cyl(0.65, 1.35, 1.2, 20), mat(C.teal), 0, 1.6, 0);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    rod(o, [Math.cos(a) * 1.2, 1.1, Math.sin(a) * 1.2], [Math.cos(a) * 0.6, 2.15, Math.sin(a) * 0.6], 0.045, brass);
  }
  add(o, G.torus(0.62, 0.07, 8, 24), brass, 0, 2.2, 0, { rot: [Math.PI / 2, 0, 0] });
  R.orreryRotor = dynamic(group(o, 0, 3.6, 0));
  for (const [r, rx, rz] of [[2.4, 0.48, 0.1], [2.85, 1.08, -0.52], [3.25, 0.2, 0.72]]) {
    add(R.orreryRotor, G.torus(r, 0.05, 8, 64), brass, 0, 0, 0, { rot: [rx, 0.3, rz] });
  }
  add(R.orreryRotor, G.sphere(0.48, 24, 16), glow('#f5d18b', 0.55), 0, 0, 0);
  for (const [r, y, color, size, a] of [[1.3, 0.0, '#9dc2bc', 0.18, 0.5], [2.1, 0.5, '#b49bbf', 0.24, 2.6], [2.8, -0.35, '#b8a278', 0.29, 4.2]]) {
    rod(R.orreryRotor, [0, y, 0], [Math.cos(a) * r, y, Math.sin(a) * r], 0.023, brass, { cast: false });
    add(R.orreryRotor, G.sphere(size, 18, 12), mat(color), Math.cos(a) * r, y, Math.sin(a) * r);
    if (size > 0.25) add(R.orreryRotor, G.torus(size * 1.7, 0.025, 6, 28), brass, Math.cos(a) * r, y, Math.sin(a) * r, { rot: [1.2, 0, -0.2], cast: false });
  }
  noPick(R.orreryRotor);
  // 正面の操作台には展示の4つの印。答えの並びは示さない。
  const console = group(o, 0, 0, 4.25);
  add(console, G.box(3.6, 0.8, 1.0), mat(C.teal), 0, 0.8, 0);
  add(console, G.box(3.8, 0.12, 1.15), brass, 0, 1.25, 0, { rot: [0.15, 0, 0] });
  for (let i = 0; i < 4; i++) {
    add(console, G.cyl(0.3, 0.3, 0.11, 20), mat(C.dark), -1.25 + i * 0.83, 1.37, 0.02, { rot: [0.15, 0, 0] });
    add(console, G.sphere(0.075, 10, 8), mat('#d3b575'), -1.25 + i * 0.83, 1.45, 0.02, { scale: [1, 0.45, 1], cast: false });
  }
  textFace(console, '星 を あ わ せ る', 0, 0.9, 0.514, 2.7, 0.4, { bg: C.teal, size: 64 });
  R.starCanopy = dynamic(group(o), false);
  const stars = [[-4.5, 7.4, 2], [-3.2, 8.5, 1.2], [-1.8, 7.7, 2.2], [0, 9.05, 0.9], [1.8, 7.7, 2.2], [3.2, 8.5, 1.2], [4.5, 7.4, 2]];
  for (let i = 0; i < stars.length; i++) {
    const [x, y, z] = stars[i];
    star(R.starCanopy, x, y, z, i === 3 ? 0.35 : 0.22, glow('#ffe4a6', 0.95));
    if (i) rod(R.starCanopy, stars[i - 1], stars[i], 0.014, glow('#d8dcac', 0.5), { cast: false });
  }
  for (const [x, z] of [[-4.5, 2], [4.5, 2]]) line(R.starCanopy, [[x, 3.2, z], [x, 5.7, z], [x, 7.4, z]], 0.012, mat(C.brass), false, 8);
  noPick(R.starCanopy);
}

function makeStation(R, root) {
  const s = R.station = group(root, -22, 0, -13.7);
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex('#d3cebb', [4, 1]), roughness: 0.9 });
  add(s, G.box(11, FLOOR, 2.25), stone, 0, FLOOR / 2, 0);
  add(s, G.box(11.1, 0.07, 0.22), mat('#edd5a0'), 0, FLOOR + 0.035, -1.0);
  for (let x = -5.2; x <= 5.2; x += 0.3) add(s, G.box(0.13, 0.035, 0.14), mat('#b69862'), x, FLOOR + 0.078, -0.94, { cast: false });
  for (let i = 0; i < 3; i++) add(s, G.box(2.2, FLOOR * (3 - i) / 3, 0.34), stone, 2.0, FLOOR * (3 - i) / 6, 1.28 + i * 0.34);
  const building = group(s, -4.1, FLOOR, 1.75);
  add(building, G.box(3.9, 2.6, 2.5), mat(C.stone), 0, 1.3, 0);
  add(building, G.box(4.25, 0.18, 2.85), mat(C.teal), 0, 2.7, 0, { rot: [-0.12, 0, 0] });
  for (let x = -1.9; x <= 1.9; x += 0.5) add(building, G.box(0.04, 0.04, 2.9), mat(C.patina), x, 2.82, 0, { rot: [-0.12, 0, 0], cast: false });
  for (const x of [-1.85, 1.85]) add(building, G.box(0.15, 2.65, 0.15), mat(C.brass), x, 1.3, 1.23);
  add(building, G.box(0.85, 1.65, 0.06), mat(C.dark), -0.85, 0.825, 1.28);
  add(building, G.sphere(0.045, 8, 6), mat(C.brass), -0.57, 0.9, 1.33, { cast: false });
  add(building, G.box(1.2, 0.85, 0.07), mat(C.brass), 0.75, 1.35, 1.3);
  add(building, G.box(1.03, 0.67, 0.02), glow('#ffe2a8', 0.25), 0.75, 1.35, 1.35, { cast: false });
  add(building, G.box(0.035, 0.7, 0.03), mat(C.teal), 0.75, 1.35, 1.37);
  textFace(building, '星あかりの博物館', 0, 2.19, 1.33, 3.2, 0.4, { size: 58, bg: C.teal });
  const clock = canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = '#eee5cd'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 121, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a2854c'; ctx.lineWidth = 10; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); ctx.lineTo(128 + Math.sin(a) * 106, 128 - Math.cos(a) * 106); ctx.stroke(); }
    ctx.strokeStyle = C.dark; ctx.lineCap = 'round'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(96, 84); ctx.moveTo(128, 128); ctx.lineTo(182, 128); ctx.stroke();
  });
  add(building, G.circle(0.42, 32), new THREE.MeshBasicMaterial({ map: clock }), 0, 3.2, 0.05, { cast: false });
  add(building, G.torus(0.43, 0.05, 8, 32), mat(C.brass), 0, 3.2, 0.02);
  const sign = group(s, 3.3, FLOOR, -0.6);
  for (const x of [-1.2, 1.2]) add(sign, G.cyl(0.05, 0.065, 2.2, 8), mat(C.teal), x, 1.1, 0);
  textFace(sign, 'ほしあかり はくぶつかん', 0, 1.7, 0.06, 3.5, 0.75, { bg: '#f5edda', fg: C.ink, size: 55 });
  bench(s, 0.1, 0.55);
  lamp(s, -1.7, 0.4, 2.1);
  // ホームのベンチは床の高さへ上げる。
  for (const c of s.children) if (c.userData.noPick) c.position.y += FLOOR;
}

function makeEntry(R, root) {
  const e = R.entry = group(root, 0, 0, 10);
  for (const x of [-4.9, 4.9]) {
    add(e, G.box(1.0, 0.2, 1.0), mat(C.edge), x, 0.1, 0);
    add(e, G.box(0.65, 2.85, 0.65), mat(C.stone), x, 1.625, 0);
    add(e, G.box(0.95, 0.15, 0.95), mat(C.brass), x, 3.1, 0);
    add(e, G.sphere(0.23, 14, 10), glow('#ead5a0', 0.35), x, 3.42, 0);
  }
  line(e, [[-4.9, 3.2, 0], [-3.3, 4.2, 0], [0, 4.65, 0], [3.3, 4.2, 0], [4.9, 3.2, 0]], 0.085, mat(C.brass), false, 48);
  line(e, [[-4.9, 3.45, 0], [-3.3, 4.45, 0], [0, 4.9, 0], [3.3, 4.45, 0], [4.9, 3.45, 0]], 0.04, mat(C.teal), false, 48);
  for (let i = 0; i < 9; i++) {
    const x = -3.6 + i * 0.9, y = 4.75 - Math.pow(x / 4.9, 2) * 1.1;
    star(e, x, y + 0.08, 0, i === 4 ? 0.24 : 0.12, mat(C.brass));
  }
  textFace(e, '星 あ か り の 博 物 館', 0, 3.82, 0.05, 5.9, 0.6, { bg: C.dark, size: 72 });
  // 受付を脇に寄せ、館長の正面（x=0,z=8）を空けておく。
  const desk = group(e, -7.0, 0, 1.5);
  add(desk, G.box(2.8, 1.05, 1.3), mat(C.teal), 0, 0.525, 0);
  add(desk, G.box(3.0, 0.14, 1.5), mat(C.wood), 0, 1.12, 0);
  textFace(desk, 'ご案内', 0, 0.65, 0.66, 1.4, 0.43, { bg: C.teal, size: 82, border: null });
  add(desk, G.sphere(0.12, 12, 8), mat(C.brass), 0.8, 1.33, 0.3, { scale: [1, 0.7, 1] });
  add(desk, G.cyl(0.16, 0.16, 0.04, 12), mat(C.brass), 0.8, 1.23, 0.3);
  for (let i = 0; i < 3; i++) add(desk, G.box(0.75, 0.04, 0.5), mat('#e9dbb9'), -0.65 + i * 0.08, 1.23 + i * 0.045, 0.05, { rot: [0, 0.08 * i, 0], cast: false });
  R.mapBoard = board(root, 5.4, 15.0, '館内のご案内', ['見つけたことは、旅のメモへ', '気になる展示を調べよう'], { w: 3.8, h: 2.1 });
}

export function buildMuseumDiorama(scene) {
  const root = group(scene);
  const R = { root, lampMats: [], crystals: [] };
  const ground = add(root, new THREE.ShapeGeometry(roundRectShape(ISLAND.w - 0.4, ISLAND.d - 0.4, 3), 16),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }), 0, 0.012, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const p = ground.geometry.attributes.position, uv = ground.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + 30) / 60, 1 - (-p.getY(i) + 22) / 44);
  ground.userData.noPick = true;
  makeStation(R, root);
  makeFossil(R, root);
  makeArchive(R, root);
  makeGarden(R, root);
  makeLightBench(R, root);
  makeOrrery(R, root);
  makeEntry(R, root);

  // 庭の外周は低い石壁。手前を高くせず、どこからでも展示を見渡せる。
  const decor = noPick(group(root));
  const stone = mat(C.stone), brass = mat(C.brass), rand = rng(851);
  for (const x of [-28.5, 28.5]) {
    add(decor, G.box(0.45, 0.6, 29.5), stone, x, 0.3, 3.35);
    add(decor, G.box(0.56, 0.12, 29.65), mat(C.edge), x, 0.66, 3.35);
  }
  add(decor, G.box(53.5, 0.42, 0.42), stone, 0, 0.21, 19.45);
  add(decor, G.box(53.7, 0.1, 0.53), mat(C.edge), 0, 0.47, 19.45);
  for (const x of [-26.5, -14, -7, 7, 14, 26.5]) {
    add(decor, G.box(0.6, 0.7, 0.6), stone, x, 0.35, 19.45);
    add(decor, G.sphere(0.18, 12, 8), brass, x, 0.86, 19.45);
  }
  // 列車の奥は静かな彫刻庭園。線路には何もはみ出さない。
  for (const [x, z, s] of [[-27.2, -19.7, 0.9], [-17.5, -20.1, 1.1], [-8.5, -20.1, 0.85], [9, -20.0, 1.1], [18, -20, 0.85], [27, -19.8, 1.05], [-27, 6, 0.8], [27, 4, 0.8], [-26, 18, 0.9], [26, 18, 0.9]])
    tree(decor, x, z, Math.round((x + 30) * 31), s);
  for (const [x, z] of [[-25.5, -7.1], [25.5, -7.1], [-25.4, 12.1], [25.4, 12.1], [-8.1, 4.1], [8.1, 4.1], [-10.5, 16], [11, 16], [-4, -12.4], [4, -12.4]]) lamp(decor, x, z);
  for (const [x, z, ry] of [[-19, 17.9, 0], [18.5, 17.9, 0], [-9.0, 6.8, Math.PI / 2], [9.0, 6.8, -Math.PI / 2]]) {
    const b = bench(x === -19 ? root : decor, x, z, ry);
    if (x === -19) {
      R.bench = dynamic(b);
      b.traverse((o) => { o.userData.noPick = false; });
    }
  }
  for (const [x, z, w, d] of [[-14.0, 18, 4.2, 0.85], [13.5, 18, 4.2, 0.85], [-7.1, 13.8, 3.7, 0.8], [9.0, 13.8, 2.8, 0.8], [-26.8, 0, 0.8, 3.0], [26.8, -1, 0.8, 3.0], [-7.5, -11.5, 2.4, 0.8], [7.5, -11.5, 2.4, 0.8]])
    planter(decor, x, z, w, d, Math.floor(rand() * 1000));
  // 手前の余白に置く、星の鉱石と小さな観察道具の野外展示。
  for (const [x, z, height, color] of [[-23, 14, 0.9, '#96b7be'], [22, 14, 1.15, '#ada3bf'], [-12.1, -12.0, 0.75, '#b5c1a5']]) {
    add(decor, G.cyl(0.8, 0.95, 0.4, 8), mat(C.edge), x, 0.2, z);
    for (let i = 0; i < 4; i++) add(decor, G.cyl(0.02, 0.23, height * (0.55 + i * 0.15), 5), mat(color, { roughness: 0.4 }), x + (i - 1.5) * 0.23, 0.45 + height * (0.55 + i * 0.15) / 2, z + (i % 2 ? -0.12 : 0.13), { rot: [0.1 * i, i * 1.3, (i - 1.5) * 0.15] });
  }
  // 天体観測の双眼鏡。望遠鏡は奥へ向き、住人の前に出ない。
  for (const [x, z, ry] of [[-4.5, 18.0, -0.4], [2.4, 18.0, 0.3]]) {
    const scope = group(x === -4.5 ? root : decor, x, 0, z, ry);
    if (x === -4.5) R.telescope = dynamic(scope);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; rod(scope, [Math.cos(a) * 0.48, 0.05, Math.sin(a) * 0.48], [0, 1.3, 0], 0.035, brass); }
    const tube = group(scope, 0, 1.5, 0); tube.rotation.x = -0.55;
    add(tube, G.cyl(0.18, 0.22, 1.4, 16), mat(C.teal), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
    add(tube, G.cyl(0.23, 0.23, 0.1, 16), brass, 0, 0, -0.7, { rot: [Math.PI / 2, 0, 0] });
    add(tube, G.circle(0.18, 20), mat('#8ab9c3', { metalness: 0.15, roughness: 0.2, side: THREE.DoubleSide }), 0, 0, -0.758, { cast: false });
    add(tube, G.cyl(0.075, 0.09, 0.25, 12), mat(C.dark), 0, 0, 0.77, { rot: [Math.PI / 2, 0, 0] });
  }
  // 床の星灯りはオブジェクトを増やさず、小さな自発光タイルで表現する。
  for (let x = -21.5; x <= 22; x += 3.1) for (const z of [14.95, 17.05]) {
    const tile = add(decor, G.box(0.13, 0.025, 0.13), glow('#ecd7a1', 0.3), x, 0.032, z, { rot: [0, Math.PI / 4, 0], cast: false });
    tile.userData.noPick = true;
  }
  // noPick は新しく加えた子にも設定する。
  noPick(decor);
  return R;
}
