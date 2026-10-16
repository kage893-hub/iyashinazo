import { el } from '../core/ui.js';
import { ROUTE, routeIndex, nextStop, stageInfo, stageLabel, isExtraStage } from '../data/route.js';
import { extrasUnlocked } from '../core/save-state.js';
import { isPlayable } from './registry.js';

/**
 * ステージクリア画面（どのステージも共通）
 * line: 列車が走りさるひとこと（例：'虹のふもとをくぐりぬけて、ほしまわり号は走っていく。'）
 */
export function showStageClear(g, id, line) {
  const i = routeIndex(id);
  const cur = stageInfo(id);
  const extra = isExtraStage(id);
  const next = nextStop(id);
  const ready = next && isPlayable(next.id);
  const sec = Math.floor(g.state.elapsed);
  const time = `${Math.floor(sec / 60)}分${String(sec % 60).padStart(2, '0')}秒`;
  // 路線：通った駅は番号つきの緑、次の駅は金色、その先はまだ秘密
  const dots = ROUTE.map((s, k) => `<span class="rt-dot ${k <= i ? 'done' : k === i + 1 ? 'next' : ''}">${k <= i + 1 ? s.no : ''}</span>`).join('<span class="rt-line"></span>');
  const body = el('div', 'clear');
  body.innerHTML = `
    <div class="clear-sub">${stageLabel(id)} CLEAR</div>
    <div class="clear-main" style="--title-chars:${[...cur.name].length}">${cur.name}</div>
    <div class="clear-stats"><div><span>プレイ時間</span><b>${time}</b></div><div><span>ヒント</span><b>${g.state.hints}回</b></div></div>
    ${extra ? '<div class="extra-clear-stamp">✦ 旅券に、星がひとつ増えました ✦</div>' : `<div class="rt">${dots}</div>`}
    <p class="clear-msg">${line}<br>${extra ? 'また好きなときに、遊びにきてください。' : next ? `次の停車駅は<em>${next.name}</em>。${ready ? '' : '……つづきは準備中です。'}` : '本編10ステージ、すべての旅が終わりました。'}</p>
    ${id === 'japan' ? '<p class="extra-unlock-message">✦ 星めぐりの旅券がひらきました。<br>これからは「追加の旅」から、行きたい駅を選べます。</p>' : ''}
    ${ready && next.pass ? `<p class="clear-pass">次の駅のあいことば：<b class="pass-word">${next.pass}</b><br><small>タイトルの「あいことば」で、ほかの端末でも遊べます。</small></p>` : ''}
    <div class="clear-btns">${ready ? '<button class="btn primary" data-a="next">次の世界へ ▶</button>' : ''}${extra || extrasUnlocked(g.state) ? '<button class="btn primary" data-a="extras">✦ 追加の旅を選ぶ</button>' : ''}<button class="btn" data-a="title">タイトルへ</button></div>`;
  g.ui.openPanel({ title: '', body, closable: false, cls: 'clear-panel' });
  const nb = body.querySelector('[data-a="next"]');
  if (nb) nb.onclick = () => g.goToStage(next.id);
  const eb = body.querySelector('[data-a="extras"]');
  if (eb) eb.onclick = () => g.openExtraJourneys();
  body.querySelector('[data-a="title"]').onclick = () => g.goToStage(ready ? next.id : id, { autostart: false, resume: !ready });
  g.ui.fade(0, 1.2, '#fff8ec');
}
