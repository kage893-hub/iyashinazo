import * as THREE from 'three';

// ---------------------------------------------------------------
// HD-2D 用のドット絵ツール
//  ・Pix：小さなキャンバスに 1ドットずつ描く（にじまない）
//  ・pixTex：タイル（石畳・れんが・屋根）などのドット絵テクスチャ
//  ・PixelCreature：ドット絵の住人（いつもカメラのほうを向く板）
// ---------------------------------------------------------------

const _col = new Map();
function rgba(c) {
  if (_col.has(c)) return _col.get(c);
  let r = 0, g = 0, b = 0, a = 255;
  if (c[0] === '#') {
    const h = c.slice(1);
    const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    r = parseInt(n.slice(0, 2), 16); g = parseInt(n.slice(2, 4), 16); b = parseInt(n.slice(4, 6), 16);
    if (n.length === 8) a = parseInt(n.slice(6, 8), 16);
  }
  const v = [r, g, b, a];
  _col.set(c, v);
  return v;
}

/** ドット単位で描くキャンバス */
export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const [r, g, b, a] = rgba(c);
    const i = (y * this.w + x) * 4;
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  /** だ円（中心・半径はドット単位、0.5 刻みOK） */
  oval(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) this.px(x, y, c);
      }
    }
  }
  disc(cx, cy, r, c) { this.oval(cx, cy, r, r, c); }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  tri(x0, y0, x1, y1, x2, y2, c) {
    const minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    const s = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const a = s(x0, y0, x1, y1, px, py), b = s(x1, y1, x2, y2, px, py), d = s(x2, y2, x0, y0, px, py);
      if ((a >= 0 && b >= 0 && d >= 0) || (a <= 0 && b <= 0 && d <= 0)) this.px(x, y, c);
    }
  }
  /** 不透明な部分のまわりに輪郭線（ドット絵らしさ） */
  outline(c = '#1a1420') {
    const src = new Uint8ClampedArray(this.d);
    const at = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[(y * this.w + x) * 4 + 3]);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (at(x, y)) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.px(x, y, c);
    }
  }
  /** 別の Pix を (ox, oy) に重ねる */
  blit(p, ox, oy) {
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = (y * p.w + x) * 4;
      if (p.d[i + 3] < 128) continue;
      const j = ((y + oy) * this.w + (x + ox)) * 4;
      if (x + ox < 0 || y + oy < 0 || x + ox >= this.w || y + oy >= this.h) continue;
      this.d[j] = p.d[i]; this.d[j + 1] = p.d[i + 1]; this.d[j + 2] = p.d[i + 2]; this.d[j + 3] = p.d[i + 3];
    }
  }
  canvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

function nearest(t) {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** ドット絵テクスチャ（タイル用、くり返しOK） */
const _texCache = new Map();
export function pixTex(key, w, h, draw, repeat = [1, 1]) {
  let base = _texCache.get(key);
  if (!base) {
    const p = new Pix(w, h);
    draw(p, w, h);
    base = nearest(new THREE.CanvasTexture(p.canvas()));
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    _texCache.set(key, base);
  }
  if (repeat[0] === 1 && repeat[1] === 1) return base;
  const t = base.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  return t;
}

/** ドット絵の板（看板・窓・小物）用マテリアル */
export function pixMat(tex, opts = {}) {
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, alphaTest: 0.5, ...opts });
}

/**
 * 横にならんだコマのスプライトシート。draw(p, frame) で 1コマずつ描く。
 * コマ：0 待機A / 1 待機B（息） / 2 おしゃべり / 3 まばたき
 */
export function spriteSheet(w, h, draw, frames = 4, outline = '#1a1420') {
  const p = new Pix(w * frames, h);
  for (let f = 0; f < frames; f++) {
    const q = new Pix(w, h);
    draw(q, f);
    if (outline) q.outline(outline);
    p.blit(q, f * w, 0);
  }
  const t = nearest(new THREE.CanvasTexture(p.canvas()));
  t.repeat.set(1 / frames, 1);
  return { tex: t, w, h, frames };
}

const _v = new THREE.Vector3();
const PX = 0.055; // 1ドットの大きさ（ワールド単位）

/**
 * ドット絵の住人。Creature と同じように root / talk / hop / update を持つ。
 * 板はいつもカメラのほうを向き（縦軸まわりだけ回す）、影も落とす。
 */
export class PixelCreature {
  constructor(kind, sheet, { scale = 1, glow = 0.32 } = {}) {
    this.kind = kind;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.phase = Math.random() * 10;
    this.talkT = 0;
    this.hopT = 0;
    this.blinkT = 1 + Math.random() * 3;
    this.noIdleHop = false;
    this.bobSpeed = 1.6;
    this.sheets = {};
    this.mat = new THREE.MeshStandardMaterial({ map: sheet.tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, emissive: '#ffffff', emissiveMap: sheet.tex, emissiveIntensity: glow });
    this.glow = glow;
    this.scale = scale;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    this.sprite = new THREE.Mesh(geo, this.mat);
    this.sprite.castShadow = true;
    this.sprite.receiveShadow = false;
    this.body.add(this.sprite);
    // ほんのり影の円（足もと）
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    sh.userData.noPick = true;
    this.shadow = sh;
    this.root.add(sh);
    this.setSheet(sheet);
  }

  setSheet(sheet) {
    this.sheet = sheet;
    // コマ送りはテクスチャのずらしで行うので、住人ごとに複製する
    if (this.tex) this.tex.dispose();
    this.tex = sheet.tex.clone();
    this.tex.needsUpdate = true;
    this.mat.map = this.tex;
    this.mat.emissiveMap = this.tex;
    this.mat.needsUpdate = true;
    this.sprite.scale.set(sheet.w * PX * this.scale, sheet.h * PX * this.scale, 1);
    this.shadow.scale.set(sheet.w * PX * this.scale * 0.7, sheet.w * PX * this.scale * 0.35, 1);
  }

  talk(sec = 1.4) { this.talkT = sec; }
  hop() { this.hopT = 0.5; }

  _frame(f) {
    const t = this.tex;
    t.offset.x = (f % this.sheet.frames) / this.sheet.frames;
  }

  update(dt, t) {
    // カメラのほうを向く
    if (this.camPos) {
      const w = this.root.getWorldPosition(_v);
      const a = Math.atan2(this.camPos.x - w.x, this.camPos.z - w.z);
      this.body.rotation.y = a - this.root.rotation.y;
    }
    let f = Math.floor((t + this.phase) * this.bobSpeed) % 2;
    this.blinkT -= dt;
    if (this.blinkT < 0.12) f = 3;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3.5;
    if (this.talkT > 0) {
      this.talkT -= dt;
      f = Math.floor(t * 7) % 2 ? 2 : 0;
    }
    this._frame(f);
    let y = 0;
    if (this.hopT > 0) {
      this.hopT -= dt;
      y = Math.sin((1 - this.hopT / 0.5) * Math.PI) * 0.35;
    }
    this.body.position.y = y;
    if (this.extra) this.extra(dt, t);
  }
}

/** ドット絵のテキスト看板（小さく描いて拡大＝にじまない文字） */
export function pixText(text, { w = 64, h = 16, bg = '#3a2418', fg = '#f4dc8a', border = '#a8783a', size = 12 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = border; x.fillRect(0, 0, w, h);
  x.fillStyle = bg; x.fillRect(1, 1, w - 2, h - 2);
  x.fillStyle = fg;
  x.font = `${size}px "DotGothic16", monospace`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 1);
  // にじんだ縁を 2値化
  const img = x.getImageData(0, 0, w, h);
  const [fr, fgc, fb] = rgba(fg), [br, bgc, bb] = rgba(bg);
  for (let i = 0; i < img.data.length; i += 4) {
    const px = (i / 4) % w, py = Math.floor(i / 4 / w);
    if (px === 0 || py === 0 || px === w - 1 || py === h - 1) continue;
    const d = img.data;
    const k = (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bgc) + Math.abs(d[i + 2] - bb)) / (Math.abs(fr - br) + Math.abs(fgc - bgc) + Math.abs(fb - bb) + 1);
    const on = k > 0.45;
    d[i] = on ? fr : br; d[i + 1] = on ? fgc : bgc; d[i + 2] = on ? fb : bb; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return nearest(new THREE.CanvasTexture(c));
}
