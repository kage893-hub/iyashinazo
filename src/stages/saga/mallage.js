import * as THREE from 'three';
import { add, G, mat, group, canvasTex, FONT, rng } from '../../lib/util.js';

// モラージュ佐賀の北館・南館。+x が東、+z が南、1 unit ≒ 1 m。
// 公式2026年フロア図・アクセス図、類設計室の竣工写真、公開外観写真、
// 国土地理院航空写真を照合した形状。寸法は写真・地図からの概算。
// 資料の詳細と未確認面は docs/saga-mallage-references.md に記載する。
export const MALLAGE_SIZE = { w: 304, d: 300, h: 22.5 };
const C = {
  cream: '#e7dcaf', beige: '#e4d8b9', salmon: '#c98e75', peach: '#d7a78c',
  green: '#acc7a2', mint: '#cfdbc0', yellow: '#dbd9a4', white: '#f0eee5',
  red: '#a62f45', teal: '#008e71', roof: '#a9aca4', road: '#737a7b',
  frame: '#b2b7b0', glass: '#536e71', dark: '#39494a', line: '#eee9ce',
};
const basic = (texture) => new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
const box = (p, w, h, d, color, x, y, z, opt) => add(p, G.sharpBox(w, h, d), mat(color), x, y, z, opt);
const noPick = (g) => { g.traverse((o) => { o.userData.noPick = true; }); return g; };

function labelTex(text, bg, fg, { size = 140, serif = false, border = false, sub = '' } = {}) {
  return canvasTex(1024, 256, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (border) { c.strokeStyle = fg; c.lineWidth = 8; c.strokeRect(8, 8, W - 16, H - 16); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg;
    let fs = size; c.font = `900 ${fs}px ${serif ? 'Georgia, serif' : FONT}`;
    while (c.measureText(text).width > W * 0.91) { fs -= 2; c.font = `900 ${fs}px ${serif ? 'Georgia, serif' : FONT}`; }
    c.fillText(text, W / 2, sub ? H * 0.43 : H * 0.52);
    if (sub) { c.font = `600 36px ${FONT}`; c.fillText(sub, W / 2, H * 0.85); }
  });
}

function face(p, tex, w, h, x, y, z, ry = 0) {
  return add(p, G.plane(w, h), basic(tex), x, y, z, { rot: [0, ry, 0], cast: false });
}

function decal(p, tex, w, h, x, y, z, ry = 0) {
  return add(p, G.plane(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.01, toneMapped: false }),
    x, y, z, { rot: [0, ry, 0], cast: false });
}

function mallageLogo(bg = C.teal, fg = '#ffffff') {
  return canvasTex(1024, 512, (c, W, H) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
    else c.clearRect(0, 0, W, H);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    // 白い細長い小文字、アーチ、金色の丸という実物の構成を描き起こす。
    c.save(); c.translate(W / 2, H * 0.58); c.scale(0.88, 1.45);
    c.font = 'bold 205px Georgia, serif'; c.fillText('mallage', 0, 0); c.restore();
    c.strokeStyle = fg; c.lineWidth = 10; c.beginPath();
    c.ellipse(W * 0.50, H * 0.30, W * 0.19, H * 0.18, 0, Math.PI * 1.11, Math.PI * 1.89);
    c.stroke(); c.fillStyle = '#d8cf77'; c.beginPath(); c.arc(W * 0.5, H * 0.085, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = fg; c.font = `700 25px ${FONT}`; c.fillText('S A G A', W / 2, H * 0.91);
  });
}

function cinemaLogo() {
  return canvasTex(1536, 384, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.lineJoin = 'round'; c.textBaseline = 'middle';
    c.font = '900 280px Arial, sans-serif'; c.lineWidth = 17; c.strokeStyle = '#252b2f';
  const chars = [['1', '#d72b39', 15], ['0', '#dbb731', 120], ['9', '#2199c2', 290]];
    chars.forEach(([s, color, x]) => { c.strokeText(s, x, 185); c.fillStyle = color; c.fillText(s, x, 185); });
    c.font = '900 167px Arial, sans-serif'; c.strokeText('CINEMAS', 460, 185); c.fillStyle = '#be263c'; c.fillText('CINEMAS', 460, 185);
    c.fillStyle = '#172b41'; c.fillRect(14, 304, 361, 62); c.fillStyle = '#e9bf40';
    c.font = 'bold 45px Arial'; c.fillText('S A G A', 48, 340);
  });
}

function tenant(p, text, bg, fg, x, y, z, w, h, ry = 0, options) {
  const g = group(p, x, y, z, ry);
  box(g, w + 0.28, h + 0.28, 0.22, '#f5f0df', 0, 0, -0.04);
  face(g, labelTex(text, bg, fg, options), w, h, 0, 0, 0.09);
  return g;
}

function horizontalPanels(p, x, z, w, h, color, ry = 0) {
  const g = group(p, x, 0, z, ry);
  for (let y = 1; y < h; y += 1.1) box(g, w, 0.035, 0.04, color, 0, y, 0, { cast: false });
  for (let xx = -w / 2 + 5.7; xx < w / 2; xx += 5.7)
    box(g, 0.035, h, 0.04, color, xx, h / 2, 0, { cast: false });
  return g;
}

function glazing(p, x, z, width, height = 4.3, ry = 0) {
  const g = group(p, x, 0, z, ry);
  box(g, width, height, 0.16, C.glass, 0, height / 2 + 0.35, 0);
  for (let xx = -width / 2; xx <= width / 2 + 0.01; xx += width / Math.ceil(width / 1.4))
    box(g, 0.075, height + 0.15, 0.24, C.frame, xx, height / 2 + 0.35, 0.08);
  for (const yy of [0.36, 2.9, height + 0.35]) box(g, width, 0.07, 0.24, C.frame, 0, yy, 0.08);
  // ガラス内の反射帯。映り込む人物や車番は描かない。
  box(g, width - 0.1, 0.22, 0.03, '#879f9a', 0, height * 0.75, 0.14, { cast: false });
  return g;
}

function awning(p, x, z, w, color = C.red, ry = 0) {
  const g = group(p, x, 0, z, ry);
  box(g, w, 0.22, 2.7, color, 0, 5.0, 0.95, { rot: [-0.13, 0, 0] });
  box(g, w, 0.48, 0.1, color, 0, 4.72, 2.28);
  return g;
}

function archedEntrance(p, x, z, text) {
  const g = group(p, x, 0, z), w = 11.8, h = 11.2;
  const arch = new THREE.Shape();
  arch.moveTo(-w / 2, 0); arch.lineTo(w / 2, 0); arch.lineTo(w / 2, h - w / 2);
  arch.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); arch.closePath();
  add(g, new THREE.ShapeGeometry(arch, 28), mat('#806c50'), 0, 0.3, 0.06);
  const curve = new THREE.EllipseCurve(0, h - w / 2, w / 2, w / 2, 0, Math.PI, false);
  const points = curve.getPoints(28).map((v) => new THREE.Vector3(v.x, v.y, 0.15));
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, 0.23, 6, false), mat('#eee5cc'));
  for (const xx of [-w / 2, w / 2]) box(g, 0.46, h - w / 2, 0.7, '#eee5cc', xx, (h - w / 2) / 2, 0.15);
  glazing(g, 0, 0.27, 8.4, 4.6);
  face(g, labelTex(text, C.red, '#fff7e5', { serif: true }), 10.2, 2.0, 0, 6.7, 0.3);
  box(g, 12.4, 0.25, 3.3, '#e8dfc1', 0, 0.13, 1.2);
  return g;
}

function parkingLines(parent, bays, y = 0.08) {
  const lineGeo = G.sharpBox(0.1, 0.022, 4.9), crossGeo = G.sharpBox(2.45, 0.022, 0.1);
  const material = mat(C.line), transform = new THREE.Object3D();
  const lines = new THREE.InstancedMesh(lineGeo, material, bays.length * 2);
  const ends = new THREE.InstancedMesh(crossGeo, material, bays.length);
  bays.forEach(({ x, z, ry = 0 }, i) => {
    for (let side = 0; side < 2; side++) {
      const dx = (side ? 1 : -1) * 1.24;
      transform.position.set(x + dx * Math.cos(ry), y, z - dx * Math.sin(ry)); transform.rotation.set(0, ry, 0); transform.updateMatrix();
      lines.setMatrixAt(i * 2 + side, transform.matrix);
    }
    transform.position.set(x + 2.45 * Math.sin(ry), y, z + 2.45 * Math.cos(ry)); transform.rotation.set(0, ry, 0); transform.updateMatrix();
    ends.setMatrixAt(i, transform.matrix);
  });
  for (const mesh of [lines, ends]) { mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.noPick = true; parent.add(mesh); }
}

function parkedCars(parent, spaces, y = 0.1, seed = 816) {
  const rand = rng(seed), cars = spaces.filter(() => rand() > 0.44), n = cars.length;
  if (!n) return;
  const transform = new THREE.Object3D(), palette = ['#eeeae2', '#e6e4dc', '#7f8b8f', '#383f47', '#a2b7c1', '#d6b7af', '#ac3641'];
  const body = new THREE.InstancedMesh(G.box(1.65, 0.78, 3.72), mat('#ffffff'), n);
  const glass = new THREE.InstancedMesh(G.box(1.46, 0.65, 2.0), mat('#415a64'), n);
  const roof = new THREE.InstancedMesh(G.box(1.49, 0.1, 1.75), mat('#ffffff'), n);
  const tyres = new THREE.InstancedMesh(G.cyl(0.3, 0.3, 0.17, 10), mat('#303437'), n * 4);
  const headlamps = new THREE.InstancedMesh(G.box(0.4, 0.2, 0.05), mat('#ebe5be'), n * 2);
  const tail = new THREE.InstancedMesh(G.box(0.35, 0.2, 0.05), mat('#b73739'), n * 2);
  cars.forEach((car, i) => {
    const color = new THREE.Color(palette[Math.floor(rand() * palette.length)]), ry = car.ry || 0;
    const put = (mesh, index, x, yy, z, rx = 0, rz = 0) => {
      transform.position.set(car.x + Math.cos(ry) * x + Math.sin(ry) * z, y + yy, car.z - Math.sin(ry) * x + Math.cos(ry) * z);
      transform.rotation.set(rx, ry, rz); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
    };
    put(body, i, 0, 0.66, 0); body.setColorAt(i, color);
    put(glass, i, 0, 1.28, -0.12); put(roof, i, 0, 1.65, -0.12); roof.setColorAt(i, color);
    for (let k = 0; k < 4; k++) put(tyres, i * 4 + k, k % 2 ? 0.83 : -0.83, 0.33, k < 2 ? -1.17 : 1.17, 0, Math.PI / 2);
    for (let k = 0; k < 2; k++) { put(headlamps, i * 2 + k, k ? 0.52 : -0.52, 0.68, 1.89); put(tail, i * 2 + k, k ? 0.52 : -0.52, 0.7, -1.89); }
  });
  for (const mesh of [body, glass, roof, tyres, headlamps, tail]) {
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.noPick = true; parent.add(mesh);
  }
}

function parkingRow(spaces, x0, x1, z, step = 2.6, ry = 0) {
  for (let x = x0; x <= x1; x += step) spaces.push({ x, z, ry });
}

function railing(p, x, z, w, ry = 0, y = 12.5) {
  const g = group(p, x, y, z, ry);
  for (let xx = -w / 2; xx <= w / 2; xx += 3)
    box(g, 0.06, 1.2, 0.06, '#b9beb5', xx, 0.6, 0, { cast: false });
  for (const yy of [0.15, 0.65, 1.19]) box(g, w, 0.045, 0.045, '#b9beb5', 0, yy, 0, { cast: false });
  return g;
}

function pole(p, x, z, h = 7.4) {
  const g = group(p, x, 0, z);
  add(g, G.cyl(0.075, 0.12, h, 8), mat('#82908a'), 0, h / 2, 0);
  add(g, G.sphere(0.5, 12, 8), mat('#f2f1dd'), 0, h, 0, { scale: [1, 0.6, 1] });
  add(g, G.cyl(0.55, 0.34, 0.17, 16), mat('#7d989a'), 0, h + 0.21, 0);
  return noPick(g);
}

function roofEquipment(p, x, z, w, d, y = 13) {
  const g = group(p, x, y, z);
  box(g, w, 0.3, d, '#777f7b', 0, 0.15, 0);
  for (let xx = -w / 2 + 1.4; xx < w / 2; xx += 2.5) for (let zz = -d / 2 + 1.3; zz < d / 2; zz += 2.6) {
    box(g, 1.7, 1.15, 1.8, '#c3c6bb', xx, 0.85, zz);
    add(g, G.cyl(0.64, 0.64, 0.12, 14), mat('#687671'), xx, 1.48, zz, { cast: false });
    for (const dx of [-0.3, 0, 0.3]) box(g, 0.035, 0.14, 1.1, '#a4ada3', xx + dx, 1.53, zz, { cast: false });
  }
  return noPick(g);
}

function atriumSkylight(p, x, y, z) {
  const g = group(p, x, y, z), a = 13.5, b = 11.7, rise = 4.2;
  const corners = [[-a, 0, -b], [a, 0, -b], [a, 0, b], [-a, 0, b]], top = [0, rise, 0];
  for (let i = 0; i < 4; i++) {
    const from = corners[i], to = corners[(i + 1) % 4];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...from, ...top, ...to], 3));
    geometry.computeVertexNormals();
    add(g, geometry, mat(i % 2 ? '#d0dacc' : '#dee6d9', { side: THREE.DoubleSide }));
    // 白い金属フレームで区切られたガラスの四角錐（航空写真の採光部）。
    for (let k = 0; k <= 5; k++) {
      const start = new THREE.Vector3(...from).lerp(new THREE.Vector3(...to), k / 5);
      const end = new THREE.Vector3(...top), delta = end.clone().sub(start);
      const beam = add(g, G.cyl(0.065, 0.065, delta.length(), 6), mat('#ececde'),
        (start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2, { cast: false });
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
  }
  return noPick(g);
}

function greenBands(p, w, h, d, x, y, z) {
  const colors = [C.mint, C.green, C.yellow, C.green, C.white, C.mint, C.green, C.yellow, C.mint];
  const step = h / colors.length;
  colors.forEach((color, i) => box(p, w, step, d, color, x, y - h / 2 + (i + 0.5) * step, z));
}

function centralPortal(p) {
  const e = group(p, 1.5, 0, 59);
  for (const side of [-1, 1]) greenBands(e, 27, 13.4, 4.5, side * 22.5, 6.7, 0);
  box(e, 18, 6.4, 4.5, C.mint, 0, 10.2, 0);
  // Google Maps の施設写真で確認できる、青緑色に塗られた現在の門。
  // 竣工写真では同じ形の門がオレンジ色。写真の貼り付けは行わない。
  const portal = '#149d9d';
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape(); shape.moveTo(side * 8.3, 0); shape.lineTo(side * 13.1, 12.5);
    shape.lineTo(side * 7.7, 12.5); shape.lineTo(side * 6.0, 0); shape.closePath();
    add(e, new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: false }), mat(portal), 0, 0.2, 2.4);
  }
  box(e, 26.2, 5.0, 1.4, portal, 0, 10.2, 3.1);
  // 門の向こうまで奥行きがあり、引戸は正面の柱と同じ面にはない。
  glazing(e, 0, -5.75, 15.0, 6.1);
  decal(e, mallageLogo(null), 12.2, 4.9, 0, 10.15, 3.95);
  for (const side of [-1, 1]) glazing(e, side * 23, 2.35, 18, 4.0);
  box(e, 75, 0.2, 6.0, '#d5d3c0', 0, 0.15, 3.0);
  return e;
}

function buildNorth(root) {
  const north = group(root), facade = group(north), h = 12.5;
  // 北館の両端が奥へ張り出し、中央北側を立体駐車場が占めるコの字形。
  box(north, 270, h, 71, C.cream, 0, h / 2, 17.5);
  box(north, 68, h, 40, C.cream, -101, h / 2, -38);
  box(north, 69, h, 40, C.cream, 100.5, h / 2, -38);
  box(north, 132, 12.3, 39, '#c6c5ba', 0, 6.15, -38.5);
  box(north, 270, 0.4, 71.5, C.roof, 0, 12.5, 17.5);
  for (const x of [-101, 100.5]) box(north, 69, 0.4, 40, C.roof, x, 12.5, -38);
  // 奥の立体駐車場には、層ごとの開口と手すりを見せる。
  for (const y of [3.1, 6.1, 9.1]) {
    box(north, 130, 1.05, 0.1, '#6b7773', 0, y, -58.06);
    for (let x = -63; x <= 63; x += 8) box(north, 0.45, 2.8, 0.25, '#d3d1c5', x, y + 0.2, -58.15);
  }
  horizontalPanels(facade, -97, 53.07, 76, h, '#d2c49c');
  horizontalPanels(facade, 102, 53.07, 66, h, '#d2c49c');
  horizontalPanels(facade, -135.07, -3, 110, h, '#d2c49c', -Math.PI / 2);
  horizontalPanels(facade, 135.07, -3, 110, h, '#d2c49c', Math.PI / 2);
  // 左端の Mr.Max、右端の Foodway は公式フロア図の配置を維持する。
  const maxLogo = canvasTex(1024, 256, (c, W, H) => {
    c.fillStyle = C.cream; c.fillRect(0, 0, W, H); c.font = 'italic 900 200px Arial'; c.textBaseline = 'middle';
    c.fillStyle = '#124387'; c.fillText('Mr', 25, H / 2); c.fillStyle = '#d31c32'; c.fillText('Max', 285, H / 2);
  });
  face(facade, maxLogo, 26, 6.5, -100, 8.6, 53.14);
  glazing(facade, -102, 53.16, 28, 4.2); awning(facade, -102, 53.1, 30, '#3d7567');
  tenant(facade, 'Avail', '#cc3541', '#ffffff', -73, 9.0, 53.14, 8.5, 3.2, 0, { serif: true });
  const food = archedEntrance(facade, 102, 53.15, 'Foodway');
  for (const x of [73, 85, 120, 130]) { glazing(facade, x, 53.14, 9.3, 4.0); awning(facade, x, 53.1, 10.4); }
  tenant(facade, 'Sanki', '#d90050', '#ffffff', 76, 9.3, 53.16, 8.2, 3.0);
  tenant(facade, '西松屋', '#f3eee1', '#ce1d29', 124, 9.3, 53.16, 9.4, 3.0);
  // 食品館東側にも丸アーチと赤い庇が続く（外観写真で確認できる面）。
  const east = group(facade, 135.1, 0, 10, Math.PI / 2);
  archedEntrance(east, 0, 0, 'Foodway');
  for (const x of [-32, -20, 20, 32]) { glazing(east, x, 0.03, 10.0, 4.0); awning(east, x, 0, 11.0); }
  const entrance = centralPortal(facade);
  // 屋上の緑色立方体看板。上部にも細い実在の縁がある。
  const sign = group(north, 60, 12.8, 12);
  box(sign, 11, 5.1, 8.0, C.teal, 0, 3.7, 0);
  box(sign, 11.3, 0.15, 8.3, '#e6e4d7', 0, 6.31, 0);
  const logo = mallageLogo();
  face(sign, logo, 10.8, 5.0, 0, 3.7, 4.06); face(sign, logo, 7.8, 5, 5.56, 3.7, 0, Math.PI / 2);
  face(sign, logo, 10.8, 5, 0, 3.7, -4.06, Math.PI); face(sign, logo, 7.8, 5, -5.56, 3.7, 0, -Math.PI / 2);
  for (const x of [-4, 4]) box(sign, 0.35, 1.25, 0.35, '#9aaca1', x, 0.65, 0);
  // 右端の Foodway 屋上看板。
  const foodSign = group(north, 109, 12.8, -14);
  box(foodSign, 15, 5.3, 9, C.red, 0, 3.8, 0);
  face(foodSign, labelTex('Foodway', C.red, '#fffbe9', { serif: true, sub: 'おいしい食卓へのかけはし' }), 14.8, 5.1, 0, 3.8, 4.56);
  face(foodSign, labelTex('Foodway', C.red, '#fffbe9', { serif: true }), 8.8, 5.1, 7.56, 3.8, 0, Math.PI / 2);
  // 屋上平面駐車場。中央の採光棟と設備群を避ける。
  const roofBays = [];
  for (const z of [0, 14, 30, 44]) {
    parkingRow(roofBays, -129, -28, z); parkingRow(roofBays, 33, 128, z);
  }
  for (const z of [-47, -31]) { parkingRow(roofBays, -129, -74, z); parkingRow(roofBays, 76, 128, z); }
  parkingLines(north, roofBays, 12.73); parkedCars(north, roofBays, 12.75, 811);
  railing(north, 0, 53, 270); railing(north, -135, -2, 110, Math.PI / 2); railing(north, 135, -2, 110, Math.PI / 2);
  box(north, 29, 3.0, 25, '#dfded2', 1, 14.2, 20);
  box(north, 28.4, 0.16, 24.6, '#becbbd', 1, 15.82, 20);
  atriumSkylight(north, 1, 15.96, 20);
  roofEquipment(north, -45, -6, 16, 11); roofEquipment(north, 113, -42, 16, 10);
  // 奥側の高い立体駐車場屋根は、写真で見える長い平らな量塊。
  box(north, 132, 1.2, 39, '#c6c5b8', 0, 13.0, -38.5);
  for (let x = -57; x < 60; x += 11) box(north, 1.8, 0.6, 3.0, '#abada2', x, 13.9, -24);
  return { north, facade, entrance, foodEntrance: food, sign };
}

function buildSouth(root) {
  const south = group(root);
  // 写真・航空写真で確認した南館の東側シネマ棟と、北への連絡棟。
  const cinema = group(south, 86, 0, 191);
  box(cinema, 120, 16.5, 80, C.salmon, 0, 8.25, 0);
  box(cinema, 121, 0.45, 81, '#7d7773', 0, 16.6, 0);
  for (const y of [5.9, 9.5, 13.3]) box(cinema, 120.25, 0.75, 80.25, '#e6dac0', 0, y, 0);
  horizontalPanels(cinema, 60.17, 0, 80, 16.5, '#b8846e', Math.PI / 2);
  // +x に面するシネマの看板。右（北）側が横縞の mallage 入口。
  const east = group(cinema, 60.21, 0, 0, Math.PI / 2);
  const logoMat = new THREE.MeshBasicMaterial({ map: cinemaLogo(), transparent: true, alphaTest: 0.01, toneMapped: false });
  add(east, G.plane(39, 8.5), logoMat, 1, 12.5, 0.05, { cast: false });
  const namco = canvasTex(1024, 256, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.fillStyle = '#b32337'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 190px Arial, sans-serif'; c.fillText('namco', W / 2, H * 0.52);
  });
  decal(east, namco, 30, 3.7, 1, 6.0, 0.16);
  for (const xx of [-28, 26]) glazing(east, xx, 0.15, 18, 4.1);
  // 2階外廊下と階段。南館写真の手前に見える金属手すり。
  box(east, 78, 0.35, 3.6, '#a58a76', 0, 5.1, 1.8);
  railing(east, 0, 3.4, 78, 0, 5.26);
  for (const x of [-31, 25]) {
    const stair = group(east, x, 0, 6.7);
    for (let i = 0; i < 18; i++) box(stair, 2.4, 0.285, 0.65, '#b8b6a8', 0, 0.15 + i * 0.285, 5.5 - i * 0.63);
    for (const dx of [-1.25, 1.25]) {
      const a = new THREE.Vector3(dx, 1.1, 5.7), b = new THREE.Vector3(dx, 6.2, -5.5), delta = b.clone().sub(a);
      const m = add(stair, G.cyl(0.035, 0.035, delta.length(), 6), mat('#d2d3c7'), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    }
  }
  // 北東角の緑・黄・白の帯を持つ主入口。
  const green = group(south, 96, 0, 132);
  greenBands(green, 100, 13.5, 38, 0, 6.75, 0);
  const cinemaEntrance = group(green, 50.09, 0, 0, Math.PI / 2);
  glazing(cinemaEntrance, 0, 0, 19, 5.7);
  decal(cinemaEntrance, mallageLogo(null), 18, 7.2, 0, 9.35, 0.15);
  box(cinemaEntrance, 21, 0.35, 3.1, C.salmon, 0, 6.5, 1.1);
  // 西の折れた低層部分は公式フロア図と航空写真の輪郭を残す。
  box(south, 33, 13.0, 67, C.beige, 30, 6.5, 137);
  const diagonal = group(south, 45, 0, 182, -Math.PI / 4);
  box(diagonal, 62, 13, 25, C.beige, 0, 6.5, 0);
  box(diagonal, 62.6, 0.35, 25.6, '#bfc1b7', 0, 13.2, 0);
  for (let x = -24; x <= 24; x += 12) glazing(diagonal, x, 12.6, 8.5, 4.0);
  box(south, 33.5, 0.35, 68, '#c2c4bb', 30, 13.2, 137);
  roofEquipment(south, 100, 180, 24, 17, 17); roofEquipment(south, 65, 208, 17, 10, 17);
  // 連絡橋。公道の上を2階の高さでまたいでいる。
  const bridge = group(root, 20, 0, 90);
  box(bridge, 19, 0.5, 47, '#d1cfba', 0, 5.5, 0);
  box(bridge, 20.2, 0.35, 48, '#deded0', 0, 10.0, 0);
  for (const x of [-9.4, 9.4]) {
    box(bridge, 0.14, 4.0, 47, '#9bafa8', x, 7.75, 0);
    for (let z = -23; z <= 23; z += 2.4) box(bridge, 0.25, 4.2, 0.12, '#dfdfd1', x, 7.75, z);
    box(bridge, 0.4, 1.1, 47, '#e7e3cc', x, 6.15, 0);
  }
  return { south, cinema, cinemaEntrance, bridge };
}

function grounds(root) {
  const parking = noPick(group(root));
  // 建物に付随する敷地。広域道路や周囲の町は saga/diorama.js 側で作る。
  box(parking, 299, 0.13, 299, C.road, 4.5, -0.06, 87.5);
  const bays = [];
  for (const z of [65, 79]) { parkingRow(bays, -122, -4, z); parkingRow(bays, 43, 132, z); }
  for (const z of [119, 134, 150]) parkingRow(bays, -101 + (z - 119) * 0.55, 7, z);
  // 東側の短い駐車列。道路側へシネマ正面を隠さない。
  const northEast = [];
  for (let z = -48; z < 48; z += 2.6) northEast.push({ x: 146, z, ry: Math.PI / 2 });
  parkingLines(parking, [...bays, ...northEast]); parkedCars(parking, [...bays, ...northEast], 0.09, 869);
  // 北館正面の歩道・切り下げ、中央の2色の横断歩道。
  box(parking, 269, 0.18, 5.3, '#c3c2ae', 0, 0.11, 56.2);
  for (let x = -6; x <= 9; x += 2.0) box(parking, 0.85, 0.03, 7.0, '#e9e5cd', x, 0.10, 91);
  for (let x = -103; x < 134; x += 28) pole(parking, x, 61, 7.5);
  for (const [x, z] of [[-106, 90], [-66, 90], [-15, 90], [62, 90], [110, 90], [-54, 158], [4, 166], [151, 161]]) pole(parking, x, z);
  const grass = mat('#81916f'), soil = mat('#a6a082');
  for (const [x, z, w] of [[-100, 90, 41], [-46, 90, 36], [76, 90, 32], [120, 90, 28]]) {
    add(parking, G.box(w, 0.24, 1.8), soil, x, 0.17, z);
    add(parking, G.box(w - 0.35, 0.16, 1.5), grass, x, 0.36, z);
    for (let dx = -w / 2 + 2; dx < w / 2; dx += 3.3) {
      add(parking, G.sphere(0.58, 8, 6), mat('#5f8164'), x + dx, 0.8, z, { scale: [1.4, 0.7, 1] });
    }
  }
  // 青緑の実物案内板とバス乗り場。文字は個人情報を含まない施設名のみ。
  const bus = group(root, 77, 0, 58.7);
  add(bus, G.cyl(0.07, 0.07, 3.8, 8), mat('#ccd1c5'), 0, 1.9, 0);
  face(bus, labelTex('モラージュ佐賀', '#f0edda', C.teal, { sub: '祐徳バス' }), 4.3, 1.2, 0, 3.2, 0.11);
  for (const [x, z, t] of [[-89, 86, '駐車場①'], [108, 87, '駐車場①'], [151, 171, '駐車場② 東']]) {
    const g = group(root, x, 0, z);
    for (const dx of [-2.7, 2.7]) box(g, 0.11, 5.0, 0.11, '#b7c1b7', dx, 2.5, 0);
    face(g, labelTex(t, '#087e6b', '#ffffe8', { border: true, sub: 'mallage' }), 6.1, 2.5, 0, 4.4, 0.13);
  }
  noPick(parking);
  return { parking, bus };
}

export function createMallageSaga(parent) {
  const root = group(parent); root.name = 'モラージュ佐賀';
  const R = { root, ...grounds(root), ...buildNorth(root), ...buildSouth(root) };
  R.focusTarget = new THREE.Vector3(1.5, 7.0, 60);
  R.cinemaFocusTarget = new THREE.Vector3(146, 9, 164);
  R.size = { ...MALLAGE_SIZE };
  R.recommendedViews = {
    front: { position: [-17, 14, 104], target: [0, 7, 58] },
    north: { position: [-17, 14, 104], target: [0, 7, 58] },
    cinema: { position: [241, 30, 179], target: [146, 9, 168] },
    complex: { position: [345, 170, 355], target: [0, 7, 75] },
  };
  return R;
}
