import { canvasTex, rng, FONT } from '../../lib/util.js';

// 天空の街の手描き風テクスチャ

export function cobbleTex(base = '#e6e0d2', repeat = [4, 4]) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(31);
    ctx.fillStyle = '#b8ae9c'; ctx.fillRect(0, 0, w, h);
    const n = 9, cs = w / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const l = 0.9 + r() * 0.15;
        const c = parseInt(base.slice(1), 16);
        const R = Math.min(255, ((c >> 16) & 255) * l), Gc = Math.min(255, ((c >> 8) & 255) * l), B = Math.min(255, (c & 255) * l);
        ctx.fillStyle = `rgb(${R | 0},${Gc | 0},${B | 0})`;
        const ox = (y % 2) * cs / 2;
        ctx.beginPath();
        ctx.ellipse(x * cs + ox + cs / 2, y * cs + cs / 2, cs * 0.44, cs * 0.4, r() * 0.5, 0, 7);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.ellipse(x * cs + ox + cs * 0.42, y * cs + cs * 0.4, cs * 0.18, cs * 0.1, 0, 0, 7); ctx.fill();
      }
    }
  }, { repeat });
}

export function stripeTex(a = '#e8574a', b = '#fff4e0', n = 12) {
  return canvasTex(256, 64, (ctx, w, h) => {
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect((i * w) / n, 0, w / n + 1, h); }
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, h * 0.45, w, h * 0.1);
  });
}

export function plasterTex(base = '#f7f4ee', repeat = [2, 2]) {
  return canvasTex(128, 128, (ctx, w, h) => {
    const r = rng(13);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(150,140,130,0.08)';
      ctx.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4);
    }
  }, { repeat });
}

export function clockFace2Tex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a5a9a'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 8, 0, 7); ctx.stroke();
    ctx.fillStyle = '#3a5a9a';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * 98, h / 2 + Math.sin(a) * 98, i % 3 ? 5 : 9, 0, 7); ctx.fill();
    }
    ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('SORA', w / 2, h / 2 + 50);
  });
}

export function skySignTex() {
  return canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a6ac8'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#2b4a8a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 62px ${FONT}`; ctx.fillText('てんくうのまち', w / 2, 70);
    ctx.font = `500 22px ${FONT}`; ctx.fillText('TENKU-NO-MACHI', w / 2, 120);
    ctx.fillStyle = '#5a8ad8'; ctx.fillRect(8, 140, w - 16, 52);
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'left'; ctx.fillText('← はざま', 22, 167);
    ctx.textAlign = 'right'; ctx.fillText('えどのしゅく →', w - 22, 167);
  });
}

export function rainbowColors() {
  return ['#ff5a5a', '#ffa64a', '#ffe14a', '#6ad86a', '#5aa8ff', '#9a7aff'];
}
