import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TiltShiftShader, GradeShader } from './postfx.js';
import { Tweens, Ease } from './tween.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';
import { ITEMS } from '../data/items.js';
import { CameraRig } from './camera.js';
import { clamp } from '../lib/util.js';

const SAVE_KEY = 'hoshimawari-save-v1';

/**
 * ゲーム本体：描画・カメラ・入力・状態・アイテム・会話をまとめる。
 * ステージ（箱庭）はこのクラスの API を使ってギミックを組み立てる。
 */
export class Game {
  constructor(container) {
    this.container = container;
    this.audio = new AudioSys();
    this.ui = new UI(this.audio);
    this.tweens = new Tweens();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.interactables = new Map(); // id -> { object, name, meshes, onClick }
    this.pickList = [];
    this.selectedItem = null;
    this.busy = false;
    this.cinematic = false;
    this.hoverId = null;
    this.state = this._freshState();
    this.hintLevel = 0;
    this.hintKey = '';

    this._initRenderer();
    this._initInput();
    window.addEventListener('resize', () => this._resize());
  }

  _freshState(stage = 'station') {
    return { stage, flags: {}, inventory: [], counts: {}, elapsed: 0, hints: 0, cleared: [] };
  }

  // =========================================================
  // 描画まわり
  // =========================================================
  _initRenderer() {
    // ?low で軽量モード（影・解像度を控えめに）
    const params = new URLSearchParams(location.search);
    this.low = params.has('low');
    this.timeScale = Number(params.get('ts')) || 1; // テスト用の早送り
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: !this.low, powerPreference: 'high-performance' }));
    r.setPixelRatio(this.low ? 1 : Math.min(window.devicePixelRatio, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 600);
    this.camera.position.set(14, 22, 34);

    // 箱庭用のカメラ操作（ドラッグで移動・ひねりやボタンで回転・ピンチで拡大）
    this.controls = new CameraRig(this.camera, r.domElement);

    // ポストプロセス（MSAA 付きのレンダーターゲット）
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.low ? 0 : 4 });
    const comp = (this.composer = new EffectComposer(r, rt));
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.42, 0.7, 0.9);
    comp.addPass(this.bloom);
    this.tiltH = new ShaderPass(TiltShiftShader);
    this.tiltV = new ShaderPass(TiltShiftShader);
    comp.addPass(this.tiltH);
    comp.addPass(this.tiltV);
    comp.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    comp.addPass(this.grade);
    this._resize();
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    // 縦長画面では少し引く
    this.camera.fov = w < h ? 42 : 30;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.tiltH.uniforms.delta.value.set(1 / w, 0);
    this.tiltV.uniforms.delta.value.set(0, 1 / h);
  }

  // =========================================================
  // 入力（クリック・ホバー）
  // =========================================================
  _initInput() {
    const dom = this.renderer.domElement;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let down = null;

    dom.addEventListener('pointerdown', (e) => {
      this.audio.init();
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    dom.addEventListener('pointerup', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      const quick = performance.now() - down.t < 700;
      down = null;
      if (dx * dx + dy * dy < 64 && quick && e.button === 0) this._onClick(e);
    });
    dom.addEventListener('pointermove', (e) => {
      this._lastMove = e;
      if (e.pointerType === 'mouse') this._needHover = true;
    });
    dom.addEventListener('pointerleave', () => this._setHover(null));
    dom.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.selectedItem) this.selectItem(null);
    });
  }

  _pick(e) {
    const h = this._pickHit(e);
    return h ? h.id : null;
  }

  /** クリックした物（id）と、当たった位置 */
  _pickHit(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickList, false);
    for (const h of hits) {
      const o = h.object;
      if (!o.visible || o.userData.noPick) continue;
      if (o.userData.roof && this.stage?.roofLifted) continue;
      // 親が非表示なら無視
      let vis = true;
      for (let p = o.parent; p; p = p.parent) if (!p.visible) { vis = false; break; }
      if (!vis) continue;
      let id;
      for (let p = o; p; p = p.parent) if (p.userData.interactId) { id = p.userData.interactId; break; }
      return { id: id || null, point: h.point }; // 最初に当たった不透明物で判定（壁越しクリック防止）
    }
    return null;
  }

  _setHover(id) {
    if (this.hoverId === id) return;
    if (this.hoverId) this._highlight(this.hoverId, false);
    this.hoverId = id;
    if (id) this._highlight(id, true);
    this.renderer.domElement.style.cursor = id ? 'pointer' : '';
  }

  _highlight(id, on) {
    const it = this.interactables.get(id);
    if (!it) return;
    for (const m of it.meshes) {
      if (on) {
        const src = m.material;
        if (!src || !src.emissive || m.userData._orig) continue;
        // ホバー中だけ、少し光らせた複製に差し替える
        const hi = src.clone();
        if (hi.emissiveIntensity <= 1 || hi.emissive.getHex() === 0) {
          hi.emissive.lerp(new THREE.Color('#ffcf8a'), 0.4);
          hi.emissiveIntensity = Math.max(hi.emissiveIntensity, 0.55);
        }
        m.userData._orig = src;
        m.material = hi;
      } else if (m.userData._orig) {
        m.material.dispose();
        m.material = m.userData._orig;
        delete m.userData._orig;
      }
    }
  }

  async _onClick(e) {
    if (this.ui.dialogueActive) { this.ui.advance(); return; }
    if (!this.playing || this.busy || this.cinematic || this.ui.panelOpen || this.controls.suppressClick) return;
    const hit = this._pickHit(e);
    const id = hit?.id;
    if (!id) {
      if (this.selectedItem) this.selectItem(null);
      return;
    }
    const it = this.interactables.get(id);
    if (!it || it.enabled === false) return;
    this.audio.play('click');
    this._setHover(null);
    this.ui.hideTooltip();
    this.busy = true;
    try {
      if (this.selectedItem) {
        const item = this.selectedItem;
        this.selectItem(null);
        await this.stage.useItem(item, id);
      } else {
        await it.onClick();
      }
    } catch (err) {
      console.error(err);
    }
    this.busy = false;
    this.save();
  }

  // =========================================================
  // インタラクト対象の登録
  // =========================================================
  /** object 以下のメッシュをクリック対象にする */
  addInteractable(id, object, { name, onClick, focus = true }) {
    object.userData.interactId = id;
    const meshes = [];
    object.traverse((m) => { if (m.isMesh) meshes.push(m); });
    this.interactables.set(id, { id, object, name, onClick, meshes, focus, enabled: true });
  }

  /** メッシュ結合のあとにハイライト対象を取り直す */
  refreshInteractableMeshes() {
    for (const [, it] of this.interactables) {
      it.meshes = [];
      it.object.traverse((m) => { if (m.isMesh) it.meshes.push(m); });
    }
  }

  setEnabled(id, on) {
    const it = this.interactables.get(id);
    if (it) it.enabled = on;
  }

  /** ステージ構築後に、レイキャスト対象の一覧を作る */
  buildPickList() {
    this.pickList = [];
    this.scene.traverse((o) => {
      if (o.isMesh && !o.userData.noPick) this.pickList.push(o);
    });
  }

  // =========================================================
  // カメラ演出
  // =========================================================
  /** 注視点をなめらかに移動 */
  focusOn(target, opts = {}) {
    const rig = this.controls;
    if (!this.cinematic) {
      const dist = Math.min(rig.distGoal, opts.dist ?? rig.distGoal);
      let yaw = opts.thetaClamp ? clamp(Math.atan2(Math.sin(rig.yaw), Math.cos(rig.yaw)), -opts.thetaClamp, opts.thetaClamp) : rig.yaw;
      // 相手が木や壁に隠れるときだけ、見える向きへ回りこむ
      if (opts.subject) yaw = this._clearTheta(target, dist, rig.polarFor(dist), yaw, opts.subject, opts.thetaClamp);
      rig.lookAt(target, { dist, yaw });
      return this.wait(Math.min(0.8, opts.duration ?? 0.8));
    }
    return this._focusTween(target, opts);
  }

  /** 演出中に使う、カメラを直接動かすフォーカス */
  _focusTween(target, { dist, duration = 1.0, polar, thetaClamp, subject } = {}) {
    const c = this.controls;
    const fromT = c.target.clone();
    const toT = target.clone();
    const off = this.camera.position.clone().sub(fromT);
    const sph = new THREE.Spherical().setFromVector3(off);
    const fromR = sph.radius;
    const toR = dist ?? fromR;
    const fromPhi = sph.phi;
    const toPhi = polar ?? fromPhi;
    const fromTh = sph.theta;
    let toTh = thetaClamp ? clamp(fromTh, -thetaClamp, thetaClamp) : fromTh;
    if (subject) toTh = this._clearTheta(toT, toR, toPhi, toTh, subject, thetaClamp);
    return this.tweens.add({
      duration, ease: Ease.inOut,
      onUpdate: (k) => {
        c.target.lerpVectors(fromT, toT, k);
        const s = new THREE.Spherical(fromR + (toR - fromR) * k, fromPhi + (toPhi - fromPhi) * k, fromTh + (toTh - fromTh) * k);
        this.camera.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(s));
      },
    });
  }

  /** 対象が木や建物に隠れない向き（方位角）を探す */
  _clearTheta(target, r, phi, theta, subject, limit) {
    const own = new Set();
    subject.traverse((m) => own.add(m));
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    for (const d of [0, -0.35, 0.35, -0.7, 0.7, -1.05, 1.05]) {
      let th = theta + d;
      if (limit) th = clamp(th, -limit, limit);
      const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, phi, th)).add(target);
      dir.copy(pos).sub(target);
      const len = dir.length();
      ray.set(target, dir.normalize());
      ray.far = len;
      const hit = ray.intersectObjects(this.pickList, false).find((h) => {
        const o = h.object;
        if (own.has(o) || !o.visible || o.userData.noPick) return false;
        if (o.userData.roof && this.stage?.roofLifted) return false;
        for (let p = o.parent; p; p = p.parent) if (!p.visible) return false;
        return h.distance > 0.6;
      });
      if (!hit) return th;
    }
    return theta;
  }

  /** カメラ位置と注視点を指定して移動 */
  moveCamera(pos, target, duration = 2, ease = Ease.inOut) {
    const fromP = this.camera.position.clone();
    const fromT = this.controls.target.clone();
    return this.tweens.add({
      duration, ease,
      onUpdate: (k) => {
        this.camera.position.lerpVectors(fromP, pos, k);
        this.controls.target.lerpVectors(fromT, target, k);
      },
    });
  }

  wait(sec) { return this.tweens.wait(sec); }

  // =========================================================
  // 状態・アイテム
  // =========================================================
  get flags() { return this.state.flags; }

  flag(name, value = true) {
    this.state.flags[name] = value;
    this.save();
  }

  has(item) { return this.state.inventory.includes(item); }

  /** 個数を持つアイテム（ITEMS[id].stack）の数 */
  count(item) {
    if (!this.has(item)) return 0;
    return ITEMS[item]?.stack ? (this.state.counts?.[item] || 1) : 1;
  }

  give(item, { silent = false } = {}) {
    const stack = ITEMS[item]?.stack;
    if (this.has(item) && !stack) return;
    if (!this.has(item)) this.state.inventory.push(item);
    if (stack) {
      this.state.counts = this.state.counts || {};
      this.state.counts[item] = (this.state.counts[item] || 0) + 1;
    }
    this.refreshInventory();
    if (!silent) {
      this.audio.play('item');
      this.ui.showItemGet(ITEMS[item], stack ? this.state.counts[item] : 0);
    }
    this.save();
  }

  take(item) {
    if (this.state.counts) delete this.state.counts[item];
    this.state.inventory = this.state.inventory.filter((i) => i !== item);
    if (this.selectedItem === item) this.selectedItem = null;
    this.refreshInventory();
    this.save();
  }

  selectItem(id) {
    if (id && this.selectedItem === id) {
      // もう一度押したら説明
      this.selectedItem = null;
      this.refreshInventory();
      this.ui.toast(`<b>${ITEMS[id].name}</b>：${ITEMS[id].desc}`, 3200);
      return;
    }
    this.selectedItem = id;
    if (id) {
      this.audio.play('select');
      this.ui.toast(`<b>${ITEMS[id].name}</b> を使う場所をクリック（右クリックで取り消し）`, 2400);
    }
    this.refreshInventory();
  }

  refreshInventory() {
    this.ui.renderInventory(this.state.inventory, ITEMS, this.selectedItem, (id) => {
      if (this.busy || this.cinematic || this.ui.dialogueActive) return;
      this.selectItem(id);
    }, this.state.counts || {});
  }

  refreshQuests() {
    if (!this.stage) return;
    this.ui.renderQuests(this.stage.questTitle, this.stage.quests());
  }

  say(lines) { return this.ui.say(lines); }

  // =========================================================
  // セーブ／ロード
  // =========================================================
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) { /* ignore */ }
  }

  loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.flags) return s;
    } catch (e) { /* ignore */ }
    return null;
  }

  hasSave() {
    const s = this.loadSave();
    return !!(s && s.flags && s.flags.introDone);
  }

  /** 進行をリセット（クリア済みの記録は残す） */
  resetState(stage = 'station') {
    const cleared = this.loadSave()?.cleared || this.state.cleared || [];
    this.state = this._freshState(stage);
    this.state.cleared = cleared;
    this.save();
  }

  /** 次のステージへ（ページを読み直して箱庭を作りなおす） */
  goToStage(stage, { autostart = true } = {}) {
    const cleared = [...new Set([...(this.state.cleared || []), ...(this.loadSave()?.cleared || [])])];
    this.state = this._freshState(stage);
    this.state.cleared = cleared;
    this.save();
    try { if (autostart) sessionStorage.setItem('hoshimawari-autostart', stage); } catch (e) { /* ignore */ }
    location.reload();
  }

  // =========================================================
  // ヒント
  // =========================================================
  async hint() {
    if (!this.stage || this.busy || this.cinematic || this.ui.dialogueActive || this.ui.panelOpen) return;
    const h = this.stage.hint();
    if (!h) return;
    if (h.key !== this.hintKey) { this.hintKey = h.key; this.hintLevel = 0; }
    const text = h.lines[Math.min(this.hintLevel, h.lines.length - 1)];
    this.hintLevel++;
    this.state.hints++;
    this.busy = true;
    await this.say([{ who: 'hint', text }]);
    this.busy = false;
  }

  // =========================================================
  // ステージとメインループ
  // =========================================================
  async loadStage(StageClass) {
    this.stage = new StageClass(this);
    await this.stage.build();
    this.controls.interior = (p) => (this.stage.interiorAt ? this.stage.interiorAt(p) : null);
    this.buildPickList();
    this.stage.applyState(true);
  }

  start() {
    this.renderer.setAnimationLoop(() => this._frame());
  }

  /** 重い端末では解像度を自動で下げる */
  _adapt(raw) {
    if (this._adapted) return;
    this._perf = this._perf || { t: 0, n: 0 };
    const p = this._perf;
    if (this.time < 2) return; // 起動直後は無視
    p.t += raw; p.n++;
    if (p.t > 3) {
      const fps = p.n / p.t;
      this._adapted = true;
      if (fps < 28 && this.renderer.getPixelRatio() > 1) {
        this.renderer.setPixelRatio(1);
        this.composer.setPixelRatio(1);
        this._resize();
      }
    }
  }

  _frame() {
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.1) * this.timeScale;
    this.time += dt;
    this._adapt(raw);
    if (this.playing && !this.cinematic) this.state.elapsed += dt;
    this.tweens.update(dt);
    if (this.stage) this.stage.update(dt, this.time);
    this.controls.enabled = !this.cinematic;
    this.controls.update(dt, { cinematic: this.cinematic });

    // ホバー判定（マウス時のみ・間引いて実行）
    this._hoverCool = (this._hoverCool || 0) - raw;
    if (this._needHover && this._lastMove && this._hoverCool <= 0) {
      this._hoverCool = 0.06;
      this._needHover = false;
      const blocked = this.busy || this.cinematic || this.ui.dialogueActive || this.ui.panelOpen || !this.playing;
      const id = blocked ? null : this._pick(this._lastMove);
      const it = id && this.interactables.get(id);
      if (it && it.enabled !== false) {
        this._setHover(id);
        const n = typeof it.name === 'function' ? it.name() : it.name;
        this.ui.showTooltip(this.selectedItem ? `${ITEMS[this.selectedItem].name} → ${n}` : n, this._lastMove.clientX, this._lastMove.clientY);
      } else {
        this._setHover(null);
        this.ui.hideTooltip();
      }
    }

    this.grade.uniforms.time.value = this.time % 100;
    this.composer.render();
  }
}
