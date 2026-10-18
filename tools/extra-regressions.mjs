// 実際の起動画面と保存を使う。箱庭だけ軽い仮の駅に置き換え、通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROUTE, EXTRA_ROUTE } from '../src/data/route.js';
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
  await page.addInitScript(({ oldSave }) => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('extra-test-seeded')) {
      sessionStorage.setItem('extra-test-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify(oldSave));
    }
  }, { oldSave });
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
  // 追加の旅は増えても、旅先の名前でカードを一意に特定する。
  const card = (id) => page.locator('.extra-station').filter({
    has: page.getByRole('heading', { name: EXTRA_ROUTE.find(s => s.id === id).name, exact: true }),
  });
  const departTo = async (id) => {
    await card(id).locator('.primary').click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    assert.equal(await page.evaluate(() => __game.state.stage), id);
  };
  const progress = () => page.evaluate(() => {
    const { stage, flags, inventory, counts, elapsed, hints, notes } = __game.state;
    return { stage, flags, inventory, counts, elapsed, hints, notes };
  });
  const assertProgress = (actual, expected) => {
    for (const key of ['stage', 'flags', 'inventory', 'counts', 'hints', 'notes']) assert.deepEqual(actual[key], expected[key], key);
    assert.ok(actual.elapsed >= expected.elapsed && actual.elapsed < expected.elapsed + 60, 'ほかの旅にいた時間を加算せず復帰する');
  };
  let museumProgress, sagaProgress;
  const test = async (name, fn) => { await fn(); passed++; console.log(`OK ${name}`); };
  await page.goto(`${base}/index.html?low`);
  await ready();

  await test('旧セーブの japan クリアで博物館と佐賀の2枚を選べて、初回の導入を一度だけ再生する', async () => {
    await page.evaluate(async () => {
      const { showStageClear } = await import('/src/stages/clear.js');
      showStageClear(__game, 'japan', '終点に着いた。');
    });
    assert.equal(await page.locator('.clear [data-a="extras"]').count(), 1);
    await page.evaluate(() => __game.ui.closeAllPanels());
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#title [data-act="extras"]').count(), 0);
    await page.locator('[data-act="stages"]').click();
    await page.waitForSelector('.route-panel .route-extras .extra-station');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.route-panel .stage-card').count(), ROUTE.length);
    assert.equal(await page.locator('.extra-station').count(), EXTRA_ROUTE.length);
    assert.equal(await card('museum').count(), 1);
    assert.equal(await card('saga').count(), 1);
    assert.match(await card('museum').innerText(), /新しい旅/);
    assert.match(await card('saga').innerText(), /新しい旅/);
    for (const [width, height, label] of [[375, 812, 'portrait'], [820, 520, 'landscape']]) {
      await page.setViewportSize({ width, height });
      await page.locator('.route-extras-title').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.route-panel').evaluate(p => p.scrollWidth <= p.clientWidth), true, '路線図が横にはみ出さない');
      await page.screenshot({ animations: 'disabled', path: `shots/review/extra-route-${label}.png` });
      for (const button of await page.locator('.route-extras button').all()) {
        await button.scrollIntoViewIfNeeded();
        await button.click({ trial: true });
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await departTo('museum');
    assert.equal(await page.evaluate(() => window.openings), 1);
    assert.deepEqual(await page.evaluate(() => __game.state.inventory), []);
  });

  await test('博物館の途中で佐賀へ出発し、博物館の持ち物・メモ・時間を続きから復帰する', async () => {
    await page.evaluate(() => {
      const g = __game;
      g.flags.galleryOpen = true; g.state.inventory = ['museumGuide']; g.state.counts = { museumTest: 3 }; g.state.elapsed = 180; g.state.hints = 2;
      g.state.notes = [{ id: 'museum-test', stage: 'museum', title: '星のメモ', html: '旅の手がかり' }];
      g.save();
    });
    museumProgress = await progress();
    await openFromMenu();
    await departTo('saga');
    assert.equal(await page.evaluate(() => window.openings), 1);
    assert.deepEqual(await page.evaluate(() => __game.flags), { introDone: true });
    assert.deepEqual(await page.evaluate(() => __game.state.inventory), []);
    await page.evaluate(() => {
      const g = __game;
      g.flags.testSagaStamp = true; g.state.inventory = ['marble']; g.state.counts = { sagaTest: 4 }; g.state.elapsed = 240; g.state.hints = 1;
      g.state.notes = [{ id: 'saga-test', stage: 'saga', title: '街角のメモ', html: '佐賀の手がかり' }];
      g.save();
    });
    sagaProgress = await progress();
    await openFromMenu();
    await departTo('museum');
    assertProgress(await progress(), museumProgress);
    assert.equal(await page.evaluate(() => window.openings || 0), 0);
  });

  await test('博物館から本編へ戻ったあと佐賀を再開し、3つの旅の進行を個別に保つ', async () => {
    await openFromMenu();
    await page.locator('.extra-main-return').click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    const main = await page.evaluate(() => ({ stage: __game.state.stage, flags: __game.flags, inventory: __game.state.inventory, hints: __game.state.hints, openings: window.openings || 0 }));
    assert.equal(main.stage, 'japan'); assert.deepEqual(main.flags, oldSave.flags);
    assert.deepEqual(main.inventory, oldSave.inventory); assert.equal(main.hints, oldSave.hints); assert.equal(main.openings, 0);
    await openFromMenu();
    await departTo('saga');
    assertProgress(await progress(), sagaProgress);
    assert.equal(await page.evaluate(() => window.openings || 0), 0);
    assert.equal(await page.evaluate(() => __game.state.journeys.extras.museum.flags.galleryOpen), true);
  });

  await test('佐賀のクリア画面から博物館をやり直しても、本編・佐賀・両方のクリア記録を保つ', async () => {
    await page.evaluate(async () => {
      __game.state.cleared.push('museum', 'saga'); __game.flags.departed = true; __game.save();
      const { showStageClear } = await import('/src/stages/clear.js');
      showStageClear(__game, 'saga', '佐賀の街角に見送られた。');
    });
    sagaProgress = await progress();
    assert.equal(await page.locator('.clear .rt').count(), 0);
    await page.locator('.clear [data-a="extras"]').click();
    await page.waitForSelector('.extra-panel');
    await page.setViewportSize({ width: 820, height: 520 });
    await page.waitForTimeout(300);
    await page.screenshot({ animations: 'disabled', path: 'shots/review/extra-selection-landscape.png' });
    assert.match(await card('museum').innerText(), /★ CLEAR/);
    assert.match(await card('saga').innerText(), /★ CLEAR/);
    await card('museum').locator('.extra-restart').click();
    await page.locator('.choice .btn').filter({ hasText: 'やめる' }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => __game.state.stage), 'saga');
    assert.equal(await page.evaluate(() => __game.state.journeys.extras.museum.flags.galleryOpen), true);
    await card('museum').locator('.extra-restart').click();
    await page.locator('.choice .btn').filter({ hasText: '最初から出発する' }).click();
    await page.waitForSelector('.depart-gate.show', { timeout: 60000 });
    await depart();
    const reset = await page.evaluate(() => ({ flags: __game.flags, inventory: __game.state.inventory, cleared: __game.state.cleared, main: __game.state.journeys.main, openings: window.openings }));
    assert.deepEqual(reset.flags, { introDone: true }); assert.deepEqual(reset.inventory, []);
    assert.deepEqual(reset.cleared, ['japan', 'museum', 'saga']); assert.equal(reset.main.flags.towerLit, true); assert.equal(reset.openings, 1);
    await openFromMenu();
    await departTo('saga');
    assertProgress(await progress(), sagaProgress);
    assert.equal(await page.evaluate(() => window.openings || 0), 0);
    assert.deepEqual(await page.evaluate(() => __game.state.journeys.extras.museum.flags), { introDone: true });
  });

  await test('本編クリア前はタイトル・路線図・メニューに追加の旅を表示せず、個別確認用URLは保つ', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const stage of ['station', 'japan']) {
      await page.evaluate(({ stage, cleared }) => {
        localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage, flags: { introDone: true }, inventory: [], counts: {}, elapsed: 0, hints: 0, cleared }));
      }, { stage, cleared: stage === 'japan' ? ROUTE.slice(0, -1).map(s => s.id) : [] });
      await page.goto(`${base}/index.html?low`);
      await ready();
      assert.equal(await page.locator('#title [data-act="extras"]').count(), 0);
      if (stage === 'station') await page.screenshot({ animations: 'disabled', path: 'shots/review/extra-title-hidden.png' });
      await page.locator('[data-act="stages"]').click();
      await page.waitForSelector('.route-panel');
      assert.equal(await page.locator('.route-panel .stage-card').count(), ROUTE.length);
      assert.equal(await page.locator('.route-extras, .extra-station').count(), 0);
      await page.evaluate(() => __game.ui.closeAllPanels());
      await page.waitForTimeout(300);
      await page.locator('[data-act="continue"]').click();
      await page.waitForFunction(() => __game.playing);
      await page.locator('#btn-menu').click();
      assert.equal(await page.locator('.menu .btn').filter({ hasText: '追加の旅' }).count(), 0);
    }
    await page.goto(`${base}/index.html?low&stage=museum`);
    await ready();
    assert.equal(await page.evaluate(() => __game.state.stage), 'museum');
    assert.match(await page.locator('.title-stage').innerText(), /追加の旅/);
    await page.goto(`${base}/index.html?low&stage=saga`);
    await ready();
    assert.equal(await page.evaluate(() => __game.state.stage), 'saga');
    assert.match(await page.locator('.title-stage').innerText(), /田舎の寄り道/);
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
