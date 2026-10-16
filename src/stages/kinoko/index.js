import { makeFiveYen } from './coins.js';
import * as THREE from 'three';
import { makeBackdrop } from '../../lib/backdrop.js';
import { GRADES } from '../../core/postfx.js';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs, makeFireflies } from '../../lib/environment.js';
import { Motes } from '../../lib/livefx.js';
import { makeFrog } from '../../lib/creatures.js';
import { makeElder, makeSnail, makeAnt, makeLadybug, makeFirefly, makeSpider, makeBeetle } from '../../lib/creatures-kinoko.js';
import { lerp, softCircleTexture, add, mat, G } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildRails } from '../../lib/rails.js';
import { Ease } from '../../core/tween.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildKinokoDiorama, TRACK_Z, MAP, cellPos } from './diorama.js';
import { UNITS_HTML, mapHTML, digPanel, shadowPanel, SHADOW_GOAL } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  elder: { name: 'キノコの長老', icon: '🍄', color: '#c8402e', voice: 260 },
  snail: { name: 'カタツムリの郵便屋', icon: '🐌', color: '#c8783a', voice: 330 },
  ant: { name: 'アリの隊長', icon: '🐜', color: '#5a3a2a', voice: 700 },
  lady: { name: 'テントウムシの子ども', icon: '🐞', color: '#e0382a', voice: 1300 },
  firefly: { name: 'ホタルの灯り番', icon: '✨', color: '#c8a020', voice: 900 },
  spider: { name: 'クモの機織り', icon: '🕸', color: '#6a4a7a', voice: 560 },
  beetle: { name: 'カブトムシ', icon: '🪲', color: '#5a2e1a', voice: 160 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

/** カエルの大きさ：0=ちいさい 1=ふつう 2=おおきい */
const SIZES = [0.42, 1, 2.1];
const SIZE_NAME = ['ちいさい', 'ふつう', 'おおきい'];
const FROG_HOME = new V(1.0, 0, -3.9);

/** 線路：左上の空から降りて、森を横切り、右の丸太のトンネルへ */
function makeKinokoPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-95, 30, 40), new V(-62, 24, 22), new V(-34, RAIL_Y, TRACK_Z), new V(-16, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-16, RAIL_Y, TRACK_Z), new V(22, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(22, RAIL_Y, TRACK_Z), new V(38, RAIL_Y, TRACK_Z), new V(52, 8, -16), new V(70, 16, -34)));
  p.add(new THREE.CubicBezierCurve3(new V(70, 16, -34), new V(86, 22, -50), new V(100, 26, -66), new V(118, 28, -86)));
  p.arcLengthDivisions = 800;
  return p;
}

/**
 * ステージ：巨大キノコの森
 * 目的：線路をふさぐ枯れ枝を、カブトムシにどけてもらう
 * しかけ：赤いキノコの胞子でカエルが大きく、青いキノコの胞子で小さくなる
 */
export class KinokoStage {
  constructor(game) {
    this.g = game;
    this.id = 'kinoko';
    this.title = '巨大キノコの森';
    this.questTitle = '🍄 線路の枯れ枝をどける';
    this.departing = false;
    this.trainSpeed = 0;
    this.dripT = 1;
    this.antT = 0;
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('kinoko');

    // 雨上がりの夕方：洗われた青と、桃色の雲
    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#5a8ac8'); u.dMid.value.set('#f0c0a8'); u.dBot.value.set('#f8e4c4');
    u.night.value = 0.18;
    u.sunDir.value.set(-0.85, 0.2, -0.5).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#b8c8b0', 60, 220);
    g.renderer.toneMappingExposure = 1.12;
    this.hemi = new THREE.HemisphereLight('#d8ecff', '#5a6a3a', 1.25);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffe0b8', 2.4));
    sun.position.set(-16, 22, 8);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -21; sc.right = 21; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 80;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: 30, d: 22, seed: 29, grass: '#6a8a4a' });
    scene.add(this.island);
    this.clouds = makeClouds(31);
    this.clouds.userData.mat.color.set('#f4e8e0');
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('kinoko');
    scene.add(this.backdrop.group);
    g.setGrade(GRADES.kinoko);
    this.smallIslands = [[-58, 4, -36, 4, 31], [52, -2, 30, 3, 32], [-72, 12, 20, 5, 33], [-26, -6, 62, 4, 35]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車
    this.path = makeKinokoPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 15; // 機関車が x=-1 に止まる
    const L = this.path.getLength();
    this.tracks = buildRails(scene, this.path, { z: TRACK_Z, islandX: [-14.8, 15.4], pillars: [cl[0] - 6, cl[0] - 12, cl[0] - 18, cl[1] + 4, cl[1] + 8, cl[1] + 12].filter((s) => s > 0 && s < L) });
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();

    await this.g.loadingStep(0.3, '森を組み立てています…');
    const R = (this.R = buildKinokoDiorama(scene));

    // パーティクル
    this.smoke = new Puffs(scene, { count: 60, color: '#f0f0f4', opacity: 0.65 });
    this.spores = new Puffs(scene, { count: 60, color: '#ffffff', opacity: 0.8, additive: true });
    this.motes = new Motes(scene, { count: 90, color: '#e8ffd0', size: 0.09, area: { x: 28, z: 20, y0: 0.4, y1: 6 }, kind: 'dust', opacity: 0.55 });
    this.flies = makeFireflies(40, { x: 26, z: 18, y0: 0.5, y1: 4 }, 37);
    this.flies.material.uniforms.intensity.value = 0.25;
    scene.add(this.flies);
    this._makeDrips(scene);
    this.sparkles = this._makeSparkles(scene);
    this._makeRope(scene);

    await this.g.loadingStep(0.6, '住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();

    g.ui.onLine = (who) => {
      const c = this.speakerCreature(who);
      if (c) c.talk(2.2);
    };
  }

  /** 雨だれ：キノコのかさから、ときどきしずくが落ちて地面に波紋 */
  _makeDrips(scene) {
    const dm = new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.05, transparent: true, opacity: 0.6, emissive: '#8ac8f0', emissiveIntensity: 0.3 });
    this.drops = [];
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(G.sphere(0.07, 8, 6), dm);
      d.scale.set(1, 1.4, 1);
      d.visible = false;
      d.userData.noPick = true;
      scene.add(d);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), new THREE.MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      ring.userData.noPick = true;
      scene.add(ring);
      this.drops.push({ d, ring, v: 0, t: 0, on: false });
    }
  }

  /** フィナーレで枝をしばる綱 */
  _makeRope(scene) {
    this.rope = new THREE.Group();
    const rm = mat('#f4f0ff', { roughness: 0.6 });
    for (const z of [-1.6, 1.2]) add(this.rope, G.torus(0.52, 0.06, 6, 18), rm, 0, 0.5, z, { rot: [0, 0, 0] });
    this.rope.visible = false;
    this.rope.userData.noPick = true;
    this.R.branch.add(this.rope);
  }

  _optimize() {
    if (new URLSearchParams(location.search).has('nomerge')) return; // 調査用
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
    this.elder = makeElder();
    this.elder.root.position.set(-3.4, 0, -0.6);
    this.elder.root.rotation.y = 0.2;
    this.snail = makeSnail();
    this.snail.root.position.set(-5.0, 0, 2.9);
    this.snail.root.rotation.y = -0.5;
    this.captain = makeAnt({ captain: true });
    this.captain.root.position.set(5.5, 0, 1.8);
    this.captain.root.rotation.y = -0.3;
    this.captain.root.scale.setScalar(1.25);
    this.ladies = [makeLadybug(7), makeLadybug(5), makeLadybug(3)];
    [[5.4, 7.6, 0.6], [7.4, 7.7, -0.6], [6.5, 8.3, 0]].forEach(([x, z, ry], i) => {
      const c = this.ladies[i];
      c.root.position.set(x, 0, z);
      c.root.rotation.y = ry;
      c.root.scale.setScalar(1.3 - i * 0.12);
    });
    this.firefly = makeFirefly();
    this.firefly.root.scale.setScalar(0.62);
    this.firefly.noIdleHop = true;
    this.spider = makeSpider();
    this.spider.root.position.set(13.4, 0, 4.9);
    this.spider.root.rotation.y = -0.9;
    this.beetle = makeBeetle();
    this.beetle.root.position.set(11.9, 0, -1.6);
    this.beetle.root.rotation.y = -0.8;
    this.beetle.noIdleHop = true;
    this.beetle.setAwake(false);
    // 行列のアリたち（巣とビスケットのあいだを行ったり来たり）
    this.ants = [];
    const crumbM = mat('#e0b070', { roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const a = makeAnt({ color: i % 3 ? '#3a2420' : '#5a2a1a' });
      a.root.scale.setScalar(0.62);
      a.noIdleHop = true;
      a.crumb = add(a.body, G.box(0.26, 0.14, 0.2), crumbM, 0, 1.0, 0.05, { rot: [0.2, 0.4, 0.1] });
      a.ph = i / 7;
      this.ants.push(a);
    }
    this.antPath = new THREE.CatmullRomCurve3([new V(7.2, 0, 1.4), new V(8.0, 0, 2.5), new V(9.4, 0, 3.0), new V(10.2, 0, 3.6), new V(9.6, 0, 4.6), new V(8.6, 0, 3.8), new V(7.6, 0, 2.6)], true);
    this.creatures = [this.frog, this.elder, this.snail, this.captain, ...this.ladies, this.firefly, this.spider, this.beetle, ...this.ants];
    for (const c of this.creatures) scene.add(c.root);
    // 眠りの Zzz（カブトムシとホタル）
    this.zzz = [];
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.font = '900 48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.strokeStyle = '#3a4a2a'; x.lineWidth = 6; x.strokeText('Z', 32, 34); x.fillText('Z', 32, 34);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
      s.userData.noPick = true;
      scene.add(s);
      this.zzz.push(s);
    }
    void R;
  }

  speakerCreature(who) {
    return { elder: this.elder, snail: this.snail, ant: this.captain, lady: this.ladies[0], firefly: this.firefly, spider: this.spider, beetle: this.beetle, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    reg('elder', this.elder.root, 'キノコの長老', () => this.talkElder());
    reg('snail', this.snail.root, 'カタツムリの郵便屋', () => this.talkSnail());
    reg('cart', R.cart, '郵便車', () => this.talkSnail());
    reg('captain', this.captain.root, 'アリの隊長', () => this.talkAnt());
    this.ladies.forEach((c, i) => reg(`lady${i}`, c.root, 'テントウムシの子ども', () => this.talkLadies()));
    reg('button', R.button, 'ボタンのテーブル', () => this.talkLadies());
    reg('firefly', this.firefly.root, 'ホタルの灯り番', () => this.talkFirefly());
    reg('bell', R.bell, '釣鐘草', () => this.clickBell());
    reg('spider', this.spider.root, 'クモの機織り', () => this.talkSpider());
    reg('web', R.web, 'クモの巣', () => this.clickWeb());
    reg('beetle', this.beetle.root, 'カブトムシ', () => this.talkBeetle());
    reg('branch', R.branch, '枯れ枝', () => this.clickBranch());
    reg('red', R.redShroom, '赤いキノコ', () => this.clickShroom(+1));
    reg('blue', R.blueShroom, '青いキノコ', () => this.clickShroom(-1));
    reg('goen', R.goen, 'ぬかるみの金色の物', () => this.clickGoen());
    reg('mud', R.mud, 'ぬかるみ', () => (g.flags.goenTaken ? this.say(['雨でできた、ぬかるみ。茶色くにごっている。']) : this.clickGoen()));
    reg('antSign', R.antSign, '小さな立て札', () => this.clickAntSign());
    reg('nest', R.nest, 'アリの巣', () => this.clickNest());
    reg('crumb', R.crumb, 'ビスケットのかけら', () => this.say(['大きなビスケットのかけら。アリたちが少しずつ巣へ運んでいる。', 'いいにおいがする。']));
    reg('field', R.field, 'ふかふかの土', () => this.clickField());
    reg('stump', R.stump, '切り株', () => this.say(['小さな切り株。年輪がくっきり見える。', this.g.has('antMap') ? '（宝の地図の、出発点だ）' : 'まわりの土は、ふかふかしている。']));
    reg('thimble', R.thimble, 'ゆびぬき', () => this.say(['掘り出した穴のそばに、何かある。']));
    reg('flower', R.flower, 'あまつゆ草', () => this.clickFlower());
    reg('dewLeaf', R.dewLeaf, 'しずくの葉', () => this.clickDewLeaf());
    reg('coin', R.coin100, '銀色の橋', () => this.say(['小川にかかった、銀色の円盤の橋。表には「100」の字と、花のもよう。', { who: 'frog', text: 'これも「いにしえの遺物」ケロ？ 森のみんなは、じょうぶな橋にしてるケロ。' }]));
    reg('rill', R.rill, '小川', () => this.say(['雨水が集まってできた小川。どろがまじって、にごっている。']));
    reg('pencil', R.pencil, '黄色い丸太', () => this.say(['線路の向こうに横たわる、六角形の黄色い丸太。', '片方はとがっていて、もう片方には桃色のやわらかい物がついている。', { who: 'elder', text: 'それは、むかし空から降ってきた「書くための木」じゃ。……と、言い伝えにはある。' }]));
    reg('eraser', R.eraser, '白いベンチ', () => this.say(['やわらかくて白い、四角いベンチ。青い紙の帯が巻いてある。', 'すわると、ふにっとしずむ。']));
    reg('post', R.post, 'ポスト', () => this.say(['青くて、つつの形をしたポスト。横に、細長い金具がついている。', { who: 'snail', text: 'それはぼくの郵便局のポストさ。いにしえの遺物を、ちょっとお借りしてるんだ〜。' }]));
    reg('capStool', R.capStool, '赤いいす', () => this.say(['ホームの、赤くて丸いいす。ふちにギザギザのみぞがある。', { who: 'frog', text: 'すわりごこち、ばっちりケロ。' }]));
    reg('house', R.elderHouse, '長老の家', () => this.say(['大きな赤いキノコの家。窓に、あたたかな灯りがともっている。']));
    reg('log', R.logTunnel, '丸太のトンネル', () => this.say(['線路は、横たわった大きな丸太の中へつづいている。', this.g.flags.branchMoved ? 'もう、何もふさいでいない。' : 'でも手前で、枯れ枝が線路をふさいでいる。']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『きのこのもり』……左は『ゆげのさと』、右は『からくりのまち』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。ボイラーのまわりで、しずくが湯気になっている。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。窓に、雨のしずくがきらきら光っている。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  applyState() {
    const f = this.g.flags, R = this.R;
    this.size = f.frogSize ?? 1;
    this.frog.root.scale.setScalar(SIZES[this.size]);
    R.goen.visible = !f.goenTaken;
    R.goenWheel.visible = !!f.cartFixed;
    if (f.cartFixed && !R.goenWheel.children.length) {
      const wheel = makeFiveYen(); wheel.scale.setScalar(0.48); R.goenWheel.add(wheel);
    }
    R.digHole.visible = !!f.thimbleDug;
    R.thimble.visible = false;
    R.dewDrop.visible = !f.dewTaken;
    R.bud.visible = !f.flowerBloom;
    R.bloom.visible = !!f.flowerBloom;
    R.nectarMat.emissiveIntensity = f.nectarTaken ? 0.3 : 1.2;
    R.stencil.visible = !!f.stencilWoven && !f.shadowDone;
    R.shadow.material.opacity = 0;
    this.beetle.setAwake(!!f.beetleAwake);
    this.beetle.root.rotation.y = -0.8;
    this._setFirefly(!!f.fireflyAwake);
    if (f.branchMoved) R.branch.visible = false;
    this.backdrop.set(f.branchMoved ? 1 : 0);
    this.g.setGrade(f.branchMoved ? GRADES.kinokoRainbow : GRADES.kinoko);
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  /** ホタル：寝ているときは釣鐘草の中、起きると影絵の台のそばを飛ぶ */
  _setFirefly(awake) {
    const ff = this.firefly;
    ff.sleeping = !awake;
    ff.lampOn = awake;
    ff.nightcap.visible = !awake;
    if (!awake) {
      ff.setLamp(0);
      const p = this.R.bellFlower.getWorldPosition(new V());
      ff.root.position.set(p.x, p.y - 0.5, p.z);
      ff.root.rotation.y = 0.4;
      for (const e of ff.eyes) e.scale.y = 0.1;
    } else {
      this.flyHome = this._flyHome();
      ff.root.position.copy(this.flyHome);
      for (const e of ff.eyes) e.scale.y = 1;
    }
    this.R.bellMat.emissiveIntensity = awake ? 0 : 0.15;
  }

  _flyHome() {
    const w = this.R.web;
    return w.localToWorld(new V(-1.4, 1.6, 2.4));
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    this.flies.material.uniforms.time.value = t;
    this.motes.update(dt, t);
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;

    // 胞子のキノコが、ほんのり明滅
    R.redCapM.emissiveIntensity = 0.25 + Math.sin(t * 1.6) * 0.12;
    R.blueCapM.emissiveIntensity = 0.25 + Math.sin(t * 1.6 + 1.5) * 0.12;
    if (Math.random() < dt * 1.2) {
      const red = Math.random() < 0.5;
      const p = (red ? R.redTop : R.blueTop).clone().add(new V((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2));
      this.spores.emit(p, { vel: new V(0, 0.35, 0), spread: 0.2, life: 2.4, size0: 0.08, size1: 0.22, color: red ? '#ff9a7a' : '#8ac0ff' });
    }

    // 行列のアリ
    if (!this.departing) {
      this.antT += dt * 0.022;
      for (const a of this.ants) {
        const k = (this.antT + a.ph) % 1;
        const p = this.antPath.getPointAt(k);
        const q = this.antPath.getPointAt((k + 0.005) % 1);
        a.root.position.set(p.x, Math.abs(Math.sin(t * 9 + a.ph * 20)) * 0.04, p.z);
        a.root.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
        a.crumb.visible = k > 0.5; // ビスケットから巣へもどるときだけ運ぶ
      }
    }

    // 寝ている Zzz（カブトムシ・ホタル）
    const zs = [[this.beetle, 0, new V(0.4, 2.2, 1.4), 0.4], [this.firefly, 3, new V(0.1, 0.1, 0.2), 0.12]];
    for (const [c, i0, off, sc] of zs) {
      for (let i = 0; i < 3; i++) {
        const z = this.zzz[i0 + i];
        z.visible = c.sleeping && g.playing;
        const k = (t * 0.45 + i / 3) % 1;
        const p = c.root.position;
        z.position.set(p.x + off.x + k * 0.5, p.y + off.y + k * 0.9 * (sc / 0.4), p.z + off.z);
        z.material.opacity = Math.sin(k * Math.PI);
        z.scale.setScalar((0.15 + k * 0.25) * (sc / 0.4) * 1.4);
      }
    }

    // 起きたホタルは、ふわふわ飛ぶ
    if (this.firefly.lampOn && !this.flyBusy && this.flyHome) {
      const h = this.flyHome;
      this.firefly.root.position.set(h.x + Math.sin(t * 0.7) * 0.25, h.y + Math.sin(t * 1.3) * 0.15, h.z + Math.cos(t * 0.6) * 0.2);
    }
    if (this.firefly.lampOn) this.firefly.body.rotation.x = Math.sin(t * 9) * 0.04;

    // 雨だれ
    this.dripT -= dt;
    if (this.dripT < 0 && R.drips.length) {
      this.dripT = 0.5 + Math.random() * 0.9;
      const d = this.drops.find((x) => !x.on);
      if (d) {
        const o = R.drips[Math.floor(Math.random() * R.drips.length)];
        d.d.position.set(o.x + (Math.random() - 0.5) * 0.8, o.y, o.z + (Math.random() - 0.5) * 0.8);
        d.v = 0; d.on = true; d.t = -1; d.d.visible = true;
      }
    }
    for (const d of this.drops) {
      if (!d.on) continue;
      if (d.t < 0) {
        d.v += dt * 14;
        d.d.position.y -= d.v * dt;
        if (d.d.position.y <= 0.05) {
          d.d.visible = false;
          d.t = 0;
          d.ring.visible = true;
          d.ring.position.set(d.d.position.x, 0.04, d.d.position.z);
        }
      } else {
        d.t += dt;
        const k = d.t / 0.9;
        d.ring.scale.setScalar(0.1 + k * 0.5);
        d.ring.material.opacity = 0.6 * (1 - k);
        if (k >= 1) { d.ring.visible = false; d.on = false; }
      }
    }

    // 煙
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.7;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      if (p.x < 13) this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.3, 0), spread: 0.5, life: heavy ? 2.4 : 3.0, size0: 0.5, size1: heavy ? 3.2 : 2.2 });
    }
    this.smoke.update(dt);
    this.spores.update(dt);

    // 発車
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0 && this.train.s < this.stopS + 30) { this.chuffT = 0.5; g.audio.play('chuff'); }
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
    if (!f.introDone) return [{ text: 'キノコの長老に話しかけよう', done: false }];
    const rope = f.ropeGot;
    const q = [
      { text: '🪲 ねむっているカブトムシを起こす', done: !!f.beetleAwake },
      { text: '🍯 カブトムシに、あまつゆ草の蜜をあげる', done: !!f.beetleFed },
      { text: '🕸 枝をしばる、丈夫な綱を手に入れる', done: !!rope },
    ];
    if (f.beetleAwake && f.beetleFed && rope) q.push({ text: '🌿 カブトムシに、枝をどけてもらう', done: !!f.branchMoved });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    const size = this.size;
    const need = (want) => (want === 2 ? '赤いキノコの胞子で、カエルの機関士を大きくしよう。' : '青いキノコの胞子で、カエルの機関士を小さくしよう。');
    if (!f.introDone) return H('intro', 'ホームの前にいる、キノコの長老に話しかけよう。');
    if (f.beetleAwake && f.beetleFed && f.ropeGot) return H('final', '準備はそろった！ カブトムシに話しかけよう。');
    const steps = [];
    // 蜜
    if (!f.beetleFed) {
      if (has('nectar')) steps.push(f.beetleAwake ? H('feed', '持ち物の『あまつゆ草の蜜』を選んで、カブトムシに使おう。') : null);
      else if (has('thimbleWater')) steps.push(H('water', '持ち物の『しずく入りのゆびぬき』を選んで、左手前の『あまつゆ草』に使おう。'));
      else if (has('thimble')) steps.push(size === 2 ? H('dew', 'あまつゆ草のそばの、高い『しずくの葉』を調べよう。（ゆびぬきを持ったまま）') : H('dewBig', 'きれいな水は、高い葉っぱの先のしずく。届くように、' + need(2)));
      else if (has('antMap')) {
        if (!f.unitsRead) steps.push(H('units', '地図は「虫の単位」で書いてある。アリの巣のそばの、小さな立て札を読もう。', size === 0 ? '小さくなったカエルなら読める。立て札を調べよう。' : '字がとても小さい。' + need(0)));
        else if (size !== 2) steps.push(H('digBig', 'かたい土を掘るには、' + need(2), 'そのあと、左手前の『ふかふかの土』を調べよう。'));
        else steps.push(H('dig', '切り株から北へ カタツムリ2ひき（アリ6ぴき）、東へ テントウムシ4ひき（アリ8ぴき）。', '『ふかふかの土』を調べて、そのマスを掘ろう。'));
      } else if (has('oldLetter')) steps.push(H('letter', '持ち物の『百年前の手紙』を選んで、キノコの長老に使おう。'));
      else if (f.cartFixed) steps.push(H('snail2', 'カタツムリの郵便屋さんに話しかけよう。'));
      else if (has('goen')) steps.push(H('wheel', '持ち物の『5円玉』を選んで、カタツムリの郵便屋さんに使おう。まんなかに穴がひとつ！'));
      else if (!f.snailTalked) steps.push(H('snail', '左の、カタツムリの郵便屋さんに話を聞いてみよう。'));
      else if (size !== 2) steps.push(H('goenBig', '「まんまるで、まんなかに穴がひとつ」の遺物は、手前のぬかるみにうまっている。', 'ぬかるみから引っぱり出すには、' + need(2)));
      else steps.push(H('goen', '手前のぬかるみの、金色の丸い物を調べよう。'));
    }
    // カブトムシを起こす・綱
    if (!f.beetleAwake) {
      if (!f.spiderTalked) steps.push(H('spider', '右の、クモの機織りに話を聞いてみよう。'));
      else if (!f.fireflyAwake) steps.push(size === 0 ? H('bell', '右手前の『釣鐘草』を調べて、ホタルを起こそう。') : H('bellSmall', 'ホタルは、右手前の『釣鐘草』の中で眠っている。せまい花の中に入るには、' + need(0)));
      else steps.push(H('shadow', 'クモの巣で、二つの物の影を重ねて大きなつのを作ろう。',
        '型を左右に分けて見てみよう。上へ伸びる二本と、下へ伸びる軸は、どんな小枝を組み合わせるとできるかな。',
        '影①・影②を切り替えて、それぞれを回したり上下反転できる。形ができたら灯りの距離を調整しよう。ホタルが物に近いほど影は大きくなる。',
        '曲がった小枝とかぎ形の小枝を選び、枝先が左右上方を向き、軸が下で重なる向きにする。灯りを小枝に近づけて型の大きさに合わせよう。'));
    }
    return steps.filter(Boolean)[0] || H('none', 'あちこち調べてみよう。');
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

  inspectItem(id) {
    if (id === 'antMap') {
      this.g.audio.play('paper');
      this.g.ui.openPanel({ title: '宝の地図', body: mapHTML() });
      return true;
    }
    return false;
  }

  // =========================================================
  // 共通
  // =========================================================
  say(lines) { return this.g.say(lines); }

  focus(obj, dist, opt = {}) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(4, Math.max(0.6, p.y + 0.5)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined, ...opt });
  }

  /** 話し相手を、正面から写す */
  talkCam(c, dist) {
    return this.focus(c.root, dist, { theta: c.root.rotation.y, polar: 1.02, keepAngle: true });
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
    if (f.beetleAwake && f.beetleFed && f.ropeGot) {
      await this.say(['これで準備はそろった。カブトムシに話しかけよう！']);
      this.g.refreshQuests();
    }
  }

  // =========================================================
  // カエルの機関士：大きさと移動
  // =========================================================
  /** カエルが、ぴょんぴょんとんで移動する */
  async frogGo(to, ry) {
    const g = this.g, fr = this.frog.root;
    const from = fr.position.clone();
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;
    const r0 = fr.rotation.y;
    const r1 = ry ?? Math.atan2(to.x - from.x, to.z - from.z);
    const hops = Math.max(1, Math.round(dist / (0.9 * SIZES[this.size] + 0.4)));
    const dur = Math.min(3.2, 0.35 * hops + 0.3);
    await g.tweens.add({ duration: dur, onUpdate: (k) => {
      fr.position.lerpVectors(from, to, k);
      fr.position.y = to.y * k + Math.abs(Math.sin(k * hops * Math.PI)) * 0.35 * SIZES[this.size];
      const a = Math.atan2(Math.sin(r1 - r0), Math.cos(r1 - r0));
      fr.rotation.y = r0 + a * Math.min(1, k * 3);
    } });
  }

  /** カエル（と、そばの物）が全身入るように、カメラを引く */
  frameFrog(at, extra = 0) {
    const fr = this.frog.root;
    const p = at ? at.clone().lerp(fr.position, 0.5) : fr.position.clone();
    const sc = SIZES[this.size];
    return this.g.focusOn(new V(p.x, 0.5 + sc * 0.7, p.z), { dist: 6 + sc * 4 + extra, duration: 0.9, polar: 1.05, theta: 0 });
  }

  /** 胞子をあびて、大きさが変わる */
  async setSize(n) {
    const g = this.g, fr = this.frog.root;
    const s0 = SIZES[this.size], s1 = SIZES[n];
    this.size = n;
    g.flag('frogSize', n);
    g.audio.play(s1 > s0 ? 'whoosh' : 'pop');
    for (let i = 0; i < 16; i++) {
      this.spores.emit(fr.position.clone().add(new V((Math.random() - 0.5) * 1.2 * s0, Math.random() * 1.4 * s0, (Math.random() - 0.5) * 1.2 * s0)), { vel: new V(0, 0.6, 0), spread: 0.8, life: 1.6, size0: 0.15, size1: 0.5, color: s1 > s0 ? '#ff9a7a' : '#8ac0ff' });
    }
    await g.tweens.add({ duration: 1.0, ease: Ease.out, onUpdate: (k) => {
      const wob = Math.sin(k * Math.PI * 4) * 0.08 * (1 - k);
      fr.scale.setScalar(lerp(s0, s1, k) * (1 + wob));
    } });
    fr.scale.setScalar(s1);
  }

  async clickShroom(dir) {
    const g = this.g, f = g.flags, R = this.R;
    const red = dir > 0;
    const obj = red ? R.redShroom : R.blueShroom;
    this.focus(obj, 13);
    if (!f.introDone) {
      return this.say([red ? '赤いかさに白い水玉のキノコ。かさから、きらきらした赤い胞子がこぼれている。' : '青く光るキノコ。かさから、きらきらした青い胞子がこぼれている。']);
    }
    const n = this.size + dir;
    if (n > 2) return this.say([{ who: 'frog', text: 'これ以上は大きくなれないケロ〜。……もう、頭がキノコにぶつかりそうケロ。' }]);
    if (n < 0) return this.say([{ who: 'frog', text: 'これ以上は小さくなれないケロ。……アリさんと、目の高さがおなじケロ。' }]);
    g.cinematic = true;
    const p = obj.position.clone().add(new V(red ? 0.4 : 0.9, 0, red ? 1.3 : 1.1));
    await this.frogGo(p, red ? -2.6 : -2.4);
    // かさをゆらして、胞子をあびる
    await g.tweens.add({ duration: 0.4, onUpdate: (k) => { obj.rotation.z = Math.sin(k * Math.PI * 3) * 0.08; } });
    obj.rotation.z = 0;
    await this.setSize(n);
    this.frog.root.rotation.y = 0.3;
    await this.frameFrog(obj.position, 2);
    g.cinematic = false;
    const lines = {
      2: ['ぐんぐんぐん……！', { who: 'frog', text: 'わわっ、大きくなったケロ！ 力もりもりケロ〜！' }],
      1: [{ who: 'frog', text: 'ふう、いつもの大きさにもどったケロ。' }],
      0: ['しゅるしゅるしゅる……', { who: 'frog', text: 'ちっちゃくなっちゃったケロ！ アリさんの立て札の字も、読めそうケロ。' }],
    };
    if (!f.sizeTried) {
      g.flag('sizeTried');
      lines[n].push({ who: 'frog', text: '赤いキノコで大きく、青いキノコで小さく……。用があるところをえらんでくれたら、ぼくが行くケロ！' });
    }
    await this.say(lines[n]);
  }

  /** 大きさがたりないとき、カエルが言うこと */
  sizeLine(want) {
    if (want === 2) return { who: 'frog', text: 'ぼくがもっと大きければ、なんとかなりそうケロ。赤いキノコの胞子ケロ！' };
    return { who: 'frog', text: 'ぼくがもっと小さければ、なんとかなりそうケロ。青いキノコの胞子ケロ！' };
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkFrog() {
    this.talkCam(this.frog, 9 + SIZES[this.size] * 3);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.branchMoved) return this.say([{ who: 'frog', text: '線路があいたケロ！ いつでも出発できるケロ！' }]);
    if (!f.introDone) return this.say([{ who: 'frog', text: 'キノコのおじいさんが、こっちを見てるケロ。話しかけてみるケロ。' }]);
    const t = [
      'いまのぼくは、ちっちゃいケロ。せまいところや、小さい字ならまかせるケロ！',
      'いまのぼくは、ふつうの大きさケロ。',
      'いまのぼくは、おおきいケロ！ 重い物も、高いところも、まかせるケロ！',
    ][this.size];
    await this.say([{ who: 'frog', text: t }]);
  }

  async talkElder() {
    const g = this.g, f = g.flags;
    this.talkCam(this.elder, 9);
    if (!f.introDone) return this.elderIntro();
    if (g.has('oldLetter')) return this.readLetter();
    if (f.branchMoved) return this.say([{ who: 'elder', text: '虹じゃ……。雨上がりの森は、いちばんきれいじゃろう。' }]);
    if (f.beetleAwake && f.beetleFed && f.ropeGot) return this.say([{ who: 'elder', text: 'さあ、カブトムシどのに声をかけておやり。' }]);
    const lines = [];
    if (!f.beetleAwake) lines.push({ who: 'elder', text: 'カブトムシどのは、ねぼすけでな。クモの機織りが、起こしかたを知っておるはずじゃ。' });
    if (!f.beetleFed) lines.push(g.has('antMap')
      ? { who: 'elder', text: '地図は、虫の単位で書いてあるでな。アリの隊長が、ものさしにくわしいぞ。' }
      : { who: 'elder', text: 'あまつゆ草の蜜があれば、カブトムシどのも力が出るんじゃが……あいにく花がしおれておる。' });
    lines.push({ who: 'elder', text: `カエルどのは、いま「${SIZE_NAME[this.size]}」じゃな。赤いキノコで大きく、青いキノコで小さく、じゃよ。` });
    await this.say(lines);
  }

  async elderIntro() {
    const g = this.g;
    await this.say([
      { who: 'elder', text: 'おや、ほしまわり号のお客人。ようこそ、キノコの森へ。わしは、この森の長老じゃ。' },
      { who: 'elder', text: 'ゆうべの大雨で、ほれ、あの【枯れ枝】が線路の上に落ちてきてしもうてな。' },
      { who: 'elder', text: 'あれをどけられるのは、森いちばんの力持ち、【カブトムシ】どのだけじゃ。' },
      { who: 'elder', text: 'ところが、カブトムシどのは雨のあいだに眠りこんで、ちっとも起きん。起きたとしても、腹ぺこでは力が出んじゃろう。' },
      { who: 'elder', text: 'それに、あんな大きな枝。しばって持ち上げる、丈夫な【綱】もいるのう。' },
    ]);
    // 胞子のキノコの紹介
    g.cinematic = true;
    await g.moveCamera(new V(-0.6, 4.2, 8.6), new V(-0.3, 0.9, 1.2), 1.8);
    g.cinematic = false;
    await this.say([
      { who: 'elder', text: 'そうそう。あそこの【赤いキノコ】の胞子をあびると体が大きく、【青いキノコ】の胞子をあびると小さくなる。' },
      { who: 'elder', text: 'カエルどのの力を借りれば、大きい物にも、小さい物にも、手がとどくはずじゃ。' },
      { who: 'frog', text: 'ぼくが大きくなったり、小さくなったりするケロ!? ……ちょっとこわいけど、やってみるケロ！' },
    ]);
    g.flag('introDone');
    g.flag('frogSize', 1);
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.note('ki-size', '胞子のキノコ', '<b>赤いキノコ</b>の胞子でカエルが大きく、<b>青いキノコ</b>の胞子で小さくなる。<br>用があるところを調べると、カエルが行ってくれる。');
    g.refreshQuests();
  }

  async readLetter() {
    const g = this.g;
    g.take('oldLetter');
    g.audio.play('paper');
    await this.say([
      { who: 'elder', text: 'なんと、わしあての手紙とな？ ……ほう、ひいひいじいさまの字じゃ！ 百年かけて届いたのか。' },
      { who: 'elder', text: '「あまつゆ草に水をやる、水くみの遺物【ゆびぬき】を、広場にうめておく」……とある。' },
      { who: 'elder', text: 'あまつゆ草はの、雨のしずくをあげると、金色の蜜をつける花じゃ。カブトムシどのの大好物よ。' },
      { who: 'elder', text: 'この地図はおぬしにあずけよう。ただ、むかしの者は、きょりを「虫の単位」で書いたからのう……。' },
    ]);
    g.give('antMap');
    g.note('ki-map', '宝の地図', `切り株から、<b>北へ カタツムリ2ひき</b>、<b>東へ テントウムシ4ひき</b>。そこに「ゆびぬき」をうめた。<br>（虫の単位は、アリの隊長がくわしい）`);
  }

  async talkSnail() {
    const g = this.g, f = g.flags;
    this.talkCam(this.snail, 11);
    if (!f.snailTalked) {
      await this.say([
        { who: 'snail', text: 'やあ〜……ぼくは〜、郵便屋の〜カタツムリ〜……。' },
        { who: 'snail', text: '長老さまあての手紙を〜、百年かけて〜、やっと〜ここまで運んできたんだけど〜……' },
        { who: 'snail', text: 'ゆうべの雨で〜、郵便車の車輪が〜ひとつ、流されちゃった〜……。' },
        { who: 'snail', text: '車輪になるものが〜ほしいな〜。【まんまるで〜、まんなかに〜、軸を通す穴がひとつ】あいてる〜、かたいもの〜。' },
      ]);
      g.flag('snailTalked');
      g.note('ki-wheel', '郵便車の車輪', '<b>まんまるで、まんなかに軸を通す穴がひとつ</b>あいた、かたいもの。');
      return;
    }
    if (f.cartFixed) return this.say([{ who: 'snail', text: f.branchMoved ? '雨上がりは〜、配達びより〜。' : 'ごえんの車輪〜、ぴかぴかで〜、かっこいい〜。' }]);
    const lines = [{ who: 'snail', text: '【まんまるで〜、まんなかに〜、穴がひとつ】あいてる〜、かたいもの〜。どこかに〜ないかな〜。' }];
    if (g.has('goen')) lines.push('（持ち物の『5円玉』が、ぴったりかもしれない）');
    await this.say(lines);
  }

  async fixCart() {
    const g = this.g, R = this.R;
    this.talkCam(this.snail, 11);
    g.take('goen');
    g.audio.play('clunk');
    g.flag('cartFixed');
    if (!R.goenWheel.children.length) { const wheel = makeFiveYen(); wheel.scale.setScalar(0.48); R.goenWheel.add(wheel); }
    R.goenWheel.visible = true;
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => { R.goenWheel.rotation.z = k * Math.PI * 2; } });
    this.snail.hop();
    await this.say([
      { who: 'snail', text: 'わあ〜、ぴったり〜！ まんなかの穴に〜、軸がすーっと通った〜。' },
      { who: 'snail', text: 'これで〜、配達のつづきが〜……あ、でも〜、長老さまのところまで〜、あと三日かかる〜。' },
      { who: 'snail', text: 'おねがい〜、かわりに〜、とどけてくれる〜？' },
    ]);
    g.give('oldLetter');
  }

  async talkAnt() {
    const g = this.g, f = g.flags;
    this.talkCam(this.captain, 9);
    g.audio.play('squeak');
    if (this.size === 0 && !f.antSmallTalk) {
      g.flag('antSmallTalk');
      await this.say([{ who: 'ant', text: 'おお、カエルどの！ 話しやすい大きさになったな。ふだんは見上げてばかりで、首がいたくてな。' }]);
    }
    if (f.branchMoved) return this.say([{ who: 'ant', text: '線路があいたか！ 隊列、敬礼！' }]);
    if (g.has('antMap') && !f.unitsRead) {
      return this.say([
        { who: 'ant', text: '虫の単位？ それなら、巣の入口の【立て札】に書いてあるぞ。「むしのものさし」だ。' },
        { who: 'ant', text: 'ただし、字がちいさくてな。わしらアリくらいの大きさでないと、読めんのだ。' },
      ]);
    }
    await this.say([
      { who: 'ant', text: 'わしはアリの隊長！ 雨上がりは、食べ物はこびの大いそがしだ。いち、に、いち、に！' },
      { who: 'ant', text: 'きょりをはかるときは、わしらアリが【1ぴき】、2ひき……と数えるのが、森のならわしだ。' },
    ]);
  }

  async clickAntSign() {
    const g = this.g, f = g.flags;
    this.focus(this.R.antSign, 7);
    if (this.size !== 0) {
      const lines = ['アリの巣のそばの、小さな立て札。ごまつぶのような字が、びっしり書いてある。', '……小さすぎて、ぜんぜん読めない。'];
      if (f.introDone) lines.push(this.sizeLine(0));
      return this.say(lines);
    }
    g.cinematic = true;
    await this.frogGo(this.R.antSign.position.clone().add(new V(-0.1, 0, 0.55)), Math.PI - 0.35);
    g.cinematic = false;
    await this.say([{ who: 'frog', text: 'ちっちゃくなったら、ちゃんと読めるケロ！ ええと……' }]);
    g.ui.openPanel({ title: '小さな立て札', body: UNITS_HTML });
    await this.waitPanel();
    g.note('ki-units', 'むしのものさし', '🐌 カタツムリ 1ぴき ＝ 🐜 アリ <b>3びき</b><br>🐞 テントウムシ 1ぴき ＝ 🐜 アリ <b>2ひき</b>');
    if (!f.unitsRead) {
      g.flag('unitsRead');
      await this.say([{ who: 'frog', text: 'カタツムリ1ぴきは、アリ3びき分。テントウムシ1ぴきは、アリ2ひき分……。旅のメモに書いておいたケロ！' }]);
    }
  }

  async clickNest() {
    this.focus(this.R.nest, 10);
    if (this.size === 0) return this.say(['アリの巣の入口。中から「いち、に、いち、に」とかけ声が聞こえる。', { who: 'frog', text: '中はアリさんでぎゅうぎゅうケロ。おじゃましないでおくケロ。' }]);
    await this.say(['土をもりあげた、アリの巣。入口はとてもせまい。', 'そばに、小さな立て札がある。']);
  }

  async talkLadies() {
    const g = this.g, f = g.flags;
    this.focus(this.R.button, 10, { theta: 0, polar: 1.0, keepAngle: true });
    g.audio.play('chirp');
    this.ladies.forEach((c) => c.hop());
    if (this.size === 0 && !f.ladySmall) {
      g.flag('ladySmall');
      await this.say([{ who: 'lady', text: 'わあっ、カエルさん、わたしたちと同じくらい！ いっしょにあそぼ！' }]);
    }
    if (!f.buttonLent) {
      await this.say([
        { who: 'lady', text: 'これ？ わたしたちのテーブル！ むかし、空から降ってきた遺物なんだって。' },
        { who: 'lady', text: 'まんまるで、穴が4つもあいてるの。……おうちにいる？ かしてあげる！' },
      ]);
      g.give('button');
      g.flag('buttonLent');
      return;
    }
    await this.say([{ who: 'lady', text: f.branchMoved ? 'にじだー！ にじだー！' : 'あめあがりの、においがするね！' }]);
  }

  async clickGoen() {
    const g = this.g, f = g.flags, R = this.R;
    this.focus(R.mud, 11);
    if (f.goenTaken) return;
    if (this.size !== 2) {
      const lines = ['ぬかるみから、金色の丸い物が半分だけ顔を出している。', '泥にしっかりうまっていて、びくともしない。'];
      if (f.introDone) lines.push(this.sizeLine(2));
      g.note('ki-goen', 'ぬかるみの金色', '泥にうまった、金色の丸い物。<b>大きくなったカエル</b>なら、引っぱり出せそう。');
      return this.say(lines);
    }
    g.cinematic = true;
    await this.frogGo(R.mud.position.clone().add(new V(0.3, 0, -1.7)), 0.1);
    await this.frameFrog(R.mud.position, 1);
    g.audio.play('splash');
    await g.tweens.add({ duration: 1.1, ease: Ease.inOut, onUpdate: (k) => { R.goen.position.y = 0.22 + k * 1.0; R.goen.rotation.y = 0.5 + k * 1.2; } });
    g.cinematic = false;
    R.goen.visible = false;
    g.flag('goenTaken');
    await this.say(['よいしょっ……すぽん！ 大きくなったカエルが、金色の円盤を引っぱり出した。', '泥をぬぐうと、まんなかに、まるい穴がひとつあいている。']);
    g.give('goen');
  }

  async clickField() {
    const g = this.g, f = g.flags;
    this.focus(this.R.field, 13);
    if (f.thimbleDug) return this.say(['ふかふかの土の広場。ゆびぬきを掘り出した穴がある。']);
    if (!g.has('antMap')) return this.say(['ふかふかの土の広場。すみに、小さな切り株がある。', '何かうまっていそうだが、どこを掘ればいいのかわからない。']);
    if (this.size !== 2) {
      const lines = ['ふかふかの土の広場。地図によると、どこかに「ゆびぬき」がうまっている。', '……でも、下のほうは雨でかたくしまっている。'];
      lines.push(this.sizeLine(2));
      return this.say(lines);
    }
    let pending = false;
    digPanel(g.ui, g.audio, {
      dug: f.dugCells || [],
      onDig: (key) => { g.flag('dugCells', [...(g.flags.dugCells || []), key]); g.audio.play('clunk'); },
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.digThimble();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async digThimble() {
    const g = this.g, R = this.R;
    const ap = cellPos(...MAP.answer);
    g.cinematic = true;
    await this.frogGo(ap.clone().add(new V(0.2, 0, -1.5)), 0.1);
    await g.moveCamera(new V(ap.x + 0.8, 5.8, ap.z + 8.0), new V(ap.x + 0.3, 1.0, ap.z - 0.4), 1.2);
    for (let i = 0; i < 3; i++) {
      g.audio.play('clunk');
      this.frog.hop();
      await g.wait(0.35);
    }
    R.digHole.visible = true;
    R.thimble.visible = true;
    R.thimble.position.set(ap.x, -0.6, ap.z);
    await g.tweens.add({ duration: 1.0, ease: Ease.out, onUpdate: (k) => { R.thimble.position.set(ap.x + k * 0.9, -0.6 + k * 0.6 + Math.sin(k * Math.PI) * 0.8, ap.z + k * 0.3); } });
    g.audio.play('item');
    g.cinematic = false;
    g.flag('thimbleDug');
    await this.say(['ザクザクザク……！ 土の中から、銀色の、ぶつぶつもようの物が出てきた。', { who: 'frog', text: 'これが「ゆびぬき」ケロ？ ぼくの帽子にちょうどいい……じゃなくて、水くみのおけケロ！' }]);
    R.thimble.visible = false;
    g.give('thimble');
  }

  async clickDewLeaf() {
    const g = this.g, f = g.flags;
    this.focus(this.R.dewLeaf, 12);
    if (f.dewTaken) return this.say(['しずくの葉。まだ少し、ぬれている。']);
    const lines = ['あまつゆ草のそばの、背の高い葉っぱ。先っぽに、ビー玉のように大きな雨のしずくがのっている。'];
    if (!g.has('thimble')) {
      lines.push('すきとおっていて、とてもきれいな水だ。');
      return this.say(lines);
    }
    if (this.size !== 2) {
      lines.push('高くて、ゆびぬきが届かない。', this.sizeLine(2));
      return this.say(lines);
    }
    return this.catchDew();
  }

  async catchDew() {
    const g = this.g, R = this.R;
    const tip = R.dewTip;
    g.cinematic = true;
    // 大きいカエルの頭と胴が、葉の茎へ入りこまないだけの間隔を取る。
    const stand = new V(R.dewLeaf.position.x + SIZES[this.size] * 0.75 + 0.4, 0, tip.z + 0.9);
    await this.frogGo(stand, Math.atan2(tip.x - stand.x, tip.z - stand.z));
    await g.moveCamera(new V(tip.x - 3.6, 5.2, tip.z + 11.0), new V(tip.x + 0.6, 2.0, tip.z + 0.4), 1.0);
    this.frog.hop();
    g.audio.play('pop');
    await g.tweens.add({ duration: 0.3, onUpdate: (k) => { R.dewLeaf.rotation.x = Math.sin(k * Math.PI) * 0.12; } });
    const d0 = R.dewDrop.position.clone();
    await g.tweens.add({ duration: 0.7, ease: Ease.in, onUpdate: (k) => { R.dewDrop.position.set(d0.x, d0.y - k * (d0.y - 2.2), d0.z + k * 0.6); } });
    R.dewDrop.visible = false;
    g.audio.play('splash');
    g.cinematic = false;
    g.flag('dewTaken');
    g.take('thimble');
    await this.say(['ちょんと葉っぱをつつくと、しずくがころん……ゆびぬきの中へ、ちゃぽん！', { who: 'frog', text: 'すきとおった、きれいなお水ケロ！' }]);
    g.give('thimbleWater');
  }

  async clickFlower() {
    const g = this.g, f = g.flags;
    this.focus(this.R.flower, 10);
    if (f.flowerBloom) {
      if (!f.nectarTaken) return this.takeNectar();
      return this.say(['あまつゆ草が、桃色の花をひらいている。']);
    }
    const lines = ['しおれて、うなだれている花。「あまつゆ草」というらしい。'];
    g.note('ki-flower', 'あまつゆ草', 'しおれている。<b>雨のしずく</b>をあげると、金色の蜜をつけるらしい。');
    if (g.has('thimbleWater')) lines.push('（持ち物の『しずく入りのゆびぬき』で、水をあげられそうだ）');
    else lines.push('土はぬれているのに……。どろ水ではなく、すきとおったしずくがほしいのかもしれない。');
    await this.say(lines);
  }

  async waterFlower() {
    const g = this.g, R = this.R;
    const fp = R.flower.position;
    await g.focusOn(new V(fp.x + 0.6, 1.4, fp.z), { dist: 7, polar: 1.1, theta: 0.2, duration: 0.9 });
    g.take('thimbleWater');
    g.audio.play('water');
    await g.wait(0.6);
    R.bud.visible = true;
    await g.tweens.add({ duration: 1.2, ease: Ease.inOut, onUpdate: (k) => { R.bud.rotation.z = 1.0 * (1 - k); } });
    R.bud.visible = false;
    R.bloom.visible = true;
    R.bloom.scale.setScalar(0.2);
    g.audio.play('chime');
    await g.tweens.add({ duration: 1.0, ease: Ease.out, onUpdate: (k) => { R.bloom.scale.setScalar(0.2 + k * 0.8); } });
    g.flag('flowerBloom');
    await this.say(['しずくをあげると、あまつゆ草がすっと顔を上げ……ぱっと、桃色の花がひらいた！', '花のまんなかに、金色の蜜がとろりと光っている。']);
    return this.takeNectar();
  }

  async takeNectar() {
    const g = this.g;
    g.flag('nectarTaken');
    this.R.nectarMat.emissiveIntensity = 0.3;
    await this.say(['花びらでできた小さなつぼに、あまい蜜をわけてもらった。']);
    g.give('nectar');
  }

  async clickBell() {
    const g = this.g, f = g.flags;
    this.focus(this.R.bellFlower, 9);
    if (f.fireflyAwake) return this.say(['うす紫の釣鐘草。ホタルの寝床らしい。']);
    if (this.size !== 0) {
      const lines = ['うす紫の釣鐘草。花の中から、「すー……すー……」と寝息が聞こえる。', '花の入口がせまくて、中がよく見えない。'];
      if (f.introDone) lines.push(this.sizeLine(0));
      return this.say(lines);
    }
    return this.wakeFirefly();
  }

  async wakeFirefly() {
    const g = this.g, ff = this.firefly;
    const bp = this.R.bellFlower.getWorldPosition(new V());
    g.cinematic = true;
    await this.frogGo(new V(bp.x - 0.3, 0, bp.z + 0.5), Math.PI);
    await g.moveCamera(new V(bp.x - 0.5, 0.7, bp.z + 2.8), new V(bp.x, 1.25, bp.z), 1.0);
    this.frog.hop();
    g.audio.play('ribbit');
    await this.say([{ who: 'frog', text: 'もしもーし……ホタルさん、起きてほしいケロ〜。' }, { who: 'firefly', text: 'むにゃ……もう夜……？' }]);
    ff.sleeping = false;
    ff.nightcap.visible = false;
    for (const e of ff.eyes) e.scale.y = 1;
    g.audio.play('twinkle');
    this.flyBusy = true;
    const from = ff.root.position.clone();
    const to = this._flyHome();
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => ff.setLamp(k) });
    ff.lampOn = true;
    await g.tweens.add({ duration: 1.8, ease: Ease.inOut, onUpdate: (k) => { ff.root.position.lerpVectors(from, to, k); ff.root.position.y += Math.sin(k * Math.PI) * 0.8; } });
    this.flyBusy = false;
    this.flyHome = to;
    g.cinematic = false;
    g.flag('fireflyAwake');
    this.R.bellMat.emissiveIntensity = 0;
    await this.say([
      { who: 'firefly', text: 'ふわぁ……おはよう。雨の音がきもちよくて、ねすごしちゃった。' },
      { who: 'firefly', text: '影絵の灯り？ いいよ、ぼくのおしりの灯りは、森いちばんさ。クモさんの巣のところで待ってるね。' },
    ]);
  }

  async talkFirefly() {
    const f = this.g.flags;
    this.focus(this.firefly.root, 8);
    if (!f.fireflyAwake) return this.clickBell();
    if (f.shadowDone) return this.say([{ who: 'firefly', text: '影絵、たのしかったね。ぼくの灯り、役に立ったでしょ？' }]);
    await this.say([{ who: 'firefly', text: 'ぼくがあの台に近づくほど、影は大きくなるよ。遠ざかると、小さくなる。' }]);
  }

  async talkSpider() {
    const g = this.g, f = g.flags;
    this.talkCam(this.spider, 10);
    if (!f.spiderTalked) {
      await this.say([
        { who: 'spider', text: 'あら、旅のかた。わたしは機織りのクモ。雨上がりは、巣のつくろいでいそがしいの。' },
        { who: 'spider', text: 'カブトムシのだんなを起こしたい？ ふふ、いい方法があるわ。' },
        { who: 'spider', text: 'だんなはね、自分より大きな【ライバルの影】を見ると、どんなに眠くても飛び起きるのよ。' },
        { who: 'spider', text: 'わたしの巣を、影絵のスクリーンにしてあげる。だんなが見まちがえるような、大きな「つの」の型を編んでおくわね。' },
      ]);
      g.flag('spiderTalked');
      g.flag('stencilWoven');
      this.R.stencil.visible = true;
      g.audio.play('loom');
      await this.focus(this.R.web, 9);
      await this.say([
        'クモが、巣のまんなかに、ふたまたのつのの形を編みこんだ。',
        { who: 'spider', text: '小さな物を二つ選んで、影を重ねるの。それぞれの向きも工夫して、この型に重なるつのを作ってね。灯りは……釣鐘草で寝ているホタルの坊やにたのむといいわ。' },
      ]);
      g.note('ki-shadow', '影絵', '<b>二つの物の影</b>を重ねて、クモの巣の型と同じ<b>つの</b>を作る。それぞれの向きと、灯りの距離を調整する。<br>灯りは、釣鐘草で寝ている<b>ホタル</b>にたのむ。');
      return;
    }
    if (f.shadowDone) {
      if (f.branchMoved) return this.say([{ who: 'spider', text: '虹の糸で、何か編もうかしら。' }]);
      return this.say([{ who: 'spider', text: 'その綱なら、どんなに重い枝でも、しっかりしばれるわ。' }]);
    }
    if (!f.fireflyAwake) return this.say([{ who: 'spider', text: '灯りがないと影絵はできないわ。ホタルの坊やは、釣鐘草の中よ。' }]);
    return this.openShadow();
  }

  async clickWeb() {
    const g = this.g, f = g.flags;
    this.focus(this.R.web, 9);
    if (f.shadowDone) return this.say(['雨のしずくがきらきら光る、クモの巣。']);
    if (!f.spiderTalked) return this.say(['草のあいだに張られた、大きなクモの巣。そばに、小さな台があって、小枝やどんぐりのぼうしが置いてある。']);
    if (!f.fireflyAwake) return this.say(['巣のまんなかに、つのの形の型が編みこまれている。', '影絵をするには、灯りがいる。']);
    return this.openShadow();
  }

  openShadow() {
    const g = this.g, R = this.R;
    let pending = false;
    shadowPanel(g.ui, g.audio, {
      onChange: ({ s, ready }) => {
        // 二つの影がつのになったときだけ、箱庭の巣にも姿をうつす。
        R.shadow.material.opacity = ready ? 0.35 : 0;
        R.shadow.scale.setScalar(s);
      },
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.shadowShow();
        pending = false;
      },
    });
    return this.waitPanel(() => pending).then(() => { if (!g.flags.shadowDone) R.shadow.material.opacity = 0; });
  }

  async shadowShow() {
    const g = this.g, R = this.R, b = this.beetle;
    g.cinematic = true;
    R.stencil.visible = false;
    R.shadow.scale.setScalar(SHADOW_GOAL);
    R.shadow.material.opacity = 0.85;
    const wp = R.web.localToWorld(new V(0, 2.0, 0));
    const wn = R.web.localToWorld(new V(0, 2.0, 1)).sub(wp);
    await g.moveCamera(wp.clone().addScaledVector(wn, 7).add(new V(0, 1.2, 0)), wp, 1.6);
    g.audio.play('twinkle');
    await this.say(['ホタルの灯りに照らされて、クモの巣いっぱいに、大きなつのの影がうかびあがった！']);
    await g.moveCamera(new V(wp.x - 6.5, 4.2, wp.z + 4.0), new V(wp.x - 1.5, 1.5, wp.z - 2.0), 1.4);
    await g.wait(0.6);
    g.audio.play('roar');
    b.setAwake(true);
    b.hop();
    await g.tweens.add({ duration: 0.6, onUpdate: (k) => { b.root.rotation.y = -0.8 + k * 0.8; b.root.position.y = Math.sin(k * Math.PI) * 0.5; } });
    b.root.position.y = 0;
    await this.say([
      { who: 'beetle', text: 'むむっ！？ だれだ、おれさまより でっかいつのは！ 勝負だ、勝負ーっ！' },
      { who: 'beetle', text: '…………なんだ、影か。' },
      { who: 'beetle', text: 'ふわぁ〜〜あ。よく寝た。……で、おれになんの用だ？' },
    ]);
    await g.tweens.add({ duration: 0.6, onUpdate: (k) => { b.root.rotation.y = -0.8 * k; } });
    R.shadow.material.opacity = 0;
    g.flag('shadowDone');
    g.flag('beetleAwake');
    g.cinematic = false;
    this.questDone('カブトムシが目をさました！');
    await this.talkCam(this.spider, 10);
    await this.say([
      { who: 'spider', text: 'ね、言ったとおりでしょう？ すてきな影絵だったわ。' },
      { who: 'spider', text: 'お礼に、これを。あの枯れ枝をしばるのに、ちょうどいい【綱】よ。わたしの自慢の糸で編んだの。' },
    ]);
    g.give('silkRope');
    g.flag('ropeGot');
    this.questDone('丈夫な綱を手に入れた！');
    await this.checkReady();
  }

  async talkBeetle() {
    const g = this.g, f = g.flags;
    this.talkCam(this.beetle, 13);
    if (!f.beetleAwake) {
      g.note('ki-beetle', 'カブトムシ', 'ぐっすり眠っている。<b>クモの機織り</b>が、起こしかたを知っているらしい。');
      return this.say(['大きなカブトムシが、つのを下げて、ぐうぐう眠っている。', { who: 'beetle', text: 'ぐおー……すぴー……もう食べられん……' }, '声をかけても、つついても、起きる気配がない。']);
    }
    if (!f.beetleFed) {
      const lines = [{ who: 'beetle', text: '枝をどけろ？ ……やってやりたいが、腹がへって力が出ん。' }, { who: 'beetle', text: 'あまつゆ草の蜜でもあれば、百人力なんだがなあ。' }];
      if (g.has('nectar')) lines.push('（持ち物の『あまつゆ草の蜜』をあげられそうだ）');
      return this.say(lines);
    }
    if (!f.ropeGot) return this.say([{ who: 'beetle', text: 'あの枝、ずいぶん大きいな。しばって持ち上げる綱があればなあ。' }]);
    if (!f.branchMoved) return this.finale();
    await this.say([{ who: 'beetle', text: 'またいつでも来い。こんどは、本物のライバルとして勝負だ！' }]);
  }

  async feedBeetle() {
    const g = this.g;
    this.talkCam(this.beetle, 13);
    g.take('nectar');
    g.audio.play('pop');
    this.beetle.hop();
    await this.say([
      '蜜のつぼをさしだすと、カブトムシは目をかがやかせた。',
      { who: 'beetle', text: 'こ、これは、あまつゆ草の蜜！ ……ずずっ。うまーい！！' },
      { who: 'beetle', text: '力がみなぎってきたぞ！ 枝の一本や二本、まかせておけ！' },
    ]);
    g.flag('beetleFed');
    this.questDone('カブトムシが元気になった！');
    await this.checkReady();
  }

  async clickBranch() {
    const g = this.g, f = g.flags;
    this.focus(this.R.branch, 16);
    if (f.beetleAwake && f.beetleFed && f.ropeGot) return this.finale();
    const lines = ['ゆうべの大雨で落ちてきた、大きな枯れ枝。線路の上に、どっかりと横たわっている。'];
    if (this.size === 2) lines.push({ who: 'frog', text: 'ふんぬ〜っ……！ ……大きくなっても、ぼくひとりじゃ無理ケロ〜。' });
    else lines.push('とても、ひとりで動かせる重さではない。');
    await this.say(lines);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    if (target === 'cart') target = 'snail';
    if (target === 'button' || target.startsWith('lady')) target = 'lady';
    if (target === 'web') target = 'spider';
    if (target === 'house') target = 'elder';
    if (target === 'stump') target = 'field';
    if (item === 'goen' && target === 'snail') return this.fixCart();
    if (item === 'button' && target === 'snail') {
      return this.say([{ who: 'snail', text: 'まんまるだけど〜、穴が4つもある〜。まんなかに〜、ひとつじゃないと〜、がたがた〜しちゃう〜。' }]);
    }
    if (item === 'button' && target === 'lady') return this.say([{ who: 'lady', text: 'まだつかってていいよ！' }]);
    if (item === 'oldLetter' && target === 'elder') { this.talkCam(this.elder, 11); return this.readLetter(); }
    if (item === 'antMap' && target === 'field') return this.clickField();
    if (item === 'antMap' && target === 'captain') return this.talkAnt();
    if (item === 'thimble' && target === 'dewLeaf') return this.clickDewLeaf();
    if (item === 'thimble' && (target === 'rill' || target === 'mud')) return this.say([{ who: 'frog', text: 'どろがまじって、にごってるケロ。もっときれいなお水がいいケロ。' }]);
    if (item === 'thimble' && target === 'flower') return this.say(['ゆびぬきは、からっぽだ。']);
    if (item === 'thimbleWater' && target === 'flower') return this.waterFlower();
    if (item === 'nectar' && target === 'beetle') {
      if (!f.beetleAwake) return this.say(['カブトムシは、むにゃむにゃ言うだけで、起きない。', '……先に、起こさないと。']);
      return this.feedBeetle();
    }
    if (item === 'silkRope' && (target === 'branch' || target === 'beetle')) {
      if (f.beetleAwake && f.beetleFed) return this.finale();
      return this.say(['綱で枝をしばっても、引っぱる力持ちがいない。']);
    }
    const talkers = { elder: 'ふむ、それはおぬしが持っておきなされ。', snail: 'それは〜、車輪には〜ならないかな〜。', captain: 'それは運べんな！', lady: 'それなあに？', spider: 'それは糸にはならないわね。', beetle: 'それは食えんな。', frog: 'それは、ボイラーには入れられないケロ。', firefly: 'それは光らないみたい。' };
    if (talkers[target]) {
      const who = target === 'captain' ? 'ant' : target;
      return this.say([{ who, text: talkers[target] }]);
    }
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
    g.camera.position.set(14, 9, 12);
    g.controls.target.set(-14, 3, -6);
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
      g.camera.position.lerpVectors(camFrom, new V(8, 6.5, 9), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('巨大キノコの森', `STAGE ${stageNo('kinoko')}`, 2400);
    await g.say([
      'ほしまわり号は、雨上がりの森の駅に着いた。',
      'あたりには、しっとりとした土と草のにおい。葉っぱの先で、しずくがきらきら光っている。',
      '……なんだか、まわりの物が、やけに大きい。',
    ]);
    await g.moveCamera(new V(5.5, 3.5, -1.2), new V(1.0, 1.0, -4.0), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'ん〜っ、温泉でぽっかぽかになったから、元気いっぱいケロ！ ……って、あれ？' },
      { who: 'frog', text: 'ケロ!? 森が……大きいケロ！ それとも、ぼくたちが小さいケロ？' },
      { who: 'frog', text: 'キノコが、おうちくらいあるケロ……。しかも、線路の先に、でっかい枝が落ちてるケロ！' },
    ]);
    const portrait = innerWidth < innerHeight;
    await g.moveCamera(portrait ? new V(-2, 10, 18) : new V(-2.5, 7.5, 13), new V(-2.4, 1.2, -0.8), 2.0);
    g.cinematic = false;
    await this.talkElder();
  }

  async finale() {
    const g = this.g, R = this.R, b = this.beetle;
    await this.say([
      { who: 'beetle', text: 'よし、綱もそろったな！ カエルの、おまえも手を貸せ！' },
      { who: 'frog', text: 'まかせるケロ！ ……ぼく、いちばん大きくなるケロ！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    if (this.size !== 2) {
      await this.frogGo(R.redShroom.position.clone().add(new V(0.4, 0, 1.3)), -2.6);
      await this.setSize(2);
    }
    await g.moveCamera(new V(4.0, 6.5, 6.5), new V(9.0, 1.2, -4.0), 2.0);
    // 枝のそばへ
    const bFrom = b.root.position.clone();
    const bTo = new V(10.8, 0, -2.2);
    const frogTo = new V(7.6, 0, -2.6);
    const fp = this.frogGo(frogTo, 0.6);
    await g.tweens.add({ duration: 1.6, ease: Ease.inOut, onUpdate: (k) => { b.root.position.lerpVectors(bFrom, bTo, k); b.root.rotation.y = lerp(-0.8, -2.3, k); } });
    await fp;
    g.audio.play('loom');
    this.rope.visible = true;
    await this.say(['クモの糸の綱で、枝をぐるぐるとしばった。', { who: 'beetle', text: 'いくぞ！ せーのっ！' }]);
    // 持ち上げて……
    g.audio.play('creak');
    await g.tweens.add({ duration: 1.4, ease: Ease.inOut, onUpdate: (k) => {
      R.branch.position.y = k * 1.6;
      R.branch.rotation.x = -k * 0.1;
      b.horn.rotation.x = -k * 0.4;
      this.frog.root.position.y = Math.sin(k * Math.PI * 4) * 0.05;
    } });
    await this.say([{ who: 'beetle', text: 'どっせーーーい！！' }]);
    g.audio.play('whoosh');
    // 島の外へ、ぽーん
    const p0 = R.branch.position.clone();
    await g.tweens.add({ duration: 2.2, ease: Ease.in, onUpdate: (k) => {
      R.branch.position.set(p0.x + k * 14, p0.y + Math.sin(k * Math.PI) * 6 - k * k * 18, p0.z - k * 9);
      R.branch.rotation.set(-0.1 - k * 2.5, k * 1.4, k * 0.8);
      b.horn.rotation.x = -0.4 * (1 - k);
    } });
    R.branch.visible = false;
    g.flag('branchMoved');
    g.audio.play('solve');
    this.questDone('線路がひらいた！');
    // 雨雲が晴れて、虹
    await g.moveCamera(new V(-2, 12, 20), new V(4, 21, -30), 2.4);
    g.audio.play('chime');
    await g.tweens.add({ duration: 3.0, ease: Ease.inOut, onUpdate: (k) => { this.backdrop.set(k); } });
    g.setGrade(GRADES.kinokoRainbow);
    await this.say(['雲の切れまから光がさして……森の向こうに、大きな虹がかかった。']);
    await this.teaParty();
    g.flag('departed');
    g.refreshQuests();
    await this.departure();
  }

  /** 出発の前に、みんなでお茶会 */
  async teaParty() {
    const g = this.g, R = this.R;
    // みんな、広場に集まる
    const spots = [
      [this.elder, new V(-3.3, 0, 3.0), 0.4],
      [this.snail, new V(-5.0, 0, 4.0), 0.7],
      [this.captain, new V(-0.7, 0, 5.6), -0.3],
      [this.spider, new V(0.5, 0, 4.9), -0.6],
      [this.beetle, new V(2.5, 0, 2.9), -1.25],
      [this.ladies[0], new V(-2.6, 0, 5.6), 0.2],
      [this.ladies[1], new V(-1.8, 0, 6.1), -0.1],
      [this.ladies[2], new V(-3.4, 0, 6.1), 0.3],
    ];
    const from = spots.map(([c]) => ({ p: c.root.position.clone(), r: c.root.rotation.y }));
    this.flyBusy = true;
    const ff = this.firefly, ff0 = ff.root.position.clone(), ff1 = new V(-0.9, 2.3, 4.0);
    await g.moveCamera(new V(-1.6, 3.8, 11.5), new V(-1.6, 1.0, 3.6), 1.6);
    g.tweens.add({ duration: 2.2, ease: Ease.inOut, onUpdate: (k) => { ff.root.position.lerpVectors(ff0, ff1, k); } });
    await g.tweens.add({ duration: 2.2, ease: Ease.inOut, onUpdate: (k) => spots.forEach(([c, to, ry], i) => {
      c.root.position.lerpVectors(from[i].p, to, k);
      c.root.rotation.y = lerp(from[i].r, ry, k);
    }) });
    // カエルはふつうの大きさにもどって、まんなかへ
    await this.frogGo(R.blueShroom.position.clone().add(new V(0.9, 0, 1.1)), -2.4);
    await this.setSize(1);
    await this.frogGo(new V(-1.5, 0, 4.6), 0);
    this.flyHome = ff1;
    this.flyBusy = false;
    await this.say([
      { who: 'elder', text: 'ありがとう、お客人。おかげで森に、また列車の音がもどる。さあ、出発の前に、一杯どうじゃ。' },
      '長老が、どんぐりのぼうしのカップに、あまつゆ草の蜜湯をついでくれた。',
      { who: 'lady', text: 'にじだー！ にじだー！' },
      { who: 'snail', text: '雨上がりは〜、ぜんぶが〜、ぴかぴか〜。' },
      { who: 'beetle', text: 'ぷはー！ ひと仕事のあとの蜜湯は、格別だな！' },
      { who: 'frog', text: '大きくなったり、小さくなったり……いろんな目の高さで見ると、森っておもしろいケロ。' },
      { who: 'frog', text: 'ぼくたちから見たら、キノコはおうちくらい大きいけど……もっともっと大きな「巨人」から見たら、ぼくらも小さな虫みたいなものケロ？' },
      { who: 'elder', text: 'ほっほっ。遺物を落とした巨人たちも、どこかで、こんな虹を見ておるのかもしれんのう。' },
    ]);
    await g.moveCamera(new V(5.5, 3.5, -1.2), new V(1.0, 1.0, -4.0), 1.8);
    await this.frogGo(FROG_HOME, -0.3);
    await this.say([
      { who: 'frog', text: 'さあ、出発するケロ〜！ つぎの駅まで、全速前進ケロ！' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(5.5, 3.8, -1.0), new V(3, 1.3, -6.0), 2.0);
    g.audio.play('whistle');
    await g.wait(1.4);
    this.departing = true;
    g.tweens.add({ duration: 7, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6; } });
    // 丸太のトンネルに入っていく列車を見送る
    await g.moveCamera(new V(7, 3.8, -0.5), new V(14, 1.6, -6.0), 6);
    g.audio.play('whistle');
    await g.wait(2.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'kinoko'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'kinoko', '雨上がりの虹の下、ほしまわり号は丸太のトンネルへ。');
  }
}
