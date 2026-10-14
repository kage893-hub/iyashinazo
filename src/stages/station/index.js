import * as THREE from 'three';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, makeFireflies, Puffs, Leaves, Butterflies, Birds } from '../../lib/environment.js';
import { makeCat, makeOwl, makeFrog, makeRabbit, makeCrow, makeMouse } from '../../lib/creatures.js';
import { add, mat, glow, G, group, lerp, damp, softCircleTexture } from '../../lib/util.js';
import { Ease } from '../../core/tween.js';
import { el } from '../../core/ui.js';
import { buildStationDiorama } from './diorama.js';
import { Motes } from '../../lib/livefx.js';
import { mergeStatic } from '../../lib/merge.js';
import { Train, makeTrainPath, buildTracks } from './train.js';
import { timetableHTML, stationSignHTML, clockPanel, lockPanel, leverPanel } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  cat: { name: 'ネコの駅長', icon: '🐱', color: '#d9813a', voice: 720 },
  owl: { name: 'フクロウの切符係', icon: '🦉', color: '#8b6646', voice: 360 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  rabbit: { name: 'ウサギの旅人', icon: '🐰', color: '#d46a8a', voice: 950 },
  crow: { name: 'カラス', icon: '🐦', color: '#3a3c52', voice: 320 },
  mouse: { name: 'ネズミの子', icon: '🐭', color: '#8a7a8a', voice: 1500 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

const MOUSE_SPOTS = {
  luggage: { name: '荷物の山', color: '#d64a4a', home: new V(4.0, 0, 7.95) },
  tree: { name: '大きな木', color: '#3a7ee8', home: new V(5.25, 0, 7.85) },
  mailbox: { name: '丸ポスト', color: '#f2c33a', home: new V(5.5, 0, 7.2) },
};

/**
 * ステージ 1：はざま駅
 * 目的：ほしまわり号を発車させ、天空の街へ向かう
 */
export class StationStage {
  constructor(game) {
    this.g = game;
    this.id = 'station';
    this.title = 'はざま駅';
    this.questTitle = '🚂 ほしまわり号の発車準備';
    this.hasRoof = true;
    this.night = 0;
    this.nightTarget = 0;
    this.roofT = 0;
    this.manualRoof = false;
    this.smokeT = 0;
    this.departing = false;
    this.trainSpeed = 0;
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g;
    const scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);

    // 空と光
    this.sky = makeSky();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#f2b9a0', 70, 230);
    this.hemi = new THREE.HemisphereLight('#d8c8ff', '#7a5a40', 1.1);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffd2a0', 2.4));
    sun.position.set(-16, 22, 14);
    sun.castShadow = true;
    const sm = this.g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -19; sc.right = 19; sc.top = 16; sc.bottom = -16; sc.near = 5; sc.far = 70;
    // 影のしましま（シャドウアクネ）が出ないよう、少し大きめにずらす
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun);
    scene.add(sun.target);

    // 浮島
    const island = (this.island = makeIslandBase({ w: 30, d: 22, seed: 3 }));
    scene.add(island);
    this.clouds = makeClouds();
    scene.add(this.clouds);
    this.far = group(scene);
    const smalls = [
      [-55, 2, -40, 4, 1], [48, -4, 35, 3, 2], [-70, 10, 25, 5, 3], [30, 8, -70, 3.5, 4], [-25, -8, 60, 4, 5], [75, 2, -10, 3, 6],
    ];
    this.smallIslands = smalls.map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      this.far.add(si);
      return { o: si, y, ph: seed };
    });
    this._buildSkyCity(scene);

    // 線路・列車
    this.path = makeTrainPath();
    this.tracks = buildTracks(scene, this.path);
    this.train = new Train(scene, this.path);

    // 駅の箱庭
    await this.g.loadingStep(0.3, '町並みを組み立てています…');
    const R = (this.R = buildStationDiorama(scene));
    R.lampGlass = R.lampGlass.map((e) => (e.isMaterial ? { material: e, base: e.emissiveIntensity } : e));
    R.lights.forEach((L) => { L.userData.base = L.intensity; });

    // パーティクル
    this.smoke = new Puffs(scene, { count: 70, color: '#f4f0f8', opacity: 0.75 });
    this.steam = new Puffs(scene, { count: 30, color: '#ffffff', opacity: 0.5 });
    this.splash = new Puffs(scene, { count: 24, color: '#bfe8ff', opacity: 0.8 });
    this.fireflies = makeFireflies(80, { x: 27, z: 19, y0: 0.4, y1: 4 });
    scene.add(this.fireflies);
    // 夕日の中をただよう光のほこり
    this.motes = new Motes(scene, { count: 70, color: '#ffe2b0', size: 0.07, area: { x: 26, z: 18, y0: 0.4, y1: 5 }, kind: 'dust', opacity: 0.55 });
    this.leaves = new Leaves(scene, { center: new V(12.4, 0, 7.6), radius: 2.6, top: 5.5 });
    this.sparkles = this._makeSparkles(scene);
    this.butterflies = new Butterflies(scene, [new V(-7, 0.3, 5.6), new V(7.0, 0.2, 8.6), new V(-12.6, 0.2, 1.8), new V(2.6, 0.9, -1.6)]);
    this.birds = new Birds(scene, 5);

    // 住人たち
    await this.g.loadingStep(0.6, '住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();

    this.g.ui.onLine = (who) => {
      const c = this.speakerCreature(who);
      if (c) c.talk(2.2);
    };
  }

  /** 静的なメッシュを結合して描画を軽くする */
  _optimize() {
    if (new URLSearchParams(location.search).has('nomerge')) return; // 調査用
    const creatureRoots = new Set(this.creatures.map((c) => c.root));
    const roots = [this.island, this.tracks, this.R.root, this.city, ...this.smallIslands.map((s) => s.o)];
    for (const [, it] of this.g.interactables) if (!creatureRoots.has(it.object)) roots.push(it.object);
    // 生き物は動く部位（グループ）ごとにまとめる
    for (const c of this.creatures) {
      c.root.traverse((o) => { if (o !== c.root && !o.isMesh) o.userData.dynamic = true; });
    }
    if (this.owl.lids) this.owl.lids.forEach((l) => { l.userData.keep = true; });
    this.g.scene.traverse((o) => { if (o.userData.dynamic) roots.push(o); });
    for (const c of this.creatures) roots.push(c.root);
    let n = 0;
    for (const r of roots) n += mergeStatic(r);
    this.g.refreshInteractableMeshes();
    console.info(`[optimize] merged ${n} meshes`);
  }

  _buildSkyCity(scene) {
    // レールの先に見える「天空の街」
    const city = group(scene, 108, 36, -86);
    const isl = makeSmallIsland(42, 9);
    city.add(isl);
    const wallM = mat('#e9e2f2');
    const roofM = mat('#5a7ac8');
    const winM = glow('#ffe7a0', 2.0);
    winM.userData.lamp = true;
    this.cityWin = winM;
    const towers = [[0, 0, 1.6, 9], [-4, 2, 1.2, 6], [4, -1, 1.1, 7], [-2, -4, 1.0, 5], [3, 4, 0.9, 4.5], [-6, -2, 0.8, 4]];
    for (const [x, z, r, h] of towers) {
      add(city, G.cyl(r, r * 1.1, h, 10), wallM, x, h / 2 + 1, z, { cast: false, receive: false });
      add(city, G.cone(r * 1.35, r * 2.2, 10), roofM, x, h + 1 + r * 1.1, z, { cast: false, receive: false });
      for (let k = 0; k < 3; k++) add(city, G.box(r * 0.4, r * 0.5, 0.05), winM, x, 2 + k * (h / 3.5), z + r * 1.02, { cast: false, receive: false });
    }
    // 風車
    this.windmill = group(city, 6, 6, 2);
    this.windmill.userData.dynamic = true;
    for (let i = 0; i < 4; i++) add(this.windmill, G.box(0.5, 4, 0.1), mat('#f4ead2'), 0, 0, 0, { rot: [0, 0, (i * Math.PI) / 2], cast: false }).geometry.translate(0, 0, 0);
    city.traverse((o) => { o.userData.noPick = true; });
    this.city = city;
  }

  _makeSparkles(scene) {
    const tex = softCircleTexture();
    const list = [];
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffe9a0', transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending }));
      s.visible = false;
      s.renderOrder = 999;
      s.userData.noPick = true;
      scene.add(s);
      list.push(s);
    }
    return list;
  }

  _placeCreatures(scene) {
    const F = 0.75;
    this.cat = makeCat();
    this.cat.root.position.set(-1.7, F, -2.55);
    this.cat.root.rotation.y = 0.15;
    this.frog = makeFrog();
    this.frog.root.position.set(4.25, F, -2.75);
    this.frog.root.rotation.y = -0.25;
    this.owl = makeOwl();
    this.owl.root.position.set(-9.7, F + 0.75, 0.35);
    this.rabbit = makeRabbit();
    this.rabbit.root.position.set(-4.65, F + 0.47, 1.85);
    this.crow = makeCrow();
    this.crow.root.position.copy(this.R.crowSpot).add(new V(0, 0.12, 0));
    this.crow.root.scale.setScalar(1.25);
    this.crow.root.rotation.y = -0.6;
    this.mouseLeader = makeMouse('#4ab06a', true);
    this.mouseLeader.root.position.set(3.9, 0, 7.3);
    this.mouseLeader.root.rotation.y = 0.35;
    this.mice = {};
    for (const [k, s] of Object.entries(MOUSE_SPOTS)) {
      const m = makeMouse(s.color);
      m.root.visible = false;
      this.mice[k] = m;
      scene.add(m.root);
    }
    this.creatures = [this.cat, this.frog, this.owl, this.rabbit, this.crow, this.mouseLeader, ...Object.values(this.mice)];
    for (const c of [this.cat, this.frog, this.owl, this.rabbit, this.crow, this.mouseLeader]) scene.add(c.root);
    // ねむりの Zzz
    this.zzz = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement('canvas'); c.width = c.height = 64;
          const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.font = '900 48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.strokeStyle = '#3a4a7a'; x.lineWidth = 6; x.strokeText('Z', 32, 34); x.fillText('Z', 32, 34);
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        })(),
        transparent: true, depthWrite: false,
      }));
      s.userData.noPick = true;
      s.scale.setScalar(0.25);
      scene.add(s);
      this.zzz.push(s);
    }
  }

  /** 駅舎の中を見ているときは、真上寄りから見下ろす（壁で隠れないように） */
  interiorAt(p) {
    if (p.x > -11.4 && p.x < -2.6 && p.z > -1.6 && p.z < 4.4) return { polar: 0.5, maxDist: 26 };
    return null;
  }

  speakerCreature(who) {
    if (who === 'mouse') return this.mouseLeader;
    return this[who] && this[who].talk ? this[who] : null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('cat', this.cat.root, 'ネコの駅長', () => this.talkCat());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    reg('owl', this.owl.root, 'フクロウの切符係', () => this.talkOwl());
    reg('rabbit', this.rabbit.root, 'ウサギの旅人', () => this.talkRabbit());
    reg('crow', this.crow.root, 'カラス', () => this.talkCrow());
    reg('mouse', this.mouseLeader.root, 'ネズミの子', () => this.talkMouse());
    for (const k of Object.keys(this.mice)) reg(`m_${k}`, this.mice[k].root, 'ネズミ', () => this.talkFoundMouse());
    reg('bell', R.bell, '呼び鈴', () => this.ringBell());
    reg('clock', R.clock, '壁掛け時計', () => this.clickClock());
    reg('timetable', R.timetable, '時刻表', () => this.showTimetable());
    reg('plant', R.plant, '鉢植え', () => this.clickPlant());
    reg('stove', R.stove, 'ストーブ', () => this.clickStove());
    reg('luggage', R.luggage, '荷物の山', () => this.findMouse('luggage'));
    reg('tree', R.bigTree, '大きな木', () => this.findMouse('tree'));
    reg('mailbox', R.mailbox, '丸ポスト', () => this.findMouse('mailbox'));
    reg('well', R.well, '井戸', () => this.clickWell());
    reg('shed', R.shed, '倉庫', () => this.clickShed());
    reg('tower', R.waterTower, '給水塔', () => this.clickTower());
    reg('signalBox', R.signalBox, '信号所', () => this.clickSignalBox());
    reg('signal', R.signal, '信号機', () => this.clickSignal());
    reg('windows', R.roundWindows, '三つの丸窓', () => (this.g.note('st-windows', '三つの丸窓', '駅舎の正面、屋根の下の丸窓は、左から <b>黄・青・赤</b>。'), this.say([
      '駅舎の正面、屋根の下にならぶ三つの丸窓。',
      '左から【黄色】、【青】、【赤】のステンドグラスがはまっている。',
    ])));
    reg('sign', R.stationSign, '駅名標', () => this.showSign());
    reg('loco', this.train.loco.g, '機関車', () => this.clickLoco());
    reg('tender', this.train.tender.g, '炭水車', () => this.say(this.g.flags.water
      ? ['炭水車。石炭と、たっぷりの水が積まれている。']
      : ['炭水車。石炭は山盛りだが、水のタンクは空っぽだ。']));
    reg('coach', this.train.coach.g, '客車', () => this.say([
      '客車「ほしまわり号」。窓から暖かい光がもれている。',
      '行先板には【天空の街ゆき】と書かれている。',
    ]));
    reg('suitcase', R.suitcase, 'トランク', () => this.say(['ウサギの旅人のトランク。たくさんのステッカーが貼られている。']));
    reg('pond', R.pond, '池', () => this.say(['小さな池。スイレンの葉がぷかぷか浮かんでいる。', 'カエルの機関士のふるさとだろうか。']));
    reg('stump', R.stump, '切り株の家', () => this.talkMouse());
    reg('roof', R.roof, '駅舎（クリックで中をのぞく）', async () => {
      await this.g.focusOn(new V(-7, 1.4, 1.2), { dist: 19, duration: 1.0 });
    });
    reg('bench', R.platformBench, 'ベンチ', () => this.say(['ホームのベンチ。列車を待つあいだ、ひと休みできそうだ。']));
  }

  // =========================================================
  // 状態の反映（ロード時など）
  // =========================================================
  applyState(instant) {
    const f = this.g.flags, R = this.R;
    R.marble.visible = !f.marbleTaken;
    this.crow.key.visible = !f.crowTraded;
    if (f.clockWound) this.pendulumOn = true;
    this.owl.setSleeping(!f.owlAwake);
    if (f.owlAwake) {
      this.night = this.nightTarget = 1;
      this._setHands(8);
    } else {
      this._setHands(12);
    }
    this.rabbit.sad = !f.broochGiven;
    R.broochInBucket.visible = false;
    if (f.shedOpen) this._shedOpenVisual(true);
    R.tongs.visible = !f.tongsTaken;
    R.fireStoneInStove.visible = !f.stoneTaken;
    R.stoveGlowMat.emissiveIntensity = f.stoneTaken ? 0.5 : 2.2;
    R.stoveLight.intensity = f.stoneTaken ? 0.6 : 2.5;
    this._setFire(!!f.fire);
    for (const k of Object.keys(this.mice)) {
      if (f[`mouse_${k}`]) this._mouseAtHome(k);
    }
    R.handleTrophy.visible = !f.handleGiven;
    if (f.water) {
      R.valveWheel.visible = true;
      R.spout.rotation.x = -0.95;
      this.train.tender.waterSurface.visible = true;
    }
    if (f.signalBoxOpen) R.sigBoxDoor.rotation.y = -1.9;
    this._setSignal(f.signal ? 1 : 0);
    if (f.signal) R.levers.forEach((l) => { l.rotation.x = 0.45; });
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.butterflies.update(dt, t, this.night);
    this.birds.update(dt, t);

    // 夜の移り変わり
    this.night = damp(this.night, this.nightTarget, 0.8, dt);
    this._applyNight(this.night);
    g.audio.night = this.night;
    this.sky.uniforms.time.value = t;
    this.fireflies.material.uniforms.time.value = t;
    this.motes.update(dt, t);
    this.clouds.rotation.y = t * 0.004;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    this.city.position.y = 36 + Math.sin(t * 0.25) * 0.8;
    this.windmill.rotation.z = t * 0.6;

    // 屋根（近づくと自動で外れる）
    const tgt = g.controls.target;
    const camDist = g.camera.position.distanceTo(tgt);
    const near = Math.hypot(tgt.x + 7, tgt.z - 1.3) < 6.5 && camDist < 30;
    this.roofLifted = this.manualRoof || (near && !this.departing);
    this.roofT = damp(this.roofT, this.roofLifted ? 1 : 0, 5, dt);
    R.roof.position.y = this.roofT * 4.5;
    R.roof.position.x = -this.roofT * 0.0;
    for (const m of R.roofMats) {
      m.opacity = 1 - this.roofT * 0.9;
      m.depthWrite = this.roofT < 0.5;
    }
    R.roof.traverse((o) => { if (o.isMesh) o.castShadow = this.roofT < 0.3; });
    // 屋根を外して上からのぞいているときは、手前の梁（丸窓の帯）と中の梁を消す
    const look = g.camera.position.clone().sub(tgt);
    const topDown = this.roofT > 0.5 && look.y / look.length() > 0.62;
    R.frontCut.visible = !(topDown && g.camera.position.z > 1.3);
    R.innerBeam.visible = !topDown;
    R.stovePipeTop.visible = this.roofT < 0.3;
    R.vane.rotation.y = Math.sin(t * 0.4) * 0.6;

    // 振り子
    if (this.pendulumOn) R.pendulum.rotation.z = Math.sin(t * 3.2) * 0.22;

    // ストーブの炎のゆらぎ
    // ゆっくり揺らぐ炎（速い明滅はちらつきに見えるので避ける）
    const flick = 0.94 + Math.sin(t * 2.1) * 0.04 + Math.sin(t * 3.7) * 0.02;
    R.stoveLight.intensity = (this.g.flags.stoneTaken ? 0.6 : 2.5) * flick;

    // 寝ているフクロウの Zzz
    const sleeping = this.owl.sleeping;
    this.zzz.forEach((z, i) => {
      z.visible = sleeping && g.playing;
      const k = ((t * 0.45 + i / 3) % 1);
      z.position.set(-9.45 + k * 0.5, 2.75 + k * 0.9, 0.7 + Math.sin(k * 6) * 0.1);
      z.material.opacity = Math.sin(k * Math.PI);
      z.scale.setScalar(0.15 + k * 0.25);
    });

    // 煙と蒸気
    if (this.g.flags.fire || this.departing) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        const heavy = this.departing;
        this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.55;
        const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
        this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.4, 0), spread: 0.5, life: heavy ? 2.4 : 3.2, size0: 0.5, size1: heavy ? 3.2 : 2.4 });
      }
      if (Math.random() < dt * 0.6 && !this.departing) {
        const p = this.train.worldOf(this.train.loco, new V(1.9, 0.6, 0.8));
        this.steam.emit(p, { vel: new V(0, 0.6, 1.2), spread: 0.4, life: 1.2, size0: 0.2, size1: 1.0 });
      }
    }
    // 小さな家の煙突の湯気
    if (Math.random() < dt * 1.2) {
      this.steam.emit(new V(4.3, 1.05, 6.8), { vel: new V(0, 0.5, 0), spread: 0.1, life: 2, size0: 0.08, size1: 0.45 });
    }
    this.smoke.update(dt);
    this.steam.update(dt);
    this.splash.update(dt);
    this.leaves.update(dt, t);

    // 発車
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0 && this.train.s < 60) { this.chuffT = 0.5; g.audio.play('chuff'); }
      if (this.followTrain) {
        const lp = this.train.loco.g.position;
        const k = this.followK;
        g.controls.target.lerp(lp, 1 - Math.exp(-3 * dt));
        const want = lp.clone().add(new V(-14 - k * 10, 6 + k * 10, 18 + k * 8));
        g.camera.position.lerp(want, 1 - Math.exp(-1.2 * dt));
      }
    }

    // ヒントのきらめき
    for (const s of this.sparkles) {
      if (!s.visible) continue;
      s.userData.t += dt;
      const k = s.userData.t / 2.6;
      if (k >= 1) { s.visible = false; continue; }
      s.material.opacity = Math.sin(k * Math.PI) * (0.7 + 0.3 * Math.sin(t * 10));
      s.scale.setScalar(0.6 + Math.sin(t * 6 + s.userData.ph) * 0.15);
    }
  }

  _applyNight(k) {
    const R = this.R;
    this.sky.uniforms.night.value = k;
    this.sun.intensity = lerp(2.4, 0.55, k);
    this.sun.color.set('#ffd2a0').lerp(new THREE.Color('#9db4ff'), k);
    this.hemi.intensity = lerp(1.1, 0.5, k);
    this.hemi.color.set('#d8c8ff').lerp(new THREE.Color('#6a7ac0'), k);
    this.g.scene.fog.color.set('#f2b9a0').lerp(new THREE.Color('#262c5c'), k);
    for (const e of R.lampGlass) e.material.emissiveIntensity = e.base * lerp(1, 2.0, k);
    for (const L of R.lights) L.intensity = L.userData.base * lerp(0.6, 2.2, k);
    this.train.coach.winMat.emissiveIntensity = lerp(1.1, 2.2, k);
    this.fireflies.material.uniforms.intensity.value = lerp(0.3, 1.2, k);
    this.motes.mat.opacity = 0.55 * (1 - k);
    for (const p of R.nightPools) p.material.opacity = 0.12 + k * 0.5;
    const cm = this.clouds.userData.mat;
    cm.color.set('#fff4ee').lerp(new THREE.Color('#6a6f9a'), k);
    cm.emissive.set('#ffb8a0').lerp(new THREE.Color('#1c2050'), k);
    this.g.renderer.toneMappingExposure = lerp(1.05, 1.15, k);
  }

  // =========================================================
  // 目的・ヒント
  // =========================================================
  quests() {
    const f = this.g.flags;
    if (!f.introDone) return [{ text: 'ホームにいる駅長さんに話しかけよう', done: false }];
    const all = f.ticket && f.fire && f.water && f.signal;
    const q = [
      { text: '🎫 切符を手に入れる', done: !!f.ticket },
      { text: '🔥 機関車に火を入れる', done: !!f.fire },
      { text: '💧 機関車に水を入れる', done: !!f.water },
      { text: '🚦 出発信号を青にする', done: !!f.signal },
    ];
    if (all) q.push({ text: '🐱 駅長に出発を知らせる', done: !!f.departed });
    if (f.miceTalked && !f.handleGiven) q.push({ text: `🐭 かくれんぼ（${this.miceCount()}/3）`, done: this.miceCount() >= 3, sub: true });
    return q;
  }

  miceCount() {
    const f = this.g.flags;
    return ['luggage', 'tree', 'mailbox'].filter((k) => f[`mouse_${k}`]).length;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    if (!f.introDone) return H('intro', 'ホームに立っているネコの駅長に話しかけてみよう。駅舎の奥、列車のそばにいるよ。');
    if (f.ticket && f.fire && f.water && f.signal) return H('depart', '準備はすべて整った！ ネコの駅長に話しかけて、切符を見せよう。');
    const steps = [];
    // 火
    if (!f.fire) {
      if (!f.frogTalked) steps.push(H('frog', '機関車のそばにいるカエルの機関士に話を聞いてみよう。'));
      else if (has('fireStone')) steps.push(H('giveStone', '『ほのお石』をカエルの機関士に渡そう。'));
      else if (has('tongs')) steps.push(H('useTongs', '火ばさみなら熱いものもつかめる。', '持ち物の『火ばさみ』を選んで、待合室のストーブに使おう。'));
      else if (!f.shedOpen) steps.push(H('shed', '火ばさみは倉庫にありそうだ。倉庫の錠前の合言葉は「駅の顔の三つの丸窓」。', '駅舎の正面、屋根の下に丸窓が三つある。左から【黄・青・赤】だ。'));
      else steps.push(H('takeTongs', '開いた倉庫の中を調べてみよう。'));
    }
    // 水
    if (!f.water) {
      if (has('valveHandle')) steps.push(H('useHandle', '持ち物の『バルブハンドル』を選んで、給水塔に使おう。'));
      else if (!f.miceTalked) steps.push(H('mice', '給水塔のハンドルは誰かが持っていったらしい。島の手前にある「切り株の小さな家」を訪ねてみよう。'));
      else if (this.miceCount() < 3) steps.push(H('hide', 'ネズミたちのかくれ場所のヒントは「にもつの山」「大きな木のうろ」「赤くて手紙を食べるもの」。', '待合室の左手前にある荷物、右手前の大きな木、駅前の赤い丸ポストを調べよう。'));
      else steps.push(H('getHandle', 'かくれんぼは全員見つけた！ ネズミの子に話しかけよう。'));
    }
    // 切符
    if (!f.ticket) {
      if (!f.owlAwake) {
        if (!f.clockWound) {
          if (has('springKey')) steps.push(H('wind', '持ち物の『ゼンマイ鍵』を選んで、待合室の壁掛け時計に使おう。'));
          else if (has('marble')) steps.push(H('trade', '信号機の上のカラスは、透きとおった丸いものを欲しがっている。ビー玉を渡そう。'));
          else if (!f.crowTalked) steps.push(H('owl', '切符売り場のフクロウは昼間はぐっすり。「夜の鐘」で目を覚ますらしい。待合室の時計を調べてみよう。', '止まった時計を動かすには鍵がいる。信号機のてっぺんのカラスが何かくわえているぞ。'));
          else steps.push(H('marble', 'カラスは「透きとおって、まんまるで、光るもの」が欲しいらしい。', '駅舎の入口にある鉢植えを調べてみよう。'));
        } else {
          steps.push(H('clock', '時計をほしまわり号の発車時刻にあわせて鐘を鳴らそう。時刻表と、そこに貼られたメモがヒント。', 'かえるぬま行きは5時。その3時間あとだから……【8時】だ。'));
        }
      } else if (has('starCoin')) {
        steps.push(H('pay', '『星の硬貨』をフクロウの切符係に渡そう。'));
      } else if (has('brooch')) {
        steps.push(H('brooch', '『月のブローチ』を、待合室のウサギの旅人に返してあげよう。'));
      } else {
        steps.push(H('coin', '切符には『星の硬貨』が必要。旅人なら持っているかも。待合室のウサギに話を聞いてみよう。', 'ウサギはブローチを井戸に落としたらしい。駅前の井戸を調べよう。'));
      }
    }
    // 信号
    if (f.fire && f.water && !f.signal) {
      if (!f.signalKeyGiven) steps.push(H('report', '機関車の準備ができた！ ネコの駅長に報告しよう。'));
      else if (!f.signalBoxOpen) steps.push(H('sbox', '持ち物の『信号所の鍵』を選んで、ホームの右端にある信号所に使おう。'));
      else steps.push(H('levers', 'レバーは「出発の早い列車の順」。時刻表を思い出そう。ほしまわり号は8時。', '順番は【きりのもり → かえるぬま → てんくうのまち → つきのうら】。'));
    }
    return steps[0] || H('none', 'あちこち調べてみよう。');
  }

  /** 調べられる場所をきらめかせる */
  revealHotspots() {
    let i = 0;
    const box = new THREE.Box3();
    for (const [, it] of this.g.interactables) {
      if (it.enabled === false || !it.object.visible || i >= this.sparkles.length) continue;
      let vis = true;
      for (let p = it.object.parent; p; p = p.parent) if (!p.visible) vis = false;
      if (!vis) continue;
      box.setFromObject(it.object);
      const c = box.getCenter(new V());
      const s = this.sparkles[i++];
      s.position.set(c.x, Math.min(box.max.y + 0.2, c.y + 1.4), c.z);
      s.visible = true;
      s.userData.t = 0;
      s.userData.ph = Math.random() * 6;
    }
    this.g.audio.play('twinkle');
  }

  // =========================================================
  // 共通
  // =========================================================
  say(lines) { return this.g.say(lines); }

  focus(obj, dist, { inside = false } = {}) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    // 駅舎の中は、正面の梁ごしにのぞけるよう上から見下ろす
    const isInside = inside || (p.x > -11 && p.x < -3 && p.z > -1.4 && p.z < 4);
    const ty = isInside ? Math.min(2.2, Math.max(0.9, p.y)) : Math.max(0.8, p.y + 0.6);
    const polar = isInside ? Math.min(0.66, new THREE.Spherical().setFromVector3(this.g.camera.position.clone().sub(this.g.controls.target)).phi) : undefined;
    return this.g.focusOn(new V(p.x, ty, p.z + (isInside ? 0.6 : 0)), { dist: Math.min(cur, dist ?? 22), duration: 0.8, polar, thetaClamp: isInside ? 0.7 : undefined, subject: obj.isObject3D ? obj : undefined });
  }

  questDone(text) {
    this.g.audio.play('quest');
    this.g.ui.toast(`✓ ${text}`, 2600);
    this.g.refreshQuests();
    this.g.save();
  }

  // =========================================================
  // 住人との会話
  // =========================================================
  async talkCat() {
    const g = this.g, f = g.flags;
    this.focus(this.cat.root);
    g.audio.play('meow');
    if (!f.introDone) return this.catIntro();
    if (f.fire && f.water && f.signal) {
      if (g.has('ticket')) return this.departure();
      return this.say([{ who: 'cat', text: '出発の準備はすべて整いましたニャ！' }, { who: 'cat', text: 'あとはお客さまの切符だけですニャ。切符売り場のフクロウさんへどうぞ。' }]);
    }
    if (f.fire && f.water && !f.signalKeyGiven) {
      await this.say([
        { who: 'cat', text: 'おお……！ ボイラーに火が入って、水も満タン。機関車が目を覚ましましたニャ！' },
        { who: 'cat', text: 'お客さま、ありがとうございますニャ。それでは、これをお預けしますニャ。' },
      ]);
      g.note('st-signalKey', '信号所の鍵', '駅長からあずかった。信号所はホームの右のはしの小屋。');
      g.give('signalKey');
      g.flag('signalKeyGiven');
      await this.say([
        { who: 'cat', text: '『信号所の鍵』ですニャ。ホームの右のはしにある小屋ですニャ。' },
        { who: 'cat', text: 'レバーの倒し方は……たしか、小屋の中に書いてありましたニャ。' },
      ]);
      g.refreshQuests();
      return;
    }
    const lines = [];
    if (f.signalKeyGiven && !f.signal) {
      lines.push({ who: 'cat', text: '信号所のレバーは、出発の早い列車から順に倒すきまりですニャ。' });
      g.note('st-levers', '信号所のレバー', 'レバーは <b>出発の早い列車の順</b> に倒す。（時刻表を思い出そう）');
      lines.push({ who: 'cat', text: '時刻表は待合室の奥の壁にありますニャ。' });
    } else if (!f.fire || !f.water) {
      lines.push({ who: 'cat', text: '機関車のことは、カエルの機関士にきいてくださいニャ。' });
      if (!f.ticket) {
        lines.push({ who: 'cat', text: 'それと切符売り場のフクロウさんは……昼間はぐっすりなのですニャ。“夜の鐘”が鳴れば、起きるのですが……' });
        g.note('st-owl', 'フクロウの切符係', '昼間はぐっすり。<b>“夜の鐘”</b> が鳴れば起きるらしい。');
      }
    } else {
      lines.push({ who: 'cat', text: 'もうすぐ発車ですニャ。わくわくしますニャ。' });
    }
    await this.say(lines);
  }

  async catIntro() {
    const g = this.g;
    await this.say([
      { who: 'cat', text: 'おや……？ めずらしい。お客さまですニャ？' },
      { who: 'cat', text: 'ようこそ『はざま駅』へ。ここは、いくつもの世界のあいだにある小さな乗りかえ駅ですニャ。' },
      { who: 'cat', text: 'わたしは駅長のミケ。あちらの列車は異界特急『ほしまわり号』ですニャ。' },
      { who: 'cat', text: '次の行き先は【天空の街】……なのですが、困ったことに……' },
      { who: 'cat', text: 'ボイラーの火は消え、タンクの水は空っぽ。出発信号も赤のままなのですニャ。' },
      { who: 'cat', text: 'それにお客さま、切符をお持ちでないでしょう？' },
      { who: 'cat', text: 'どうか、出発の準備を手伝っていただけませんかニャ？ 支度が整ったら、わたしに声をかけてくださいニャ。' },
    ]);
    g.flag('introDone');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async talkFrog() {
    const g = this.g, f = g.flags;
    this.focus(this.frog.root);
    g.audio.play('ribbit');
    if (!f.frogTalked) {
      await this.say([
        { who: 'frog', text: 'ケロ？ お客さんケロ？ 見てのとおり、ボイラーの火が消えちまったケロ……' },
        { who: 'frog', text: '火を入れるには『ほのお石』がいるケロ。待合室のストーブで温めておいたはずケロ。' },
        { who: 'frog', text: 'でも、あれは熱くて素手じゃつかめないケロ。倉庫に火ばさみがあったと思うケロ。' },
        { who: 'frog', text: 'それから水ケロ！ 給水塔のバルブのハンドルが、いつのまにか無くなってるケロ。' },
        { who: 'frog', text: 'きっとネズミのチビたちのしわざケロ。あいつら、手前の切り株に住んでるケロ。' },
      ]);
      g.flag('frogTalked');
    }
    if (g.has('fireStone') && !f.fire) return this.lightFire();
    if (!f.frogTalked) return;
    if (f.fire && f.water) {
      return this.say([{ who: 'frog', text: '準備万端ケロ！ 駅長に知らせてくるといいケロ！' }]);
    }
    const lines = [];
    if (!f.fire) lines.push({ who: 'frog', text: g.has('tongs') ? 'その火ばさみで、ストーブの『ほのお石』をとってくるケロ！' : 'ほのお石はストーブの中ケロ。倉庫の火ばさみを使うケロ。' });
    if (!f.water) lines.push({ who: 'frog', text: g.has('valveHandle') ? 'ハンドルを給水塔のバルブにつけてほしいケロ！' : '給水塔のハンドル……ネズミのチビたちに返してもらうケロ。' });
    if (f.fire && !f.water) lines.unshift({ who: 'frog', text: 'ボイラーはごきげんケロ。あとは水ケロ！' });
    if (f.water && !f.fire) lines.unshift({ who: 'frog', text: '水はばっちりケロ。あとは火ケロ！' });
    await this.say(lines);
  }

  async lightFire() {
    const g = this.g;
    g.take('fireStone');
    await this.say([{ who: 'frog', text: 'ケロッ！ それは『ほのお石』ケロ！ ありがとケロ！' }]);
    this.frog.hop();
    g.audio.play('fire');
    this._setFire(true);
    g.flag('fire');
    await g.wait(0.6);
    g.audio.play('steam');
    await g.wait(0.8);
    await this.say([{ who: 'frog', text: 'ボイラーに火が入ったケロ！ シュッシュッ、いい音ケロ〜！' }]);
    this.questDone('機関車に火が入った！');
    await this.checkReady();
  }

  async checkReady() {
    const f = this.g.flags;
    if (f.fire && f.water) {
      await this.say([
        { who: 'frog', text: 'これで機関車はいつでも走れるケロ！' },
        { who: 'frog', text: 'あとは駅長に知らせて、信号を青にしてもらうケロ。' },
      ]);
    }
  }

  async talkOwl() {
    const g = this.g, f = g.flags;
    this.focus(this.owl.root, 18);
    if (!f.owlAwake) {
      return this.say([
        'フクロウの切符係は、ぐっすり眠っている。',
        { who: 'owl', text: 'Zzz……ほぅ……Zzz……' },
        f.bellRung ? '“夜の鐘”が鳴れば起きるらしいが……' : '（カウンターの呼び鈴を鳴らせば、起きるだろうか？）',
      ]);
    }
    g.audio.play('hoot');
    if (f.ticket) {
      return this.say([{ who: 'owl', text: 'よい旅をホー。天空の街は風がつよいから、帽子に気をつけるんだホー。' }]);
    }
    if (g.has('starCoin')) return this.buyTicket();
    await this.say([
      { who: 'owl', text: '天空の街ゆきの切符かね？ 『星の硬貨』1枚だホー。' },
      { who: 'owl', text: '星の硬貨は、旅をする者たちのお金だホー。旅のお方なら、だれか持っているかもしれんホー。' },
    ]);
    g.flag('owlAsked');
  }

  async buyTicket() {
    const g = this.g;
    await this.say([{ who: 'owl', text: 'おお、それは星の硬貨！ たしかにいただいたホー。' }]);
    g.take('starCoin');
    g.audio.play('click');
    await g.wait(0.3);
    g.audio.play('dial');
    await this.say([{ who: 'owl', text: 'パチン！ ……はい、天空の街ゆき、片道切符だホー。' }]);
    g.give('ticket');
    g.flag('ticket');
    this.questDone('切符を手に入れた！');
  }

  async ringBell() {
    const g = this.g, f = g.flags;
    g.audio.play('bell');
    this.R.bell.scale.set(1.15, 0.85, 1.15);
    g.tweens.add({ duration: 0.4, ease: Ease.backOut, onUpdate: (k) => this.R.bell.scale.set(1.15 - 0.15 * k, 0.85 + 0.15 * k, 1.15 - 0.15 * k) });
    if (f.owlAwake) return this.say([{ who: 'owl', text: 'はいはい、ちゃんと起きてるホー。' }]);
    await g.wait(0.4);
    this.owl.talk(1.5);
    await this.say([
      'チーン！',
      { who: 'owl', text: 'むにゃ……ほぅ……“夜の鐘”が鳴ったら……起きるホー……' },
      { who: 'owl', text: 'Zzz……' },
      '（“夜の鐘”……？ 待合室の時計と関係があるのだろうか）',
    ]);
    g.flag('bellRung');
  }

  async talkRabbit() {
    const g = this.g, f = g.flags;
    this.focus(this.rabbit.root, 18);
    if (f.broochGiven) {
      return this.say([
        { who: 'rabbit', text: 'ブローチ、本当にありがとう。わたしは9時の『つきのうら』ゆきを待っているの。' },
        { who: 'rabbit', text: 'あなたも、よい旅を。' },
      ]);
    }
    if (g.has('brooch')) return this.returnBrooch();
    await this.say([
      { who: 'rabbit', text: 'ぐすん……' },
      { who: 'rabbit', text: 'あっ……ごめんなさい。旅のかたね？' },
      { who: 'rabbit', text: 'わたし、大切な『月のブローチ』を落としてしまったの。' },
      { who: 'rabbit', text: '駅前の井戸をのぞきこんだとき……ぽちゃん、って……' },
    ]);
    g.flag('rabbitTalked');
  }

  async returnBrooch() {
    const g = this.g;
    await this.say([
      { who: 'rabbit', text: 'あっ……！ それ、わたしの『月のブローチ』！' },
      { who: 'rabbit', text: '井戸から拾ってきてくれたの？ ありがとう……！' },
    ]);
    g.take('brooch');
    this.rabbit.sad = false;
    this.rabbit.hop();
    g.audio.play('pop');
    await this.say([{ who: 'rabbit', text: 'お礼に、これを受けとって。わたしの故郷の『星の硬貨』よ。' }]);
    g.give('starCoin');
    g.flag('broochGiven');
    if (this.g.flags.owlAwake || this.g.flags.owlAsked) {
      await this.say(['（これで切符が買えそうだ）']);
    }
  }

  async talkCrow() {
    const g = this.g, f = g.flags;
    this.focus(this.crow.root, 22);
    g.audio.play('caw');
    if (f.crowTraded) {
      return this.say([{ who: 'crow', text: 'カァ！ このビー玉、夕日にすかすと最高だぜ。' }]);
    }
    if (g.has('marble')) return this.crowTrade();
    await this.say([
      { who: 'crow', text: 'カァ！ なんだお前、この鍵が気になるのか？' },
      { who: 'crow', text: 'こいつは『ゼンマイ鍵』。駅の時計のゼンマイを巻くための鍵らしいぜ。' },
      { who: 'crow', text: 'だが、おれはキラキラしたものが大好きでな。そうかんたんには渡せねえ。' },
      { who: 'crow', text: '透きとおってて、まんまるで、光るもの……それと交換なら考えてやる。カァ！' },
    ]);
    g.flag('crowTalked');
  }

  async crowTrade() {
    const g = this.g;
    await this.say([{ who: 'crow', text: 'カ、カァァ……！ なんて美しいビー玉だ！ 取り引き成立だぜ！' }]);
    g.take('marble');
    this.crow.hop();
    g.audio.play('caw');
    this.crow.key.visible = false;
    g.give('springKey');
    g.flag('crowTraded');
    await this.say([{ who: 'crow', text: '時計は待合室の奥の壁だ。巻いてやれよ、カァ！' }]);
  }

  // ---------------- ネズミのかくれんぼ ----------------
  async talkMouse() {
    const g = this.g, f = g.flags;
    this.focus(this.mouseLeader.root, 16);
    g.audio.play('squeak');
    const n = this.miceCount();
    if (f.handleGiven) {
      return this.say([{ who: 'mouse', text: 'チュー！ またかくれんぼしようね！' }]);
    }
    if (n >= 3) {
      await this.say([
        { who: 'mouse', text: 'すごーい！ みんな見つかっちゃった！' },
        { who: 'mouse', text: '約束どおり、このハンドルは返すよ。まるくて、かっこよかったんだけどなあ。' },
      ]);
      g.note('st-mice', 'ネズミのかくれんぼ', 'かくれているのは3びき。<br>ヒント：<b>にもつの山</b> ／ <b>大きな木のうろ</b> ／ <b>赤くて手紙を食べるもの</b>');
      this.R.handleTrophy.visible = false;
      this.mouseLeader.hop();
      g.give('valveHandle');
      g.flag('handleGiven');
      g.refreshQuests();
      return;
    }
    if (!f.miceTalked) {
      await this.say([
        { who: 'mouse', text: 'チュー！ だあれ？ ……あ、このハンドル？' },
        { who: 'mouse', text: 'これはぼくらの宝物だよ！ 給水塔で見つけたんだ。' },
        { who: 'mouse', text: '……でも、かくれんぼで兄弟たちを全員見つけられたら、返してあげてもいいよ！' },
        { who: 'mouse', text: 'かくれているのは3びき。ヒントはね……' },
        { who: 'mouse', text: '【にもつの山】、【大きな木のうろ】、それから【赤くて手紙を食べるもの】！' },
      ]);
      g.flag('miceTalked');
      g.refreshQuests();
      if (n > 0) await this.say([{ who: 'mouse', text: `あれっ、もう${n}ぴき見つけてるの？ すごいや！` }]);
      return;
    }
    await this.say([
      { who: 'mouse', text: `あと${3 - n}びきだよ！` },
      { who: 'mouse', text: 'ヒントは【にもつの山】、【大きな木のうろ】、【赤くて手紙を食べるもの】！' },
    ]);
  }

  async talkFoundMouse() {
    this.g.audio.play('squeak');
    return this.say([{ who: 'mouse', text: 'みつかっちゃったチュー。リーダーは切り株の家にいるよ！' }]);
  }

  async findMouse(spot) {
    const g = this.g, f = g.flags, R = this.R;
    const flavor = {
      luggage: '旅人たちの荷物が山のように積まれている。',
      tree: '大きなカエデの木。うろの中はからっぽだ。',
      mailbox: '赤い丸ポスト。異世界にも手紙を出せるのだろうか。',
    };
    if (f[`mouse_${spot}`]) return this.say([flavor[spot]]);
    const m = this.mice[spot];
    let from;
    if (spot === 'luggage') {
      this.focus(R.luggage, 16);
      g.audio.play('creak');
      await g.tweens.add({ duration: 0.4, onUpdate: (k) => { R.luggageLid.rotation.x = -0.18 - k * 0.9; } });
      from = R.luggageSpot.clone();
    } else if (spot === 'tree') {
      this.focus(R.bigTree, 18);
      from = R.treeSpot.clone();
    } else {
      this.focus(R.mailbox, 16);
      from = R.mailboxSpot.clone();
    }
    m.root.visible = true;
    m.root.position.copy(from).add(new V(0, -0.3, 0));
    m.root.rotation.y = 0;
    m.root.scale.setScalar(0.01);
    g.audio.play('pop');
    await g.tweens.add({ duration: 0.45, ease: Ease.backOut, onUpdate: (k) => {
      m.root.scale.setScalar(Math.max(0.01, k * 1.6));
      m.root.position.y = from.y - 0.3 + k * 0.45;
    } });
    g.audio.play('squeak');
    f[`mouse_${spot}`] = true;
    g.save();
    const n = this.miceCount();
    await this.say([
      { who: 'mouse', text: ['みつかっちゃったチュー！', 'わっ、見つかった！', 'チューッ！ ばれちゃった！'][n - 1] || 'チュー！' },
      `ネズミを見つけた！（${n}/3）`,
    ]);
    if (spot === 'luggage') g.tweens.add({ duration: 0.4, onUpdate: (k) => { R.luggageLid.rotation.x = -1.08 + k * 0.9; } });
    // 切り株の家へ走っていく
    const home = MOUSE_SPOTS[spot].home;
    const start = m.root.position.clone();
    const dir = home.clone().sub(start);
    m.root.rotation.y = Math.atan2(dir.x, dir.z);
    const dur = Math.min(2.2, 0.6 + dir.length() * 0.12);
    g.tweens.add({ duration: dur, ease: Ease.inOut, onUpdate: (k) => {
      m.root.position.lerpVectors(start, home, k);
      m.root.position.y = lerp(start.y, home.y, k) + Math.abs(Math.sin(k * Math.PI * 6)) * 0.25 + Math.sin(k * Math.PI) * 1.2;
      m.root.scale.setScalar(lerp(1.6, 1.4, k));
    } }).then(() => this._mouseAtHome(spot));
    g.refreshQuests();
    if (n >= 3) {
      g.audio.play('solve');
      g.ui.toast('ネズミを全員見つけた！ 切り株の家へ行こう', 3000);
    }
  }

  _mouseAtHome(spot) {
    const m = this.mice[spot];
    m.root.visible = true;
    m.root.position.copy(MOUSE_SPOTS[spot].home);
    m.root.scale.setScalar(1.4);
    m.root.rotation.y = 0.2;
  }

  // ---------------- 待合室 ----------------
  async clickClock() {
    const g = this.g, f = g.flags;
    this.focus(this.R.clock, 16);
    if (f.owlAwake) return this.say(['壁掛け時計は、チクタクと時を刻んでいる。もうすっかり夜だ。']);
    if (f.clockWound) return this.openClock();
    await this.say([
      '壁掛け時計は、12時を指したまま止まっている。',
      '文字盤の下に小さな鍵穴がある。ゼンマイが切れているようだ。',
    ]);
    g.note('st-clock', '待合室の時計', '12時で止まっている。文字盤の下に <b>ゼンマイの鍵穴</b>。');
    f.clockSeen = true;
  }

  async windClock() {
    const g = this.g;
    g.take('springKey');
    g.audio.play('crank');
    await this.say(['ゼンマイ鍵を差しこんで、キリキリと巻いた。']);
    this.pendulumOn = true;
    g.flag('clockWound');
    await this.say(['チク、タク……振り子が動きだした！', '針も自由に動かせるようになったようだ。']);
    return this.openClock();
  }

  openClock() {
    const g = this.g;
    return new Promise((resolve) => {
      let pending = false;
      clockPanel(g.ui, g.audio, {
        onRing: async (hour, panel) => {
          pending = true;
          panel.close();
          await this.ringClock(hour);
          resolve();
        },
      });
      // パネルが閉じられたら終了
      const check = setInterval(() => { if (!g.ui.panelOpen && !pending) { clearInterval(check); resolve(); } }, 200);
    });
  }

  async ringClock(hour) {
    const g = this.g;
    const from = this._handHour ?? 12;
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => this._setHands(lerp(from, hour, k)) });
    this._setHands(hour);
    if (hour !== 8) {
      const n = Math.min(hour, 3);
      for (let i = 0; i < n; i++) { g.audio.play('chime'); await g.wait(0.7); }
      return this.say([`ボーン……（${hour}時の鐘が鳴ったが、何も起こらなかった）`]);
    }
    // 正解：夜の8時
    g.cinematic = true;
    this.nightTarget = 1;
    for (let i = 0; i < 8; i++) { g.audio.play('chime'); await g.wait(0.75); }
    g.cinematic = false;
    await this.say(['ボーン……ボーン……', '8時の鐘が鳴りひびくと、あたりはすっかり夜になった。']);
    this.owl.setSleeping(false);
    this.owl.hop();
    g.audio.play('hoot');
    g.flag('owlAwake');
    this.focus(this.owl.root, 18);
    await this.say([
      { who: 'owl', text: 'ホッ！？ ……夜の8時の鐘だホー。' },
      { who: 'owl', text: 'おや、お客さんかね。いらっしゃい、ここは切符売り場だホー。' },
    ]);
    g.audio.play('solve');
  }

  _setHands(h) {
    this._handHour = h;
    this.R.hourHand.rotation.z = -((h % 12) / 12) * Math.PI * 2;
    this.R.minuteHand.rotation.z = -((h % 1) * Math.PI * 2);
  }

  showTimetable() {
    this.focus(this.R.timetable, 16);
    this.g.ui.openPanel({ title: '時刻表', body: timetableHTML(), cls: 'wide' });
    this.g.note('st-timetable', '時刻表', '3:00 きりのもり ／ 5:00 かえるぬま ／ <b>?:00 てんくうのまち（ほしまわり号）</b> ／ 9:00 つきのうら<br>📌 ほしまわり号は <b>かえるぬま行きの3時間あと</b> に出る。');
    this.g.flag('timetableSeen');
    return this._waitPanel();
  }

  showSign() {
    this.g.ui.openPanel({ title: '駅名標', body: stationSignHTML() });
    return this._waitPanel();
  }

  _waitPanel() {
    return new Promise((resolve) => {
      const check = setInterval(() => { if (!this.g.ui.panelOpen) { clearInterval(check); resolve(); } }, 150);
    });
  }

  async clickPlant() {
    const g = this.g, f = g.flags;
    this.focus(this.R.plant, 14);
    if (f.marbleTaken) return this.say(['入口の鉢植え。ピンクの花がかわいらしく咲いている。']);
    await this.say(['駅の入口の鉢植え。……土の中で、何かがキラリと光った。']);
    this.R.marble.visible = false;
    g.give('marble');
    g.flag('marbleTaken');
  }

  async clickStove() {
    const g = this.g, f = g.flags;
    this.focus(this.R.stove, 16);
    if (f.stoneTaken) return this.say(['ストーブの火は小さくなったが、まだほんのり暖かい。']);
    const lines = ['ストーブの中で『ほのお石』が赤々と燃えている。', '熱くて、素手ではとてもつかめない。'];
    if (g.has('tongs')) lines.push('（持ち物の『火ばさみ』が使えそうだ）');
    await this.say(lines);
  }

  async takeStone() {
    const g = this.g, R = this.R;
    g.take('tongs');
    g.audio.play('fire');
    await this.say(['火ばさみで、燃えるほのお石をそっとつまみ出した。']);
    R.fireStoneInStove.visible = false;
    R.stoveGlowMat.emissiveIntensity = 0.5;
    g.give('fireStone');
    g.flag('stoneTaken');
  }

  // ---------------- 駅前 ----------------
  async clickWell() {
    const g = this.g, f = g.flags, R = this.R;
    this.focus(R.well, 16);
    if (f.broochTaken) return this.say(['冷たい水をたたえた井戸。水面に月がゆれている。']);
    await this.say(['古い井戸だ。つるべの桶がぶら下がっている。', 'ハンドルを回して、桶を下ろしてみた。']);
    g.audio.play('crank');
    await g.tweens.add({ duration: 1.2, onUpdate: (k) => {
      R.wellAxle.rotation.x = k * Math.PI * 4;
      R.bucket.position.y = 1.15 - k * 1.0;
      this._updateRope();
    } });
    g.audio.play('splash');
    await g.wait(0.5);
    R.broochInBucket.visible = true;
    g.audio.play('crank');
    await g.tweens.add({ duration: 1.4, onUpdate: (k) => {
      R.wellAxle.rotation.x = Math.PI * 4 - k * Math.PI * 4;
      R.bucket.position.y = 0.15 + k * 1.0;
      this._updateRope();
    } });
    await this.say(['桶を引き上げると……', '水の中に、三日月の形をしたブローチが沈んでいた！']);
    R.broochInBucket.visible = false;
    g.give('brooch');
    g.flag('broochTaken');
  }

  _updateRope() {
    const R = this.R;
    const top = 1.62, bottom = R.bucket.position.y + 0.16;
    const len = Math.max(0.05, top - bottom);
    R.rope.scale.y = len;
    R.rope.position.y = bottom + len / 2;
  }

  async clickShed() {
    const g = this.g, f = g.flags, R = this.R;
    this.focus(R.shed, 16);
    if (!f.shedOpen) {
      await this.say(['小さな倉庫。扉には、三つの色の輪がついた錠前がかかっている。']);
      g.note('st-lock', '倉庫の錠前', '合言葉は「駅の顔」にある <b>三つの丸窓の色</b>。左から順に。');
      return new Promise((resolve) => {
        let pending = false;
        lockPanel(g.ui, g.audio, {
          onTry: (cols, panel) => {
            if (cols.join() === '黄,青,赤') {
              pending = true;
              panel.close();
              this.openShed().then(resolve);
              return true;
            }
            g.audio.play('wrong');
            return false;
          },
        });
        const check = setInterval(() => { if (!g.ui.panelOpen && !pending) { clearInterval(check); resolve(); } }, 200);
      });
    }
    if (!f.tongsTaken) {
      await this.say(['倉庫の奥の壁に、長い『火ばさみ』が掛けてある。']);
      R.tongs.visible = false;
      g.give('tongs');
      g.flag('tongsTaken');
      return;
    }
    return this.say(['倉庫の中には、スコップやロープ、木箱がしまってある。']);
  }

  async openShed() {
    const g = this.g;
    g.audio.play('unlock');
    g.flag('shedOpen');
    await g.wait(0.4);
    g.audio.play('creak');
    await this._shedOpenVisual(false);
    g.audio.play('solve');
    await this.say(['カチャリ！ 錠前が外れた。', '倉庫の扉が開いた。']);
  }

  _shedOpenVisual(instant) {
    const R = this.R;
    R.shedLight.intensity = 3;
    if (instant) {
      R.shedDoor.position.x = -1.65;
      R.lock.visible = false;
      return Promise.resolve();
    }
    R.lock.visible = false;
    return this.g.tweens.add({ duration: 1.0, onUpdate: (k) => { R.shedDoor.position.x = -0.05 - k * 1.6; } });
  }

  async clickTower() {
    const g = this.g, f = g.flags;
    this.focus(this.R.waterTower, 22);
    if (f.water) return this.say(['給水塔。タンクにはまだたっぷり水がある。']);
    const lines = ['給水塔だ。バルブのハンドルが外されている。'];
    if (g.has('valveHandle')) lines.push('（持ち物の『バルブハンドル』が使えそうだ）');
    else lines.push('……よく見ると、まわりに小さな足あとがたくさんある。');
    await this.say(lines);
  }

  async doWater() {
    const g = this.g, R = this.R;
    g.take('valveHandle');
    R.valveWheel.visible = true;
    g.audio.play('unlock');
    await this.say(['バルブにハンドルを取りつけた。', 'ぐるぐると回してみると……']);
    g.cinematic = true;
    g.audio.play('creak');
    await g.tweens.add({ duration: 1.0, onUpdate: (k) => {
      R.valveWheel.rotation.z = -k * Math.PI * 2;
      R.spout.rotation.x = -0.95 + k * 1.2;
    } });
    // 水の柱
    const tip = new V(0, -0.15, 1.95);
    R.spout.localToWorld(tip);
    const hatch = this.train.worldOf(this.train.tender, this.train.tender.hatchLocal);
    const len = tip.y - hatch.y;
    R.waterStream.position.set((tip.x + hatch.x) / 2, (tip.y + hatch.y) / 2, (tip.z + hatch.z) / 2);
    R.waterStream.scale.set(1, len, 1);
    R.waterStream.visible = true;
    g.audio.play('water');
    const t0 = this.g.time;
    await g.tweens.add({ duration: 2.6, onUpdate: () => {
      R.waterStream.material.opacity = 0.6 + Math.sin(this.g.time * 30) * 0.1;
      if (Math.random() < 0.5) this.splash.emit(hatch, { vel: new V((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2), spread: 0.5, life: 0.6, size0: 0.1, size1: 0.35 });
    } });
    void t0;
    R.waterStream.visible = false;
    this.train.tender.waterSurface.visible = true;
    await g.tweens.add({ duration: 1.0, onUpdate: (k) => { R.spout.rotation.x = 0.25 - k * 1.2; } });
    g.cinematic = false;
    g.flag('water');
    await this.say(['ザバザバザバ……！ 炭水車のタンクが水でいっぱいになった！']);
    this.questDone('機関車に水が入った！');
    this.frog.hop();
    g.audio.play('ribbit');
    await this.checkReady();
  }

  // ---------------- 信号 ----------------
  async clickSignal() {
    const f = this.g.flags;
    this.focus(this.R.signal, 22);
    const lines = [f.signal ? '出発信号。青いランプが灯っている。' : '出発信号。赤いランプが灯っている。'];
    lines.push(f.crowTraded ? 'てっぺんの巣で、カラスがビー玉をながめている。' : 'てっぺんにカラスが巣をつくっている。何か光るものをくわえているようだ。');
    await this.say(lines);
  }

  async clickSignalBox() {
    const g = this.g, f = g.flags;
    this.focus(this.R.signalBox, 18);
    if (f.signal) return this.say(['信号所。レバーはすべて倒されている。']);
    if (f.signalBoxOpen) return this.openLevers();
    const lines = ['ホームのはしにある小さな信号所。扉には鍵がかかっている。'];
    if (g.has('signalKey')) lines.push('（持ち物の『信号所の鍵』が使えそうだ）');
    await this.say(lines);
  }

  async openSignalBox() {
    const g = this.g, R = this.R;
    g.take('signalKey');
    g.audio.play('unlock');
    await g.wait(0.3);
    g.audio.play('creak');
    await g.tweens.add({ duration: 0.9, onUpdate: (k) => { R.sigBoxDoor.rotation.y = -k * 1.9; } });
    g.flag('signalBoxOpen');
    await this.say(['信号所の扉が開いた。', '中には4本のレバーが並んでいる。']);
    return this.openLevers();
  }

  openLevers() {
    const g = this.g;
    g.note('st-levers', '信号所のレバー', 'レバーは <b>出発の早い列車の順</b> に倒す。（時刻表を思い出そう）');
    return new Promise((resolve) => {
      let pending = false;
      leverPanel(g.ui, g.audio, {
        onSolved: async (panel) => {
          pending = true;
          panel.close();
          await this.signalGreen();
          resolve();
        },
        onFail: () => g.audio.play('wrong'),
      });
      const check = setInterval(() => { if (!g.ui.panelOpen && !pending) { clearInterval(check); resolve(); } }, 200);
    });
  }

  async signalGreen() {
    const g = this.g, R = this.R;
    g.cinematic = true;
    for (let i = 0; i < 4; i++) {
      const lv = R.levers[i];
      g.audio.play('lever');
      await g.tweens.add({ duration: 0.25, onUpdate: (k) => { lv.rotation.x = -0.35 + k * 0.8; } });
    }
    this.focus(R.signal, 24);
    await g.wait(0.6);
    g.audio.play('clunk');
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => this._setSignal(k) });
    g.flag('signal');
    g.audio.play('solve');
    g.cinematic = false;
    this.crow.hop();
    g.audio.play('caw');
    await this.say(['ガシャン！ 出発信号が青に変わった！']);
    this.questDone('出発信号が青になった！');
    this.focus(this.cat.root);
    await this.say([{ who: 'cat', text: 'おお、信号が青になりましたニャ！' }]);
  }

  _setSignal(k) {
    const R = this.R;
    R.sigRed.emissiveIntensity = 3 * (1 - k);
    R.sigBlue.emissiveIntensity = 3.2 * k;
    R.sigBlue.color.set('#1a4a3a').lerp(new THREE.Color('#5affd0'), k);
    R.sigLight.color.set('#ff3a2a').lerp(new THREE.Color('#30ffc0'), k);
  }

  _setFire(on) {
    const L = this.train.loco;
    L.firebox.material.emissiveIntensity = on ? 2.5 : 0;
    L.cabLight.emissiveIntensity = on ? 1.8 : 0.3;
    L.headlight.material.emissiveIntensity = on ? 3 : 0.2;
  }

  async clickLoco() {
    const f = this.g.flags;
    await this.say([
      '異界特急『ほしまわり号』の機関車。正面で金色の星がかがやいている。',
      f.fire ? 'ボイラーはシュッシュッと元気よく蒸気をはいている。' : 'ボイラーの火は消えていて、ひんやりと冷たい。',
    ]);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    // 信号機のてっぺんのカラスは小さいので、信号機に使っても渡せるようにする
    if (target === 'signal' && item === 'marble') target = 'crow';
    const npc = { cat: 1, frog: 1, owl: 1, rabbit: 1, crow: 1, mouse: 1, stump: 1 };
    // 正解の組み合わせ
    if (item === 'marble' && target === 'crow') { this.focus(this.crow.root, 22); return this.crowTrade(); }
    if (item === 'springKey' && target === 'clock') { this.focus(this.R.clock, 16); return this.windClock(); }
    if (item === 'brooch' && target === 'rabbit') { this.focus(this.rabbit.root, 18); return this.returnBrooch(); }
    if (item === 'starCoin' && target === 'owl') {
      if (!f.owlAwake) return this.say(['フクロウはぐっすり眠っていて、受けとってくれない。']);
      return this.buyTicket();
    }
    if (item === 'tongs' && target === 'stove') { this.focus(this.R.stove, 16); return this.takeStone(); }
    if (item === 'fireStone' && (target === 'frog' || target === 'loco')) {
      this.focus(this.frog.root);
      if (!f.frogTalked) { await this.talkFrog(); return; }
      return this.lightFire();
    }
    if (item === 'valveHandle' && target === 'tower') { this.focus(this.R.waterTower, 24); return this.doWater(); }
    if (item === 'signalKey' && target === 'signalBox') { this.focus(this.R.signalBox, 18); return this.openSignalBox(); }
    if (item === 'ticket' && target === 'cat') return this.talkCat();

    // それっぽい反応
    if (item === 'starCoin' && target === 'crow') return this.say([{ who: 'crow', text: 'カァ……丸いのはいいが、透きとおってねえな。' }]);
    if (item === 'tongs' && target === 'well') return this.say(['火ばさみでは、井戸の底まで届かない。']);
    if (item === 'marble' && target === 'mouse') return this.say([{ who: 'mouse', text: 'わあ、きれい！ ……でも、ハンドルのほうがかっこいいもん！' }]);
    if (npc[target]) {
      const who = target === 'stump' ? 'mouse' : target;
      const resp = {
        cat: 'それは、お客さまが持っていてくださいニャ。',
        frog: 'それはボイラーには入れられないケロ。',
        owl: f.owlAwake ? 'それはお金じゃないホー。' : null,
        rabbit: 'それは……わたしのじゃないわ。',
        crow: 'カァ？ そんなもんいらねえよ。',
        mouse: 'チュー？ それはいらないや。',
      }[who];
      if (resp) return this.say([{ who, text: resp }]);
      return this.say(['フクロウはぐっすり眠っている。']);
    }
    return this.say(['ここでは使えないようだ。']);
  }

  // =========================================================
  // オープニングと発車
  // =========================================================
  async opening() {
    const g = this.g;
    g.cinematic = true;
    g.camera.position.set(30, 30, 46);
    g.controls.target.set(2, 1, -2);
    await g.ui.fade(0, 1.6);
    await g.ui.banner('はざま駅', `STAGE ${stageNo('station')}`, 2400);
    await g.say([
      '……ガタン、ゴトン。',
      '気がつくと、あなたは見知らぬ駅に立っていた。',
      '夕暮れの空に浮かぶ、小さな駅。',
      'ホームには、星のような光をまとった列車が停まっている……',
    ]);
    const portrait = innerWidth < innerHeight;
    await g.moveCamera(portrait ? new V(5, 12, 19) : new V(4, 9, 14), new V(-1.2, 1.5, -2.4), 2.6);
    g.cinematic = false;
    await this.talkCat();
  }

  async departure() {
    const g = this.g;
    await this.say([
      { who: 'cat', text: '切符を拝見しますニャ。……はい、たしかに。' },
      { who: 'cat', text: 'ほしまわり号、天空の街ゆき。まもなく発車いたしますニャ！' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
    g.flag('departed');
    g.refreshQuests();
    g.cinematic = true;
    g.ui.closeAllPanels();
    document.body.classList.add('cinematic');
    this.manualRoof = false;
    await g.moveCamera(new V(4.0, 5.2, 6.8), new V(2.6, 1.5, -4.6), 2.4);
    this.cat.wave = 6;
    this.rabbit.wave = 6;
    g.audio.play('bell');
    await g.wait(1.0);
    g.audio.play('whistle');
    for (let i = 0; i < 5; i++) {
      const p = this.train.worldOf(this.train.loco, this.train.loco.whistleLocal);
      this.steam.emit(p, { vel: new V(0, 2.5, 0), spread: 0.3, life: 1.0, size0: 0.2, size1: 1.2 });
      await g.wait(0.15);
    }
    await g.wait(0.8);
    this.departing = true;
    this.followTrain = true;
    this.followK = 0;
    // 加速
    g.tweens.add({ duration: 9, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 9; } });
    g.tweens.add({ duration: 12, ease: Ease.sine, onUpdate: (k) => { this.followK = k; } });
    await g.wait(4);
    g.audio.play('whistle');
    await g.wait(6.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'station'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'station', 'ほしまわり号は、星の線路をのぼっていく。');
  }
}
