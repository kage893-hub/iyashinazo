import * as THREE from 'three';
import { softCircleTexture } from './util.js';

// ---------------------------------------------------------------
// 箱庭に「生きている感じ」を足す小さな仕掛け
//  ・waterize：水面のゆらぎ（法線をゆらして光の照り返しを動かす）
//  ・sway：草木やのれんを風でそよがせる（頂点を少しずらす）
//  ・Motes：光の中をただよう粒（ほこり・花びら・もや・ほたる）
//  ・lightPool：夜の窓明かりが地面に落ちる光だまり
// 時間はすべて liveTime を共有し、Game が毎フレーム進める。
// ---------------------------------------------------------------

export const liveTime = { value: 0 };

/** 水面をゆらす（MeshStandardMaterial 用） */
export function waterize(material, { strength = 0.35, scale = 1 } = {}) {
  if (material.userData.waterized) return material;
  material.userData.waterized = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    prev && prev(shader, r);
    shader.uniforms.uLiveTime = liveTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLiveW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvLiveW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLiveW;\nuniform float uLiveTime;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 q = vLiveW.xz * ${(3.0 * scale).toFixed(2)};
          float t = uLiveTime;
          vec2 rip = vec2(sin(q.x + t * 1.7) + sin(q.y * 1.3 - t * 1.1 + q.x * 0.4),
                          cos(q.y + t * 1.4) + sin((q.x + q.y) * 0.8 + t * 0.9)) * ${strength.toFixed(3)};
          normal = normalize(normal + (viewMatrix * vec4(rip.x, 0.0, rip.y, 0.0)).xyz);
        }`);
  };
  material.customProgramCacheKey = () => `water${strength}${scale}`;
  material.needsUpdate = true;
  return material;
}

/** 風でそよがせる（高い所ほど大きく動く） */
export function sway(material, { amp = 0.05, speed = 1.0, base = 0 } = {}) {
  if (material.userData.swayed) return material;
  material.userData.swayed = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    prev && prev(shader, r);
    shader.uniforms.uLiveTime = liveTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLiveTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 wp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          wp = modelMatrix * wp;
          float k = clamp((wp.y - ${base.toFixed(2)}) * 0.35, 0.0, 1.5);
          float t = uLiveTime * ${speed.toFixed(2)};
          float g = 0.6 + 0.4 * sin(t * 0.37 + wp.x * 0.11); // ときどき強くなる風
          transformed.x += sin(t * 1.6 + wp.x * 0.6 + wp.z * 0.4) * ${amp.toFixed(3)} * k * g;
          transformed.z += cos(t * 1.3 + wp.z * 0.7 + wp.x * 0.2) * ${amp.toFixed(3)} * k * g * 0.6;
        }`);
  };
  material.customProgramCacheKey = () => `sway${amp}${speed}${base}`;
  material.needsUpdate = true;
  return material;
}

/**
 * ただよう粒。area: { x, z, y0, y1 } の箱の中をゆっくり漂う。
 * kind: 'dust'（光のほこり）/ 'petal'（花びら：ゆっくり落ちる）/ 'mist'（大きくて淡いもや）/ 'firefly'（またたく）
 */
export class Motes {
  constructor(scene, { count = 60, color = '#fff2c8', size = 0.08, area = { x: 26, z: 18, y0: 0.3, y1: 5 }, kind = 'dust', opacity = 0.7, center = [0, 0] } = {}) {
    this.kind = kind;
    this.area = area;
    this.center = center;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = center[0] + (Math.random() - 0.5) * area.x;
      pos[i * 3 + 1] = area.y0 + Math.random() * (area.y1 - area.y0);
      pos[i * 3 + 2] = center[1] + (Math.random() - 0.5) * area.z;
      this.seed[i] = Math.random() * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({
      color, size, map: softCircleTexture(), transparent: true, opacity, depthWrite: false,
      blending: kind === 'mist' ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.baseOpacity = opacity;
    this.points = new THREE.Points(geo, this.mat);
    this.points.userData.noPick = true;
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  set visible(v) { this.points.visible = v; }
  get visible() { return this.points.visible; }

  update(dt, t) {
    if (!this.points.visible) return;
    const p = this.points.geometry.attributes.position;
    const a = this.area, [cx, cz] = this.center;
    for (let i = 0; i < p.count; i++) {
      const s = this.seed[i];
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (this.kind === 'petal') {
        x += (Math.sin(t * 0.8 + s) * 0.4 + 0.25) * dt;
        z += Math.cos(t * 0.6 + s) * 0.25 * dt;
        y -= (0.25 + Math.sin(s) * 0.08) * dt;
      } else if (this.kind === 'mist') {
        x += 0.12 * dt;
        y += Math.sin(t * 0.2 + s) * 0.02 * dt;
      } else {
        x += Math.sin(t * 0.3 + s) * 0.06 * dt;
        z += Math.cos(t * 0.25 + s * 1.3) * 0.06 * dt;
        y += Math.sin(t * 0.4 + s * 0.7) * 0.05 * dt;
      }
      if (y < a.y0) y = a.y1;
      if (y > a.y1) y = a.y0;
      if (x > cx + a.x / 2) x = cx - a.x / 2;
      if (x < cx - a.x / 2) x = cx + a.x / 2;
      if (z > cz + a.z / 2) z = cz - a.z / 2;
      if (z < cz - a.z / 2) z = cz + a.z / 2;
      p.setXYZ(i, x, y, z);
    }
    p.needsUpdate = true;
    if (this.kind === 'firefly') this.mat.opacity = this.baseOpacity * (0.6 + 0.4 * Math.sin(t * 2.3));
  }
}

let _poolTex = null;
function poolTexture() {
  if (_poolTex) return _poolTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  _poolTex = new THREE.CanvasTexture(c);
  return _poolTex;
}

/** 夜の窓明かりが地面に落ちる、やわらかい光だまり（強さは .material.opacity で） */
export function lightPool(parent, x, y, z, w, d, color = '#ffb860', ry = 0) {
  const m = new THREE.MeshBasicMaterial({ color, map: poolTexture(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.set(-Math.PI / 2, 0, ry);
  mesh.position.set(x, y, z);
  mesh.userData.noPick = true;
  mesh.userData.keep = true;
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}
