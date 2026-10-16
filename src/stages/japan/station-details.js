import * as THREE from 'three';
import { add, mat, G, group } from '../../lib/util.js';

// 元の赤レンガの壁と窓は残し、その前に薄い石材と建具だけを重ねる。
// すべて静的メッシュ。窓の発光材質は箱庭本体と同じ日没の処理を使う。
function archProfile(radius, spring, bottom = 0.06) {
  const shape = new THREE.Shape();
  shape.moveTo(-radius, bottom);
  shape.lineTo(radius, bottom);
  shape.lineTo(radius, spring);
  shape.absarc(0, spring, radius, 0, Math.PI, false);
  shape.lineTo(-radius, bottom);
  shape.closePath();
  return shape;
}

function archFrame(radius, spring, thickness) {
  const shape = archProfile(radius + thickness, spring, 0);
  const hole = new THREE.Path();
  hole.moveTo(-radius, 0.06);
  hole.lineTo(-radius, spring);
  hole.absarc(0, spring, radius, Math.PI, 0, true);
  hole.lineTo(radius, 0.06);
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.045, bevelEnabled: false, curveSegments: 20, steps: 1,
  });
}

function windowFrame() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, -0.325);
  shape.lineTo(0.2, -0.325);
  shape.lineTo(0.2, 0.325);
  shape.lineTo(-0.2, 0.325);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.13, -0.25);
  hole.lineTo(-0.13, 0.25);
  hole.lineTo(0.13, 0.25);
  hole.lineTo(0.13, -0.25);
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false, steps: 1 });
}

/** 東京駅の白石の窓枠、アーチ玄関、ドーム館の扇形高窓。 */
export function addTokyoStationDetails(st, R) {
  const details = group(st);
  details.name = 'tokyo-station-details';
  const stone = mat('#eee7d7', { roughness: 0.82 });
  const shadowStone = mat('#c9c2b5', { roughness: 0.85 });
  const bronze = mat('#625b4d', { roughness: 0.56, metalness: 0.12 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#52656a', emissive: '#ffe0a0', emissiveIntensity: 0, roughness: 0.32,
  });
  R.winMats.push(glass);

  // 中央館と左右のドームに隠れていない、既存の窓だけを縁取る。
  const frame = windowFrame();
  for (const x of [-3.9, -3.2, -2.5, -1.8, 1.7, 2.4, 3.1, 3.8]) {
    for (const y of [1.7, 3.0]) {
      add(details, frame, stone, x, y, 1.535);
      add(details, G.box(0.46, 0.055, 0.095), shadowStone, x, y - 0.34, 1.55);
      add(details, G.box(0.018, 0.5, 0.018), bronze, x, y, 1.548, { cast: false });
      add(details, G.box(0.26, 0.018, 0.018), bronze, x, y + 0.065, 1.548, { cast: false });
    }
  }

  // 三つの入口に共通の建具。前面への張り出しは最大でも約 13 cm。
  const radius = 0.65, spring = 1.85;
  const doorway = new THREE.ShapeGeometry(archProfile(radius, spring), 20);
  const surround = archFrame(radius, spring, 0.13);
  const key = new THREE.Shape();
  key.moveTo(-0.055, -0.1);
  key.lineTo(0.055, -0.1);
  key.lineTo(0.09, 0.12);
  key.lineTo(-0.09, 0.12);
  key.closePath();
  const keystone = new THREE.ExtrudeGeometry(key, { depth: 0.055, bevelEnabled: false });
  for (const x of [-5.6, 0, 5.6]) {
    const z = x === 0 ? 1.685 : 1.75;
    add(details, doorway, glass, x, 0, z, { cast: false });
    add(details, surround, stone, x, 0, z + 0.003);
    add(details, keystone, stone, x, spring + radius + 0.05, z + 0.015);
    // 二枚扉と、その上の半円窓を分ける細い青銅の桟。
    add(details, G.box(0.035, 1.78, 0.028), bronze, x, 0.96, z + 0.024, { cast: false });
    add(details, G.box(1.3, 0.045, 0.028), bronze, x, spring, z + 0.024, { cast: false });
    for (const side of [-1, 1]) {
      add(details, G.box(0.025, 1.78, 0.028), bronze, x + side * 0.59, 0.96, z + 0.024, { cast: false });
      add(details, G.box(0.022, 0.22, 0.035), bronze, x + side * 0.075, 1.0, z + 0.045, { cast: false });
    }
    for (const angle of [-Math.PI / 4, 0, Math.PI / 4]) {
      const length = radius - 0.035;
      add(details, G.box(0.024, length, 0.024), bronze,
        x - Math.sin(angle) * length / 2,
        spring + Math.cos(angle) * length / 2,
        z + 0.024, { rot: [0, 0, angle], cast: false });
    }
  }

  // 中央の駅名板より下で玄関をまとめ、文字の周囲は空けておく。
  for (const side of [-1, 1]) {
    add(details, G.box(0.11, 2.96, 0.065), stone, side * 1.07, 1.52, 1.68);
  }
  add(details, G.box(2.24, 0.09, 0.12), stone, 0, 3.04, 1.69);

  // 両端の館：扇形窓の半円と放射状の桟が、丸い銅屋根につながる。
  const fanGlass = new THREE.CircleGeometry(0.58, 20, 0, Math.PI);
  const fanArch = new THREE.RingGeometry(0.58, 0.69, 24, 1, 0, Math.PI);
  for (const side of [-1, 1]) {
    const x = side * 5.6;
    add(details, fanGlass, glass, x, 3.17, 1.72, { cast: false });
    add(details, fanArch, stone, x, 3.17, 1.745);
    add(details, G.box(1.44, 0.09, 0.1), stone, x, 3.13, 1.74);
    for (const angle of [-Math.PI / 3, 0, Math.PI / 3]) {
      add(details, G.box(0.025, 0.56, 0.022), bronze,
        x - Math.sin(angle) * 0.28,
        3.17 + Math.cos(angle) * 0.28,
        1.747, { rot: [0, 0, angle], cast: false });
    }
    for (const edge of [-1, 1]) {
      add(details, G.box(0.13, 4.15, 0.085), stone, x + edge * 1.22, 2.13, 1.725);
    }
    add(details, G.box(2.73, 0.12, 3.5), stone, x, 4.29, 0);
    add(details, G.box(2.77, 0.055, 3.54), shadowStone, x, 4.39, 0);
  }
  return details;
}
