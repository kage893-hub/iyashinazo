import * as THREE from 'three';

/** 建物の縮尺を変えず、江戸と現代に共通の街区の間隔だけを広げる。 */
export function layoutX(x) {
  if (x <= -16) return x - 6;
  if (x < -6) return -22 + (x + 16) * 1.6;
  if (x <= 8) return x;
  if (x < 16) return 8 + (x - 8) * 1.75;
  return x + 6;
}

export function layoutZ(z) {
  if (z <= -2.4) return z;
  if (z < 6.4) return -2.4 + (z + 2.4) * 1.35;
  return z + 3.08;
}

/** 元の座標を変更しない。カメラ・住人・アニメーションの行き先にも使う。 */
export function layoutPoint(point) {
  return point.clone().set(layoutX(point.x), point.y, layoutZ(point.z));
}

const applied = new WeakSet();
const EPSILON = 1e-8;

function markSubtree(object) {
  object.traverse((child) => applied.add(child));
}

function moveAnchor(object) {
  const point = layoutPoint(object.getWorldPosition(new THREE.Vector3()));
  if (object.parent) object.parent.worldToLocal(point);
  object.position.copy(point);
  object.updateMatrix();
  object.updateWorldMatrix(false, true);
}

/**
 * 島を組み立て終えてから、静的結合より前に一度呼ぶ。
 * 原点の Group（far・temple・skyline 等）は街区のコンテナとして再帰する。
 * 座標のある Group は建物のアンカーなので、子の寸法・向き・細部を保つ。
 * 長い道路・護岸だけは geometry を複製し、頂点をワールド座標で延長する。
 * layoutFixed は新しい島の寸法で作った地面等、layoutStretch は座標を
 * geometry に焼き込んだ電線等に使う。元の共用 geometry は変更しない。
 */
export function applyJapanLayout(root) {
  if (applied.has(root)) return root;
  root.updateWorldMatrix(true, true);

  const visit = (object, isRoot = false) => {
    if (applied.has(object)) return;
    if (object.userData.layoutFixed) {
      markSubtree(object);
      return;
    }

    if (object.isMesh && object.geometry?.attributes.position) {
      const originalMatrix = object.matrixWorld.clone();
      const bounds = new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position).applyMatrix4(originalMatrix);
      const size = bounds.getSize(new THREE.Vector3());
      const stretch = object.userData.layoutStretch || size.x > 14 || size.z > 14;
      moveAnchor(object);
      if (stretch) {
        const geometry = object.geometry.clone();
        const positions = geometry.attributes.position;
        const inverse = object.matrixWorld.clone().invert();
        const point = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(originalMatrix);
          point.x = layoutX(point.x);
          point.z = layoutZ(point.z);
          point.applyMatrix4(inverse);
          positions.setXYZ(i, point.x, point.y, point.z);
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        object.geometry = geometry;
      }
      markSubtree(object);
      return;
    }

    const anchored = Math.abs(object.position.x) > EPSILON || Math.abs(object.position.z) > EPSILON;
    if (!isRoot && anchored) {
      moveAnchor(object);
      markSubtree(object);
      return;
    }

    applied.add(object);
    for (const child of object.children) visit(child);
  };

  visit(root, true);
  root.updateWorldMatrix(true, true);
  return root;
}
