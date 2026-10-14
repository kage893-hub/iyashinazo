import * as THREE from 'three';

// ミニチュア感を出すティルトシフト（上下をぼかす）
export const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    delta: { value: new THREE.Vector2(1 / 1024, 0) },
    focus: { value: 0.52 },
    range: { value: 0.3 },
    amount: { value: 2.2 },
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
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5;
      float v = 1.0 - dot(q, q) * vignette * 2.2;
      c.rgb *= clamp(v, 0.0, 1.0);
      c.rgb += vec3(warmth, warmth * 0.4, -warmth * 0.5);
      // ごく薄いフィルムグレイン
      c.rgb += (hash(vUv * 1000.0 + time) - 0.5) * 0.018;
      gl_FragColor = c;
    }
  `,
};
