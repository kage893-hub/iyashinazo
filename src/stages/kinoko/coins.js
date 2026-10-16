import * as THREE from 'three';
import { add, group, G, canvasTex, rng } from '../../lib/util.js';

// 虫から見た硬貨。表裏の刻印・縁・穴を持ち、車輪へ取り付けても同じ模型を使う。
const prototypes = new Map();
const TAU = Math.PI * 2;
function coinTexture(value, back = false) {
  return canvasTex(768, 768, (ctx, w, h) => {
    ctx.scale(w / 512, h / 512);
    const brass = value === 5, random = rng(value * 19 + Number(back));
    const base = brass ? '#c7a451' : '#c6ccd2';
    const dark = brass ? '#79612e' : '#68727c';
    const light = brass ? '#ead28c' : '#f0f2f3';
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    // 細い磨き跡と、ごく薄い色むら。文字と模様の輪郭を邪魔しない。
    for (let i = 0; i < 1500; i++) {
      const x = random() * 512, y = random() * 512;
      ctx.strokeStyle = random() > .5 ? 'rgba(255,255,255,.07)' : 'rgba(55,45,25,.045)';
      ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3 + random() * 24, y - random() * 3); ctx.stroke();
    }
    const stroke = (path, width = 2) => {
      ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.save(); ctx.translate(-1, -1); ctx.strokeStyle = light; ctx.stroke(path); ctx.restore();
      ctx.strokeStyle = dark; ctx.stroke(path);
    };
    const ring = (r, width = 2) => { const p = new Path2D(); p.arc(256, 256, r, 0, TAU); stroke(p, width); };
    const text = (s, x, y, size) => {
      ctx.font = `600 ${size}px "Yu Mincho", "Noto Serif JP", serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = light; ctx.fillText(s, x - 1.4, y - 1.4);
      ctx.fillStyle = dark; ctx.fillText(s, x, y);
    };
    ring(240, 3); ring(232, 1);
    if (brass) {
      ring(63, 2);
      if (!back) {
        // 穴のまわりの歯車、上の稲穂、下の水面と「五円」。
        for (let i = 0; i < 32; i++) {
          const a = i / 32 * TAU, p = new Path2D();
          p.moveTo(256 + Math.cos(a) * 65, 256 + Math.sin(a) * 65);
          p.lineTo(256 + Math.cos(a) * 77, 256 + Math.sin(a) * 77); stroke(p, 2.2);
        }
        for (const side of [-1, 1]) {
          const p = new Path2D(); p.moveTo(256 + side * 135, 228); p.quadraticCurveTo(256 + side * 100, 105, 256, 106); stroke(p, 3);
          for (let j = 0; j < 12; j++) {
            const t = j / 12, x = 256 + side * (128 * (1 - t)), y = 112 + (1 - t) ** 2 * 105;
            ctx.save(); ctx.translate(x, y); ctx.rotate(side * (.2 + t * .6));
            for (const s of [-1, 1]) {
              const grain = new Path2D(); grain.ellipse(s * 8, -7, 4.5, 11, s * .55, 0, TAU); stroke(grain, 1.6);
            }
            ctx.restore();
          }
        }
        text('五', 159, 347, 76); text('円', 353, 347, 76);
        for (let i = 0; i < 4; i++) {
          const p = new Path2D(); p.moveTo(118 + i * 13, 398 + i * 12);
          p.bezierCurveTo(192, 390 + i * 12, 312, 408 + i * 12, 394 - i * 13, 398 + i * 12); stroke(p, 2);
        }
      } else {
        text('日 本 国', 256, 114, 52); text('令和六年', 256, 389, 37);
        for (const side of [-1, 1]) {
          const p = new Path2D(); p.moveTo(256 + side * 102, 320); p.quadraticCurveTo(256 + side * 122, 273, 256 + side * 104, 220); stroke(p, 3);
          for (const [dx, dy, angle] of [[0, 0, -.65], [19, 21, .65]]) {
            const leaf = new Path2D(); leaf.ellipse(256 + side * (105 + dx), 240 + dy, 9, 21, side * angle, 0, TAU); stroke(leaf, 2);
          }
        }
      }
    } else if (!back) {
      text('100', 256, 245, 188); text('令和六年', 256, 379, 36);
    } else {
      text('日 本 国', 256, 107, 49);
      // 五枚の花びらと切れ込みを持つ、三輪の桜。
      for (const [x, y, r, rotation] of [[192, 242, 49, .15], [316, 256, 48, -.2], [259, 173, 43, .3]]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        for (let i = 0; i < 5; i++) {
          ctx.save(); ctx.rotate(i * TAU / 5);
          const petal = new Path2D(); petal.moveTo(0, 0);
          petal.bezierCurveTo(-r * .65, -r * .5, -r * .5, -r, -r * .15, -r);
          petal.lineTo(0, -r * .85); petal.lineTo(r * .15, -r);
          petal.bezierCurveTo(r * .5, -r, r * .65, -r * .5, 0, 0); stroke(petal, 2.4);
          ctx.restore();
        }
        ringAtCenter(ctx, 6, dark); ctx.restore();
      }
      text('百 円', 256, 377, 65);
    }
  });
}
function ringAtCenter(ctx, radius, color) {
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}
function createCoin(value) {
  const five = value === 5, radius = five ? .8 : .85, hole = five ? .18 : 0;
  const root = group(); root.name = five ? 'five-yen-coin' : 'hundred-yen-coin';
  const shape = new THREE.Shape(); shape.absarc(0, 0, radius, 0, TAU);
  if (five) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); shape.holes.push(h); }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 3, curveSegments: 96 });
  geometry.translate(0, 0, -.04);
  const metal = new THREE.MeshStandardMaterial({ color: five ? '#c3a052' : '#c0c6cd', metalness: .35, roughness: .38 });
  add(root, geometry, metal, 0, 0, 0);
  for (const side of [1, -1]) {
    const texture = coinTexture(value, side < 0);
    const face = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: .008, metalness: .32, roughness: .44 });
    const g = five ? new THREE.RingGeometry(hole + .012, radius - .014, 96) : new THREE.CircleGeometry(radius - .014, 96);
    // 円形の面へ、硬貨全体の座標で刻印を写す。穴はテクスチャで塗りつぶさない。
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, .5 + p.getX(i) / (radius * 2), .5 + p.getY(i) / (radius * 2));
    add(root, g, face, 0, 0, side * .051, { rot: [0, side < 0 ? Math.PI : 0, 0], cast: false });
    add(root, G.torus(radius - .008, .009, 6, 96), metal, 0, 0, side * .049, { cast: false });
    if (five) add(root, G.torus(hole + .006, .007, 6, 64), metal, 0, 0, side * .048, { cast: false });
  }
  if (!five) {
    const edge = canvasTex(1024, 32, (ctx, w, h) => {
      ctx.fillStyle = '#c0c6cd'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        const x = i / 120 * w; ctx.fillStyle = '#747e88'; ctx.fillRect(x, 1, 2, h - 2);
        ctx.fillStyle = '#eef0f2'; ctx.fillRect(x + 2, 1, 1, h - 2);
      }
    });
    add(root, new THREE.CylinderGeometry(radius + .001, radius + .001, .078, 128, 1, true),
      new THREE.MeshStandardMaterial({ map: edge, bumpMap: edge, bumpScale: .006, metalness: .35, roughness: .42 }), 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
  }
  return root;
}
export function makeFiveYen() {
  if (!prototypes.has(5)) prototypes.set(5, createCoin(5));
  return prototypes.get(5).clone(true);
}
export function makeHundredYen() {
  if (!prototypes.has(100)) prototypes.set(100, createCoin(100));
  return prototypes.get(100).clone(true);
}
