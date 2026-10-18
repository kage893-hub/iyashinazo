import * as THREE from 'three';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs } from '../../lib/environment.js';
import { Motes } from '../../lib/livefx.js';
import { makeFrog } from '../../lib/creatures.js';
import { makeCuratorOwl, makeRestorerFox, makeArchivistOtter, makeGardenerTortoise, makeOpticianMomonga } from '../../lib/creatures-museum.js';
import { add, group, G, glow, rng, softCircleTexture } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildRails } from '../../lib/rails.js';
import { Train, RAIL_Y } from '../station/train.js';
import { GRADES, mixGrade } from '../../core/postfx.js';
import { el } from '../../core/ui.js';
import { Ease } from '../../core/tween.js';
import { showStageClear } from '../clear.js';
import { buildMuseumDiorama, ISLAND, TRACK_Z } from './diorama.js';
import { SEALS, fossilPanel, archivePanel, gardenPanel, prismPanel, orreryPanel, fossilClueHTML, archiveClueHTML, gardenClueHTML, prismClueHTML } from './panels.js';

const V = THREE.Vector3;
const ROOM_ICONS = { fossil: '🐚', archive: '🪶', garden: '🌿', prism: '✦' };
const ROOMS = {
  fossil: { flag: 'muFossilDone', name: '時の地層', object: 'fossil', board: 'fossilClue', who: 'fox', clue: fossilClueHTML, panel: fossilPanel, height: 2.0, dist: 19 },
  archive: { flag: 'muArchiveDone', name: '夜の収蔵書庫', object: 'archive', board: 'archiveClue', who: 'otter', clue: archiveClueHTML, panel: archivePanel, height: 1.6, dist: 18 },
  garden: { flag: 'muGardenDone', name: '月の鉱石庭園', object: 'garden', board: 'gardenClue', who: 'tortoise', clue: gardenClueHTML, panel: gardenPanel, height: 1.5, dist: 19 },
  prism: { flag: 'muPrismDone', name: '光の回廊', object: 'lightBench', board: 'lightClue', who: 'momonga', clue: prismClueHTML, panel: prismPanel, height: 1.5, dist: 17 },
};
export const SPEAKERS = {
  owl: { name: 'フクロウの館長', icon: '🦉', color: '#376e71', voice: 300 },
  fox: { name: 'キツネの修復士', icon: '🦊', color: '#ba7344', voice: 650 },
  otter: { name: 'ラッコの司書', icon: '🦦', color: '#64758d', voice: 440 },
  tortoise: { name: 'カメの庭師', icon: '🐢', color: '#59866c', voice: 220 },
  momonga: { name: 'モモンガの光技師', icon: '🐿', color: '#8e7396', voice: 1050 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#b68a3b' },
};

function museumPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-120, 32, 32), new V(-82, 23, 16), new V(-54, RAIL_Y, TRACK_Z), new V(-34, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-34, RAIL_Y, TRACK_Z), new V(36, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(36, RAIL_Y, TRACK_Z), new V(54, RAIL_Y, TRACK_Z), new V(72, 15, -38), new V(112, 32, -66)));
  p.arcLengthDivisions = 900;
  return p;
}

/** 本編の旅を終えたあと、好きな日に訪ねられる夜間開館の博物館。 */
export class MuseumStage {
  constructor(game) {
    this.g = game;
    this.id = 'museum';
    this.title = '星あかりの博物館';
    this.questTitle = '🏛️ 迷い星を、夜空へ帰そう';
    this.departing = false;
    this.solving = false;
  }

  homeView(portrait) {
    const aspect = innerWidth / innerHeight;
    const fov = (portrait ? 42 : 30) * Math.PI / 180;
    // 横幅から距離を決め、縦画面でも左右の展示まで全景に収める。
    const distance = (ISLAND.w + 8) / (2 * Math.tan(fov / 2) * aspect) + 24;
    const target = new V(0, 1, 0);
    const position = new V().setFromSpherical(new THREE.Spherical(distance, 0.83, portrait ? 0 : 0.12)).add(target);
    return [position, target];
  }

  async build() {
    const g = this.g, scene = g.scene;
    document.body.classList.add('museum');
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('museum');
    g.bounds = { minX: -28, maxX: 28, minZ: -19, maxZ: 20 };
    g.controls.maxDistance = 280;
    g.renderer.toneMappingExposure = 1.16;
    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.nTop.value.set('#06142c'); u.nMid.value.set('#17344e'); u.nBot.value.set('#26465e');
    u.night.value = 1;
    u.moonDir.value.set(-0.6, 0.5, -0.6).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#26465e', 180, 500);
    this.hemi = new THREE.HemisphereLight('#a5c6e4', '#465751', 1.1);
    const moon = new THREE.DirectionalLight('#afcbee', 1.35);
    moon.position.set(-24, 35, 20);
    moon.castShadow = true;
    moon.shadow.mapSize.set(g.shadowSize(), g.shadowSize());
    Object.assign(moon.shadow.camera, { left: -41, right: 41, top: 34, bottom: -34, near: 5, far: 120 });
    moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.07;
    scene.add(this.hemi, moon, moon.target);
    for (const [x, z] of [[-17, 6], [-16, -7], [17, 6], [16, -7]]) {
      const lamp = new THREE.PointLight('#ffdaa0', 18, 15, 2);
      lamp.position.set(x, 4, z); scene.add(lamp);
    }
    this.island = makeIslandBase({ ...ISLAND, seed: 117, grass: '#667e76' });
    scene.add(this.island);
    this.clouds = makeClouds(119);
    this.clouds.scale.setScalar(1.9);
    this.clouds.userData.mat.color.set('#385776');
    this.clouds.userData.mat.emissive.set('#183047');
    this.clouds.userData.mat.emissiveIntensity = 0.08;
    scene.add(this.clouds);
    this.smallIslands = [[-88, 4, -54, 5, 120], [83, -6, 35, 4, 121], [-78, 9, 40, 4, 122], [70, 6, -68, 6, 123]].map(([x, y, z, s, seed]) => {
      const o = makeSmallIsland(seed, s); o.position.set(x, y, z); scene.add(o);
      return { o, y, phase: seed };
    });
    this.path = museumPath();
    this.stopS = this.path.getCurveLengths()[0] + 12;
    this.tracks = buildRails(scene, this.path, { z: TRACK_Z, islandX: [-29.5, 29.5], pillars: [this.stopS - 27, this.stopS - 35] });
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS; this.train.place();
    await g.loadingStep(0.3, '夜の博物館を組み立てています…');
    this.R = buildMuseumDiorama(scene);
    this.motes = new Motes(scene, { count: 85, color: '#e6f3d9', size: 0.075, area: { x: 55, z: 37, y0: 0.5, y1: 7 }, kind: 'firefly', opacity: 0.4 });
    this.smoke = new Puffs(scene, { count: 30, color: '#d4e3ec', opacity: 0.45 });
    this._makeStar(scene);
    await g.loadingStep(0.6, '夜番の住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await g.loadingStep(0.75, '展示の灯りを調えています…');
    this._optimize();
    g.ui.onLine = who => this.residents[who]?.talk(2.1);
  }

  _placeCreatures(scene) {
    this.residents = {
      owl: makeCuratorOwl(), fox: makeRestorerFox(), otter: makeArchivistOtter(),
      tortoise: makeGardenerTortoise(), momonga: makeOpticianMomonga(), frog: makeFrog(),
    };
    const places = { owl: [0, 0.12, 8, 1.8], fox: [-17, 0.12, 10, 1.7], otter: [-16, 0.12, -3, 1.8], tortoise: [17, 0.12, 10, 1.9], momonga: [16, 0.12, -3, 2.0], frog: [-22, 0.75, -13, 1.4] };
    for (const [id, c] of Object.entries(this.residents)) {
      const [x, y, z, s] = places[id];
      c.root.position.set(x, y, z); c.root.scale.setScalar(s);
      c.root.userData.dynamic = true;
      scene.add(c.root);
    }
    this.creatures = Object.values(this.residents);
  }

  _makeStar(scene) {
    const star = (this.star = group(scene, 0, 4.8, -6));
    star.userData.dynamic = true;
    this.starMat = glow('#ffe8a3', 2.4, { roughness: 0.35 });
    add(star, G.oct(0.4), this.starMat, 0, 0, 0, { scale: [0.75, 1.5, 0.75], cast: false });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softCircleTexture(), color: '#ffda87', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(2.8); halo.userData.noPick = true; star.add(halo);
    star.traverse(o => { o.userData.noPick = true; });
    const n = 36;
    this.trailPositions = new Float32Array(n * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trail = new THREE.Points(geometry, new THREE.PointsMaterial({ map: softCircleTexture(), color: '#ffdb88', size: 0.32, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.trail.frustumCulled = false; this.trail.visible = false; this.trail.userData.noPick = true;
    scene.add(this.trail);
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, object, name, onClick) => g.addInteractable(id, object, { name, onClick });
    for (const id of Object.keys(this.residents)) reg(id, this.residents[id].root, SPEAKERS[id].name, () => id === 'owl' ? this.talkCurator() : id === 'frog' ? this.talkFrog() : this.talkKeeper(id));
    for (const [id, room] of Object.entries(ROOMS)) {
      reg(id, R[room.object], room.name, () => this.openExhibit(id));
      reg(`${id}Clue`, R[room.board], `${room.name}の案内`, () => this.readClue(id));
    }
    reg('orrery', R.orrery, '星を帰す天球儀', () => this.openOrrery());
    reg('entry', R.entry, '夜間開館の受付', () => this.talkCurator());
    reg('museumMap', R.mapBoard, '博物館の案内図', () => this.showGuide());
    reg('museumStation', R.station, '星あかり博物館駅', () => this.talkFrog());
    reg('loco', this.train.loco.g, 'ほしまわり号', () => this.talkFrog());
    if (R.pond) reg('pond', R.pond, '月うつしの池', () => this.inspectPond());
    if (R.bench) reg('bench', R.bench, '星待ちのベンチ', () => this.say(['木のベンチに、まだ少しだけぬくもりが残っている。', 'あせらず、空を見上げていこう。夜の博物館に、閉館の鐘はない。']));
    if (R.telescope) reg('telescope', R.telescope, '庭の望遠鏡', () => this.lookTelescope());
  }

  _optimize() {
    const roots = new Set([this.island, this.tracks, this.R.root, ...this.smallIslands.map(s => s.o)]);
    const creatures = new Set(this.creatures.map(c => c.root));
    for (const it of this.g.interactables.values()) if (!creatures.has(it.object)) roots.add(it.object);
    this.R.root.traverse(o => { if (o.userData.dynamic) roots.add(o); });
    let count = 0;
    if (!new URLSearchParams(location.search).has('nomerge')) for (const root of roots) count += mergeStatic(root);
    this.g.refreshInteractableMeshes();
    console.info(`[optimize] merged ${count} meshes`);
  }

  get seals() { return Object.keys(ROOMS).filter(id => this.g.flags[ROOMS[id].flag]); }

  applyState() {
    const f = this.g.flags, R = this.R;
    // 以前に読んだメモも、新しい温室のルールと食い違わないように更新する。
    const gardenNote = this.g.state.notes?.find(note => note.id === 'mu-clue-garden');
    if (gardenNote && gardenNote.html !== gardenClueHTML()) {
      gardenNote.html = gardenClueHTML();
      this.g.save();
    }
    R.fossilRestored.visible = !!f.muFossilDone;
    R.archiveLamp.visible = !!f.muArchiveDone;
    R.gardenBloom.visible = !!f.muGardenDone;
    R.gardenDewBloom.visible = !!f.muGardenDone;
    R.lightBeam.visible = !!f.muPrismDone;
    R.starCanopy.visible = !!f.muOrreryDone;
    const flags = ['muFossilDone', 'muArchiveDone', 'muGardenDone', 'muPrismDone'];
    R.lampMats.forEach((m, i) => { m.emissiveIntensity = f[flags[i]] ? 1.6 : 0.22; });
    this.star.visible = !f.finaleDone;
    if (!this.flying) this.star.position.set(0, 4.8, -6);
    this.g.setGrade(mixGrade(GRADES.museum, GRADES.museumOpen, (this.seals.length + (f.muOrreryDone ? 1 : 0)) / 5));
    this.g.refreshInventory(); this.g.refreshQuests();
  }

  update(dt, t) {
    for (const c of this.creatures) { c.camPos = this.g.camera.position; c.update(dt, t); }
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.002;
    this.motes.update(dt, t); this.smoke.update(dt);
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.23 + s.phase) * 0.65;
    this.R.orreryRotor.rotation.y += dt * (this.g.flags.muOrreryDone ? 0.16 : 0.025);
    this.star.rotation.y = t * 0.6;
    this.starMat.emissiveIntensity = 1.8 + Math.sin(t * 2) * 0.35;
    if (!this.flying) this.star.position.y = 4.8 + Math.sin(t * 1.1) * 0.2;
    if (this.trail.visible) {
      this.trailPositions.copyWithin(3, 0, this.trailPositions.length - 3);
      this.star.position.toArray(this.trailPositions, 0);
      this.trail.geometry.attributes.position.needsUpdate = true;
    }
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.6;
      const chimney = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      this.smoke.emit(chimney, { vel: new V(-0.1, 0.6, 0), spread: 0.1, life: 2.0, size0: 0.15, size1: 0.6 });
    }
  }

  quests() {
    const f = this.g.flags;
    return [
      { text: '🦉 館長に、夜間開館の話を聞く', done: !!f.curatorMet },
      ...Object.entries(ROOMS).map(([id, room]) => ({ text: `${ROOM_ICONS[id]} ${room.name}の印を集める`, done: !!f[room.flag] })),
      { text: '🌌 天球儀で、星の帰り道をつなぐ', done: !!f.muOrreryDone },
      ...(f.muOrreryDone ? [{ text: '✨ 館長といっしょに、迷い星を見送る', done: !!f.finaleDone }] : []),
    ];
  }

  hint() {
    const f = this.g.flags, H = (key, ...lines) => ({ key, lines });
    if (!f.curatorMet) return H('mu-intro', '中央の入口にいる、フクロウの館長に話しかけよう。');
    if (f.finaleDone) return H('mu-clear', '星は無事に帰った。館長からクリア画面へ進める。メニューの「追加の旅」から、好きな旅を選び直せる。');
    if (f.muOrreryDone) return H('mu-send', '天球儀に帰り道が映った。中央のフクロウの館長と、星を見送ろう。');
    const id = f.muActiveRoom && ROOMS[f.muActiveRoom] && !f[ROOMS[f.muActiveRoom].flag] ? f.muActiveRoom : Object.keys(ROOMS).find(k => !f[ROOMS[k].flag]);
    if (id === 'fossil') return H('mu-fossil', '左手前の化石展示。地層の案内は、下が古く、上が新しい。', '魚は貝と葉のあいだ。羽は葉のすぐ次。足跡は、いちばん新しい。', '古い順に「貝 → 魚 → 葉 → 羽 → 足跡」。下から並べて、確かめよう。');
    if (id === 'archive') return H('mu-archive', '左奥の書庫。台車は階段を通れない。貝・羽・葉、3つの棚に本を返そう。', 'まず北側の2つの棚、それから南東の棚へ。外周を回ると、階段を使わずに進める。', '受付 → 西通路 → 貝の棚 → 丸窓 → 羽の棚 → 東通路 → 葉の棚 → 搬出口。');
    if (id === 'garden') return H('mu-garden', '右手前の庭。6Lの雨水を、露の花に2L、月の花に4L。花へは、じょうろから一度ずつ注ごう。', '先に小さな花を考えよう。じょうろを満たしてバケツへ移すと、どちらに何L残るかな？ タンクに残る量も数えてみよう。', '5L汲んで3Lをバケツへ。じょうろの2Lを露の花へ届けよう。バケツの3Lをじょうろに戻し、タンクに残った1Lを足すと、月の花の4Lになる。');
    if (id === 'prism') return H('mu-prism', '右奥の光の回廊。鏡を回し、5枚全部を通って、出口へ光を届けよう。', '光は最初、中央から上へ。上の列を右へ進み、右端から下、下の列を左へと回る。', '光が通る順の鏡は「／、／、＼、／、＼」。最後は左から2列めを上がって出口へ。');
    return H('mu-orrery', '4つの印がそろった。中央奥の天球儀を調べよう。', '目盛は北から時計回りに0〜7。印に書かれた出発の方位から、指定の向きへ数えよう。', '貝は西（6）、羽は北東（1）、葉は北（0）、星は南東（3）に合わせよう。');
  }

  revealHotspots() { this.g.ui.toast('✨ 展示・住人・案内板を調べてみよう。', 1800); }
  say(lines) { return this.g.say(lines); }

  view(object, { height = 1.4, dist = 14, polar = 1.03, theta = 0 } = {}) {
    const target = object.getWorldPosition(new V()).add(new V(0, height, 0));
    return this.g.focusOn(target, { dist, polar, theta, keepAngle: true, subject: object, duration: 0.85 });
  }

  async talkCurator() {
    const g = this.g, f = g.flags;
    await this.view(this.residents.owl.root, { height: 1.5, dist: 15, polar: 1.14, theta: -0.18 });
    if (f.finaleDone) {
      await this.say([{ who: 'owl', text: '星の帰る場所が、またひとつ増えました。あなたの席も、いつでも空けておきますよ。' }]);
      return this.showClear();
    }
    if (f.muOrreryDone) return this.finale();
    if (!f.curatorMet) {
      g.flag('curatorMet');
      g.give('museumGuide');
      g.note('mu-welcome', '星あかりの博物館の夜間開館', '迷い星を夜空へ帰すため、<b>化石・書庫・庭園・光の回廊</b>の4つの印を集める。<br>展示は好きな順番で回れる。印がそろったら、中央奥の<b>天球儀</b>へ。');
      return this.say([
        { who: 'owl', text: '星あかりの博物館へ、ようこそ。夜の来館者は、ひさしぶりです。' },
        { who: 'owl', text: '今夜は「星の渡り」。あの天球儀に、空から迷いこんだ小さな星がいるのです。' },
        { who: 'owl', text: '帰り道を映すには、4つの展示の【印】が必要です。化石、書庫、庭園、それから光の回廊。どこから巡ってもかまいません。' },
        { who: 'owl', text: 'これは【夜の観覧手帳】。集めた印と、展示の案内を読み返せます。急がず、気になるものからどうぞ。' },
      ]);
    }
    return this.say([{ who: 'owl', text: this.seals.length === 4 ? '4つの印がそろいましたね。中央奥の天球儀へどうぞ。印は手帳でも読み返せます。' : `集まった印は、いま${this.seals.length}つ。展示のそばの案内板も、お見逃しなく。手帳に書きとめておきましょう。` }]);
  }

  async talkKeeper(who) {
    const id = Object.keys(ROOMS).find(k => ROOMS[k].who === who), room = ROOMS[id];
    await this.view(this.residents[who].root, { height: who === 'tortoise' ? 1 : 1.45, dist: 14, polar: 1.13, theta: who === 'fox' ? -0.15 : 0.1 });
    const lines = {
      fox: ['この骨、こわくないよ。ずっと昔、海を眺めていた生き物なんだ。', '標本の札が入れかわってしまってね。地層の記録を頼りに、古い順に並べてほしい。'],
      otter: ['夜の書庫へようこそ。本は眠っていないよ。読んでもらう順番を待っているんだ。', '貝・羽・葉の棚へ、返却本を届けたい。台車で階段は通れないから、通路の地図をよく見てね。'],
      tortoise: ['露の花には2L、月の花には4L。タンクの雨水6Lを、ふたつの花に分けてほしいんじゃ。', 'じょうろは5L、バケツは3L。タンクが空ならそれ以上は汲めん。花へはじょうろから、一度ずつ注ぐんじゃ。'],
      momonga: ['光ってね、曲がり角でも迷わないんだ。鏡が道を教えてあげれば。', '5枚の鏡を全部通して、星形の出口まで光をつないで。鏡は押すたびに向きが変わるよ。'],
    };
    const thanks = {
      fox: '札が正しく並ぶと、骨にも物語が戻るんだね。ほら、しっぽの先まで、きれいに直ったよ。',
      otter: 'ありがとう。3つの棚に、本が戻ったよ。丸窓の席は、いつでもどうぞ。',
      tortoise: '咲いた花を見てごらん。花びらの中にも、小さな夜空があるじゃろう。',
      momonga: 'つながった光は、星への道しるべ。君も、なかなかの光技師だね！',
    };
    if (this.g.flags[room.flag]) return this.say([{ who, text: thanks[who] }]);
    await this.say(lines[who].map(text => ({ who, text })));
    this.recordClue(id);
    return this.showClue(id);
  }

  recordClue(id) {
    const room = ROOMS[id];
    this.g.flag(`muClue_${id}`);
    this.g.note(`mu-clue-${id}`, `${room.name}の案内`, room.clue());
  }

  showClue(id) {
    const room = ROOMS[id];
    this.g.ui.openPanel({ title: `${room.name}の案内`, body: el('div', 'museum-note', room.clue()), cls: 'museum-panel' });
  }

  async readClue(id) {
    await this.view(this.R[ROOMS[id].board], { height: 1.2, dist: 12, polar: 1.1 });
    this.recordClue(id);
    this.showClue(id);
  }

  async openExhibit(id) {
    const g = this.g, room = ROOMS[id];
    g.flag('muActiveRoom', id);
    await this.view(this.R[room.object], { height: room.height, dist: room.dist, polar: 0.9, theta: id === 'fossil' ? -0.25 : 0.1 });
    if (g.flags[room.flag]) return this.say([`「${room.name}」の展示は、もう動いている。`, `手帳の${SEALS[id].name}には「${SEALS[id].clue}」とある。`]);
    return room.panel(g.ui, g.audio, {
      draft: g.flags.muDrafts?.[id],
      onChange: draft => { g.flag('muDrafts', { ...g.flags.muDrafts, [id]: draft }); },
      onSolved: panel => this._solve(panel, () => this.finishExhibit(id)),
    });
  }

  _solve(panel, action) {
    if (this.solving) return;
    this.solving = true; this.g.busy = true; panel.close();
    Promise.resolve().then(action).catch(e => { console.error(e); this.g.ui.toast('もう一度、展示を調べてみよう。'); }).finally(() => { this.solving = false; this.g.busy = false; this.g.save(); });
  }

  async finishExhibit(id) {
    const g = this.g, room = ROOMS[id], seal = SEALS[id];
    if (g.flags[room.flag]) return;
    g.flag(room.flag);
    this.applyState();
    g.note(`mu-seal-${id}`, `${ROOM_ICONS[id]} ${seal.name}`, `<b>${seal.clue}</b><br>天球儀の、同じ印の環に刻まれている。`);
    this.residents[room.who].hop();
    await this.view(this.R[room.object], { height: room.height, dist: room.dist, polar: 0.9 });
    g.audio.play('chime');
    const text = {
      fossil: '地層の札がそろうと、キツネが最後の骨をそっとつないだ。琥珀の灯りに、長い尾が浮かびあがる。',
      archive: 'ことこと……。返却本が棚に収まり、丸窓の読書灯がひとつずつともった。',
      garden: '2Lと4Lの雨水が、ふたつの根にしみこんだ。露の花と月の花が静かにひらき、花びらの内側に星のような光がまたたく。',
      prism: '鏡から鏡へ、細い光が渡っていく。最後の出口に届いた瞬間、回廊が淡い金色に輝いた。',
    };
    await this.say([text[id], `【${seal.name}】を手帳に写した。そこには「${seal.clue}」と刻まれている。`]);
    if (this.seals.length === 4) {
      g.audio.play('quest');
      await this.say([{ who: 'owl', text: '4つの展示が、夜を思い出しました。中央奥の天球儀へどうぞ。星も、待っていますよ。' }]);
    }
  }

  async openOrrery() {
    const g = this.g;
    await this.view(this.R.orrery, { height: 3.1, dist: 23, polar: 0.95 });
    if (g.flags.finaleDone) return this.say(['天球儀は、ゆっくり回りつづけている。', '星のいた場所には、小さな空の窓。次の迷い星が来ても、もう大丈夫。']);
    if (g.flags.muOrreryDone) return this.say(['4つの環が、星の帰り道を映している。', 'フクロウの館長といっしょに、星を見送ろう。']);
    if (this.seals.length < 4) return this.say(['天球儀の中央で、小さな星がためらうように揺れている。', `4つの環には、貝・羽・葉・星の印。集まったのは${this.seals.length}つ。展示を巡れば、帰り道がわかりそうだ。`]);
    return orreryPanel(g.ui, g.audio, {
      seals: this.seals, draft: g.flags.muDrafts?.orrery,
      onChange: draft => g.flag('muDrafts', { ...g.flags.muDrafts, orrery: draft }),
      onSolved: panel => this._solve(panel, async () => {
        g.flag('muOrreryDone'); this.applyState();
        g.audio.play('chime');
        await this.say(['かちり。4つの環が重なり、ドームいっぱいに星の帰り道が浮かびあがった。', { who: 'owl', text: 'よく見つけてくださいました。さあ、いっしょに、あの子を見送りましょう。' }]);
      }),
    });
  }

  showGuide() {
    const body = el('div', 'museum-guide');
    body.innerHTML = `<p class="panel-note">4つの展示を、好きな順番で。<br>印を集めたら、中央奥の天球儀へ。</p><div class="museum-guide-map" aria-label="展示の位置"><span>左奥：書庫</span><span>中央奥：天球儀</span><span>右奥：光の回廊</span><span>左手前：化石</span><span>中央：受付</span><span>右手前：庭園</span></div>`;
    for (const [id, room] of Object.entries(ROOMS)) {
      const done = this.g.flags[room.flag], seal = SEALS[id];
      const row = el('div', `museum-guide-entry ${done ? 'stamped' : ''}`);
      row.innerHTML = `<b>${done ? seal.icon : '○'} ${room.name}</b><p>${done ? `${seal.name}：${seal.clue}` : 'まだ印がない'}</p>`;
      if (this.g.flags[`muClue_${id}`]) {
        const details = el('details');
        details.appendChild(el('summary', '', '展示の案内を読む'));
        details.appendChild(el('div', 'museum-note', room.clue())); row.appendChild(details);
      }
      body.appendChild(row);
    }
    this.g.ui.openPanel({ title: '夜の観覧手帳', body, cls: 'museum-panel' });
  }

  async inspectPond() {
    await this.view(this.R.pond, { height: 0.4, dist: 18, polar: 0.65 });
    return this.say(['水面に映る月は、風が吹くと、細い銀の糸になってほどける。', this.g.flags.finaleDone ? '今夜は、星の光もひとつ多い。' : '小さな魚が、月の輪をくぐっていった。']);
  }

  async lookTelescope() {
    await this.view(this.R.telescope, { height: 1.5, dist: 13, polar: 1.05, theta: -0.25 });
    const body = el('div', 'museum-scope');
    body.innerHTML = '<p class="panel-note">のぞく向きを変えると、違う星の形が見える。</p><div class="museum-scope-view"></div><div class="museum-scope-tabs" role="group" aria-label="のぞく空を選ぶ"></div><p class="museum-scope-caption" aria-live="polite"></p>';
    const views = [
      { name: '北の空', title: '汽笛の星座', points: [[87, 177], [87, 144], [136, 144], [136, 111], [157, 111], [157, 144], [192, 144], [192, 177], [237, 177], [237, 141], [288, 141], [288, 177]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [0, 7], [8, 11]], caption: 'カエル「遠い空でも、汽笛が聞こえそうケロ。」' },
      { name: '東の空', title: '花びらの星座', points: [[180, 152], [160, 106], [180, 77], [204, 106], [226, 130], [245, 158], [216, 178], [184, 194], [160, 224], [137, 190], [113, 166], [137, 141]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 0], [0, 7], [7, 8], [8, 9], [9, 0], [0, 10], [10, 11], [11, 0]], caption: '水をあげなくても、この花は、ずっと咲いている。' },
      { name: '西の空', title: '泳ぐ星座', points: [[103, 159], [139, 121], [204, 114], [251, 141], [278, 114], [274, 183], [248, 166], [210, 193], [143, 188], [103, 159], [198, 152]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]], caption: '星の海には、波の音のかわりに、静かな光がある。' },
    ];
    const random = rng(2026);
    const stars = Array.from({ length: 100 }, () => {
      const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 146;
      return `<circle cx="${180 + Math.cos(a) * r}" cy="${155 + Math.sin(a) * r}" r="${0.5 + random()}" opacity="${0.25 + random() * 0.6}"/>`;
    }).join('');
    const buttons = [];
    const paint = i => {
      const v = views[i];
      body.querySelector('.museum-scope-view').innerHTML = `<svg viewBox="0 0 360 320" role="img" aria-label="${v.title}"><circle cx="180" cy="155" r="151" fill="#0b243c" stroke="#b9975c" stroke-width="6"/><circle cx="180" cy="155" r="143" fill="none" stroke="#415b6a"/><g fill="#e6e9d4">${stars}</g><g stroke="#e4c78b" stroke-width="1.1" opacity=".55">${v.edges.map(([a, b]) => `<path d="M${v.points[a]}L${v.points[b]}"/>`).join('')}</g><g fill="#fff0c4">${v.points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.9"/>`).join('')}</g></svg>`;
      body.querySelector('.museum-scope-caption').textContent = `${v.title} ─ ${v.caption}`;
      buttons.forEach((b, k) => { b.classList.toggle('primary', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    };
    views.forEach((v, i) => {
      const b = el('button', 'btn', v.name); buttons.push(b);
      b.onclick = () => { this.g.audio.play('select'); paint(i); };
      body.querySelector('.museum-scope-tabs').appendChild(b);
    });
    paint(0);
    this.g.ui.openPanel({ title: '望遠鏡の向こう', body, cls: 'museum-panel' });
  }

  async talkFrog() {
    await this.view(this.residents.frog.root, { height: 1.3, dist: 14, polar: 1.1, theta: 0.2 });
    return this.say([{ who: 'frog', text: this.g.flags.finaleDone ? '星もおうちに帰れたケロ。ぼくらも、次の気になる旅を選ぶケロ！' : '終点の、その先に寄り道ケロ。時刻表はないから、好きなだけ見てきていいケロ！' }]);
  }

  inspectItem(id) {
    if (id === 'museumGuide') { this.showGuide(); return true; }
    return false;
  }

  async useItem(id) {
    if (id === 'museumGuide') return this.showGuide();
    return this.say(['この展示には、使わなさそうだ。']);
  }

  async opening() {
    const g = this.g;
    g.cinematic = true;
    this.train.s = this.stopS - 18;
    this.train.place();
    await g.ui.fade(0, 0.8);
    await g.moveCamera(new V(-36, 14, 9), new V(-22, 1, -13), 1.2);
    let travelled = 0;
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: k => {
      const distance = k * 18;
      this.train.advance(distance - travelled); travelled = distance;
    } });
    g.audio.play('steam');
    await g.ui.banner('星あかりの博物館', 'EXTRA JOURNEY　夜間開館', 2100);
    await this.say(['終点から、もう一度だけ小さな旅へ。ほしまわり号は、星の光る博物館のホームにすべりこんだ。', { who: 'frog', text: '夜でも開いてるケロ！ ……あのドームの中で、何かが光ってるケロ。' }]);
    g.flag('introDone');
    g.cinematic = false;
    await this.talkCurator();
    await g.moveCamera(...this.homeView(innerWidth < innerHeight), 1.0);
  }

  async finale() {
    const g = this.g;
    if (!g.flags.muOrreryDone || this.departing) return;
    this.departing = true; g.cinematic = true;
    await this.say([{ who: 'owl', text: '展示の向こうには、どれも本物の世界があります。昔の海も、本の中の森も……この子の、帰る空も。' }]);
    await g.moveCamera(new V(12, 17, 29), new V(0, 6, -5), 1.4);
    this.flying = true;
    for (let i = 0; i < this.trailPositions.length; i += 3) this.star.position.toArray(this.trailPositions, i);
    this.trail.visible = true;
    const curve = new THREE.CatmullRomCurve3([this.star.position.clone(), new V(0, 12, -6), new V(13, 15, 4), new V(2, 20, 11), new V(-9, 26, -5), new V(-4, 37, -30)]);
    [659, 784, 988, 1175, 1568].forEach((freq, i) => g.audio.tone(freq, { dur: 1.6, gain: 0.045, when: i * 0.4, type: 'triangle', attack: 0.05 }));
    await g.tweens.add({ duration: 5, ease: Ease.inOut, onUpdate: k => { curve.getPointAt(k, this.star.position); } });
    this.star.visible = false;
    await g.wait(0.7);
    this.trail.visible = false;
    await this.say(['小さな星は、ひとつだけ、こちらを振り返るようにまたたいた。', { who: 'owl', text: '帰りましたね。……さあ、お茶にしましょう。夜は、まだたっぷりあります。' }, { who: 'frog', text: '寄り道、大せいかいだったケロ。次はどの景色を見に行こうケロ？' }]);
    g.flag('finaleDone');
    this.applyState();
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'museum'])];
    g.save();
    await g.moveCamera(...this.homeView(innerWidth < innerHeight), 1.2);
    g.cinematic = false; this.departing = false;
    await g.ui.fade(1, 0.8, '#edf5e9');
    this.showClear();
  }

  showClear() { showStageClear(this.g, 'museum', '迷い星は夜空へ。博物館には、あたらしい灯りが残った。'); }
}
