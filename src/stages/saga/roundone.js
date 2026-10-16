import * as THREE from 'three';
import { add, G, group, mat } from '../../lib/util.js';
import { sign, rod, parking, littleCar, planter } from './site-details.js';

function giantPin(parent, x, y, z) {
  const points = [[0,0],[1.05,0],[1.28,.45],[1.35,1.8],[1.06,3.2],[.53,4.1],[.40,5],[.62,5.9],[.67,6.5],[.49,7.1],[0,7.35]].map(p => new THREE.Vector2(...p));
  const g = group(parent, x, y, z);
  add(g, new THREE.LatheGeometry(points, 24), mat('#f2eee1', { roughness: .45 }));
  for (const yy of [4.44, 4.74]) add(g, G.cyl(.455, .455, .17, 24), mat('#c43e36'), 0, yy, 0);
  return g;
}

/** 公式掲載写真の黒・橙の壁、中央ガラス、屋上ピンと防球網を参照。寸法は概算。 */
export function createRoundOneSaga(parent) {
  const root = group(parent); root.name = 'ラウンドワンスタジアム佐賀店';
  const orange = mat('#bc7351'), black = mat('#303a3d'), glass = mat('#405a65', { roughness: .32, metalness: .05 }), metal = mat('#87908d');
  parking(root, 100, 27, 0, 48, { rows: 2 });
  add(root, G.box(88, 24, 61), orange, 0, 12, 0);
  add(root, G.box(29, 24.15, 61.3), black, -29.5, 12.075, 0);
  add(root, G.box(88.6, .4, 61.6), mat('#a0a49b'), 0, 24.22, 0);
  // 入口まで連続する縦長のガラス面。写真の橙の横帯を両脇に残す。
  add(root, G.box(15.6, 23.2, .3), glass, -13, 11.9, 30.68);
  for (const xx of [-20.9, -17, -13, -9, -5.1]) add(root, G.box(.12, 23.3, .13), metal, xx, 11.95, 30.91);
  for (let yy = 1.4; yy < 24; yy += 2.85) add(root, G.box(15.7, .10, .13), metal, -13, yy, 30.92);
  for (const x of [-24.4, -1.8]) for (let y = 4.3; y < 22; y += 3.3) add(root, G.box(6.3, 1.1, .17), black, x, y, 30.71);
  sign(root, 'ROUND1', 17, 3.7, -30, 20.9, 30.85, { bg: '#303a3d', color: '#fffbea', sub: 'STADIUM' });
  sign(root, 'ROUND1', 24, 5.1, 20.5, 17.7, 30.72, { bg: '#bc7351', color: '#f6eee0', sub: 'BOWLING · SPO-CHA · KARAOKE' });
  for (let xx = -42; xx < 44; xx += 4) add(root, G.box(.035, 23.7, .045), mat('#986143'), xx, 12, 30.58);
  // 屋上のスポーツエリア。防球網は抜ける線の面で囲う。
  add(root, G.box(60, .13, 51), mat('#74897c'), 10, 24.51, -1);
  const lines = [];
  const line = (a,b) => lines.push(...a,...b);
  for (const zz of [-27, 25]) {
    for (let x = -21; x <= 41; x += 6.2) rod(root, [x,24.6,zz], [x,35,zz], .13, metal);
    for (let x = -21; x <= 41; x += 1.55) line([x,24.6,zz],[x,35,zz]);
    for (let y = 24.6; y <= 35; y += .8) line([-21,y,zz],[41,y,zz]);
  }
  for (const xx of [-21, 41]) {
    for (let z = -27; z <= 25; z += 1.6) line([xx,24.6,z],[xx,35,z]);
    for (let y = 24.6; y <= 35; y += .8) line([xx,y,-27],[xx,y,25]);
  }
  const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  root.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: '#777f77', transparent: true, opacity: .55 })));
  giantPin(root, -34, 24.4, 23);
  add(root, G.box(19, 3.3, .22), glass, -12, 2, 30.98);
  for (const xx of [-20, -14.7, -9.3, -4]) add(root, G.box(.18, 3.3, .25), metal, xx, 2, 31.12);
  add(root, G.box(28, .30, 4.4), black, -11, 4.3, 32.4);
  sign(root, 'ENTRANCE', 10.5, .9, -11, 4.07, 34.65, { bg: '#303a3d', color: '#f1e7ce' });
  for (const xx of [-22, 0]) add(root, G.cyl(.16, .16, 4, 8), metal, xx, 2.1, 33.8);
  for (const [x,z,c] of [[-35,41,'#e4dfd1'],[-26,41,'#596b7c'],[18,55,'#b5c0b2'],[29,55,'#ab5e4c'],[38,41,'#dedcd0']]) littleCar(root,x,z,c);
  for (const x of [-40,28,38]) planter(root, x, 33.5, 4.2, .7);
  // 幹線から見つけられる独立看板。
  const pole = group(root, 45, 0, 49);
  add(pole, G.box(.55, 13, .55), black, 0, 6.5, -.4);
  add(pole, G.box(7.3, 4.4, .5), black, 0, 12, 0);
  sign(pole, 'ROUND1', 6.9, 3.6, 0, 12.1, .26, { bg: '#303a3d', color: '#faf7e8', sub: 'STADIUM' });
  root.updateMatrixWorld(true);
  return { root, focusTarget: new THREE.Vector3(-10, 7, 31), views: { front: {position:[25,28,145],target:[0,12,23]}, whole:{position:[120,100,144],target:[0,9,10]} }, bounds:new THREE.Box3().setFromObject(root) };
}
