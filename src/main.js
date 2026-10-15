import { Game } from './core/game.js';
import { el } from './core/ui.js';
import { STAGES } from './stages/registry.js';
import { ROUTE, stageByPass } from './data/route.js';

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
  let saved0 = game.loadSave();
  // クリアした駅のセーブ（出発後）なら、次の駅から再開する
  if (saved0?.flags?.departed && saved0.cleared?.includes(saved0.stage)) {
    const i = STAGES.findIndex((x) => x.id === saved0.stage);
    const next = STAGES[i + 1];
    game.state = saved0;
    game.resetState(next?.Stage ? next.id : saved0.stage);
    saved0 = game.loadSave();
  }
  let autostart = null;
  try { autostart = sessionStorage.getItem('hoshimawari-autostart'); sessionStorage.removeItem('hoshimawari-autostart'); } catch (e) { /* ignore */ }
  // ?stage=onsen のように指定すると、そのステージから始められる（動作確認用）
  const jump = new URLSearchParams(location.search).get('stage');
  if (jump && STAGES.some((x) => x.id === jump && x.Stage) && saved0?.stage !== jump) {
    game.resetState(jump);
    saved0 = game.loadSave();
  }
  const stageId = autostart || saved0?.stage || 'station';
  const entry = STAGES.find((x) => x.id === stageId && x.Stage) || STAGES[0];
  if (saved0) game.state = saved0;
  if (game.state.stage !== entry.id) game.resetState(entry.id);
  await game.loadStage(entry.Stage);
  game.start();

  // タイトル画面：箱庭をゆっくり回す
  const c = game.controls;
  if (innerWidth < innerHeight) game.camera.position.set(34, 30, 52);
  else game.camera.position.set(24, 20, 36);
  c.target.set(0, 0.5, 0);
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
    if (entry.id !== 'station') {
      // いまの駅を最初からか、はざま駅からかを選ぶ
      const note = game.hasSave() ? '<br><small>（いまの進行は消えます）</small>' : '';
      const i = await game.ui.choose(`どこからはじめますか？${note}`, [`「${entry.name}」を最初から`, 'はざま駅（STAGE 1）から', 'やめる']);
      if (i === 0) startStage();
      else if (i === 1) game.goToStage('station');
      return;
    }
    if (game.hasSave()) {
      const i = await game.ui.choose('セーブデータがあります。最初からはじめますか？<br><small>（いまの進行は消えます）</small>', ['はじめから', 'やめる']);
      if (i !== 0) return;
    }
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
    // スマホ縦は真上寄りから見下ろして、箱庭を画面いっぱいに
    if (portrait) { game.camera.position.set(10, 37, 29); c.target.set(0, 0.5, 0); }
    else { game.camera.position.set(10, 16, 26); c.target.set(-1, 1, -0.5); }
    enterGame();
    await game.ui.fade(0, 0.8);
    game.ui.toast('つづきから再開しました', 2000);
  };

  // 路線図：通った駅と次の駅だけ見える（まだ見ぬ駅は「？？？」）
  title.querySelector('[data-act="stages"]').onclick = () => {
    game.audio.init();
    game.audio.play('click');
    const body = el('div', 'stage-list');
    let panel;
    const reached = Math.max(0, ...STAGES.map((s, i) => (cleared.includes(s.id) ? i + 1 : 0)));
    STAGES.forEach((s, i) => {
      const done = cleared.includes(s.id);
      const known = done || i <= reached; // 通った駅と、その次の駅
      const open = known && !!s.Stage;
      const card = el('button', `stage-card ${open ? 'open' : 'locked'} ${done ? 'cleared' : ''} ${known ? '' : 'unknown'}`, known ? `
        <div class="sc-no">STAGE ${s.no}</div>
        <div class="sc-emoji">${s.emoji}</div>
        <div class="sc-name">${s.name}</div>
        <div class="sc-sub">${!s.Stage ? '準備中…' : done ? s.sub : '次の停車駅'}</div>` : `
        <div class="sc-no">STAGE ${s.no}</div>
        <div class="sc-emoji">❔</div>
        <div class="sc-name">？？？</div>
        <div class="sc-sub">まだ見ぬ駅</div>`);
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
    body.appendChild(el('p', 'panel-note', 'クリアした駅には、いつでも戻れます。'));
    panel = game.ui.openPanel({ title: '路線図', body, cls: 'wide' });
  };

  // あいことば：ほかの端末やブラウザでも、その駅から始められる
  title.querySelector('[data-act="pass"]').onclick = () => {
    game.audio.init();
    game.audio.play('click');
    const body = el('div', 'pass-form');
    body.innerHTML = `
      <p class="panel-note">クリア画面やメニューに出ている<br>「あいことば」を入れてください。</p>
      <input class="pass-input" type="text" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ひらがなで">
      <p class="pass-msg"></p>
      <button class="btn primary">この駅へ ▶</button>`;
    const input = body.querySelector('input');
    const msg = body.querySelector('.pass-msg');
    const panel = game.ui.openPanel({ title: 'あいことば', body, cls: 'small' });
    const go = async () => {
      const s = stageByPass(input.value);
      const st = s && STAGES.find((x) => x.id === s.id);
      if (!st?.Stage) {
        game.audio.play('wrong');
        msg.textContent = 'あいことばが ちがうようだ……';
        body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
        return;
      }
      game.audio.play('click');
      const q = await game.ui.choose(`STAGE ${st.no}「${st.name}」から遊びますか？${game.hasSave() ? '<br><small>（いまの進行は上書きされます）</small>' : ''}`, ['出発する', 'やめる']);
      if (q !== 0) return;
      panel.close();
      // その駅より前の駅は、クリアしたことにする
      const before = ROUTE.slice(0, ROUTE.findIndex((x) => x.id === st.id)).map((x) => x.id);
      game.state.cleared = [...new Set([...(game.state.cleared || []), ...before])];
      await game.ui.fade(1, 0.5);
      game.goToStage(st.id);
    };
    body.querySelector('button').onclick = go;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) go(); });
    setTimeout(() => input.focus(), 100);
  };

  title.querySelector('[data-act="howto"]').onclick = () => {
    game.audio.init();
    game.audio.play('click');
    showHowTo(game);
  };

  // HUD
  $('#btn-hint').onclick = () => { game.audio.play('click'); game.hint(); };
  // カメラの補助ボタン（ドラッグ操作はそのまま）
  document.querySelectorAll('#camctl .cam-btn').forEach((b) => {
    b.onclick = () => {
      game.audio.play('click');
      const a = b.dataset.cam;
      if (a === 'in') game.camZoom(0.72);
      else if (a === 'out') game.camZoom(1.38);
      else if (a === 'left') game.camRotate(1);
      else if (a === 'right') game.camRotate(-1);
      else game.cameraHome();
    };
  });
  $('#btn-notes').onclick = () => { game.audio.play('click'); showNotes(game); };
  $('#btn-reveal').onclick = () => {
    if (game.cinematic) return;
    game.stage.revealHotspots();
    game.showLabels();
  };
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
    mk('カメラを全体にもどす', () => { panel.close(); game.cameraHome(); });
    mk('タイトルにもどる', () => { game.save(); location.reload(); });
    mk('この駅を最初からやりなおす', async () => {
      panel.close();
      const i = await game.ui.choose('この駅の進行状況を消して、最初からやりなおしますか？', ['やりなおす', 'やめる']);
      if (i === 0) { game.resetState(game.state.stage); location.reload(); }
    }, 'danger');
    const pass = ROUTE.find((x) => x.id === game.state.stage)?.pass;
    if (pass) body.appendChild(el('p', 'panel-note', `この駅のあいことば：<b class="pass-word">${pass}</b><br><small>タイトルの「あいことば」で、ほかの端末でも来られます。</small>`));
    panel = game.ui.openPanel({ title: 'メニュー', body, cls: 'small' });
  };

  window.addEventListener('keydown', (e) => {
    if (!game.playing) return;
    if (e.key === 'Escape') {
      if (game.ui.panelOpen) game.ui.panels[game.ui.panels.length - 1].close();
      else if (game.selectedItem) game.selectItem(null);
    }
    if ((e.key === 'm' || e.key === 'M') && !game.ui.dialogueActive && !game.ui.panelOpen) showNotes(game);
    if ((e.key === 'h' || e.key === 'H') && !game.ui.dialogueActive && !game.ui.panelOpen) game.hint();
  });
}

/** 旅のメモ帳：手がかり と 会話のきろく */
function showNotes(game) {
  if (game.cinematic || game.ui.panelOpen) return;
  $('#btn-notes').classList.remove('new');
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fmt = (t) => esc(t).replace(/【([^】]*)】?/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const notes = (game.state.notes || []).filter((n) => n.stage === game.state.stage).slice().reverse();
  const body = el('div', 'notes');
  body.innerHTML = `
    <div class="nt-tabs"><button class="nt-tab on" data-t="clue">手がかり</button><button class="nt-tab" data-t="log">会話のきろく</button></div>
    <div class="nt-page" data-p="clue">${notes.length
      ? notes.map((n) => `<div class="nt-card"><div class="nt-title">${n.title}</div><div class="nt-body">${n.html}</div></div>`).join('')
      : '<p class="panel-note">まだ何も書きとめていない。<br>手がかりを見つけると、ここに自動で書きとめられます。</p>'}</div>
    <div class="nt-page hidden" data-p="log">${game.ui.log.length
      ? game.ui.log.map((l) => `<div class="nt-line ${l.name ? '' : 'narr'}">${l.name ? `<b style="--c:${l.color || '#6b4a2e'}">${l.icon} ${l.name}</b>` : ''}<span>${fmt(l.text)}</span></div>`).join('')
      : '<p class="panel-note">まだ会話のきろくはありません。</p>'}</div>`;
  body.querySelectorAll('.nt-tab').forEach((b) => {
    b.onclick = () => {
      game.audio.play('click');
      body.querySelectorAll('.nt-tab').forEach((x) => x.classList.toggle('on', x === b));
      body.querySelectorAll('.nt-page').forEach((p) => p.classList.toggle('hidden', p.dataset.p !== b.dataset.t));
      const log = body.querySelector('[data-p="log"]');
      if (b.dataset.t === 'log') log.scrollTop = log.scrollHeight;
    };
  });
  game.ui.openPanel({ title: '📖 旅のメモ', body, cls: 'wide notes-panel' });
}

function showHowTo(game) {
  game.ui.openPanel({
    title: 'あそびかた',
    cls: 'wide',
    body: `
      <div class="howto">
        <div><b>🖱 ドラッグ / 1本指</b>：箱庭をくるりと回す</div>
        <div><b>🖱 右ドラッグ・Shift+ドラッグ / 2本指</b>：視点を動かす</div>
        <div><b>🔍 ホイール / ピンチ</b>：指している場所に寄る・引く</div>
        <div><b>👆 何もない所をダブルクリック・ダブルタップ</b>：そこを画面の中心に</div>
        <div><b>＋ － ⟲ ⟳ ⌂</b>：画面右のボタンでも 寄る・引く・回る・全体を見る</div>
        <div><b>⌨ キーボード</b>：WASD・矢印で移動、Q / E で回転、R / F で寄り引き</div>
        <div><b>👆 クリック / タップ</b>：調べる・話しかける</div>
        <div><b>🎒 持ち物</b>：アイテムを選んでから、使いたい場所をクリック（もう一度押すと説明）</div>
        <div><b>✨</b>：調べられる場所を光らせて、名前を出す</div>
        <div><b>📖</b>：旅のメモ（見つけた手がかりと、会話のきろく）</div>
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
