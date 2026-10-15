import * as THREE from 'three';
import { makeBackdrop } from '../../lib/backdrop.js';
import { GRADES, mixGrade } from '../../core/postfx.js';
import { showStageClear } from '../clear.js';
import { stageNo } from '../../data/route.js';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs } from '../../lib/environment.js';
import { Motes } from '../../lib/livefx.js';
import { makeFrog, makeCat, makeCrow, makeRabbit } from '../../lib/creatures.js';
import { makeKomainu, makeCrane, makeKawarabanCat, makeShiba, makeKappa, makeSquirrel, makeSparrow } from '../../lib/creatures-edo.js';
import { makePanda, makePigeon, dressPolice, dressCaptain, dressCaster, dressWagashi, dressHappi } from '../../lib/creatures-japan.js';
import { makeSheep } from '../../lib/creatures-sky.js';
import { makeSeal } from '../../lib/creatures-port.js';
import { makeCapybara } from '../../lib/creatures-onsen.js';
import { makeElder } from '../../lib/creatures-kinoko.js';
import { makeBear } from '../../lib/creatures-toy.js';
import { makeHero } from '../../lib/sprites-hero.js';
import { makeMaou } from '../../lib/sprites-maou.js';
import { lerp, softCircleTexture, canvasTex, FONT } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildRails } from '../../lib/rails.js';
import { Ease } from '../../core/tween.js';
import { el } from '../../core/ui.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildEdoDiorama } from '../edo/diorama.js';
import { buildJapanDiorama, TRACK_Z, ISLAND, FLOOR, TOWER, STATION, VIA, HW, RIVER_Z0, RIVER_Z1 } from './diorama.js';
import { meishoPanel, MEISHO, tenuguiHTML, bellPanel2, subwayPanel, vendingPanel, tidePanel, pierBoardHTML } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  koma: { name: '狛犬', icon: '🦁', color: '#8a8274', voice: 200 },
  tsuru: { name: 'ツルの鐘守', icon: '🕊', color: '#c8402e', voice: 700 },
  risu: { name: 'リスの和菓子屋', icon: '🐿', color: '#c8783a', voice: 1150 },
  neko: { name: 'ネコのアナウンサー', icon: '🐱', color: '#d8a060', voice: 900 },
  inu: { name: '柴犬のおまわりさん', icon: '🐕', color: '#d88a3a', voice: 520 },
  kappa: { name: 'カッパの船長', icon: '🥒', color: '#4a9a4a', voice: 380 },
  ekicho: { name: '東京駅の駅長', icon: '🐈', color: '#25355e', voice: 760 },
  panda: { name: 'パンダ', icon: '🐼', color: '#2a2a30', voice: 300 },
  karasu: { name: 'カラス', icon: '🐦‍⬛', color: '#1d1f2b', voice: 640 },
  suzume: { name: 'スズメ', icon: '🐦', color: '#9a6a3a', voice: 1600 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  guest: { name: '旅の仲間たち', icon: '🚂', color: '#c9952a', voice: 600 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

const FROG_HOME = new V(-2.4, FLOOR, -3.3);
const LOCO_X = -1.6; // 浅草駅に止まる位置
const END_X = 27.2; // 終点・東京駅

function makeTokyoPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-140, 36, 52), new V(-96, 26, 30), new V(-52, RAIL_Y, TRACK_Z), new V(-36, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-36, RAIL_Y, TRACK_Z), new V(40, RAIL_Y, TRACK_Z)));
  p.arcLengthDivisions = 1000;
  return p;
}


/** 打ち上げ花火：光の点が飛びちり、尾を引きながら落ちていく */
class Fireworks {
  constructor(scene, n = 10, m = 90) {
    this.list = [];
    this.i = 0;
    for (let k = 0; k < n; k++) {
      const geo = new THREE.BufferGeometry();
      const dir = new Float32Array(m * 3), pos = new Float32Array(m * 3);
      for (let j = 0; j < m; j++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        const sp = 0.85 + Math.random() * 0.3;
        dir[j * 3] = r * Math.cos(a) * sp; dir[j * 3 + 1] = u * sp; dir[j * 3 + 2] = r * Math.sin(a) * sp;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('dir', new THREE.BufferAttribute(dir, 3));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uOrigin: { value: new V() }, uStart: { value: -99 }, uNow: { value: 0 }, uColor: { value: new THREE.Color('#ffffff') } },
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute vec3 dir; uniform vec3 uOrigin; uniform float uStart; uniform float uNow; varying float vA;
          void main() {
            float age = uNow - uStart;
            float k = clamp(age / 2.4, 0.0, 1.0);
            float spread = 7.0 * (1.0 - exp(-age * 2.2));
            vec3 p = uOrigin + dir * spread - vec3(0.0, 1.2 * age * age, 0.0);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (age < 0.0 || k >= 1.0) ? 0.0 : (820.0 / -mv.z) * (1.0 - k * 0.55);
            vA = (1.0 - k) * (0.75 + 0.25 * sin(age * 30.0 + dir.x * 40.0));
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; varying float vA;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            float core = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(mix(uColor, vec3(1.0), core * core * 0.6) * 2.2, core * vA);
          }`,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.renderOrder = 60;
      pts.userData.noPick = true;
      scene.add(pts);
      this.list.push(pts);
    }
  }

  burst(origin, color, now) {
    const p = this.list[this.i];
    this.i = (this.i + 1) % this.list.length;
    p.material.uniforms.uOrigin.value.copy(origin);
    p.material.uniforms.uStart.value = now;
    p.material.uniforms.uColor.value.set(color);
  }

  update(now) { for (const p of this.list) p.material.uniforms.uNow.value = now; }
}

/**
 * ステージ：現代日本（とうきょう）— 江戸の宿場町の二百年後（2倍の大きさ）
 * 目的：街の灯りをとりもどし、通行手形で終点・東京駅へ入る
 * しかけ：狛犬の鈴で「むかし目」になると、二百年前の江戸の町が重なって見える
 */
export class JapanStage {
  constructor(game) {
    this.g = game;
    this.id = 'japan';
    this.title = '現代日本';
    this.questTitle = '🗼 東京の灯りと、終点への道';
    this.departing = false;
    this.trainSpeed = 0;
    this.ghostK = 0;
    this.visionT = 0;
    this.ledX = 0;
  }

  homeView(portrait) {
    return portrait ? [new V(10, 74, 62), new V(0, 0.5, 1)] : [new V(14, 42, 60), new V(0, 0.5, 0)];
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('japan');
    g.bounds = { minX: -28, maxX: 28, minZ: -20, maxZ: 20 };
    g.controls.maxDistance = 120;

    // 夏の宵：夕焼けの名残と、群青の空
    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#3a4a8a'); u.dMid.value.set('#f0906a'); u.dBot.value.set('#ffc890');
    u.nTop.value.set('#060a24'); u.nMid.value.set('#1a2050'); u.nBot.value.set('#4a3a6a');
    u.night.value = 0.5;
    u.sunDir.value.set(-0.85, 0.06, -0.5).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#5a5a7a', 90, 300);
    g.renderer.toneMappingExposure = 1.15;
    this.hemi = new THREE.HemisphereLight('#b8c4f0', '#5a5050', 1.0);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffc8a0', 1.8));
    sun.position.set(-26, 30, 18);
    sun.castShadow = true;
    const sm = g.shadowSize();
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 30; sc.bottom = -30; sc.near = 5; sc.far = 120;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.08;
    scene.add(sun, sun.target);

    this.island = makeIslandBase({ w: ISLAND.w, d: ISLAND.d, seed: 71, grass: '#8a8a84' });
    scene.add(this.island);
    this.clouds = makeClouds(73);
    this.clouds.scale.setScalar(1.7);
    this.clouds.userData.mat.color.set('#8a7a9a');
    scene.add(this.clouds);
    this.backdrop = makeBackdrop('japan');
    scene.add(this.backdrop.group);
    this.smallIslands = [[-96, 6, -52, 5, 71], [88, -2, 40, 4, 72], [-110, 12, 30, 6, 73]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車
    this.path = makeTokyoPath();
    this.cl = this.path.getCurveLengths();
    this.stopS = this.sOf(LOCO_X);
    this.tracks = buildRails(scene, this.path, { z: TRACK_Z, islandX: [-29.8, 29.8], pillars: [this.cl[0] - 8, this.cl[0] - 16].filter((s) => s > 0) });
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();

    await this.g.loadingStep(0.25, '東京の街を組み立てています…');
    const R = (this.R = buildJapanDiorama(scene));
    await this.g.loadingStep(0.45, '二百年前の町を思いだしています…');
    this._buildGhost(scene);

    this.smoke = new Puffs(scene, { count: 60, color: '#f0f0f4', opacity: 0.6 });
    this.incense = new Puffs(scene, { count: 30, color: '#e8e4e0', opacity: 0.35 });
    this.fireworks = new Fireworks(scene);
    this.motes = new Motes(scene, { count: 60, color: '#ffe8b0', size: 0.1, area: { x: 56, z: 40, y0: 0.5, y1: 9 }, kind: 'firefly', opacity: 0.4 });
    this.sparkles = this._makeSparkles(scene);

    await this.g.loadingStep(0.6, '街の住人たちを呼んでいます…');
    this._placeCreatures(scene);
    this._registerInteractables();
    await this.g.loadingStep(0.75, '仕上げをしています…');
    this._optimize();
    this._drawVision(0);
    this._drawLED();

    g.ui.onLine = (who) => {
      const c = this.speakerCreature(who);
      if (c) c.talk(2.2);
    };
  }

  sOf(x) { return this.cl[0] + (x + 36); }

  /** むかし目：江戸の宿場町を、半透明の幻として同じ場所に重ねる */
  _buildGhost(scene) {
    const holder = new THREE.Group();
    const E = buildEdoDiorama(holder);
    const ghost = (this.ghost = E.root);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: '#f0c070', transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false });
    this.ghostLine = new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0, depthWrite: false, depthTest: false, wireframe: true, fog: false });
    const kill = [];
    ghost.traverse((o) => {
      if (o.isLight) { kill.push(o); return; }
      if (o.isSprite || o.isPoints) { kill.push(o); return; }
      if (!o.isMesh) return;
      o.userData.noPick = true;
      o.castShadow = false;
      o.receiveShadow = false;
      // 地面・道・ホーム・川は重ねない（建物だけを幻にする）
      const wp = o.getWorldPosition(new V());
      const flat = o.geometry.type === 'ShapeGeometry' || (o.geometry.type === 'PlaneGeometry' && wp.y < 0.2) || o.geometry.type === 'CircleGeometry' || (o.geometry.parameters && o.geometry.parameters.height !== undefined && o.geometry.parameters.height < 0.06 && wp.y < 0.1);
      if (flat || (Math.abs(wp.x + 7.6) < 5.2 && wp.z < -2.4 && wp.z > -5.2 && wp.y < 1.0)) { kill.push(o); return; }
      o.material = this.ghostMat;
      o.renderOrder = 50;
    });
    for (const o of kill) o.parent && o.parent.remove(o);
    // 雨戸を外して、のれんの出た姿で
    for (const s of E.shops || []) { if (s.shutter) s.shutter.visible = false; if (s.openG) s.openG.visible = true; }
    if (E.ice) E.ice.visible = false;
    ghost.traverse((o) => { if (o.userData) o.userData.dynamic = false; });
    holder.remove(ghost);
    scene.add(ghost);
    mergeStatic(ghost);
    ghost.traverse((o) => { if (o.isMesh) { o.material = this.ghostMat; o.renderOrder = 50; o.userData.noPick = true; } });
    // 井戸の札（むかし目でしか見えない）
    const plate = canvasTex(256, 160, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(250,240,210,0.95)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#3a2418'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 26px ${FONT}`; ctx.fillText('井戸の札', w / 2, 30);
      ctx.font = `900 64px ${FONT}`; ctx.fillText('四七弐', w / 2, 100);
    });
    this.plateMat = new THREE.MeshBasicMaterial({ map: plate, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false });
    this.plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), this.plateMat);
    this.plate.position.set(2.1, 1.35, 5.25);
    this.plate.renderOrder = 51;
    this.plate.userData.noPick = true;
    scene.add(this.plate);
    ghost.visible = false;
    this.plate.visible = false;
  }

  _optimize() {
    if (new URLSearchParams(location.search).has('nomerge')) return;
    const creatureRoots = new Set(this.creatures.map((c) => c.root));
    const roots = [this.island, this.tracks, this.R.root, ...this.smallIslands.map((s) => s.o)];
    for (const [, it] of this.g.interactables) if (!creatureRoots.has(it.object)) roots.push(it.object);
    for (const c of this.creatures) c.root.traverse((o) => { if (o !== c.root && !o.isMesh) o.userData.dynamic = true; });
    this.g.scene.traverse((o) => { if (o.userData.dynamic && o !== this.ghost) roots.push(o); });
    for (const c of this.creatures) roots.push(c.root);
    let n = 0;
    for (const r of roots) n += mergeStatic(r);
    this.g.refreshInteractableMeshes();
    console.info(`[optimize] merged ${n} meshes`);
  }

  _makeSparkles(scene) {
    const tex = softCircleTexture();
    const list = [];
    for (let i = 0; i < 48; i++) {
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
    const put = (c, x, y, z, ry = 0) => { c.root.position.set(x, y, z); c.root.rotation.y = ry; return c; };
    this.frog = put(makeFrog(), FROG_HOME.x, FROG_HOME.y, FROG_HOME.z, -0.3);
    this.koma = put(makeKomainu({ open: true }), -11.7, 0, 2.9, 0.15);
    this.koma2 = put(makeKomainu({ open: false }), -9.5, 0, 2.9, -0.15);
    this.tsuru = put(dressHappi(makeCrane()), -3.4, 0, 4.4, -0.3);
    this.risu = put(dressWagashi(makeSquirrel()), -6.7, 0, 3.6, 1.1);
    this.neko = put(dressCaster(makeKawarabanCat()), 1.0, 0, 3.3, 0.2);
    this.inu = put(dressPolice(makeShiba()), 10.8, 0, -0.9, -0.3);
    this.kappa = put(dressCaptain(makeKappa()), 8.9, 0.45, 7.75, -0.4);
    this.ekicho = put(makeCat(), 21.0, 0, 1.2, -0.1);
    this.panda = put(makePanda(), -24.4, 0, 13.3, 0.35);
    this.karasu = put(makeCrow(), -24.5, 3.9, 2.8, 0.3);
    if (this.karasu.key) this.karasu.key.visible = false;
    this.suzume = put(makeSparrow(), TOWER.x + 0.5, 9.75, TOWER.z + 1.2, 0);
    this.pigeons = [[-11.0, 1.8, 0.3], [-10.0, 2.0, -0.6], [-11.6, 5.9, 2.0], [-9.6, 6.0, 1.0], [-8.8, 1.5, 2.6]].map(([x, z, ry]) => { const p = put(makePigeon(), x, 0, z, ry); p.root.scale.setScalar(0.9); return p; });
    this.creatures = [this.frog, this.koma, this.koma2, this.tsuru, this.risu, this.neko, this.inu, this.kappa, this.ekicho, this.panda, this.karasu, this.suzume, ...this.pigeons];
    for (const c of this.creatures) scene.add(c.root);
    this.kappaHome = this.kappa.root.position.clone();
    this.busHome = R.waterBus.position.clone();
  }

  speakerCreature(who) {
    return { koma: this.koma, tsuru: this.tsuru, risu: this.risu, neko: this.neko, inu: this.inu, kappa: this.kappa, ekicho: this.ekicho, panda: this.panda, karasu: this.karasu, suzume: this.suzume, frog: this.frog }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    reg('koma', this.koma.root, '狛犬（あ）', () => this.talkKoma());
    reg('koma2', this.koma2.root, '狛犬（うん）', () => this.talkKoma());
    reg('tsuru', this.tsuru.root, 'ツルの鐘守', () => this.talkTsuru());
    reg('bell', R.bellTower, '時の鐘', () => this.clickBell());
    reg('risu', this.risu.root, 'リスの和菓子屋', () => this.talkRisu());
    reg('wagashi', R.wagashi, '和菓子 りす屋', () => this.talkRisu());
    reg('subway', R.subway, '銀座線の入口', () => this.clickSubway());
    reg('neko', this.neko.root, 'ネコのアナウンサー', () => this.talkNeko());
    reg('vision', R.visionBldg, '大型ビジョン', () => this.talkNeko());
    reg('inu', this.inu.root, '柴犬のおまわりさん', () => this.talkInu());
    reg('koban', R.koban, '交番', () => this.talkInu());
    reg('kappa', this.kappa.root, 'カッパの船長', () => this.talkKappa());
    reg('waterBus', R.waterBus, '水上バス', () => this.talkKappa());
    reg('timetable', R.timetable, '時刻表', () => this.readBoard('time'));
    reg('tideBoard', R.tideBoard, '潮見表', () => this.readBoard('tide'));
    reg('ekicho', this.ekicho.root, '東京駅の駅長', () => this.talkEkicho());
    reg('station', R.station, '東京駅', () => this.talkEkicho());
    reg('signal', R.railSignal, '線路の信号', () => this.clickSignal());
    reg('crossing', R.crossing, '踏切', () => this.say(['線路の踏切。江戸のころは、ここに町木戸があった。', this.g.flags.finaleDone ? '' : '奥の信号は、赤のまま。']));
    reg('vending', R.vending, '自動販売機', () => this.clickVending());
    reg('tower', R.tower, '東京タワー', () => this.clickTower());
    reg('platformClock', R.platformClock, 'ホームの時計', () => this.say(['浅草駅のホームの時計。針は「夜8時」をさしたまま、止まっている。', { who: 'frog', text: '街じゅうの時計が、夜8時で止まってるケロ……。' }]));
    reg('hachiko', R.hachiko, '犬の銅像', () => this.say(['駅前広場の、犬の銅像。台座に「待つ」と彫ってある。', { who: 'inu', text: 'ご先祖さまの友だちだったそうです。いまも、だれかを待っているんですって。' }]));
    reg('incense', R.incense, '常香炉', () => this.say(['浅草寺の常香炉。けむりを頭にかけると、かしこくなるらしい。', { who: 'frog', text: 'ぼくも、かけとくケロ……ケホッ。' }]));
    reg('kaminarimon', R.kaminarimon, '雷門', () => this.say(['朱ぬりの雷門と、大きな赤い提灯。', '二百年前と、まったく同じ場所に立っている。']));
    reg('hondo', R.hondo, '浅草寺の本堂', () => this.say(['浅草寺の本堂。江戸のころと同じように、大きな屋根がそびえている。']));
    reg('pagoda', R.pagoda, '五重塔', () => this.say(['五重塔。むかしと同じ、本堂の左に立っている。']));
    reg('ramen', R.ramen, 'ラーメン屋', () => this.say(['赤ちょうちんのラーメン屋。しょうゆのいいにおい。', 'のれんに、小さく「創業　団子のころより」と書いてある。']));
    reg('fashion', R.fashion, 'ファッションビル', () => this.say(['銀色の円筒のファッションビル。「109」の看板が光る。', '入口の銘板に「元・呉服 つる屋」とある。']));
    reg('cafe', R.cafe, '喫茶店', () => this.say(['レンガの純喫茶「つる」。ナポリタンとクリームソーダが名物らしい。']));
    reg('conbini', R.conbini, 'コンビニ', () => this.say(['24時間あいているコンビニ。……ここは、江戸のころは原っぱだったらしい。']));
    reg('panda', this.panda.root, 'パンダ', () => this.talkPanda());
    reg('karasu', this.karasu.root, 'カラス', () => this.talkKarasu());
    reg('akiba', R.gameCenter, 'ゲームセンター', () => this.say(['秋葉原のゲームセンター。UFOキャッチャーの中に、カエルのぬいぐるみが……！', { who: 'frog', text: 'ぼく、あんなにかわいくないケロ！ ……ちょっとほしいケロ。' }]));
    reg('yagura', R.yagura, '盆おどりのやぐら', () => this.say(['上野公園の夏まつりのやぐら。ちょうちんが、ぐるりとかかっている。']));
    reg('rainbow', R.odaiba, 'お台場', () => this.say(['海の向こうの、白いつり橋と、丸い展望台のビル。']));
    reg('highway', R.highway, '首都高', () => this.say(['川ぞいにのびる首都高。江戸の太鼓橋のすぐわきを、高架が通っている。']));
    reg('bridge', R.bridge, '太鼓橋', () => this.say(['朱色の太鼓橋。首都高の高架のわきに、江戸のころのまま残っている。', this.g.flags.jitteSeen && !this.g.flags.jitteGot ? '橋の下の川底で、何かがきらりと光った。' : '']));
    reg('yamanote', R.yamanote, '山手線', () => this.say(['緑の帯の電車が、高架をぐるぐる走っている。']));
    reg('tocho', R.tocho, '高層ビル', () => this.say(['奥にそびえる、ふたごの高層ビル。']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『あさくさ』……右は『とうきょう（終点）』。', { who: 'frog', text: 'ここは……江戸の宿場の駅と、同じ場所ケロ。' }]));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。長い旅の最後の駅まで、あと少し。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  get progress() {
    const f = this.g.flags;
    return ['subwayDone', 'meishoDone', 'towerLit', 'ramuneGot', 'tegataGot'].filter((k) => f[k]).length;
  }

  applyState() {
    const f = this.g.flags, R = this.R;
    R.jitte.visible = !!f.jitteSeen && !f.jitteGot;
    this._applyLights(f.finaleDone ? 6 : this.progress);
    this._setMukashi(!!f.mukashi, true);
    if (f.finaleDone) { R.sigRed.emissiveIntensity = 0.05; R.sigGreen.emissiveIntensity = 1.6; }
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  /** 謎を解くたびに、街の灯りがふえる（0〜5、フィナーレは6） */
  _applyLights(n) {
    const f = this.g.flags, R = this.R;
    const k = Math.min(1, n / 5);
    for (const m of R.winMats) m.emissiveIntensity = 0.08 + k * 0.85;
    for (const m of R.lampMats) m.emissiveIntensity = f.subwayDone || n >= 6 ? 1.1 : 0.12;
    for (const m of R.neonMats) m.emissiveIntensity = f.meishoDone || n >= 6 ? 1.6 : 0.08;
    R.towerLightMat.emissiveIntensity = f.towerLit || n >= 6 ? 2.4 : 0;
    for (const m of R.rainbowMats) m.emissiveIntensity = f.tegataGot || n >= 6 ? 2.0 : 0;
    for (const p of R.pools) p.material.opacity = 0.12 + k * 0.33;
    R.pools[5].material.opacity = f.towerLit ? 0.5 : 0;
    this.sky.uniforms.night.value = 0.5 + k * 0.3;
    this.backdrop.set(k);
    this.baseGrade = mixGrade(GRADES.japan, GRADES.japanNight, k);
    if (!this.mukashi) this.g.setGrade(this.baseGrade);
    this.yamanoteOn = !!f.subwayDone || n >= 6;
    this.carsOn = n >= 1;
  }

  _setMukashi(on, instant = false) {
    this.mukashi = on;
    this.ghost.visible = true;
    this.plate.visible = true;
    const from = this.ghostK, to = on ? 1 : 0;
    const apply = (k) => {
      this.ghostK = k;
      this.ghostMat.opacity = k * 0.17;
      this.plateMat.opacity = k * 0.95;
      this.ghost.visible = k > 0.01;
      this.plate.visible = k > 0.01;
    };
    if (instant) apply(to); else this.g.tweens.add({ duration: 0.7, onUpdate: (k) => apply(lerp(from, to, k)) });
    this.g.setGrade(on ? GRADES.japanEdo : this.baseGrade || GRADES.japan);
  }

  toggleMukashi() {
    const g = this.g;
    const on = !this.mukashi;
    g.flag('mukashi', on);
    g.flag('mukashiTried');
    g.audio.play(on ? 'bell' : 'whoosh');
    this._setMukashi(on);
    g.ui.toast(on ? '🔔 むかし目：二百年前の江戸の町が、うっすら重なって見える……' : '🌃 いまの東京にもどった', 2600);
  }

  inspectItem(id) {
    if (id === 'koBell') { this.toggleMukashi(); return true; }
    if (id === 'tenugui') { this.g.audio.play('paper'); this.g.ui.openPanel({ title: '江戸の時刻の手ぬぐい', body: tenuguiHTML(), cls: 'wide' }); return true; }
    return false;
  }

  // =========================================================
  // 大型ビジョンと電光掲示板
  // =========================================================
  _drawVision(t) {
    const R = this.R, f = this.g.flags;
    const c = R.visionCanvas, ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    if (!f.subwayDone && !f.finaleDone) {
      ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; ctx.fillRect(Math.random() * W, Math.random() * H, 3, 2); }
      ctx.fillStyle = '#c8c8d8'; ctx.font = `900 54px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('NO SIGNAL', W / 2, H / 2);
    } else if (!f.meishoDone && !f.finaleDone) {
      ctx.fillStyle = '#1a2a5a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f0c040'; ctx.fillRect(0, H - 60, W, 60);
      ctx.fillStyle = '#ffffff'; ctx.font = `900 42px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('特番『江戸名所 二百年後』', W / 2, 90);
      ctx.font = `700 30px ${FONT}`; ctx.fillText('まもなく放送……？', W / 2, 160);
      ctx.fillStyle = '#1a1a20'; ctx.font = `900 28px ${FONT}`; ctx.fillText('ニュース　街の時計、夜8時で止まる', W / 2 - (t * 60) % 200 + 100, H - 30);
    } else {
      const page = Math.floor(t / 3) % 3;
      const hue = (t * 20) % 360;
      ctx.fillStyle = `hsl(${hue},60%,30%)`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (page === 0) { ctx.font = `900 76px ${FONT}`; ctx.fillText('TOKYO', W / 2, H / 2 - 30); ctx.font = `700 34px ${FONT}`; ctx.fillText('江戸から二百年', W / 2, H / 2 + 50); }
      else if (page === 1) { ctx.font = `900 34px ${FONT}`; ctx.fillText('江戸名所　二百年後', W / 2, 46); ctx.font = `700 24px ${FONT}`; MEISHO.forEach((m, i) => ctx.fillText(`${m.edo} → ${m.a}`, W / 2, 92 + i * 31)); }
      else { ctx.font = `900 48px ${FONT}`; ctx.fillText('ようこそ', W / 2, H / 2 - 40); ctx.fillText('ほしまわり号', W / 2, H / 2 + 34); }
    }
    R.visionTex.needsUpdate = true;
  }

  _drawLED() {
    const R = this.R, f = this.g.flags;
    const c = R.ledCanvas, ctx = c.getContext('2d');
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, c.width, c.height);
    const msg = f.finaleDone ? '★ 隅田川花火大会　開催中 ★　ほしまわり号　終点・東京駅に到着' : f.towerLit ? '隅田川　水上バス　夜の便　運航中　―　乗り場の時刻表をごらんください' : '停電のため　一部の灯りが消えています　―　安全運転で';
    ctx.font = `900 54px ${FONT}`; ctx.textBaseline = 'middle';
    ctx.fillStyle = f.finaleDone ? '#ffd84a' : '#ff8a2a';
    const w = ctx.measureText(msg).width;
    const x = c.width - (this.ledX % (w + c.width));
    ctx.fillText(msg, x, c.height / 2);
    R.ledTex.needsUpdate = true;
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R, f = g.flags;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    if (this.guests) for (const c of this.guests) { c.camPos = g.camera.position; c.update(dt, t); }
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.003;
    this.motes.update(dt, t);
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;

    // 首都高：手前の低いところから街をのぞくときは、うっすら透ける
    {
      const cam = g.camera.position, tg = g.controls.target;
      const block = cam.z > HW.z + 0.5 && tg.z < HW.z - 0.5 && cam.y < 24 && !this.departing;
      this.hwK = (this.hwK ?? 1) + ((block ? 0.2 : 1) - (this.hwK ?? 1)) * Math.min(1, dt * 6);
      for (const m of R.hwMats) { m.opacity = this.hwK; m.depthWrite = this.hwK > 0.9; }
      R.highway.traverse((o) => { if (o.isMesh) o.castShadow = this.hwK > 0.9; });
      for (const c of R.hwCars) c.g.visible = !!this.carsOn && this.hwK > 0.6;
    }
    // 重い端末では、遠くの車などを省く（作りこみはそのまま）
    if (!this.simple && g.bloom && g.bloom.enabled === false) { this.simple = true; R.far.visible = false; }

    // 山手線
    if (this.yamanoteOn) {
      this.yamaX = ((this.yamaX ?? -40) + dt * 6);
      if (this.yamaX > 44) this.yamaX = -44;
      R.yamanote.position.x = this.yamaX;
    }
    R.yamanote.visible = !!this.yamanoteOn;
    // 首都高と大通りの車
    if (this.carsOn && R.far.visible) {
      for (const c of R.hwCars) { c.x += c.dir * c.v * dt; if (c.x > 31) c.x = -31; if (c.x < -31) c.x = 31; c.g.position.x = c.x; }
      for (const c of R.roadCars) { c.x += c.dir * c.v * dt; if (c.x > 31) c.x = -31; if (c.x < -31) c.x = 31; c.g.position.x = c.x; }
    }
    for (const c of R.roadCars) c.g.visible = !!this.carsOn;
    // 航空灯の点滅
    const blink = Math.sin(t * 3) > 0.2 ? 1.6 : 0.15;
    for (const m of R.beacons) m.emissiveIntensity = blink;
    // ネオンのゆらぎ
    if (f.meishoDone || f.finaleDone) for (let i = 0; i < R.neonMats.length; i++) R.neonMats[i].emissiveIntensity = 1.4 + Math.sin(t * 4 + i * 1.7) * 0.25;
    // タワーのきらめき
    if (f.towerLit || f.finaleDone) R.towerLightMat.emissiveIntensity = 2.2 + Math.sin(t * 2) * 0.3;
    if (f.tegataGot || f.finaleDone) R.rainbowMats.forEach((m, i) => { m.emissiveIntensity = 1.4 + Math.sin(t * 3 + i * 0.6) * 0.8; });
    // 踏切の警報
    if (this.crossingOn) R.crossingLamps.forEach((m, i) => { m.emissiveIntensity = (Math.floor(t * 3) + i) % 2 ? 2.4 : 0.1; });
    // 十手のきらめき
    if (R.jitte.visible) R.jitteGlint.material.opacity = Math.max(0, Math.sin(t * 2.4)) ** 6 * 0.9;
    // 常香炉のけむり
    if (Math.random() < dt * 2) this.incense.emit(new V(-10.6 + (Math.random() - 0.5) * 0.4, 1.4, 2.2), { vel: new V(0.05, 0.6, 0), spread: 0.2, life: 3, size0: 0.3, size1: 1.4 });
    this.incense.update(dt);
    // 大型ビジョン・電光掲示板
    this.visionT -= dt;
    if (this.visionT < 0) { this.visionT = f.meishoDone || f.finaleDone ? 0.5 : 0.25; this._drawVision(t); }
    this.ledX += dt * 140;
    this.ledT = (this.ledT || 0) - dt;
    if (this.ledT < 0) { this.ledT = 0.08; this._drawLED(); }
    // 花火
    if (this.fireworksOn) {
      this.fwT = (this.fwT || 0) - dt;
      if (this.fwT < 0) {
        this.fwT = 0.5 + Math.random() * 0.7;
        const c = ['#ff5a7a', '#ffd84a', '#5ae0ff', '#8aff6a', '#c08aff', '#ff9a3a'][Math.floor(Math.random() * 6)];
        const o = new V(-20 + Math.random() * 40, 14 + Math.random() * 6, -1 + Math.random() * 8);
        this.fireworks.burst(o, c, t);
        if (g.playing) g.audio.play('pop');
      }
    }
    this.fireworks.update(t);

    // 煙と列車
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.06, 0.3 - this.trainSpeed * 0.03) : 0.75;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      this.smoke.emit(p, { vel: new V(0, heavy ? 2.4 : 1.2, 0), spread: 0.5, life: heavy ? 2.4 : 3.0, size0: 0.5, size1: heavy ? 3.0 : 2.2 });
    }
    this.smoke.update(dt);
    if (this.departing) {
      this.train.advance(this.trainSpeed * dt);
      this.chuffT = (this.chuffT || 0) - dt * Math.max(0.6, this.trainSpeed * 0.7);
      if (this.chuffT <= 0) { this.chuffT = 0.5; g.audio.play('chuff'); }
    }
    // きらめき
    for (const s of this.sparkles) {
      if (!s.visible) continue;
      s.userData.t += dt;
      const k = s.userData.t / 2.6;
      if (k >= 1) { s.visible = false; continue; }
      s.material.opacity = Math.sin(k * Math.PI) * (0.7 + 0.3 * Math.sin(t * 10));
      s.scale.setScalar(0.8 + Math.sin(t * 6 + s.userData.ph) * 0.2);
    }
  }

  // =========================================================
  // 目的・ヒント
  // =========================================================
  quests() {
    const f = this.g.flags;
    if (!f.introDone) return [{ text: '浅草寺の狛犬に話しかけよう', done: false }];
    const q = [
      { text: '🚇 人形焼を、地下鉄でとどける', done: !!f.subwayDone },
      { text: '📺 大型ビジョンに『江戸名所』を映す', done: !!f.meishoDone },
      { text: '🔔 時の鐘で、東京タワーに灯りをともす', done: !!f.towerLit },
      { text: '🥤 井戸の札の、ひみつの押しかた', done: !!f.ramuneGot },
      { text: '🔱 十手をとりもどして、通行手形をもらう', done: !!f.tegataGot },
    ];
    if (this.progress >= 5) q.push({ text: '🚉 東京駅の駅長に知らせて、終点へ', done: !!f.finaleDone });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    if (!f.introDone) return H('intro', '浅草寺の本堂の前の、狛犬に話しかけよう。');
    if (this.progress >= 5) return H('final', '準備はそろった！ 右の東京駅の駅長に話しかけよう。');
    const steps = [];
    if (!f.mukashiTried) steps.push(H('bell', '持ち物の『狛犬の鈴』を、もう一度押して鳴らしてみよう。二百年前の江戸の町が、重なって見える。'));
    // 地下鉄
    if (!f.subwayDone) {
      if (!has('ningyoyaki')) steps.push(H('risu', '仲見世の奥の、リスの和菓子屋に話しかけよう。'));
      else steps.push(H('subway', '浅草寺の右手前の『銀座線の入口』で、路線図を見よう。', '日比谷線で秋葉原へ、銀座で丸ノ内線に乗りかえて東京へ。東京から銀座にもどり、赤坂見附で銀座線に乗りかえて渋谷へ。', '答え：浅草→上野→秋葉原→人形町→銀座→東京→銀座→新橋→赤坂見附→表参道→渋谷'));
    }
    // 名所
    if (f.subwayDone && !f.meishoDone) steps.push(H('meisho', 'ネコのアナウンサーに話しかけて、大型ビジョンの名所あわせをしよう。『むかし目』で、江戸の名所があった場所に、いま何が建っているかを見くらべる。', '火の見やぐら→東京タワー、番所→交番、町木戸→踏切、井戸→自動販売機、茶店→喫茶店、瓦版屋→大型ビジョン、団子屋→ラーメン屋'));
    // 鐘
    if (!f.towerLit) {
      if (!has('tenugui')) { if (f.subwayDone) steps.push(H('tenugui', '江戸の時の数えかたがわかる物がほしい。大型ビジョンの謎を解くと、ネコがくれる。')); }
      else steps.push(H('bellRing', '時の鐘のツルに話しかけて、いまの時刻を江戸の数えかたで撞こう。いまは、ホームの時計のとおり「夜8時」。', '手ぬぐいによると、夜8時は「五つ」。捨て鐘を3つ、間をおいて、5つ。'));
    }
    // 自販機
    if (!f.ramuneGot) steps.push(H('vend', '渋谷の駅前広場の自動販売機は、江戸の井戸のあった場所。『むかし目』で見ると、井戸の札が見える。', '江戸の横がきは、右から読む。「四七弐」は、右から「弐・七・四」。', '答え：2 → 7 → 4'));
    // 十手
    if (!f.tegataGot) {
      if (has('jitte')) steps.push(H('jitteBack', '持ち物の『十手』を、交番の柴犬のおまわりさんに使おう。'));
      else if (!f.jitteSeen) steps.push(H('jitte1', '交番の柴犬は、十手を川に落としたらしい。暗くて見つからない。まずは東京タワーに灯りを。'));
      else if (!has('ramune')) steps.push(H('jitte2', '十手は太鼓橋の下の川底。潜ってくれるのは水上バスのカッパ。カッパの好物を手に入れよう。'));
      else steps.push(H('tide', '水上バスのカッパにラムネをあげて、便をえらぼう。乗り場の『潮見表』と『時刻表』を読む。', '干潮は「夜四つ」＝夜10時。乗り場から橋の下まで20分。', '答え：21:40 の便'));
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
      s.position.set(c.x, Math.min(box.max.y + 0.2, c.y + 1.6), c.z);
      s.visible = true;
      s.userData.t = 0;
      s.userData.ph = Math.random() * 6;
    }
    this.g.audio.play('twinkle');
  }

  // =========================================================
  // 共通
  // =========================================================
  say(lines) { return this.g.say(lines.filter((l) => l !== '')); }

  focus(obj, dist, opt = {}) {
    const p = obj.getWorldPosition ? obj.getWorldPosition(new V()) : obj.clone();
    const cur = this.g.camera.position.distanceTo(this.g.controls.target);
    return this.g.focusOn(new V(p.x, Math.min(8, Math.max(0.6, p.y + 0.5)), p.z), { dist: Math.min(cur, dist ?? 20), duration: 0.8, subject: obj.isObject3D ? obj : undefined, ...opt });
  }

  talkCam(c, dist) {
    return this.focus(c.root, dist, { theta: c.root.rotation.y, polar: 1.02, keepAngle: true });
  }

  view(pos, dist, theta = 0, polar = 1.0) {
    return this.g.focusOn(pos, { dist, theta, polar, duration: 0.9 });
  }

  questDone(text) {
    this.g.audio.play('quest');
    this.g.ui.toast(`✓ ${text}`, 2600);
    this._applyLights(this.progress);
    this.g.refreshQuests();
    this.g.save();
  }

  waitPanel(isPending = () => false) {
    return new Promise((resolve) => {
      const check = setInterval(() => { if (!this.g.ui.panelOpen && !isPending()) { clearInterval(check); resolve(); } }, 150);
    });
  }

  async checkReady() {
    if (this.progress >= 5) {
      await this.say(['東京の灯りが、すべてもどった。東京駅の駅長に知らせよう！']);
      this.g.refreshQuests();
    }
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkFrog() {
    this.talkCam(this.frog, 9);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.finaleDone) return this.say([{ who: 'frog', text: '終点に着いたケロ……。' }]);
    if (!f.introDone) return this.say([{ who: 'frog', text: 'あの狛犬さん……江戸で会った狛犬さんにそっくりケロ！' }]);
    const n = this.progress;
    await this.say([{ who: 'frog', text: n === 0 ? '街が暗いケロ……。灯りがもどったら、きっときれいケロ。' : `灯りが ${n}つ もどったケロ！ あと ${5 - n}つケロ。` }]);
  }

  async talkKoma() {
    const g = this.g, f = g.flags;
    // 雷門ごしにならないよう、上から見おろす
    this.focus(this.koma.root, 11, { theta: 0.1, polar: 0.62, keepAngle: true });
    if (!f.introDone) return this.komaIntro();
    if (f.finaleDone) return this.say([{ who: 'koma', text: '二百年ぶりの旅人よ。また、いつでも来るがよい。' }]);
    if (g.has('jitte') && !f.tegataGot) return this.say([{ who: 'koma', text: '十手か！ それを、子孫の柴犬に返してやれ。わしがあずかっておる手形に、判を押してもらえるはずじゃ。' }]);
    await this.say([
      { who: 'koma', text: '鈴を鳴らせば、二百年前の町が見える。いまの東京と、見くらべてみるがよい。' },
      { who: 'koma', text: '江戸のころの住人の子孫たちが、この街のあちこちにおる。きっと力になってくれよう。' },
    ]);
  }

  async komaIntro() {
    const g = this.g;
    await this.say([
      { who: 'koma', text: '……なんと。その緑の顔、その汽笛。おぬしら、二百年前に江戸の宿場に来た旅人じゃな！' },
      { who: 'frog', text: 'ケロ!? 狛犬さん、ぼくたちのこと、おぼえてるケロ!?' },
      { who: 'koma', text: '言うたじゃろう。「二百年たっても、ここに座っとる」と。……まことに、二百年たったわ。' },
      { who: 'koma', text: 'ここは、あの宿場町の二百年後。いまは「東京」とよばれる、大きな街じゃ。' },
      { who: 'koma', text: 'ところが、困ったことになっておってな。ゆうべから街の灯りが消え、時計という時計が【夜8時】で止まってしもうた。' },
      { who: 'koma', text: '終点・【東京駅】の手前の信号も、赤のまま。あれを青にするには、【街の灯り】と、二百年前の【通行手形】が要る。' },
    ]);
    g.give('koBell');
    await this.say([
      { who: 'koma', text: 'この【鈴】を持っていけ。鳴らせば「むかし目」になって、二百年前の江戸の町が、いまの街に重なって見える。' },
      { who: 'koma', text: '江戸のころの住人の子孫たちが、街のあちこちにおる。まずは、仲見世の【和菓子屋のリス】をたずねるとよい。' },
    ]);
    g.flag('introDone');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.note('jp-bell', '狛犬の鈴', '持ち物の『狛犬の鈴』をもう一度押すと<b>むかし目</b>。二百年前の江戸の町が重なって見える。');
    g.note('jp-clock', '止まった時計', '街じゅうの時計が<b>夜8時</b>で止まっている。');
    g.refreshQuests();
  }

  async talkRisu() {
    const g = this.g, f = g.flags;
    this.talkCam(this.risu, 9);
    if (!f.introDone) return this.say([{ who: 'risu', text: 'いらっしゃい。……あら、停電で、お店がまっくらで。' }]);
    if (f.subwayDone) return this.say([{ who: 'risu', text: 'とどけてくれて、ありがとう。ご先祖さまは団子屋だったけれど、うちは、いまは和菓子屋。団子屋のあとは、ラーメン屋さんになったのよ。' }]);
    if (g.has('ningyoyaki')) return this.say([{ who: 'risu', text: '地下鉄の入口の路線図を見て、道順を決めてね。乗りかえは3回まで。それより多いと、人形焼がさめちゃう。' }]);
    await this.say([
      { who: 'risu', text: 'まあ、江戸のころ、ご先祖さまの団子を食べてくれた旅のかた？ 家に話がつたわってるわ。' },
      { who: 'risu', text: 'ちょうどよかった。焼きたての【人形焼】を、渋谷のネコのアナウンサーにとどけてほしいの。停電で、ニュースがとまって困ってるみたい。' },
      { who: 'risu', text: 'とちゅうで、【秋葉原】のカラスと、【東京駅】の駅長さんにも、ひとつずつ。地下鉄の【銀座線】の入口から行けるわ。' },
      { who: 'risu', text: 'ただし、乗りかえは【3回まで】。それより多いと、さめちゃうから。' },
    ]);
    g.give('ningyoyaki');
    g.note('jp-errand', '人形焼のおつかい', '浅草から<b>渋谷</b>のネコへ。とちゅう<b>秋葉原</b>（カラス）と<b>東京</b>（駅長）に寄る。乗りかえは<b>3回まで</b>。');
  }

  async clickSubway() {
    const g = this.g, f = g.flags;
    await this.view(new V(-6.6, 1.2, 0.9), 9, 0.3, 1.0);
    if (f.subwayDone) return this.say(['銀座線の入口。オレンジ色の「G」のマーク。']);
    if (!g.has('ningyoyaki')) return this.say(['地下鉄・銀座線の入口。階段のわきに、地下鉄の路線図がはってある。']);
    let pending = false;
    subwayPanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.subwayDone();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async subwayDone() {
    const g = this.g;
    g.take('ningyoyaki');
    g.flag('subwayDone');
    g.cinematic = true;
    await g.moveCamera(new V(-4, 9, 12), new V(-6, 2.5, -6), 1.6);
    this._applyLights(this.progress);
    g.audio.play('chime');
    await g.wait(1.2);
    g.cinematic = false;
    await this.say([
      'ゴトン、ゴトン……銀座線で、秋葉原へ、東京へ、そして渋谷へ。',
      { who: 'karasu', text: 'カァ！ 人形焼、うまい！ 秋葉原のことなら、カラスにきけ！' },
      { who: 'ekicho', text: 'これはどうも。東京駅の駅長です。……おや、ほしまわり号のかたでしたか。終点でお待ちしております。' },
      '人形焼がとどくと、地下鉄と山手線に、灯りがともった！',
    ]);
    this.questDone('人形焼をとどけた！ 電車に灯りがもどった');
    await this.checkReady();
  }

  async talkNeko() {
    const g = this.g, f = g.flags;
    this.talkCam(this.neko, 10);
    if (!f.introDone) return this.say([{ who: 'neko', text: 'ニャ……停電で、放送ができませんニャ。' }]);
    if (f.meishoDone) return this.say([{ who: 'neko', text: 'ご先祖さまは瓦版屋。わたしは大型ビジョンで、街のニュースをとどけていますニャ。' }]);
    if (!f.subwayDone) return this.say([{ who: 'neko', text: 'おなかがすいて、声が出ませんニャ……。仲見世の人形焼が食べたいニャ……。' }]);
    if (!f.meishoTalked) {
      g.flag('meishoTalked');
      await this.say([
        { who: 'neko', text: '人形焼、おいしかったニャ！ おかげで大型ビジョンが動きましたニャ。' },
        { who: 'neko', text: '今夜は特番『江戸名所　二百年後』！ ご先祖さまの瓦版に描かれた江戸の名所が、いまの東京の何になったかを当てる番組ですニャ。' },
        { who: 'neko', text: 'ところが……答えの紙をなくしてしまって。あなた、江戸を見てきたかたなら、わかりますニャ？' },
      ]);
      g.note('jp-meisho', '江戸名所　二百年後', '江戸の名所（火の見やぐら・番所・町木戸・井戸・茶店・瓦版屋・団子屋）が、いまの何になったか。<b>むかし目</b>で、同じ場所を見くらべる。');
    }
    let pending = false;
    meishoPanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.meishoDone();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async meishoDone() {
    const g = this.g;
    g.flag('meishoDone');
    g.cinematic = true;
    await g.moveCamera(new V(2, 6.5, 13), new V(2, 3.5, -1.5), 1.6);
    this._applyLights(this.progress);
    g.audio.play('fanfare');
    await g.wait(1.4);
    g.cinematic = false;
    await this.say([
      '大型ビジョンに『江戸名所　二百年後』が映ると、渋谷のネオンがいっせいにともった！',
      { who: 'neko', text: 'ありがとうニャ！ お礼に、ご先祖さまの瓦版屋から伝わる【手ぬぐい】をどうぞニャ。江戸の時の数えかたが染めてありますニャ。' },
    ]);
    g.give('tenugui');
    this.questDone('大型ビジョンに江戸名所が映った！ ネオンがともった');
    await this.checkReady();
  }

  async talkTsuru() {
    const g = this.g, f = g.flags;
    this.talkCam(this.tsuru, 10);
    if (!f.introDone) return this.say([{ who: 'tsuru', text: 'この鐘は、江戸のころから、ここにあるのです。' }]);
    if (f.towerLit) return this.say([{ who: 'tsuru', text: 'ご先祖さまは呉服屋で、鐘つき番。いまは、わたしがこの鐘を守っております。' }]);
    if (!f.tsuruTalked) {
      g.flag('tsuruTalked');
      await this.say([
        { who: 'tsuru', text: 'ようこそ。わたしは、この時の鐘の鐘守。ご先祖さまは、江戸で鐘をついておりました。' },
        { who: 'tsuru', text: 'この鐘を、【いまの時刻を、江戸の数えかたで】撞けば、街のいちばん高い塔に灯りがともる、と伝わっております。' },
        { who: 'tsuru', text: '撞きかたは、ご先祖さまのころと同じ。はじめに【捨て鐘を三つ】、【間をおいて】、それから【時の数】だけ。' },
      ]);
      g.note('jp-kane', '時の鐘', '<b>いまの時刻</b>を、<b>江戸の数えかた</b>で撞く。<br>捨て鐘を3つ → 間をおく → 時の数だけ撞く。');
    }
    return this.clickBell();
  }

  async clickBell() {
    const g = this.g, f = g.flags;
    this.focus(this.R.bellTower, 11);
    if (f.towerLit) return this.say(['時の鐘。二百年前と同じ鐘。']);
    if (!f.tsuruTalked) return this.talkTsuru();
    if (!g.has('tenugui')) return this.say([{ who: 'tsuru', text: '江戸の時の数えかたが、わからないと……。瓦版屋の家に、むかしの時刻を染めた手ぬぐいが伝わっていると聞きます。' }]);
    let pending = false;
    bellPanel2(g.ui, g.audio, {
      onStrike: () => { g.tweens.add({ duration: 0.4, onUpdate: (k) => { this.R.shumoku.rotation.z = -Math.sin(k * Math.PI) * 0.3; this.R.bell.rotation.z = Math.sin(k * Math.PI * 2) * 0.03; } }); },
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.towerLit();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async towerLit() {
    const g = this.g, R = this.R;
    g.flag('towerLit');
    g.cinematic = true;
    await g.moveCamera(new V(4, 8, 20), new V(TOWER.x, 10, TOWER.z), 1.8);
    g.audio.play('chime');
    await g.tweens.add({ duration: 2.0, onUpdate: (k) => { R.towerLightMat.emissiveIntensity = k * 2.4; } });
    this._applyLights(this.progress);
    await this.say(['ゴーン……鐘の音とともに、東京タワーが、オレンジ色にかがやいた！']);
    // てっぺんのスズメが、川の光を見つける
    await g.moveCamera(new V(TOWER.x - 2, 11.5, TOWER.z + 6), R.towerTop.clone(), 1.4);
    await this.say([{ who: 'suzume', text: 'チュン！ 展望台から見えたよ。太鼓橋の下の川底で、何かが光ってる！' }]);
    g.flag('jitteSeen');
    R.jitte.visible = true;
    await g.moveCamera(new V(2.5, 4.5, 13), new V(2.6, 0.2, 7.8), 1.6);
    g.cinematic = false;
    await this.say(['タワーの灯りに照らされて、太鼓橋の下の川底で、細長い物がきらりと光った。']);
    g.note('jp-jitte', '川底の光', '太鼓橋の下の川底で、何かが光っている。');
    this.questDone('東京タワーに灯りがともった！');
    await this.checkReady();
  }

  async clickTower() {
    this.focus(this.R.tower, 24);
    const f = this.g.flags;
    await this.say([f.towerLit ? 'オレンジ色にかがやく東京タワー。' : '赤と白の、鉄の塔。灯りは消えている。', 'ここは江戸のころ、火の見やぐらが立っていた場所。']);
  }

  async clickVending() {
    const g = this.g, f = g.flags;
    await this.view(new V(2.1, 1.0, 4.5), 7, 0, 1.15);
    if (f.ramuneGot) return this.say(['自動販売機。ボタンが9つ。']);
    if (!f.vendTalked) {
      g.flag('vendTalked');
      const lines = ['駅前広場の自動販売機。ボタンに 1〜9 の番号がふってある。', '「ひみつの押しかたで、ひみつの一本」と、小さなシールがはってある。'];
      if (this.mukashi) lines.push('むかし目で見ると、ここには江戸の井戸があり、ふたに札が掛かっている……。');
      await this.say(lines);
    }
    let pending = false;
    vendingPanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        g.flag('ramuneGot');
        g.audio.play('clunk');
        await this.say(['ガコン。緑のびんが出てきた。']);
        g.give('ramune');
        this.questDone('ひみつの一本を手に入れた！');
        await this.checkReady();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  async talkInu() {
    const g = this.g, f = g.flags;
    this.talkCam(this.inu, 10);
    g.audio.play('wan');
    if (!f.introDone) return this.say([{ who: 'inu', text: 'ワン。交番です。停電で、ちょっと困っています。' }]);
    if (f.tegataGot) return this.say([{ who: 'inu', text: 'ご先祖さまの十手、だいじにします。ワン！' }]);
    if (g.has('jitte')) return this.returnJitte();
    if (!f.inuTalked) {
      g.flag('inuTalked');
      await this.say([
        { who: 'inu', text: 'ワン！ わたしは、この交番のおまわり。ご先祖さまは、江戸の岡っ引きの親分でした。' },
        { who: 'inu', text: '……じつは、家に伝わる【十手】を、川に落としてしまって。ご先祖さまも、むかし同じことをしたそうで……。' },
        { who: 'inu', text: 'あの十手がないと、狛犬さまがあずかっている【通行手形】に、判を押しなおせないんです。' },
      ]);
    }
    if (!f.jitteSeen) return this.say([{ who: 'inu', text: '停電で川がまっくらで、どこに落ちたのか、ぜんぜん見えないんです。' }]);
    await this.say([{ who: 'inu', text: '太鼓橋の下で光った！？ でも、あそこは深くて……。水上バスのカッパの船長なら、潜れるかもしれません。' }]);
  }

  async returnJitte() {
    const g = this.g;
    g.take('jitte');
    g.audio.play('wan');
    this.inu.hop();
    await this.say([
      { who: 'inu', text: 'ワン！ ご先祖さまの十手！ ありがとうございます！' },
      { who: 'inu', text: '狛犬さま、手形をおかりします！' },
    ]);
    g.cinematic = true;
    await g.moveCamera(new V(-10.6, 10, 8.5), new V(-10.6, 0.8, 2.9), 1.6);
    await this.say([
      { who: 'koma', text: '二百年、あずかっておった手形じゃ。……ほれ、判がかすれてしもうておる。' },
      'おまわりさんが、十手の柄の判を、手形にぐっと押しあてた。',
      { who: 'inu', text: '「ほしまわり号　通行をゆるす」……！ ご先祖さまと同じ判です！' },
    ]);
    g.cinematic = false;
    g.give('tegata');
    g.flag('tegataGot');
    this.questDone('通行手形をもらった！ 海のつり橋に灯りがともった');
    await this.checkReady();
  }

  async talkKappa() {
    const g = this.g, f = g.flags;
    this.talkCam(this.kappa, 9);
    g.audio.play('kappa');
    if (!f.introDone) return this.say([{ who: 'kappa', text: 'おう、水上バスの船長だ。停電で、今夜はひまでなあ。' }]);
    if (f.jitteGot) return this.say([{ who: 'kappa', text: 'ご先祖さまも、江戸で同じ十手を拾ったんだとさ。不思議なえんだねえ。' }]);
    if (!f.jitteSeen) return this.say([{ who: 'kappa', text: 'ご先祖さまは渡し守。おれは水上バスの船長よ。……ああ、のどがかわいた。ご先祖さまの好物の、キュウリの味のするものが飲みてえなあ。' }]);
    if (!g.has('ramune') && !f.kappaFed) {
      return this.say([
        { who: 'kappa', text: '十手が川底に？ 潜ってやりてえが、のどがかわいて力が出ねえ。' },
        { who: 'kappa', text: 'キュウリの味のする飲みものがあれば……。むかし、井戸ばたでよく冷やしてたもんだが。' },
      ]);
    }
    if (g.has('ramune')) {
      g.take('ramune');
      g.flag('kappaFed');
      await this.say([{ who: 'kappa', text: 'こ、これは、キュウリ味のラムネ！ ……ぷはー！ うめえ！ よし、潜ってやる！' }]);
    }
    if (!f.tideTalked) {
      g.flag('tideTalked');
      await this.say([
        { who: 'kappa', text: 'ただし、太鼓橋の下は深い。潮が【いちばん引いた】ときでないと、底まで届かねえ。' },
        { who: 'kappa', text: '乗り場の【潮見表】と【時刻表】を見て、ちょうど干潮のときに、橋の下に着く便をえらんでくれ。' },
      ]);
      g.note('jp-tide', '水上バス', '潮が<b>いちばん引いた</b>とき（干潮）に、太鼓橋の下に着く便をえらぶ。<br>乗り場の<b>潮見表</b>と<b>時刻表</b>を見る。');
    }
    let pending = false;
    tidePanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.diveJitte();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
  }

  readBoard(kind) {
    const g = this.g;
    this.focus(kind === 'tide' ? this.R.tideBoard : this.R.timetable, 7);
    g.note(`jp-board-${kind}`, kind === 'tide' ? '潮見表' : '水上バスの時刻表', kind === 'tide' ? '本日の干潮：<b>夜四つ</b>' : '夜の便：21:00 21:20 21:40 22:00 22:20<br>乗り場 → 太鼓橋の下：<b>20分</b>');
    g.audio.play('paper');
    g.ui.openPanel({ title: kind === 'tide' ? '潮見表' : '時刻表', body: pierBoardHTML(kind) });
    return this.waitPanel();
  }

  async diveJitte() {
    const g = this.g, R = this.R, kp = this.kappa;
    g.cinematic = true;
    await g.moveCamera(new V(5, 5, 15), new V(4.5, 0.5, 7.6), 1.4);
    // 水上バスで橋の下へ
    const b0 = R.waterBus.position.clone(), k0 = kp.root.position.clone();
    const b1 = new V(3.9, b0.y, 7.75);
    g.audio.play('whistle');
    await g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => { R.waterBus.position.lerpVectors(b0, b1, k); kp.root.position.copy(k0).add(R.waterBus.position).sub(b0); } });
    g.audio.play('splash');
    const kd = kp.root.position.clone();
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => { kp.root.position.set(lerp(kd.x, 2.7, k), kd.y + Math.sin(k * Math.PI) * 0.8 - k * 1.2, lerp(kd.z, 7.9, k)); } });
    kp.root.visible = false;
    await g.wait(1.2);
    R.jitte.visible = false;
    kp.root.visible = true;
    g.audio.play('splash');
    await g.tweens.add({ duration: 0.8, onUpdate: (k) => { kp.root.position.set(lerp(2.7, kd.x, k), kd.y - 1.2 + k * 1.2 + Math.sin(k * Math.PI) * 0.8, lerp(7.9, kd.z, k)); } });
    g.cinematic = false;
    g.flag('jitteGot');
    await this.say([{ who: 'kappa', text: 'ぷはっ！ あったぞ、十手だ！ ちょうど潮が引ききって、底まで手が届いた！' }]);
    g.give('jitte');
    // 乗り場にもどる
    g.tweens.add({ duration: 2.4, ease: Ease.inOut, onUpdate: (k) => { R.waterBus.position.lerpVectors(b1, b0, k); kp.root.position.copy(this.kappaHome).add(R.waterBus.position).sub(b0); } });
  }

  async talkEkicho() {
    const g = this.g, f = g.flags;
    this.talkCam(this.ekicho, 10);
    g.audio.play('meow');
    if (f.finaleDone) return this.say([{ who: 'ekicho', text: '終点・東京です。長い旅、おつかれさまでした。' }]);
    if (this.progress >= 5) return this.finale();
    const lines = [{ who: 'ekicho', text: '東京駅の駅長です。はざま駅の駅長は、わたしの遠い親せきでして。' }];
    lines.push({ who: 'ekicho', text: `終点に入るには、信号を青にせねばなりません。街の灯りがもどり、通行手形があれば……。いま、灯りは ${this.progress}つ もどっています。` });
    await this.say(lines);
  }

  async clickSignal() {
    const f = this.g.flags;
    this.focus(this.R.railSignal, 10);
    if (f.finaleDone) return this.say(['線路の信号は、青。']);
    if (this.progress >= 5) return this.talkEkicho();
    await this.say(['終点・東京駅の手前の信号。赤のまま。', { who: 'frog', text: 'これが青にならないと、終点に入れないケロ。' }]);
  }

  async talkPanda() {
    this.talkCam(this.panda, 10);
    const f = this.g.flags;
    await this.say([{ who: 'panda', text: f.finaleDone ? 'はなび、きれい〜。もぐもぐ。' : 'もぐもぐ……。むかし目？ 上野の山はね、江戸のころから、お花見の名所なんだって。もぐもぐ。' }]);
  }

  async talkKarasu() {
    this.talkCam(this.karasu, 9);
    this.g.audio.play('caw');
    const f = this.g.flags;
    if (f.subwayDone) return this.say([{ who: 'karasu', text: 'カァ！ 人形焼うまかった！ 水上バスの時刻表は、乗り場の看板にあるぞ。潮見表は、むかしの書きかたで読みにくいがな！' }]);
    await this.say([{ who: 'karasu', text: 'カァ！ 電線の上から、街のことは、なんでも見えるぞ。……腹がへった。' }]);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g;
    if (target === 'koma2') target = 'koma';
    if (target === 'wagashi') target = 'risu';
    if (target === 'vision') target = 'neko';
    if (target === 'koban') target = 'inu';
    if (target === 'waterBus') target = 'kappa';
    if (target === 'station' || target === 'signal') target = 'ekicho';
    if (item === 'koBell') { this.toggleMukashi(); return; }
    if (item === 'ningyoyaki' && (target === 'subway' || target === 'neko')) return this.clickSubway();
    if (item === 'tenugui' && (target === 'bell' || target === 'tsuru')) return this.clickBell();
    if (item === 'ramune' && target === 'kappa') return this.talkKappa();
    if (item === 'jitte' && (target === 'inu' || target === 'koma')) return this.returnJitte();
    if (item === 'tegata' && target === 'ekicho') return this.talkEkicho();
    const talkers = { koma: 'それは、おぬしが持っておれ。', risu: 'それは、とどけてね。', neko: 'それは、ニュースにはならないニャ。', inu: 'それは、落とし物ですか？', kappa: 'キュウリの味はしねえなあ。', ekicho: 'それは、きっぷではありませんね。', frog: 'それは、ボイラーには入れられないケロ。', tsuru: 'それでは、鐘は撞けません。' };
    if (talkers[target]) return this.say([{ who: target, text: talkers[target] }]);
    return this.say(['ここでは使えないようだ。']);
  }

  // =========================================================
  // オープニング・フィナーレ
  // =========================================================
  async opening() {
    const g = this.g;
    g.cinematic = true;
    const s0 = this.stopS;
    this.train.s = s0 - 90;
    this.train.place();
    g.camera.position.set(24, 16, 26);
    g.controls.target.set(-24, 4, -8);
    await g.ui.fade(0, 1.4);
    g.audio.play('whistle');
    const start = this.train.s;
    let last = start;
    const camFrom = g.camera.position.clone();
    await g.tweens.add({ duration: 9, ease: Ease.out, onUpdate: (k) => {
      const s = lerp(start, s0, k);
      this.train.advance(s - last);
      last = s;
      if (Math.random() < 0.15 * (1 - k)) g.audio.play('chuff');
      g.controls.target.lerp(this.train.loco.g.position, 0.08);
      g.camera.position.lerpVectors(camFrom, new V(6, 10, 14), k);
    } });
    g.audio.play('steam');
    await g.ui.banner('現代日本', `STAGE ${stageNo('japan')}　終点`, 2600);
    await g.say([
      'ほしまわり号は、夕やみにしずむ、大きな街に着いた。',
      'どこまでもつづくビル、高架を走る電車、川ぞいの高速道路……。',
      '……でも、街の灯りは、ほとんど消えている。',
    ]);
    await g.moveCamera(new V(-5, 7.5, 15), new V(-10.2, 2.0, 3.6), 1.8);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'ケロ!? あの赤い大提灯……雷門ケロ！ あっちの五重塔も、鐘も……！' },
      { who: 'frog', text: 'ここ、江戸の宿場町ケロ!? でも、建物がぜんぜんちがうケロ……！' },
      { who: 'frog', text: 'あっ、本堂の前の狛犬さん……江戸で会った狛犬さんと、そっくりケロ！' },
    ]);
    const portrait = innerWidth < innerHeight;
    await g.moveCamera(portrait ? new V(-10.6, 13, 12) : new V(-10.6, 10.5, 9.5), new V(-10.6, 1.0, 2.9), 1.8);
    g.cinematic = false;
    await this.talkKoma();
  }

  async finale() {
    const g = this.g, R = this.R;
    await this.say([
      { who: 'ekicho', text: '街の灯りが、すべてもどりましたね。それに……その通行手形！' },
      { who: 'ekicho', text: '「ほしまわり号　通行をゆるす」。二百年前の判。たしかに、拝見しました。' },
      { who: 'ekicho', text: 'それでは——終点・東京駅へ、ようこそ。信号、青！' },
    ]);
    g.take('tegata');
    g.cinematic = true;
    document.body.classList.add('cinematic');
    if (this.mukashi) { g.flag('mukashi', false); this._setMukashi(false); }
    await g.moveCamera(new V(9, 6, 2), new V(13.6, 3, TRACK_Z - 1.6), 1.6);
    g.audio.play('dial');
    R.sigRed.emissiveIntensity = 0.05;
    R.sigGreen.emissiveIntensity = 1.8;
    await g.wait(0.6);
    // 踏切が鳴って、遮断機が下りる
    this.crossingOn = true;
    g.audio.play('bell');
    await g.tweens.add({ duration: 1.2, onUpdate: (k) => { for (const { arm, s } of R.crossingArms) arm.rotation.x = -s * 1.35 * (1 - k); } });
    // 列車が終点へ
    await this.say(['カンカンカン……。踏切が鳴り、信号が青に変わった。']);
    g.audio.play('whistle');
    await g.moveCamera(new V(4, 7, 9), new V(10, 1.5, TRACK_Z), 1.4);
    const s0 = this.train.s, s1 = this.sOf(END_X);
    let last = s0;
    const cam0 = g.camera.position.clone();
    await g.tweens.add({ duration: 7, ease: Ease.inOut, onUpdate: (k) => {
      const s = lerp(s0, s1, k);
      this.train.advance(s - last);
      last = s;
      if (Math.random() < 0.12) g.audio.play('chuff');
      g.controls.target.lerp(this.train.loco.g.position, 0.06);
      g.camera.position.lerpVectors(cam0, new V(22, 9, 13), k);
    } });
    g.audio.play('steam');
    await g.tweens.add({ duration: 1.0, onUpdate: (k) => { for (const { arm, s } of R.crossingArms) arm.rotation.x = -s * 1.35 * k; } });
    this.crossingOn = false;
    R.crossingLamps.forEach((m) => { m.emissiveIntensity = 0.1; });
    g.flag('finaleDone');
    this._applyLights(6);
    // 隅田川の花火
    this.fireworksOn = true;
    await g.moveCamera(new V(0, 10, 40), new V(2, 14, 0), 2.6);
    g.audio.play('chime');
    await this.say(['ドーン……！ 隅田川の空に、大きな花火が上がった。', '東京タワーも、ビルの窓も、つり橋も、街じゅうの灯りがいっせいにともる。']);
    await this.reunion();
    g.flag('departed');
    g.refreshQuests();
    await this.ending();
  }

  /** 東京駅の駅前で：旅の仲間たちが、客車からおりてくる */
  async reunion() {
    const g = this.g;
    const mk = [
      [() => makeRabbit(), 1.0, 'はざま駅'], [() => makeSheep(), 1.0, '天空の街'], [() => makeSeal(), 1.0, '潮の港町'], [() => makeHero(), 0.95, '勇者の城下町'],
      [() => makeMaou(), 0.4, '魔王城'], [() => makeCapybara(), 1.0, '寂れた温泉街'], [() => makeElder(), 1.0, '巨大キノコの森'], [() => makeBear(), 0.9, 'からくりおもちゃの街'],
    ];
    this.guests = mk.map(([f, s]) => { const c = f(); c.root.scale.multiplyScalar(s); c.root.visible = false; g.scene.add(c.root); return c; });
    await g.moveCamera(new V(STATION.x, 6.5, 13.5), new V(STATION.x, 1.4, 2.0), 2.0);
    await this.say([{ who: 'frog', text: '……あれっ？ 客車から、だれかおりてくるケロ……！' }]);
    const door = new V(STATION.x, 0, 0.6);
    for (let i = 0; i < this.guests.length; i++) {
      const c = this.guests[i];
      const to = new V(STATION.x - 6.3 + i * 1.8, 0, 2.2 + (i % 2) * 0.5);
      c.root.position.copy(door);
      c.root.rotation.y = 0;
      c.root.visible = true;
      g.audio.play('pop');
      g.tweens.add({ duration: 1.0, ease: Ease.out, onUpdate: (k) => { c.root.position.lerpVectors(door, to, k); c.root.position.y = Math.sin(k * Math.PI) * 0.5; } });
      await g.wait(0.35);
    }
    await g.wait(0.8);
    this.guests.forEach((c) => c.hop());
    // カエルも駅前へ
    this.frog.root.position.set(STATION.x, 0, 3.2);
    this.frog.root.rotation.y = 0;
    await this.say([
      { who: 'guest', text: 'ほしまわり号の旅の仲間たちが、みんな、客車にのっていた！' },
      { who: 'guest', text: '「はざま駅から、ずっと見てたよ！」「雲の上から」「港から」「お城から」「温泉から」「森から」「おもちゃの街から」……' },
      { who: 'frog', text: 'み、みんな、のってたケロ!? ……いつのまにケロ！' },
      { who: 'ekicho', text: 'ほしまわり号は、旅をした世界の思い出を、ぜんぶのせて走る列車ですから。' },
      { who: 'koma', text: '二百年ぶりに、にぎやかな夜じゃ。……旅人よ、よう来た。' },
    ]);
    await g.moveCamera(new V(STATION.x - 2.5, 4.4, 9.4), new V(STATION.x, 1.0, 3.2), 1.6);
    this.frog.hop();
    await this.say([
      { who: 'frog', text: '……ここが、終点ケロ。ほしまわり号の旅は、ここでおしまいケロ。' },
      { who: 'frog', text: 'はざま駅の夕やけ、雲の上の風車、江戸の朝、霧の港、ドット絵の城下町、さみしがりの魔王、ぽかぽかの温泉、小さくなった森、ゼンマイの街……そして、二百年後の東京。' },
      { who: 'frog', text: 'ぜんぶ、いっしょに見てくれて、ありがとうケロ。ぼく、とっても楽しかったケロ！' },
      { who: 'frog', text: 'また、いつか。ほしまわり号に乗りたくなったら、はざま駅で待ってるケロ。' },
      { who: 'frog', text: '……ケロ。さよならじゃなくて、またねケロ！' },
    ]);
  }

  async ending() {
    const g = this.g;
    await g.moveCamera(new V(0, 26, 52), new V(0, 6, 0), 4);
    await g.wait(1.0);
    // エンドロール
    const body = el('div', 'credits');
    const stages = ['はざま駅', '天空の街', '江戸の宿場町', '潮の港町', '勇者の城下町', '魔王城', '寂れた温泉街', '巨大キノコの森', 'からくりおもちゃの街', '現代日本'];
    body.innerHTML = `<div class="cr-roll">
      <div class="cr-t">ほしまわり列車</div>
      ${stages.map((s, i) => `<div class="cr-s"><span>STAGE ${i + 1}</span>${s}</div>`).join('')}
      <div class="cr-g">カエルの機関士と、旅の仲間たち</div>
      <div class="cr-e">おしまい</div>
    </div>`;
    const panel = g.ui.openPanel({ title: '', body, cls: 'wide' });
    await new Promise((r) => { const iv = setInterval(() => { if (!g.ui.panelOpen) { clearInterval(iv); r(); } }, 200); setTimeout(() => { panel.close(); }, 16000); });
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.fireworksOn = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'japan'])];
    g.save();
    this.showClear();
  }

  showClear() {
    showStageClear(this.g, 'japan', '江戸から二百年。ほしまわり号は、終点・東京駅に着いた。');
  }
}
