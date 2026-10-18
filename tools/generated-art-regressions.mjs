// 画像の読み込み・縮小表示・通信失敗時の継続を個別確認する（通しプレイはしない）。
import assert from 'node:assert/strict';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { ITEMS } from '../src/data/items.js';

const manifest = JSON.parse(readFileSync('assets/runtime/manifest.json'));
assert.equal(manifest.assets.length, 82);
assert.equal(manifest.assets.filter(a => a.category === 'items').length, 63);
assert.equal(Object.keys(ITEMS).length, 61);
assert.ok(manifest.assets.reduce((n, a) => n + statSync(`assets/runtime/${a.path}`).size, 0) < 6 * 1024 * 1024);
for (const item of Object.values(ITEMS)) assert.match(item.icon, /assets\/runtime\/items\//);

const base = process.env.BASE || 'http://localhost:8123';
mkdirSync('shots/generated-art', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  await page.route('**/src/main.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(`${base}/index.html`);
  await page.evaluate(async () => {
    const { UI } = await import('/src/core/ui.js');
    const { ITEMS } = await import('/src/data/items.js');
    window.ui = new UI({ play() {} }); window.defs = ITEMS;
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#title').classList.add('hidden');
    document.querySelector('#fade').style.cssText = 'opacity:0;transition:none';
    const grid = document.createElement('div');
    grid.id = 'art-grid';
    grid.style.cssText = 'position:fixed;inset:0;display:grid;grid-template-columns:repeat(9,1fr);gap:12px;padding:20px;background:#f7ecd8;z-index:100;overflow:auto';
    grid.innerHTML = Object.values(ITEMS).map(d => `<div style="display:flex;align-items:center;flex-direction:column;min-height:90px"><div style="width:64px;height:64px">${d.icon}</div><small style="font-size:10px">${d.name}</small></div>`).join('');
    document.body.append(grid);
  });
  await page.waitForFunction(() => document.querySelectorAll('#art-grid .art-ready').length === 61);
  assert.equal(await page.locator('#art-grid img').count(), 63);
  assert.equal(await page.locator('#art-grid .item-art-set img').count(), 3);
  assert.ok(await page.locator('#art-grid img').evaluateAll(imgs => imgs.every(i => i.naturalWidth === 320)));
  await page.screenshot({ path: 'shots/generated-art/items.png' });
  console.log('OK 全61種・63枚の画像、薬の3枚表示、64pxの縮小表示');

  await page.evaluate(async () => {
    document.querySelector('#art-grid').remove();
    const { surfaceTex, surfaceCanvasTex } = await import('/src/lib/surface-art.js');
    const { MATERIALS_ART } = await import('/src/data/generated-art.js');
    window.surfaces = [...MATERIALS_ART].map(id => surfaceTex(id, { base: '#b4a48c', repeat: [2, 2], pixel: /Pixel/.test(id) }));
    window.delayed = surfaceCanvasTex('washi', 256, 96, ctx => {
      ctx.fillStyle = '#ee2200'; ctx.fillRect(100, 24, 24, 24);
    }, { base: '#eee4ca', strength: .3 });
    ui.renderInventory(['marble', 'moonGear', 'potions', 'thimbleWater', 'ticket', 'cotton'], defs, 'moonGear', () => {}, { cotton: 2 });
    ui.setUseBanner?.(defs.moonGear, () => {});
    document.querySelector('#hud').classList.remove('hidden');
    document.body.style.background = '#36475a';
  });
  await page.waitForFunction(() => surfaces.every(t => t.userData.surfaceArtLoaded) && delayed.userData.surfaceArtLoaded);
  assert.deepEqual(await page.evaluate(() => Array.from(delayed.image.getContext('2d').getImageData(108, 30, 1, 1).data)), [238, 34, 0, 255]);
  assert.ok(await page.evaluate(() => surfaces.every(t => t.repeat.x === 2 && t.colorSpace === 'srgb')));
  await page.waitForFunction(() => document.querySelectorAll('#inventory .art-ready').length === 6);
  assert.equal(await page.locator('.inv-count').innerText(), '×2');
  await page.screenshot({ path: 'shots/generated-art/inventory.png' });
  console.log('OK 表面19種の展開、遅い読み込みでも文字・記号を保持、持ち物と所持数');
  await page.evaluate(() => ui.showItemGet(defs.potions));
  await page.waitForSelector('.item-get.show .art-ready');
  assert.equal(await page.locator('.item-get img').count(), 3);
  assert.match(await page.locator('.item-get').innerText(), /薬のセット を手に入れた/);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/generated-art/item-get.png' });
  console.log('OK 入手通知の画像と持ち物名');

  assert.ok(!requests.some(url => /assets\/generated\/.*\.png/.test(url)));
  assert.deepEqual(errors, []);
  await page.close();

  const failure = await browser.newPage();
  await failure.route('**/src/main.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await failure.route('**/assets/runtime/**/*.webp', r => r.abort());
  await failure.goto(`${base}/index.html`);
  const fallback = await failure.evaluate(async () => {
    const { installItemArt } = await import('/src/lib/item-art.js');
    const { ITEMS } = await import('/src/data/items.js');
    const { surfaceTex, prepareStageSurfaces } = await import('/src/lib/surface-art.js');
    installItemArt();
    const wrap = document.createElement('div'); wrap.innerHTML = ITEMS.marble.icon; document.body.append(wrap);
    const tex = surfaceTex('grass', { base: '#86b35c' });
    await prepareStageSurfaces('station');
    await Promise.all([...wrap.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
    return { ready: wrap.querySelector('.item-art').classList.contains('art-ready'),
      fallback: getComputedStyle(wrap.querySelector('.item-art-fallback')).visibility,
      surface: Array.from(tex.image.getContext('2d').getImageData(0, 0, 1, 1).data) };
  });
  assert.equal(fallback.ready, false);
  assert.equal(fallback.fallback, 'visible');
  assert.deepEqual(fallback.surface, [134, 179, 92, 255]);
  console.log('OK 画像取得失敗時は既存アイコンと基本色で継続');
  await failure.close();

  // GitHub Pages のプロジェクト配信と同じサブフォルダを模擬する。
  const nested = await browser.newPage();
  await nested.route(`${base}/iyashinazo/**`, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${base}${url.pathname.slice('/iyashinazo'.length)}${url.search}` });
    await route.fulfill({ response });
  });
  await nested.route('**/src/main.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await nested.goto(`${base}/iyashinazo/index.html`);
  const nestedPath = await nested.evaluate(async () => {
    const { ITEMS } = await import('./src/data/items.js');
    const wrap = document.createElement('div'); wrap.innerHTML = ITEMS.marble.icon; document.body.append(wrap);
    const img = wrap.querySelector('img'); await img.decode();
    return { path: new URL(img.src).pathname, width: img.naturalWidth };
  });
  assert.equal(nestedPath.path, '/iyashinazo/assets/runtime/items/marble.webp');
  assert.equal(nestedPath.width, 320);
  console.log('OK GitHub Pages のサブフォルダから画像を取得');
} finally { await browser.close(); }
