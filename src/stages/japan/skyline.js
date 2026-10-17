import * as THREE from 'three';
import { add, mat, glow, G, group, rng, canvasTex } from '../../lib/util.js';

// 各棟は旧街区の座標を持つ親グループ。配置変換は呼び出し元が最後に一度だけ掛ける。
// 建物の寸法と立体的な外装はその親の内側に保ち、昼夜の窓位置も共有する。
function windowMaterial(seed, wall, glass) {
  const random = rng(seed);
  const windows = Array.from({ length: 48 }, () => ({
    lit: random() > 0.36, warm: random() > 0.22, shade: random(),
  }));
  const draw = (night) => (ctx, w, h) => {
    ctx.fillStyle = night ? '#000000' : wall;
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) {
      const win = windows[row * 6 + col];
      const x = col * w / 6 + 4, y = row * h / 8 + 4;
      ctx.fillStyle = night ? (win.lit ? (win.warm ? '#f4d6a0' : '#c7dfff') : '#000000') : glass;
      ctx.fillRect(x, y, w / 6 - 8, h / 8 - 8);
      if (!night) {
        ctx.fillStyle = `rgba(219,239,248,${0.08 + win.shade * 0.14})`;
        ctx.fillRect(x, y, w / 6 - 8, 3);
        ctx.fillStyle = 'rgba(20,33,45,.2)';
        ctx.fillRect(x, y + h / 8 - 12, w / 6 - 8, 4);
      }
    }
  };
  const day = canvasTex(256, 256, draw(false));
  const night = canvasTex(256, 256, draw(true));
  for (const tex of [day, night]) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({
    map: day, emissive: '#ffffff', emissiveMap: night,
    emissiveIntensity: 0.08, roughness: 0.43, metalness: 0.08,
  });
}

// 窓の大きさを建物ごとに引き伸ばさず、実寸に沿った UV にする。
function facadeBox(parent, w, h, d, material, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  for (let face = 0; face < 6; face++) {
    const horizontal = face < 2 ? d : w;
    const vertical = face === 2 || face === 3 ? d : h;
    for (let i = face * 4; i < face * 4 + 4; i++) {
      uv.setXY(i, uv.getX(i) * horizontal / 3, uv.getY(i) * vertical / 4.8);
    }
  }
  return add(parent, geo, material, x, y, z);
}

function beam(parent, a, b, radius, material) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const mesh = add(parent, G.cyl(radius, radius, va.distanceTo(vb), 6), material);
  mesh.position.copy(va).add(vb).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return mesh;
}

function railing(parent, w, d, y, metal) {
  const top = y + 0.3;
  for (const z of [-d / 2, d / 2]) {
    add(parent, G.box(w, 0.035, 0.035), metal, 0, top, z, { cast: false });
    for (let i = 0; i <= 4; i++) add(parent, G.box(0.035, 0.32, 0.035), metal, -w / 2 + w * i / 4, y + 0.15, z, { cast: false });
  }
  for (const x of [-w / 2, w / 2]) {
    add(parent, G.box(0.035, 0.035, d), metal, x, top, 0, { cast: false });
    add(parent, G.box(0.035, 0.32, 0.035), metal, x, y + 0.15, 0, { cast: false });
  }
}

function rooftop(parent, w, d, y, M, seed) {
  add(parent, G.box(w + 0.1, 0.13, d + 0.1), M.cap, 0, y + 0.02, 0);
  railing(parent, w - 0.15, d - 0.15, y + 0.08, M.dark);
  add(parent, G.box(w * 0.33, 0.55, d * 0.36), M.stone, -w * 0.17, y + 0.34, -d * 0.13);
  add(parent, G.box(w * 0.35, 0.06, d * 0.38), M.cap, -w * 0.17, y + 0.64, -d * 0.13);
  for (let i = 0; i < 2; i++) {
    const x = w * 0.2, z = -d * 0.15 + i * d * 0.27;
    add(parent, G.box(w * 0.22, 0.26, d * 0.22), M.cap, x, y + 0.22, z);
    add(parent, G.cyl(0.13, 0.13, 0.035, 12), M.dark, x, y + 0.37, z, { cast: false });
  }
  if (seed % 2 === 0) {
    add(parent, G.cyl(0.025, 0.035, 0.8, 6), M.dark, -w * 0.3, y + 0.52, d * 0.26);
    add(parent, G.box(0.4, 0.025, 0.025), M.dark, -w * 0.3, y + 0.78, d * 0.26, { cast: false });
  }
}

function office(sky, spec, M, windows) {
  const { id, x, z, w, d, h, style = 0, step = false } = spec;
  const tower = group(sky, x, 0, z);
  tower.name = `tokyo-skyline-${id}`;
  tower.userData.skylineBuilding = true;
  const podium = Math.min(1.5, h * 0.14);
  facadeBox(tower, w, podium, d, windows[3], 0, podium / 2, 0);
  add(tower, G.box(w + 0.12, 0.16, d + 0.12), M.stone, 0, podium, 0);
  const shoulder = step ? h * 0.69 : h;
  facadeBox(tower, w, shoulder - podium, d, windows[style], 0, (shoulder + podium) / 2, 0);
  let roofW = w, roofD = d;
  if (step) {
    add(tower, G.box(w + 0.12, 0.14, d + 0.12), M.cap, 0, shoulder, 0);
    railing(tower, w - 0.08, d - 0.08, shoulder + 0.08, M.dark);
    roofW = w * 0.72; roofD = d * 0.72;
    facadeBox(tower, roofW, h - shoulder, roofD, windows[style], 0, (h + shoulder) / 2, 0);
  }
  // 細い縦方立と帯を立体化し、単なる窓模様の箱にしない。
  for (const zSide of [-1, 1]) {
    for (let i = 0; i <= 4; i++) {
      add(tower, G.box(0.045, shoulder - podium, 0.055), style === 2 ? M.stone : M.silver,
        -w / 2 + i * w / 4, (shoulder + podium) / 2, zSide * (d / 2 + 0.023), { cast: false });
    }
    for (let y = podium + 2.4; y < shoulder - 0.3; y += 2.4) {
      add(tower, G.box(w + 0.04, 0.065, 0.055), M.cap, 0, y, zSide * (d / 2 + 0.025), { cast: false });
    }
  }
  for (const side of [-1, 1]) add(tower, G.box(0.08, shoulder - podium, d + 0.1), M.silver, side * w / 2, (shoulder + podium) / 2, 0);
  rooftop(tower, roofW, roofD, h, M, Math.round(x));
  return tower;
}

function metropolitan(sky, M, windows, beacon) {
  const tower = group(sky, -12, 0, -18.1);
  tower.name = 'tokyo-metropolitan-twin-towers';
  tower.userData.skylineBuilding = true;
  add(tower, G.box(6.4, 0.34, 3.9), M.stone, 0, 0.17, 0);
  facadeBox(tower, 6, 8.2, 3.5, windows[2], 0, 4.43, 0);
  add(tower, G.box(6.16, 0.22, 3.64), M.stone, 0, 8.55, 0);
  // 中央の暗い縦スリットと、そこをまたぐ低い連結棟。
  facadeBox(tower, 0.75, 1.8, 2.7, windows[3], 0, 9.45, -0.15);
  for (const side of [-1, 1]) {
    const cx = side * 1.64;
    facadeBox(tower, 2.28, 7.35, 2.9, windows[2], cx, 12.26, 0);
    for (const front of [-1, 1]) {
      for (const dx of [-0.91, -0.46, 0, 0.46, 0.91]) {
        add(tower, G.box(0.095, 7.35, 0.13), M.stone, cx + dx, 12.26, front * 1.49);
      }
      for (const y of [10.2, 12.4, 14.6, 16.0]) add(tower, G.box(2.42, 0.15, 0.15), M.stone, cx, y, front * 1.5);
    }
    add(tower, G.box(2.45, 0.26, 3.08), M.stone, cx, 16.1, 0);
    // 角を落とした冠と、少しずつ内側へ退く二段の屋上。
    add(tower, G.cyl(1.38, 1.5, 1.85, 8), windows[2], cx, 17.13, 0, { rot: [0, Math.PI / 8, 0] });
    add(tower, G.cyl(1.42, 1.42, 0.17, 8), M.stone, cx, 18.15, 0, { rot: [0, Math.PI / 8, 0] });
    add(tower, G.cyl(1.02, 1.24, 1.0, 8), windows[2], cx, 18.72, 0, { rot: [0, Math.PI / 8, 0] });
    add(tower, G.cyl(1.08, 1.08, 0.14, 8), M.cap, cx, 19.28, 0, { rot: [0, Math.PI / 8, 0] });
    for (const zSide of [-1, 1]) for (const dx of [-0.65, 0, 0.65]) {
      add(tower, G.box(0.08, 1.7, 0.11), M.stone, cx + dx, 17.12, zSide * 1.3);
    }
    add(tower, G.cyl(0.025, 0.035, 0.32, 6), M.dark, cx, 19.48, 0);
    add(tower, G.sphere(0.075, 8, 6), beacon, cx, 19.68, 0, { cast: false });
  }
  for (const front of [-1, 1]) for (let x = -2.8; x <= 2.81; x += 0.56) {
    add(tower, G.box(0.1, 8.1, 0.14), M.stone, x, 4.43, front * 1.79);
  }
  return tower;
}

function cocoon(sky, M, windows, beacon) {
  const tower = group(sky, -4.8, 0, -18.6);
  tower.name = 'tokyo-cocoon-tower';
  tower.userData.skylineBuilding = true;
  const height = 18.2;
  const radius = (t) => 0.38 + 1.68 * Math.pow(Math.sin(Math.PI * (0.1 + t * 0.87)), 0.65);
  const point = (t, angle, offset = 0) => {
    const r = radius(t) + offset;
    return new THREE.Vector3(Math.cos(angle) * r, 0.45 + height * t, Math.sin(angle) * r * 0.77);
  };
  const vertices = [], uv = [], indices = [], slices = 48, rows = 40;
  for (let y = 0; y <= rows; y++) for (let j = 0; j <= slices; j++) {
    const p = point(y / rows, j / slices * Math.PI * 2);
    vertices.push(p.x, p.y, p.z); uv.push(j / slices * 3.6, y / rows * 4);
    if (y < rows && j < slices) {
      const a = y * (slices + 1) + j, b = a + slices + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  add(tower, geo, windows[0]);
  // 白い斜材はテクスチャではなく外殻に沿う二方向の立体曲線。
  for (const direction of [-1, 1]) for (let stripe = 0; stripe < 10; stripe++) {
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      points.push(point(t, stripe / 10 * Math.PI * 2 + direction * t * Math.PI * 2.15, 0.045));
    }
    add(tower, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 56, 0.027, 5, false), M.silver);
  }
  for (const t of [0.02, 0.2, 0.4, 0.6, 0.8, 0.98]) {
    const points = Array.from({ length: 49 }, (_, j) => point(t, j / 48 * Math.PI * 2, 0.035));
    add(tower, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.035, 5, false), M.silver);
  }
  add(tower, G.cyl(1.25, 1.35, 0.42, 40), M.stone, 0, 0.22, 0, { scale: [1, 1, 0.77] });
  add(tower, G.sphere(radius(1), 24, 12), M.silver, 0, height + 0.39, 0, { scale: [1, 0.17, 0.77] });
  add(tower, G.sphere(0.07, 8, 6), beacon, 0, height + 0.6, 0, { cast: false });
  return tower;
}

function clockTower(sky, M, windows, beacon) {
  const tower = group(sky, 9.7, 0, -17.7);
  tower.name = 'tokyo-yoyogi-clock-tower';
  tower.userData.skylineBuilding = true;
  facadeBox(tower, 3.2, 2, 3.2, windows[2], 0, 1, 0);
  facadeBox(tower, 2.8, 9.8, 2.8, windows[2], 0, 6.9, 0);
  for (const side of [-1, 1]) {
    for (const x of [-1.42, 1.42]) add(tower, G.box(0.12, 11.9, 0.15), M.stone, x, 5.95, side * 1.42);
  }
  add(tower, G.box(3.04, 0.2, 3.04), M.stone, 0, 11.9, 0);
  add(tower, G.box(2.58, 3.0, 2.58), M.stone, 0, 13.5, 0);
  const dial = new THREE.MeshStandardMaterial({ color: '#f5edcf', emissive: '#ffe3a0', emissiveIntensity: 0.12, roughness: 0.68 });
  // 謎の手がかりと同じ午後8時。装飾の時計にも別の時刻を混ぜない。
  const hour = Math.PI * 4 / 3, minute = 0;
  for (let face = 0; face < 4; face++) {
    const front = group(tower, 0, 0, 0, face * Math.PI / 2);
    add(front, G.circle(0.85, 40), M.dark, 0, 13.55, 1.305, { cast: false });
    add(front, G.circle(0.765, 40), dial, 0, 13.55, 1.316, { cast: false });
    for (let tick = 0; tick < 12; tick++) {
      const angle = tick * Math.PI / 6;
      add(front, G.box(tick % 3 === 0 ? 0.055 : 0.03, tick % 3 === 0 ? 0.14 : 0.095, 0.018), M.dark,
        Math.sin(angle) * 0.645, 13.55 + Math.cos(angle) * 0.645, 1.335, { rot: [0, 0, -angle], cast: false });
    }
    for (const [name, angle, length, width, z] of [['clock-hour', hour, 0.41, 0.075, 1.35], ['clock-minute', minute, 0.59, 0.045, 1.37]]) {
      const hand = add(front, G.box(width, length, 0.02), M.dark, Math.sin(angle) * length / 2,
        13.55 + Math.cos(angle) * length / 2, z, { rot: [0, 0, -angle], cast: false });
      hand.name = name;
    }
    add(front, G.circle(0.065, 12), M.dark, 0, 13.55, 1.385, { cast: false });
  }
  add(tower, G.box(2.8, 0.18, 2.8), M.cap, 0, 15.08, 0);
  add(tower, G.cone(1.78, 3.3, 4), M.silver, 0, 16.8, 0, { rot: [0, Math.PI / 4, 0] });
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    beam(tower, [x * 1.26, 15.2, z * 1.26], [0, 18.45, 0], 0.025, M.dark);
  }
  add(tower, G.cyl(0.02, 0.055, 0.72, 8), M.dark, 0, 18.77, 0);
  add(tower, G.sphere(0.075, 8, 6), beacon, 0, 19.2, 0, { cast: false });
  return tower;
}

/** 新宿の双塔・コクーン・代々木時計塔と、段差のある東京の高層ビル街。 */
export function buildTokyoSkyline(root, R) {
  const sky = (R.skyline = group(root));
  sky.name = 'tokyo-skyline';
  R.winMats ||= [];
  R.beacons ||= [];
  const windows = [
    windowMaterial(811, '#667e90', '#39586e'),
    windowMaterial(812, '#72958f', '#3c6870'),
    windowMaterial(813, '#c7c3b9', '#657b8c'),
    windowMaterial(814, '#79818a', '#344657'),
  ];
  R.winMats.push(...windows);
  const M = {
    stone: mat('#c9c6bd', { roughness: 0.78 }),
    silver: mat('#d1dade', { roughness: 0.45, metalness: 0.12 }),
    cap: mat('#8a949c', { roughness: 0.7 }),
    dark: mat('#35444f', { roughness: 0.66 }),
  };
  const beacon = glow('#ff3d27', 1.2);
  R.beacons.push(beacon);
  R.tocho = metropolitan(sky, M, windows, beacon);
  cocoon(sky, M, windows, beacon);
  clockTower(sky, M, windows, beacon);
  const specs = [
    { id: 'west-gateway', x: -27, z: -16.1, w: 3.6, d: 3.2, h: 10.3, style: 2, step: true },
    { id: 'west-glass', x: -22.9, z: -19.6, w: 3.3, d: 3.1, h: 14.5, style: 0 },
    { id: 'west-office', x: -18.7, z: -15.3, w: 3.0, d: 2.6, h: 9.8, style: 3, step: true },
    { id: 'west-annex', x: -27.7, z: -21, w: 2.2, d: 1.6, h: 7.2, style: 3 },
    { id: 'central-stepped', x: 0.8, z: -20.1, w: 3.4, d: 3.0, h: 16.4, style: 2, step: true },
    { id: 'central-green', x: 4.2, z: -15.3, w: 2.9, d: 2.8, h: 10.4, style: 1 },
    { id: 'east-glass', x: 15.2, z: -19.3, w: 3.7, d: 3.6, h: 15.4, style: 0, step: true },
    { id: 'east-stepped', x: 20.6, z: -20.4, w: 3.1, d: 2.8, h: 16.6, style: 3, step: true },
    { id: 'east-silver', x: 27.3, z: -15.6, w: 2.9, d: 2.6, h: 11.4, style: 2 },
    { id: 'east-green', x: 15.9, z: -14.8, w: 2.7, d: 2.2, h: 8.4, style: 1 },
  ];
  for (const spec of specs) {
    const tower = office(sky, spec, M, windows);
    if (spec.h > 14) add(tower, G.sphere(0.065, 8, 6), beacon, 0, spec.h + 0.8, 0, { cast: false });
  }
  return sky;
}
