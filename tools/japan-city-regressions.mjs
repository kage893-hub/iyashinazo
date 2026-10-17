// 通しプレイをせず、東京の新しい模型・見通し・保存を実箱庭で個別確認する。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:8123';
const out = process.env.OUT || 'shots/japan-city';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.addInitScript(() => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (sessionStorage.getItem('city-seeded')) return;
    sessionStorage.setItem('city-seeded', '1');
    localStorage.setItem('hoshimawari-save-v1', JSON.stringify({
      stage: 'japan', flags: { introDone: true, bellGot: true }, inventory: ['koBell'],
      counts: {}, elapsed: 123, hints: 2, cleared: ['toy'],
      notes: [{ id: 'city-existing', stage: 'japan', title: '以前の記録', html: '保存確認' }],
    }));
  });
  await page.goto(`${base}/index.html?stage=japan&ts=4`);
  await page.waitForFunction(() => window.__game?.stage?.id === 'japan', null, { timeout: 240000 });
  await page.locator('[data-act="continue"]').click();
  await page.waitForFunction(() => __game.playing && !__game.tweens.list.length);
  const shot = async name => {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `${out}/${name}.png` }); console.log(`SHOT ${name}`);
  };
  const area = async id => {
    await page.evaluate(() => __game.ui.closeAllPanels());
    await page.waitForFunction(() => !document.querySelector('.japan-area-panel'));
    await page.evaluate(() => __game.stage.openAreaGuide());
    await page.locator(`[data-area="${id}"]`).click();
    await page.waitForFunction(() => !__game.tweens.list.length);
    if (id === 'shibuya') {
      const fits = await page.evaluate(async () => {
        const { Box3, Vector3 } = await import('three');
        const g = __game, R = g.stage.R, result = [];
        g.scene.updateMatrixWorld(true);
        for (const id of ['visionBldg', 'shibuya109', 'fashion', 'ramen']) {
          const box = new Box3().setFromObject(R[id]);
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            const p = new Vector3(x, y, z).project(g.camera);
            result.push(Math.abs(p.x) < .97 && Math.abs(p.y) < .97);
          }
        }
        return result.every(Boolean);
      });
      assert.ok(fits, '渋谷の建物が画面の端で切れない');
    }
  };

  const geometry = await page.evaluate(async () => {
    const T = await import('three');
    const { buildTokyoSkyline } = await import('/src/stages/japan/skyline.js');
    const { applyJapanLayout, layoutPoint } = await import('/src/stages/japan/layout.js');
    const { mergeStatic } = await import('/src/lib/merge.js');
    const { SHIBUYA_WALKS } = await import('/src/stages/japan/shibuya-streets.js');
    const s = __game.stage, R = s.R, holder = new T.Group(), sky = { winMats: [] };
    buildTokyoSkyline(holder, sky); applyJapanLayout(holder);
    const towers = sky.skyline.children.filter(o => o.isGroup);
    const boxes = towers.map(o => new T.Box3().setFromObject(o));
    const intersections = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[i].intersectsBox(boxes[j])) intersections.push([towers[i].name, towers[j].name]);
    }
    const finite = [], clockHands = []; holder.traverse(o => {
      if (o.geometry) finite.push(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
      if (o.name === 'clock-hour' || o.name === 'clock-minute') clockHands.push([o.name, o.rotation.z]);
    });
    mergeStatic(sky.skyline); let merged = 0; sky.skyline.traverse(o => { if (o.isMesh) merged++; });
    const bounds = ['visionBldg', 'shibuya109', 'ramen', 'fashion', 'shibuyaEntry', 'cafe'].map(id => ({
      id, box: new T.Box3().setFromObject(R[id]),
    }));
    const overlap = [];
    for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
      if (bounds[i].box.intersectsBox(bounds[j].box)) overlap.push([bounds[i].id, bounds[j].id]);
    }
    const anchors = [['visionBldg', -.6, -2.5], ['ramen', 2.9, -2.45], ['vending', 2.1, 4.5]].map(([id,x,z]) =>
      R[id].getWorldPosition(new T.Vector3()).distanceTo(layoutPoint(new T.Vector3(x,0,z))));
    const registered = ['vision', 'ramen', 'fashion', 'shibuya109', 'shibuyaEntry', 'vending', 'neko']
      .every(id => __game.interactables.get(id)?.meshes.length > 0);
    return { towers: towers.length, intersections, finite: finite.every(Boolean), merged,
      overlap, anchors, registered, walks: SHIBUYA_WALKS.length, clockHands,
      screen: [R.visionCanvas.width,R.visionCanvas.height],
      cars: R.roadCars.every(c => c.maxX <= -18 || c.minX >= 7.3) };
  });
  assert.equal(geometry.towers, 13); assert.deepEqual(geometry.intersections, []);
  assert.ok(geometry.finite && geometry.merged <= 20); assert.deepEqual(geometry.overlap, []);
  assert.ok(geometry.anchors.every(d => d < 1e-7));
  assert.ok(geometry.registered && geometry.cars); assert.equal(geometry.walks, 5);
  assert.deepEqual(geometry.screen, [512, 320]);
  assert.equal(geometry.clockHands.length, 8);
  assert.ok(geometry.clockHands.every(([name, angle]) => Math.abs(angle - (name === 'clock-hour' ? -Math.PI * 4 / 3 : 0)) < 1e-8), '四面時計も謎の手がかりと同じ午後8時');
  console.log('PASS 模型の非交差・有限頂点・静的結合・謎の旧アンカー・操作対象・歩道と車');

  await area('shibuya'); await shot('shibuya-before-lights');
  await page.evaluate(() => {
    Object.assign(__game.flags, { subwayDone: true, meishoDone: true, towerLit: true, ramuneGot: true, tegataGot: true });
    __game.stage.applyState();
  });
  await shot('shibuya-night');
  await area('skyline'); await shot('skyline-night');
  await page.evaluate(async () => {
    const { Vector3 } = await import('three'), s = __game.stage;
    const p = s.R.tocho.getWorldPosition(new Vector3()); p.y = 8;
    await __game.focusOn(p, { dist: 49, polar: 1.12, theta: .12, keepAngle: true });
  });
  await shot('skyline-tocho-detail');
  await page.evaluate(async () => {
    const { Vector3 } = await import('three');
    await __game.focusOn(new Vector3(6, 7, -17), { dist: 55, polar: 1.13, theta: .08, keepAngle: true });
  });
  await shot('skyline-curves-clock');

  const conversation = async (who, method, suffix) => {
    await page.evaluate(method => {
      const g = __game; g.busy = true; window.cityTalkDone = false;
      g.stage[method]().then(() => { window.cityTalkDone = true; g.busy = false; });
    }, method);
    await page.waitForFunction(() => __game.ui.dialogueActive && !__game.tweens.list.length);
    const blocked = await page.evaluate(async who => {
      const { Raycaster, Vector3 } = await import('three');
      const g = __game, c = g.stage[who], own = new Set(); c.root.traverse(o => own.add(o));
      g.scene.updateMatrixWorld(true);
      const points = [c.eyes[0], c.eyes[1]].map(o => o.getWorldPosition(new Vector3()));
      for (const x of [-.25, .25]) points.push(c.root.localToWorld(new Vector3(x, .65, .1)));
      return points.reduce((count, point) => {
        const delta = point.clone().sub(g.camera.position);
        const ray = new Raycaster(g.camera.position, delta.clone().normalize(), 0, delta.length() - .02); ray.camera = g.camera;
        return count + ray.intersectObject(g.scene, true).filter(hit => {
          const o = hit.object, m = o.material;
          if (own.has(o) || !m || Array.isArray(m) || m.opacity < .5) return false;
          for (let p = o; p; p = p.parent) if (!p.visible) return false;
          return true;
        }).length;
      }, 0);
    }, who);
    await shot(`${who}-${suffix}`); assert.equal(blocked, 0, `${who}の顔が隠れない`);
    await page.evaluate(() => window.cityAdvance = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 100));
    await page.waitForFunction(() => cityTalkDone);
    await page.evaluate(() => clearInterval(cityAdvance));
  };
  await conversation('neko', 'talkNeko', 'landscape');
  await conversation('frog', 'talkFrog', 'landscape');
  await page.setViewportSize({ width: 390, height: 844 });
  await area('shibuya'); await shot('shibuya-portrait');
  await conversation('neko', 'talkNeko', 'portrait');
  await area('skyline'); await shot('skyline-portrait');
  await page.evaluate(() => __game.stage.openAreaGuide());
  assert.equal(await page.locator('[data-area]').count(), 9);
  for (const button of await page.locator('[data-area]').all()) {
    await button.scrollIntoViewIfNeeded(); await button.click({ trial: true });
  }
  assert.ok(await page.locator('.japan-area-panel').evaluate(e => e.scrollWidth <= e.clientWidth));
  await shot('districts-portrait');
  await page.evaluate(() => __game.ui.closeAllPanels());
  await area('shibuya');
  await page.evaluate(() => __game.stage._setMukashi(true, true));
  await shot('shibuya-mukashi-portrait');
  const snapshot = () => page.evaluate(() => ({ flags: { ...__game.flags }, inventory: [...__game.state.inventory],
    cleared: [...__game.state.cleared], notes: __game.state.notes }));
  const saved = await snapshot(); await page.evaluate(() => __game.save());
  await page.reload();
  await page.waitForFunction(() => window.__game?.stage?.id === 'japan', null, { timeout: 240000 });
  assert.deepEqual(await snapshot(), saved); assert.deepEqual(errors, []);
  console.log('PASS 通常画質の点灯前後・縦横の会話と地区・9地区の操作・むかし目・旧セーブ復元');
} finally { await browser.close(); }
