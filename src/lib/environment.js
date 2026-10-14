import * as THREE from 'three';
import { add, mat, G, group, roundRectShape, rng, softCircleTexture, puffTexture, lerp } from './util.js';

// ---------------------------------------------------------------
// どのステージでも使う「空・浮島・雲海・光の粒」
// ---------------------------------------------------------------

/** 夕暮れ ⇄ 夜 を切り替えられる空のドーム */
export function makeSky() {
  const uniforms = {
    night: { value: 0 },
    time: { value: 0 },
    sunDir: { value: new THREE.Vector3(-0.8, 0.12, -0.6).normalize() },
    moonDir: { value: new THREE.Vector3(0.5, 0.45, -0.75).normalize() },
    dTop: { value: new THREE.Color('#3b4a9a') },
    dMid: { value: new THREE.Color('#f39a7a') },
    dBot: { value: new THREE.Color('#ffd9a8') },
    nTop: { value: new THREE.Color('#070a24') },
    nMid: { value: new THREE.Color('#1d2660') },
    nBot: { value: new THREE.Color('#3a3f7a') },
  };
  const m = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform float night; uniform float time;
      uniform vec3 sunDir; uniform vec3 moonDir;
      uniform vec3 dTop; uniform vec3 dMid; uniform vec3 dBot;
      uniform vec3 nTop; uniform vec3 nMid; uniform vec3 nBot;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 day = mix(dMid, dTop, smoothstep(0.02, 0.55, h));
        day = mix(dBot, day, smoothstep(-0.45, 0.05, h));
        vec3 nt = mix(nMid, nTop, smoothstep(0.0, 0.6, h));
        nt = mix(nBot, nt, smoothstep(-0.45, 0.05, h));
        vec3 col = mix(day, nt, night);
        float s = max(dot(d, sunDir), 0.0);
        col += vec3(1.0, 0.55, 0.3) * pow(s, 6.0) * 0.6 * (1.0 - night);
        col += vec3(1.0, 0.85, 0.6) * smoothstep(0.9975, 0.999, s) * 3.0 * (1.0 - night);
        // 月
        float mo = dot(d, moonDir);
        col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9988, 0.9992, mo) * (0.6 + 1.6 * night);
        col += vec3(0.5, 0.6, 1.0) * pow(max(mo, 0.0), 60.0) * 0.25 * (0.3 + night);
        // 星
        vec3 p = d * 160.0;
        vec3 cell = floor(p);
        float r = hash(cell);
        if (r > 0.993) {
          vec3 f = fract(p) - 0.5;
          float st = smoothstep(0.32, 0.0, length(f));
          float tw = 0.6 + 0.4 * sin(time * (1.0 + r * 4.0) + r * 60.0);
          col += vec3(1.0, 0.95, 0.85) * st * tw * smoothstep(-0.05, 0.35, h) * mix(0.25, 1.4, night);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), m);
  sky.userData.noPick = true;
  sky.renderOrder = -10;
  return { mesh: sky, uniforms };
}

/**
 * 地層の見える浮島の土台
 * 上面は y = 0
 */
export function makeIslandBase({ w = 30, d = 22, seed = 3, grass = '#86b35c' } = {}) {
  const root = new THREE.Group();
  const r = rng(seed);
  const layers = [
    { h: 0.5, c: grass, inset: 0 },
    { h: 0.7, c: '#7a5a3c', inset: 0.15 },
    { h: 0.5, c: '#94704a', inset: 0.3 },
    { h: 0.8, c: '#6a4b33', inset: 0.5 },
    { h: 0.6, c: '#85664a', inset: 0.75 },
  ];
  let y = 0;
  layers.forEach((L, i) => {
    const shape = roundRectShape(w - L.inset * 2, d - L.inset * 2, 2.6 - L.inset * 0.3);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: L.h, bevelEnabled: i === 0, bevelSize: 0.18, bevelThickness: 0.15, bevelSegments: 3, curveSegments: 10,
    });
    const m = add(root, geo, mat(L.c, { roughness: 0.95 }), 0, y - L.h, 0, { rot: [-Math.PI / 2, 0, 0], cast: i < 2 });
    if (i === 0) m.position.y = -L.h - 0.15;
    y -= L.h;
  });
  // 地層に埋まった石
  for (let i = 0; i < 40; i++) {
    const side = Math.floor(r() * 4);
    const yy = -0.5 - r() * 2.6;
    let x, z;
    if (side < 2) { x = (r() - 0.5) * (w - 4); z = (side ? 1 : -1) * (d / 2 - 0.45); }
    else { z = (r() - 0.5) * (d - 4); x = (side === 2 ? 1 : -1) * (w / 2 - 0.45); }
    add(root, G.dodeca(0.15 + r() * 0.25), mat(r() > 0.5 ? '#9a948a' : '#7d766c', { flatShading: true }), x, yy, z, { rot: [r() * 3, r() * 3, 0] });
  }
  // 下の岩（逆さ円錐）
  const cone = new THREE.ConeGeometry(Math.min(w, d) * 0.55, 11, 9, 5);
  const pos = cone.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);
    if (vy > 5.4) continue;
    pos.setX(i, pos.getX(i) * (1 + (r() - 0.5) * 0.25));
    pos.setZ(i, pos.getZ(i) * (1 + (r() - 0.5) * 0.25));
    pos.setY(i, vy + (r() - 0.5) * 0.8);
  }
  cone.computeVertexNormals();
  const rock = add(root, cone, mat('#5d4a3e', { flatShading: true, roughness: 1 }), 0, y - 5.4, 0, { rot: [Math.PI, 0, 0], scale: [w / d * 0.95, 1, 0.95] });
  rock.receiveShadow = false;
  // 光る結晶
  const crystalCols = ['#8fe3ff', '#c59bff', '#7fffd4'];
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const yy = y - 1 - r() * 6;
    const rad = (Math.min(w, d) * 0.5) * (1 - (y - yy) / 12) * 0.9;
    const col = crystalCols[i % 3];
    add(root, G.oct(0.3 + r() * 0.4), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: 0.2 }),
      Math.cos(a) * rad * (w / d), yy, Math.sin(a) * rad, { rot: [r(), r(), r()], scale: [0.6, 1.6, 0.6], cast: false });
  }
  // 垂れ下がる根っこ
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const px = Math.cos(a) * (w / 2 - 1.5), pz = Math.sin(a) * (d / 2 - 1.5);
    const len = 1.5 + r() * 3;
    const pts = [];
    for (let k = 0; k <= 4; k++) pts.push(new THREE.Vector3(px + (r() - 0.5) * 0.6 * k, y + 0.3 - (len * k) / 4, pz + (r() - 0.5) * 0.6 * k));
    add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.05 * (1 + r()), 5), mat('#4e3a2a'), 0, 0, 0, { cast: false });
  }
  root.traverse((o) => { o.userData.noPick = false; });
  return root;
}

/** 遠景の小さな浮島 */
export function makeSmallIsland(seed = 1, size = 3) {
  const r = rng(seed);
  const g = new THREE.Group();
  add(g, G.cyl(size, size * 0.9, size * 0.3, 9), mat('#7fae5a', { flatShading: true }), 0, 0, 0, { cast: false, receive: false });
  const cone = new THREE.ConeGeometry(size * 0.9, size * 2.2, 8, 3);
  const p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < size) { p.setX(i, p.getX(i) * (1 + (r() - 0.5) * 0.3)); p.setZ(i, p.getZ(i) * (1 + (r() - 0.5) * 0.3)); }
  cone.computeVertexNormals();
  add(g, cone, mat('#6a5040', { flatShading: true }), 0, -size * 1.25, 0, { rot: [Math.PI, 0, 0], cast: false, receive: false });
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rr = r() * size * 0.6;
    const tg = group(g, Math.cos(a) * rr, size * 0.15, Math.sin(a) * rr);
    add(tg, G.cyl(0.08 * size, 0.1 * size, size * 0.4, 6), mat('#6b4a32'), 0, size * 0.2, 0, { cast: false });
    add(tg, G.ico(size * 0.35, 0), mat(r() > 0.5 ? '#e0874a' : '#5f9a4a', { flatShading: true }), 0, size * 0.55, 0, { cast: false });
  }
  g.traverse((o) => { o.userData.noPick = true; });
  return g;
}

/** 雲海と遠くの雲 */
export function makeClouds(seed = 9) {
  const r = rng(seed);
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const m = new THREE.MeshStandardMaterial({ color: '#fff4ee', roughness: 1, flatShading: true, emissive: '#ffb8a0', emissiveIntensity: 0.18 });
  const count = 420;
  const inst = new THREE.InstancedMesh(geo, m, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    // 遠くの雲はまばらに低く（奥の遠景がすき間からのぞく）
    const far = i > 360;
    const rad = far ? 80 + r() * 90 : 22 + r() * 120;
    const y = far ? -14 + r() * 12 : -20 - r() * 7;
    dummy.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    const s = far ? 3 + r() * 6 : 4 + r() * 7;
    dummy.scale.set(s * (1.2 + r()), s * (0.45 + r() * 0.3), s * (1 + r() * 0.6));
    dummy.rotation.set(0, r() * 6, 0);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.userData.noPick = true;
  g.add(inst);
  g.userData.mat = m;
  return g;
}

/** ホタル（夜になると明るくなる） */
export function makeFireflies(count = 70, area = { x: 26, z: 18, y0: 0.3, y1: 3.5 }, seed = 5) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * area.x;
    pos[i * 3 + 1] = area.y0 + r() * (area.y1 - area.y0);
    pos[i * 3 + 2] = (r() - 0.5) * area.z;
    ph[i] = r() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, intensity: { value: 0.4 }, map: { value: softCircleTexture() }, size: { value: 34 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float phase; uniform float time; uniform float size; varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(time * 0.3 + phase) * 0.8;
        p.y += sin(time * 0.5 + phase * 1.7) * 0.4;
        p.z += cos(time * 0.27 + phase * 0.6) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size / -mv.z * (0.6 + 0.4 * sin(time * 2.0 + phase));
        vA = 0.5 + 0.5 * sin(time * 1.6 + phase * 3.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float intensity; varying float vA;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.45) * 2.5 * intensity, t.a * vA);
      }`,
  });
  const pts = new THREE.Points(geo, m);
  pts.userData.noPick = true;
  pts.frustumCulled = false;
  return pts;
}

/** 煙・湯気のパーティクル（スプライト） */
export class Puffs {
  constructor(scene, { count = 60, color = '#ffffff', opacity = 0.7, additive = false } = {}) {
    this.items = [];
    this.scene = scene;
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({
        map: puffTexture(), color, transparent: true, opacity: 0, depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true,
      });
      const s = new THREE.Sprite(m);
      s.visible = false;
      s.userData.noPick = true;
      scene.add(s);
      this.items.push({ s, life: 0, max: 1, vel: new THREE.Vector3(), size0: 0.5, size1: 2 });
    }
    this.baseOpacity = opacity;
    this.idx = 0;
  }

  emit(pos, { vel = new THREE.Vector3(0, 1.5, 0), spread = 0.3, life = 2.5, size0 = 0.4, size1 = 2.2, color } = {}) {
    const p = this.items[this.idx];
    this.idx = (this.idx + 1) % this.items.length;
    p.s.position.copy(pos);
    p.vel.copy(vel).add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.5, (Math.random() - 0.5) * spread));
    p.life = 0;
    p.max = life * (0.8 + Math.random() * 0.4);
    p.size0 = size0; p.size1 = size1;
    p.rot = Math.random() * Math.PI;
    if (color) p.s.material.color.set(color);
    p.s.visible = true;
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.s.visible) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { p.s.visible = false; continue; }
      p.s.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - dt * 0.6);
      p.vel.x += dt * 0.25; // そよ風
      const s = lerp(p.size0, p.size1, Math.sqrt(k));
      p.s.scale.set(s, s, s);
      p.s.material.rotation = p.rot + k;
      p.s.material.opacity = this.baseOpacity * Math.min(1, k * 6) * (1 - k);
    }
  }
}

/** ひらひら落ちる葉っぱ */
export class Leaves {
  constructor(scene, { count = 26, center = new THREE.Vector3(), radius = 2.5, top = 6, colors = ['#e2763a', '#f0a24a', '#c9452e'] } = {}) {
    this.items = [];
    this.center = center; this.radius = radius; this.top = top;
    const geo = new THREE.PlaneGeometry(0.22, 0.16);
    for (let i = 0; i < count; i++) {
      const m = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, roughness: 0.8 });
      const leaf = new THREE.Mesh(geo, m);
      leaf.castShadow = true;
      leaf.userData.noPick = true;
      scene.add(leaf);
      const it = { leaf, ph: Math.random() * 10 };
      this._reset(it, Math.random() * top);
      this.items.push(it);
    }
  }
  _reset(it, y) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
    it.leaf.position.set(this.center.x + Math.cos(a) * r, y ?? this.top, this.center.z + Math.sin(a) * r);
    it.speed = 0.35 + Math.random() * 0.3;
  }
  update(dt, t) {
    for (const it of this.items) {
      const l = it.leaf;
      l.position.y -= it.speed * dt;
      l.position.x += Math.sin(t * 1.3 + it.ph) * dt * 0.6 + dt * 0.2;
      l.position.z += Math.cos(t * 1.1 + it.ph) * dt * 0.4;
      l.rotation.set(t * 1.7 + it.ph, t * 1.2 + it.ph, Math.sin(t + it.ph));
      if (l.position.y < 0.03) {
        l.position.y = 0.03;
        it.rest = (it.rest || 0) + dt;
        l.rotation.set(-Math.PI / 2, 0, it.ph);
        if (it.rest > 4) { it.rest = 0; this._reset(it); }
      }
    }
  }
}

/** ひらひら飛ぶチョウ */
export class Butterflies {
  constructor(scene, spots, seed = 3) {
    const r = rng(seed);
    this.items = spots.map((c, i) => {
      const g = new THREE.Group();
      const col = ['#ffd36a', '#8fd4ff', '#ff9ac0', '#ffffff'][i % 4];
      const m = new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.25 });
      const wing = new THREE.CircleGeometry(0.09, 8);
      const L = new THREE.Mesh(wing, m), R = new THREE.Mesh(wing, m);
      L.position.x = -0.08; R.position.x = 0.08;
      const lp = new THREE.Group(), rp = new THREE.Group();
      lp.add(L); rp.add(R);
      g.add(lp, rp);
      g.traverse((o) => { o.userData.noPick = true; });
      scene.add(g);
      return { g, lp, rp, c, ph: r() * 10, rad: 0.8 + r() * 1.2 };
    });
  }
  update(dt, t, night) {
    for (const b of this.items) {
      b.g.visible = night < 0.6;
      const k = t * 0.5 + b.ph;
      b.g.position.set(b.c.x + Math.cos(k) * b.rad, b.c.y + 0.5 + Math.sin(k * 2.3) * 0.25, b.c.z + Math.sin(k * 1.3) * b.rad);
      b.g.rotation.y = -k + Math.PI / 2;
      const f = Math.sin(t * 18 + b.ph) * 1.1;
      b.lp.rotation.z = f; b.rp.rotation.z = -f;
      b.lp.rotation.x = b.rp.rotation.x = -Math.PI / 2;
    }
  }
}

/** 遠くを旋回する鳥 */
export class Birds {
  constructor(scene, count = 5, seed = 4) {
    const r = rng(seed);
    const m = new THREE.MeshBasicMaterial({ color: '#4a3a5a', side: THREE.DoubleSide, fog: true });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.15, -0.5, 0, -0.1, 0, 0, -0.15, 0, 0, 0.15, 0.5, 0, -0.1, 0, 0, -0.15], 3));
    geo.computeVertexNormals();
    this.items = [];
    for (let i = 0; i < count; i++) {
      const b = new THREE.Mesh(geo.clone(), m);
      b.userData.noPick = true;
      b.scale.setScalar(1.4);
      scene.add(b);
      this.items.push({ b, ph: r() * 10, rad: 26 + r() * 14, h: 9 + r() * 6, sp: 0.12 + r() * 0.06 });
    }
  }
  update(dt, t) {
    for (const it of this.items) {
      const k = t * it.sp + it.ph;
      it.b.position.set(Math.cos(k) * it.rad, it.h + Math.sin(k * 3) * 0.8, Math.sin(k) * it.rad * 0.7);
      it.b.rotation.y = -k;
      const p = it.b.geometry.attributes.position;
      const flap = Math.sin(t * 7 + it.ph) * 0.25;
      p.setY(1, flap); p.setY(4, flap);
      p.needsUpdate = true;
    }
  }
}
