import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------
// 動かないメッシュをマテリアルごとにまとめて、描画回数を減らす。
// userData.dynamic のグループ、userData.keep のメッシュ、
// 別のインタラクト対象（userData.interactId）の中身はそのまま残す。
// ---------------------------------------------------------------

const ATTRS = ['position', 'normal', 'uv'];

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const buckets = new Map();

  const visit = (o) => {
    for (const c of o.children) {
      if (c.userData.dynamic || (c.userData.interactId && c !== root)) continue;
      if (c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && c.visible && !c.userData.keep && c.children.length === 0 && !Array.isArray(c.material)) {
        const key = [c.material.uuid, c.castShadow, c.receiveShadow, !!c.userData.noPick, !!c.userData.roof, c.renderOrder].join('|');
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(c);
      } else if (c.visible && c.children.length) {
        visit(c);
      }
    }
  };
  visit(root);

  let merged = 0;
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = [];
    for (const m of list) {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!ATTRS.includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) {
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      }
      g.clearGroups();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      // 鏡像（負のスケール）は面の向きが反転するので、そのまま残す
      if (m.matrixWorld.determinant() < 0) { g.dispose(); continue; }
      geos.push({ g, m });
    }
    if (geos.length < 2) { geos.forEach((x) => x.g.dispose()); continue; }
    const geo = mergeGeometries(geos.map((x) => x.g), false);
    geos.forEach((x) => x.g.dispose());
    if (!geo) continue;
    const src = geos[0].m;
    const mesh = new THREE.Mesh(geo, src.material);
    mesh.castShadow = src.castShadow;
    mesh.receiveShadow = src.receiveShadow;
    mesh.renderOrder = src.renderOrder;
    if (src.userData.noPick) mesh.userData.noPick = true;
    if (src.userData.roof) mesh.userData.roof = true;
    root.add(mesh);
    for (const { m } of geos) m.parent.remove(m);
    merged += geos.length;
  }
  return merged;
}
