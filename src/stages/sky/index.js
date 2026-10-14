import * as THREE from 'three';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs, Butterflies, Birds } from '../../lib/environment.js';
import { makeFrog } from '../../lib/creatures.js';
import { makeSheep, makeAlpaca, makeSwallow, makeTortoise, makeMomonga, makeWhale } from '../../lib/creatures-sky.js';
import { lerp, damp, softCircleTexture } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildRails } from '../../lib/rails.js';
import { Ease } from '../../core/tween.js';
import { el } from '../../core/ui.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildSkyDiorama, TRACK_Z } from './diorama.js';
import { letterHTML, bellPanel, pipePanel } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  mayor: { name: 'ヒツジの町長', icon: '🐑', color: '#c84a6a', voice: 560 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  alpaca: { name: 'アルパカの仕立て屋', icon: '🦙', color: '#b8885a', voice: 680 },
  swallow: { name: 'ツバメの郵便屋', icon: '🐦', color: '#3a4a8a', voice: 1300 },
  tortoise: { name: 'カメの時計台守', icon: '🐢', color: '#5a8a3a', voice: 200 },
  momonga: { name: 'モモンガの気球乗り', icon: '🐿️', color: '#8a6a4a', voice: 1100 },
  whale: { name: '空クジラ', icon: '🐋', color: '#4a6ab0', voice: 120 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

/** 線路：左上の空から降りてきて、島を横切り、右の空へのぼっていく */
function makeSkyPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-95, 32, 45), new V(-62, 26, 24), new V(-34, RAIL_Y, TRACK_Z), new V(-16, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-16, RAIL_Y, TRACK_Z), new V(16, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(16, RAIL_Y, TRACK_Z), new V(32, RAIL_Y, TRACK_Z), new V(46, 6, -14), new V(62, 13, -30)));
  p.add(new THREE.CubicBezierCurve3(new V(62, 13, -30), new V(78, 20, -46), new V(94, 24, -62), new V(112, 26, -84)));
  p.arcLengthDivisions = 800;
  return p;
}

/**
 * ステージ 2：天空の街
 * 目的：止まった大風車を直して、線路をふさぐ雨雲を吹きとばす
 */
export class SkyStage {
  constructor(game) {
    this.g = game;
    this.id = 'sky';
    this.title = '天空の街';
    this.questTitle = '🌀 大風車をふたたび回す';
    this.hasRoof = false;
    this.roofLifted = false;
    this.millSpeed = 0;
    this.stormT = 1; // 1=雨雲あり
    this.flashT = 4;
    this.departing = false;
    this.trainSpeed = 0;
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('sky');

    // 朝の明るい空
    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#3f7fe0'); u.dMid.value.set('#9fcfff'); u.dBot.value.set('#eaf6ff');
    u.sunDir.value.set(-0.5, 0.55, -0.65).normalize();
    u.moonDir.value.set(0.6, -0.8, 0).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#b8d6f6', 70, 230);
    // 白が多い箱庭なので、露出とブルームを控えめに
    g.renderer.toneMappingExposure = 0.9;
    g.bloom.strength = 0.32;
    g.bloom.threshold = 0.9;
    this.hemi = new THREE.HemisphereLight('#d8e8ff', '#7a8a5a', 0.95);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff0d8', 2.3));
    sun.position.set(-12, 26, 14);
    sun.castShadow = true;
    const sm = g.low ? 1024 : window.innerWidth > 900 ? 4096 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 80;
    // 影のしましま（シャドウアクネ）が出ないよう、少し大きめにずらす
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: 30, d: 22, seed: 7, grass: '#9cc96a' });
    scene.add(this.island);
    this.clouds = makeClouds(17);
    this.clouds.userData.mat.color.set('#dfe9f8');
    this.clouds.userData.mat.emissive.set('#8fb0e0');
    this.clouds.userData.mat.emissiveIntensity = 0.1;
    scene.add(this.clouds);
    this.smallIslands = [[-58, 4, -36, 4, 11], [52, -2, 30, 3, 12], [-72, 12, 20, 5, 13], [-28, -6, 62, 4, 15], [70, 6, 10, 3, 16]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車
    this.path = makeSkyPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 16; // 機関車が x=0 に止まる位置
    const L = this.path.getLength();
    this.tracks = buildRails(scene, this.path, { z: TRACK_Z, pillars: [cl[0] - 6, cl[0] - 12, cl[0] - 18, cl[1] + 4, cl[1] + 8, cl[1] + 12, cl[1] + 16].filter((s) => s > 0 && s < L) });
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();

    const R = (this.R = buildSkyDiorama(scene));
    R.lampGlass = R.lampGlass.map((e) => (e.isMaterial ? { material: e, base: e.emissiveIntensity } : e));
    R.lights.forEach((L2) => { L2.userData.base = L2.intensity; });

    // パーティクル
    this.smoke = new Puffs(scene, { count: 70, color: '#f8f8ff', opacity: 0.75 });
    this.spray = new Puffs(scene, { count: 40, color: '#d8f0ff', opacity: 0.55 });
    this.wind = new Puffs(scene, { count: 60, color: '#ffffff', opacity: 0.5 });
    this.butterflies = new Butterflies(scene, [new V(-2.2, 0.2, 7.3), new V(12.8, 0.2, 9.0), new V(-12.6, 0.2, -3.2), new V(6.8, 0.2, 1.6)]);
    this.birds = new Birds(scene, 6, 9);
    this.sparkles = this._makeSparkles(scene);

    this._placeCreatures(scene);
    this._registerInteractables();
    this._optimize();

    g.ui.onLine = (who) => {
      const c = this.speakerCreature(who);
      if (c) c.talk(2.2);
    };
  }

  _optimize() {
    if (new URLSearchParams(location.search).has('nomerge')) return; // 調査用
    const creatureRoots = new Set(this.creatures.map((c) => c.root));
    const roots = [this.island, this.tracks, this.R.root, ...this.smallIslands.map((s) => s.o)];
    for (const [, it] of this.g.interactables) if (!creatureRoots.has(it.object)) roots.push(it.object);
    for (const c of this.creatures) c.root.traverse((o) => { if (o !== c.root && !o.isMesh) o.userData.dynamic = true; });
    this.whale.lids.forEach((l) => { l.userData.keep = true; });
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
    const R = this.R;
    this.mayor = makeSheep();
    this.mayor.root.position.set(1.8, 0, 5.3);
    this.mayor.root.rotation.y = -0.35;
    this.frog = makeFrog();
    this.frog.root.position.set(3.9, 0, -4.1);
    this.frog.root.rotation.y = -0.5;
    this.alpaca = makeAlpaca();
    this.alpaca.root.position.set(-8.3, 0, 0.9);
    this.alpaca.root.rotation.y = 0.7;
    this.swallow = makeSwallow();
    this.swallow.root.position.copy(R.swallowPerch);
    this.swallow.root.scale.setScalar(1.15);
    this.tortoise = makeTortoise();
    this.tortoise.root.position.set(-8.1, 0, 7.5);
    this.tortoise.root.rotation.y = 0.35;
    this.momonga = makeMomonga();
    this.momonga.root.position.set(-0.15, -0.3, 0.1);
    R.basket.add(this.momonga.root);
    this.whale = makeWhale();
    this.whale.root.position.set(-10.9, 1.35, -8.25);
    this.whale.root.rotation.y = Math.PI / 2;
    this.whale.setSleeping(true);
    for (const c of [this.mayor, this.frog, this.alpaca, this.swallow, this.tortoise, this.whale]) scene.add(c.root);
    this.creatures = [this.mayor, this.frog, this.alpaca, this.swallow, this.tortoise, this.momonga, this.whale];
  }

  speakerCreature(who) {
    return { mayor: this.mayor, frog: this.frog, alpaca: this.alpaca, swallow: this.swallow, tortoise: this.tortoise, momonga: this.momonga, whale: this.whale }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('mayor', this.mayor.root, 'ヒツジの町長', () => this.talkMayor());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    reg('alpaca', this.alpaca.root, 'アルパカの仕立て屋', () => this.talkAlpaca());
    reg('swallow', this.swallow.root, 'ツバメの郵便屋', () => this.talkSwallow());
    reg('tortoise', this.tortoise.root, 'カメの時計台守', () => this.talkTortoise());
    reg('momonga', this.momonga.root, 'モモンガの気球乗り', () => this.talkMomonga());
    reg('whale', this.whale.root, '空クジラ', () => this.clickWhale());
    reg('balloon', R.balloon, '気球', () => this.talkMomonga());
    reg('winch', R.winch, '巻き上げ機', () => this.clickWinch());
    reg('fountain', R.fountain, '噴水', () => this.clickFountain());
    reg('tower', R.tower, '時計台', () => this.say(['町の時計台。てっぺんの鐘楼に、5つの鐘がならんでいる。', '鐘には【赤・白・黄・青・緑】のリボンが結ばれている。']));
    reg('chest', R.chest, '鈴の宝箱', () => this.clickChest());
    reg('tailor', R.tailor, '仕立て屋', () => this.talkAlpaca());
    reg('post', R.post, '郵便局', () => this.talkSwallow());
    reg('arch', R.arch, 'バラのアーチ', () => this.clickArch());
    reg('windmill', R.windmill, '大風車', () => this.clickWindmill());
    reg('cave', R.cave, '風穴', () => this.clickCave());
    reg('panel', R.pipePanel, '風の配管盤', () => this.clickPanel());
    reg('storm', R.storm, '雨雲', () => this.say(this.g.flags.windDone
      ? ['雨雲はすっかり吹きとばされた。']
      : ['線路の先に、どんよりとした雨雲がいすわっている。ときどきゴロゴロと雷が鳴る。', 'これでは列車が進めない。']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『てんくうのまち』……左は『はざま』、右は『おんせんがい』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。シュッシュッと蒸気をはきながら、出発を待っている。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。窓ぎわのあなたの席が見える。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  applyState() {
    const f = this.g.flags, R = this.R;
    R.fountainCotton.visible = !f.cotton_fountain;
    R.basketCotton.visible = !f.cotton_balloon;
    R.nestCotton.visible = !f.cotton_nest;
    R.letter.visible = !f.letterFound;
    R.rust.visible = !f.winchOiled;
    R.balloon.position.y = f.balloonDown ? 1.15 : R.balloonBase.y;
    const sail = !!f.sailFixed;
    R.sailCloths[2].visible = sail;
    R.tornCloth.visible = !sail;
    R.millGear.visible = !!f.gearFixed;
    R.chestLid.rotation.x = f.chestOpen ? -1.9 : 0;
    R.gearInChest.visible = false;
    this.whale.setSleeping(!f.whaleMoved);
    this.whaleFree = !!f.whaleMoved;
    if (!f.whaleMoved) {
      this.whale.root.position.set(-10.9, 1.35, -8.25);
      this.whale.root.rotation.set(0, Math.PI / 2, 0);
    }
    R.pipeMat.emissiveIntensity = f.pipesDone ? 0.8 : 0;
    R.panelLampMat.color.set(f.pipesDone ? '#5aff8a' : '#ff5a4a');
    R.panelLampMat.emissive.set(f.pipesDone ? '#5aff8a' : '#ff5a4a');
    this.millSpeed = f.windDone ? 1.2 : 0;
    this.stormT = f.windDone ? 0 : 1;
    this._applyStorm();
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  _applyStorm() {
    const R = this.R, k = this.stormT;
    R.storm.visible = k > 0.01;
    R.storm.scale.setScalar(0.3 + 0.7 * k);
    R.storm.position.x = 23 + (1 - k) * 18;
    R.stormMat.opacity = k;
    R.rain.material.opacity = 0.6 * k;
    R.rainbow.visible = k < 0.6;
    R.rainbowMats.forEach((m) => { m.opacity = (1 - k) * 0.45; });
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R, f = g.flags;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.butterflies.update(dt, t, 0);
    this.birds.update(dt, t);
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.005;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    for (const d of R.driftClouds) {
      d.c.position.x = ((d.x + t * 0.4 + 30) % 36) - 18;
      d.c.position.y = d.y + Math.sin(t * 0.3 + d.z) * 0.3;
    }
    for (const v of R.vanes) if (v) v.userData.arrow.rotation.y = (f.windDone ? 0 : Math.sin(t * 0.3 + v.position.x) * 0.6) + (f.windDone ? -0.2 : 0);
    R.flag.rotation.y = Math.sin(t * 3) * 0.3;
    R.clockHand.rotation.z = -t * 0.05;

    // 気球のゆれ
    const bl = R.balloon;
    bl.position.x = R.balloonBase.x + Math.sin(t * 0.5) * (f.balloonDown ? 0.05 : 0.35);
    bl.position.z = R.balloonBase.z + Math.cos(t * 0.4) * (f.balloonDown ? 0.05 : 0.25);
    bl.rotation.z = Math.sin(t * 0.6) * 0.04;
    const top = new V(0, -0.85, 0).applyMatrix4(bl.matrixWorld);
    const bottom = new V(11.8, 0.75, -0.3);
    const len = top.distanceTo(bottom);
    R.rope.position.copy(top).add(bottom).multiplyScalar(0.5);
    R.rope.scale.set(1, len, 1);
    R.rope.quaternion.setFromUnitVectors(new V(0, 1, 0), top.clone().sub(bottom).normalize());

    // 噴水のしぶき
    if (Math.random() < dt * 8) {
      this.spray.emit(R.fountainTop, { vel: new V((Math.random() - 0.5) * 1.5, 2.2, (Math.random() - 0.5) * 1.5), spread: 0.3, life: 0.9, size0: 0.1, size1: 0.4 });
    }
    // 風車
    R.sails.rotation.z -= this.millSpeed * dt;
    R.millGear.rotation.z += this.millSpeed * dt * 2.2;
    // 風穴の風
    if (f.whaleMoved && Math.random() < dt * 5) {
      this.wind.emit(R.caveMouth, { vel: new V((Math.random() - 0.5) * 1.5, 0.6, 2.5), spread: 0.5, life: 1.6, size0: 0.2, size1: 0.9 });
    }
    if (this.millSpeed > 0.3 && Math.random() < dt * 6 * Math.min(1, this.millSpeed)) {
      const p = new V(8.8 + (Math.random() - 0.5) * 6, 5 + Math.random() * 4, -7.5);
      this.wind.emit(p, { vel: new V(6, 0.2, 0.5), spread: 0.6, life: 2.2, size0: 0.3, size1: 1.4 });
    }
    // クジラ
    if (this.whaleFree && !this.whaleLeaving) {
      const a = t * 0.06 + 2.0;
      const w = this.whale.root;
      w.position.set(Math.cos(a) * 24, 7 + Math.sin(t * 0.4) * 0.8, Math.sin(a) * 18);
      w.rotation.set(0, Math.atan2(-Math.sin(a) * 24, Math.cos(a) * 18), 0);
    } else if (!this.whaleFree) {
      this.whale.root.position.y = 1.35 + Math.sin(t * 0.8) * 0.06;
    }
    // 雨雲と雷
    if (this.stormT > 0.01) {
      this.flashT -= dt;
      if (this.flashT < 0) {
        this.flashT = 3 + Math.random() * 5;
        this.flashOn = 0.18;
        if (Math.random() < 0.4 && g.playing) g.audio.play('thunder');
      }
      if (this.flashOn > 0) { this.flashOn -= dt; R.stormLight.intensity = 30 * this.stormT * (Math.random() > 0.3 ? 1 : 0.2); } else R.stormLight.intensity = 0;
      const pos = R.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 2) {
        let y = pos.getY(i) - dt * 8;
        if (y < -1.5) y += 5;
        pos.setY(i, y); pos.setY(i + 1, y - 0.5);
      }
      pos.needsUpdate = true;
    }
    // 煙
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.6;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.4, 0), spread: 0.5, life: heavy ? 2.4 : 3.2, size0: 0.5, size1: heavy ? 3.2 : 2.4 });
    }
    this.smoke.update(dt);
    this.spray.update(dt);
    this.wind.update(dt);

    // 発車
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0 && this.train.s < this.stopS + 40) { this.chuffT = 0.5; g.audio.play('chuff'); }
      if (this.followTrain) {
        const lp = this.train.loco.g.position;
        const k = this.followK;
        g.controls.target.lerp(lp, 1 - Math.exp(-3 * dt));
        const want = lp.clone().add(new V(-14 - k * 10, 6 + k * 10, 18 + k * 8));
        g.camera.position.lerp(want, 1 - Math.exp(-1.2 * dt));
      }
    }

    // きらめき
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
    if (!f.introDone) return [{ text: '広場のヒツジの町長に話しかけよう', done: false }];
    const all = f.sailFixed && f.gearFixed && f.pipesDone;
    const q = [
      { text: '🪁 風車の帆を張りなおす', done: !!f.sailFixed },
      { text: '⚙️ 風車の歯車をとりもどす', done: !!f.gearFixed },
      { text: '🌬 風の通り道をつなぐ', done: !!f.pipesDone },
    ];
    if (all) q.push({ text: '🐑 町長に知らせる', done: !!f.departed });
    if (f.alpacaTalked && !f.sailMade) q.push({ text: `☁ 雲のわた（${this.cottonCount()}/3）`, done: this.cottonCount() >= 3, sub: true });
    return q;
  }

  cottonCount() {
    const f = this.g.flags;
    if (f.sailMade) return 3;
    return ['cotton_fountain', 'cotton_balloon', 'cotton_nest'].filter((k) => f[k]).length;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    if (!f.introDone) return H('intro', '広場の噴水のそばにいる、ヒツジの町長に話しかけよう。');
    if (f.sailFixed && f.gearFixed && f.pipesDone) return H('final', '準備は整った！ 広場のヒツジの町長に知らせよう。');
    const steps = [];
    // 帆
    if (!f.sailFixed) {
      if (has('sail')) steps.push(H('useSail', '持ち物の『雲の帆』を選んで、大風車に使おう。'));
      else if (!f.alpacaTalked) steps.push(H('alpaca', '帆のことなら仕立て屋さん。町の西にある、ピンクの屋根の仕立て屋のアルパカを訪ねよう。'));
      else if (this.cottonCount() >= 3) steps.push(H('weave', '雲のわたが3つそろった！ アルパカに渡そう。'));
      else {
        if (!f.cotton_fountain) steps.push(H('cFountain', '雲のわたは、水に浮かんでいることも……', '広場の噴水を調べてみよう。'));
        if (!f.cotton_balloon) {
          if (f.balloonDown) steps.push(H('cBalloon', '地上におりた気球のモモンガに話しかけよう。'));
          else if (has('oilCan')) steps.push(H('oil', '空に浮かぶ気球のモモンガが、降りられなくて困っている。巻き上げ機がさびついているらしい。', '持ち物の『油さし』を選んで、巻き上げ機に使おう。'));
          else if (!f.frogTalked) steps.push(H('frog', '列車のそばのカエルの機関士が、役に立つ道具を持っているかも。'));
        }
        if (!f.cotton_nest) {
          if (f.letterFound) steps.push(H('showLetter', '郵便局のツバメに、見つけた手紙を見せよう。'));
          else if (!f.swallowTalked) steps.push(H('swallow', '郵便局のツバメが、何か困っているみたい。'));
          else steps.push(H('letter', '手紙は風に飛ばされて、町の東のほうへ……', '右手前の『バラのアーチ』を調べよう。'));
        }
      }
    }
    // 歯車
    if (!f.gearFixed) {
      if (has('gear')) steps.push(H('useGear', '持ち物の『風車の歯車』を選んで、大風車に使おう。'));
      else if (!f.tortoiseTalked && !has('letter')) steps.push(H('tortoise', '時計台の下にいるカメのおじいさんに、話を聞いてみよう。'));
      else if (!f.letterRead) {
        if (has('letter')) steps.push(H('deliver', '『風に飛ばされた手紙』は、カメのおじいさんあてだ。届けてあげよう。'));
        else if (!f.swallowTalked) steps.push(H('swallow2', 'カメのおじいさんは孫からの手紙を待っている。郵便局のツバメに聞いてみよう。'));
        else steps.push(H('letter2', '飛ばされた手紙は、町の東のほう……', '右手前の『バラのアーチ』を調べよう。'));
      } else if (!f.chestOpen) {
        steps.push(H('chest', '時計台のそばの宝箱の鈴を「そらのうた」の順に鳴らそう。持ち物の『孫からの手紙』を2回押すと読み返せる。', '☾(ソ) → ★(ミ) → ☁(レ) → ☀(ド) → ☁(レ) → ★(ミ) の順だ。'));
      }
    }
    // 風
    if (!f.pipesDone) {
      if (!f.whaleMoved) steps.push(H('whale', '風穴の前で空クジラが眠っていて、風がせきとめられている。', '町長にもらった『星のこんぺいとう』を選んで、クジラに使おう。'));
      else steps.push(H('pipes', '大風車の手前にある『風の配管盤』を調べて、風の道をつなごう。', '風穴（左）からいったん上の段に回りこみ、右へ進んでから下におりて、風車（右）へ。'));
    }
    return steps[0] || H('none', 'あちこち調べてみよう。');
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
    return this.g.focusOn(new V(p.x, Math.min(4, Math.max(0.8, p.y + 0.6)), p.z), { dist: Math.min(cur, dist ?? 22), duration: 0.8, subject: obj.isObject3D ? obj : undefined });
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

  /** 雲のわたを手に入れる */
  async getCotton(flag, obj) {
    const g = this.g;
    if (obj) obj.visible = false;
    g.flag(flag);
    g.give('cotton');
    g.refreshQuests();
    const n = this.cottonCount();
    if (n >= 3 && !g.flags.sailMade) {
      await this.say([`雲のわたが ${n} つそろった！ 仕立て屋のアルパカに持っていこう。`]);
    }
  }

  // =========================================================
  // 住人との会話
  // =========================================================
  async talkMayor() {
    const g = this.g, f = g.flags;
    this.focus(this.mayor.root, 18);
    g.audio.play('baa');
    if (!f.introDone) return this.mayorIntro();
    if (f.sailFixed && f.gearFixed && f.pipesDone) return this.finale();
    const lines = [{ who: 'mayor', text: '大風車の具合はいかがですかメェ？' }];
    const miss = [];
    if (!f.sailFixed) miss.push('破れた【帆】');
    if (!f.gearFixed) miss.push('なくなった【歯車】');
    if (!f.pipesDone) miss.push('ふさがった【風の通り道】');
    lines.push({ who: 'mayor', text: `あとは、${miss.join('と、')}ですメェ。` });
    if (!f.pipesDone && !f.whaleMoved) lines.push({ who: 'mayor', text: '風穴のほうは……そういえば、空クジラがよく昼寝をしている場所ですメェ。' });
    await this.say(lines);
  }

  async mayorIntro() {
    const g = this.g;
    await this.say([
      { who: 'mayor', text: 'メェ〜、ようこそ天空の街へ！ わたしは町長のモコですメェ。' },
      { who: 'mayor', text: 'じつは……町の【大風車】が止まってしまって、困っているのですメェ。' },
      { who: 'mayor', text: '大風車が回らないと風が吹かず、雨雲が線路にいすわったまま。列車も先へ進めないのですメェ。' },
      { who: 'mayor', text: '調べたところ……【帆】は破れ、【歯車】はなくなり、【風の通り道】もふさがっていましたメェ。' },
      { who: 'mayor', text: 'どうか、大風車を直すのを手伝っていただけませんかメェ？' },
      { who: 'mayor', text: 'そうそう、これは町のおみやげですメェ。空の生きものは、みんなこれに目がないのですメェ。' },
    ]);
    g.give('konpeito');
    g.flag('introDone');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async talkFrog() {
    const g = this.g, f = g.flags;
    this.focus(this.frog.root);
    g.audio.play('ribbit');
    if (!f.introDone) return this.say([{ who: 'frog', text: '町長さんは、広場の噴水のところにいるケロ。' }]);
    if (!f.frogTalked) {
      await this.say([
        { who: 'frog', text: 'ケロ。おいらは列車の番をしてるケロ。雨雲がどかないと、先へは進めないケロ……' },
        { who: 'frog', text: 'そうだ、これを貸してあげるケロ。さびたものも、これでスイスイ動くようになるケロ！' },
      ]);
      g.give('oilCan');
      g.flag('frogTalked');
      return;
    }
    if (f.windDone) return this.say([{ who: 'frog', text: 'いつでも出発できるケロ！' }]);
    await this.say([{ who: 'frog', text: '大風車が回れば、あの雨雲もきっと吹きとぶケロ。がんばるケロ！' }]);
  }

  async talkAlpaca() {
    const g = this.g, f = g.flags;
    this.focus(this.alpaca.root, 18);
    if (f.sailMade) {
      return this.say([{ who: 'alpaca', text: f.sailFixed ? '帆、風車にぴったりね。わたしの自信作よ。' : '帆は、大風車の羽根に張ってね。' }]);
    }
    if (!f.alpacaTalked) {
      await this.say([
        { who: 'alpaca', text: 'あら、いらっしゃい。仕立て屋のアルパカよ。' },
        { who: 'alpaca', text: '大風車の帆？ ええ、織れるわよ。でも材料の【雲のわた】が3つ必要なの。' },
        { who: 'alpaca', text: '空に近いこの街では、雲のわたがあちこちに引っかかっているはずよ。水の上や、空の上や、鳥の巣なんかにね。' },
      ]);
      g.flag('alpacaTalked');
      g.refreshQuests();
    }
    const n = this.cottonCount();
    if (n >= 3) return this.weaveSail();
    if (f.alpacaTalked && n > 0) await this.say([{ who: 'alpaca', text: `雲のわたは、いま ${n} つね。あと ${3 - n} つよ。` }]);
  }

  async weaveSail() {
    const g = this.g;
    await this.say([{ who: 'alpaca', text: 'まあ、3つもそろったのね！ ちょっと待っててね。' }]);
    g.take('cotton');
    g.audio.play('loom');
    this.alpaca.hop();
    await g.wait(1.2);
    g.audio.play('loom');
    this.alpaca.hop();
    await g.wait(0.6);
    await this.say([{ who: 'alpaca', text: 'はい、できあがり！ 雲の糸で織った、風をよくつかむ帆よ。' }]);
    g.give('sail');
    g.flag('sailMade');
    g.refreshQuests();
  }

  async talkSwallow() {
    const g = this.g, f = g.flags;
    this.focus(this.swallow.root, 16);
    g.audio.play('chirp');
    this.swallow.flap = 1;
    if (f.letterFound && !f.cotton_nest) {
      await this.say([
        { who: 'swallow', text: 'ピィ！ それそれ！ その手紙だよ！ 見つけてくれてありがとう！' },
        { who: 'swallow', text: '……あ、これ時計台のカメじいさんあてだ。ぼく、次の配達で急いでるから、かわりに届けてくれない？' },
        { who: 'swallow', text: 'お礼に、巣に引っかかってた雲のわたをあげる！' },
      ]);
      return this.getCotton('cotton_nest', this.R.nestCotton);
    }
    if (!f.swallowTalked) {
      await this.say([
        { who: 'swallow', text: 'ピィ！ たいへんたいへん！ 配達中の手紙が一通、風にとばされちゃったの！' },
        { who: 'swallow', text: 'あのとき風は、西から東へ吹いてたから……町の東のはしの、バラのアーチのあたりかなあ？' },
      ]);
      g.flag('swallowTalked');
      return;
    }
    if (!f.letterFound) return this.say([{ who: 'swallow', text: '町の東のはしの、バラのアーチのあたりを探してみて！' }]);
    await this.say([{ who: 'swallow', text: 'ピィ！ 今日も空はいい天気……のはずなんだけどなあ。' }]);
  }

  async talkTortoise() {
    const g = this.g, f = g.flags;
    this.focus(this.tortoise.root, 16);
    if (g.has('letter')) return this.deliverLetter();
    if (f.chestOpen) {
      return this.say([{ who: 'tortoise', text: f.gearFixed ? 'ふぉっふぉっ、風車の音がもうすぐ聞けそうじゃのう。' : '歯車は、大風車の正面の小窓にはめるんじゃよ。' }]);
    }
    if (f.letterRead) return this.say([{ who: 'tortoise', text: '宝箱の鈴を、孫の手紙の「そらのうた」の順に鳴らすのじゃ。' }]);
    if (!f.tortoiseTalked) {
      await this.say([
        { who: 'tortoise', text: 'ふぉっふぉっ……わしは時計台の番人じゃ。' },
        { who: 'tortoise', text: '風車の予備の歯車かい？ それなら、そこの宝箱にしまってあるがのう……' },
        { who: 'tortoise', text: 'ふたの鈴を、決まった歌の順に鳴らさんと開かんのじゃ。その歌を、すっかり忘れてしもうてのう。' },
        { who: 'tortoise', text: '孫がいつも手紙で教えてくれるんじゃが……今月の手紙が、まだ届かんのじゃよ。' },
      ]);
      g.flag('tortoiseTalked');
      return;
    }
    await this.say([{ who: 'tortoise', text: '孫からの手紙は、まだかのう……郵便屋のツバメに聞いてみてくれんか。' }]);
  }

  async deliverLetter() {
    const g = this.g;
    await this.say([
      { who: 'tortoise', text: 'おお、孫からの手紙じゃ！ ありがたや、ありがたや。' },
      { who: 'tortoise', text: '……むう、字が小さくて読めん。おぬし、代わりに読んでくれんかの。' },
    ]);
    g.take('letter');
    g.ui.openPanel({ title: '孫からの手紙', body: letterHTML(), cls: 'wide' });
    await this.waitPanel();
    g.give('letterOpen');
    g.flag('letterRead');
    g.flag('tortoiseTalked');
    await this.say([
      { who: 'tortoise', text: 'そうじゃ、そうじゃ、「そらのうた」じゃ！ 鈴の色は、時計台の鐘のリボンと同じじゃよ。' },
      { who: 'tortoise', text: '手紙はおぬしが持っておいておくれ。宝箱の鈴を、その順に鳴らすのじゃ。' },
    ]);
  }

  async talkMomonga() {
    const g = this.g, f = g.flags;
    this.focus(this.R.balloon, 22);
    g.audio.play('squeak');
    if (!f.balloonDown) {
      this.momonga.wave = 2.5;
      return this.say([
        { who: 'momonga', text: 'おーい！ だれかー！ 巻き上げ機がさびついて、降りられなくなっちゃったんだー！' },
        g.has('oilCan') ? '（巻き上げ機に『油さし』が使えそうだ）' : '（気球のつなを巻く巻き上げ機が、さびついているようだ）',
      ]);
    }
    if (!f.cotton_balloon) {
      await this.say([
        { who: 'momonga', text: '助かったよ〜！ ずっと空の上で、おなかぺこぺこだったんだ。' },
        { who: 'momonga', text: 'お礼に、カゴに引っかかってた雲のわたをあげる！' },
      ]);
      return this.getCotton('cotton_balloon', this.R.basketCotton);
    }
    await this.say([{ who: 'momonga', text: '気球で空のおさんぽ、たのしいよ〜。こんどは雨雲のないときにね！' }]);
  }

  async clickWinch() {
    const g = this.g, f = g.flags;
    this.focus(this.R.winch, 16);
    if (f.balloonDown) return this.say(['巻き上げ機。気球はしっかり地上につながれている。']);
    if (f.winchOiled) return this.lowerBalloon();
    const lines = ['気球をつなぎとめている巻き上げ機。……さびついて、びくともしない。'];
    if (g.has('oilCan')) lines.push('（持ち物の『油さし』が使えそうだ）');
    await this.say(lines);
  }

  async oilWinch() {
    const g = this.g;
    this.focus(this.R.winch, 16);
    await this.say(['巻き上げ機の軸に、油をさした。']);
    g.take('oilCan');
    this.R.rust.visible = false;
    g.flag('winchOiled');
    await this.lowerBalloon();
  }

  async lowerBalloon() {
    const g = this.g, R = this.R;
    await this.say(['ハンドルを回すと……キリキリと軽く回る！']);
    g.cinematic = true;
    g.audio.play('crank');
    const y0 = R.balloon.position.y;
    await g.tweens.add({ duration: 3.0, ease: Ease.inOut, onUpdate: (k) => {
      R.balloon.position.y = lerp(y0, 1.15, k);
      R.winchDrum.rotation.x = -k * Math.PI * 10;
      if (Math.random() < 0.08) g.audio.play('dial');
    } });
    g.cinematic = false;
    g.flag('balloonDown');
    this.momonga.hop();
    await this.talkMomonga();
  }

  async clickWhale() {
    const g = this.g, f = g.flags;
    this.focus(this.whale.root, 20);
    if (f.whaleMoved) {
      g.audio.play('whale');
      return this.say(['空クジラは、町のまわりをゆったりと泳いでいる。', { who: 'whale', text: 'ブオォ〜……（こんぺいとう、おいしかった……）' }]);
    }
    const lines = [
      '大きな空クジラが、風穴の前ですやすや眠っている。',
      { who: 'whale', text: 'Zzz……ブォ……Zzz……' },
      '風穴から吹き出す風が、クジラの体でせきとめられているようだ。',
    ];
    if (g.has('konpeito')) lines.push('（甘いにおいのするものがあれば、目をさますかも……）');
    await this.say(lines);
  }

  async feedWhale() {
    const g = this.g, R = this.R;
    this.focus(this.whale.root, 20);
    await this.say(['星のこんぺいとうを、クジラの鼻先にそっと置いた。', '……クジラの鼻が、ひくひく動いた。']);
    g.take('konpeito');
    this.whale.setSleeping(false);
    g.audio.play('whale');
    this.whale.hop();
    await this.say([
      { who: 'whale', text: 'ブオォォ〜〜ン！（あまい……！）' },
      'クジラはこんぺいとうをぱくりと食べると、うれしそうに空へ泳ぎだした。',
    ]);
    g.cinematic = true;
    this.whaleLeaving = true;
    const w = this.whale.root;
    const from = w.position.clone();
    const to = new V(Math.cos(2.0) * 24, 7, Math.sin(2.0) * 18);
    const r0 = w.rotation.y;
    await g.tweens.add({ duration: 3.2, ease: Ease.inOut, onUpdate: (k) => {
      w.position.lerpVectors(from, to, k);
      w.position.y += Math.sin(k * Math.PI) * 4;
      w.rotation.y = lerp(r0, Math.atan2(-Math.sin(2.0) * 24, Math.cos(2.0) * 18), k);
    } });
    this.whaleLeaving = false;
    this.whaleFree = true;
    g.cinematic = false;
    g.flag('whaleMoved');
    g.audio.play('whoosh');
    this.focus(R.cave, 20);
    await this.say(['ひゅううっ……！ 風穴から、すずしい風が吹き出した！']);
  }

  // ---------------- 場所 ----------------
  async clickFountain() {
    const g = this.g, f = g.flags;
    this.focus(this.R.fountain, 16);
    if (f.cotton_fountain) return this.say(['雲の形をした噴水。しぶきに小さな虹が見える。']);
    await this.say(['雲の形をした噴水。……水面に、ふわふわの雲のわたが浮かんでいる！']);
    await this.getCotton('cotton_fountain', this.R.fountainCotton);
  }

  async clickArch() {
    const g = this.g, f = g.flags;
    this.focus(this.R.arch, 16);
    if (f.letterFound) return this.say(['白いバラと赤いバラのアーチ。あまい香りがする。']);
    await this.say(['バラのアーチに、白い封筒が引っかかっている！', '宛名は……「時計台のカメさんへ」。']);
    this.R.letter.visible = false;
    g.give('letter');
    g.flag('letterFound');
  }

  async clickChest() {
    const g = this.g, f = g.flags;
    this.focus(this.R.chest, 16);
    if (f.chestOpen) return this.say(['宝箱はからっぽだ。']);
    await this.say(['ふたに5つの鈴がついた宝箱。「そらのうた で ひらく」と彫ってある。']);
    return this.openBells();
  }

  openBells() {
    const g = this.g;
    let pending = false;
    bellPanel(g.ui, g.audio, {
      onPlay: (i) => this.swingBell(i),
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.openChest();
        pending = false;
      },
    });
    return this.waitPanel(() => pending);
  }

  swingBell(i) {
    const b = this.R.bells[i];
    this.g.tweens.add({ duration: 1.0, ease: Ease.linear, onUpdate: (k) => { b.rotation.x = Math.sin(k * Math.PI * 4) * 0.5 * (1 - k); } });
  }

  async openChest() {
    const g = this.g, R = this.R;
    g.audio.play('unlock');
    await g.tweens.add({ duration: 0.9, ease: Ease.backOut, onUpdate: (k) => { R.chestLid.rotation.x = -1.9 * k; } });
    R.gearInChest.visible = true;
    g.audio.play('solve');
    g.flag('chestOpen');
    await this.say(['カチリ……宝箱のふたが開いた！', '中には、金色の大きな歯車が入っている。']);
    R.gearInChest.visible = false;
    g.give('gear');
  }

  async clickWindmill() {
    const g = this.g, f = g.flags;
    this.focus(this.R.windmill, 26);
    if (f.windDone) return this.say(['大風車は、力強く回っている。']);
    const lines = ['町いちばんの大風車。いまは止まっている。'];
    lines.push(f.sailFixed ? '・帆は新しく張りなおした。' : '・羽根のひとつの帆が、ぼろぼろに破れている。');
    lines.push(f.gearFixed ? '・歯車は小窓にしっかりはまっている。' : '・正面の小窓の中の歯車がなくなっている。');
    lines.push(f.pipesDone ? '・風の配管から、風が送られてきている。' : '・根元の配管から、風が来ていない。');
    if (f.sailFixed && f.gearFixed && f.pipesDone) lines.push('準備は万端だ。町長に知らせよう！');
    await this.say(lines);
  }

  async fixSail() {
    const g = this.g, R = this.R;
    this.focus(R.windmill, 26);
    g.take('sail');
    g.audio.play('loom');
    R.tornCloth.visible = false;
    R.sailCloths[2].visible = true;
    R.sailCloths[2].scale.y = 0.01;
    await g.tweens.add({ duration: 0.8, ease: Ease.backOut, onUpdate: (k) => { R.sailCloths[2].scale.y = Math.max(0.01, k); } });
    g.flag('sailFixed');
    await this.say(['破れた帆をはずして、雲の帆を張りなおした！']);
    this.questDone('風車の帆を張りなおした！');
    await this.checkReady();
  }

  async fixGear() {
    const g = this.g, R = this.R;
    this.focus(R.windmill, 22);
    g.take('gear');
    g.audio.play('unlock');
    R.millGear.visible = true;
    R.millGear.scale.setScalar(0.01);
    await g.tweens.add({ duration: 0.6, ease: Ease.backOut, onUpdate: (k) => R.millGear.scale.setScalar(Math.max(0.01, k)) });
    g.flag('gearFixed');
    await this.say(['小窓の中に、歯車をカチリとはめこんだ！']);
    this.questDone('風車の歯車をとりもどした！');
    await this.checkReady();
  }

  async checkReady() {
    const f = this.g.flags;
    if (f.sailFixed && f.gearFixed && f.pipesDone) {
      await this.say(['これで大風車の準備は万端だ。ヒツジの町長に知らせよう！']);
      this.g.refreshQuests();
    }
  }

  async clickCave() {
    const f = this.g.flags;
    this.focus(this.R.cave, 20);
    if (f.whaleMoved) return this.say(['風穴から、すずしい風が勢いよく吹き出している。', '風は配管を通って、大風車のほうへ送られるらしい。']);
    await this.say(['岩のあいだにぽっかり開いた風穴。奥からごうごうと風の音がする。', '……でも、出口の前で空クジラが眠っていて、風がせきとめられている。']);
  }

  async clickPanel() {
    const g = this.g, f = g.flags;
    this.focus(this.R.pipePanel, 16);
    if (f.pipesDone) return this.say(['風の配管盤。緑のランプがともっている。']);
    if (!f.whaleMoved) {
      return this.say(['風の配管盤。パイプをつなぎかえて、風穴の風を大風車へ送るしくみらしい。', '……でも今は、風穴から風が来ていない。先に風穴を調べてみよう。']);
    }
    let pending = false;
    pipePanel(g.ui, g.audio, {
      hasWind: true,
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.pipesConnected();
        pending = false;
      },
    });
    return this.waitPanel(() => pending);
  }

  async pipesConnected() {
    const g = this.g, R = this.R;
    g.audio.play('whoosh');
    await g.tweens.add({ duration: 1.2, onUpdate: (k) => { R.pipeMat.emissiveIntensity = k * 0.8; } });
    R.panelLampMat.color.set('#5aff8a');
    R.panelLampMat.emissive.set('#5aff8a');
    g.flag('pipesDone');
    await this.say(['ゴウッ……！ 配管の中を、風が勢いよく流れはじめた！']);
    this.questDone('風の通り道がつながった！');
    await this.checkReady();
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    if (target === 'balloon') target = 'momonga';
    if (target === 'post' || target === 'tailor') target = { post: 'swallow', tailor: 'alpaca' }[target];
    if (item === 'oilCan' && target === 'winch') return this.oilWinch();
    if (item === 'oilCan' && target === 'momonga') return this.say(['油は、地上の巻き上げ機にさすほうがよさそうだ。']);
    if (item === 'konpeito' && target === 'whale') {
      if (f.whaleMoved) return this.say(['クジラはもう、こんぺいとうを食べたあとだ。']);
      return this.feedWhale();
    }
    if (item === 'cotton' && target === 'alpaca') {
      if (!f.alpacaTalked) return this.talkAlpaca();
      if (this.cottonCount() >= 3) return this.weaveSail();
      return this.say([{ who: 'alpaca', text: `雲のわたは、あと ${3 - this.cottonCount()} つ必要よ。` }]);
    }
    if (item === 'sail' && target === 'windmill') return this.fixSail();
    if (item === 'gear' && target === 'windmill') return this.fixGear();
    if (item === 'letter' && target === 'tortoise') { this.focus(this.tortoise.root, 16); return this.deliverLetter(); }
    if (item === 'letter' && target === 'swallow') return this.talkSwallow();
    if ((item === 'letterOpen' || item === 'letter') && target === 'chest') {
      if (f.chestOpen) return this.say(['宝箱はもう開いている。']);
      this.focus(this.R.chest, 16);
      return this.openBells();
    }
    if (item === 'konpeito' && target !== 'whale') {
      const who = ['mayor', 'frog', 'alpaca', 'swallow', 'tortoise', 'momonga'].includes(target) ? target : null;
      if (who) return this.say([{ who, text: who === 'mayor' ? 'それはおみやげですメェ。空の生きものにあげると喜びますメェ。' : 'わあ、おいしそう！ ……でも、もっとほしがってる子がいるんじゃない？' }]);
    }
    const talkers = { mayor: 'それはお客さまが持っていてくださいメェ。', frog: 'それはボイラーには入れられないケロ。', alpaca: 'それは布にはならないわね。', swallow: 'ピィ？ それは配達するものじゃないよ。', tortoise: 'ふぉっふぉっ、それはわしにはいらんよ。', momonga: 'それはいらないや〜。' };
    if (talkers[target]) return this.say([{ who: target, text: talkers[target] }]);
    return this.say(['ここでは使えないようだ。']);
  }

  // =========================================================
  // オープニング・フィナーレ・発車
  // =========================================================
  async opening() {
    const g = this.g;
    g.cinematic = true;
    // 空から列車がやってくる
    const s0 = this.stopS;
    this.train.s = s0 - 75;
    this.train.place();
    g.camera.position.set(16, 9, 12);
    g.controls.target.set(-14, 3, -6);
    this.followArrive = true;
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
      const lp = this.train.loco.g.position;
      g.controls.target.lerp(lp, 0.08);
      g.camera.position.lerpVectors(camFrom, new V(9, 6.5, 9), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('天空の街', 'STAGE 2', 2400);
    await g.say([
      'ほしまわり号は、雲の上の街に到着した。',
      '白い家と風車がならぶ、空に浮かぶ街——『天空の街』。',
      '……でも、線路の先には、どんよりとした雨雲がいすわっている。',
    ]);
    await g.moveCamera(new V(9, 6.5, 6), new V(3.5, 1.2, -4.2), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'ケロ……この先の線路が、大きな雨雲にふさがれてるケロ！' },
      { who: 'frog', text: 'いつもなら、町の大風車が雲を吹きとばしてくれるはずなんだケロ……' },
      { who: 'frog', text: '町長さんに相談してみるといいケロ。広場の噴水のところにいるケロ。' },
    ]);
    const portrait = innerWidth < innerHeight;
    await g.moveCamera(portrait ? new V(9, 13, 22) : new V(8, 10, 18), new V(2.4, 1.4, 4.4), 2.0);
    g.cinematic = false;
    await this.talkMayor();
  }

  async finale() {
    const g = this.g, R = this.R;
    await this.say([
      { who: 'mayor', text: 'おお……帆も、歯車も、風の道も！ すべて直ったのですメェ！' },
      { who: 'mayor', text: 'それでは……大風車、始動ですメェ〜！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    this.mayor.wave = 3;
    await g.moveCamera(new V(20, 10, 12), new V(12, 4.5, -7), 2.2);
    g.audio.play('whoosh');
    await g.tweens.add({ duration: 3, ease: Ease.in, onUpdate: (k) => { this.millSpeed = k * 1.6; } });
    g.audio.play('whoosh');
    await g.moveCamera(new V(26, 12, 16), new V(22, 4, -7), 2.0);
    await g.tweens.add({ duration: 4, ease: Ease.inOut, onUpdate: (k) => { this.stormT = 1 - k; this._applyStorm(); if (Math.random() < 0.05) g.audio.play('whoosh'); } });
    this.stormT = 0;
    this._applyStorm();
    g.flag('windDone');
    g.audio.play('solve');
    await g.wait(0.8);
    await this.say(['大風車の風が、雨雲をすっかり吹きとばした！', '雲の切れ間から、大きな虹がかかった。']);
    await g.moveCamera(new V(9, 6.5, 8), new V(2.5, 1.4, -3.5), 2.0);
    await this.say([
      { who: 'frog', text: 'ケロ〜！ 線路が見えたケロ！ これで出発できるケロ！' },
      { who: 'mayor', text: 'ほんとうに、ありがとうございましたメェ。旅のごぶじを、町じゅうでお祈りしていますメェ。' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
    g.flag('departed');
    g.refreshQuests();
    await this.departure();
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(5.5, 5.2, 7.5), new V(3.0, 1.5, -5.0), 2.0);
    this.mayor.wave = 6;
    g.audio.play('whistle');
    await g.wait(1.4);
    this.departing = true;
    this.followTrain = true;
    this.followK = 0;
    g.tweens.add({ duration: 9, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 9; } });
    g.tweens.add({ duration: 12, ease: Ease.sine, onUpdate: (k) => { this.followK = k; } });
    await g.wait(4);
    g.audio.play('whistle');
    await g.wait(6.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'sky'])];
    g.save();
    this.showClear();
  }

  showClear() {
    const g = this.g;
    const sec = Math.floor(g.state.elapsed);
    const time = `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒`;
    const body = el('div', 'clear');
    body.innerHTML = `
      <div class="clear-sub">STAGE 2 CLEAR</div>
      <div class="clear-main">天空の街</div>
      <div class="clear-stats"><div><span>プレイ時間</span><b>${time}</b></div><div><span>ヒント</span><b>${g.state.hints}回</b></div></div>
      <div class="route">
        <div class="route-stop done"><i></i>はざま駅</div>
        <div class="route-stop done"><i></i>天空の街</div>
        <div class="route-stop next"><i></i>寂れた温泉街</div>
        <div class="route-stop"><i></i>勇者の城下町</div>
        <div class="route-stop"><i></i>現代日本</div>
      </div>
      <p class="clear-msg">虹のふもとをくぐりぬけて、ほしまわり号は走っていく。<br>次の停車駅は<em>寂れた温泉街</em>。</p>
      <div class="clear-btns"><button class="btn primary" data-a="next">次の世界へ ▶</button><button class="btn" data-a="title">タイトルへ</button></div>`;
    g.ui.openPanel({ title: '', body, closable: false, cls: 'clear-panel' });
    body.querySelector('[data-a="next"]').onclick = () => g.goToStage('onsen');
    body.querySelector('[data-a="title"]').onclick = () => g.goToStage('onsen', { autostart: false });
    g.ui.fade(0, 1.2, '#fff8ec');
  }
}
