import * as THREE from 'three';
import { add, mat, G, group, rng, canvasTex, FONT } from '../../lib/util.js';

// 嵜本公式の店舗写真（佐賀店）を参照。高い切妻・斜め木板・上階の
// 水平ルーバー・右の低い入口庇を、この街角の7.2×5区画に収める。
// 写真はテクスチャへ転用せず、外壁と銘板をコードで描く。
function woodMaterial() {
  const tex = canvasTex(768, 768, (ctx, W, H) => {
    const r = rng(691); ctx.fillStyle = '#c7a975'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-.70);
    for (let x = -W; x < W; x += 45) {
      ctx.fillStyle = ['#ceb37f', '#c1a171', '#d3ba87', '#c8ab77'][Math.floor(r() * 4)];
      ctx.fillRect(x, -H, 44, H * 2);
      ctx.strokeStyle = '#ae9164'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H); ctx.stroke();
      for (let i = 0; i < 27; i++) {
        ctx.strokeStyle = r() > .5 ? 'rgba(101,77,45,.10)' : 'rgba(247,230,180,.14)';
        ctx.beginPath(); const xx = x + 3 + r() * 37, y = (r() - .5) * H * 2;
        ctx.moveTo(xx, y); ctx.bezierCurveTo(xx + 2, y + 40, xx - 3, y + 120, xx, y + 220); ctx.stroke();
      }
    }
    ctx.restore();
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: .86 });
}

function lettering(lines, { width = 512, height = 512, ink = '#302d25', bg = null } = {}) {
  const tex = canvasTex(width, height, (ctx, W, H) => {
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [str, y, size, weight = 500] of lines) {
      let fs = size; ctx.font = `${weight} ${fs}px ${FONT}`;
      while (ctx.measureText(str).width > W * .89 && fs > 10) { fs--; ctx.font = `${weight} ${fs}px ${FONT}`; }
      ctx.fillText(str, W / 2, H * y);
    }
  });
  return new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, depthWrite: !!bg, polygonOffset: true, polygonOffsetFactor: -1 });
}

function gableFace(parent, material, z, back = false) {
  const shape = new THREE.Shape();
  shape.moveTo(-3.1, .18); shape.lineTo(3.1, .18); shape.lineTo(3.1, 4.03); shape.lineTo(0, 6.05); shape.lineTo(-3.1, 4.03); shape.closePath();
  if (!back) {
    const hole = new THREE.Path(); hole.moveTo(-1.50, .31); hole.lineTo(-1.50, 2.52); hole.lineTo(.02, 2.52); hole.lineTo(.02, .31); hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ShapeGeometry(shape), uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 3.1) / 6.2, pos.getY(i) / 6.05);
  return add(parent, geo, material, 0, 0, z, { rot: [0, back ? Math.PI : 0, 0] });
}

function tree(parent, x, z, seed) {
  const g = group(parent, x, .12, z), r = rng(seed), brown = mat('#786345');
  add(g, G.cyl(.035, .06, 1.5, 8), brown, 0, .75, 0);
  const leaves = [], dummy = new THREE.Object3D();
  for (let i = 0; i < 45; i++) {
    const a = i * 2.4, rad = .16 + r() * .37;
    leaves.push([Math.cos(a) * rad, .65 + r() * 1.1, Math.sin(a) * rad, a]);
  }
  const inst = new THREE.InstancedMesh(G.sphere(1, 8, 6), mat('#8b9b78', { roughness: 1 }), leaves.length);
  leaves.forEach(([x, y, z, a], i) => {
    dummy.position.set(x, y, z); dummy.scale.set(.13, .035, .065); dummy.rotation.set(.3, a, .4); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, new THREE.Color(i % 3 ? '#9da98b' : '#738567'));
  });
  inst.castShadow = true; inst.receiveShadow = true; g.add(inst);
  g.traverse(o => { o.userData.noPick = true; }); return g;
}

function milkLoaf(parent, x, y, z, sliced = false) {
  const loaf = group(parent, x, y, z), crust = mat('#b97d46'), crumb = mat('#f0d5b0');
  add(loaf, G.box(.38, .32, .45), crust, 0, .16, 0);
  add(loaf, G.capsule(.19, .10, 6, 14), mat('#cc9455'), 0, .34, 0, { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .62] });
  if (sliced) {
    add(loaf, G.box(.322, .27, .012), crumb, 0, .17, .232);
    const pink = mat('#c87986');
    for (let i = 0; i < 3; i++) add(loaf, G.box(.27 - i * .055, .018, .008), pink,
      -.006 * i, .11 + i * .066, .241, { rot: [0, 0, -.18 + i * .10] });
  }
  return loaf;
}

/** 足元が原点、+z正面。既存の街角アンカーを変えず模型だけを置き換える。 */
export function buildSakimoto(parent, { x = 0, z = 0, scale = 1 } = {}) {
  const root = group(parent, x, 0, z); root.name = '嵜本ベーカリー'; root.scale.setScalar(scale);
  const wood = woodMaterial(), timber = mat('#bd9d68'), dark = mat('#343734'), white = mat('#eeeae0');
  const front = 1.83;
  add(root, G.box(7.1, .16, 4.9), mat('#b9baaa'), 0, .03, 0);
  add(root, G.box(6.22, .22, 3.7), mat('#9b9c90'), 0, .17, -.05);
  add(root, G.box(6.03, .035, 3.5), mat('#bd9a6c'), 0, .30, -.05);
  gableFace(root, wood, front);
  gableFace(root, white, -1.90, true);
  for (const side of [-1, 1]) add(root, G.box(.12, 3.85, 3.72), side > 0 ? white : wood,
    side * 3.10, 2.10, -.04);
  // 切妻は屋根板と太い木口、軒裏の垂木をそれぞれ作る。
  const half = 3.40, rise = 2.20, slope = Math.hypot(half, rise), angle = Math.atan2(rise, half);
  for (const side of [-1, 1]) {
    add(root, G.box(slope, .105, 4.3), mat('#8d7552'), side * half / 2, 5.02, -.05, { rot: [0, 0, -side * angle] });
    add(root, G.box(slope, .12, .13), timber, side * half / 2, 5.02, 2.16, { rot: [0, 0, -side * angle] });
    for (let zz = -1.9; zz <= 1.9; zz += .46) add(root, G.box(slope, .075, .065), mat('#ac8b5b'),
      side * half / 2, 4.94, zz, { rot: [0, 0, -side * angle] });
  }
  add(root, G.box(.13, .09, 4.35), mat('#766247'), 0, 6.14, -.05);
  // 写真右上の白い壁と、背後に光の抜ける木製ルーバー。
  const whitePatch = new THREE.Shape(); whitePatch.moveTo(.23, 2.62); whitePatch.lineTo(3.02, 2.62);
  whitePatch.lineTo(3.02, 4.06); whitePatch.lineTo(.23, 5.88); whitePatch.closePath();
  add(root, new THREE.ShapeGeometry(whitePatch), white, 0, 0, front + .012);
  const louverBase = 2.74;
  for (const xx of [.28, 2.33]) {
    // 妻壁の傾斜に合わせて天端を変える。右の縦材を同じ長さにすると屋根を突き抜ける。
    const top = 6.04 - xx * .652 - .13;
    add(root, G.box(.085, top - louverBase, .11), timber, xx, (top + louverBase) / 2, front + .11,
      { name: '嵜本・妻壁ルーバーの縦材' });
  }
  for (let y = 2.78; y < 5.70; y += .145) {
    const right = Math.min(2.30, (6.04 - y) / .652 - .15);
    if (right > .40) add(root, G.box(right - .35, .06, .11), timber, (right + .35) / 2, y, front + .11);
  }
  // 黒い縦桟のショーウィンドー。奥のパン棚まで見える開口にする。
  for (const xx of [-1.54, -.76, .06]) add(root, G.box(.065, 2.24, .12), dark, xx, 1.42, front + .025);
  for (const y of [.30, 1.25, 2.55]) add(root, G.box(1.67, .065, .12), dark, -.74, y, front + .025);
  add(root, G.box(1.36, .07, .60), timber, -.74, .76, 1.36);
  add(root, G.box(1.36, .07, .60), timber, -.74, 1.46, 1.36);
  for (const y of [.80, 1.50]) for (const xx of [-1.15, -.70, -.25]) milkLoaf(root, xx, y, 1.40, y < 1);
  // 店名は木板の上へ直接印字。別の案内札を増やさない。
  const sign = add(root, G.plane(1.35, 1.72), lettering([
    ['嵜', .18, 170, 500], ['SAKI', .47, 75, 400], ['moto', .62, 69, 400], ['bakery', .77, 41, 400],
  ]), -1.06, 3.72, front + .020, { cast: false }); sign.name = '嵜本ベーカリーの壁面ロゴ';
  for (const xx of [-1.68, -.45]) {
    add(root, G.box(.22, .07, .14), dark, xx, 4.75, front + .14, { rot: [.20, 0, 0] });
    add(root, G.box(.13, .018, .08), new THREE.MeshBasicMaterial({ color: '#ffe6a5' }), xx, 4.71, front + .18);
  }
  // 低い右手の入口棟。打放しの目地と控えめな壁面灯。
  const entry = group(root, 1.73, 0, front + .14); entry.name = '嵜本ベーカリーの入口';
  add(entry, G.box(2.63, 2.26, .13), mat('#d2d0c5'), 0, 1.44, 0);
  for (const y of [.65, 1.28, 1.91, 2.55]) add(entry, G.box(2.6, .012, .010), mat('#afb0a6'), 0, y, .072);
  for (const xx of [-1.0, -.1, .8]) for (const y of [.95, 1.60, 2.22])
    add(entry, G.cyl(.012, .012, .012, 8), mat('#9b9d95'), xx, y, .080, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(entry, G.box(.96, 2.08, .06), timber, .40, 1.35, .095);
  add(entry, G.box(.70, 1.86, .025), mat('#807a66'), .40, 1.39, .137);
  add(entry, G.box(.035, .29, .07), dark, .15, 1.32, .173);
  add(entry, G.box(3.03, .09, .65), mat('#4a4840'), 0, 2.68, .19, { rot: [.09, 0, 0] });
  for (const xx of [-1.31, 1.31]) add(entry, G.box(.075, 2.55, .075), timber, xx, 1.48, .48);
  for (const xx of [-1.0, .14, 1.04]) {
    add(entry, G.box(.07, .14, .09), dark, xx, 2.36, .11);
    add(entry, G.sphere(.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#f7e1ad' }), xx, 2.29, .145);
  }
  add(root, G.box(2.45, .13, .55), mat('#b9baae'), 1.70, .17, 2.12);
  add(root, G.box(2.72, .10, .42), mat('#cacbbf'), 1.70, .07, 2.29);
  // おすすめの食パンは、店先の小さい商品札と本物の立体の断面で見せる。
  const recommendation = group(root, 1.18, .31, 2.23); recommendation.name = 'いちごミルク食パン';
  add(recommendation, G.box(.68, .80, .13), mat('#d5d4c7'), 0, .40, 0);
  add(recommendation, G.plane(.60, .43), lettering([
    ['おすすめ', .17, 42], ['いちごミルク', .49, 62, 600], ['食パン', .78, 63, 600],
  ], { width: 512, height: 320, bg: '#f7f2e7', ink: '#8a5154' }), 0, .49, .072, { cast: false });
  milkLoaf(recommendation, 0, .82, .01, true);
  for (const [xx, seed] of [[-2.78, 91], [-1.87, 92]]) {
    const plant = tree(root, xx, 2.20, seed); plant.scale.z = .4;
  }
  const sidePlant = tree(root, 3.38, 1.05, 93); sidePlant.scale.x = .35;
  return {
    root, sign, recommendation,
    view: { target: new THREE.Vector3(x, 2.5 * scale, z + 1.7 * scale), theta: -.30, dist: 20 * scale, polar: 1.12 },
    footprint: { center: new THREE.Vector3(x, 0, z), w: 7.2 * scale, d: 5.0 * scale, height: 6.2 * scale },
  };
}
