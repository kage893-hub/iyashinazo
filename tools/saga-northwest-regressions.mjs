// 旧佐賀セーブで、北西の任意寄り道・街角・既存3施設を個別に確認する。通しプレイはしない。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:8123';
const LOAD_TIMEOUT = 180000, SCENE_TIMEOUT = 120000;
const oldNote = { id: 'sa-legacy-note', stage: 'saga', title: '以前のまちあるき', html: '前の旅で見つけた、大切な手がかり。' };
const oldSave = {
  stage: 'saga', flags: { introDone: true, saGuideMet: true, saBusDone: true, saDrafts: { shopping: { counts: [1, 0, 0, 0] } } },
  inventory: ['sagaGuide'], counts: {}, elapsed: 180, hints: 1, cleared: ['japan'], notes: [oldNote],
};
const streetIds = ['bakery', 'florist', 'bridge', 'park'];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir('shots/review', { recursive: true });
let passed = 0;
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(SCENE_TIMEOUT); page.setDefaultNavigationTimeout(LOAD_TIMEOUT);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    // sideScene が捕捉して console.error に送った例外も検知する。
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text());
  });
  await page.addInitScript(({ oldSave }) => {
    localStorage.setItem('hoshimawari-muted', '1');
    if (!sessionStorage.getItem('saga-northwest-seeded')) {
      sessionStorage.setItem('saga-northwest-seeded', '1');
      localStorage.setItem('hoshimawari-save-v1', JSON.stringify(oldSave));
    }
  }, { oldSave });
  const test = async (name, fn) => { await fn(); passed++; console.log(`OK ${name}`); };
  const settle = () => page.waitForFunction(() => {
    const g = window.__game;
    return g && !g.busy && !g.cinematic && !g.stage.sideBusy && !g.ui.dialogueActive && g.tweens.list.length === 0;
  }, null, { timeout: SCENE_TIMEOUT });
  const resume = async () => {
    await page.waitForFunction(() => window.__game?.stage?.id === 'saga' && !document.querySelector('#title').classList.contains('hidden'), null, { timeout: LOAD_TIMEOUT });
    await page.locator('[data-act="continue"]').click();
    await page.waitForFunction(() => window.__game.playing, null, { timeout: SCENE_TIMEOUT });
    await page.evaluate(() => {
      __game.timeScale = 6;
      clearInterval(window.__northwestDialogue);
      window.__northwestDialogue = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 65);
    });
    await settle();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#fade')).opacity === '0');
    await page.waitForTimeout(320); await settle();
  };
  const run = async (kind, name, args = []) => {
    await page.evaluate(({ kind, name, args }) => {
      window.__northwestDone = false; window.__northwestError = null;
      Promise.resolve().then(() => {
        const g = __game;
        if (kind === 'interactable') {
          const target = g.interactables.get(name);
          if (!target) throw new Error(`調べる対象がない: ${name}`);
          return target.onClick();
        }
        return g.stage[name](...args);
      }).then(() => { window.__northwestDone = true; }, error => {
        window.__northwestError = error.stack || error.message; window.__northwestDone = true;
      });
    }, { kind, name, args });
    await page.waitForFunction(() => window.__northwestDone, null, { timeout: SCENE_TIMEOUT });
    assert.equal(await page.evaluate(() => window.__northwestError), null, `${kind}: ${name}`);
    await settle();
  };
  const stage = (name, ...args) => run('stage', name, args);
  const close = async () => { await page.evaluate(() => __game.ui.closeAllPanels()); await page.waitForTimeout(280); };
  const dialogueShot = async (method, label) => {
    await page.evaluate(method => {
      clearInterval(window.__northwestDialogue);
      window.__northwestDone = false; window.__northwestError = null;
      Promise.resolve().then(() => __game.stage[method]()).then(() => { window.__northwestDone = true; }, error => {
        window.__northwestError = error.stack || error.message; window.__northwestDone = true;
      });
    }, method);
    try {
      await page.waitForFunction(() => __game.ui.dialogueActive && document.querySelector('#dialogue').classList.contains('show') && __game.tweens.list.length === 0,
        null, { timeout: SCENE_TIMEOUT });
      await page.evaluate(() => { if (__game.ui._typing) __game.ui.advance(); });
      await page.screenshot({ path: `shots/review/saga-northwest-${label}-dialogue.png`, animations: 'disabled' });
    } finally {
      await page.evaluate(() => {
        window.__northwestDialogue = setInterval(() => { if (__game.ui.dialogueActive) __game.ui.advance(); }, 65);
      });
    }
    await page.waitForFunction(() => window.__northwestDone, null, { timeout: SCENE_TIMEOUT });
    assert.equal(await page.evaluate(() => window.__northwestError), null, method);
    await settle(); await close();
  };
  const openNotebook = async () => {
    await settle();
    const notebook = page.locator('.inv-slot[title="旅のノート"]');
    await notebook.click(); await notebook.click();
    await page.locator('.panel-wrap.show .sa-guide').waitFor();
    assert.equal(await page.locator('.sa-guide-stop').count(), 5, '必須の寄り道は五つのまま');
    assert.match(await page.locator('.panel-wrap.show .panel-title').innerText(), /1\/5/);
  };
  const legacyProgress = () => page.evaluate(() => ({
    stage: __game.state.stage, inventory: __game.state.inventory, cleared: __game.state.cleared,
    counts: __game.state.counts, hints: __game.state.hints, draft: __game.flags.saDrafts.shopping,
    stamps: __game.stage.stamps, quests: __game.stage.quests(), finale: !!__game.flags.finaleDone,
    oldNote: __game.state.notes.find(note => note.id === 'sa-legacy-note'),
  }));
  let originalProgress;
  const unchangedProgress = async () => assert.deepEqual(await legacyProgress(), originalProgress, '任意の寄り道で必須進行・旧メモ・持ち物・途中入力を変えない');
  const reachableAndShot = async (label, viewport) => {
    const panel = page.locator('.panel-wrap.show .sa-visit-panel');
    await panel.waitFor(); await page.waitForTimeout(280);
    const box = await panel.boundingBox();
    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${label}: パネルが画面内`);
    assert.ok(await panel.evaluate(root => root.scrollWidth <= root.clientWidth + 1), `${label}: パネルの横はみ出しなし`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: ページの横はみ出しなし`);
    assert.equal(await panel.locator('.sa-visit-actions button').count(), 3);
    const unreachable = await panel.evaluate(root => {
      const failures = [];
      for (const button of root.querySelectorAll('button')) {
        button.scrollIntoView({ block: 'center', inline: 'nearest' });
        const a = root.getBoundingClientRect(), b = button.getBoundingClientRect();
        if (b.left < a.left - 1 || b.top < a.top - 1 || b.right > a.right + 1 || b.bottom > a.bottom + 1) failures.push(button.textContent.trim());
      }
      root.scrollTop = 0; return failures;
    });
    assert.deepEqual(unreachable, [], `${label}: 閉じる操作を含む全ボタンへスクロール到達`);
    await page.screenshot({ path: `shots/review/saga-northwest-${label}-${viewport.label}-top.png`, animations: 'disabled' });
    await panel.locator('.sa-visit-actions button').last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `shots/review/saga-northwest-${label}-${viewport.label}-actions.png`, animations: 'disabled' });
  };

  await page.goto(`${base}/index.html?low`); await resume();
  await test('旧佐賀セーブから北西2施設と8住人を構築し、既存の途中入力を読む', async () => {
    originalProgress = await legacyProgress();
    assert.deepEqual(originalProgress.stamps, ['bus']); assert.equal(originalProgress.quests.length, 6);
    assert.deepEqual(originalProgress.draft.counts, [1, 0, 0, 0]); assert.deepEqual(originalProgress.oldNote, oldNote);
    assert.deepEqual(originalProgress.inventory, ['sagaGuide']); assert.deepEqual(originalProgress.cleared, ['japan']);
    const built = await page.evaluate(() => ({
      facilities: ['amandi', 'bistro'].map(id => !!__game.stage.R[id]?.root?.parent && __game.interactables.has(id)),
      residents: Object.keys(__game.stage.residents),
      rested: !!__game.flags.saSpaRested, tasted: !!__game.flags.saFoamTasted,
      served: __game.stage.R.bistro.servedDish.visible,
    }));
    assert.deepEqual(built.facilities, [true, true]); assert.equal(built.residents.length, 8);
    assert.ok(built.residents.includes('spaHost') && built.residents.includes('chef'));
    assert.equal(built.rested, false); assert.equal(built.tasted, false); assert.equal(built.served, false);
  });

  await test('旅ノートの北西3行き先を実クリックし、近景・散歩道へ移れる', async () => {
    for (const [id, label] of [['amandi', 'アマンディ'], ['bistro', '山カフェレストランKUREHA'], ['district', '北西の散歩道']]) {
      const before = await page.evaluate(() => __game.controls.target.toArray());
      await openNotebook();
      await page.locator('.sa-destination').filter({ hasText: label }).click();
      await settle(); assert.equal(await page.locator('.panel-wrap.show').count(), 0);
      const target = await page.evaluate(() => __game.controls.target.toArray());
      assert.ok(Math.hypot(...target.map((n, i) => n - before[i])) > 1, `${label}: 視点が移動する`);
      assert.ok(target[0] < -10 && target[2] < -35, `${label}: 北西へ移動する`);
      if (id === 'district') {
        const clipped = await page.evaluate(async () => {
          const T = await import('three'), g = __game, outside = [];
          g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
          for (const id of ['amandi', 'bistro']) {
            const box = new T.Box3().setFromObject(g.stage.R[id].root);
            for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
              const p = new T.Vector3(x, y, z).project(g.camera);
              if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z > 1) outside.push(id);
            }
          }
          return outside;
        });
        assert.deepEqual(clipped, [], '縦画面の地区案内で2施設の全体が収まる');
      }
      await page.screenshot({ path: `shots/review/saga-northwest-building-${id}.png`, animations: 'disabled' });
    }
    await unchangedProgress();
  });

  for (const viewport of [{ width: 390, height: 844, label: 'portrait' }, { width: 820, height: 520, label: 'landscape' }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForFunction(() => Math.abs(__game.camera.aspect - innerWidth / innerHeight) < 0.0001);
    await test(`${viewport.width}×${viewport.height}: 湯と料理の全操作へ到達し、任意の体験を記録する`, async () => {
      await stage('openAmandi'); await reachableAndShot('amandi', viewport);
      if (viewport.label === 'portrait') {
        const lines = await page.evaluate(() => __game.ui.log.length);
        await page.getByRole('button', { name: 'ここでひと休みする', exact: true }).click();
        await page.waitForFunction(() => __game.flags.saSpaRested && !__game.stage.sideBusy && !__game.ui.dialogueActive, null, { timeout: SCENE_TIMEOUT });
        await settle();
        assert.ok(await page.evaluate(before => __game.ui.log.length > before, lines), '休憩の会話を終える');
        assert.equal(await page.evaluate(() => __game.state.notes.filter(note => note.id === 'sa-side-spa').length), 1);
      } else await close();
      await stage('openBistro'); await reachableAndShot('bistro', viewport);
      if (viewport.label === 'portrait') {
        const lines = await page.evaluate(() => __game.ui.log.length);
        await page.getByRole('button', { name: 'サラダを味わう', exact: true }).click();
        await page.waitForFunction(() => __game.flags.saFoamTasted && !__game.stage.sideBusy && !__game.ui.dialogueActive, null, { timeout: SCENE_TIMEOUT });
        await settle();
        assert.ok(await page.evaluate(before => __game.ui.log.length > before, lines), '料理の会話を終える');
        assert.equal(await page.evaluate(() => __game.stage.R.bistro.servedDish.visible), true);
        assert.equal(await page.evaluate(() => __game.state.notes.filter(note => note.id === 'sa-side-bistro').length), 1);
      } else await close();
      if (viewport.label === 'portrait') {
        await dialogueShot('talkSpaHost', 'spa-host');
        await dialogueShot('talkChef', 'chef');
      }
      await unchangedProgress();
    });
  }

  await test('街角4か所はメッシュ結合後も調べられ、それぞれのメモを残す', async () => {
    const roots = await page.evaluate(ids => ids.map(id => {
      const g = __game, place = g.stage.R.streetScenes[id], it = g.interactables.get(`street_${id}`);
      return { id, attached: !!place?.root?.parent && g.scene.getObjectById(place.root.id) === place.root,
        registered: it?.object === place?.root, pickable: it?.meshes.filter(mesh => g.pickList.includes(mesh) && !mesh.userData.noPick).length || 0 };
    }), streetIds);
    for (const root of roots) assert.ok(root.attached && root.registered && root.pickable > 0, `${root.id}: rootとレイキャスト対象を保持`);
    for (const id of streetIds) {
      await run('interactable', `street_${id}`);
      assert.equal(await page.evaluate(id => __game.state.notes.filter(note => note.id === `sa-street-${id}`).length, id), 1);
    }
    await unchangedProgress();
  });

  await test('再読込で任意2旗・2メモ・皿・街角メモ・旧draftとスタンプを復元する', async () => {
    const saved = await page.evaluate(() => { __game.save(); return JSON.parse(localStorage.getItem('hoshimawari-save-v1')); });
    assert.equal(saved.flags.saSpaRested, true); assert.equal(saved.flags.saFoamTasted, true);
    await page.reload(); await resume();
    assert.deepEqual(await page.evaluate(() => __game.flags), saved.flags);
    assert.deepEqual(await page.evaluate(() => __game.state.notes), saved.notes);
    assert.equal(await page.evaluate(() => __game.stage.R.bistro.servedDish.visible), true);
    for (const id of ['sa-side-spa', 'sa-side-bistro', ...streetIds.map(id => `sa-street-${id}`)])
      assert.equal(await page.evaluate(id => __game.state.notes.filter(note => note.id === id).length, id), 1, id);
    await unchangedProgress();
    await openNotebook();
    assert.match(await page.locator('.sa-side-memories').innerText(), /湯どころでひと休み ✓/);
    assert.match(await page.locator('.sa-side-memories').innerText(), /KUREHAで一皿を味わった ✓/);
    await close();
  });

  await test('既存3施設の正面の中心が、追加施設に遮られず元の施設を指す', async () => {
    for (const site of [
      { model: 'station', method: 'visit', args: ['station'], point: [0, 5.55, 16.40], expected: 'sagaStation' },
      { model: 'mallage', method: 'visit', args: ['mallage'], point: [1.5, 10.2, 62.96], expected: 'mallageSaga' },
      { model: 'property', method: 'propertyView', args: ['front'], point: [2.82, 1.9, 2.05], expected: 'kawakubo' },
    ]) {
      await stage(site.method, ...site.args);
      const picked = await page.evaluate(({ model, point }) => {
        const g = __game, root = g.stage.R[model].root;
        g.scene.updateMatrixWorld(true); g.camera.updateMatrixWorld(true);
        const p = root.localToWorld(g.controls.target.clone().set(...point)).project(g.camera);
        const rect = g.renderer.domElement.getBoundingClientRect();
        return { ndc: p.toArray(), id: g._pick({ clientX: rect.left + (p.x + 1) * rect.width / 2, clientY: rect.top + (1 - p.y) * rect.height / 2 }) };
      }, site);
      assert.ok(Math.abs(picked.ndc[0]) < 1 && Math.abs(picked.ndc[1]) < 1 && picked.ndc[2] < 1, `${site.model}: 前面の中心が画面内`);
      assert.equal(picked.id, site.expected, `${site.model}: 前面の中心を正しく調べられる`);
      await page.screenshot({ path: `shots/review/saga-northwest-existing-${site.model}.png`, animations: 'disabled' });
    }
    await unchangedProgress();
  });
  assert.deepEqual(errors, []);
  console.log(`PASS ${passed} checks; screenshots: shots/review/saga-northwest-*`);
} finally { await browser.close(); }
