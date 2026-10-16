import * as THREE from 'three';
import { add, G, mat, group, canvasTex, FONT, rng } from '../../lib/util.js';

// 佐賀大和温泉ホテル アマンディ。公式外観・4フロアの館内図・航空写真を照合。
// 1 unit ≒ 1m、正面 +z。実際の正面は概ね東向きなので配置側で回転する。
// 寸法は実測図ではなく写真比率からの概算。参考資料は docs/saga-amandi-references.md。
export const AMANDI_SIZE = { w: 125, d: 85, h: 22.8 };
const C = {
  wall: '#d5c8aa', panel: '#c4b696', groove: '#b4a789', maroon: '#683a3e',
  burgundy: '#763046', sign: '#882c48', glass: '#526566', frame: '#c1c3b4',
  tile: '#dce2d9', roof: '#b4b6ac', stone: '#74857d', water: '#a8c8b5',
  wood: '#c39366', leaf: '#526c4a', road: '#777c78', line: '#e8e5d1',
};
const box = (p, w, h, d, color, x, y, z, opt) => add(p, G.sharpBox(w, h, d), mat(color), x, y, z, opt);
const noPick = (o) => { o.traverse((c) => { c.userData.noPick = true; }); return o; };

function textTexture(text, { bg = C.sign, fg = '#f8f2e8', sub = '', title = '', script = false } = {}) {
  return canvasTex(1024, 384, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = script ? 210 : 130; c.font = `${script ? 'italic bold' : '700'} ${size}px ${script ? 'Georgia, serif' : FONT}`;
    while (c.measureText(text).width > W * 0.93) { size -= 2; c.font = `${script ? 'italic bold' : '700'} ${size}px ${script ? 'Georgia, serif' : FONT}`; }
    c.fillText(text, W / 2, H * (title || sub ? 0.52 : 0.54));
    if (title) { c.font = `600 48px ${FONT}`; c.fillText(title, W / 2, H * 0.12); }
    if (sub) { c.font = `600 42px ${FONT}`; c.fillText(sub, W / 2, H * 0.87); }
  });
}

function signFace(p, texture, w, h, x, y, z, ry = 0) {
  return add(p, G.plane(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), x, y, z,
    { rot: [0, ry, 0], cast: false });
}

function rod(p, from, to, radius, material, cast = true) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const m = add(p, G.cyl(radius, radius, d.length(), 7), material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, { cast });
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

function cladding(p, x, z, w, h, ry = 0) {
  const g = group(p, x, 0, z, ry);
  for (let y = 0.5; y < h; y += 0.58) box(g, w, 0.055, 0.08, C.groove, 0, y, 0, { cast: false });
  for (let xx = -w / 2; xx <= w / 2; xx += 5.2) {
    box(g, 0.2, h, 0.18, C.wall, xx, h / 2, 0.06);
    box(g, 0.035, h, 0.025, '#e3d8bd', xx - 0.04, h / 2, 0.17, { cast: false });
  }
  return g;
}

function window(p, x, y, z, w, h, ry = 0, transparent = false) {
  const g = group(p, x, y, z, ry);
  const glass = mat(C.glass, transparent ? { transparent: true, opacity: 0.34, depthWrite: false, roughness: 0.2 } : { roughness: 0.25 });
  add(g, G.box(w, h, 0.1), glass, 0, 0, 0, { cast: false });
  for (const xx of [-w / 2, w / 2]) box(g, 0.1, h + 0.16, 0.2, C.frame, xx, 0, 0.04);
  for (const yy of [-h / 2, h / 2]) box(g, w + 0.18, 0.1, 0.2, C.frame, 0, yy, 0.04);
  box(g, 0.08, h, 0.18, C.frame, 0, 0, 0.04);
  box(g, w - 0.18, 0.13, 0.015, '#81958e', 0, h * 0.17, 0.065, { cast: false });
  return g;
}

function pine(p, x, z, seed, s = 1) {
  const rand = rng(seed), g = group(p, x, 0, z);
  add(g, G.cyl(0.15 * s, 0.25 * s, 3.3 * s, 8), mat('#655642'), 0, 1.65 * s, 0);
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4, xx = Math.cos(a) * (0.6 + rand() * 0.7) * s, zz = Math.sin(a) * s * 0.6, yy = (1.6 + i * 0.38) * s;
    rod(g, [0, yy * 0.65, 0], [xx, yy, zz], 0.065 * s, mat('#655642'));
    add(g, G.sphere((0.75 + rand() * 0.2) * s, 10, 7), mat(i % 2 ? '#577347' : '#4a6542'), xx, yy, zz,
      { scale: [1.5, 0.43, 1.1] });
  }
  return noPick(g);
}

function mainBuilding(root) {
  const hotel = group(root), h = 15.5;
  box(hotel, 82, h, 32, C.wall, 0, h / 2, 0);
  box(hotel, 82.5, 0.36, 32.5, C.maroon, 0, 15.55, 0);
  box(hotel, 80.9, 0.14, 31.0, C.roof, 0, 15.83, 0);
  cladding(hotel, 0, 16.07, 81.6, h);
  cladding(hotel, 41.07, 0, 32, h, Math.PI / 2);
  cladding(hotel, -41.07, 0, 32, h, -Math.PI / 2);
  for (const y of [3.8, 10.9]) {
    box(hotel, 82.25, 0.65, 32.25, C.maroon, 0, y, 0);
    box(hotel, 82.35, 0.06, 32.35, '#8c675c', 0, y + 0.42, 0);
  }
  // 上階は公式館内図にあるホテル客室。正面と裏面に並ぶ小さな窓。
  for (const y of [10.0, 13.5]) for (let x = -36; x <= 36; x += 6.5) {
    window(hotel, x, y, 16.19, 2.75, 1.4);
    window(hotel, x, y, -16.19, 2.75, 1.4, Math.PI);
  }
  for (const x of [-41.2, 41.2]) for (const z of [-10, -3, 7]) for (const y of [10.0, 13.5])
    window(hotel, x, y, z, 3.2, 1.5, x < 0 ? -Math.PI / 2 : Math.PI / 2);
  // 実物正面の背が高い格子ガラスを、白い枠の中へ置く。
  const atrium = group(hotel, -2, 0, 16.3);
  box(atrium, 30, 8.1, 0.1, C.glass, 0, 5.3, 0);
  for (const x of [-15.3, 15.3]) box(atrium, 0.48, 8.6, 0.5, C.tile, x, 5.4, 0.22);
  box(atrium, 31.1, 0.5, 0.5, C.tile, 0, 9.8, 0.22);
  for (let x = -15; x <= 15; x += 3) box(atrium, 0.12, 8.1, 0.26, '#929b91', x, 5.3, 0.18);
  for (const y of [2.5, 4.7, 6.8, 8.9]) box(atrium, 30, 0.12, 0.26, '#929b91', 0, y, 0.18);
  for (let x = -35; x <= 35; x += 6.5) window(hotel, x, 1.8, 16.3, 5.3, 2.6);
  const entrance = group(hotel, 1, 0, 17.0);
  window(entrance, 0, 1.75, 0.05, 7.0, 3.2);
  for (const x of [-1.6, 1.6]) box(entrance, 0.05, 0.7, 0.05, '#d8d0ae', x, 1.4, 0.2);
  // えんじの正面帯と屋上の大きな Amandi 看板。
  const logo = textTexture('Amandi', { title: '佐賀大和温泉＆ホテル', sub: 'one day Spa resort', script: true });
  box(hotel, 14.8, 5.3, 0.25, '#363d38', 26, 7.1, 16.27);
  signFace(hotel, logo, 14.2, 4.7, 26, 7.1, 16.43);
  const sign = group(hotel, -8, 0, -1.7);
  box(sign, 29, 6.8, 6.0, C.burgundy, 0, 19.2, 0);
  signFace(sign, logo, 28.4, 6.45, 0, 19.2, 3.07);
  for (let y = 16.3; y < 22.5; y += 0.8) box(sign, 6, 0.035, 0.03, '#58384b', 14.54, y, 0, { rot: [0, Math.PI / 2, 0], cast: false });
  // 屋根の小設備は航空写真の配置の塊を手掛かりに補完。
  for (const [x, z, w, d] of [[-30, -4, 8, 4], [23, -8, 12, 5], [30, 8, 5, 4]]) {
    box(hotel, w, 0.9, d, '#9da69a', x, 16.4, z);
    for (let xx = x - w / 2 + 1; xx < x + w / 2; xx += 1.5)
      box(hotel, 0.045, 0.9, d, '#c3c8bc', xx, 16.4, z, { cast: false });
  }
  for (const x of [13, 19, 25]) add(hotel, G.cyl(0.05, 0.05, 4.5, 6), mat('#c8cebf'), x, 18.0, -4);
  return { hotel, entrance, sign };
}

function carport(root) {
  const canopy = group(root, -2, 0, 17.0), outline = new THREE.Shape();
  outline.moveTo(-35, 0); outline.lineTo(35, 0); outline.lineTo(35, 10.5);
  outline.quadraticCurveTo(0, 26, -35, 10.5); outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.65, bevelEnabled: false, curveSegments: 28 });
  geometry.rotateX(Math.PI / 2); geometry.translate(0, 5.8, 0);
  add(canopy, geometry, mat(C.maroon));
  const underside = new THREE.ShapeGeometry(outline, 28); underside.rotateX(Math.PI / 2);
  add(canopy, underside, mat('#dddcd0', { side: THREE.DoubleSide }), 0, 5.14, 0, { cast: false });
  const tileTexture = canvasTex(128, 128, (c, W, H) => {
    c.fillStyle = '#d6dfdb'; c.fillRect(0, 0, W, H); c.strokeStyle = '#b3c1bd'; c.lineWidth = 2;
    for (let n = 0; n <= W; n += 16) { c.beginPath(); c.moveTo(n, 0); c.lineTo(n, H); c.stroke(); c.beginPath(); c.moveTo(0, n); c.lineTo(W, n); c.stroke(); }
  });
  tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping; tileTexture.repeat.set(1, 5);
  const columns = new THREE.MeshStandardMaterial({ color: '#eeeeeb', map: tileTexture, roughness: 0.8 });
  for (const x of [-33, -21, -9, 3, 15, 27]) {
    const z = 17.0 - Math.pow(x / 35, 2) * 7.5;
    add(canopy, G.cyl(0.65, 0.68, 5.25, 16), columns, x, 2.65, z);
    add(canopy, G.cyl(0.76, 0.76, 0.25, 16), mat('#e0e3d7'), x, 0.2, z);
  }
  box(canopy, 68, 0.9, 0.5, C.maroon, 0, 3.7, -0.4);
  signFace(canopy, textTexture('Amandi', { bg: C.maroon, script: true, sub: 'one day Spa resort' }), 12, 1.0, -2, 3.7, -0.12);
  return canopy;
}

function baths(root) {
  const spa = group(root, 0, 0, -22), outdoorBaths = group(root, 0, 0, -34);
  box(spa, 79, 4.7, 12.0, C.wall, 0, 2.35, 0);
  box(spa, 80, 0.35, 13.0, '#adafa1', 0, 4.8, 0);
  box(outdoorBaths, 78, 0.22, 12, '#8e8c77', 0, 0.12, 0);
  const water = mat(C.water, { roughness: 0.2, transparent: true, opacity: 0.84 });
  for (const side of [-1, 1]) {
    const yard = group(outdoorBaths, side * 19.3, 0, 0);
    box(yard, 35.0, 0.1, 10.5, '#8a927b', 0, 0.28, 0);
    add(yard, G.cyl(4.1, 4.1, 0.25, 22), mat('#69776d'), -3.2, 0.48, 0, { scale: [1.5, 1, 0.85] });
    add(yard, G.circle(3.75, 28), water, -3.2, 0.62, 0, { rot: [-Math.PI / 2, 0, 0], scale: [1.55, 0.85, 1], cast: false });
    for (let i = 0; i < 15; i++) {
      const a = i * Math.PI * 2 / 15, r = 4.0, size = 0.65 + (i % 3) * 0.16, sy = 0.5 + (i % 4) * 0.25;
      add(yard, G.ico(size, 1), mat(i % 2 ? '#72847a' : '#7d8c7e'),
        -3.2 + Math.cos(a) * r * 1.55, 0.35 + size * sy, Math.sin(a) * r * 0.8,
        { scale: [1.15, sy, 0.85], rot: [0, i * 0.7, 0] });
    }
    // 公式写真の3つの樽風呂と木のデッキ。
    box(yard, 9.1, 0.28, 5.2, C.wood, 11.2, 0.46, 0);
    for (let x = 7; x < 15.8; x += 0.32) box(yard, 0.025, 0.015, 5.1, '#946d4f', x, 0.61, 0, { cast: false });
    for (const x of [8.1, 11.2, 14.3]) {
      add(yard, G.cyl(1.2, 1.08, 0.82, 20), mat('#cb9c68'), x, 0.99, 0);
      for (const y of [0.74, 1.26]) add(yard, G.torus(1.16, 0.028, 5, 22), mat('#8a8b7a'), x, y, 0, { rot: [Math.PI / 2, 0, 0] });
      add(yard, G.circle(1.1, 22), water, x, 1.42, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
      add(yard, G.cyl(0.07, 0.07, 1.4, 7), mat('#c4b381'), x, 1.3, -1.1);
      rod(yard, [x, 1.9, -1.1], [x, 1.9, -0.6], 0.07, mat('#c4b381'));
    }
    pine(yard, -15.5, -3.4, 72 + side, 0.85); pine(yard, 3.7, -3.3, 93 + side, 0.65);
  }
  // 川側の竹垣は写真通りの淡い竹色。入浴者は置かない。
  for (let x = -39; x <= 39; x += 0.28) add(outdoorBaths, G.cyl(0.12, 0.12, 2.25, 7), mat('#cbb98b'), x, 1.4, -5.6);
  for (const y of [0.7, 1.75, 2.3]) box(outdoorBaths, 79, 0.09, 0.1, '#b7a476', 0, y, -5.43);
  box(outdoorBaths, 0.15, 2.2, 11.8, '#c9b98b', 0, 1.3, 0);
  return { spa, outdoorBaths };
}

function poolWing(root) {
  const pool = group(root, 61, 0, -2), w = 40, d = 34;
  box(pool, w, 0.35, d, C.tile, 0, 0.2, 0);
  box(pool, w, 1.1, 0.3, C.wall, 0, 0.55, 17);
  box(pool, w, 9.5, 0.35, C.wall, 0, 4.75, -17);
  box(pool, 0.3, 1.1, d, C.wall, 20, 0.55, 0);
  for (const z of [-17, 17]) for (let x = -18; x <= 18; x += 6) window(pool, x, 5.0, z + (z > 0 ? 0.1 : -0.1), 5.8, 7.8, z > 0 ? 0 : Math.PI, true);
  for (let z = -13; z <= 13; z += 6.5) window(pool, 20.1, 5, z, 6.2, 7.8, Math.PI / 2, true);
  // 明るい白のアーチ屋根。低層プール棟がホテル棟と別の量塊になる。
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-20.4, 9.3, 0), new THREE.Vector3(0, 15.2, 0), new THREE.Vector3(20.4, 9.3, 0));
  const roofShape = new THREE.Shape(); const pts = curve.getPoints(24);
  roofShape.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) roofShape.lineTo(p.x, p.y);
  for (const p of pts.slice().reverse()) roofShape.lineTo(p.x, p.y + 0.3); roofShape.closePath();
  const roof = add(pool, new THREE.ExtrudeGeometry(roofShape, { depth: 35.0, bevelEnabled: false }), mat('#c9d1ca'), 0, 0, -17.5);
  for (const z of [-17, -9, 0, 9, 17]) {
    const rib = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-20.3, 9.45, z), new THREE.Vector3(0, 15.35, z), new THREE.Vector3(20.3, 9.45, z));
    add(pool, new THREE.TubeGeometry(rib, 24, 0.055, 5, false), mat('#ecece0'));
  }
  const shape = new THREE.Shape(); shape.moveTo(-13, -8);
  shape.bezierCurveTo(-18, -5, -16, 8, -9, 9); shape.bezierCurveTo(-3, 10, 2, 4, 8, 7);
  shape.bezierCurveTo(16, 10, 18, -4, 12, -8); shape.bezierCurveTo(5, -13, -4, -11, -13, -8);
  const basin = new THREE.ShapeGeometry(shape, 32); basin.rotateX(-Math.PI / 2);
  add(pool, basin, mat('#83c6cd', { roughness: 0.15 }), 0, 0.48, 0, { cast: false });
  const slidePoints = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50, a = t * Math.PI * 2.3;
    slidePoints.push(new THREE.Vector3(Math.cos(a) * (11 - t * 4), 8.1 - t * 6.5, Math.sin(a) * (8 - t * 3)));
  }
  add(pool, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(slidePoints), 100, 0.66, 12, false), mat('#189dc2', { transparent: true, opacity: 0.82, roughness: 0.25 }));
  for (const [x, z] of [[-11, 0], [8, -6], [8, 6]]) add(pool, G.cyl(0.17, 0.17, 8.3, 9), mat('#69639b'), x, 4.3, z);
  for (let i = 0; i < 22; i++) box(pool, 2.3, 0.27, 0.5, '#c8525c', -14, 0.62 + i * 0.3, 7 - i * 0.44);
  return { pool, poolRoof: roof };
}

function grounds(root) {
  const parking = group(root);
  box(parking, 125, 0.15, 85, C.road, 20.5, -0.1, 2.5);
  box(parking, 81, 0.22, 3.0, '#b2b3a1', 0, 0.13, 18);
  for (const x of [-36, -30, -24, 32, 38, 44, 50, 56, 62, 68, 74]) {
    for (const dx of [-1.3, 1.3]) box(parking, 0.09, 0.025, 4.8, C.line, x + dx, 0.012, 40.2, { cast: false });
    box(parking, 2.6, 0.025, 0.09, C.line, x, 0.012, 42.6, { cast: false });
  }
  // 数台のみ。施設の広い車寄せと正面文字を隠さない。
  for (const [i, x] of [-30, -24, 38, 50, 68].entries()) {
    const car = group(parking, x, 0, 40.0), paint = ['#dddcd1', '#a0a9a3', '#3f4b50', '#d8d6c9', '#899fa4'][i];
    box(car, 1.7, 0.8, 3.8, paint, 0, 0.65, 0); box(car, 1.4, 0.65, 2.0, '#455b60', 0, 1.3, 0);
    box(car, 1.48, 0.1, 1.8, paint, 0, 1.67, 0);
    for (const x of [-0.84, 0.84]) for (const z of [-1.2, 1.2]) add(car, G.cyl(0.3, 0.3, 0.16, 9), mat('#303635'), x, 0.33, z, { rot: [0, 0, Math.PI / 2] });
  }
  for (const [x, z, s] of [[-39, 23, 1.0], [35, 22, 1.2], [78, 26, 1.0], [-38, 35, 0.85]]) {
    box(parking, 4.5, 0.32, 4.3, '#aaa58c', x, 0.18, z);
    box(parking, 4.1, 0.15, 3.9, '#899174', x, 0.4, z); pine(parking, x, z, Math.round(x + 162), s);
  }
  const roadSign = group(root, -39, 0, 41.2);
  for (const x of [-1.7, 1.7]) box(roadSign, 0.15, 6.4, 0.15, '#a6aea1', x, 3.2, 0);
  box(roadSign, 6.2, 4.3, 0.35, C.burgundy, 0, 6.3, 0);
  signFace(roadSign, textTexture('Amandi', { script: true, title: '佐賀大和温泉ホテル', sub: 'アマンディ' }), 6.0, 4.1, 0, 6.3, 0.2);
  return { parking: noPick(parking), roadSign };
}

export function createAmandiSaga(parent) {
  const root = group(parent); root.name = '佐賀大和温泉ホテル アマンディ';
  const R = { root, ...grounds(root), ...mainBuilding(root), canopy: carport(root), ...baths(root), ...poolWing(root) };
  R.focusTarget = new THREE.Vector3(0, 6, 16);
  R.views = {
    front: { position: [12, 22, 103], target: [0, 6.5, 15] },
    whole: { position: [134, 98, 148], target: [17, 4, 0] },
    baths: { position: [-47, 25, -76], target: [-7, 0.8, -33] },
  };
  R.bounds = { min: [-42.1, -0.175, -40], max: [83, 22.8, 45] };
  R.size = { ...AMANDI_SIZE };
  return R;
}
