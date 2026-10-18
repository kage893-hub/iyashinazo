// npm run serve のあとに実行。実際のUI・CSSで5つの展示だけを操作し、通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:8123';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
await mkdir('shots/review', { recursive: true });
let passed = 0;
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/src/main.js', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(`${base}/index.html?low`);
  await page.evaluate(async () => {
    const { UI } = await import('/src/core/ui.js');
    window.__museum = await import('/src/stages/museum/panels.js');
    window.__sounds = [];
    window.__audio = { play: (name) => __sounds.push(name) };
    window.__ui = new UI(__audio);
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#title').classList.add('hidden');
    await __ui.fade(0, 0);
    // 失敗後・閉じた後に古い処理が入力を消さないことを確認する。
    const originalTimeout = window.setTimeout.bind(window), originalInterval = window.setInterval.bind(window);
    const originalClearTimeout = window.clearTimeout.bind(window), originalClearInterval = window.clearInterval.bind(window);
    window.__museumTimers = new Map(); window.__museumTimerCalls = 0;
    window.setTimeout = (callback, ms, ...args) => {
      const owned = new Error().stack.includes('/src/stages/museum/panels.js');
      let id;
      id = originalTimeout(() => { __museumTimers.delete(id); callback(...args); }, ms);
      if (owned) { __museumTimers.set(id, 'timeout'); __museumTimerCalls++; }
      return id;
    };
    window.setInterval = (callback, ms, ...args) => {
      const id = originalInterval(callback, ms, ...args);
      if (new Error().stack.includes('/src/stages/museum/panels.js')) { __museumTimers.set(id, 'interval'); __museumTimerCalls++; }
      return id;
    };
    window.clearTimeout = (id) => { __museumTimers.delete(id); originalClearTimeout(id); };
    window.clearInterval = (id) => { __museumTimers.delete(id); originalClearInterval(id); };
  });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#fade')).opacity) === 0);
  assert.equal(await page.locator('#fade').evaluate((element) => getComputedStyle(element).opacity), '0', '撮影前に初期フェードが完全に消えている');

  const open = async (kind, draft = {}) => {
    await page.evaluate(({ kind, draft }) => {
      window.__solves = 0; window.__changes = 0; window.__draft = structuredClone(draft);
      window.__panel = __museum[`${kind}Panel`](__ui, __audio, {
        draft, seals: ['fossil', 'archive', 'garden', 'prism'],
        onChange(next) { __changes++; __draft = JSON.parse(JSON.stringify(next)); },
        onSolved(panel) { if (panel !== __panel) throw new Error('正解時に別のパネルを返した'); __solves++; },
      });
    }, { kind, draft });
    await page.locator('.panel-wrap.show .museum-panel').waitFor();
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => __solves), 0, `${kind}: 復帰だけで自動クリアしない`);
  };
  const close = async () => { await page.evaluate(() => __ui.closeAllPanels()); await page.waitForTimeout(270); };
  const draft = () => page.evaluate(() => structuredClone(__draft));
  const resume = async (kind) => {
    assert.ok(await page.evaluate(() => __changes > 0), `${kind}: 入力を保存する`);
    const saved = await draft();
    await close(); await open(kind, saved);
    assert.deepEqual(await draft(), saved, `${kind}: JSON経由で再開できる`);
    return saved;
  };
  const reachable = async (kind, viewport) => {
    const panel = page.locator('.museum-panel');
    const box = await panel.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${kind}: パネルが画面内に収まる`);
    assert.ok(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), `${kind}: 横スクロールなし`);
    const check = page.locator('.mu-check');
    await check.scrollIntoViewIfNeeded();
    const button = await check.boundingBox();
    assert.ok(button.x >= box.x && button.y >= box.y && button.x + button.width <= box.x + box.width + 1 && button.y + button.height <= box.y + box.height + 1, `${kind}: 最終ボタンに到達できる`);
    await panel.evaluate((e) => { e.scrollTop = 0; });
  };
  const wrong = async (pattern) => {
    await page.locator('.mu-check').click();
    assert.equal(await page.evaluate(() => __solves), 0);
    assert.match(await page.locator('.mu-message').innerText(), pattern);
    assert.equal(await page.evaluate(() => __museumTimers.size), 0, '誤答後に遅れたリセットを残さない');
  };
  const solved = async (kind, label) => {
    await page.locator('.mu-check').click();
    assert.equal(await page.evaluate(() => __solves), 1, `${kind}: 正解は同じ操作の中で1回通知する`);
    assert.equal(await page.locator('.museum-puzzle.solved').count(), 1);
    assert.equal(await page.locator('.museum-puzzle button:enabled').count(), 0);
    await page.evaluate(() => { document.querySelector('.mu-check').onclick(); document.querySelector('.mu-check').onclick(); });
    assert.equal(await page.evaluate(() => __solves), 1, `${kind}: 二重判定でも通知は1回`);
    assert.deepEqual(await page.evaluate(() => ({ pending: __museumTimers.size, calls: __museumTimerCalls })), { pending: 0, calls: 0 });
    await page.screenshot({ path: `shots/review/museum-panel-${kind}-${label}-after.png`, animations: 'disabled' });
    await close();
  };

  for (const viewport of [{ width: 375, height: 812, label: 'portrait' }, { width: 820, height: 520, label: 'landscape' }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const kind of ['fossil', 'prism', 'archive', 'garden', 'orrery']) {
      await open(kind);
      await reachable(kind, viewport);
      await page.screenshot({ path: `shots/review/museum-panel-${kind}-${viewport.label}-before.png`, animations: 'disabled' });
      if (kind === 'fossil') {
        await wrong(/地層の記録/);
        await page.locator('[data-slot="0"]').focus(); await page.keyboard.press('Space');
        await page.locator('[data-slot="2"]').click();
        await page.locator('[data-slot="1"]').click();
        const saved = await resume(kind);
        assert.equal(await page.locator('[data-slot="1"]').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-slot="1"]').click();
        const answer = await page.evaluate(() => [...__museum.FOSSIL_ANSWER]);
        const order = [...saved.order];
        for (let i = 0; i < order.length; i++) if (order[i] !== answer[i]) {
          const j = order.indexOf(answer[i]);
          await page.locator(`[data-slot="${i}"]`).click(); await page.locator(`[data-slot="${j}"]`).click();
          [order[i], order[j]] = [order[j], order[i]];
        }
      } else if (kind === 'prism') {
        await wrong(/5枚すべて/);
        await page.locator('[data-mirror="0"]').click();
        const saved = await resume(kind);
        const direction = saved.mirrors[0] === '/' ? '右上がり' : '右下がり';
        assert.match(await page.locator('[data-mirror="0"]').getAttribute('aria-label'), new RegExp(direction));
        const answer = await page.evaluate(() => [...__museum.PRISM_ANSWER]);
        for (let i = 0; i < 5; i++) if (saved.mirrors[i] !== answer[i]) await page.locator(`[data-mirror="${i}"]`).click();
        assert.match(await page.locator('.mu-light-count').innerText(), /5 \/ 5/);
        assert.equal(await page.locator('.mu-light-board.connected').count(), 1);
      } else if (kind === 'archive') {
        await wrong(/まだ.*棚/);
        await page.locator('[data-node="west"]').click(); await page.locator('[data-node="sea"]').click();
        const saved = await resume(kind);
        assert.deepEqual(saved.route, ['entry', 'west', 'sea']);
        assert.equal(await page.locator('[data-node="sea"]').getAttribute('aria-current'), 'location');
        await page.locator('[data-node="center"]').click();
        assert.match(await page.locator('.mu-message').innerText(), /階段/);
        assert.deepEqual((await draft()).route, saved.route, '階段を選んでも台車は移動しない');
        await page.locator('.mu-back').click();
        assert.equal(await page.locator('[data-node="west"]').getAttribute('aria-current'), 'location');
        for (const node of ['sea', 'dome', 'bird', 'east', 'forest', 'exit']) await page.locator(`[data-node="${node}"]`).click();
        assert.match(await page.locator('.mu-archive-status').innerText(), /7 \/ 9本/);
        assert.match(await page.locator('.mu-archive-status').innerText(), /3 \/ 3冊/);
      } else if (kind === 'garden') {
        await wrong(/4L/);
        await page.locator('[data-action="fill5"]').click(); await page.locator('[data-action="pour5to3"]').click();
        const saved = await resume(kind);
        assert.deepEqual(saved, { version: 2, a: 2, b: 3, reserve: 1, watered: [false, false], moves: 2 });
        assert.match(await page.locator('.mu-water-reading-a').innerText(), /^2 \/ 5 L$/);
        assert.match(await page.locator('.mu-water-reading-b').innerText(), /^3 \/ 3 L$/);
        assert.ok(Number(await page.locator('.mu-water-a').getAttribute('height')) > 0, '水位にも保存した量を反映');
        await page.locator('[data-action="waterDew"]').click();
        const watered = await resume(kind);
        assert.deepEqual(watered.watered, [true, false], '一輪の水やりも再開時に保持する');
        for (const action of ['pour3to5', 'fill5', 'waterMoon']) await page.locator(`[data-action="${action}"]`).click();
        assert.deepEqual((await draft()).watered, [true, true]);
        assert.match(await page.locator('.mu-water-reading-a').innerText(), /^0 \/ 5 L$/);
        assert.equal((await draft()).moves, 6);
      } else {
        await wrong(/出発する方位/);
        await page.locator('.mu-ring-plus[data-ring="fossil"]').focus(); await page.keyboard.press('Enter');
        const saved = await resume(kind);
        assert.deepEqual(saved.values, [1, 0, 0, 0]);
        assert.match(await page.locator('.mu-ring-dial output').first().innerText(), /^北東/);
        // 北から逆向きに1つ回すと北西へ。0の境界をまたぐ操作も確認する。
        await page.locator('.mu-ring-minus[data-ring="fossil"]').click();
        await page.locator('.mu-ring-minus[data-ring="fossil"]').click();
        assert.match(await page.locator('.mu-ring-dial output').first().innerText(), /^北西/);
        const current = [...(await draft()).values], answer = await page.evaluate(() => [...__museum.ORRERY_ANSWER]);
        const keys = ['fossil', 'archive', 'garden', 'prism'];
        for (let i = 0; i < 4; i++) for (let n = 0; n < (answer[i] - current[i] + 8) % 8; n++) await page.locator(`.mu-ring-plus[data-ring="${keys[i]}"]`).click();
      }
      await solved(kind, viewport.label);
      passed++; console.log(`OK ${viewport.width}×${viewport.height} ${kind}: 誤答・保存復帰・正解1回・タイマーなし`);
    }
  }

  // 途中で解説を開いても最終ボタンへ到達でき、印が足りない天球儀は解けない。
  await open('orrery');
  await close();
  await page.evaluate(() => {
    window.__solves = 0;
    __panel = __museum.orreryPanel(__ui, __audio, { seals: ['fossil'], draft: { values: [6, 1, 0, 3] }, onSolved() { __solves++; } });
  });
  await page.locator('.panel-wrap.show').waitFor();
  await page.locator('.mu-reference summary').click();
  await page.locator('.mu-check').scrollIntoViewIfNeeded();
  await page.locator('.mu-check').click();
  assert.equal(await page.evaluate(() => __solves), 0);
  assert.match(await page.locator('.mu-message').innerText(), /足りない印/);
  assert.equal(await page.locator('.mu-ring-control.locked').count(), 3);
  assert.equal(await page.locator('.mu-ring-control.locked button:enabled').count(), 0);
  await close();
  passed++; console.log('OK 天球儀: 足りない印で解答を拒否し、解説の開閉後も操作できる');
  assert.deepEqual(errors, []);
  console.log(`PASS ${passed} checks; screenshots: shots/review/museum-panel-*`);
} finally { await browser.close(); }
