import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { Creature, beadEye } from './creatures.js';
import { makeCapybara, makeFox } from './creatures-onsen.js';

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

function fineStroke(parent, points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
  return add(parent, new THREE.TubeGeometry(curve, 20, radius, 5, closed), material, 0, 0, 0, { cast: false });
}

// ベースの衣装だけを差し替える。共有マテリアルの値は変更しない。
function replaceColors(root, colors) {
  root.traverse(o => {
    if (o.isMesh && !Array.isArray(o.material)) {
      const replacement = colors[o.material.color?.getHexString()];
      if (replacement) o.material = replacement;
    }
  });
}

/** アマンディの湯案内。淡い作務衣と肩の手ぬぐい、小さな温泉の案内札。 */
export function makeSagaSpaHost() {
  const c = makeCapybara(), b = c.body, head = c.head;
  c.kind = 'sagaSpaHost'; c.name = 'カピバラの湯案内';
  c.root.name = 'saga-spa-host'; c.root.userData.dynamic = true; c.root.userData.faceHeight = 1.18;
  c.noIdleHop = true;
  const sage = mat('#7e9889', { roughness: 0.94 });
  const linen = mat('#eee7d4', { roughness: 0.97 });
  const seam = mat('#9da48c'), ink = mat('#50766d'), dark = mat('#725d45');
  replaceColors(c.root, {
    '5a7ab8': sage, 'e8c25a': mat('#c6b58d'), 'a8794a': mat('#ae8e69'), '8a5f38': mat('#8c7152'),
  });
  // 入浴中の姿とは分け、頭のゆず・手ぬぐいを肩の案内係らしい装いへ。
  for (const child of [...head.children]) {
    if (child.isGroup && Math.abs(child.position.y - 0.23) < 0.001) child.removeFromParent();
    else if (child.isMesh && child.material.color?.getHexString() === 'f2b31a') child.removeFromParent();
  }
  const towel = (c.towel = group(b, 0.21, 0.82, 0.13));
  add(towel, G.sphere(0.15, 16, 12), linen, 0, 0, 0, { scale: [0.86, 0.29, 1.18] });
  add(towel, G.box(0.18, 0.38, 0.038), linen, 0.02, -0.19, 0.16, { rot: [-0.08, 0, -0.05] });
  add(towel, G.box(0.15, 0.27, 0.036), linen, -0.015, -0.15, -0.14, { rot: [0.06, 0, 0.06] });
  for (const y of [-0.32, -0.285]) add(towel, G.box(0.17, 0.014, 0.006), ink,
    0.025, y, 0.193, { cast: false });
  for (let i = 0; i < 7; i++) add(towel, G.capsule(0.004, 0.027, 4, 5), linen,
    -0.05 + i * 0.024, -0.397, 0.18, { cast: false });
  // 作務衣の縫い目と小さな胸ポケット。顔と鼻先は覆わない。
  const pocket = group(b, -0.19, 0.67, 0.285);
  add(pocket, G.box(0.16, 0.15, 0.024), sage, 0, 0, 0);
  add(pocket, G.box(0.14, 0.012, 0.008), seam, 0, 0.067, 0.018, { cast: false });
  fineStroke(b, [[-0.29, 0.34, 0.267], [-0.29, 0.47, 0.279], [-0.29, 0.58, 0.267]], 0.004, seam);
  // 左手の先に木札を持たせる。文字より、遠目でもわかる湯の記号を刻む。
  c.armL = b.children.find(o => o.isGroup && Math.abs(o.position.x + 0.36) < 0.001 && o !== head);
  c.armR = b.children.find(o => o.isGroup && Math.abs(o.position.x - 0.36) < 0.001 && o !== head);
  if (c.armL) { c.armL.rotation.x = -0.6; c.armL.rotation.z = 0.18; }
  const sign = (c.guideSign = group(c.armL || b, 0, -0.31, 0.13));
  sign.quaternion.copy((c.armL || b).quaternion).invert();
  add(sign, G.box(0.47, 0.32, 0.044), mat('#ac946c'), 0, -0.025, 0);
  add(sign, G.box(0.423, 0.274, 0.012), linen, 0, -0.025, 0.028, { cast: false });
  fineStroke(sign, [[-0.11, -0.035, 0.04], [-0.13, -0.075, 0.04], [0, -0.095, 0.04], [0.13, -0.075, 0.04], [0.11, -0.035, 0.04]], 0.01, ink);
  for (const x of [-0.072, 0, 0.072]) fineStroke(sign,
    [[x, -0.026, 0.041], [x - 0.014, 0.011, 0.041], [x + 0.011, 0.049, 0.041], [x, 0.087, 0.041]], 0.007, ink);
  add(sign, G.sphere(0.016, 8, 6), dark, 0, 0.106, 0.033, { cast: false });
  const baseExtra = c.extra;
  c.extra = (dt, t) => {
    baseExtra?.(dt, t);
    if (c.armR) c.armR.rotation.x = -0.12 + Math.sin(t * 0.7 + c.phase) * 0.025;
  };
  return c;
}

/** 白いコック服とセージ色のエプロンを着た、街角ビストロのキツネ。 */
export function makeBistroChef() {
  const c = makeFox(), b = c.body, head = c.head;
  c.kind = 'bistroChef'; c.name = 'キツネのシェフ';
  c.root.name = 'saga-bistro-chef'; c.root.userData.dynamic = true; c.root.userData.faceHeight = 1.10;
  c.noIdleHop = true;
  c.handLantern.removeFromParent(); delete c.handLantern;
  // 立ち姿の尾先を床から持ち上げ、エプロンの背中の結び目も見せる。
  c.tail.position.y = 0.43; c.tail.rotation.x = -0.48;
  const cloth = mat('#f2f0e4', { roughness: 0.97 });
  const sage = mat('#809589', { roughness: 0.94 }), seam = mat('#abb7a4'), dark = mat('#566a60');
  replaceColors(c.root, { 'c8382e': cloth, '2b2b30': sage, 'e0823a': mat('#cb925c') });
  // はっぴの縦の襟と額のねじりはちまきを除き、調理服の形へ。
  for (const o of [...b.children]) if (o.isMesh && Math.abs(o.position.x - 0.08) < 0.001
    && Math.abs(o.position.y - 0.6) < 0.001 && Math.abs(o.position.z - 0.27) < 0.001) o.removeFromParent();
  for (const o of [...head.children]) if (o.isMesh && o.geometry.type === 'TorusGeometry'
    && Math.abs(o.geometry.parameters.radius - 0.25) < 0.001) o.removeFromParent();
  // 控えめな二列のボタンと折り返した襟。
  for (const s of [-1, 1]) {
    add(b, G.box(0.09, 0.20, 0.027), cloth, s * 0.075, 0.82, 0.24,
      { rot: [0, 0, s * 0.38], cast: false });
    for (const y of [0.70, 0.79]) add(b, G.sphere(0.018, 8, 6), dark, s * 0.09, y, 0.265, { cast: false });
  }
  const apron = (c.apron = group(b, 0, 0.46, 0.294));
  const shape = new THREE.Shape();
  shape.moveTo(-0.12, 0.21); shape.lineTo(0.12, 0.21); shape.lineTo(0.15, 0.02);
  shape.quadraticCurveTo(0.22, -0.03, 0.23, -0.20); shape.quadraticCurveTo(0, -0.25, -0.23, -0.20);
  shape.lineTo(-0.17, -0.02); shape.closePath();
  add(apron, new THREE.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.006, bevelThickness: 0.003 }), sage);
  fineStroke(b, [[-0.11, 0.67, 0.297], [-0.15, 0.83, 0.20], [-0.11, 0.91, 0.03]], 0.015, sage);
  fineStroke(b, [[0.11, 0.67, 0.297], [0.15, 0.83, 0.20], [0.11, 0.91, 0.03]], 0.015, sage);
  add(apron, G.box(0.20, 0.12, 0.019), sage, 0, -0.042, 0.030, { cast: false });
  fineStroke(apron, [[-0.095, 0.015, 0.044], [-0.09, -0.095, 0.044], [0.09, -0.095, 0.044], [0.095, 0.015, 0.044]], 0.004, seam);
  add(apron, G.box(0.18, 0.009, 0.007), seam, 0, 0.012, 0.046, { cast: false });
  const bow = group(b, 0, 0.43, -0.33);
  for (const s of [-1, 1]) add(bow, G.torus(0.052, 0.012, 5, 14), sage,
    s * 0.046, 0, 0, { scale: [1, 0.65, 0.45], rot: [0, s * 0.3, 0] });
  for (const s of [-1, 1]) add(bow, G.box(0.035, 0.16, 0.017), sage,
    s * 0.028, -0.08, 0, { rot: [0, 0, s * 0.20] });
  // 耳の外側は見せたまま、低い白帽子のふくらみと縫いひだを作る。
  const hat = (c.hat = group(head, 0, 0.29, -0.035));
  add(hat, G.cyl(0.20, 0.205, 0.12, 22), cloth, 0, 0, 0);
  for (const [x, y, z, r] of [[-0.115, 0.13, -0.025, 0.13], [0, 0.16, 0.025, 0.155], [0.115, 0.13, -0.025, 0.13]])
    add(hat, G.sphere(r, 16, 12), cloth, x, y, z, { scale: [1, 0.9, 0.94] });
  for (const x of [-0.13, -0.065, 0, 0.065, 0.13]) {
    const z = Math.sqrt(0.205 * 0.205 - x * x);
    fineStroke(hat, [[x, -0.045, z], [x * 1.02, 0.005, z + 0.003], [x * 1.04, 0.05, z - 0.005]], 0.004, seam);
  }
  c.armL = b.children.find(o => o.isGroup && Math.abs(o.position.x + 0.30) < 0.001 && o !== head);
  c.armR.rotation.set(-0.55, 0, 0.60);
  for (const arm of [c.armL, c.armR]) if (arm) add(arm, G.torus(0.072, 0.012, 5, 16), cloth,
    0, -0.245, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  // 木の柄と三つの立体的なワイヤーループ。手元から離さず、顔の横で構える。
  const whisk = (c.whisk = group(c.armR, 0, -0.32, 0.035));
  whisk.quaternion.copy(c.armR.quaternion).invert();
  const steel = mat('#a3aea6', { roughness: 0.42, metalness: 0.16 });
  add(whisk, G.cyl(0.024, 0.027, 0.23, 12), mat('#ac8c63'), 0, 0.005, 0);
  for (const y of [-0.08, 0.09, 0.12]) add(whisk, G.cyl(0.028, 0.028, 0.025, 12), steel, 0, y, 0, { cast: false });
  for (let j = 0; j < 3; j++) {
    const angle = j * Math.PI / 3, points = [];
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12, radius = Math.sin(a) * 0.077;
      points.push([radius * Math.cos(angle), 0.29 + Math.cos(a) * 0.17, radius * Math.sin(angle)]);
    }
    fineStroke(whisk, points, 0.005, steel, true);
  }
  const baseExtra = c.extra;
  c.extra = (dt, t) => {
    baseExtra?.(dt, t);
    c.armR.rotation.x = -0.55 + Math.sin(t * 1.6 + c.phase) * (c.talkT > 0 ? 0.06 : 0.018);
  };
  return c;
}
