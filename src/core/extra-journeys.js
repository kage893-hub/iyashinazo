import { el } from './ui.js';
import { extrasUnlocked, savedJourney } from './save-state.js';
import { stageInfo } from '../data/route.js';
import { EXTRA_STAGES } from '../stages/registry.js';

/** 路線図と旅券で共用する、解放済みの追加ステージの選択カード。 */
export function createExtraJourneyList(game, onLeave) {
  const list = el('div', 'extra-station-list');
  if (!extrasUnlocked(game.state)) return list;
  for (const stage of EXTRA_STAGES) {
    const saved = savedJourney(game.state, stage.id);
    const started = saved && (saved.flags.introDone || Object.keys(saved.flags).length || saved.elapsed > 0);
    const done = game.state.cleared.includes(stage.id);
    const card = el('article', `extra-station ${done ? 'is-cleared' : ''}`);
    card.innerHTML = `<div class="extra-station-art" aria-hidden="true">${stage.emoji}<span>EXTRA JOURNEY</span></div><div class="extra-station-info"><span class="extra-station-status">${done ? '★ CLEAR' : started ? '旅の途中' : '新しい旅'}</span><h3>${stage.name}</h3><p>${stage.sub}</p></div>`;
    const actions = el('div', 'extra-station-actions');
    const depart = el('button', 'btn primary', started ? 'つづきから ▶' : 'この旅へ出発 ▶');
    depart.disabled = !stage.Stage;
    depart.onclick = () => {
      game.audio.play('click');
      onLeave();
      game.goToStage(stage.id, { resume: true });
    };
    actions.appendChild(depart);
    if (started) {
      const restart = el('button', 'btn extra-restart', '最初から');
      restart.onclick = async () => {
        game.audio.play('click');
        const choice = await game.ui.choose(`「${stage.name}」の進行を消して、最初から旅をしますか？<br><small>本編・ほかの追加の旅・クリア記録は残ります。</small>`, ['最初から出発する', 'やめる']);
        if (choice !== 0) return;
        onLeave();
        game.goToStage(stage.id);
      };
      actions.appendChild(restart);
    }
    card.appendChild(actions);
    list.appendChild(card);
  }
  return list;
}

/** 本編クリア・旅先のメニューで共用する、追加の旅の旅券。 */
export function showExtraJourneys(game) {
  game.save();
  const body = el('div', 'extra-journeys');
  const unlocked = extrasUnlocked(game.state);
  body.appendChild(el('div', 'extra-passport', '<span>HOSHIMAWARI EXPRESS</span><b>星めぐりの旅券</b><i>旅のつづきは、好きな駅へ。</i>'));
  let panel;
  if (!unlocked) {
    body.appendChild(el('div', 'extra-locked', '<b>🔒 まだ、ひらかない旅券</b><p>本編の10ステージをクリアすると、<br>追加の旅を自由に選べるようになります。</p>'));
  } else {
    body.appendChild(el('p', 'extra-intro', '行きたい駅を選んで、もうひとつの旅へ。<br>進行は、追加の旅ごとに保存されます。'));
    body.appendChild(createExtraJourneyList(game, () => panel.close()));
    const main = game.state.journeys?.main;
    if (main && main.stage !== game.state.stage) {
      const back = el('button', 'btn extra-main-return', `本編「${stageInfo(main.stage)?.name || '旅の途中'}」へもどる`);
      back.onclick = () => { game.audio.play('click'); panel.close(); game.goToStage(main.stage, { resume: true }); };
      body.appendChild(back);
    }
  }
  panel = game.ui.openPanel({ title: '追加の旅', body, cls: 'wide extra-panel' });
  return panel;
}
