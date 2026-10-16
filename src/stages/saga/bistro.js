import * as THREE from 'three';
import { add, mat, G, group, rng, canvasTex, FONT } from '../../lib/util.js';

// 架空のビストロ。特定の実在店の意匠・名称を使わない。
// 足元が原点、+zが正面。入口前とテラスの間を広く空けておく。
const C = {
  plaster: '#eee6d4', sage: '#6d8978', dark: '#365649', wood: '#947452',
  timber: '#715b43', brick: '#af795b', cream: '#f3e9cf', brass: '#b49c64',
};

function rod(parent, a, b, radius, material) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), d = q.clone().sub(p);
  const mesh = add(parent, G.cyl(radius, radius, d.length(), 8), material,
    (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

function curve(parent, points, radius, material, segments = 20) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(path, segments, radius, 6, false), material);
}

function instanced(parent, geometry, material, placements) {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length), o = new THREE.Object3D();
  placements.forEach((p, i) => {
    o.position.fromArray(p.p); o.rotation.set(...(p.r || [0, 0, 0])); o.scale.fromArray(p.s || [1, 1, 1]);
    o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    if (p.color) mesh.setColorAt(i, new THREE.Color(p.color));
  });
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh); return mesh;
}

function plasterMaterial() {
  const texture = canvasTex(512, 512, (ctx, W, H) => {
    const r = rng(861); ctx.fillStyle = C.plaster; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9500; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,250,.12)' : 'rgba(117,104,74,.055)';
      ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
    }
  });
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
}

function textMaterial(title, lines = [], { w = 1024, h = 768, background = '#f2ead8', ink = '#365649' } = {}) {
  const texture = canvasTex(w, h, (ctx, W, H) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#b3a580'; ctx.lineWidth = 3; ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const print = (str, y, size, weight = 600) => {
      let fs = size; ctx.font = `${weight} ${fs}px ${FONT}`;
      while (ctx.measureText(str).width > W * 0.84 && fs > 10) { fs--; ctx.font = `${weight} ${fs}px ${FONT}`; }
      ctx.fillText(str, W / 2, y);
    };
    print(title, lines.length ? H * 0.23 : H / 2, lines.length ? 78 : 100);
    if (lines.length) {
      ctx.strokeStyle = '#bcb397'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W * 0.18, H * 0.37); ctx.lineTo(W * 0.82, H * 0.37); ctx.stroke();
      lines.forEach((line, i) => print(line, H * (0.52 + i * 0.16), i === 1 ? 58 : 48, i === 1 ? 700 : 500));
    }
  });
  return new THREE.MeshBasicMaterial({ map: texture });
}

function herbPot(parent, x, y, z, s = 1, seed = 1, flowers = false) {
  const p = group(parent, x, y, z), r = rng(seed);
  add(p, G.cyl(0.18 * s, 0.13 * s, 0.28 * s, 12), mat('#b78e6d'), 0, 0.14 * s, 0);
  add(p, G.cyl(0.19 * s, 0.19 * s, 0.05 * s, 12), mat('#c39b76'), 0, 0.27 * s, 0);
  add(p, G.cyl(0.155 * s, 0.155 * s, 0.012, 12), mat('#554d39'), 0, 0.291 * s, 0);
  const leaves = [];
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, height = (0.36 + r() * 0.27) * s, radius = r() * 0.21 * s;
    const xx = Math.cos(a) * radius, zz = Math.sin(a) * radius;
    if (i < 8) rod(p, [0, 0.29 * s, 0], [xx, height, zz], 0.008 * s, mat('#668158'));
    leaves.push({ p: [xx, height, zz], s: [0.06 * s, 0.025 * s, 0.035 * s], r: [r(), a, r()],
      color: i % 3 ? '#6f8b58' : '#96a16c' });
  }
  instanced(p, G.sphere(1, 8, 6), mat('#ffffff', { roughness: 1 }), leaves);
  if (flowers) for (let i = 0; i < 4; i++) {
    const a = i * 2.4;
    add(p, G.sphere(0.032 * s, 7, 5), mat('#d7d0b9'), Math.cos(a) * 0.13 * s, (0.56 + i * 0.025) * s, Math.sin(a) * 0.13 * s);
  }
  return p;
}

function chair(parent, x, z, ry = 0) {
  const c = group(parent, x, 0, z, ry), wood = mat(C.timber), sage = mat(C.sage);
  add(c, G.box(0.46, 0.055, 0.44), sage, 0, 0.46, 0);
  for (const xx of [-0.18, 0.18]) for (const zz of [-0.16, 0.16])
    rod(c, [xx * 1.2, 0.02, zz * 1.2], [xx, 0.44, zz], 0.021, wood);
  for (const xx of [-0.20, 0.20]) rod(c, [xx, 0.45, -0.17], [xx, 0.99, -0.25], 0.022, wood);
  for (const yy of [0.75, 0.90]) add(c, G.box(0.44, 0.10, 0.035), sage, 0, yy, -0.22, { rot: [-0.12, 0, 0] });
  return c;
}

function diningTable(parent, x, z, { w = 1.8, d = 1.05, y = 0.82 } = {}) {
  const t = group(parent, x, 0, z), wood = mat(C.wood);
  add(t, G.box(w, 0.075, d), wood, 0, y, 0);
  for (let i = 1; i < 5; i++) add(t, G.box(w - 0.06, 0.006, 0.012), mat('#745d43'),
    0, y + 0.041, -d / 2 + d * i / 5, { cast: false });
  for (const xx of [-w * 0.35, w * 0.35]) for (const zz of [-d * 0.31, d * 0.31])
    add(t, G.box(0.055, y - 0.02, 0.055), mat(C.timber), xx, (y - 0.02) / 2, zz);
  return t;
}

function leafGeometry() {
  const pos = [], uv = [], idx = [], rows = 12, cols = 6;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
    const v = row / rows, u = col / cols * 2 - 1;
    const width = Math.sin(Math.PI * v) * (0.060 + 0.012 * Math.sin(v * 9 * Math.PI));
    pos.push(u * width, Math.sin(v * Math.PI) * 0.023 + Math.abs(u) ** 1.6 * 0.020 + Math.sin(v * 9 * Math.PI) * Math.abs(u) * 0.006, v * 0.23);
    uv.push((u + 1) / 2, v);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = row * (cols + 1) + col, b = a + cols + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function salad(parent, x = 0, z = 0) {
  const dish = group(parent, x, 0.865, z); dish.userData.dynamic = true;
  const ceramic = mat('#eee9dc', { roughness: 0.33 });
  // 厚い縁と浅い盛り面の、実際に立体の白い皿。
  add(dish, G.cyl(0.28, 0.25, 0.024, 48), ceramic, 0, 0.016, 0);
  add(dish, G.torus(0.255, 0.020, 8, 48), ceramic, 0, 0.035, 0, { rot: [Math.PI / 2, 0, 0] });
  add(dish, G.cyl(0.14, 0.14, 0.012, 28), ceramic, 0, 0.003, 0);
  const leaves = [], r = rng(876), colors = ['#7f9d4e', '#8eae62', '#567c43', '#acc078', '#77616c'];
  for (let i = 0; i < 24; i++) {
    const a = i * 2.399, radius = 0.020 + r() * 0.05;
    leaves.push({ p: [Math.sin(a) * radius, 0.035 + Math.floor(i / 8) * 0.017, Math.cos(a) * radius],
      r: [(r() - 0.5) * 0.22, a, (r() - 0.5) * 0.24],
      s: [0.65 + r() * 0.3, 0.7 + r() * 0.8, 0.65 + r() * 0.28], color: colors[i % colors.length] });
  }
  instanced(dish, leafGeometry(), mat('#ffffff', { roughness: 0.84, side: THREE.DoubleSide }), leaves);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + 0.4;
    add(dish, G.sphere(0.034, 12, 8), mat('#c76e4b'), Math.sin(a) * 0.14, 0.078, Math.cos(a) * 0.14, { scale: [1, 0.8, 1] });
    add(dish, G.sphere(0.008, 6, 4), mat('#7a8c44'), Math.sin(a) * 0.14, 0.105, Math.cos(a) * 0.14, { scale: [1.7, 0.3, 1.4] });
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 2.0 + 0.9, px = Math.sin(a) * 0.12, pz = Math.cos(a) * 0.12;
    curve(dish, [[px - 0.05, 0.086, pz], [px, 0.13, pz + 0.025], [px + 0.04, 0.09, pz + 0.055]],
      0.007, mat('#d7a365'), 12);
  }
  // 淡緑の細かい泡。ひと塊の球にせず、小泡が寄り合う表面にする。
  const foam = group(dish, 0.015, 0.095, 0.005); foam.userData.dynamic = true;
  const bubbles = [];
  for (let i = 0; i < 125; i++) {
    const a = r() * Math.PI * 2, radius = Math.sqrt(r()) * 0.095;
    const h = Math.max(0, 1 - radius / 0.11) * 0.044 + r() * 0.009, size = 0.007 + r() * 0.009;
    bubbles.push({ p: [Math.cos(a) * radius, h, Math.sin(a) * radius], s: [size, size * 0.85, size],
      color: i % 3 ? '#e3e8cd' : '#d3dfb9' });
  }
  instanced(foam, G.sphere(1, 8, 6), mat('#ffffff', { roughness: 0.27 }), bubbles);
  return { dish, foam };
}

function roof(parent) {
  const g = group(parent), material = mat('#74867b', { roughness: 0.88 }), seam = mat('#91a092');
  const half = 3.80, rise = 1.00, slope = Math.hypot(half, rise), angle = Math.atan2(rise, half);
  for (const s of [-1, 1]) {
    add(g, G.box(12.5, 0.10, slope), material, 0, 3.75, s * half / 2, { rot: [s * angle, 0, 0] });
    for (let x = -6.0; x <= 6.0; x += 0.42) {
      rod(g, [x, 4.28, 0], [x, 3.28, s * half], 0.015, seam);
    }
    add(g, G.cyl(0.048, 0.048, 12.6, 10), mat('#718373'), 0, 3.19, s * 3.85, { rot: [0, 0, Math.PI / 2] });
  }
  add(g, G.box(12.6, 0.075, 0.13), seam, 0, 4.30, 0);
  for (const x of [-6.20, 6.20]) {
    for (const s of [-1, 1]) rod(g, [x, 4.25, 0], [x, 3.25, s * half], 0.045, mat('#d3ceba'));
  }
  return g;
}

/** 全体18×14m以内の、温かな食堂と小さなテラス。 */
export function createFoamBistro(parent, { name = 'ビストロ 翠の泡' } = {}) {
  const root = group(parent); root.name = name;
  const plaster = plasterMaterial(), sage = mat(C.sage), timber = mat(C.timber), brass = mat(C.brass, { metalness: 0.16, roughness: 0.53 });
  const building = group(root, 0, 0, -1.55), w = 11.6, d = 6.6, front = d / 2;
  add(root, G.box(16.0, 0.16, 12.7), mat('#b2ac94'), 0, 0.02, -0.25);
  add(root, G.box(15.6, 0.06, 12.3), mat('#ccc2a8'), 0, 0.13, -0.25);
  add(building, G.box(w, 0.22, d), mat('#a99377'), 0, 0.24, 0);
  // 木床は窓から奥まで見える。正面には透明な壁を重ねない。
  const floorboards = [];
  for (let x = -5.65; x < 5.7; x += 0.23) floorboards.push({ p: [x, 0.36, 0], color: x % 0.46 > 0.23 ? '#b89b72' : '#c3a67f' });
  instanced(building, G.box(0.221, 0.045, d - 0.2), mat('#ffffff'), floorboards);
  add(building, G.box(w, 2.97, 0.18), plaster, 0, 1.82, -d / 2);
  for (const x of [-w / 2, w / 2]) add(building, G.box(0.18, 2.97, d), plaster, x, 1.82, 0);
  add(building, G.box(w, 0.48, 0.18), plaster, 0, 3.06, front);
  add(building, G.box(w, 0.42, 0.18), plaster, 0, 0.55, front);
  for (const [x, width] of [[-5.66, 0.30], [-3.05, 0.32], [-0.72, 0.43], [5.64, 0.32]])
    add(building, G.box(width, 2.65, 0.22), plaster, x, 1.77, front);
  // 低いレンガの腰壁は1個ずつ目地をあけ、色を少しだけ変える。
  const bricks = [], r = rng(815);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 38; i++) {
    const x = -5.7 + i * 0.30 + (row % 2) * 0.15;
    if (x > -2.85 && x < -0.96) continue;
    bricks.push({ p: [x, 0.39 + row * 0.105, front + 0.12], color: new THREE.Color(C.brick).multiplyScalar(0.90 + r() * 0.20) });
  }
  instanced(building, G.box(0.286, 0.093, 0.095), mat('#ffffff', { roughness: 1 }), bricks);

  const entrance = group(root, -1.92, 0, 1.82); entrance.name = 'ビストロ入口';
  // 入口はガラスの両脇を木枠で囲む。中央の通り道を塞がない。
  for (const x of [-0.855, 0.855]) add(entrance, G.box(0.11, 2.43, 0.10), timber, x, 1.57, 0);
  for (const y of [0.355, 2.785]) add(entrance, G.box(1.82, 0.11, 0.10), timber, 0, y, 0);
  for (const x of [-0.744, 0.744]) add(entrance, G.box(0.105, 2.23, 0.11), sage, x, 1.57, 0.02);
  add(entrance, G.plane(1.35, 1.63), mat('#788c7c', { roughness: 0.18, transparent: true, opacity: 0.27, depthWrite: false }),
    0, 1.79, 0.075, { cast: false });
  add(entrance, G.box(1.39, 0.43, 0.10), sage, 0, 0.69, 0.05);
  add(entrance, G.box(0.045, 1.80, 0.10), sage, 0, 1.79, 0.065);
  for (const y of [0.99, 2.60]) add(entrance, G.box(1.40, 0.065, 0.10), sage, 0, y, 0.065);
  rod(entrance, [0.53, 1.25, 0.145], [0.53, 1.58, 0.145], 0.018, brass);
  add(entrance, G.box(2.07, 0.13, 0.77), mat('#b1a88e'), 0, 0.22, 0.26);
  // 窓は開口に枠だけを作り、室内のペンダント灯とテーブルを見せる。
  for (const [cx, ww] of [[-4.38, 2.20], [2.42, 5.85]]) {
    for (const x of [-ww / 2, ww / 2]) add(building, G.box(0.085, 2.05, 0.14), sage, cx + x, 1.79, front + 0.055);
    for (const y of [0.77, 2.82]) add(building, G.box(ww + 0.14, 0.085, 0.14), sage, cx, y, front + 0.055);
    const panes = Math.round(ww / 1.15);
    for (let i = 1; i < panes; i++) add(building, G.box(0.050, 2.03, 0.11), sage,
      cx - ww / 2 + ww * i / panes, 1.79, front + 0.06);
    add(building, G.box(ww + 0.25, 0.085, 0.36), timber, cx, 0.75, front + 0.12);
  }
  // 屋根は室内を見るために消す必要がない。南面の窓と軒下が主役。
  roof(building);
  // 前後の妻壁（三角）も白漆喰で閉じ、屋根裏を開口にしない。
  const gable = new THREE.Shape(); gable.moveTo(-3.3, 0); gable.lineTo(3.3, 0); gable.lineTo(0, 0.88); gable.closePath();
  for (const x of [-w / 2, w / 2]) add(building, new THREE.ShapeGeometry(gable), plaster, x, 3.28, 0,
    { rot: [0, x < 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
  add(building, G.box(0.57, 1.14, 0.55), mat('#a9866c'), 3.9, 4.00, -1.3);
  add(building, G.box(0.72, 0.10, 0.70), mat('#b6aa90'), 3.9, 4.61, -1.3);

  // セージ色と生成りの布庇。入口左には庇を付けず店名を隠さない。
  const awning = group(root, 2.40, 2.79, 2.22);
  for (let i = 0; i < 14; i++) add(awning, G.box(0.43, 0.033, 1.12), mat(i % 2 ? '#dedbc4' : '#809583'),
    -2.795 + i * 0.43, 0, 0.26, { rot: [0.17, 0, 0] });
  for (let i = 0; i < 14; i++) add(awning, G.box(0.43, 0.17, 0.035), mat(i % 2 ? '#dedbc4' : '#809583'),
    -2.795 + i * 0.43, -0.18, 0.81);
  for (const x of [-2.85, 2.85]) rod(awning, [x, -0.55, -0.23], [x, -0.14, 0.75], 0.017, brass);
  // 軒の手前へ張り出す銘板。高い正面カメラでも上半分が屋根に隠れず、
  // 下端は入口・窓枠より上、右端は布庇の左端より左に収める。
  for (const x of [-3.38, -0.96]) rod(root, [x, 3.11, 1.88], [x, 3.11, 2.50], 0.023, timber);
  add(root, G.box(3.50, 0.45, 0.075), timber, -2.17, 3.11, 2.53);
  add(root, G.plane(3.37, 0.33), textMaterial(name, [], { w: 1280, h: 200 }), -2.17, 3.11, 2.576, { cast: false });

  // 窓の奥。長いカウンター、温かい吊り灯、素朴な器と植物。
  add(building, G.box(6.5, 0.84, 0.70), sage, 1.36, 0.80, -2.20);
  add(building, G.box(6.65, 0.09, 0.85), timber, 1.36, 1.27, -2.20);
  for (let i = 0; i < 4; i++) {
    add(building, G.box(0.55, 0.055, 0.28), timber, -3.8 + i * 1.6, 2.13, -3.12);
    herbPot(building, -3.8 + i * 1.6, 2.16, -3.10, 0.62, 960 + i);
  }
  for (const x of [-3.2, 0.8, 3.8]) {
    rod(building, [x, 3.20, 0.18], [x, 2.48, 0.18], 0.012, brass);
    add(building, G.cone(0.25, 0.22, 24), mat('#c5ac77'), x, 2.42, 0.18);
    add(building, G.sphere(0.075, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe9b6' }), x, 2.33, 0.18);
  }
  for (const [x, z] of [[-4.1, -0.8], [1.2, -0.25], [3.8, -0.25]]) {
    diningTable(building, x, z, { w: 1.45, d: 0.9, y: 0.98 });
    herbPot(building, x, 1.02, z, 0.45, Math.round(x * 60 + 1400));
    chair(building, x, z + 0.77, Math.PI); chair(building, x, z - 0.77, 0);
  }
  for (const x of [-1.0, 0.0, 2.6, 3.6]) {
    add(building, G.cyl(0.13, 0.11, 0.055, 20), mat('#ede1c9'), x, 1.34, -2.12);
    add(building, G.cyl(0.08, 0.065, 0.15, 16), mat('#cbd1b8'), x, 1.43, -2.12);
  }
  // 壁面の明るさを保つ温かな内壁。点光源を増やしすぎない。
  const indoor = new THREE.PointLight('#ffe4ab', 3.2, 9.5, 2); indoor.position.set(0.7, 2.6, -0.2); building.add(indoor);

  // テラスは入口の南正面を空け、料理の前に椅子を置かない。
  const table = diningTable(root, 3.56, 4.67); table.name = '泡のサラダのテラステーブル';
  chair(root, 3.56, 3.65, 0); chair(root, 4.88, 4.67, Math.PI / 2);
  herbPot(table, 0.62, 0.863, -0.30, 0.42, 610, true);
  const { dish: platedDish, foam } = salad(table, 0.29, 0.025);
  platedDish.name = '苦い泡のドレッシングのサラダ';
  const { dish: servedDish } = salad(table, -0.43, 0.025);
  servedDish.visible = false; servedDish.name = '出来上がった一皿';
  // 空の席に清潔な布とカトラリー。皿の上には重ねない。
  add(table, G.box(0.16, 0.015, 0.23), mat('#e5dfca'), -0.68, 0.868, -0.25, { rot: [0, 0.10, 0] });
  for (const x of [-0.71, -0.65]) add(table, G.capsule(0.008, 0.15), brass, x, 0.883, -0.25,
    { rot: [Math.PI / 2, 0, 0], cast: false });
  for (const [x, z, s, seed] of [[-5.9, 2.8, 1.6, 11], [6.4, 2.8, 1.55, 12], [6.35, 5.9, 1.3, 13], [-6.8, -3.8, 1.35, 14]])
    herbPot(root, x, 0.18, z, s, seed, true);

  const sign = group(root, -4.14, 0.18, 3.72); sign.name = 'ビストロのメニュー看板';
  for (const x of [-0.67, 0.67]) {
    add(sign, G.box(0.065, 1.77, 0.065), timber, x, 0.89, -0.05, { rot: [-0.14, 0, 0] });
    add(sign, G.box(0.065, 1.77, 0.065), timber, x, 0.89, -0.43, { rot: [0.14, 0, 0] });
  }
  add(sign, G.box(1.73, 1.35, 0.09), timber, 0, 1.16, 0);
  add(sign, G.plane(1.59, 1.21), textMaterial(name,
    ['地元野菜のサラダ', '苦い泡のドレッシング', '畑の香りと、軽いくちどけ']), 0, 1.16, 0.053, { cast: false });

  return {
    root, entrance, sign, table, platedDish, foam, servedDish,
    focusTarget: new THREE.Vector3(0.0, 1.65, 2.5),
    views: {
      front: { position: new THREE.Vector3(-6.8, 5.8, 15.5), target: new THREE.Vector3(0, 1.7, -0.10) },
      terrace: { position: new THREE.Vector3(3.0, 2.8, 8.4), target: new THREE.Vector3(3.72, 0.97, 4.67) },
      entrance: { position: new THREE.Vector3(-1.6, 2.55, 9.0), target: new THREE.Vector3(-1.9, 1.7, 1.9) },
    },
    bounds: { x: [-8, 8], z: [-6.6, 6.2], height: 4.66 },
  };
}
