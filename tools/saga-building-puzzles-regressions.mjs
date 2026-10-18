// 謎用看板の撤去と、建物・設備の実クリックだけを個別確認する。通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'shots/saga-building-puzzles';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const old = { stage: 'saga', flags: { introDone: true, saGuideMet: true,
  saDrafts: { shopping: { counts: [1, 0, 0, 0] }, sketch: { choices: [0, null, null, null] } } },
  inventory: ['sagaGuide'], counts: {}, elapsed: 180, hints: 1, cleared: ['japan'],
  notes: [{ id: 'old-note', stage: 'saga', title: '以前の記録', html: '記録を保持する' }] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(save => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('building-puzzles-seeded')) {
      sessionStorage.setItem('building-puzzles-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify(save));
    }
  }, old);
  const settle = () => page.waitForFunction(() => !__game.tweens.list.length && !__game.busy);
  const close = async () => {
    await page.evaluate(() => __game.ui.closeAllPanels());
    await page.waitForFunction(() => !document.querySelector('.panel-wrap'));
  };
  const ready = async () => {
    await page.waitForFunction(() => window.__game?.stage?.id === 'saga', null, { timeout: 240000 });
    await page.locator('[data-act="continue"]').click();
    await page.waitForFunction(() => __game.playing && getComputedStyle(document.querySelector('#fade')).opacity === '0');
    await page.evaluate(() => { __game.ui.questsCollapsed = true; __game.refreshQuests(); });
    await settle();
  };
  const shot = async name => {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `${out}/${name}.png` }); console.log(`SHOT ${name}`);
  };
  await page.goto(`${process.env.BASE || 'http://localhost:8123'}/index.html?stage=saga&ts=4`);
  await ready();
  const removed = await page.evaluate(() => ['busClue', 'shoppingClue', 'sluiceClue', 'balloonClue', 'sketchClue'].every(id =>
    !__game.stage.R[id] && !__game.interactables.has(id)));
  assert.equal(removed, true, '五つの独立した謎看板を模型・操作対象からすべて削除');

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const [site, target, puzzle] of [['station', 'sagaStation', 'bus'], ['mallage', 'mallageSaga', 'shopping'],
      ['sluice', 'sluice', 'sluice'], ['balloon', 'balloonBody', 'balloon'], ['house', 'kawakubo', 'sketch']]) {
      await close();
      await page.evaluate(async site => {
        const g = __game, s = g.stage, T = await import('three');
        if (site === 'house') await s.propertyView('front');
        else if (site === 'balloon') await g.focusOn(s.R.balloon.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 7, 0)),
          { dist: innerWidth < innerHeight ? 60 : 42, polar: 1.1, theta: .2, keepAngle: true, frameHigh: false });
        else await s.visit(site);
      }, site);
      await settle();
      if (viewport.width === 390 && ['mallage', 'house', 'sluice'].includes(site)) await shot(`${site}-no-board`);
      // 表面の画面上の点を拾い、Gameの実クリック経路を通す。
      const point = await page.evaluate(async target => {
        const T = await import('three'), g = __game, it = g.interactables.get(target), rect = g.renderer.domElement.getBoundingClientRect();
        g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
        for (const mesh of it.meshes) {
          if (mesh.userData.noPick) continue;
          const positions = mesh.geometry.attributes.position;
          for (let i = 0; i < positions.count; i += Math.max(1, Math.floor(positions.count / 100))) {
            const p = mesh.localToWorld(new T.Vector3().fromBufferAttribute(positions, i)).project(g.camera);
            if (Math.abs(p.x) > .80 || Math.abs(p.y) > .65 || Math.abs(p.z) >= 1) continue;
            const event = { clientX: rect.left + (p.x + 1) * rect.width / 2, clientY: rect.top + (1 - p.y) * rect.height / 2 };
            if (g._pick(event) === target) return event;
          }
        }
        return null;
      }, target);
      assert.ok(point, `${site}: 建物・設備に直接届くクリック点`);
      await page.mouse.click(point.clientX, point.clientY);
      const panel = page.locator(`.saga-puzzle.saga-${puzzle}`);
      await panel.waitFor(); await settle();
      assert.equal(await page.evaluate(() => __game.flags.saActivePuzzle), puzzle);
      await panel.locator('.sa-reference summary').click();
      assert.ok((await panel.locator('.sa-clue').innerText()).length > 30, '看板なしで手がかりを読める');
      if (puzzle === 'shopping') assert.equal(await panel.locator('.sa-quantity output').first().textContent(), '1個');
      if (puzzle === 'sketch') assert.equal(await panel.locator('[data-sketch="0"][data-shape="0"]').getAttribute('aria-pressed'), 'true');
      if (viewport.width === 390 && puzzle === 'sketch') await shot('house-puzzle');
      console.log(`PASS ${viewport.width} ${site}の実クリック→${puzzle}、手がかりと入力途中を表示`);
    }
  }
  await close();
  await page.evaluate(() => __game.stage.showGuide());
  assert.equal(await page.locator('.sa-guide-stop').count(), 5);
  await page.locator('.sa-guide-stop').last().getByRole('button', { name: 'メモを読む', exact: true }).click();
  await page.locator('.sa-notes').waitFor(); assert.ok((await page.locator('.sa-notes').innerText()).includes('屋根'));
  await close();
  const snapshot = () => page.evaluate(() => ({ flags: __game.flags, inventory: __game.state.inventory, notes: __game.state.notes, cleared: __game.state.cleared }));
  const before = await snapshot();
  assert.deepEqual(before.flags.saDrafts, old.flags.saDrafts);
  assert.deepEqual(before.inventory, old.inventory); assert.deepEqual(before.cleared, old.cleared);
  assert.ok(before.notes.some(n => n.id === 'old-note'));
  assert.equal(await page.evaluate(() => __game.stage.stamps.length), 0);
  await page.evaluate(() => __game.save()); await page.reload(); await ready();
  assert.deepEqual(await snapshot(), before); assert.deepEqual(errors, []);
  console.log('PASS 旅ノートのメモ・旧進行と入力途中の保存再読込・ページエラーなし');
} finally { await browser.close(); }
