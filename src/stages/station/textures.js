import { surfaceTex } from '../../lib/surface-art.js';
import * as THREE from 'three';
import { canvasTex, rng, FONT } from '../../lib/util.js';

// 箱庭で使う手描き風テクスチャ

export function planksTex(base = '#a8754c', lines = '#6e4a2e', n = 8, repeat = [1, 1]) {
  return surfaceTex('woodPlanks', { base, repeat, rotate: true });
}

export function boardsTex(base = '#8a5d3b', repeat = [1, 1]) {
  return surfaceTex('agedBoards', { base, repeat });
}

export function shinglesTex(base = '#3f6177', repeat = [3, 3]) {
  return surfaceTex('roofTiles', { base, repeat, size: 512 });
}

export function stoneTex(base = '#c9bca4', repeat = [4, 1]) {
  return surfaceTex('stoneBlocks', { base, repeat });
}

export function gravelTex(base = '#cdbb98', repeat = [6, 6]) {
  return surfaceTex('gravel', { base, repeat });
}

export function grassTex(base = '#86b35c', repeat = [8, 6]) {
  return surfaceTex('grass', { base, repeat, strength: .65 });
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
