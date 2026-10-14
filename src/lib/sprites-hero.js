import { spriteSheet, PixelCreature } from './pixel.js';

// ---------------------------------------------------------------
// 勇者の城下町・魔王城のドット絵の住人たち
// コマ f：0 待機A / 1 待機B（息で1ドット沈む） / 2 おしゃべり / 3 まばたき
// ---------------------------------------------------------------

const K = '#1a1420'; // 目・輪郭
const W = '#ffffff';

function eyes(p, xs, y, f, { h = 3, w = 2, col = K } = {}) {
  for (const x of xs) {
    if (f === 3) { p.rect(x, y + h - 1, w, 1, col); continue; }
    p.rect(x, y, w, h, col);
    p.px(x, y, W);
  }
}

// ---------------- ハリネズミの勇者 ----------------
export function heroSheet({ sword = false, sleep = false } = {}) {
  return spriteSheet(40, 38, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const qD = '#3e2616', qM = '#6a4428', qL = '#d8b888', face = '#f6dfb8';
    const cx = 19, cy = 18 + b;
    // マント（体のうしろ）
    p.tri(cx - 9, cy + 6, cx + 9, cy + 6, cx + 12, 35, '#c83a3a');
    p.tri(cx - 9, cy + 6, cx - 12, 35, cx + 12, 35, '#a82a2a');
    // 足
    p.oval(cx - 5, 35, 3, 1.8, '#3a2414'); p.oval(cx + 5, 35, 3, 1.8, '#3a2414');
    // トゲの体（栗のようにまるく、ふちがギザギザ）
    p.oval(cx, cy, 12.5, 11.5, qM);
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.78 + (i / 21) * Math.PI * 1.44;
      const r0x = 11, r0y = 10;
      const bx = cx + Math.cos(a) * r0x, by = cy + Math.sin(a) * r0y;
      const tx = cx + Math.cos(a) * (r0x + 5 + (i % 2) * 1.5), ty = cy + Math.sin(a) * (r0y + 5 + (i % 2) * 1.5);
      p.tri(bx - Math.sin(a) * 2, by + Math.cos(a) * 2, bx + Math.sin(a) * 2, by - Math.cos(a) * 2, tx, ty, i % 2 ? qD : qM);
      p.px(tx, ty, qL);
    }
    // トゲの毛なみ（ななめの線）
    for (let k = 0; k < 26; k++) {
      const a = Math.PI * 0.9 + ((k * 7) % 26) / 26 * Math.PI * 1.2;
      const r = 4 + (k % 4) * 2;
      const x = cx + Math.cos(a) * r * 1.05, y = cy - 1 + Math.sin(a) * r * 0.9;
      p.line(x, y, x + Math.cos(a) * 2, y + Math.sin(a) * 2, k % 3 ? qD : '#8a6040');
    }
    // 顔（クリーム色）と、つきだした鼻先
    p.oval(cx, cy + 3, 7.5, 6, face);
    p.oval(cx, cy + 8, 3, 2.2, face);
    p.rect(cx - 1, cy + 8, 3, 2, '#1a1420');
    p.px(cx - 1, cy + 8, '#6a5a5a');
    // 耳
    p.disc(cx - 7, cy - 3, 2, face); p.px(cx - 7, cy - 3, '#e89a9a');
    p.disc(cx + 7, cy - 3, 2, face); p.px(cx + 7, cy - 3, '#e89a9a');
    // 赤いはちまき（結び目が右にひらひら）
    p.rect(cx - 9, cy - 5, 19, 2, '#d83a3a');
    p.rect(cx - 9, cy - 5, 19, 1, '#f05a5a');
    p.tri(cx + 9, cy - 5, cx + 15, cy - 7 + b, cx + 14, cy - 3 + b, '#d83a3a');
    p.tri(cx + 9, cy - 4, cx + 14, cy - 1, cx + 11, cy + 1, '#b82a2a');
    // 目
    if (sleep) { p.rect(cx - 5, cy + 2, 3, 1, K); p.rect(cx + 3, cy + 2, 3, 1, K); }
    else for (const x of [cx - 5, cx + 3]) {
      if (f === 3) { p.rect(x, cy + 3, 3, 1, K); continue; }
      p.rect(x, cy + 1, 3, 3, K); p.px(x, cy + 1, W);
    }
    p.oval(cx - 6.5, cy + 5.5, 1.3, 0.8, '#f49a9a'); p.oval(cx + 6.5, cy + 5.5, 1.3, 0.8, '#f49a9a');
    if (f === 2) p.rect(cx - 1, cy + 11, 3, 1, '#a83a3a');
    // 青い服（おなかのところ）とベルト
    p.oval(cx, cy + 14, 7, 4, '#3a6ad0');
    p.rect(cx - 6, cy + 13, 4, 2, '#5a8ae8');
    p.rect(cx - 7, cy + 15, 15, 1, '#7a4a20');
    p.rect(cx - 1, cy + 15, 2, 1, '#f0c840');
    // 手
    p.disc(cx - 9, cy + 12, 1.9, face); p.disc(cx + 9, cy + 12, 1.9, face);
    // 剣（または木の棒）
    if (sword) {
      p.rect(cx + 10, cy - 4, 2, 15, '#e8f0fc'); p.rect(cx + 11, cy - 4, 1, 15, '#a8b8d0'); p.px(cx + 10, cy - 5, '#e8f0fc');
      p.rect(cx + 7, cy + 11, 8, 1, '#f0c840'); p.rect(cx + 10, cy + 12, 2, 3, '#7a4a20');
    } else p.line(cx + 10, cy + 3, cx + 10, cy + 15, '#a87a4a');
  });
}

// ---------------- スライム ----------------
export function slimeSheet({ color = '#4a9ae8', dark = '#2a6ac0', light = '#c8ecff', w = 24, h = 22, bandana = null, sleep = false } = {}) {
  return spriteSheet(w, h, (p, f) => {
    const sq = f === 1 ? 1 : 0; // ぷるんとつぶれる
    const cx = w / 2, by = h - 1;
    const rx = w * 0.38 + sq, ry = h * 0.32 - sq;
    if (sleep) {
      p.oval(cx, by - 3, rx + 2, 3.5, color);
      p.oval(cx, by - 2, rx + 1, 2, dark);
      p.rect(cx - 5, by - 5, 3, 1, K); p.rect(cx + 2, by - 5, 3, 1, K);
      return;
    }
    p.tri(cx, h * 0.08 + sq * 2, cx - rx * 0.75, by - ry * 1.2, cx + rx * 0.75, by - ry * 1.2, color);
    p.oval(cx, by - ry, rx, ry, color);
    p.oval(cx, by - ry * 0.45, rx * 0.85, ry * 0.5, dark);
    p.oval(cx - rx * 0.45, by - ry * 1.35, 1.6, 2.2, light);
    if (bandana) p.rect(Math.round(cx - rx * 0.8), Math.round(by - ry * 1.55), Math.round(rx * 1.6), 1, bandana);
    const ey = Math.round(by - ry * 1.05);
    eyes(p, [Math.round(cx - 4), Math.round(cx + 2)], ey, f);
    if (f === 2) p.oval(cx, ey + 4.5, 2, 1.5, '#a8303a');
    else { p.px(cx - 1, ey + 4, K); p.px(cx, ey + 5, K); p.px(cx + 1, ey + 4, K); }
  });
}

// ---------------- ゴブリンの鍛冶屋 ----------------
export function goblinSheet() {
  return spriteSheet(34, 34, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const skin = '#7ab84a', skinD = '#5a9a3a';
    p.oval(13, 32, 2.5, 1.5, '#3a2a1a');
    p.oval(21, 32, 2.5, 1.5, '#3a2a1a');
    p.rect(12, 27, 3, 4, '#4a3a2a'); p.rect(19, 27, 3, 4, '#4a3a2a');
    p.oval(17, 24 + b, 7, 5.5, skin);
    // 革の前かけ
    p.rect(12, 21 + b, 10, 9, '#8a5a3a');
    p.rect(12, 21 + b, 10, 1, '#6a4028');
    p.px(13, 22 + b, '#c8a070'); p.px(20, 22 + b, '#c8a070');
    // 腕とハンマー
    p.disc(9.5, 24 + b, 2.3, skin);
    p.disc(24.5, 23 + b, 2.3, skin);
    p.rect(25, 13 + b, 2, 11, '#6a4a2a');
    p.rect(22, 11 + b, 8, 4, '#8a8a98');
    p.rect(22, 11 + b, 8, 1, '#b8b8c8');
    // 頭と大きな耳
    const hy = 12 + b;
    p.tri(11, hy - 1, 2, hy - 6, 10, hy + 3, skin);
    p.tri(23, hy - 1, 32, hy - 6, 24, hy + 3, skin);
    p.tri(10, hy - 1, 5, hy - 4, 10, hy + 1, '#e89a8a');
    p.tri(24, hy - 1, 29, hy - 4, 24, hy + 1, '#e89a8a');
    p.disc(17, hy, 6.5, skin);
    // ゴーグル
    p.rect(10, hy - 5, 14, 1, '#5a3a2a');
    p.disc(14, hy - 5, 1.8, '#c8d8e8'); p.disc(20, hy - 5, 1.8, '#c8d8e8');
    // 目（黄色に黒目）
    for (const x of [13, 19]) {
      if (f === 3) { p.rect(x, hy, 3, 1, K); continue; }
      p.rect(x, hy - 1, 3, 2, '#f8e060'); p.px(x + 1, hy - 1, K); p.px(x + 1, hy, K);
    }
    p.oval(17, hy + 2.5, 2, 1.5, skinD);
    if (f === 2) { p.rect(15, hy + 4, 5, 2, '#5a1a1a'); p.px(16, hy + 4, W); }
    else { p.rect(15, hy + 4, 5, 1, '#3a2a1a'); p.px(19, hy + 5, W); }
  });
}

// ---------------- 子ドラゴン ----------------
export function dragonSheet({ happy = false } = {}) {
  return spriteSheet(46, 42, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const red = '#ec6a3a', redD = '#c8452a', redL = '#f89a6a', belly = '#fbe0a8', horn = '#f8ecd0';
    const cx = 23;
    // しっぽ（右へくるん、先はスペード）
    const tail = [[29, 35], [33, 35], [36, 33], [38, 30], [39, 27]];
    tail.forEach(([x, y], i) => p.disc(x, y + (happy ? -1 : 1), 2.8 - i * 0.35, red));
    p.tri(37, 25 + (happy ? -1 : 1), 42, 24 + (happy ? -1 : 1), 39, 20 + (happy ? -1 : 1), redD);
    // つばさ（膜は ふち がぎざぎざ。元気だと上へ、しょんぼりだと下へ）
    const wing = (s) => {
      const ax = cx + s * 6, ay = 27 + b;
      const up = happy ? 0 : 9;
      const tip = [cx + s * 20, 9 + up];
      const pts = [tip, [cx + s * 21, 18 + up * 0.6], [cx + s * 17, 17 + up * 0.6], [cx + s * 17, 23 + up * 0.4], [cx + s * 13, 22 + up * 0.4], [cx + s * 11, 28]];
      for (let i = 0; i < pts.length - 1; i++) p.tri(ax, ay, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], redD);
      p.line(ax, ay, tip[0], tip[1], '#9a3020');
      p.line(ax, ay, pts[2][0], pts[2][1], '#9a3020');
      p.line(ax, ay, pts[4][0], pts[4][1], '#9a3020');
      p.px(tip[0], tip[1] - 1, horn);
    };
    wing(-1); wing(1);
    // 体（まるくて小さい）
    p.oval(cx, 31 + b, 8, 7, red);
    p.oval(cx - 2, 28 + b, 3, 2, redL);
    p.oval(cx, 32 + b, 5, 5, belly);
    for (let i = 0; i < 3; i++) p.rect(cx - 3, 30 + b + i * 2, 7, 1, '#f0c890');
    // 足と手
    p.oval(cx - 5, 38.5, 3, 2, redD); p.oval(cx + 5, 38.5, 3, 2, redD);
    for (const x of [cx - 7, cx - 5, cx + 3, cx + 5]) p.px(x, 40, horn);
    p.disc(cx - 7, 30 + b, 2, red); p.disc(cx + 7, 30 + b, 2, red);
    // 頭（大きくてまるい）
    const hy = 15 + b + (happy ? 0 : 1);
    p.tri(cx - 6, hy - 6, cx - 10, hy - 12, cx - 3, hy - 7, horn);
    p.tri(cx + 6, hy - 6, cx + 10, hy - 12, cx + 3, hy - 7, horn);
    p.px(cx - 10, hy - 12, '#c8b890'); p.px(cx + 10, hy - 12, '#c8b890');
    for (const [x, y] of [[cx, hy - 9], [cx - 3, hy - 8], [cx + 3, hy - 8]]) p.tri(x - 1.5, y + 2, x + 1.5, y + 2, x, y - 1, redD);
    p.oval(cx, hy, 10, 8.5, red);
    p.oval(cx - 4, hy - 4, 3, 2, redL);
    // 鼻先とほっぺ
    p.oval(cx, hy + 4.5, 5.5, 3.2, '#f6886a');
    p.px(cx - 2, hy + 3, '#7a2a1a'); p.px(cx + 2, hy + 3, '#7a2a1a');
    p.oval(cx - 8, hy + 3, 1.6, 1, '#f8a8a0'); p.oval(cx + 8, hy + 3, 1.6, 1, '#f8a8a0');
    // 目（大きく）
    for (const x of [cx - 7, cx + 4]) {
      if (f === 3) { p.rect(x, hy + 1, 4, 1, K); continue; }
      if (happy) {
        p.rect(x, hy - 2, 4, 4, K); p.px(x, hy - 2, W); p.px(x + 1, hy - 2, W); p.px(x + 2, hy + 1, W);
      } else {
        p.rect(x, hy - 1, 4, 3, K); p.px(x, hy - 1, W);
        p.rect(x, hy - 2, 4, 1, red); // まぶたが重い
        const d = x < cx ? 1 : -1; // 下がりまゆ
        p.px(x + (d > 0 ? 3 : 0), hy - 4, redD); p.px(x + (d > 0 ? 2 : 1), hy - 4, redD); p.px(x + (d > 0 ? 1 : 2), hy - 3, redD); p.px(x + (d > 0 ? 0 : 3), hy - 3, redD);
        p.px(x + (d > 0 ? 0 : 3), hy + 3, '#8ad0f8');
      }
    }
    // 口
    if (f === 2) { p.rect(cx - 2, hy + 6, 5, 2, '#7a1a1a'); p.px(cx - 2, hy + 6, W); }
    else if (happy) { p.px(cx - 3, hy + 6, K); p.rect(cx - 2, hy + 7, 5, 1, K); p.px(cx + 3, hy + 6, K); p.px(cx + 1, hy + 8, '#e86a7a'); }
    else { p.px(cx - 2, hy + 7, K); p.rect(cx - 1, hy + 6, 3, 1, K); p.px(cx + 2, hy + 7, K); }
  });
}

// ---------------- ライオンの王様 ----------------
export function kingSheet() {
  return spriteSheet(36, 42, (p, f) => {
    const b = f === 1 ? 1 : 0;
    // ローブ
    p.tri(18, 20 + b, 6, 41, 30, 41, '#c8303a');
    p.rect(9, 27 + b, 18, 14 - b, '#c8303a');
    p.rect(8, 38, 20, 3, '#f4f0e8');
    p.rect(16, 24 + b, 4, 14, '#f4f0e8');
    for (const [x, y] of [[9, 39], [13, 39], [21, 39], [25, 39], [17, 27], [18, 31], [17, 35]]) p.px(x, y, K);
    // しゃく
    p.rect(30, 18 + b, 1, 21, '#f0c838');
    p.disc(30.5, 16 + b, 2.2, '#5ac8f0');
    p.disc(29, 25 + b, 2, '#f0c060');
    // たてがみと顔
    const hy = 15 + b;
    p.disc(18, hy, 10.5, '#a85a20');
    p.disc(18, hy, 9, '#c8782a');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.disc(18 + Math.cos(a) * 9.5, hy + Math.sin(a) * 9.5, 1.6, '#a85a20'); }
    p.disc(18, hy + 1, 6.5, '#f0c060');
    p.oval(18, hy + 4, 3.5, 2.2, '#f8e0a0');
    p.tri(16, hy + 2, 20, hy + 2, 18, hy + 4, '#6a3a2a');
    eyes(p, [14, 20], hy - 1, f, { h: 2 });
    if (f === 2) p.rect(17, hy + 5, 3, 1, '#7a2a2a');
    // 王冠
    p.rect(11, hy - 9, 14, 3, '#f0c838');
    for (const x of [11, 16, 21]) p.tri(x, hy - 9, x + 4, hy - 9, x + 2, hy - 13, '#f0c838');
    p.px(18, hy - 8, '#e83a4a'); p.px(13, hy - 8, '#5ac8f0'); p.px(23, hy - 8, '#5ac8f0');
  });
}

// ---------------- アルマジロの門番 ----------------
export function guardSheet({ sleep = false } = {}) {
  return spriteSheet(30, 34, (p, f) => {
    const b = f === 1 ? 1 : 0;
    // やり
    p.rect(25, 3, 1, 30, '#7a5a3a');
    p.tri(23, 5, 28, 5, 25.5, 0, '#c8d0dc');
    // 足
    p.oval(11, 32, 2.5, 1.5, '#6a5a4a'); p.oval(19, 32, 2.5, 1.5, '#6a5a4a');
    // こうら（しま）
    p.oval(15, 23 + b, 8, 8, '#a8988a');
    for (let i = 0; i < 4; i++) p.rect(8, 18 + b + i * 3, 14, 1, '#7a6a5a');
    p.oval(16, 25 + b, 4.5, 5, '#e8d8c0');
    p.disc(23, 23 + b, 1.8, '#c8b8a0');
    // 頭（とがった鼻）と かぶと
    const hy = 11 + b;
    p.oval(15, hy + 1, 5.5, 5, '#c8b8a0');
    p.tri(17, hy + 1, 17, hy + 5, 23, hy + 4, '#c8b8a0');
    p.px(23, hy + 4, K);
    p.oval(14, hy - 3, 6.5, 3.5, '#b8c0cc');
    p.rect(8, hy - 1, 13, 1, '#8a909c');
    p.rect(13, hy - 8, 2, 3, '#d83a3a');
    if (sleep) { p.rect(12, hy + 1, 3, 1, K); p.rect(16, hy + 1, 2, 1, K); }
    else eyes(p, [12, 16], hy, f, { h: 2 });
    if (f === 2 && !sleep) p.px(20, hy + 5, '#7a2a2a');
  });
}

// ---------------- フクロウの占い師 ----------------
export function owlSheet() {
  return spriteSheet(30, 34, (p, f) => {
    const b = f === 1 ? 1 : 0;
    p.tri(15, 6 + b, 4, 33, 26, 33, '#5a3a8a');
    p.rect(6, 22, 18, 11, '#5a3a8a');
    for (const [x, y] of [[8, 25], [20, 23], [12, 30], [22, 30], [17, 27]]) p.px(x, y, '#f8e070');
    const hy = 13 + b;
    p.disc(15, hy, 7, '#a87a5a');
    p.tri(8, hy - 5, 10, hy - 11, 12, hy - 6, '#a87a5a');
    p.tri(22, hy - 5, 20, hy - 11, 18, hy - 6, '#a87a5a');
    for (const x of [11.5, 18.5]) {
      p.disc(x, hy, 3, '#fff8e8');
      if (f === 3) p.rect(Math.round(x) - 2, hy, 4, 1, K);
      else { p.disc(x, hy, 1.6, K); p.px(Math.round(x) - 1, hy - 1, W); }
    }
    p.tri(14, hy + 2, 16, hy + 2, 15, hy + 5, '#f0b040');
    // 頭巾
    p.oval(15, hy - 6, 7.5, 3, '#5a3a8a');
    // 水晶玉
    p.disc(15, 27, 4, '#a8d8f8');
    p.disc(13.5, 25.5, 1.2, W);
    p.rect(11, 31, 8, 2, '#8a6a3a');
    if (f === 2) p.px(15, hy + 5, '#7a3a2a');
  });
}

// ---------------- カエルの機関士（ドット絵版） ----------------
export function frogSheet() {
  return spriteSheet(30, 30, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const g = '#6db24a';
    p.oval(9, 28.5, 3.5, 1.5, g); p.oval(21, 28.5, 3.5, 1.5, g);
    p.oval(15, 22 + b, 8, 6, '#3d5f8f');
    p.rect(9, 19 + b, 12, 2, '#d2463a');
    p.disc(7, 22 + b, 2, g); p.disc(23, 22 + b, 2, g);
    const hy = 13 + b;
    p.oval(15, hy, 9, 5.5, g);
    p.oval(15, hy + 2, 6, 3, '#e7efb2');
    p.disc(10, hy - 4, 3.2, g); p.disc(20, hy - 4, 3.2, g);
    for (const x of [10, 20]) {
      p.disc(x, hy - 4, 2.2, '#fffdf2');
      if (f === 3) p.rect(x - 1, hy - 4, 3, 1, K);
      else { p.rect(x - 1, hy - 5, 2, 2, K); p.px(x - 1, hy - 5, W); }
    }
    // しましまの帽子
    for (let i = 0; i < 8; i++) p.rect(11 + i, hy - 9, 1, 3, i % 2 ? '#f2f2f2' : '#3b5ea8');
    p.rect(10, hy - 6, 10, 1, '#2a3a6a');
    if (f === 2) p.oval(15, hy + 2, 3, 1, '#a83a3a');
    else p.rect(12, hy + 2, 6, 1, '#2a4a20');
  });
}

// ---------------- ニワトリ ----------------
export function chickenSheet() {
  return spriteSheet(16, 16, (p, f) => {
    const b = f === 1 ? 1 : 0;
    p.line(7, 13, 7, 15, '#f0b040'); p.line(9, 13, 9, 15, '#f0b040');
    p.oval(8, 10 + b, 5, 3.5, '#fbfbf6');
    p.tri(3, 8 + b, 2, 5 + b, 5, 9 + b, '#fbfbf6');
    p.disc(11, 6 + b, 2.6, '#fbfbf6');
    p.rect(10, 2 + b, 3, 2, '#e83a3a');
    p.tri(13, 6 + b, 15, 7 + b, 13, 8 + b, '#f0b040');
    if (f !== 3) p.px(11, 5 + b, K);
    p.px(12, 9 + b, '#e83a3a');
  });
}

export const makeHero = (o) => new PixelCreature('hero', heroSheet(o), { scale: 1 });
export const makeSlime = (o, scale = 1) => new PixelCreature('slime', slimeSheet(o), { scale });
export const makeGoblin = () => new PixelCreature('goblin', goblinSheet(), { scale: 1.05 });
export const makeDragon = (o) => new PixelCreature('dragon', dragonSheet(o), { scale: 1.25 });
export const makeKing = () => new PixelCreature('king', kingSheet(), { scale: 1.05 });
export const makeGuard = (o) => new PixelCreature('guard', guardSheet(o), { scale: 1 });
export const makeOwl = () => new PixelCreature('owl', owlSheet(), { scale: 1 });
export const makePixelFrog = () => new PixelCreature('frog', frogSheet(), { scale: 1 });
export const makeChicken = () => new PixelCreature('chicken', chickenSheet(), { scale: 1 });
