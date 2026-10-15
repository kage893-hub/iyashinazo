// ステージの中のメソッドを順に実行して、会話は自動で送り、スクリーンショットを撮る（動作確認用）
// 使い方:
//   ST=japan FLAGS='{"introDone":true}' INV='["koBell"]' node tools/flow.mjs '[{"run":"g.stage.talkKoma()","shot":"a"}]'
// ステップ（上から順に処理）:
//   run:"式"       g（ゲーム）を使ったJSを実行し、終わるまで待つ（会話は自動で送る）。until:"panel" でパネルが開いたら次へ
//   waitDone:true  直前の run の完了を待つ（パネルの操作のあとなど）
//   js:"式"        その場でJSを評価して結果を表示
//   click:"CSS"    クリック ／ wait:ミリ秒 ／ cam:[[位置],[注視点]]
//   shot:"名前"    shots/名前.png に保存。shotAt:ミリ秒（途中の1枚）、shotEvery:ミリ秒（連番）
// 環境変数: ST FLAGS INV BASE OUT CHROMIUM
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = process.env.OUT || 'shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = +(process.argv[3] || 1000), H = +(process.argv[4] || 620);
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)); });
const st = process.env.ST || 'kinoko';
await page.goto(`${process.env.BASE || 'http://localhost:8123'}/index.html?low`);
await page.evaluate(([st, flags, inv]) => { localStorage.clear(); localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: st, flags, inventory: inv, counts: {}, elapsed: 0, hints: 0, cleared: ['station'] })); }, [st, JSON.parse(process.env.FLAGS || '{}'), JSON.parse(process.env.INV || '[]')]);
await page.reload();
await page.waitForFunction((st) => window.__game?.stage?.id === st, st, { timeout: 120000 });
await page.waitForTimeout(800);
await page.click('button:has-text("つづきから")').catch(() => page.evaluate(() => document.querySelector('#title').classList.add('hidden')));
await page.waitForTimeout(1500);
const steps = JSON.parse(process.argv[2] || '[]');
for (const s of steps) {
  if (s.run) {
    await page.evaluate((code) => {
      const g = window.__game;
      window.__done = false; window.__err = null; window.__lines = [];
      window.__auto = setInterval(() => {
        if (g.ui.dialogueActive) { const t = document.querySelector('.dlg-text, .dialogue .text, #dialogue')?.textContent; if (t) window.__lines.push(t.slice(0, 80)); g.ui.advance(); }
      }, window.__fast ? 300 : 700);
      Promise.resolve(eval(code)).then(() => { window.__done = true; }).catch((e) => { window.__err = e.stack; window.__done = true; });
    }, s.run);
    const t0 = Date.now();
    while (true) {
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => [window.__done, window.__err, window.__game.ui.panelOpen]);
      if (s.shotEvery && Date.now() - t0 > (s._n = s._n || 1) * s.shotEvery) { await page.screenshot({ path: `${OUT}/${s.shot}-${String(s._n).padStart(2, '0')}.png` }); s._n++; }
      if (s.shotAt && Date.now() - t0 > s.shotAt && !s._shot) { s._shot = true; await page.screenshot({ path: `${OUT}/${s.shot}-mid.png` }); }
      if (r[0] || (s.until === 'panel' && r[2])) { if (r[1]) console.log('ERROR', r[1]); break; }
      if (Date.now() - t0 > (s.timeout || 60000)) { console.log('TIMEOUT', s.run); break; }
    }
    await page.evaluate(() => clearInterval(window.__auto));
  }
  if (s.waitDone) {
    const t0 = Date.now();
    await page.evaluate(() => { const g = window.__game; clearInterval(window.__auto); window.__auto = setInterval(() => { if (g.ui.dialogueActive) g.ui.advance(); }, 700); });
    while (!(await page.evaluate(() => window.__done)) && Date.now() - t0 < 90000) await page.waitForTimeout(400);
    const e = await page.evaluate(() => window.__err); if (e) console.log('ERROR', e);
    await page.evaluate(() => clearInterval(window.__auto));
  }
  if (s.js) console.log('JS', JSON.stringify(await page.evaluate((code) => { const g = window.__game; return eval(code); }, s.js)));
  if (s.click) { await page.click(s.click); }
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.cam) await page.evaluate(([p, t]) => { const g = window.__game; g.camera.position.set(...p); g.controls.target.set(...t); g.controls.update(); }, s.cam);
  if (s.shot) { await page.waitForTimeout(s.shotWait || 1200); await page.screenshot({ path: `${OUT}/${s.shot}.png` }); }
}
console.log('FLAGS', JSON.stringify(await page.evaluate(() => window.__game.state.flags)));
console.log('INV', JSON.stringify(await page.evaluate(() => window.__game.state.inventory)));
await browser.close();
