// npm run serve を起動してから実行。通しプレイせず、時間計測とパネルの操作を検証する。
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:8123';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let passed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 820, height: 520 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // 本番の DOM・CSS・import map を使い、箱庭の構築だけを省く。
  await page.route('**/src/main.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(`${base}/index.html?low`);
  await page.evaluate(async () => {
    const { Game } = await import('/src/core/game.js');
    window.g = new Game(document.querySelector('#app'));
    g.audio.setMuted(true);
    document.body.classList.add('rpg');
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#hud').classList.remove('hidden');
    window.panels = await import('/src/stages/hero/panels.js');
  });
  const test = async (name, fn) => { await fn(); passed++; console.log(`OK ${name}`); };
  const close = async () => { await page.evaluate(() => g.ui.closeAllPanels()); await page.waitForTimeout(260); };
  await test('C-1: 遅い描画でも実時間を記録し、演出・タイトル・早送りを区別する', async () => {
    const elapsed = await page.evaluate(() => {
      g.playing = true;
      const values = [];
      for (const scale of [1, 8, 0.25]) {
        g.timeScale = scale; g.clock.getDelta = () => 2;
        g._frame(); values.push(g.state.elapsed);
      }
      g.cinematic = true; g._frame(); values.push(g.state.elapsed);
      g.cinematic = false; g.playing = false; g._frame(); values.push(g.state.elapsed);
      return values;
    });
    assert.deepEqual(elapsed, [2, 4, 6, 6, 6]);
  });
  await test('C-7: 会話中は持ち物を隠し、終了後に戻す', async () => {
    await page.evaluate(() => { g.ui.say(['確認']); });
    assert.equal(await page.locator('#inventory').evaluate(e => getComputedStyle(e).visibility), 'hidden');
    await page.evaluate(() => { g.ui.advance(); g.ui.advance(); });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#inventory').evaluate(e => getComputedStyle(e).visibility), 'visible');
  });
  await test('B-24: 処理中のクリックには案内を出す', async () => {
    await page.evaluate(() => { g.playing = true; g.busy = true; return g._onClick({}); });
    assert.match(await page.locator('#toasts').innerText(), /もう少し待って/);
    await page.evaluate(() => { g.busy = false; });
  });
  await test('C-2: 鉢植えでビー玉を一度だけ入手し、名前付きの通知を出す', async () => {
    const result = await page.evaluate(async () => {
      await import('/src/stages/registry.js');
      const { StationStage } = await import('/src/stages/station/index.js');
      const stage = new StationStage(g);
      stage.R = { plant: {}, marble: { visible: true } };
      stage.focus = () => {};
      stage.say = async () => {};
      await stage.clickPlant(); await stage.clickPlant();
      return { count: g.state.inventory.filter(i => i === 'marble').length, hidden: !stage.R.marble.visible, taken: g.flags.marbleTaken };
    });
    assert.deepEqual(result, { count: 1, hidden: true, taken: true });
    assert.match(await page.locator('#toasts').innerText(), /ビー玉を手に入れた/);
  });
  await test('C-11: 過熱・誤打から即座に再開し、古いリセットが次の操作を壊さない', async () => {
    await page.evaluate(() => panels.forgePanel(g.ui, g.audio, { onSolved: () => { window.forged = true; } }));
    const bell = page.locator('.fg-bel');
    for (let i = 0; i < 5; i++) await bell.click();
    assert.equal(await page.locator('.fg-name').innerText(), '黒');
    assert.match(await page.locator('.fg-msg').innerText(), /熱しすぎ/);
    await bell.click(); await bell.click();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('.fg-name').innerText(), '橙');
    assert.doesNotMatch(await page.locator('.fg-msg').innerText(), /熱しすぎ/);
    await page.locator('.fg-hit').click();
    assert.equal(await page.locator('.fg-name').innerText(), '黒');
    await page.locator('.fg-reset').click();
    assert.doesNotMatch(await page.locator('.fg-msg').innerText(), /ちがう/);
    for (let i = 0; i < 4; i++) await bell.click();
    await page.locator('.fg-hit').click(); await page.locator('.fg-hit').click();
    await bell.click(); await page.locator('.fg-hit').click(); await page.locator('.fg-hit').click();
    await page.locator('.fg-water').click();
    await page.waitForFunction(() => window.forged);
    await close();
  });
  await test('C-9/C-10: 欠けた一文字と貼り紙の見出しを重複表示しない', async () => {
    const result = await page.evaluate(() => ({ missing: panels.glassTableHTML().match(/？/g)?.length, headings: panels.recipeHTML().match(/調合の心得/g)?.length }));
    assert.deepEqual(result, { missing: 1, headings: 1 });
  });
  await test('B-23: 820×520で解読ボタンに到達でき、4文字を解読できる', async () => {
    await page.evaluate(() => panels.decodePanel(g.ui, g.audio, { onSolved: () => { window.decoded = true; } }));
    const button = page.locator('.dc-check');
    await button.scrollIntoViewIfNeeded();
    const rect = await button.boundingBox();
    assert.ok(rect.y >= 0 && rect.y + rect.height <= 520);
    for (const ch of ['あ', 'い', 'た', 'い']) await page.locator('.dc-k').filter({ hasText: new RegExp(`^${ch}$`) }).click();
    await button.click();
    await page.waitForFunction(() => window.decoded);
    await close();
  });
  await test('B-23: 薬の注文と配合操作に到達でき、3種類とも調合できる', async () => {
    await page.evaluate(() => panels.mixPanel(g.ui, g.audio, { onSolved: () => { window.mixed = true; } }));
    for (const drops of [[0, 2, 1], [1, 0, 2], [2, 1, 0]]) {
      for (let c = 0; c < 3; c++) for (let n = 0; n < drops[c]; n++) await page.locator(`.mx-d[data-i="${c}"]`).click();
      await page.locator('.mx-ok').click();
    }
    await page.waitForFunction(() => window.mixed);
    await close();
  });
  await test('C-18: 歯12の所在を説明し、正しい歯車の組み合わせだけを受理する', async () => {
    await page.evaluate(async () => {
      window.toyPanels = await import('/src/stages/toy/panels.js');
      toyPanels.gearPanel(g.ui, g.audio, { onSolved: () => { window.geared = true; } });
    });
    assert.match(await page.locator('.gearp').innerText(), /大ゼンマイ（歯12）/);
    assert.match(await page.locator('.gr-stock').innerText(), /針に歯12を装着中/);
    await page.locator('.gr-go').click();
    await page.waitForFunction(() => document.querySelector('.gr-msg').textContent.includes('向きが反対'));
    await page.locator('.gr-mids button').first().click();
    await page.locator('.gr-hand button').filter({ hasText: '歯 24' }).click();
    await page.locator('.gr-go').click();
    await page.waitForFunction(() => window.geared);
    await close();
  });
  await test('B-23: 全10ステージの28パネルを低い画面で開閉・スクロールできる', async () => {
    let panelsChecked = 0;
    for (const stage of ['station', 'sky', 'edo', 'port', 'hero', 'maou', 'onsen', 'kinoko', 'toy', 'japan']) {
      const names = await page.evaluate(async stage => {
        window.stagePanels = await import(`/src/stages/${stage}/panels.js`);
        return Object.keys(stagePanels).filter(k => /Panel\d?$/.test(k));
      }, stage);
      for (const name of names) {
        await page.evaluate(name => {
          const noop = () => {};
          stagePanels[name](g.ui, g.audio, { current: 'high', hasWind: true, onSolved: noop, onChange: noop, onTest: noop, onStrike: noop, play: noop, onStep: noop, onDig: noop, onPlay: noop, onRing: noop, onTry: noop, onFail: noop, onSet: noop });
        }, name);
        await page.locator('.panel-wrap.show').waitFor();
        await page.waitForTimeout(230);
        const box = await page.locator('.panel').boundingBox();
        assert.ok(box.y >= 0 && box.y + box.height <= 521, `${stage}/${name}: panel exceeds viewport`);
        const buttons = page.locator('.panel-body button');
        if (await buttons.count()) {
          const last = buttons.last();
          await last.scrollIntoViewIfNeeded();
          const b = await last.boundingBox();
          assert.ok(b.y >= box.y && b.y + b.height <= box.y + box.height + 1, `${stage}/${name}: last button unreachable`);
        }
        await close();
        panelsChecked++;
      }
    }
    assert.equal(panelsChecked, 28);
  });
  await test('縦画面: 会話文と名前が重ならず、各駅のクリア見出しが1行に収まる', async () => {
    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 812 });
      await page.evaluate(() => {
        g.ui.setSpeakers({ hero: { name: 'ハリネズミの勇者', icon: '🦔' } });
        g.ui.say([{ who: 'hero', text: 'ぼくはハリネズミの勇者。きょう、魔王城へ旅立つ……はず、だったんだけど。' }]);
        g.ui.advance();
      });
      await page.locator('#dialogue.show').waitFor();
      const gap = await page.evaluate(() => document.querySelector('.dlg-text').getBoundingClientRect().top - document.querySelector('.dlg-name').getBoundingClientRect().bottom);
      assert.ok(gap >= 4, `${width}px: 会話文と名前の間隔 ${gap}px`);
      await page.evaluate(() => { g.ui.advance(); });
      const ids = await page.evaluate(async () => (await import('/src/data/route.js')).ROUTE.map(s => s.id));
      for (const id of ids) {
        await page.evaluate(async id => {
          const { showStageClear } = await import('/src/stages/clear.js');
          showStageClear(g, id, 'ほしまわり号は、次の世界へ。');
        }, id);
        const fits = await page.locator('.clear-main').evaluate(e => {
          const range = document.createRange(); range.selectNodeContents(e);
          return range.getClientRects().length === 1 && e.scrollWidth <= e.clientWidth;
        });
        assert.ok(fits, `${width}px/${id}: クリア見出しが収まらない`);
        await close();
      }
    }
  });
  await test('瓦版: 9枚を並べると、元の絵とずれなくつながる', async () => {
    await page.evaluate(() => document.body.classList.remove('rpg'));
    for (const width of [375, 1000]) {
      await page.setViewportSize({ width, height: 812 });
      await page.evaluate(async () => {
        const { ukiyoePanel } = await import('/src/stages/edo/panels.js');
        ukiyoePanel(g.ui, g.audio, { onSolved() {} });
      });
      const order = [6, 4, 1, 8, 2, 0, 5, 3, 7];
      for (let i = 0; i < 9; i++) if (order[i] !== i) {
        const j = order.indexOf(i);
        await page.locator('.uk-cell').nth(i).click();
        await page.locator('.uk-cell').nth(j).click();
        [order[i], order[j]] = [order[j], order[i]];
      }
      await page.locator('.ukiyop.solved').waitFor();
      const png = await page.locator('.uk-grid').screenshot({ animations: 'disabled' });
      const error = await page.evaluate(async b64 => {
        const load = src => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img); img.src = src; });
        const actual = await load(`data:image/png;base64,${b64}`);
        const reference = await load(getComputedStyle(document.querySelector('.uk-cell')).backgroundImage.slice(5, -2));
        const size = Math.round(document.querySelector('.uk-cell').getBoundingClientRect().width * 3);
        const a = document.createElement('canvas'); a.width = a.height = size;
        const b = a.cloneNode();
        // スクリーンショットは小数座標を外側へ丸めるので、中央から絵だけを切り出す。
        a.getContext('2d').drawImage(actual, Math.round((actual.width - size) / 2), Math.round((actual.height - size) / 2), size, size, 0, 0, size, size);
        b.getContext('2d').drawImage(reference, 0, 0, size, size);
        const aa = a.getContext('2d').getImageData(0, 0, size, size).data;
        const bb = b.getContext('2d').getImageData(0, 0, size, size).data;
        let diff = 0;
        for (let i = 0; i < aa.length; i++) if (i % 4 !== 3) diff += Math.abs(aa[i] - bb[i]);
        return diff / (size * size * 3);
      }, png.toString('base64'));
      assert.ok(error < 2, `${width}px: 元画像との平均RGB誤差 ${error}`);
      await close();
    }
  });
  assert.deepEqual(errors, []);
  console.log(`PASS: ${passed} checks`);
} finally { await browser.close(); }
