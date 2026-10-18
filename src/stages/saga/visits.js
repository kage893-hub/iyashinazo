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
  body.innerHTML = `<div class="sa-visit-kicker">山カフェレストランKUREHA</div><h3 class="sa-dish-name">緑を眺めて、<br>ひと皿をゆっくり</h3><div class="sa-menu-art">${salad}</div><p class="sa-dish-caption">みずみずしい葉。ふわりと消える、小さな泡。</p><p>木々の間から届く光と、<br>彩り野菜を盛りつけた一皿。</p>${tasted ? '<p class="sa-visit-done">✓ 旅のメモに、この一皿の味が残っている。</p>' : ''}`;
  return visitPanel(ui, '山カフェレストランKUREHA', body, [[tasted ? 'もう一度、味わう' : 'サラダを味わう', onTaste, true], ['キツネに料理の話を聞く', onTalk], ['テラスを眺める', onView]]);
}

export function cityVisitPanel(ui, id, { recorded, onExperience, onView }) {
  const data = {
    roundone: ['ラウンドワンスタジアム 佐賀店', '🎳', '空に伸びる、大きなピン。', '黒と橙の外壁を見上げると、屋上の防球網が空に細い線を描いている。', 'ミニボウリングで遊ぶ'],
    ide: ['井手ちゃんぽん 大和店', '🍜', '赤い入口と、野菜の山。', '横長の看板の先には、ちゃんぽんの大きな丼。まち歩きの途中に、おなかもひと休み。', 'ちゃんぽんを味わう'],
    tadakane: ['忠兼総本社', '🫙', '黄色いひさしの、ものづくりの街角。', '木枠の戸と小さな窓。窓辺に並ぶ容器を眺めると、この街のもうひとつの表情が見えてくる。', '窓辺の容器を眺める'],
  }[id];
  const body = el('div', 'sa-visit-card');
  body.innerHTML = `<div class="sa-visit-kicker">まちの寄り道</div><div class="sa-spa-mark" aria-hidden="true">${data[1]}</div><h3>${data[2]}</h3><p>${data[3]}</p>${recorded ? '<p class="sa-visit-done">✓ 旅のメモに、この寄り道が残っている。</p>' : ''}`;
  return visitPanel(ui, data[0], body, [[data[4], onExperience, true], ['外観を眺める', onView]]);
}

export function bowlingPanel(ui, { best = 0, onResult }) {
  const body=el('div','sa-bowling');
  const pins=Array.from({length:10},(_,i)=>{const row=Math.floor((Math.sqrt(8*i+1)-1)/2),col=i-row*(row+1)/2;return `<g class="sa-pin" data-pin="${i}" transform="translate(${160+(col-row/2)*21} ${89-row*17})"><path d="M-3 0q-4-6-2-9q1-2 2-4v-5q-3-5 0-8q3-2 6 0q3 3 0 8v5q1 2 2 4q2 3-2 9z" fill="#f9f7df" stroke="#52695e"/><path d="M-3-17h6m-6 3h6" stroke="#b95749" stroke-width="2"/></g>`;}).join('');
  body.innerHTML=`<p class="panel-note">狙う位置を選んで、ゆっくり一投。<br>旅の途中の、小さなボウリング。</p><svg viewBox="0 0 320 280" role="img" aria-label="十本のピンとボウリングのレーン"><path d="M98 13h124l58 254H40z" fill="#c8ab78" stroke="#8c825f" stroke-width="3"/>${Array.from({length:7},(_,i)=>`<path d="M${106+i*18} 15L${58+i*34} 266" stroke="#a89569" fill="none"/>`).join('')}${pins}<path id="sa-bowl-aim" d="M160 245L160 110" stroke="#607c78" stroke-width="2" stroke-dasharray="5 5"/><circle class="sa-bowl-ball" cx="160" cy="246" r="10" fill="#497d85"/><circle cx="157" cy="241" r="2" fill="#264d52"/><circle cx="162" cy="240" r="2" fill="#264d52"/></svg><label class="sa-bowl-label">狙う位置 <output>まんなか</output><input aria-label="狙う位置" type="range" min="-2" max="2" step="1" value="0"></label><p class="sa-message" role="status" aria-live="polite">最高記録 ${best}本。何度でも、どうぞ。</p>`;
  const aim=body.querySelector('input'),out=body.querySelector('output'),message=body.querySelector('.sa-message'),ball=body.querySelector('.sa-bowl-ball');
  const actions=el('div','sa-actions'),roll=el('button','btn primary','ボールを転がす');actions.appendChild(roll);body.appendChild(actions);
  const labels=['左の端','少し左','まんなか','少し右','右の端'];
  aim.oninput=()=>{out.textContent=labels[Number(aim.value)+2];body.querySelector('#sa-bowl-aim').setAttribute('d',`M160 245L${160+Number(aim.value)*20} 85`);};
  let localBest=best,run=0,closed=false,flight;
  const panel=ui.openPanel({title:'🎳 旅のミニボウリング',body,cls:'saga-panel sa-visit-panel',onClose:()=>{closed=true;run++;flight?.cancel();}});
  roll.onclick=async()=>{
    if(roll.disabled)return;
    const token=++run,angle=Number(aim.value),score=[4,8,10,8,4][angle+2];roll.disabled=true;aim.disabled=true;
    for(const p of body.querySelectorAll('.sa-pin'))p.style.opacity='1';
    ball.style.transition='none';ball.style.transform='translate(0, 0)';
    // CSSだけに完了を依存せず、動きを減らす設定でも操作を戻す。
    flight?.cancel();
    const anim=flight=ball.animate([{transform:'translate(0,0)'},{transform:`translate(${angle*20}px,-157px)`}],{duration:650,easing:'ease-in',fill:'forwards'});
    await anim.finished.catch(()=>{});if(closed||token!==run)return;
    for(const [i,p]of [...body.querySelectorAll('.sa-pin')].entries())if(i<score)p.style.opacity='.15';
    localBest=Math.max(localBest,score);message.textContent=`${score===10?'ストライク！':`${score}本たおれた。`} 最高記録 ${localBest}本。`;
    onResult(score,localBest);roll.disabled=false;aim.disabled=false;roll.textContent='もう一度、転がす';
  };
  return panel;
}
