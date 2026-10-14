import * as THREE from 'three';
import { canvasTex, rng, FONT } from '../../lib/util.js';

// 箱庭で使う手描き風テクスチャ

export function planksTex(base = '#a8754c', lines = '#6e4a2e', n = 8, repeat = [1, 1]) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(11);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const ph = h / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,240,220' : '60,30,10'},${0.05 + r() * 0.08})`;
      ctx.fillRect(0, i * ph, w, ph);
      ctx.fillStyle = lines; ctx.fillRect(0, i * ph, w, 2);
      const off = r() * w;
      ctx.fillRect(off, i * ph, 2, ph);
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = 'rgba(70,40,20,0.15)';
        ctx.beginPath();
        const yy = i * ph + r() * ph;
        ctx.moveTo(0, yy); ctx.bezierCurveTo(w * 0.3, yy + 2, w * 0.6, yy - 2, w, yy + 1);
        ctx.stroke();
      }
    }
  }, { repeat });
}

export function boardsTex(base = '#8a5d3b', repeat = [1, 1]) {
  // 縦板張り
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(5);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const n = 8, pw = w / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '255,235,200' : '40,20,10'},${0.06 + r() * 0.1})`;
      ctx.fillRect(i * pw, 0, pw, h);
      ctx.fillStyle = 'rgba(40,20,10,0.55)';
      ctx.fillRect(i * pw, 0, 3, h);
      ctx.fillStyle = 'rgba(30,20,10,0.6)';
      ctx.beginPath(); ctx.arc(i * pw + pw / 2, h * 0.15, 2.5, 0, 7); ctx.arc(i * pw + pw / 2, h * 0.85, 2.5, 0, 7); ctx.fill();
    }
  }, { repeat });
}

export function shinglesTex(base = '#3f6177', repeat = [3, 3]) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(3);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const rows = 8, cols = 6, rh = h / rows, cw = w / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x < cols + 1; x++) {
        const ox = (y % 2) * cw / 2;
        const l = 0.85 + r() * 0.3;
        ctx.fillStyle = `rgba(${Math.floor(255 * l * 0.3)},${Math.floor(255 * l * 0.42)},${Math.floor(255 * l * 0.52)},0.55)`;
        ctx.beginPath();
        ctx.moveTo(x * cw + ox, y * rh);
        ctx.lineTo(x * cw + ox, y * rh + rh * 0.6);
        ctx.quadraticCurveTo(x * cw + ox + cw / 2, y * rh + rh * 1.15, x * cw + ox + cw, y * rh + rh * 0.6);
        ctx.lineTo(x * cw + ox + cw, y * rh);
        ctx.fill();
        ctx.strokeStyle = 'rgba(10,20,30,0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, { repeat });
}

export function stoneTex(base = '#c9bca4', repeat = [4, 1]) {
  return canvasTex(256, 128, (ctx, w, h) => {
    const r = rng(17);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const rows = 3, rh = h / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 40;
      while (x < w) {
        const bw = 40 + r() * 40;
        const l = 0.9 + r() * 0.2;
        ctx.fillStyle = `rgba(${Math.floor(200 * l)},${Math.floor(186 * l)},${Math.floor(160 * l)},0.6)`;
        ctx.fillRect(x + 2, y * rh + 2, bw - 4, rh - 4);
        x += bw;
      }
      ctx.fillStyle = 'rgba(80,70,60,0.5)';
      ctx.fillRect(0, y * rh, w, 2);
    }
  }, { repeat });
}

export function gravelTex(base = '#cdbb98', repeat = [6, 6]) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(23);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const l = r();
      ctx.fillStyle = l > 0.5 ? `rgba(255,248,230,${0.2 + r() * 0.3})` : `rgba(90,70,50,${0.15 + r() * 0.25})`;
      const s = 1 + r() * 3;
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, s, s * 0.7, r() * 3, 0, 7); ctx.fill();
    }
  }, { repeat });
}

export function grassTex(base = '#86b35c', repeat = [8, 6]) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const r = rng(29);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? `rgba(180,220,120,${0.15 + r() * 0.2})` : `rgba(40,80,30,${0.1 + r() * 0.2})`;
      ctx.fillRect(r() * w, r() * h, 2, 3 + r() * 4);
    }
  }, { repeat });
}

/** 時計の文字盤 */
export function clockFaceTex() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fbf3df'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 8, 0, 7); ctx.stroke();
    ctx.fillStyle = '#3a2a1c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 30px ${FONT}`;
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(String(i), w / 2 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92 + 2);
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = i % 5 === 0 ? 108 : 112;
      ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
      ctx.lineTo(w / 2 + Math.cos(a) * 118, h / 2 + Math.sin(a) * 118);
      ctx.stroke();
    }
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText('HAZAMA', w / 2, h / 2 + 42);
    ctx.beginPath(); ctx.arc(w / 2, h / 2 + 62, 4, 0, 7); ctx.fill();
  });
}

/** 時刻表ボード */
export function timetableTex() {
  return canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#23324f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9a35a'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#f5e6c0';
    ctx.textAlign = 'center';
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText('発車時刻表', w / 2, 58);
    ctx.font = `700 30px ${FONT}`;
    ctx.textAlign = 'left';
    const rows = [['3:00', 'きりのもり'], ['5:00', 'かえるぬま'], ['?:00', 'てんくうのまち'], ['9:00', 'つきのうら']];
    rows.forEach(([t, d], i) => {
      const y = 120 + i * 58;
      ctx.fillStyle = i === 2 ? '#ffd27a' : '#f5e6c0';
      ctx.fillText(i === 2 ? '  :00' : t, 50, y);
      ctx.fillText(d, 180, y);
    });
    // 数字がにじんで読めない（インクのしみ）
    const r = rng(5);
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = `rgba(${k % 2 ? '120,140,190' : '60,80,130'},0.85)`;
      ctx.beginPath(); ctx.ellipse(62 + (r() - 0.5) * 18, 226 + (r() - 0.5) * 14, 10 + r() * 12, 8 + r() * 9, r() * 3, 0, 7); ctx.fill();
    }
    // 貼り紙
    ctx.save();
    ctx.translate(370, 300); ctx.rotate(-0.08);
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(-100, -40, 200, 80);
    ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(0, -36, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.font = `700 17px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('ほしまわり号は', 0, -6);
    ctx.fillText('かえるぬま行きの3時間あと', 0, 20);
    ctx.restore();
  });
}

/** 駅名標 */
export function stationSignTex() {
  return canvasTex(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fbf7ee'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2b3a5c'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#2b3a5c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 74px ${FONT}`;
    ctx.fillText('はざま', w / 2, 72);
    ctx.font = `500 22px ${FONT}`;
    ctx.fillText('HAZAMA', w / 2, 120);
    ctx.fillStyle = '#3f7d5a'; ctx.fillRect(8, 140, w - 16, 52);
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'left'; ctx.fillText('← きりのもり', 22, 167);
    ctx.textAlign = 'right'; ctx.fillText('てんくうのまち →', w - 22, 167);
  });
}

export function nameplateTex(text, sub) {
  return canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1d2c4a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e2bf62'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#f2d27a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${sub ? 54 : 64}px ${FONT}`;
    ctx.fillText(text, w / 2, sub ? 52 : h / 2 + 3);
    if (sub) { ctx.font = `500 22px ${FONT}`; ctx.fillText(sub, w / 2, 100); }
  });
}

export function waterTex() {
  const t = canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#5aa8c8'); g.addColorStop(1, '#2d6f8f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = rng(41);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + r() * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const x = r() * w, y = r() * h;
      ctx.moveTo(x, y); ctx.lineTo(x + 10 + r() * 20, y);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
