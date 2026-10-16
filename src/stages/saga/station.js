import * as THREE from 'three';
import { add, mat, G, group, canvasTex } from '../../lib/util.js';

// 佐賀駅南口。2023年12月の南口・2023年8月の広場の公開写真を参照。
// 写真は使わず、寸法比・窓割り・駅名帯・木組みの大屋根を形状で再構成する。
// +z が南口、+x が駅前から見た右（東）。1 world unit ≒ 1m。
// 根拠と確認できていない部分は docs/saga-station-references.md に記載。
const C = {
  white: '#eeece1', cream: '#dedccf', concrete: '#b7b8af', base: '#a3a79e',
  brown: '#705d4d', wood: '#b77b4f', woodEdge: '#d5a276', shadow: '#38413e',
  glass: '#405654', frame: '#a5aaa3', dark: '#273534', red: '#bf3442',
};
const FONT = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
const noPick = (o) => { o.traverse((c) => { c.userData.noPick = true; }); return o; };

function rod(parent, a, b, radius, material, segments = 8) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), d = q.clone().sub(p);
  const m = add(parent, G.cyl(radius, radius, d.length(), segments), material,
    (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

function face(parent, texture, w, h, x, y, z, ry = 0) {
  const mesh = add(parent, G.plane(w, h), new THREE.MeshBasicMaterial({ map: texture }), x, y, z,
    { cast: false, rot: [0, ry, 0] });
  mesh.userData.keep = true;
  return mesh;
}

function textTexture(title, sub = '', { w = 1024, h = 256, bg = C.white, fg = '#242b29', size = 110 } = {}) {
  return canvasTex(w, h, (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = size; ctx.font = `800 ${fs}px ${FONT}`;
    while (ctx.measureText(title).width > W * 0.9) { fs -= 2; ctx.font = `800 ${fs}px ${FONT}`; }
    ctx.fillText(title, W / 2, H * (sub ? 0.38 : 0.52));
    if (sub) {
      ctx.font = `700 ${Math.round(size * 0.4)}px Arial, sans-serif`;
      ctx.fillText(sub, W / 2, H * 0.79);
    }
  });
}

function glassTexture() {
  return canvasTex(256, 256, (ctx, W, H) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#687771'); gradient.addColorStop(0.42, '#35433f');
    gradient.addColorStop(0.51, '#434f47'); gradient.addColorStop(1, '#273431');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    // 実物の上半分は濃い遮音／日除け面。写真を貼らず細い横桟で表現。
    ctx.strokeStyle = 'rgba(23,31,29,.28)'; ctx.lineWidth = 1;
    for (let y = 3; y < H; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(183,197,182,.15)';
    ctx.beginPath(); ctx.moveTo(0, H * 0.13); ctx.lineTo(W, H * 0.38);
    ctx.lineTo(W, H * 0.49); ctx.lineTo(0, H * 0.23); ctx.fill();
  });
}

function shopBay(parent, x, width, { entrance = false, tint = '#53675f', z = 15.91 } = {}) {
  const g = group(parent, x, 0, z), aluminum = mat(C.frame, { roughness: 0.55 });
  const pane = mat(tint, { roughness: 0.33 });
  const h = 3.2, divisions = entrance ? 6 : Math.max(2, Math.round(width / 1.6));
  add(g, G.box(width, h, 0.12), pane, 0, 1.95, -0.1);
  add(g, G.box(width, 0.18, 0.26), aluminum, 0, 0.35, 0);
  add(g, G.box(width, 0.12, 0.22), aluminum, 0, 3.55, 0);
  add(g, G.box(width, 0.07, 0.16), aluminum, 0, 2.85, 0);
  for (let i = 0; i <= divisions; i++) {
    const xx = -width / 2 + i * width / divisions;
    add(g, G.box(0.075, h, 0.23), aluminum, xx, 1.95, 0);
  }
  if (entrance) {
    const dark = mat(C.dark);
    // 開いている自動扉と奥の改札が見える中央通路。
    add(g, G.box(width * 0.36, 2.45, 0.25), dark, 0, 1.55, -0.14);
    for (const side of [-1, 1]) {
      add(g, G.box(0.045, 1.05, 0.12), aluminum, side * width * 0.12, 1.65, 0.18);
      add(g, G.box(1.15, 0.11, 0.04), mat('#ece9d6'), side * width * 0.32, 1.8, 0.15);
    }
    for (let i = -2; i <= 2; i++) {
      add(g, G.box(0.45, 1.05, 1.4), mat('#a7b0a8'), i * 1.1, 0.55, -2.65);
      add(g, G.box(0.46, 0.08, 1.43), mat('#70a08b'), i * 1.1, 1.12, -2.65);
    }
  } else {
    for (let i = 0; i < divisions; i++) {
      add(g, G.box(width / divisions - 0.18, 0.09, 0.03), mat('#d6cbb1'),
        -width / 2 + (i + 0.5) * width / divisions, 1.2, 0.08, { cast: false });
    }
  }
  return g;
}

function mainCanopy(parent) {
  // 南口東側の独立した切妻大屋根。白い外周と、下面を埋める暖色の木格子。
  const g = group(parent, 27, 0, 26), white = mat(C.white), timber = mat(C.wood);
  const w = 28, d = 22, eave = 5.2, ridge = 8.8, rise = ridge - eave;
  const slope = Math.atan2(rise, w / 2), length = Math.hypot(w / 2, rise);
  for (const side of [-1, 1]) {
    add(g, G.box(length, 0.16, d), white, side * w / 4, (eave + ridge) / 2, 0,
      { rot: [0, 0, -side * slope] });
    // 木下地が外周の白線の内側に見える。
    add(g, G.box(length - 0.22, 0.09, d - 0.34), mat('#bd8a5d'),
      side * w / 4, (eave + ridge) / 2 - 0.15, 0, { rot: [0, 0, -side * slope] });
  }
  for (const x of [-12, 0, 12]) for (const z of [-9, 9]) {
    const top = ridge - Math.abs(x) * rise / (w / 2) - 0.27;
    add(g, G.cyl(0.2, 0.2, top, 12), white, x, top / 2, z);
    add(g, G.cyl(0.28, 0.3, 0.12, 12), mat(C.base), x, 0.06, z);
  }
  for (let z = -10.6; z <= 10.6; z += 2.65) {
    // 妻側と中間の連続する三角の木トラス。
    rod(g, [-13.8, eave - 0.2, z], [0, ridge - 0.25, z], 0.12, timber);
    rod(g, [0, ridge - 0.25, z], [13.8, eave - 0.2, z], 0.12, timber);
    rod(g, [-12.1, eave + 0.1, z], [12.1, eave + 0.1, z], 0.11, timber);
    for (let x = -10.5; x < 10.5; x += 3.5) {
      const xx = x + 1.75, top = ridge - 0.35 - Math.abs(xx) * rise / (w / 2);
      rod(g, [x, eave + 0.1, z], [xx, top, z], 0.075, mat(C.woodEdge));
      rod(g, [xx, top, z], [x + 3.5, eave + 0.1, z], 0.075, mat(C.woodEdge));
    }
  }
  for (let x = -12; x <= 12; x += 2) {
    const y = ridge - 0.3 - Math.abs(x) * rise / (w / 2);
    add(g, G.box(0.12, 0.18, d - 0.5), timber, x, y, 0);
  }
  for (const z of [-d / 2 - 0.02, d / 2 + 0.02]) {
    rod(g, [-14, eave, z], [0, ridge, z], 0.13, white);
    rod(g, [0, ridge, z], [14, eave, z], 0.13, white);
  }
  for (const x of [-14, 14]) {
    add(g, G.box(0.23, 0.3, d + 0.25), white, x, eave, 0);
    add(g, G.cyl(0.065, 0.065, eave, 8), white, x - Math.sign(x) * 0.3, eave / 2, -9.7);
  }
  // 写真で見える前面横梁。屋根下面の構造を隠さない細さにする。
  add(g, G.box(w + 0.2, 0.18, 0.17), white, 0, eave - 0.35, 10.8);
  return g;
}

function platform(parent, z, numbers) {
  const g = group(parent, 0, 0, z), pale = mat('#ded9bd'), metal = mat('#a5a690');
  add(g, G.box(92, 1.02, 5.6), mat('#787f75'), 0, 5.49, 0);
  add(g, G.box(92, 0.12, 5.6), mat('#a17963'), 0, 6.06, 0);
  for (const side of [-1, 1]) {
    add(g, G.box(92, 0.026, 0.46), mat('#dfbc4f'), 0, 6.135, side * 2.32, { cast: false });
    add(g, G.box(92, 0.028, 0.21), mat('#d6d8c9'), 0, 6.137, side * 2.67, { cast: false });
  }
  add(g, G.box(94, 0.18, 6.3), mat('#92917f'), 0, 10.25, 0);
  for (let x = -42; x <= 42; x += 7) {
    add(g, G.box(0.2, 4.1, 0.22), pale, x, 8.17, 0);
    add(g, G.box(0.12, 0.24, 5.7), metal, x, 9.97, 0);
    for (const side of [-1, 1]) rod(g, [x, 9.15, 0], [x, 9.98, side * 2.2], 0.035, metal);
  }
  for (let x = -35; x <= 35; x += 14) {
    for (const side of [-1, 1]) {
      add(g, G.box(3.0, 0.11, 0.48), mat('#535c55'), x, 6.72, side * 0.75);
      for (const xx of [-1, 1]) add(g, G.box(0.08, 0.54, 0.3), metal, x + xx, 6.4, side * 0.75);
    }
    const board = group(g, x, 0, 0);
    add(board, G.box(1.5, 0.8, 0.07), mat('#edeada'), 0, 9.35, 0);
    const tex = textTexture(String(numbers[0]), '', { w: 128, h: 128, size: 92 });
    face(board, tex, 0.68, 0.68, -0.38, 9.35, 0.041);
    const tex2 = textTexture(String(numbers[1]), '', { w: 128, h: 128, size: 92 });
    face(board, tex2, 0.68, 0.68, 0.38, 9.35, 0.041);
    face(board, textTexture('さ が', 'SAGA', { w: 512, h: 128, size: 56 }), 2.5, 0.62, 0, 8.35, 0.06);
  }
  return g;
}

/** 佐賀駅。配置時は R.root だけを移動・縮尺変更する。 */
export function createSagaStation(parent) {
  const root = group(parent), facade = group(root), entrance = group(root);
  root.name = 'saga-station'; facade.name = 'saga-station-south-facade'; entrance.name = 'saga-station-entrance';
  const R = { root, facade, entrance, platform: group(root), sign: group(facade),
    focusTarget: new THREE.Vector3(0, 5.3, 15.8),
    dimensions: { w: 96, d: 54, h: 13.6, zMin: -16.5, zMax: 37.2 },
    railY: 5.375, platformY: 6.12,
    recommendedCamera: { position: [0, 12, 61], target: [0, 5.3, 15] } };
  const white = mat(C.white), concrete = mat(C.concrete), frame = mat(C.brown), dark = mat(C.dark);

  // 地上階：中央の自由通路を両側の店舗が挟む。高架床と柱は建物の内側にも続く。
  add(root, G.box(94, 0.18, 33), mat('#b8bcb2'), 0, 0.09, 0);
  for (const x of [-27, 27]) add(root, G.box(36, 4.2, 30.8), mat('#b4b5a9'), x, 2.25, -0.5);
  add(root, G.box(94, 0.65, 32), concrete, 0, 4.7, 0);
  add(root, G.box(94, 0.13, 32), mat('#72776c'), 0, 5.08, 0);
  for (let x = -42; x <= 42; x += 7) {
    for (const z of [-13.7, 13.7]) add(root, G.box(0.7, 4.4, 0.75), concrete, x, 2.2, z);
  }
  for (const [x, w, tint] of [[-38, 12, '#4b5d53'], [-25, 12, '#596b5e'], [-12.6, 10.6, '#485b52'],
    [13, 11, '#5e6b5d'], [26, 12, '#4d6258'], [39, 12, '#5a6d61']]) {
    shopBay(facade, x, w, { tint });
  }
  R.doors = shopBay(entrance, 0, 12.8, { entrance: true });
  // 店舗前の白い外壁柱と、駅名が載る連続した白い帯。
  for (const x of [-45, -31.8, -18.4, -6.8, 6.8, 19, 32.2, 45])
    add(facade, G.box(0.45, 4.4, 0.65), white, x, 2.2, 16.1);
  add(facade, G.box(92, 1.7, 0.48), white, 0, 5.55, 16.12);
  add(facade, G.box(92, 0.09, 0.56), mat('#d7d7c9'), 0, 4.66, 16.12);
  add(facade, G.box(94, 0.15, 0.52), white, 0, 11.03, 15.94);

  // 本体の上半分はホームを覆う濃色の遮音面。約3m間隔の細い茶色サッシ。
  const pane = new THREE.MeshStandardMaterial({ map: glassTexture(), roughness: 0.5 });
  for (let i = 0; i < 30; i++) {
    const x = -43.5 + i * 3;
    add(facade, G.box(2.91, 4.18, 0.11), pane, x, 8.67, 15.98);
  }
  for (let i = 0; i <= 30; i++) {
    const x = -45 + i * 3;
    add(facade, G.box(0.1, 4.55, 0.22), frame, x, 8.63, 16.08);
    add(facade, G.box(0.08, 0.12, 2.6), frame, x, 10.63, 14.75);
    if (!(i % 4)) rod(facade, [x, 10.65, 13.5], [x, 9.85, 15.8], 0.055, frame);
  }
  for (const y of [6.55, 8.65, 10.8]) add(facade, G.box(91, 0.09, 0.24), frame, 0, y, 16.09);
  // 北面は写真で未確認の広告・店名を創作せず、高架の構造と防護面だけに留める。
  add(root, G.box(92, 2.15, 0.2), mat('#a8b0a2'), 0, 6.13, -15.8);

  // 佐賀駅の文字は黒色の二段組。JR赤ロゴは壁の駅名横に置かない（資料では駅名帯にない）。
  face(R.sign, textTexture('佐 賀 駅', 'SAGA Station', { w: 1024, h: 256, size: 125 }),
    10.2, 2.1, 0, 5.55, 16.39);
  R.sign.userData.keep = true;
  const machi = canvasTex(512, 256, (ctx, W, H) => {
    ctx.fillStyle = '#f3f0e6'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.red; ctx.lineWidth = 20; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.15, W * 0.24, H * 0.27, 0, 0.08, Math.PI - 0.08); ctx.stroke();
    ctx.fillStyle = '#3f453d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 65px ${FONT}`; ctx.fillText('えきマチ1丁目', W / 2, H * 0.74);
  });
  add(facade, G.box(6.5, 2.2, 0.17), mat('#c5c9bd'), -10.6, 5.55, 16.4);
  face(facade, machi, 6.3, 2.02, -10.6, 5.55, 16.5);
  // JRの案内は中央入口の小さなサインに限定。
  face(entrance, textTexture('JR 九州', '', { w: 512, h: 128, fg: '#ae3040', size: 76 }),
    3.2, 0.8, 0, 3.82, 16.26);
  for (const x of [-29, -23, -17]) {
    add(facade, G.box(3.8, 0.8, 0.85), mat('#d3d3c4'), x, 4.15, 17.0);
    for (const dx of [-0.9, 0.9]) {
      add(facade, G.cyl(0.27, 0.27, 0.03, 20), mat('#929d91'), x + dx, 4.15, 17.45,
        { rot: [Math.PI / 2, 0, 0], cast: false });
    }
  }
  // 入口前から大屋根へつながる水平の白い歩行者庇。
  const arcade = group(root);
  add(arcade, G.box(92, 0.18, 3.4), white, 0, 4.15, 18.9);
  for (let x = -43; x <= 43; x += 7.1) {
    add(arcade, G.cyl(0.09, 0.09, 4.1, 10), white, x, 2.05, 20.25);
    add(arcade, G.box(0.06, 0.12, 3.4), mat('#b7beb2'), x, 4.0, 18.9);
  }
  for (let x = -43; x <= 43; x += 1.42)
    add(arcade, G.box(0.055, 0.12, 3.3), mat('#c5cabf'), x, 4.3, 18.9);
  R.canopy = mainCanopy(root);

  // 2面4線の高架ホーム。実線路の外側にも床があり、浮いた架空ホームにはしない。
  platform(R.platform, 7.6, [1, 2]); platform(R.platform, -7.6, [3, 4]);
  const steel = mat('#777d72', { metalness: 0.3, roughness: 0.5 });
  for (const z of [-12, -3.2, 3.2, 12]) {
    add(R.platform, G.box(96, 0.05, 2.4), mat('#666f63'), 0, 5.18, z);
    for (const side of [-1, 1]) add(R.platform, G.box(96, 0.15, 0.07), steel, 0, 5.3, z + side * 0.72);
    for (let x = -47; x <= 47; x += 0.85)
      add(R.platform, G.box(0.2, 0.1, 2.1), mat('#8e8a77'), x, 5.23, z, { cast: false });
  }
  // 高架上の架線柱と細い電線。広域箱庭の遠景より濃くしすぎない。
  const wires = noPick(group(root));
  for (const x of [-37, -8, 21]) {
    for (const z of [-14.2, 14.2]) add(wires, G.box(0.16, 8.5, 0.16), mat('#9f9c83'), x, 9.3, z);
    add(wires, G.box(0.18, 0.2, 28.7), mat('#aaa58e'), x, 13.5, 0);
    for (const z of [-12, -3.2, 3.2, 12]) {
      rod(wires, [x, 13.5, z], [x, 12.6, z], 0.025, mat('#5b665e'), 5);
      for (let k = 0; k < 3; k++) add(wires, G.cyl(0.12, 0.12, 0.06, 8), mat('#718477'), x, 13.1 + k * 0.11, z);
    }
  }
  for (const z of [-12, -3.2, 3.2, 12]) rod(wires, [-48, 12.55, z], [48, 12.55, z], 0.016, mat('#55635b'), 5);
  R.wires = wires;
  root.updateMatrixWorld(true);
  return R;
}
