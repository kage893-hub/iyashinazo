import * as THREE from 'three';
import { add, mat, G, group } from './util.js';
import { Creature, beadEye } from './creatures.js';

// ---------------------------------------------------------------
// 主人公：レッサーパンダの旅人
// 地面をタップした場所へ、段差や建物をよけて歩いていく。
// ---------------------------------------------------------------

export function makeRedPanda() {
  const c = new Creature('player');
  const b = c.body;
  const fur = mat('#c8572a');
  const dark = mat('#3a2420');
  const cream = mat('#fbf1e2');
  // 足
  c.legs = [];
  for (const s of [-1, 1]) {
    const leg = group(b, s * 0.13, 0.22, 0.02);
    add(leg, G.capsule(0.07, 0.12), dark, 0, -0.1, 0);
    add(leg, G.sphere(0.08), dark, 0, -0.18, 0.04, { scale: [1, 0.6, 1.3] });
    c.legs.push(leg);
  }
  // 胴
  add(b, G.sphere(0.24, 20, 14), fur, 0, 0.36, 0, { scale: [1, 1.05, 0.95] });
  add(b, G.sphere(0.17, 16, 12), dark, 0, 0.32, 0.1, { scale: [1, 1.05, 0.7] });
  // 腕
  c.arms = [];
  for (const s of [-1, 1]) {
    const arm = group(b, s * 0.22, 0.45, 0.03);
    arm.rotation.z = s * 0.3;
    add(arm, G.capsule(0.055, 0.14), dark, 0, -0.1, 0);
    c.arms.push(arm);
  }
  // 黄色いマフラー
  add(b, G.torus(0.16, 0.05, 8, 20), mat('#f2c33a'), 0, 0.55, 0.01, { rot: [Math.PI / 2, 0, 0] });
  add(b, G.box(0.08, 0.2, 0.03), mat('#f2c33a'), 0.1, 0.45, 0.18, { rot: [0.2, 0, 0.3] });
  // 小さなリュック（星のお守りつき）
  add(b, G.box(0.26, 0.26, 0.14), mat('#7a5a3a'), 0, 0.42, -0.22, { rot: [0.1, 0, 0] });
  add(b, G.box(0.27, 0.08, 0.15), mat('#5a4030'), 0, 0.52, -0.22, { rot: [0.1, 0, 0] });
  add(b, G.oct(0.045), mat('#ffd36a', { emissive: '#ffb020', emissiveIntensity: 0.6 }), 0.1, 0.33, -0.3, { scale: [1, 1.3, 0.5] });
  // しましまの大きなしっぽ
  const tail = (c.tail = group(b, 0, 0.26, -0.22));
  tail.rotation.x = -0.9;
  for (let i = 0; i < 6; i++) {
    const r = 0.11 - Math.abs(i - 2) * 0.008;
    add(tail, G.sphere(r, 12, 10), i % 2 ? mat('#e8c8a0') : fur, 0, 0.02, -0.06 - i * 0.1, { scale: [1, 1, 0.9] });
  }
  // 頭
  const head = (c.head = group(b, 0, 0.78, 0.02));
  add(head, G.sphere(0.26, 22, 16), fur, 0, 0, 0, { scale: [1.15, 0.95, 1] });
  // 白いお面もよう
  add(head, G.sphere(0.13, 14, 10), cream, 0, -0.07, 0.17, { scale: [1.2, 0.85, 0.9] });
  for (const s of [-1, 1]) {
    add(head, G.sphere(0.06, 10, 8), cream, s * 0.12, 0.08, 0.2, { scale: [1, 0.7, 0.5] });
    add(head, G.sphere(0.07, 10, 8), cream, s * 0.24, -0.04, 0.12, { scale: [0.8, 1, 0.6] });
    // 目の下の赤茶のすじ
    add(head, G.sphere(0.04, 8, 6), mat('#8a3a1a'), s * 0.1, -0.03, 0.235, { scale: [0.7, 1.3, 0.4], cast: false });
  }
  for (const s of [-1, 1]) c.eyes.push(beadEye(head, s * 0.1, 0.0, 0.24, 0.045));
  add(head, G.sphere(0.035, 10, 8), mat('#2a1a18'), 0, -0.07, 0.29, { scale: [1.3, 0.9, 1] });
  for (const s of [-1, 1]) add(head, G.sphere(0.04, 8, 6), mat('#ff9eae', { transparent: true, opacity: 0.55 }), s * 0.18, -0.08, 0.2, { scale: [1, 0.6, 0.4], cast: false });
  // 丸い耳（ふちが白）
  for (const s of [-1, 1]) {
    const ear = group(head, s * 0.2, 0.2, -0.02);
    ear.rotation.z = -s * 0.4;
    add(ear, G.sphere(0.09, 12, 10), cream, 0, 0, 0, { scale: [1, 1, 0.5] });
    add(ear, G.sphere(0.065, 12, 10), dark, 0, -0.005, 0.02, { scale: [1, 1, 0.45], cast: false });
  }
  c.walking = 0;
  c.extra = (dt, t) => {
    const w = c.walking;
    const ph = t * 12;
    c.legs[0].rotation.x = Math.sin(ph) * 0.7 * w;
    c.legs[1].rotation.x = -Math.sin(ph) * 0.7 * w;
    c.arms[0].rotation.x = -Math.sin(ph) * 0.6 * w;
    c.arms[1].rotation.x = Math.sin(ph) * 0.6 * w;
    c.body.position.y += Math.abs(Math.sin(ph)) * 0.06 * w;
    c.tail.rotation.y = Math.sin(t * (w ? 10 : 1.5)) * (0.15 + w * 0.2);
  };
  return c;
}

export class Player {
  constructor(scene, nav) {
    this.nav = nav;
    this.c = makeRedPanda();
    this.root = this.c.root;
    this.root.scale.setScalar(1.25);
    this.root.traverse((o) => { o.userData.noPick = true; });
    scene.add(this.root);
    this.path = [];
    this.speed = 3.4;
    this.onArrive = null;
    this.yaw = 0;
    // 目的地のしるし
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 24), new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0, depthWrite: false }));
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.userData.noPick = true;
    this.marker.renderOrder = 5;
    scene.add(this.marker);
    this.markerT = 0;
  }

  get position() { return this.root.position; }

  place(p, yaw = 0) {
    this.cancel();
    this.root.position.set(p.x, p.y ?? this.nav.heightAt(p.x, p.z), p.z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
    this.root.visible = true;
  }

  cancel() {
    this.path = [];
    const cb = this.onArrive;
    this.onArrive = null;
    if (cb) cb(false);
  }

  /** 指定した場所へ歩く。たどり着いたら true */
  walkTo(target, { showMarker = true } = {}) {
    this.cancel();
    if (!this.nav.ok) return Promise.resolve(false);
    const path = this.nav.findPath(this.root.position, target);
    if (!path || path.length < 2) return Promise.resolve(true);
    path.shift();
    this.path = path;
    if (showMarker) {
      const end = path[path.length - 1];
      this.marker.position.set(end.x, end.y + 0.03, end.z);
      this.markerT = 1;
    }
    return new Promise((res) => { this.onArrive = res; });
  }

  /** ものの近くまで歩く（遠くて行けなければ、そのまま） */
  async approach(object, reach = 1.4) {
    const box = new THREE.Box3().setFromObject(object);
    const c = box.getCenter(new THREE.Vector3());
    const p = this.root.position;
    // 空の上や島の外のものには歩いていかない
    if (box.min.y > 3.5 || Math.abs(c.x) > 15 || Math.abs(c.z) > 11) { this.face(c); return true; }
    // 箱の中で、いまの位置にいちばん近い点をめざす
    const target = new THREE.Vector3(
      THREE.MathUtils.clamp(p.x, box.min.x, box.max.x), 0,
      THREE.MathUtils.clamp(p.z, box.min.z, box.max.z),
    );
    if (target.distanceTo(new THREE.Vector3(p.x, 0, p.z)) <= reach) { this.face(c); return true; }
    const ok = await this.walkTo(target, { showMarker: false });
    this.face(c);
    return ok;
  }

  face(point) {
    const p = this.root.position;
    this.targetYaw = Math.atan2(point.x - p.x, point.z - p.z);
  }

  update(dt, t) {
    const r = this.root;
    let moving = false;
    if (this.path.length) {
      const next = this.path[0];
      const dx = next.x - r.position.x, dz = next.z - r.position.z;
      const d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) {
        r.position.x = next.x; r.position.z = next.z;
        this.path.shift();
        if (!this.path.length) {
          const cb = this.onArrive;
          this.onArrive = null;
          if (cb) cb(true);
        }
      } else {
        r.position.x += (dx / d) * step;
        r.position.z += (dz / d) * step;
        this.targetYaw = Math.atan2(dx, dz);
      }
      moving = true;
    }
    // 足元の高さにあわせる（段差はなめらかに）
    const gy = this.nav.heightAt(r.position.x, r.position.z);
    r.position.y += (gy - r.position.y) * Math.min(1, dt * 12);
    if (this.targetYaw !== undefined) {
      let d = this.targetYaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 10);
      r.rotation.y = this.yaw;
    }
    this.c.walking += ((moving ? 1 : 0) - this.c.walking) * Math.min(1, dt * 10);
    this.c.update(dt, t);
    // しるし
    if (this.markerT > 0) {
      this.markerT -= dt * 0.8;
      this.marker.material.opacity = Math.max(0, this.markerT) * 0.9;
      this.marker.scale.setScalar(1 + (1 - this.markerT) * 0.6);
    }
  }
}
