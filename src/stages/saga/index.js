import * as THREE from 'three';
import { makeSky, makeIslandBase, makeClouds, Puffs } from '../../lib/environment.js';
import { makeCat, makeFrog, makeRabbit } from '../../lib/creatures.js';
import { makeCrane } from '../../lib/creatures-edo.js';
import { makeMomonga } from '../../lib/creatures-sky.js';
import { makeMagpieGuide, makeSagaSpaHost, makeBistroChef } from '../../lib/creatures-saga.js';
import { add, group, mat, G } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { Train, placeOnPath } from '../station/train.js';
import { GRADES } from '../../core/postfx.js';
import { Ease } from '../../core/tween.js';
import { el } from '../../core/ui.js';
import { showStageClear } from '../clear.js';
import { buildSagaDiorama, ISLAND } from './diorama.js';
import { createAmandiSaga } from './amandi.js';
import { createFoamBistro } from './bistro.js';
import { amandiVisitPanel, bistroMenuPanel, cityVisitPanel, bowlingPanel } from './visits.js';
import { busPanel, shoppingPanel, sluicePanel, balloonPanel, sketchPanel, busClueHTML, shoppingClueHTML, sluiceClueHTML, balloonClueHTML, sketchClueHTML } from './panels.js';

const V = THREE.Vector3;
const RAIL_HEIGHT = 5.375 * .45, RAIL_Z = 8 + 3.2 * .45;
const STOPS = {
  bus: { name: '臨時便の旅じたく', icon: '🚌', flag: 'saBusDone', object: 'busStop', who: 'cat', panel: busPanel, html: busClueHTML },
  shopping: { name: 'おみやげのレシート', icon: '🛍', flag: 'saShoppingDone', object: 'marketBoard', who: 'rabbit', panel: shoppingPanel, html: shoppingClueHTML },
  sluice: { name: 'クリークの水番', icon: '🌾', flag: 'saSluiceDone', object: 'sluice', who: 'crane', panel: sluicePanel, html: sluiceClueHTML },
  balloon: { name: '空の風読み', icon: '🎈', flag: 'saBalloonDone', object: 'balloonPad', who: 'momonga', panel: balloonPanel, html: balloonClueHTML },
  sketch: { name: '川久保の街角スケッチ', icon: '✎', flag: 'saSketchDone', object: 'sketchDesk', who: 'magpie', panel: sketchPanel, html: sketchClueHTML },
};
export const SPEAKERS = {
  magpie: { name: 'カササギの旅案内', icon: '🪶', color: '#397a8b', voice: 700 },
  cat: { name: 'ネコの駅長', icon: '🐱', color: '#c18b42', voice: 510 },
  rabbit: { name: 'ウサギのおみやげ係', icon: '🐰', color: '#b77a86', voice: 890 },
  crane: { name: 'ツルの水番', icon: '🌾', color: '#64877b', voice: 360 },
  momonga: { name: 'モモンガの飛行士', icon: '🐿', color: '#b17d48', voice: 960 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  spaHost: { name: 'カピバラの湯案内', icon: '♨', color: '#9a7554', voice: 280 },
  chef: { name: 'キツネの料理人', icon: '🦊', color: '#65826b', voice: 620 },
  hint: { name: 'ヒント', icon: '💡', color: '#b68a3b' },
};

function trainPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-155, 28, 35), new V(-118, 17, 17), new V(-92, RAIL_HEIGHT, RAIL_Z), new V(-78, RAIL_HEIGHT, RAIL_Z)));
  p.add(new THREE.LineCurve3(new V(-78, RAIL_HEIGHT, RAIL_Z), new V(78, RAIL_HEIGHT, RAIL_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(78, RAIL_HEIGHT, RAIL_Z), new V(103, RAIL_HEIGHT, RAIL_Z), new V(120, 17, -12), new V(160, 33, -42)));
  p.arcLengthDivisions = 1200;
  return p;
}

/** 実在の外観をたどる、距離を圧縮した佐賀の箱庭。 */
export class SagaStage {
  constructor(game) {
    this.g = game; this.id = 'saga'; this.title = '田舎の寄り道';
    this.questTitle = '🪶 五つの寄り道';
    this.solving = false; this.departing = false;
  }

  homeView(portrait) {
    const aspect = innerWidth / innerHeight, fov = (portrait ? 42 : 30) * Math.PI / 180;
    const fitWidth = (ISLAND.w + 13) / (2 * Math.tan(fov / 2) * aspect);
    const fitDepth = (ISLAND.d + 12) * Math.cos(.69) / (2 * Math.tan(fov / 2));
    const dist = Math.max(fitWidth, fitDepth) + 68;
    const target = new V(0, 1, -2);
    return [new V().setFromSpherical(new THREE.Spherical(dist, .69, .08)).add(target), target];
  }

  // 川久保を間近で見るときだけ、写真の目線に近い角度まで下げられる。
  interiorAt(target) {
    if (target.distanceTo(new V(22, 2, -43)) < 24) return { polar: 1.56, maxDist: 200 };
    if (target.distanceTo(new V(-28, 2, 18)) < 20) return { polar: 1.48, maxDist: 200 };
    if (target.distanceTo(new V(35, 2, 47)) < 38) return { polar: 1.48, maxDist: 200 };
    if (target.x < -34 && target.z < -45) return { polar: 1.48, maxDist: 200 };
    if (target.x > -33 && target.x < -10 && target.z < -43) return { polar: 1.48, maxDist: 160 };
    if (target.x > 46 && target.x < 79 && target.z > -29 && target.z < 6) return { polar: 1.50, maxDist: 180 };
    if (target.x > -53 && target.x < -10 && target.z > -34 && target.z < -14) return { polar: 1.50, maxDist: 160 };
    return null;
  }

  async build() {
    const g = this.g, scene = g.scene;
    document.body.classList.add('saga');
    g.ui.setSpeakers(SPEAKERS); g.audio.setSong('saga');
    g.bounds = { minX: -75, maxX: 75, minZ: -73, maxZ: 73 };
    g.controls.maxDistance = 760; g.camera.far = 3000; g.camera.updateProjectionMatrix();
    g.renderer.toneMappingExposure = 1.07;
    // 昼の雲海の広い白面が、全景の建物まで白くにじまない強さにする。
    g.bloom.strength = .06;
    this.sky = makeSky(); this.sky.mesh.scale.setScalar(4);
    const u = this.sky.uniforms;
    u.dTop.value.set('#658fc4'); u.dMid.value.set('#88afd2'); u.dBot.value.set('#c4d7dc');
    u.sunDir.value.set(-.5, .8, .4).normalize(); scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#c2d4d9', 900, 2100);
    this.hemi = new THREE.HemisphereLight('#f4f8ff', '#8c9678', 1.8);
    const sun = new THREE.DirectionalLight('#fff0d4', 2.35);
    sun.position.set(-55, 90, 65); sun.castShadow = true;
    sun.shadow.mapSize.set(g.shadowSize(), g.shadowSize());
    Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 5, far: 240 });
    sun.shadow.bias = -.0003; sun.shadow.normalBias = .055; scene.add(this.hemi, sun, sun.target);
    this.island = makeIslandBase({ ...ISLAND, seed: 869, grass: '#9aaa7a' }); this.island.position.y = -.18; scene.add(this.island);
    this.clouds = makeClouds(869); this.clouds.scale.setScalar(3.2); this.clouds.position.y = -5; scene.add(this.clouds);
    await g.loadingStep(.25, '駅と、街の道をつないでいます…');
    this.R = buildSagaDiorama(scene);
    this._buildNorthwest();
    this.path = trainPath(); this.stopS = this.path.getCurveLengths()[0] + 57;
    this._makeTracks(scene);
    this.train = new Train(scene, this.path);
    for (const car of this.train.cars) { car.part.g.scale.setScalar(.59); car.offset *= .59; }
    this.train.s = this.stopS; this.train.place();
    this.smoke = new Puffs(scene, { count: 22, color: '#eef1e7', opacity: .4 });
    await g.loadingStep(.57, '瓦屋根と、庭の影を整えています…');
    this._placeCreatures(scene); this._registerInteractables();
    await g.loadingStep(.78, '五つの寄り道を、旅ノートにまとめています…');
    this._optimize();
    g.ui.onLine = who => this.residents[who]?.talk(2.1);
  }

  _buildNorthwest() {
    const R = this.R;
    R.amandi = createAmandiSaga(R.root);
    // 箱庭の南側道路に正面を合わせ、敷地の中で本館とプール棟を十分な大きさに見せる。
    R.amandi.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(R.amandi.root);
    const size = box.getSize(new V()), center = box.getCenter(new V());
    const scale = Math.min(35 / size.x, 24 / size.z);
    R.amandi.root.scale.setScalar(scale);
    R.amandi.root.position.set(-52 - center.x * scale, -box.min.y * scale, -60 - center.z * scale);
    R.bistro = createFoamBistro(R.root);
    R.bistro.root.position.set(-22, 0, -52);
    R.root.updateMatrixWorld(true);
  }

  _makeTracks(scene) {
    this.tracks = group(scene);
    const root = this.tracks, L = this.path.getLength(), dummy = new THREE.Object3D();
    const steel = mat('#929c99', { metalness: .35 }), sleepers = [];
    // 駅モデル内には実物に合わせた4線がある。接続部分だけ作り、重ねない。
    const runs = [[], []];
    for (let s = 0; s <= L; s += .6) {
      const p = this.path.getPointAt(Math.min(1, s / L));
      if (p.x >= -49.6 && p.x <= -6.4) continue;
      placeOnPath(this.path, dummy, s); dummy.updateMatrixWorld();
      for (let i = 0; i < 2; i++) runs[i].push({ p: new V(0, -.045, (i ? 1 : -1) * .324).applyMatrix4(dummy.matrixWorld), left: p.x < -49.6 });
      sleepers.push(s);
    }
    for (const run of runs) for (const left of [true, false]) {
      const pts = run.filter(v => v.left === left).map(v => v.p);
      if (pts.length > 1) add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, .042, 5), steel);
    }
    const inst = new THREE.InstancedMesh(G.box(.15, .08, .95), mat('#796d57'), sleepers.length);
    sleepers.forEach((s, i) => { placeOnPath(this.path, dummy, s); dummy.translateY(-.12); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); }); root.add(inst);
    for (const [a, b] of [[-78, -49.65], [-6.35, 78]]) {
      const len = b - a, cx = (a + b) / 2;
      add(root, G.box(len, .22, 1.45), mat('#a3a59a'), cx, RAIL_HEIGHT - .31, RAIL_Z);
      for (let x = a + 3; x < b; x += 10) add(root, G.box(.55, RAIL_HEIGHT - .42, 1.3), mat('#c0c0ad'), x, (RAIL_HEIGHT - .42) / 2, RAIL_Z);
    }
    root.traverse(o => { o.userData.noPick = true; });
  }

  _placeCreatures(scene) {
    this.residents = { cat: makeCat(), magpie: makeMagpieGuide(), rabbit: makeRabbit(), crane: makeCrane(), momonga: makeMomonga(), frog: makeFrog(), spaHost: makeSagaSpaHost(), chef: makeBistroChef() };
    const fallback = { cat: [-32, 0, 27], magpie: [-23, 0, 27], rabbit: [27, 0, 42], crane: [-42, 0, -31], momonga: [-30, 0, 51], frog: [-42, 0, 27] };
    for (const [id, c] of Object.entries(this.residents)) {
      const p = id === 'spaHost' ? new V(-56, 0, -47) : id === 'chef' ? new V(-18, 0, -45.2) : id === 'magpie' ? new V(-38, 0, 25) : id === 'rabbit' ? new V(22, 0, 42.5) : this.R.npcPlaces?.[id === 'cat' ? 'station' : id];
      c.root.position.copy(p || new V(...fallback[id]));
      c.root.scale.setScalar(id === 'crane' ? 1.35 : id === 'rabbit' ? .65 : ['spaHost', 'chef'].includes(id) ? 1.25 : 1.75);
      c.root.userData.dynamic = true; scene.add(c.root);
    }
    this.creatures = Object.values(this.residents);
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, object, name, onClick) => { if (object) g.addInteractable(id, object, { name, onClick }); };
    for (const [id, c] of Object.entries(this.residents)) reg(id, c.root, SPEAKERS[id].name, () => id === 'magpie' ? this.talkGuide() : id === 'frog' ? this.talkFrog() : id === 'spaHost' ? this.talkSpaHost() : id === 'chef' ? this.talkChef() : this.talkKeeper(id));
    for (const [id, stop] of Object.entries(STOPS)) {
      reg(id, R[stop.object], stop.name, () => this.openPuzzle(id));
    }
    reg('balloonBody', R.balloon, '気球', () => this.openPuzzle('balloon'));
    reg('sagaStation', R.station?.root, '佐賀駅', () => this.openPuzzle('bus'));
    reg('mallageSaga', R.mallage?.root, 'モラージュ佐賀', () => this.openPuzzle('shopping'));
    reg('kawakubo', R.property?.root, '川久保の街角', () => this.openPuzzle('sketch'));
    reg('amandi', R.amandi.root, 'アマンディ佐賀', () => this.openAmandi());
    reg('bistro', R.bistro.root, '山カフェレストランKUREHA', () => this.openBistro());
    for (const [id, name] of [['roundone', 'ラウンドワンスタジアム 佐賀店'], ['ide', '井手ちゃんぽん 大和店'], ['tadakane', '忠兼総本社']]) reg(id, R[id].root, name, () => this.openCity(id));
    reg('ideDish', R.ide.dish, 'ちゃんぽんの食品見本', () => this.openCity('ide'));
    reg('yoshinogari', R.yoshinogari?.root, '吉野ヶ里遺跡', () => this.visit('yoshinogari'));
    reg('bistroDish', R.bistro.platedDish, '苦い泡のドレッシングのサラダ', () => this.openBistro());
    for (const [id, place] of Object.entries(R.streetScenes || {})) reg(`street_${id}`, place.root, place.name, () => this.inspectStreet(id));
    reg('loco', this.train.loco.g, 'ほしまわり号', () => this.talkFrog());
  }

  _optimize() {
    const roots = new Set([this.island, this.tracks, this.R.root]);
    const actors = new Set(this.creatures.map(c => c.root));
    for (const it of this.g.interactables.values()) if (!actors.has(it.object)) roots.add(it.object);
    let n = 0;
    if (!new URLSearchParams(location.search).has('nomerge')) for (const root of roots) n += mergeStatic(root);
    this.g.refreshInteractableMeshes(); console.info(`[optimize] merged ${n} meshes`);
  }

  get stamps() { return Object.keys(STOPS).filter(id => this.g.flags[STOPS[id].flag]); }
  applyState() {
    const f = this.g.flags, R = this.R;
    if (R.waterOn) R.waterOn.visible = !!f.saSluiceDone;
    if (R.marketFlags) R.marketFlags.visible = !!f.saShoppingDone;
    if (R.sketchComplete) R.sketchComplete.visible = !!f.saSketchDone;
    if (R.balloon) { R.balloon.userData.baseY ??= R.balloon.position.y; R.balloon.position.y = R.balloon.userData.baseY + (f.saBalloonDone ? 6 : 0); }
    if (R.bistro.servedDish) R.bistro.servedDish.visible = !!f.saFoamTasted;
    this.g.setGrade(GRADES.saga); this.g.refreshInventory(); this.g.refreshQuests();
  }

  update(dt, t) {
    for (const c of this.creatures) { c.camPos = this.g.camera.position; c.update(dt, t); }
    this.sky.uniforms.time.value = t; this.clouds.rotation.y = t * .001;
    if (this.R.bistro.foam) this.R.bistro.foam.rotation.y = Math.sin(t * .3) * .025;
    this.smoke.update(dt);
    if (this.R.balloon && !this.flying) {
      const b = this.R.balloon;
      b.position.y = (b.userData.baseY || 0) + (this.g.flags.saBalloonDone ? 6 : 0) + Math.sin(t * .65) * .12;
      b.rotation.z = Math.sin(t * .38) * .025;
    }
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) { this.smokeT = .9; this.smoke.emit(this.train.worldOf(this.train.loco, this.train.loco.smokeLocal), { vel: new V(-.1, .5, 0), spread: .07, life: 1.6, size0: .09, size1: .45 }); }
  }

  quests() {
    const f = this.g.flags;
    return [{ text: '🪶 カササギに、まちあるきの話を聞く', done: !!f.saGuideMet }, ...Object.values(STOPS).map(s => ({ text: `${s.icon} ${s.name}`, done: !!f[s.flag] })), ...(this.stamps.length === 5 ? [{ text: '✉ 駅前のカササギと、旅の便りを仕上げる', done: !!f.finaleDone }] : [])];
  }

  hint() {
    const f = this.g.flags, H = (key, ...lines) => ({ key, lines });
    if (!f.saGuideMet) return H('sa-guide', '駅前のカササギに話しかけよう。旅ノートの「行き先」から、広い箱庭を移動できる。');
    if (f.finaleDone) return H('sa-clear', '五つの景色が旅ノートにそろった。カササギからクリア画面へ進める。');
    if (this.stamps.length === 5) return H('sa-final', '駅前のカササギに、五つのスタンプを見せよう。旅ノートの「佐賀駅」から戻れる。');
    const id = STOPS[f.saActivePuzzle] && !f[STOPS[f.saActivePuzzle].flag] ? f.saActivePuzzle : Object.keys(STOPS).find(k => !f[STOPS[k].flag]);
    if (id === 'bus') return H('sa-bus', '臨時便の各区間で、到着時刻を計算しよう。買物の25分と、広場の乗換待ちが鍵。', '9:15発ならモールに9:35着。買物は10:00まで。広場での待ち時間は5〜15分に。', '佐賀駅9:15、モール10:00、広場10:30発。川久保10:55着なら、すべての条件に合う。');
    if (id === 'shopping') return H('sa-shop', '同じ個数の組を、ひとまとまりにして考えてみよう。のり＋絵葉書は300円、ぼうろ＋紅茶は400円。', '全部で6個なので、2個組を3組。300円の組と400円の組で1,000円にするには？', '有明のり2、丸ぼうろ1、和紅茶1、バルーン絵葉書2。');
    if (id === 'sluice') return H('sa-water', '上から水色の線をたどろう。住宅へ流さず、三つの田全部に届ける。', '①の田は西の水門Bから。②と③は、中央の分かれ道Dから分けて流せる。', 'Aは両側、Bは①の田、Cは中央、Dは両側、Eは③の田。');
    if (id === 'balloon') return H('sa-wind', '高度ごとの矢印は、その回に流れる先。次の予報も見て、三つの目印を結ぼう。', '出発から北、東、東、北、東、北、東、北と流れる道がある。', '高度は「低・低・中・高・中・中・低・低」。八つの風で、三つの目印と着地点へ。');
    return H('sa-sketch', '川久保の屋根・窓の下・松・塀を観察しよう。「建物を見直す」で答えを残したまま外観へ戻れる。', '手前の低い切妻の奥に、もう一つ高い屋根。左窓の下には斜めに編んだような模様がある。', '二段の切妻、白灰の網代模様、段造りの松、重なる扇形の透かしを選ぼう。');
  }

  revealHotspots() { this.g.ui.toast('✨ 旅ノートの「行き先」で、建物や寄り道の近くへ移れる。', 2400); }
  say(lines) { return this.g.say(lines); }
  view(object, { height = 1.4, dist = 16, polar = 1.17, theta = 0 } = {}) {
    const target = object.getWorldPosition(new V()).add(new V(0, height, 0));
    return this.g.focusOn(target, { dist, polar, theta, keepAngle: true, subject: object, duration: .9 });
  }

  async talkGuide() {
    const g = this.g;
    await this.view(this.residents.magpie.root, { height: 1.7, dist: 17, theta: -.15 });
    if (g.flags.finaleDone) { await this.say([{ who: 'magpie', text: '同じ道でも、帰りには違うものが見えるんだ。また、寄り道しにおいで。' }]); return this.showClear(); }
    if (this.stamps.length === 5) return this.finale();
    if (!g.flags.saGuideMet) {
      g.flag('saGuideMet'); g.give('sagaGuide');
      g.refreshQuests();
      g.note('sa-welcome', 'まちあるきのはじまり', '駅、モール、瓦屋根の街角。<b>五つの寄り道</b>を好きな順で巡ろう。<br>持ち物の<b>旅のノート</b>から行き先を選べる。<br>五つのスタンプが集まったら、駅前のカササギへ。');
      this.residents.magpie.wave = 2;
      return this.say([{ who: 'magpie', text: 'ようこそ。屋根の向こうまで平らな空。今日は、歩くのにいい日だね。' }, { who: 'magpie', text: '駅とモールを巡って、クリークの水や、空の風にも会ってきて。瓦屋根の街角も、ゆっくり眺めてほしいな。' }, { who: 'magpie', text: '五つの寄り道のスタンプを、この【旅のノート】に集めよう。順番は自由。行き先のボタンを押せば、その場所の近くへ移れるよ。' }, { who: 'magpie', text: '全部そろったら、この駅前へ。君の見つけた景色を、一枚の便りにしよう。' }]);
    }
    return this.say([{ who: 'magpie', text: `スタンプは${this.stamps.length}つ。急がなくていいよ。ノートの行き先から、気になる景色へどうぞ。` }]);
  }

  async talkKeeper(who) {
    const id = Object.keys(STOPS).find(k => STOPS[k].who === who), stop = STOPS[id];
    await this.view(this.residents[who].root, { height: who === 'crane' ? 2 : who === 'rabbit' ? .65 : 1.5, dist: who === 'rabbit' ? 10 : 16 });
    const lines = {
      cat: ['ここは佐賀駅。横に長い高架と、東側の大きな白い屋根が目印だニャ。', '今日は、ほしまわりの臨時便でまちあるき。乗り継ぎと買物の時間を考えて、川久保までの旅程を作ってほしいニャ。'],
      rabbit: ['モラージュ佐賀へようこそ。北館も南館も、のんびり見ていってね。', 'こちらは今日だけのおみやげ市。買物メモに合うように、四つのおみやげの個数を考えてくれる？'],
      crane: ['クリークは、田んぼと暮らしを結ぶ道。水にも、ちゃんと行き先があるのです。', '三つの田には水を届けて、住宅側には流さない。上流から順に、水門を確かめてみてください。'],
      momonga: ['広い空は大好き。でも、バルーンは翼で曲がれないんだ。高さを変えて、違う風に乗るんだよ。', 'この飛行盤で、三つの目印を通って着地点へ。予報は一回ごとに変わるから、先の風も読んでね。'],
    };
    if (this.g.flags[stop.flag]) return this.say([{ who, text: { cat: '乗り継ぎはばっちり。窓の外の景色も、ゆっくり楽しむニャ。', rabbit: 'きれいに予算どおり！ 帰りの汽車で、丸ぼうろをひとつ、どうぞ。', crane: '三つの田に、水が行き渡りました。水面にも、青空が戻りましたね。', momonga: '見て！ あの高さの風なら、空がずっと広く見えるよ。' }[who] }]);
    await this.say(lines[who].map(text => ({ who, text }))); this.recordClue(id); this.showClue(id);
  }

  recordClue(id) { const s = STOPS[id]; this.g.flag(`saClue_${id}`); this.g.note(`sa-clue-${id}`, s.name, s.html()); }
  showClue(id) { const s = STOPS[id]; this.g.ui.openPanel({ title: s.name, body: el('div', 'sa-notes', s.html()), cls: 'saga-panel' }); }

  async openPuzzle(id) {
    const g = this.g, s = STOPS[id];
    if (!s) return;
    g.flag('saActivePuzzle', id);
    if (id === 'bus') await this.visit('station');
    else if (id === 'shopping') await this.visit('mallage');
    else if (id === 'sketch') await this.propertyView('front');
    else await this.view(this.R[s.object], { height: 1.2, dist: id === 'balloon' ? 25 : 17, polar: 1.02 });
    if (g.flags[s.flag]) return this.say([`【${s.name}】のスタンプは、旅ノートに押してある。`, id === 'sketch' ? '屋根の形も、松の影も。さっきより、少しよく見える気がする。' : 'この景色を、もう少し眺めていこう。']);
    this.recordClue(id);
    return s.panel(g.ui, g.audio, {
      draft: g.flags.saDrafts?.[id],
      onChange: draft => g.flag('saDrafts', { ...g.flags.saDrafts, [id]: draft }),
      onSolved: panel => this._solve(panel, () => this.finishPuzzle(id)),
    });
  }

  _solve(panel, action) {
    if (this.solving) return;
    this.solving = true; this.g.busy = true; panel.close();
    Promise.resolve().then(action).catch(e => { console.error(e); this.g.ui.toast('もう一度、その寄り道を調べてみよう。'); }).finally(() => { this.solving = false; this.g.busy = false; this.g.save(); });
  }

  async finishPuzzle(id) {
    const g = this.g, s = STOPS[id];
    if (g.flags[s.flag]) return;
    g.flag(s.flag); this.applyState();
    g.note(`sa-stamp-${id}`, `${s.icon} ${s.name}のスタンプ`, { bus: '乗り継ぎの間にも、旅の時間は流れていた。', shopping: '手提げ袋には、佐賀の味と、小さな空。', sluice: '水の道をたどると、田んぼに青空が戻った。', balloon: '風を選んで、空を渡った。', sketch: '屋根と松と瓦塀。よく見た景色は、記憶に残る。' }[id]);
    this.residents[s.who].hop(); g.audio.play(id === 'sluice' ? 'water' : 'solve');
    if (id === 'balloon') await this.visit('balloon');
    else if (id === 'sketch') await this.propertyView('front');
    const text = { bus: '三つの便が、一日の道になった。ネコの駅長が、旅程メモに小さなバスの印を押した。', shopping: 'かさり。おみやげ袋に、海の香りと、お茶の時間が収まった。レシートには、ぴったり1,000円。', sluice: 'ことこと……。水門の先へ水が分かれ、三つの田が静かに空を映し始めた。', balloon: 'ふわり。モモンガのバルーンが、風をつかんで浮かんだ。遠くの屋根が、少しだけ小さくなる。', sketch: '二つの屋根、編み目の壁、段造りの松、透かしの塀。見つけた四つの形が、一枚の街角になった。' };
    await this.say([text[id], `【${s.name}】のスタンプを、旅ノートに押した。`]);
    if (this.stamps.length === 5) { g.audio.play('quest'); await this.say([{ who: 'magpie', text: '五つ、そろったね。駅前で待っているよ。旅の便りを仕上げよう。' }]); }
  }

  showGuide() {
    const body = el('div', 'sa-guide');
    body.innerHTML = '<p class="panel-note">五つの寄り道を、好きな順に。<br>湯どころ、ちゃんぽん、ボウリング。<br>街の寄り道も、好きな順にどうぞ。</p><div class="sa-destinations"></div><p class="sa-map-caption">北 ↑　アマンディとKUREHAは北西。<br>瓦屋根の街角は北東、モールは南東。<br>吉野ヶ里遺跡はラウンドワンの北側にあります。</p>';
    let panel;
    for (const [id, name, sub] of [['station', '🚉 佐賀駅', '南口と木組みの大屋根'], ['mallage', '🛍 モラージュ佐賀', '北館の入口'], ['cinema', '🎬 モラージュ南館', 'シネマ側の外観'], ['mallageWhole', '🏬 モール全体', '北館・南館と駐車場'], ['kawakubo', '🏡 川久保の街角', '屋根・作業場・庭・瓦塀'], ['amandi', '♨ アマンディ佐賀', '北西の湯どころでひと休み'], ['bistro', '🌿 山カフェレストランKUREHA', '木々に囲まれたレストラン'], ['bakery', '🍞 嵜本ベーカリー', 'おすすめはいちごミルク食パン'], ['roundone', '🎳 ラウンドワン佐賀店', '大きなピンとミニボウリング'], ['yoshinogari', '🏛 吉野ヶ里遺跡', '環濠と物見やぐらの集落'], ['ide', '🍜 井手ちゃんぽん 大和店', '赤い入口と、野菜の山'], ['tadakane', '🫙 忠兼総本社', '黄色いひさしの街角'], ['northwest', '🚶 北西の散歩道', '商店とクリークの小橋'], ['sluice', '🌾 クリーク', '水と田んぼの寄り道'], ['balloon', '🎈 バルーン広場', '風読みの寄り道'], ['whole', '🗺 まち全体', '箱庭を見渡す']]) {
      const b = el('button', 'btn sa-destination', `<b>${name}</b><small>${sub}</small>`);
      b.onclick = () => { panel.close(); this.visit(id); }; body.querySelector('.sa-destinations').appendChild(b);
    }
    for (const [id, s] of Object.entries(STOPS)) {
      const row = el('section', `sa-guide-stop ${this.g.flags[s.flag] ? 'stamped' : ''}`);
      row.appendChild(el('h3', '', `${this.g.flags[s.flag] ? '✓' : '○'} ${s.icon} ${s.name}`));
      const buttons = el('div', 'sa-guide-actions');
      const b = el('button', 'btn', this.g.flags[s.flag] ? '景色を見に行く' : 'この寄り道へ');
      b.onclick = () => { panel.close(); this.openPuzzle(id); }; buttons.appendChild(b);
      const clue = el('button', 'btn', 'メモを読む'); clue.onclick = () => { panel.close(); this.recordClue(id); this.showClue(id); }; buttons.appendChild(clue);
      row.appendChild(buttons); body.appendChild(row);
    }
    body.appendChild(el('p', 'sa-side-memories', `よりみち日記　♨ ${this.g.flags.saSpaRested ? '湯どころでひと休み ✓' : '湯どころは、まだこれから'}<br>🌿 ${this.g.flags.saFoamTasted ? 'KUREHAで一皿を味わった ✓' : 'KUREHAのテラスでひと休みもどうぞ'}`));
    body.querySelector('.sa-side-memories').innerHTML += `<br>🎳 ボウリングの最高記録 ${this.g.flags.saBowlingBest || 0}本<br>🍜 ${this.g.flags.saChanponTasted ? '大和店のちゃんぽんを味わった ✓' : '赤い入口の先で、おなかもひと休み'}<br>🫙 ${this.g.flags.saTadakaneSeen ? '忠兼総本社の窓辺を眺めた ✓' : 'ものづくりの街角を訪ねて'}`;
    panel = this.g.ui.openPanel({ title: `旅のノート　${this.stamps.length}/5`, body, cls: 'saga-panel' });
    return panel;
  }

  async visit(id) {
    const g = this.g, R = this.R;
    if (['roundone', 'ide', 'tadakane', 'yoshinogari'].includes(id)) {
      const model = R[id], v = model.views.front;
      return this.modelView(model, v.position, v.target, { roundone: 122, ide: 28, tadakane: 15, yoshinogari: 40 }[id]);
    }
    if (id === 'bakery') {
      const place = R.streetScenes.bakery;
      return g.focusOn(place.target, { dist: (place.dist || 16) * (innerWidth < innerHeight ? 1.5 : 1), polar: place.polar || 1.05, theta: place.theta || 0, subject: place.root, frameHigh: id !== 'bakery', keepAngle: true, duration: .9 });
    }
    if (id === 'whole') return g.moveCamera(...this.homeView(innerWidth < innerHeight), 1.2);
    if (id === 'amandi') {
      const v = R.amandi.views.front;
      return this.modelView(R.amandi, v.position, v.target, 110);
    }
    if (id === 'bistro') {
      const v = R.bistro.views.front;
      const position = v.position.clone();
      if (innerWidth < innerHeight) position.y = 13.8;
      return this.modelView(R.bistro, position, v.target, 26);
    }
    if (id === 'northwest') return g.focusOn(new V(-38, 1.5, -54), { dist: innerWidth < innerHeight ? 185 : 86, polar: .72, theta: .25, duration: 1.1 });
    if (id === 'kawakubo') { await this.propertyView('front'); return this.showPropertyViews(); }
    if (id === 'station') return this.modelView(R.station, new V(65, 20, 115), new V(0, 4.8, 14), 100);
    if (id === 'mallageWhole') {
      const v = R.mallage.recommendedViews.complex;
      return this.modelView(R.mallage, v.position, v.target, 340);
    }
    if (id === 'mallage' || id === 'cinema') {
      const v = R.mallage.recommendedViews?.[id === 'mallage' ? 'front' : 'cinema'];
      if (v) return this.modelView(R.mallage, v.position, v.target, id === 'mallage' ? 80 : 110);
      return this.modelView(R.mallage, id === 'mallage' ? new V(0, 20, 135) : new V(240, 30, 190), id === 'mallage' ? new V(2, 6, 55) : new V(145, 9, 160), 140);
    }
    return this.view(R[id === 'sluice' ? 'sluice' : 'balloonPad'], { height: 2.5, dist: innerWidth < innerHeight ? 46 : 35, polar: .95 });
  }

  modelView(model, position, target, width = 26) {
    const root = model.root; root.updateWorldMatrix(true, false);
    const vector = p => p.isVector3 ? p.clone() : new V(...p);
    const p = root.localToWorld(vector(position)), t = root.localToWorld(vector(target));
    const scale = root.getWorldScale(new V()).x;
    const halfFov = Math.tan(THREE.MathUtils.degToRad(this.g.camera.fov / 2));
    const needed = width * scale / (2 * halfFov * this.g.camera.aspect);
    const offset = p.clone().sub(t); offset.setLength(Math.max(offset.length(), needed));
    return this.g.moveCamera(t.clone().add(offset), t, 1.15);
  }

  propertyView(view = 'front') {
    const model = this.R.property, preset = model.views[view] || model.views.front;
    const position = preset.position.clone(); if (view === 'left') position.y = 3;
    const target = preset.target.clone();
    const portrait = innerWidth < innerHeight;
    if (view === 'front') { position.y = 5.7; target.y = 2.5; }
    // 縦画面は全幅を収めるために後退する。途中の駅舎や施設の屋根を越す高さを確保する。
    if (portrait && ['left', 'right'].includes(view)) position.y = target.y + Math.hypot(position.x - target.x, position.z - target.z) * .45;
    return this.modelView(model, position, target, {front:portrait ? 24 : 28,porch:6.8,wall:4.6,shed:13}[view] || (portrait ? 22 : 29));
  }

  showPropertyViews() {
    const body = el('div', 'sa-property-guide');
    body.innerHTML = '<p>瓦の重なり、窓の下の模様、庭の松。<br>向きを変えて、街角を眺めてみよう。</p>';
    let panel;
    for (const [id, label] of [['front', '正面から'], ['left', '左の路地から'], ['right', '庭側から'], ['porch', '玄関と腰壁を近くで'], ['wall', '瓦塀の透かしを近くで'], ['shed', '作業場を近くで']]) {
      const b = el('button', 'btn', label); b.onclick = () => { panel.close(); this.propertyView(id); }; body.appendChild(b);
    }
    const b = el('button', 'btn primary', '街角スケッチを開く'); b.onclick = () => { panel.close(); this.openPuzzle('sketch'); }; body.appendChild(b);
    panel = this.g.ui.openPanel({ title: '川久保の街角', body, cls: 'saga-panel small' }); return panel;
  }

  async openAmandi() {
    await this.visit('amandi');
    return amandiVisitPanel(this.g.ui, {
      rested: !!this.g.flags.saSpaRested,
      onRest: () => this.sideScene(() => this.restAtAmandi()), onTalk: () => this.sideScene(() => this.talkSpaHost()), onView: () => this.visit('amandi'),
    });
  }

  async talkSpaHost() {
    await this.view(this.residents.spaHost.root, { height: 1.35, dist: 14, theta: .25 });
    await this.say([{ who: 'spaHost', text: 'アマンディ佐賀へようこそ。ずいぶん、歩いてこられましたね。' }, { who: 'spaHost', text: '旅の途中には、何も数えない時間も大切です。スタンプのことは、少しだけ横に置いて。' }, { who: 'spaHost', text: 'ひと休みしてから、またお好きな道へ。KUREHAのテラスから眺める緑も、きれいですよ。' }]);
    return this.openAmandi();
  }

  async restAtAmandi() {
    const g = this.g, rested = !!g.flags.saSpaRested;
    await this.view(this.residents.spaHost.root, { height: 1.35, dist: 14, theta: .25 });
    g.flag('saSpaRested');
    g.note('sa-side-spa', '♨ アマンディ佐賀でひと休み', 'まち歩きの合間、カピバラの案内でひと休み。<br>湯上がりのように肩の力が抜けると、さっきまでの景色が、少し近くなった。');
    await g.ui.banner('湯どころで、ひと休み', '急がない時間も、旅のうち。', 1500);
    await this.say([rested ? 'タオルのやわらかさに、さっき歩いた道を思い出す。' : '温かな時間が、歩き疲れた肩をゆっくりほどいていく。', { who: 'spaHost', text: 'どうぞ、ごゆっくり。佐賀の空は、逃げませんから。' }]);
  }

  async openBistro() {
    await this.visit('bistro');
    return bistroMenuPanel(this.g.ui, {
      tasted: !!this.g.flags.saFoamTasted,
      onTaste: () => this.sideScene(() => this.tasteFoamSalad()), onTalk: () => this.sideScene(() => this.talkChef()),
      onView: () => {
        const v = this.R.bistro.views.terrace;
        return this.modelView(this.R.bistro, v.position, v.target, 17);
      },
    });
  }

  async talkChef() {
    await this.view(this.residents.chef.root, { height: 1.4, dist: 13, theta: -.18 });
    await this.say([{ who: 'chef', text: 'いらっしゃいませ。山カフェレストランKUREHAへようこそ。木々を眺めながら、ゆっくりしていってください。' }, { who: 'chef', text: '今日の一皿には、色とりどりの野菜を。歩いてきた景色も思い出しながら、どうぞ。' }]);
    return this.openBistro();
  }

  async tasteFoamSalad() {
    const g = this.g, tasted = !!g.flags.saFoamTasted;
    g.flag('saFoamTasted'); this.applyState();
    g.note('sa-side-bistro', '🌿 KUREHAで味わった一皿', '木々を眺めながら、白い皿に盛られたサラダを味わった。<br>ふわりと消える泡のドレッシングは、ほろ苦く、そのあとに野菜の甘さが残る。');
    await this.view(this.R.bistro.platedDish, { height: .15, dist: 7.5, polar: .7, theta: .25 });
    g.audio.play('pop');
    await this.say([{ who: 'chef', text: tasted ? 'おかえりなさい。どうぞ、ゆっくり召し上がってください。' : 'お待たせしました。こちらが、今日の一皿です。' }, '細かな泡が、舌の上ですっと消えた。ほろ苦い香りのあとに、野菜の甘さがゆっくり広がる。']);
  }

  sideScene(action) {
    if (this.sideBusy) return;
    this.sideBusy = true; this.g.busy = true;
    Promise.resolve().then(action).catch(error => { console.error(error); this.g.ui.toast('もう一度、この寄り道を調べてみよう。'); }).finally(() => { this.sideBusy = false; this.g.busy = false; this.g.save(); });
  }

  async inspectStreet(id) {
    const place = this.R.streetScenes[id];
    await this.g.focusOn(place.target, { dist: (place.dist || 16) * (innerWidth < innerHeight ? 1.5 : 1), polar: place.polar || 1.05, theta: place.theta || 0, subject: place.root, frameHigh: id !== 'bakery', keepAngle: true, duration: .9 });
    const lines = {
      bakery: ['嵜本ベーカリーから、焼きたてのパンの香り。ガラスの向こうには、角のそろった食パンが並んでいる。', 'おすすめは「いちごミルク食パン」。白といちご色のやわらかな層に、甘い香りがふわりと重なる。'],
      florist: ['花屋の軒先で、葉の形の違う鉢が、風に揺れている。小さな花束の横に、今日の水やりのじょうろ。', '同じ緑でも、日向と日陰で、少しずつ色が違って見える。'],
      bridge: ['小橋の下を、水が静かに通り抜けていく。向こうの岸には、散歩の途中の自転車。', '少し立ち止まると、水音の間に、遠い踏切の音が聞こえた。'],
      park: ['木陰のベンチには、誰かが休んだあとの、やさしい静けさが残っている。', '街角の小さな公園にも、空はちゃんと広がっていた。'],
    }[id] || ['通りの向こうに、今日もいつもの暮らしが続いている。'];
    await this.say(lines); this.g.note(`sa-street-${id}`, place.name, lines.join('<br>'));
  }

  async openCity(id) {
    await this.visit(id);
    const flags = this.g.flags;
    return cityVisitPanel(this.g.ui, id, {
      recorded: id === 'roundone' ? !!flags.saBowlingPlayed : id === 'ide' ? !!flags.saChanponTasted : !!flags.saTadakaneSeen,
      onView: () => this.visit(id),
      onExperience: () => this.sideScene(() => {
        if (id === 'roundone') return bowlingPanel(this.g.ui, {
          best: Number(flags.saBowlingBest) || 0,
          onResult: (score, best) => {
            this.g.flag('saBowlingPlayed'); this.g.flag('saBowlingBest', best);
            this.g.note('sa-side-bowling', '🎳 佐賀で、のんびりボウリング', `ころころ、ことん。旅の途中でボールを転がした。<br>最高記録は${best}本。気が向いたら、また一投。`);
            this.g.audio.play(score === 10 ? 'solve' : 'pop');
          },
        });
        return id === 'ide' ? this.tasteChanpon() : this.inspectTadakane();
      }),
    });
  }

  async tasteChanpon() {
    const g = this.g;
    await this.view(this.R.ide.dish, { height: .15, dist: 4.2, polar: .66, theta: -Math.PI/2 });
    g.flag('saChanponTasted');
    g.note('sa-side-chanpon', '🍜 井手ちゃんぽん大和店でひと休み', '丼には、山のような野菜。<br>湯気の向こうに、赤い入口と、さっき歩いた広い空を思い出す。');
    await this.say(['野菜が山のように盛られた、ちゃんぽんの丼。もやしの間から、太い麺が顔を出している。', 'ひと口ずつ、ゆっくり。歩いてきたぶんだけ、おなかに温かさが広がった。']);
  }

  async inspectTadakane() {
    const model = this.R.tadakane;
    await this.modelView(model, [-3.6,2.1,13], [-3.6,1.3,4.8], 6.5);
    this.g.flag('saTadakaneSeen');
    this.g.note('sa-side-tadakane', '🫙 忠兼総本社の、黄色いひさし', '木枠の戸、小さな窓、並んだ容器。<br>駅や大きなお店の間にも、ものづくりの街の景色があった。');
    await this.say(['黄色いひさしの下に、木枠の戸と小さな窓。窓辺には、ふたのついた容器が、静かに並んでいる。', '道端の鉢植えまで見てみると、ものづくりの街角にも、小さな暮らしが見えた。']);
  }

  async talkFrog() { await this.view(this.residents.frog.root, { dist: 15 }); return this.say([{ who: 'frog', text: this.g.flags.finaleDone ? 'いい便りができたケロ。好きな旅へ、また出かけるケロ！' : '線路の先でも、ちゃんと佐賀の風が吹いてるケロ。今日は寄り道しほうだいケロ！' }]); }
  inspectItem(id) { if (id === 'sagaGuide') { this.showGuide(); return true; } return false; }
  useItem(id) { return id === 'sagaGuide' ? this.showGuide() : this.say(['この寄り道には、使わなさそうだ。']); }

  async opening() {
    const g = this.g; g.cinematic = true;
    this.train.s = this.stopS - 17; this.train.place();
    await g.ui.fade(0, .8);
    await g.moveCamera(new V(-58, 17, 38), new V(-30, 3, 13), 1.2);
    let travelled = 0;
    await g.tweens.add({ duration: 2.8, ease: Ease.inOut, onUpdate: k => { const d = 17 * k; this.train.advance(d - travelled); travelled = d; } });
    g.audio.play('steam'); await g.ui.banner('田舎の寄り道', 'EXTRA JOURNEY　屋根とクリークと、広い空', 2200);
    await this.say(['青い空の下、白い大屋根が近づいてきた。ほしまわり号は、佐賀駅に小さく汽笛を響かせた。', { who: 'frog', text: '空がひろいケロ！ あのカササギさん、こっちに手を振ってるケロ。' }]);
    g.flag('introDone'); g.cinematic = false; await this.talkGuide();
    await this.visit('station');
  }

  async finale() {
    const g = this.g;
    if (this.stamps.length < 5 || this.departing) return;
    this.departing = true; g.cinematic = true;
    await this.say([{ who: 'magpie', text: '駅の屋根も、おみやげの袋も、水の道も、風も。よく見てくれたんだね。' }, { who: 'magpie', text: 'さっきの街角の松も、いまはきっと、少し違う影を落としているよ。君だけの一日が、ちゃんと残った。' }]);
    await g.moveCamera(new V(-64, 33, 76), new V(-16, 9, 20), 1.5);
    g.audio.play('chime');
    await g.ui.banner('佐賀から、旅の便り', '五つの寄り道が、一枚の思い出に。', 2600);
    await this.say(['旅ノートを開くと、五つのスタンプの間に、あの日の空が広がっていた。', { who: 'magpie', text: '次に来るときも、特別な用事はいらないよ。ただ、歩きたくなったら。' }, { who: 'frog', text: 'また来るケロ。丸ぼうろのぶんだけ、かばんは軽くなったケロ。' }]);
    g.flag('finaleDone'); g.state.cleared = [...new Set([...(g.state.cleared || []), 'saga'])]; this.applyState(); g.save();
    await g.moveCamera(...this.homeView(innerWidth < innerHeight), 1.2);
    g.cinematic = false; this.departing = false;
    await g.ui.fade(1, .8, '#f5f0df'); this.showClear();
  }

  showClear() { showStageClear(this.g, 'saga', '佐賀の屋根と、クリークと、広い空。旅ノートに、一日が残った。'); }
}
