// 指定ステージを開いて、カメラ位置ごとにスクリーンショットを撮る（動作確認用）
// 使い方:
//   python3 -m http.server 8123 &   （リポジトリ直下で）
//   ST=kinoko node tools/shot.mjs '{"introDone":true}' '[[[0,16,26],[0,0.5,0]]]' name
//   → shots/name0.png …   第2引数は [[カメラ位置], [注視点]] の配列
// 環境変数: ST=ステージid  BASE=http://localhost:8123  OUT=shots  CHROMIUM=ブラウザの実行ファイル（省略可）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT || 'shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)); });
const st = process.env.ST || 'station';
const base = process.env.BASE || 'http://localhost:8123';
await page.goto(`${base}/index.html?low`);
await page.evaluate(([flags, st]) => { localStorage.clear(); localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: st, flags, inventory: [], counts: {}, elapsed: 0, hints: 0, cleared: ['station'] })); }, [JSON.parse(process.argv[2] || '{}'), st]);
await page.reload();
await page.waitForFunction((st) => window.__game?.stage?.id === st, st, { timeout: 180000 });
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelector('#title')?.classList.add('hidden'));
const views = JSON.parse(process.argv[3] || '[[[14,20,30],[0,0.5,0]]]');
let i = 0;
for (const [p, t] of views) {
  await page.evaluate(([p, t]) => { const g = window.__game; g.camera.position.set(...p); g.controls.target.set(...t); g.controls.update(); }, [p, t]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${process.argv[4] || 'v'}${i++}.png` });
}
await browser.close();
