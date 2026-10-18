// 変更した施設・看板・会話だけを旧セーブから確認する。通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { EXTRA_ROUTE, ROUTE } from '../src/data/route.js';

assert.equal(ROUTE.find(s => s.id === 'japan').name, '東京');
const extra = EXTRA_ROUTE.find(s => s.id === 'saga');
assert.equal(extra.name, '田舎の寄り道');
assert.doesNotMatch(JSON.stringify(extra), /佐賀|川久保/);
const out = 'shots/rural-refresh';
const views = new Set((process.env.VIEWS || 'bakery,bistro,yoshinogari,house,roundone,frog').split(','));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const old = { stage: 'saga', flags: { introDone: true, saGuideMet: true, saBusDone: true,
  saDrafts: { shopping: { counts: [1, 0, 0, 0] } } }, inventory: ['sagaGuide'], counts: {},
  elapsed: 180, hints: 1, cleared: ['japan'], notes: [{ id: 'legacy', stage: 'saga', title: '以前の便り', html: '保存確認' }] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.addInitScript(save => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('refresh-seeded')) {
      sessionStorage.setItem('refresh-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify(save));
    }
  }, old);
  const settle = () => page.waitForFunction(() => !__game.tweens.list.length && !__game.ui.dialogueActive && !__game.stage.sideBusy);
  const ready = async () => {
    await page.waitForFunction(() => window.__game?.stage?.id === 'saga', null, { timeout: 240000 });
    await page.locator('[data-act="continue"]').click();
    await page.waitForFunction(() => __game.playing && getComputedStyle(document.querySelector('#fade')).opacity === '0');
    await page.evaluate(() => { __game.timeScale = 4; __game.ui.questsCollapsed = true; __game.refreshQuests(); });
    await settle();
  };
  const shot = async name => {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `${out}/${name}.png` }); console.log(`SHOT ${name}`);
  };
  await page.goto(`${process.env.BASE || 'http://localhost:8123'}/index.html?stage=saga&ts=4`);
  await ready();
  const geometry = await page.evaluate(async () => {
    const T = await import('three'), s = __game.stage, R = s.R;
    R.root.updateMatrixWorld(true);
    const lots = Object.entries(R.cityLots);
    const failures = [];
    for (const [id, lot] of lots) {
      const box = new T.Box3().setFromObject(R[id].root);
      if (box.min.x < lot.x[0] - .02 || box.max.x > lot.x[1] + .02 || box.min.z < lot.z[0] - .02 || box.max.z > lot.z[1] + .02) failures.push(id);
    }
    const crop = [], matrix = new T.Matrix4(), p = new T.Vector3();
    for (let i = 0; i < R.rice.count; i++) {
      R.rice.getMatrixAt(i, matrix); p.setFromMatrixPosition(matrix).applyMatrix4(R.rice.matrixWorld);
      for (const [id, lot] of lots) if (p.x > lot.x[0] && p.x < lot.x[1] && p.z > lot.z[0] && p.z < lot.z[1]) crop.push(id);
    }
    const shed = R.property.shed;
    const frog = s.residents.frog, frogBox = new T.Box3().setFromObject(frog.root);
    const frogBlocked = [R.station.root, R.roundone.root].some(root => frogBox.intersectsBox(new T.Box3().setFromObject(root)));
    // 街区全体のAABBは空地も含むので、個々の店舗で確認する。
    const shops = Object.values(R.streetScenes).filter(p => ['嵜本ベーカリー','花と緑の店'].includes(p.name));
    const frogInShop = shops.some(p => frogBox.intersectsBox(new T.Box3().setFromObject(p.root)));
    return { failures, crop, north: R.yoshinogari.root.position.z < R.roundone.root.position.z,
      signGone: !R.mapBoard && !R.northwestBoard && R.station.sign.children.length === 0,
      registered: ['yoshinogari', 'bistro', 'street_bakery', 'roundone'].every(id => __game.interactables.get(id)?.meshes.some(m => !m.userData.noPick && __game.pickList.includes(m))),
      shedAngle: shed.rotation.y, frogInShop, frogBlocked, title: s.title };
  });
  assert.deepEqual(geometry.failures, []); assert.deepEqual(geometry.crop, []);
  assert.ok(geometry.north && geometry.signGone && geometry.registered);
  assert.equal(geometry.shedAngle, Math.PI / 2); assert.equal(geometry.frogInShop, false); assert.equal(geometry.frogBlocked, false);
  assert.equal(geometry.title, '田舎の寄り道');
  console.log('PASS 敷地・稲との非交差・北の遺跡・不要看板撤去・操作対象・作業場の向き');

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const id of ['bakery', 'bistro', 'yoshinogari'].filter(id => views.has(id))) {
      await page.evaluate(id => __game.stage.visit(id), id); await settle();
      const fit = await page.evaluate(async id => {
        const T = await import('three'), g = __game;
        const root = id === 'bakery' ? g.stage.R.streetScenes.bakery.root : g.stage.R[id].root;
        g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(root), points = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          const p = new T.Vector3(x, y, z).project(g.camera);
          points.push(Math.abs(p.x) < .99 && Math.abs(p.y) < .99 && Math.abs(p.z) < 1);
        }
        return points.every(Boolean);
      }, id);
      assert.ok(fit, `${id}: ${viewport.width} 模型全体が画面に収まる`);
      await shot(`${id}-${viewport.width}`);
    }
    if (views.has('house')) {
      await page.evaluate(() => __game.stage.propertyView('front')); await settle(); await shot(`house-${viewport.width}`);
    }
    await page.evaluate(() => __game.stage.showGuide());
    await page.waitForSelector('.sa-guide');
    for (const text of ['嵜本ベーカリー', '山カフェレストランKUREHA', '吉野ヶ里遺跡']) {
      const b = page.locator('.sa-destination').filter({ hasText: text });
      assert.equal(await b.count(), 1); await b.scrollIntoViewIfNeeded(); await b.click({ trial: true });
    }
    assert.ok(await page.locator('.sa-guide').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
    await page.evaluate(() => __game.ui.closeAllPanels());
    await page.waitForFunction(() => !document.querySelector('.sa-guide'));
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const theta of (views.has('roundone') ? [-.85, .85] : [])) {
    await page.evaluate(theta => {
      const g = __game, m = g.stage.R.roundone;
      return g.focusOn(m.root.localToWorld(m.focusTarget.clone()), { dist: 48, polar: 1.05, theta, keepAngle: true });
    }, theta); await settle(); await shot(`roundone-${theta < 0 ? 'left' : 'right'}`);
  }
  if (views.has('frog')) {
    await page.evaluate(() => {
      __game.busy = true; window.refreshTalkDone = false;
      __game.stage.talkFrog().then(() => { window.refreshTalkDone = true; __game.busy = false; });
    });
    await page.waitForFunction(() => __game.ui.dialogueActive && !__game.tweens.list.length);
    await shot('frog');
    await page.evaluate(() => window.refreshAdvance = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 75));
    await page.waitForFunction(() => refreshTalkDone); await page.evaluate(() => clearInterval(refreshAdvance));
  }
  const snapshot = () => page.evaluate(() => ({ flags: { ...__game.flags }, inventory: [...__game.state.inventory],
    cleared: [...__game.state.cleared], notes: __game.state.notes }));
  const before = await snapshot();
  assert.deepEqual(before.flags, old.flags); assert.deepEqual(before.notes, old.notes);
  await page.evaluate(() => __game.save()); await page.reload(); await ready();
  assert.deepEqual(await snapshot(), before); assert.deepEqual(errors, []);
  console.log('PASS 縦横の行き先・会話・旧セーブと入力途中の保存再読込・ページエラーなし');
} finally { await browser.close(); }
