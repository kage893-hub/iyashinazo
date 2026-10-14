import * as THREE from 'three';
import { add, mat, glow, G, group } from '../../lib/util.js';
import { nameplateTex } from './textures.js';

// ---------------------------------------------------------------
// 異世界列車「ほしまわり号」と、空へ続く線路
// ---------------------------------------------------------------

export const RAIL_Y = 0.38;
export const TRACK_Z = -5.2;
const V = THREE.Vector3;

export function makeTrainPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.LineCurve3(new V(-13, RAIL_Y, TRACK_Z), new V(15, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(15, RAIL_Y, TRACK_Z), new V(27, RAIL_Y, TRACK_Z), new V(38, 4, -8), new V(50, 12, -18)));
  p.add(new THREE.CubicBezierCurve3(new V(50, 12, -18), new V(62, 20, -28), new V(72, 27, -40), new V(82, 33, -58)));
  p.arcLengthDivisions = 600;
  return p;
}

/** 曲線上の位置と向きを obj に設定（obj の +X が進行方向） */
const _x = new V(), _y = new V(), _z = new V(), _m = new THREE.Matrix4(), UP = new V(0, 1, 0);
export function placeOnPath(path, obj, s) {
  const L = path.getLength();
  const u = THREE.MathUtils.clamp(s / L, 0, 1);
  obj.position.copy(path.getPointAt(u));
  _x.copy(path.getTangentAt(u)).normalize();
  _y.copy(UP).addScaledVector(_x, -UP.dot(_x)).normalize();
  _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z);
  obj.quaternion.setFromRotationMatrix(_m);
}

/** 線路（島の上＋空へ伸びる部分） */
export function buildTracks(parent, path) {
  const root = group(parent);
  const steel = mat('#9aa0aa', { metalness: 0.75, roughness: 0.35 });
  const wood = mat('#5a4434');
  const ballast = mat('#a39887', { roughness: 1 });

  // 島の上：バラストと直線レール
  add(root, G.box(29.5, 0.16, 2.3), ballast, 0.75, 0.08, TRACK_Z);
  for (const s of [-1, 1]) {
    add(root, G.box(28.4, 0.13, 0.1), steel, 1.2, RAIL_Y - 0.065, TRACK_Z + s * 0.55);
  }
  // 車止め
  const stop = group(root, -13.6, 0, TRACK_Z);
  add(stop, G.box(0.3, 0.9, 1.8), mat('#c43a2e'), 0, 0.6, 0);
  add(stop, G.box(0.12, 0.86, 1.9), mat('#f2f2f2'), 0.16, 0.6, 0);
  add(stop, G.box(0.9, 0.12, 0.12), mat('#3a3a40'), 0.35, 0.45, 0.5, { rot: [0, 0, -0.6] });
  add(stop, G.box(0.9, 0.12, 0.12), mat('#3a3a40'), 0.35, 0.45, -0.5, { rot: [0, 0, -0.6] });

  // 枕木（インスタンス）
  const L = path.getLength();
  const step = 0.6;
  const islandSleepers = [], skySleepers = [];
  for (let s = 0.3; s < L - 0.5; s += step) {
    const p = path.getPointAt(s / L);
    (p.x < 14.6 ? islandSleepers : skySleepers).push(s);
  }
  const dummy = new THREE.Object3D();
  const mk = (list, material) => {
    const inst = new THREE.InstancedMesh(G.box(0.26, 0.1, 1.6), material, list.length);
    list.forEach((s, i) => {
      placeOnPath(path, dummy, s);
      dummy.translateY(-0.17);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    root.add(inst);
    return inst;
  };
  mk(islandSleepers, wood);
  mk(skySleepers, new THREE.MeshStandardMaterial({ color: '#4c5a80', emissive: '#7fd8ff', emissiveIntensity: 0.7, roughness: 0.5 }));

  // 空のレール（チューブ）
  const sStart = 28.2;
  for (const side of [-1, 1]) {
    const pts = [];
    for (let s = sStart - 0.3; s < L; s += 0.8) {
      placeOnPath(path, dummy, s);
      dummy.updateMatrixWorld();
      pts.push(new V(0, -0.065, side * 0.55).applyMatrix4(dummy.matrixWorld));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    add(root, new THREE.TubeGeometry(curve, pts.length * 2, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#d8e4ff', metalness: 0.6, roughness: 0.3, emissive: '#6fb8ff', emissiveIntensity: 0.5 }), 0, 0, 0, { cast: false });
  }
  // 架台（雲の中へ伸びる柱）
  const pillar = mat('#4b3b30');
  for (let s = sStart + 1; s < sStart + 22; s += 3.2) {
    const p = path.getPointAt(s / L);
    const h = p.y + 16;
    for (const side of [-1, 1]) {
      add(root, G.cyl(0.09, 0.14, h, 6), pillar, p.x, p.y - h / 2 - 0.25, p.z + side * 0.7, { cast: false });
    }
    add(root, G.box(0.15, 0.15, 1.6), pillar, p.x, p.y - 0.3, p.z, { cast: false });
    add(root, G.box(0.08, 0.08, 1.6), pillar, p.x, p.y - 3.2, p.z, { cast: false });
  }
  root.traverse((o) => { if (o.isMesh) o.userData.noPick = o.position.x > 15; });
  return root;
}

// ---------------------------------------------------------------
// 車両
// ---------------------------------------------------------------
const C = {
  body: '#23406e',
  gold: '#e2bf62',
  red: '#b5372c',
  black: '#24242a',
  maroon: '#7b2b3a',
  cream: '#f1e3c2',
};

function wheel(parent, x, y, z, r, list, spokes = true) {
  const g = group(parent, x, y, z);
  add(g, G.cyl(r, r, 0.12, 24), mat(C.red, { roughness: 0.5 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  add(g, G.torus(r * 0.96, 0.035, 6, 24), mat('#cfd3da', { metalness: 0.8, roughness: 0.3 }), 0, 0, Math.sign(z) * 0.065, { cast: false });
  add(g, G.cyl(r * 0.22, r * 0.22, 0.16, 12), mat(C.gold, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  if (spokes) {
    for (let i = 0; i < 4; i++) {
      add(g, G.box(r * 1.8, 0.05, 0.03), mat('#7d2620'), 0, 0, Math.sign(z) * 0.065, { rot: [0, 0, (i * Math.PI) / 4], cast: false });
    }
  }
  g.userData.dynamic = true;
  list.push({ g, r });
  return g;
}

function curvedRoof(parent, len, radius, half, y, material) {
  const geo = new THREE.CylinderGeometry(radius, radius, len, 24, 1, true, -half, half * 2);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI / 2);
  const m = add(parent, geo, material, 0, y - radius * Math.cos(half), 0);
  return m;
}

export function makeLocomotive() {
  const g = new THREE.Group();
  const wheels = [];
  const body = mat(C.body, { roughness: 0.45, metalness: 0.25 });
  const gold = mat(C.gold, { metalness: 0.8, roughness: 0.25 });
  const black = mat(C.black, { roughness: 0.6 });

  add(g, G.box(5.3, 0.24, 1.3), black, 0, 0.62, 0);
  // 動輪 3 対
  const drivers = [-1.0, 0.15, 1.3];
  for (const x of drivers) for (const z of [-0.6, 0.6]) wheel(g, x, 0.52, z, 0.5, wheels);
  for (const z of [-0.6, 0.6]) wheel(g, 2.25, 0.3, z, 0.28, wheels, false);
  // ロッド
  const rods = [];
  for (const z of [-0.72, 0.72]) {
    const rod = add(g, G.box(2.5, 0.08, 0.05), mat('#d0d4dc', { metalness: 0.8, roughness: 0.3 }), 0.15, 0.52, z, { cast: false });
    rod.userData.keep = true;
    rods.push(rod);
  }
  // シリンダー
  for (const z of [-0.68, 0.68]) add(g, G.cyl(0.2, 0.2, 0.7, 14), body, 2.0, 0.66, z, { rot: [0, 0, Math.PI / 2] });
  // ボイラー
  add(g, G.cyl(0.6, 0.6, 3.6, 28), body, 0.6, 1.35, 0, { rot: [0, 0, Math.PI / 2] });
  for (const x of [-0.9, 0.2, 1.3, 2.3]) add(g, G.torus(0.61, 0.03, 6, 28), gold, x, 1.35, 0, { rot: [0, Math.PI / 2, 0], cast: false });
  // 煙室
  add(g, G.cyl(0.63, 0.63, 0.5, 28), black, 2.6, 1.35, 0, { rot: [0, 0, Math.PI / 2] });
  add(g, G.cyl(0.5, 0.55, 0.06, 28), black, 2.87, 1.35, 0, { rot: [0, 0, Math.PI / 2] });
  // 正面の星エンブレム
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.1 : 0.24;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r); else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  add(g, new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), glow('#ffd36a', 1.2), 2.91, 1.35, 0, { rot: [0, Math.PI / 2, 0], cast: false });
  // 煙突
  add(g, G.cyl(0.17, 0.2, 0.7, 16), black, 2.45, 2.2, 0);
  add(g, G.cyl(0.3, 0.18, 0.25, 16), black, 2.45, 2.62, 0);
  add(g, G.torus(0.29, 0.03, 6, 20), gold, 2.45, 2.74, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  // 蒸気ドーム・砂箱
  add(g, G.cyl(0.24, 0.28, 0.32, 18), gold, 1.1, 2.0, 0);
  add(g, G.sphere(0.24, 18, 10), gold, 1.1, 2.16, 0, { scale: [1, 0.6, 1] });
  add(g, G.cyl(0.2, 0.24, 0.26, 18), body, 0.1, 1.97, 0);
  add(g, G.sphere(0.2, 18, 10), body, 0.1, 2.1, 0, { scale: [1, 0.6, 1] });
  // 鐘
  add(g, G.cone(0.12, 0.18, 14), gold, 1.7, 2.08, 0);
  // ヘッドライト
  add(g, G.box(0.36, 0.32, 0.36), black, 2.6, 2.17, 0);
  const headlight = add(g, G.cyl(0.13, 0.13, 0.04, 18), glow('#fff2c0', 2.5), 2.79, 2.17, 0, { rot: [0, 0, Math.PI / 2], cast: false });
  // 排障器
  const cc = new THREE.Shape();
  cc.moveTo(0, 0.55); cc.lineTo(0, 0); cc.lineTo(0.6, 0); cc.lineTo(0, 0.55);
  const ccGeo = new THREE.ExtrudeGeometry(cc, { depth: 1.3, bevelEnabled: false });
  ccGeo.translate(0, 0, -0.65);
  add(g, ccGeo, mat(C.red), 2.68, 0.05, 0);
  // ランニングボード
  for (const z of [-0.78, 0.78]) add(g, G.box(3.7, 0.05, 0.2), black, 0.65, 0.92, z);
  for (const z of [-0.79, 0.79]) add(g, G.box(3.7, 0.04, 0.03), gold, 0.65, 0.95, z, { cast: false });
  // 配管
  for (const z of [-0.5, 0.5]) add(g, G.cyl(0.035, 0.035, 3.2, 8), gold, 0.6, 1.72, z, { rot: [0, 0, Math.PI / 2], cast: false });
  // 運転室
  const cab = group(g, -1.95, 0, 0);
  add(cab, G.box(1.5, 1.55, 1.7), body, 0, 1.47, 0);
  add(cab, G.box(1.52, 0.05, 1.72), gold, 0, 1.0, 0, { cast: false });
  add(cab, G.box(1.52, 0.05, 1.72), gold, 0, 2.05, 0, { cast: false });
  curvedRoof(cab, 1.8, 1.4, 0.75, 2.38, mat('#1a2a44', { side: THREE.DoubleSide }));
  const cabLight = glow('#ffb860', 1.4);
  for (const z of [-0.86, 0.86]) {
    add(cab, G.box(0.6, 0.5, 0.02), cabLight, 0.15, 1.75, z, { cast: false });
    add(cab, G.box(0.66, 0.06, 0.03), gold, 0.15, 2.02, z, { cast: false });
    add(cab, G.box(0.66, 0.06, 0.03), gold, 0.15, 1.48, z, { cast: false });
  }
  for (const z of [-0.45, 0.45]) add(cab, G.cyl(0.17, 0.17, 0.02, 16), cabLight, 0.76, 1.85, z, { rot: [0, 0, Math.PI / 2], cast: false });
  // 銘板
  const plate = new THREE.MeshStandardMaterial({ map: nameplateTex('ほしまわり'), roughness: 0.4, metalness: 0.3 });
  for (const z of [-0.86, 0.86]) {
    const p = add(cab, G.plane(1.0, 0.25), plate, 0.0, 1.22, z * 1.005, { rot: [0, z > 0 ? 0 : Math.PI, 0], cast: false });
    p.userData.sharedOk = false;
  }
  // 火室の灯り
  const firebox = add(g, G.box(0.05, 0.4, 0.8), glow('#ff6a20', 0.0), -1.18, 1.25, 0, { cast: false });

  return {
    g, wheels,
    smokeLocal: new V(2.45, 2.85, 0),
    whistleLocal: new V(-1.2, 2.5, 0),
    headlight, firebox, cabLight,
    rods, driversX: drivers,
    update(angle) {
      for (const r of rods) {
        r.position.x = 0.15 + Math.cos(angle) * 0.2;
        r.position.y = 0.52 + Math.sin(angle) * 0.2;
      }
    },
  };
}

export function makeTender() {
  const g = new THREE.Group();
  const wheels = [];
  const body = mat(C.body, { roughness: 0.45, metalness: 0.25 });
  const gold = mat(C.gold, { metalness: 0.8, roughness: 0.25 });
  add(g, G.box(2.3, 0.2, 1.3), mat(C.black), 0, 0.6, 0);
  for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) wheel(g, x, 0.32, z, 0.3, wheels, false);
  add(g, G.box(2.4, 1.05, 1.75), body, 0, 1.25, 0);
  add(g, G.box(2.42, 0.05, 1.77), gold, 0, 1.0, 0, { cast: false });
  add(g, G.box(2.42, 0.06, 1.77), gold, 0, 1.76, 0, { cast: false });
  // 石炭
  const coal = mat('#1c1c22', { roughness: 0.5, flatShading: true });
  const coalGroup = group(g, 0, 0, 0);
  for (let i = 0; i < 26; i++) {
    add(coalGroup, G.dodeca(0.16 + Math.random() * 0.08), coal, 0.2 + Math.random() * 0.9, 1.82 + Math.random() * 0.22, (Math.random() - 0.5) * 1.3, { rot: [Math.random() * 3, Math.random() * 3, 0] });
  }
  // 給水口
  add(g, G.cyl(0.26, 0.26, 0.12, 18), mat('#3a3a42', { metalness: 0.5, roughness: 0.4 }), -0.7, 1.84, 0);
  const waterSurface = add(g, G.cyl(0.2, 0.2, 0.02, 18), mat('#5ab0d8', { emissive: '#2a80b0', emissiveIntensity: 0.3 }), -0.7, 1.91, 0, { cast: false });
  waterSurface.visible = false;
  waterSurface.userData.keep = true;
  return { g, wheels, waterSurface, hatchLocal: new V(-0.7, 1.9, 0) };
}

export function makeCoach() {
  const g = new THREE.Group();
  const wheels = [];
  const body = mat(C.maroon, { roughness: 0.5, metalness: 0.15 });
  const cream = mat(C.cream);
  const gold = mat(C.gold, { metalness: 0.8, roughness: 0.25 });
  add(g, G.box(5.8, 0.2, 1.5), mat(C.black), 0, 0.72, 0);
  for (const bx of [-2.0, 2.0]) {
    add(g, G.box(1.5, 0.18, 1.2), mat(C.black), bx, 0.45, 0);
    for (const x of [-0.45, 0.45]) for (const z of [-0.6, 0.6]) wheel(g, bx + x, 0.3, z, 0.28, wheels, false);
  }
  add(g, G.box(5.6, 1.5, 1.85), body, 0, 1.58, 0);
  add(g, G.box(5.62, 0.42, 1.87), cream, 0, 1.88, 0);
  add(g, G.box(5.64, 0.04, 1.89), gold, 0, 1.15, 0, { cast: false });
  curvedRoof(g, 5.9, 1.2, 0.85, 2.36, mat('#3a3440', { side: THREE.DoubleSide }));
  add(g, G.box(5.0, 0.18, 0.7), mat('#3a3440'), 0, 2.44, 0);
  // 窓（暖かい光）
  const winMat = glow('#ffd08a', 1.1);
  const windows = [];
  for (let i = 0; i < 6; i++) {
    const x = -2.2 + i * 0.88;
    for (const z of [-0.93, 0.93]) {
      windows.push(add(g, G.box(0.56, 0.38, 0.02), winMat, x, 1.9, z, { cast: false }));
      add(g, G.box(0.62, 0.05, 0.03), gold, x, 2.11, z, { cast: false });
    }
  }
  // 端のデッキと手すり
  for (const s of [-1, 1]) {
    add(g, G.box(0.4, 0.08, 1.6), mat(C.black), s * 3.0, 0.85, 0);
    for (const z of [-0.7, 0.7]) add(g, G.cyl(0.025, 0.025, 0.7, 6), gold, s * 3.15, 1.2, z, { cast: false });
    add(g, G.box(0.03, 0.03, 1.45), gold, s * 3.15, 1.55, 0, { cast: false });
    add(g, G.box(0.04, 1.3, 0.7), mat('#5a1f2a'), s * 2.82, 1.5, 0);
  }
  // 行先板
  const dest = new THREE.MeshStandardMaterial({ map: nameplateTex('天空の街ゆき', 'ほしまわり号'), roughness: 0.5 });
  add(g, G.plane(1.3, 0.32), dest, 0, 1.38, 0.935, { cast: false });
  add(g, G.plane(1.3, 0.32), dest, 0, 1.38, -0.935, { rot: [0, Math.PI, 0], cast: false });
  return { g, wheels, windows, winMat };
}

/** 列車全体 */
export class Train {
  constructor(parent, path) {
    this.path = path;
    this.loco = makeLocomotive();
    this.tender = makeTender();
    this.coach = makeCoach();
    this.cars = [
      { part: this.loco, offset: 0 },
      { part: this.tender, offset: -4.15 },
      { part: this.coach, offset: -8.55 },
    ];
    this.root = group(parent);
    for (const c of this.cars) this.root.add(c.part.g);
    this.s = 19.2; // 機関車の中心位置（線路上の距離）
    this.angle = 0;
    this.place();
  }

  place() {
    for (const c of this.cars) placeOnPath(this.path, c.part.g, this.s + c.offset);
  }

  /** ds だけ前進 */
  advance(ds) {
    this.s += ds;
    this.place();
    for (const c of this.cars) for (const w of c.part.wheels) w.g.rotation.z -= ds / w.r;
    this.angle -= ds / 0.5;
    this.loco.update(this.angle);
  }

  worldOf(part, local) {
    return local.clone().applyMatrix4(part.g.matrixWorld);
  }
}
