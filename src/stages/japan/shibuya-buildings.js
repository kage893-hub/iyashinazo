import * as THREE from 'three';
import { add, mat, G, group, canvasTex, FONT } from '../../lib/util.js';

// 渋谷を象徴する三つの外観を、既存の町の縮尺で作る。
// 座標は layout.js を掛ける前の値。模型の子の寸法は変えず、
// 瓦版屋・団子屋・呉服屋をたどる調べもののアンカーも保持する。
function label(R, text, {
  fg = '#ffffff', bg = '#222730', small = '', size = 100,
  w = 768, h = 256, intensity = 0.18,
} = {}) {
  const map = canvasTex(w, h, (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fg; ctx.font = `900 ${size}px ${FONT}`;
    ctx.fillText(text, W / 2, small ? H * 0.44 : H / 2, W * 0.92);
    if (small) {
      ctx.font = `700 ${Math.min(36, size * 0.35)}px ${FONT}`;
      ctx.fillText(small, W / 2, H * 0.81, W * 0.9);
    }
  });
  const m = new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: intensity,
    roughness: 0.55,
  });
  R.neonMats.push(m);
  return m;
}

function advertising(R, title, subtitle, bg, accent) {
  const map = canvasTex(512, 640, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(w * 0.74, h * 0.33, w * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.16;
    for (let i = 0; i < 7; i++) ctx.fillRect(0, h * 0.57 + i * 27, w, 9);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `900 68px ${FONT}`;
    title.split('\n').forEach((line, i) => ctx.fillText(line, 35, 105 + i * 83, w - 65));
    ctx.font = `700 26px ${FONT}`; ctx.fillText(subtitle, 35, h - 57, w - 65);
    ctx.fillRect(35, h - 101, 72, 5);
  });
  const m = new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.16, roughness: 0.65,
  });
  R.neonMats.push(m);
  return m;
}

function glassMaterial(R, color = '#3f6472') {
  const m = new THREE.MeshStandardMaterial({
    color, emissive: '#44564f', emissiveIntensity: 0,
    metalness: 0.08, roughness: 0.3,
  });
  R.winMats.push(m);
  return m;
}

// 大きなガラス面は窓ごとに明るさを分け、夜に白い一枚板へつぶれないようにする。
function curtainGlass(R) {
  const cols = 8, rows = 11;
  const panes = Array.from({ length: cols * rows }, (_, i) => ({
    on: (i * 17 + 13) % 11 < 6, blind: (i * 7 + 3) % 9 < 3,
  }));
  const draw = night => (ctx, w, h) => {
    ctx.fillStyle = night ? '#000000' : '#66858d'; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const p = panes[y * cols + x], px = x * cw + 1, py = y * ch + 1;
      if (night) {
        ctx.fillStyle = p.on ? ((x + y) % 3 ? '#a59576' : '#809ca3') : '#000000';
      } else {
        const gradient = ctx.createLinearGradient(px, py, px + cw, py + ch);
        gradient.addColorStop(0, '#9bafb3'); gradient.addColorStop(.5, '#4b7385'); gradient.addColorStop(1, '#3b596c');
        ctx.fillStyle = gradient;
      }
      ctx.fillRect(px, py, cw - 2, ch - 2);
      if (p.blind) {
        ctx.fillStyle = night ? 'rgba(0,0,0,.35)' : 'rgba(215,220,209,.32)';
        ctx.fillRect(px, py, cw - 2, ch * .45);
      }
    }
  };
  const map = canvasTex(256, 352, draw(false)), night = canvasTex(256, 352, draw(true));
  const material = new THREE.MeshStandardMaterial({ map, emissiveMap: night, emissive: '#ffffff',
    emissiveIntensity: 0, roughness: .35, metalness: .06 });
  R.winMats.push(material);
  return material;
}

function plate(parent, w, h, material, x, y, z, ry = 0) {
  return add(parent, G.plane(w, h), material, x, y, z, { rot: [0, ry, 0], cast: false });
}

function roofPlant(parent, x, y, z, metal) {
  add(parent, G.box(0.64, 0.35, 0.45), metal, x, y + 0.175, z);
  const vent = mat('#50575e');
  for (const dx of [-0.18, 0.18]) {
    add(parent, G.cyl(0.125, 0.125, 0.025, 16), vent,
      x + dx, y + 0.365, z, { cast: false });
  }
}

function build109(shib, R, metal, dark, glass) {
  const g = (R.shibuya109 = group(shib, -4.3, 0, -2.5));
  g.name = 'shibuya-109';
  const silver = mat('#cbd0d5', { roughness: 0.45, metalness: 0.18 });
  const silverShade = mat('#9ea9b3', { roughness: 0.55, metalness: 0.12 });
  add(g, G.cyl(1.22, 1.22, 8.7, 48), silver, 0, 4.35, 0);
  // 円筒の縦リブと水平の細い目地。冠まで丸い輪郭をつなぐ。
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI * 2 / 36;
    add(g, G.box(0.025, 7.4, 0.025), silverShade,
      Math.sin(a) * 1.227, 4.65, Math.cos(a) * 1.227, { cast: false });
  }
  for (let y = 1.5; y < 8.4; y += 0.82) {
    add(g, G.cyl(1.233, 1.233, 0.035, 48), silverShade, 0, y, 0, { cast: false });
  }
  add(g, G.cyl(1.24, 1.24, 0.16, 48), dark, 0, 8.77, 0);
  add(g, G.cyl(1.27, 1.27, 0.17, 48), silver, 0, 8.91, 0);
  add(g, G.torus(1.22, 0.05, 8, 48), silver, 0, 9.0, 0,
    { rot: [Math.PI / 2, 0, 0], cast: false });
  const logo = label(R, '109', {
    fg: '#e63c56', bg: '#f3f4f3', small: 'SHIBUYA', size: 164, h: 320,
  });
  // ロゴを横書きのまま円筒へ巻く。板を浮かせず、文字も円弧に沿う。
  add(g, new THREE.CylinderGeometry(1.242, 1.242, 1.13, 32, 1, true, -0.88, 1.76),
    logo, 0, 8.12, 0, { cast: false });
  const ad = advertising(R, 'NEW\nSTORIES', 'SHIBUYA / FASHION', '#b54166', '#e58e9f');
  add(g, new THREE.CylinderGeometry(1.242, 1.242, 2.65, 32, 1, true, -0.82, 1.64),
    ad, 0, 5.86, 0, { cast: false });
  add(g, new THREE.CylinderGeometry(1.244, 1.244, 1.2, 32, 1, true, -1.02, 2.04),
    glass, 0, 0.83, 0, { cast: false });
  for (const x of [-0.63, 0, 0.63]) {
    add(g, G.box(0.035, 1.25, 0.035), metal, x, 0.8,
      Math.sqrt(1.25 * 1.25 - x * x), { cast: false });
  }
  add(g, G.box(1.6, 0.1, 0.35), metal, 0, 1.52, 1.03);
  const entry = label(R, 'SHIBUYA109', { fg: '#f9faf8', bg: '#3a4048', size: 72 });
  plate(g, 1.55, 0.26, entry, 0, 1.7, 1.257);
  roofPlant(g, 0, 9.0, -0.42, metal);
  return g;
}

function buildQfront(shib, R, metal, dark, glass) {
  const g = (R.visionBldg = group(shib, -0.6, 0, -2.5));
  g.name = 'shibuya-qfront';
  const stone = mat('#d3d7d7');
  add(g, G.box(3.35, 8.8, 2.6), dark, 0, 4.4, 0);
  const curtain = curtainGlass(R);
  add(g, G.box(3.22, 7.25, 0.055), curtain, 0, 4.47, 1.326, { cast: false });
  // 左右にもガラスを回し、交差点の斜めから見たときに厚みを出す。
  for (const side of [-1, 1]) {
    add(g, G.box(0.045, 7.25, 2.42), curtain, side * 1.699, 4.47, 0, { cast: false });
    for (let z = -1.1; z <= 1.11; z += 0.55) {
      add(g, G.box(0.06, 7.3, 0.035), metal, side * 1.727, 4.47, z, { cast: false });
    }
  }
  for (let x = -1.5; x <= 1.51; x += 0.375) {
    add(g, G.box(0.028, 7.3, 0.065), metal, x, 4.47, 1.366, { cast: false });
  }
  for (let y = 1.18; y <= 7.81; y += 0.66) {
    add(g, G.box(3.36, 0.032, 2.68), metal, 0, y, 0, { cast: false });
  }
  // 大型ビジョンは旧 API をそのまま使い、謎と番組の演出を維持する。
  R.visionCanvas = document.createElement('canvas');
  R.visionCanvas.width = 512; R.visionCanvas.height = 320;
  R.visionTex = new THREE.CanvasTexture(R.visionCanvas);
  R.visionTex.colorSpace = THREE.SRGBColorSpace;
  R.visionMat = new THREE.MeshStandardMaterial({
    color: '#111111', emissive: '#ffffff', emissiveMap: R.visionTex,
    emissiveIntensity: 1, roughness: 0.4,
  });
  add(g, G.box(3.33, 2.13, 0.16), dark, 0, 5.66, 1.41);
  R.vision = plate(g, 3.2, 2.0, R.visionMat, 0, 5.66, 1.497);
  R.vision.name = 'qfront-live-vision';
  const tsutaya = label(R, 'TSUTAYA', { bg: '#173b55', size: 136 });
  plate(g, 3.18, 0.53, tsutaya, 0, 3.02, 1.416);
  const qfront = label(R, 'QFRONT', { fg: '#ebeeee', bg: '#29313a', size: 100 });
  add(g, G.box(3.47, 0.67, 2.73), dark, 0, 8.49, 0);
  plate(g, 2.94, 0.43, qfront, 0, 8.49, 1.375);
  // 駅側に開いた地上階。看板の下にも入口と細い庇が見える。
  add(g, G.box(3.13, 1.1, 0.055), glass, 0, 0.7, 1.36, { cast: false });
  for (const x of [-1.45, -0.7, 0, 0.7, 1.45]) {
    add(g, G.box(0.065, 1.3, 0.11), stone, x, 0.7, 1.405, { cast: false });
  }
  add(g, G.box(3.48, 0.12, 0.32), metal, 0, 1.48, 1.3);
  add(g, G.box(3.5, 0.12, 2.75), metal, 0, 8.88, 0);
  roofPlant(g, -0.77, 8.95, -0.42, metal);
  roofPlant(g, 0.63, 8.95, -0.42, metal);
  return g;
}

function buildRamen(shib, R, metal, dark, glass) {
  const g = (R.ramen = group(shib, 2.9, 0, -2.45));
  g.name = 'shibuya-ramen';
  const warmWall = mat('#ddcdb9');
  const brick = mat('#804f43');
  const red = mat('#b43c30');
  add(g, G.box(2.6, 4.25, 2.35), warmWall, 0, 2.125, -0.1);
  add(g, G.box(2.7, 0.14, 2.48), dark, 0, 4.34, -0.1);
  add(g, G.box(2.66, 1.16, 0.12), brick, 0, 3.4, 1.11);
  for (const x of [-0.73, 0.73]) {
    add(g, G.box(0.73, 0.63, 0.045), glass, x, 2.7, 1.09, { cast: false });
    add(g, G.box(0.84, 0.055, 0.12), metal, x, 2.35, 1.12, { cast: false });
  }
  const shop = label(R, 'ラーメン', { bg: '#b9342b', fg: '#fff6dd', size: 126 });
  plate(g, 2.36, 0.65, shop, 0, 3.43, 1.179);
  const warmGlass = new THREE.MeshStandardMaterial({
    color: '#a87f50', emissive: '#ffce84', emissiveIntensity: 0.3, roughness: 0.4,
  });
  R.lampMats.push(warmGlass);
  add(g, G.box(2.23, 1.7, 0.05), warmGlass, 0, 1.03, 1.099, { cast: false });
  for (const x of [-1.12, -0.55, 0.55, 1.12]) {
    add(g, G.box(0.065, 1.8, 0.07), dark, x, 1.05, 1.15, { cast: false });
  }
  add(g, G.box(2.76, 0.14, 0.5), red, 0, 2.13, 1.19, { rot: [0.14, 0, 0] });
  const curtain = label(R, '創業 団子のころより', {
    bg: '#242b39', fg: '#f3e5be', size: 58, h: 192, intensity: 0.05,
  });
  plate(g, 1.95, 0.4, curtain, 0, 1.78, 1.216);
  // 布の下端は短い切れ目をつけ、文字の領域を通さない。
  for (const x of [-0.6, 0, 0.6]) {
    add(g, G.box(0.018, 0.09, 0.016), dark, x, 1.615, 1.225, { cast: false });
  }
  const lantern = new THREE.MeshStandardMaterial({
    color: '#e34830', emissive: '#ff6940', emissiveIntensity: 0.3, roughness: 0.65,
  });
  R.lampMats.push(lantern);
  for (const side of [-1, 1]) {
    add(g, G.sphere(0.16, 20, 14), lantern, side * 1.21, 1.77, 1.22,
      { scale: [1, 1.4, 1], cast: false });
    for (const y of [1.53, 2.01]) {
      add(g, G.cyl(0.09, 0.09, 0.055, 12), dark, side * 1.21, y, 1.22, { cast: false });
    }
  }
  roofPlant(g, -0.55, 4.41, -0.5, metal);
  return g;
}

function buildMagnet(shib, R, metal, dark, glass) {
  const g = (R.fashion = R.magnet = group(shib, 6.6, 0, -2.5));
  g.name = 'shibuya-magnet';
  const wall = mat('#d4d5d2');
  const red = mat('#b92f3d', { roughness: 0.7 });
  add(g, G.box(3.2, 7.5, 2.65), wall, 0, 3.75, 0);
  add(g, G.box(0.67, 7.62, 0.15), red, -1.08, 3.81, 1.36);
  add(g, G.box(2.07, 2.18, 0.09), dark, 0.38, 5.66, 1.37);
  const ad = advertising(R, 'MAGNET', 'CULTURE / MUSIC / ART', '#252842', '#ae315b');
  plate(g, 1.97, 2.07, ad, 0.38, 5.66, 1.423);
  const mag = label(R, 'MAGNET', { bg: '#b92f3d', size: 116 });
  plate(g, 2.93, 0.5, mag, 0, 7.07, 1.411);
  // 縦の赤い面を残し、下層は商業施設らしいショーウィンドーにする。
  for (const y of [1.1, 2.35, 3.6]) {
    add(g, G.box(2.12, 0.85, 0.045), glass, 0.35, y, 1.358, { cast: false });
    add(g, G.box(2.22, 0.075, 0.14), metal, 0.35, y - 0.46, 1.38, { cast: false });
    for (const x of [-0.61, 0.35, 1.31]) {
      add(g, G.box(0.035, 0.85, 0.08), metal, x, y, 1.395, { cast: false });
    }
  }
  for (const side of [-1, 1]) {
    for (const y of [1.1, 2.35, 3.6, 4.85, 6.1]) {
      add(g, G.box(0.04, 0.77, 2.3), glass, side * 1.625, y, 0, { cast: false });
    }
  }
  add(g, G.box(3.35, 0.16, 2.8), metal, 0, 7.57, 0);
  add(g, G.box(2.96, 0.08, 2.43), dark, 0, 7.69, 0);
  // スクランブル交差点を見下ろす屋上の展望柵。
  for (const z of [-1.17, 1.17]) {
    for (let x = -1.43; x < 1.44; x += 0.286) {
      add(g, G.box(0.022, 0.63, 0.022), metal, x, 8.04, z, { cast: false });
    }
    add(g, G.box(2.9, 0.035, 0.035), metal, 0, 8.36, z, { cast: false });
  }
  for (const x of [-1.43, 1.43]) {
    for (let z = -0.88; z < 0.89; z += 0.293) {
      add(g, G.box(0.022, 0.63, 0.022), metal, x, 8.04, z, { cast: false });
    }
    add(g, G.box(0.035, 0.035, 2.36), metal, x, 8.36, 0, { cast: false });
  }
  const oldShop = label(R, '元・呉服 つる屋', {
    fg: '#3b2d25', bg: '#dbc7a1', size: 66, intensity: 0.05,
  });
  plate(g, 1.43, 0.29, oldShop, 0.42, 0.43, 1.435);
  return g;
}

function buildCenterGate(shib, R, metal) {
  const g = (R.centerGate = group(shib, -2.7, 0, 0.9));
  g.name = 'shibuya-center-gai-gate';
  for (const side of [-1, 1]) {
    add(g, G.cyl(0.065, 0.09, 3.82, 12), metal, 0, 1.91, side * 1.31);
    add(g, G.cyl(0.14, 0.14, 0.13, 12), metal, 0, 0.065, side * 1.31);
  }
  const red = mat('#a83f43');
  add(g, G.box(0.14, 0.58, 2.82), red, 0, 3.63, 0);
  const sign = label(R, 'センター街', { bg: '#a83f43', size: 116 });
  // 平面の法線を +X に向ける。長辺は柱と同じ Z 方向。
  plate(g, 2.62, 0.45, sign, 0.077, 3.63, 0, Math.PI / 2);
  plate(g, 2.62, 0.45, sign, -0.077, 3.63, 0, -Math.PI / 2);
  return g;
}

/** QFRONT・109・MAGNET を交差点の奥にまとめる。 */
export function buildShibuyaBuildings(root, R) {
  const shib = (R.shibuya = group(root));
  shib.name = 'shibuya-landmarks';
  const metal = mat('#a6b1bb', { roughness: 0.55, metalness: 0.15 });
  const dark = mat('#303844', { roughness: 0.72 });
  const glass = glassMaterial(R);
  build109(shib, R, metal, dark, glass);
  buildQfront(shib, R, metal, dark, glass);
  buildRamen(shib, R, metal, dark, glass);
  buildMagnet(shib, R, metal, dark, glass);
  buildCenterGate(shib, R, metal);
  return shib;
}
