// 東京の札と名所合わせだけを確認。通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'shots/japan-puzzle-choices';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(120000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('hoshimawari-muted', '1');
    localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: 'japan',
      flags: { introDone: true, bellGot: true }, inventory: ['koBell'], cleared: ['toy'],
      counts: {}, elapsed: 120, hints: 0, notes: [{ id: 'jp-well-plaque', stage: 'japan', title: '井戸の札',
        html: '見出し：<b>札の戸井</b><br>数字：<b>四 七 弐</b><br>見出しと同じ向きに読む' }] }));
  });
  await page.goto(`${process.env.BASE || 'http://localhost:8123'}/index.html?stage=japan&ts=4`);
  await page.waitForFunction(() => window.__game?.stage?.id === 'japan', null, { timeout: 240000 });
  await page.locator('[data-act="continue"]').click();
  await page.waitForFunction(() => __game.playing && !__game.tweens.list.length);
  const shot = async name => {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `${out}/${name}.png` }); console.log(`SHOT ${name}`);
  };
  const caption = await page.evaluate(async () => {
    const { VEND_PLAQUE, VEND } = await import('/src/stages/japan/panels.js'), T = await import('three'), g = __game;
    g.stage.inspectItem('koBell');
    await g.focusOn(g.stage.plate.getWorldPosition(new T.Vector3()), { dist: 4.8, theta: 0, polar: 1.23, keepAngle: true });
    g.save();
    return { keys: Object.keys(VEND_PLAQUE), note: g.state.notes.find(n => n.id === 'jp-well-plaque').html,
      savedNote: JSON.parse(localStorage.getItem('hoshimawari-save-v1')).notes.find(n => n.id === 'jp-well-plaque').html, answer: VEND };
  });
  assert.deepEqual(caption.keys, ['heading', 'numbers']); assert.deepEqual(caption.answer, [2, 7, 4]);
  assert.doesNotMatch(caption.note, /見出しと同じ/); assert.equal(caption.note, caption.savedNote);
  await page.waitForFunction(() => !__game.tweens.list.length && __game.stage.plateMat.opacity > .9);
  await shot('plaque-without-caption');
  await page.evaluate(async () => {
    __game.stage.inspectItem('koBell');
    const { meishoPanel } = await import('/src/stages/japan/panels.js');
    window.meishoSolved = 0;
    meishoPanel(__game.ui, __game.audio, { onSolved: () => { window.meishoSolved++; } });
  });
  await page.locator('.meishop').waitFor();
  const inspectOrders = () => page.evaluate(async () => {
    const { MODERN } = await import('/src/stages/japan/panels.js');
    const orders = [...document.querySelectorAll('.ms-pick')].map(b => {
      const values = []; for (let i = 0; i < MODERN.length; i++) { b.click(); values.push(b.textContent); }
      b.click(); return { values, reset: b.textContent };
    });
    return { original: MODERN, orders };
  });
  const validate = info => {
    assert.equal(info.orders.length, 7);
    for (const order of info.orders) {
      assert.deepEqual([...order.values].sort(), [...info.original].sort());
      assert.notDeepEqual(order.values, info.original); assert.equal(order.reset, '？');
    }
    assert.equal(new Set(info.orders.map(o => JSON.stringify(o.values))).size, 7);
  };
  validate(await inspectOrders());
  await page.evaluate(async () => {
    const { MEISHO } = await import('/src/stages/japan/panels.js');
    document.querySelectorAll('.ms-pick').forEach((b, i) => { b.click(); if (b.textContent === MEISHO[i].a) b.click(); });
    document.querySelector('.ms-go').click();
  });
  assert.equal(await page.evaluate(() => meishoSolved), 0); assert.match(await page.locator('.ms-msg').innerText(), /0つ正解/);
  await shot('shuffled-choices-portrait');
  await page.evaluate(async () => {
    const { MEISHO } = await import('/src/stages/japan/panels.js');
    document.querySelectorAll('.ms-pick').forEach((b, i) => { for (let k = 0; k < 10 && b.textContent !== MEISHO[i].a; k++) b.click(); });
    document.querySelector('.ms-go').click();
  });
  await page.waitForFunction(() => meishoSolved === 1);
  await page.locator('.ms-go').click(); assert.equal(await page.evaluate(() => meishoSolved), 1);
  assert.match(await page.locator('.ms-msg').innerText(), /ぜんぶ正解/);
  await page.setViewportSize({ width: 1280, height: 800 }); await shot('correct-choices-landscape');
  await page.evaluate(() => __game.ui.closeAllPanels());
  await page.waitForFunction(() => !document.querySelector('.meishop'));
  await page.evaluate(async () => {
    const { meishoPanel } = await import('/src/stages/japan/panels.js'), random = Math.random;
    // 乱数が偏った場合でも、元の答え順・行同士の同じ順番に戻さない。
    try { Math.random = () => 0; meishoPanel(__game.ui, __game.audio, { onSolved: () => {} }); }
    finally { Math.random = random; }
  });
  validate(await inspectOrders()); assert.deepEqual(errors, []);
  console.log('PASS 補足文の撤去・旧メモ更新・各行の全候補と別順序・誤答と正解・一回の通知・再表示');
} finally { await browser.close(); }
