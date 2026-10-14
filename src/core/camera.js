import * as THREE from 'three';

// ---------------------------------------------------------------
// 箱庭用のカメラ操作
//  ・ドラッグ（指1本／マウス左）  … 地図のように視点をすべらせる
//  ・2本指のひねり／右ドラッグ／Q・E … 横にくるっと回す（⟲ ⟳ ボタンは90°ずつ）
//  ・ピンチ／ホイール            … 寄る・引く（傾きは距離に合わせて自動）
//  ・建物の中を見ているとき       … 真上寄りから見下ろす
//  ・演出中（cinematic）はステージ側が camera と target を直接動かす
// ---------------------------------------------------------------

const V = THREE.Vector3;
const MIN_D = 8, MAX_D = 62;

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.target = new V(0, 1, 0);
    this.goal = new V(0, 1, 0);
    this.yaw = this.yawGoal = 0.35;
    this.dist = this.distGoal = 36;
    this.polar = 0.95;
    this.enabled = true;
    this.autoRotate = false;
    this.autoRotateSpeed = 0.35;
    this.bounds = { minX: -14, maxX: 14, minZ: -10, maxZ: 10 };
    this.interior = null; // (point) => { polar, maxDist } | null
    this.driving = false;
    this._pointers = new Map();
    this._suppressUntil = 0;
    this._initInput();
  }

  get portrait() { return window.innerWidth < window.innerHeight; }

  /** 距離に合わせた自然な傾き（近いほど低い角度） */
  polarFor(d) {
    const t = THREE.MathUtils.clamp((d - MIN_D) / (40 - MIN_D), 0, 1);
    return THREE.MathUtils.lerp(1.08, 0.82, t);
  }

  /** いまのカメラ位置から、回転・距離を読み取る（演出のあとなど） */
  sync() {
    const s = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.target));
    this.yaw = this.yawGoal = s.theta;
    this.dist = this.distGoal = THREE.MathUtils.clamp(s.radius, MIN_D, MAX_D);
    this.polar = s.phi;
    this.goal.copy(this.target);
  }

  /** 見たい場所へなめらかに移動 */
  lookAt(point, { dist, yaw } = {}) {
    this.goal.copy(point);
    if (dist !== undefined) this.distGoal = THREE.MathUtils.clamp(dist, MIN_D, MAX_D);
    if (yaw !== undefined) this.yawGoal = this.yaw + Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
  }

  rotateBy(rad) { this.yawGoal += rad; this.autoRotate = false; }

  /** 島全体が見える位置へ */
  overview() {
    this.goal.set(0, 0.5, 0);
    this.distGoal = this.portrait ? 58 : 40;
  }

  get suppressClick() { return performance.now() < this._suppressUntil; }

  /** 画面上の移動量を、地面の上の移動量に直して視点をすべらせる */
  _pan(dx, dy) {
    const h = this.dom.clientHeight || window.innerHeight;
    const s = (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / h;
    const right = new V(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new V(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    // 見下ろしているぶん、前後の動きは大きめにする
    const k = 1 / Math.max(0.45, Math.cos(this.polar));
    this.goal.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s * Math.min(k, 1.8));
    this._clamp();
  }

  _clamp() {
    const b = this.bounds;
    this.goal.x = THREE.MathUtils.clamp(this.goal.x, b.minX, b.maxX);
    this.goal.z = THREE.MathUtils.clamp(this.goal.z, b.minZ, b.maxZ);
    this.goal.y = THREE.MathUtils.clamp(this.goal.y, 0.5, 3);
  }

  _initInput() {
    const dom = this.dom;
    let mode = null; // 'pan' | 'rotate' | 'pinch'
    let last = null;
    let moved = 0;
    let pinch = null;
    const pts = () => [...this._pointers.values()];
    const twoInfo = () => {
      const [a, b] = pts();
      return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    };

    dom.addEventListener('pointerdown', (e) => {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pointers.size === 1) {
        mode = e.button === 2 || e.shiftKey || e.ctrlKey ? 'rotate' : 'pan';
        last = { x: e.clientX, y: e.clientY };
        moved = 0;
      } else if (this._pointers.size === 2) {
        mode = 'pinch';
        pinch = { ...twoInfo(), dist: this.distGoal };
        this._suppressUntil = performance.now() + 500;
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!this.enabled) return;
      if (mode === 'pinch' && this._pointers.size >= 2) {
        const n = twoInfo();
        this.distGoal = THREE.MathUtils.clamp(pinch.dist * pinch.d / Math.max(20, n.d), MIN_D, MAX_D);
        let da = n.ang - pinch.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        this.yawGoal -= da;
        this._pan(n.mx - pinch.mx, n.my - pinch.my);
        pinch.ang = n.ang; pinch.mx = n.mx; pinch.my = n.my;
        this._suppressUntil = performance.now() + 500;
        this.autoRotate = false;
        return;
      }
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 6) return; // タップのぶれは無視
      this.autoRotate = false;
      if (mode === 'rotate') this.yawGoal -= dx * 0.008;
      else this._pan(dx, dy);
    });

    const up = (e) => {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size === 0) { mode = null; last = null; pinch = null; }
      if (this._pointers.size === 1 && mode === 'pinch') {
        // ピンチのあとに残った指は、そのまま視点移動に
        const p = pts()[0];
        mode = 'pan'; last = { x: p.x, y: p.y }; moved = 10; pinch = null;
      }
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      const f = Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0022);
      this.distGoal = THREE.MathUtils.clamp(this.distGoal * f, MIN_D, MAX_D);
      this.autoRotate = false;
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.target.closest?.('input, textarea')) return;
      const k = e.key.toLowerCase();
      const step = 40;
      if (k === 'q') this.rotateBy(Math.PI / 4);
      else if (k === 'e') this.rotateBy(-Math.PI / 4);
      else if (k === 'arrowleft' || k === 'a') this._pan(step, 0);
      else if (k === 'arrowright' || k === 'd') this._pan(-step, 0);
      else if (k === 'arrowup' || k === 'w') this._pan(0, step);
      else if (k === 'arrowdown' || k === 's') this._pan(0, -step);
      else if (k === '+' || k === '=') this.distGoal = Math.max(MIN_D, this.distGoal / 1.2);
      else if (k === '-') this.distGoal = Math.min(MAX_D, this.distGoal * 1.2);
    });
  }

  update(dt, { cinematic }) {
    const cam = this.camera;
    if (cinematic) {
      // 演出中はステージが動かす。終わったら今の位置から引き継ぐ
      this.driving = false;
      cam.lookAt(this.target);
      return;
    }
    if (!this.driving) { this.sync(); this.driving = true; }
    const k = (l) => 1 - Math.exp(-l * dt);
    if (this.autoRotate) this.yawGoal += this.autoRotateSpeed * 0.1 * dt;

    // 建物の中を見ているときは、真上寄りから見下ろす
    let polarGoal = this.polarFor(this.distGoal);
    const inside = this.interior && this.interior(this.goal);
    if (inside && this.distGoal < (inside.maxDist ?? 26)) polarGoal = Math.min(polarGoal, inside.polar);

    this.target.lerp(this.goal, k(9));
    this.dist += (this.distGoal - this.dist) * k(8);
    this.yaw += (this.yawGoal - this.yaw) * k(9);
    this.polar += (polarGoal - this.polar) * k(4);
    cam.position.copy(this.target).add(new V().setFromSpherical(new THREE.Spherical(this.dist, this.polar, this.yaw)));
    cam.lookAt(this.target);
  }
}
