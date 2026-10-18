import * as THREE from 'three';
import { add, mat, G, group, rng, canvasTex, FONT } from '../../lib/util.js';
import { waterize, sway } from '../../lib/livefx.js';
import { createSagaStation } from './station.js';
import { createMallageSaga } from './mallage.js';
import { createKawakuboProperty } from './kawakubo.js';
import { createRoundOneSaga } from './roundone.js';
import { createIdeChanpon } from './ide-chanpon.js';
import { createTadakaneCompany } from './tadakane.js';
import { buildYoshinogari } from './yoshinogari.js';
import { buildSakimoto } from './sakimoto.js';

// 佐賀平野の縮景。北は-z、東は+x。地域間の距離だけを圧縮し、
// 写真を参照する3施設の形状・敷地内の配置はそれぞれのモデルで保つ。
export const ISLAND = { w: 160, d: 156 };
export const TRACK_Z = 8;
const C = {
  grass: '#96a779', rice: '#b6b77d', soil: '#a49b7d', edge: '#8f9478',
  asphalt: '#777d79', line: '#ecebdb', paving: '#c8c8b7', creek: '#567f76',
  leaf: '#6d8e58', wood: '#a4825d', dark: '#526359', white: '#f1ecdb', teal: '#4d8075',
};
const dynamic = (g, visible = true) => { g.userData.dynamic = true; g.visible = visible; return g; };
const noPick = (g) => { g.traverse((o) => { o.userData.noPick = true; }); return g; };
const FIELD_RECTS = [
  // 北西はアマンディ・ビストロの街区。植生も同じ区画定義から生成する。
  [-73, -33, -58, -15],
  [45, -67, 72, -58],
];

function rod(parent, a, b, r, material, sides = 8) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), v = q.clone().sub(p);
  const m = add(parent, G.cyl(r, r, v.length(), sides), material,
    (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}

function groundTexture() {
  return canvasTex(3200, 3120, (ctx, W, H) => {
    const X = (x) => (x + 80) / 160 * W, Z = (z) => (z + 78) / 156 * H, K = W / 160;
    const rect = (x0, z0, x1, z1, color) => {
      ctx.fillStyle = color; ctx.fillRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
    };
    const r = rng(20261016);
    ctx.fillStyle = C.grass; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 35000; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(237,232,191,.055)' : 'rgba(66,91,52,.06)';
      ctx.fillRect(r() * W, r() * H, 1 + r() * 5, 1 + r() * 3);
    }
    FIELD_RECTS.forEach(([x0, z0, x1, z1], i) => {
      rect(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, '#8e9470');
      rect(x0, z0, x1, z1, ['#b1b676', '#a9b783', '#bfba7d', '#91a77a'][i % 4]);
      ctx.strokeStyle = i % 2 ? 'rgba(73,101,58,.25)' : 'rgba(239,222,148,.34)'; ctx.lineWidth = 2;
      for (let x = x0 + 0.25; x < x1; x += 0.45) {
        ctx.beginPath(); ctx.moveTo(X(x), Z(z0 + 0.15)); ctx.lineTo(X(x), Z(z1 - 0.15)); ctx.stroke();
      }
      for (let j = 0; j < 450; j++) {
        ctx.fillStyle = j % 2 ? 'rgba(222,210,144,.24)' : 'rgba(99,116,64,.14)';
        ctx.fillRect(X(x0 + r() * (x1 - x0)), Z(z0 + r() * (z1 - z0)), 2, 4);
      }
    });
    // 佐賀駅周辺は都市の舗道。モールの敷地はモデル側の駐車場を優先する。
    rect(-56, -3, -3.5, 28.5, '#b7bbaa');
    rect(-53, 23, -4.5, 28, C.paving);
    ctx.strokeStyle = 'rgba(102,112,98,.18)'; ctx.lineWidth = 1;
    for (let x = -53; x <= -4.5; x += 0.9) { ctx.beginPath(); ctx.moveTo(X(x), Z(23)); ctx.lineTo(X(x), Z(28)); ctx.stroke(); }
    for (let z = 23; z <= 28; z += 0.9) { ctx.beginPath(); ctx.moveTo(X(-53), Z(z)); ctx.lineTo(X(-4.5), Z(z)); ctx.stroke(); }
    const road = (x0, z0, x1, z1, center = true) => {
      rect(x0 - 0.25, z0 - 0.25, x1 + 0.25, z1 + 0.25, '#a6ad99');
      rect(x0, z0, x1, z1, C.asphalt);
      if (!center) return;
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.setLineDash([1.3 * K, 1.2 * K]);
      ctx.beginPath();
      if (x1 - x0 > z1 - z0) { ctx.moveTo(X(x0), Z((z0 + z1) / 2)); ctx.lineTo(X(x1), Z((z0 + z1) / 2)); }
      else { ctx.moveTo(X((x0 + x1) / 2), Z(z0)); ctx.lineTo(X((x0 + x1) / 2), Z(z1)); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    // 北西の温浴施設と食事処へ続く、田園から少しにぎわう生活の街区。
    rect(-71, -74, -33, -46, '#c2bca5');
    rect(-32, -61, -12, -44.8, '#c2c3ad');
    rect(-31, -73, -12, -64.2, '#b9bda6');
    road(-71.5, -44.2, 7.4, -39.8);
    road(-57.0, -39.8, -53.9, -12.0, false);
    // 北側の食事処・ものづくりの街角と、駅北東の娯楽施設。
    rect(-51, -30, -31, -14, '#b9b7a2');
    rect(-25.5, -32, -10.5, -15, '#b4b8a3');
    rect(8.5, -23.2, 40.5, 3.5, '#b8bba9');
    rect(47.5,-27.3,75.5,3.5,'#b8bba9');
    rect(47.0, -56.0, 75.0, -30.0, '#a8ad80');
    rect(59.8, -31.5, 62.2, -26.8, '#c0b591');
    road(-52, -23.4, -49, -12.0, false);
    road(-55.45, -24.0, -47, -21.3, false);
    road(-29.5, -12.0, -8.0, -9.8, false);
    road(-10.2, -30.7, -7.8, -9.8, false);
    road(-12.5, -27.0, -2.0, -24.8, false);
    road(2.6, -26.8, 78.0, -23.8);
    road(40.8, -26.8, 43.1, 7.0, false);
    road(75.5,-26.8,78.0,7.0,false);
    road(46.5,3,78,6);
    road(60,6,64.5,16);
    road(2.6,-12.2,42.0,-10.0,false);
    // 駅・商業地を結ぶ幹線は建物の西側を通す。
    road(-2.6, -29.0, 2.6, 75.5);
    road(-63.5, 29.0, 2.6, 34.0);
    road(-63.5, -13.3, -59.0, 72.5);
    road(-63.5, 68.0, 71.5, 72.5);
    road(60.0, 16.0, 64.5, 72.5);
    // 川久保は細い生活道路。中央線や大きな看板を付けない。
    road(4.6, -69, 7.4, -29.2, false);
    road(4.6, -32.0, 57, -29.0, false);
    road(-1.3, -29.5, 7.4, -26.7, false);
    road(4.6, -57.5, 42, -54.7, false);
    rect(-75, -13.3, 2.6, -11.7, '#b0a88a');
    // 商店前の歩道と自転車置き場。建物や花壇を車道へ出さない。
    rect(-74, -12, -65, -3.8, '#c2c1ac');
    rect(-55.6, -11.0, -46.2, -3.2, '#cbc4ad');
    rect(-59.0, -5.4, -46.2, -3.2, '#c7c1ab');
    rect(-74.5, 9.1, -65, 16.7, '#bfc0ac');
    rect(-74.5, 26.8, -65, 35.0, '#bfc0ac');
    rect(-20.8, -11.3, -11.2, -4.1, '#b4b99b');
    rect(-59.0, 17.6, -54.4, 22.3, '#b5baa6');
    ctx.fillStyle = '#b9c1a2'; ctx.beginPath(); ctx.ellipse(X(-17), Z(-8), 6.5 * K, 4.0 * K, 0, 0, Math.PI * 2); ctx.fill();
    // 写真の敷地の前は土と草の路肩。左の作業場へだけ細い進入路をつなぐ。
    rect(9.2, -36.1, 38.2, -32.0, '#a6a084');
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(94,112,64,.2)' : 'rgba(218,213,179,.15)';
      ctx.fillRect(X(9.2 + r() * 29), Z(-36.1 + r() * 4.1), 2 + r() * 5, 1 + r() * 4);
    }
    rect(10.9, -36.0, 15.0, -31.9, '#aaa99a');
    // バルーンの小さな芝生広場。周りの平野から不自然に切り離さない。
    ctx.fillStyle = '#a0ad81'; ctx.beginPath(); ctx.ellipse(X(-35), Z(48), 13 * K, 11.5 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c0b592'; ctx.lineWidth = 1.6 * K; ctx.beginPath();
    ctx.moveTo(X(-35), Z(34)); ctx.lineTo(X(-35), Z(39)); ctx.stroke();
    rect(-10.5, 33.8, -8.5, 64.0, '#beb69d');
    // 横断歩道は駅前とモールへの接続だけに控えめに。
    ctx.fillStyle = '#e7e6d8';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(X(-3.1), Z(38 + i * 0.55), 6.2 * K, 0.27 * K);
      ctx.fillRect(X(-18 + i * 0.55), Z(28.6), 0.27 * K, 5.8 * K);
    }
    // クリークの川底を地表に描き、上に別の水面を重ねる。
    // 北区間の水路は新しい施設用地を横切らず、西の田園の縁を通る。
    rect(-75.1, -73, -72.9, -36, '#6d806e');
    rect(-54.1, -36, -51.9, -10, '#6d806e');
    rect(-75, -37.1, -13, -34.9, '#6d806e');
    rect(43.1, -69, 44.9, 10, '#6d806e');
  });
}

function textFace(parent, title, sub, w, h, y, bg = C.white, fg = '#3b5750') {
  const tex = canvasTex(768, Math.round(768 * h / w), (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#9ca68b'; ctx.lineWidth = 5; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
    let fs = H * (sub ? 0.3 : 0.46); ctx.font = `800 ${fs}px ${FONT}`;
    while (ctx.measureText(title).width > W * 0.88) { fs -= 2; ctx.font = `800 ${fs}px ${FONT}`; }
    ctx.fillText(title, W / 2, H * (sub ? 0.37 : 0.52));
    if (sub) { ctx.font = `600 ${H * 0.18}px ${FONT}`; ctx.fillText(sub, W / 2, H * 0.76); }
  });
  const f = add(parent, G.plane(w, h), new THREE.MeshBasicMaterial({ map: tex }), 0, y, 0.11, { cast: false });
  f.userData.keep = true;
  return f;
}

function tree(parent, x, z, seed, scale = 1) {
  const g = group(parent, x, 0, z), r = rng(seed), bark = mat('#7c775c');
  add(g, G.cyl(0.12, 0.19, 2.1, 8), bark, 0, 1.05, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + r();
    rod(g, [0, 1.1, 0], [Math.cos(a) * 0.6, 2.7, Math.sin(a) * 0.6], 0.055, bark);
  }
  for (let i = 0; i < 8; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.75;
    add(g, G.sphere(0.63 + r() * 0.22, 9, 7), mat(['#6a8a55', '#809a61', '#91a46e'][i % 3]),
      Math.cos(a) * d, 2.7 + r() * 0.75, Math.sin(a) * d, { scale: [1, 0.82, 1] });
  }
  g.scale.setScalar(scale);
  return noPick(g);
}

function plainHouse(parent, x, z, w, d, h, seed, ry = 0) {
  const g = group(parent, x, 0, z, ry), r = rng(seed), wall = ['#cfccb8', '#c9c5b0', '#b9c1af', '#d2cbb8'][seed % 4];
  add(g, G.box(w, h, d), mat(wall), 0, h / 2, 0);
  const rise = Math.min(1.1, w * 0.2), slope = Math.atan2(rise, w / 2), length = Math.hypot(w / 2 + 0.2, rise);
  for (const side of [-1, 1]) add(g, G.box(length, 0.1, d + 0.5), mat('#69756b'), side * w / 4, h + rise / 2, 0,
    { rot: [0, 0, -side * slope] });
  add(g, G.box(w + 0.18, 0.18, d + 0.18), mat('#9a9f8c'), 0, 0.09, 0);
  for (const side of [-1, 1]) {
    for (let y = 1; y < h; y += 1.7) for (const xx of [-w * 0.26, w * 0.26]) {
      add(g, G.box(w * 0.22, 0.68, 0.035), mat('#a3aaa0'), xx, y, side * (d / 2 + 0.02));
      add(g, G.box(w * 0.22 - 0.08, 0.6, 0.04), mat(r() > 0.35 ? '#687d76' : '#b6b7a2'), xx, y, side * (d / 2 + 0.04));
    }
  }
  add(g, G.box(0.8, 1.7, 0.055), mat('#786f5a'), 0, 0.9, d / 2 + 0.05);
  add(g, G.box(1.15, 0.08, 0.5), mat('#8c9586'), 0, 1.85, d / 2 + 0.2, { rot: [0.06, 0, 0] });
  return noPick(g);
}

function flowerBox(parent, x, z, w, seed) {
  const g = group(parent, x, 0, z), random = rng(seed);
  add(g, G.box(w, 0.35, 0.64), mat('#aaa386'), 0, 0.175, 0);
  add(g, G.box(w - 0.12, 0.025, 0.5), mat('#777961'), 0, 0.36, 0);
  for (let i = 0; i < Math.ceil(w * 4); i++) {
    const xx = -w / 2 + 0.15 + random() * (w - 0.3), zz = (random() - 0.5) * 0.34;
    add(g, G.sphere(0.15, 7, 5), mat('#6f8d5b'), xx, 0.45, zz, { scale: [1, 0.8, 1] });
    const color = ['#c69d86', '#d5c18c', '#d6d1ab', '#a394b0'][i % 4];
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      add(g, G.sphere(0.055, 6, 4), mat(color), xx + Math.cos(a) * 0.055, 0.57, zz + Math.sin(a) * 0.055, { scale: [1, 0.5, 1] });
    }
    add(g, G.sphere(0.035, 6, 4), mat('#e3d48e'), xx, 0.58, zz);
  }
  return noPick(g);
}

function bench(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry), wood = mat('#aa9270'), iron = mat('#6b7d6b');
  for (const xx of [-0.75, 0.75]) for (const zz of [-0.21, 0.21]) add(g, G.box(0.07, 0.48, 0.07), iron, xx, 0.24, zz);
  for (let i = 0; i < 4; i++) add(g, G.box(1.95, 0.065, 0.13), wood, 0, 0.53, -0.23 + i * 0.15);
  for (const xx of [-0.8, 0.8]) add(g, G.box(0.065, 0.75, 0.065), iron, xx, 0.76, -0.28);
  for (let i = 0; i < 3; i++) add(g, G.box(1.95, 0.13, 0.06), wood, 0, 0.76 + i * 0.15, -0.29);
  return noPick(g);
}

function neighborhoodShop(parent, x, z, { kind, name, color, awning, w = 6.4, d = 5.2, ry = 0 }) {
  const g = group(parent, x, 0, z, ry), wall = mat(color), front = d / 2 + 0.035;
  g.name = `saga-neighborhood-${kind}`;
  add(g, G.box(w, 2.85, d), wall, 0, 1.48, 0);
  add(g, G.box(w + 0.14, 0.3, d + 0.14), mat('#9c9d86'), 0, 0.15, 0);
  add(g, G.box(w + 0.35, 0.16, d + 0.5), mat(kind === 'florist' ? '#8a9a82' : '#919b8c'), 0, 3.02, 0);
  add(g, G.box(w + 0.2, 0.3, 0.16), mat('#a9b09b'), 0, 3.17, d / 2 + 0.12);
  // 左のショーウィンドーと右の入口。内側に棚があり、反射だけの箱にしない。
  add(g, G.box(w * 0.57, 1.45, 0.08), mat('#667e70'), -w * 0.13, 1.42, front + 0.03);
  for (const xx of [-w * 0.415, -w * 0.13, w * 0.155]) add(g, G.box(0.055, 1.55, 0.14), mat('#d2cfb3'), xx, 1.42, front + 0.07);
  add(g, G.box(w * 0.57, 0.07, 0.14), mat('#c7c7a9'), -w * 0.13, 0.71, front + 0.08);
  add(g, G.box(0.9, 2.14, 0.09), mat('#8a977e'), w * 0.34, 1.23, front + 0.03);
  add(g, G.box(0.7, 1.7, 0.035), mat('#596f63'), w * 0.34, 1.33, front + 0.09);
  add(g, G.box(0.03, 0.27, 0.05), mat('#d3c69f'), w * 0.29, 1.22, front + 0.15);
  const fascia = group(g, 0, 0, front + 0.11);
  textFace(fascia, name, '', w - 0.45, 0.6, 2.51, color, '#425d4c');
  for (let i = 0; i < 10; i++) {
    const stripe = i % 2 ? '#e5debd' : awning;
    add(g, G.box((w + 0.2) / 10, 0.08, 1.05), mat(stripe), -w / 2 + (i + 0.5) * (w / 10), 2.17, front + 0.5, { rot: [-0.13, 0, 0] });
    add(g, G.box((w + 0.2) / 10, 0.22, 0.055), mat(stripe), -w / 2 + (i + 0.5) * (w / 10), 1.99, front + 1.0);
  }
  if (kind === 'florist') {
    for (let i = 0; i < 5; i++) {
      const xx = -w * 0.35 + i * w * 0.14;
      add(g, G.cyl(0.22, 0.17, 0.4, 9), mat(i % 2 ? '#ad8a6c' : '#8d9f7f'), xx, 0.22, front + 1.25);
      for (let k = 0; k < 5; k++) {
        const a = k * 1.26; rod(g, [xx, 0.4, front + 1.25], [xx + Math.cos(a) * 0.16, 0.9, front + 1.25 + Math.sin(a) * 0.16], 0.015, mat('#70925f'), 5);
        add(g, G.sphere(0.105, 7, 5), mat(['#c79d94', '#d4bf8a', '#b19cad'][i % 3]), xx + Math.cos(a) * 0.16, 0.92, front + 1.25 + Math.sin(a) * 0.16);
      }
    }
  } else if (kind === 'books') {
    for (let i = 0; i < 8; i++) add(g, G.box(0.23, 0.43 + (i % 3) * 0.07, 0.2), mat(['#ad8f70', '#8e9d80', '#b3a978'][i % 3]), -1.6 + i * 0.35, 1.0, front + 0.11);
    bench(g, -0.85, front + 1.25);
  } else {
    for (const xx of [-1.5, -0.45, 0.6]) {
      add(g, G.box(0.83, 1.0, 0.5), mat('#c0c3ad'), xx, 1.22, front + 0.14);
      add(g, G.torus(0.26, 0.04, 6, 18), mat('#d8d8bd'), xx, 1.17, front + 0.43);
      add(g, G.cyl(0.21, 0.21, 0.03, 16), mat('#627a71'), xx, 1.17, front + 0.43, { rot: [Math.PI / 2, 0, 0] });
    }
  }
  return g;
}

function bicycle(parent, x, z, color, ry = 0) {
  const g = group(parent, x, 0, z, ry), metal = mat(color), black = mat('#4c594b');
  for (const xx of [-0.65, 0.65]) {
    add(g, G.torus(0.32, 0.035, 6, 20), black, xx, 0.35, 0);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; rod(g, [xx, 0.35, 0], [xx + Math.cos(a) * 0.29, 0.35 + Math.sin(a) * 0.29, 0], 0.008, mat('#9eaa96'), 4); }
  }
  for (const [a,b] of [[[-0.65,.35,0],[-.13,.91,0]],[[-.13,.91,0],[.05,.35,0]],[[.05,.35,0],[-.65,.35,0]],[[-.13,.91,0],[.43,.91,0]],[[.43,.91,0],[.05,.35,0]],[[.43,.91,0],[.65,.35,0]]]) rod(g,a,b,.022,metal,6);
  add(g,G.box(.3,.07,.13),black,-.17,.98,0);rod(g,[.43,.91,0],[.39,1.08,0],.018,mat('#9da88f'),5);
  rod(g,[.39,1.08,-.17],[.39,1.08,.17],.018,mat('#9da88f'),5);
  add(g,G.box(.32,.26,.32),mat('#9d9c7e'),.66,.87,0);
  return noPick(g);
}

function compactCar(parent, x, z, color, ry = 0) {
  const g = group(parent,x,0,z,ry), paint = mat(color);
  add(g,G.box(1.35,.64,2.45),paint,0,.58,0);add(g,G.box(1.21,.54,1.25),mat('#5d7770'),0,1.12,-.12);
  add(g,G.box(1.25,.1,1.29),paint,0,1.43,-.12);
  for(const side of [-1,1])for(const zz of [-.78,.78])add(g,G.cyl(.27,.27,.14,10),mat('#475446'),side*.63,.3,zz,{rot:[0,0,Math.PI/2]});
  for(const side of [-1,1])add(g,G.box(.3,.17,.04),mat('#dedbbb'),side*.42,.69,1.24);
  return noPick(g);
}

function neighborhoodPark(parent) {
  const g = group(parent,-17,0,-8);g.name='saga-small-park';
  add(g,G.circle(2.0,32),mat('#c6b995'),1.65,-.01,0,{rot:[-Math.PI/2,0,0],cast:false});
  add(g,G.cyl(.3,.6,.45,8),mat('#8c947b'),1.65,.22,0);
  add(g,G.box(3.7,.13,.45),mat('#b79a6c'),1.65,.57,0,{rot:[0,0,-.09]});
  for(const side of [-1,1]){add(g,G.box(.55,.06,.5),mat(side<0?'#b8876e':'#769c83'),1.65+side*1.48,.57-side*.13,0);rod(g,[1.65+side*1.25,.6,-.17],[1.65+side*1.25,.98,-.17],.025,mat('#6e8c77'));}
  bench(g,-3,1.1,Math.PI/2);flowerBox(g,-3,-2.1,2.2,839);
  const shade=tree(g,3.9,-2.1,928,.68);shade.userData.noPick=true;
  return g;
}

function buildStreetQuarter(root) {
  const g = group(root), scenes = {};g.name='saga-neighborhood-life';
  const sakimoto = buildSakimoto(g, { x: -51, z: -8 });
  const bakery = sakimoto.root;
  const florist=neighborhoodShop(g,-70,-8,{kind:'florist',name:'花と緑',color:'#d4d6bd',awning:'#7f9e83',w:6.6,d:5.0,ry:Math.PI/2});
  neighborhoodShop(g,-70,31,{kind:'books',name:'本と文具',color:'#c4c6ad',awning:'#889684',w:6.2,d:5.1,ry:Math.PI/2});
  neighborhoodShop(g,-70,13,{kind:'laundry',name:'まちの洗たく室',color:'#cbd0ba',awning:'#94a8a0',w:5.4,d:4.9,ry:Math.PI/2});
  const courtyard=group(g,-6.8,0,-57);
  add(courtyard,G.box(4.0,3.7,5.0),mat('#c6c6ad'),0,1.85,0);add(courtyard,G.box(4.3,.16,5.3),mat('#8a9684'),0,3.77,0);
  for(const yy of [1.1,2.8])for(const xx of [-1,1])add(courtyard,G.box(.88,.8,.06),mat('#6c8174'),xx,yy,2.54);
  add(courtyard,G.box(3.7,.5,.13),mat('#a8b09b'),0,2.26,2.75);add(courtyard,G.box(3.7,.1,.6),mat('#a8b09b'),0,2.03,2.55);
  for(const [xx,col]of[[-.9,'#b6a489'],[-.2,'#b7bfaa'],[.5,'#c9c7af']])add(courtyard,G.box(.45,.57,.025),mat(col),xx,2.55,2.88);
  const garage=group(g,-6.8,0,-3);add(garage,G.box(3.7,2.3,4.2),mat('#b8baa5'),0,1.15,0);
  add(garage,G.box(3.95,.12,4.5),mat('#919b86'),0,2.4,0,{rot:[.04,0,0]});
  for(let i=0;i<8;i++)add(garage,G.box(2.6,.025,.045),mat('#8f9c85'),0,.25+i*.23,2.13);
  const bikes=group(g,-56.7,0,19.7);for(let i=0;i<3;i++)bicycle(bikes,0,-.75+i*.75,['#a18c72','#8d9c87','#b6ab89'][i],Math.PI/2);
  for(const side of [-1,1])add(bikes,G.box(2.2,.08,.08),mat('#98a48e'),0,.11,side*1.18);
  const post=group(g,-55.8,0,-1.0);add(post,G.cyl(.065,.08,.85,8),mat('#7f8e75'),0,.45,0);
  add(post,G.box(.55,.68,.42),mat('#ae735b'),0,1.16,0);add(post,G.box(.36,.05,.035),mat('#5f6251'),0,1.34,.23);
  const postSign=group(post,0,0,.23);textFace(postSign,'POST','',.43,.18,1.05,'#ae735b','#e3dbb8');
  const park=neighborhoodPark(g);
  // 北西の施設を背面から囲わず、北側の小さな休憩・駐車スペースに生活感を足す。
  const rest=group(g,-21,0,-68);bench(rest,-4,2.1);bench(rest,3,2.1);
  flowerBox(rest,-7,-2.0,2.5,314);flowerBox(rest,7,-2.0,2.5,315);
  for(let i=0;i<3;i++){compactCar(rest,-4.3+i*4.3,-.8,['#d8d7c5','#81968a','#c3b9a0'][i]);}
  for(const x of [-7,-2.2,2.2,7])add(rest,G.box(.08,.018,4.2),mat('#e0dfc9'),x,-.011,-.7,{cast:false});
  for(const [x,z,w]of[[-67,-46,3.0],[-37,-46,2.5],[-29,-44.9,2.1],[-15,-44.9,2.1]])flowerBox(g,x,z,w,Math.round(x*31+z+5000));
  const bridge=group(g,-55.45,0,-36);bridge.name='saga-neighborhood-creek-bridge';
  add(bridge,G.box(3.5,.18,4.8),mat('#b1b7a0'),0,.065,0);
  for(const side of [-1,1]){for(const z of [-2.1,0,2.1])add(bridge,G.box(.1,.7,.1),mat('#879981'),side*1.65,.4,z);add(bridge,G.box(.09,.09,4.6),mat('#8d9e87'),side*1.65,.74,0);}
  const corner=group(g,-52.3,0,36.2);bench(corner,0,0);flowerBox(corner,1.9,0,1.1,820);
  const veg=group(g,-10.2,0,-65);for(let i=0;i<4;i++){add(veg,G.box(.55,.08,3.1),mat('#a28e6d'),i*.7,0,0);for(let k=0;k<5;k++)add(veg,G.sphere(.15,7,5),mat(k%2?'#819568':'#9ca16d'),i*.7,.15,-1.2+k*.6,{scale:[1,.65,1]});}
  const scenesData={
    bakery:{root:bakery,name:'嵜本ベーカリー',...sakimoto.view},
    florist:{root:florist,name:'花と緑の店',target:new THREE.Vector3(-67.5,1.4,-8),theta:Math.PI/2,dist:12},
    bridge:{root:bridge,name:'クリークの小橋',target:new THREE.Vector3(-55.45,.8,-36),theta:-.2,dist:14},
    park:{root:park,name:'まちかどの小さな公園',target:new THREE.Vector3(-17,.7,-8),theta:Math.PI,dist:14},
  };
  Object.assign(scenes,scenesData);
  return {root:g,scenes};
}

function creek(parent, x0, z0, x1, z1, width, water, gaps = []) {
  const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0);
  const g = noPick(group(parent, (x0 + x1) / 2, 0, (z0 + z1) / 2));
  const w = horizontal ? len : width, d = horizontal ? width : len;
  add(g, G.plane(w, d), water, 0, -0.022, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const start = horizontal ? Math.min(x0, x1) : Math.min(z0, z1);
  const end = start + len, ranges = []; let cursor = start;
  for (const [a, b] of gaps) { if (a > cursor) ranges.push([cursor, a]); cursor = b; }
  if (cursor < end) ranges.push([cursor, end]);
  for (const [a,b] of ranges) for (const side of [-1, 1]) {
    const part = b - a, mid = (a + b - start - end) / 2;
    add(g, G.box(horizontal ? part : 0.12, 0.1, horizontal ? 0.12 : part), mat('#9a9d83'),
      horizontal ? mid : side * (width / 2 + 0.1), 0, horizontal ? side * (width / 2 + 0.1) : mid);
  }
  return g;
}

function riceDetails(parent) {
  const locations = [], transform = new THREE.Object3D(), r = rng(1693);
  FIELD_RECTS.forEach(([x0, z0, x1, z1], index) => {
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 0.9) for (let z = z0 + 0.5; z < z1 - 0.3; z += 1.05) {
      locations.push({ x: x + (r() - 0.5) * 0.08, z: z + (r() - 0.5) * 0.12, h: 0.22 + r() * 0.12, index });
    }
  });
  const material = sway(mat('#aeb477', { side: THREE.DoubleSide }), { amp: 0.045, speed: 0.7, base: 0 });
  const shape = new THREE.Shape(); shape.moveTo(-0.17, 0); shape.quadraticCurveTo(-0.13, 0.75, -0.03, 1);
  shape.lineTo(0.02, 0.23); shape.quadraticCurveTo(0.2, 0.87, 0.2, 0.95); shape.lineTo(0.11, 0); shape.closePath();
  const grass = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape, 4), material, locations.length * 2);
  const colors = ['#aab674', '#9cab77', '#c2bb7b', '#a7b87e'];
  locations.forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      transform.position.set(p.x, -0.015, p.z); transform.rotation.set(0, k * Math.PI / 2, 0);
      transform.scale.set(1, p.h, 1); transform.updateMatrix(); grass.setMatrixAt(i * 2 + k, transform.matrix);
      grass.setColorAt(i * 2 + k, new THREE.Color(colors[p.index % 4]));
    }
  });
  grass.userData.noPick = true; grass.receiveShadow = true; grass.castShadow = false;
  parent.add(grass); return grass;
}

function busStop(parent) {
  const g = group(parent, -13, 0, 25), metal = mat('#7f9987');
  add(g, G.cyl(0.45, 0.55, 0.16, 12), mat('#aaa994'), 0, 0.08, 0);
  add(g, G.cyl(0.055, 0.055, 2.9, 8), metal, 0, 1.55, 0);
  add(g, G.cyl(0.48, 0.48, 0.09, 24), mat('#e6e9d5'), 0, 2.8, 0, { rot: [Math.PI / 2, 0, 0] });
  const sign = group(g, 0, 0, 0.06); textFace(sign, '臨時便', 'のりば', 0.87, 0.68, 2.8, '#f2f1d9', '#4c7e67');
  add(g, G.box(0.78, 1.1, 0.08), metal, 0, 1.65, 0);
  const table = canvasTex(256, 384, (c, W, H) => {
    c.fillStyle = '#f7f2df'; c.fillRect(0, 0, W, H); c.fillStyle = '#456258';
    c.textAlign = 'center'; c.font = `700 35px ${FONT}`; c.fillText('のりば案内', W / 2, 48);
    c.strokeStyle = '#99a28b'; c.lineWidth = 2;
    for (let y = 85; y < H - 20; y += 39) { c.beginPath(); c.moveTo(25, y); c.lineTo(W - 25, y); c.stroke(); }
    for (const x of [88, 160]) { c.beginPath(); c.moveTo(x, 85); c.lineTo(x, H - 26); c.stroke(); }
  });
  add(g, G.plane(0.68, 1.01), new THREE.MeshBasicMaterial({ map: table }), 0, 1.65, 0.055, { cast: false });
  return g;
}

function makeBus(parent) {
  const g = dynamic(group(parent, -18.6, 0, 30.2)), white = mat('#eee9d7'), green = mat('#638f77');
  add(g, G.box(6.0, 2.0, 2.3), white, 0, 1.55, 0);
  add(g, G.box(6.05, 0.5, 2.33), green, 0, 0.95, 0);
  add(g, G.box(6.04, 0.1, 2.32), mat('#d8be7c'), 0, 1.31, 0);
  add(g, G.box(5.8, 0.12, 2.14), white, -0.05, 2.62, 0);
  for (const side of [-1, 1]) {
    for (let x = -2.05; x < 2; x += 1.0) add(g, G.box(0.85, 0.83, 0.035), mat('#617f7c'), x, 2.04, side * 1.165);
    for (const x of [-1.85, 1.85]) {
      add(g, G.cyl(0.5, 0.5, 0.24, 14), mat('#3d4740'), x, 0.52, side * 1.05, { rot: [Math.PI / 2, 0, 0] });
      add(g, G.cyl(0.25, 0.25, 0.25, 12), mat('#a5b0a0'), x, 0.52, side * 1.07, { rot: [Math.PI / 2, 0, 0] });
    }
  }
  add(g, G.box(0.03, 0.9, 1.98), mat('#597979'), 3.02, 2.02, 0);
  for (const side of [-1, 1]) add(g, G.box(0.04, 0.24, 0.45), mat('#e4dfb6'), 3.04, 1.03, side * 0.77);
  const destination = group(g, 3.05, 0, 0, Math.PI / 2);
  textFace(destination, 'まちめぐり', '', 1.72, 0.3, 2.51, '#2f4941', '#e5e1bd');
  g.userData.parkedPosition = g.position.clone();
  return g;
}

function makeSluice(parent) {
  const g = group(parent, -39, 0, -36), concrete = mat('#afb09a'), steel = mat('#798c7d');
  for (const x of [-1.2, 1.2]) add(g, G.box(0.42, 1.05, 2.4), concrete, x, 0.43, 0);
  add(g, G.box(2.9, 0.2, 2.45), concrete, 0, 1.01, 0);
  add(g, G.box(0.1, 1.22, 1.65), mat('#7a897b'), 0, 0.18, 0);
  for (const z of [-0.85, 0.85]) add(g, G.box(0.15, 1.5, 0.15), steel, 0, 1.14, z);
  add(g, G.box(0.14, 0.13, 1.85), steel, 0, 1.88, 0);
  const wheel = dynamic(group(g, 0, 2.15, 0));
  add(wheel, G.torus(0.38, 0.045, 7, 24), mat('#9d5146'), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2; rod(wheel, [0, 0, 0], [Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], 0.025, mat('#9d5146'));
  }
  g.userData.wheel = wheel;
  return g;
}

function makeBalloon(parent) {
  const g = dynamic(group(parent, -35, 0, 48));
  const colors = ['#cf886b', '#e4c777', '#739d8a', '#93b4b5', '#ede2b5', '#cd9275', '#e5c97d', '#6e9b87', '#9ababb', '#ece2bd'];
  const points = [[0.52, 3.0], [0.8, 3.35], [2.0, 4.5], [3.5, 6.9], [4.35, 9.6], [4.18, 11.6], [3.25, 13.8], [1.6, 15.25], [0, 15.75]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  for (let i = 0; i < colors.length; i++) {
    const start = i * Math.PI * 2 / colors.length;
    add(g, new THREE.LatheGeometry(points, 9, start, Math.PI * 2 / colors.length), mat(colors[i], { roughness: 0.85 }));
    const seam = new THREE.CatmullRomCurve3(points.slice(0, -1).map((p) => new THREE.Vector3(Math.sin(start) * p.x, p.y, Math.cos(start) * p.x)));
    add(g, new THREE.TubeGeometry(seam, 36, 0.016, 5, false), mat('#e6dec1'));
  }
  const basket = group(g);
  add(basket, G.box(1.8, 1.1, 1.5), mat('#ae8a5d'), 0, 0.75, 0);
  add(basket, G.box(1.9, 0.13, 1.6), mat('#8a6e4f'), 0, 1.3, 0);
  for (let y = 0.35; y <= 1.2; y += 0.16) add(basket, G.box(1.82, 0.025, 1.52), mat('#c8ac77'), 0, y, 0);
  for (const x of [-0.7, 0.7]) for (const z of [-0.58, 0.58]) rod(basket, [x, 1.3, z], [x * 0.55, 3.15, z * 0.55], 0.025, mat('#81775b'));
  add(basket, G.box(0.7, 0.12, 0.6), mat('#879082'), 0, 2.4, 0);
  add(basket, G.cyl(0.16, 0.16, 0.45, 10), mat('#788579'), 0, 2.7, 0);
  g.userData.basket = basket;
  g.userData.groundPosition = g.position.clone();
  return g;
}

function makeBalloonPad(parent) {
  const g = group(parent, -35, 0, 48);
  add(g, G.circle(7.8, 64), mat('#b5b792'), 0, -0.015, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  const ring = add(g, G.torus(7.5, 0.065, 5, 64), mat('#e6dfb7'), 0, 0.02, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  ring.userData.noPick = true;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    add(g, G.box(0.11, 0.018, 0.7), mat('#e5dfb4'), Math.sin(a) * 6.7, 0.025, Math.cos(a) * 6.7, { rot: [0, a, 0], cast: false });
  }
  const wind = group(g, -9.4, 0, -2.2), pole = mat('#909e8b');
  add(wind, G.cyl(0.055, 0.07, 5.1, 8), pole, 0, 2.55, 0);
  const sleeve = dynamic(group(wind, 0, 4.8, 0));
  for (let i = 0; i < 5; i++) add(sleeve, G.cyl(0.24 - i * 0.028, 0.212 - i * 0.028, 0.34, 10, true),
    mat(i % 2 ? '#e2dfc0' : '#c88569', { side: THREE.DoubleSide }), 0.17 + i * 0.32, 0, 0, { rot: [0, 0, -Math.PI / 2] });
  g.userData.windsock = sleeve;
  return g;
}

function makeSketchDesk(parent) {
  const g = group(parent, 19, 0, -28), wood = mat('#aa9470');
  for (const x of [-0.85, 0.85]) for (const z of [-0.4, 0.4]) add(g, G.box(0.075, 1.15, 0.075), wood, x, 0.575, z);
  add(g, G.box(2.25, 0.12, 1.25), wood, 0, 1.18, 0, { rot: [-0.1, 0, 0] });
  add(g, G.box(1.18, 0.035, 0.83), mat('#eee8d1'), -0.25, 1.29, 0, { rot: [-0.1, 0, 0] });
  for (const x of [0.56, 0.64, 0.72]) add(g, G.cyl(0.018, 0.018, 0.65, 5), mat('#8d7a57'), x, 1.34, 0.15,
    { rot: [Math.PI / 2, 0.22, 0] });
  const complete = dynamic(group(g, -0.25, 0, 0), false);
  const texture = canvasTex(640, 448, (c, W, H) => {
    c.fillStyle = '#f6edd5'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#777e67'; c.lineWidth = 4;
    c.strokeRect(26, 24, W - 52, H - 48);
    // 写真そのものを複写せず、旅先で描く三つの風景の小さな絵葉書。
    c.fillStyle = '#c1cbae'; c.fillRect(58, 75, 524, 257);
    c.fillStyle = '#e4d8ae'; c.fillRect(155, 176, 315, 126);
    c.fillStyle = '#7f8674'; c.beginPath(); c.moveTo(113, 179); c.lineTo(296, 108); c.lineTo(501, 179); c.closePath(); c.fill();
    c.fillStyle = '#8b9579'; c.fillRect(67, 306, 502, 15);
    c.fillStyle = '#5d6d57'; c.font = `700 35px ${FONT}`; c.textAlign = 'center'; c.fillText('田舎の旅だより', W / 2, 390);
  });
  add(complete, G.plane(1.15, 0.81), new THREE.MeshBasicMaterial({ map: texture }), 0, 1.318, 0,
    { rot: [-Math.PI / 2 - 0.1, 0, 0], cast: false });
  return { desk: g, complete };
}

export function buildSagaDiorama(scene) {
  const root = group(scene), R = { root };
  root.name = 'saga-wide-diorama';
  // モラージュ駐車場・家の庭を下から支える。施設の地表より低くし重なりを防ぐ。
  R.ground = add(root, G.plane(ISLAND.w, ISLAND.d), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }),
    0, -0.035, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  R.ground.userData.noPick = true;

  R.station = createSagaStation(root); R.station.root.position.set(-28, 0, 8); R.station.root.scale.setScalar(0.45);
  R.mallage = createMallageSaga(root); R.mallage.root.position.set(31, 0, 30); R.mallage.root.scale.setScalar(0.16);
  R.property = createKawakuboProperty(root); R.property.root.position.set(22, 0, -45); R.property.root.scale.setScalar(0.95);

  // 回転後の実寸で区画へ収める。独立モデル内の比率は保ち、街の空地を使う。
  const placeSite = (model, x, z, w, d, ry) => {
    model.root.rotation.y = ry; model.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model.root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const scale = Math.min(w / size.x, d / size.z);
    model.root.scale.setScalar(scale); model.root.position.set(x - c.x * scale, -box.min.y * scale, z - c.z * scale);
    return model;
  };
  R.roundone = placeSite(createRoundOneSaga(root), 61.5, -11.5, 27, 27, 0);
  R.yoshinogari = buildYoshinogari(root, { x: 61, z: -43 });
  R.ide = placeSite(createIdeChanpon(root), -42, -22, 19, 14, -Math.PI / 2);
  R.tadakane = placeSite(createTadakaneCompany(root), -18, -24, 13.2, 15, Math.PI / 2);
  R.cityLots = {
    yoshinogari: { x: [47.5, 74.5], z: [-55.5, -30.5] },
    roundone: { x: [48, 75], z: [-25, 2] }, ide: { x: [-51.5,-32.5], z: [-29,-15] }, tadakane: {x:[-24.6,-11.4],z:[-31.5,-16.5]},
  };

  const rural = group(root), water = waterize(mat(C.creek, { roughness: 0.33 }), { strength: 0.13, scale: 0.5 });
  creek(rural, -74, -73, -74, -36, 1.35, water);
  creek(rural, -53, -36, -53, -10, 1.35, water);
  creek(rural, -75, -36, -13, -36, 1.35, water, [[-54.0,-52.0],[-27.8,-26.4]]);
  creek(rural, 44, -69, 44, 10, 1.0, water, [[-26.8,-23.8]]);
  add(rural,G.box(4.0,.15,3.3),mat('#b1b7a0'),44,.045,-25.3);
  for(const z of [-26.85,-23.75])add(rural,G.box(3.95,.45,.09),mat('#8b9c88'),44,.36,z);
  // 北西の田園を横断する小橋。住宅を囲む広場は設けない。
  for (const [x,z,ry] of [[-53,-12.5,Math.PI/2]]) {
    const bridge = noPick(group(rural,x,0,z,ry));
    add(bridge,G.box(3.2,0.16,3.1),mat('#b5b7a0'),0,0.06,0);
    for(const side of [-1,1]){add(bridge,G.box(0.1,0.55,3.0),mat('#9aab93'),side*1.5,0.4,0);}
  }
  R.rice = riceDetails(rural);
  R.waterOn = dynamic(group(root), false);
  creek(R.waterOn, -38, -36, -26.9, -36, 0.78, water);
  creek(R.waterOn, -27.1, -35.9, -27.1, -14.3, 0.58, water);
  R.sluice = makeSluice(root);

  // 背景は低い住宅と普通の店舗だけ。3つの必須建築に架空のランドマークを足さない。
  const town = group(root); R.town = town;
  const buildings = [
    [-69,5,6.1,7.0,4.4,12],[-70,20,7.0,5.5,3.8,13],
    [-70,41,5.8,6.2,4.4,14],[-70,56,5.3,6.1,3.6,15],[-4,-63,4.4,5.0,3.6,19],
    [-4,-48,4.4,5.8,4.0,20],[-4,-37,4.7,5.5,3.4,21],
    [57,-74,5.2,5.0,3.6,22],[70,-74,6.0,5.1,3.8,23],[-73,65,5.0,5.4,4.0,24],
    [-50,63,5.0,5.0,3.2,28],[-21,64,4.5,5.2,3.6,29],
    [16,-18,6.0,5.2,2.4,30],[28,-18,6.8,5.0,2.3,31],[36,-18,4.0,4.6,2.2,32],
    [15,-4,5.8,5.0,2.2,33],[25,-4,6.2,5.0,2.3,34],[36,-4,5.6,5.0,2.3,35],
  ];
  buildings.forEach(([x,z,w,d,h,seed])=>plainHouse(town,x,z,w,d,h,seed,seed%3===0?Math.PI/2:0));
  const quarter = buildStreetQuarter(root); R.streetQuarter = quarter.root; R.streetScenes = quarter.scenes;
  R.northwestLots = {
    amandi:{center:new THREE.Vector3(-52,0,-60),w:35,d:24},
    bistro:{center:new THREE.Vector3(-22,0,-52),w:18,d:14},
  };
  for (const [x,z] of [[-55,25.8],[-42,26.0],[-24,26.5],[-5,25.8],[-56,36.5],[-56,49],[-56,60],
    [-5,38],[-5,52],[-5,64],[5.5,52],[5.5,65],[59,25],[59,42],
    [-75,-69],[-76,-14],[-10,-73],[1,-72],[40,-68],[40,-57],[74,50]]) tree(root,x,z,Math.round((x+80)*99+z),0.75+(Math.abs(z)%3)*0.06);
  // 新しい施設への道端も、小さな生活の景色でつなぐ。
  for (const [x,z] of [[-31,-20],[-29,-25],[-8,-19],[7,-26.8],[39,-24],[41,5]]) flowerBox(root,x,z,1.7,Math.round(x*73+z));
  for (const [x,z] of [[11,-15],[24,-14],[34,-14],[12,-.6],[30,-.6],[73,-28]]) flowerBox(root,x,z,1.5,Math.round(2700+x*19+z));
  bench(root,31,-8);
  bench(root,-30,-18,Math.PI/2); bench(root,-10,-15,-Math.PI/2);
  for(const [x,z] of [[7,-20],[7,-8],[-31,-14],[-9,-33]]) tree(root,x,z,Math.round(1000+x*19+z),.66);
  // 西側道路の白い欄干と街灯は主な建築の前へ置かない。
  for (const [x,z] of [[-57,26],[-4,27],[-5.2,43],[-5.2,60],[57.5,48],[57.5,64]]) {
    const pole=noPick(group(root,x,0,z));
    add(pole,G.cyl(0.055,0.08,4.8,8),mat('#829381'),0,2.4,0);
    rod(pole,[0,4.7,0],[0.75,4.9,0],0.045,mat('#829381'));
    add(pole,G.box(0.8,0.12,0.32),mat('#e5e6cf'),0.75,4.85,0);
  }

  R.busStop = busStop(root);
  R.marketBoard = group(root,35.4,0,41.0);
  for(const x of [-0.9,0.9])for(const z of [-0.32,0.32])add(R.marketBoard,G.box(0.07,0.9,0.07),mat(C.wood),x,0.45,z);
  add(R.marketBoard,G.box(2.3,0.12,1.0),mat('#c2ab7b'),0,0.95,0);
  const baskets=mat('#8f9471');
  for(const x of [-0.72,0,0.72]){add(R.marketBoard,G.box(0.58,0.25,0.65),baskets,x,1.12,0);for(let i=0;i<3;i++)add(R.marketBoard,G.sphere(0.12,7,5),mat(['#c18c65','#c8b775','#809d6a'][i]),x+(i-1)*0.13,1.31,0);}
  R.balloonPad = makeBalloonPad(root); R.balloon = makeBalloon(root);
  const sketch = makeSketchDesk(root); R.sketchDesk=sketch.desk;R.sketchComplete=sketch.complete;
  R.marketFlags = dynamic(group(root), false);
  for(const [x,z] of [[33.0,42.5],[37.5,42.0]]){
    const f=group(R.marketFlags,x,0,z);add(f,G.cyl(0.025,0.025,2.6,6),mat('#9a9d7c'),0,1.3,0);
    add(f,G.box(0.65,1.5,0.025),mat(x<35?'#b9a77a':'#80a58d'),0.35,1.7,0);
  }
  R.bus = makeBus(root);
  R.npcPlaces = {
    station: new THREE.Vector3(-30.5,0,24.0), magpie:new THREE.Vector3(15.8,0,-28.1),
    rabbit:new THREE.Vector3(31.5,0,41.8), crane:new THREE.Vector3(-42.1,0,-32.4),
    momonga:new THREE.Vector3(-42.5,0,53.4),
  };
  root.updateMatrixWorld(true);
  return R;
}
