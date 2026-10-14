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
import { buildHeroDiorama, TRACK_Z, HILL, ISLAND } from './diorama.js';
import { heroSheet, slimeSheet, dragonSheet, guardSheet, makeHero, makeSlime, makeGoblin, makeDragon, makeKing, makeGuard, makeOwl, makePixelFrog, makeChicken } from '../../lib/sprites-hero.js';
import { decodePanel, forgePanel, mixPanel, letterHTML, glassTableHTML } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  hero: { name: 'ハリネズミの勇者', icon: '🦔', color: '#3a6ad0', voice: 620 },
  slime: { name: 'スライムの道具屋', icon: '💧', color: '#2a7ad8', voice: 900 },
  goblin: { name: 'ゴブリンの鍛冶屋', icon: '🔨', color: '#4a8a3a', voice: 260 },
  dragon: { name: '子ドラゴン', icon: '🐉', color: '#d8502a', voice: 520 },
  king: { name: 'ライオンの王様', icon: '👑', color: '#b8283a', voice: 200 },
  guard: { name: 'アルマジロの門番', icon: '🛡️', color: '#7a6a5a', voice: 340 },
  owl: { name: 'フクロウの占い師', icon: '🔮', color: '#5a3a8a', voice: 440 },
  inn: { name: '宿屋のおかみ', icon: '🛏️', color: '#c8483a', voice: 700 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

/** 線路：左上の空から城下町の駅へ。右で城門をくぐり、跳ね橋をわたって空へ */
function makeHeroPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-110, 32, 44), new V(-74, 24, 24), new V(-42, RAIL_Y, TRACK_Z), new V(-24, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-24, RAIL_Y, TRACK_Z), new V(25, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(25, RAIL_Y, TRACK_Z), new V(42, RAIL_Y, TRACK_Z), new V(58, 10, -20), new V(74, 18, -40)));
  p.add(new THREE.CubicBezierCurve3(new V(74, 18, -40), new V(90, 24, -56), new V(106, 28, -72), new V(124, 30, -92)));
  p.arcLengthDivisions = 900;
  return p;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const KING_POS = new V(0, HILL + 3.22, -9.55);
const HERO_POS = new V(0.5, 0, 8.7);

/**
 * ステージ：勇者の城下町（HD-2D 風）
 * 目的：勇者の旅立ちの準備（剣・薬・子ドラゴン）を手伝い、跳ね橋を下ろしてもらう
 * 仕掛け：宿屋に泊まると、昼と夜が入れかわる
 */
export class HeroStage {
  constructor(game) {
    this.g = game;
    this.id = 'hero';
    this.title = '勇者の城下町';
    this.questTitle = '⚔ 勇者の旅立ち';
    this.hasRoof = false;
    this.roofLifted = false;
    this.nightK = 0;
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
    g.audio.setSong('hero');
    document.body.classList.add('rpg');
    g.bounds = { minX: -21, maxX: 21, minZ: -15, maxZ: 15 };
    g.controls.maxDistance = 90;

    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#3a7ae0'); u.dMid.value.set('#8ac4f8'); u.dBot.value.set('#e8f4ff');
    u.nTop.value.set('#060a24'); u.nMid.value.set('#162058'); u.nBot.value.set('#2a2e6a');
    u.sunDir.value.set(-0.5, 0.5, -0.7).normalize();
    u.moonDir.value.set(0.5, 0.45, -0.75).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#b8d4f4', 80, 260);
    this.hemi = new THREE.HemisphereLight('#e0ecff', '#6a7a5a', 1.15);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff4dc', 2.5));
    sun.position.set(-16, 30, 18);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 24; sc.bottom = -24; sc.near = 5; sc.far = 100;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: ISLAND.w, d: ISLAND.d, seed: 51, grass: '#6aa84a' });
    scene.add(this.island);
    this.clouds = makeClouds(53);
    this.clouds.scale.setScalar(1.35);
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('hero');
    scene.add(this.backdrop.group);
    this.smallIslands = [[-78, 6, -44, 5, 51], [70, -2, 34, 4, 52], [-92, 12, 24, 6, 53]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車（お堀の上は跳ね橋のレールだけ）
    this.path = makeHeroPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 19; // 機関車が x=-5 に止まる
    this.tracks = buildPortRails(scene, this.path, -22.3, 22.3, [[16.9, 19.95]]);
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();
    this.train.loco.firebox.material.emissiveIntensity = 2.2;
    this.train.loco.headlight.material.emissiveIntensity = 3;

    await this.g.loadingStep(0.3, '城下町を組み立てています…');
    // 看板のドット文字に使うフォントを先に読みこむ
    try { await Promise.race([document.fonts.load('12px "DotGothic16"'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* なくても描ける */ }
    this.R = buildHeroDiorama(scene);
    this.nightLights = [[0.5, 3.2, 6.0, 6], [-14.4, 2.4, 5.6, 5], [-14.4, 2.4, 12.0, 5], [10.8, 2.4, 12.6, 5]].map(([x, y, z, r]) => {
      const L = new THREE.PointLight('#ffb860', 0, r * 2, 1.4);
      L.position.set(x, y, z);
      scene.add(L);
      return L;
    });

    this.smoke = new Puffs(scene, { count: 70, color: '#f4f4f8', opacity: 0.7 });
    this.forgeSmoke = new Puffs(scene, { count: 30, color: '#9a9aa8', opacity: 0.5 });
    this.birds = new Birds(scene, 6, 57);
    this.sparkles = this._makeSparkles(scene);
    this.fireflies = new Motes(scene, { count: 50, color: '#d8ff9a', size: 0.14, area: { x: 40, z: 26, y0: 0.4, y1: 3 }, center: [0, 3], kind: 'firefly', opacity: 0 });
    this.dust = new Motes(scene, { count: 70, color: '#fff4d0', size: 0.08, area: { x: 40, z: 26, y0: 0.4, y1: 5 }, center: [0, 3], kind: 'dust', opacity: 0.5 });
    this.fire = this._makeFire(scene);

    await this.g.loadingStep(0.6, '住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();
    this._applyNight(0);

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

  /** 子ドラゴンの火の玉 */
  _makeFire(scene) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softCircleTexture(), color: '#ff9a3a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.userData.noPick = true;
    s.visible = false;
    scene.add(s);
    return s;
  }

  _placeCreatures(scene) {
    this.hero = makeHero({ sword: !!this.g.flags.swordGiven });
    this.hero.root.position.copy(HERO_POS);
    this.slime = makeSlime({});
    this.slime.root.position.set(10.8, 0, 13.2);
    this.goblin = makeGoblin();
    this.goblin.root.position.set(10.5, 0.3, 3.5);
    this.dragon = makeDragon({ happy: !!this.g.flags.dragonHappy });
    this.dragon.root.position.set(4.8, 0.2, 14.4);
    this.king = makeKing();
    this.king.root.position.copy(KING_POS);
    this.guard = makeGuard({});
    this.guard.root.position.set(3.45, HILL, -7.9); // お城の門の前（石段のいちばん上）
    this.owl = makeOwl();
    this.owl.root.position.set(-14.8, 0, 13.4);
    this.frog = makePixelFrog();
    this.frog.root.position.set(-8.6, 0.75, -3.4);
    this.chickens = [[7.0, 11.4], [2.6, 11.2], [-13.4, 9.6]].map(([x, z]) => { const c = makeChicken(); c.root.position.set(x, 0, z); c.wander = { x, z, ph: Math.random() * 9 }; return c; });
    this.minis = [
      [{ color: '#5ac85a', dark: '#2a8a3a', light: '#d8f8c8', w: 16, h: 14, bandana: null }, 13.6, 0, 13.6],
      [{ color: '#f0884a', dark: '#c8582a', light: '#fff0d0', w: 16, h: 14, bandana: null }, -19.6, 0, 15.0],
      [{ color: '#b87ae8', dark: '#8a4ac0', light: '#f0d8ff', w: 16, h: 14, bandana: null }, -6.5, HILL, -10.4],
    ].map(([o, x, y, z]) => { const c = makeSlime(o); c.root.position.set(x, y, z); c.wander = { x, z, ph: Math.random() * 9 }; c.bobSpeed = 2.4; return c; });
    this.creatures = [this.hero, this.slime, this.goblin, this.dragon, this.king, this.guard, this.owl, this.frog, ...this.chickens, ...this.minis];
    for (const c of this.creatures) scene.add(c.root);
  }

  speakerCreature(who) {
    return { hero: this.hero, slime: this.slime, goblin: this.goblin, dragon: this.dragon, king: this.king, guard: this.guard, owl: this.owl, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('hero', this.hero.root, 'ハリネズミの勇者', () => this.talkHero());
    reg('slime', this.slime.root, 'スライムの道具屋', () => this.talkSlime());
    reg('goblin', this.goblin.root, 'ゴブリンの鍛冶屋', () => this.talkGoblin());
    reg('dragon', this.dragon.root, '子ドラゴン', () => this.talkDragon());
    reg('king', this.king.root, 'ライオンの王様', () => this.talkKing());
    reg('guard', this.guard.root, 'アルマジロの門番', () => this.talkGuard());
    reg('owl', this.owl.root, 'フクロウの占い師', () => this.talkOwl());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    this.chickens.forEach((c, i) => reg(`chicken${i}`, c.root, 'ニワトリ', () => { g.audio.play('chirp'); return this.say(['コケッ。ニワトリが地面をつついている。']); }));
    this.minis.forEach((c, i) => reg(`mini${i}`, c.root, 'スライム', () => { g.audio.play('puyo'); return this.say([['ぷるぷる。ぼく、わるいスライムじゃないよ。', 'ぷるん。ひなたぼっこ中。', 'ぷにぷに。お城の庭は、ぼくのお気に入り。'][i]]); }));
    reg('inn', R.inn, '宿屋', () => this.clickInn());
    reg('guild', R.guild, 'ギルド（酒場）', () => this.clickGuild());
    reg('board', R.board, '依頼の掲示板', () => this.clickBoard());
    reg('church', R.church, '教会', () => this.clickChurch());
    reg('garden', R.garden, '教会の庭', () => this.clickGarden());
    reg('smithy', R.smithy, '鍛冶屋', () => this.talkGoblin());
    reg('itemShop', R.itemShop, '道具屋', () => this.talkSlime());
    reg('stable', R.stable, '竜舎', () => this.talkDragon());
    reg('stableLetter', R.stableLetter, 'むらさきの封筒', () => this.clickLetter());
    reg('keep', R.keep, 'お城', () => this.talkKing());
    reg('castle', R.castle, 'お城', () => this.say(['丘の上のお城。四すみの塔に、王家の旗がはためいている。', '天守のバルコニーに、王様のすがたが見える。']));
    reg('stairs', R.stairs, 'お城への石段', () => this.say(['お城へのぼる石段。てっぺんの門には、兵士の代わりにスライムが一匹……昼寝している。']));
    reg('gate', R.gate, '町の城門', () => this.clickGate());
    reg('drawbridge', R.drawbridge, '跳ね橋', () => this.clickGate());
    reg('fountain', R.fountain, '噴水', () => this.say([this.night ? '夜の噴水。月が水面にゆれている。' : '広場の噴水。金の玉から、きらきらと水がふき出している。']));
    reg('well', R.well, '井戸', () => this.say(['井戸。のぞくと……小さなメダルは落ちていない。']));
    for (const id of Object.keys(R.goldSpots)) reg(`gold_${id}`, R.goldSpots[id], { innPot: 'つぼ', smithBarrel: 'たる', stableChest: '宝箱', churchCrate: '木箱', stallPot: 'つぼ' }[id], () => this.searchGold(id));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『じょうかまち』……左は『しおのみなと』、右は『まおうじょう』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。……なんだか、この町では少しカクカクして見える。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。窓の外の町は、まるでゲームの中の世界だ。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  get night() { return !!this.g.flags.night; }

  applyState() {
    const f = this.g.flags, R = this.R;
    // 古いセーブ：アイテム名の変更（'letter' → 'maletter'）
    if (this.g.has('letter')) { this.g.state.inventory = this.g.state.inventory.map((i) => (i === 'letter' ? 'maletter' : i)); this.g.save(); }
    this.nightK = this.night ? 1 : 0;
    this._applyNight(this.nightK);
    R.stableLetter.visible = !f.letterGot;
    R.anvilSword.visible = !!f.forgeLit && !f.swordDone;
    R.drawbridge.rotation.z = f.departed ? 0 : Math.PI / 2;
    for (const id of Object.keys(R.goldSpots)) if (f[`gold_${id}`] && R.goldSpots[id].userData.lid) R.goldSpots[id].userData.lid.rotation.x = -1.2;
    this.hero.setSheet(heroSheet({ sword: !!f.swordGiven }));
    this.dragon.setSheet(dragonSheet({ happy: !!f.dragonHappy }));
    this._setForge(!!f.forgeLit);
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  _setForge(on) {
    this.R.fireMat.emissiveIntensity = on ? 2.4 : 0;
    this.R.forgeLight.intensity = on ? 2.5 : 0;
  }

  /** 昼(0) ⇄ 夜(1) */
  _applyNight(k) {
    const g = this.g, R = this.R;
    const u = this.sky.uniforms;
    u.night.value = lerp(0, 0.92, k);
    this.backdrop.set(k);
    g.setGrade(mixGrade(GRADES.hero, GRADES.heroNight, k));
    this.hemi.intensity = lerp(1.15, 0.55, k);
    this.hemi.color.set('#e0ecff').lerp(new THREE.Color('#6a7ad0'), k);
    this.sun.intensity = lerp(2.5, 0.7, k);
    this.sun.color.set('#fff4dc').lerp(new THREE.Color('#9ab0ff'), k);
    this.sun.position.set(lerp(-16, 14, k), lerp(30, 26, k), 18);
    g.scene.fog.color.set('#b8d4f4').lerp(new THREE.Color('#1a2050'), k);
    g.renderer.toneMappingExposure = lerp(1.0, 1.15, k);
    this.clouds.userData.mat.color.set('#ffffff').lerp(new THREE.Color('#4a4e88'), k);
    this.clouds.userData.mat.emissive.set('#a8c8f0').lerp(new THREE.Color('#141840'), k);
    const on = smooth(0.3, 0.9, k);
    R.winMat.emissiveIntensity = 1.5 * on;
    R.lampMat.emissiveIntensity = 0.2 + 2.2 * on;
    for (const p of R.nightPools) p.material.opacity = 0.55 * on;
    for (const L of this.nightLights) L.intensity = 2.2 * on;
    for (const p of R.glassLight) p.material.opacity = 0.5 * (1 - k);
    R.glassMat.emissiveIntensity = lerp(0.45, 0.1, k);
    R.moonflower.visible = k > 0.5 && !this.g.flags.flowerGot;
    R.shutter.visible = k > 0.5;
    if (this.fireflies) {
      this.fireflies.baseOpacity = 0.9 * on;
      this.fireflies.visible = on > 0.05;
      this.dust.mat.opacity = 0.5 * (1 - on);
    }
    g.audio.night = k;
    if (this.hero) {
      const n = k > 0.5;
      this.hero.root.visible = !n;
      this.owl.root.visible = n;
      this.slime.setSheet(slimeSheet({ sleep: n }));
      this.guard.setSheet(guardSheet({ sleep: n }));
      for (const c of this.creatures) c.mat.emissiveIntensity = c.glow * lerp(1, 0.75, k);
      for (const c of this.chickens) c.root.visible = !n;
    }
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    // ニワトリとちびスライムはうろうろ
    for (const c of [...this.chickens, ...this.minis]) {
      const w = c.wander;
      c.root.position.x = w.x + Math.sin(t * 0.3 + w.ph) * 0.9;
      c.root.position.z = w.z + Math.cos(t * 0.23 + w.ph * 2) * 0.6;
    }
    this.birds.update(dt, t);
    this.fireflies.update(dt, t);
    this.dust.update(dt, t);
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    R.waterTex.offset.x = (t * 0.03) % 1;
    R.waterTex.offset.y = (t * 0.017) % 1;
    R.spray.rotation.y = t * 0.6;
    R.spray.scale.y = 1 + Math.sin(t * 5) * 0.05;
    for (const f of R.flags) if (f) f.rotation.y = Math.sin(t * 2.6 + f.position.x) * 0.35;
    // 跳ね橋の鎖
    for (const ch of R.chains) {
      const a = new V(16.75, 3.4, TRACK_Z + ch.s * 1.25);
      const b = R.drawbridge.localToWorld(new V(2.8, 0.1, ch.s * 1.25));
      const d = b.clone().sub(a);
      ch.m.position.copy(a).addScaledVector(d, 0.5);
      ch.m.scale.set(1, d.length(), 1);
      ch.m.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize());
    }
    // 鍛冶屋の煙突の煙
    if (g.flags.forgeLit) {
      this.forgeT = (this.forgeT || 0) - dt;
      if (this.forgeT <= 0) { this.forgeT = 0.8; this.forgeSmoke.emit(new V(13.0, 6.4, 0.8), { vel: new V(0.2, 1.0, 0), spread: 0.3, life: 3, size0: 0.4, size1: 1.6 }); }
      this.R.fireMat.emissiveIntensity = 2.2 + Math.sin(t * 9) * 0.3 + Math.sin(t * 23) * 0.15;
    }
    this.forgeSmoke.update(dt);
    // 煙
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
      if (this.dragonFollow) {
        const p = this.train.loco.g.position;
        this.dragon.root.position.set(p.x + 1.5, p.y + 3.4 + Math.sin(t * 4) * 0.3, p.z + 1.6);
      }
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
    if (!f.introDone) return [{ text: '噴水の前の勇者に話しかけよう', done: false }];
    const all = f.swordGiven && f.potionsGiven && f.dragonHappy;
    const q = [
      { text: '⚔ 勇者に剣をとどける', done: !!f.swordGiven },
      { text: '🧪 勇者に薬をとどける', done: !!f.potionsGiven },
      { text: '🐉 子ドラゴンを元気にする', done: !!f.dragonHappy },
    ];
    if (all) q.push({ text: '👑 王様に報告する', done: !!f.departed });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    const night = this.night;
    if (!f.introDone) return H('intro', '広場の噴水の前にいる、ハリネズミの勇者に話しかけよう。');
    if (f.swordGiven && f.potionsGiven && f.dragonHappy) {
      if (night) return H('finalDay', '王様に会えるのは昼だけ。宿屋に泊まって朝にしよう。');
      return H('final', 'お城のバルコニーにいる王様に報告しよう。');
    }
    if (has('sword')) return H('giveSword', '持ち物の『勇者の剣』を選んで、勇者に使おう。', night ? '勇者は夜は宿屋で寝ている。宿屋に泊まって朝にしよう。' : '');
    if (has('potions')) return H('givePotions', '持ち物の『薬のセット』を選んで、勇者に使おう。', night ? '勇者は夜は宿屋で寝ている。宿屋に泊まって朝にしよう。' : '');
    // 子ドラゴン
    if (!f.dragonHappy) {
      if (!f.dragonTalked) return H('dragon', '広場の右手前、竜舎にいる子ドラゴンに話しかけよう。');
      if (!f.letterGot) return H('letter', '竜舎のわらの上に、むらさきの封筒が落ちている。');
      if (!f.owlTalked) return H('owl', '読めない手紙……町の占い師なら読めるかも。占い師はギルドの前に夜だけあらわれる。', '宿屋に泊まって夜にし、ギルドの前のフクロウに話しかけよう。');
      if (!f.glassSeen) return H('glass', '魔界文字の対応表は、教会のステンドグラスにある。', night ? 'ステンドグラスの絵は、日の光が通る昼でないと見えない。宿屋に泊まって朝にしよう。' : '昼のうちに『教会』を調べよう。');
      return H('decode', '持ち物の『魔界の手紙』を2回押して読もう。旅のメモの対応表が手がかり。', '欠けている1文字は、言葉の意味から考えよう。答えは「あいたい」。');
    }
    if (!f.swordDone) {
      if (!f.forgeLit) return H('forge', '子ドラゴンに話しかけよう。');
      return H('smith', '鍛冶屋のゴブリンに話しかけて、剣を鍛えよう。', '手引き：白で1回、黄で2回、橙で1回、そして水。ふいご4回→打つ→打つ→ふいご→打つ→打つ→水。');
    }
    if (!f.potionsDone) {
      if (!f.slimeTalked) return H('slime', '道具屋のスライムに話しかけよう。', night ? 'スライムは夜は寝ている。' : '');
      if (!f.flowerGot) return H('flower', '月光草は、夜に教会の庭でさく。', '宿屋に泊まって夜にし、『教会の庭』を調べよう。');
      if (this.g.count('gold') < 3 || !has('gold')) return H('gold', 'ゴールド袋が3つ必要。町のつぼやたる、宝箱を調べよう。', '昼：宿屋の前のつぼ、鍛冶屋の横のたる、竜舎の宝箱。夜：教会の裏の木箱、市場のむらさきのつぼ。');
      if (night) return H('slimeDay', 'スライムの店は昼だけ。宿屋に泊まって朝にしよう。');
      return H('mix', '道具屋のスライムに話しかけて薬をつくろう。', '回復薬＝黄2・青1、毒消し＝赤1・青2、元気の素＝赤2・黄1。');
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

  inspectItem(id) {
    const f = this.g.flags;
    if (id !== 'maletter') return false;
    this.g.audio.play('paper');
    if (f.owlTalked && f.glassSeen && !f.dragonHappy) { this.openDecode(); return true; }
    this.g.ui.openPanel({ title: '魔界の手紙', body: letterHTML(!!f.dragonHappy), cls: 'wide' });
    return true;
  }

  // =========================================================
  // 共通
  // =========================================================
  say(lines) { return this.g.say(lines); }

  focus(obj, dist) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(6.5, Math.max(0.8, p.y + 0.6)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined });
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
    if (f.swordGiven && f.potionsGiven && f.dragonHappy) {
      await this.say(['これで勇者の旅じたくはととのった。お城の王様に報告しよう！']);
      this.g.refreshQuests();
    }
  }

  // =========================================================
  // 宿屋：昼と夜を入れかえる
  // =========================================================
  async clickInn() {
    const g = this.g;
    this.focus(this.R.inn, 16);
    const night = this.night;
    await this.say([{ who: 'inn', text: night ? 'おや、こんな夜ふけに。ひと晩とまっていくかい？ 朝までぐっすりだよ。' : 'いらっしゃい、旅の人！ ひと休みしていくかい？ 夜まで、ゆっくりしていきな。' }]);
    const c = await g.ui.choose(night ? '朝まで泊まる？' : '夜まで休む？', ['泊まる', 'やめておく']);
    if (c !== 0) return this.say([{ who: 'inn', text: 'またおいで。' }]);
    return this.sleep();
  }

  async sleep() {
    const g = this.g;
    const to = this.night ? 0 : 1;
    g.cinematic = true;
    await g.ui.fade(1, 0.9, '#000000');
    g.audio.play('inn');
    await g.wait(1.2);
    g.flag('night', !!to);
    this.nightK = to;
    this._applyNight(to);
    g.cinematic = false;
    await g.ui.fade(0, 1.0, '#000000');
    if (to) {
      if (!g.flags.nightSeen) g.note('hr-night', '夜の城下町', '宿屋に泊まると、<b>昼と夜</b>が入れかわる。<br>夜：勇者は宿屋で寝ている。スライムの店はおやすみ。ギルドの前に<b>占い師</b>があらわれる。');
      g.flag('nightSeen');
      await this.say(['……夜になった。家々の窓に灯りがともり、空には星がまたたいている。']);
    } else {
      await this.say(['……チュンチュン。朝になった！ 城下町がまた、にぎやかに動きだす。']);
    }
  }

  // =========================================================
  // ゴールドさがし（つぼ・たる・宝箱）
  // =========================================================
  async searchGold(id) {
    const g = this.g, f = g.flags;
    const obj = this.R.goldSpots[id];
    this.focus(obj, 12);
    const name = { innPot: 'つぼ', smithBarrel: 'たる', stableChest: '宝箱', churchCrate: '木箱', stallPot: 'つぼ' }[id];
    const nightOnly = id === 'churchCrate' || id === 'stallPot';
    if (f[`gold_${id}`]) return this.say([`${name}の中は、もうからっぽだ。`]);
    if (nightOnly && !this.night) return this.say([`${name}をのぞいてみた。……昼間は人目が多くて、なんだか気がひける。`, '（夜にまた来てみよう）']);
    if (id === 'stableChest') {
      g.audio.play('chest');
      await g.tweens.add({ duration: 0.5, onUpdate: (k) => { obj.userData.lid.rotation.x = -1.2 * k; } });
    } else g.audio.play('pop');
    g.flag(`gold_${id}`);
    g.give('gold');
    g.audio.play('coin');
    if (!f.goldNoted) {
      g.flag('goldNoted');
      g.note('hr-gold', 'ゴールド袋', '町の<b>つぼ・たる・宝箱</b>を調べると、ゴールド袋が出てくることがある。<br>夜にしか調べにくい場所もある。');
    }
    return this.say([`${name}を調べた！ なんと、ゴールド袋を見つけた。`]);
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkHero() {
    const g = this.g, f = g.flags;
    this.focus(this.hero.root, 13);
    g.audio.play('hero');
    if (!f.introDone) return this.heroIntro();
    if (g.has('sword')) return this.giveSword();
    if (g.has('potions')) return this.givePotions();
    if (f.swordGiven && f.potionsGiven && f.dragonHappy) return this.say([{ who: 'hero', text: 'よし……王様に、旅立ちのお許しをもらいに行こう！' }]);
    const lines = [];
    if (!f.swordGiven) lines.push({ who: 'hero', text: '剣はゴブリンのおじさんにたのんであるんだけど、炉の火が消えちゃったんだって。' });
    if (!f.potionsGiven) lines.push({ who: 'hero', text: '薬はスライムの道具屋さん。材料が足りないって言ってたな。' });
    if (!f.dragonHappy) lines.push({ who: 'hero', text: 'それと、竜舎の子ドラゴンが元気ないんだ。ぼくの旅の道案内をしてくれるはずなのに……。' });
    return this.say(lines);
  }

  async heroIntro() {
    const g = this.g;
    await this.say([
      { who: 'hero', text: 'あっ、旅の人！ ……もしかして、あの星の線路を走る列車の？' },
      { who: 'hero', text: 'ぼくはハリネズミの勇者。きょう、魔王城へ旅立つ……はず、だったんだけど。' },
      { who: 'hero', text: '王様が「剣と薬と道案内がそろうまで、跳ね橋は下ろさん！」って。' },
      { who: 'hero', text: '剣は【ゴブリンの鍛冶屋】、薬は【スライムの道具屋】、道案内は【竜舎の子ドラゴン】……でも、どれもうまくいってないんだ。' },
      { who: 'hero', text: '跳ね橋が下りないと、きみたちの列車も先へ行けないよね。……いっしょに手伝ってくれる？' },
      { who: 'hero', text: 'あ、そうそう。夜にしか会えない人もいるよ。宿屋に泊まれば、時間が進むからね。' },
    ]);
    g.flag('introDone');
    g.note('hr-goal', '勇者のことば', '跳ね橋を下ろすには、勇者の<b>剣</b>・<b>薬</b>・<b>道案内（子ドラゴン）</b>をそろえて王様に報告する。<br>剣＝ゴブリンの鍛冶屋、薬＝スライムの道具屋、道案内＝竜舎の子ドラゴン。<br><b>宿屋</b>に泊まると昼と夜が入れかわる。');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async giveSword() {
    const g = this.g;
    if (this.night) return this.say(['勇者は宿屋でぐっすり寝ている。朝になったら渡そう。']);
    this.focus(this.hero.root, 12);
    g.take('sword');
    g.flag('swordGiven');
    this.hero.setSheet(heroSheet({ sword: true }));
    this.hero.hop();
    await this.say([{ who: 'hero', text: 'これが……勇者の剣！ 青白く光ってる！ ありがとう！' }]);
    this.questDone('勇者が剣を手に入れた！');
    await this.checkReady();
  }

  async givePotions() {
    const g = this.g;
    if (this.night) return this.say(['勇者は宿屋でぐっすり寝ている。朝になったら渡そう。']);
    this.focus(this.hero.root, 12);
    g.take('potions');
    g.flag('potionsGiven');
    this.hero.hop();
    await this.say([{ who: 'hero', text: '回復薬に毒消しに元気の素！ これで長い旅も安心だ！' }]);
    this.questDone('勇者が薬を手に入れた！');
    await this.checkReady();
  }

  async talkDragon() {
    const g = this.g, f = g.flags;
    this.focus(this.dragon.root, 13);
    g.audio.play('roar');
    if (f.dragonHappy) {
      if (!f.forgeLit) return this.dragonLightsForge();
      return this.say([{ who: 'dragon', text: f.departed ? '' : '勇者といっしょに、魔王城まで道案内するんだ！ 兄ちゃん、待っててね！' }].filter((l) => l.text));
    }
    if (!f.dragonTalked) {
      g.flag('dragonTalked');
      g.note('hr-dragon', '子ドラゴン', 'しょんぼりして、火もふけない。<br>竜舎に、むらさきの封筒が落ちている。');
      return this.say([
        '子ドラゴンは、わらの上でまるくなっている。',
        { who: 'dragon', text: '……。' },
        { who: 'dragon', text: '……兄ちゃんから、手紙がきたの。でも、むずかしい字で……読めないの。' },
        { who: 'dragon', text: '兄ちゃん、遠いお城にひとりで住んでるんだ。……なにかあったのかな。' },
      ]);
    }
    if (!f.letterGot) return this.say([{ who: 'dragon', text: '手紙……そこのわらの上……。' }]);
    if (f.owlTalked && f.glassSeen) return this.say([{ who: 'dragon', text: '手紙、読めそう……？' }]);
    return this.say([{ who: 'dragon', text: '……兄ちゃん、なんて書いてきたんだろう……。' }]);
  }

  async clickLetter() {
    const g = this.g;
    this.focus(this.R.stable, 12);
    if (!g.flags.dragonTalked) await this.talkDragon();
    this.R.stableLetter.visible = false;
    g.flag('letterGot');
    g.give('maletter');
    await this.say(['むらさきの封筒。赤い封ろうに「魔」の字。', '中の手紙は、星をつないだような、見たことのない文字で書かれている……。', '（持ち物を2回押すと読める）']);
  }

  async talkOwl() {
    const g = this.g, f = g.flags;
    this.focus(this.owl.root, 12);
    g.audio.play('hoot');
    if (f.dragonHappy) return this.say([{ who: 'owl', text: 'ホッホウ。星が言うておる。この旅は、だれかのさびしさを終わらせる旅じゃと。' }]);
    if (g.has('maletter')) {
      g.flag('owlTalked');
      g.note('hr-owl', '占い師のことば', '手紙の文字は<b>魔界文字</b>。星座の形をしている。<br>読みかたの対応表は、<b>教会のステンドグラス</b>にある。<br>ステンドグラスの絵は、<b>日の光</b>が通るときしか見えない。');
      return this.say([
        { who: 'owl', text: 'ホッホウ……これは【魔界文字】じゃ。ひと文字ひと文字が、星座の形をしておる。' },
        { who: 'owl', text: '読みかたの対応表は、教会の【ステンドグラス】にえがかれておる。むかし、魔界から来た職人がこしらえたものじゃ。' },
        { who: 'owl', text: 'ただし、あの絵は日の光が通るときしか見えん。昼に行くのじゃな。' },
      ]);
    }
    return this.say([
      { who: 'owl', text: 'ホッホウ。夜の占い師じゃ。昼はねむくてかなわん。' },
      { who: 'owl', text: '読めぬ文字に困っておる者がおるなら、つれてくるとよい。' },
    ]);
  }

  async clickChurch() {
    const g = this.g, f = g.flags;
    this.focus(this.R.church, 15);
    if (this.night) return this.say(['夜の教会。ステンドグラスは暗く、模様は見えない。']);
    g.audio.play('bell');
    if (!f.glassSeen) {
      g.flag('glassSeen');
      g.note('hr-glass', 'ステンドグラスの対応表', glassTableHTML());
    }
    g.ui.openPanel({ title: 'ステンドグラス', body: `<div class="plaque">日の光が、ステンドグラスの星座と文字を床にうつしている。</div>${glassTableHTML()}`, cls: 'wide' });
    await this.waitPanel();
    if (f.owlTalked && this.g.has('maletter') && !f.dragonHappy) await this.say(['（これで手紙が読めそうだ。持ち物の手紙を2回押そう）']);
  }

  async clickGarden() {
    const g = this.g, f = g.flags;
    this.focus(this.R.garden, 12);
    if (f.flowerGot) return this.say(['教会の庭。草花が風にゆれている。']);
    if (!this.night) return this.say(['教会の庭。白いつぼみが、ぎゅっと閉じている。', 'たて札「月光草：月の光でひらきます」']);
    this.R.moonflower.visible = false;
    g.flag('flowerGot');
    g.give('moonflower');
    return this.say(['月の光をあびて、白い花がふわりと光っている。……月光草だ！ そっとつませてもらった。']);
  }

  openDecode() {
    const g = this.g;
    let pending = false;
    decodePanel(g.ui, g.audio, {
      onSolved: async (panel) => { pending = true; panel.close(); await this.dragonCheersUp(); pending = false; },
    });
    return this.waitPanel(() => pending);
  }

  async dragonCheersUp() {
    const g = this.g;
    g.flag('dragonHappy');
    await this.say(['手紙には、こう書いてあった。', '「おとうと へ　さびしい　あいたい」']);
    this.focus(this.dragon.root, 12);
    this.dragon.setSheet(dragonSheet({ happy: true }));
    this.dragon.hop();
    g.audio.play('roar');
    await this.say([
      { who: 'dragon', text: '兄ちゃん……さびしかったんだ……！' },
      { who: 'dragon', text: '兄ちゃんはね、魔王城にひとりで住んでるの。みんなこわがって、だれも遊びに行かないんだ。' },
      { who: 'dragon', text: 'ぼく、会いに行く！ 勇者の道案内をして、いっしょに魔王城へ行く！' },
    ]);
    g.note('hr-letter', '魔界の手紙', '「おとうと へ　さびしい　あいたい」<br>子ドラゴンの兄は<b>魔王城</b>にひとりで住んでいる。');
    this.questDone('子ドラゴンが元気になった！');
    await this.dragonLightsForge();
    await this.checkReady();
  }

  async dragonLightsForge() {
    const g = this.g, R = this.R;
    if (g.flags.forgeLit) return;
    await this.say([{ who: 'dragon', text: 'そうだ、ゴブリンのおじちゃんの炉、火が消えてるんでしょ？ ぼくの火、つけてあげる！' }]);
    g.cinematic = true;
    const home = this.dragon.root.position.clone();
    await g.moveCamera(new V(16, 8, 14), new V(9, 1.5, 4), 1.4);
    const pts = [home, new V(6, 4.5, 10), new V(8.0, 3.6, 6.0), new V(8.8, 1.2, 4.6)];
    const curve = new THREE.CatmullRomCurve3(pts);
    g.audio.play('whoosh');
    await g.tweens.add({ duration: 2.0, ease: Ease.inOut, onUpdate: (k) => curve.getPointAt(k, this.dragon.root.position) });
    g.audio.play('fire');
    const f = this.fire;
    f.visible = true;
    await g.tweens.add({ duration: 0.9, onUpdate: (k) => {
      f.position.lerpVectors(new V(8.8, 1.6, 4.6), new V(10.1, 1.3, 1.4), k);
      f.scale.setScalar(0.6 + k * 1.4);
      f.material.opacity = Math.sin(k * Math.PI) * 0.9 + 0.1;
    } });
    f.visible = false;
    g.flag('forgeLit');
    this._setForge(true);
    R.anvilSword.visible = true;
    g.audio.play('clang');
    this.goblin.hop();
    await g.tweens.add({ duration: 2.0, ease: Ease.inOut, onUpdate: (k) => curve.getPointAt(1 - k, this.dragon.root.position) });
    this.dragon.root.position.copy(home);
    g.cinematic = false;
    await this.say([{ who: 'goblin', text: 'うおっ、炉に火が！ ……いい火だ。これなら勇者の剣が打てるぞ！' }]);
  }

  async talkGoblin() {
    const g = this.g, f = g.flags;
    this.focus(this.goblin.root, 13);
    g.audio.play('goblin');
    if (f.swordDone) return this.say([{ who: 'goblin', text: 'ふん、いい剣だろう。勇者のぼうずに、しっかり渡しとけ。' }]);
    if (!f.forgeLit) {
      if (!f.goblinTalked) {
        g.flag('goblinTalked');
        g.note('hr-smith', '鍛冶の手引き（ゴブリンの壁の貼り紙）', '<b>白</b>で一度、<b>黄</b>で二度、<b>橙</b>で一度。<br>そして<b>水</b>へ。<br>ふいごで熱すると色が上がり、打つと一段さがる。熱しすぎると鉄がとける。');
        return this.say([
          { who: 'goblin', text: 'なんだ、客か。……見てのとおり、炉の火が消えちまってな。' },
          { who: 'goblin', text: '勇者の剣を打つには、ドラゴンの火じゃなきゃだめなんだ。ふつうの火じゃ、刃に魂が入らねえ。' },
          { who: 'goblin', text: '竜舎のちびドラゴンにたのんでたんだが、あいつ、なんだかしょげちまってよ。' },
          { who: 'goblin', text: 'ま、火さえつけば、あとは壁の【手引き】どおりに打つだけだ。おめえさんにも打たせてやるよ。' },
        ]);
      }
      return this.say([{ who: 'goblin', text: 'ドラゴンの火さえあればなあ……。' }]);
    }
    await this.say([{ who: 'goblin', text: 'よし、打つぞ！ 手引きは覚えてるな？ 白で一度、黄で二度、橙で一度、そして水だ。' }]);
    return this.openForge();
  }

  openForge() {
    const g = this.g;
    let pending = false;
    forgePanel(g.ui, g.audio, {
      onSolved: async (panel) => { pending = true; panel.close(); await this.swordDone(); pending = false; },
    });
    return this.waitPanel(() => pending);
  }

  async swordDone() {
    const g = this.g;
    g.flag('swordDone');
    this.R.anvilSword.visible = false;
    g.audio.play('fanfare');
    await this.say([{ who: 'goblin', text: '……できた。こいつが【勇者の剣】だ。わしの最高傑作よ。勇者のぼうずに届けてやってくれ。' }]);
    g.give('sword');
  }

  async talkSlime() {
    const g = this.g, f = g.flags;
    this.focus(this.slime.root, 12);
    g.audio.play('puyo');
    if (this.night) return this.say(['スライムは、とろんと平たくなって眠っている。……すぴー。', '（道具屋は昼だけ開いているようだ）']);
    if (f.potionsDone) return this.say([{ who: 'slime', text: 'まいどあり〜！ 勇者くんに、よろしくね〜。' }]);
    if (!f.slimeTalked) {
      g.flag('slimeTalked');
      g.note('hr-slime', 'スライムの道具屋', '勇者の薬をつくるには、<b>月光草</b>（夜に教会の庭でさく）と、びん代の<b>ゴールド袋3つ</b>がいる。');
      await this.say([
        { who: 'slime', text: 'いらっしゃいませ〜。ぷるぷる、道具屋だよ〜。商品はぜんぶ、ぼくのおなかの中にしまってあるの。' },
        { who: 'slime', text: '勇者くんの薬だよね？ つくってあげたいんだけど、材料の【月光草】が切れちゃって……。月光草は、夜に教会の庭でさくんだよ。' },
        { who: 'slime', text: 'それと、ごめんね、びん代に【ゴールド袋3つ】もらえるかな？ うちも商売だから〜。' },
      ]);
    }
    const lack = [];
    if (!g.has('moonflower')) lack.push('月光草');
    if (g.count('gold') < 3 || !g.has('gold')) lack.push(`ゴールド袋（あと${3 - (g.has('gold') ? g.count('gold') : 0)}つ）`);
    if (lack.length) return this.say([{ who: 'slime', text: `あとは【${lack.join('】と【')}】があればつくれるよ〜。` }]);
    g.take('moonflower');
    g.take('gold');
    g.audio.play('coin');
    await this.say([{ who: 'slime', text: 'わあ、月光草！ ゴールドもたしかに〜。それじゃ、いっしょに薬をつくろう！ 見本と同じ色にしてね〜。' }]);
    return this.openMix();
  }

  openMix() {
    const g = this.g;
    let pending = false;
    mixPanel(g.ui, g.audio, {
      onSolved: async (panel) => { pending = true; panel.close(); await this.potionsReady(); pending = false; },
    });
    return this.waitPanel(() => pending);
  }

  async potionsReady() {
    const g = this.g;
    g.flag('potionsDone');
    await this.say([{ who: 'slime', text: 'できた〜！ 回復薬・毒消し・元気の素のセットだよ〜。勇者くんに届けてあげて！' }]);
    g.give('potions');
  }

  async talkKing() {
    const g = this.g, f = g.flags;
    this.focus(this.king.root, 16);
    g.audio.play('lion');
    if (f.departed) return this.say([{ who: 'king', text: '旅の無事をいのっておるぞ。' }]);
    if (this.night) return this.say(['バルコニーの奥の窓に灯りがともっている。王様はもうおやすみのようだ。']);
    if (f.swordGiven && f.potionsGiven && f.dragonHappy) return this.finale();
    const lines = [{ who: 'king', text: 'うおっほん。わしがこの国の王じゃ。' }];
    if (!f.kingTalked) {
      g.flag('kingTalked');
      lines.push({ who: 'king', text: '勇者はまだ小さい。剣と薬と、たよれる道案内がそろうまでは、跳ね橋は下ろさん。……心配なのじゃ。' });
    } else lines.push({ who: 'king', text: '剣・薬・道案内。そろったら報告にまいれ。' });
    return this.say(lines);
  }

  async talkGuard() {
    const g = this.g;
    this.focus(this.guard.root, 12);
    if (this.night) return this.say(['門番のアルマジロは、立ったまま眠っている。……むにゃ。']);
    g.audio.play('click');
    return this.say([{ who: 'guard', text: g.flags.departed ? '跳ね橋は下りております。よい旅を！' : 'ここはお城の門。王様のお許しがなければ、町の跳ね橋は下ろせませぬ！ ……ほんとは早く下ろしてあげたいんですけどね。' }]);
  }

  async talkFrog() {
    this.focus(this.frog.root);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.swordGiven && f.potionsGiven && f.dragonHappy) return this.say([{ who: 'frog', text: '王様に報告すれば、跳ね橋が下りるケロ！' }]);
    await this.say([{ who: 'frog', text: '跳ね橋が上がってて進めないケロ……。それに、ぼくまでカクカクのドット絵になっちゃったケロ！' }]);
  }

  async clickGate() {
    const f = this.g.flags;
    this.focus(this.R.gate, 18);
    if (f.departed) return this.say(['跳ね橋は下りている。']);
    return this.say(['町の城門。お堀の跳ね橋が、ぎいっと上がったままになっている。', 'これでは列車は先へ進めない。']);
  }

  async clickGuild() {
    this.focus(this.R.guild, 16);
    if (this.night) return this.say(['ギルドの酒場からは、にぎやかな笑い声。', '入口の前で、フクロウの占い師が水晶玉をのぞいている。']);
    return this.say(['冒険者ギルド。昼は依頼の受付、夜は酒場になる。', '「占い：夜だけ　入口の前にて」と貼り紙がある。']);
  }

  async clickBoard() {
    this.focus(this.R.board, 10);
    return this.say(['依頼の掲示板。', '「勇者の旅立ちを手伝ってくれる人、ぼしゅう！　―王様」', '「月光草の採取（夜・教会の庭）　―道具屋スライム」', '「炉の火、求む　―鍛冶屋」']);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g;
    if (target === 'smithy') target = 'goblin';
    if (target === 'itemShop') target = 'slime';
    if (target === 'stable') target = 'dragon';
    if (target === 'keep') target = 'king';
    if (item === 'sword' && target === 'hero') return this.giveSword();
    if (item === 'potions' && target === 'hero') return this.givePotions();
    if (item === 'maletter' && (target === 'owl')) return this.talkOwl();
    if (item === 'maletter' && target === 'dragon') return this.say([{ who: 'dragon', text: '兄ちゃんの手紙……読めた？' }]);
    if (item === 'maletter' && target === 'church') return this.clickChurch();
    if ((item === 'moonflower' || item === 'gold') && target === 'slime') return this.talkSlime();
    if (item === 'gold' && target === 'inn') return this.say([{ who: 'inn', text: '勇者のお友だちからは、お代はいらないよ！' }]);
    const talkers = { hero: 'それは……ぼくにはまだ早いかな。', slime: 'それは売りものじゃないよ〜。', goblin: 'そいつは打てねえな。', dragon: '……たべもの？ ちがうの？', king: 'うむ、それはそなたが持っておれ。', guard: '門の前では、それは使えませぬ！', owl: 'ホッホウ。それは占えんのう。', frog: 'それはボイラーには入れられないケロ。' };
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
    g.camera.position.set(16, 12, 16);
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
      g.camera.position.lerpVectors(camFrom, new V(4, 9, 12), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('勇者の城下町', `STAGE ${stageNo('hero')}`, 2400);
    await g.say([
      'ほしまわり号は、丘の上にお城のそびえる城下町に着いた。',
      '……あれ？ 景色が、なんだかカクカクして見える。まるで、ゲームの中の世界みたいだ。',
      'スライムがぷるぷる跳ね、市場からは威勢のいい声がきこえる。',
    ]);
    await g.moveCamera(new V(-6, 4.5, 3), new V(-8.6, 1.4, -3.4), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'たいへんケロ！ 線路の先の跳ね橋が上がってて、進めないケロ！' },
      { who: 'frog', text: '広場の噴水のところに、勇者っぽい子がいるケロ。聞いてみるケロ！' },
    ]);
    await g.moveCamera(innerWidth < innerHeight ? new V(0.5, 12, 21.5) : new V(0.5, 9, 18), new V(0.5, 1.4, 8.2), 2.0);
    g.cinematic = false;
    await this.talkHero();
  }

  async finale() {
    const g = this.g, R = this.R;
    await this.say([
      { who: 'king', text: 'ほう……剣も薬もそろい、たよれる道案内までおるか。' },
      { who: 'king', text: 'よかろう！ 勇者よ、旅立つがよい！ 門番、跳ね橋を下ろせーい！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    await g.moveCamera(new V(26, 7, 4), new V(17.5, 1.2, -6), 2.0);
    g.audio.play('hyoshigi');
    await g.wait(0.4);
    g.audio.play('creak');
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => { R.drawbridge.rotation.z = (1 - k) * Math.PI / 2; } });
    g.audio.play('clunk');
    g.audio.play('fanfare');
    for (const c of [this.slime, this.goblin, this.guard, this.dragon, ...this.minis]) c.hop();
    g.flag('departed');
    await g.moveCamera(new V(6, 10, 18), new V(0, 1.5, 4), 2.0);
    await this.say([
      '跳ね橋が、ごごごと音をたてて下りた！',
      { who: 'hero', text: 'みんな、ありがとう！ 行ってきます！' },
      { who: 'dragon', text: '兄ちゃんのところまで、道案内まかせて！' },
    ]);
    // 勇者は客車へ、子ドラゴンは列車といっしょに飛ぶ
    const h0 = this.hero.root.position.clone();
    const coach = this.train.coach.g.position.clone().add(new V(0, 0.8, 1.6));
    await g.moveCamera(new V(-3, 10, 3.5), new V(-10, 1, -4), 1.6);
    await g.tweens.add({ duration: 2.2, ease: Ease.inOut, onUpdate: (k) => {
      this.hero.root.position.lerpVectors(h0, coach, k);
      this.hero.root.position.y += Math.abs(Math.sin(k * 18)) * 0.15;
    } });
    this.hero.root.visible = false;
    await this.say([
      { who: 'frog', text: '勇者さんも乗ったケロ！ 次は……『まおうじょう』ケロ！ ドキドキするケロ〜！' },
      'あなたも客車に乗りこんだ。窓の外で、子ドラゴンがうれしそうに羽ばたいている。',
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
    this.dragonFollow = true;
    g.tweens.add({ duration: 7, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6.5; } });
    await g.moveCamera(new V(30, 7, 8), new V(24, 2, -6), 6);
    g.audio.play('whistle');
    await g.wait(2.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'hero'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'hero', '勇者と子ドラゴンを乗せて、ほしまわり号は跳ね橋をわたっていく。');
  }
}
