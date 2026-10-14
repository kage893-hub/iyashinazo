import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { placeOnPath, RAIL_Y } from '../stages/station/train.js';

/**
 * 島の上（直線）と空の上（光る線路）をまとめて作る。
 * path は X 方向へ進む曲線。島の範囲 islandX の内側は普通の線路になる。
 */
export function buildRails(parent, path, { islandX = [-14.8, 14.8], z = -6, pillars = [] } = {}) {
  const root = group(parent);
  const steel = mat('#9aa0aa', { metalness: 0.75, roughness: 0.35 });
  const L = path.getLength();
  const x0 = islandX[0], x1 = islandX[1];

  add(root, G.box(x1 - x0, 0.16, 2.3), mat('#a39887', { roughness: 1 }), (x0 + x1) / 2, 0.08, z);
  for (const s of [-1, 1]) add(root, G.box(x1 - x0, 0.13, 0.1), steel, (x0 + x1) / 2, RAIL_Y - 0.065, z + s * 0.55);

  // 枕木
  const dummy = new THREE.Object3D();
  const land = [], sky = [];
  for (let s = 0.3; s < L - 0.3; s += 0.6) {
    const p = path.getPointAt(s / L);
    (p.x > x0 && p.x < x1 ? land : sky).push(s);
  }
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
  };
  mk(land, mat('#5a4434'));
  mk(sky, new THREE.MeshStandardMaterial({ color: '#4c5a80', emissive: '#7fd8ff', emissiveIntensity: 0.7, roughness: 0.5 }));

  // 島の外の光るレール（左右それぞれ）
  const runs = [];
  let cur = null;
  for (let s = 0; s <= L; s += 0.8) {
    const p = path.getPointAt(Math.min(1, s / L));
    const out = !(p.x > x0 + 0.5 && p.x < x1 - 0.5);
    if (out) { if (!cur) { cur = []; runs.push(cur); } cur.push(s); } else cur = null;
  }
  const glowRail = new THREE.MeshStandardMaterial({ color: '#d8e4ff', metalness: 0.6, roughness: 0.3, emissive: '#6fb8ff', emissiveIntensity: 0.5 });
  for (const run of runs) {
    if (run.length < 2) continue;
    for (const side of [-1, 1]) {
      const pts = run.map((s) => {
        placeOnPath(path, dummy, s);
        dummy.updateMatrixWorld();
        return new THREE.Vector3(0, -0.065, side * 0.55).applyMatrix4(dummy.matrixWorld);
      });
      add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.06, 6), glowRail, 0, 0, 0, { cast: false });
    }
  }
  // 雲の中へのびる柱
  const pm = mat('#e8ecf4');
  for (const s of pillars) {
    const p = path.getPointAt(s / L);
    const h = p.y + 16;
    for (const side of [-1, 1]) add(root, G.cyl(0.09, 0.14, h, 6), pm, p.x, p.y - h / 2 - 0.25, p.z + side * 0.7, { cast: false });
    add(root, G.box(0.15, 0.15, 1.6), pm, p.x, p.y - 0.3, p.z, { cast: false });
  }
  return root;
}
