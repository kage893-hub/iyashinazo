import * as THREE from 'three';

// ---------------------------------------------------------------
// 歩ける場所の地図（ナビグリッド）
// 箱庭を真上から一度だけ描いて「足元の高さ」を読み取り、
// 段差が小さいところだけをつないで A* で道を探す。
// ---------------------------------------------------------------

const CLIP_Y = 2.2;   // これより高いもの（屋根・木の葉・気球）は通り抜けられる
const STEP = 0.42;    // のぼれる段差
const NONE = -50;     // 島の外

export class NavGrid {
  constructor({ minX = -15, maxX = 15, minZ = -11, maxZ = 11, cell = 0.25 } = {}) {
    this.minX = minX; this.minZ = minZ; this.cell = cell;
    this.w = Math.round((maxX - minX) / cell);
    this.h = Math.round((maxZ - minZ) / cell);
    this.height = new Float32Array(this.w * this.h).fill(0);
    this.clear = new Uint8Array(this.w * this.h).fill(1);
    this.ok = false;
  }

  /** シーンを真上から描いて高さを読む */
  build(renderer, scene, hide = []) {
    const { w, h, cell } = this;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: true });
    const cam = new THREE.OrthographicCamera(0, w * cell, 0, -h * cell, 1, 120);
    // 画面の右 = +X、画面の上 = -Z になるように真上から見る
    cam.up.set(0, 0, -1);
    cam.position.set(this.minX, 60, this.minZ);
    cam.lookAt(this.minX, 0, this.minZ);
    cam.left = 0; cam.right = w * cell; cam.top = 0; cam.bottom = -h * cell;
    cam.updateProjectionMatrix();

    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying float vY;
        void main() {
          vec4 p = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            p = instanceMatrix * p;
          #endif
          vec4 wp = modelMatrix * p;
          vY = wp.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        varying float vY;
        void main() {
          if (vY > ${CLIP_Y.toFixed(2)}) discard;
          gl_FragColor = vec4(vY, 0.0, 0.0, 1.0);
        }`,
    });

    // 動くもの・見えないもの・飾りは描かない
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) return;
      const skip = o.userData.noPick || o.isPoints || o.isSprite || o.isLine || o.isLight === true || hide.includes(o);
      if (skip && (o.isMesh || o.isPoints || o.isSprite || o.isLine || o.isGroup || hide.includes(o))) { o.visible = false; hidden.push(o); }
    });
    const prevTarget = renderer.getRenderTarget();
    const prevColor = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    const prevAuto = renderer.shadowMap.autoUpdate;
    const prevTone = renderer.toneMapping;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.NoToneMapping;
    scene.overrideMaterial = mat;
    const fog = scene.fog; scene.fog = null;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(new THREE.Color(NONE, 0, 0), 1);
    renderer.clear();
    renderer.render(scene, cam);
    const px = new Float32Array(w * h * 4);
    try {
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
      this.ok = true;
    } catch (e) {
      console.warn('[nav] 高さの読み取りに失敗', e);
    }
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    renderer.shadowMap.autoUpdate = prevAuto;
    renderer.toneMapping = prevTone;
    scene.overrideMaterial = null;
    scene.fog = fog;
    for (const o of hidden) o.visible = true;
    rt.dispose(); mat.dispose();

    if (!this.ok) return;
    // readPixels の行 0 は画面の下（= +Z 側）
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const row = h - 1 - j;
        this.height[j * w + i] = px[(row * w + i) * 4];
      }
    }
    this._computeClear();
  }

  _computeClear() {
    const { w, h, height } = this;
    const walk = (k) => height[k] > NONE + 1 && height[k] < CLIP_Y - 0.05;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        let ok = walk(k);
        // 体の幅ぶん、壁や崖から離れる
        if (ok) {
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            const ni = i + di, nj = j + dj;
            if (ni < 0 || nj < 0 || ni >= w || nj >= h) { ok = false; break; }
            const n = nj * w + ni;
            if (!walk(n) || Math.abs(height[n] - height[k]) > STEP) { ok = false; break; }
          }
        }
        this.clear[k] = ok ? 1 : 0;
      }
    }
  }

  toCell(x, z) {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }

  toWorld(i, j) {
    return new THREE.Vector3(this.minX + (i + 0.5) * this.cell, this.height[j * this.w + i], this.minZ + (j + 0.5) * this.cell);
  }

  inside(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }

  isClear(i, j) { return this.inside(i, j) && this.clear[j * this.w + i] === 1; }

  heightAt(x, z) {
    const [i, j] = this.toCell(x, z);
    if (!this.inside(i, j)) return 0;
    const v = this.height[j * this.w + i];
    return v > NONE + 1 && v < CLIP_Y ? v : 0;
  }

  /** いちばん近い歩ける場所 */
  nearestClear(x, z, maxR = 12) {
    const [ci, cj] = this.toCell(x, z);
    if (this.isClear(ci, cj)) return [ci, cj];
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (this.isClear(ci + di, cj + dj)) {
            const d = di * di + dj * dj;
            if (d < bd) { bd = d; best = [ci + di, cj + dj]; }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  _canStep(a, b) {
    return Math.abs(this.height[a] - this.height[b]) <= STEP;
  }

  /**
   * 道を探す。to が届かない場合は、たどり着ける中でいちばん近い場所までの道を返す。
   * 戻り値は Vector3 の配列（null は道なし）
   */
  findPath(from, to) {
    const { w } = this;
    const s = this.nearestClear(from.x, from.z, 6);
    const g = this.nearestClear(to.x, to.z, 16);
    if (!s || !g) return null;
    const start = s[1] * w + s[0], goal = g[1] * w + g[0];
    const N = this.w * this.h;
    const cost = new Float32Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = new MinHeap();
    const hx = (k) => { const i = k % w, j = (k / w) | 0; return Math.hypot(i - g[0], j - g[1]); };
    cost[start] = 0;
    heap.push(start, hx(start));
    let best = start, bestH = hx(start);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414]];
    let iter = 0;
    while (heap.size && iter++ < 40000) {
      const k = heap.pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === goal) { best = k; break; }
      const hk = hx(k);
      if (hk < bestH) { bestH = hk; best = k; }
      const i = k % w, j = (k / w) | 0;
      for (const [di, dj, c] of dirs) {
        const ni = i + di, nj = j + dj;
        if (!this.isClear(ni, nj)) continue;
        // 斜めは角を切らない
        if (di && dj && (!this.isClear(i + di, j) || !this.isClear(i, j + dj))) continue;
        const n = nj * w + ni;
        if (closed[n] || !this._canStep(k, n)) continue;
        const nc = cost[k] + c;
        if (nc < cost[n]) {
          cost[n] = nc; prev[n] = k;
          heap.push(n, nc + hx(n));
        }
      }
    }
    const cells = [];
    for (let k = best; k !== -1; k = prev[k]) cells.push(k);
    cells.reverse();
    return this._smooth(cells).map((k) => this.toWorld(k % w, (k / w) | 0));
  }

  /** 見通せる点どうしをつないで、カクカクした道をなめらかにする */
  _smooth(cells) {
    if (cells.length <= 2) return cells;
    const out = [cells[0]];
    let a = 0;
    while (a < cells.length - 1) {
      let b = cells.length - 1;
      while (b > a + 1 && !this._sight(cells[a], cells[b])) b--;
      out.push(cells[b]);
      a = b;
    }
    return out;
  }

  _sight(a, b) {
    const { w } = this;
    let x0 = a % w, y0 = (a / w) | 0;
    const x1 = b % w, y1 = (b / w) | 0;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, last = a;
    for (;;) {
      const k = y0 * w + x0;
      if (!this.clear[k] || !this._canStep(last, k)) return false;
      last = k;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      // 斜めに進んだときは両どなりも確認
      if (!this.clear[y0 * w + x0]) return false;
    }
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const { k, p } = this;
    k.push(key); p.push(pri);
    let i = k.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (p[par] <= p[i]) break;
      [k[par], k[i]] = [k[i], k[par]]; [p[par], p[i]] = [p[i], p[par]];
      i = par;
    }
  }
  pop() {
    const { k, p } = this;
    const top = k[0];
    const lk = k.pop(), lp = p.pop();
    if (k.length) {
      k[0] = lk; p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [p[m], p[i]] = [p[i], p[m]];
        i = m;
      }
    }
    return top;
  }
}
