import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { add, G, group, mat, rng, canvasTex } from '../../lib/util.js';

// 川久保の写真資料に写る外観。写真の正面が +z、長さの基準はメートル。
// 玄関・サッシ・瓦・波板の標準寸法を基準に比率を合わせた外観模型であり、
// 測量図ではない。写真のない背面に部屋や看板などの情報は追加しない。
const C = {
  plaster: '#efede2', cream: '#e0d3ad', wood: '#766753', bronze: '#8d8068',
  tile: '#80817c', tileLight: '#969a90', tileDark: '#535a55', concrete: '#888880',
  stone: '#7c7a6a', wall: '#d8c48a', bark: '#554c3b', iron: '#615d50',
};
const UP = new THREE.Vector3(0, 1, 0);

function rod(parent, a, b, radius, material, segments = 8) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), v = q.clone().sub(p);
  const m = add(parent, G.cyl(radius, radius * 1.08, v.length(), segments), material,
    (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  m.quaternion.setFromUnitVectors(UP, v.normalize());
  return m;
}

function curveRod(parent, points, radius, material, segments = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, segments, radius, 6, false), material);
}

function face(parent, geometry, material, x, y, z, ry = 0) {
  return add(parent, geometry, material, x, y, z, { rot: [0, ry, 0] });
}

function noiseTexture(seed, base, { w = 512, h = 512, grain = 7000 } = {}) {
  return canvasTex(w, h, (ctx, W, H) => {
    const r = rng(seed);
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < grain; i++) {
      ctx.fillStyle = i % 2 ? `rgba(255,255,240,${0.025 + r() * 0.065})` : `rgba(52,48,37,${0.015 + r() * 0.045})`;
      ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
    }
  });
}

function textured(color, seed, opts = {}) {
  const map = noiseTexture(seed, color);
  return new THREE.MeshStandardMaterial({ color: '#ffffff', map, bumpMap: map, bumpScale: seed === 3 ? .035 : .012, roughness: 0.98, ...opts });
}

function instances(parent, geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.fromArray(t.p);
    dummy.rotation.set(...(t.r || [0, 0, 0]));
    dummy.scale.fromArray(t.s || [1, 1, 1]);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    if (t.color) mesh.setColorAt(i, new THREE.Color(t.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// 陶器瓦の丸みを実際の面にする。平らな屋根への線描だけで代用しない。
function panTileGeometry(length = 0.365, width = 0.285) {
  const positions = [], uv = [], indices = [], nx = 4, nz = 8;
  for (let x = 0; x <= nx; x++) for (let z = 0; z <= nz; z++) {
    const u = x / nx, v = z / nz;
    const wave = 0.019 * Math.cos(v * Math.PI * 2) + 0.008 * Math.sin(v * Math.PI);
    const lip = 0.012 * Math.pow(1 - u, 6);
    positions.push(u * length, wave + lip, (v - 0.5) * width);
    uv.push(u, v);
  }
  for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
    const a = x * (nz + 1) + z, b = a + nz + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function triangle(w, h, depth = 0.12) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

function tiledRoof(parent, { w, d, eave, rise, x = 0, z = 0, color = C.tile, seed = 1, fascia = '#b3b2a2' }) {
  const root = group(parent, x, 0, z), half = w / 2, angle = Math.atan2(rise, half);
  const slope = Math.hypot(half, rise), tileL = 0.365, tileW = 0.285;
  // 色は instanceColor で与える。material にも同じ灰色を設定すると
  // 二重乗算で瓦だけが黒く沈むため、ベースの material は白にする。
  const tileMaterial = mat('#ffffff', { roughness: 0.87, side: THREE.DoubleSide });
  const r = rng(seed), tiles = [], nRows = Math.ceil(slope / 0.325), nCols = Math.ceil(d / tileW);
  const underside = mat('#6b6b5f');
  for (const side of [-1, 1]) {
    // 軒の裏は厚みのある暗い面。裏から空が透けない。
    add(root, G.sharpBox(slope + 0.10, 0.07, d), underside,
      side * half / 2, eave + rise / 2 - 0.045, 0, { rot: [0, 0, -side * angle] });
    for (let row = 0; row < nRows; row++) {
      const along = row * (slope - tileL + 0.025) / Math.max(1, nRows - 1);
      const xx = side * (half - Math.cos(angle) * along);
      const yy = eave + Math.sin(angle) * along;
      for (let col = 0; col < nCols; col++) {
        const zz = -d / 2 + tileW / 2 + col * (d - tileW) / Math.max(1, nCols - 1);
        const tone = new THREE.Color(color).multiplyScalar(0.90 + r() * 0.18);
        // 頂点の +x が棟側を向く。左面は +x、右面は反転して -x。
        tiles.push({ p: [xx, yy + 0.02, zz], r: [0, side === 1 ? Math.PI : 0, angle], color: tone });
      }
    }
    add(root, G.box(0.12, 0.17, d + 0.10), mat(fascia), side * (half + 0.025), eave - 0.065, 0);
    // 雨樋と細い端瓦の陰影。
    add(root, G.cyl(0.07, 0.07, d + 0.10, 8), mat('#74766a'), side * (half + 0.085), eave - 0.15, 0,
      { rot: [Math.PI / 2, 0, 0] });
  }
  instances(root, panTileGeometry(tileL, tileW), tileMaterial, tiles);
  const ridge = [], caps = [];
  for (let zz = -d / 2 + 0.12; zz < d / 2 + 0.10; zz += 0.24) {
    ridge.push({ p: [0, eave + rise + 0.085, zz], r: [Math.PI / 2, 0, 0] });
  }
  instances(root, G.cyl(0.105, 0.105, 0.26, 12), mat('#858a80'), ridge);
  for (const end of [-1, 1]) {
    for (const side of [-1, 1]) {
      rod(root, [0, eave + rise - 0.025, end * (d / 2 + 0.04)],
        [side * (half + 0.07), eave - 0.04, end * (d / 2 + 0.04)], 0.065, mat(fascia), 8);
      // 妻側の半丸の瓦端。縮小しても屋根の輪郭が写真と一致する密度。
      for (let along = 0.05; along < slope; along += 0.34) {
        caps.push({ p: [side * (half - Math.cos(angle) * along), eave + Math.sin(angle) * along + 0.035,
          end * (d / 2 + 0.066)], r: [Math.PI / 2, 0, 0], s: [1, 0.36, 1] });
      }
    }
    add(root, G.sphere(0.115, 12, 8), mat('#858a80'), 0, eave + rise + 0.07, end * (d / 2 + 0.08),
      { scale: [0.82, 1.2, 0.7] });
  }
  instances(root, G.cyl(0.072, 0.072, 0.13, 10), mat('#94988e'), caps);
  for (const end of [-1, 1]) {
    const ornament = group(root, 0, eave + rise + .10, end * (d / 2 + .12));
    add(ornament, G.box(.25, .06, .15), mat('#8c9088'), 0, -.025, 0);
    add(ornament, G.sphere(.11, 12, 8), mat('#858a80'), 0, .07, 0, { scale: [1, 1.35, .62] });
    for (const side of [-1, 1]) curveRod(ornament, [[0,.04,.07*end],[side*.13,.07,.07*end],[side*.14,-.03,.07*end],[side*.08,-.04,.07*end]], .018, mat('#afb1a5'), 12);
  }

  root.userData.roof = true;
  return root;
}

function wovenTileMaterial(width = 3.45, height = 1.05) {
  // 実物は白灰の大きな網代タイル。面の縦横比に合わせ、模様を横に伸ばさない。
  const map = canvasTex(Math.round(384 * width / height), 384, (ctx, w, h) => {
    ctx.fillStyle = '#a8b0aa'; ctx.fillRect(0, 0, w, h);
    const cell = 48;
    for (let row = -1; row < h / cell + 1; row++) for (let col = -1; col < w / cell + 1; col++) {
      ctx.save(); ctx.translate(col * cell + cell / 2, row * cell + cell / 2); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = (row + col) % 2 ? '#e0e3da' : '#8d9790';
      ctx.fillRect(-cell * .56, -cell * .18, cell * 1.12, cell * .36);
      ctx.fillStyle = (row + col) % 2 ? '#afb8ad' : '#d8ddd2';
      ctx.fillRect(-cell * .18, -cell * .56, cell * .36, cell * 1.12);
      ctx.strokeStyle = 'rgba(67,77,69,.28)'; ctx.lineWidth = 1.0;
      ctx.strokeRect(-cell * .56, -cell * .18, cell * 1.12, cell * .36);
      ctx.fillStyle = 'rgba(250,252,235,.42)'; ctx.fillRect(-cell * .55, -cell * .17, cell * 1.1, 1.2);
      ctx.restore();
    }
  });
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .012, roughness: .73 });
}

function curtainMaterial(seed, tint = '#dddcd0') {
  const map = canvasTex(512, 384, (ctx, W, H) => {
    const r = rng(seed); ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const a = (Math.sin(x / 12) + 1) * 0.043 + r() * 0.01;
      ctx.fillStyle = `rgba(70,68,55,${a})`; ctx.fillRect(x, 0, 1, H);
    }
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = 'rgba(248,246,230,.12)'; ctx.fillRect(0, y, W, 1);
    }
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.97 });
}

function makeHouse(parent, M) {
  const house = group(parent, 1.3, 0, -1.4);
  house.name = '川久保・写真の主棟';
  const W = 9.4, D = 6.4, front = D / 2;
  add(house, G.sharpBox(W + 0.12, 0.38, D + 0.12), M.foundation, 0, 0.19, 0);
  add(house, G.sharpBox(W, 2.72, D), M.cream, 0, 1.72, 0);
  // 前面の白い大きな妻。写真では平屋の横幅に対して棟が低い。
  add(house, triangle(9.75, 1.27, D + 0.22), M.plaster, 0, 3.08, 0);
  const lowerRoof = tiledRoof(house, { w: 10.65, d: 7.25, eave: 3.08, rise: 1.40, z: 0.02, seed: 3243 });
  // 2階は1階の奥へ退き、細い白い妻壁が下屋の上に重なる。
  const upper = group(house, 0.85, -0.52, -1.1), upperW = 5.5, upperD = 4.4;
  add(upper, G.sharpBox(upperW, 1.48, upperD), M.plaster, 0, 4.64, 0);
  add(upper, triangle(upperW, 1.15, upperD + 0.04), M.plaster, 0, 5.38, 0);
  tiledRoof(upper, { w: 6.2, d: 5.0, eave: 5.37, rise: 1.30, color: '#7d8174', seed: 1303 });
  for (const x of [-0.11, 0.11]) add(upper, G.sharpBox(0.095, 0.11, 0.035), mat('#4f554c'), x, 6.05, upperD / 2 + 0.07);
  // 板金の妻飾り・棟の小さな鬼瓦。
  add(upper, G.box(0.15, 0.22, 0.11), mat('#71776c'), 0, 6.74, 2.57);
  for (const x of [-2.72, 2.72]) {
    add(upper, G.box(0.085, 1.5, 0.08), mat('#b6b6a2'), x, 4.64, upperD / 2 + 0.04);
  }
  // 玄関まわり。右の細い白サッシも別枠で再現。
  const doorX = 1.52, doorZ = front + 0.047, sill = 0.40, doorH = 2.08, doorW = 2.02;
  add(house, G.sharpBox(2.62, 2.52, 0.12), M.wood, doorX + 0.16, 1.66, front + 0.07);
  add(house, G.sharpBox(2.35, 2.30, 0.12), mat('#a7997f'), doorX + 0.11, 1.58, front + 0.15);
  add(house, G.sharpBox(doorW, doorH, 0.06), mat('#343f39'), doorX, sill + doorH / 2, doorZ + 0.20);
  const glass = new THREE.MeshStandardMaterial({ color: '#586058', roughness: 0.26, metalness: 0.10 });
  for (let panel = 0; panel < 3; panel++) {
    const px = doorX - doorW / 2 + doorW / 6 + panel * doorW / 3;
    add(house, G.plane(0.61, 1.27), glass, px, 1.81, doorZ + 0.235, { cast: false });
    add(house, G.plane(0.61, 0.56), mat(panel === 2 ? '#67534a' : '#5d665b'), px, 0.79, doorZ + 0.235, { cast: false });
    if (panel === 2) {
      add(house, G.plane(0.20, 1.18), curtainMaterial(220, '#8a5f61'), px - 0.08, 1.82, doorZ + 0.24, { cast: false });
    }
  }
  for (let n = 0; n <= 3; n++) add(house, G.box(0.038, doorH + 0.08, 0.055), M.bronze,
    doorX - doorW / 2 + n * doorW / 3, sill + doorH / 2, doorZ + 0.275);
  for (const y of [sill, 1.08, sill + doorH]) add(house, G.box(doorW + 0.08, 0.035, 0.055), M.bronze,
    doorX, y, doorZ + 0.28);
  for (const x of [doorX - 0.29, doorX + 0.38]) {
    add(house, G.box(0.025, 0.15, 0.035), mat('#b2a897'), x, 1.42, doorZ + 0.315);
  }
  // 玄関の高窓と欄間の横組み。
  add(house, G.box(2.12, 0.19, 0.055), mat('#a79a79'), doorX, 2.69, doorZ + 0.27);
  for (const y of [2.66, 2.72]) add(house, G.box(1.99, 0.015, 0.018), mat('#555647'), doorX, y, doorZ + 0.31);
  for (const x of [doorX - 0.7, doorX + 0.60]) add(house, G.box(0.025, 0.23, 0.025), M.bronze, x, 2.68, doorZ + 0.32);
  const sideX = 3.08;
  add(house, G.box(0.54, 1.28, 0.08), mat('#e1e2d3'), sideX, 1.91, front + 0.21);
  add(house, G.plane(0.41, 1.12), mat('#565e55'), sideX, 1.91, front + 0.256);
  // 大窓の左半分とカーテン、窓下の灰白の網代模様。
  const windowX = -2.42, windowW = 3.08;
  add(house, G.box(3.38, 1.16, 0.10), M.wood, windowX, 2.12, front + 0.07);
  add(house, G.plane(windowW, 1.02), curtainMaterial(731), windowX, 2.12, front + 0.126);
  for (const x of [-windowW / 2, -windowW / 6, windowW / 6, windowW / 2])
    add(house, G.box(0.032, 1.1, 0.04), M.bronze, windowX + x, 2.12, front + 0.16);
  add(house, G.box(3.4, 0.075, 0.13), mat('#656b56'), windowX, 1.49, front + 0.10);
  add(house, G.plane(3.45, 1.05), wovenTileMaterial(), windowX, 0.93, front + 0.12);
  add(house, G.box(3.52, 0.075, 0.14), mat('#4a5c53'), windowX, 1.47, front + 0.12);
  // 同じ腰壁を玄関右端にも残す。
  add(house, G.plane(0.7, 1.00), wovenTileMaterial(0.7, 1), 3.36, 0.91, front + 0.13);
  add(house, G.box(9.25, 0.11, 0.14), M.wood, 0, 2.92, front + 0.13);
  add(house, G.box(9.15, 0.045, 0.14), mat('#b1a480'), 0, 2.79, front + 0.13);
  // 右の黄土色の小さな差し掛け。写真で見える範囲だけ。
  add(house, G.box(1.18, 2.65, 3.8), M.cream, 5.1, 1.62, -0.05);
  add(house, G.box(1.48, 0.10, 4.25), mat('#777b69'), 5.1, 3.02, 0, { rot: [0, 0, -0.04] });
  for (let x = 4.67; x < 5.68; x += 0.14) add(house, G.box(0.012, 2.50, 0.015), mat('#c0b591'), x, 1.65, 1.87);
  // 土間の白灰の敷きタイルと、幅が少しずつ変わる古い三段の階段。
  const porch = group(house, doorX + 0.12, 0, front + 0.70);
  for (let i = 0; i < 3; i++) {
    add(porch, G.box(2.85 + i * 0.18, 0.135, 0.42 + i * 0.27), M.concrete,
      0, 0.337 - i * 0.135, i * 0.16);
  }
  const porchTiles = [];
  for (let x = -1.3; x <= 1.3; x += 0.265) for (let z = -0.19; z <= 0.20; z += 0.24)
    porchTiles.push({ p: [x, 0.413, z], color: (Math.round(x * 100) + Math.round(z * 100)) % 3 ? '#aaa99b' : '#bab9a9' });
  instances(porch, G.sharpBox(0.255, 0.012, 0.228), mat('#ffffff'), porchTiles);
  // アンテナの縦棒とVHF横棒。白壁の前に暗い太線を置かない。
  const antenna = group(house, -0.50, 5.68, -0.25);
  rod(antenna, [0, 0, 0], [0.04, 1.30, 0], 0.014, mat('#7c8079'), 6);
  rod(antenna, [-0.48, 1.03, 0], [0.48, 1.03, 0], 0.012, mat('#676f68'), 6);
  for (const x of [-0.35, -0.14, 0.08, 0.3]) rod(antenna, [x, 1.03, -0.22], [x, 1.03, 0.22], 0.009, mat('#737970'), 5);
  curveRod(house, [[-0.47, 6.19, -0.25], [-0.55, 5.25, 0.1], [-0.8, 4.2, 0.2], [-1.3, 3.3, 0.5]], 0.008, mat('#4c514b'));
  // 軒から落ちる細い竪樋。
  for (const x of [-5.21, 5.2]) {
    curveRod(house, [[x, 2.98, 3.55], [x, 2.78, 3.2], [x, 0.28, 3.19], [x + 0.12, 0.16, 3.3]], 0.045, mat('#8b8b73'));
  }
  house.userData.dimensions = { width: 10.65, height: 7.45, depth: 7.25 };
  return { house, lowerRoof, porch, doorTarget: new THREE.Vector3(2.82, 1.9, 2.05) };
}

function corrugatedMaterial(seed, { heavy = false } = {}) {
  const r = rng(seed);
  const map = canvasTex(1024, 1024, (ctx, W, H) => {
    ctx.fillStyle = '#d7d9d0'; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const tone = Math.sin(x / W * Math.PI * 2 * 85);
      ctx.fillStyle = tone > 0 ? `rgba(255,255,247,${tone * 0.10})` : `rgba(52,63,57,${-tone * 0.13})`;
      ctx.fillRect(x, 0, 1, H);
    }
    // 塗装の縦継ぎと、継ぎ目・釘から流れ落ちた橙褐色の錆。
    for (let panel = 0; panel <= 8; panel++) {
      const x = panel * W / 8;
      ctx.fillStyle = '#9da59a'; ctx.fillRect(x, 0, 1.4, H);
      for (const y of [H * 0.08, H * 0.47, H * 0.93]) {
        ctx.fillStyle = '#737c73'; ctx.fillRect(x + 4, y, 3, 3);
      }
    }
    for (let i = 0; i < (heavy ? 115 : 53); i++) {
      const x = r() * W, y = heavy ? r() * H * 0.48 : r() * H;
      const length = (heavy ? 0.13 : 0.04) * H + r() * H * (heavy ? 0.56 : 0.27);
      const gradient = ctx.createLinearGradient(x, y, x, y + length);
      gradient.addColorStop(0, `rgba(126,65,29,${heavy ? 0.30 + r() * 0.45 : 0.2 + r() * 0.3})`);
      gradient.addColorStop(0.2, heavy ? 'rgba(175,89,31,.60)' : 'rgba(171,91,37,.40)');
      gradient.addColorStop(1, 'rgba(187,120,59,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, heavy ? 1.5 + r() * 7.5 : 1 + r() * 3, length);
    }
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = 'rgba(82,91,77,.035)'; ctx.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3);
    }
  });
  return new THREE.MeshStandardMaterial({ map, color: '#ffffff', roughness: 0.94, side: THREE.DoubleSide });
}

function corrugatedGeometry(w, h, waves = Math.round(w / 0.076)) {
  const g = new THREE.PlaneGeometry(w, h, waves * 4, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.cos((p.getX(i) / w + 0.5) * waves * Math.PI * 2) * 0.010);
  g.computeVertexNormals(); return g;
}

function netPanel(parent, w, h, x, y, z, ry = 0) {
  const root = group(parent, x, y, z, ry), wire = mat('#7e8576');
  for (const xx of [-w / 2, w / 2]) add(root, G.box(0.035, h, 0.035), wire, xx, 0, 0);
  for (const yy of [-h / 2, h / 2]) add(root, G.box(w, 0.035, 0.035), wire, 0, yy, 0);
  // 薄い線だけの金網。暗い不透明な壁にしない。
  const pts = [];
  for (let xx = -w / 2 + 0.08; xx < w / 2; xx += 0.11) {
    pts.push(xx, -h / 2, 0, xx, h / 2, 0);
  }
  for (let yy = -h / 2 + 0.08; yy < h / 2; yy += 0.11) {
    pts.push(-w / 2, yy, 0, w / 2, yy, 0);
  }
  const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: '#7a806e', transparent: true, opacity: 0.58 }));
  root.add(lines);
  return root;
}

function makeShed(parent, M) {
  // 南を向く長い軒下。道路（西）側だけが切妻、棟は東西方向。
  const shed = group(parent, -7.5, 0, 2.35);
  shed.name = '川久保・白い波板の作業場';
  const w = 7.3, d = 5.7, wallTop = 5.72, front = d / 2;
  const sheet = corrugatedMaterial(249), rusty = corrugatedMaterial(869, { heavy: true });
  add(shed, G.sharpBox(w + 0.18, 0.18, d + 0.18), M.foundation, 0, 0.09, 0);
  add(shed, G.box(w - 0.08, 0.12, 0.17), M.woodDark, 0, 3.02, front - 0.08);
  // 上階の正面波板を窓の周りに分けて作り、窓に白壁を重ねない。
  const winX = 0.62, winW = 1.62, winBottom = 3.92, winH = 1.36;
  const xmin = -w / 2, xmax = w / 2, leftW = winX - winW / 2 - xmin, rightW = xmax - (winX + winW / 2);
  face(shed, corrugatedGeometry(leftW, wallTop - 3.05), sheet, xmin + leftW / 2, (wallTop + 3.05) / 2, front);
  face(shed, corrugatedGeometry(rightW, wallTop - 3.05), sheet, xmax - rightW / 2, (wallTop + 3.05) / 2, front);
  face(shed, corrugatedGeometry(winW, winBottom - 3.05), sheet, winX, (winBottom + 3.05) / 2, front);
  face(shed, corrugatedGeometry(winW, wallTop - winBottom - winH), sheet,
    winX, (wallTop + winBottom + winH) / 2, front);
  add(shed, G.box(winW + 0.12, winH + 0.12, 0.07), M.woodDark, winX, winBottom + winH / 2, front - 0.03);
  add(shed, G.plane(winW - 0.10, winH - 0.07), mat('#66716d', { roughness: 0.34, metalness: 0.06 }),
    winX, winBottom + winH / 2, front + 0.03);
  for (const x of [winX - winW / 2, winX, winX + winW / 2]) add(shed, G.box(0.045, winH + 0.07, 0.07),
    mat('#464b45'), x, winBottom + winH / 2, front + 0.075);
  for (const y of [winBottom, winBottom + winH]) add(shed, G.box(winW + 0.07, 0.045, 0.07),
    mat('#53574f'), winX, y, front + 0.075);
  // 写真の窓上の細い三角の換気格子。
  for (let x = winX - winW / 2 + 0.06; x < winX + winW / 2; x += 0.30) {
    rod(shed, [x, 5.38, front + 0.045], [x + 0.14, 5.63, front + 0.045], 0.018, M.woodDark, 5);
    rod(shed, [x + 0.14, 5.63, front + 0.045], [x + 0.28, 5.38, front + 0.045], 0.018, M.woodDark, 5);
  }
  // 道路側の広い、錆筋の強い妻壁。下側は張り替えた淡い波板。
  face(shed, corrugatedGeometry(d, 3.18), sheet, -w / 2, 1.77, 0, -Math.PI / 2);
  face(shed, corrugatedGeometry(d, wallTop - 3.36), rusty, -w / 2 - 0.005, (wallTop + 3.36) / 2, 0, -Math.PI / 2);
  add(shed, triangle(d, 1.03, 0.06), rusty, -w / 2, wallTop, 0, { rot: [0, -Math.PI / 2, 0] });
  // 背面と右側面は写真で確かめられないため無地に近い中立な波板。
  face(shed, corrugatedGeometry(w, wallTop - 0.18), sheet, 0, (wallTop + 0.18) / 2, -d / 2, Math.PI);
  face(shed, corrugatedGeometry(d, wallTop - 0.18), sheet, w / 2, (wallTop + 0.18) / 2, 0, Math.PI / 2);
  add(shed, triangle(d, 1.03, 0.06), sheet, w / 2, wallTop, 0, { rot: [0, Math.PI / 2, 0] });
  // 棟の向きを90度変えた低い灰色瓦屋根。
  const roofTurn = group(shed, 0, 0, 0, Math.PI / 2);
  tiledRoof(roofTurn, { w: d + 0.50, d: w + 0.48, eave: wallTop, rise: 1.08,
    color: '#8d9080', seed: 121, fascia: '#aeb09e' });
  // 車庫の内部。正面を板で塞がず、暗い天井と奥壁に奥行きを持たせる。
  add(shed, G.sharpBox(w - 0.14, 2.82, 0.12), M.woodDark, 0, 1.56, -1.45);
  add(shed, G.box(w, 0.11, d - 0.15), mat('#514d3d'), 0, 3.00, 0.12);
  for (const x of [-w / 2 + 0.10, -1.55, 1.75, w / 2 - 0.12]) {
    add(shed, G.box(0.13, 2.93, 0.14), M.woodDark, x, 1.59, front - 0.11);
  }
  // 小さな車は軒下に半分だけ見える。車番や人名は付けない。
  const car = group(shed, -2.38, 0.21, front - 1.05);
  const paint = mat('#d2d3c7'), rubber = mat('#30332f');
  add(car, G.box(1.41, 0.79, 2.34), paint, 0, 0.72, 0);
  add(car, G.box(1.35, 0.77, 1.22), paint, 0, 1.26, -0.23);
  add(car, G.plane(1.19, 0.57), mat('#485852', { roughness: 0.3 }), 0, 1.32, 0.389);
  add(car, G.box(1.38, 0.17, 0.09), mat('#9a9f92'), 0, 0.47, 1.20);
  add(car, G.box(0.53, 0.19, 0.02), mat('#454941'), 0, 0.78, 1.181);
  add(car, G.box(0.28, 0.14, 0.025), mat('#b6b8a6'), 0, 0.47, 1.255);
  for (const x of [-0.52, 0.52]) add(car, G.box(0.30, 0.22, 0.035), mat('#c7ccb5'), x, 0.88, 1.194);
  for (const x of [-0.67, 0.67]) for (const z of [-0.7, 0.73])
    add(car, G.cyl(0.25, 0.25, 0.14, 12), rubber, x, 0.29, z, { rot: [0, 0, Math.PI / 2] });
  // 奥の古い引戸と、手前の網戸。
  const sliderX = 0.05, sliderZ = front - 0.37;
  add(shed, G.box(2.55, 2.15, 0.10), mat('#594e3c'), sliderX, 1.34, sliderZ);
  for (let pane = 0; pane < 3; pane++) {
    add(shed, G.plane(0.73, 1.55), mat(['#45554f', '#4e5d54', '#334c48'][pane]),
      sliderX - 0.83 + pane * 0.83, 1.52, sliderZ + 0.06);
  }
  for (const x of [-1.24, -0.41, 0.41, 1.24]) add(shed, G.box(0.045, 2.10, 0.055), M.wood,
    sliderX + x, 1.34, sliderZ + 0.10);
  add(shed, G.box(2.58, 0.08, 0.08), M.woodDark, sliderX, 0.35, sliderZ + 0.10);
  netPanel(shed, 1.17, 1.95, 2.1, 1.26, front + 0.08, -0.13);
  netPanel(shed, 1.03, 1.95, 3.14, 1.26, front - 0.05, 0.20);
  // 低くせり出す錆びた差し掛け庇、端の欠けた木口。
  add(shed, G.box(w + 0.32, 0.07, 1.18), mat('#777464'), 0.02, 3.03, front + 0.43, { rot: [0.10, 0, 0] });
  add(shed, G.box(w + 0.38, 0.12, 0.08), mat('#64553f'), 0.02, 2.96, front + 1.0);
  for (let x = -3.5; x < 3.6; x += 0.53) add(shed, G.box(0.045, 0.09, 1.14), mat('#5f553f'), x, 2.96, front + 0.42,
    { rot: [0.10, 0, 0] });
  // 写真で左の柱に付いている小さな無銘の電気メーター。
  add(shed, G.box(0.24, 0.37, 0.12), mat('#c6c9ba'), -w / 2 + 0.18, 2.04, front + 0.10);
  add(shed, G.box(0.13, 0.12, 0.03), mat('#828c7b'), -w / 2 + 0.18, 2.10, front + 0.176);
  curveRod(shed, [[-3.45, 2.23, 2.99], [-3.45, 2.76, 3.0], [-3.5, 3.50, 2.98], [-3.51, 5.50, 2.97]],
    0.012, mat('#656d5c'));
  shed.userData.dimensions = { width: w, depth: d + 1.02, height: 6.95 };
  return shed;
}

function decorativeBlockGeometry() {
  const outer = new THREE.Shape();
  outer.moveTo(-0.272, -0.16); outer.lineTo(0.272, -0.16); outer.lineTo(0.272, 0.16); outer.lineTo(-0.272, 0.16); outer.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.223, -0.111); hole.lineTo(0.223, -0.111); hole.lineTo(0.223, 0.075);
  hole.quadraticCurveTo(0.115, 0.195, 0.0, 0.105); hole.quadraticCurveTo(-0.115, 0.195, -0.223, 0.075); hole.closePath();
  outer.holes.push(hole);
  const ribbon = new THREE.Shape();
  ribbon.moveTo(-0.232, -0.112);
  ribbon.quadraticCurveTo(-0.12, 0.082, -0.004, -0.005);
  ribbon.quadraticCurveTo(0.12, 0.082, 0.232, -0.112);
  ribbon.lineTo(0.195, -0.112);
  ribbon.quadraticCurveTo(0.11, 0.014, 0.0, -0.062);
  ribbon.quadraticCurveTo(-0.11, 0.014, -0.195, -0.112); ribbon.closePath();
  const extrude = { depth: 0.13, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 12 };
  const gs = [outer, ribbon].map((s) => {
    const g = new THREE.ExtrudeGeometry(s, extrude); g.translate(0, 0, -0.065); return g;
  });
  const merged = mergeGeometries(gs, false); gs.forEach((g) => g.dispose());
  return merged;
}

function makeWall(parent, M) {
  const wall = group(parent), x0 = -3.13, x1 = 9.65, z = 8.30;
  wall.name = '黄土色の透かしブロック塀';
  const width = x1 - x0, n = Math.round(width / 0.565), block = width / n;
  add(wall, G.box(width, 0.13, 0.21), M.wall, (x0 + x1) / 2, 0.10, z);
  const blocks = [], r = rng(241);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < n; col++) {
      blocks.push({ p: [x0 + (col + 0.5) * block, 0.27 + row * 0.225, z],
        s: [block - 0.009, 0.214, 0.165], color: new THREE.Color(C.wall).multiplyScalar(0.95 + r() * 0.08) });
    }
  }
  instances(wall, G.sharpBox(1, 1, 1), mat('#ffffff', { roughness: 1 }), blocks);
  const perforated = [];
  for (let col = 0; col < n; col++) perforated.push({ p: [x0 + (col + 0.5) * block, 0.94, z], s: [block / 0.565, 1, 1],
    color: new THREE.Color(C.wall).multiplyScalar(0.96 + r() * 0.07) });
  instances(wall, decorativeBlockGeometry(), mat('#ffffff', { roughness: 1 }), perforated);
  add(wall, G.box(width + 0.03, 0.18, 0.20), M.wall, (x0 + x1) / 2, 1.18, z);
  // 屋根瓦が塀の上に浅い山をつくる。軒先の丸瓦も二列とも実際に立体。
  const tiles = [], endCaps = [], ridge = [];
  for (let x = x0 + 0.13; x < x1; x += 0.28) {
    for (const side of [-1, 1]) {
      tiles.push({ p: [x, 1.27, z + side * 0.20], r: [0, side === -1 ? -Math.PI / 2 : Math.PI / 2, 0.23],
        s: [0.72, 1, 0.98], color: new THREE.Color('#858a85').multiplyScalar(0.91 + r() * 0.13) });
      endCaps.push({ p: [x, 1.245, z + side * 0.235], r: [Math.PI / 2, 0, 0], s: [1, 0.8, 1] });
    }
    ridge.push({ p: [x, 1.36, z], r: [0, 0, Math.PI / 2] });
  }
  instances(wall, panTileGeometry(), mat('#ffffff', { roughness: 0.9, side: THREE.DoubleSide }), tiles);
  instances(wall, G.cyl(0.068, 0.068, 0.10, 10), mat('#939991'), endCaps);
  instances(wall, G.cyl(0.075, 0.075, 0.29, 10), mat('#8b928b'), ridge);
  // 左の門柱は平天端、門扉のない広い開口を保つ。
  const gate = group(parent, x0 - 0.23, 0, z);
  gate.name = '川久保の門の開口';
  add(gate, G.box(0.53, 1.67, 0.53), M.wall, 0, 0.84, 0);
  add(gate, G.box(0.55, 0.09, 0.55), mat('#e2d5aa'), 0, 1.72, 0);
  add(gate, G.box(0.38, 1.43, 0.40), M.wall, -7.92, 0.72, -1.8);
  // 低い塀は作業場の道路側の隅に回り込む、写真で見える短い部分だけ。
  add(gate, G.box(0.37, 0.48, 0.75), M.wall, -7.92, 0.25, -1.34);
  return { wall, gate };
}

function foliage(parent, center, scale, seed, color, count = 45, { leafMin = 0.12, leafRange = 0.15, verticalSpread = .65 } = {}) {
  const r = rng(seed), transforms = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, radius = Math.sqrt(r()), yy = (r() - 0.5) * verticalSpread;
    const s = leafMin + r() * leafRange;
    transforms.push({ p: [center[0] + Math.cos(a) * radius * scale[0], center[1] + yy * scale[1],
      center[2] + Math.sin(a) * radius * scale[2]],
    s: [s * 1.2, s * 0.67, s], r: [r(), r() * 6.28, r()],
    color: new THREE.Color(color).multiplyScalar(0.77 + r() * 0.4) });
  }
  return instances(parent, G.sphere(1, 7, 5), mat('#ffffff', { roughness: 1 }), transforms);
}

function pine(parent, x, z) {
  const p = group(parent, x, 0, z), bark = mat(C.bark);
  p.name = '玄関前の段造りの松';
  curveRod(p, [[0, 0, 0], [-0.03, 0.8, 0.01], [0.12, 1.75, -0.01], [0.01, 2.66, 0.02], [0.16, 3.65, 0.02]], 0.085, bark);
  const pads = [
    { c: [-0.24, 1.02, 0.0], s: [0.63, 0.17, 0.39], count: 260 },
    { c: [0.21, 1.60, 0.02], s: [0.70, 0.15, 0.40], count: 300 },
    { c: [-0.12, 2.12, -0.02], s: [0.80, 0.17, 0.44], count: 340 },
    { c: [0.04, 2.69, -0.01], s: [0.98, 0.18, 0.47], count: 420 },
    { c: [-0.43, 3.40, 0.02], s: [0.28, 0.73, 0.29], count: 145 },
    { c: [0.35, 3.49, 0.02], s: [0.41, 0.66, 0.33], count: 180 },
  ];
  pads.forEach(({ c, s, count }, i) => {
    rod(p, [0.04, c[1] - 0.29, 0], [c[0], c[1] - 0.05, c[2]], 0.038, bark, 7);
    // 小さな葉で薄い水平の段を作り、段の間には幹と枝が見える空隙を残す。
    foliage(p, c, s, 188 + i, i % 2 ? '#62823a' : '#6a873b', count,
      { leafMin: 0.041, leafRange: 0.049, verticalSpread: i > 3 ? 1.20 : .65 });
  });
  // 写真の松の根元にある赤茶色の煉瓦の縁。
  for (const side of [-1, 1]) for (let xx = -0.9; xx < 0.9; xx += 0.28)
    add(p, G.box(0.27, 0.16, 0.13), mat('#9a7252'), xx, 0.08, side * 0.43);
  return p;
}

function stoneLantern(parent, x, z) {
  const l = group(parent, x, 0, z), stone = mat('#8b8a73', { roughness: 1 });
  add(l, G.box(0.51, 0.11, 0.47), stone, 0, 0.055, 0);
  add(l, G.cyl(0.18, 0.22, 0.18, 8), stone, 0, 0.19, 0);
  add(l, G.box(0.27, 0.34, 0.25), stone, 0, 0.43, 0);
  add(l, G.box(0.18, 0.13, 0.27), mat('#494b3d'), 0, 0.46, 0.006);
  const roof = new THREE.ConeGeometry(0.39, 0.17, 4); roof.rotateY(Math.PI / 4);
  add(l, roof, stone, 0, 0.69, 0);
  add(l, G.sphere(0.06, 8, 6), stone, 0, 0.81, 0);
  return l;
}

function shrub(parent, x, z, s, seed) {
  const r = rng(seed), t = group(parent, x, 0, z), trunk = mat('#66613e');
  rod(t, [0, 0, 0], [0.04, s * 1.1, 0], s * 0.045, trunk);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.399, h = s * (0.50 + r() * 0.9), dx = Math.cos(a) * s * (0.23 + r() * 0.22), dz = Math.sin(a) * s * 0.35;
    rod(t, [0, h * 0.4, 0], [dx, h, dz], 0.018 * s, trunk, 5);
    foliage(t, [dx, h, dz], [s * 0.34, s * 0.64, s * 0.32], seed + i * 7,
      i % 3 ? '#467337' : '#658a3e', 17);
  }
  return t;
}

function makeGarden(parent, M) {
  const garden = group(parent); garden.name = '川久保の前庭';
  const groundMap = canvasTex(2048, 1536, (ctx, W, H) => {
    const r = rng(8690), X = (x) => (x + 12) / 23 * W, Z = (z) => (z + 5.6) / 15.4 * H;
    ctx.fillStyle = '#b1a88b'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 33000; i++) {
      ctx.fillStyle = i % 3 ? `rgba(223,216,184,${r() * 0.2})` : `rgba(67,74,46,${r() * 0.13})`;
      ctx.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3);
    }
    const rect = (x, z, w, d, color) => { ctx.fillStyle = color; ctx.fillRect(X(x), Z(z), w / 23 * W, d / 15.4 * H); };
    rect(-11.6, 5.1, 7.8, 4.5, '#aaa693');
    rect(-3.6, 6.1, 13.5, 2.05, '#b7aa8b');
    rect(-3.4, 3.3, 7.7, 0.85, '#709348');
    rect(-3.0, 2.25, 2.25, 1.20, '#6e8f46');
    rect(4.8, 3.1, 4.7, 4.15, '#6d853e');
    // 草地の端は直線の色分けにせず、小さく疎らな葉で崩す。
    for (let i = 0; i < 5500; i++) {
      const x = -3.4 + r() * 12.5, z = 2.1 + r() * 5.4;
      if ((z < 4.2 && x < 0.5) || (x > 4.8 && z < 7.3)) {
        ctx.fillStyle = ['#7e9953', '#657f3f', '#91a367'][i % 3];
        ctx.fillRect(X(x), Z(z), 1 + r() * 4, 1 + r() * 3);
      }
    }
    // 左の車庫前へ伸びる灰色の細い排水溝。
    ctx.strokeStyle = '#7d806e'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(X(-8.7), Z(9.0)); ctx.lineTo(X(-3.9), Z(5.5)); ctx.lineTo(X(-3.6), Z(2.2)); ctx.stroke();
    ctx.strokeStyle = '#c6c1ac'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(-8.72), Z(9.0)); ctx.lineTo(X(-3.92), Z(5.5)); ctx.lineTo(X(-3.62), Z(2.2)); ctx.stroke();
  });
  add(garden, G.plane(23, 15.4), new THREE.MeshStandardMaterial({ map: groundMap, roughness: 1 }),
    -0.5, 0.012, 2.1, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const pineTree = pine(garden, 0.7, 2.95);
  stoneLantern(garden, 5.19, 3.03);
  // 写真右の葉が密な庭木と、その奥の小さく刈り込まれた木。
  shrub(garden, 6.15, 5.55, 1.80, 202);
  shrub(garden, 8.15, 4.10, 1.28, 205);
  const rearTree = group(garden, 7.35, 0, -0.15);
  rod(rearTree, [0, 0, 0], [0, 2.55, 0], 0.09, mat(C.bark));
  foliage(rearTree, [0, 2.75, 0], [0.95, 0.9, 0.9], 331, '#62853a', 110);
  // 写真2・追加全景の、母屋左奥の広葉樹。白い2階妻壁の左端よりも
  // 左で樹冠をまとめ、妻壁やアンテナのシルエットは隠さない。
  const backTree = group(garden, -3.75, 0, -3.95);
  rod(backTree, [0, 0.02, 0], [0.05, 4.75, 0], 0.11, mat(C.bark));
  for (const [a, b] of [
    [[0.02, 3.40, 0], [-0.65, 5.0, 0.12]],
    [[0.03, 3.95, 0], [0.63, 5.35, -0.38]],
  ]) rod(backTree, a, b, 0.065, mat(C.bark));
  for (const [center, scale, seed, color] of [
    [[-0.72, 5.06, 0.14], [1.12, 1.75, 1.03], 514, '#658742'],
    [[0.30, 5.60, -0.30], [1.28, 1.78, 1.08], 516, '#6c8c45'],
    [[0.95, 5.04, -0.56], [0.96, 1.55, 0.96], 519, '#5b7c3b'],
  ]) foliage(backTree, center, scale, seed, color, 410,
    { leafMin: 0.075, leafRange: 0.075 });
  // 右の家まで続く、角ばりすぎない飛び石。
  const stoneR = rng(171);
  for (let i = 0; i < 8; i++) {
    const x = 5.1 + Math.sin(i * 0.8) * 0.12, z = 2.5 - i * 0.63;
    add(garden, G.cyl(0.23 + stoneR() * 0.08, 0.26, 0.045, 6), M.stone,
      x, 0.035, z, { scale: [1.24, 1, 0.92], rot: [0, stoneR() * 6.28, 0] });
  }
  for (const [x, z, s] of [[-2.5, 2.7, 0.30], [5.7, 2.6, 0.25], [7.0, 1.65, 0.35]]) {
    add(garden, G.sphere(1, 8, 6), M.stone, x, s * 0.38, z, { scale: [s, s * 0.55, s * 0.65] });
  }
  // 小さな素焼鉢は庭の奥に控えめに。実物の表札などは追加しない。
  for (const [x, z] of [[5.65, 0.4], [6.0, 0.1], [6.3, -0.45]]) {
    add(garden, G.cyl(0.16, 0.11, 0.26, 10), mat('#a47d56'), x, 0.13, z);
    foliage(garden, [x, 0.35, z], [0.18, 0.4, 0.18], Math.round(x * 100), '#637c3e', 12);
  }
  // 境内風の石畳にせず、写真と同じ古いコンクリート・土の庭を保つ。
  for (let i = 0; i < 6; i++) {
    add(garden, G.box(0.34, 0.045, 0.56), mat(i % 2 ? '#8c9080' : '#a9a995'),
      -5.1 - i * 0.50, 0.035, 6.9 + i * 0.34, { rot: [0, 0.45, 0] });
  }
  const drain = group(garden, -5.7, 0.05, 7.2, -0.56);
  add(drain, G.box(0.33, 0.025, 0.65), mat('#686e61'), 0, 0, 0);
  for (let z = -0.27; z < 0.3; z += 0.075) add(drain, G.box(0.29, 0.022, 0.018), mat('#929887'), 0, 0.02, z);
  return { garden, pine: pineTree };
}

function makeNeighbor(parent, M) {
  // 右隣は写真1に見える黒瓦と軒下だけ。裏や敷地の詳細は作らない。
  const neighbor = group(parent, 12.7, 0, -0.65);
  neighbor.name = '写真右隣に見える黒瓦の家';
  add(neighbor, G.box(6.1, 2.85, 6.3), mat('#7b7c62'), 0, 1.58, -0.55);
  add(neighbor, triangle(6.3, 1.10, 6.35), mat('#c4c4ad'), 0, 3.0, -0.55);
  tiledRoof(neighbor, { w: 7.1, d: 7.2, eave: 3.0, rise: 1.35, color: '#4d5551', seed: 210 });
  // 手前の差し掛けが本屋根と二段に重なる。
  add(neighbor, G.box(6.8, 0.085, 2.0), mat('#4d5550'), 0, 2.65, 3.3, { rot: [0.18, 0, 0] });
  for (const x of [-2.7, 0, 2.7]) add(neighbor, G.box(0.12, 2.60, 0.12), M.woodDark, x, 1.4, 3.8);
  for (const x of [-1.5, 1.45]) add(neighbor, G.box(1.5, 1.15, 0.05), mat('#3f4940'), x, 1.77, 2.64);
  neighbor.userData.referenceScope = '写真1で確認できる道路側の外観のみ';
  return neighbor;
}

function utilityPole(parent) {
  const pole = group(parent, -11.45, 0, 6.10), concrete = mat('#aaa99b');
  add(pole, G.cyl(0.105, 0.15, 8.6, 14), concrete, 0, 4.30, 0);
  // 写真の根元は横縞ではなく、縦の黒黄の注意帯。
  add(pole, G.cyl(.156, .156, 1.12, 16), mat('#ceb442'), 0, .65, 0);
  for (let i = 0; i < 5; i++) {
    add(pole, new THREE.CylinderGeometry(.159, .159, 1.12, 3, 1, true, i * Math.PI * 2 / 5, .24), mat('#343b35'), 0, .65, 0);
  }
  for (const y of [.12, 1.18]) add(pole, G.cyl(.163, .163, .035, 16), mat('#aaa991'), 0, y, 0);
  for (const y of [6.85, 7.7]) {
    rod(pole, [-0.60, y, 0.0], [0.60, y, 0.0], 0.032, mat('#707768'));
    for (const x of [-0.48, 0.0, 0.48]) add(pole, G.cyl(0.055, 0.048, 0.19, 8), mat('#bbc0ad'), x, y + 0.10, 0);
  }
  const wire = mat('#464f45');
  // 写真内の局所的な電線。遠くの経路や隣家への引込先は推測しない。
  for (let i = 0; i < 3; i++) {
    curveRod(pole, [[i * 0.14 - 0.2, 7.88, 0], [0.4, 7.45, -3.5], [0.6, 7.6, -8.0]], 0.009, wire);
  }
  curveRod(pole, [[0.46, 7.0, 0], [2.7, 6.10, -1.2], [4.0, 5.78, -1.2]], 0.014, wire);
  return pole;
}

/**
 * 写真の主棟・作業場・前庭・透かし塀を、相互の比率を揃えてまとめる。
 * parent側で回転・移動可。屋根は InstancedMesh、細部は mergeStatic 可。
 * 正面 (+z) の道路からの推奨視点は R.views.front / left / right。
 */
export function createKawakuboProperty(parent) {
  const root = group(parent); root.name = '久保泉町川久保・写真参照の敷地';
  const M = {
    plaster: textured(C.plaster, 1), cream: textured(C.cream, 2),
    concrete: textured('#929185', 3), foundation: textured('#74786a', 4),
    wall: textured(C.wall, 5), stone: textured(C.stone, 6),
    wood: mat(C.wood), woodDark: mat('#5b5140'), bronze: mat(C.bronze, { roughness: 0.61, metalness: 0.12 }),
  };
  const { garden, pine: pineTree } = makeGarden(root, M);
  const { house, lowerRoof, porch, doorTarget } = makeHouse(root, M);
  const shed = makeShed(root, M);
  const { wall, gate } = makeWall(root, M);
  const neighbor = makeNeighbor(root, M), pole = utilityPole(root);
  root.userData.reference = {
    source: '利用者提供のGoogleストリートビュー外観画像4枚（2024年5月表示）と追加の全景画像',
    frontage: '+z', dimensions: '写真の比率に基づく概算。測量値ではない。',
    notObserved: '主棟・作業場の背面、室内、右隣家の奥',
  };
  return {
    root, house, shed, wall, garden, gate, neighbor, pine: pineTree, porch, lowerRoof, pole,
    frontTarget: new THREE.Vector3(0.4, 2.7, 2.3), doorTarget,
    bounds: { x: [-12.1, 16.5], z: [-5.6, 9.8], height: 8.6 },
    views: {
      front: { position: new THREE.Vector3(-2.0, 3.0, 22), target: new THREE.Vector3(0.5, 2.8, 1.5) },
      left: { position: new THREE.Vector3(-20, 3.0, 15), target: new THREE.Vector3(-5.5, 3.1, 2.4) },
      right: { position: new THREE.Vector3(9.5, 3.2, 21), target: new THREE.Vector3(2.8, 2.4, 2.7) },
      porch: { position: new THREE.Vector3(1.8, 3.1, 14), target: new THREE.Vector3(2.3, 1.7, 2.5) },
      wall: { position: new THREE.Vector3(3.8, 2.3, 15), target: new THREE.Vector3(3.3, 1.0, 8.3) },
      shed: { position: new THREE.Vector3(-18, 3.6, 14), target: new THREE.Vector3(-7.6, 3.0, 3.8) },
    },
  };
}
