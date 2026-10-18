// 佐賀の変更箇所だけを保存状態から個別検証する。本編・追加旅の通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:8123';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir('shots/review', { recursive: true });
let passed = 0;
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('saga-integration-seeded')) {
      sessionStorage.setItem('saga-integration-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: 'saga', cleared: ['japan'],
        flags: { introDone: true, saGuideMet: true, saDrafts: { shopping: { counts: [1, 0, 0, 0] } } }, inventory: ['sagaGuide'], counts: {}, elapsed: 32, hints: 0 }));
    }
  });
  const ready = async () => {
    await page.waitForSelector('#title:not(.hidden)', { timeout: 180000 });
    await page.locator('[data-act="continue"]').click();
    await page.waitForFunction(() => window.__game.playing);
    await page.evaluate(() => { __game.timeScale = 10; __game.ui.questsCollapsed = true; __game.refreshQuests(); });
    await settle();
  };
  const settle = () => page.waitForFunction(() => __game.tweens.list.length === 0, null, { timeout: 120000 });
  const shot = async name => {
    await settle();
    await page.waitForFunction(() => __game.ui.panels.every(p => p.root.parentElement?.classList.contains('show')));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `shots/review/${name}.png`, animations: 'disabled' });
  };
  const runScene = async code => {
    await page.evaluate(code => { window.__done = false; window.__error = null;
      Promise.resolve(Function('g', `return (${code});`)(__game)).then(() => { __done = true; }, e => { __error = e.stack; __done = true; }); }, code);
    await page.evaluate(async () => {
      const timer = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 65);
      try { const until = performance.now() + 90000; while (!__done && performance.now() < until) await new Promise(r => setTimeout(r, 100)); if (!__done) throw new Error('場面が終了しない'); if (__error) throw new Error(__error); }
      finally { clearInterval(timer); }
    });
    await settle();
  };
  await page.goto(`${base}/index.html`); await ready();
  for (const [id, expected] of [['station', 'sagaStation'], ['mallage', 'mallageSaga'], ['cinema', 'mallageSaga']]) {
    await page.evaluate(id => __game.stage.visit(id), id); await settle();
    const hit = await page.evaluate(() => __game._pick({ clientX: innerWidth / 2, clientY: innerHeight / 2 }));
    assert.equal(hit, expected, `${id}: 注視点への視界を他の建物や住人がふさがない`);
    await shot(`saga-final-${id}-landscape`);
  }
  await page.evaluate(() => __game.stage.visit('mallageWhole')); await shot('saga-final-mall-whole');
  await page.evaluate(() => __game.stage.propertyView('front')); await shot('saga-final-house-landscape');
  passed++; console.log('OK 実箱庭: 3施設のカメラ・中央の視界・モール全体');

  await page.evaluate(() => __game.stage.openPuzzle('bus'));
  await page.locator('.sa-check').click();
  assert.equal(await page.evaluate(() => !!__game.flags.saBusDone), false);
  for (let i = 0; i < 3; i++) await page.locator(`[data-leg="${i}"][data-bus="1"]`).click();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('hoshimawari-save-v1')).flags.saDrafts.bus.choices);
  assert.deepEqual(draft, [1, 1, 1]);
  await page.evaluate(() => { window.__busFinish = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 65); });
  await page.locator('.sa-check').click();
  await page.waitForFunction(() => __game.flags.saBusDone && !__game.busy && !__game.ui.dialogueActive, null, { timeout: 90000 });
  await page.evaluate(() => clearInterval(__busFinish));
  assert.equal(await page.evaluate(() => __game.state.notes.some(n => n.id === 'sa-stamp-bus')), true);
  passed++; console.log('OK 実Game: 誤答・入力保存・正解コールバック・スタンプとメモ');

  await page.reload(); await ready();
  assert.equal(await page.evaluate(() => !!__game.flags.saBusDone), true);
  await page.evaluate(() => __game.stage.visit('cinema')); await shot('saga-final-cinema-landscape');
  await page.evaluate(() => __game.stage.openPuzzle('shopping'));
  assert.equal(await page.locator('.sa-quantity output').first().textContent(), '1個');
  await page.evaluate(() => __game.ui.closeAllPanels());
  passed++; console.log('OK 再読込: 達成済みの寄り道と別の謎の途中経過を復元');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => __game.stage.visit('whole')); await shot('saga-final-whole-portrait');
  await page.evaluate(() => __game.stage.showGuide()); await shot('saga-final-guide-portrait');
  const panel = page.locator('.saga-panel');
  assert.equal(await panel.evaluate(p => p.scrollWidth <= p.clientWidth + 1), true);
  await page.getByRole('button', { name: /川久保の街角 屋根/ }).click();
  await settle(); await page.locator('.sa-property-guide').waitFor();
  await page.getByRole('button', { name: '正面から', exact: true }).click();
  await shot('saga-final-house-portrait');
  await page.evaluate(() => __game.stage.propertyView('left')); await shot('saga-final-house-left-portrait');
  await page.evaluate(() => __game.stage.visit('station')); await shot('saga-final-station-portrait');
  await page.evaluate(() => __game.stage.visit('mallage')); await shot('saga-final-mallage-portrait');
  passed++; console.log('OK 縦画面: 旅ノートの行き先を実クリックし、建物の視点へ移動');

  // 終幕は全印を持つ別の保存状態から、入口と保存だけ個別に確認する。
  await page.evaluate(() => { for (const flag of ['saBusDone','saShoppingDone','saSluiceDone','saBalloonDone','saSketchDone']) __game.flag(flag); __game.stage.applyState(); });
  await runScene('g.stage.finale()');
  assert.equal(await page.evaluate(() => __game.flags.finaleDone && __game.state.cleared.includes('saga')), true);
  assert.equal(await page.locator('.clear-panel .clear-main').innerText(), '田舎の寄り道');
  assert.equal(await page.getByRole('button', { name: /追加の旅を選ぶ/ }).count(), 1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hoshimawari-save-v1')));
  assert.equal(saved.flags.finaleDone, true); assert.ok(saved.cleared.includes('japan') && saved.cleared.includes('saga'));
  await shot('saga-final-clear-portrait');
  passed++; console.log('OK 終幕の個別状態: 演出・クリア保存・追加旅への入口');

  assert.deepEqual(errors, []); console.log(`PASS ${passed} checks; shots/review/saga-final-*`);
} finally { await browser.close(); }
