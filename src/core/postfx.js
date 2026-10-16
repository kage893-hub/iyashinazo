import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// ミニチュア感を出すティルトシフト（上下をぼかす）
export const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    delta: { value: new THREE.Vector2(1 / 1024, 0) },
    focus: { value: 0.5 },
    range: { value: 0.48 },
    amount: { value: 0.9 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 delta;
    uniform float focus;
    uniform float range;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      float d = abs(vUv.y - focus);
      float b = smoothstep(range * 0.35, range, d) * amount;
      vec4 sum = vec4(0.0);
      float wsum = 0.0;
      for (int i = -4; i <= 4; i++) {
        float fi = float(i);
        float w = exp(-fi * fi / 9.0);
        sum += texture2D(tDiffuse, vUv + delta * fi * b) * w;
        wsum += w;
      }
      gl_FragColor = sum / wsum;
    }
  `,
};

// 仕上げ：ビネットとほんのりした色味
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.38 },
    warmth: { value: 0.03 },
    time: { value: 0 },
    lift: { value: new THREE.Vector3(0, 0, 0) },
    gain: { value: new THREE.Vector3(1, 1, 1) },
    sat: { value: 1 },
    contrast: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float warmth;
    uniform float time;
    uniform vec3 lift;
    uniform vec3 gain;
    uniform float sat;
    uniform float contrast;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // 街ごとの色合わせ：彩度・コントラスト、暗部の色（lift）と明部の色（gain）
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      c.rgb *= mix(vec3(1.0), gain, smoothstep(0.15, 0.95, l));
      c.rgb += lift * (1.0 - smoothstep(0.0, 0.75, l));
      vec2 q = vUv - 0.5;
      float v = 1.0 - dot(q, q) * vignette * 2.2;
      c.rgb *= clamp(v, 0.0, 1.0);
      c.rgb += vec3(warmth, warmth * 0.4, -warmth * 0.5);
      gl_FragColor = vec4(max(c.rgb, 0.0), c.a);
    }
  `,
};

/**
 * 街ごとの仕上げの色調。lift＝暗いところの色、gain＝明るいところの色。
 * 状態の変化（夜→朝など）は mixGrade(a, b, k) でまぜる。
 */
export const GRADES = {
  neutral: { lift: [0, 0, 0], gain: [1, 1, 1], sat: 1, contrast: 1, warmth: 0.03, vignette: 0.38 },
  // はざま駅：夕暮れの琥珀と、紫の影 → 夜は青い影
  station: { lift: [0.022, 0.0, 0.04], gain: [1.05, 1.0, 0.93], sat: 1.05, contrast: 1.03, warmth: 0.02, vignette: 0.38 },
  stationNight: { lift: [0.0, 0.012, 0.05], gain: [1.04, 0.99, 0.95], sat: 0.98, contrast: 1.04, warmth: 0.01, vignette: 0.42 },
  // 天空の街：明るく澄んだ色（雨雲のあいだは少しくすむ）
  skyStorm: { lift: [0.02, 0.022, 0.032], gain: [0.97, 0.99, 1.02], sat: 0.88, contrast: 0.97, warmth: 0.0, vignette: 0.32 },
  sky: { lift: [0.0, 0.008, 0.02], gain: [1.01, 1.02, 1.03], sat: 1.12, contrast: 1.04, warmth: 0.005, vignette: 0.24 },
  // 江戸：藍の影と朱のあかり
  edoNight: { lift: [0.0, 0.012, 0.065], gain: [1.08, 0.97, 0.86], sat: 1.02, contrast: 1.06, warmth: 0.0, vignette: 0.44 },
  edo: { lift: [0.0, 0.01, 0.045], gain: [1.07, 1.0, 0.9], sat: 1.08, contrast: 1.04, warmth: 0.025, vignette: 0.36 },
  // 温泉：青い夜と、灯りの橙
  onsenDark: { lift: [0.0, 0.012, 0.06], gain: [1.02, 0.98, 0.98], sat: 0.95, contrast: 1.04, warmth: 0.0, vignette: 0.46 },
  onsen: { lift: [0.0, 0.014, 0.065], gain: [1.1, 0.98, 0.86], sat: 1.05, contrast: 1.07, warmth: 0.01, vignette: 0.44 },
  // 港：朝霧のミルク色 → 晴れた青と白
  // 勇者の城下町（HD-2D）：あざやかな昼 → 青い夜と灯り
  hero: { lift: [0.0, 0.006, 0.02], gain: [1.03, 1.01, 0.98], sat: 1.16, contrast: 1.06, warmth: 0.015, vignette: 0.42 },
  heroNight: { lift: [0.0, 0.01, 0.06], gain: [1.08, 0.98, 0.88], sat: 1.05, contrast: 1.07, warmth: 0.0, vignette: 0.5 },
  // 魔王城：夕やけの紫と溶岩の赤 → ランタンを灯すと、紫の光につつまれる
  maou: { lift: [0.02, 0.0, 0.04], gain: [1.06, 0.97, 0.98], sat: 1.12, contrast: 1.06, warmth: 0.01, vignette: 0.48 },
  maouLantern: { lift: [0.035, 0.0, 0.08], gain: [0.98, 0.92, 1.08], sat: 1.05, contrast: 1.05, warmth: -0.01, vignette: 0.55 },
  // キノコの森：雨上がりのしっとりした緑 → 虹が出ると、あたたかく澄んだ色に
  kinoko: { lift: [0.0, 0.016, 0.03], gain: [1.0, 1.02, 0.98], sat: 1.02, contrast: 1.03, warmth: 0.0, vignette: 0.4 },
  kinokoRainbow: { lift: [0.0, 0.008, 0.02], gain: [1.05, 1.02, 0.95], sat: 1.14, contrast: 1.05, warmth: 0.02, vignette: 0.34 },
  // おもちゃの街：夕やけの橙 → 動きだすと、あざやかなおもちゃの色
  toy: { lift: [0.02, 0.008, 0.03], gain: [1.05, 0.99, 0.95], sat: 0.98, contrast: 1.03, warmth: 0.02, vignette: 0.42 },
  toyLive: { lift: [0.0, 0.006, 0.02], gain: [1.05, 1.02, 0.98], sat: 1.18, contrast: 1.06, warmth: 0.02, vignette: 0.34 },
  // 東京：灯りの消えた宵 → 灯りがもどった夜。むかし目は、セピアの江戸
  japan: { lift: [0.0, 0.01, 0.05], gain: [0.98, 0.96, 1.0], sat: 0.9, contrast: 1.04, warmth: 0.0, vignette: 0.48 },
  japanNight: { lift: [0.0, 0.006, 0.04], gain: [1.08, 1.0, 0.96], sat: 1.15, contrast: 1.08, warmth: 0.01, vignette: 0.42 },
  japanEdo: { lift: [0.04, 0.025, 0.0], gain: [1.08, 0.98, 0.82], sat: 0.55, contrast: 1.02, warmth: 0.05, vignette: 0.55 },
  museum: { lift: [0.0, 0.014, 0.03], gain: [0.98, 1.04, 1.04], sat: 0.96, contrast: 1.04, warmth: -0.005, vignette: 0.34 },
  museumOpen: { lift: [0.01, 0.018, 0.028], gain: [1.08, 1.05, 0.98], sat: 1.1, contrast: 1.05, warmth: 0.018, vignette: 0.3 },
  portFog: { lift: [0.035, 0.04, 0.05], gain: [0.98, 1.0, 1.02], sat: 0.88, contrast: 0.93, warmth: 0.0, vignette: 0.3 },
  port: { lift: [0.0, 0.006, 0.025], gain: [0.99, 1.01, 1.04], sat: 1.12, contrast: 1.05, warmth: -0.005, vignette: 0.28 },
};

export function mixGrade(a, b, k) {
  const L = (x, y) => x + (y - x) * k;
  return {
    lift: a.lift.map((v, i) => L(v, b.lift[i])),
    gain: a.gain.map((v, i) => L(v, b.gain[i])),
    sat: L(a.sat, b.sat), contrast: L(a.contrast, b.contrast), warmth: L(a.warmth, b.warmth), vignette: L(a.vignette, b.vignette),
  };
}

// ---------------------------------------------------------------
// 深度つきの被写界深度：ピント（見ている場所）から前後に離れるほどぼける。
// 画面の上下の端には、ミニチュアらしい軽いティルトシフトも残す。
// ---------------------------------------------------------------
export const DofShader = {
  uniforms: {
    tDiffuse: { value: null },
    tLin: { value: null },
    delta: { value: new THREE.Vector2(1 / 1024, 0) },
    focusDist: { value: 20 },
    amount: { value: 1.0 },
    depthOn: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tLin;
    uniform vec2 delta;
    uniform float focusDist, amount;
    uniform int depthOn;
    varying vec2 vUv;
    float coc(vec2 uv) {
      float tilt = smoothstep(0.2, 0.5, abs(uv.y - 0.5)) * 0.45;
      if (depthOn == 0) return tilt;
      float z = texture2D(tLin, uv).r;
      float c = clamp((abs(z - focusDist) / focusDist - 0.14) * 1.8, 0.0, 1.0);
      return max(c, tilt);
    }
    void main() {
      float b = coc(vUv) * amount;
      vec4 sum = vec4(0.0);
      float wsum = 0.0;
      for (int i = -4; i <= 4; i++) {
        float fi = float(i);
        vec2 uv = vUv + delta * fi * b * 1.4;
        // 手前のくっきりした物が、うしろのぼけにしみ出さないよう、相手のぼけ量でも重みをつける
        float w = exp(-fi * fi / 9.0) * (i == 0 ? 1.0 : mix(0.25, 1.0, coc(uv)));
        sum += texture2D(tDiffuse, uv) * w;
        wsum += w;
      }
      gl_FragColor = sum / wsum;
    }
  `,
};

// ---------------------------------------------------------------
// すき間の影（スクリーン空間アンビエントオクルージョン）
// 深度だけから計算し、半分の解像度で求めてぼかしてから、色にかける。
// このパスは RenderPass の直後に置き、深度テクスチャを shared.depth に渡す役もする。
// ---------------------------------------------------------------
const AoShader = {
  uniforms: {
    tDepth: { value: null },
    projInv: { value: new THREE.Matrix4() },
    projScale: { value: 1 },
    resolution: { value: new THREE.Vector2(512, 512) },
    radius: { value: 0.7 },
    intensity: { value: 1.7 },
    bias: { value: 0.02 },
  },
  defines: { SAMPLES: 10 },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDepth;
    uniform mat4 projInv;
    uniform float projScale, radius, intensity, bias;
    uniform vec2 resolution;
    varying vec2 vUv;
    vec3 viewPos(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
      return p.xyz / p.w;
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      float d = texture2D(tDepth, vUv).x;
      if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
      vec3 P = viewPos(vUv);
      vec3 N = normalize(cross(dFdx(P), dFdy(P)));
      if (dot(N, -P) < 0.0) N = -N; // カメラ側を向く法線に
      float rScreen = radius * projScale / -P.z; // uv 単位の半径
      float rot = hash(gl_FragCoord.xy) * 6.2831;
      float occ = 0.0;
      for (int i = 0; i < SAMPLES; i++) {
        float t = (float(i) + 0.5) / float(SAMPLES);
        float a = float(i) * 2.39996 + rot;
        vec2 off = vec2(cos(a), sin(a)) * t * rScreen;
        vec3 S = viewPos(vUv + off);
        vec3 v = S - P;
        float vv = dot(v, v);
        float vn = dot(v, N);
        float fall = max(0.0, 1.0 - vv / (radius * radius * 4.0));
        occ += max(0.0, vn - bias * -P.z * 0.05) / (vv + 0.02) * fall;
      }
      // 引きで見たときは細かい影がざらつくので、遠いほど弱める
      float fade = 1.0 - smoothstep(16.0, 42.0, -P.z);
      float ao = clamp(1.0 - intensity * fade * occ / float(SAMPLES) * radius, 0.0, 1.0);
      gl_FragColor = vec4(ao, ao, ao, 1.0);
    }
  `,
};

const AoBlurShader = {
  uniforms: {
    tAO: { value: null },
    tDepth: { value: null },
    dir: { value: new THREE.Vector2(1, 0) },
    cameraNear: { value: 0.5 },
    cameraFar: { value: 600 },
  },
  vertexShader: AoShader.vertexShader,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tAO, tDepth;
    uniform vec2 dir;
    uniform float cameraNear, cameraFar;
    varying vec2 vUv;
    float lin(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    void main() {
      float z0 = lin(vUv);
      float sum = 0.0, ws = 0.0;
      for (int i = -3; i <= 3; i++) {
        vec2 uv = vUv + dir * float(i) * 1.5;
        float w = exp(-float(i * i) / 6.0) * exp(-abs(lin(uv) - z0) / (z0 * 0.03 + 0.001));
        sum += texture2D(tAO, uv).r * w;
        ws += w;
      }
      gl_FragColor = vec4(vec3(sum / ws), 1.0);
    }
  `,
};

const LinDepthShader = {
  uniforms: { tDepth: { value: null }, cameraNear: { value: 0.5 }, cameraFar: { value: 600 } },
  vertexShader: AoShader.vertexShader,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDepth;
    uniform float cameraNear, cameraFar;
    varying vec2 vUv;
    void main() {
      float d = texture2D(tDepth, vUv).x;
      gl_FragColor = vec4(-perspectiveDepthToViewZ(d, cameraNear, cameraFar), 0.0, 0.0, 1.0);
    }
  `,
};

const AoCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tAO: { value: null },
    strength: { value: 0.7 },
    debug: { value: 0 },
  },
  vertexShader: AoShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tAO;
    uniform float strength, debug;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float ao = texture2D(tAO, vUv).r;
      if (debug > 0.5) { gl_FragColor = vec4(vec3(ao), 1.0); return; }
      c.rgb *= mix(1.0, ao, strength);
      gl_FragColor = c;
    }
  `,
};

export class AoPass extends Pass {
  constructor(camera, shared, { samples = 10, scale = 0.5 } = {}) {
    super();
    this.camera = camera;
    this.shared = shared; // { depth } を後ろのパスへ渡す
    this.scale = scale;
    this.aoOn = true;
    const mk = (sh, defines) => new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(sh.uniforms), vertexShader: sh.vertexShader, fragmentShader: sh.fragmentShader, defines: { ...(sh.defines || {}), ...(defines || {}) }, depthTest: false, depthWrite: false });
    this.aoMat = mk(AoShader, { SAMPLES: samples });
    this.blurMat = mk(AoBlurShader);
    this.compMat = mk(AoCompositeShader);
    this.linMat = mk(LinDepthShader);
    this.quad = new FullScreenQuad(this.aoMat);
    const opt = { type: THREE.HalfFloatType, depthBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(4, 4, opt);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, opt);
    // うしろのパス（被写界深度）用の、カメラからの距離
    this.linRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    shared.lin = this.linRT.texture;
  }

  setSize(w, h) {
    const sw = Math.max(1, Math.round(w * this.scale)), sh = Math.max(1, Math.round(h * this.scale));
    this.rtA.setSize(sw, sh);
    this.rtB.setSize(sw, sh);
    this.linRT.setSize(sw, sh);
    this.aoMat.uniforms.resolution.value.set(sw, sh);
    this.texel = new THREE.Vector2(1 / sw, 1 / sh);
  }

  render(renderer, writeBuffer, readBuffer) {
    const depth = readBuffer.depthTexture;
    const cam = this.camera;
    this.shared.hasDepth = !!depth;
    this.needsSwap = this.aoOn && !!depth;
    if (!depth) return;
    // 距離のコピー（被写界深度で使う）
    const l = this.linMat.uniforms;
    l.tDepth.value = depth; l.cameraNear.value = cam.near; l.cameraFar.value = cam.far;
    this.quad.material = this.linMat;
    renderer.setRenderTarget(this.linRT);
    this.quad.render(renderer);
    if (!this.needsSwap) return;
    const u = this.aoMat.uniforms;
    u.tDepth.value = depth;
    u.projInv.value.copy(cam.projectionMatrixInverse);
    u.projScale.value = cam.projectionMatrix.elements[5] * 0.5;
    // AO
    this.quad.material = this.aoMat;
    renderer.setRenderTarget(this.rtA);
    this.quad.render(renderer);
    // ぼかし（横→縦）
    const b = this.blurMat.uniforms;
    b.tDepth.value = depth;
    b.cameraNear.value = cam.near; b.cameraFar.value = cam.far;
    this.quad.material = this.blurMat;
    b.tAO.value = this.rtA.texture; b.dir.value.set(this.texel.x, 0);
    renderer.setRenderTarget(this.rtB); this.quad.render(renderer);
    b.tAO.value = this.rtB.texture; b.dir.value.set(0, this.texel.y);
    renderer.setRenderTarget(this.rtA); this.quad.render(renderer);
    // 合成
    this.compMat.uniforms.tDiffuse.value = readBuffer.texture;
    this.compMat.uniforms.tAO.value = this.rtA.texture;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}
