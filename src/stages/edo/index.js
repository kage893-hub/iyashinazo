import * as THREE from 'three';
import { makeBackdrop } from '../../lib/backdrop.js';
import { GRADES, mixGrade } from '../../core/postfx.js';
import { Motes } from '../../lib/livefx.js';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs, Birds } from '../../lib/environment.js';
import { makeFrog } from '../../lib/creatures.js';
import { makeKomainu, makeCrane, makeKawarabanCat, makeShiba, makeKappa, makeSquirrel, makeSparrow } from '../../lib/creatures-edo.js';
import { lerp, damp, softCircleTexture } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildRails } from '../../lib/rails.js';
import { Ease } from '../../core/tween.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildEdoDiorama, TRACK_Z } from './diorama.js';
import { ukiyoePanel, bellPanel, kawarabanHTML } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  koma: { name: '狛犬', icon: '🦁', color: '#7a7268', voice: 210 },
  crane: { name: 'ツルの鐘つき番', icon: '🕊️', color: '#2b3a6a', voice: 980 },
  cat: { name: 'ネコの瓦版屋', icon: '🐱', color: '#5a7a4a', voice: 760 },
  dog: { name: 'イヌの岡っ引き', icon: '🐕', color: '#a8601e', voice: 430 },
  kappa: { name: 'カッパの渡し守', icon: '🥒', color: '#3a8a3a', voice: 560 },
  squirrel: { name: 'リスの団子屋', icon: '🐿️', color: '#c8582e', voice: 1150 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

/** 線路：左上の空から降りて、宿場を横切り、町木戸をぬけて右の空へ */
function makeEdoPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-95, 30, 40), new V(-62, 24, 22), new V(-34, RAIL_Y, TRACK_Z), new V(-16, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-16, RAIL_Y, TRACK_Z), new V(20, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(20, RAIL_Y, TRACK_Z), new V(36, RAIL_Y, TRACK_Z), new V(50, 10, -18), new V(66, 18, -36)));
  p.add(new THREE.CubicBezierCurve3(new V(66, 18, -36), new V(82, 24, -52), new V(98, 28, -68), new V(116, 30, -88)));
  p.arcLengthDivisions = 800;
  return p;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * ステージ：江戸の宿場町
 * 目的：明け六つの鐘を鳴らして夜を明け、通行手形をもらって町木戸を通る
 */
export class EdoStage {
  constructor(game) {
    this.g = game;
    this.id = 'edo';
    this.title = '江戸の宿場町';
    this.questTitle = '🔔 江戸の朝をむかえる';
    this.hasRoof = false;
    this.roofLifted = false;
    this.dawn = 0; // 0=夜明け前 1=朝
    this.departing = false;
    this.trainSpeed = 0;
    this.glintT = 0;
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('edo');

    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#5a8ad8'); u.dMid.value.set('#f0b090'); u.dBot.value.set('#ffe0b0');
    u.nTop.value.set('#0a0e2a'); u.nMid.value.set('#1e2650'); u.nBot.value.set('#4a3a6a');
    u.moonDir.value.set(-0.6, 0.35, -0.7).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#2a3058', 60, 220);
    this.hemi = new THREE.HemisphereLight('#a8b4e8', '#4a4038', 1.0);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#c8d4ff', 1.6));
    sun.position.set(-12, 24, 12);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 80;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: 30, d: 22, seed: 31, grass: '#7fa060' });
    scene.add(this.island);
    this.clouds = makeClouds(33);
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('edo');
    scene.add(this.backdrop.group);
    this.smallIslands = [[-60, 6, -34, 4, 31], [54, -2, 28, 3, 32], [-74, 10, 18, 5, 33], [-24, -6, 62, 4, 34]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車
    this.path = makeEdoPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 15; // 機関車が x=-1 に止まる
    const L = this.path.getLength();
    this.tracks = buildRails(scene, this.path, { z: TRACK_Z, islandX: [-14.8, 15.4], pillars: [cl[0] - 6, cl[0] - 12, cl[0] - 18, cl[1] + 4, cl[1] + 8, cl[1] + 12].filter((s) => s > 0 && s < L) });
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();
    this.train.loco.firebox.material.emissiveIntensity = 2.2;
    this.train.loco.headlight.material.emissiveIntensity = 3;

    await this.g.loadingStep(0.3, '町並みを組み立てています…');
    this.R = buildEdoDiorama(scene);

    this.smoke = new Puffs(scene, { count: 70, color: '#e8e8f4', opacity: 0.7 });
    this.birds = new Birds(scene, 4, 37);
    this.sparkles = this._makeSparkles(scene);
    // 夜明け前は川べりのほたる、朝は光の中のほこり
    this.fireflies = new Motes(scene, { count: 40, color: '#d8ff9a', size: 0.12, area: { x: 28, z: 4, y0: 0.3, y1: 2.2 }, center: [0, 7.4], kind: 'firefly', opacity: 0.9 });
    this.dust = new Motes(scene, { count: 60, color: '#ffe6c0', size: 0.07, area: { x: 26, z: 16, y0: 0.4, y1: 5 }, kind: 'dust', opacity: 0 });
    this.glint = this._makeGlint(scene);

    await this.g.loadingStep(0.6, '住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();
    this._applyDawn(0);

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

  /** 川底の十手のきらめき */
  _makeGlint(scene) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softCircleTexture(), color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(2.6, 0.25, 7.7);
    s.userData.noPick = true;
    s.visible = false;
    scene.add(s);
    return s;
  }

  _placeCreatures(scene) {
    this.koma = makeKomainu({ open: true });
    this.koma.root.position.set(-11.7, 0, 2.9);
    this.koma.root.rotation.y = 0.3;
    this.koma2 = makeKomainu({ open: false });
    this.koma2.root.position.set(-9.5, 0, 2.9);
    this.koma2.root.rotation.y = -0.3;
    this.crane = makeCrane();
    this.crane.root.position.set(-3.6, 0, 4.2);
    this.crane.root.rotation.y = -0.4;
    this.crane.root.scale.setScalar(1.25);
    this.cat = makeKawarabanCat();
    this.cat.root.position.set(-0.3, 0, -0.8);
    this.dog = makeShiba();
    this.dog.root.position.set(10.9, 0, -0.9);
    this.dog.root.rotation.y = -0.4;
    this.kappa = makeKappa();
    this.kappa.root.position.set(7.5, 0.3, 7.9);
    this.kappa.root.rotation.y = -0.2;
    this.squirrel = makeSquirrel();
    this.squirrel.root.position.set(3.4, 0, -0.85);
    this.frog = makeFrog();
    this.frog.root.position.set(-3.2, 0.75, -3.3);
    this.frog.root.rotation.y = 0.3;
    this.sparrows = [[-1.6, 1.6], [0.2, 2.2], [4.6, 1.4], [6.8, 2.0], [9.2, 1.2]].map(([x, z], i) => {
      const s = makeSparrow();
      s.root.position.set(x, 0, z);
      s.root.rotation.y = i * 1.3;
      s.noIdleHop = true;
      return s;
    });
    this.creatures = [this.koma, this.koma2, this.crane, this.cat, this.dog, this.kappa, this.squirrel, this.frog, ...this.sparrows];
    for (const c of this.creatures) scene.add(c.root);
  }

  speakerCreature(who) {
    return { koma: this.koma, crane: this.crane, cat: this.cat, dog: this.dog, kappa: this.kappa, squirrel: this.squirrel, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('koma', this.koma.root, '狛犬（あ）', () => this.talkKoma());
    reg('koma2', this.koma2.root, '狛犬（うん）', () => this.say(['口をとじた狛犬。じっと、こちらを見ている。', { who: 'koma', text: '……うん。' }]));
    reg('crane', this.crane.root, 'ツルの鐘つき番', () => this.talkCrane());
    reg('cat', this.cat.root, 'ネコの瓦版屋', () => this.talkCat());
    reg('dog', this.dog.root, 'イヌの岡っ引き', () => this.talkDog());
    reg('kappa', this.kappa.root, 'カッパの渡し守', () => this.talkKappa());
    reg('squirrel', this.squirrel.root, 'リスの団子屋', () => this.talkSquirrel());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    this.sparrows.forEach((s, i) => reg(`sparrow${i}`, s.root, 'スズメ', () => { g.audio.play('chirp'); return this.say(['チュンチュン。朝のスズメが、えさをついばんでいる。']); }));
    reg('bellTower', R.bellTower, '時の鐘', () => this.clickBell());
    reg('kawarabanShop', R.kawaraban, '瓦版屋', () => this.talkCat());
    reg('dangoShop', R.dango, '団子屋', () => this.clickDangoShop());
    reg('gofuku', R.gofuku, '呉服屋', () => this.say([this.dawn > 0.5 ? '呉服屋。色とりどりの反物がならんでいる。' : '呉服屋。雨戸がぴったり閉まっている。']));
    reg('well', R.well, '井戸', () => this.clickWell());
    reg('bridge', R.bridge, '太鼓橋', () => this.clickRiver());
    reg('jitteSpot', R.jitteInRiver, '川底の光るもの', () => this.clickRiver());
    reg('boat', R.boat, '渡し舟', () => this.talkKappa());
    reg('pier', R.pier, '渡し場', () => this.talkKappa());
    reg('kido', R.kido, '町木戸', () => this.clickKido());
    reg('bansho', R.bansho, '自身番', () => this.talkDog());
    reg('hondo', R.hondo, '浅草寺の本堂', () => this.say(['浅草寺の本堂。大きな屋根の下に、ろうそくの灯りがゆれている。', '（そっと手をあわせた）']));
    reg('pagoda', R.pagoda, '五重塔', () => this.say(['五重塔。てっぺんの相輪が、空の明るさをうつしている。']));
    reg('kaminarimon', R.kaminarimon, '雷門', () => this.say(['雷門。真っ赤な大提灯に『雷門』と書いてある。', 'くぐると浅草寺の参道だ。']));
    reg('hinomi', R.hinomi, '火の見やぐら', () => this.say(['火の見やぐら。てっぺんに半鐘がつるしてある。', '町でいちばん高い場所だ。……なんとなく、未来でもこのあたりに高い塔が建ちそうな気がする。']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『えどのしゅく』……左は『てんくうのまち』、右は『しおのみなと』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。夜明け前の冷えた空気に、白い湯気をはいている。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。窓の明かりが、まだ暗い宿場を照らしている。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  applyState() {
    const f = this.g.flags, R = this.R;
    R.cucumbers.visible = !f.cucumberTaken;
    R.boatRope.visible = !f.ropeGiven;
    R.bellRope.visible = !!f.ropeFixed;
    R.brokenRope.visible = !f.ropeFixed;
    R.jitteInRiver.visible = !f.jitteGot;
    this.dog.jitte.visible = !!f.jitteReturned;
    this.dog.sad = !f.jitteReturned;
    this._kidoVisual(f.departed ? 1 : 0);
    this.dawn = f.dawn ? 1 : 0;
    this._applyDawn(this.dawn);
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  _kidoVisual(k) {
    const [a, b] = this.R.kidoDoors;
    a.rotation.y = -1.5 * k;
    b.rotation.y = 1.5 * k;
  }

  /** 夜明け前(0) → 朝(1) */
  _applyDawn(k) {
    const R = this.R, g = this.g;
    const u = this.sky.uniforms;
    u.night.value = lerp(0.85, 0.08, k);
    this.backdrop.set(k);
    g.setGrade(mixGrade(GRADES.edoNight, GRADES.edo, k));
    u.sunDir.value.set(0.9, lerp(-0.12, 0.22, k), -0.4).normalize();
    this.hemi.intensity = lerp(0.95, 1.25, k);
    this.hemi.color.set('#a8b4e8').lerp(new THREE.Color('#ffe8d0'), k);
    this.sun.intensity = lerp(1.5, 2.5, k);
    this.sun.color.set('#c8d4ff').lerp(new THREE.Color('#ffd8a8'), k);
    this.sun.position.set(lerp(-12, 18, k), lerp(24, 18, k), lerp(12, 6, k));
    g.scene.fog.color.set('#2a3058').lerp(new THREE.Color('#f0c8a8'), k);
    g.renderer.toneMappingExposure = lerp(1.18, 1.05, k);
    this.clouds.userData.mat.color.set('#6a6a98').lerp(new THREE.Color('#ffe8e0'), k);
    this.clouds.userData.mat.emissive.set('#1a1a40').lerp(new THREE.Color('#5a3a3a'), k);
    const off = 1 - smooth(0.2, 0.8, k);
    for (const m of R.streetLanterns) m.emissiveIntensity = 1.4 * off;
    for (const m of R.lampMats) m.emissiveIntensity = (m.userData.base ?? 1.4) * off;
    for (const L of R.streetLight) L.intensity = 2.4 * off;
    R.joyaLight.intensity = 1.8 * off;
    R.andonLight.intensity = 2.2 * off;
    R.andonMat.emissiveIntensity = 1.6 * off;
    for (const p of R.nightPools) p.material.opacity = 0.5 * off;
    if (this.fireflies) {
      this.fireflies.baseOpacity = 0.9 * off;
      this.fireflies.visible = off > 0.02;
      this.dust.mat.opacity = 0.55 * smooth(0.4, 1, k);
    }
    R.waterMat.color.set('#2a3a6a').lerp(new THREE.Color('#5a9ac8'), k);
    // 店が開く
    const open = k > 0.5;
    for (const s of R.shops) {
      if (s.alwaysOpen) continue;
      s.shutter.visible = !open;
      s.openG.visible = open;
    }
    if (R.grillMat) R.grillMat.emissiveIntensity = open ? 1.6 : 0;
    this.squirrel.root.visible = open;
    for (const s of this.sparrows) s.root.visible = open;
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R, f = g.flags;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.birds.update(dt, t);
    this.fireflies.update(dt, t);
    this.dust.update(dt, t);
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;
    // 舟のゆれ、のれん、鐘
    R.boat.position.y = 0.08 + Math.sin(t * 1.2) * 0.03;
    R.boat.rotation.z = Math.sin(t * 0.9) * 0.02;
    this.kappa.root.position.y = R.boat.position.y + 0.22;
    for (const s of R.shops) s.noren.rotation.x = Math.sin(t * 0.9 + s.g.position.x) * 0.06;
    if (this.bellSwing > 0) {
      this.bellSwing -= dt;
      R.bell.rotation.z = Math.sin(t * 9) * 0.03 * this.bellSwing;
      R.shumoku.rotation.z = -0.05 + Math.max(0, this.bellSwing - 0.6) * 0.6;
    }
    // 川底のきらめき（朝になると見える）
    const showGlint = this.dawn > 0.6 && !f.jitteGot;
    this.glint.visible = showGlint;
    if (showGlint) {
      this.glintT += dt;
      const k = (this.glintT % 2.2) / 2.2;
      this.glint.material.opacity = Math.max(0, Math.sin(k * Math.PI * 2)) * 0.9;
      this.glint.scale.setScalar(0.4 + Math.sin(k * Math.PI) * 0.3);
    }
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
    if (!f.introDone) return [{ text: '浅草寺の狛犬に話しかけよう', done: false }];
    const all = f.printed && f.dawn && f.tegata;
    const q = [
      { text: '🗞 瓦版を刷る', done: !!f.printed },
      { text: '🔔 明け六つの鐘を鳴らす', done: !!f.dawn },
      { text: '📜 通行手形をもらう', done: !!f.tegata },
    ];
    if (all) q.push({ text: '🦁 狛犬に知らせる', done: !!f.departed });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    if (!f.introDone) return H('intro', '雷門をくぐった先、浅草寺の本堂の前にいる狛犬（口をあけているほう）に話しかけよう。');
    if (f.printed && f.dawn && f.tegata) return H('final', '準備はそろった！ 浅草寺の狛犬に知らせよう。');
    if (!f.printed) return H('print', '通りの左の『瓦版屋』のネコに話しかけよう。', '版木合わせは、こまを2つ選ぶと入れかわる。左上に『江戸名所』の題、右上に赤い朝日、左下に大波。');
    if (!f.dawn) {
      if (!f.ropeFixed) {
        if (has('rope')) return H('fixRope', '持ち物の『舫い綱』を選んで、『時の鐘』に使おう。');
        if (has('cucumber')) return H('kappa', '持ち物の『キュウリ』を選んで、渡し場のカッパに使おう。');
        if (f.kappaTalked) return H('cucumber', 'カッパはキュウリが大好物。通りの手前の『井戸』を調べてみよう。');
        if (f.craneTalked) return H('rope', '鐘の引き綱が切れている。綱がありそうなのは……川の渡し舟。右手前の渡し場のカッパに話しかけよう。');
        return H('crane', '時の鐘の下にいるツルの鐘つき番に話しかけよう。');
      }
      return H('bell', '瓦版のとおりに鐘を撞こう。持ち物の『瓦版』を2回押すと読み返せる。', '「撞く」を3回 → 「間をおく」 → 「撞く」を6回。');
    }
    if (!f.tegata) {
      if (has('jitte')) return H('return', '持ち物の『十手』を選んで、イヌの岡っ引きに使おう。');
      if (has('dango')) return H('dive', '持ち物の『みたらし団子』を選んで、カッパに使おう。');
      if (!f.dogTalked) return H('dog', '町木戸の横の番所にいる、イヌの岡っ引きに話しかけよう。');
      if (!f.jitteSeen) return H('river', '瓦版によると、十手は太鼓橋から川へ落ちたらしい。明るくなった今なら……『太鼓橋』を調べよう。');
      if (!f.kappaAsked) return H('ask', '川底の十手は深くて届かない。泳ぎの名人、カッパにたのもう。');
      return H('dango', 'カッパは団子が食べたいらしい。開店した『団子屋』のリスに話しかけよう。');
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

  /** 瓦版は 2回押すと読める */
  inspectItem(id) {
    if (id !== 'kawaraban') return false;
    this.g.audio.play('paper');
    this.g.ui.openPanel({ title: '瓦版', body: kawarabanHTML(), cls: 'wide' });
    return true;
  }

  // =========================================================
  // 共通
  // =========================================================
  say(lines) { return this.g.say(lines); }

  focus(obj, dist) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(4, Math.max(0.8, p.y + 0.5)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined });
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
    if (f.printed && f.dawn && f.tegata) {
      await this.say(['これで準備はそろった。浅草寺の狛犬に知らせよう！']);
      this.g.refreshQuests();
    }
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkKoma() {
    const f = this.g.flags;
    this.focus(this.koma.root, 16);
    if (!f.introDone) return this.komaIntro();
    if (f.printed && f.dawn && f.tegata) return this.finale();
    const lines = [];
    if (!f.printed) lines.push({ who: 'koma', text: '時の鐘の撞きかたは、瓦版屋のネコがよう知っておる。' });
    if (!f.dawn) lines.push({ who: 'koma', text: '明け六つの鐘が鳴らねば、この町の朝ははじまらん。' });
    else if (!f.tegata) lines.push({ who: 'koma', text: '朝になったのう。あとは岡っ引きの親分から、通行手形をもらうことじゃ。' });
    await this.say(lines);
  }

  async komaIntro() {
    const g = this.g;
    await this.say([
      { who: 'koma', text: 'ほう……星の線路をわたってくる列車とは、めずらしい客じゃ。' },
      { who: 'koma', text: 'わしは浅草寺の狛犬。となりの「うん」の相棒と、もう長いことこの町を見守っておる。' },
      { who: 'koma', text: 'じゃが今朝は困ったことに、【明け六つの鐘】がまだ鳴らん。鐘が鳴らねば夜は明けず、宿場の【町木戸】も開かんのじゃ。' },
      { who: 'koma', text: 'それに、木戸を通るには【通行手形】がいる。手形を書くのは、番所の岡っ引きの親分じゃ。' },
      { who: 'koma', text: '鐘の撞きかたは、毎朝【瓦版】に刷ってある。まずは瓦版屋のネコをたずねるとよい。' },
      { who: 'koma', text: '……なに、わしか？ わしはここから動けん。二百年たっても、きっとここに座っとるじゃろうて。' },
    ]);
    g.flag('introDone');
    g.note('ed-goal', '狛犬のことば', '<b>明け六つの鐘</b>が鳴れば夜が明け、町木戸が開く。<br>木戸を通るには、岡っ引きの親分が書く<b>通行手形</b>がいる。<br>鐘の撞きかたは<b>瓦版</b>にのっている。');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async talkFrog() {
    this.focus(this.frog.root);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.tegata) return this.say([{ who: 'frog', text: '手形があれば、木戸を通れるケロ！ 狛犬さまに知らせるケロ！' }]);
    if (f.dawn) return this.say([{ who: 'frog', text: '明るくなったケロ！ あとは木戸を通る手形がいるケロ〜。' }]);
    await this.say([{ who: 'frog', text: '線路の先の木戸が閉まってて、進めないケロ……。まだ夜明け前で、まっくらケロ。' }]);
  }

  async talkCat() {
    const g = this.g, f = g.flags;
    this.focus(this.cat.root, 15);
    g.audio.play('meow');
    if (f.printed) {
      if (!g.has('kawaraban')) { g.give('kawaraban'); return; }
      return this.say([{ who: 'cat', text: f.dawn ? 'いい朝だニャ。瓦版、よく売れてるニャ！' : '瓦版は持ち物から読めるニャ。鐘の撞きかた、よーく見るニャ。' }]);
    }
    if (!f.catTalked) {
      await this.say([
        { who: 'cat', text: 'おや、早いお客さんだニャ。けさの瓦版を刷るところだったんだけど……' },
        { who: 'cat', text: 'さっきの風で、版木のこまがばらばらになっちゃったニャ！ これじゃ刷れないニャ〜。' },
        { who: 'cat', text: '絵柄は『江戸名所』。富士のお山に赤い朝日、左下には大波……手伝ってくれるかニャ？' },
      ]);
      g.flag('catTalked');
    }
    return this.openUkiyoe();
  }

  openUkiyoe() {
    const g = this.g;
    let pending = false;
    ukiyoePanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.printKawaraban();
        pending = false;
      },
    });
    return this.waitPanel(() => pending);
  }

  async printKawaraban() {
    const g = this.g;
    g.audio.play('paper');
    await this.say([{ who: 'cat', text: 'もとにもどったニャ！ それっ、ぺったん、ぺったん……' }]);
    g.audio.play('paper');
    await g.wait(0.4);
    g.flag('printed');
    g.give('kawaraban');
    g.note('ed-bell', '時の鐘の撞きかた（瓦版）', 'はじめに<b>捨て鐘を三つ</b>。ひと息<b>間をおいて</b>、刻の数だけ撞く。<br>明け六つなら<b>六つ</b>。');
    g.note('ed-jitte', '親分の十手（瓦版）', 'ゆうべ<b>太鼓橋</b>で居眠りして、十手を川へ落とした。<br>夜が明けて明るくなれば、川底に光って見えるかも。');
    this.questDone('瓦版が刷れた！');
    await this.say([{ who: 'cat', text: '刷りたての一枚、あげるニャ！ 鐘の撞きかたも、親分の十手のことも書いてあるニャ。' }]);
    g.audio.play('paper');
    g.ui.openPanel({ title: '瓦版', body: kawarabanHTML(), cls: 'wide' });
    await this.waitPanel();
    await this.say(['（瓦版は、持ち物を2回押すといつでも読み返せる）']);
    await this.checkReady();
  }

  async talkCrane() {
    const g = this.g, f = g.flags;
    this.focus(this.crane.root, 15);
    g.audio.play('crane');
    if (f.dawn) return this.say([{ who: 'crane', text: 'ありがとう。おかげで、きょうも江戸の朝がはじまりました。' }]);
    if (f.ropeFixed) return this.openBell();
    if (g.has('rope')) return this.fixRope();
    if (!f.craneTalked) {
      await this.say([
        { who: 'crane', text: 'ああ、困りました……。明け六つの鐘を撞こうとしたら、撞木の【引き綱】がぷっつり切れてしまって。' },
        { who: 'crane', text: 'じょうぶな綱さえあれば、すぐに結びなおせるのですが。' },
      ]);
      g.flag('craneTalked');
      g.note('ed-rope', '撞木の引き綱', '時の鐘の引き綱が切れている。<b>じょうぶな綱</b>があれば、ツルが結びなおせる。');
      return;
    }
    await this.say([{ who: 'crane', text: 'じょうぶな綱……川の渡し舟なら、予備の綱がありそうですね。' }]);
  }

  async fixRope() {
    const g = this.g, R = this.R;
    if (!g.has('rope')) return this.clickBell();
    this.focus(R.bellTower, 15);
    g.take('rope');
    g.audio.play('crank');
    await this.say([{ who: 'crane', text: 'おお、じょうぶな綱！ ちょっとお待ちを……くるくる、きゅっ。' }]);
    R.bellRope.visible = true;
    R.brokenRope.visible = false;
    g.flag('ropeFixed');
    await this.say([{ who: 'crane', text: 'これで撞けます。……ですが、わたし、撞きかたをすっかり忘れてしまって。あなたが撞いてくださいませんか？' }]);
    return this.openBell();
  }

  async clickBell() {
    const g = this.g, f = g.flags;
    this.focus(this.R.bellTower, 15);
    if (f.dawn) return this.say(['時の鐘。朝日をあびて、青銅がにぶく光っている。']);
    if (!f.ropeFixed) {
      if (g.has('rope')) return this.fixRope();
      const lines = ['時の鐘。大きな青銅の鐘と、それを撞く丸太（撞木）がつるしてある。', '撞木の引き綱が切れていて、撞けない。'];
      await this.say(lines);
      if (!f.craneTalked) return this.talkCrane();
      return;
    }
    return this.openBell();
  }

  openBell() {
    const g = this.g;
    let pending = false;
    bellPanel(g.ui, g.audio, {
      onStrike: () => { this.bellSwing = 1.4; },
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.dawnBreaks();
        pending = false;
      },
    });
    return this.waitPanel(() => pending);
  }

  async dawnBreaks() {
    const g = this.g;
    g.cinematic = true;
    await g.moveCamera(new V(6, 9, 18), new V(1, 1.5, 1), 2.0);
    g.audio.play('chime');
    const from = this.dawn;
    await g.tweens.add({ duration: 5, ease: Ease.inOut, onUpdate: (k) => { this.dawn = lerp(from, 1, k); this._applyDawn(this.dawn); } });
    g.flag('dawn');
    g.audio.play('chirp');
    g.audio.play('hyoshigi');
    g.cinematic = false;
    await this.say([
      'ゴーン……と鐘の余韻がひびくなか、東の空がしらじらと明けていく。',
      '雨戸がからりと開き、のれんがかかり、スズメたちが通りに降りてきた。',
      '宿場町に、朝がきた！',
    ]);
    this.questDone('明け六つの鐘が鳴った！');
    await this.say([{ who: 'crane', text: 'ありがとうございます。これで町じゅうが目をさましました。' }]);
    await this.checkReady();
  }

  async clickWell() {
    const g = this.g, f = g.flags;
    this.focus(this.R.well, 14);
    if (f.cucumberTaken) return this.say(['井戸の水は、ひんやりつめたい。']);
    await this.say(['井戸のそばの桶に、キュウリが冷やしてある。', '「ご自由にどうぞ　団子屋」と書いた札がついている。']);
    this.R.cucumbers.visible = false;
    g.give('cucumber');
    g.flag('cucumberTaken');
  }

  async talkKappa() {
    const g = this.g, f = g.flags;
    this.focus(this.kappa.root, 15);
    g.audio.play('kappa');
    if (f.jitteGot) return this.say([{ who: 'kappa', text: 'かっぱっぱ。団子、うまかったぜ！ また乗ってけよ。' }]);
    if (g.has('dango') && f.dawn) return this.giveDango();
    if (g.has('cucumber') && !f.ropeGiven) return this.giveCucumber();
    if (f.dawn && f.jitteSeen) {
      g.flag('kappaAsked');
      g.note('ed-dango', 'カッパにたのむ', '川底の十手は深くてカッパにしか取れない。<b>団子</b>を食べれば潜ってくれる。');
      return this.say([
        { who: 'kappa', text: '川底の光るもん？ ああ、ありゃ十手だな。あそこは深いんだ、カッパじゃなきゃ取れねえ。' },
        { who: 'kappa', text: '取ってきてやりてえが……朝めしまだでよ。腹ぺこで潜れねえ。団子でもあればなあ。' },
      ]);
    }
    if (!f.kappaTalked) {
      g.flag('kappaTalked');
      g.note('ed-kappa', 'カッパの渡し守', '腹ぺこ。<b>キュウリ</b>があれば、なんでも聞いてくれるらしい。');
      return this.say([
        { who: 'kappa', text: 'かっぱっぱ。渡し守のカッパさまだ。こんな夜明け前に、舟は出さねえぜ。' },
        { who: 'kappa', text: 'それより腹がへったなあ。【キュウリ】でもありゃあ、なんでも聞いてやるんだが。' },
      ]);
    }
    await this.say([{ who: 'kappa', text: f.ropeGiven ? '綱は役に立ったかい？' : 'キュウリ、キュウリ……どっかにねえかなあ。' }]);
  }

  async giveCucumber() {
    const g = this.g, R = this.R;
    g.take('cucumber');
    g.audio.play('pop');
    await this.say([
      { who: 'kappa', text: 'おおっ、キュウリ！ ぽりぽり……うめえ！' },
      { who: 'kappa', text: '礼だ、なんでも言いな。……綱？ 舟の予備の【舫い綱】でよけりゃ持ってきな。' },
    ]);
    R.boatRope.visible = false;
    g.give('rope');
    g.flag('ropeGiven');
  }

  async giveDango() {
    const g = this.g, R = this.R;
    g.take('dango');
    await this.say([{ who: 'kappa', text: 'みたらし団子！ もぐもぐ……よっしゃ、力がわいてきた。ひと潜りしてくるぜ！' }]);
    g.cinematic = true;
    const k0 = this.kappa.root.position.clone();
    await this.g.moveCamera(new V(5, 4.5, 13), new V(3, 0.5, 7.6), 1.2);
    g.audio.play('splash');
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => { this.kappa.root.position.lerpVectors(k0, new V(2.6, -0.6, 7.7), k); } });
    await g.wait(0.8);
    R.jitteInRiver.visible = false;
    g.audio.play('splash');
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => { this.kappa.root.position.lerpVectors(new V(2.6, -0.6, 7.7), k0, k); } });
    g.cinematic = false;
    this.kappa.hop();
    g.flag('jitteGot');
    await this.say([{ who: 'kappa', text: 'ほらよ、十手だ。親分に返してやんな。' }]);
    g.give('jitte');
  }

  async talkSquirrel() {
    const g = this.g, f = g.flags;
    this.focus(this.squirrel.root, 14);
    g.audio.play('squeak');
    if (f.dangoGot) return this.say([{ who: 'squirrel', text: 'まいどあり〜！ またきてね！' }]);
    await this.say([
      { who: 'squirrel', text: 'いらっしゃいませ〜！ 朝いちばんのお客さんだ！' },
      { who: 'squirrel', text: '開店のおまけに、焼きたての【みたらし団子】をどうぞ！ 井戸のキュウリ、役に立った？' },
    ]);
    g.give('dango');
    g.flag('dangoGot');
  }

  async clickDangoShop() {
    if (this.dawn > 0.5) return this.talkSquirrel();
    this.focus(this.R.dango, 14);
    return this.say(['団子屋。雨戸に「明け六つより開店」の貼り紙がある。']);
  }

  async talkDog() {
    const g = this.g, f = g.flags;
    this.focus(this.dog.root, 15);
    g.audio.play('wan');
    if (f.tegata) return this.say([{ who: 'dog', text: '手形は持ったな？ 狛犬さまのお許しが出たら、木戸を開けてやるワン。' }]);
    if (g.has('jitte')) return this.returnJitte();
    if (!f.dogTalked) {
      g.flag('dogTalked');
      g.note('ed-dog', 'イヌの岡っ引き', '<b>十手</b>をなくしてしょんぼり。十手がないと手形に判をおせない。');
      return this.say([
        { who: 'dog', text: 'ワン！ 町木戸は【明け六つ】まで開けられねえ決まりだ。それに、通るには【通行手形】がいる。' },
        { who: 'dog', text: '手形を書いてやりてえところだが……（しょんぼり）おいらの十手をなくしちまってよ。' },
        { who: 'dog', text: '十手のねえ岡っ引きに、判をおす資格はねえ……ワン……。' },
      ]);
    }
    await this.say([{ who: 'dog', text: '十手、どこへやっちまったかなあ……ゆうべは太鼓橋で、うとうとしてたんだが……。' }]);
  }

  async returnJitte() {
    const g = this.g;
    g.take('jitte');
    this.dog.jitte.visible = true;
    this.dog.sad = false;
    this.dog.hop();
    g.audio.play('wan');
    await this.say([
      { who: 'dog', text: 'ワンワン！ おいらの十手！ 川の底から見つけてくれたのか！' },
      { who: 'dog', text: 'よし、恩にきるぜ。いますぐ手形を書いてやる。……さらさら、ぽんっ！' },
    ]);
    g.flag('jitteReturned');
    g.flag('tegata');
    g.give('tegata');
    this.questDone('通行手形をもらった！');
    await this.checkReady();
  }

  // =========================================================
  // 場所
  // =========================================================
  async clickRiver() {
    const g = this.g, f = g.flags;
    this.focus(this.R.bridge, 15);
    if (f.jitteGot) return this.say(['太鼓橋。川面に朝日がきらきらと映っている。']);
    if (!f.dawn) return this.say(['太鼓橋。川はまっくらで、底はまったく見えない。']);
    if (!f.jitteSeen) {
      g.flag('jitteSeen');
      g.note('ed-river', '川底の十手', '太鼓橋の下の川底で、十手が光っている。深くて手が届かない。');
      g.audio.play('twinkle');
      return this.say(['橋の上から川をのぞくと、朝日をうけて、川底で何かがきらりと光った。', '……十手だ！ でも深くて、とても手が届かない。', '（泳ぎの名人にたのめれば……）']);
    }
    await this.say(['川底で十手が光っている。深くて手が届かない。']);
  }

  async clickKido() {
    const f = this.g.flags;
    this.focus(this.R.kido, 18);
    if (f.departed) return this.say(['町木戸は大きく開いている。']);
    if (!f.dawn) return this.say(['線路をふさぐ町木戸。夜のあいだは閉ざされている。', '「明け六つ　開門」と札がかかっている。']);
    return this.say(['町木戸。夜は明けたが、手形がないと通してもらえない。']);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    if (target === 'boat' || target === 'pier') target = 'kappa';
    if (target === 'bansho') target = 'dog';
    if (target === 'crane') target = item === 'rope' ? 'bellTower' : target;
    if (item === 'cucumber' && target === 'kappa') {
      if (f.ropeGiven) return this.say([{ who: 'kappa', text: 'もう腹いっぱいだぜ。' }]);
      this.focus(this.kappa.root, 15);
      return this.giveCucumber();
    }
    if (item === 'rope' && target === 'bellTower') return this.fixRope();
    if (item === 'dango' && target === 'kappa') {
      if (!f.jitteSeen) return this.say([{ who: 'kappa', text: '団子？ ありがてえが、とっといてくれよ。なんか用があるときにな。' }]);
      this.focus(this.kappa.root, 15);
      return this.giveDango();
    }
    if (item === 'jitte' && target === 'dog') { this.focus(this.dog.root, 15); return this.returnJitte(); }
    if (item === 'tegata' && (target === 'koma' || target === 'kido' || target === 'dog')) {
      if (target === 'koma') return this.talkKoma();
      return this.say([{ who: 'dog', text: '手形はたしかに。あとは狛犬さまのお許しだワン。' }]);
    }
    if (item === 'kawaraban') {
      if (target === 'bellTower' || target === 'crane') return this.say([{ who: 'crane', text: '瓦版に撞きかたが？ では、そのとおりに撞いてみてください。' }]);
      if (target === 'dog') return this.say([{ who: 'dog', text: 'げっ、瓦版にのっちまったのか……はずかしいワン。' }]);
    }
    if (item === 'cucumber' && target === 'dog') return this.say([{ who: 'dog', text: 'キュウリはカッパの好物だワン。' }]);
    const talkers = { koma: 'それは、そなたが持っておくがよい。', cat: 'それはいらないニャ。', crane: 'それでは撞木は結べませんね……。', dog: 'それは十手じゃねえワン。', kappa: 'それじゃ腹はふくれねえなあ。', squirrel: 'それはお店のものじゃないよ〜。', frog: 'それはボイラーには入れられないケロ。' };
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
    await g.ui.banner('江戸の宿場町', `STAGE ${stageNo('edo')}`, 2400);
    await g.say([
      'ほしまわり号は、夜明け前の宿場町に着いた。',
      '瓦屋根の町家がならび、遠くに五重塔のかげが見える。……ここは、ずっとむかしの江戸らしい。',
      'まだ空は暗く、町はしんと寝しずまっている。',
    ]);
    await g.moveCamera(new V(-1, 6, 3), new V(-4, 1.2, -5), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: '線路の先の【町木戸】が閉まってて、進めないケロ！' },
      { who: 'frog', text: '浅草寺の狛犬さまなら、何か知ってるかもケロ。' },
    ]);
    await g.moveCamera(innerWidth < innerHeight ? new V(-3, 11, 13) : new V(-4.5, 8.5, 9.5), new V(-10.6, 1.0, 2.9), 2.2);
    g.cinematic = false;
    await this.talkKoma();
  }

  async finale() {
    const g = this.g, R = this.R;
    await this.say([
      { who: 'koma', text: 'おお、瓦版も刷れ、鐘も鳴り、手形もそろったか。ようやった。' },
      { who: 'koma', text: '親分！ この旅のお方を通してやっておくれ！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    await g.moveCamera(new V(15.5, 4.5, -1.0), new V(9, 1.5, -6), 2.0);
    g.audio.play('wan');
    await g.wait(0.4);
    g.audio.play('hyoshigi');
    await g.wait(0.5);
    g.audio.play('creak');
    await g.tweens.add({ duration: 1.6, ease: Ease.inOut, onUpdate: (k) => this._kidoVisual(k) });
    g.audio.play('solve');
    for (const c of [this.cat, this.squirrel, this.dog, this.kappa, ...this.sparrows]) c.hop();
    await g.moveCamera(new V(4, 8, 14), new V(2, 1, 1), 2.0);
    await this.say([
      '町木戸が、ぎいっと大きく開いた。',
      '朝の宿場町は、もうすっかりにぎやかだ。',
      { who: 'koma', text: '達者でな。……いつかまた、どこかで会うこともあろう。わしは、ずっとここにおるからの。' },
    ]);
    await g.moveCamera(new V(-1, 6, 3), new V(-4, 1.2, -5), 1.8);
    await this.say([
      { who: 'frog', text: '出発するケロ〜！ 次は『しおのみなと』ケロ！' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
    g.flag('departed');
    g.refreshQuests();
    await this.departure();
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(15.5, 4.5, -1.0), new V(9, 1.5, -6), 2.0);
    g.audio.play('whistle');
    await g.wait(1.4);
    this.departing = true;
    g.tweens.add({ duration: 7, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6; } });
    await g.moveCamera(new V(16, 5.5, 0.5), new V(13, 1.5, -6), 6);
    g.audio.play('whistle');
    await g.wait(2.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'edo'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'edo', '朝日のなか、町木戸をくぐって、ほしまわり号は走っていく。');
  }
}
