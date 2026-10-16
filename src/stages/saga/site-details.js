import * as THREE from 'three';
import { add, G, group, mat, canvasTex, FONT } from '../../lib/util.js';

// 施設の文字は写真を貼らず、サイズを測って手続き描画する。
export function sign(parent, text, w, h, x, y, z, { bg = '#f3eedb', color = '#323c38', border, sub = '', ry = 0, weight = 800 } = {}) {
  const texture = canvasTex(1536, Math.max(192, Math.round(1536 * h / w)), (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (border) { c.strokeStyle = border; c.lineWidth = H * .045; c.strokeRect(3, 3, W - 6, H - 6); }
    const size = Math.min(H * (sub ? .48 : .67), W / (text.length * .96));
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${weight} ${size}px ${FONT}`;
    const fit = Math.min(1, W * .94 / c.measureText(text).width);
    c.save(); c.translate(W / 2, H * (sub ? .39 : .52)); c.scale(fit, 1); c.fillStyle = color; c.fillText(text, 0, 0); c.restore();
    if (sub) { c.font = `600 ${Math.min(H * .23, W / sub.length)}px ${FONT}`; c.fillStyle = color; c.fillText(sub, W / 2, H * .79); }
  });
  const m = add(parent, G.plane(w, h), new THREE.MeshBasicMaterial({ map: texture }), x, y, z, { rot: [0, ry, 0], cast: false });
  m.userData.keep = true; return m;
}

export function rod(parent, a, b, r, material, sides = 8) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), d = q.clone().sub(p);
  const m = add(parent, G.cyl(r, r, d.length(), sides), material, ...p.add(q).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

export function planter(parent, x, z, w = 1, h = .48) {
  const g = group(parent, x, 0, z);
  add(g, G.box(w, h, .6), mat('#9a917b'), 0, h / 2, 0);
  add(g, G.box(w - .1, .04, .49), mat('#695e47'), 0, h, 0);
  for (let i = 0; i < Math.ceil(w * 5); i++) {
    const xx = -w * .43 + (i + .5) * w * .86 / Math.ceil(w * 5);
    add(g, G.sphere(.19, 7, 5), mat(i % 2 ? '#6b894d' : '#567940'), xx, h + .13, Math.sin(i * 2.4) * .1, { scale: [1, 1.4, .9] });
  }
  return g;
}

export function parking(parent, w, d, x = 0, z = 0, { rows = 1 } = {}) {
  const g = group(parent, x, 0, z), asphalt = mat('#777d77'), white = mat('#e1deca');
  add(g, G.box(w, .09, d), asphalt, 0, .015, 0);
  const spaces = Math.floor((w - 3) / 2.65);
  for (let row = 0; row < rows; row++) {
    const zz = -d / 2 + 2.7 + row * (d - 5.4) / Math.max(1, rows - 1);
    for (let i = 0; i <= spaces; i++) add(g, G.box(.055, .008, 4.7), white, -spaces * 1.325 + i * 2.65, .064, zz);
    for (let i = 0; i < spaces; i++) add(g, G.box(1.6, .10, .14), mat('#b6b9a8'), -spaces * 1.325 + (i + .5) * 2.65, .12, zz - 1.9);
  }
  return g;
}

export function littleCar(parent, x, z, color = '#d3d3c5', ry = 0) {
  const g = group(parent, x, 0, z, ry), paint = mat(color), glass = mat('#637c7a', { roughness: .35 });
  add(g, G.box(1.65, .64, 3.6), paint, 0, .69, 0);
  add(g, G.box(1.48, .65, 1.9), glass, 0, 1.26, -.14);
  add(g, G.box(1.55, .10, 2.03), paint, 0, 1.62, -.14);
  for (const xx of [-.78, .78]) for (const zz of [-1.05, 1.12]) add(g, G.cyl(.29, .29, .16, 10), mat('#38403a'), xx, .34, zz, { rot: [0, 0, Math.PI / 2] });
  for (const xx of [-.57, .57]) add(g, G.box(.35, .19, .025), mat('#e6e3ba'), xx, .82, 1.81);
  return g;
}
