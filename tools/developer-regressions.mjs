// 実際のタイトル・あいことば・保存・移動を確認。箱庭だけ仮実装にして通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROUTE, EXTRA_ROUTE } from '../src/data/route.js';

const stubRegistry = `
import { ROUTE, EXTRA_ROUTE } from '/src/data/route.js';
class CheckStage {
  constructor(g) { this.g = g; }
  build() {} applyState() {} update() {} quests() { return []; }
  opening() { this.g.flag('introDone'); this.g.ui.fade(0, 0); }
}
export const STAGES = ROUTE.map(s => ({ ...s, Stage: CheckStage }));
export const EXTRA_STAGES = EXTRA_ROUTE.map(s => ({ ...s, Stage: CheckStage }));
export const ALL_STAGES = [...STAGES, ...EXTRA_STAGES];
export const isPlayable = id => ALL_STAGES.some(s => s.id === id);
`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const oldSave = { stage: 'station', flags: { introDone: true, buttonTaken: true }, inventory: ['button'], counts: {}, elapsed: 120, hints: 1, cleared: [] };
const errors = [];
const base = process.env.BASE || 'http://localhost:8123';
await mkdir('shots/review', { recursive: true });
try {
  const p = await browser.newPage({ viewport: { width: 375, height: 812 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.route('**/src/stages/registry.js', r => r.fulfill({ contentType: 'text/javascript', body: stubRegistry }));
  await p.addInitScript(oldSave => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('developer-check-seeded')) {
      sessionStorage.setItem('developer-check-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify(oldSave));
    }
  }, oldSave);
  const ready = () => p.waitForSelector('#title:not(.hidden), .depart-gate.show', { timeout: 60000 });
  const settle = () => p.waitForTimeout(300); // パネルを閉じるアニメーション
  const saved = () => p.evaluate(() => localStorage.getItem('hoshimawari-save-v1'));
  const closePanels = async () => { await p.evaluate(() => __game.ui.closeAllPanels()); await settle(); };
  const pass = async word => {
    await p.locator('[data-act="pass"]').click();
    await p.locator('.pass-input').fill(word);
  };
  const openDeveloper = async () => {
    await p.locator('[data-act="stages"]').click();
    await p.locator('.dev-entry').click();
    await settle();
  };
  const choose = text => p.locator('.choice .btn').getByText(text, { exact: true }).click();
  const move = async (id, resume = false) => {
    await p.locator(`.developer-panel [data-stage="${id}"]`).click();
    await choose(resume ? 'つづきから' : '出発する');
    await p.waitForSelector('.depart-gate.show', { timeout: 60000 });
    assert.equal(await p.evaluate(() => __game.state.stage), id);
  };
  await p.goto(`${base}/index.html?low`); await ready();
  const before = await saved();
  assert.equal(await p.evaluate(() => __game.developerMode), false);
  await p.locator('[data-act="stages"]').click();
  assert.equal(await p.locator('.dev-entry, .route-extras').count(), 0);
  assert.equal(await p.locator('.stage-card:enabled').count(), 1);
  await closePanels();
  await pass('つごもりん'); await p.locator('.pass-form > .primary').click();
  await p.waitForFunction(() => document.querySelector('.pass-msg').textContent.includes('ちがう'));
  assert.equal(await p.evaluate(() => __game.developerMode), false); assert.equal(await saved(), before);
  await p.locator('.pass-input').fill('つごもりりん');
  await p.locator('.pass-input').dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  assert.equal(await p.locator('.developer-panel').count(), 0);
  await p.locator('.pass-input').press('Enter'); await p.waitForSelector('.developer-panel'); await settle();
  assert.equal(await p.evaluate(() => __game.developerMode), true); assert.equal(await saved(), before);
  assert.equal(await p.locator('.developer-panel .stage-card:enabled').count(), ROUTE.length + EXTRA_ROUTE.length);
  const matching = await p.evaluate(async () => {
    const { isDeveloperPass } = await import('/src/core/developer.js');
    const { ROUTE, stageByPass } = await import('/src/data/route.js');
    return { variants: ['つごもりりん', ' ツゴモリリン　', 'ﾂｺﾞﾓﾘﾘﾝ'].every(isDeveloperPass),
      wrong: ['', 'つごもりん', 'つごもりりんん'].every(w => !isDeveloperPass(w)),
      normal: ROUTE.filter(s => s.pass).every(s => stageByPass(s.pass)?.id === s.id) };
  });
  assert.deepEqual(matching, { variants: true, wrong: true, normal: true });
  console.log('OK 正しいあいことばだけで解禁・IME変換中は送信しない・全12駅・解禁時の進行保全');
  for (const [width, height, label] of [[375, 812, 'portrait'], [820, 520, 'landscape']]) {
    await p.setViewportSize({ width, height });
    assert.equal(await p.locator('.developer-panel').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    for (const button of await p.locator('.developer-panel button').all()) {
      await button.scrollIntoViewIfNeeded(); await button.click({ trial: true });
    }
    await p.locator('.developer-panel .panel-title').scrollIntoViewIfNeeded(); await settle();
    await p.screenshot({ path: `shots/review/developer-mode-${label}.png` });
  }
  await p.locator('.developer-panel [data-stage="kinoko"]').click();
  await choose('やめる'); await settle(); assert.equal(await saved(), before);
  await p.reload(); await ready(); assert.equal(await p.evaluate(() => __game.developerMode), true);
  await openDeveloper(); await move('museum');
  assert.deepEqual(await p.evaluate(() => __game.state.cleared), []);
  assert.deepEqual(await p.evaluate(() => __game.state.journeys.main.inventory), ['button']);
  await p.locator('.depart-gate button').click(); await p.waitForFunction(() => __game.playing && __game.flags.introDone); await settle();
  await p.evaluate(() => { __game.flag('developerCheck', 42); __game.save(); });
  await p.locator('#btn-menu').click(); await p.locator('.menu .btn').filter({ hasText: '開発モード' }).click(); await settle();
  await move('saga');
  assert.equal(await p.evaluate(() => __game.state.journeys.extras.museum.flags.developerCheck), 42);
  await p.locator('.depart-gate button').click(); await p.waitForFunction(() => __game.playing && __game.flags.introDone); await settle();
  await p.locator('#btn-menu').click(); await p.locator('.menu .btn').filter({ hasText: '開発モード' }).click(); await settle();
  await move('museum', true);
  assert.equal(await p.evaluate(() => __game.flags.developerCheck), 42);
  console.log('OK 再読込後も解禁・移動のキャンセル・未クリアで追加2旅へ移動・本編と追加旅の保存/再開');
  await p.locator('.depart-gate button').click(); await p.waitForFunction(() => __game.playing); await settle();
  await p.locator('#btn-menu').click(); await p.locator('.menu .btn').filter({ hasText: '開発モード' }).click(); await settle();
  const beforeDisable = await saved();
  await p.getByRole('button', { name: '開発モードを解除する', exact: true }).click();
  assert.equal(await saved(), beforeDisable); assert.equal(await p.evaluate(() => __game.developerMode), false);
  await p.reload(); await ready(); await p.locator('[data-act="stages"]').click();
  assert.equal(await p.locator('.dev-entry, .route-extras').count(), 0); await closePanels();
  await pass('ゆけむり'); await p.locator('.pass-form > .primary').click();
  await p.waitForSelector('.choice'); assert.match(await p.locator('.choice-q').innerText(), /巨大キノコの森/);
  await choose('やめる'); await closePanels();
  assert.equal(await p.evaluate(() => __game.developerMode), false);
  console.log('OK 解除して再読込しても非表示・解除時の進行保全・通常の駅のあいことばを維持');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
