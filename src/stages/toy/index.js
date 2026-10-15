import * as THREE from 'three';
import { makeBackdrop } from '../../lib/backdrop.js';
import { GRADES } from '../../core/postfx.js';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs } from '../../lib/environment.js';
import { Motes } from '../../lib/livefx.js';
import { makeFrog } from '../../lib/creatures.js';
import { makeBear, makeRobotDog, makeWindMouse, makeBlockDino, makeMusicRabbit, makeTinLoco, makeDuck } from '../../lib/creatures-toy.js';
import { lerp, softCircleTexture, add, mat } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildPortRails } from '../port/diorama.js';
import { Ease } from '../../core/tween.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildToyDiorama, TRACK_Z, ISLAND, CANAL, OVAL, mazeCell, MAZE_POS, NOTE_COLORS, SCORE } from './diorama.js';
import { gearPanel, musicPanel, marchPanel, scoreHTML, NOTE_NAMES, NOTE_MIDI, SONG } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  bear: { name: 'クマの町長', icon: '🧸', color: '#a8703a', voice: 300 },
  dog: { name: 'ロボット犬', icon: '🤖', color: '#5a7a9a', voice: 760 },
  mouse: { name: 'ゼンマイネズミ', icon: '🐭', color: '#8a8a9a', voice: 1400 },
  dino: { name: '積み木の恐竜', icon: '🦕', color: '#4a9a3a', voice: 180 },
  rabbit: { name: 'オルゴールのウサギ', icon: '🐰', color: '#d86a9a', voice: 1100 },
  loco: { name: 'ブリキの機関車', icon: '🚂', color: '#2a5ac8', voice: 640 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

const FROG_HOME = new V(-3.0, 0, TRACK_Z + 2.1);
const MOUSE_HOME = new V(MAZE_POS.x, 0, MAZE_POS.z + MAZE_POS.cell * 2.5 + 1.0);
const DINO_HOME = new V(-15.2, 0, 6.6);
const LOCO_T0 = 0.62;
const LOCO_STOP = 0.25 + 1; // 手前の小さな駅（1周と少し走ってから止まる）

function makeToyPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-110, 32, 44), new V(-74, 24, 24), new V(-42, RAIL_Y, TRACK_Z), new V(-24, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-24, RAIL_Y, TRACK_Z), new V(25, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(25, RAIL_Y, TRACK_Z), new V(42, RAIL_Y, TRACK_Z), new V(58, 10, -22), new V(74, 18, -42)));
  p.add(new THREE.CubicBezierCurve3(new V(74, 18, -42), new V(90, 24, -58), new V(106, 28, -74), new V(124, 30, -94)));
  p.arcLengthDivisions = 900;
  return p;
}

/**
 * ステージ：からくりおもちゃの街（1.5倍）
 * 目的：時計塔の大ゼンマイを巻き直して、街とはね橋を動かす
 * しかけ：ゼンマイ鍵で、止まったおもちゃを巻くと動き出す
 */
export class ToyStage {
  constructor(game) {
    this.g = game;
    this.id = 'toy';
    this.title = 'からくりおもちゃの街';
    this.questTitle = '⚙ 時計塔の大ゼンマイを巻き直す';
    this.departing = false;
    this.trainSpeed = 0;
    this.locoT = LOCO_T0;
  }

  homeView(portrait) {
    return portrait ? [new V(12, 54, 44), new V(0, 0.5, 0)] : [new V(14, 30, 46), new V(0, 0.5, -0.5)];
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('toy');
    g.bounds = { minX: -21, maxX: 21, minZ: -15, maxZ: 15 };
    g.controls.maxDistance = 90;

    // 夕方のおもちゃ箱：あたたかい橙と、すみれ色の空
    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#6a6ad0'); u.dMid.value.set('#f8b890'); u.dBot.value.set('#ffe0c0');
    u.night.value = 0.12;
    u.sunDir.value.set(-0.7, 0.22, -0.6).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#f0d0c0', 80, 260);
    g.renderer.toneMappingExposure = 1.1;
    this.hemi = new THREE.HemisphereLight('#fff0e0', '#8a6a5a', 1.2);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffe4c0', 2.4));
    sun.position.set(-18, 28, 16);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 24; sc.bottom = -24; sc.near = 5; sc.far = 100;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: ISLAND.w, d: ISLAND.d, seed: 61, grass: '#7ac85a' });
    scene.add(this.island);
    this.clouds = makeClouds(63);
    this.clouds.scale.setScalar(1.35);
    this.clouds.userData.mat.color.set('#fbe8e0');
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('toy');
    scene.add(this.backdrop.group);
    g.setGrade(GRADES.toy);
    this.smallIslands = [[-78, 6, -44, 5, 61], [70, -2, 34, 4, 62], [-92, 12, 24, 6, 63]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車（川の上ははね橋のレールだけ）
    this.path = makeToyPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 19; // 機関車が x=-5 に止まる
    this.tracks = buildPortRails(scene, this.path, -22.3, 22.3, [CANAL]);
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();

    await this.g.loadingStep(0.3, 'おもちゃの街を組み立てています…');
    const R = (this.R = buildToyDiorama(scene));

    this.smoke = new Puffs(scene, { count: 60, color: '#f4f0f4', opacity: 0.65 });
    this.confetti = new Puffs(scene, { count: 80, color: '#ffffff', opacity: 0.9 });
    this.motes = new Motes(scene, { count: 70, color: '#fff0c8', size: 0.1, area: { x: 40, z: 28, y0: 0.5, y1: 8 }, kind: 'dust', opacity: 0.5 });
    this.sparkles = this._makeSparkles(scene);

    await this.g.loadingStep(0.6, 'おもちゃたちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();

    g.ui.onLine = (who) => {
      const c = this.speakerCreature(who);
      if (c && !c.frozen) c.talk(2.2);
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
    const R = this.R;
    this.frog = makeFrog();
    this.frog.root.position.copy(FROG_HOME);
    this.frog.root.rotation.y = -0.3;
    this.bear = makeBear();
    this.bear.root.position.set(-6.4, 0, -2.0);
    this.bear.root.rotation.y = 0.15;
    this.dog = makeRobotDog();
    this.dog.root.position.set(6.8, 0, 0.8);
    this.dog.root.rotation.y = -0.5;
    this.mouse = makeWindMouse();
    this.mouse.root.position.copy(MOUSE_HOME);
    this.mouse.root.scale.setScalar(1.15);
    this.dino = makeBlockDino();
    this.dino.root.position.copy(DINO_HOME);
    this.dino.root.rotation.y = 0.3;
    this.rabbit = makeMusicRabbit();
    R.pedestal.add(this.rabbit.root);
    this.rabbit.root.position.set(0, 0.14, 0);
    this.loco = makeTinLoco();
    this.loco.noIdleHop = true;
    // ⚁ の楽譜を貨車にのせる
    this.score2 = R.scoreRow(this.loco.wagon, SCORE[1], 2, 0.3);
    this.score2.position.set(0, 0.5, 0.7);
    this.score2.rotation.y = Math.PI / 2;
    this.ducks = [makeDuck(1.1), makeDuck(0.9), makeDuck(1.0)];
    [[16.6, 2.0, 0.4], [17.2, 4.6, -0.6], [16.4, -3.0, 2.4]].forEach(([x, z, ry], i) => { this.ducks[i].root.position.set(x, 0.1, z); this.ducks[i].root.rotation.y = ry; });
    this.creatures = [this.frog, this.bear, this.dog, this.mouse, this.dino, this.rabbit, this.loco, ...this.ducks];
    for (const c of this.creatures) if (c !== this.rabbit) scene.add(c.root);
    this.toys = { dog: this.dog, mouse: this.mouse, dino: this.dino, rabbit: this.rabbit, loco: this.loco };
    this._placeLoco(this.locoT);
  }

  _placeLoco(t) {
    const c = this.R.ovalCurve;
    const k = ((t % 1) + 1) % 1;
    const p = c.getPoint(k), q = c.getPoint((k + 0.003) % 1);
    this.loco.root.position.set(p.x, 0.1, p.y);
    this.loco.root.rotation.y = Math.atan2(q.x - p.x, q.y - p.y);
  }

  speakerCreature(who) {
    return { bear: this.bear, dog: this.dog, mouse: this.mouse, dino: this.dino, rabbit: this.rabbit, loco: this.loco, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    reg('bear', this.bear.root, 'クマの町長', () => this.talkBear());
    reg('dog', this.dog.root, 'ロボット犬', () => this.talkDog());
    reg('mouse', this.mouse.root, 'ゼンマイネズミ', () => this.talkMouse());
    reg('dino', this.dino.root, '積み木の恐竜', () => this.talkDino());
    reg('rabbit', this.rabbit.root, 'オルゴールのウサギ', () => this.talkRabbit());
    reg('loco', this.loco.root, 'ブリキの機関車', () => this.talkLoco());
    this.ducks.forEach((d, i) => reg(`duck${i}`, d.root, 'ゴムのアヒル', () => { g.audio.play('squeak'); d.hop(); return this.say(['ゴムのアヒルが、川にぷかぷか浮いている。押すと「キュッ」と鳴った。']); }));
    reg('musicBox', R.musicBox, 'オルゴール', () => this.clickMusicBox());
    reg('tower', R.tower, '時計塔', () => this.clickTower());
    reg('crank', R.crank, '巻き台', () => this.clickCrank());
    reg('sandbox', R.sandbox, '砂場', () => this.clickSandbox());
    reg('maze', R.maze, '積み木の迷路', () => this.talkMouse());
    reg('xylo', R.xylo, '木琴の橋', () => this.clickXylo());
    reg('score1', R.score1, '色の積み木', () => this.clickScore(0));
    reg('gate', R.gate, '町の門', () => this.say(['積み木を積んだ門。上の段に「お・も・ち・ゃ・の・ま・ち」と書いてある。', { who: 'frog', text: '積み木の門、ぼくもくぐってみたいケロ。' }]));
    reg('drawbridge', R.drawbridge, 'はね橋', () => this.say([this.g.flags.bridgeDown ? 'はね橋が下りて、線路がつながった。' : 'おもちゃの川にかかる、はね橋。上がったまま止まっていて、列車がわたれない。']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『おもちゃのまち』……左は『きのこのもり』、右は『とうきょう』。', { who: 'frog', text: 'つぎは、とうとう終点ケロ……。' }]));
    reg('trainLoco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。ブリキの機関車が、うらやましそうに見ていた気がする。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  applyState() {
    const f = this.g.flags, R = this.R;
    for (const [k, c] of Object.entries(this.toys)) c.setFrozen(!(f[`${k}Awake`] || f.finaleDone));
    if (f.dinoMoved) this.dino.root.position.copy(DINO_HOME).add(new V(2.8, 0, 0.6));
    R.score1.visible = !!f.dinoMoved;
    if (f.locoRan) this.locoT = LOCO_STOP;
    this._placeLoco(this.locoT);
    R.gearBox.visible = false;
    R.sandMound.visible = !f.gearBoxDug;
    R.winGears.forEach((m, i) => { m.visible = i === 0 || !!f.gearsFixed; });
    R.drumPins.visible = !!f.songFixed;
    if (f.handleGot) R.mazeHandle.visible = false;
    if (f.marchDone) {
      const p = mazeCell(4, 0);
      this.mouse.root.position.copy(p);
      this._showArrows(f.marchTiles || {});
    }
    R.crankHandle.visible = !!f.finaleDone;
    R.drawbridge.rotation.z = f.bridgeDown ? 0 : 1.2;
    this.backdrop.set(f.finaleDone ? 1 : 0);
    this.g.setGrade(f.finaleDone ? GRADES.toyLive : GRADES.toy);
    for (const m of R.lampMats) m.emissiveIntensity = f.finaleDone ? 1.8 : 0.6;
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  _showArrows(tiles) {
    const R = this.R;
    R.mazeArrows.clear();
    const rot = { N: 0, W: Math.PI / 2, S: Math.PI, E: -Math.PI / 2 };
    for (const [k, d] of Object.entries(tiles)) {
      const [c, r] = k.split(',').map(Number);
      const p = mazeCell(c, r);
      const m = add(R.mazeArrows, new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshStandardMaterial({ map: R.arrowTex, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }), p.x, 0.075, p.z, { rot: [-Math.PI / 2, 0, rot[d]], cast: false });
      m.userData.noPick = true;
    }
    R.mazeArrows.visible = true;
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R, f = g.flags;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    this.motes.update(dt, t);
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    // アヒルはぷかぷか
    this.ducks.forEach((d, i) => { d.root.position.y = 0.1 + Math.sin(t * 1.4 + i) * 0.04; d.root.rotation.z = Math.sin(t * 1.1 + i) * 0.06; });
    // 時計と歯車
    if (f.gearsFixed) {
      const sp = f.finaleDone ? 1 : 0.15;
      R.minPivot.rotation.z -= dt * 0.25 * sp;
      R.hourPivot.rotation.z -= dt * 0.25 * sp / 12;
      R.winGears.forEach((m, i) => { m.rotation.z += dt * sp * (i % 2 ? -1 : 1) * (12 / m.userData.n) * 1.5; });
    }
    if (f.finaleDone) R.bigKey.rotation.z += dt * 0.4;
    // オルゴール
    if (f.songFixed) {
      R.drum.rotation.x += dt * 0.6;
      if (g.lookSubject !== this.rabbit.root) R.pedestal.rotation.y += dt * (f.finaleDone ? 1.2 : 0.5);
    }
    // ブリキの機関車（フィナーレのあとは、ぐるぐる走る）
    if (this.locoLoop) { this.locoT += dt * 0.06; this._placeLoco(this.locoT); }
    // 紙ふぶき
    if (this.party && Math.random() < dt * 14) {
      const p = new V((Math.random() - 0.5) * 30, 9 + Math.random() * 3, (Math.random() - 0.5) * 20);
      this.confetti.emit(p, { vel: new V(0, -1.6, 0), spread: 0.8, life: 4, size0: 0.25, size1: 0.25, color: NOTE_COLORS[Math.floor(Math.random() * 5)] });
    }
    this.confetti.update(dt);

    // 煙
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.7;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      if (p.x < 23) this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.3, 0), spread: 0.5, life: heavy ? 2.4 : 3.0, size0: 0.5, size1: heavy ? 3.2 : 2.2 });
    }
    this.smoke.update(dt);
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0 && this.train.s < this.stopS + 40) { this.chuffT = 0.5; g.audio.play('chuff'); }
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
    if (!f.introDone) return [{ text: 'クマの町長に話しかけよう', done: false }];
    const q = [
      { text: '⚙ 時計塔の歯車をなおす', done: !!f.gearsFixed },
      { text: '🎵 オルゴールに、街の歌をとりもどす', done: !!f.songFixed },
      { text: '🔧 大ゼンマイの巻きハンドルを見つける', done: !!f.handleGot },
    ];
    if (f.gearsFixed && f.songFixed && f.handleGot) q.push({ text: '🧸 町長に知らせて、大ゼンマイを巻く', done: !!f.finaleDone });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    if (!f.introDone) return H('intro', 'ホームの前にいる、クマのぬいぐるみの町長に話しかけよう。');
    if (f.gearsFixed && f.songFixed && f.handleGot) return H('final', '準備はそろった！ クマの町長に話しかけよう。');
    const steps = [];
    if (!f.gearsFixed) {
      if (has('gearBox')) steps.push(H('gears', '線路の向こうの時計塔の、歯車の窓を調べよう。', 'あいだの歯車は、向きを変えるだけで、速さは変えない。速さは大ゼンマイ（歯12）と針の歯車の歯の数で決まる。', '答え：あいだの歯車を1つ（または3つ）、針の歯車は歯24。'));
      else if (f.dogAwake) steps.push(H('sand', 'ロボット犬は、歯車箱を砂場にうめたらしい。砂場を調べよう。'));
      else steps.push(H('dog', '時計塔の歯車にくわしいのは、砂場のそばのロボット犬。ゼンマイ鍵で巻いてみよう。'));
    }
    if (!f.songFixed) {
      if (!f.rabbitAwake) steps.push(H('rabbit', 'まんなかのオルゴールの上のウサギを、ゼンマイ鍵で巻いてみよう。'));
      else if (!f.dinoMoved) steps.push(H('dino', '楽譜の積み木のひとつは、積み木の恐竜のおなかの下。左の恐竜を巻いてみよう。'));
      else if (!f.locoRan) steps.push(H('loco', 'もうひとつの楽譜は、ブリキの機関車の貨車の中。楕円の線路の機関車を巻こう。'));
      else if (!f.xyloSeen) steps.push(H('xylo', '色と音の関係は、右の川にかかる『木琴の橋』でわかる。'));
      else steps.push(H('music', 'サイコロ⚀の積み木のあとに⚁の積み木をならべて、オルゴールにピンを打とう。', '赤＝ド、橙＝レ、黄＝ミ、緑＝ソ、青＝ラ。', '答え：ミ ソ ラ ソ ／ ミ レ ミ ド'));
    }
    if (!f.handleGot) {
      if (!f.mouseAwake) steps.push(H('mouse', '右手前の積み木の迷路の入口にいる、ゼンマイネズミを巻いてみよう。'));
      else steps.push(H('march', '迷路をまっすぐ上へ3歩 → 右へ曲がって1歩 → 上へ1歩 → 右へ1歩。曲がるマスに矢印タイルを置き、ゼンマイは6巻き。'));
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

  focus(obj, dist, opt = {}) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(6, Math.max(0.6, p.y + 0.5)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined, ...opt });
  }

  talkCam(c, dist) {
    const ry = c.root.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new V(0, 0, 1).applyQuaternion(ry);
    const face = (c.head || c.root).getWorldPosition(new V());
    return this.g.focusOn(face, { dist, duration: 0.8, theta: Math.atan2(fwd.x, fwd.z), polar: 1.02, keepAngle: true, subject: c.root });
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
    if (f.gearsFixed && f.songFixed && f.handleGot) {
      await this.say(['これで準備はそろった。クマの町長に知らせよう！']);
      this.g.refreshQuests();
    }
  }

  /** オルゴールの音で、音の列を鳴らす（null は休み） */
  playNotes(list, gap = 0.42) {
    const a = this.g.audio;
    list.forEach((m, i) => {
      if (m == null) return;
      const f = 440 * Math.pow(2, (m - 69) / 12);
      a.tone(f, { dur: 1.4, gain: 0.14, when: i * gap, attack: 0.003 });
      a.tone(f * 2.01, { dur: 0.7, gain: 0.04, when: i * gap, attack: 0.003 });
    });
  }

  // =========================================================
  // ゼンマイを巻く
  // =========================================================
  /** 止まっているおもちゃをクリックしたとき：鍵があれば巻く */
  async tryWind(key, lines) {
    const g = this.g, c = this.toys[key];
    if (!c.frozen) return false;
    if (!g.flags.introDone || !g.has('toyKey')) {
      await this.say([...lines, '背中のゼンマイがほどけて、ぴくりとも動かない。']);
      return true;
    }
    await this.wind(key);
    return false;
  }

  async wind(key) {
    const g = this.g, c = this.toys[key];
    g.cinematic = true;
    for (let i = 0; i < 3; i++) {
      g.audio.play('crank');
      await g.tweens.add({ duration: 0.4, onUpdate: (k) => { for (const kk of c.keys) kk.rotation.z = (i + k) * Math.PI; } });
    }
    c.setFrozen(false);
    c.hop();
    g.audio.play('twinkle');
    g.flag(`${key}Awake`);
    g.cinematic = false;
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkFrog() {
    this.talkCam(this.frog, 9);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.finaleDone) return this.say([{ who: 'frog', text: 'はね橋が下りたケロ！ いつでも出発できるケロ！' }]);
    if (!f.introDone) return this.say([{ who: 'frog', text: 'あのクマさん、動いてるケロ！ 話しかけてみるケロ。' }]);
    await this.say([{ who: 'frog', text: 'おもちゃのみんなを巻いてあげたら、きっと元気になるケロ。' }]);
  }

  async talkBear() {
    const g = this.g, f = g.flags;
    this.talkCam(this.bear, 10);
    if (!f.introDone) return this.bearIntro();
    if (f.finaleDone) return this.say([{ who: 'bear', text: 'ありがとう。街が、こんなににぎやかなのは、ひさしぶりだよ。' }]);
    if (f.gearsFixed && f.songFixed && f.handleGot) return this.finale();
    const lines = [];
    if (!f.gearsFixed) lines.push({ who: 'bear', text: '時計塔の歯車のことは、ロボット犬くんがくわしいんだ。' });
    if (!f.songFixed) lines.push({ who: 'bear', text: 'オルゴールの歌は、ウサギさんが知っているはず。' });
    if (!f.handleGot) lines.push({ who: 'bear', text: '巻きハンドルは……たしか、積み木の迷路の奥に落ちたんだ。迷路はネズミくんの庭だよ。' });
    await this.say(lines);
  }

  async bearIntro() {
    const g = this.g;
    await this.say([
      { who: 'bear', text: 'やあ、ほしまわり号のお客さん。ようこそ、おもちゃの街へ。ぼくは町長のクマだよ。' },
      { who: 'bear', text: 'ぼくはぬいぐるみだから、ゼンマイがいらないんだ。だから、こうして動けるんだけど……' },
      { who: 'bear', text: 'ほかのみんなは、止まってしまった。線路の向こうの【時計塔】の、【大ゼンマイ】がほどけてしまってね。' },
      { who: 'bear', text: '大ゼンマイが止まると、街じゅうのおもちゃも、川の【はね橋】も動かない。これじゃ、列車もわたれないね。' },
      { who: 'bear', text: '大ゼンマイを巻き直すには、時計塔の【歯車】と、オルゴールの【歌】と、それから【巻きハンドル】がいるんだ。' },
      { who: 'bear', text: 'この【ゼンマイ鍵】をあずけるよ。止まったみんなを巻いてあげて。きっと力になってくれる。' },
    ]);
    g.give('toyKey');
    await this.say([
      { who: 'bear', text: '街が動いていたころは、毎日にぎやかでね。歌と、時計の音と、みんなの笑い声で。' },
      { who: 'bear', text: 'もう一度、あのにぎやかさを取りもどしたいんだ。さあ、たのんだよ。' },
    ]);
    g.flag('introDone');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.note('ty-key', 'ゼンマイ鍵', '止まったおもちゃを調べると、<b>ゼンマイ鍵</b>で巻いて動かせる。');
    g.refreshQuests();
  }

  async talkDog() {
    const g = this.g, f = g.flags;
    this.talkCam(this.dog, 9);
    if (await this.tryWind('dog', ['ブリキのロボット犬。しっぽをぴんと立てたまま、止まっている。'])) return;
    g.audio.play('chirp');
    if (!f.dogTalked) {
      g.flag('dogTalked');
      await this.say([
        { who: 'dog', text: 'ワンワン！ ギギ……動ける！ ありがとうワン！' },
        { who: 'dog', text: '時計塔の歯車？ ぼくがなおしてたワン。時計の針は、【右回り】に、大ゼンマイが【2回】まわるあいだに【1回】まわるんだワン。' },
        { who: 'dog', text: 'でも、歯車箱が……あっ、思いだした！ 大事だから、【砂場】にうめたんだったワン！' },
      ]);
      g.note('ty-gear', '時計塔の歯車', '時計の針は<b>右回り</b>に、大ゼンマイが<b>2回</b>まわるあいだに<b>1回</b>。<br>かみあう歯車は、となりと反対に回る。<br>歯車箱は<b>砂場</b>にうめた（ロボット犬）。');
      return;
    }
    if (f.gearsFixed) return this.say([{ who: 'dog', text: 'カチカチ、いい音だワン！' }]);
    await this.say([{ who: 'dog', text: g.has('gearBox') ? '歯車箱、見つかったワン！ 時計塔の歯車の窓に、はめてみてワン。あいだの歯車は、向きを変えるだけだワン。' : '歯車箱は、砂場のどこかにうめたワン……。' }]);
  }

  async clickSandbox() {
    const g = this.g, f = g.flags, R = this.R;
    this.focus(R.sandbox, 12);
    if (f.gearBoxDug) return this.say(['砂場。砂の城がかわいい。']);
    if (!f.dogAwake) return this.say(['おもちゃの砂場。バケツとスコップ、砂の城。すみに、砂の山がもりあがっている。']);
    g.cinematic = true;
    const from = this.dog.root.position.clone(), r0 = this.dog.root.rotation.y;
    const to = R.sandbox.position.clone().add(new V(-0.9, 0.2, 1.3));
    await g.tweens.add({ duration: 1.0, ease: Ease.inOut, onUpdate: (k) => { this.dog.root.position.lerpVectors(from, to, k); this.dog.root.rotation.y = lerp(r0, Math.PI, k); } });
    for (let i = 0; i < 4; i++) { g.audio.play('dial'); this.dog.hop(); await g.wait(0.3); }
    R.sandMound.visible = false;
    R.gearBox.visible = true;
    g.audio.play('item');
    await g.tweens.add({ duration: 0.6, onUpdate: (k) => { R.gearBox.position.y = 0.2 + k * 0.3; } });
    await g.tweens.add({ duration: 0.8, ease: Ease.inOut, onUpdate: (k) => { this.dog.root.position.lerpVectors(to, from, k); this.dog.root.rotation.y = lerp(Math.PI, r0, k); } });
    R.gearBox.visible = false;
    g.cinematic = false;
    g.flag('gearBoxDug');
    await this.say(['ロボット犬が砂をほりほり……ブリキの【歯車箱】が出てきた！', { who: 'dog', text: '歯8が2こ、歯12が1こ、歯24が2こ。これで時計塔をなおせるワン！' }]);
    g.give('gearBox');
  }

  async clickTower() {
    const g = this.g, f = g.flags;
    await g.focusOn(new V(3, 6.5, -10.5), { dist: 14, polar: 1.15, theta: 0, duration: 0.9 });
    if (f.gearsFixed) return this.say(['時計塔の歯車が、カチカチと回っている。', f.finaleDone ? '大ゼンマイも、ゆっくり回っている。' : '']);
    if (!g.has('gearBox')) {
      g.note('ty-tower', '時計塔', '歯車の窓：大ゼンマイの歯車のほかは、歯車がなくなっている。<br>「かみあう歯車は、となりと反対に回る」');
      return this.say(['線路の向こうの、積み木の時計塔。針は止まったまま。', '歯車の窓をのぞくと、大ゼンマイの歯車がひとつあるだけで、ほかの歯車がなくなっている。', '窓のプレートには「かみあう歯車は、となりと反対に回る」。']);
    }
    let pending = false;
    gearPanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.gearsDone();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async gearsDone() {
    const g = this.g, R = this.R;
    g.take('gearBox');
    R.winGears.forEach((m) => { m.visible = true; });
    g.flag('gearsFixed');
    g.audio.play('clunk');
    await g.moveCamera(new V(3, 7.2, -1.5), new V(3, 5.6, -10.5), 1.4);
    g.audio.play('bell');
    await this.say(['カチッ、カチッ……時計塔の針が、右回りに、ゆっくり動きだした！']);
    this.questDone('時計塔の歯車がなおった！');
    await this.checkReady();
  }

  async talkRabbit() {
    const g = this.g, f = g.flags;
    this.talkCam(this.rabbit, 7);
    if (await this.tryWind('rabbit', ['オルゴールの上の、白いウサギの人形。両手を上げたまま、止まっている。'])) return;
    if (f.songFixed) return this.say([{ who: 'rabbit', text: 'ラ、ラ、ラ〜♪ 街のみんなが大好きな歌よ。' }]);
    if (!f.rabbitTalked) {
      g.flag('rabbitTalked');
      await this.say([
        { who: 'rabbit', text: 'あら……動ける。ありがとう。わたしはオルゴールのウサギ。' },
        { who: 'rabbit', text: 'わたしの太鼓のピンが、ぜんぶぬけてしまって、街の歌が鳴らないの。歌は【8つの音】。' },
        { who: 'rabbit', text: '楽譜は、【色の積み木】にして、ふたつに分けてしまってあるわ。【サイコロの目】の順にならべてね。' },
        { who: 'rabbit', text: 'ひとつは、積み木の恐竜さんの【おなかの下】。もうひとつは、ブリキの機関車さんの【貨車】の中。' },
        { who: 'rabbit', text: 'どの色がどの音かは……川にかかる【木琴】が知ってるわ。' },
      ]);
      g.note('ty-song', 'オルゴールの歌', '歌は<b>8つの音</b>。楽譜は<b>色の積み木</b>で、ふたつに分けてある。<b>サイコロの目</b>の順にならべる。<br>・恐竜のおなかの下 ・ブリキの機関車の貨車<br>色と音は、川の<b>木琴</b>で。');
      return;
    }
    return this.clickMusicBox();
  }

  async clickMusicBox() {
    const g = this.g, f = g.flags;
    this.focus(this.R.musicBox, 9);
    if (f.songFixed) return this.say(['オルゴールが、街の歌をくりかえし鳴らしている。']);
    if (!f.rabbitAwake) return this.say(['大きなオルゴール。ふたが開いていて、中の金色の太鼓が見える。', '太鼓のピンが、ぜんぶぬけている。上には、止まったウサギの人形。']);
    let pending = false;
    musicPanel(g.ui, g.audio, {
      play: (list) => this.playNotes(list),
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.songDone();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async songDone() {
    const g = this.g;
    g.flag('songFixed');
    this.R.drumPins.visible = true;
    await this.talkCam(this.rabbit, 10);
    await this.say(['ポロン、ポロロン……オルゴールの太鼓がまわりだし、街の歌が流れた。', { who: 'rabbit', text: 'この歌！ 街のみんなの歌……やっと思いだせた。' }]);
    this.questDone('オルゴールに街の歌がもどった！');
    await this.checkReady();
  }

  async clickXylo() {
    const g = this.g;
    this.focus(this.R.xylo, 9);
    this.playNotes(NOTE_MIDI, 0.3);
    g.flag('xyloSeen');
    g.note('ty-xylo', '木琴の橋', NOTE_NAMES.map((n, i) => `<span class="sc-b" style="background:${NOTE_COLORS[i]}"></span>${n}`).join('　'));
    await this.say(['川にかかる、木琴の橋。わたると、ポン、ポン、と音が鳴る。', 'けんばんの色と音：赤＝ド、橙＝レ、黄＝ミ、緑＝ソ、青＝ラ。', '（旅のメモに書きとめた）']);
  }

  async talkDino() {
    const g = this.g, f = g.flags;
    this.talkCam(this.dino, 14);
    if (await this.tryWind('dino', ['積み木でできた、大きな恐竜。おなかを地面につけて、すわりこんだまま止まっている。'])) return;
    if (!f.dinoMoved) return this.dinoStand();
    await this.say([{ who: 'dino', text: f.finaleDone ? 'ガオー♪ ……みんな動いて、うれしいガオ。' : 'ガオ……ぼく、力だけは じまんだガオ。' }]);
  }

  async dinoStand() {
    const g = this.g, d = this.dino, R = this.R;
    g.audio.play('roar');
    await this.say([{ who: 'dino', text: 'ガ……ガオ？ ふわあ、よくねた。ずっとすわってたら、おしりがしびれたガオ。' }]);
    g.cinematic = true;
    const from = d.root.position.clone(), to = DINO_HOME.clone().add(new V(2.8, 0, 0.6));
    R.score1.visible = true;
    await g.tweens.add({ duration: 1.8, ease: Ease.inOut, onUpdate: (k) => {
      d.root.position.lerpVectors(from, to, k);
      d.root.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * 0.12;
      d.legs.forEach((l, i) => { l.rotation.x = Math.sin(k * Math.PI * 4 + i * Math.PI) * 0.25; });
    } });
    d.legs.forEach((l) => { l.rotation.x = 0; });
    g.flag('dinoMoved');
    g.cinematic = false;
    await g.focusOn(R.score1.position.clone().add(new V(1.2, 0.4, 0)), { dist: 7, polar: 1.0, theta: -0.35, duration: 0.8 });
    await this.clickScore(0, true);
  }

  async clickScore(i, first = false) {
    const g = this.g;
    if (i === 0 && !first) this.focus(this.R.score1, 7);
    g.note(`ty-score${i}`, `楽譜の積み木 ${i === 0 ? '⚀' : '⚁'}`, scoreHTML(i));
    await this.say([
      i === 0 ? (first ? '恐竜がいたところに、色の積み木がならんでいる！' : '恐竜のいたところの、色の積み木。') : 'ブリキの機関車の貨車に、色の積み木がならんでいる！',
      `いちばん左は、サイコロの「${i === 0 ? '1' : '2'}」の積み木。そのあとに、色が4つ。（旅のメモに書きとめた）`,
    ]);
  }

  async talkLoco() {
    const g = this.g, f = g.flags;
    this.talkCam(this.loco, 8);
    if (await this.tryWind('loco', ['楕円の線路にのった、小さなブリキの機関車。うしろの貨車に、積み木をのせている。'])) return;
    if (!f.locoRan) return this.locoRun();
    if (!f.score2Seen) { g.flag('score2Seen'); return this.clickScore(1); }
    await this.say([{ who: 'loco', text: f.finaleDone ? 'シュッシュ！ ほしまわり号さん、またね！' : 'ぼくも、いつか、ほしまわり号みたいに、空を走りたいんだ！' }]);
  }

  async locoRun() {
    const g = this.g;
    await this.say([{ who: 'loco', text: 'ポッポー！ うごける！ わあ、本物の、ほしまわり号だ！ かっこいいなあ！' }]);
    g.cinematic = true;
    await g.focusOn(new V(OVAL.x, 0.8, OVAL.z), { dist: 16, polar: 0.95, theta: 0, duration: 0.8 });
    const t0 = this.locoT;
    g.audio.play('whistle');
    await g.tweens.add({ duration: 4.5, ease: Ease.inOut, onUpdate: (k) => { this.locoT = lerp(t0, LOCO_STOP + (t0 > 0.25 ? 1 : 0), k); this._placeLoco(this.locoT); if (Math.random() < 0.08) g.audio.play('chuff'); } });
    this.locoT = LOCO_STOP;
    g.flag('locoRan');
    g.flag('score2Seen');
    g.cinematic = false;
    await this.say([{ who: 'loco', text: 'ひと回りして、駅にとうちゃく！ ……あ、貨車の積み木？ 見ていいよ！' }]);
    await g.focusOn(this.loco.root.position.clone().add(new V(0, 0.6, 0)), { dist: 6, polar: 1.0, theta: 0.3, duration: 0.8 });
    await this.clickScore(1);
  }

  async talkMouse() {
    const g = this.g, f = g.flags;
    this.talkCam(this.mouse, 9);
    if (await this.tryWind('mouse', ['積み木の迷路の入口にいる、ゼンマイのネズミ。郵便かばんをさげて、止まっている。'])) return;
    g.audio.play('squeak');
    if (f.handleGot) return this.say([{ who: 'mouse', text: 'チュー！ 1巻き1歩、ぴったりだったチュー！' }]);
    if (!f.mouseTalked) {
      g.flag('mouseTalked');
      await this.say([
        { who: 'mouse', text: 'チュチュッ！ 動ける！ ……巻きハンドル？ それなら、この迷路のいちばん奥に落ちてるチュー。' },
        { who: 'mouse', text: 'でもぼく、【まっすぐ】しか歩けないんだチュー。曲がれるのは、【矢印タイル】の上だけ。' },
        { who: 'mouse', text: 'それに、ゼンマイを【1巻きすると1歩】だけ歩くチュー。巻きすぎると、行きすぎちゃう。' },
        { who: 'mouse', text: '矢印タイルは【3まい】あるチュー。ハンドルの上で、ぴったり止まれるようにしてチュー！' },
      ]);
      g.note('ty-march', 'ゼンマイ行進', 'ネズミは<b>まっすぐ</b>歩き、<b>矢印タイル</b>の上でその向きに曲がる。<br><b>1巻き＝1歩</b>。タイルは3まい。ハンドルの上でぴったり止まる。');
    }
    let pending = false;
    marchPanel(g.ui, g.audio, {
      onSolved: async (panel, res) => {
        pending = true;
        panel.close();
        await this.marchDone(res);
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async marchDone({ tiles, path }) {
    const g = this.g, m = this.mouse, R = this.R;
    g.flag('marchTiles', tiles);
    this._showArrows(tiles);
    g.cinematic = true;
    await g.focusOn(new V(MAZE_POS.x, 0.5, MAZE_POS.z), { dist: 12, polar: 0.85, theta: 0, duration: 0.8 });
    // 入口のマスへ
    const pts = [mazeCell(2, 4), ...path.map(([c, r]) => mazeCell(c, r))];
    let prev = m.root.position.clone();
    for (const p of pts) {
      const a = prev.clone();
      const ry = Math.atan2(p.x - a.x, p.z - a.z);
      m.root.rotation.y = ry;
      g.audio.play('dial');
      await g.tweens.add({ duration: 0.38, onUpdate: (k) => { m.root.position.lerpVectors(a, p, k); } });
      prev = p.clone();
    }
    g.audio.play('item');
    R.mazeHandle.visible = false;
    g.flag('marchDone');
    g.flag('handleGot');
    g.cinematic = false;
    await g.focusOn(m.root.position.clone().add(new V(0, 0.5, 0)), { dist: 11, polar: 0.35, theta: -0.55, duration: 0.8 });
    await this.say(['カシャン！ ネズミが、迷路の奥でぴたりと止まり、赤いハンドルをくわえた。', { who: 'mouse', text: 'チュー！ ぴったりだチュー！ これ、町長さんにとどけてチュー！' }]);
    g.give('crankHandle');
    this.questDone('巻きハンドルを見つけた！');
    await this.checkReady();
  }

  async clickCrank() {
    const g = this.g, f = g.flags;
    this.focus(this.R.crank, 11);
    if (f.finaleDone) return this.say(['大ゼンマイの巻き台。赤いハンドルがささっている。']);
    const lines = ['時計塔の足もとの、「ま」の積み木。ハンドルをさす穴があいている。', 'ここで大ゼンマイを巻くらしい。'];
    if (f.gearsFixed && f.songFixed && f.handleGot) lines.push('（準備はそろった。クマの町長に知らせよう）');
    await this.say(lines);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    if (target === 'maze') target = 'mouse';
    if (target === 'musicBox' && item === 'toyKey') target = 'rabbit';
    if (item === 'toyKey' && this.toys[target]) {
      if (!this.toys[target].frozen) return this.say(['もう、ゼンマイは巻いてある。']);
      return { dog: () => this.talkDog(), mouse: () => this.talkMouse(), dino: () => this.talkDino(), rabbit: () => this.talkRabbit(), loco: () => this.talkLoco() }[target]();
    }
    if (item === 'toyKey' && target === 'bear') return this.say([{ who: 'bear', text: 'ぼくはぬいぐるみだから、ゼンマイはないんだ。くすぐったいよ。' }]);
    if (item === 'toyKey' && (target === 'tower' || target === 'crank')) return this.say(['この鍵では小さすぎて、大ゼンマイは巻けない。専用の【巻きハンドル】がいるようだ。']);
    if (item === 'gearBox' && target === 'tower') return this.clickTower();
    if (item === 'crankHandle' && (target === 'crank' || target === 'tower' || target === 'bear')) {
      if (f.gearsFixed && f.songFixed) return this.finale();
      return this.say(['ハンドルをさしても、歯車と歌がそろわないと、大ゼンマイは巻けないようだ。']);
    }
    const talkers = { bear: 'それは、きみが持っていて。', frog: 'それはボイラーには入れられないケロ。' };
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
    this.train.s = s0 - 80;
    this.train.place();
    g.camera.position.set(18, 11, 16);
    g.controls.target.set(-18, 3, -8);
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
      g.camera.position.lerpVectors(camFrom, new V(4, 8, 8), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('からくりおもちゃの街', `STAGE ${stageNo('toy')}`, 2400);
    await g.say([
      'ほしまわり号は、夕やけ色のおもちゃの街に着いた。',
      '積み木の家、ブリキの塔、色えんぴつのさく。地面には、道路の絵のプレイマット。',
      '……でも、街はしんと静まりかえっている。',
    ]);
    await g.moveCamera(new V(1.5, 3.5, -0.6), FROG_HOME.clone().add(new V(0, 1.0, 0)), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'ケロ？ ぜんぶ、おもちゃケロ……！ ぼく、子どものころ、こういう積み木で遊んだ気がするケロ。' },
      { who: 'frog', text: 'でも、だれも動いてないケロ。……あっ、川の橋が上がったままケロ！ あれじゃ、わたれないケロ！' },
    ]);
    const portrait = innerWidth < innerHeight;
    await g.moveCamera(portrait ? new V(-5, 12, 18) : new V(-5.5, 8, 13), new V(-6.4, 1.4, -2.0), 2.0);
    g.cinematic = false;
    await this.talkBear();
  }

  async finale() {
    const g = this.g, R = this.R, d = this.dino;
    await this.say([
      { who: 'bear', text: '歯車も、歌も、ハンドルも……ぜんぶそろったんだね！ さあ、大ゼンマイを巻こう！' },
      { who: 'dino', text: 'ガオ！ 力しごとなら、まかせるガオ！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    g.take('crankHandle');
    R.crankHandle.visible = true;
    await g.moveCamera(new V(-2, 7.5, 6), new V(5, 3.5, -10.5), 2.0);
    // 恐竜が巻き台へ
    const from = d.root.position.clone(), r0 = d.root.rotation.y;
    const to = new V(8.6, 0, -9.2);
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => {
      d.root.position.lerpVectors(from, to, k);
      d.root.position.y = Math.abs(Math.sin(k * Math.PI * 6)) * 0.12;
      d.root.rotation.y = lerp(r0, -1.9, Math.min(1, k * 1.5));
      d.legs.forEach((l, i) => { l.rotation.x = Math.sin(k * Math.PI * 6 + i * Math.PI) * 0.25; });
    } });
    d.legs.forEach((l) => { l.rotation.x = 0; });
    await this.say([{ who: 'dino', text: 'いち、に、の……ギリギリギリ……！' }]);
    for (let i = 0; i < 3; i++) {
      g.audio.play('crank');
      await g.tweens.add({ duration: 0.7, onUpdate: (k) => { R.crankHandle.rotation.z = -(i + k) * Math.PI * 2; R.bigKey.rotation.z = (i + k) * 1.2; } });
    }
    g.flag('finaleDone');
    // 街が動きだす
    await g.moveCamera(new V(4, 16, 26), new V(0, 2, 0), 2.2);
    this.playNotes(SONG.map((k) => NOTE_MIDI[k]).concat([null], SONG.map((k) => NOTE_MIDI[k])), 0.42);
    for (const c of Object.values(this.toys)) if (c.frozen) { c.setFrozen(false); c.hop(); }
    for (const m of R.lampMats) m.emissiveIntensity = 1.8;
    this.locoLoop = true;
    g.audio.play('chime');
    await g.tweens.add({ duration: 2.5, ease: Ease.inOut, onUpdate: (k) => { this.backdrop.set(k); } });
    g.setGrade(GRADES.toyLive);
    await this.say(['ポロン、ポロロン……街の歌が流れだし、時計塔の鐘が鳴る。', '止まっていたおもちゃたちが、いっせいに動きだした！']);
    // はね橋が下りる
    await g.moveCamera(new V(20.8, 4.6, -1.2), new V(16.6, 0.8, -7), 1.8);
    g.audio.play('creak');
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => { R.drawbridge.rotation.z = 1.2 * (1 - k); } });
    g.audio.play('clunk');
    g.flag('bridgeDown');
    this.questDone('大ゼンマイが巻けた！ はね橋が下りた！');
    await this.parade();
    g.flag('departed');
    g.refreshQuests();
    await this.departure();
  }

  /** みんなで、おもちゃのパレード */
  async parade() {
    const g = this.g;
    this.party = true;
    const spots = [
      [this.bear, new V(-6.0, 0, 10.2), 0.1],
      [this.dog, new V(-4.2, 0, 10.8), -0.1],
      [this.mouse, new V(-2.6, 0, 11.0), -0.2],
      [this.dino, new V(-8.6, 0, 11.2), 0.5],
    ];
    const from = spots.map(([c]) => ({ p: c.root.position.clone(), r: c.root.rotation.y }));
    await g.moveCamera(new V(-5, 8, 25), new V(-5, 1.6, 10.6), 1.6);
    await g.tweens.add({ duration: 2.6, ease: Ease.inOut, onUpdate: (k) => spots.forEach(([c, to, ry], i) => {
      c.root.position.lerpVectors(from[i].p, to, k);
      // 小さな駅の屋根をよけて、町長は東側から回りこむ。
      if (c === this.bear) c.root.position.x += Math.sin(k * Math.PI) * 3;
      c.root.rotation.y = lerp(from[i].r, ry, k);
    }) });
    // カエルも
    const f0 = this.frog.root.position.clone();
    const f1 = new V(-1.0, 0, 11.8);
    await g.tweens.add({ duration: 1.6, ease: Ease.inOut, onUpdate: (k) => { this.frog.root.position.lerpVectors(f0, f1, k); this.frog.root.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * 0.3; this.frog.root.rotation.y = 0; } });
    await this.say([
      { who: 'bear', text: 'ありがとう。街に、また歌と、時計の音がもどった。' },
      { who: 'dog', text: 'ワンワン！ しっぽも、ぶんぶんだワン！' },
      { who: 'mouse', text: 'チュー！ 1巻き1歩、これからもがんばるチュー！' },
      { who: 'rabbit', text: 'ラ、ラ、ラ〜♪' },
      { who: 'loco', text: 'ほしまわり号さん、いってらっしゃい！ ぼくも、いつか空を走るよ！' },
      { who: 'bear', text: 'ほしまわり号のつぎの駅は、終点の「とうきょう」だね。にぎやかな町だと聞いているよ。' },
      { who: 'frog', text: '終点ケロ……。さみしいような、楽しみなような、ふしぎな気持ちケロ。' },
    ]);
    await g.moveCamera(new V(1.5, 3.5, -0.6), FROG_HOME.clone().add(new V(0, 1.0, 0)), 1.8);
    const f2 = this.frog.root.position.clone();
    await g.tweens.add({ duration: 1.4, ease: Ease.inOut, onUpdate: (k) => { this.frog.root.position.lerpVectors(f2, FROG_HOME, k); this.frog.root.position.y = Math.abs(Math.sin(k * Math.PI * 4)) * 0.3; } });
    this.frog.root.rotation.y = -0.3;
    await this.say([
      { who: 'frog', text: 'さあ、出発するケロ！ つぎはいよいよ終点ケロ。最後まで、いっしょに旅するケロ！' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(4, 4.5, -1.0), new V(0, 1.3, -7.0), 2.0);
    g.audio.play('whistle');
    await g.wait(1.4);
    this.departing = true;
    g.tweens.add({ duration: 8, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6; } });
    await g.moveCamera(new V(13, 6, 4), new V(19, 1.5, -7.0), 6.5);
    g.audio.play('whistle');
    await g.wait(3.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    this.party = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'toy'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'toy', '街の歌に見送られて、ほしまわり号は、はね橋をわたっていく。');
  }
}
