import * as THREE from 'three';
import { pixTex, pixMat, pixText, Pix } from '../../lib/pixel.js';
import { add, group, rng } from '../../lib/util.js';
import { lightPool } from '../../lib/livefx.js';

// ---------------------------------------------------------------
// 勇者の城下町（HD-2D 風）
// 島は x[-22.5,22.5] z[-16.5,16.5]（ほかの街の約1.5倍）。
//  ・奥：丘の上のお城（天守のバルコニーに王様）
//  ・線路（z=-6）：左に駅。右で町の城壁の門をくぐり、お堀の跳ね橋をわたる
//  ・まん中：噴水の広場と市場
//  ・左：宿屋・ギルド（酒場）・教会　右：鍛冶屋・道具屋・竜舎
// 建物はふつうの立体、表面はぜんぶドット絵（にじまない）のテクスチャ。
// ---------------------------------------------------------------

export const TRACK_Z = -6.0;
export const HILL = 2.6;
export const ISLAND = { w: 45, d: 33 };

// ---------------- ドット絵のタイル ----------------
const T = {
  brick: () => pixTex('brick', 32, 32, (p) => {
    p.rect(0, 0, 32, 32, '#6a6a7a');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const x = c * 11 + (r % 2 ? 5 : 0), y = r * 8;
      const tone = ['#9a9aa8', '#a4a2b0', '#8e8e9e'][(r + c) % 3];
      for (let k = -1; k <= 0; k++) {
        const xx = x + k * 33;
        p.rect(xx + 1, y + 1, 10, 6, tone);
        p.rect(xx + 1, y + 1, 10, 1, '#bcbcca');
        p.rect(xx + 1, y + 6, 10, 1, '#7e7e8e');
      }
    }
  }, [0.5, 0.5]),
  plaster: () => pixTex('plaster', 16, 16, (p) => {
    const r = rng(3);
    p.rect(0, 0, 16, 16, '#f2e6c8');
    for (let i = 0; i < 14; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? '#e4d4b0' : '#fbf2dc');
  }),
  wood: () => pixTex('wood', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#6a4428');
    for (let i = 0; i < 4; i++) p.rect(0, i * 4 + 1, 16, 1, '#5a3820');
    p.px(4, 2, '#7a5434'); p.px(11, 10, '#7a5434');
  }),
  planks: () => pixTex('planks', 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#b08050');
    for (let i = 0; i < 4; i++) { p.rect(i * 4, 0, 1, 16, '#80583a'); p.px(i * 4 + 2, (i * 5) % 16, '#c89a68'); }
  }),
  roof: (c, d, l) => pixTex(`roof${c}`, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, c);
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      p.rect(0, y + 3, 16, 1, d);
      for (let k = 0; k < 4; k++) {
        const x = k * 4 + (r % 2 ? 2 : 0);
        p.px(x % 16, y + 2, d); p.px((x + 1) % 16, y, l);
      }
    }
  }),
  cobble: () => pixTex('cobble', 32, 32, (p) => {
    const r = rng(7);
    p.rect(0, 0, 32, 32, '#7a7266');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = x * 8 + (y % 2 ? 4 : 0) + 4, cy = y * 8 + 4;
      const tone = ['#b8ae9c', '#aca290', '#c4baa6'][Math.floor(r() * 3)];
      for (const dx of [-32, 0]) {
        p.oval(cx + dx, cy, 3.5, 3.2, tone);
        p.px(cx + dx - 2, cy - 2, '#d8d0c0');
      }
    }
  }, [0.5, 0.5]),
  grass: () => pixTex('grass', 32, 32, (p) => {
    const r = rng(11);
    p.rect(0, 0, 32, 32, '#6aa84a');
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
      p.px(x, y, '#4e8a38'); p.px(x, y - 1, '#4e8a38');
    }
    for (let i = 0; i < 40; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), '#86c25a');
    for (let i = 0; i < 4; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), ['#f8f0a0', '#f8a8c8'][i % 2]);
  }, [0.5, 0.5]),
  dirt: () => pixTex('dirt', 32, 32, (p) => {
    const r = rng(13);
    p.rect(0, 0, 32, 32, '#c8a878');
    for (let i = 0; i < 60; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), r() > 0.5 ? '#b0905e' : '#dcc092');
  }, [0.5, 0.5]),
  water: () => pixTex('water', 32, 32, (p) => {
    const r = rng(17);
    p.rect(0, 0, 32, 32, '#3a78c8');
    for (let i = 0; i < 18; i++) { const x = Math.floor(r() * 30), y = Math.floor(r() * 32); p.rect(x, y, 3, 1, '#7ab8f0'); }
    for (let i = 0; i < 6; i++) p.px(Math.floor(r() * 32), Math.floor(r() * 32), '#e8f8ff');
  }, [0.5, 0.5]),
  hay: () => pixTex('hay', 16, 16, (p) => {
    const r = rng(19);
    p.rect(0, 0, 16, 16, '#e8c060');
    for (let i = 0; i < 30; i++) { const x = Math.floor(r() * 16), y = Math.floor(r() * 16); p.px(x, y, '#c8983a'); p.px(x + 1, y, '#f8dc88'); }
  }),
  leaves: () => pixTex('leaves', 16, 16, (p) => {
    const r = rng(23);
    p.rect(0, 0, 16, 16, '#4a9a3a');
    for (let i = 0; i < 26; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), r() > 0.5 ? '#3a7a2e' : '#6abc4a');
  }),
};

/** 窓（昼／夜の灯り） */
function windowTex(lit) {
  return pixTex(lit ? 'winLit' : 'win', 12, 14, (p) => {
    p.rect(0, 0, 12, 14, '#4a3020');
    p.rect(1, 1, 10, 12, lit ? '#ffd870' : '#5a88c8');
    if (!lit) { p.rect(2, 2, 3, 2, '#a8d0f0'); p.rect(7, 7, 2, 1, '#a8d0f0'); }
    else p.rect(2, 2, 4, 4, '#fff4c0');
    p.rect(5, 1, 2, 12, '#4a3020'); p.rect(1, 6, 10, 2, '#4a3020');
  });
}
const doorTex = () => pixTex('door', 12, 20, (p) => {
  p.rect(0, 0, 12, 20, '#3a2414');
  p.oval(6, 6, 5, 6, '#7a4a28'); p.rect(1, 6, 10, 14, '#7a4a28');
  for (let i = 0; i < 3; i++) p.rect(3 + i * 3, 2, 1, 18, '#5a3418');
  p.rect(1, 9, 10, 1, '#2a2a30'); p.rect(1, 15, 10, 1, '#2a2a30');
  p.px(9, 12, '#f0c840');
});

/** ドット絵のアイコン看板 */
export function iconTex(kind) {
  return pixTex(`icon-${kind}`, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#3a2418');
    p.rect(1, 1, 14, 14, '#f4e4c0');
    const k = '#1a1420';
    if (kind === 'inn') { // ベッド
      p.rect(3, 8, 10, 3, '#c83a3a'); p.rect(3, 7, 3, 2, '#ffffff'); p.rect(2, 6, 1, 7, '#6a4428'); p.rect(13, 8, 1, 5, '#6a4428'); p.rect(3, 11, 10, 1, '#6a4428');
      p.px(9, 3, k); p.px(10, 4, k); p.px(11, 3, k);
    } else if (kind === 'mug') {
      p.rect(4, 5, 6, 8, '#e8b040'); p.rect(4, 4, 6, 2, '#ffffff'); p.rect(10, 7, 2, 1, '#8a6a3a'); p.rect(11, 7, 1, 4, '#8a6a3a'); p.rect(10, 10, 2, 1, '#8a6a3a');
    } else if (kind === 'sword') {
      p.line(3, 12, 11, 4, '#c8d0dc'); p.line(4, 12, 12, 4, '#8a9ab0'); p.rect(3, 10, 4, 1, '#f0c840'); p.px(2, 13, '#6a4428');
      p.oval(11.5, 10.5, 3, 3.5, '#3a6ad0'); p.px(11, 10, '#f0c840');
    } else if (kind === 'potion') {
      p.rect(7, 2, 2, 3, '#a87a4a'); p.oval(8, 10, 4, 4, '#e83a6a'); p.rect(6, 4, 4, 2, '#c8e8f8'); p.px(6, 8, '#ffc8d8');
    } else if (kind === 'dragon') {
      p.oval(8, 9, 5, 4, '#e8603a'); p.tri(4, 6, 3, 2, 6, 5, '#f4e8c8'); p.tri(11, 6, 12, 2, 9, 5, '#f4e8c8'); p.px(6, 8, k); p.px(10, 8, k); p.rect(7, 11, 3, 1, k);
    } else if (kind === 'bell') {
      p.oval(8, 8, 4, 4, '#f0c840'); p.rect(4, 8, 9, 4, '#f0c840'); p.rect(3, 12, 11, 1, '#c8982a'); p.px(8, 13, '#8a6a1a'); p.px(8, 3, '#8a6a1a');
    }
  });
}

/** 王家の紋章（赤い旗に金のライオン） */
const crestTex = () => pixTex('crest', 16, 24, (p) => {
  p.rect(0, 0, 16, 24, '#b8283a');
  p.tri(0, 20, 16, 20, 8, 24, '#b8283a');
  p.rect(0, 0, 16, 1, '#f0c840');
  p.rect(1, 0, 1, 20, '#f0c840'); p.rect(14, 0, 1, 20, '#f0c840');
  p.disc(8, 10, 4.5, '#f0c840'); p.disc(8, 10, 2.5, '#d8a028');
  p.px(7, 9, '#5a2a1a'); p.px(9, 9, '#5a2a1a');
  p.tri(5, 3, 11, 3, 8, 6, '#f0c840');
});

// ---------------- ワールド単位の UV を持つ箱 ----------------
const _geo = new Map();
function wboxGeo(w, h, d) {
  const key = `${w},${h},${d}`;
  if (_geo.has(key)) return _geo.get(key);
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  _geo.set(key, g);
  return g;
}
function box(parent, w, h, d, material, x = 0, y = 0, z = 0, o = {}) {
  return add(parent, wboxGeo(w, h, d), material, x, y, z, o);
}
function plane(parent, w, d, material, x, y, z, ry = 0) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  const m = add(parent, g, material, x, y, z, { rot: [-Math.PI / 2, 0, ry], cast: false });
  return m;
}

const M = {};
function mats() {
  if (M.brick) return M;
  M.brick = pixMat(T.brick());
  M.plaster = pixMat(T.plaster());
  M.wood = pixMat(T.wood());
  M.planks = pixMat(T.planks());
  M.cobble = new THREE.MeshStandardMaterial({ map: T.cobble(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  M.dirt = new THREE.MeshStandardMaterial({ map: T.dirt(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  M.grass = new THREE.MeshStandardMaterial({ map: T.grass(), roughness: 1 });
  M.hay = pixMat(T.hay());
  M.leaves = pixMat(T.leaves());
  M.roofRed = pixMat(T.roof('#c8483a', '#8a2a22', '#e8705a'));
  M.roofBlue = pixMat(T.roof('#3a6ac8', '#22408a', '#6a9ae8'));
  M.roofGreen = pixMat(T.roof('#4a9a5a', '#2a6a3a', '#7ac88a'));
  M.roofBrown = pixMat(T.roof('#8a5a3a', '#5a3a22', '#b08058'));
  M.door = pixMat(doorTex());
  M.iron = new THREE.MeshStandardMaterial({ color: '#3a3a44', roughness: 0.6, metalness: 0.4 });
  M.gold = new THREE.MeshStandardMaterial({ color: '#f0c840', roughness: 0.4, metalness: 0.6 });
  return M;
}

/** 切妻屋根（棟は x 方向） */
function roof(parent, x, y, z, w, d, material, { pitch = 0.6, over = 0.3 } = {}) {
  const g = group(parent, x, y, z);
  const run = d / 2 + over;
  const len = run / Math.cos(pitch);
  for (const s of [-1, 1]) box(g, w + over * 2, 0.16, len, material, 0, Math.tan(pitch) * run / 2, s * run / 2, { rot: [s * pitch, 0, 0] });
  box(g, w + over * 2, 0.2, 0.24, M.wood, 0, Math.tan(pitch) * run + 0.04, 0);
  const sh = new THREE.Shape();
  sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, Math.tan(pitch) * (d / 2)); sh.lineTo(-d / 2, 0);
  const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
  for (const s of [-1, 1]) add(g, gg, M.plaster, s * (w / 2) - (s > 0 ? 0.1 : 0), 0, 0, { rot: [0, Math.PI / 2, 0] });
  return g;
}

/** 木組みの家（正面 +z）。窓は夜に灯る */
function house(R, parent, x, z, { w = 5, d = 4, floors = 2, roof: rm = 'roofRed', ry = 0, door = true, chimney = true, base = true } = {}) {
  const g = group(parent, x, 0, z, ry);
  const fh = 1.9;
  const H = floors * fh;
  if (base) box(g, w + 0.15, 0.45, d + 0.15, M.brick, 0, 0.225, 0);
  box(g, w, H, d, M.plaster, 0, 0.45 + H / 2, 0);
  // 木組み（柱・梁・すじかい）
  const beam = (bw, bh, bd, bx, by, bz, rz = 0) => box(g, bw, bh, bd, M.wood, bx, by, bz, { rot: [0, 0, rz], cast: false });
  for (const s of [-1, 1]) for (const k of [-1, 1]) beam(0.18, H, 0.18, s * (w / 2 - 0.04), 0.45 + H / 2, k * (d / 2 - 0.04));
  for (let f = 1; f <= floors; f++) {
    beam(w + 0.06, 0.16, 0.08, 0, 0.45 + f * fh - 0.08, d / 2 + 0.01);
    for (const s of [-1, 1]) box(g, 0.08, 0.16, d + 0.06, M.wood, s * (w / 2 + 0.01), 0.45 + f * fh - 0.08, 0, { cast: false });
  }
  if (floors > 1) {
    for (const s of [-1, 1]) beam(0.1, 1.9, 0.06, s * (w / 2 - 0.75), 0.45 + fh * 1.5, d / 2 + 0.02, s * 0.45);
    beam(0.12, fh, 0.08, 0, 0.45 + fh * 1.5, d / 2 + 0.02);
  }
  // 窓
  const winW = 0.75, winH = 0.88;
  const addWin = (wx, wy, wz, wry) => {
    const m = add(g, new THREE.PlaneGeometry(winW, winH), R.winMat, wx, wy, wz, { rot: [0, wry, 0], cast: false });
    // 窓枠の下の花箱
    const fb = group(g, wx, wy - winH / 2 - 0.1, wz, wry);
    box(fb, winW + 0.1, 0.14, 0.18, M.planks, 0, 0, 0.09);
    for (let i = 0; i < 3; i++) add(fb, new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: ['#e83a5a', '#f8d040', '#ffffff'][i], flatShading: true }), -0.25 + i * 0.25, 0.12, 0.1, { cast: false });
    return m;
  };
  for (let f = 0; f < floors; f++) {
    const wy = 0.45 + f * fh + fh * 0.55;
    const xs = f === 0 && door ? [-w / 2 + 0.9, w / 2 - 0.9] : [-w / 4 - 0.2, w / 4 + 0.2];
    for (const wx of xs) addWin(wx, wy, d / 2 + 0.01, 0);
    for (const s of [-1, 1]) addWin(s * (w / 2 + 0.01), wy, 0, s * Math.PI / 2);
  }
  if (door) {
    add(g, new THREE.PlaneGeometry(0.85, 1.42), M.door, 0, 0.45 + 0.71, d / 2 + 0.02, { cast: false });
    box(g, 1.2, 0.12, 0.5, M.wood, 0, 0.45 + 1.62, d / 2 + 0.2);
  }
  const rf = roof(g, 0, 0.45 + H, 0, w, d, M[rm], { pitch: 0.62, over: 0.35 });
  if (chimney) box(g, 0.5, 1.4, 0.5, M.brick, w / 2 - 0.9, 0.45 + H + 1.1, -d / 4);
  return { g, roof: rf, H: 0.45 + H };
}

/** 丸い塔（とんがり屋根） */
function tower(parent, x, y, z, r, h, roofMat, { flag = null } = {}) {
  const g = group(parent, x, y, z);
  const circ = 2 * Math.PI * r;
  const tex = T.brick().clone();
  tex.repeat.set(circ / 2, h / 2);
  tex.needsUpdate = true;
  add(g, new THREE.CylinderGeometry(r, r * 1.05, h, 18), pixMat(tex), 0, h / 2, 0);
  // 胸壁
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    box(g, 0.32, 0.4, 0.32, M.brick, Math.cos(a) * (r + 0.05), h + 0.2, Math.sin(a) * (r + 0.05), { rot: [0, -a, 0] });
  }
  const rt = roofMat.map.clone();
  rt.repeat.set(2 * Math.PI * (r + 0.3), r * 2.2);
  rt.needsUpdate = true;
  add(g, new THREE.ConeGeometry(r + 0.3, r * 2.2, 18), pixMat(rt), 0, h + 0.4 + r * 1.1, 0);
  // 細い窓
  for (const a of [0.4, 2.2, 4.1]) box(g, 0.18, 0.55, 0.06, new THREE.MeshStandardMaterial({ color: '#1a1a28' }), Math.sin(a) * r, h * 0.62, Math.cos(a) * r, { rot: [0, a, 0], cast: false });
  if (flag) {
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), M.iron, 0, h + 0.4 + r * 2.2 + 0.6, 0);
    const fl = add(g, new THREE.PlaneGeometry(0.8, 0.45), new THREE.MeshStandardMaterial({ color: flag, side: THREE.DoubleSide }), 0.4, h + 0.4 + r * 2.2 + 1.05, 0, { cast: false });
    fl.userData.keep = true;
    g.userData.flag = fl;
  }
  return g;
}

/** 胸壁つきの城壁（x 方向にのびる） */
function wall(parent, x0, x1, z, y, h, { th = 0.7, ry = 0 } = {}) {
  const g = group(parent, 0, 0, 0, ry);
  const len = x1 - x0;
  box(g, len, h, th, M.brick, (x0 + x1) / 2, y + h / 2, z);
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.9) box(g, 0.45, 0.42, th + 0.04, M.brick, x + 0.22, y + h + 0.21, z);
  return g;
}

/** 木（まるいドット絵の葉） */
function tree(parent, x, z, s = 1, seed = 1) {
  const r = rng(seed);
  const g = group(parent, x, 0, z);
  g.scale.setScalar(s);
  box(g, 0.32, 1.4, 0.32, M.wood, 0, 0.7, 0);
  for (let i = 0; i < 3; i++) box(g, 1.5 - i * 0.35 + r() * 0.2, 0.7, 1.5 - i * 0.35 + r() * 0.2, M.leaves, (r() - 0.5) * 0.2, 1.6 + i * 0.55, (r() - 0.5) * 0.2, { rot: [0, r(), 0] });
  return g;
}

/** たる・つぼ・宝箱（調べるとゴールドが出るものもある） */
function barrel(parent, x, z, s = 1) {
  const g = group(parent, x, 0, z);
  const tx = T.planks().clone(); tx.repeat.set(2, 1); tx.needsUpdate = true;
  add(g, new THREE.CylinderGeometry(0.32 * s, 0.28 * s, 0.75 * s, 12), pixMat(tx), 0, 0.375 * s, 0);
  for (const y of [0.15, 0.6]) add(g, new THREE.CylinderGeometry(0.33 * s, 0.33 * s, 0.05, 12), M.iron, 0, y * s, 0, { cast: false });
  return g;
}
function pot(parent, x, z, color = '#c8783a') {
  const g = group(parent, x, 0, z);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  add(g, new THREE.SphereGeometry(0.3, 8, 6), m, 0, 0.3, 0, { scale: [1, 1.1, 1] });
  add(g, new THREE.CylinderGeometry(0.15, 0.2, 0.18, 8), m, 0, 0.62, 0);
  return g;
}
function chest(parent, x, z, ry = 0) {
  const g = group(parent, x, 0, z, ry);
  box(g, 0.8, 0.45, 0.55, M.planks, 0, 0.225, 0);
  const lid = group(g, 0, 0.45, -0.275);
  lid.userData.dynamic = true;
  box(lid, 0.82, 0.2, 0.57, M.planks, 0, 0.1, 0.275);
  for (const xx of [-0.3, 0.3]) box(g, 0.08, 0.47, 0.57, M.gold, xx, 0.235, 0, { cast: false });
  box(g, 0.14, 0.14, 0.04, M.gold, 0, 0.36, 0.29, { cast: false });
  g.userData.lid = lid;
  return g;
}

/** 街灯（夜に灯る） */
function lamp(R, parent, x, z) {
  const g = group(parent, x, 0, z);
  add(g, new THREE.CylinderGeometry(0.05, 0.08, 2.4, 6), M.iron, 0, 1.2, 0);
  box(g, 0.34, 0.4, 0.34, R.lampMat, 0, 2.55, 0, { cast: false });
  add(g, new THREE.ConeGeometry(0.3, 0.25, 4), M.iron, 0, 2.88, 0, { rot: [0, Math.PI / 4, 0] });
  R.lampSpots.push([x, z]);
  return g;
}

/** ぶら下がりのアイコン看板 */
function hangSign(parent, x, y, z, kind, ry = 0) {
  const g = group(parent, x, y, z, ry);
  box(g, 0.9, 0.06, 0.06, M.iron, 0.45, 0.35, 0);
  const s = add(g, new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: iconTex(kind), side: THREE.DoubleSide, roughness: 1 }), 0.62, 0, 0, { rot: [0, Math.PI / 2, 0] });
  s.userData.keep = true;
  return g;
}

/** 市場の屋台 */
function stall(parent, x, z, color, goods) {
  const g = group(parent, x, 0, z);
  box(g, 2.0, 0.8, 0.9, M.planks, 0, 0.4, 0);
  for (const [px, pz] of [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]]) box(g, 0.08, 2.0, 0.08, M.wood, px, 1.0, pz);
  const aw = pixTex(`awn${color}`, 16, 8, (p) => { for (let i = 0; i < 8; i++) p.rect(i * 2, 0, 2, 8, i % 2 ? '#f8f4ea' : color); p.rect(0, 7, 16, 1, '#5a3a22'); });
  const am = pixMat(aw);
  box(g, 2.3, 0.08, 1.3, am, 0, 2.05, 0.1, { rot: [0.25, 0, 0] });
  goods.forEach((c, i) => add(g, new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: c, flatShading: true }), -0.7 + (i % 6) * 0.28, 0.92 + Math.floor(i / 6) * 0.12, -0.1 + Math.floor(i / 6) * 0.25, { cast: false }));
  return g;
}

export function buildHeroDiorama(scene) {
  mats();
  const root = group(scene);
  const R = { root, lampSpots: [], flags: [], goldSpots: {}, banners: [] };
  R.winMat = new THREE.MeshStandardMaterial({ map: windowTex(false), emissive: '#ffffff', emissiveMap: windowTex(true), emissiveIntensity: 0, roughness: 0.6 });
  R.lampMat = new THREE.MeshStandardMaterial({ color: '#f8e8b0', emissive: '#ffc860', emissiveIntensity: 0.2 });
  R.lampMat.userData.lamp = true;

  // ---------------- 地面 ----------------
  plane(root, 44.4, 32.4, M.grass, 0, 0.004, 0);
  // 大通り（線路の前）と広場、小道
  plane(root, 38.4, 3.2, M.cobble, -3.2, 0.012, -3.1);
  plane(root, 14.5, 9.4, M.cobble, 0.5, 0.013, 6.0);
  plane(root, 3.0, 11.2, M.cobble, 0.5, 0.014, 4.6);
  plane(root, 2.4, 12, M.dirt, -11.5, 0.011, 8.0);
  plane(root, 8, 2.2, M.dirt, -11.5, 0.012, 13.6);
  plane(root, 2.4, 13, M.dirt, 8.4, 0.011, 8.0);
  plane(root, 6.8, 2.0, M.dirt, 4.6, 0.012, 11.8);

  // ---------------- 駅（ホーム） ----------------
  box(root, 11.5, 0.75, 2.3, M.brick, -12.6, 0.375, -3.75);
  box(root, 11.6, 0.06, 0.3, new THREE.MeshStandardMaterial({ color: '#f4ecd8' }), -12.6, 0.78, -4.75, { cast: false });
  const st = group(root, -15.5, 0.75, -3.7);
  for (const [px, pz] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) box(st, 0.14, 2.2, 0.14, M.wood, px, 1.1, pz);
  box(st, 3.4, 0.14, 1.9, M.roofBlue, 0, 2.28, 0, { rot: [0.1, 0, 0] });
  box(st, 1.6, 0.4, 0.4, M.planks, 0, 0.42, 0.2);
  for (let i = 0; i < 3; i++) box(root, 1.5, 0.75 * (3 - i) / 3, 0.35, M.brick, -7.6, 0.75 * (3 - i) / 6, -2.42 + i * 0.35);
  const sign = (R.stationSign = group(root, -11.0, 0.75, -4.45));
  for (const s of [-1, 1]) box(sign, 0.1, 1.9, 0.1, M.wood, s * 1.0, 0.95, 0);
  add(sign, new THREE.PlaneGeometry(2.3, 0.6), new THREE.MeshStandardMaterial({ map: pixText('じょうかまち', { w: 96, h: 24, size: 14, bg: '#f4ecd8', fg: '#3a2418', border: '#7a4a28' }), roughness: 1 }), 0, 1.55, 0.06, { cast: false });
  add(sign, new THREE.PlaneGeometry(2.3, 0.3), new THREE.MeshStandardMaterial({ map: pixText('←しおのみなと　まおうじょう→', { w: 140, h: 12, size: 10, bg: '#3a6ac8', fg: '#ffffff', border: '#22408a' }), roughness: 1 }), 0, 1.12, 0.06, { cast: false });

  // ---------------- 丘の上のお城 ----------------
  const hillTop = M.grass.clone();
  box(root, 28, HILL, 7.6, [M.brick, M.brick, hillTop, M.brick, M.brick, M.brick], 0, HILL / 2, -12.4);
  const castle = (R.castle = group(root));
  wall(castle, -12.6, 2.2, -9.0, HILL, 1.6);
  wall(castle, 3.8, 12.6, -9.0, HILL, 1.6);
  wall(castle, -12.6, 12.6, -15.9, HILL, 1.6);
  for (const s of [-1, 1]) {
    const sw = group(castle, s * 13.0, 0, -12.45, Math.PI / 2);
    wall(sw, -3.4, 3.4, 0, HILL, 1.6);
  }
  // 城門（丘の上）
  box(castle, 0.5, 2.4, 0.9, M.brick, 1.95, HILL + 1.2, -9.0);
  box(castle, 0.5, 2.4, 0.9, M.brick, 4.05, HILL + 1.2, -9.0);
  box(castle, 2.6, 0.5, 0.9, M.brick, 3.0, HILL + 2.35, -9.0);
  // 天守
  const keep = (R.keep = group(castle, 0, HILL, -12.8));
  box(keep, 8.4, 6.6, 4.6, M.brick, 0, 3.3, 0);
  for (let x = -4.0; x <= 4.0; x += 0.9) for (const z of [-2.3, 2.3]) box(keep, 0.42, 0.45, 0.42, M.brick, x, 6.82, z);
  for (let z = -1.6; z <= 1.6; z += 0.9) for (const x of [-4.2, 4.2]) box(keep, 0.42, 0.45, 0.42, M.brick, x, 6.82, z);
  // 天守の窓（夜に灯る）
  for (const x of [-2.8, 2.8]) for (const y of [2.0, 4.6]) add(keep, new THREE.PlaneGeometry(0.7, 1.0), R.winMat, x, y, 2.31, { cast: false });
  // 王家の旗
  for (const x of [-1.6, 1.6]) {
    const b = add(keep, new THREE.PlaneGeometry(1.0, 1.5), pixMat(crestTex(), { side: THREE.DoubleSide }), x, 4.7, 2.33, { cast: false });
    R.banners.push(b);
  }
  // バルコニー（王様が立つ）
  const bal = (R.balcony = group(keep, 0, 3.1, 2.3));
  box(bal, 3.0, 0.22, 1.5, M.brick, 0, 0, 0.75);
  for (let x = -1.4; x <= 1.41; x += 0.35) box(bal, 0.1, 0.55, 0.1, M.brick, x, 0.38, 1.45);
  box(bal, 3.0, 0.1, 0.16, M.brick, 0, 0.68, 1.45);
  add(keep, new THREE.PlaneGeometry(1.2, 1.7), M.door, 0, 3.95, 2.32, { cast: false });
  add(bal, new THREE.PlaneGeometry(3.0, 0.5), pixMat(pixTex('balcloth', 16, 4, (p) => { p.rect(0, 0, 16, 4, '#b8283a'); p.rect(0, 0, 16, 1, '#f0c840'); for (let i = 0; i < 4; i++) p.px(2 + i * 4, 2, '#f0c840'); })), 0, -0.3, 1.54, { cast: false });
  // 中央の高い塔と、四すみの塔
  R.flags.push(tower(castle, 0, HILL + 6.6, -13.6, 1.5, 3.4, M.roofBlue, { flag: '#c83a3a' }).userData.flag);
  for (const [x, z, r, h] of [[-12.2, -15.2, 1.4, 6.0], [12.2, -15.2, 1.4, 6.0], [-13.0, -9.2, 1.1, 3.4], [13.0, -9.2, 1.1, 3.4]]) {
    const tw = tower(castle, x, HILL, z, r, h, M.roofBlue, { flag: h > 4 ? '#f0c840' : null });
    if (tw.userData.flag) R.flags.push(tw.userData.flag);
  }
  // 丘へのぼる石段（線路の奥、城壁にそって）
  const stairs = (R.stairs = group(root));
  for (let i = 0; i < 8; i++) {
    const h = HILL - (i * HILL) / 8;
    box(stairs, 0.7, h, 1.2, M.brick, 3.4 + i * 0.7, h / 2, -8.0);
  }

  // ---------------- 町の城壁・城門・お堀・跳ね橋（右） ----------------
  const tw = group(root);
  const wallSeg = (z0, z1) => { const g2 = group(tw, 16.3, 0, (z0 + z1) / 2, Math.PI / 2); wall(g2, -(z1 - z0) / 2, (z1 - z0) / 2, 0, 0, 2.6, { th: 0.8 }); };
  wallSeg(-16.0, -8.6);
  wallSeg(-3.4, 16.0);
  R.gate = group(root, 16.3, 0, TRACK_Z);
  for (const s of [-1, 1]) tower(R.gate, 0, 0, s * 2.35, 1.1, 4.0, M.roofRed, { flag: s > 0 ? '#3a6ac8' : null });
  box(R.gate, 1.0, 1.4, 3.6, M.brick, 0, 3.3, 0);
  for (let z = -1.6; z <= 1.6; z += 0.8) box(R.gate, 1.04, 0.42, 0.4, M.brick, 0, 4.2, z);
  add(R.gate, new THREE.PlaneGeometry(0.9, 1.3), pixMat(crestTex(), { side: THREE.DoubleSide }), -0.52, 3.2, 0, { rot: [0, -Math.PI / 2, 0], cast: false });
  // お堀
  R.waterTex = T.water().clone();
  R.waterTex.repeat.set(0.5, 0.5);
  R.waterTex.needsUpdate = true;
  plane(root, 2.8, 32.6, new THREE.MeshStandardMaterial({ map: R.waterTex, roughness: 0.2, metalness: 0.1 }), 18.4, 0.05, 0);
  for (const x of [16.95, 19.85]) box(root, 0.3, 0.18, 32.6, M.brick, x, 0.09, 0);
  // 跳ね橋（ちょうつがいは x=17.0。上がっていると門の前で立っている）
  R.drawbridge = group(root, 17.0, 0.18, TRACK_Z);
  R.drawbridge.userData.dynamic = true;
  box(R.drawbridge, 2.9, 0.18, 2.6, M.planks, 1.45, 0, 0);
  for (const s of [-1, 1]) box(R.drawbridge, 2.9, 0.12, 0.1, new THREE.MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.7, roughness: 0.35 }), 1.45, 0.15, s * 0.55, { cast: false });
  for (const s of [-1, 1]) box(R.drawbridge, 2.9, 0.08, 0.1, M.iron, 1.45, 0.1, s * 1.25, { cast: false });
  // 鎖
  R.chains = [];
  for (const s of [-1, 1]) {
    const c = add(root, new THREE.CylinderGeometry(0.04, 0.04, 1, 5), M.iron, 0, 0, 0, { cast: false });
    c.userData.dynamic = true;
    R.chains.push({ m: c, s });
  }

  // ---------------- 宿屋・ギルド・教会（左） ----------------
  const inn = house(R, root, -17.2, 2.3, { w: 7, d: 4.6, floors: 2, roof: 'roofRed' });
  R.inn = inn.g;
  hangSign(inn.g, 3.6, 2.6, 2.4, 'inn');
  add(inn.g, new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: pixText('INN', { w: 32, h: 8, size: 8, bg: '#3a2418', fg: '#f4dc8a' }), roughness: 1 }), 0, 2.45, 2.35, { cast: false });
  const guild = house(R, root, -17.2, 10.4, { w: 7, d: 5.0, floors: 2, roof: 'roofBlue' });
  R.guild = guild.g;
  hangSign(guild.g, 3.6, 2.6, 2.6, 'mug');
  add(guild.g, new THREE.PlaneGeometry(2.2, 0.4), new THREE.MeshStandardMaterial({ map: pixText('GUILD', { w: 44, h: 8, size: 8, bg: '#3a2418', fg: '#f4dc8a' }), roughness: 1 }), 0, 2.45, 2.55, { cast: false });
  // 掲示板
  const board = (R.board = group(root, -12.6, 0, 13.4, -0.4));
  for (const s of [-1, 1]) box(board, 0.12, 1.8, 0.12, M.wood, s * 0.7, 0.9, 0);
  box(board, 1.6, 1.0, 0.08, M.planks, 0, 1.35, 0.02);
  for (let i = 0; i < 4; i++) add(board, new THREE.PlaneGeometry(0.34, 0.4), new THREE.MeshStandardMaterial({ color: ['#f4ecd8', '#f8e8a8', '#e8f0f8', '#f8d8d8'][i] }), -0.52 + i * 0.35, 1.35 + (i % 2) * 0.08, 0.07, { rot: [0, 0, (i - 1.5) * 0.08], cast: false });
  // 教会（鐘楼つき）
  const ch = (R.church = group(root, -8.4, 0, 13.4));
  box(ch, 5.2, 0.4, 4.4, M.brick, 0, 0.2, 0);
  box(ch, 5.0, 3.8, 4.2, M.plaster, 0, 2.3, 0);
  roof(ch, 0, 4.2, 0, 5.0, 4.2, M.roofBlue, { pitch: 0.75, over: 0.3 });
  add(ch, new THREE.PlaneGeometry(1.0, 1.7), M.door, 0, 1.25, 2.12, { cast: false });
  // ステンドグラスの丸窓
  R.glassTex = pixTex('glass', 16, 16, (p) => {
    p.disc(8, 8, 8, '#3a2a20');
    const cs = ['#e84a5a', '#4a8ae8', '#f8d040', '#5ac86a', '#b85ae8', '#f89a3a'];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.tri(8, 8, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 8 + Math.cos(a + 1.05) * 7, 8 + Math.sin(a + 1.05) * 7, cs[i]); }
    p.disc(8, 8, 2, '#f8f0d0');
  });
  R.glassMat = new THREE.MeshStandardMaterial({ map: R.glassTex, emissive: '#ffffff', emissiveMap: R.glassTex, emissiveIntensity: 0.3, alphaTest: 0.5 });
  add(ch, new THREE.CircleGeometry(0.8, 20), R.glassMat, 0, 3.0, 2.13, { cast: false });
  const bt = group(ch, -2.0, 0, -0.6);
  box(bt, 1.5, 6.0, 1.5, M.plaster, 0, 3.0, 0);
  box(bt, 1.6, 0.16, 1.6, M.wood, 0, 4.6, 0);
  R.churchBell = add(bt, new THREE.CylinderGeometry(0.25, 0.4, 0.5, 10), M.gold, 0, 5.3, 0);
  for (const [x, z] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) box(bt, 0.2, 1.4, 0.2, M.plaster, x, 5.3, z);
  const btRoof = M.roofBlue.map.clone(); btRoof.repeat.set(4, 1.6); btRoof.needsUpdate = true;
  add(bt, new THREE.ConeGeometry(1.25, 1.8, 4), pixMat(btRoof), 0, 6.9, 0, { rot: [0, Math.PI / 4, 0] });
  hangSign(ch, 2.6, 2.4, 2.2, 'bell');
  // 昼だけ、ステンドグラスの色の光が地面に落ちる
  R.glassLight = [
    lightPool(root, -8.4, 0.03, 16.0, 1.4, 1.0, '#e84a5a'),
    lightPool(root, -7.6, 0.03, 16.0, 1.2, 1.0, '#4a8ae8'),
    lightPool(root, -9.2, 0.03, 16.0, 1.2, 1.0, '#f8d040'),
  ];
  // 教会の庭（夜に月光草がさく）
  const garden = (R.garden = group(root, -4.9, 0, 15.2));
  for (let i = 0; i < 7; i++) box(garden, 0.1, 0.5, 0.1, M.wood, -1.2 + i * 0.4, 0.25, -0.7);
  box(garden, 2.6, 0.06, 0.06, M.wood, 0, 0.42, -0.7, { cast: false });
  for (let i = 0; i < 6; i++) add(garden, new THREE.ConeGeometry(0.08, 0.35, 4), new THREE.MeshStandardMaterial({ color: '#3a7a3a', flatShading: true }), -0.9 + i * 0.35, 0.18, (i % 2) * 0.3);
  R.moonflower = group(garden);
  R.moonflower.userData.dynamic = true;
  R.flowerMat = new THREE.MeshStandardMaterial({ color: '#e8f0ff', emissive: '#9ad0ff', emissiveIntensity: 1.8 });
  for (let i = 0; i < 5; i++) add(R.moonflower, new THREE.IcosahedronGeometry(0.12, 0), R.flowerMat, -0.8 + i * 0.4, 0.42, (i % 2) * 0.3, { cast: false });

  // ---------------- 鍛冶屋・道具屋・竜舎（右） ----------------
  // 鍛冶屋（正面が開いていて、炉が見える）
  const sm = (R.smithy = group(root, 11.2, 0, 2.3));
  box(sm, 6.2, 0.35, 5.0, M.brick, 0, 0.175, 0);
  box(sm, 6.0, 3.4, 0.4, M.brick, 0, 2.05, -2.3);
  for (const s of [-1, 1]) box(sm, 0.4, 3.4, 4.6, M.brick, s * 2.8, 2.05, 0);
  box(sm, 6.2, 0.3, 0.3, M.wood, 0, 3.6, 2.35);
  for (const s of [-1, 1]) box(sm, 0.3, 3.4, 0.3, M.wood, s * 2.85, 2.05, 2.35);
  roof(sm, 0, 3.75, 0, 6.0, 5.0, M.roofBrown, { pitch: 0.5, over: 0.3 });
  box(sm, 0.9, 2.6, 0.9, M.brick, 1.8, 5.0, -1.5);
  hangSign(sm, -3.1, 2.6, 2.5, 'sword', Math.PI);
  // 炉
  const forge = group(sm, -1.3, 0.35, -1.2);
  box(forge, 2.0, 1.5, 1.4, M.brick, 0, 0.75, 0);
  box(forge, 1.4, 1.2, 0.5, M.brick, 0, 2.0, -0.3);
  R.fireMat = new THREE.MeshStandardMaterial({ color: '#3a2a20', emissive: '#ff7a2a', emissiveIntensity: 0 });
  R.fireMat.userData.lamp = true;
  box(forge, 1.3, 0.45, 0.06, R.fireMat, 0, 1.05, 0.71, { cast: false });
  R.forgeLight = new THREE.PointLight('#ff8a3a', 0, 7, 1.6);
  R.forgeLight.position.set(-1.3, 1.6, -0.2);
  sm.add(R.forgeLight);
  // 金床・ふいご・水おけ
  const anvil = group(sm, 1.0, 0.35, 0.6);
  box(anvil, 0.5, 0.5, 0.4, M.iron, 0, 0.25, 0);
  box(anvil, 1.0, 0.3, 0.45, M.iron, 0, 0.62, 0);
  add(anvil, new THREE.ConeGeometry(0.22, 0.45, 6), M.iron, 0.68, 0.62, 0, { rot: [0, 0, -Math.PI / 2] });
  box(sm, 0.9, 0.35, 0.6, M.planks, -2.0, 0.55, 0.6, { rot: [0, 0.3, 0] });
  barrel(sm, 2.1, -0.8, 1.0);
  R.anvilSword = group(anvil, 0, 0.8, 0);
  R.anvilSword.userData.dynamic = true;
  box(R.anvilSword, 1.0, 0.04, 0.12, new THREE.MeshStandardMaterial({ color: '#e8f0fc', metalness: 0.8, roughness: 0.2 }), 0, 0, 0, { cast: false });
  box(R.anvilSword, 0.08, 0.06, 0.4, M.gold, -0.5, 0, 0, { cast: false });
  // 武器の棚
  for (let i = 0; i < 4; i++) box(sm, 0.06, 1.3, 0.12, new THREE.MeshStandardMaterial({ color: '#c8d0dc', metalness: 0.7, roughness: 0.3 }), 1.6 + i * 0.3, 1.6, -2.05, { rot: [0, 0, 0.05 * (i - 1.5)], cast: false });
  add(sm, new THREE.CircleGeometry(0.45, 12), new THREE.MeshStandardMaterial({ color: '#3a6ad0', metalness: 0.4 }), 2.2, 2.6, -2.08, { cast: false });

  // 道具屋（スライム）
  const shop = house(R, root, 11.4, 9.3, { w: 5.6, d: 4.4, floors: 1, roof: 'roofGreen', door: false, chimney: false });
  R.itemShop = shop.g;
  box(shop.g, 3.2, 0.9, 0.5, M.planks, -0.4, 0.9, 2.45);
  R.shutter = box(shop.g, 3.2, 1.3, 0.08, M.wood, -0.4, 2.0, 2.24);
  R.shutter.userData.keep = true;
  for (let i = 0; i < 5; i++) add(shop.g, new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8), new THREE.MeshStandardMaterial({ color: ['#e83a6a', '#3a8ae8', '#f8d040', '#5ac86a', '#b85ae8'][i], emissive: ['#e83a6a', '#3a8ae8', '#f8d040', '#5ac86a', '#b85ae8'][i], emissiveIntensity: 0.25 }), -1.6 + i * 0.6, 1.5, 2.55, { cast: false });
  hangSign(shop.g, 2.9, 2.0, 2.3, 'potion');
  // 竜舎（正面が開いている）
  const stb = (R.stable = group(root, 4.8, 0, 14.2));
  box(stb, 7.4, 0.2, 3.9, M.planks, 0, 0.1, 0);
  box(stb, 7.4, 2.8, 0.25, M.planks, 0, 1.6, -1.8);
  for (const s of [-1, 1]) box(stb, 0.25, 2.8, 3.8, M.planks, s * 3.6, 1.6, 0);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) box(stb, 0.25, 3.0, 0.25, M.wood, x, 1.5, 1.8);
  // 片流れの屋根（奥だけ。上から子ドラゴンが見えるように）
  box(stb, 7.9, 0.16, 2.6, M.roofBrown, 0, 3.15, -1.0, { rot: [-0.35, 0, 0] });
  box(stb, 7.4, 0.25, 0.25, M.wood, 0, 2.95, 1.8);
  box(stb, 3.0, 0.5, 1.2, M.hay, -1.8, 0.45, -1.0);
  box(stb, 1.2, 0.4, 1.0, M.hay, 2.4, 0.4, -1.1);
  hangSign(stb, 3.9, 2.6, 2.0, 'dragon');
  R.stableLetter = group(stb, 0.6, 0.25, -0.6);
  R.stableLetter.userData.dynamic = true;
  box(R.stableLetter, 0.36, 0.03, 0.26, new THREE.MeshStandardMaterial({ color: '#6a3a8a' }), 0, 0, 0, { rot: [0, 0.4, 0], cast: false });
  box(R.stableLetter, 0.1, 0.035, 0.1, new THREE.MeshStandardMaterial({ color: '#c8303a' }), 0, 0.01, 0, { cast: false });

  // ---------------- 家なみ ----------------
  house(R, root, -9.6, -0.3, { w: 4.2, d: 3.4, floors: 2, roof: 'roofGreen' });
  house(R, root, 4.2, -0.4, { w: 4.0, d: 3.4, floors: 2, roof: 'roofRed' });
  house(R, root, -2.6, 14.4, { w: 3.6, d: 3.0, floors: 1, roof: 'roofRed' });
  house(R, root, -21.0, -0.2 + 6.4, { w: 2.0, d: 3.0, floors: 1, roof: 'roofBrown', chimney: false, door: false, base: true }).g.rotation.y = Math.PI / 2;
  house(R, root, 20.9, 10.0, { w: 3.0, d: 2.4, floors: 1, roof: 'roofGreen', door: false, chimney: false });
  house(R, root, 20.9, -12.0, { w: 3.0, d: 2.4, floors: 1, roof: 'roofRed', door: false, chimney: false });
  house(R, root, -18.8, -12.0, { w: 5.0, d: 3.4, floors: 2, roof: 'roofBlue' });

  // ---------------- 広場：噴水と屋台 ----------------
  const ft = (R.fountain = group(root, 0.5, 0, 6.0));
  add(ft, new THREE.CylinderGeometry(2.1, 2.2, 0.55, 8), M.brick, 0, 0.275, 0);
  R.fountainWater = add(ft, new THREE.CylinderGeometry(1.85, 1.85, 0.05, 8), new THREE.MeshStandardMaterial({ map: R.waterTex, roughness: 0.15 }), 0, 0.57, 0, { cast: false });
  add(ft, new THREE.CylinderGeometry(0.35, 0.45, 1.6, 8), M.brick, 0, 1.1, 0);
  add(ft, new THREE.CylinderGeometry(0.9, 0.6, 0.25, 8), M.brick, 0, 1.9, 0);
  add(ft, new THREE.SphereGeometry(0.25, 8, 6), M.gold, 0, 2.2, 0);
  R.spray = add(ft, new THREE.ConeGeometry(0.85, 0.9, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#c8e8ff', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), 0, 1.75, 0, { rot: [Math.PI, 0, 0], cast: false });
  R.spray.userData.keep = true;
  stall(root, -4.6, 3.2, '#c83a3a', ['#e83a3a', '#e83a3a', '#f8d040', '#5ac86a', '#f89a3a', '#e83a3a', '#f8d040', '#5ac86a']);
  stall(root, 5.6, 3.4, '#3a6ac8', ['#a85ae8', '#a85ae8', '#5ac86a', '#5ac86a', '#f8f0d0', '#f89a3a']);
  stall(root, -4.6, 9.2, '#4a9a5a', ['#f8a8c8', '#f8f0a0', '#ffffff', '#f8a8c8', '#e83a5a', '#f8f0a0']);
  // ベンチ
  for (const [x, z, ry] of [[3.6, 9.4, 0], [-2.6, 9.6, 0]]) {
    const b = group(root, x, 0, z, ry);
    box(b, 1.6, 0.1, 0.45, M.planks, 0, 0.45, 0);
    box(b, 1.6, 0.4, 0.08, M.planks, 0, 0.75, -0.2);
    for (const s of [-1, 1]) box(b, 0.08, 0.45, 0.4, M.iron, s * 0.7, 0.22, 0);
  }

  // ---------------- 木・街灯・小物 ----------------
  [[-20.5, 13.8, 1.1], [-13.3, 6.4, 0.9], [7.5, -1.5, 0.8], [-6.8, -1.6, 0.8], [15.0, 13.0, 1.0], [1.5, 14.6, 0.9], [-21.0, -8.0, 1.0], [20.8, 4.5, 1.0], [20.8, 15.0, 0.9], [-21.2, 3.6, 0.8], [14.3, -1.2, 0.8]].forEach(([x, z, s], i) => tree(root, x, z, s, 30 + i));
  for (const [x, z] of [[-5.8, 1.6], [6.8, 1.6], [-5.8, 10.4], [6.8, 10.4], [-12.6, 4.8], [8.4, 5.4], [-12.0, -1.6], [2.0, -1.6], [14.4, 7.0]]) lamp(R, root, x, z);
  // ゴールドが出るかもしれない、たる・つぼ・宝箱
  R.goldSpots.innPot = pot(root, -13.3, 5.2, '#c8783a');
  R.goldSpots.smithBarrel = barrel(root, 14.6, 4.6);
  R.goldSpots.stableChest = chest(root, 7.6, 13.6, -0.3);
  R.goldSpots.churchCrate = group(root, -11.2, 0, 15.4);
  box(R.goldSpots.churchCrate, 0.7, 0.6, 0.7, M.planks, 0, 0.3, 0);
  R.goldSpots.stallPot = pot(root, -6.1, 2.6, '#8a6aa8');
  pot(root, -12.9, 5.6, '#a86a4a');
  barrel(root, 14.6, 5.4, 0.9);
  barrel(root, -13.6, 12.6, 1);
  barrel(root, -13.1, 13.0, 0.85);
  for (const [x, z] of [[2.0, 12.6], [2.5, 12.2], [-21.2, 9.5]]) box(root, 0.6, 0.55, 0.6, M.planks, x, 0.275, z, { rot: [0, x, 0] });
  // 井戸
  const well = (R.well = group(root, 8.4, 0, 6.6));
  add(well, new THREE.CylinderGeometry(0.6, 0.65, 0.7, 10), M.brick, 0, 0.35, 0);
  add(well, new THREE.CircleGeometry(0.5, 10), new THREE.MeshStandardMaterial({ color: '#1a2a3a' }), 0, 0.66, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
  for (const s of [-1, 1]) box(well, 0.12, 1.5, 0.12, M.wood, s * 0.6, 0.95, 0);
  roof(well, 0, 1.7, 0, 1.4, 1.2, M.roofRed, { pitch: 0.6, over: 0.15 });
  // 柵
  for (let i = 0; i < 9; i++) box(root, 0.1, 0.6, 0.1, M.wood, -22 + 0.1 + i * 0.6 + 6.2, 0.3, 16.0);

  // 夜の光だまり
  R.nightPools = R.lampSpots.map(([x, z]) => lightPool(root, x, 0.03, z, 2.6, 2.6, '#ffc070'));
  R.nightPools.push(lightPool(root, -17.2, 0.03, 13.6, 3.6, 2.0, '#ffb860'), lightPool(root, -17.2, 0.03, 5.4, 3.6, 2.0, '#ffb860'));
  return R;
}
