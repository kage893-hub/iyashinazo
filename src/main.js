import * as THREE from 'three';
import { Game } from './core/game.js';
import { el } from './core/ui.js';
import { STAGES } from './stages/registry.js';

const $ = (s) => document.querySelector(s);

async function waitFonts() {
  if (!document.fonts) return;
  const load = Promise.all([
    document.fonts.load('700 40px "Zen Maru Gothic"'),
    document.fonts.load('900 40px "Zen Maru Gothic"'),
    document.fonts.load('500 20px "Zen Maru Gothic"'),
  ]).catch(() => {});
  await Promise.race([load, new Promise((r) => setTimeout(r, 2500))]);
}

async function main() {
  await waitFonts();
  const game = new Game($('#app'));
  window.__game = game; // デバッグ用
  try {
    const saved = localStorage.getItem('hoshimawari-muted') === '1';
    game.audio.setMuted(saved);
    $('#btn-sound').textContent = saved ? '🔇' : '🔊';
  } catch (e) { /* ignore */ }

  // セーブされているステージの箱庭を作る（無ければ はざま駅）
  const saved0 = game.loadSave();
  let autostart = null;
  try { autostart = sessionStorage.getItem('hoshimawari-autostart'); sessionStorage.removeItem('hoshimawari-autostart'); } catch (e) { /* ignore */ }
  const stageId = autostart || saved0?.stage || 'station';
  const entry = STAGES.find((x) => x.id === stageId && x.Stage) || STAGES[0];
  if (saved0) game.state = saved0;
  if (game.state.stage !== entry.id) game.resetState(entry.id);
  await game.loadStage(entry.Stage);
  game.start();
  $('#btn-roof').classList.toggle('hidden', !game.stage.hasRoof);

  // タイトル画面：箱庭をゆっくり回す
  const c = game.controls;
  if (innerWidth < innerHeight) game.camera.position.set(34, 30, 52);
  else game.camera.position.set(24, 20, 36);
  c.target.set(0, 0.5, 0);
  c.sync();
  c.autoRotate = true;
  c.autoRotateSpeed = 0.35;
  game.playing = false;

  $('#loading').classList.add('hidden');
  const title = $('#title');
  title.classList.remove('hidden');
  game.ui.fade(0, 1.2);
  const contBtn = title.querySelector('[data-act="continue"]');
  contBtn.disabled = !game.hasSave();

  const cleared = game.loadSave()?.cleared || [];
  if (cleared.length) {
    const badge = title.querySelector('.title-badge');
    badge.textContent = '★ ' + STAGES.filter((x) => cleared.includes(x.id)).map((x) => x.name).join('・') + ' クリア';
    badge.classList.remove('hidden');
  }
  // いまの箱庭のステージ名
  title.querySelector('.title-stage').textContent = `STAGE ${entry.no}　${entry.name}`;

  const enterGame = () => {
    game.audio.init();
    game.audio.startBGM();
    c.autoRotate = false;
    title.classList.add('hidden');
    $('#hud').classList.remove('hidden');
    game.playing = true;
    game.refreshInventory();
    game.refreshQuests();
  };

  const startStage = async () => {
    game.resetState(entry.id);
    game.stage.applyState(true);
    await game.ui.fade(1, 0.6);
    enterGame();
    game.stage.opening();
  };

  title.querySelector('[data-act="new"]').onclick = async () => {
    game.audio.init();
    game.audio.play('click');
    if (game.hasSave()) {
      const i = await game.ui.choose('セーブデータがあります。最初の駅からはじめますか？', ['はじめから', 'やめる']);
      if (i !== 0) return;
    }
    if (entry.id !== 'station') { game.goToStage('station'); return; }
    startStage();
  };

  // 次のステージから自動で始める（クリア後・路線図から）
  // （ブラウザは操作なしでは音を鳴らせないので、ひと押ししてもらう）
  if (autostart) {
    title.classList.add('hidden');
    const gate = el('div', 'depart-gate', `
      <div class="dg-sub">STAGE ${entry.no}</div>
      <div class="dg-main">${entry.name}</div>
      <button class="btn primary">▶ 出発する</button>`);
    document.body.appendChild(gate);
    requestAnimationFrame(() => gate.classList.add('show'));
    gate.querySelector('button').onclick = () => {
      game.audio.init();
      game.audio.play('click');
      gate.remove();
      startStage();
    };
  }

  contBtn.onclick = async () => {
    game.audio.init();
    game.audio.play('click');
    const s = game.loadSave();
    if (!s) return;
    game.state = s;
    game.stage.applyState(true);
    await game.ui.fade(1, 0.5);
    const portrait = innerWidth < innerHeight;
    game.camera.position.set(portrait ? 16 : 10, portrait ? 26 : 16, portrait ? 40 : 26);
    c.target.set(-1, 1, -0.5);
    c.sync();
    enterGame();
    await game.ui.fade(0, 0.8);
    game.ui.toast('つづきから再開しました', 2000);
  };

  title.querySelector('[data-act="stages"]').onclick = () => {
    game.audio.init();
    game.audio.play('click');
    const body = el('div', 'stage-list');
    let panel;
    STAGES.forEach((s, i) => {
      // 前のステージをクリアしていれば遊べる
      const open = s.Stage && (i === 0 || cleared.includes(STAGES[i - 1].id));
      const card = el('button', `stage-card ${open ? 'open' : 'locked'} ${cleared.includes(s.id) ? 'cleared' : ''}`, `
        <div class="sc-no">STAGE ${s.no}</div>
        <div class="sc-emoji">${s.emoji}</div>
        <div class="sc-name">${s.name}</div>
        <div class="sc-sub">${!s.Stage ? '準備中…' : open ? s.sub : '前の駅をクリアすると行けます'}</div>`);
      card.disabled = !open;
      card.onclick = async () => {
        game.audio.play('click');
        const q = await game.ui.choose(`「${s.name}」から遊びますか？${game.hasSave() ? '<br><small>（いまの進行は上書きされます）</small>' : ''}`, ['出発する', 'やめる']);
        if (q !== 0) return;
        panel.close();
        await game.ui.fade(1, 0.5);
        game.goToStage(s.id);
      };
      body.appendChild(card);
    });
    body.appendChild(el('p', 'panel-note', 'ほしまわり号は、5つの世界をめぐる予定です。'));
    panel = game.ui.openPanel({ title: '路線図', body, cls: 'wide' });
  };

  title.querySelector('[data-act="howto"]').onclick = () => {
    game.audio.init();
    game.audio.play('click');
    showHowTo(game);
  };

  // HUD
  $('#btn-hint').onclick = () => { game.audio.play('click'); game.hint(); };
  $('#btn-reveal').onclick = () => { game.stage.revealHotspots(); };
  $('#btn-roof').onclick = () => {
    game.audio.play('click');
    game.stage.manualRoof = !game.stage.manualRoof;
    $('#btn-roof').classList.toggle('on', game.stage.manualRoof);
  };
  // カメラのボタン
  $('#btn-rot-l').onclick = () => { game.audio.play('click'); c.rotateBy(Math.PI / 2); };
  $('#btn-rot-r').onclick = () => { game.audio.play('click'); c.rotateBy(-Math.PI / 2); };
  $('#btn-overview').onclick = () => { game.audio.play('click'); c.overview(); };
  $('#btn-sound').onclick = () => {
    game.audio.init();
    const m = !game.audio.muted;
    game.audio.setMuted(m);
    if (!m) game.audio.startBGM();
    $('#btn-sound').textContent = m ? '🔇' : '🔊';
    try { localStorage.setItem('hoshimawari-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
  };
  $('#btn-menu').onclick = () => {
    game.audio.play('click');
    const body = el('div', 'menu');
    const mk = (label, fn, cls = '') => { const b = el('button', `btn ${cls}`, label); b.onclick = fn; body.appendChild(b); };
    let panel;
    mk('あそびかた', () => { panel.close(); showHowTo(game); });
    mk('カメラを島全体にもどす', () => { panel.close(); c.overview(); });
    mk('タイトルにもどる', () => { game.save(); location.reload(); });
    mk('この駅を最初からやりなおす', async () => {
      panel.close();
      const i = await game.ui.choose('この駅の進行状況を消して、最初からやりなおしますか？', ['やりなおす', 'やめる']);
      if (i === 0) { game.resetState(game.state.stage); location.reload(); }
    }, 'danger');
    panel = game.ui.openPanel({ title: 'メニュー', body, cls: 'small' });
  };

  window.addEventListener('keydown', (e) => {
    if (!game.playing) return;
    if (e.key === 'Escape') {
      if (game.ui.panelOpen) game.ui.panels[game.ui.panels.length - 1].close();
      else if (game.selectedItem) game.selectItem(null);
    }
    if ((e.key === 'h' || e.key === 'H') && !game.ui.dialogueActive && !game.ui.panelOpen) game.hint();
  });
}

function showHowTo(game) {
  game.ui.openPanel({
    title: 'あそびかた',
    cls: 'wide',
    body: `
      <div class="howto">
        <div><b>👉 ドラッグ（指1本）</b>：地図のように視点をすべらせる</div>
        <div><b>⟲ ⟳ / 2本指でひねる / 右ドラッグ</b>：箱庭を横に回す</div>
        <div><b>🔍 ピンチ / ホイール</b>：寄る・引く（角度は自動で調整）</div>
        <div><b>🗺</b>：島全体を見わたす</div>
        <div><b>⌨ キー</b>：WASD・矢印で移動、Q/E で回転、+/- で拡大縮小</div>
        <div><b>👆 クリック / タップ</b>：調べる・話しかける</div>
        <div><b>🎒 持ち物</b>：アイテムを選んでから、使いたい場所をクリック（もう一度押すと説明）</div>
        <div><b>🏠</b>：建物の屋根を外す（近づくと自動でも外れます）</div>
        <div><b>✨</b>：調べられる場所を光らせる</div>
        <div><b>💡</b>：ヒント（押すたびに少しずつ詳しく）</div>
      </div>
      <p class="panel-note">進行は自動でセーブされます。</p>`,
  });
}

main().catch((e) => {
  console.error(e);
  const l = document.querySelector('#loading p');
  if (l) l.textContent = '読み込みに失敗しました：' + e.message;
});
