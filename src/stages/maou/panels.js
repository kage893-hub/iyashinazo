import { el } from '../../core/ui.js';
import { glyphSVG } from '../hero/panels.js';

// 魔王城の謎解きパネル（HTML）

/** 駅前の石碑：魔界文字の対応表 */
export const STELE_TABLE = ['あ', 'い', 'う', 'え', 'お', 'さ', 'し', 'た', 'と', 'ま'];
export function steleHTML() {
  return `<div class="gtable stele">${STELE_TABLE.map((c) => `<div class="gt-cell">${glyphSVG(c, 28, '#2a1a40')}<b>${c}</b></div>`).join('')}</div>`;
}

// ---------------------------------------------------------------
// 合言葉：門の上の魔界文字を、ひらがなにして答える
// ---------------------------------------------------------------
export const PASSWORD = ['お', 'と', 'う', 'と'];

export function passwordPanel(ui, audio, { onSolved }) {
  const slots = PASSWORD.map(() => null);
  let cur = 0;
  let done = false;
  const body = el('div', 'decodep');
  body.innerHTML = `
    <div class="plaque">骸骨の門番「あ、あ、合言葉を……どうぞ……」<br><small>門の上に光る魔界文字を、ひらがなにして答えよう。</small></div>
    <div class="dc-slots"></div>
    <div class="dc-kana"></div>
    <div class="ml-foot"><button class="btn primary dc-check">合言葉を言う</button></div>
    <p class="panel-note small dc-msg">対応表は、駅前の石碑（旅のメモ）。</p>`;
  const slotsEl = body.querySelector('.dc-slots');
  const msg = body.querySelector('.dc-msg');
  const btns = PASSWORD.map((ch, i) => {
    const b = el('button', 'dc-slot');
    b.onclick = () => { if (done) return; cur = i; audio.play('click'); paint(); };
    slotsEl.appendChild(b);
    return b;
  });
  const kb = body.querySelector('.dc-kana');
  for (const k of ['あ', 'い', 'う', 'え', 'お', 'さ', 'し', 'た', 'と', 'ま']) {
    const b = el('button', 'btn dc-k', k);
    b.onclick = () => { if (done) return; slots[cur] = k; cur = Math.min(PASSWORD.length - 1, cur + 1); audio.play('dial'); paint(); };
    kb.appendChild(b);
  }
  const paint = () => btns.forEach((b, i) => {
    b.innerHTML = `${glyphSVG(PASSWORD[i], 24)}<b>${slots[i] || '？'}</b>`;
    b.classList.toggle('cur', i === cur && !done);
  });
  body.querySelector('.dc-check').onclick = () => {
    if (done) return;
    if (slots.some((s) => !s)) { msg.textContent = 'まだ読めていない文字がある。'; audio.play('wrong'); return; }
    if (slots.every((s, i) => s === PASSWORD[i])) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = '「おとうと」……！';
      paint();
      setTimeout(() => onSolved(panel), 1100);
      return;
    }
    audio.play('wrong');
    msg.textContent = '門番「ひいっ、ち、ちがいますぅ……」';
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
  };
  const panel = ui.openPanel({ title: '合言葉', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// ほのおのシチュー：黒板のとおりに、材料を入れる順番と、まぜる回数
// 黒板「トマト → キノコ → 塩　そして 三回まぜる」
// ---------------------------------------------------------------
export const STEW = ['tomato', 'mushroom', 'salt', 'stir', 'stir', 'stir'];
const ING = { tomato: '🍅 溶岩トマト', mushroom: '🍄 かげキノコ', salt: '✨ 星くず塩', stir: '🥄 まぜる' };

export function stewPanel(ui, audio, { onSolved, onStep }) {
  let seq = [];
  let done = false;
  const body = el('div', 'stewp');
  body.innerHTML = `
    <div class="plaque">ほのおのシチュー<br><small>黒板のレシピのとおりに、材料を入れて、まぜよう。</small></div>
    <div class="tk-seq st-seq"></div>
    <div class="tk-btns">
      <button class="btn st-b" data-k="tomato">${ING.tomato}</button>
      <button class="btn st-b" data-k="mushroom">${ING.mushroom}</button>
      <button class="btn st-b" data-k="salt">${ING.salt}</button>
    </div>
    <div class="tk-btns"><button class="btn primary st-b" data-k="stir">${ING.stir}</button></div>
    <button class="btn small-btn st-reset">はじめから</button>
    <p class="panel-note small st-msg">レシピは、台所の黒板（ランタンで照らすと読める）。</p>`;
  const seqEl = body.querySelector('.st-seq');
  const msg = body.querySelector('.st-msg');
  const paint = () => {
    seqEl.innerHTML = seq.length ? seq.map((k) => `<span class="st-i">${ING[k].split(' ')[0]}</span>`).join('') : '<span class="tk-empty">まだなにも入れていない</span>';
  };
  body.querySelectorAll('.st-b').forEach((b) => {
    b.onclick = () => {
      if (done) return;
      const k = b.dataset.k;
      seq.push(k);
      audio.play(k === 'stir' ? 'water' : 'pop');
      onStep && onStep(k);
      paint();
      const i = seq.length - 1;
      if (seq[i] !== STEW[i]) {
        audio.play('wrong');
        msg.textContent = '魔女ネコ「あらら、けむりが黒くなっちゃった……はじめからね」';
        body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
        setTimeout(() => { seq = []; paint(); }, 900);
        return;
      }
      if (seq.length === STEW.length) {
        done = true;
        body.classList.add('solved');
        audio.play('solve');
        msg.textContent = 'ぐつぐつ……あまくて、ぴりっと辛い、いいにおい！';
        setTimeout(() => onSolved(panel), 1200);
      }
    };
  });
  body.querySelector('.st-reset').onclick = () => { if (done) return; seq = []; audio.play('click'); paint(); };
  const panel = ui.openPanel({ title: '大鍋', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// ミミックのなぞなぞ：城をよく見ていればわかる3問
// ---------------------------------------------------------------
export const QUIZ = [
  { q: '中庭の紫の燭台。炎が消えているのは、いくつ？', opts: ['ひとつもない', 'ひとつ', 'ふたつ', 'みっつ'], a: 1 },
  { q: '肖像画の回廊。絵は、ぜんぶでいくつ？', opts: ['3まい', '4まい', '5まい', '6まい'], a: 2 },
  { q: '門の合言葉は？', opts: ['まおうさま', 'おとうと', 'あいたい', 'さびしい'], a: 1 },
];

export function quizPanel(ui, audio, { onSolved }) {
  let step = 0;
  let done = false;
  const body = el('div', 'quizp');
  body.innerHTML = `
    <div class="plaque">ミミック「なぞなぞに3つ正解したら、奥の宝をわけてやるぞ。ガブッ」</div>
    <div class="qz-step"></div>
    <div class="qz-q"></div>
    <div class="qz-opts"></div>
    <p class="panel-note small qz-msg">まちがえても、何度でもちょうせんできる。</p>`;
  const msg = body.querySelector('.qz-msg');
  const paint = () => {
    const Q = QUIZ[step];
    body.querySelector('.qz-step').textContent = `だい ${step + 1} もん（${step} / 3 せいかい）`;
    body.querySelector('.qz-q').textContent = Q.q;
    const box = body.querySelector('.qz-opts');
    box.innerHTML = '';
    Q.opts.forEach((o, i) => {
      const b = el('button', 'btn qz-o', o);
      b.onclick = () => {
        if (done) return;
        if (i === Q.a) {
          audio.play('quest');
          step++;
          if (step >= QUIZ.length) {
            done = true;
            body.classList.add('solved');
            msg.textContent = 'ミミック「ぜ、ぜんもん正解……！ やるな、おまえ」';
            setTimeout(() => onSolved(panel), 1100);
            return;
          }
          msg.textContent = 'ミミック「むむ、正解だ」';
          paint();
        } else {
          audio.play('wrong');
          msg.textContent = 'ミミック「ガブッ！ ちがうぞ。城をよーく見てこい」';
          body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
        }
      };
      box.appendChild(b);
    });
  };
  const panel = ui.openPanel({ title: 'ミミックのなぞなぞ', body });
  paint();
  return panel;
}

/** 兄弟の絵本（読みもの） */
export function picturebookHTML() {
  return `<div class="pbook">
    <div class="pb-title">ふたりの ちいさな ドラゴン</div>
    <div class="pb-page">むらさきの おにいちゃんと、あかい おとうと。<br>ふたりは いつも いっしょに、おしろの にわで あそびました。</div>
    <div class="pb-page">おにいちゃんは つよくて、おおきくて、<br>みんなを まもる まおうに なりました。</div>
    <div class="pb-page">でも、おおきくなりすぎて、だれも あそびに こなくなりました。<br>……さいごの ページには、ちいさな字で「また いっしょに ごはんを たべたいな」</div>
  </div>`;
}
