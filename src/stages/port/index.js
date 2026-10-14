import * as THREE from 'three';
import { makeBackdrop } from '../../lib/backdrop.js';
import { GRADES, mixGrade } from '../../core/postfx.js';
import { Motes } from '../../lib/livefx.js';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs, Birds } from '../../lib/environment.js';
import { makeFrog } from '../../lib/creatures.js';
import { makeSeal, makeOcto, makeCrab, makePelican, makeGull } from '../../lib/creatures-port.js';
import { lerp, softCircleTexture } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { Ease } from '../../core/tween.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildPortDiorama, buildPortRails, TRACK_Z, Q, CW, PLAT, TIDE_Y, TIDE_NAME } from './diorama.js';
import { mailPanel, tidePanel, lensPanel } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  seal: { name: 'アザラシの灯台守', icon: '🦭', color: '#2a3a6a', voice: 300 },
  octo: { name: 'タコの郵便屋', icon: '🐙', color: '#c8483a', voice: 820 },
  crab: { name: 'カニの漁師', icon: '🦀', color: '#b83a22', voice: 640 },
  pelican: { name: 'ペリカンの魚屋', icon: '🐟', color: '#2a6ab0', voice: 360 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

const YQ = Q + RAIL_Y, YC = CW + RAIL_Y;

/** 線路：左上の空から港の駅へ。右で坂を下り、海の中の「潮の道」をわたって空へ */
function makePortPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-95, 30, 40), new V(-62, 24, 22), new V(-34, YQ, TRACK_Z), new V(-16, YQ, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-16, YQ, TRACK_Z), new V(3, YQ, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(3, YQ, TRACK_Z), new V(6, YQ, TRACK_Z), new V(7, YC, TRACK_Z), new V(10, YC, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(10, YC, TRACK_Z), new V(16, YC, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(16, YC, TRACK_Z), new V(32, YC, TRACK_Z), new V(46, 10, -18), new V(62, 18, -36)));
  p.add(new THREE.CubicBezierCurve3(new V(62, 18, -36), new V(78, 24, -52), new V(94, 28, -68), new V(112, 30, -88)));
  p.arcLengthDivisions = 900;
  return p;
}

const SEAL_HOME = new V(7.0, Q, 0.5);
const SEAL_LIGHT = new V(10.9, 1.95, 4.75);
const BOAT_HOME = new V(-1.5, 0, 4.5);

/**
 * ステージ：潮の港町
 * 目的：潮時計を直し、灯台に灯をともし、干潮で海から出る「潮の道」をわたる
 */
export class PortStage {
  constructor(game) {
    this.g = game;
    this.id = 'port';
    this.title = '潮の港町';
    this.questTitle = '🌊 潮の道をひらく';
    this.hasRoof = false;
    this.roofLifted = false;
    this.waterY = TIDE_Y[2];
    this.clear = 0; // 0=朝霧 1=晴れ
    this.departing = false;
    this.trainSpeed = 0;
    this.sailing = false;
    this.tideBusy = false;
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('port');

    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#5a9ae0'); u.dMid.value.set('#bcdcf4'); u.dBot.value.set('#f4f8fc');
    u.night.value = 0;
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#dce6ee', 30, 120);
    this.hemi = new THREE.HemisphereLight('#dceaff', '#6a7a88', 1.25);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff4e0', 2.4));
    sun.position.set(16, 20, 10);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 80;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: 30, d: 22, seed: 41, grass: '#d8c8a0' });
    scene.add(this.island);
    this.clouds = makeClouds(43);
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('port');
    scene.add(this.backdrop.group);
    this.smallIslands = [[-60, 6, -34, 4, 41], [54, -2, 28, 3, 42], [-74, 10, 18, 5, 43], [-24, -6, 62, 4, 44]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車
    this.path = makePortPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 15; // 機関車が x=-1 に止まる
    this.tracks = buildPortRails(scene, this.path, -14.8, 14.8);
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();
    this.train.loco.firebox.material.emissiveIntensity = 2.2;
    this.train.loco.headlight.material.emissiveIntensity = 3;

    await this.g.loadingStep(0.3, '港町を組み立てています…');
    this.R = buildPortDiorama(scene);

    this.smoke = new Puffs(scene, { count: 70, color: '#f4f4f8', opacity: 0.7 });
    this.birds = new Birds(scene, 6, 47);
    this.sparkles = this._makeSparkles(scene);
    // 朝霧（灯台が灯ると晴れる）と、光の中のほこり
    this.mist = new Motes(scene, { count: 46, color: '#ffffff', size: 2.2, area: { x: 34, z: 14, y0: 0.6, y1: 3.4 }, center: [0, 5], kind: 'mist', opacity: 0.26 });
    this.dust = new Motes(scene, { count: 50, color: '#fff8e0', size: 0.07, area: { x: 26, z: 14, y0: Q + 0.3, y1: Q + 4 }, center: [0, -3], kind: 'dust', opacity: 0 });

    await this.g.loadingStep(0.6, '住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();
    this._applyClear(0);

    g.ui.onLine = (who) => {
      const c = this.speakerCreature(who);
      if (c) c.talk(2.2);
    };
  }

  _optimize() {
    if (new URLSearchParams(location.search).has('nomerge')) return;
    const creatureRoots = new Set(this.creatures.map((c) => c.root));
    const roots = [this.island, this.tracks, this.R.root, ...this.smallIslands.map((s) => s.o)];
    for (const [, it] of this.g.interactables) if (!creatureRoots.has(it.object)) roots.push(it.object);
    for (const c of this.creatures) c.root.traverse((o) => { if (o !== c.root && !o.isMesh) o.userData.dynamic = true; });
    this.g.scene.traverse((o) => { if (o.userData.dynamic) roots.push(o); });
    for (const c of this.creatures) roots.push(c.root);
    let n = 0;
    for (const r of roots) n += mergeStatic(r);
    this.g.refreshInteractableMeshes();
    console.info(`[optimize] merged ${n} meshes`);
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
    this.seal = makeSeal();
    this.seal.root.position.copy(SEAL_HOME);
    this.seal.root.rotation.y = 0.5;
    this.octo = makeOcto();
    this.octo.root.position.set(-0.4, Q, -0.9);
    this.crab = makeCrab();
    this.crab.root.position.set(-3.0, Q, 3.7);
    this.crab.root.rotation.y = 0.7;
    this.pelican = makePelican();
    this.pelican.root.position.set(2.3, Q, -0.75);
    this.pelican.root.rotation.y = 0.25;
    this.frog = makeFrog();
    this.frog.root.position.set(-3.2, Q + PLAT, -3.3);
    this.frog.root.rotation.y = 0.3;
    this.gulls = [[-6.8, Q + 0.45, 0.9, 0.4], [-6.4, 2.7, 8.6, 2.6], [0.9, 2.7, 8.6, -2.4], [-10.6, 3.4, 2.2, 0.8], [7.3, Q + 2.75, -2.55, 0.3]].map(([x, y, z, ry]) => {
      const c = makeGull();
      c.root.position.set(x, y, z);
      c.root.rotation.y = ry;
      return c;
    });
    this.creatures = [this.seal, this.octo, this.crab, this.pelican, this.frog, ...this.gulls];
    for (const c of this.creatures) scene.add(c.root);
  }

  speakerCreature(who) {
    return { seal: this.seal, octo: this.octo, crab: this.crab, pelican: this.pelican, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('seal', this.seal.root, 'アザラシの灯台守', () => this.talkSeal());
    reg('octo', this.octo.root, 'タコの郵便屋', () => this.talkOcto());
    reg('crab', this.crab.root, 'カニの漁師', () => this.talkCrab());
    reg('pelican', this.pelican.root, 'ペリカンの魚屋', () => this.talkPelican());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    this.gulls.forEach((c, i) => reg(`gull${i}`, c.root, 'カモメ', () => { g.audio.play('gull'); return this.say(['ミャア、ミャア。カモメが海のほうを見ている。']); }));
    reg('tideClock', R.tideClock, '潮時計', () => this.clickClock());
    reg('gauge', R.gauge, '潮位標', () => this.clickGauge());
    reg('postOffice', R.postOffice, '郵便局', () => this.talkOcto());
    reg('mailbox', R.mailbox, 'ポスト', () => this.say(['青い丸ポスト。「タコ局　朝と夕の二回あつめます」と書いてある。']));
    reg('market', R.market, '魚市場', () => this.talkPelican());
    reg('shed', R.shed, '網小屋', () => this.say(['網小屋。干してある網のとなりに、ガラスの浮き玉がならんでいる。', this.g.flags.netGiven ? 'カニの漁師の船は、もう網を積んでいる。' : 'いちばん大きな網をかける場所が、からっぽだ。']));
    reg('boat', R.boat, '漁船', () => this.talkCrab());
    reg('pier', R.pier, '桟橋', () => this.talkCrab());
    reg('bridge', R.bridge, '石橋の防波堤', () => this.clickBridge());
    reg('cave', R.cave, '岩山の洞窟', () => this.clickCave());
    reg('caveNet', R.caveNet, '岩山の洞窟', () => this.clickCave());
    reg('sandbar', R.sandbar, '砂州', () => this.clickSandbar());
    reg('tidePool', R.tidePool, '潮だまり', () => this.clickTidePool());
    reg('stairs', R.stairs, '海への階段', () => this.clickSandbar());
    reg('lighthouse', R.islet, '灯台', () => this.clickLighthouse());
    reg('causeway', R.causeway, '潮の道', () => this.clickCauseway());
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『しおのみなと』……左は『えどのしゅく』、右は『じょうかまち』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。しめった朝霧のなかで、白い湯気をはいている。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。窓ガラスが、霧でうっすらくもっている。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  get tide() { return this.g.flags.tide ?? 2; }

  applyState() {
    const f = this.g.flags, R = this.R;
    // 古いセーブ：アイテム名の変更（'gear' → 'moonGear'）
    if (this.g.has('gear')) { this.g.state.inventory = this.g.state.inventory.map((i) => (i === 'gear' ? 'moonGear' : i)); this.g.save(); }
    this.waterY = TIDE_Y[this.tide];
    this._applyWater();
    this._clockHand(this.tide);
    R.clockGear.visible = !!f.clockFixed;
    R.caveNet.visible = !f.netGot;
    R.boatNet.visible = !!f.netGiven;
    R.boatFish.visible = !!f.fishGot;
    R.fishDisplay.visible = !!f.fishGiven;
    R.noFish.visible = !f.fishGiven;
    this.seal.root.position.copy(f.sealGone ? SEAL_LIGHT : SEAL_HOME);
    this.seal.root.rotation.y = f.sealGone ? -1.0 : 0.5;
    this.crab.root.position.set(-3.0, Q, 3.7);
    this.clear = f.lit ? 1 : 0;
    this._applyClear(this.clear);
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  _clockHand(lv) {
    this.R.clockHand.rotation.z = -[55, 0, -55][lv] * Math.PI / 180;
  }

  _applyWater() {
    const R = this.R, y = this.waterY;
    R.water.scale.y = Math.max(0.02, y);
    // 水から出ているものだけ選べるように（水の下のものは見えるが、話は「海の中」）
  }

  /** 朝霧(0) → 晴れ(1)：灯台が灯ると霧がはれる */
  _applyClear(k) {
    const g = this.g, R = this.R;
    this.backdrop.set(k);
    g.setGrade(mixGrade(GRADES.portFog, GRADES.port, k));
    const u = this.sky.uniforms;
    u.dMid.value.set('#d8e4ec').lerp(new THREE.Color('#a8d4f4'), k);
    u.dTop.value.set('#8ab0d0').lerp(new THREE.Color('#3a86d8'), k);
    g.scene.fog.color.set('#dce6ee').lerp(new THREE.Color('#d8ecf8'), k);
    g.scene.fog.near = lerp(26, 70, k);
    g.scene.fog.far = lerp(95, 240, k);
    this.hemi.intensity = lerp(1.35, 1.2, k);
    this.sun.intensity = lerp(1.7, 2.7, k);
    g.renderer.toneMappingExposure = lerp(1.08, 1.04, k);
    this.mist.mat.opacity = 0.26 * (1 - k);
    this.mist.visible = k < 0.98;
    this.dust.mat.opacity = 0.5 * k;
    R.waterMat.color.set('#5a90b8').lerp(new THREE.Color('#2a8ad0'), k);
    const lit = this.g.flags.lit || this.lighting;
    R.lampMat.emissiveIntensity = lit ? 2.6 : 0;
    R.lampLight.intensity = lit ? 3 : 0;
    R.beam.visible = !!lit;
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.birds.update(dt, t);
    this.mist.update(dt, t);
    this.dust.update(dt, t);
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    // 波でゆれる水面・浮き・船
    const wy = this.waterY;
    R.water.scale.y = Math.max(0.02, wy + Math.sin(t * 0.8) * 0.015);
    for (const b of R.buoys) {
      b.o.position.y = wy + Math.sin(t * 1.3 + b.ph) * 0.04;
      b.o.rotation.z = Math.sin(t * 1.1 + b.ph) * 0.12;
    }
    if (!this.sailing) {
      const floatY = Math.max(0.02, wy - 0.12);
      const afloat = wy > 0.35;
      R.boat.position.set(BOAT_HOME.x, floatY + (afloat ? Math.sin(t * 1.2) * 0.03 : 0), BOAT_HOME.z);
      R.boat.rotation.z = afloat ? Math.sin(t * 0.9) * 0.025 : 0.06;
      R.boat.rotation.x = afloat ? Math.sin(t * 0.7) * 0.015 : 0;
    }
    if (this.crabOnBoat) {
      const p = R.boat.localToWorld(new V(0, 0.44, -0.05));
      this.crab.root.position.copy(p);
    }
    R.boatFlag.rotation.y = Math.sin(t * 2.3) * 0.3;
    R.flag.rotation.y = Math.sin(t * 1.7) * 0.15;
    if (R.beam.visible) R.beam.rotation.y = t * 0.9;
    if (this.gearSpin) R.clockGear.rotation.z -= dt * 3;
    // 煙
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.6;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      if (p.x < 18) this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.4, 0), spread: 0.5, life: heavy ? 2.4 : 3.2, size0: 0.5, size1: heavy ? 3.2 : 2.4 });
    }
    this.smoke.update(dt);
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0 && this.train.s < this.stopS + 30) { this.chuffT = 0.5; g.audio.play('chuff'); }
    }
    for (const s of this.sparkles) {
      if (!s.visible) continue;
      s.userData.t += dt;
      const k = s.userData.t / 2.6;
      if (k >= 1) { s.visible = false; continue; }
      s.material.opacity = Math.sin(k * Math.PI) * (0.7 + 0.3 * Math.sin(t * 10));
      s.scale.setScalar(0.6 + Math.sin(t * 6 + s.userData.ph) * 0.15);
    }
  }

  // =========================================================
  // 目的・ヒント
  // =========================================================
  quests() {
    const f = this.g.flags;
    if (!f.introDone) return [{ text: '灯台守のアザラシに話しかけよう', done: false }];
    const all = f.clockFixed && f.fishGiven && f.lit;
    const q = [
      { text: '🕰 潮時計を直す', done: !!f.clockFixed },
      { text: '🐟 朝市に魚をとどける', done: !!f.fishGiven },
      { text: '💡 灯台に灯をともす', done: !!f.lit },
    ];
    if (all) q.push({ text: '🌊 潮の道を出して、機関士に知らせる', done: !!f.departed });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    const tide = this.tide;
    if (!f.introDone) return H('intro', '岸壁の右、海へおりる階段の上にいるアザラシに話しかけよう。');
    if (f.clockFixed && f.fishGiven && f.lit) {
      if (tide !== 0) return H('finalTide', '潮の道は、海がいちばん低いときだけ海から出る。', '潮時計を『干潮』にしてから、ホームのカエルの機関士に話しかけよう。');
      return H('final', '準備はそろった！ ホームのカエルの機関士に知らせよう。');
    }
    if (!f.clockFixed) {
      if (has('moonGear')) return H('fixClock', '持ち物の『月の歯車』を選んで、広場の『潮時計』に使おう。');
      if (!f.octoTalked) return H('octo', '月の歯車は、けさの郵便でとどくはず。通りの『郵便局』のタコに話しかけよう。');
      return H('mail', 'にじんだ宛名のかわりに、中身の手がかりを読もう。', '二十八の歯（月のひとめぐり）→潮見やぐら、冷たいの三箱→魚市場、すすの出ない品→灯台、糸でつくろう→網小屋。');
    }
    if (!f.sealGone) return H('low', 'アザラシは灯台へ帰りたがっていた。潮時計で潮の高さを変えてみよう。', '潮時計を『干潮』にすると、砂州があらわれて灯台へ歩いて渡れる。');
    if (!f.fishGiven) {
      if (has('fish')) return H('giveFish', '持ち物の『朝どれのアジ』を選んで、魚市場のペリカンに使おう。');
      if (f.netGiven) {
        if (tide === 1) return H('sail', '中潮になった。桟橋のカニの漁師に話しかけよう。');
        return H('mid', 'カニの船は石橋の下をくぐって沖へ出る。満潮だとマストがつかえ、干潮だと船底がつかえる……。', '潮時計を『中潮』にしよう。');
      }
      if (has('net')) return H('giveNet', '持ち物の『漁網』を選んで、桟橋のカニの漁師に使おう。');
      if (f.crabTalked) {
        if (tide === 0) return H('cave', '干潮のいまなら、左の岩山の『洞窟』に入れる。');
        return H('caveLow', '流された網は、左の岩山の洞窟にあるらしい。洞窟の入口は、海がうんと引かないと出てこない。', '潮時計を『干潮』にして、岩山の洞窟を調べよう。');
      }
      if (f.pelicanTalked) return H('crab', 'ペリカンは魚がほしい。魚をとるのは漁師……桟橋のカニの漁師に話しかけよう。');
      return H('pelican', '灯台の油は、魚市場のペリカンがあずかっている。『魚市場』に行こう。');
    }
    if (!f.lit) {
      if (f.wickSet && f.oilSet) return H('lens', '灯台のアザラシに話しかけて、レンズの輪をそろえよう。', '「外と中」を2回、「中と内」を1回。');
      if (tide !== 0) return H('toLight', '『小包』と『灯台の油』を、灯台のアザラシにわたそう。', '灯台へは干潮のときだけ砂州を渡って行ける。潮時計を『干潮』に。');
      return H('giveLight', '『小包』と『灯台の油』を、灯台のアザラシにわたそう。持ち物を選んで、アザラシに使う。');
    }
    return H('none', 'あちこち調べてみよう。');
  }

  revealHotspots() {
    let i = 0;
    const box = new THREE.Box3();
    for (const [, it] of this.g.interactables) {
      if (it.enabled === false || !it.object.visible || i >= this.sparkles.length) continue;
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

  focus(obj, dist) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(4.5, Math.max(0.8, p.y + 0.5)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined });
  }

  questDone(text) {
    this.g.audio.play('quest');
    this.g.ui.toast(`✓ ${text}`, 2600);
    this.g.refreshQuests();
    this.g.save();
  }

  waitPanel(isPending = () => false) {
    return new Promise((resolve) => {
      const check = setInterval(() => { if (!this.g.ui.panelOpen && !isPending()) { clearInterval(check); resolve(); } }, 150);
    });
  }

  async checkReady() {
    const f = this.g.flags;
    if (f.clockFixed && f.fishGiven && f.lit) {
      await this.say(['これで準備はそろった。潮の道を出して、カエルの機関士に知らせよう！']);
      this.g.refreshQuests();
    }
  }

  // =========================================================
  // 潮の満ち引き
  // =========================================================
  async clickClock() {
    const g = this.g, f = g.flags;
    this.focus(this.R.tideClock, 14);
    if (!f.clockFixed) {
      if (g.has('moonGear')) return this.fixClock();
      g.note('pt-clock', '潮時計', '広場の潮時計。針は<b>満潮</b>で止まっている。<br>文字盤の下の<b>月の歯車</b>の穴が、からっぽ。');
      return this.say(['広場の潮時計。文字盤には『満』『中』『干』の文字と、三日月の絵。', '針は『満』をさしたまま、ぴくりとも動かない。', '下のほうに『月の歯車』と書かれた丸い穴がある。……中は、からっぽだ。']);
    }
    return this.openTide();
  }

  async fixClock() {
    const g = this.g;
    this.focus(this.R.tideClock, 14);
    g.take('moonGear');
    g.audio.play('crank');
    this.R.clockGear.visible = true;
    this.gearSpin = true;
    await g.wait(0.8);
    this.gearSpin = false;
    g.audio.play('clunk');
    g.flag('clockFixed');
    g.note('pt-tide', '潮時計の使いかた', '針を合わせると、港の潮が<b>満潮・中潮・干潮</b>のとおりに満ち引きする。<br>潮の高さで、行ける場所が変わる。');
    this.questDone('潮時計が動いた！');
    await this.say(['カチリ。月の歯車がはまると、潮時計がコチコチと動きだした。', '（針を合わせれば、潮の高さを変えられそうだ）']);
    return this.openTide();
  }

  openTide() {
    const g = this.g;
    let pending = false;
    tidePanel(g.ui, g.audio, {
      current: this.tide,
      onSet: async (lv) => { pending = true; await this.setTide(lv); pending = false; },
    });
    return this.waitPanel(() => pending);
  }

  async setTide(lv) {
    const g = this.g, f = g.flags;
    if (this.tideBusy) return;
    this.tideBusy = true;
    const from = this.waterY, to = TIDE_Y[lv];
    const fromLv = this.tide;
    g.cinematic = true;
    await g.moveCamera(innerWidth < innerHeight ? new V(2, 16, 25) : new V(3, 11, 21), new V(1.5, 0.6, 4.5), 1.4);
    g.audio.play('wave');
    this.gearSpin = true;
    const a0 = this.R.clockHand.rotation.z, a1 = -[55, 0, -55][lv] * Math.PI / 180;
    await g.tweens.add({ duration: 2.8, ease: Ease.inOut, onUpdate: (k) => {
      this.waterY = lerp(from, to, k);
      this.R.clockHand.rotation.z = lerp(a0, a1, k);
    } });
    this.gearSpin = false;
    g.flag('tide', lv);
    g.cinematic = false;
    this.tideBusy = false;
    const first = !f[`tideSeen${lv}`];
    if (first) g.flag(`tideSeen${lv}`);
    if (lv === 0) {
      await this.say([lv < fromLv ? '海がぐんぐん引いていく……。' : '', '干潮。海の底があらわれ、灯台の小島へつづく【砂州】が出てきた。', '岩山のふもとには【洞窟】の入口、右の海の中からは線路の土手……【潮の道】が顔を出した。'].filter(Boolean));
      if (first) g.note('pt-low', '干潮のとき', '灯台へつづく<b>砂州</b>、岩山の<b>洞窟</b>の入口、海の中の線路<b>潮の道</b>があらわれる。<br>船は砂の上にのってしまう。');
      if (!f.sealGone) await this.sealGoesHome();
    } else if (lv === 1) {
      await this.say(['中潮。海は岸壁の半分くらいの高さ。', '砂州も潮の道も、まだ海の中だ。']);
      if (first) g.note('pt-mid', '中潮のとき', '海は岸壁の半分くらい。砂州・洞窟・潮の道は海の中。<br>船は水に浮いている。');
      if (f.netGiven && !f.fishGot) await this.crabSail();
    } else {
      await this.say(['満潮。海が岸壁のすぐ下まで満ちてきた。']);
    }
  }

  async clickGauge() {
    this.focus(this.R.gauge, 12);
    return this.say([`潮位標。赤と白の目盛りに『干』『中』『満』のしるしがある。`, `いまの海の高さは……『${TIDE_NAME[this.tide][0]}』のあたりだ。`]);
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkSeal() {
    const g = this.g, f = g.flags;
    if (!f.introDone) { this.focus(this.seal.root, 14); return this.sealIntro(); }
    if (f.sealGone) return this.clickLighthouse();
    this.focus(this.seal.root, 14);
    g.audio.play('seal');
    if (!f.clockFixed) return this.say([{ who: 'seal', text: '月の歯車は、けさの郵便でとどくはずなんじゃ。タコの郵便屋をたずねておくれ。' }]);
    return this.say([{ who: 'seal', text: '潮時計が直ったか！ 潮がうんと引けば、砂州を渡って灯台へ帰れるんじゃがのう。' }]);
  }

  async sealIntro() {
    const g = this.g;
    g.audio.play('seal');
    await this.say([
      { who: 'seal', text: 'おお……霧のなかから列車が。よう来なすった、旅のお方。' },
      { who: 'seal', text: 'わしはあの小島の灯台守じゃ。ゆうべ、町の【潮時計】が止まってしもうてな。潮は【満潮】のまま、ちっとも引かん。' },
      { who: 'seal', text: 'おかげで灯台への砂州も沈んで、わしは帰れず、灯台に灯もともせん。灯台の光がないと、この【朝霧】ははれんのじゃ。' },
      { who: 'seal', text: 'それに、列車の線路……【潮の道】は、潮が引かんと海から出てこん。' },
      { who: 'seal', text: '潮時計には【月の歯車】がいる。古いのがすりへって、新しいのを注文しておいた。けさの郵便でとどくはずじゃ。' },
      { who: 'seal', text: 'すまんが、通りの郵便局のタコに聞いてみておくれ。' },
    ]);
    g.flag('introDone');
    g.note('pt-goal', '灯台守のことば', '潮時計が止まり、潮は<b>満潮</b>のまま。<br><b>潮の道</b>（線路）は潮が引かないと出てこない。<br>灯台の光がないと<b>朝霧</b>がはれない。<br>潮時計に入れる<b>月の歯車</b>は、けさの郵便でとどくはず。');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async sealGoesHome() {
    const g = this.g, f = g.flags;
    g.cinematic = true;
    await g.moveCamera(new V(9, 6.5, 12.5), new V(9, 1.2, 3.5), 1.4);
    g.audio.play('seal');
    await this.say([{ who: 'seal', text: 'おお、砂州が出た！ これで灯台へ帰れる。ありがとうよ！' }]);
    const s = this.seal.root;
    const pts = [SEAL_HOME, new V(7.0, Q * 0.5, 2.6), new V(7.1, 0.35, 4.3), new V(8.6, 0.38, 5.2), new V(10.0, 0.4, 5.3), new V(10.6, 1.4, 5.0), SEAL_LIGHT];
    const curve = new THREE.CatmullRomCurve3(pts);
    await g.tweens.add({ duration: 3.4, ease: Ease.inOut, onUpdate: (k) => {
      curve.getPointAt(k, s.position);
      const tg = curve.getTangentAt(Math.min(0.99, k));
      s.rotation.y = Math.atan2(tg.x, tg.z);
      s.position.y += Math.abs(Math.sin(k * 40)) * 0.06;
    } });
    s.rotation.y = -1.0;
    g.flag('sealGone');
    g.cinematic = false;
    await this.say([
      { who: 'seal', text: '（灯台の下から、アザラシが大きな声でよびかけてくる）' },
      { who: 'seal', text: '灯をともすには、新しい【芯】と【灯台の油】がいるんじゃ！' },
      { who: 'seal', text: '芯は、あんたの持っとる灯台あての小包じゃろう。油は【魚市場のペリカン】にあずけてある。そろったら、潮の引いたときに持ってきておくれ！' },
    ]);
    g.note('pt-lamp', '灯台に灯をともすには', '新しい<b>芯</b>（灯台あての小包）と<b>灯台の油</b>がいる。<br>油は<b>魚市場のペリカン</b>があずかっている。<br>灯台へは<b>干潮</b>のときだけ砂州を渡れる。');
    g.refreshQuests();
    void f;
  }

  async clickLighthouse() {
    const g = this.g, f = g.flags;
    this.focus(this.R.lighthouse, 16);
    if (this.tide !== 0) {
      if (f.sealGone) return this.say(['灯台の下で、アザラシが手をふっている。', '海が満ちていて、歩いては渡れない。声もとどかない。']);
      return this.say(['海の上の小島に立つ、白と青の灯台。てっぺんのランプは消えている。', '海が満ちていて、歩いては渡れない。']);
    }
    if (!f.sealGone) return this.say(['灯台の小島。砂州を渡って行けそうだ。']);
    return this.atLighthouse();
  }

  async atLighthouse() {
    const g = this.g, f = g.flags;
    this.focus(this.seal.root, 12);
    g.audio.play('seal');
    if (f.lit) return this.say([{ who: 'seal', text: '灯台の光で、霧はすっかりはれた。潮の道も見えておる。機関士に知らせておやり！' }]);
    const lines = [];
    if (g.has('parcel')) {
      g.take('parcel');
      g.flag('wickSet');
      g.audio.play('paper');
      lines.push({ who: 'seal', text: 'おお、小包！ ……うむ、新しい芯じゃ。さっそくランプにつけよう。' });
    }
    if (g.has('oil')) {
      g.take('oil');
      g.flag('oilSet');
      g.audio.play('water');
      lines.push({ who: 'seal', text: 'これは灯台の油！ ペリカンのやつ、よく出してくれたのう。とくとくとく……' });
    }
    if (lines.length) await this.say(lines);
    if (f.wickSet && f.oilSet) {
      await this.say([{ who: 'seal', text: 'あとは【レンズ】じゃ。ゆうべの波でずれてしもうて……三つの輪のしるしを、海のほうへそろえておくれ。' }]);
      return this.openLens();
    }
    const need = [];
    if (!f.wickSet) need.push('芯（灯台あての小包）');
    if (!f.oilSet) need.push('灯台の油');
    return this.say([{ who: 'seal', text: `灯をともすには、あと【${need.join('】と【')}】がいるんじゃ。` }]);
  }

  openLens() {
    const g = this.g;
    let pending = false;
    lensPanel(g.ui, g.audio, {
      onSolved: async (panel) => { pending = true; panel.close(); await this.lightUp(); pending = false; },
    });
    return this.waitPanel(() => pending);
  }

  async lightUp() {
    const g = this.g;
    g.cinematic = true;
    await g.moveCamera(innerWidth < innerHeight ? new V(-2, 15, 26) : new V(-4, 10, 22), new V(4, 2.5, 2), 1.8);
    this.lighting = true;
    g.audio.play('horn');
    this._applyClear(0);
    await g.wait(0.6);
    g.audio.play('chime');
    await g.tweens.add({ duration: 4.5, ease: Ease.inOut, onUpdate: (k) => { this.clear = k; this._applyClear(k); } });
    g.flag('lit');
    this.lighting = false;
    g.audio.play('gull');
    g.cinematic = false;
    await this.say([
      '灯台のてっぺんに、あたたかな光がともった。',
      '光の帯がぐるりとまわるたびに、朝霧がうすれていく……。',
      '青い空と白い町なみ。港町に、晴れた朝がきた！',
    ]);
    this.questDone('灯台に灯がともった！');
    await this.say([{ who: 'seal', text: 'ありがとうよ。これで今夜からも、船も列車も迷わずにすむ。' }]);
    await this.checkReady();
  }

  async talkOcto() {
    const g = this.g, f = g.flags;
    this.focus(this.octo.root, 13);
    g.audio.play('octo');
    if (f.mailSorted) {
      return this.say([{ who: 'octo', text: f.lit ? '霧がはれて、配達がらくちんだよ〜！' : '仕分け、ほんとに助かったよ〜。灯台への小包、たのんだからね！' }]);
    }
    if (!f.octoTalked) {
      await this.say([
        { who: 'octo', text: 'いらっしゃい、タコ局だよ〜。……あっ、ちょうどよかった！ 聞いてよ〜。' },
        { who: 'octo', text: 'けさの郵便が、満潮のしぶきでびしょぬれ。宛名がにじんで、ぜんぜん読めないんだ！' },
        { who: 'octo', text: '小包とはがき、ぜんぶで4通。中身の手がかりから、どこあてか当ててくれない？ 八本の足でも、頭はひとつしかなくてさ〜。' },
      ]);
      g.flag('octoTalked');
    }
    return this.openMail();
  }

  openMail() {
    const g = this.g;
    let pending = false;
    mailPanel(g.ui, g.audio, {
      onSolved: async (panel) => { pending = true; panel.close(); await this.mailDone(); pending = false; },
    });
    return this.waitPanel(() => pending);
  }

  async mailDone() {
    const g = this.g;
    g.flag('mailSorted');
    g.audio.play('octo');
    await this.say([
      { who: 'octo', text: 'ぜんぶわかった！ ありがと〜！ 魚市場と網小屋には、ぼくがひとっ走り配ってくるね。' },
      { who: 'octo', text: 'でも、潮見やぐらは番をしてる人がいないし……灯台は海の向こうで、ぼく行けないんだ。かわかしたら干からびちゃう。' },
      { who: 'octo', text: 'だから、この2つはきみにたのめるかな？' },
    ]);
    g.give('moonGear');
    await g.wait(0.3);
    g.give('parcel');
    g.note('pt-mail', '仕分けた郵便', '<b>月の歯車</b>（二十八の歯）→ 潮見やぐら（潮時計）<br><b>灯台あての小包</b>（すすの出にくい芯）→ 灯台<br>氷のはがき → 魚市場　／　つくろい糸 → 網小屋');
  }

  async talkPelican() {
    const g = this.g, f = g.flags;
    this.focus(this.pelican.root, 13);
    g.audio.play('pelican');
    if (f.fishGiven) return this.say([{ who: 'pelican', text: f.lit ? 'へい、らっしゃい！ 晴れた朝の朝市は、気持ちがいいねえ！' : '朝市、はじまりだよ！ 灯台の油、灯台守にたのんだよ。' }]);
    if (g.has('fish')) return this.giveFish();
    if (!f.pelicanTalked) {
      g.flag('pelicanTalked');
      g.note('pt-oil', 'ペリカンの魚屋', '<b>灯台の油</b>をあずかっている。<br>満潮のまま潮が止まって、けさは魚が一匹もない。<b>魚</b>をとどければ、油を出してくれる。');
      return this.say([
        { who: 'pelican', text: 'へい、らっしゃ……いや、すまんね。けさは売るもんがひとつもないんだ。' },
        { who: 'pelican', text: '潮が止まったせいで、漁師が沖へ出られなかったのさ。魚のない朝市なんて、くちばしのないペリカンみたいなもんだよ。' },
        { who: 'pelican', text: f.sealGone ? '灯台の油？ ああ、灯台守からあずかってるよ。……そうだ、魚を一匹でも持ってきてくれたら、すぐ出してやるよ。朝市を開けりゃ、こっちも手があくからね。' : '灯台守からあずかってる油もあるんだが、こんなじゃ店番で手いっぱいでさ。魚さえあればねえ。' },
      ]);
    }
    return this.say([{ who: 'pelican', text: '魚を一匹でも持ってきてくれたら、灯台の油はすぐ出すよ。魚は……漁師がとってくるもんさ。' }]);
  }

  async giveFish() {
    const g = this.g;
    g.take('fish');
    g.audio.play('pelican');
    await this.say([
      { who: 'pelican', text: 'おおっ、朝どれのアジ！ ぴちぴちだ！ これで朝市が開けるよ！' },
      { who: 'pelican', text: '約束だ、灯台の油を持っていきな。灯台守によろしくな！' },
    ]);
    this.R.fishDisplay.visible = true;
    this.R.noFish.visible = false;
    g.flag('fishGiven');
    g.give('oil');
    this.pelican.hop();
    this.questDone('朝市が開いた！');
    await this.checkReady();
  }

  async talkCrab() {
    const g = this.g, f = g.flags;
    if (this.sailing) return;
    this.focus(this.crab.root, 13);
    g.audio.play('crab');
    if (f.fishGot) return this.say([{ who: 'crab', text: '大漁だったぜ！ アジはペリカンのとこへ持ってってくれ。' }]);
    if (g.has('net')) return this.giveNet();
    if (f.netGiven) return this.crabTrySail();
    if (!f.crabTalked) {
      g.flag('crabTalked');
      g.note('pt-net', 'カニの漁師の網', 'ゆうべの大波で、網が流された。<br>左の<b>岩山の洞窟</b>のほうへ流れていった。<br>洞窟の入口は、潮がうんと引かないと出てこない。');
      return this.say([
        { who: 'crab', text: 'よう、旅の。……沖へ出られなくて、はさみがうずうずしてるところさ。' },
        { who: 'crab', text: 'それどころか、ゆうべの大波で【網】が流されちまった。ふわーっと、左の【岩山の洞窟】のほうへな。' },
        { who: 'crab', text: 'あの洞窟、潮がうんと引かねえと入口が出てこねえんだ。網さえあれば、すぐにでも漁に出るんだが。' },
      ]);
    }
    return this.say([{ who: 'crab', text: '網は岩山の洞窟のほうへ流れていった。潮がうんと引けば、入口が出てくるはずだ。' }]);
  }

  async giveNet() {
    const g = this.g;
    g.take('net');
    g.flag('netGiven');
    this.R.boatNet.visible = true;
    g.audio.play('crab');
    await this.say([
      { who: 'crab', text: 'おおっ、おれの網！ 洞窟まで行ってくれたのか！ 恩にきるぜ。' },
      { who: 'crab', text: 'さっそく沖へ……と言いてえとこだが、ひとつ問題がある。' },
      { who: 'crab', text: '沖へ出るには、あの【石橋】の下をくぐるんだ。潮が高すぎりゃマストが橋につかえるし、低すぎりゃ船底が海の底につかえる。' },
    ]);
    g.note('pt-bridge', '漁船と石橋', '漁船は<b>石橋</b>の下をくぐって沖へ出る。<br>潮が高すぎると<b>マスト</b>が橋につかえ、低すぎると<b>船底</b>がつかえる。');
    return this.crabTrySail();
  }

  async crabTrySail() {
    const g = this.g, tide = this.tide;
    if (tide === 1) return this.crabSail();
    if (tide === 2) return this.say([{ who: 'crab', text: 'いまは満潮だ。船が浮きすぎて、マストが石橋につかえちまう。' }]);
    return this.say([{ who: 'crab', text: 'いまは干潮だ。見ろよ、船が砂の上にのっかっちまってる。' }]);
  }

  async crabSail() {
    const g = this.g, R = this.R;
    g.cinematic = true;
    this.sailing = true;
    g.audio.play('crab');
    await this.say([{ who: 'crab', text: 'おーい！ この潮なら、ちょうど石橋をくぐれるぜ！ 行ってくる！' }]);
    await g.moveCamera(innerWidth < innerHeight ? new V(5, 9, 18) : new V(6, 6.5, 15), new V(-1.5, 1.2, 7.0), 1.4);
    this.crab.hop();
    const c0 = this.crab.root.position.clone();
    const onBoat = R.boat.localToWorld(new V(0, 0.44, -0.05));
    await g.tweens.add({ duration: 0.6, onUpdate: (k) => { this.crab.root.position.lerpVectors(c0, onBoat, k); this.crab.root.position.y += Math.sin(k * Math.PI) * 0.6; } });
    this.crabOnBoat = true;
    this.crab.root.rotation.y = 0;
    const y = R.boat.position.y;
    const zA = BOAT_HOME.z, zB = 10.1;
    g.audio.play('chuff');
    await g.tweens.add({ duration: 3.4, ease: Ease.inOut, onUpdate: (k) => { R.boat.position.set(BOAT_HOME.x, y + Math.sin(k * 20) * 0.02, lerp(zA, zB, k)); } });
    g.audio.play('splash');
    await g.wait(0.5);
    g.audio.play('splash');
    await g.wait(0.6);
    R.boatFish.visible = true;
    g.audio.play('gull');
    await g.tweens.add({ duration: 3.4, ease: Ease.inOut, onUpdate: (k) => { R.boat.position.set(BOAT_HOME.x, y + Math.sin(k * 20) * 0.02, lerp(zB, zA, k)); } });
    this.crabOnBoat = false;
    this.crab.root.position.copy(c0);
    this.crab.root.rotation.y = 0.7;
    this.crab.hop();
    this.sailing = false;
    g.cinematic = false;
    g.flag('fishGot');
    this.focus(this.crab.root, 12);
    await this.say([
      { who: 'crab', text: '大漁、大漁！ ぴちぴちの朝どれアジだ！' },
      { who: 'crab', text: 'いちばんいいのを一匹、礼に持ってけ。ペリカンのやつ、朝市が開けなくてしょげてたろ？' },
    ]);
    g.give('fish');
  }

  async talkFrog() {
    this.focus(this.frog.root);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.clockFixed && f.fishGiven && f.lit) {
      if (this.tide === 0) return this.finale();
      return this.say([{ who: 'frog', text: '霧ははれたケロ！ でも潮の道が海の中ケロ……。潮を、うんと引かせてほしいケロ！' }]);
    }
    if (f.lit) return this.say([{ who: 'frog', text: '霧がはれたケロ！ あとすこしケロ！' }]);
    if (this.tide === 0) return this.say([{ who: 'frog', text: '潮の道が出たケロ！ でも、霧で先がまっ白ケロ……灯台の光がほしいケロ。' }]);
    await this.say([{ who: 'frog', text: '線路の先が、海の中にもぐっちゃってるケロ……。それに霧でなんにも見えないケロ。' }]);
  }

  // =========================================================
  // 場所
  // =========================================================
  async clickCave() {
    const g = this.g, f = g.flags;
    this.focus(this.R.cave, 14);
    if (this.tide !== 0) {
      if (this.tide === 1) return this.say(['岩山のふもと。波のあいだに、岩のすき間がちらりと見える。', 'まだ海の中で、入れそうにない。']);
      return this.say(['ごつごつした岩山。ふもとは深い海の中だ。']);
    }
    if (f.netGot) return this.say(['潮の引いた洞窟。ひんやりして、波の音がこだまする。']);
    this.R.caveNet.visible = false;
    g.flag('netGot');
    g.audio.play('splash');
    await this.say(['潮が引いて、岩山のふもとに洞窟の入口があらわれている。', '砂の上を歩いて中をのぞくと……浮き玉のついた大きな網が、岩にひっかかっていた！']);
    g.give('net');
  }

  async clickSandbar() {
    const g = this.g;
    this.focus(this.R.stairs, 14);
    if (this.tide === 0) {
      if (g.flags.sealGone) return this.clickLighthouse();
      return this.say(['海への石段。下は砂州につづいている。']);
    }
    return this.say([`海への石段。${this.tide === 2 ? '数段下からは、もう海の中だ。' : '途中から海の中だ。'}`, 'その先の海の底に、白い砂がうっすら盛りあがって見える。']);
  }

  async clickTidePool() {
    this.focus(this.R.tidePool, 12);
    if (this.tide !== 0) return this.say(['海の底の岩場。ゆらゆらと海藻がゆれている。']);
    return this.say(['潮だまり。小さなヒトデが、のんびり日なたぼっこしている。']);
  }

  async clickBridge() {
    const f = this.g.flags;
    this.focus(this.R.bridge, 18);
    const lines = ['港をかこむ石の防波堤。まん中が【石橋】になっていて、船はその下をくぐって沖へ出る。'];
    if (this.tide === 2) lines.push('いまは満潮。アーチの下の すき間が、ずいぶんせまく見える。');
    else if (this.tide === 0) lines.push('いまは干潮。アーチの下は、海の底の砂が見えるほど浅い。');
    else lines.push('いまは中潮。アーチの下は、ちょうどいい高さに見える。');
    if (f.netGiven && !f.fishGot && this.tide !== 1) lines.push('（船がくぐれる潮の高さは……）');
    return this.say(lines);
  }

  async clickCauseway() {
    this.focus(this.R.causeway, 16);
    if (this.tide === 0) return this.say(['潮の道。海から顔を出した線路の土手が、霧の向こうへつづいている。']);
    return this.say(['線路は坂をくだって、そのまま海の中へもぐっている。', '海の底に、まっすぐな土手と線路が見える……これが【潮の道】だ。']);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    if (target === 'boat' || target === 'pier') target = 'crab';
    if (target === 'market') target = 'pelican';
    if (target === 'postOffice') target = 'octo';
    if (target === 'lighthouse' || target === 'sandbar' || target === 'stairs') target = f.sealGone ? 'seal' : target;
    if (item === 'moonGear' && target === 'tideClock') return this.fixClock();
    if (item === 'net' && target === 'crab') { this.focus(this.crab.root, 13); return this.giveNet(); }
    if (item === 'fish' && target === 'pelican') { this.focus(this.pelican.root, 13); return this.giveFish(); }
    if ((item === 'parcel' || item === 'oil') && target === 'seal') {
      if (!f.sealGone) return this.say([{ who: 'seal', text: item === 'oil' ? 'それは灯台の油！ 灯台に帰ってから、ランプに入れよう。' : 'それは灯台あての……わしあての小包じゃ！ 灯台に帰ってから開けよう。' }]);
      if (this.tide !== 0) return this.clickLighthouse();
      return this.atLighthouse();
    }
    if (item === 'moonGear') return this.say(['月の歯車。広場の潮時計の穴に、ぴったり合いそうだ。']);
    if (item === 'net' && target === 'cave') return this.say(['網はもう拾った。']);
    if (item === 'fish' && target === 'crab') return this.say([{ who: 'crab', text: 'そいつはペリカンにとどけてやんな。' }]);
    if (item === 'fish' && target === 'octo') return this.say([{ who: 'octo', text: 'ぼくに？ うーん、魚はペリカンさんのところがいいよ〜。' }]);
    const talkers = { seal: 'それは、あんたが持っておくといい。', octo: 'それは郵便じゃないよ〜。', crab: 'それじゃ漁はできねえな。', pelican: 'それは売りもんにならないねえ。', frog: 'それはボイラーには入れられないケロ。' };
    if (talkers[target]) return this.say([{ who: target, text: talkers[target] }]);
    return this.say(['ここでは使えないようだ。']);
  }

  // =========================================================
  // オープニング・フィナーレ・発車
  // =========================================================
  async opening() {
    const g = this.g;
    g.cinematic = true;
    const s0 = this.stopS;
    this.train.s = s0 - 75;
    this.train.place();
    g.camera.position.set(14, 10, 12);
    g.controls.target.set(-14, 4, -6);
    await g.ui.fade(0, 1.4);
    g.audio.play('whistle');
    const start = this.train.s;
    let last = start;
    const camFrom = g.camera.position.clone();
    await g.tweens.add({ duration: 8, ease: Ease.out, onUpdate: (k) => {
      const s = lerp(start, s0, k);
      this.train.advance(s - last);
      last = s;
      if (Math.random() < 0.15 * (1 - k)) g.audio.play('chuff');
      g.controls.target.lerp(this.train.loco.g.position, 0.08);
      g.camera.position.lerpVectors(camFrom, new V(8, 8, 9), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('潮の港町', `STAGE ${stageNo('port')}`, 2400);
    await g.say([
      'ほしまわり号は、朝霧につつまれた港町に着いた。',
      '白い壁に青い屋根。カモメの声と、波の音がきこえる。',
      '……けれど、霧が深くて、海の向こうはまっ白だ。',
    ]);
    await g.moveCamera(new V(-1, 6 + Q, 3), new V(-4, 1.2 + Q, -5), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'たいへんケロ！ 線路の先が、海の中にもぐっちゃってるケロ！' },
      { who: 'frog', text: 'あそこの階段の上にいる、灯台守さんに聞いてみるケロ。' },
    ]);
    await g.moveCamera(new V(12, 7, 11), new V(9.5, 0.8, -3), 2.0);
    await g.wait(0.8);
    await g.moveCamera(innerWidth < innerHeight ? new V(9, 10, 14) : new V(10, 7, 10), new V(7, 2.2, 0.5), 1.8);
    g.cinematic = false;
    await this.talkSeal();
  }

  async finale() {
    const g = this.g;
    await this.say([
      { who: 'frog', text: '潮の道が出てるケロ！ 霧もはれたケロ！ 出発するケロ〜！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    await g.moveCamera(new V(8, 8, 15), new V(10, 2, 3), 2.0);
    g.audio.play('horn');
    for (const c of [this.octo, this.crab, this.pelican, this.seal]) c.hop();
    await this.say([
      '灯台の下で、アザラシが大きく手をふっている。',
      { who: 'seal', text: 'おーい！ 達者でなあ！ 海の上の道は、きょうも灯台が照らしとるぞ！' },
      { who: 'octo', text: 'またおいでね〜！ 手紙、書くよ〜！' },
    ]);
    await g.moveCamera(new V(-1, 6 + Q, 3), new V(-4, 1.2 + Q, -5), 1.8);
    await this.say([
      { who: 'frog', text: '次は『じょうかまち』ケロ！ なんだか勇ましい町らしいケロ！' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
    g.flag('departed');
    g.refreshQuests();
    await this.departure();
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(15.5, 5.5, 2.5), new V(8, 1.5, -6), 2.0);
    g.audio.play('whistle');
    await g.wait(1.4);
    this.departing = true;
    g.tweens.add({ duration: 7, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6; } });
    await g.moveCamera(new V(17, 5, 4), new V(14, 1, -6), 6);
    g.audio.play('whistle');
    await g.wait(2.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'port'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'port', '灯台の光に見送られて、ほしまわり号は海の上の道を走っていく。');
  }
}
