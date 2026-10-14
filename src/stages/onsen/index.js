import * as THREE from 'three';
import { makeSky, makeIslandBase, makeSmallIsland, makeClouds, Puffs, Birds } from '../../lib/environment.js';
import { makeFrog, makeRabbit } from '../../lib/creatures.js';
import { makeCapybara, makeTanuki, makeFox, makeMonkey } from '../../lib/creatures-onsen.js';
import { lerp, damp, softCircleTexture } from '../../lib/util.js';
import { mergeStatic } from '../../lib/merge.js';
import { buildRails } from '../../lib/rails.js';
import { Ease } from '../../core/tween.js';
import { el } from '../../core/ui.js';
import { Train, RAIL_Y } from '../station/train.js';
import { buildOnsenDiorama, TRACK_Z } from './diorama.js';
import { yaguraPanel, masuPanel } from './panels.js';

const V = THREE.Vector3;

export const SPEAKERS = {
  capy: { name: 'カピバラの湯守', icon: '♨️', color: '#8a5f38', voice: 300 },
  tanuki: { name: 'タヌキの番頭', icon: '🦝', color: '#6a5040', voice: 420 },
  fox: { name: 'キツネの提灯屋', icon: '🦊', color: '#c8582e', voice: 820 },
  monkey: { name: '子ザル', icon: '🐒', color: '#b06a5a', voice: 1250 },
  frog: { name: 'カエルの機関士', icon: '🐸', color: '#4f9a3a', voice: 240 },
  rabbit: { name: 'ウサギの旅人', icon: '🐰', color: '#d46a8a', voice: 950 },
  hint: { name: 'ヒント', icon: '💡', color: '#c9952a' },
};

/** 線路：左上の空から降りて、町を横切り、右の山のトンネルへ */
function makeOnsenPath() {
  const p = new THREE.CurvePath();
  p.add(new THREE.CubicBezierCurve3(new V(-95, 30, 40), new V(-62, 24, 22), new V(-34, RAIL_Y, TRACK_Z), new V(-16, RAIL_Y, TRACK_Z)));
  p.add(new THREE.LineCurve3(new V(-16, RAIL_Y, TRACK_Z), new V(22, RAIL_Y, TRACK_Z)));
  p.add(new THREE.CubicBezierCurve3(new V(22, RAIL_Y, TRACK_Z), new V(38, RAIL_Y, TRACK_Z), new V(52, 8, -16), new V(70, 16, -34)));
  p.add(new THREE.CubicBezierCurve3(new V(70, 16, -34), new V(86, 22, -50), new V(100, 26, -66), new V(118, 28, -86)));
  p.arcLengthDivisions = 800;
  return p;
}

/**
 * ステージ 3：寂れた温泉街
 * 目的：止まった源泉の湯をふたたび流し、凍ったトンネルをとかす
 */
export class OnsenStage {
  constructor(game) {
    this.g = game;
    this.id = 'onsen';
    this.title = '寂れた温泉街';
    this.questTitle = '♨ 温泉街に湯けむりをとりもどす';
    this.hasRoof = true;
    this.manualRoof = false;
    this.roofT = 0;
    this.thaw = 0; // 0=凍っている 1=とけた
    this.departing = false;
    this.trainSpeed = 0;
    this.shishiT = 4;
  }

  // =========================================================
  // 構築
  // =========================================================
  async build() {
    const g = this.g, scene = g.scene;
    g.ui.setSpeakers(SPEAKERS);
    g.audio.setSong('onsen');

    // 雪のちらつく、宵の山あい
    this.sky = makeSky();
    const u = this.sky.uniforms;
    u.dTop.value.set('#2a3a72'); u.dMid.value.set('#8a7aa8'); u.dBot.value.set('#e0b8b0');
    u.nTop.value.set('#0c1030'); u.nMid.value.set('#2a2a5a'); u.nBot.value.set('#5a5078');
    u.night.value = 0.62;
    u.sunDir.value.set(-0.9, 0.05, -0.4).normalize();
    u.moonDir.value.set(0.4, 0.55, -0.73).normalize();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.Fog('#4a5078', 60, 220);
    g.renderer.toneMappingExposure = 1.18;
    this.hemi = new THREE.HemisphereLight('#b0bcf0', '#5a5044', 1.05);
    scene.add(this.hemi);
    const moon = (this.sun = new THREE.DirectionalLight('#d0dcff', 1.8));
    moon.position.set(-12, 24, 12);
    moon.castShadow = true;
    const sm = g.shadowSize();
    moon.shadow.mapSize.set(sm, sm);
    const sc = moon.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 80;
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.06;
    scene.add(moon, moon.target);

    this.island = makeIslandBase({ w: 30, d: 22, seed: 19, grass: '#7d9a62' });
    scene.add(this.island);
    this.clouds = makeClouds(23);
    this.clouds.userData.mat.color.set('#8a8ab0');
    this.clouds.userData.mat.emissive.set('#2a2a5a');
    scene.add(this.clouds);
    this.smallIslands = [[-58, 4, -36, 4, 21], [52, -2, 30, 3, 22], [-72, 12, 20, 5, 23], [-26, -6, 62, 4, 25]].map(([x, y, z, s, seed]) => {
      const si = makeSmallIsland(seed, s);
      si.position.set(x, y, z);
      scene.add(si);
      return { o: si, y, ph: seed };
    });

    // 線路と列車
    this.path = makeOnsenPath();
    const cl = this.path.getCurveLengths();
    this.stopS = cl[0] + 15; // 機関車が x=-1 に止まる
    const L = this.path.getLength();
    this.tracks = buildRails(scene, this.path, { z: TRACK_Z, islandX: [-14.8, 15.4], pillars: [cl[0] - 6, cl[0] - 12, cl[0] - 18, cl[1] + 4, cl[1] + 8, cl[1] + 12].filter((s) => s > 0 && s < L) });
    this.train = new Train(scene, this.path);
    this.train.s = this.stopS;
    this.train.place();
    this.train.loco.firebox.material.emissiveIntensity = 2.5;
    this.train.loco.headlight.material.emissiveIntensity = 3;

    await this.g.loadingStep(0.3, '町並みを組み立てています…');
    const R = (this.R = buildOnsenDiorama(scene));

    // パーティクル
    this.smoke = new Puffs(scene, { count: 70, color: '#e8e8f4', opacity: 0.7 });
    this.steam = new Puffs(scene, { count: 80, color: '#ffffff', opacity: 0.45 });
    this.birds = new Birds(scene, 3, 13);
    this._makeSnow(scene);
    this.sparkles = this._makeSparkles(scene);

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

  _makeSnow(scene) {
    const n = 500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = Math.random() * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snowMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, map: softCircleTexture(), transparent: true, opacity: 0.85, depthWrite: false });
    this.snowPts = new THREE.Points(geo, this.snowMat);
    this.snowPts.userData.noPick = true;
    this.snowPts.frustumCulled = false;
    scene.add(this.snowPts);
  }

  _optimize() {
    if (new URLSearchParams(location.search).has('nomerge')) return; // 調査用
    const creatureRoots = new Set(this.creatures.map((c) => c.root));
    const roots = [this.island, this.tracks, this.R.root, ...this.smallIslands.map((s) => s.o)];
    for (const [, it] of this.g.interactables) if (!creatureRoots.has(it.object)) roots.push(it.object);
    for (const c of this.creatures) c.root.traverse((o) => { if (o !== c.root && !o.isMesh) o.userData.dynamic = true; });
    this.tanuki.lids.forEach((l) => { l.userData.keep = true; });
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
    this.capy = makeCapybara();
    this.capy.root.position.set(2.7, 0, 3.0);
    this.capy.root.rotation.y = -0.3;
    this.frog = makeFrog();
    this.frog.root.position.set(1.0, 0, -3.9);
    this.frog.root.rotation.y = -0.3;
    this.tanuki = makeTanuki();
    this.tanuki.root.position.set(-11.6, 0.65, 2.9);
    this.tanuki.setSleeping(true);
    this.fox = makeFox();
    this.fox.root.position.set(9.0, 0.35, 5.25);
    this.monkey = makeMonkey({ kid: true });
    this.monkey.root.position.set(5.4, 0.05, 0.7);
    this.monkey.root.rotation.y = -0.2;
    // 最後に湯につかるサルたちと、お客さん
    this.bathers = [makeMonkey({ kid: false, bathing: true }), makeMonkey({ kid: false, bathing: true })];
    for (const b of this.bathers) b.noIdleHop = true;
    this.bathers[0].root.position.set(4.8, -0.2, 1.0);
    this.bathers[1].root.position.set(6.3, -0.2, 0.3);
    this.bathers[1].root.rotation.y = -0.6;
    this.guest = makeRabbit();
    this.guest.root.position.set(-0.8, 0.47, 6.0);
    this.guest.sad = false;
    for (const b of [...this.bathers, this.guest]) b.root.visible = false;
    this.creatures = [this.capy, this.frog, this.tanuki, this.fox, this.monkey, ...this.bathers, this.guest];
    for (const c of this.creatures) scene.add(c.root);
    // 眠りの Zzz
    this.zzz = [];
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.font = '900 48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.strokeStyle = '#3a4a7a'; x.lineWidth = 6; x.strokeText('Z', 32, 34); x.fillText('Z', 32, 34);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
      s.userData.noPick = true;
      scene.add(s);
      this.zzz.push(s);
    }
  }

  speakerCreature(who) {
    return { capy: this.capy, tanuki: this.tanuki, fox: this.fox, monkey: this.monkey, frog: this.frog, rabbit: this.guest }[who] || null;
  }

  _registerInteractables() {
    const g = this.g, R = this.R;
    const reg = (id, obj, name, fn) => g.addInteractable(id, obj, { name, onClick: fn });
    reg('capy', this.capy.root, 'カピバラの湯守', () => this.talkCapy());
    reg('frog', this.frog.root, 'カエルの機関士', () => this.talkFrog());
    reg('tanuki', this.tanuki.root, 'タヌキの番頭', () => this.talkTanuki());
    reg('fox', this.fox.root, 'キツネの提灯屋', () => this.talkFox());
    reg('monkey', this.monkey.root, '子ザル', () => this.talkMonkey());
    reg('guest', this.guest.root, 'ウサギの旅人', () => this.say([{ who: 'rabbit', text: 'あら、また会ったわね！ ここのお湯、最高よ。あなたもゆっくりしていってね。' }]));
    reg('bather0', this.bathers[0].root, 'サル', () => this.say(['サルたちが、気持ちよさそうに湯につかっている。']));
    reg('bather1', this.bathers[1].root, 'サル', () => this.say(['頭に手ぬぐいをのせて、うっとりしている。']));
    reg('bath', R.bath, '共同浴場', () => this.clickBath());
    reg('kama', R.kama, '釜場', () => this.clickKama());
    reg('roten', R.roten, '露天風呂', () => this.talkMonkey());
    reg('ryokan', R.ryokan, 'たぬき屋', () => this.talkTanuki());
    reg('irori', R.irori, '囲炉裏', () => this.clickIrori());
    reg('poker', R.poker, '火かき棒', () => this.clickPoker());
    reg('shop', R.shop, '提灯屋', () => this.talkFox());
    reg('yagura', R.yagura, '提灯やぐら', () => this.clickYagura());
    reg('gate', R.gate, '源泉の門', () => this.clickGate());
    reg('source', R.source, '源泉', () => this.clickSource());
    reg('masuStand', R.masuStand, '湯分けの台', () => this.clickSource());
    reg('portal', R.portal, 'トンネル', () => this.clickPortal());
    reg('jizo', R.jizo, 'お地蔵さま', () => this.say(['雪をかぶったお地蔵さまが三人。赤いよだれかけが寒そうだ。', this.g.flags.springFlow ? 'ほんのり、ほほえんでいるように見える。' : '（そっと手をあわせた）']));
    reg('sign', R.stationSign, '駅名標', () => this.say(['駅名標。『ゆげのさと』……左は『てんくうのまち』、右は『じょうかまち』。']));
    reg('loco', this.train.loco.g, '機関車', () => this.say(['ほしまわり号の機関車。ボイラーの熱で、まわりの雪だけとけている。']));
    reg('coach', this.train.coach.g, '客車', () => this.say(['ほしまわり号の客車。窓がうっすら白くくもっている。']));
  }

  // =========================================================
  // 状態の反映
  // =========================================================
  applyState() {
    const f = this.g.flags, R = this.R;
    R.poker.visible = !f.pokerTaken;
    R.emberMat.emissiveIntensity = f.embersRaked ? 2.2 : 0.35;
    R.emberGlow.intensity = f.embersRaked ? 2.5 : 0;
    this._setIrori(!!f.iroriLit);
    this.tanuki.setSleeping(!f.iroriLit);
    this.monkey.cold = !f.keyGiven;
    this._setShop(!!f.foxHasFire);
    this._setYagura(f.lightsDone ? Array(9).fill(true) : Array(9).fill(false));
    this._setStreet(!!f.lightsDone);
    if (f.gateOpen) this._gateVisual(1);
    R.masuSlot.visible = !!f.masuPlaced;
    this._setFlow(!!f.springFlow);
    this.thaw = f.thawed ? 1 : f.springFlow ? 0.25 : 0;
    this._applyThaw();
    for (const b of [...this.bathers, this.guest]) b.root.visible = !!f.thawed;
    this.g.refreshInventory();
    this.g.refreshQuests();
  }

  _setIrori(on) {
    const R = this.R;
    R.iroriFireMat.opacity = on ? 0.9 : 0;
    R.iroriFireMat.emissiveIntensity = on ? 2.5 : 0;
    R.iroriLight.intensity = on ? 3 : 0;
  }

  _setShop(on) {
    for (const m of this.R.shopLanterns) m.emissiveIntensity = on ? 1.6 : 0;
    this.fox.handLantern.children.forEach((c) => { if (c.material?.emissive) c.material.emissiveIntensity = on ? 2 : 0.3; });
  }

  _setYagura(on) {
    this.R.yaguraLanterns.forEach((m, i) => { m.emissiveIntensity = on[i] ? 1.8 : 0; });
    this.R.yaguraLight.intensity = on.filter(Boolean).length * 0.5;
  }

  _setStreet(on) {
    for (const m of this.R.streetLanterns) m.emissiveIntensity = on ? 1.7 : 0;
    for (const m of this.R.toroMats) m.emissiveIntensity = on ? 2.0 : 0;
    for (const L of this.R.streetLight) L.intensity = on ? 3 : 0;
  }

  _gateVisual(k) {
    const R = this.R;
    R.gateDoors[0].rotation.y = -1.6 * k;
    R.gateDoors[1].rotation.y = 1.6 * k;
    R.gateLock.visible = k < 0.5;
  }

  _setFlow(on) {
    const R = this.R;
    for (const w of R.flows) w.visible = on;
    R.srcWaterMat.emissiveIntensity = on ? 0.5 : 0.15;
    R.rotenWaterMat.opacity = on ? 0.85 : 0;
    this.flowing = on;
  }

  _applyThaw() {
    const R = this.R, k = this.thaw;
    R.ice.visible = k < 0.99;
    R.ice.scale.set(1, Math.max(0.01, 1 - k), 1);
    R.iceMat.opacity = 0.85 * (1 - k * 0.6);
    const snowK = this.g.flags.thawed ? Math.max(0, (k - 0.5) * 2) : 0;
    R.snowMat.opacity = 1 - snowK;
    for (const s of R.snow) s.visible = snowK < 0.98;
    R.bathSnow.visible = snowK < 0.98;
    if (this.snowMat) this.snowMat.opacity = 0.85 * (1 - snowK);
  }

  // =========================================================
  // 毎フレーム
  // =========================================================
  update(dt, t) {
    const g = this.g, R = this.R, f = g.flags;
    for (const c of this.creatures) { c.camPos = g.camera.position; c.update(dt, t); }
    this.birds.update(dt, t);
    this.sky.uniforms.time.value = t;
    this.clouds.rotation.y = t * 0.004;
    for (const s of this.smallIslands) s.o.position.y = s.y + Math.sin(t * 0.3 + s.ph) * 0.8;

    // 旅館の屋根（近づくと自動で外れる）
    const tgt = g.controls.target;
    const camDist = g.camera.position.distanceTo(tgt);
    const near = Math.hypot(tgt.x + 10.2, tgt.z - 3.4) < 5.5 && camDist < 30;
    this.roofLifted = this.manualRoof || (near && !this.departing);
    this.roofT = damp(this.roofT, this.roofLifted ? 1 : 0, 5, dt);
    R.roof.position.y = 2.9 + this.roofT * 4;
    for (const m of R.roofMats) { m.opacity = 1 - this.roofT * 0.9; m.depthWrite = this.roofT < 0.5; }
    R.roof.traverse((o) => { if (o.isMesh) o.castShadow = this.roofT < 0.3; });

    // 雪
    const sp = this.snowPts.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      let y = sp.getY(i) - dt * 0.9;
      if (y < 0) y += 14;
      sp.setY(i, y);
      sp.setX(i, sp.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.2);
    }
    sp.needsUpdate = true;

    // 寝ているタヌキの Zzz
    this.zzz.forEach((z, i) => {
      z.visible = this.tanuki.sleeping && g.playing;
      const k = (t * 0.45 + i / 3) % 1;
      const p = this.tanuki.root.position;
      z.position.set(p.x + 0.3 + k * 0.5, p.y + 1.3 + k * 0.9, p.z + 0.2);
      z.material.opacity = Math.sin(k * Math.PI);
      z.scale.setScalar(0.15 + k * 0.25);
    });

    // 囲炉裏・釜場のゆらぎ（ゆっくり）
    if (f.iroriLit) {
      R.iroriFire.scale.set(1, 1 + Math.sin(t * 3) * 0.12, 1);
      R.iroriLight.intensity = 3 * (0.93 + Math.sin(t * 2.2) * 0.05);
    }
    R.noren.rotation.x = Math.sin(t * 0.9) * 0.05;

    // 湯気
    if (this.flowing) {
      if (Math.random() < dt * 4) this.steam.emit(new V(5.6 + (Math.random() - 0.5) * 2, 0.4, 0.6 + (Math.random() - 0.5) * 1.2), { vel: new V(0.1, 0.8, 0), spread: 0.3, life: 3, size0: 0.4, size1: 1.8 });
      if (Math.random() < dt * 2.5) this.steam.emit(new V(3.6, 2.8, -10.0), { vel: new V(0, 0.9, 0.1), spread: 0.3, life: 3, size0: 0.4, size1: 2.0 });
      if (f.thawed && Math.random() < dt * 2) this.steam.emit(new V(0.6 + (Math.random() - 0.5) * 3, 4.2, 0.4), { vel: new V(0, 0.8, 0), spread: 0.3, life: 3, size0: 0.4, size1: 1.8 });
      // ししおどし
      this.shishiT -= dt;
      const tube = R.shishiTube;
      if (this.shishiT < 0) { this.shishiT = 5 + Math.random() * 2; this.shishiDrop = 0.35; if (g.playing && !this.departing) g.audio.play('knock'); }
      if (this.shishiDrop > 0) { this.shishiDrop -= dt; tube.rotation.z = -0.55; } else tube.rotation.z += (0.25 - tube.rotation.z) * dt * 0.6;
    }
    if (this.melting) {
      if (Math.random() < dt * 10) this.steam.emit(new V(11.6, 0.5 + Math.random() * 2.5, TRACK_Z + (Math.random() - 0.5) * 2), { vel: new V(-0.5, 1, 0), spread: 0.4, life: 2, size0: 0.4, size1: 1.6 });
    }

    // 煙
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      const heavy = this.departing;
      this.smokeT = heavy ? Math.max(0.05, 0.3 - this.trainSpeed * 0.03) : 0.6;
      const p = this.train.worldOf(this.train.loco, this.train.loco.smokeLocal);
      if (p.x < 12) this.smoke.emit(p, { vel: new V(heavy ? -this.trainSpeed * 0.3 : 0, heavy ? 2.6 : 1.4, 0), spread: 0.5, life: heavy ? 2.4 : 3.2, size0: 0.5, size1: heavy ? 3.2 : 2.4 });
    }
    this.smoke.update(dt);
    this.steam.update(dt);

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

  /** 旅館の中を見ているときは、真上寄りから見下ろす */
  interiorAt(p) {
    if (p.x > -12.9 && p.x < -7.5 && p.z > 1.4 && p.z < 5.4) return { polar: 0.55, maxDist: 26 };
    return null;
  }

  // =========================================================
  // 目的・ヒント
  // =========================================================
  quests() {
    const f = this.g.flags;
    if (!f.introDone) return [{ text: '共同浴場の前のカピバラに話しかけよう', done: false }];
    const all = f.lightsDone && f.gateOpen && f.springFlow;
    const q = [
      { text: '🏮 提灯やぐらに灯りをともす', done: !!f.lightsDone },
      { text: '🗝 源泉の門をひらく', done: !!f.gateOpen },
      { text: '♨ 源泉の湯を流す', done: !!f.springFlow },
    ];
    if (all) q.push({ text: '♨ カピバラの湯守に知らせる', done: !!f.departed });
    return q;
  }

  hint() {
    const f = this.g.flags, has = (i) => this.g.has(i);
    const H = (key, ...lines) => ({ key, lines });
    if (!f.introDone) return H('intro', '町のまんなか、共同浴場の前にいるカピバラに話しかけよう。');
    if (f.lightsDone && f.gateOpen && f.springFlow) return H('final', '準備はそろった！ カピバラの湯守に知らせよう。');
    const steps = [];
    const fire = () => {
      if (has('lanternLit')) return null;
      if (!has('lantern')) return H('fox', '右手前の提灯屋のキツネに話を聞いてみよう。');
      if (!f.embersRaked) {
        if (has('poker')) return H('rake', '持ち物の『火かき棒』を選んで、共同浴場のとなりの『釜場』に使おう。');
        return H('poker', '釜場の残り火は、灰の奥で手が届かない。かき出す道具がほしい。', '左手前の旅館「たぬき屋」の中、囲炉裏のそばに『火かき棒』がある。');
      }
      return H('light', '持ち物の『手さげ提灯』を選んで、釜場に使おう。');
    };
    // 灯り
    if (!f.lightsDone) {
      if (!f.foxHasFire) {
        const s = fire();
        steps.push(s || H('foxFire', '『灯った提灯』を提灯屋のキツネに見せよう。'));
      } else {
        steps.push(H('yagura', '提灯やぐらは、ひとつ灯すと上下左右のとなりも入れかわる。キツネのじいちゃんいわく「五つの火で九つを灯す」。', '四すみ（ゆ・の・火・宿）と、まんなか（と）の5つを押そう。'));
      }
    }
    // 門
    if (!f.gateOpen) {
      if (has('gateKey')) steps.push(H('gate', '持ち物の『源泉の門の鍵』を選んで、山の上の『源泉の門』に使おう。'));
      else if (has('amazake')) steps.push(H('monkey', '露天風呂でふるえている子ザルに、あったか甘酒をあげよう。'));
      else if (f.iroriLit) steps.push(H('tanuki', '目をさましたタヌキの番頭に話しかけよう。'));
      else if (has('lanternLit')) steps.push(H('irori', '旅館の囲炉裏に、提灯の火をうつそう。持ち物の『灯った提灯』を選んで、囲炉裏に使おう。'));
      else if (!f.monkeyTalked) steps.push(H('monkeyTalk', '源泉の門の鍵は、子ザルが持っているらしい。露天風呂の子ザルに話しかけよう。'));
      else steps.push(fire() || H('warm', '子ザルをあたためるものが必要だ。旅館で眠っているタヌキは、寒くて起きられないらしい。'));
    }
    // 湯
    if (!f.springFlow && f.gateOpen) {
      if (f.masuPlaced) steps.push(H('masu', '五合升と三合升で、ちょうど四合を作ろう。', '五合を汲む → 三合升へ移す → 三合升を捨てる → 五合升の2合を三合升へ移す → 五合を汲む → 三合升へ移す（五合升に4合残る）→ 樋へ流す'));
      else if (has('masu')) steps.push(H('placeMasu', '持ち物の『三合升』を選んで、源泉に使おう。'));
      else steps.push(H('findMasu', '湯分けの升がひとつ足りない。共同浴場を調べてみよう。'));
    }
    if (!f.masuTaken && !f.springFlow && !has('masu') && !f.gateOpen) steps.push(H('masuEarly', '共同浴場の脱衣所に、何か置いてあるかも。'));
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
    if (f.lightsDone && f.gateOpen && f.springFlow) {
      await this.say(['これで準備はそろった。カピバラの湯守に知らせよう！']);
      this.g.refreshQuests();
    }
  }

  // =========================================================
  // 住人
  // =========================================================
  async talkCapy() {
    const g = this.g, f = g.flags;
    this.focus(this.capy.root, 16);
    if (!f.introDone) return this.capyIntro();
    if (f.lightsDone && f.gateOpen && f.springFlow) return this.finale();
    const lines = [];
    if (!f.lightsDone) lines.push({ who: 'capy', text: '町が暗いままでは、湯の神さまも戻ってこられません。提灯やぐらは、キツネの提灯屋がくわしいはずです。' });
    if (!f.gateOpen) lines.push({ who: 'capy', text: '源泉の門の鍵は……そういえば、子ザルがいたずらで持っていってしまったようで。' });
    else if (!f.springFlow) lines.push({ who: 'capy', text: '源泉の湯は、湯分けの升でちょうど四合を樋に流すと、湯の神さまが目をさますと言われております。' });
    await this.say(lines);
  }

  async capyIntro() {
    const g = this.g;
    await this.say([
      { who: 'capy', text: 'ようこそ……と言いたいところですが、見てのとおり、この町はすっかりさびれてしまいました。' },
      { who: 'capy', text: 'わたしは湯守のカピバラ。この町の湯を守っております。' },
      { who: 'capy', text: 'ひと月前、山の【源泉】から湯が出なくなりまして……湯けむりも提灯の灯りも消え、お客さんも来なくなりました。' },
      { who: 'capy', text: '谷はすっかり冷えこんで、この先のトンネルまで凍りついてしまったのです。' },
      { who: 'capy', text: '源泉の湯がふたたび流れれば、きっと氷もとけるはず。どうか、お力を貸してください。' },
      { who: 'capy', text: '山の上の【源泉の門】をあけること。それと、町の【提灯やぐら】に灯りをともすこと。湯の神さまは、にぎやかな町がお好きですから。' },
    ]);
    g.flag('introDone');
    g.audio.play('quest');
    g.ui.toast('目的が追加された！ 左上を確認しよう', 2800);
    g.refreshQuests();
  }

  async talkFrog() {
    this.focus(this.frog.root);
    this.g.audio.play('ribbit');
    const f = this.g.flags;
    if (f.thawed) return this.say([{ who: 'frog', text: 'トンネルが開いたケロ！ いつでも出発できるケロ！' }]);
    await this.say([{ who: 'frog', text: 'さ、さむいケロ……トンネルの氷がとけないと、先へは進めないケロ〜。' }]);
  }

  async talkFox() {
    const g = this.g, f = g.flags;
    this.focus(this.fox.root, 16);
    g.audio.play('kon');
    if (!f.foxTalked) {
      await this.say([
        { who: 'fox', text: 'コンばんは。提灯屋のキツネだよ。町の提灯は、ぜーんぶ火が消えちまってねえ。' },
        { who: 'fox', text: '火種さえあれば、提灯やぐらに火を入れてやれるんだけど……' },
        { who: 'fox', text: 'そうだ、この【手さげ提灯】を持っていきな。釜場の残り火でも、うつせりゃいいんだが。' },
      ]);
      g.give('lantern');
      g.flag('foxTalked');
      g.note('on-fire', '火種', '提灯やぐらに火を入れるには火種がいる。<b>釜場の残り火</b> を手さげ提灯にうつせれば……');
      return;
    }
    if (g.has('lanternLit') && !f.foxHasFire) return this.foxGetsFire();
    if (f.foxHasFire && !f.lightsDone) {
      return this.say([
        { who: 'fox', text: 'やぐらの提灯は、からくり仕掛け。ひとつ灯すと、上下左右のとなりも入れかわっちまうのさ。' },
        { who: 'fox', text: 'じいちゃんはいつも「五つの火で、九つを灯す」って言ってたなあ。' },
      ]);
    }
    if (f.lightsDone) return this.say([{ who: 'fox', text: '町に灯りがもどって、提灯たちもうれしそうだ。コンコン♪' }]);
    await this.say([{ who: 'fox', text: '火種は、共同浴場のとなりの釜場の奥に残ってるかもしれないよ。' }]);
  }

  async foxGetsFire() {
    const g = this.g;
    await this.say([{ who: 'fox', text: 'おおっ、火だ！ ちょいと分けてもらうよ。' }]);
    g.audio.play('fire');
    this._setShop(true);
    g.flag('foxHasFire');
    g.note('on-yagura', '提灯やぐら', 'ひとつ灯すと、<b>上下左右のとなりも入れかわる</b>。九つすべてを灯す。<br>キツネのじいちゃんいわく「<b>五つの火で、九つを灯す</b>」。');
    this._lanternDone();
    await g.wait(0.6);
    await this.say([
      { who: 'fox', text: 'これで、やぐらの提灯に火を入れられる。ただし、やぐらはからくり仕掛け。ひとつ灯すと、上下左右のとなりも入れかわっちまう。' },
      { who: 'fox', text: 'じいちゃんはいつも「五つの火で、九つを灯す」って言ってたなあ。……提灯はあんたが持っておきな。' },
    ]);
  }

  _lanternDone() {
    const f = this.g.flags;
    if (f.foxHasFire && f.iroriLit && this.g.has('lanternLit')) {
      this.g.take('lanternLit');
      this.g.ui.toast('手さげ提灯は、提灯屋のキツネに返した', 2400);
    }
  }

  async talkTanuki() {
    const g = this.g, f = g.flags;
    this.focus(this.tanuki.root, 16);
    if (!f.iroriLit) {
      const lines = ['タヌキの番頭は、帳場でまるくなって眠っている。', { who: 'tanuki', text: 'Zzz……さむい……冬眠しちゃう……ぽん……' }];
      g.note('on-tanuki', 'タヌキの番頭', '寒くて眠っている。<b>部屋があたたまれば</b> 目をさますかも。');
      lines.push(g.has('lanternLit') ? '（となりの囲炉裏に、提灯の火をうつせそうだ）' : '（部屋があたたまれば、目をさますかもしれない）');
      return this.say(lines);
    }
    g.audio.play('ponpoko');
    if (!f.amazakeGiven) {
      await this.say([
        { who: 'tanuki', text: 'ぽんぽこ！ 囲炉裏に火を入れてくれたのは、お客さんかい？ ああ、生き返った……' },
        { who: 'tanuki', text: 'お礼に、温めたての甘酒をどうぞ。……そうそう、露天風呂で子ザルがふるえてたよ。持ってっておやり。' },
      ]);
      g.give('amazake');
      g.flag('amazakeGiven');
      return;
    }
    await this.say([{ who: 'tanuki', text: f.thawed ? '湯がもどって、うちの宿にもお客さんが戻ってきたよ。ぽんぽこ♪' : '湯がもどれば、うちの宿にもお客さんが戻るんだがねえ。' }]);
  }

  async talkMonkey() {
    const g = this.g, f = g.flags;
    this.focus(this.monkey.root, 16);
    g.audio.play('kii');
    if (f.keyGiven) return this.say([{ who: 'monkey', text: f.springFlow ? 'キキッ！ おゆだー！ あったかーい！' : 'キキッ！ はやくお湯にはいりたいなあ！' }]);
    if (g.has('amazake')) return this.giveAmazake();
    await this.say([
      'からっぽの露天風呂で、子ザルがぶるぶるふるえている。',
      { who: 'monkey', text: 'さむいさむい……キキ……あったかくなるまで、うごけない……' },
      '（子ザルが、金色の何かを大事そうににぎっている。……鍵？）',
    ]);
    g.note('on-monkey', '露天風呂の子ザル', '寒くてふるえている。<b>金色の鍵</b> のようなものをにぎっていた。あたたまれば……');
    g.flag('monkeyTalked');
  }

  async giveAmazake() {
    const g = this.g;
    await this.say([{ who: 'monkey', text: 'キキッ！ あまざけ！？' }]);
    g.take('amazake');
    this.monkey.cold = false;
    this.monkey.hop();
    g.audio.play('kii');
    await this.say([
      '子ザルは甘酒をふうふう飲みほした。',
      { who: 'monkey', text: 'あったまったー！ おれいにこれあげる！ 山の上で ひろった、門のかぎ！' },
    ]);
    g.give('gateKey');
    g.flag('keyGiven');
  }

  // =========================================================
  // 場所
  // =========================================================
  async clickBath() {
    const g = this.g, f = g.flags;
    this.focus(this.R.bath, 18);
    if (!f.masuTaken) {
      await this.say(['町の共同浴場。湯船はからっぽで、ひんやりしている。', '脱衣所の棚に、木の【升】がぽつんと置いてある。']);
      g.give('masu');
      g.flag('masuTaken');
      return;
    }
    await this.say([f.thawed ? '共同浴場から、もうもうと湯けむりが上がっている。' : f.springFlow ? '湯船に湯がたまりはじめた。いい香りがする。' : '湯船はからっぽだ。']);
  }

  async clickKama() {
    const g = this.g, f = g.flags;
    this.focus(this.R.kama, 16);
    if (f.embersRaked) {
      if (g.has('lantern')) return this.lightLantern();
      return this.say(['釜場の焚き口で、残り火が赤く光っている。']);
    }
    const lines = ['銭湯の釜場。焚き口の奥に、かすかに赤い残り火が見える。', '灰に深く埋もれていて、手が届かない。'];
    g.note('on-kama', '釜場の残り火', '灰に深く埋もれていて手が届かない。<b>かき出す道具</b> がほしい。');
    if (g.has('poker')) lines.push('（持ち物の『火かき棒』が使えそうだ）');
    await this.say(lines);
  }

  async rakeEmbers() {
    const g = this.g, R = this.R;
    this.focus(R.kama, 16);
    g.audio.play('crank');
    await g.tweens.add({ duration: 1.2, onUpdate: (k) => { R.emberMat.emissiveIntensity = 0.35 + k * 1.9; R.emberGlow.intensity = k * 2.5; } });
    g.flag('embersRaked');
    g.take('poker');
    await this.say(['火かき棒で灰をかきだすと、赤々とした残り火があらわれた！']);
    if (g.has('lantern')) return this.lightLantern();
    await this.say(['（火を運ぶものがあれば……）']);
  }

  async lightLantern() {
    const g = this.g;
    g.audio.play('fire');
    g.take('lantern');
    await this.say(['手さげ提灯のろうそくに、残り火をうつした。']);
    g.give('lanternLit');
  }

  async clickPoker() {
    const g = this.g;
    this.focus(this.R.ryokan, 16);
    await this.say(['囲炉裏のそばに、鉄の火かき棒が置いてある。']);
    this.R.poker.visible = false;
    g.give('poker');
    g.flag('pokerTaken');
  }

  async clickIrori() {
    const g = this.g, f = g.flags;
    this.focus(this.R.irori, 16);
    if (f.iroriLit) return this.say(['囲炉裏の火がパチパチとはぜている。あたたかい。']);
    const lines = ['旅館の囲炉裏。灰はすっかり冷えきっている。'];
    if (!f.pokerTaken) {
      lines.push('そばに、鉄の火かき棒が置いてある。');
      await this.say(lines);
      this.R.poker.visible = false;
      g.give('poker');
      g.flag('pokerTaken');
      return;
    }
    if (g.has('lanternLit')) lines.push('（提灯の火をうつせそうだ）');
    await this.say(lines);
  }

  async lightIrori() {
    const g = this.g;
    this.focus(this.R.irori, 16);
    await this.say(['提灯の火を、囲炉裏の炭にうつした。']);
    g.audio.play('fire');
    await g.tweens.add({ duration: 1.0, onUpdate: (k) => { this.R.iroriFireMat.opacity = k * 0.9; this.R.iroriFireMat.emissiveIntensity = k * 2.5; this.R.iroriLight.intensity = k * 3; } });
    g.flag('iroriLit');
    this._lanternDone();
    await g.wait(0.8);
    this.tanuki.setSleeping(false);
    this.tanuki.hop();
    g.audio.play('ponpoko');
    await this.say([{ who: 'tanuki', text: 'ぽ、ぽん……？ あったかい……！' }]);
  }

  async clickYagura() {
    const g = this.g, f = g.flags;
    this.focus(this.R.yagura, 18);
    if (f.lightsDone) return this.say(['提灯やぐらの九つの灯りが、町をあたたかく照らしている。']);
    if (!f.foxHasFire) {
      return this.say(['提灯やぐら。九つの提灯がならんでいるが、どれも火が消えている。', '火種がないと、灯せない。']);
    }
    let pending = false;
    yaguraPanel(g.ui, g.audio, {
      onChange: (on) => this._setYagura(on),
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.lightsDone();
        pending = false;
      },
    });
    await this.waitPanel(() => pending);
    if (!g.flags.lightsDone) this._setYagura(Array(9).fill(false));
  }

  async lightsDone() {
    const g = this.g;
    g.cinematic = true;
    this._setYagura(Array(9).fill(true));
    await g.wait(0.5);
    g.audio.play('chime');
    for (let i = 0; i <= 10; i++) {
      await g.wait(0.12);
      this.R.streetLanterns.forEach((m, j) => { if (j <= i) m.emissiveIntensity = 1.7; });
    }
    this._setStreet(true);
    g.cinematic = false;
    g.flag('lightsDone');
    await this.say(['ぽっ、ぽっ、ぽっ……やぐらの火が、通りの提灯へつぎつぎにうつっていく。', '町に、あたたかい灯りがもどった！']);
    this.questDone('提灯やぐらに灯りがともった！');
    await this.checkReady();
  }

  async clickGate() {
    const g = this.g, f = g.flags;
    this.focus(this.R.gate, 20);
    if (f.gateOpen) return this.clickSource();
    const lines = ['山の上、鳥居の先の【源泉の門】。かたく閉ざされている。', '錠前には、サルの顔の形をした鍵穴がある。'];
    if (g.has('gateKey')) lines.push('（持ち物の『源泉の門の鍵』が使えそうだ）');
    await this.say(lines);
  }

  async openGate() {
    const g = this.g;
    this.focus(this.R.gate, 20);
    g.take('gateKey');
    g.audio.play('unlock');
    await g.wait(0.3);
    g.audio.play('creak');
    await g.tweens.add({ duration: 1.2, onUpdate: (k) => this._gateVisual(k) });
    g.flag('gateOpen');
    await this.say(['ギィ……源泉の門がひらいた！']);
    this.questDone('源泉の門がひらいた！');
    await this.checkReady();
  }

  async clickSource() {
    const g = this.g, f = g.flags;
    this.focus(this.R.source, 18);
    if (!f.gateOpen) return this.clickGate();
    if (f.springFlow) return this.say(['源泉から、湯がこんこんとわき出している。']);
    if (!f.masuPlaced) {
      g.note('on-masu', '湯分けの台', '「湯の神さまへ、<b>ちょうど四合</b>」。五合升と三合升で四合を量って、樋へ流す。');
      const lines = ['源泉の湯口。湯はちょろちょろとしか出ていない。', 'そばの【湯分けの台】に五合升がひとつ。となりに、もうひとつ升を置く場所が空いている。', '台には「湯の神さまへ、ちょうど四合」と彫ってある。'];
      if (g.has('masu')) lines.push('（持ち物の『三合升』を置けそうだ）');
      return this.say(lines);
    }
    return this.openMasu();
  }

  async placeMasu() {
    const g = this.g;
    this.focus(this.R.source, 18);
    g.take('masu');
    this.R.masuSlot.visible = true;
    g.audio.play('click');
    g.flag('masuPlaced');
    await this.say(['湯分けの台に、三合升を置いた。']);
    return this.openMasu();
  }

  openMasu() {
    const g = this.g;
    g.note('on-masu', '湯分けの台', '「湯の神さまへ、<b>ちょうど四合</b>」。五合升と三合升で四合を量って、樋へ流す。');
    let pending = false;
    masuPanel(g.ui, g.audio, {
      onSolved: async (panel) => {
        pending = true;
        panel.close();
        await this.springFlows();
        pending = false;
      },
    });
    return this.waitPanel(() => pending);
  }

  async springFlows() {
    const g = this.g, R = this.R;
    g.cinematic = true;
    g.audio.play('water');
    await g.wait(0.6);
    this._setFlow(true);
    R.rotenWaterMat.opacity = 0;
    await g.tweens.add({ duration: 2.2, onUpdate: (k) => { R.rotenWaterMat.opacity = k * 0.85; R.rotenWater.position.y = 0.05 + k * 0.15; } });
    this.thaw = 0.25;
    this._applyThaw();
    g.cinematic = false;
    g.flag('springFlow');
    g.audio.play('steam');
    await this.say(['ゴボゴボゴボ……！ 源泉から、熱い湯がいきおいよくわき出した！', '湯は樋をつたって、共同浴場と、トンネルの氷のほうへ流れていく。']);
    this.questDone('源泉の湯が流れはじめた！');
    await this.checkReady();
  }

  async clickPortal() {
    const f = this.g.flags;
    this.focus(this.R.portal, 22);
    if (f.thawed) return this.say(['トンネルの氷はすっかりとけた。']);
    if (f.springFlow) return this.say(['トンネルの入口をふさぐ氷に、樋の湯がかかって、少しずつとけはじめている。']);
    await this.say(['山のトンネル「湯けむり隧道」。入口が分厚い氷でふさがれている。']);
  }

  // =========================================================
  // アイテムを使う
  // =========================================================
  async useItem(item, target) {
    const g = this.g, f = g.flags;
    if (target === 'roten') target = 'monkey';
    if (target === 'shop') target = 'fox';
    if (target === 'ryokan' && item === 'lanternLit') target = 'irori';
    if (target === 'ryokan') target = 'tanuki';
    if (target === 'masuStand') target = 'source';
    if (item === 'poker' && target === 'kama') {
      if (f.embersRaked) return this.say(['残り火はもう、かき出してある。']);
      return this.rakeEmbers();
    }
    if (item === 'lantern' && target === 'kama') {
      if (!f.embersRaked) return this.say(['残り火は灰の奥深く。このままでは火をうつせない。']);
      return this.lightLantern();
    }
    if (item === 'lanternLit' && (target === 'fox')) {
      if (f.foxHasFire) return this.say([{ who: 'fox', text: 'もう火はもらったよ。ありがとね。' }]);
      this.focus(this.fox.root, 16);
      return this.foxGetsFire();
    }
    if (item === 'lanternLit' && (target === 'irori' || target === 'tanuki')) {
      if (f.iroriLit) return this.say(['囲炉裏の火はもう燃えている。']);
      return this.lightIrori();
    }
    if (item === 'lanternLit' && target === 'yagura') {
      if (!f.foxHasFire) return this.say(['やぐらの提灯は高くて届かない。提灯屋のキツネにたのもう。']);
      return this.clickYagura();
    }
    if (item === 'amazake' && target === 'monkey') return this.giveAmazake();
    if (item === 'gateKey' && (target === 'gate' || target === 'source')) {
      if (f.gateOpen) return this.say(['門はもうひらいている。']);
      return this.openGate();
    }
    if (item === 'masu' && target === 'source') {
      if (!f.gateOpen) return this.say(['門が閉まっていて、源泉まで行けない。']);
      return this.placeMasu();
    }
    if (item === 'amazake' && target === 'tanuki') return this.say([{ who: 'tanuki', text: 'それは子ザルにあげておくれ。' }]);
    const talkers = { capy: 'それは、お客さまがお持ちください。', fox: 'それは提灯じゃないねえ。', tanuki: 'ぽん？ それはいらないよ。', monkey: 'キキ？ それじゃあったまらないよ……', frog: 'それはボイラーには入れられないケロ。' };
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
    await g.ui.banner('寂れた温泉街', 'STAGE 3', 2400);
    await g.say([
      'ほしまわり号は、雪のちらつく山あいの駅に着いた。',
      '湯けむりの里——『ゆげのさと』。……のはずが、湯けむりはひとすじも見えない。',
      '町は暗く、しんと静まりかえっている。',
    ]);
    await g.moveCamera(new V(5.5, 3.5, -1.2), new V(1.0, 1.0, -4.0), 1.6);
    g.audio.play('ribbit');
    await g.say([
      { who: 'frog', text: 'さ、さむいケロ……！ 線路の先のトンネルが、凍りついてるケロ！' },
      { who: 'frog', text: '共同浴場のカピバラさんなら、何か知ってるかもケロ。' },
    ]);
    const portrait = innerWidth < innerHeight;
    await g.moveCamera(portrait ? new V(8, 12, 20) : new V(7, 9, 16), new V(2.4, 1.4, 2.6), 2.0);
    g.cinematic = false;
    await this.talkCapy();
  }

  async finale() {
    const g = this.g, R = this.R;
    await this.say([
      { who: 'capy', text: 'おお……湯けむりが……町に灯りが……！ 湯の神さまも、きっとお喜びです。' },
      { who: 'capy', text: 'さあ、仕上げに——源泉の湯を、トンネルの氷へ！' },
    ]);
    g.cinematic = true;
    document.body.classList.add('cinematic');
    await g.moveCamera(new V(4, 6, 2), new V(11.5, 1.8, -6), 2.2);
    this.melting = true;
    g.audio.play('ice');
    await g.tweens.add({ duration: 4, ease: Ease.inOut, onUpdate: (k) => { this.thaw = 0.25 + k * 0.75; this._applyThaw(); } });
    this.melting = false;
    g.flag('thawed');
    this.thaw = 1;
    this._applyThaw();
    g.audio.play('solve');
    // 町がにぎわいを取りもどす
    for (const b of [...this.bathers, this.guest]) { b.root.visible = true; b.hop(); }
    await g.moveCamera(new V(5, 6, 9), new V(3.5, 0.8, 1.6), 2.2);
    await this.say([
      '氷がとけて、トンネルの口がぽっかりとひらいた。',
      '雪もとけ、湯けむりの中に、湯につかりにくるお客さんたちの姿が見える。',
      { who: 'rabbit', text: 'あら、あなた！ はざま駅で会ったわね。わたしも湯治に来ちゃった。' },
    ]);
    await g.moveCamera(new V(5.5, 3.5, -1.2), new V(1.0, 1.0, -4.0), 1.8);
    await this.say([
      { who: 'frog', text: 'トンネルが開いたケロ！ これで出発できるケロ〜！' },
      { who: 'capy', text: 'ありがとうございました。またいつでも、湯につかりにおいでください。' },
      'あなたは客車に乗りこみ、窓ぎわの席にすわった。',
    ]);
    g.flag('departed');
    g.refreshQuests();
    await this.departure();
  }

  async departure() {
    const g = this.g;
    await g.moveCamera(new V(5.5, 3.8, -1.0), new V(3, 1.3, -6.0), 2.0);
    g.audio.play('whistle');
    await g.wait(1.4);
    this.departing = true;
    g.tweens.add({ duration: 7, ease: Ease.in, onUpdate: (k) => { this.trainSpeed = 0.3 + k * 6; } });
    // トンネルに入っていく列車を見送る
    await g.moveCamera(new V(6, 3.5, -2.5), new V(11.5, 1.5, -6.0), 6);
    g.audio.play('whistle');
    await g.wait(2.5);
    await g.ui.fade(1, 1.8, '#fff8ec');
    this.departing = false;
    g.state.cleared = [...new Set([...(g.state.cleared || []), 'onsen'])];
    g.save();
    this.showClear();
  }

  showClear() {
    const g = this.g;
    const sec = Math.floor(g.state.elapsed);
    const time = `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒`;
    const body = el('div', 'clear');
    body.innerHTML = `
      <div class="clear-sub">STAGE 3 CLEAR</div>
      <div class="clear-main">寂れた温泉街</div>
      <div class="clear-stats"><div><span>プレイ時間</span><b>${time}</b></div><div><span>ヒント</span><b>${g.state.hints}回</b></div></div>
      <div class="route">
        <div class="route-stop done"><i></i>はざま駅</div>
        <div class="route-stop done"><i></i>天空の街</div>
        <div class="route-stop done"><i></i>寂れた温泉街</div>
        <div class="route-stop next"><i></i>勇者の城下町</div>
        <div class="route-stop"><i></i>現代日本</div>
      </div>
      <p class="clear-msg">湯けむりのトンネルをぬけて、ほしまわり号は走っていく。<br>次の停車駅は<em>勇者の城下町</em>。……つづきは準備中です。</p>
      <div class="clear-btns"><button class="btn primary" data-a="title">タイトルへ</button></div>`;
    g.ui.openPanel({ title: '', body, closable: false, cls: 'clear-panel' });
    body.querySelector('[data-a="title"]').onclick = () => g.goToStage('onsen', { autostart: false });
    g.ui.fade(0, 1.2, '#fff8ec');
  }
}
