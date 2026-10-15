// プレイヤーと同じ操作でゲームを動かす、つけっぱなしのブラウザ（通しプレイ・確認用）
// 使い方:
//   ST=station NEW=1 node tools/play.mjs &          （PORT=9200 で命令を待つ）
//   curl -s localhost:9200 -d '{"list":1}'           調べられる物の一覧（id・名前・画面に見えるか）
//   curl -s localhost:9200 -d '{"tap":"ticket"}'     クリックしたのと同じ。会話は自動で送り、セリフを返す
//   curl -s localhost:9200 -d '{"use":["key","door"]}'  持ち物を選んでからクリック
//   {"inspect":"item"} 持ち物を二度押し（説明・読む） {"hint":1} 💡 {"choose":0} 選択肢
//   {"clickText":"文字"} その文字のボタンを押す {"click":"CSS"} {"eval":"式"}（g が使える）
//   {"run":"式"} 式を実行して会話を送る {"pump":1} 続きを送る {"state":1} フラグ・持ち物・やること
//   {"shot":"名前"} shots/名前.png  {"cam":[[位置],[注視点]]} {"wait":ミリ秒} {"key":"KeyW"}
//   命令は配列でまとめて送れる。返事は JSON（said:セリフ、choices、panel、toasts、errors など）
// 環境変数: ST（ステージid） NEW=1（タイトルの「はじめから」から） FLAGS INV（NEW でないとき）
//           CLEARED（クリア済みの駅、既定は ST より前の駅） PORT BASE OUT CHROMIUM LOW（既定1）W H
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import http from 'node:http';

const OUT = process.env.OUT || 'shots';
mkdirSync(OUT, { recursive: true });
const ROUTE = ['station', 'sky', 'edo', 'port', 'hero', 'maou', 'onsen', 'kinoko', 'toy', 'japan'];
const st = process.env.ST || 'station';
const base = process.env.BASE || 'http://localhost:8123';
const low = process.env.LOW !== '0';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 1100), height: +(process.env.H || 680) } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ' ' + m.text().slice(0, 300)); });

// ページを読むたびに入れる補助（会話の記録・トースト・選択肢）
await page.addInitScript(() => {
  window.__said = []; window.__toasts = [];
  const hook = () => {
    const g = window.__game;
    if (!g || g.ui.__hooked) return;
    g.ui.__hooked = true;
    const say = g.ui.say.bind(g.ui);
    g.ui.say = (lines) => {
      for (const l of [].concat(lines)) {
        const o = typeof l === 'string' ? { text: l } : l;
        const sp = o.who ? (g.ui.speakers[o.who]?.name || o.who) : '';
        window.__said.push((sp ? sp + '「' : '') + o.text + (sp ? '」' : ''));
      }
      return say(lines);
    };
    const toast = g.ui.toast.bind(g.ui);
    g.ui.toast = (t, ms) => { window.__toasts.push(String(t).replace(/<[^>]+>/g, '')); return toast(t, ms); };
    if (g.ui.banner) { const b = g.ui.banner.bind(g.ui); g.ui.banner = (...a) => { window.__toasts.push('[banner] ' + a.filter((x) => typeof x === 'string').join(' / ').replace(/<[^>]+>/g, '')); return b(...a); }; }
  };
  setInterval(hook, 100);
});

async function boot() {
  await page.goto(`${base}/index.html${low ? '?low' : ''}`);
  const cleared = process.env.CLEARED ? JSON.parse(process.env.CLEARED) : ROUTE.slice(0, Math.max(0, ROUTE.indexOf(st)));
  if (process.env.NEW) {
    await page.evaluate(([st, cleared]) => { localStorage.clear(); if (st !== 'station') localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: st, flags: {}, inventory: [], counts: {}, elapsed: 0, hints: 0, cleared })); }, [st, cleared]);
  } else {
    await page.evaluate(([st, flags, inv, cleared]) => { localStorage.clear(); localStorage.setItem('hoshimawari-save-v1', JSON.stringify({ stage: st, flags, inventory: inv, counts: {}, elapsed: 0, hints: 0, cleared })); }, [st, JSON.parse(process.env.FLAGS || '{}'), JSON.parse(process.env.INV || '[]'), cleared]);
  }
  await page.reload();
  await page.waitForFunction((st) => window.__game?.stage?.id === st && document.querySelector('[data-act="new"]'), st, { timeout: 240000 });
  await page.waitForTimeout(800);
  if (process.env.NEW) {
    await page.click('[data-act="new"]');
    await page.waitForTimeout(500);
    if (st !== 'station') await page.evaluate(() => document.querySelector('.choice .btn')?.click());
  } else {
    await page.click('button:has-text("つづきから")');
  }
}

// ---- 会話を送りながら、終わる・パネルが開く・選択肢が出るまで待つ ----
async function pump(timeout = 120000) {
  const t0 = Date.now();
  let idle = 0;
  while (Date.now() - t0 < timeout) {
    const s = await page.evaluate(() => {
      const g = window.__game;
      if (!g) return { loading: true };
      if (document.querySelector('.depart-gate')) return { gate: true };
      if (g.ui.dialogueActive) { g.ui.advance(); if (g.ui._typing) g.ui.advance(); return { talking: true }; }
      if (document.querySelector('.choice')) return { choice: true };
      if (g.ui.panelOpen) return { panel: true };
      return { done: !!window.__actDone, busy: g.busy || g.cinematic };
    }).catch(() => ({ loading: true }));
    if (s.choice || s.panel || s.gate) return s;
    if (s.done && !s.busy) { if (++idle >= 3) return s; } else idle = 0;
    await page.waitForTimeout(s.talking ? 250 : 400);
  }
  return { timeout: true };
}

async function act(code, arg) {
  await page.evaluate(([code, arg]) => {
    const g = window.__game;
    window.__actDone = false; window.__actErr = null;
    const fn = new Function('g', 'arg', `return (async () => { ${code} })()`);
    fn(g, arg).then((r) => { window.__actRet = r; }).catch((e) => { window.__actErr = String(e?.stack || e); }).finally(() => { window.__actDone = true; });
  }, [code, arg]);
  return pump();
}

const TAP = `
  const it = g.interactables.get(arg.id);
  if (!it) throw new Error('そのidは無い: ' + arg.id);
  if (it.enabled === false) return 'disabled';
  if (!g.playing || g.busy || g.cinematic || g.ui.panelOpen) return 'blocked ' + JSON.stringify({ playing: g.playing, busy: g.busy, cinematic: g.cinematic, panel: g.ui.panelOpen });
  let vis = true; for (let o = it.object; o; o = o.parent) if (o.visible === false) vis = false;
  g.audio.play('click'); g.busy = true;
  try { if (arg.item) { if (!g.has(arg.item)) throw new Error('持っていない: ' + arg.item); await g.stage.useItem(arg.item, arg.id); } else await it.onClick(); }
  finally { g.busy = false; g.save(); }
  return vis ? 'ok' : 'ok（ただし非表示の物）';`;

async function snapshot(extra = {}) {
  const info = await page.evaluate(() => {
    const g = window.__game;
    const r = { said: window.__said.splice(0), toasts: window.__toasts.splice(0), ret: window.__actRet, err: window.__actErr };
    window.__actRet = undefined; window.__actErr = null;
    if (!g) return r;
    const ch = document.querySelector('.choice');
    if (ch) r.choices = [...ch.querySelectorAll('.btn')].map((b) => b.textContent), r.question = ch.querySelector('.choice-q')?.innerText;
    else if (g.ui.panelOpen) {
      const p = g.ui.panelLayer.lastElementChild;
      r.panel = p?.innerText.replace(/\n{2,}/g, '\n').slice(0, 1500);
      r.buttons = [...(p?.querySelectorAll('button') || [])].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 40);
    }
    if (document.querySelector('.depart-gate')) r.gate = document.querySelector('.depart-gate').innerText;
    r.stage = g.stage?.id;
    return r;
  });
  if (errors.length) info.errors = errors.splice(0);
  return { ...info, ...extra };
}

async function run(c) {
  const out = {};
  if (c.cam) await page.evaluate(([p, t]) => { const g = window.__game; g.camera.position.set(...p); g.controls.target.set(...t); g.controls.update(); }, c.cam);
  if (c.tap) out.pump = await act(TAP, { id: c.tap });
  if (c.use) out.pump = await act(TAP, { id: c.use[1], item: c.use[0] });
  if (c.inspect) out.pump = await act('g.selectItem(arg); g.selectItem(arg);', c.inspect);
  if (c.hint) out.pump = await act('await g.hint();');
  if (c.run) out.pump = await act(c.run.includes('return') || c.run.includes(';') ? c.run : 'return await (' + c.run + ')');
  if (c.choose !== undefined) { await page.evaluate((i) => document.querySelectorAll('.choice .btn')[i].click(), c.choose); out.pump = await pump(); }
  if (c.clickText) {
    const ok = await page.evaluate((t) => { const b = [...document.querySelectorAll('button, .btn')].filter((b) => b.offsetParent && b.textContent.includes(t)).pop(); if (b) b.click(); return !!b; }, c.clickText);
    out.clicked = ok;
    out.pump = await pump();
    if (out.pump.loading || (await page.evaluate(() => !window.__game?.stage).catch(() => true))) { await page.waitForFunction(() => window.__game?.stage, null, { timeout: 240000 }).catch(() => {}); await page.waitForTimeout(1500); out.pump = await pump(); }
  }
  if (c.click) { await page.click(c.click); out.pump = await pump(); }
  if (c.key) await page.keyboard.press(c.key);
  if (c.pump) out.pump = await pump();
  if (c.eval) out.value = await page.evaluate((code) => { const g = window.__game; try { return JSON.parse(JSON.stringify(eval(code)) ?? 'null'); } catch (e) { return 'ERR ' + e.message; } }, c.eval);
  if (c.wait) await page.waitForTimeout(c.wait);
  if (c.list) out.list = await page.evaluate(() => {
    const g = window.__game; const THREE = g.camera.constructor; const v = g.camera.position.clone();
    const res = [];
    for (const [id, it] of g.interactables) {
      let vis = true; for (let o = it.object; o; o = o.parent) if (o.visible === false) vis = false;
      it.object.getWorldPosition(v); const p = v.clone().project(g.camera);
      const on = p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1;
      res.push(`${id}｜${typeof it.name === 'function' ? it.name() : it.name}${it.enabled === false ? '｜無効' : ''}${vis ? '' : '｜非表示'}${on ? '' : '｜画面外'}｜(${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)})`);
    }
    return res;
  });
  if (c.state) out.state = await page.evaluate(() => {
    const g = window.__game;
    return { flags: g.state.flags, inventory: g.state.inventory, quests: document.querySelector('#quests')?.innerText, elapsed: Math.round(g.state.elapsed), hints: g.state.hints, cleared: g.state.cleared, selected: g.selectedItem };
  });
  if (c.shot) { await page.waitForTimeout(c.shotWait ?? 900); await page.screenshot({ path: `${OUT}/${c.shot}.png` }); out.shot = `${OUT}/${c.shot}.png`; }
  return snapshot(out);
}

await boot();
const first = await pump();
const PORT = +(process.env.PORT || 9200);
let queue = Promise.resolve();
http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', () => {
    queue = queue.then(async () => {
      let reply;
      try {
        const cmds = [].concat(JSON.parse(body || '{}'));
        if (cmds[0]?.quit) { res.end('{"bye":1}\n'); await browser.close(); process.exit(0); }
        reply = [];
        for (const c of cmds) reply.push(await run(c));
        if (reply.length === 1) reply = reply[0];
      } catch (e) { reply = { toolError: String(e?.stack || e) }; }
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(reply, null, 1) + '\n');
    });
  });
}).listen(PORT, () => console.log(JSON.stringify({ ready: PORT, ...(first || {}) })));
