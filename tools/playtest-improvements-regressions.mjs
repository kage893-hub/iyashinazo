// 指摘1〜3: 実UI・Gameの保存と対象ステージの入口だけを検証する（通しプレイなし）。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = process.env.BASE || 'http://localhost:8123';
await mkdir('shots/improvements', { recursive: true });
const errors = [];
let count = 0;
try {
 const page = await browser.newPage({ viewport: { width: 820, height: 720 } });
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/src/main.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
 const boot = async () => {
  await page.goto(base + '/index.html');
  await page.evaluate(async () => {
   const { Game } = await import('/src/core/game.js');
   window.g = new Game(document.querySelector('#app'));
   g.audio.setMuted(true); g.state = g.loadSave() || g._freshState('hero');
   window.hero = await import('/src/stages/hero/panels.js');
   window.toy = await import('/src/stages/toy/panels.js');
   window.japan = await import('/src/stages/japan/panels.js');
   window.kinoko = await import('/src/stages/kinoko/panels.js');
   document.querySelector('#loading').classList.add('hidden');
   document.querySelector('#title').classList.add('hidden');
   document.querySelector('#hud').classList.remove('hidden');
   await g.ui.fade(0, 0);
  });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#fade')).opacity) === 0);
 };
 const close = async () => { await page.evaluate(() => g.ui.closeAllPanels()); await page.waitForTimeout(280); };
 const shot = async name => { await page.waitForTimeout(300); await page.screenshot({ path: `shots/improvements/${name}.png` }); };
 const test = async (name, fn) => { await fn(); count++; console.log('OK ' + name); };
 const attach = async kind => page.evaluate(async kind => {
  await import('/src/stages/registry.js');
  const { HeroStage } = await import('/src/stages/hero/index.js');
  const { ToyStage } = await import('/src/stages/toy/index.js');
  g.stage = kind === 'hero' ? new HeroStage(g) : new ToyStage(g);
  g.stage.focus = () => {}; g.stage.R = { musicBox: {} };
  g.stage.playNotes = () => {}; g.stage.waitPanel = async () => {};
  if (kind === 'hero') g.stage.openMix(); else g.stage.clickMusicBox();
 }, kind);
 await boot();
 await test('薬: 完成1本と次のしずくを、閉じる・ページ再読込後も保持する', async () => {
  await page.evaluate(() => { g.state = g._freshState('hero'); g.flag('slimePaid'); });
  await attach('hero');
  for (const i of [1,1,2]) await page.locator(`.mx-d[data-i="${i}"]`).click();
  await page.locator('.mx-ok').click();
  await page.locator('.mx-d[data-i="0"]').click();
  await close(); await boot(); await attach('hero');
  assert.match(await page.locator('.mx-orders').innerText(), /回復薬 ✓/);
  assert.match(await page.locator('.mx-msg').innerText(), /毒消し/);
  assert.equal(await page.locator('.mx-count').innerText(), '1てき');
  assert.deepEqual(await page.evaluate(() => g.flags.mixDraft), { step: 1, drops: [1,0,0] });
  assert.equal(await page.evaluate(() => g.flags.slimePaid), true);
  await shot('potion-resume');
  await page.locator('.mx-empty').click();
  assert.deepEqual(await page.evaluate(() => g.flags.mixDraft), { step: 1, drops: [0,0,0] });
  await close();
 });
 await test('オルゴール: 実ステージの入口でピンを再読込復元し、明示リセットできる', async () => {
  await page.evaluate(() => { g.state = g._freshState('toy'); g.flag('rabbitAwake'); });
  await attach('toy');
  await page.getByRole('button', { name: '1音目：ミ', exact: true }).click();
  await page.getByRole('button', { name: '2音目：ソ', exact: true }).click();
  await close(); await boot(); await attach('toy');
  assert.equal(await page.locator('.mu-c.pin').count(), 2);
  assert.deepEqual((await page.evaluate(() => g.flags.musicDraft)).pins, [2,3,null,null,null,null,null,null]);
  await page.locator('.mu-reset').click();
  assert.equal(await page.locator('.mu-c.pin').count(), 0);
  await close();
 });
 await test('会話: 横→縦で目標を一時的に畳み、会話後と横戻しで手動設定を復元する', async () => {
  await page.setViewportSize({ width: 820, height: 720 });
  await page.evaluate(() => { g.ui.questsCollapsed = false; g.ui.renderQuests('目的', [{text:'確認',done:false}]); void g.ui.say(['長老の話']); });
  assert.equal(await page.locator('#quests').evaluate(e => e.classList.contains('collapsed')), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('#quests').classList.contains('collapsed'));
  await page.setViewportSize({ width: 820, height: 720 });
  await page.waitForFunction(() => !document.querySelector('#quests').classList.contains('collapsed'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { g.ui.advance(); g.ui.advance(); });
  await page.waitForFunction(() => !g.ui.dialogueActive);
  assert.equal(await page.locator('#quests').evaluate(e => e.classList.contains('collapsed')), false);
  await page.locator('#quests').dispatchEvent('pointerdown');
  assert.equal(await page.locator('#quests').evaluate(e => e.classList.contains('collapsed')), true);
 });
 for (const width of [320,390,820]) await test(`${width}px: 盤面はパネル内でスクロールし44pxのセルで操作できる`, async () => {
  await page.setViewportSize({ width, height: width > 700 ? 520 : 844 });
  for (const kind of ['dig','music']) {
   await page.evaluate(kind => {
    if (kind === 'dig') kinoko.digPanel(g.ui,g.audio,{onSolved:()=>{}});
    else toy.musicPanel(g.ui,g.audio,{onSolved:()=>{},play:()=>{}});
   },kind);
   await page.waitForTimeout(300);
   const cell = page.locator(kind === 'dig' ? '.dg-c' : '.mu-c').first();
   const r = await cell.boundingBox(); assert.ok(r.width >= 43.9 && r.height >= 43.9, `${kind}: ${JSON.stringify(r)}`);
   assert.equal(await page.locator('.panel').evaluate(e => e.scrollWidth <= e.clientWidth+1), true);
   if (kind === 'dig') {
    await page.locator('.dg-c').last().scrollIntoViewIfNeeded(); await page.locator('.dg-c').last().click();
    assert.equal(await page.locator('.dg-c.sel').count(), 1);
   } else {
    await page.getByRole('button',{name:'8音目：ド',exact:true}).click();
    assert.equal(await page.locator('.mu-c.pin').count(), 1);
   }
   if (width === 390) await shot(kind+'-portrait');
   await close();
  }
 });
 await test('地下鉄: 縦横で図が収まり、拡大・隣駅ボタンで正解ルートを入力できる', async () => {
  for (const width of [320,390,820]) {
   await page.setViewportSize({width,height:width>700?520:844});
   await page.evaluate(() => { window.subwaySolved=false; japan.subwayPanel(g.ui,g.audio,{onSolved:()=>window.subwaySolved=true}); });
   await page.waitForTimeout(300);
   assert.equal(await page.locator('.panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
   const r=await page.locator('.sb-next').first().boundingBox(); assert.ok(r.height>=44);
   const crop=await page.locator('.sb-map').evaluate(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].every(t=>{const b=t.getBBox();return b.x>=v.x&&b.y>=v.y&&b.x+b.width<=v.x+v.width&&b.y+b.height<=v.y+v.height;});});
   assert.equal(crop,true,'駅名がSVGの表示範囲内に入る');
   await page.locator('.sb-zoom').click(); assert.equal(await page.locator('.sb-zoom').getAttribute('aria-pressed'),'true');
   await page.locator('.sb-zoom').click();
   if(width===390) await shot('subway-portrait');
   for(const t of ['上野','秋葉原','人形町','銀座','東京','銀座','新橋','赤坂見附','表参道','渋谷']) await page.getByRole('button',{name:t,exact:true}).click();
   await page.locator('.sb-go').click(); await page.waitForFunction(()=>window.subwaySolved);
   await close();
  }
 });
 assert.deepEqual(errors,[]); console.log(`PASS ${count} checks`);
} finally { await browser.close(); }
