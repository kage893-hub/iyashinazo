import * as THREE from 'three';
import { add, mat, G, group, canvasTex, FONT, rng } from '../../lib/util.js';

// 四辺と主対角線の五つの歩行帯。旧街区座標で地面と一緒に配置変換する。
export const SHIBUYA_WALKS = [
  { id: 'west', a: [-1.48, -.23], b: [-1.48, 2.05], width: .72 },
  { id: 'east', a: [4.76, -.23], b: [4.76, 2.05], width: .72 },
  { id: 'north', a: [-1.03, -.38], b: [4.32, -.38], width: .64 },
  { id: 'south', a: [-1.03, 2.2], b: [4.32, 2.2], width: .64 },
  { id: 'diagonal', a: [-.98, 1.96], b: [4.3, -.13], width: .84 },
];

/** 同じ地面のキャンバスへ描き、重なる白線や別平面のちらつきを作らない。 */
export function drawShibuyaGround(ctx, X, Z, K) {
  const rect = (x, z, w, d, color) => {
    ctx.fillStyle = color; ctx.fillRect(X(x), Z(z), w * K, d * K);
  };
  rect(-2.05, 2.65, 10.65, 3.55, '#bbc0be');
  for (let i = 0; i < 28; i++) for (let j = 0; j < 9; j++) {
    rect(-2.05 + i * .38, 2.65 + j * .39, .365, .375,
      ['#bcc2c0', '#aeb7b6', '#c8ccca'][(i * 3 + j * 7) % 3]);
  }
  rect(-2.05, 2.63, 10.65, .1, '#6f7b7d');
  rect(-2.05, 6.1, 10.65, .1, '#6f7b7d');
  // 元の中央線を覆って、広い交差点を駅前広場と区別する。
  rect(-2.02, -.84, 7.38, 3.5, '#343b45');
  const random = rng(409);
  for (let i = 0; i < 1800; i++) rect(-2.02 + random() * 7.38, -.84 + random() * 3.5,
    .025, .018, i % 2 ? '#3b424b' : '#303740');
  for (const path of SHIBUYA_WALKS) {
    const dx = path.b[0] - path.a[0], dz = path.b[1] - path.a[1];
    const length = Math.hypot(dx, dz), count = Math.floor(length / .26);
    ctx.save(); ctx.translate(X(path.a[0]), Z(path.a[1])); ctx.rotate(Math.atan2(dz, dx));
    ctx.fillStyle = '#f0f0e8';
    for (let i = 0; i < count; i++) ctx.fillRect((i + .22) * length / count * K,
      -path.width * K / 2, length / count * .53 * K, path.width * K);
    ctx.restore();
  }
  // 点字ブロックは歩道側に置く。
  for (const x of [-1.48, 4.76]) for (const z of [-.81, 2.67]) {
    rect(x - .45, z, .9, .13, '#d9b954');
    for (let i = 0; i < 8; i++) rect(x - .4 + i * .11, z + .035, .03, .055, '#aa8938');
  }
  rect(7.05, 3.03, .13, 2.9, '#d9b954');
  rect(4.65, 3.03, 2.53, .13, '#d9b954');
  for (let i = 0; i < 20; i++) rect(4.65 + i * .12, 3.06, .05, .05, '#b39442');
  for (const [x, z] of [[-.1, 3.4], [2.1, 4.5]]) {
    ctx.strokeStyle = '#7e8a89'; ctx.lineWidth = 1.4;
    ctx.strokeRect(X(x - .7), Z(z - .65), 1.4 * K, 1.3 * K);
  }
}

/** 会話の正面をふさがない東側の、小さなガラスのハチ公口。 */
export function buildShibuyaPlaza(root, R) {
  const entry = R.shibuyaEntry = group(root, 7.85, 0, 4.65, -Math.PI / 2);
  entry.name = 'shibuya-station-entry';
  const frame = mat('#adb8ba', { roughness: .5, metalness: .1 });
  const dark = mat('#384850', { roughness: .65 });
  const glass = mat('#62858c', { emissive: '#b7dfdc', emissiveIntensity: 0, roughness: .28 });
  R.winMats.push(glass);
  add(entry, G.box(1.8, .1, 1.1), mat('#888f8d'), 0, .05, 0);
  add(entry, G.box(1.8, 1.8, .08), glass, 0, 1, -.42);
  for (const x of [-.85, -.28, .28, .85]) add(entry, G.box(.055, 1.8, .06), frame, x, 1, -.36);
  for (const y of [.2, 1, 1.86]) add(entry, G.box(1.8, .055, .06), frame, 0, y, -.36);
  add(entry, G.box(1.94, .12, 1.2), frame, 0, 1.97, 0);
  for (const x of [-.86, .86]) add(entry, G.box(.07, 1.84, .07), dark, x, .98, .43);
  const signTex = canvasTex(512, 100, (ctx, w, h) => {
    ctx.fillStyle = '#f5f5ee'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#27824e'; ctx.fillRect(0, 0, 110, h);
    ctx.fillStyle = '#fff'; ctx.font = '900 52px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('JR', 55, 70);
    ctx.fillStyle = '#253d40'; ctx.font = `700 43px ${FONT}`; ctx.fillText('渋谷駅', 300, 49);
    ctx.font = '500 20px sans-serif'; ctx.fillText('SHIBUYA · HACHIKO', 300, 82);
  });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: '#fff', emissiveMap: signTex,
    emissiveIntensity: 0, roughness: .65 });
  R.lampMats.push(signMat);
  add(entry, new THREE.PlaneGeometry(1.84, .36), signMat, 0, 1.7, .48, { cast: false });
  const seat = mat('#766454', { roughness: .85 });
  for (const x of [-1.5, 3.85]) {
    const bench = group(root, x, 0, 5.75);
    for (let i = 0; i < 3; i++) add(bench, G.box(.85, .035, .08), seat, 0, .42, -.12 + i * .1);
    for (const s of [-1, 1]) add(bench, G.box(.05, .4, .25), dark, s * .32, .2, 0);
  }
  return entry;
}
