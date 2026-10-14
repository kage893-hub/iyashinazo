import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
    // スマホ・タブレット（指で操作する端末）は、はじめから少し軽めの設定にする
    this.mobile = matchMedia('(pointer: coarse)').matches;
    // 画面への描きこみはポストプロセス側の MSAA で行うので、キャンバス自体のアンチエイリアスは不要
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(this.low ? 1 : Math.min(window.devicePixelRatio, this.mobile ? 1.75 : 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 600);
    this.camera.position.set(14, 22, 34);

    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 7;
    c.maxDistance = 64;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 1.28;
    c.rotateSpeed = this.mobile ? 0.75 : 0.6;
    c.zoomSpeed = 0.9;
    // ホイール／ピンチは、指している場所に向かって寄る
    c.zoomToCursor = true;
    c.panSpeed = 0.8;
    c.screenSpacePanning = false;
    c.target.set(0, 1, 0);
    this.bounds = { minX: -14, maxX: 14, minZ: -10, maxZ: 10 };

    // ポストプロセス（MSAA 付きのレンダーターゲット）
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.low ? 0 : this.mobile ? 2 : 4 });
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
    this._keys = new Set();
    const camKeys = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', '+', '-', ';', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      const k = e.key.toLowerCase();
      if (camKeys.has(k)) { this._keys.add(k); if (k.startsWith('arrow')) e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this._keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this._keys.clear());
    dom.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.selectedItem) this.selectItem(null);
    });
  }

  _pick(e) {
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
      return id || null; // 最初に当たった不透明物で判定（壁越しクリック防止）
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
    if (!this.playing || this.busy || this.cinematic || this.ui.panelOpen) return;
    const id = this._pick(e);
    if (!id) {
      if (this.selectedItem) this.selectItem(null);
      else this._tapFocus(e);
      return;
    }
    this._lastTap = null;
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
  focusOn(target, { dist, duration = 1.0, polar, theta, thetaClamp, subject } = {}) {
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
    let toTh = theta ?? (thetaClamp ? clamp(fromTh, -thetaClamp, thetaClamp) : fromTh);
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

  // ---------------- カメラの補助操作（ボタン・キー・ダブルタップ） ----------------
  _camFree() { return this.playing && !this.cinematic && !this.busy && !this.ui.panelOpen; }

  /** 注視点のまわりを 45° ずつ回る */
  camRotate(dir) {
    if (!this._camFree()) return;
    const c = this.controls;
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(c.target));
    // 続けて押したときは、前の回転の行き先から足していく
    const now = performance.now();
    const base = this._rotGoal && now - this._rotGoal.t < 450 ? this._rotGoal.th : sph.theta;
    const th = base + dir * Math.PI / 4;
    this._rotGoal = { th, t: now };
    this.focusOn(c.target.clone(), { theta: th, duration: 0.45 });
  }

  /** 寄る／引く */
  camZoom(f) {
    if (!this._camFree()) return;
    const c = this.controls;
    const d = this.camera.position.distanceTo(c.target);
    this.focusOn(c.target.clone(), { dist: clamp(d * f, c.minDistance, c.maxDistance), duration: 0.35 });
  }

  /** 箱庭全体が見える位置へ */
  cameraHome() {
    if (this.cinematic) return;
    const portrait = innerWidth < innerHeight;
    return this.moveCamera(portrait ? new THREE.Vector3(10, 37, 29) : new THREE.Vector3(12, 20, 32), new THREE.Vector3(0, 0.5, 0), 1.0);
  }

  /** 画面上の点が指す地面（または物）の位置 */
  _groundPoint(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.camera);
    const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const hit = ray.intersectObjects(this.scene.children, true).find((h) => h.object.isMesh && !h.object.userData.noPick && !(h.object.userData.roof && this.stage?.roofLifted) && vis(h.object) && h.distance < 200);
    const p = hit ? hit.point.clone() : ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!p) return null;
    const b = this.bounds;
    return new THREE.Vector3(clamp(p.x, b.minX, b.maxX), clamp(p.y, 0, 4), clamp(p.z, b.minZ, b.maxZ));
  }

  /** 何もない所をダブルクリック／ダブルタップ → そこを中心に */
  _tapFocus(e) {
    const now = performance.now();
    const last = this._lastTap;
    this._lastTap = { t: now, x: e.clientX, y: e.clientY };
    if (!last || now - last.t > 420 || Math.hypot(e.clientX - last.x, e.clientY - last.y) > 40) return;
    this._lastTap = null;
    const p = this._groundPoint(e);
    if (!p) return;
    const d = this.camera.position.distanceTo(this.controls.target);
    this.focusOn(p, { dist: Math.min(d, 20), duration: 0.6 });
  }

  /** キーボードでの移動（WASD／矢印・Q/E で回転・R/F か +/- で寄り引き） */
  _keyCamera(dt) {
    const k = this._keys;
    if (!k || !k.size || !this._camFree()) return;
    const c = this.controls, cam = this.camera;
    const off = cam.position.clone().sub(c.target);
    const dist = off.length();
    const fwd = new THREE.Vector3(-off.x, 0, -off.z).normalize();
    const right = new THREE.Vector3(fwd.z * -1, 0, fwd.x);
    const mv = new THREE.Vector3();
    if (k.has('w') || k.has('arrowup')) mv.add(fwd);
    if (k.has('s') || k.has('arrowdown')) mv.sub(fwd);
    if (k.has('d') || k.has('arrowright')) mv.add(right);
    if (k.has('a') || k.has('arrowleft')) mv.sub(right);
    if (mv.lengthSq()) {
      mv.normalize().multiplyScalar(dist * 0.55 * dt);
      c.target.add(mv);
      cam.position.add(mv);
    }
    const rot = (k.has('q') ? 1 : 0) - (k.has('e') ? 1 : 0);
    if (rot) {
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot * 1.4 * dt);
      cam.position.copy(c.target).add(off);
    }
    const zoom = (k.has('f') || k.has('-') ? 1 : 0) - (k.has('r') || k.has('+') || k.has(';') ? 1 : 0);
    if (zoom) {
      const nd = clamp(dist * (1 + zoom * 1.2 * dt), c.minDistance, c.maxDistance);
      cam.position.copy(c.target).add(off.setLength(nd));
    }
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
      this.ui.setUseBanner(null);
      this.refreshInventory();
      this.ui.toast(`<b>${ITEMS[id].name}</b>：${ITEMS[id].desc}`, 3200);
      return;
    }
    this.selectedItem = id;
    if (id) this.audio.play('select');
    this.ui.setUseBanner(id ? ITEMS[id] : null, () => this.selectItem(null));
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

  /** 旅のメモ帳に手がかりを書きとめる（同じものは一度だけ） */
  note(id, title, html) {
    const notes = (this.state.notes = this.state.notes || []);
    if (notes.some((n) => n.id === id)) return;
    notes.push({ id, stage: this.state.stage, title, html });
    this.save();
    this.ui.toast(`📖 旅のメモに書きとめた：<b>${title}</b>`, 2600);
    document.querySelector('#btn-notes')?.classList.add('new');
  }

  /** 調べられる場所の名前を、しばらく画面に出す（✨ボタン） */
  showLabels(sec = 4) {
    this._clearLabels();
    const box = new THREE.Box3();
    for (const [id, it] of this.interactables) {
      if (it.enabled === false || !it.object.visible) continue;
      let vis = true;
      for (let p = it.object.parent; p; p = p.parent) if (!p.visible) { vis = false; break; }
      if (!vis) continue;
      box.setFromObject(it.object);
      if (box.isEmpty()) continue;
      const c = box.getCenter(new THREE.Vector3());
      const name = typeof it.name === 'function' ? it.name() : it.name;
      if (!name) continue;
      const label = document.createElement('div');
      label.className = 'hs-label';
      label.textContent = name;
      document.body.appendChild(label);
      this._labels.push({ el: label, id, c, top: new THREE.Vector3(c.x, box.max.y + 0.15, c.z), seen: false });
    }
    this._labelsT = sec;
    this._labelsCheck = 0;
  }

  _clearLabels() {
    (this._labels || []).forEach((l) => l.el.remove());
    this._labels = [];
    this._labelsT = 0;
  }

  _updateLabels(raw) {
    if (!this._labels?.length) return;
    this._labelsT -= raw;
    if (this._labelsT <= 0 || this.cinematic) { this._clearLabels(); return; }
    this._labelsCheck -= raw;
    const check = this._labelsCheck <= 0;
    if (check) this._labelsCheck = 0.4;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const toScreen = (v) => {
      const p = v.clone().project(this.camera);
      return { x: rect.left + (p.x + 1) / 2 * rect.width, y: rect.top + (1 - p.y) / 2 * rect.height, ok: p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 };
    };
    for (const l of this._labels) {
      const t = toScreen(l.top);
      if (check) {
        // 手前の物にかくれていないか（中心か上端が見えていればOK）
        const c = toScreen(l.c);
        l.seen = t.ok && (this._pick({ clientX: c.x, clientY: c.y }) === l.id || this._pick({ clientX: t.x, clientY: t.y + 4 }) === l.id);
      }
      l.el.style.transform = `translate(${t.x}px, ${t.y}px) translate(-50%, -100%)`;
      l.el.classList.toggle('show', l.seen && this._labelsT > 0.4);
    }
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
  /** 読み込み画面の進み具合（p: 0〜1）。画面を描きかえる時間をつくる */
  async loadingStep(p, text) {
    const bar = document.querySelector('#loading .ld-bar i');
    if (bar) bar.style.width = `${Math.round(p * 100)}%`;
    const t = document.querySelector('#loading p');
    if (t && text) t.textContent = text;
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  }

  async loadStage(StageClass) {
    this.bounds = { minX: -14, maxX: 14, minZ: -10, maxZ: 10 };
    this.stage = new StageClass(this);
    await this.loadingStep(0.1, '箱庭を組み立てています…');
    await this.stage.build();
    this.buildPickList();
    this.stage.applyState(true);
    // 最初の表示で固まらないよう、シェーダーを先に用意しておく
    await this.loadingStep(0.85, 'もうすぐ出発します…');
    try {
      if (this.renderer.extensions.has('KHR_parallel_shader_compile')) await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
    } catch (e) { /* 描画時にコンパイルされる */ }
    await this.loadingStep(1);
  }

  start() {
    this.renderer.setAnimationLoop(() => this._frame());
  }

  /** 重い端末では解像度を自動で下げる */
  _adapt(raw) {
    if (this._adaptStep >= 2) return;
    this._perf = this._perf || { t: 0, n: 0 };
    const p = this._perf;
    if (this.time < 2 || this.timeScale !== 1) return; // 起動直後・早送りテスト中は無視
    if (raw > 0.5 || document.hidden) return; // タブ切りかえなどの止まりは数えない
    p.t += raw; p.n++;
    if (p.t < 3) return;
    const fps = p.n / p.t;
    p.t = 0; p.n = 0;
    this._adaptStep = (this._adaptStep || 0) + 1;
    if (fps >= 28) { this._adaptStep = 2; return; }
    if (this._adaptStep === 1 && this.renderer.getPixelRatio() > 1) {
      // 1段目：解像度を下げる
      this.renderer.setPixelRatio(1);
      this.composer.setPixelRatio(1);
      this._resize();
    } else {
      // 2段目：影の解像度を下げて、光のにじみ（ブルーム）を切る
      this._adaptStep = 2;
      this.scene.traverse((o) => {
        if (o.isLight && o.castShadow && o.shadow.mapSize.x > 1024) {
          o.shadow.mapSize.set(1024, 1024);
          if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
        }
      });
      this.bloom.enabled = false;
    }
  }

  /** 影の解像度（端末に合わせる） */
  shadowSize() {
    if (this.low) return 1024;
    return !this.mobile && window.innerWidth > 900 ? 4096 : 2048;
  }

  _frame() {
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.1) * this.timeScale;
    this.time += dt;
    this._adapt(raw);
    this._updateLabels(raw);
    if (this.playing && !this.cinematic) this.state.elapsed += dt;
    this.tweens.update(dt);
    if (this.stage) this.stage.update(dt, this.time);

    this._keyCamera(Math.min(raw, 0.1));
    // パンの範囲制限
    const t = this.controls.target;
    const b = this.bounds;
    if (!this.cinematic) {
      const cx = clamp(t.x, b.minX, b.maxX), cz = clamp(t.z, b.minZ, b.maxZ), cy = clamp(t.y, 0, 4);
      if (cx !== t.x || cz !== t.z || cy !== t.y) {
        const d = new THREE.Vector3(cx - t.x, cy - t.y, cz - t.z);
        t.add(d);
        this.camera.position.add(d);
      }
    }
    // 建物の中を見ているときは、低い角度まで下げられないようにして上から見下ろす
    const inside = !this.cinematic && this.stage?.interiorAt?.(t);
    const camDist = this.camera.position.distanceTo(t);
    const maxPolar = inside && camDist < (inside.maxDist ?? 26) ? inside.polar : 1.28;
    this.controls.maxPolarAngle += (maxPolar - this.controls.maxPolarAngle) * Math.min(1, dt * 3);
    this.controls.enabled = !this.cinematic;
    this.controls.update();

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
    // 影は止まっている物がほとんどなので、ふだんは1フレームおきに更新（演出中は毎フレーム）
    const sm = this.renderer.shadowMap;
    sm.autoUpdate = false;
    this._frameNo = (this._frameNo || 0) + 1;
    if (this.cinematic || this._frameNo % 2 === 0) sm.needsUpdate = true;
    this.composer.render();
  }
}
