import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { Creature, beadEye } from './creatures.js';

// 星あかりの博物館の住人。足元が原点、+Z が正面。
// 別の駅の制服を重ねず、この館で働くための服と道具を作る。
function resident(kind, faceHeight) {
  const c = new Creature(kind);
  c.root.userData.dynamic = true;
  c.root.userData.faceHeight = faceHeight;
  return c;
}

function cheeks(parent, x, y, z, r = 0.035) {
  const pink = mat('#eaa09a', { transparent: true, opacity: 0.5 });
  for (const s of [-1, 1]) add(parent, G.sphere(r), pink, s * x, y, z, { scale: [1, 0.6, 0.35], cast: false });
}

function smile(parent, y, z, r = 0.055, color = '#705b40') {
  add(parent, G.torus(r, 0.009, 6, 18, Math.PI), mat(color), 0, y, z, { rot: [0, 0, Math.PI], cast: false });
}

function star(parent, x, y, z, r, material) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? r * 0.46 : r;
    const sx = Math.cos(a) * radius, sy = Math.sin(a) * radius;
    if (i) shape.lineTo(sx, sy); else shape.moveTo(sx, sy);
  }
  shape.closePath();
  return add(parent, new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1, steps: 1 }), material, x, y, z, { cast: false });
}

function seam(parent, x, y, z, count = 4) {
  const thread = mat('#e7d4ad');
  for (let i = 0; i < count; i++) add(parent, G.box(0.018, 0.008, 0.005), thread, x, y - i * 0.045, z, { cast: false });
}

// ---------------------------------------------------------------
// 起きているフクロウの館長。青緑の肩掛けと、星の留め具。
// ---------------------------------------------------------------
export function makeCuratorOwl() {
  const c = resident('curatorOwl', 1.05);
  c.noIdleHop = true;
  const b = c.body;
  const brown = mat('#9a7654'), dark = mat('#6e503b'), cream = mat('#f3e5c9');
  const teal = mat('#317b7b'), hem = mat('#245a62');
  const brass = mat('#d6b25f', { metalness: 0.28, roughness: 0.42 });
  const amber = mat('#efb557', { roughness: 0.35 });

  add(b, G.sphere(0.46, 26, 18), brown, 0, 0.55, 0, { scale: [1.03, 1.08, 0.93] });
  add(b, G.sphere(0.34, 22, 16), cream, 0, 0.48, 0.23, { scale: [1, 1.08, 0.65] });
  for (const s of [-1, 1]) {
    add(b, G.sphere(0.085), mat('#d89e4d'), s * 0.16, 0.055, 0.2, { scale: [1.4, 0.6, 1.35] });
    for (let i = -1; i <= 1; i++) add(b, G.capsule(0.018, 0.07), mat('#d89e4d'), s * 0.16 + i * 0.04, 0.035, 0.285, { rot: [Math.PI / 2, 0, 0], cast: false });
    const wing = group(b, s * 0.43, 0.62, -0.015);
    add(wing, G.sphere(0.24), dark, 0, -0.04, 0, { scale: [0.43, 1.12, 0.88], rot: [0, 0, s * 0.13] });
    add(wing, G.sphere(0.24), teal, 0, 0.065, -0.015, { scale: [0.5, 0.87, 0.96], rot: [0, 0, s * 0.13] });
  }
  // 背中から肩にかかる短いケープ。胸の羽毛は見えるまま。
  add(b, G.sphere(0.43, 24, 16), teal, 0, 0.63, -0.185, { scale: [1.02, 0.87, 0.78] });
  add(b, G.torus(0.305, 0.065, 8, 24), teal, 0, 0.88, 0, { rot: [Math.PI / 2, 0, 0], scale: [1.16, 1, 1] });
  add(b, G.torus(0.31, 0.018, 6, 24), hem, 0, 0.86, 0.015, { rot: [Math.PI / 2, 0, 0], scale: [1.16, 1, 1], cast: false });
  star(b, 0.14, 0.83, 0.327, 0.075, brass);
  for (let i = 0; i < 5; i++) {
    const x = ((i % 3) - 1) * 0.115, y = 0.39 + Math.floor(i / 3) * 0.14;
    add(b, G.cone(0.025, 0.055, 3), dark, x, y, 0.453, { rot: [Math.PI / 2, 0, Math.PI], cast: false });
  }

  const head = (c.head = group(b, 0, 1.02, 0.025));
  add(head, G.sphere(0.365, 26, 18), brown, 0, 0.015, 0, { scale: [1.15, 1, 1] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.205, 22, 16), cream, s * 0.175, 0.025, 0.253, { scale: [1.02, 1.12, 0.46], cast: false });
    const eye = group(head, s * 0.175, 0.03, 0.36);
    add(eye, G.sphere(0.092, 18, 12), amber, 0, 0, 0, { scale: [1, 1.04, 0.46], cast: false });
    c.eyes.push(beadEye(eye, 0, 0.004, 0.035, 0.055));
    add(head, G.torus(0.122, 0.014, 6, 28), brass, s * 0.175, 0.03, 0.424, { cast: false });
    add(head, G.capsule(0.011, 0.17), brass, s * 0.306, 0.025, 0.325, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(head, G.cone(0.085, 0.2, 5), dark, s * 0.29, 0.3, -0.025, { rot: [0, 0, -s * 0.4] });
    add(head, G.sphere(0.055), cream, s * 0.19, 0.175, 0.338, { scale: [1.2, 0.27, 0.4], rot: [0, 0, s * 0.18], cast: false });
  }
  add(head, G.box(0.105, 0.013, 0.015), brass, 0, 0.05, 0.425, { cast: false });
  add(head, G.cone(0.063, 0.14, 5), mat('#d79942'), 0, -0.09, 0.389, { rot: [Math.PI + 0.35, 0, 0] });
  cheeks(head, 0.29, -0.08, 0.29, 0.045);
  return c;
}

// ---------------------------------------------------------------
// 化石を直すキツネ。生成りのエプロン、ポケット、細い修復用の刷毛。
// ---------------------------------------------------------------
export function makeRestorerFox() {
  const c = resident('restorerFox', 1.065);
  const b = c.body;
  const fur = mat('#d98d50'), white = mat('#fff1d8'), dark = mat('#5c4131');
  const shirt = mat('#778d86'), apron = mat('#e7dcc4'), piping = mat('#bc9b73');
  for (const s of [-1, 1]) add(b, G.sphere(0.1), dark, s * 0.14, 0.075, 0.065, { scale: [1, 0.72, 1.5] });
  add(b, G.cyl(0.235, 0.315, 0.59, 22), shirt, 0, 0.48, 0);
  add(b, G.sphere(0.24), shirt, 0, 0.74, 0, { scale: [1, 0.58, 0.94] });
  add(b, G.box(0.42, 0.45, 0.048), apron, 0, 0.4, 0.294, { rot: [-0.065, 0, 0] });
  add(b, G.box(0.255, 0.22, 0.035), apron, 0, 0.72, 0.235, { rot: [-0.28, 0, 0] });
  for (const s of [-1, 1]) {
    add(b, G.box(0.045, 0.19, 0.035), apron, s * 0.11, 0.82, 0.17, { rot: [-0.55, 0, -s * 0.08] });
    add(b, G.box(0.016, 0.4, 0.006), piping, s * 0.19, 0.4, 0.327, { cast: false });
  }
  add(b, G.box(0.19, 0.135, 0.02), mat('#d9c7a6'), 0.055, 0.405, 0.329);
  add(b, G.box(0.195, 0.018, 0.024), piping, 0.055, 0.47, 0.333, { cast: false });
  seam(b, -0.015, 0.452, 0.344, 2);
  // ポケットの小さな鉛筆と定規。
  add(b, G.cyl(0.009, 0.009, 0.13, 6), mat('#c69b53'), 0.085, 0.49, 0.342, { rot: [0, 0, -0.1], cast: false });
  add(b, G.box(0.035, 0.12, 0.008), mat('#9b8e75'), 0.01, 0.49, 0.342, { rot: [0, 0, 0.08], cast: false });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.29, 0.735, 0.015);
    arm.rotation.z = s * 0.28;
    add(arm, G.capsule(0.072, 0.17), shirt, 0, -0.13, 0);
    add(arm, G.cyl(0.076, 0.076, 0.045, 12), apron, 0, -0.24, 0, { cast: false });
    add(arm, G.sphere(0.07), fur, 0, -0.29, 0.025);
    if (s > 0) c.armR = arm;
  }
  c.brush = group(c.armR, 0.01, -0.265, 0.08);
  c.brush.rotation.z = -0.32;
  add(c.brush, G.cyl(0.014, 0.011, 0.23, 8), mat('#865c3c'), 0, 0.025, 0);
  add(c.brush, G.cyl(0.018, 0.018, 0.048, 10), mat('#baa170', { metalness: 0.22, roughness: 0.45 }), 0, 0.15, 0);
  add(c.brush, G.cone(0.024, 0.075, 12), mat('#ece4d1'), 0, 0.21, 0);
  for (const x of [-0.01, 0.01]) add(c.brush, G.cyl(0.002, 0.002, 0.04, 4), mat('#b7aa93'), x, 0.198, 0.016, { cast: false });

  const tail = (c.tail = group(b, 0, 0.35, -0.27));
  tail.rotation.x = -0.28;
  add(tail, G.sphere(0.17, 18, 12), fur, 0, 0.035, -0.24, { scale: [0.95, 0.95, 1.95] });
  add(tail, G.sphere(0.125), white, 0, 0.035, -0.54, { scale: [1, 0.95, 1.25] });
  const head = (c.head = group(b, 0, 1.025, 0.03));
  add(head, G.sphere(0.265, 24, 16), fur, 0, 0, 0, { scale: [1.13, 1, 1] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.15), white, s * 0.105, -0.085, 0.16, { scale: [1.05, 0.7, 0.9] });
    c.eyes.push(beadEye(head, s * 0.122, 0.04, 0.228, 0.047));
    const ear = group(head, s * 0.18, 0.205, -0.015);
    ear.rotation.z = -s * 0.23;
    add(ear, G.cone(0.095, 0.28, 5), fur, 0, 0.11, 0);
    add(ear, G.cone(0.057, 0.18, 5), dark, 0, 0.135, 0.036, { cast: false });
    add(ear, G.cone(0.036, 0.115, 5), mat('#e8ba9d'), 0, 0.115, 0.056, { cast: false });
  }
  add(head, G.sphere(0.095), white, 0, -0.07, 0.265, { scale: [1.0, 0.75, 1] });
  add(head, G.sphere(0.034), dark, 0, -0.035, 0.348, { scale: [1.18, 0.8, 0.8], cast: false });
  smile(head, -0.11, 0.328, 0.038, '#73513e');
  cheeks(head, 0.21, -0.055, 0.17);
  c.extra = (dt, t) => {
    tail.rotation.y = Math.sin(t * 1.1 + c.phase) * 0.22;
    c.armR.rotation.x = -0.12 + Math.sin(t * 1.5 + c.phase) * 0.035;
  };
  return c;
}

// ---------------------------------------------------------------
// ラッコの司書。丸耳、淡い口元、ひげ、太い尾でシルエットを作る。
// ---------------------------------------------------------------
export function makeArchivistOtter() {
  const c = resident('archivistOtter', 1.095);
  const b = c.body;
  const fur = mat('#8a6247'), dark = mat('#5c4437'), cream = mat('#e9d6b6');
  const navy = mat('#364e68'), trim = mat('#6a8291');
  const gold = mat('#c7aa66', { metalness: 0.2, roughness: 0.5 });
  for (const s of [-1, 1]) add(b, G.sphere(0.12), dark, s * 0.18, 0.08, 0.09, { scale: [1, 0.65, 1.55] });
  add(b, G.sphere(0.34, 24, 16), fur, 0, 0.49, -0.01, { scale: [1.05, 1.21, 0.92] });
  add(b, G.sphere(0.35, 24, 16), navy, 0, 0.575, -0.02, { scale: [1.06, 0.88, 0.94] });
  add(b, G.sphere(0.25), cream, 0, 0.58, 0.235, { scale: [0.75, 1.08, 0.42] });
  for (const s of [-1, 1]) {
    add(b, G.box(0.085, 0.27, 0.035), trim, s * 0.105, 0.7, 0.283, { rot: [0, 0, s * 0.25] });
    const arm = group(b, s * 0.285, 0.72, 0.07);
    add(arm, G.capsule(0.087, 0.18), fur, s * 0.015, -0.12, 0.12, { rot: [-0.6, 0, s * 0.08] });
    add(arm, G.sphere(0.082), dark, -s * 0.035, -0.2, 0.37, { scale: [1, 0.8, 1] });
  }
  // 太く、根元から先へゆっくり細くなるラッコの尾。
  const tail = (c.tail = group(b, 0, 0.27, -0.26));
  add(tail, G.sphere(0.18, 20, 12), dark, 0, -0.035, -0.25, { scale: [0.86, 0.72, 2] });
  add(tail, G.sphere(0.105), dark, 0, -0.055, -0.56, { scale: [1.05, 0.7, 1.35] });
  // 本は手よりわずかに奥。革装丁、紙の束、背の金線、布のしおり。
  const book = (c.book = group(b, 0, 0.57, 0.39));
  book.rotation.z = -0.08;
  const cover = mat('#467b78'), pages = mat('#f4ead2');
  add(book, G.box(0.45, 0.47, 0.135), pages, 0, 0, 0);
  for (const z of [-0.077, 0.077]) add(book, G.box(0.49, 0.51, 0.025), cover, 0, 0, z);
  add(book, G.box(0.04, 0.51, 0.165), mat('#315c5c'), -0.231, 0, 0);
  for (const y of [-0.17, 0.17]) add(book, G.box(0.041, 0.02, 0.169), gold, -0.232, y, 0, { cast: false });
  add(book, G.box(0.29, 0.32, 0.006), mat('#b5c4a0'), 0.015, 0.015, 0.094, { cast: false });
  add(book, G.box(0.265, 0.295, 0.008), cover, 0.015, 0.015, 0.1, { cast: false });
  star(book, 0.015, 0.04, 0.11, 0.073, gold);
  add(book, G.box(0.045, 0.13, 0.009), mat('#c69075'), 0.11, -0.255, 0.005, { cast: false });

  const head = (c.head = group(b, 0, 1.045, 0.025));
  add(head, G.sphere(0.31, 26, 18), fur, 0, 0, 0, { scale: [1.14, 0.96, 1] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.089), dark, s * 0.264, 0.18, -0.015, { scale: [1, 1, 0.55] });
    add(head, G.sphere(0.055), mat('#c59b7b'), s * 0.264, 0.18, 0.026, { scale: [1, 1, 0.3], cast: false });
    c.eyes.push(beadEye(head, s * 0.145, 0.05, 0.278, 0.047));
    add(head, G.sphere(0.145), cream, s * 0.09, -0.09, 0.25, { scale: [1.1, 0.7, 0.65] });
  }
  add(head, G.sphere(0.044), dark, 0, -0.047, 0.355, { scale: [1.25, 0.75, 0.6], cast: false });
  smile(head, -0.1, 0.348, 0.045, '#614536');
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) add(head, G.capsule(0.0035, 0.17), mat('#eedfc9'), s * 0.224, -0.065 - i * 0.025, 0.307, { rot: [0, s * 0.18, Math.PI / 2 + s * (i - 1) * 0.16], cast: false });
  }
  cheeks(head, 0.245, -0.055, 0.22, 0.032);
  c.extra = (dt, t) => { tail.rotation.y = Math.sin(t * 0.8 + c.phase) * 0.14; };
  return c;
}

// ---------------------------------------------------------------
// カメの庭師。甲羅の模様、麦わら帽子と小さなじょうろ。
// ---------------------------------------------------------------
export function makeGardenerTortoise() {
  const c = resident('gardenerTortoise', 1.04);
  c.noIdleHop = true;
  const b = c.body;
  const skin = mat('#a2b78a'), dark = mat('#7b9468'), belly = mat('#d9cc9c');
  const shell = mat('#6b8062'), edging = mat('#b5a476');
  for (const s of [-1, 1]) add(b, G.sphere(0.12), skin, s * 0.2, 0.08, 0.04, { scale: [1.1, 0.65, 1.3] });
  add(b, G.sphere(0.37, 24, 16), skin, 0, 0.47, 0.01, { scale: [0.95, 1.15, 0.8] });
  add(b, G.sphere(0.285), belly, 0, 0.47, 0.18, { scale: [0.95, 1.1, 0.5] });
  for (const y of [0.32, 0.46, 0.6]) add(b, G.box(0.34, 0.012, 0.009), edging, 0, y, 0.318 - Math.abs(y - 0.46) * 0.1, { cast: false });
  add(b, G.sphere(0.45, 28, 18), shell, 0, 0.49, -0.17, { scale: [1, 1.04, 0.67] });
  add(b, G.torus(0.39, 0.037, 8, 32), edging, 0, 0.49, -0.334, { scale: [1, 1.08, 1] });
  // 甲羅の背面に六角形のうろこ。厚みは殻からわずかに浮かせる。
  for (const [x, y, z, r] of [[0, 0.49, -0.477, 0.16], [-0.205, 0.49, -0.427, 0.115], [0.205, 0.49, -0.427, 0.115], [0, 0.735, -0.424, 0.115], [0, 0.245, -0.424, 0.115]]) {
    add(b, G.cyl(r, r, 0.018, 6), edging, x, y, z, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(b, G.cyl(r * 0.88, r * 0.88, 0.02, 6), mat('#82946d'), x, y, z - 0.006, { rot: [Math.PI / 2, 0, 0], cast: false });
  }
  add(b, G.cone(0.055, 0.16, 10), skin, 0, 0.22, -0.57, { rot: [-Math.PI / 2 - 0.25, 0, 0] });
  add(b, G.cyl(0.115, 0.145, 0.28, 16), skin, 0, 0.79, 0.12);
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.32, 0.68, 0.09);
    add(arm, G.capsule(0.073, 0.18), skin, s * 0.035, -0.115, 0.015, { rot: [0, 0, s * 0.3] });
    add(arm, G.sphere(0.08), dark, s * 0.07, -0.245, 0.045);
    if (s > 0) c.armR = arm;
  }
  const can = (c.wateringCan = group(c.armR, 0.11, -0.35, 0.095));
  const enamel = mat('#6b9c9a'), rim = mat('#a3c2af');
  add(can, G.cyl(0.12, 0.14, 0.21, 18), enamel, 0, 0, 0);
  add(can, G.cyl(0.12, 0.12, 0.018, 18), rim, 0, 0.112, 0);
  add(can, G.torus(0.115, 0.016, 6, 20), enamel, -0.1, 0.085, 0, { rot: [0, Math.PI / 2, 0] });
  add(can, G.cyl(0.022, 0.04, 0.235, 10), enamel, 0.18, 0.065, 0, { rot: [0, 0, -1.02] });
  const rose = group(can, 0.28, 0.13, 0);
  rose.rotation.z = -1.02;
  add(rose, G.cyl(0.066, 0.04, 0.045, 14), rim);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    add(rose, G.sphere(0.006), mat('#527f7b'), Math.cos(a) * 0.035, 0.025, Math.sin(a) * 0.035, { cast: false });
  }

  const head = (c.head = group(b, 0, 1, 0.14));
  add(head, G.sphere(0.235, 24, 16), skin, 0, 0, 0, { scale: [1.04, 0.91, 1] });
  for (const s of [-1, 1]) {
    c.eyes.push(beadEye(head, s * 0.103, 0.04, 0.206, 0.039));
    add(head, G.sphere(0.009), dark, s * 0.04, -0.005, 0.235, { cast: false });
    add(head, G.sphere(0.035), mat('#e4e3bd'), s * 0.105, 0.12, 0.18, { scale: [1.4, 0.4, 0.4], cast: false });
  }
  smile(head, -0.065, 0.223, 0.068, '#637850');
  cheeks(head, 0.17, -0.035, 0.16, 0.03);
  const straw = mat('#d9bd79'), hatBand = mat('#7c936d');
  const hat = group(head, 0, 0.225, -0.015);
  hat.rotation.z = -0.1;
  add(hat, G.cyl(0.32, 0.325, 0.035, 32), straw);
  add(hat, G.cyl(0.19, 0.22, 0.16, 28), straw, 0, 0.09, 0);
  add(hat, G.sphere(0.19, 24, 12), straw, 0, 0.17, 0, { scale: [1, 0.25, 1] });
  add(hat, G.cyl(0.215, 0.223, 0.046, 28), hatBand, 0, 0.037, 0);
  for (const r of [0.25, 0.29, 0.32]) add(hat, G.torus(r, 0.003, 4, 32), mat('#bca365'), 0, 0.021, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(hat, G.sphere(0.035), mat('#d7b9a2'), -0.17, 0.065, 0.14, { scale: [1, 1, 0.5], cast: false });
  c.extra = (dt, t) => { c.armR.rotation.x = Math.sin(t * 0.75 + c.phase) * 0.035; };
  return c;
}

// ---------------------------------------------------------------
// モモンガの光技師。額の真鍮ゴーグルと、手に持つ検査用レンズ。
// ---------------------------------------------------------------
export function makeOpticianMomonga() {
  const c = resident('opticianMomonga', 0.91);
  const b = c.body;
  const fur = mat('#a29183'), cream = mat('#f2e6d2'), pink = mat('#d9b6ad');
  const blue = mat('#467997'), blueD = mat('#315f80');
  const brass = mat('#bfa05f', { metalness: 0.27, roughness: 0.4 });
  for (const s of [-1, 1]) add(b, G.sphere(0.08), fur, s * 0.135, 0.055, 0.085, { scale: [1, 0.65, 1.3] });
  add(b, G.sphere(0.29, 24, 16), fur, 0, 0.4, 0, { scale: [1.03, 1.12, 0.88] });
  add(b, G.sphere(0.23, 22, 14), cream, 0, 0.38, 0.115, { scale: [1, 1.03, 0.64] });
  for (const s of [-1, 1]) {
    add(b, G.sphere(0.22), fur, s * 0.265, 0.4, -0.035, { scale: [0.68, 1.12, 0.26], rot: [0, 0, s * 0.22] });
    add(b, G.sphere(0.17), mat('#c6b4a1'), s * 0.265, 0.4, 0.006, { scale: [0.65, 1.05, 0.15], rot: [0, 0, s * 0.22], cast: false });
  }
  const tail = (c.tail = group(b, 0, 0.32, -0.25));
  tail.rotation.x = -0.3;
  add(tail, G.sphere(0.17, 20, 14), fur, 0, 0.17, -0.1, { scale: [0.95, 1.95, 0.55] });
  add(tail, G.sphere(0.145), cream, 0, 0.19, -0.18, { scale: [0.84, 1.72, 0.2] });
  add(b, G.torus(0.205, 0.05, 8, 24), blue, 0, 0.69, 0.02, { rot: [Math.PI / 2, 0, 0] });
  const scarf = (c.scarf = group(b, 0.145, 0.62, 0.19));
  scarf.rotation.z = 0.32;
  add(scarf, G.box(0.105, 0.25, 0.035), blue, 0, -0.075, 0);
  add(scarf, G.box(0.11, 0.018, 0.037), blueD, 0, -0.17, 0, { cast: false });
  for (const x of [-0.035, 0, 0.035]) add(scarf, G.box(0.012, 0.035, 0.018), blue, x, -0.215, 0, { cast: false });
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.29, 0.59, 0.045);
    add(arm, G.capsule(0.06, 0.13), fur, s * 0.015, -0.075, 0.045, { rot: [-0.25, 0, s * 0.2] });
    add(arm, G.sphere(0.062), pink, s * 0.03, -0.17, 0.07);
    if (s > 0) c.armR = arm;
  }
  const lens = (c.lens = group(c.armR, 0.05, -0.11, 0.125));
  lens.rotation.z = -0.2;
  add(lens, G.capsule(0.018, 0.13), mat('#6e5b45'), 0, -0.05, 0);
  add(lens, G.torus(0.092, 0.014, 8, 24), brass, 0, 0.105, 0);
  add(lens, G.circle(0.079, 24), mat('#abd4d5', { transparent: true, opacity: 0.42, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0, 0.105, 0.002, { cast: false });
  add(lens, G.capsule(0.004, 0.045), mat('#eff9f5'), -0.031, 0.132, 0.005, { rot: [0, 0, -0.5], cast: false });

  const head = (c.head = group(b, 0, 0.89, 0.025));
  add(head, G.sphere(0.27, 26, 18), fur, 0, 0, 0, { scale: [1.04, 0.98, 1] });
  add(head, G.sphere(0.155), cream, 0, -0.075, 0.16, { scale: [1.13, 0.78, 0.73] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.085), fur, s * 0.2, 0.2, -0.015, { scale: [1, 1.12, 0.6] });
    add(head, G.sphere(0.052), pink, s * 0.2, 0.2, 0.031, { scale: [1, 1.08, 0.33], cast: false });
    c.eyes.push(beadEye(head, s * 0.108, 0.02, 0.23, 0.059));
  }
  add(head, G.sphere(0.026), mat('#654b43'), 0, -0.04, 0.282, { scale: [1.1, 0.8, 0.7], cast: false });
  smile(head, -0.09, 0.273, 0.034, '#816053');
  cheeks(head, 0.18, -0.055, 0.18, 0.035);
  add(head, G.torus(0.249, 0.017, 6, 28), mat('#6d5845'), 0, 0.15, 0, { rot: [Math.PI / 2 + 0.1, 0, 0], cast: false });
  const goggles = group(head, 0, 0.185, 0.215);
  goggles.rotation.x = -0.22;
  for (const s of [-1, 1]) {
    add(goggles, G.torus(0.064, 0.017, 8, 22), brass, s * 0.081, 0, 0, { cast: false });
    add(goggles, G.circle(0.053, 20), mat('#9ec4c9', { roughness: 0.25 }), s * 0.081, 0, 0.006, { cast: false });
    add(goggles, G.capsule(0.004, 0.027), mat('#e3eeea'), s * 0.081 - 0.017, 0.019, 0.009, { rot: [0, 0, -0.6], cast: false });
  }
  add(goggles, G.box(0.04, 0.014, 0.02), brass, 0, 0, 0, { cast: false });
  c.extra = (dt, t) => {
    tail.rotation.z = Math.sin(t * 1.2 + c.phase) * 0.13;
    scarf.rotation.x = Math.sin(t * 1.65 + c.phase) * 0.09;
    c.armR.rotation.z = -0.08 + Math.sin(t * 0.9 + c.phase) * 0.05;
  };
  return c;
}
