// 実UIで5つの謎だけを個別操作する。箱庭や本編の通しプレイはしない。
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
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/src/main.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(`${base}/index.html?low`);
  await page.evaluate(async () => {
    const { UI } = await import('/src/core/ui.js');
    window.__saga = await import('/src/stages/saga/panels.js');
    window.__sounds = [];
    window.__audio = { play: (name) => __sounds.push(name) };
    window.__ui = new UI(__audio);
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#title').classList.add('hidden');
    await __ui.fade(0, 0);
  });
  assert.equal(await page.locator('link[href*="saga.css"]').count(), 1, '実ページで専用CSSを読み込んでいる');
  assert.equal(await page.locator('#fade').evaluate((e) => getComputedStyle(e).opacity), '0');

  const close = async () => { await page.evaluate(() => __ui.closeAllPanels()); await page.waitForTimeout(270); };
  const open = async (kind, draft = {}) => {
    await page.evaluate(({ kind, draft }) => {
      window.__solves = 0; window.__changes = 0; window.__draft = structuredClone(draft);
      window.__panel = __saga[`${kind}Panel`](__ui, __audio, {
        draft,
        onChange(next) { __changes++; __draft = JSON.parse(JSON.stringify(next)); },
        onSolved(panel) { if (panel !== __panel) throw new Error('正解通知のパネルが違う'); __solves++; },
      });
    }, { kind, draft });
    await page.locator('.panel-wrap.show .saga-panel').waitFor();
    await page.waitForTimeout(220);
    assert.equal(await page.evaluate(() => __solves), 0, `${kind}: 復帰だけでは自動クリアしない`);
  };
  const currentDraft = () => page.evaluate(() => structuredClone(__draft));
  const resume = async (kind) => {
    assert.ok(await page.evaluate(() => __changes > 0), `${kind}: 入力のたびに保存できる`);
    const draft = await currentDraft(); await close(); await open(kind, draft);
    assert.deepEqual(await currentDraft(), draft, `${kind}: JSONで保存した途中経過から復帰できる`);
    return draft;
  };
  const shot = async (kind, label, suffix) => {
    await page.locator('.saga-panel').evaluate((e) => { e.scrollTop = 0; });
    await page.screenshot({ path: `shots/review/saga-panel-${kind}-${label}-${suffix}.png`, animations: 'disabled' });
  };
  const reachable = async (kind, viewport) => {
    const panel = page.locator('.saga-panel'), box = await panel.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${kind}: パネルが画面内に収まる`);
    assert.ok(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), `${kind}: 横にはみ出さない`);
    const unreachable = await panel.evaluate((root) => {
      const failures = [];
      for (const button of root.querySelectorAll('.saga-puzzle button')) {
        button.scrollIntoView({ block: 'center', inline: 'nearest' });
        const a = root.getBoundingClientRect(), b = button.getBoundingClientRect();
        if (b.x < a.x - 1 || b.y < a.y - 1 || b.right > a.right + 1 || b.bottom > a.bottom + 1) failures.push(button.textContent.trim());
      }
      root.scrollTop = 0; return failures;
    });
    assert.deepEqual(unreachable, [], `${kind}: スクロールで全操作に到達できる`);
  };
  const wrong = async (pattern) => {
    await page.locator('.sa-check').click();
    assert.equal(await page.evaluate(() => __solves), 0);
    assert.match(await page.locator('.sa-message').innerText(), pattern);
  };
  const solved = async (kind, viewport) => {
    await page.locator('.sa-check').click();
    assert.equal(await page.evaluate(() => __solves), 1, `${kind}: 同じ操作の中で正解を1回通知`);
    assert.equal(await page.locator('.saga-puzzle.solved').count(), 1);
    assert.equal(await page.locator('.saga-puzzle button:enabled').count(), 0, `${kind}: 正解後の操作を無効化`);
    await page.evaluate(() => { document.querySelector('.sa-check').onclick(); document.querySelector('.sa-check').onclick(); });
    assert.equal(await page.evaluate(() => __solves), 1, `${kind}: 二重判定も1回だけ`);
    await shot(kind, viewport.label, 'after');
    await close(); passed++; console.log(`OK ${viewport.width}×${viewport.height} ${kind}: 正誤・途中復帰・操作到達・正解1回`);
  };

  for (const viewport of [{ width: 375, height: 812, label: 'portrait' }, { width: 820, height: 520, label: 'landscape' }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const kind of ['bus', 'shopping', 'sluice', 'balloon', 'sketch']) {
      await open(kind); await reachable(kind, viewport); await shot(kind, viewport.label, 'before');
      if (kind === 'bus') {
        assert.equal(await page.locator('[data-bus][aria-pressed="true"]').count(), 0, '初期状態で答えを選ばない');
        await wrong(/3区間/);
        await page.locator('[data-leg="0"][data-bus="0"]').focus(); await page.keyboard.press('Space');
        await page.locator('[data-leg="1"][data-bus="1"]').click(); await page.locator('[data-leg="2"][data-bus="1"]').click();
        await wrong(/9:10/);
        await page.locator('[data-leg="0"][data-bus="1"]').click();
        const draft = await resume(kind); assert.deepEqual(draft.choices, [1, 1, 1]);
        assert.equal(await page.locator('[data-leg="0"][data-bus="1"]').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-leg="0"][data-bus="1"]').click(); await wrong(/3区間/);
        await page.locator('[data-leg="0"][data-bus="1"]').click();
        assert.match(await page.locator('.sa-bus-receipt').innerText(), /10:55着/);
      } else if (kind === 'shopping') {
        assert.deepEqual(await page.locator('.sa-quantity output').allTextContents(), ['0個', '0個', '0個', '0個']);
        await wrong(/6個・1,000円/);
        await page.locator('[data-item="0"][data-delta="1"]').click();
        const draft = await resume(kind); assert.deepEqual(draft.counts, [1, 0, 0, 0]);
        assert.equal(await page.locator('.sa-quantity output').first().innerText(), '1個');
        for (let i = 0; i < 4; i++) for (let n = draft.counts[i]; n < [2, 1, 1, 2][i]; n++) await page.locator(`[data-item="${i}"][data-delta="1"]`).click();
        assert.match(await page.locator('.sa-receipt-total').innerText(), /6個/);
        assert.match(await page.locator('.sa-receipt-total').innerText(), /1,000円/);
      } else if (kind === 'sluice') {
        await wrong(/3枚の田/);
        await page.locator('[data-gate="0"][data-setting="2"]').click();
        const draft = await resume(kind); assert.equal(draft.values[0], 2);
        assert.equal(await page.locator('[data-gate="0"][data-setting="2"]').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('.sa-house-status').textContent(), /水が流入/);
        for (let i = 0; i < 5; i++) await page.locator(`[data-gate="${i}"][data-setting="${[2, 0, 0, 2, 0][i]}"]`).click();
        assert.equal(await page.locator('.sa-field.wet').count(), 3);
        assert.match(await page.locator('.sa-house-status').textContent(), /流さない/);
      } else if (kind === 'balloon') {
        await wrong(/すべて通り、9回/);
        await page.locator('[data-height="2"]').click();
        assert.match(await page.locator('.sa-message').innerText(), /盤の外/);
        assert.deepEqual(await currentDraft(), {}, '盤外へは動かず、保存する経路も変えない');
        await page.locator('[data-height="0"]').click(); await page.locator('[data-height="0"]').click();
        await page.locator('[data-height="2"]').click(); assert.match(await page.locator('.sa-message').innerText(), /強風域/);
        const draft = await resume(kind); assert.deepEqual(draft.heights, [0, 0]);
        assert.match(await page.locator('.sa-flight-status').innerText(), /2 \/ 9回/);
        assert.equal(await page.locator('.sa-flight-mark.visited').count(), 1);
        await page.locator('.sa-back').click(); assert.deepEqual((await currentDraft()).heights, [0]);
        for (const h of [0, 1, 2, 1, 1, 0, 0]) await page.locator(`[data-height="${h}"]`).click();
        assert.equal(await page.locator('.sa-flight-mark.visited').count(), 3);
        assert.match(await page.locator('.sa-flight-status').innerText(), /8 \/ 9回/);
      } else {
        assert.equal(await page.locator('[data-sketch][aria-pressed="true"]').count(), 0);
        await wrong(/4か所すべて/);
        for (let i = 0; i < 4; i++) await page.locator(`[data-sketch="${i}"][data-shape="3"]`).click();
        await wrong(/まだ合っていない/);
        assert.equal(await page.locator('.sa-sketch-options .correct, .sa-sketch-options .wrong').count(), 0, '個別の正誤で答えを漏らさない');
        await page.locator('[data-sketch="0"][data-shape="1"]').click();
        const draft = await resume(kind); assert.deepEqual(draft.choices, [1, 3, 3, 3]);
        await page.locator('.sa-revisit').click();
        await page.waitForTimeout(270); assert.equal(await page.locator('.panel-wrap').count(), 0);
        await open(kind, await currentDraft());
        assert.equal(await page.locator('[data-sketch="0"][data-shape="1"]').getAttribute('aria-pressed'), 'true');
        for (let i = 1; i < 4; i++) await page.locator(`[data-sketch="${i}"][data-shape="${[1, 2, 0, 1][i]}"]`).click();
      }
      await solved(kind, viewport);
    }
  }

  await open('balloon', { heights: [0, 0, 1] });
  await page.locator('.sa-reset').click(); assert.deepEqual((await currentDraft()).heights, []);
  assert.equal(await page.locator('.sa-back').isDisabled(), true);
  await page.locator('.sa-reference summary').click(); await page.locator('.sa-check').scrollIntoViewIfNeeded();
  await wrong(/すべて通り、9回/); await close(); passed++; console.log('OK 風読み: やり直しで開始地点へ戻り、手がかりを開いても最終操作に到達');

  // 不正なセーブデータを受け取った場合も、各パネルが空・初期状態から安全に始まる。
  for (const kind of ['bus', 'shopping', 'sluice', 'balloon', 'sketch']) {
    await open(kind, { choices: [99, -1, 'x', null], counts: [99, -1, 'x', null], values: [99, -1, 'x', null, 99], heights: [99] });
    await page.locator('.sa-reset').click(); await wrong(/3区間|6個|3枚|9回|4か所/); await close();
  }
  passed++; console.log('OK 全5パネル: 欠損・型違い・範囲外のセーブにも対応');
  assert.deepEqual(errors, []);
  console.log(`PASS ${passed} checks; screenshots: shots/review/saga-panel-*`);
} finally { await browser.close(); }
