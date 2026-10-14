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
  return spriteSheet(34, 36, (p, f) => {
    const b = f === 1 ? 1 : 0;
    // マント
    p.tri(10, 20 + b, 24, 20 + b, 26, 33, '#c83a3a');
    p.tri(10, 20 + b, 8, 33, 26, 33, '#a82a2a');
    // 足（ブーツ）
    p.rect(11, 31, 4, 3, '#5a3a24'); p.rect(19, 31, 4, 3, '#5a3a24');
    p.rect(10, 33, 5, 2, '#3a2414'); p.rect(19, 33, 5, 2, '#3a2414');
    // 胴（青い服）・白いえり・ベルト
    p.rect(11, 22 + b, 12, 10 - b, '#3a6ad0');
    p.rect(12, 22 + b, 3, 9 - b, '#5a8ae8');
    p.tri(14, 22 + b, 20, 22 + b, 17, 25 + b, '#f4f4f8');
    p.rect(11, 28, 12, 1, '#7a4a20');
    p.rect(16, 28, 2, 1, '#f0c840');
    // 腕（茶色い毛の手）
    p.rect(8, 23 + b, 3, 5, '#3a6ad0'); p.rect(23, 23 + b, 3, 5, '#3a6ad0');
    p.disc(9.5, 28.5 + b, 1.7, '#e8c8a0'); p.disc(24.5, 28.5 + b, 1.7, '#e8c8a0');
    // 剣（または木の棒）
    if (sword) {
      p.rect(25, 12 + b, 2, 14, '#e8f0fc');
      p.rect(26, 12 + b, 1, 14, '#a8b8d0');
      p.px(25, 11 + b, '#e8f0fc');
      p.rect(22, 26 + b, 8, 1, '#f0c840');
      p.rect(25, 27 + b, 2, 3, '#7a4a20');
    } else p.line(25, 18 + b, 25, 29 + b, '#a87a4a');
    // とげとげ（頭のうしろから、まわりに大きく）
    const hy = 13 + b;
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.85 + (i / 10) * Math.PI * 1.3;
      const cx = 17 + Math.cos(a) * 6, cy = hy + Math.sin(a) * 6;
      const tx = 17 + Math.cos(a) * 12.5, ty = hy + Math.sin(a) * 11;
      p.tri(cx - Math.sin(a) * 2.4, cy + Math.cos(a) * 2.4, cx + Math.sin(a) * 2.4, cy - Math.cos(a) * 2.4, tx, ty, i % 2 ? '#4a2e1e' : '#6a4630');
    }
    p.disc(17, hy, 7.5, '#7a5034');
    // まるい耳
    p.disc(11, hy - 5, 2, '#7a5034'); p.disc(23, hy - 5, 2, '#7a5034');
    p.px(11, hy - 5, '#e8a0a0'); p.px(23, hy - 5, '#e8a0a0');
    // 顔（クリーム色）と、とがった鼻先
    p.oval(17, hy + 2, 5.5, 4.5, '#f4dcb4');
    p.oval(17, hy + 4.5, 2.5, 2, '#f4dcb4');
    p.rect(16, hy + 5, 3, 2, '#2a1a1a');
    p.px(16, hy + 5, '#5a4a4a');
    // 金のサークレット
    p.rect(11, hy - 3, 13, 1, '#f0c840');
    p.px(17, hy - 4, '#5ad0f0'); p.px(17, hy - 3, '#5ad0f0');
    if (sleep) { p.rect(13, hy + 1, 3, 1, K); p.rect(19, hy + 1, 3, 1, K); }
    else eyes(p, [13, 20], hy, f);
    p.px(12, hy + 3, '#f49a9a'); p.px(22, hy + 3, '#f49a9a');
    if (f === 2) p.rect(16, hy + 8, 3, 1, '#a83a3a');
  });
}

// ---------------- スライム ----------------
export function slimeSheet({ color = '#4a9ae8', dark = '#2a6ac0', light = '#c8ecff', w = 24, h = 22, bandana = '#e88a2a', sleep = false } = {}) {
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
  return spriteSheet(42, 38, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const red = '#e8603a', redD = '#c8402a', belly = '#f8d8a0';
    // しっぽ
    for (let i = 0; i < 6; i++) p.disc(12 - i * 1.6, 31 - i * 1.4 - (happy ? 0 : -1), 2.6 - i * 0.3, red);
    p.tri(2, 22, 5, 25, 1, 27, redD);
    // つばさ（元気だと上、しょんぼりだと下）
    const wy = happy ? 0 : 6;
    p.tri(15, 20 + b, 5, 8 + wy, 13, 25, redD);
    p.tri(26, 20 + b, 37, 8 + wy, 29, 25, redD);
    p.line(15, 20 + b, 5, 8 + wy, '#a83020');
    p.line(26, 20 + b, 37, 8 + wy, '#a83020');
    // 体
    p.oval(21, 27 + b, 8.5, 7, red);
    p.oval(21.5, 28 + b, 5, 5.5, belly);
    for (let i = 0; i < 3; i++) p.rect(18, 25 + b + i * 3, 7, 1, '#e8b880');
    p.oval(16, 33.5, 2.8, 2, redD); p.oval(26, 33.5, 2.8, 2, redD);
    p.disc(15.5, 24 + b, 1.8, red); p.disc(27.5, 24 + b, 1.8, red);
    // 頭
    const hy = 13 + b + (happy ? 0 : 1);
    p.tri(17, hy - 4, 15, hy - 10, 19, hy - 5, '#f4e8c8');
    p.tri(25, hy - 4, 27, hy - 10, 23, hy - 5, '#f4e8c8');
    p.oval(21, hy, 7, 6, red);
    p.oval(26.5, hy + 2.5, 4, 2.8, '#f08060');
    p.px(28, hy + 1, K); p.px(29, hy + 2, K);
    // 目
    for (const x of [17, 22]) {
      if (f === 3) { p.rect(x, hy, 3, 1, K); continue; }
      if (!happy) { p.rect(x, hy, 3, 2, K); p.rect(x, hy - 1, 3, 1, redD); p.px(x, hy, W); }
      else { p.rect(x, hy - 1, 3, 3, K); p.px(x, hy - 1, W); }
    }
    if (f === 2) p.rect(24, hy + 4, 4, 1, '#7a1a1a');
    else if (happy) { p.px(24, hy + 4, K); p.rect(25, hy + 5, 2, 1, K); p.px(27, hy + 4, K); }
    else p.rect(24, hy + 5, 3, 1, K);
    p.px(16, hy + 3, '#f8a0a0'); p.px(23, hy + 3, '#f8a0a0');
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
export const makeDragon = (o) => new PixelCreature('dragon', dragonSheet(o), { scale: 1.35 });
export const makeKing = () => new PixelCreature('king', kingSheet(), { scale: 1.05 });
export const makeGuard = (o) => new PixelCreature('guard', guardSheet(o), { scale: 1 });
export const makeOwl = () => new PixelCreature('owl', owlSheet(), { scale: 1 });
export const makePixelFrog = () => new PixelCreature('frog', frogSheet(), { scale: 1 });
export const makeChicken = () => new PixelCreature('chicken', chickenSheet(), { scale: 1 });
