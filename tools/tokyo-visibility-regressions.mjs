// 東京の変更箇所だけを、通常画質・一つのブラウザで確認する。通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:8123';
const out = process.env.OUT || 'shots/tokyo-visibility';
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
    localStorage.setItem('hoshimawari-save-v1', JSON.stringify({
      stage: 'japan', flags: { introDone: true, bellGot: true }, inventory: ['koBell'],
      counts: {}, elapsed: 123, hints: 0, cleared: ['toy'], notes: [],
    }));
  });
  await page.goto(`${base}/index.html?stage=japan&ts=4`);
  await page.waitForFunction(() => window.__game?.stage?.id === 'japan', null, { timeout: 240000 });
  await page.locator('[data-act="continue"]').click();
  await page.waitForFunction(() => __game.playing && !__game.tweens.list.length);

  // 可視面を5点調べる。支柱など同じ模型の別部品も遮蔽物として数える。
  await page.evaluate(async () => {
    const T = await import('three');
    window.tokyoVisibilityRay = (point, ignored = new Set()) => {
      const g = __game, delta = point.clone().sub(g.camera.position);
      const ray = new T.Raycaster(g.camera.position, delta.clone().normalize(), 0, delta.length() - .006);
      ray.camera = g.camera;
      return ray.intersectObject(g.scene, true).filter(({ object }) => {
        if (ignored.has(object)) return false;
        for (let p = object; p; p = p.parent) if (!p.visible) return false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        return materials.some(m => m && m.visible && m.opacity >= .5);
      }).map(({ object, distance }) => ({ name: object.name || object.parent?.name || object.type, distance }));
    };
    window.tokyoVisibilityFace = id => {
      const g = __game, face = id === 'plate' ? g.stage.plate : g.stage.R[id];
      g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
      face.geometry.computeBoundingBox();
      const box = face.geometry.boundingBox, center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
      return [[0, 0], [-.3, 0], [.3, 0], [0, -.3], [0, .3]].map(([x, y]) => {
        const point = face.localToWorld(center.clone().add(new T.Vector3(x * size.x, y * size.y, 0)));
        const screen = point.clone().project(g.camera);
        return { screen: screen.toArray(), blocked: tokyoVisibilityRay(point, new Set([face])) };
      });
    };
  });
  const shot = async name => {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `${out}/${name}.png` }); console.log(`SHOT ${name}`);
  };
  const checkFace = async id => {
    const points = await page.evaluate(id => tokyoVisibilityFace(id), id);
    assert.ok(points.every(p => Math.abs(p.screen[0]) < .97 && Math.abs(p.screen[1]) < .97 && Math.abs(p.screen[2]) < 1), `${id}が画面内に収まる`);
    assert.deepEqual(points.flatMap(p => p.blocked), [], `${id}の文字面が埋まらない`);
  };
  const closePanels = async () => {
    await page.evaluate(() => __game.ui.closeAllPanels());
    await page.waitForFunction(() => !document.querySelector('.panel-wrap'));
  };
  const area = async id => {
    await closePanels();
    await page.evaluate(() => __game.stage.openAreaGuide());
    await page.locator(`[data-area="${id}"]`).click();
    await page.waitForFunction(() => !__game.tweens.list.length);
  };
  const startAction = async id => {
    await page.evaluate(id => {
      const g = __game; g.busy = true; window.tokyoActionDone = false;
      Promise.resolve(g.interactables.get(id).onClick()).then(() => { window.tokyoActionDone = true; g.busy = false; });
    }, id);
  };
  const finishAction = async () => {
    await closePanels();
    await page.evaluate(() => { window.tokyoAdvance = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 80); });
    await page.waitForFunction(() => tokyoActionDone && !__game.ui.dialogueActive && !__game.tweens.list.length);
    await page.evaluate(() => clearInterval(tokyoAdvance));
  };
  const platformFits = async () => {
    const info = await page.evaluate(async () => {
      const { Box3, Vector3 } = await import('three');
      const g = __game, R = g.stage.R, platform = R.asakusaPlatform;
      g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
      const points = [];
      for (const x of [-6.6, 6.6]) for (const z of [-1.5, 1.5]) points.push(platform.localToWorld(new Vector3(x, .75, z)));
      points.push(R.platformClockFace.getWorldPosition(new Vector3()));
      const p = platform.getWorldPosition(new Vector3()), temple = new Box3().setFromObject(R.hondo);
      return { x: p.x, templeGap: temple.min.x - (p.x + 6.6), fits: points.map(p => p.project(g.camera).toArray()) };
    });
    assert.ok(info.x < -24 && info.templeGap > 2, 'ホームを寺から離れた西側へ移す');
    assert.ok(info.fits.every(p => Math.abs(p[0]) < .97 && Math.abs(p[1]) < .97 && Math.abs(p[2]) < 1), 'ホーム全体と時計が案内視点に収まる');
    await checkFace('platformClockFace');
  };
  const frog = async suffix => {
    await startAction('frog');
    await page.waitForFunction(() => __game.ui.dialogueActive && !__game.tweens.list.length);
    const views = await page.evaluate(async () => {
      const { Vector3 } = await import('three'), g = __game, c = g.stage.frog;
      g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
      const own = new Set(); c.root.traverse(o => own.add(o));
      const face = c.eyes.map(o => o.getWorldPosition(new Vector3()));
      const forward = new Vector3(0, 0, 1).transformDirection(c.root.matrixWorld);
      const cameraDirection = g.camera.position.clone().sub(c.head.getWorldPosition(new Vector3())).normalize();
      return { facing: forward.dot(cameraDirection), eyes: face.map(point => ({
        screen: point.clone().project(g.camera).toArray(), blocked: tokyoVisibilityRay(point, own),
      })) };
    });
    assert.ok(views.facing > .7, 'カエルの顔を正面寄りから見る');
    assert.ok(views.eyes.every(p => Math.abs(p.screen[0]) < .9 && Math.abs(p.screen[1]) < .9));
    assert.deepEqual(views.eyes.flatMap(p => p.blocked), [], 'カエルの両目が建物に隠れない');
    await shot(`frog-${suffix}`); await finishAction();
  };

  const initial = await page.evaluate(() => ({
    title: __game.stage.title, low: __game.low, highway: !!__game.stage.R.highway,
    highwayTarget: __game.interactables.has('highway'), akiba: !!__game.stage.R.akiba,
    retained: ['yamanote', 'bridge', 'tideBoard', 'platformClock', 'zoo'].every(id => __game.interactables.get(id)?.meshes.length),
  }));
  assert.equal(initial.title, '東京'); assert.equal(initial.low, false);
  assert.ok(!initial.highway && !initial.highwayTarget && !initial.akiba && initial.retained);
  console.log('PASS 東京の名称・手前の高速撤去・背景の鉄道と謎の操作対象を維持');

  await area('platform'); await platformFits(); await shot('platform-landscape');
  // 実際の時計を調べる操作でも、屋根の外から文字盤を見せる。
  await startAction('platformClock');
  await page.waitForFunction(() => __game.ui.dialogueActive && !__game.tweens.list.length);
  await checkFace('platformClockFace'); await finishAction();
  await frog('landscape');

  await startAction('tideBoard');
  await page.waitForFunction(() => __game.ui.panelOpen && !__game.tweens.list.length);
  await checkFace('tideBoardFace');
  assert.ok(await page.locator('.pier-board').textContent().then(t => t.includes('夜四つ')));
  await closePanels(); await shot('tide-board-landscape'); await finishAction();
  await startAction('zoo');
  await page.waitForFunction(() => __game.ui.dialogueActive && !__game.tweens.list.length);
  await checkFace('zooSign'); await shot('zoo-sign-landscape'); await finishAction();

  await page.setViewportSize({ width: 390, height: 844 });
  await area('platform'); await platformFits(); await shot('platform-portrait');
  await startAction('platformClock');
  await page.waitForFunction(() => __game.ui.dialogueActive && !__game.tweens.list.length);
  await checkFace('platformClockFace'); await finishAction();
  await frog('portrait');
  // 潮見表・門の近景は縦画面でも同じ操作を通し、画像は横画面の二枚に絞る。
  for (const [id, face] of [['tideBoard', 'tideBoardFace'], ['zoo', 'zooSign']]) {
    await startAction(id);
    await page.waitForFunction(() => (__game.ui.panelOpen || __game.ui.dialogueActive) && !__game.tweens.list.length);
    await checkFace(face); await finishAction();
  }
  console.log('PASS 縦横のホーム全景・時計・潮見表・動物園看板の遮蔽なし・カエルの正面会話');

  await page.setViewportSize({ width: 1280, height: 800 });
  const clue = await page.evaluate(async () => {
    const { Vector3 } = await import('three');
    const { VEND, VEND_PLAQUE } = await import('/src/stages/japan/panels.js');
    const g = __game, s = g.stage;
    const used = s.inspectItem('koBell');
    await g.focusOn(s.plate.getWorldPosition(new Vector3()), { dist: 4.8, theta: 0, polar: 1.23, keepAngle: true });
    return { used, heading: VEND_PLAQUE.heading, numbers: VEND_PLAQUE.numbers,
      caption: VEND_PLAQUE.caption, answer: VEND, texture: [s.plateMat.map.image.width, s.plateMat.map.image.height] };
  });
  await page.waitForFunction(() => !__game.tweens.list.length && __game.stage.plate.visible && __game.stage.plateMat.opacity > .9);
  assert.ok(clue.used); assert.equal([...clue.heading].reverse().join(''), '井戸の札');
  const kanji = { 四: 4, 七: 7, 弐: 2 };
  assert.deepEqual([...clue.numbers.replaceAll(' ', '')].reverse().map(c => kanji[c]), clue.answer);
  assert.equal(clue.caption, undefined); assert.deepEqual(clue.texture, [512, 320]);
  await shot('well-plaque-reading-direction');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    __game.stage.inspectItem('koBell');
    const { vendingPanel } = await import('/src/stages/japan/panels.js');
    window.tokyoVendingSolved = 0;
    vendingPanel(__game.ui, __game.audio, { onSolved: () => { window.tokyoVendingSolved++; } });
  });
  const press = async digits => page.evaluate(digits => {
    const buttons = document.querySelectorAll('.vd-b'); digits.forEach(n => buttons[n - 1].click());
  }, digits);
  // 同じイベントループで連打し、誤答表示中に次の入力が紛れ込まないか調べる。
  const rejected = await page.evaluate(() => {
    const buttons = document.querySelectorAll('.vd-b');
    [4, 7, 2, 2, 7, 4].forEach(n => buttons[n - 1].click());
    return { message: document.querySelector('.vd-msg').textContent,
      sequence: document.querySelector('.vd-seq').textContent, solved: tokyoVendingSolved };
  });
  assert.match(rejected.message, /見出しが読める向き/);
  assert.equal(rejected.sequence, '4 · 7 · 2'); assert.equal(rejected.solved, 0);
  await page.waitForFunction(() => document.querySelector('.vd-seq').textContent === '— · — · —');
  await press([2]); await page.locator('.vd-reset').click();
  assert.equal(await page.locator('.vd-seq').textContent(), '— · — · —');
  for (const button of await page.locator('.vd-b, .vd-reset').all()) {
    await button.scrollIntoViewIfNeeded(); await button.click({ trial: true });
  }
  assert.ok(await page.locator('.vendp').evaluate(e => e.scrollWidth <= e.clientWidth));
  await shot('vending-portrait');
  await press([2, 7, 4]);
  await page.waitForFunction(() => tokyoVendingSolved === 1);
  await press([2, 7, 4]); await page.locator('.vd-reset').click();
  assert.equal(await page.evaluate(() => tokyoVendingSolved), 1);
  assert.match(await page.locator('.vd-msg').textContent(), /キュウリ味ラムネ/);
  assert.deepEqual(errors, []);
  console.log('PASS むかし目の札から274を推理・472の誤読案内・連打防止・手動取消・報酬通知一回・縦画面の全操作');
} finally { await browser.close(); }
