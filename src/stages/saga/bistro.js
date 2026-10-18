import * as THREE from 'three';
import { add, mat, G, group, rng, canvasTex, FONT } from '../../lib/util.js';

// 山カフェレストランKUREHA。公式の玄関・室内写真と街道側の門の写真を参照。
// 参照先と、箱庭へ収めるための圧縮範囲は docs/saga-shops-references.md。
// 足元が原点、+zが正面。入口前とテラスの間を広く空けておく。
const C = {
  plaster: '#e6dfc4', sage: '#454f3e', dark: '#493a29', wood: '#8b6440',
  timber: '#55402d', cream: '#f3e9cf', brass: '#b49c64',
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

// 寄棟の薄い銅板屋根。面を一枚ずつ作り、軒先と棟を立体で縁取る。
function copperRoof(parent) {
  const green = mat('#638a7c', { roughness: .78 }), edge = mat('#82988a');
  const a = [-6.3, 3.45, -3.75], b = [6.3, 3.45, -3.75];
  const c = [6.3, 3.45, 3.75], d = [-6.3, 3.45, 3.75];
  const p = [-4.45, 4.5, 0], q = [4.45, 4.5, 0];
  const faces = [[a, p, q, a, q, b], [b, q, c], [c, q, p, c, p, d], [d, p, a]];
  for (const face of faces) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(face.flat(), 3)); geo.computeVertexNormals();
    add(parent, geo, mat('#638a7c', { roughness: .78, side: THREE.DoubleSide }));
  }
  for (const [u, v] of [[a, b], [b, c], [c, d], [d, a], [p, q], [p, a], [p, d], [q, b], [q, c]])
    rod(parent, u, v, .045, edge);
  for (const s of [-1, 1]) for (let x = -4.4; x <= 4.4; x += .48)
    rod(parent, [x, 4.51, 0], [x, 3.46, s * 3.75], .010, green);
}

function stoneStair(parent) {
  const stones = [], r = rng(945);
  for (let row = 0; row < 5; row++) {
    const z = 1.55 + row * .43, top = .58 - row * .08;
    add(parent, G.box(2.45, top, .45), mat('#75776c'), -3.0, top / 2, z);
    for (let col = 0; col < 9; col++) stones.push({
      p: [-4.1 + col * .275, top + .008, z],
      color: r() > .6 ? '#858a6d' : r() > .5 ? '#777e6c' : '#898c78',
    });
  }
  instanced(parent, G.box(.263, .015, .41), mat('#ffffff', { roughness: 1 }), stones);
}

function garden(parent, x, z, seed, s = 1) {
  const g = group(parent, x, .15, z), r = rng(seed), leaves = [];
  add(g, G.sphere(1, 14, 8), mat('#77826a'), 0, .08, 0, { scale: [1.0 * s, .28 * s, .8 * s] });
  for (let i = 0; i < 45; i++) {
    const a = i * 2.4, radius = Math.sqrt(r()) * .85 * s;
    leaves.push({ p: [Math.cos(a) * radius, .17 + r() * .65 * s, Math.sin(a) * radius],
      s: [.21 * s, .08 * s, .10 * s], r: [r() * .6, a, r() * .4],
      color: ['#6c8350', '#7e935d', '#576e43', '#849966'][i % 4] });
  }
  instanced(g, G.sphere(1, 8, 6), mat('#ffffff', { roughness: 1 }), leaves);
  return g;
}

/** 18×14mの箱庭区画。門と石段、木枠の館、景色を眺めるダイニング。 */
export function createFoamBistro(parent, { name = '山カフェレストランKUREHA' } = {}) {
  const root = group(parent); root.name = name;
  const plaster = plasterMaterial(), timber = mat(C.timber), wood = mat(C.wood);
  const copper = mat('#6a9484'), stone = mat('#979b8d'), dark = mat('#39392d');
  add(root, G.box(16, .16, 12.7), mat('#a8ad94'), 0, .02, -.25);
  add(root, G.box(15.6, .07, 12.3), mat('#c2c0a9'), 0, .135, -.25);
  const building = group(root, 0, 0, -2.4), w = 11.6, d = 6.6, front = 3.3;
  add(building, G.box(w, .44, d), mat('#7a7767'), 0, .30, 0);
  add(building, G.box(w - .18, .055, d - .18), wood, 0, .55, 0);
  for (let z = -3.1; z <= 3.1; z += .22)
    add(building, G.box(w - .2, .008, .012), mat('#624b33'), 0, .582, z, { cast: false });
  add(building, G.box(w, 2.9, .16), plaster, 0, 1.99, -d / 2);
  for (const x of [-w / 2, w / 2]) add(building, G.box(.16, 2.9, d), plaster, x, 1.99, 0);
  add(building, G.box(w, .47, .18), plaster, 0, 3.20, front);
  add(building, G.box(6.42, .34, .18), plaster, 2.38, .76, front);
  add(building, G.box(2.10, 2.45, .18), plaster, -4.75, 1.78, front);
  add(building, G.box(.79, 2.45, .18), plaster, -1.34, 1.78, front);
  for (const x of [-5.75, -.80, 2.36, 5.75]) add(building, G.box(.15, 2.75, .24), timber, x, 1.87, front + .04);
  for (const y of [.94, 2.96]) add(building, G.box(6.6, .13, .24), timber, 2.45, y, front + .05);
  // 大窓は奥まで見通せる開口にする。反射面を壁として重ねない。
  for (const x of [.65, 3.95]) add(building, G.box(.065, 1.95, .12), timber, x, 1.94, front + .05);
  add(building, G.box(6.7, .10, .34), wood, 2.43, .91, front + .12);
  copperRoof(building);

  const entrance = group(root, -2.9, 0, 1.0); entrance.name = 'KUREHAの木枠の玄関';
  for (const x of [-.89, .89]) add(entrance, G.box(.12, 2.45, .14), timber, x, 1.79, 0);
  for (const y of [.57, 3.01]) add(entrance, G.box(1.90, .12, .14), timber, 0, y, 0);
  add(entrance, G.plane(1.62, 2.21), mat('#5e6251', { roughness: .27, transparent: true, opacity: .23, depthWrite: false }),
    0, 1.79, .08, { cast: false });
  add(entrance, G.box(.045, 2.22, .075), timber, .18, 1.79, .10);
  rod(entrance, [.66, 1.45, .17], [.66, 1.85, .17], .017, mat('#bcac71'));
  for (const x of [-1.38, 1.38]) {
    add(entrance, G.box(.34, .34, .13), timber, x, 2.35, .02);
    add(entrance, G.sphere(.10, 12, 9), new THREE.MeshBasicMaterial({ color: '#ffe4ab' }), x, 2.35, .13);
    add(entrance, G.cyl(.11, .11, .15, 12), timber, x, 2.48, .13);
  }
  // 公式の玄関写真に見える、わずかに反った破風と太い丸柱。
  for (const x of [-1.83, 1.83]) add(entrance, G.cyl(.115, .14, 2.98, 16), timber, x, 2.04, .66);
  const profile = [[-2.12, 3.28], [-1.5, 3.42], [-.7, 3.75], [0, 3.91], [.7, 3.75], [1.5, 3.42], [2.12, 3.28]];
  const pos = [], indices = [];
  profile.forEach(([x, y]) => { pos.push(x, y, -.14, x, y, 1.13); });
  for (let i = 0; i < profile.length - 1; i++) { const j = i * 2; indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
  const canopy = new THREE.BufferGeometry(); canopy.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  canopy.setIndex(indices); canopy.computeVertexNormals();
  add(entrance, canopy, mat('#688a77', { side: THREE.DoubleSide }));
  curve(entrance, profile.map(([x, y]) => [x, y - .08, 1.13]), .075, timber, 32);
  add(entrance, G.box(3.7, .17, .15), timber, 0, 3.31, .68);
  stoneStair(root);

  // 白壁の街道側の門。店名は小さな銘板だけにし、案内看板は置かない。
  const gateway = group(root, -3, .18, 4.76); gateway.name = 'KUREHAの白壁と緑青の門';
  for (const x of [-2.42, 2.42]) {
    add(gateway, G.box(1.55, 1.58, .27), mat('#e4e4d9'), x, .87, -.05);
    add(gateway, G.box(1.55, .29, .33), stone, x, .20, -.05);
    for (const y of [.71, 1.25]) add(gateway, G.box(1.56, .015, .012), mat('#bbbeaf'), x, y, .092);
    add(gateway, G.box(1.64, .08, .38), mat('#d1d5c5'), x, 1.70, -.05);
  }
  for (const x of [-3.02, 3.02]) {
    add(gateway, G.box(.22, 2.37, .25), timber, x, 1.25, .36);
    add(gateway, G.box(.31, .29, .35), stone, x, .15, .36);
  }
  add(gateway, G.box(6.64, .11, 1.7), copper, 0, 2.57, .30);
  add(gateway, G.box(6.31, .07, 1.5), mat('#b4a68b'), 0, 2.48, .30);
  add(gateway, G.box(5.93, .20, .20), timber, 0, 2.34, .76);
  for (let x = -2.8; x <= 2.8; x += .34) add(gateway, G.box(.035, .055, 1.48), timber, x, 2.43, .30);
  const sign = group(gateway, 2.15, 1.32, .103); sign.scale.x = .8; sign.name = 'KUREHAの銘板';
  add(sign, G.box(1.18, .35, .05), timber);
  add(sign, G.plane(1.08, .27), textMaterial('KUREHA', [], { w: 640, h: 160, background: '#e4ded0', ink: '#67563b' }),
    0, 0, .030, { cast: false });

  // 窓から見える木梁・ハイバックの椅子。室内の雰囲気は公式写真を参照。
  for (let x = -5.3; x <= 5.3; x += 1.06) add(building, G.box(.08, .08, 6.2), timber, x, 3.30, 0);
  for (const [x, z] of [[.6, .8], [3.8, .8]]) {
    diningTable(building, x, z, { w: 1.6, d: 1, y: 1.25 });
    for (const side of [-1, 1]) {
      const ch = chair(building, x, z + side * .9, side < 0 ? 0 : Math.PI); ch.position.y = .58;
      add(ch, G.box(.42, .58, .07), dark, 0, .85, -.22);
    }
  }
  for (const x of [-3.0, .6, 3.8]) {
    rod(building, [x, 3.27, 0], [x, 2.71, 0], .012, timber);
    add(building, G.sphere(.085, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe6b2' }), x, 2.65, 0);
  }
  const indoor = new THREE.PointLight('#ffe4ab', 2.7, 9.5, 2); indoor.position.set(1.5, 2.6, .4); building.add(indoor);

  // 料理の任意体験の位置・APIは以前のセーブと操作対象のまま保つ。
  const table = diningTable(root, 3.56, 4.67); table.name = 'KUREHAのテラステーブル';
  chair(root, 3.56, 3.65, 0); chair(root, 4.88, 4.67, Math.PI / 2);
  herbPot(table, .62, .863, -.30, .42, 610, true);
  const { dish: platedDish, foam } = salad(table, .29, .025);
  platedDish.name = 'KUREHAのサラダ';
  const { dish: servedDish } = salad(table, -.43, .025); servedDish.visible = false; servedDish.name = '出来上がった一皿';
  add(table, G.box(.16, .015, .23), mat('#e5dfca'), -.68, .868, -.25);
  for (const x of [-.71, -.65]) add(table, G.capsule(.008, .15), mat('#b8b49d'), x, .883, -.25,
    { rot: [Math.PI / 2, 0, 0], cast: false });
  for (const [x, z, s, seed] of [[-6.8, 2.2, 1.15, 21], [-5.6, 2.9, .8, 22], [.6, 2.8, .72, 23],
    [6.6, .4, 1.05, 24], [6.65, -3.7, 1.1, 25], [-6.8, -3.8, 1.1, 26]]) garden(root, x, z, seed, s);
  for (const [x, z] of [[-6.5, -4.0], [6.5, -4.3]]) {
    rod(root, [x, .18, z], [x + .16, 3.45, z], .09, timber);
    const crowns = [];
    for (let i = 0; i < 16; i++) { const a = i * 2.4; crowns.push({ p: [Math.sin(a) * .65, 2.35 + i * .07, Math.cos(a) * .55],
      s: [.62, .22, .48], color: i % 2 ? '#68814e' : '#7b925c' }); }
    instanced(group(root, x, 0, z), G.sphere(1, 10, 6), mat('#ffffff', { roughness: 1 }), crowns);
  }

  return {
    root, entrance, sign, table, platedDish, foam, servedDish,
    focusTarget: new THREE.Vector3(0, 1.65, 2.5),
    views: {
      front: { position: new THREE.Vector3(8.2, 6.8, 16.7), target: new THREE.Vector3(0, 1.8, -.15) },
      terrace: { position: new THREE.Vector3(3.0, 2.8, 8.4), target: new THREE.Vector3(3.72, .97, 4.67) },
      entrance: { position: new THREE.Vector3(-2.7, 2.8, 4.15), target: new THREE.Vector3(-2.9, 2.0, 1.0) },
    },
    bounds: { x: [-8, 8], z: [-6.6, 6.2], height: 4.6 },
  };
}
