// 実際の起動画面と保存を使う。箱庭だけ軽い仮の駅に置き換え、通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:8123';
const stubRegistry = `
import { ROUTE, EXTRA_ROUTE } from '/src/data/route.js';
import { Vector3 } from 'three';
class CheckStage {
  constructor(g) { this.g = g; this.questTitle = '動作確認'; }
  build() {}
  applyState() {}
  update() {}
  quests() { return []; }
  homeView() { return [new Vector3(12, 30, 40), new Vector3(0, 1, 0)]; }
  opening() { window.openings = (window.openings || 0) + 1; this.g.flag('introDone'); this.g.ui.fade(0, 0); }
}
export const STAGES = ROUTE.map(s => ({ ...s, Stage: CheckStage }));
export const EXTRA_STAGES = EXTRA_ROUTE.map(s => ({ ...s, Stage: CheckStage }));
export const ALL_STAGES = [...STAGES, ...EXTRA_STAGES];
export const isPlayable = id => ALL_STAGES.some(s => s.id === id);
`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const oldSave = { stage: 'japan', flags: { introDone: true, departed: true, towerLit: true }, inventory: ['koBell'], counts: {}, elapsed: 720, hints: 3, cleared: ['japan'] };
await mkdir('shots/review', { recursive: true });
let passed = 0;
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.route('**/src/stages/registry.js', r => r.fulfill({ contentType: 'text/javascript', body: stubRegistry }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('extra-test-seeded')) {
      sessionStorage.setItem('extra-test-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: 'japan', flags: { introDone: true, departed: true, towerLit: true }, inventory: ['koBell'], counts: {}, elapsed: 720, hints: 3, cleared: ['japan'] }));
    }
  });
  const ready = () => page.waitForSelector('#title:not(.hidden), .depart-gate.show', { timeout: 60000 });
  const depart = async () => {
    await page.locator('.depart-gate button').click();
    await page.waitForFunction(() => window.__game?.playing && window.__game.flags.introDone);
    await page.waitForTimeout(1100);
  };
  const openFromMenu = async () => {
    await page.locator('#btn-menu').click();
    await page.locator('.menu .btn').filter({ hasText: '追加の旅' }).click();
    await page.waitForSelector('.extra-panel');
    await page.waitForTimeout(270);
  };
  const test = async (name, fn) => { await fn(); passed++; console.log(`OK ${name}`); };
  await page.goto(`${base}/index.html?low`);
  await ready();

  await test('旧セーブの japan クリアでタイトルから追加を選び、初回の導入を一度だけ再生する', async () => {
    await page.evaluate(async () => {
      const { showStageClear } = await import('/src/stages/clear.js');
      showStageClear(__game, 'japan', '終点に着いた。');
    });
    assert.equal(await page.locator('.clear [data-a="extras"]').count(), 1);
    await page.evaluate(() => __game.ui.closeAllPanels());
    await page.waitForTimeout(300);
    await page.locator('[data-act="extras"]').click();
    await page.waitForSelector('.extra-panel .extra-station');
    await page.waitForTimeout(300);
    assert.match(await page.locator('.extra-panel').innerText(), /星あかりの博物館/);
    await page.screenshot({ animations: 'disabled', path: 'shots/review/extra-selection-portrait.png' });
    await page.locator('.extra-station .primary').click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    assert.equal(await page.evaluate(() => __game.state.stage), 'museum');
    assert.equal(await page.evaluate(() => window.openings), 1);
    assert.deepEqual(await page.evaluate(() => __game.state.inventory), []);
  });

  await test('追加の旅から本編へ戻り、追加の持ち物・メモ・時間を続きから復帰する', async () => {
    await page.evaluate(() => {
      const g = __game;
      g.flags.galleryOpen = true; g.state.inventory = ['koBell']; g.state.elapsed = 180; g.state.hints = 2;
      g.state.notes = [{ id: 'museum-test', stage: 'museum', title: '星のメモ', html: '旅の手がかり' }];
      g.save();
    });
    await openFromMenu();
    await page.locator('.extra-main-return').click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    const main = await page.evaluate(() => ({ stage: __game.state.stage, flags: __game.flags, inventory: __game.state.inventory, hints: __game.state.hints, openings: window.openings || 0 }));
    assert.equal(main.stage, 'japan'); assert.deepEqual(main.flags, oldSave.flags);
    assert.deepEqual(main.inventory, oldSave.inventory); assert.equal(main.hints, oldSave.hints); assert.equal(main.openings, 0);
    await openFromMenu();
    await page.locator('.extra-station .primary').click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    const extra = await page.evaluate(() => ({ flags: __game.flags, inventory: __game.state.inventory, elapsed: __game.state.elapsed, hints: __game.state.hints, note: __game.state.notes[0].id, openings: window.openings || 0 }));
    assert.equal(extra.flags.galleryOpen, true); assert.deepEqual(extra.inventory, ['koBell']);
    assert.ok(extra.elapsed >= 180 && extra.elapsed < 210); assert.equal(extra.hints, 2); assert.equal(extra.note, 'museum-test'); assert.equal(extra.openings, 0);
  });

  await test('追加のクリア画面から選択へ戻り、やり直しても本編とクリア記録を保つ', async () => {
    await page.evaluate(async () => {
      __game.state.cleared.push('museum'); __game.save();
      const { showStageClear } = await import('/src/stages/clear.js');
      showStageClear(__game, 'museum', '博物館の灯りに見送られた。');
    });
    assert.equal(await page.locator('.clear .rt').count(), 0);
    await page.locator('.clear [data-a="extras"]').click();
    await page.waitForSelector('.extra-panel');
    await page.setViewportSize({ width: 820, height: 520 });
    await page.waitForTimeout(300);
    await page.screenshot({ animations: 'disabled', path: 'shots/review/extra-selection-landscape.png' });
    await page.locator('.extra-restart').click();
    await page.locator('.choice .btn').filter({ hasText: 'やめる' }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => __game.flags.galleryOpen), true);
    await page.locator('.extra-restart').click();
    await page.locator('.choice .btn').filter({ hasText: '最初から出発する' }).click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    const reset = await page.evaluate(() => ({ flags: __game.flags, inventory: __game.state.inventory, cleared: __game.state.cleared, main: __game.state.journeys.main, openings: window.openings }));
    assert.deepEqual(reset.flags, { introDone: true }); assert.deepEqual(reset.inventory, []);
    assert.deepEqual(reset.cleared, ['japan', 'museum']); assert.equal(reset.main.flags.towerLit, true); assert.equal(reset.openings, 1);
  });

  await test('本編クリア前の入口はロックし、?stage=museum は動作確認に使える', async () => {
    await page.evaluate(() => {
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: 'station', flags: { introDone: true }, inventory: [], counts: {}, elapsed: 0, hints: 0, cleared: [] }));
    });
    await page.goto(`${base}/index.html?low`);
    await ready();
    await page.locator('[data-act="extras"]').click();
    await page.waitForSelector('.extra-locked');
    assert.equal(await page.locator('.extra-station').count(), 0);
    await page.goto(`${base}/index.html?low&stage=museum`);
    await ready();
    assert.equal(await page.evaluate(() => __game.state.stage), 'museum');
    assert.match(await page.locator('.title-stage').innerText(), /追加の旅/);
    await page.evaluate(() => __game.goToStage('station'));
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    assert.equal(await page.evaluate(() => __game.state.stage), 'station');
    assert.equal(new URL(page.url()).searchParams.has('stage'), false, '移動前の stage query を持ち越さない');
  });
  assert.deepEqual(errors, []);
  console.log(`PASS ${passed} checks`);
} finally {
  await browser.close();
}
