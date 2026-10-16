import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { Creature, beadEye } from './creatures.js';

// 佐賀の案内係。足元が原点、+Z が正面。
// 白い肩・腹と青黒い翼、体より長い尾でカササギの姿を残す。
// 制服で覆わず、小さな旅のかばんと手帳だけを身につける。
function feather(parent, material, x, y, z, w, length, tilt = 0) {
  return add(parent, G.sphere(1, 14, 10), material, x, y, z,
    { scale: [w, length, w * 0.58], rot: [tilt, 0, 0] });
}

function strap(parent, points, material) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(path, 24, 0.023, 6, false), material);
}

/** カササギの旅案内係。Creature の talk / hop / update / camPos と互換。 */
export function makeMagpieGuide() {
  const c = new Creature('magpieGuide');
  c.root.userData.dynamic = true;
  c.root.userData.faceHeight = 1.29;
  const b = c.body;
  const charcoal = mat('#28363d', { roughness: 0.76 });
  const headBlack = mat('#202d35', { roughness: 0.73 });
  const white = mat('#f1eee2', { roughness: 0.92 });
  // 低い metalness にし、環境マップがなくても青い羽が黒く潰れない。
  const wingBlue = mat('#355b70', { roughness: 0.56, metalness: 0.07 });
  const wingDark = mat('#294451', { roughness: 0.7 });
  const wingLight = mat('#4d7886', { roughness: 0.61, metalness: 0.04 });
  const feet = mat('#5e6260');
  const leather = mat('#a58a61'), leatherEdge = mat('#7b674b');
  const brass = mat('#c5ad73', { roughness: 0.52, metalness: 0.16 });

  // 細い鳥の脚と、前へ開く3本の指。丸い靴にしない。
  for (const s of [-1, 1]) {
    const leg = group(b, s * 0.13, 0, 0.025);
    add(leg, G.cyl(0.027, 0.034, 0.30, 8), feet, 0, 0.21, 0);
    add(leg, G.sphere(0.044, 10, 8), feet, 0, 0.065, 0.04, { scale: [1.1, 0.55, 1.5] });
    for (let toe = -1; toe <= 1; toe++) {
      add(leg, G.capsule(0.017, 0.13), feet, toe * 0.042, 0.035, 0.13,
        { rot: [Math.PI / 2, 0, -toe * 0.24], cast: false });
    }
    add(leg, G.capsule(0.015, 0.07), feet, 0, 0.033, -0.06,
      { rot: [Math.PI / 2, 0, 0], cast: false });
  }

  add(b, G.sphere(0.35, 26, 18), charcoal, 0, 0.68, -0.005, { scale: [1, 1.22, 1.03] });
  add(b, G.sphere(0.285, 24, 16), white, 0, 0.66, 0.185, { scale: [1.03, 1.06, 0.62] });
  // 首から胸の上までは黒。白い腹を短い黒い襟で縁取る。
  add(b, G.sphere(0.25, 22, 16), headBlack, 0, 0.98, 0.06, { scale: [1.02, 0.85, 0.95] });

  c.wings = [];
  for (const s of [-1, 1]) {
    const wing = group(b, s * 0.30, 0.89, -0.01);
    wing.rotation.z = s * 0.10;
    add(wing, G.sphere(0.24, 20, 14), wingDark, s * 0.04, -0.17, -0.015,
      { scale: [0.57, 1.22, 0.88], rot: [-0.16, 0, -s * 0.07] });
    // 肩の白い大きな斑は左右の正面・側面から見える。
    add(wing, G.sphere(0.175, 18, 12), white, s * 0.025, -0.005, 0.035,
      { scale: [0.72, 0.97, 0.86], rot: [0, 0, -s * 0.20] });
    for (let i = 0; i < 5; i++) {
      feather(wing, i % 2 ? wingBlue : wingDark,
        s * (0.030 + i * 0.025), -0.26 - i * 0.018, -0.060 - i * 0.038,
        0.046, 0.245 - i * 0.012, -0.20 - i * 0.035);
    }
    feather(wing, wingLight, s * 0.114, -0.20, 0.038, 0.027, 0.16, -0.15);
    c.wings.push(wing);
    if (s < 0) c.wingL = wing; else c.wingR = wing;
  }

  // 重なり合う長い尾羽。横からも尾の厚みと緩い反りが見える。
  const tail = (c.tail = group(b, 0, 0.53, -0.24));
  for (let i = -2; i <= 2; i++) {
    const center = i === 0;
    add(tail, G.sphere(1, 18, 12), center ? wingBlue : i % 2 ? wingDark : wingLight,
      i * 0.053, -0.10 + Math.abs(i) * 0.025, -0.51 + Math.abs(i) * 0.055,
      { scale: [0.075, 0.034, center ? 0.65 : 0.59], rot: [-0.16, -i * 0.045, 0] });
  }

  const head = (c.head = group(b, 0, 1.255, 0.065));
  add(head, G.sphere(0.29, 26, 18), headBlack, 0, 0.008, 0, { scale: [1.02, 1.04, 1.04] });
  // ほんの小さな後頭部の羽。耳や冠に見える大きな突起は付けない。
  for (let i = -1; i <= 1; i++) add(head, G.sphere(0.065, 12, 8), charcoal,
    i * 0.068, 0.27 - Math.abs(i) * 0.022, -0.095,
    { scale: [0.65, 1, 0.8], rot: [-0.28, 0, i * 0.14] });

  for (const s of [-1, 1]) {
    // 黒い頭に埋もれない、ごく薄い暖色のまぶたとつぶらな黒目。
    add(head, G.sphere(0.065, 14, 10), mat('#83918b'), s * 0.139, 0.040, 0.247,
      { scale: [1.04, 1.10, 0.26], cast: false });
    c.eyes.push(beadEye(head, s * 0.139, 0.040, 0.261, 0.046));
    add(head, G.sphere(0.043, 10, 8), mat('#b58c82', { transparent: true, opacity: 0.34 }),
      s * 0.205, -0.044, 0.206, { scale: [1, 0.48, 0.24], cast: false });
    add(head, G.sphere(0.07, 12, 8), charcoal, s * 0.141, 0.118, 0.232,
      { scale: [0.85, 0.20, 0.28], rot: [0, 0, s * 0.12], cast: false });
  }
  // 細い黒い嘴。上下を分け、おしゃべりのときだけ下嘴が小さく開く。
  const beak = group(head, 0, -0.026, 0.275);
  add(beak, G.cone(0.070, 0.26, 10), mat('#495451'), 0, 0.016, 0.10,
    { scale: [0.92, 1, 0.52], rot: [Math.PI / 2, 0, 0] });
  const jaw = (c.jaw = group(beak, 0, -0.016, -0.008));
  add(jaw, G.cone(0.058, 0.23, 10), mat('#35423f'), 0, -0.012, 0.104,
    { scale: [0.94, 1, 0.39], rot: [Math.PI / 2, 0, 0] });

  // 肩から斜めに回る細い革紐。白い腹は大きく見えるままにする。
  strap(b, [[-0.20, 0.99, 0.05], [-0.20, 0.91, 0.25], [0.05, 0.68, 0.375],
    [0.25, 0.48, 0.28], [0.32, 0.45, 0.02], [0.10, 0.82, -0.32], [-0.20, 0.99, 0.05]], leatherEdge);
  const bag = (c.bag = group(b, 0.32, 0.46, 0.025));
  bag.rotation.z = -0.12;
  add(bag, G.box(0.24, 0.26, 0.17), leather, 0, 0, 0);
  add(bag, G.box(0.25, 0.12, 0.035), leatherEdge, 0, 0.07, 0.10, { rot: [-0.06, 0, 0] });
  add(bag, G.box(0.037, 0.10, 0.015), mat('#b7a078'), 0, -0.005, 0.126, { cast: false });
  add(bag, G.box(0.053, 0.045, 0.016), brass, 0, -0.01, 0.14, { cast: false });
  for (const x of [-0.096, 0.096]) for (let y = -0.09; y <= 0.08; y += 0.045)
    add(bag, G.box(0.008, 0.014, 0.006), mat('#dcc9a4'), x, y, 0.113, { cast: false });

  // 左の翼の下の旅手帳。実在する個人名・住所などは書かない。
  const notebook = (c.notebook = group(b, -0.34, 0.51, 0.18));
  notebook.rotation.z = 0.13;
  const cover = mat('#668e83'), pages = mat('#e8dfc6');
  add(notebook, G.box(0.17, 0.25, 0.065), pages, 0, 0, 0);
  for (const z of [-0.042, 0.042]) add(notebook, G.box(0.19, 0.27, 0.015), cover, 0, 0, z);
  add(notebook, G.box(0.024, 0.27, 0.085), mat('#4c716a'), -0.089, 0, 0);
  add(notebook, G.box(0.09, 0.025, 0.008), mat('#cfc6a0'), 0.014, 0.052, 0.054, { cast: false });
  add(notebook, G.box(0.027, 0.075, 0.007), mat('#bd8667'), 0.047, -0.131, 0.018, { cast: false });

  c.wave = 0;
  c.extra = (dt, t) => {
    const talking = c.talkT > 0;
    const greeting = c.wave > 0 || c.idle?.kind === 'greet';
    c.wave = Math.max(0, c.wave - dt);
    tail.rotation.y = Math.sin(t * 1.15 + c.phase) * 0.11;
    tail.rotation.x = Math.sin(t * 1.65 + c.phase) * 0.025;
    const wingPose = greeting ? 0.94 + Math.sin(t * 8) * 0.14 : talking ? 0.24 + Math.sin(t * 5) * 0.035 : 0.10;
    c.wingR.rotation.z += (wingPose - c.wingR.rotation.z) * Math.min(1, dt * 6);
    c.wingL.rotation.z = -0.10 - Math.sin(t * 1.4 + c.phase) * 0.025;
    jaw.rotation.x = talking ? Math.max(0, Math.sin(t * 14)) * 0.14 : 0;
    bag.rotation.z = -0.12 + Math.sin(t * 1.4 + c.phase) * 0.025;
  };
  return c;
}
