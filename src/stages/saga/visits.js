import { el } from '../../core/ui.js';

const salad = `<svg viewBox="0 0 420 245" role="img" aria-label="白い皿に彩り野菜と、淡い緑色の細かい泡を添えたサラダ"><defs><radialGradient id="sa-plate"><stop offset="0" stop-color="#fffef8"/><stop offset=".8" stop-color="#eee7d4"/><stop offset="1" stop-color="#fffdf6"/></radialGradient></defs><ellipse cx="210" cy="182" rx="147" ry="29" fill="#55624a" opacity=".12"/><ellipse cx="210" cy="144" rx="155" ry="77" fill="url(#sa-plate)" stroke="#d3ccba" stroke-width="2"/><ellipse cx="210" cy="142" rx="123" ry="56" fill="none" stroke="#e0d9c7"/><g stroke="#537949" stroke-width="1.3"><path d="M130 150q-37-64 15-71 42 9 27 64" fill="#789b57"/><path d="M161 157q-34-66 13-65 46 18 30 63" fill="#a6b570"/><path d="M203 151q-15-82 24-61 39 30 12 66" fill="#63874b"/><path d="M237 151q27-74 61-40 24 36-33 62" fill="#9baf63"/><path d="M169 151q-60 19-42 33 37 24 79-11" fill="#b6bb80"/></g><g fill="#b8573d"><ellipse cx="170" cy="127" rx="13" ry="10"/><ellipse cx="259" cy="141" rx="14" ry="10"/></g><g fill="#dfa963"><path d="m203 99 21 17-26 7z"/><path d="m280 154 11 17-27-2z"/></g><g fill="#e0e5bc" stroke="#b8c898" stroke-width=".7"><ellipse cx="213" cy="161" rx="49" ry="20"/>${Array.from({ length: 29 }, (_, i) => { const a = i * 2.4, r = Math.sqrt(i / 29); return `<circle cx="${213 + Math.cos(a) * r * 43}" cy="${157 + Math.sin(a) * r * 17}" r="${2.5 + i % 4}" fill="${i % 3 ? '#e9edce' : '#f8f8e7'}"/>`; }).join('')}</g><path d="m218 125 13 26m-11-21 11 2m-8 9 11-2" stroke="#577b50" stroke-width="2" stroke-linecap="round"/></svg>`;

function visitPanel(ui, title, body, buttons) {
  const actions = el('div', 'sa-visit-actions');
  let panel;
  for (const [label, callback, primary] of buttons) {
    const button = el('button', `btn${primary ? ' primary' : ''}`, label);
    button.onclick = () => { panel.close(); callback(); };
    actions.appendChild(button);
  }
  body.appendChild(actions);
  panel = ui.openPanel({ title, body, cls: 'saga-panel sa-visit-panel' });
  return panel;
}

export function amandiVisitPanel(ui, { rested, onRest, onTalk, onView }) {
  const body = el('div', 'sa-visit-card sa-spa-card');
  body.innerHTML = `<div class="sa-visit-kicker">NORTHWEST · ひと休みの寄り道</div><div class="sa-spa-mark" aria-hidden="true">♨</div><p class="sa-visit-lead">佐賀大和温泉 アマンディ</p><p>まち歩きの合間に、ひと息。<br>カピバラが、きちんと畳んだタオルを用意している。</p><p class="sa-visit-quote">「急がない時間も、旅のうちです。」</p>${rested ? '<p class="sa-visit-done">✓ 旅のメモに、ひと休みの時間が残っている。</p>' : ''}`;
  return visitPanel(ui, 'アマンディ佐賀', body, [[rested ? 'もうひと休みする' : 'ここでひと休みする', onRest, true], ['カピバラに話しかける', onTalk], ['外観を眺める', onView]]);
}

export function bistroMenuPanel(ui, { tasted, onTaste, onTalk, onView }) {
  const body = el('div', 'sa-visit-card sa-bistro-card');
  body.innerHTML = `<div class="sa-visit-kicker">BISTRO · 翠の泡</div><h3 class="sa-dish-name">畑のサラダと、<br>苦い泡のドレッシング</h3><div class="sa-menu-art">${salad}</div><p class="sa-dish-caption">みずみずしい葉。ふわりと消える、小さな泡。</p><p>口に入れると香りがほどけて、<br>あとから、ほろ苦さが残る。</p><p class="sa-visit-quote">「苦さも、ちゃんとおいしくなるんです。」</p>${tasted ? '<p class="sa-visit-done">✓ 旅のメモに、この一皿の味が残っている。</p>' : ''}`;
  return visitPanel(ui, 'ビストロ 翠の泡', body, [[tasted ? 'もう一度、味わう' : '苦い泡のサラダを味わう', onTaste, true], ['キツネに料理の話を聞く', onTalk], ['テラスを眺める', onView]]);
}
