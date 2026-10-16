// ブラウザなしで、現代日本・むかし目の共通座標変換と模型の寸法を調べる。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three/build/three.module.min.js';

// ブラウザの import map と同じ同梱版を使い、npm 依存を増やさない。
const threeURL = new URL('../vendor/three/build/three.module.min.js', import.meta.url);
const source = (await readFile(new URL('../src/stages/japan/layout.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from ${JSON.stringify(threeURL.href)}`);
const { layoutX, layoutZ, layoutPoint, applyJapanLayout } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`OK ${name}`); };
const close = (actual, expected, message = '') => assert.ok(Math.abs(actual - expected) < 1e-5, `${message} ${actual} != ${expected}`);
const vectorClose = (actual, expected) => {
  close(actual.x, expected.x, 'x'); close(actual.y, expected.y, 'y'); close(actual.z, expected.z, 'z');
};
const positions = (geometry) => Array.from(geometry.attributes.position.array);
const worldBounds = (object) => new THREE.Box3().setFromObject(object);

test('街区: 境界が連続し、中央を保ちながら東西と手前に余白を作る', () => {
  for (const [x, expected] of [[-30, -36], [-16, -22], [-11, -14], [-6, -6], [0, 0], [8, 8], [12, 15], [16, 22], [30, 36]]) close(layoutX(x), expected);
  for (const [z, expected] of [[-22, -22], [-2.4, -2.4], [0, 0.84], [6.4, 9.48], [22, 25.08]]) close(layoutZ(z), expected);
  for (const x of [-16, -6, 8, 16]) {
    close(layoutX(x - 1e-7), layoutX(x)); close(layoutX(x + 1e-7), layoutX(x));
  }
  for (const z of [-2.4, 6.4]) {
    close(layoutZ(z - 1e-7), layoutZ(z)); close(layoutZ(z + 1e-7), layoutZ(z));
  }
  for (let n = -40; n < 40; n += 0.25) {
    assert.ok(layoutX(n + 0.25) > layoutX(n)); assert.ok(layoutZ(n + 0.25) > layoutZ(n));
  }
});

test('座標: カメラ等の元 Vector3 と高さを変更しない', () => {
  const input = new THREE.Vector3(-11, 3.25, 4);
  const output = layoutPoint(input);
  assert.notEqual(input, output);
  vectorClose(input, new THREE.Vector3(-11, 3.25, 4));
  vectorClose(output, new THREE.Vector3(-14, 3.25, 6.24));
});

test('模型: 原点の動的コンテナを再帰し、建物内の寸法・回転・細部を保つ', () => {
  const root = new THREE.Group(), far = new THREE.Group(), temple = new THREE.Group();
  far.userData.dynamic = true; root.add(far); far.add(temple);
  const building = new THREE.Group(); building.position.set(-11, 0, 4); building.rotation.y = -Math.PI / 2; temple.add(building);
  const geometry = new THREE.BoxGeometry(16, 3, 4), detail = new THREE.Mesh(geometry);
  detail.position.set(0.8, 2, 1); detail.rotation.z = 0.1; building.add(detail);
  const original = positions(geometry), dimensions = worldBounds(building).getSize(new THREE.Vector3());
  const single = new THREE.Mesh(geometry); single.position.set(24, 1, -12); far.add(single);
  // 建物内の大きい Mesh も再伸長しない。直下の小さい看板はアンカーだけ移す。
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.1)); sign.position.set(-24, 1.5, 0); far.add(sign);
  const signGeometry = sign.geometry;
  applyJapanLayout(root);
  vectorClose(building.position, new THREE.Vector3(-14, 0, 6.24));
  vectorClose(detail.position, new THREE.Vector3(0.8, 2, 1)); close(detail.rotation.z, 0.1); close(building.rotation.y, -Math.PI / 2);
  vectorClose(worldBounds(building).getSize(new THREE.Vector3()), dimensions);
  assert.equal(detail.geometry, geometry); assert.deepEqual(positions(geometry), original);
  vectorClose(sign.position, new THREE.Vector3(-30, 1.5, 0.84)); assert.equal(sign.geometry, signGeometry);
});

test('道路: アンカーと両端を移し、共用 geometry と別の模型を変更しない', () => {
  const root = new THREE.Group(), geometry = new THREE.BoxGeometry(59.4, 0.08, 2.8);
  const road = new THREE.Mesh(geometry); road.position.set(0, 0.04, 0.9); root.add(road);
  const building = new THREE.Group(); building.position.set(-20, 0, -15); root.add(building);
  const shared = new THREE.Mesh(geometry); building.add(shared);
  const original = positions(geometry);
  applyJapanLayout(root);
  vectorClose(road.position, new THREE.Vector3(0, 0.04, 2.055));
  const bounds = worldBounds(road);
  close(bounds.min.x, -35.7); close(bounds.max.x, 35.7);
  close(bounds.min.z, 0.165); close(bounds.max.z, 3.945);
  assert.notEqual(road.geometry, geometry); assert.equal(shared.geometry, geometry);
  assert.deepEqual(positions(geometry), original);
  assert.ok(road.geometry.boundingBox); assert.ok(road.geometry.boundingSphere.radius > 35);
});

test('三角形: 焼き込み頂点を区分ごとに写像し、インデックスと UV を保持する', () => {
  const root = new THREE.Group(), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-16, 0.2, -2.4, -6, 0.2, 6.4, 16, 0.2, 2], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 1, 0], 2));
  geometry.setIndex([0, 1, 2]); geometry.computeVertexNormals();
  const original = positions(geometry), triangle = new THREE.Mesh(geometry); root.add(triangle);
  applyJapanLayout(root);
  const expected = [[-22, 0.2, -2.4], [-6, 0.2, 9.48], [22, 0.2, 3.54]];
  expected.forEach((point, i) => vectorClose(new THREE.Vector3().fromBufferAttribute(triangle.geometry.attributes.position, i).applyMatrix4(triangle.matrixWorld), new THREE.Vector3(...point)));
  assert.deepEqual(positions(geometry), original);
  assert.deepEqual(Array.from(triangle.geometry.index.array), [0, 1, 2]);
  assert.deepEqual(Array.from(triangle.geometry.attributes.uv.array), Array.from(geometry.attributes.uv.array));
  close(triangle.geometry.boundingBox.max.x, 22);
  assert.ok(triangle.geometry.boundingSphere.radius > 20);
});

test('座標系: 回転・縮尺のある原点コンテナでも道路のワールド頂点を正しく伸長する', () => {
  const root = new THREE.Group(), container = new THREE.Group(); root.add(container);
  container.rotation.y = 0.3; container.scale.set(1.4, 1, 0.8);
  const road = new THREE.Mesh(new THREE.BoxGeometry(50, 0.1, 2)); road.position.set(-2, 0.6, 5); container.add(road);
  root.updateMatrixWorld(true);
  const oldMatrix = road.matrixWorld.clone(), oldVertices = positions(road.geometry);
  applyJapanLayout(root);
  for (let i = 0; i < road.geometry.attributes.position.count; i++) {
    const expected = layoutPoint(new THREE.Vector3(...oldVertices.slice(i * 3, i * 3 + 3)).applyMatrix4(oldMatrix));
    const actual = new THREE.Vector3().fromBufferAttribute(road.geometry.attributes.position, i).applyMatrix4(road.matrixWorld);
    vectorClose(actual, expected);
    close(new THREE.Vector3().fromBufferAttribute(road.geometry.attributes.normal, i).length(), 1);
  }
});

test('電線: 14 未満の短い焼き込み TubeGeometry も両端の電柱に追従する', () => {
  const root = new THREE.Group(), street = new THREE.Group(); root.add(street);
  const start = new THREE.Vector3(-14, 4, 13), end = new THREE.Vector3(-9.6, 4, 13);
  const geometry = new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 4, 0.01, 4);
  const wire = new THREE.Mesh(geometry); wire.userData.layoutStretch = true; street.add(wire);
  const poles = [start, end].map((point) => { const pole = new THREE.Group(); pole.position.copy(point); street.add(pole); return pole; });
  const original = positions(geometry);
  assert.ok(worldBounds(wire).getSize(new THREE.Vector3()).x < 14);
  applyJapanLayout(root);
  const bounds = worldBounds(wire);
  close(bounds.min.x, poles[0].getWorldPosition(new THREE.Vector3()).x);
  close(bounds.max.x, poles[1].getWorldPosition(new THREE.Vector3()).x);
  close(bounds.getCenter(new THREE.Vector3()).z, 16.08);
  close(poles[0].position.x, -18.8); close(poles[1].position.x, -11.76);
  assert.notEqual(wire.geometry, geometry); assert.deepEqual(positions(geometry), original);
});

test('地面: 新寸法で作った layoutFixed 地面・固定コンテナを伸長しない', () => {
  const root = new THREE.Group(), ground = new THREE.Mesh(new THREE.BoxGeometry(72, 0.1, 56));
  ground.userData.layoutFixed = true; ground.position.y = -0.05; root.add(ground);
  const fixed = new THREE.Group(); fixed.position.set(-20, 0, 10); fixed.userData.layoutFixed = true; root.add(fixed);
  const child = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 2)); child.position.set(3, 0, 2); fixed.add(child);
  const geometry = ground.geometry, original = positions(geometry), childGeometry = child.geometry;
  applyJapanLayout(root);
  assert.equal(ground.geometry, geometry); assert.deepEqual(positions(geometry), original);
  vectorClose(worldBounds(ground).getSize(new THREE.Vector3()), new THREE.Vector3(72, 0.1, 56));
  vectorClose(fixed.position, new THREE.Vector3(-20, 0, 10)); vectorClose(child.position, new THREE.Vector3(3, 0, 2));
  assert.equal(child.geometry, childGeometry);
});

test('二重適用: 同じ root・建物・道路を再処理しても座標と geometry を変えない', () => {
  const root = new THREE.Group(), building = new THREE.Group(); building.position.set(-14, 0, 4); root.add(building);
  const detail = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)); detail.position.x = 1; building.add(detail);
  const road = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 2)); road.position.z = 7; root.add(road);
  assert.equal(applyJapanLayout(root), root);
  const snapshot = root.toJSON(), geometry = road.geometry;
  applyJapanLayout(root); applyJapanLayout(building); applyJapanLayout(detail); applyJapanLayout(road);
  assert.deepEqual(root.toJSON(), snapshot); assert.equal(road.geometry, geometry);
});

console.log(`PASS ${passed} checks`);
