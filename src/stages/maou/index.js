import * as THREE from 'three';
import { Motes } from '../../lib/livefx.js';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs, Birds } from '../../lib/environment.js';
import { makeBackdrop } from '../../lib/backdrop.js';
import { GRADES, mixGrade } from '../../core/postfx.js';
import { lerp, softCircleTexture } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { Ease } from '../../core/tween.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildPortRails } from '../port/diorama.js';
import { buildMaouDiorama, TRACK_Z, HILL, ISLAND, GATE_X } from './diorama.js';
import { makeHero, makeDragon, makePixelFrog, makeSlime } from '../../lib/sprites-hero.js';
import { maouSheet, skeletonSheet, makeMaou, makeSkeleton, makeBat, makeWitchCat, makeMimic, makeGhost, mimicSheet } from '../../lib/sprites-maou.js';
import { passwordPanel, stewPanel, quizPanel, steleHTML, picturebookHTML, RECIPE_CLUES, RECIPE_RULE, stewRecipeHTML } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  maou: { name: 'ドラゴンの魔王', icon: '👑', color: '#5a2a8a', voice: 150 },
  bat: { name: 'コウモリの執事', icon: '🦇', color: '#3a2a4a', voice: 700 },
  skeleton: { name: '骸骨の門番', icon: '💀', color: '#6a6a7a', voice: 520 },
  witch: { name: '魔女ネコの料理番', icon: '🐈‍⬛', color: '#5a3a8a', voice: 820 },
  mimic: { name: 'ミミック', icon: '📦', color: '#9a5a2a', voice: 300 },
  ghost: { name: 'ちびゴースト', icon: '👻', color: '#8a8ab8', voice: 1100 },
  hero: { name: 'ハリネズミの勇者', icon: '🦔', color: '#3a6ad0', voice: 620 },
  dragon: { name: '子ドラゴン', icon: '🐉', color: '#d8502a', voice: 520 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

function makeMaouPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-110, 32, 44), new V(-74, 24, 24), new V(-42, RAIL_Y, TRACK_Z), new V(-24, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-24, RAIL_Y, TRACK_Z), new V(25, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(25, RAIL_Y, TRACK_Z), new V(42, RAIL_Y, TRACK_Z), new V(58, 10, -20), new V(74, 18, -40)));
  p.add(new THREE.CubicBezierCurve3(new V(74, 18, -40), new V(90, 24, -56), new V(106, 28, -72), new V(124, 30, -92)));
  p.arcLengthDivisions = 900;
  return p;
}

// ゴーストのかくれ場所（dark: ランタンを消したときだけ見える）
const GHOSTS = {
  fountain: { pos: new V(2.5, 1.9, 6.2), dark: false, name: '噴水', color: '#e8f0ff' },
  kitchen: { pos: new V(-5.4, 1.9, 13.3), dark: false, name: '台所の大鍋', color: '#f0e8ff' },
  library: { pos: new V(-3.3, 3.2, 5.6), dark: false, name: '図書室の本棚', color: '#e0f8f0' },
  candle: { pos: new V(8.0, 2.25, 10.0), dark: true, name: '消えた燭台', color: '#d8e0ff' },
};
const PARTY = { fountain: new V(-3.2, HILL + 2.4, -8.4), kitchen: new V(-1.2, HILL + 2.7, -8.2), library: new V(1.2, HILL + 2.7, -8.2), candle: new V(3.2, HILL + 2.4, -8.4) };
const INNER = ['fountain', 'gallery', 'library', 'kitchen', 'blackboard', 'dungeon', 'treasury', 'mimic', 'witch', 'tomato', 'darkBrazier', 'terrace', 'maou', 'stairs', 'ghost_fountain', 'ghost_kitchen', 'ghost_library', 'ghost_candle'];

/**
 * ステージ：魔王城（HD-2D 風）
 * 目的：さみしい魔王のために夕食会をひらく（シチュー・絵本・ゴーストの飾りつけ）
 * 仕掛け：紫の炎のランタン（灯すと見える物・消すと見える物がある）
 */
export class MaouStage {
  constructor(game) {
    this.g = game;
    this.id = 'maou';
    this.title = '魔王城';
    this.questTitle = '👑 魔王の夕食会';
    this.hasRoof = false;
    this.roofLifted = false;
    this.lanternK = 0;
    this.departing = false;
    this.trainSpeed = 0;
  }

  homeView(portrait) {
    return portrait ? [new V(14, 56, 44), new V(0, 0.5, 0)] : [new V(18, 31, 47), new V(0, 0.5, -0.5)];
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('maou');
    document.body.classList.add('rpg');
    g.bounds = { minX: -21, maxX: 21, minZ: -15, maxZ: 15 };
    g.controls.maxDistance = 90;

    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#2a1a5a'); u.dMid.value.set('#8a3a6a'); u.dBot.value.set('#e8784a');
    u.nTop.value.set('#0a0620'); u.nMid.value.set('#2a1440'); u.nBot.value.set('#5a2a4a');
    u.night.value = 0.45;
    u.sunDir.value.set(0.7, 0.04, -0.7).normalize();
    u.moonDir.value.set(-0.5, 0.5, -0.7).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#4a2a5a', 70, 240);
    this.hemi = new THREE.HemisphereLight('#d0b8f0', '#5a3a4a', 1.35);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffc8a0', 2.4));
    sun.position.set(18, 26, 14);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 24; sc.bottom = -24; sc.near = 5; sc.far = 100;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);
    g.renderer.toneMappingExposure = 1.18;

    this.island = makeIslandBase({ w: ISLAND.w, d: ISLAND.d, seed: 61, grass: '#4a4a3a' });
    scene.add(this.island);
    this.clouds = makeClouds(63);
    this.clouds.scale.setScalar(1.35);
    this.clouds.userData.mat.color.set('#6a4a8a');
    this.clouds.userData.mat.emissive.set('#3a1a4a');
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('maou');
    scene.add(this.backdrop.group);
    this.smallIslands = [[-78, 6, -44, 5, 61], [70, -2, 34, 4, 62], [-92, 12, 24, 6, 63]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    this.path = makeMaouPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 19;
    this.tracks = buildPortRails(scene, this.path, -22.3, 22.3, [[16.9, 19.95]]);
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();
    this.train.loco.firebox.material.emissiveIntensity = 2.2;
    this.train.loco.headlight.material.emissiveIntensity = 3;

    await this.g.loadingStep(0.3, '魔王城を組み立てています…');
    try { await Promise.race([document.fonts.load('12px "DotGothic16"'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* なくても描ける */ }
    this.R = buildMaouDiorama(scene);
    // ランタンの光（見ている場所を照らす）
    this.lanternLight = new THREE.PointLight('#c890ff', 0, 16, 1.2);
    scene.add(this.lanternLight);

    this.smoke = new Puffs(scene, { count: 70, color: '#d8d0e8', opacity: 0.7 });
    this.birds = new Birds(scene, 5, 67);
    this.sparkles = this._makeSparkles(scene);
    this.embers = new Motes(scene, { count: 60, color: '#ff9a4a', size: 0.12, area: { x: 6, z: 32, y0: 0.2, y1: 6 }, center: [18.4, 0], kind: 'firefly', opacity: 0.9 });
    this.wisps = new Motes(scene, { count: 50, color: '#c8a0ff', size: 0.14, area: { x: 34, z: 26, y0: 0.4, y1: 4 }, center: [0, 3], kind: 'firefly', opacity: 0.6 });

    await this.g.loadingStep(0.6, '住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();
    this._applyLantern(0);

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
    this.g.scene.traverse((o) => { if (o.userData.dynamic) roots.push(o); });
    let n = 0;
    for (const r of roots) n += mergeStatic(r);
    this.g.refreshInteractableMeshes();
    console.info(`[optimize] merged ${n} meshes`);
  }

  _makeSparkles(scene) {
    const tex = softCircleTexture();
    const list = [];
    for (let i = 0; i < 50; i++) {
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
    this.maou = makeMaou({ back: true });
    this.maou.root.position.set(0, HILL + 0.3, -10.5);
    this.maou.noFace = true;
    this.bat = makeBat();
    this.skeleton = makeSkeleton({});
    this.skeleton.root.position.set(-10.3, 0, 3.0);
    this.witch = makeWitchCat();
    this.witch.root.position.set(-3.9, 0.2, 13.2);
    this.mimic = makeMimic({});
    this.mimic.root.position.set(11.0, 0.25, 12.9);
    this.hero = makeHero({ sword: true });
    this.dragon = makeDragon({ happy: true });
    this.frog = makePixelFrog();
    this.frog.root.position.set(-8.6, 0.75, -3.4);
    this.ghosts = {};
    for (const [k, d] of Object.entries(GHOSTS)) {
      const c = makeGhost({ color: d.color });
      c.root.position.copy(d.pos);
      c.home = d.pos.clone();
      this.ghosts[k] = c;
    }
    this.minis = [[-1.5, 9.5], [7.5, 9.8], [14.0, 7.0]].map(([x, z]) => {
      const c = makeSlime({ color: '#a86ae8', dark: '#7a3ac0', light: '#f0d8ff', w: 16, h: 14 });
      c.root.position.set(x, 0, z);
      c.wander = { x, z, ph: Math.random() * 9 };
      c.bobSpeed = 2.4;
      return c;
    });
    this.creatures = [this.maou, this.bat, this.skeleton, this.witch, this.mimic, this.hero, this.dragon, this.frog, ...Object.values(this.ghosts), ...this.minis];
    for (const c of this.creatures) scene.add(c.root);
  }

  speakerCreature(who) {
    if (who === 'ghost') return this.lastGhost || null;
    return { maou: this.maou, bat: this.bat, skeleton: this.skeleton, witch: this.witch, mimic: this.mimic, hero: this.hero, dragon: this.dragon, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: () => (INNER.includes(id) && !g.flags.gateOpen ? this.gateClosed() : fn()) });
    reg('maou', this.maou.root, 'ドラゴンの魔王', () => this.talkMaou());
    reg('bat', this.bat.root, 'コウモリの執事', () => this.talkBat());
    reg('skeleton', this.skeleton.root, '骸骨の門番', () => this.talkSkeleton());
    reg('witch', this.witch.root, '魔女ネコの料理番', () => this.talkWitch());
    reg('mimic', this.mimic.root, 'ミミック', () => this.talkMimic());
    reg('hero', this.hero.root, 'ハリネズミの勇者', () => this.talkHero());
    reg('dragon', this.dragon.root, '子ドラゴン', () => this.talkDragon());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    for (const k of Object.keys(GHOSTS)) reg(`ghost_${k}`, this.ghosts[k].root, 'ちびゴースト', () => this.findGhost(k));
    this.minis.forEach((c, i) => reg(`mini${i}`, c.root, 'むらさきスライム', () => { g.audio.play('puyo'); return this.say([['ぷるる。魔王さま、きょうもごはん食べてないんだって。', 'ぷるん。ぼく、こわくないよ。', 'ぷにぷに。夕やけの城って、きれいでしょ。'][i]]); }));
    reg('gate', R.gate, '城門', () => this.talkSkeleton());
    reg('stele', R.stele, '魔界文字の石碑', () => this.clickStele());
    reg('fountain', R.fountain, 'こわれた噴水', () => this.say(['こわれた噴水。水はかれ、むらさきの苔がはえている。', '……むかしは、ここで小さなドラゴンたちが水あびをしていたのかもしれない。']));
    reg('gallery', R.gallery, '肖像画の回廊', () => this.clickGallery());
    reg('library', R.library, '図書室の塔', () => this.clickLibrary());
    reg('kitchen', R.kitchen, '台所', () => this.talkWitch());
    reg('blackboard', R.blackboard, '台所の黒板', () => this.clickBlackboard());
    reg('dungeon', R.dungeon, '地下牢', () => this.clickDungeon());
    reg('treasury', R.treasury, '宝物庫', () => this.talkMimic());
    reg('tomato', R.tomato, '溶岩トマト', () => this.clickTomato());
    reg('darkBrazier', R.darkBrazier, '消えた燭台', () => this.clickDarkBrazier());
    reg('terrace', R.terrace, '玉座のテラス', () => this.talkMaou());
    reg('stairs', R.stairs, 'テラスへの石段', () => this.say(['玉座のテラスへつづく石段。上から、大きなため息がきこえる。']));
    reg('drawbridge', R.drawbridge, '溶岩の谷の跳ね橋', () => this.say([this.g.flags.departed ? '跳ね橋は下りている。' : '溶岩の谷にかかる跳ね橋。上がったままで、列車は先へ進めない。']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『まおうじょう』……左は『じょうかまち』、右は『ゆげのさと』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。溶岩の光をうけて、赤くかがやいている。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。']));
  }

  // =========================================================
  // 状態
  // =========================================================
  get lit() { return !!this.g.flags.lanternOn; }

  applyState() {
    const f = this.g.flags, R = this.R;
    // 更新前に読んだメモも、黒板と同じ手がかりへそろえる（進行は変えない）。
    const recipeNote = this.g.state.notes?.find(n => n.id === 'mo-recipe' && n.stage === 'maou');
    if (recipeNote) recipeNote.html = stewRecipeHTML();
    // 門の外／中で、なかまの立ち位置が変わる
    const inside = !!f.gateOpen;
    this.bat.root.position.set(...(inside ? [1.2, 0, 2.6] : [-12.4, 0, 0.8]));
    // 駅前の石碑（-14.4, 2.6）から離し、子ドラゴンとも重ならない駅寄りの空地に立つ。
    this.hero.root.position.set(...(inside ? [-1.4, 0, 2.8] : [-15.0, 0, -1.1]));
    this.dragon.root.position.set(...(inside ? [-2.9, 0, 3.4] : [-12.0, 0, 3.6]));
    R.portcullis.position.y = inside ? 2.6 : 0;
    R.tomato.visible = !f.tomatoGot;
    R.saltJar.visible = !f.saltGot;
    for (const k of Object.keys(GHOSTS)) if (f[`ghost_${k}`]) this.ghosts[k].root.position.copy(PARTY[k]);
    R.garland.visible = !!f.ghostsDone;
    R.feast.visible = !!f.departed;
    R.drawbridge.rotation.z = f.departed ? 0 : Math.PI / 2;
    this.maou.setSheet(maouSheet({ back: !f.departed, happy: !!f.departed }));
    this.mimic.setSheet(mimicSheet({ open: !!f.bookGot }));
    this.skeleton.setSheet(skeletonSheet({ shaking: !inside }));
    this.lanternK = this.lit ? 1 : 0;
    this._applyLantern(this.lanternK);
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  /** ランタン（0=消す 1=灯す） */
  _applyLantern(k) {
    const g = this.g, R = this.R, f = g.flags;
    const on = k > 0.5;
    g.setGrade(mixGrade(GRADES.maou, GRADES.maouLantern, k));
    this.backdrop.set(k);
    this.lanternLight.intensity = 4 * k;
    R.passGlyph.visible = on;
    R.recipeGlow.visible = on;
    R.mushroom.visible = !on && !f.mushroomGot;
    for (const p of R.portraits) p.mesh.material = on ? p.ghost : p.plain;
    for (const [key, d] of Object.entries(GHOSTS)) {
      const found = !!f[`ghost_${key}`];
      this.ghosts[key].root.visible = found || (d.dark ? !on : on);
    }
    this.wisps.visible = on;
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R;
    for (const c of this.creatures) {
      c.camPos = g.camera.position;
      c.update(dt, t);
    }
    for (const c of this.minis) {
      const w = c.wander;
      c.root.position.x = w.x + Math.sin(t * 0.3 + w.ph) * 0.9;
      c.root.position.z = w.z + Math.cos(t * 0.23 + w.ph * 2) * 0.6;
    }
    // ゴーストはふわふわ
    for (const c of Object.values(this.ghosts)) c.body.position.y = Math.sin(t * 1.6 + c.phase) * 0.12;
    this.birds.update(dt, t);
    this.embers.update(dt, t);
    this.wisps.update(dt, t);
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    R.lavaTex.offset.x = (t * 0.02) % 1;
    R.lavaTex.offset.y = (t * 0.035) % 1;
    R.lavaMat.emissiveIntensity = 1.0 + Math.sin(t * 1.3) * 0.15;
    R.lavaLight.intensity = 2.6 + Math.sin(t * 2.1) * 0.4;
    for (const [i, fl] of R.flames.entries()) {
      const s = 1 + Math.sin(t * 7 + i) * 0.08 + Math.sin(t * 13 + i * 2) * 0.04;
      fl.scale.set(1, s, 1);
    }
    for (const L of R.flameLights) L.intensity = 2.0 + Math.sin(t * 6 + L.position.x) * 0.25;
    R.cookFire.scale.y = 1 + Math.sin(t * 9) * 0.15;
    // ランタンの光は、見ている場所の少し上
    this.lanternLight.position.copy(g.controls.target).add(new V(0, 3, 1.5));
    // 跳ね橋の鎖
    for (const ch of R.chains) {
      const a = new V(16.75, 3.4, TRACK_Z + ch.s * 1.25);
      const b = R.drawbridge.localToWorld(new V(2.8, 0.1, ch.s * 1.25));
      const d = b.clone().sub(a);
      ch.m.position.copy(a).addScaledVector(d, 0.5);
      ch.m.scale.set(1, d.length(), 1);
      ch.m.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize());
    }
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.6;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      if (p.x < 26) this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.4, 0), spread: 0.5, life: heavy ? 2.4 : 3.2, size0: 0.5, size1: heavy ? 3.2 : 2.4 });
    }
    this.smoke.update(dt);
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0 && this.train.s < this.stopS + 40) { this.chuffT = 0.5; g.audio.play('chuff'); }
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
    if (!f.introDone) return [{ text: '駅にいるコウモリの執事に話しかけよう', done: false }];
    if (!f.gateOpen) return [{ text: '🚪 城門を開けてもらう', done: false }];
    const all = f.stewDone && f.bookGot && f.ghostsDone;
    const q = [
      { text: '🍲 ほのおのシチューをつくる', done: !!f.stewDone },
      { text: '📖 兄弟の絵本をみつける', done: !!f.bookGot },
      { text: `👻 ゴーストを見つける（${this.ghostCount()} / 4）`, done: !!f.ghostsDone },
    ];
    if (all) q.push({ text: '👑 玉座の魔王のもとへ', done: !!f.departed });
    return q;
  }

  ghostCount() { return Object.keys(GHOSTS).filter((k) => this.g.flags[`ghost_${k}`]).length; }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    const lit = this.lit;
    const lamp = '持ち物の『紫の炎のランタン』を2回押すと、灯したり消したりできる。';
    if (!f.introDone) return H('intro', '駅のそばにいる、コウモリの執事に話しかけよう。');
    if (!f.gateOpen) {
      if (!lit) return H('gateLamp', '合言葉は門の上に書いてあるらしい。ランタンで照らしてみよう。', lamp);
      if (!f.steleSeen) return H('stele', '門の上に魔界文字が光っている。読みかたは、駅前の石碑にある。');
      return H('gate', '石碑の対応表で門の上の文字を読み、門番に合言葉を言おう。', '門の文字は「おとうと」。');
    }
    if (f.stewDone && f.bookGot && f.ghostsDone) return H('final', '持ち物の『ほのおのシチュー』と『兄弟の絵本』を持って、玉座のテラスの魔王に話しかけよう。');
    if (!f.ghostsDone) {
      const left = Object.keys(GHOSTS).filter((k) => !f[`ghost_${k}`]);
      if (!f.galleryLit) return H('gallery', 'ゴーストはランタンの光でしか見えないらしい。肖像画の回廊の絵を、ランタンで照らしてみよう。', lamp);
      if (left.length === 1 && left[0] === 'candle') return H('candle', '最後のひとりは、消えた燭台の中。……灯したランタンの光では、かえって見えない。', 'ランタンを消して、中庭の右奥の消えた燭台を見よう。');
      return H('ghosts', `肖像画のとおりの場所をさがそう（のこり：${left.map((k) => GHOSTS[k].name).join('・')}）。`, '噴水・台所の大鍋・図書室の本棚はランタンを灯して。消えた燭台は、ランタンを消して。');
    }
    if (!f.stewDone) {
      if (has('stew')) return H('stewHave', 'シチューはできている。ほかの準備をしよう。');
      if (!f.witchTalked) return H('witch', '中庭の左奥、台所の魔女ネコに話しかけよう。');
      if (!f.recipeSeen) return H('recipe', '台所の黒板のレシピは、ランタンの光でしか読めない。', lamp);
      const need = [];
      if (!f.tomatoGot) need.push('溶岩トマト（溶岩の谷のふち）');
      if (!f.mushroomGot) need.push('かげキノコ（地下牢。ランタンを消すと見える）');
      if (!f.saltGot) need.push('星くず塩（図書室の本棚の上。ゴーストがとってくれる）');
      if (need.length) return H('ingredients', `材料をあつめよう：${need.join('、')}`);
      return H('cook',
        '黒板の「赤い実」「影のかさ」「星」は、どの材料を表しているかな。',
        '「すぐ前」は、間にほかの材料を入れないということ。二つをひと組にして、残った材料の場所を考えよう。',
        '材料を全部入れたあと、使った材料の種類と同じ回数まぜよう。',
        '溶岩トマト → かげキノコ → 星くず塩。材料は3種類なので、最後に3回まぜる。');
    }
    if (!f.bookGot) {
      if (!f.mimicTalked) return H('mimic', '中庭の右奥、宝物庫のミミックに話しかけよう。');
      return H('quiz', 'ミミックのなぞなぞは、城をよく見ればわかる。', '燭台の消えた炎はひとつ、肖像画は5まい、合言葉は「おとうと」。');
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

  /** ランタンは2回押すと、灯す／消す。絵本は読める */
  inspectItem(id) {
    if (id === 'picturebook') {
      this.g.audio.play('paper');
      this.g.ui.openPanel({ title: '兄弟の絵本', body: picturebookHTML(), cls: 'wide' });
      return true;
    }
    if (id !== 'purpleLantern') return false;
    if (this.g.ui.panelOpen) return true;
    this.toggleLantern();
    return true;
  }

  toggleLantern() {
    const g = this.g;
    const to = this.lit ? 0 : 1;
    g.flag('lanternOn', !!to);
    g.audio.play(to ? 'fire' : 'whoosh');
    const from = this.lanternK;
    g.tweens.add({ duration: 0.6, onUpdate: (k) => { this.lanternK = lerp(from, to, k); this._applyLantern(this.lanternK); } });
    g.ui.toast(to ? '🔮 ランタンを灯した。紫の光で、見えなかった物が見える……' : '🌑 ランタンを消した。暗がりにひそむ物が見える……', 2600);
  }

  // =========================================================
  // 共通
  // =========================================================
  say(lines) { return this.g.say(lines); }

  focus(obj, dist, options = {}) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(7, Math.max(0.8, p.y + 0.6)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined, ...options });
  }

  questDone(text) {
    this.g.audio.play('fanfare');
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
    if (f.stewDone && f.bookGot && f.ghostsDone) {
      await this.say(['夕食会の準備がととのった！ シチューと絵本を持って、玉座の魔王のもとへ行こう。']);
      this.g.refreshQuests();
    }
  }

  gateClosed() {
    this.focus(this.R.gate, 16);
    return this.say(['城門の鉄格子がおりていて、中には入れない。', this.g.flags.introDone ? '（門番に合言葉を言えば、開けてもらえるらしい）' : '']);
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkBat() {
    const g = this.g, f = g.flags;
    if (f.gateOpen && !f.insideTalked) return this.batInside();
    await this.focusBat();
    g.audio.play('squeak');
    if (!f.introDone) return this.batIntro();
    if (!f.gateOpen) return this.say([{ who: 'bat', text: '合言葉は、門の上に魔界文字で……。ランタンで照らせば見えるはずでございます。読みかたは、駅前の石碑に。' }]);
    if (f.stewDone && f.bookGot && f.ghostsDone) return this.say([{ who: 'bat', text: '準備はととのいました。どうか、魔王さまのもとへ。' }]);
    return this.say([{ who: 'bat', text: 'シチューは台所の魔女ネコ、絵本は宝物庫のミミック、飾りつけはゴーストたち。どうか、よろしくおねがいいたします。' }]);
  }

  focusBat() {
    // 入城後は塔のある西側からでなく、中庭の正面から映す。
    return this.focus(this.bat.root, 14, { dist: this.g.flags.gateOpen ? 12 : 14,
      polar: 1.12, theta: this.g.flags.gateOpen ? -0.25 : -Math.PI / 2, keepAngle: true });
  }

  async batIntro() {
    const g = this.g;
    await this.say([
      { who: 'bat', text: 'これはこれは……ほしまわり号のお客さま。そして、勇者さまと……おお、弟ぎみ！' },
      { who: 'dragon', text: 'じいや！ 兄ちゃんは？ 兄ちゃん、元気？' },
      { who: 'bat', text: 'それが……魔王さまは、もう何日も玉座でうしろを向いたまま。お食事もなさらず、ため息ばかりで……。' },
      { who: 'hero', text: 'ぼくたち、魔王を……ううん、魔王に会いにきたんだ。' },
      { who: 'bat', text: 'ありがたい。ですが城門は、こわがりの門番が【合言葉】なしには開けませぬ。合言葉は門の上に書いてありますが、魔界文字で、しかもこの【紫の炎のランタン】で照らさねば見えぬのです。' },
      { who: 'bat', text: 'このランタンをお貸しいたします。灯すと見える物、消すと見える物……この城には、どちらもございます。' },
    ]);
    g.flag('introDone');
    g.give('purpleLantern');
    g.note('mo-goal', '執事のことば', '魔王はずっと玉座でうしろを向いたまま。<br>城門は<b>合言葉</b>がないと開かない。合言葉は門の上に<b>魔界文字</b>で書いてあり、<b>ランタン</b>で照らすと見える。<br>持ち物のランタンを2回押すと、灯す／消すを切りかえられる。');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async batInside() {
    const g = this.g;
    await this.focusBat();
    g.flag('insideTalked');
    await this.say([
      { who: 'bat', text: 'ようこそ魔王城へ。……実は、ひとつ考えがございます。' },
      { who: 'bat', text: 'むかし、魔王さまと弟ぎみは、いつもいっしょに夕ごはんを食べておられました。もう一度【夕食会】をひらけば、きっと……。' },
      { who: 'bat', text: '魔王さまの好物の【ほのおのシチュー】は台所の魔女ネコが。思い出の【兄弟の絵本】は宝物庫のミミックが持っております。' },
      { who: 'bat', text: '飾りつけは【ちびゴースト】たちの役目なのですが……あの子たち、かくれんぼをしたまま出てこないのです。ゴーストはランタンの光でしか見えませぬ。肖像画の回廊に、何か手がかりがあるかもしれません。' },
    ]);
    g.note('mo-party', '夕食会の準備', '<b>ほのおのシチュー</b>：台所の魔女ネコ<br><b>兄弟の絵本</b>：宝物庫のミミック<br><b>飾りつけ</b>：かくれんぼ中のちびゴースト4人（ランタンの光で見える）。肖像画の回廊に手がかり。');
    g.refreshQuests();
  }

  async talkSkeleton() {
    const g = this.g, f = g.flags;
    await g.focusOn(new V(GATE_X - 0.8, 1.8, 3), { dist: 15, polar: 1.15, theta: -Math.PI / 2, keepAngle: true, frameHigh: false, subject: this.skeleton.root, duration: 0.8 });
    g.audio.play('click');
    if (f.gateOpen) return this.say([{ who: 'skeleton', text: 'ど、どうぞ……ゆっくりしていってくださいね……カタカタ。' }]);
    if (!f.introDone) return this.say([{ who: 'skeleton', text: 'ひいっ！ だ、だれですか……ご、ご用のかたは、執事さんを通してくださいぃ……。' }]);
    if (!f.skeletonTalked) {
      g.flag('skeletonTalked');
      await this.say([
        { who: 'skeleton', text: 'カタカタカタ……あ、あの、合言葉を言っていただかないと、開けられないんですぅ……。' },
        { who: 'skeleton', text: '合言葉は、門の上に書いてありますので……。わ、わたし、こわくて上を見られないんですけど……。' },
      ]);
    }
    let pending = false;
    passwordPanel(g.ui, g.audio, { onSolved: async (panel) => { pending = true; panel.close(); await this.openGate(); pending = false; } });
    return this.waitPanel(() => pending);
  }

  async openGate() {
    const g = this.g, R = this.R;
    await this.say([{ who: 'skeleton', text: '「おとうと」……せ、正解ですぅ！ 魔王さまが、いちばん大切にしているもの……。どうぞ！' }]);
    g.cinematic = true;
    await g.moveCamera(new V(-15, 5, 9), new V(-9, 1.5, 3), 1.4);
    g.audio.play('creak');
    await g.tweens.add({ duration: 2.0, ease: Ease.inOut, onUpdate: (k) => { R.portcullis.position.y = 2.6 * k; } });
    g.audio.play('clunk');
    g.flag('gateOpen');
    // なかまは中庭へ
    const moves = [[this.bat, new V(1.2, 0, 2.6)], [this.hero, new V(-1.4, 0, 2.8)], [this.dragon, new V(-2.9, 0, 3.4)]];
    const from = moves.map(([c]) => c.root.position.clone());
    await g.moveCamera(new V(-6, 9, 14), new V(-3, 1, 3), 1.0);
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => {
      moves.forEach(([c, to], i) => {
        c.root.position.lerpVectors(from[i], to, k);
        if (k < 0.5 && from[i].z < 3 && to.x > GATE_X) c.root.position.z = lerp(from[i].z, 3.0, Math.min(1, k * 2));
        c.root.position.y = Math.abs(Math.sin(k * 20)) * 0.12;
      });
    } });
    moves.forEach(([c, to]) => c.root.position.copy(to));
    this.skeleton.setSheet(skeletonSheet({ shaking: false }));
    g.cinematic = false;
    this.questDone('城門が開いた！');
    await this.batInside();
  }

  async clickStele() {
    const g = this.g;
    this.focus(this.R.stele, 10);
    g.audio.play('paper');
    if (!g.flags.steleSeen) {
      g.flag('steleSeen');
      g.note('mo-stele', '魔界文字の対応表（駅前の石碑）', steleHTML());
    }
    g.ui.openPanel({ title: '魔界文字の石碑', body: `<div class="plaque">古い石碑。魔界文字と、ひらがなの対応が彫ってある。</div>${steleHTML()}`, cls: 'wide' });
    await this.waitPanel();
  }

  async clickGallery() {
    const g = this.g;
    this.focus(this.R.gallery, 14);
    if (!this.lit) return this.say(['肖像画の回廊。5まいの絵が、金色の額縁にかざられている。', '小さな2ひきのドラゴン、噴水、大鍋、本棚、そして……火のついていない燭台。', '（なんだか、ランタンで照らすと何か見えそうだ）']);
    if (!g.flags.galleryLit) {
      g.flag('galleryLit');
      g.note('mo-gallery', '肖像画の手がかり', 'ランタンで照らすと、絵の中にゴーストがうかびあがる。<br><b>噴水の上</b>、<b>台所の大鍋</b>、<b>図書室の本棚の上</b>。<br>そして<b>消えた燭台</b>の絵だけは、光の中ではなく<b>暗がりの中</b>にゴーストの目が光っている。');
    }
    return this.say(['ランタンの光をあてると、絵の中にちびゴーストのすがたがうかびあがった！', '噴水の上、大鍋のそば、本棚の上……そして、火の消えた燭台の絵では、暗がりの中に目だけが光っている。']);
  }

  async findGhost(k) {
    const g = this.g, f = g.flags;
    const c = this.ghosts[k];
    if (f[`ghost_${k}`]) {
      this.focus(c.root, 12);
      this.lastGhost = c;
      return this.say([{ who: 'ghost', text: 'ゆうしょくかい、たのしみだね〜！' }]);
    }
    this.focus(c.root, 11);
    this.lastGhost = c;
    g.audio.play('twinkle');
    g.flag(`ghost_${k}`);
    const lines = {
      fountain: 'わっ、みつかっちゃった〜！ ふんすいのうえ、とっておきだったのに〜。',
      kitchen: 'えへへ、おなべのにおいにつられて、でてきちゃった〜。',
      library: 'みつかった〜！ ……あ、そうだ、ほんだなのうえの【ほしくずしお】、おろしてあげるね！',
      candle: 'すごーい！ ひかりのなかじゃ、ぜったいみつからないとおもったのに〜！',
    };
    await this.say([{ who: 'ghost', text: lines[k] }]);
    if (k === 'library' && !f.saltGot) {
      this.R.saltJar.visible = false;
      g.flag('saltGot');
      g.give('salt');
    }
    // テラスへ飛んでいって、飾りつけの係に
    const from = c.root.position.clone();
    await g.tweens.add({ duration: 1.4, ease: Ease.inOut, onUpdate: (t) => { c.root.position.lerpVectors(from, PARTY[k], t); c.root.position.y += Math.sin(t * Math.PI) * 3; } });
    this._applyLantern(this.lanternK);
    const n = this.ghostCount();
    g.refreshQuests();
    if (n >= 4) {
      g.flag('ghostsDone');
      this.R.garland.visible = true;
      g.audio.play('chime');
      await this.say(['ちびゴーストたちが、玉座のテラスに色とりどりの旗をつるしはじめた！']);
      this.questDone('ゴーストが全員そろった！');
      await this.checkReady();
    } else {
      g.ui.toast(`👻 ゴーストを見つけた！（${n} / 4）`, 2200);
    }
  }

  async clickDarkBrazier() {
    this.focus(this.R.darkBrazier, 11);
    if (this.g.flags.ghost_candle) return this.say(['火の消えた燭台。']);
    if (this.lit) return this.say(['火の消えた燭台。ランタンの光で照らしても、中はからっぽに見える。']);
    return this.findGhost('candle');
  }

  async clickLibrary() {
    const f = this.g.flags;
    this.focus(this.R.library, 13);
    if (f.saltGot) return this.say(['図書室の塔。魔界の本がずらりとならんでいる。']);
    const lines = ['図書室の塔。入口の本棚のいちばん上に、きらきら光るびんがのっている。', '「星くず塩」……手を伸ばしても、とても届かない。'];
    if (!f.ghost_library) lines.push(this.lit ? '……本棚の上で、だれかがくすくす笑っている。' : '（だれか、高いところへ行ける者がいれば……）');
    return this.say(lines);
  }

  async talkWitch() {
    const g = this.g, f = g.flags;
    this.focus(this.witch.root, 12);
    g.audio.play('meow');
    if (f.stewDone) return this.say([{ who: 'witch', text: 'シチュー、魔王さまに届けてあげてね。冷めないうちに！' }]);
    if (!f.witchTalked) {
      g.flag('witchTalked');
      g.note('mo-witch', '魔女ネコの料理番', '魔王の好物<b>ほのおのシチュー</b>には、<b>溶岩トマト</b>・<b>かげキノコ</b>・<b>星くず塩</b>がいる。<br>つくりかたは台所の<b>黒板</b>に書いてある（ランタンの光でしか読めない）。');
      return this.say([
        { who: 'witch', text: 'あら、お客さんなんてめずらしいニャ。……夕食会？ いいわね、魔王さまの好物は【ほのおのシチュー】よ。' },
        { who: 'witch', text: '材料は【溶岩トマト】【かげキノコ】【星くず塩】の3つ。どれも切らしちゃってるの。' },
        { who: 'witch', text: 'つくりかたは、そこの黒板に書いてあるニャ。魔界のチョークだから、紫の光をあてないと読めないけどね。' },
      ]);
    }
    const need = [['tomato', '溶岩トマト'], ['mushroom', 'かげキノコ'], ['salt', '星くず塩']].filter(([id]) => !g.has(id)).map(([, n]) => n);
    if (need.length) return this.say([{ who: 'witch', text: `あとは【${need.join('】と【')}】があればつくれるニャ。` }]);
    await this.say([{ who: 'witch', text: '材料がそろったニャ！ 黒板のことばから、入れる順番とまぜる回数を考えてみて。材料はそれぞれ一度ずつ使うニャ。' }]);
    let pending = false;
    stewPanel(g.ui, g.audio, { onSolved: async (panel) => { pending = true; panel.close(); await this.stewReady(); pending = false; } });
    return this.waitPanel(() => pending);
  }

  async stewReady() {
    const g = this.g;
    for (const id of ['tomato', 'mushroom', 'salt']) g.take(id);
    this.R.soupMat.color.set('#e8602a');
    this.R.soupMat.emissive.set('#c83a1a');
    g.flag('stewDone');
    await this.say([{ who: 'witch', text: 'あまくて、ぴりっと辛い……魔王さまが小さいころから大好きな味ニャ。はい、どうぞ！' }]);
    g.give('stew');
    this.questDone('ほのおのシチューができた！');
    await this.checkReady();
  }

  async clickBlackboard() {
    const g = this.g;
    const board = this.R.blackboard;
    await g.focusOn(board.getWorldPosition(new V()).add(new V(0, 1.6, 0)), { dist: 9, polar: 1.1, theta: 0, keepAngle: true, subject: board, duration: 0.8 });
    if (!this.lit) return this.say(['台所の黒板。なにも書いていない……ように見える。', '（魔界のチョークは、紫の光でしか読めないらしい）']);
    if (!g.flags.recipeSeen) {
      g.flag('recipeSeen');
      g.note('mo-recipe', 'ほのおのシチューのつくりかた（黒板）', stewRecipeHTML());
    }
    return this.say(['紫の光をあてると、黒板に文字がうかびあがった。', `「ほのおのシチュー\n${RECIPE_CLUES.join('\n')}」`, RECIPE_RULE]);
  }

  async clickTomato() {
    const g = this.g;
    this.focus(this.R.tomato, 10);
    if (g.flags.tomatoGot) return this.say(['溶岩の谷のふち。熱い風がふきあげてくる。']);
    this.R.tomato.visible = false;
    g.flag('tomatoGot');
    g.give('tomato');
    return this.say(['溶岩の谷のふちに、赤く光るトマトがなっている。……あちちっ。溶岩トマトをもいだ！']);
  }

  async clickDungeon() {
    const g = this.g, f = g.flags;
    this.focus(this.R.dungeon, 12);
    if (f.mushroomGot) return this.say(['地下牢。もうだれも捕まっていない……というか、はじめからだれもいなかった。']);
    if (this.lit) return this.say(['地下牢。ランタンの光で、すみずみまで明るく見える。', '……そういえば「かげキノコ」は、光をきらうと魔女ネコが言っていた。']);
    if (!f.witchTalked) return this.say(['地下牢。暗がりのすみに、ぼんやり光るキノコがはえている。']);
    this.R.mushroom.visible = false;
    g.flag('mushroomGot');
    g.give('mushroom');
    return this.say(['暗がりのすみで、かげキノコがほのかに光っている。そっと つみとった！']);
  }

  async talkMimic() {
    const g = this.g, f = g.flags;
    this.focus(this.mimic.root, 11);
    g.audio.play('chest');
    if (f.bookGot) return this.say([{ who: 'mimic', text: 'その絵本、魔王さまにちゃんと見せてやれよ。……オレも、夕食会に呼んでくれるかな。' }]);
    if (!f.mimicTalked) {
      g.flag('mimicTalked');
      await this.say([
        { who: 'mimic', text: 'ガブッ！ ……おどろいたか？ オレは宝物庫の番人、ミミックさまだ。' },
        { who: 'mimic', text: '兄弟の絵本？ ああ、奥にしまってあるぜ。でもタダじゃやらねえ。なぞなぞに3つ正解したらな！' },
        { who: 'mimic', text: '……ほんとはさ、だれかと話すのひさしぶりで、うれしいんだ。' },
      ]);
    }
    let pending = false;
    quizPanel(g.ui, g.audio, { onSolved: async (panel) => { pending = true; panel.close(); await this.bookFound(); pending = false; } });
    return this.waitPanel(() => pending);
  }

  async bookFound() {
    const g = this.g;
    this.mimic.setSheet(mimicSheet({ open: true }));
    await this.say([{ who: 'mimic', text: 'まいった！ ほら、【兄弟の絵本】だ。……魔王さまがちいさいころ、毎晩弟ぎみに読んでやってたやつさ。' }]);
    g.flag('bookGot');
    g.give('picturebook');
    this.questDone('兄弟の絵本をみつけた！');
    await this.say(['（絵本は、持ち物を2回押すと読める）']);
    await this.checkReady();
  }

  async talkHero() {
    this.focus(this.hero.root, 12);
    this.g.audio.play('hero');
    const f = this.g.flags;
    if (f.departed) return this.say([{ who: 'hero', text: 'ぼく、しばらくここにいるよ。冒険はおしまい。今度は、遊びにくるんだ！' }]);
    if (!f.gateOpen) return this.say([{ who: 'hero', text: '魔王城……やっぱりちょっとこわいね。でも、剣はぬかないよ。きょうは、なかよくなりにきたんだ。' }]);
    return this.say([{ who: 'hero', text: 'ゴーストって、ランタンを灯すと見えるんだって。かくれんぼ、ぼくも手伝いたいなあ。' }]);
  }

  async talkDragon() {
    this.focus(this.dragon.root, 12);
    this.g.audio.play('roar');
    const f = this.g.flags;
    if (f.departed) return this.say([{ who: 'dragon', text: '兄ちゃんと、またいっしょにくらすんだ！ ありがとう！' }]);
    return this.say([{ who: 'dragon', text: '兄ちゃん……ずっとひとりで、さみしかったんだね。早く会いたいな。' }]);
  }

  async talkFrog() {
    this.focus(this.frog.root);
    this.g.audio.play('ribbit');
    return this.say([{ who: 'frog', text: this.g.flags.departed ? '' : '溶岩の谷の跳ね橋が上がってるケロ……魔王さまが下ろしてくれないと、進めないケロ。' }].filter((l) => l.text));
  }

  async talkMaou() {
    const g = this.g, f = g.flags;
    this.focus(this.maou.root, 16);
    g.audio.play('roar');
    if (f.departed) return this.say([{ who: 'maou', text: 'また……いつでも来い。シチューを用意して、待っておる。' }]);
    if (f.stewDone && f.bookGot && f.ghostsDone && g.has('stew') && g.has('picturebook')) return this.finale();
    return this.say(['玉座の魔王は、こちらに背中を向けたまま。', { who: 'maou', text: '……帰れ。だれにも、会いたくない。' }, '（大きな背中が、少しふるえている）']);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g;
    if (!g.flags.gateOpen && INNER.includes(target)) return this.gateClosed();
    if (target === 'kitchen' || target === 'blackboard') target = item === 'purpleLantern' ? 'blackboard' : 'witch';
    if (target === 'treasury') target = 'mimic';
    if (target === 'terrace') target = 'maou';
    if (item === 'purpleLantern') {
      if (!this.lit) this.toggleLantern();
      return this.say(['（ランタンは、持ち物を2回押すと灯したり消したりできる）']);
    }
    if (['tomato', 'mushroom', 'salt'].includes(item) && target === 'witch') return this.talkWitch();
    if ((item === 'stew' || item === 'picturebook') && target === 'maou') return this.talkMaou();
    if (item === 'picturebook' && target === 'dragon') return this.say([{ who: 'dragon', text: 'この絵本……兄ちゃんが、毎晩読んでくれたやつだ！' }]);
    const talkers = { maou: '……いらぬ。', bat: 'それは、お客さまがお持ちください。', skeleton: 'ひいっ、そ、それは合言葉じゃありません……。', witch: 'それはお鍋には入れられないニャ。', mimic: 'ガブッ。……まずい。', hero: 'それは、きみが持っていて。', dragon: 'それ、たべもの？', frog: 'それはボイラーには入れられないケロ。' };
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
    g.camera.position.set(-30, 14, 14);
    g.controls.target.set(-20, 4, -6);
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
      g.camera.position.lerpVectors(camFrom, new V(-24, 10, 12), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('魔王城', `STAGE ${stageNo('maou')}`, 2400);
    await g.say([
      'ほしまわり号は、夕やけの空にそびえる魔王城に着いた。',
      '紫の炎がゆらめき、溶岩の谷が赤く光っている。',
      { who: 'hero', text: 'ここが……魔王城。' },
      { who: 'dragon', text: '兄ちゃんのお城だ！' },
    ]);
    await g.moveCamera(new V(0, 10, 4), new V(0, HILL + 2.5, -10), 2.2);
    await g.say(['丘の上の玉座のテラスに、大きなドラゴンの背中が見える。……こちらを向こうとしない。']);
    await g.moveCamera(innerWidth < innerHeight ? new V(-8, 10, 14) : new V(-9, 6.5, 11), new V(-12.4, 1.4, 1.2), 2.0);
    g.cinematic = false;
    await this.talkBat();
  }

  async finale() {
    const g = this.g, R = this.R;
    g.cinematic = true;
    document.body.classList.add('cinematic');
    // みんなでテラスへ
    const party = [[this.hero, new V(-2.7, HILL + 0.3, -8.1)], [this.dragon, new V(2.7, HILL + 0.3, -8.0)], [this.bat, new V(-3.6, HILL + 0.3, -9.4)], [this.witch, new V(3.6, HILL + 0.3, -9.4)]];
    const from = party.map(([c]) => c.root.position.clone());
    await g.moveCamera(new V(0, 10.5, 7), new V(0, HILL + 2.4, -9.6), 2.0);
    await g.tweens.add({ duration: 2.0, ease: Ease.inOut, onUpdate: (k) => party.forEach(([c, to], i) => { c.root.position.lerpVectors(from[i], to, k); c.root.position.y += Math.sin(k * Math.PI) * 2.0; }) });
    R.feast.visible = true;
    g.take('stew');
    g.audio.play('chime');
    await this.say([
      '玉座のテラスに、テーブルとあたたかいシチューがならんだ。ゴーストたちの旗が、夕風にゆれている。',
      { who: 'dragon', text: '兄ちゃん！ ぼくだよ！ 手紙、ちゃんと読めたよ！' },
      { who: 'maou', text: '……！ その声は……。' },
    ]);
    this.maou.setSheet(maouSheet({ back: false }));
    g.audio.play('roar');
    g.take('picturebook');
    await this.say([
      { who: 'hero', text: '魔王さん。みんなで夕ごはんをつくったんだ。いっしょに食べよう！' },
      'あなたは、兄弟の絵本をそっとテーブルに置いた。',
      { who: 'maou', text: 'この絵本は……。ほのおのシチューの、においも……。' },
      { who: 'maou', text: '……わしは、強くなりすぎた。みんな、わしをこわがって、だれも来なくなった。だから、もう、ひとりでいいと……。' },
      { who: 'dragon', text: 'ひとりじゃないよ。ぼくも、勇者も、じいやも、みんないるよ！' },
    ]);
    this.maou.setSheet(maouSheet({ happy: true }));
    this.maou.hop();
    for (const c of [this.hero, this.dragon, ...Object.values(this.ghosts), ...this.minis]) c.hop();
    g.audio.play('fanfare');
    await this.say([
      { who: 'maou', text: '……うむ。……うまい。小さいころと、同じ味だ。' },
      '魔王の目から、大つぶの涙がぽろぽろこぼれた。そして、はじめて小さく笑った。',
      { who: 'maou', text: '旅の者よ。礼を言う。……溶岩の谷の跳ね橋を下ろそう。' },
    ]);
    await g.moveCamera(new V(26, 7, 4), new V(17.5, 1.2, -6), 2.0);
    g.audio.play('creak');
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => { R.drawbridge.rotation.z = (1 - k) * Math.PI / 2; } });
    g.audio.play('clunk');
    g.flag('departed');
    await g.moveCamera(new V(0, 10.5, 7), new V(0, HILL + 2.4, -9.6), 2.0);
    await this.say([
      { who: 'hero', text: 'ぼくたち、しばらくここにいるよ。冒険はおしまい。今度は、遊びにくるんだ！' },
      { who: 'dragon', text: '兄ちゃんといっしょにいる！ 旅の人、ありがとう！ また来てね！' },
      { who: 'frog', text: '出発するケロ〜！ 次は……ゆげのさと、ケロ。あったかいお湯がまってるケロ！' },
      'あなたは客車に乗りこんだ。城の窓という窓に灯りがともり、みんなが手をふっている。',
    ]);
    g.refreshQuests();
    await this.departure();
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(28, 6, 6), new V(17, 1.5, -6), 2.0);
    g.audio.play('whistle');
    await g.wait(1.2);
    this.departing = true;
    g.tweens.add({ duration: 7, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6.5; } });
    await g.moveCamera(new V(30, 7, 8), new V(24, 2, -6), 6);
    g.audio.play('whistle');
    await g.wait(2.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'maou'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'maou', '魔王と弟と勇者に見送られて、ほしまわり号は溶岩の谷をこえていく。');
  }
}
