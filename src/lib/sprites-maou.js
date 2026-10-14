import { spriteSheet, PixelCreature } from './pixel.js';

// ---------------------------------------------------------------
// 魔王城のドット絵の住人たち
// コマ f：0 待機A / 1 待機B（息で1ドット沈む） / 2 おしゃべり / 3 まばたき
// ---------------------------------------------------------------

const K = '#1a1420';
const W = '#ffffff';

// ---------------- ドラゴンの魔王（子ドラゴンの兄） ----------------
// back=true は、うしろを向いてすねている姿
export function maouSheet({ happy = false, back = false } = {}) {
  return spriteSheet(64, 60, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const body = '#6a3aa8', bodyD = '#4a2480', bodyL = '#8a5ac8', belly = '#e8c8f0', horn = '#f4ecd0', wingC = '#3a1a6a';
    const cx = 32;
    // マント（赤、ふちは金）
    p.tri(cx - 14, 30 + b, cx + 14, 30 + b, cx + 20, 58, '#a82838');
    p.tri(cx - 14, 30 + b, cx - 20, 58, cx + 20, 58, '#c83a48');
    p.rect(cx - 20, 57, 41, 2, '#f0c840');
    // つばさ（大きく、ぎざぎざ）
    const wing = (s) => {
      const ax = cx + s * 9, ay = 32 + b;
      const up = happy ? 0 : 6;
      const tip = [cx + s * 31, 6 + up];
      const pts = [tip, [cx + s * 31, 20 + up], [cx + s * 26, 18 + up], [cx + s * 26, 27 + up], [cx + s * 20, 25 + up], [cx + s * 17, 34]];
      for (let i = 0; i < pts.length - 1; i++) p.tri(ax, ay, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], wingC);
      p.line(ax, ay, tip[0], tip[1], '#2a0a50');
      p.line(ax, ay, pts[2][0], pts[2][1], '#2a0a50');
      p.line(ax, ay, pts[4][0], pts[4][1], '#2a0a50');
      p.px(tip[0], tip[1] - 1, horn);
    };
    wing(-1); wing(1);
    // しっぽ
    for (let i = 0; i < 6; i++) p.disc(cx + 12 + i * 2.5, 52 - i * 2, 3.4 - i * 0.35, body);
    p.tri(cx + 25, 40, cx + 30, 37, cx + 27, 33, bodyD);
    if (back) {
      // せなか：トゲの列と、まるい背中
      p.oval(cx, 42 + b, 13, 12, body);
      p.oval(cx - 4, 37 + b, 5, 4, bodyL);
      for (let i = 0; i < 5; i++) p.tri(cx - 2, 30 + i * 5 + b, cx + 2, 30 + i * 5 + b, cx, 26 + i * 5 + b, horn);
      p.oval(cx - 7, 56, 4, 2.5, bodyD); p.oval(cx + 7, 56, 4, 2.5, bodyD);
      const hy = 20 + b + 2;
      p.tri(cx - 7, hy - 6, cx - 12, hy - 16, cx - 3, hy - 8, horn);
      p.tri(cx + 7, hy - 6, cx + 12, hy - 16, cx + 3, hy - 8, horn);
      p.oval(cx, hy, 11, 9.5, body);
      p.oval(cx - 4, hy - 4, 4, 3, bodyL);
      // 王冠（少しかたむいている）
      p.rect(cx - 7, hy - 11, 14, 3, '#f0c840');
      for (const x of [cx - 7, cx - 2, cx + 3]) p.tri(x, hy - 11, x + 4, hy - 11, x + 2, hy - 15, '#f0c840');
      // ため息の吹き出し
      if (f === 2) { p.disc(cx + 16, hy - 12, 2, '#c8c8e8'); p.disc(cx + 20, hy - 16, 3, '#c8c8e8'); }
      return;
    }
    // 体
    p.oval(cx, 42 + b, 13, 12, body);
    p.oval(cx - 5, 36 + b, 4, 3, bodyL);
    p.oval(cx, 44 + b, 8, 9, belly);
    for (let i = 0; i < 4; i++) p.rect(cx - 6, 39 + b + i * 3, 13, 1, '#d0a8e0');
    p.oval(cx - 8, 56, 4.5, 2.5, bodyD); p.oval(cx + 8, 56, 4.5, 2.5, bodyD);
    for (const x of [cx - 11, cx - 8, cx + 6, cx + 9]) p.px(x, 58, horn);
    p.disc(cx - 12, 44 + b, 3, body); p.disc(cx + 12, 44 + b, 3, body);
    // 頭
    const hy = 20 + b + (happy ? 0 : 1);
    p.tri(cx - 7, hy - 6, cx - 13, hy - 17, cx - 3, hy - 8, horn);
    p.tri(cx + 7, hy - 6, cx + 13, hy - 17, cx + 3, hy - 8, horn);
    p.oval(cx, hy, 12, 10, body);
    p.oval(cx - 5, hy - 5, 4, 2.5, bodyL);
    p.oval(cx, hy + 5, 7, 4, '#8a5ac8');
    p.px(cx - 3, hy + 4, K); p.px(cx + 3, hy + 4, K);
    p.oval(cx - 9, hy + 4, 2, 1.2, '#e8a0c8'); p.oval(cx + 9, hy + 4, 2, 1.2, '#e8a0c8');
    // 王冠
    p.rect(cx - 7, hy - 12, 14, 3, '#f0c840');
    for (const x of [cx - 7, cx - 2, cx + 3]) p.tri(x, hy - 12, x + 4, hy - 12, x + 2, hy - 16, '#f0c840');
    p.px(cx, hy - 11, '#e83a4a');
    // 目（金色のするどい目、でも涙ぐむ）
    for (const x of [cx - 9, cx + 4]) {
      if (f === 3) { p.rect(x, hy + 1, 5, 1, K); continue; }
      p.rect(x, hy - 2, 5, 4, '#f8d848'); p.rect(x + 2, hy - 2, 1, 4, K);
      p.px(x, hy - 2, W);
      if (!happy) { p.rect(x, hy - 3, 5, 1, bodyD); p.px(x + (x < cx ? 4 : 0), hy - 4, bodyD); }
    }
    if (!happy) { p.px(cx - 9, hy + 3, '#8ad0f8'); p.px(cx + 8, hy + 3, '#8ad0f8'); }
    // 口と、ちいさな牙
    if (f === 2) { p.rect(cx - 3, hy + 7, 7, 2, '#4a1030'); p.px(cx - 2, hy + 7, W); p.px(cx + 2, hy + 7, W); }
    else if (happy) { p.px(cx - 4, hy + 7, K); p.rect(cx - 3, hy + 8, 7, 1, K); p.px(cx + 4, hy + 7, K); p.px(cx - 2, hy + 9, W); p.px(cx + 2, hy + 9, W); }
    else { p.rect(cx - 3, hy + 8, 7, 1, K); p.px(cx - 4, hy + 9, K); p.px(cx + 4, hy + 9, K); p.px(cx - 2, hy + 9, W); }
  });
}

// ---------------- 骸骨の門番（こわがり） ----------------
export function skeletonSheet({ shaking = true } = {}) {
  return spriteSheet(30, 38, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const sh = shaking && f === 1 ? 1 : 0; // ガタガタ
    const bone = '#f0ece0', boneD = '#c8c0b0';
    // やり
    p.rect(25, 4, 1, 32, '#6a5a4a');
    p.tri(23, 6, 28, 6, 25.5, 0, '#a8b0c0');
    // 足の骨
    p.rect(10 + sh, 28, 2, 8, bone); p.rect(17 + sh, 28, 2, 8, bone);
    p.rect(8 + sh, 35, 5, 2, bone); p.rect(16 + sh, 35, 5, 2, bone);
    // こしと、あばら（かぶとの下に、ぼろぼろのマント）
    p.tri(6, 14 + b, 23, 14 + b, 25, 30, '#4a3a5a');
    p.tri(6, 14 + b, 4, 30, 25, 30, '#3a2a4a');
    p.rect(13 + sh, 16 + b, 3, 12, boneD);
    for (let i = 0; i < 4; i++) p.rect(10 + sh, 17 + b + i * 3, 9, 1, bone);
    p.rect(9 + sh, 27, 11, 2, bone);
    // 腕（ふるえて やりにしがみつく）
    p.line(9 + sh, 18 + b, 6, 25, bone); p.line(19 + sh, 18 + b, 24, 20, bone);
    // 頭がいこつ
    const hy = 8 + b;
    p.oval(14.5 + sh, hy, 6.5, 6, bone);
    p.rect(11 + sh, hy + 4, 7, 3, bone);
    for (let i = 0; i < 4; i++) p.px(12 + i * 2 + sh, hy + 6, K);
    // 目のあな（青い光）
    for (const x of [11, 16]) {
      if (f === 3) { p.rect(x + sh, hy, 3, 1, K); continue; }
      p.rect(x + sh, hy - 1, 3, 3, K); p.px(x + 1 + sh, hy, '#7ad8ff');
    }
    p.px(14 + sh, hy + 3, K);
    // かぶと
    p.oval(14.5 + sh, hy - 4, 7.5, 3.5, '#6a7080');
    p.rect(7 + sh, hy - 2, 15, 1, '#4a5060');
    p.rect(13 + sh, hy - 10, 3, 3, '#a82838');
    // 汗
    if (shaking) { p.px(22, hy - 2, '#8ad0f8'); p.px(22, hy - 1, '#8ad0f8'); }
  });
}

// ---------------- コウモリの執事 ----------------
export function batSheet() {
  return spriteSheet(36, 34, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const fur = '#4a3a5a', furL = '#6a5a7a';
    // つばさ（マントのように）
    const wy = f === 1 ? 1 : 0;
    p.tri(10, 14 + b, 1, 8 + wy, 3, 26, '#2a1a3a');
    p.tri(10, 14 + b, 3, 26, 9, 24, '#2a1a3a');
    p.tri(26, 14 + b, 35, 8 + wy, 33, 26, '#2a1a3a');
    p.tri(26, 14 + b, 33, 26, 27, 24, '#2a1a3a');
    for (const [x, y] of [[3, 12], [33, 12]]) p.px(x, y + wy, '#c8b8d8');
    // 燕尾服
    p.oval(18, 24 + b, 7.5, 7.5, '#1a1a2a');
    p.tri(14, 18 + b, 22, 18 + b, 18, 30, '#f4f4f8');
    p.tri(17, 19 + b, 19, 19 + b, 18, 22 + b, '#c83a48'); // 蝶ネクタイ
    p.tri(15, 19 + b, 15, 22 + b, 18, 20.5 + b, '#c83a48');
    p.tri(21, 19 + b, 21, 22 + b, 18, 20.5 + b, '#c83a48');
    for (let i = 0; i < 3; i++) p.px(18, 24 + b + i * 2, '#f0c840');
    p.rect(13, 31, 3, 2, '#2a2a3a'); p.rect(20, 31, 3, 2, '#2a2a3a');
    // 頭（大きな耳）
    const hy = 11 + b;
    p.tri(11, hy - 2, 9, hy - 11, 15, hy - 5, fur);
    p.tri(25, hy - 2, 27, hy - 11, 21, hy - 5, fur);
    p.px(11, hy - 7, '#e8a0b0'); p.px(25, hy - 7, '#e8a0b0');
    p.oval(18, hy, 7, 6, fur);
    p.oval(18, hy + 2, 4.5, 3.5, furL);
    // 片めがね
    p.disc(21, hy - 1, 2.2, '#f0c840'); p.disc(21, hy - 1, 1.4, '#c8e8f8');
    p.line(23, hy, 24, hy + 5, '#f0c840');
    for (const x of [14, 20]) {
      if (f === 3) { p.rect(x, hy, 3, 1, K); continue; }
      p.rect(x, hy - 2, 2, 2, K); p.px(x, hy - 2, W);
    }
    // 牙
    p.px(16, hy + 4, W); p.px(20, hy + 4, W);
    if (f === 2) p.rect(17, hy + 4, 3, 1, '#7a2a3a');
  });
}

// ---------------- 魔女ネコの料理番 ----------------
export function witchCatSheet() {
  return spriteSheet(34, 40, (p, f) => {
    const b = f === 1 ? 1 : 0;
    const fur = '#2a2a38', furL = '#4a4a5a';
    // ドレス
    p.tri(17, 20 + b, 6, 38, 28, 38, '#5a3a8a');
    p.rect(8, 33, 18, 5, '#5a3a8a');
    p.rect(11, 25 + b, 12, 8, '#f4f0e6'); // エプロン
    p.rect(11, 25 + b, 12, 1, '#c8c0b0');
    p.px(14, 29 + b, '#e8a040'); p.px(19, 30 + b, '#e8a040');
    // しっぽ
    p.line(26, 34, 31, 27, fur); p.line(31, 27, 30, 22, fur);
    // 腕とおたま
    p.disc(8, 26 + b, 2, fur); p.disc(26, 26 + b, 2, fur);
    p.line(26, 26 + b, 30, 16 + b, '#a8a8b8'); p.oval(30, 15 + b, 2, 1.4, '#c8c8d8');
    // 頭
    const hy = 17 + b;
    p.tri(10, hy - 3, 10, hy - 9, 14, hy - 5, fur);
    p.tri(24, hy - 3, 24, hy - 9, 20, hy - 5, fur);
    p.oval(17, hy, 7.5, 6, fur);
    p.oval(17, hy + 2.5, 4, 2.5, furL);
    p.px(17, hy + 1, '#e88a9a');
    // 黄色い目
    for (const x of [13, 19]) {
      if (f === 3) { p.rect(x, hy - 1, 3, 1, '#f8d848'); continue; }
      p.rect(x, hy - 2, 3, 3, '#f8d848'); p.rect(x + 1, hy - 2, 1, 3, K);
    }
    for (const s of [-1, 1]) p.line(17 + s * 4, hy + 2, 17 + s * 9, hy + 1, '#9a9aa8');
    if (f === 2) p.rect(16, hy + 4, 3, 1, '#c84a5a');
    // 魔女の帽子
    p.rect(7, hy - 6, 20, 2, '#3a2a5a');
    p.tri(10, hy - 6, 24, hy - 6, 21, hy - 20, '#3a2a5a');
    p.tri(21, hy - 20, 24, hy - 20, 27, hy - 16, '#3a2a5a');
    p.rect(11, hy - 8, 12, 2, '#c8a040');
    p.px(17, hy - 8, '#e8603a');
  });
}

// ---------------- ミミック（しゃべる宝箱） ----------------
export function mimicSheet({ open = false } = {}) {
  return spriteSheet(32, 28, (p, f) => {
    const talk = f === 2 || open;
    const wood = '#9a5a2a', woodD = '#6a3a1a', gold = '#f0c840';
    const lid = talk ? 4 : 0;
    // 箱
    p.rect(3, 13, 26, 13, wood);
    for (let i = 0; i < 3; i++) p.rect(3, 16 + i * 4, 26, 1, woodD);
    p.rect(3, 13, 2, 13, gold); p.rect(27, 13, 2, 13, gold);
    p.rect(14, 15, 4, 4, gold); p.px(15, 17, K); p.px(16, 17, K);
    // 口のなか（ふたが開くと見える）
    if (talk) {
      p.rect(5, 9, 22, 5, '#5a1020');
      for (let i = 0; i < 5; i++) p.tri(6 + i * 4, 9, 9 + i * 4, 9, 7.5 + i * 4, 12, W);
      for (let i = 0; i < 5; i++) p.tri(6 + i * 4, 14, 9 + i * 4, 14, 7.5 + i * 4, 11, W);
      p.oval(16, 13, 4, 1.5, '#e85a7a'); // した
    }
    // ふた
    p.rect(2, 4 - lid, 28, 6, wood);
    p.rect(2, 4 - lid, 28, 1, '#b87a4a');
    p.rect(2, 9 - lid, 28, 1, woodD);
    p.rect(2, 4 - lid, 2, 6, gold); p.rect(28, 4 - lid, 2, 6, gold);
    // ふたの上の目
    for (const x of [9, 20]) {
      if (f === 3) { p.rect(x, 6 - lid, 3, 1, K); continue; }
      p.rect(x, 5 - lid, 3, 3, W); p.rect(x + 1, 6 - lid, 1, 2, K);
    }
    // 足
    p.rect(6, 26, 3, 2, woodD); p.rect(23, 26, 3, 2, woodD);
  });
}

// ---------------- ちびゴースト ----------------
export function ghostSheet({ color = '#e8f0ff', cheek = '#f8b0c8' } = {}) {
  return spriteSheet(20, 22, (p, f) => {
    const b = f === 1 ? 1 : 0;
    p.oval(10, 9 + b, 8, 8, color);
    p.rect(2, 9 + b, 16, 8, color);
    for (let i = 0; i < 4; i++) p.tri(2 + i * 4, 17 + b, 6 + i * 4, 17 + b, 4 + i * 4 + (f === 1 ? 1 : 0), 21, color);
    p.oval(7, 6 + b, 2, 1.5, W);
    for (const x of [6, 12]) {
      if (f === 3) { p.rect(x, 10 + b, 2, 1, K); continue; }
      p.rect(x, 9 + b, 2, 2, K);
    }
    p.px(5, 12 + b, cheek); p.px(14, 12 + b, cheek);
    if (f === 2) p.oval(10, 13.5 + b, 1.5, 1, '#5a2a4a');
    else p.rect(9, 13 + b, 2, 1, K);
  });
}

export const makeMaou = (o) => new PixelCreature('maou', maouSheet(o), { scale: 1.7, glow: 0.4 });
export const makeSkeleton = (o) => new PixelCreature('skeleton', skeletonSheet(o), { scale: 1 });
export const makeBat = () => new PixelCreature('bat', batSheet(), { scale: 1 });
export const makeWitchCat = () => new PixelCreature('witch', witchCatSheet(), { scale: 1 });
export const makeMimic = (o) => new PixelCreature('mimic', mimicSheet(o), { scale: 1 });
export function makeGhost(o) {
  const c = new PixelCreature('ghost', ghostSheet(o), { scale: 0.9, glow: 0.9 });
  c.mat.transparent = true;
  c.mat.opacity = 0.8;
  c.mat.depthWrite = false;
  c.shadow.visible = false;
  c.sprite.castShadow = false;
  c.bobSpeed = 2.2;
  return c;
}
