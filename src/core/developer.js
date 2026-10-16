import { el } from './ui.js';
import { ALL_STAGES } from '../stages/registry.js';
import { normalizePass, stageLabel } from '../data/route.js';
import { savedJourney } from './save-state.js';

const MODE_KEY = 'hoshimawari-developer-v1';
export const isDeveloperPass = (word) => normalizePass(word) === 'つごもりりん';

export function loadDeveloperMode() {
  try { return localStorage.getItem(MODE_KEY) === '1'; } catch (e) { return false; }
}

export function setDeveloperMode(game, enabled) {
  game.developerMode = enabled;
  try {
    if (enabled) localStorage.setItem(MODE_KEY, '1');
    else localStorage.removeItem(MODE_KEY);
  } catch (e) { /* 保存できない場合も、いまの画面では使える */ }
}

/** 通常の路線図・クリア記録を変えずに、確認したい駅を選ぶ。 */
export function showDeveloperMode(game) {
  if (!game.developerMode) return null;
  const body = el('div', 'developer-tools');
  body.appendChild(el('p', 'panel-note', '本編・追加の旅の、どの駅にも移動できます。<br>解禁してもクリア記録は増えません。'));
  const list = el('div', 'stage-list');
  let panel;
  for (const stage of ALL_STAGES) {
    const card = el('button', 'stage-card open', `<div class="sc-no">${stageLabel(stage.id)}</div><div class="sc-emoji">${stage.emoji}</div><div class="sc-name">${stage.name}</div><div class="sc-sub">${stage.sub}</div>`);
    card.dataset.stage = stage.id;
    card.disabled = !stage.Stage;
    card.onclick = async () => {
      game.audio.play('click');
      if (game.playing) game.save();
      const saved = savedJourney(game.state, stage.id);
      const started = saved && (Object.keys(saved.flags).length > 0 || saved.elapsed > 0);
      const options = started ? ['つづきから', '最初から', 'やめる'] : ['出発する', 'やめる'];
      const main = game.state.journeys?.main;
      const replacingMain = !stage.extra && !saved && main && (Object.keys(main.flags).length > 0 || main.elapsed > 0);
      const note = started ? '<br><small>「最初から」を選ぶと、この旅の途中の進行をリセットします。</small>'
        : replacingMain ? '<br><small>本編の途中の進行は、この駅の進行に切り替わります。</small>' : '';
      const choice = await game.ui.choose(`「${stage.name}」へ移動しますか？${note}`, options);
      if (choice < 0 || choice === options.length - 1) return;
      panel.close();
      game.goToStage(stage.id, { resume: !started || choice === 0 });
    };
    list.appendChild(card);
  }
  body.appendChild(list);
  const disable = el('button', 'btn danger', '開発モードを解除する');
  disable.onclick = () => {
    setDeveloperMode(game, false);
    panel.close();
    game.ui.toast('開発モードを解除しました', 2200);
  };
  body.appendChild(disable);
  panel = game.ui.openPanel({ title: '🛠 開発モード', body, cls: 'wide developer-panel' });
  return panel;
}
