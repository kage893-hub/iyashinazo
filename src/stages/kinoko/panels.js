import { el } from '../../core/ui.js';
import { MAP } from './diorama.js';

// 巨大キノコの森の謎解きパネル（HTML）

// ---------------------------------------------------------------
// 虫の単位：アリの巣の立て札（ちいさくなると読める）
// ---------------------------------------------------------------
export const UNITS_HTML = `<div class="units">
  <div class="un-t">むしの ものさし</div>
  <div class="un-r">🐌 カタツムリ 1ぴき ＝ 🐜 アリ 3びき</div>
  <div class="un-r">🐞 テントウムシ 1ぴき ＝ 🐜 アリ 2ひき</div>
</div>`;

/** 宝の地図に書いてあること */
export const MAP_TEXT = '切り株から、<b>北へ 🐌カタツムリ 2ひき</b>、<b>東へ 🐞テントウムシ 4ひき</b>。そこに、水くみの遺物「ゆびぬき」をうめた。';

export function mapHTML() {
  return `<div class="tmap">
    <div class="tm-paper">
      <div class="tm-t">ゆびぬきの ありか</div>
      <p>${MAP_TEXT}</p>
      <div class="tm-sign">― 長老のひいひいじいさま</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------
// 宝さがし：アリ1ぴき＝1マスの広場で、掘る場所をえらぶ
// ---------------------------------------------------------------
export function digPanel(ui, audio, { dug = [], onDig, onSolved }) {
  let sel = null;
  let done = false;
  const body = el('div', 'digp');
  body.innerHTML = `
    <div class="plaque">ふかふかの土の広場<br><small>${MAP_TEXT}</small></div>
    <div class="dg-n">北 ▲　／　東 ▶</div>
    <p class="panel-note small">盤面は縦横にスクロールできます。</p>
    <div class="dg-wrap" tabindex="0" aria-label="宝さがしの盤面・縦横にスクロール"><div class="dg-grid"></div></div>
    <div class="dg-legend">1マス ＝ 🐜アリ 1ぴき</div>
    <div class="ml-foot"><button class="btn primary dg-go">ここを掘る</button></div>
    <p class="panel-note small dg-msg">掘る場所をえらんでね。</p>`;
  const grid = body.querySelector('.dg-grid');
  grid.style.gridTemplateColumns = `repeat(${MAP.cols}, 44px)`;
  const msg = body.querySelector('.dg-msg');
  const marks = { [`${MAP.stump[0]},${MAP.stump[1]}`]: '🪵' };
  const cells = [];
  for (let r = 0; r < MAP.rows; r++) {
    for (let c = 0; c < MAP.cols; c++) {
      const b = el('button', 'dg-c', marks[`${c},${r}`] || '');
      b.setAttribute('aria-label', `西から${c + 1}、北から${r + 1}マス目${marks[`${c},${r}`] ? '・切り株' : ''}`);
      if (marks[`${c},${r}`]) b.classList.add('mark');
      if (dug.includes(`${c},${r}`)) b.classList.add('dug');
      b.onclick = () => {
        if (done || marks[`${c},${r}`]) return;
        sel = [c, r];
        audio.play('click');
        cells.forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
      };
      grid.appendChild(b);
      cells.push(b);
    }
  }
  body.querySelector('.dg-go').onclick = () => {
    if (done) return;
    if (!sel) { msg.textContent = 'まず、掘る場所をえらぼう。'; audio.play('wrong'); return; }
    const [c, r] = sel;
    const cell = cells[r * MAP.cols + c];
    if (c === MAP.answer[0] && r === MAP.answer[1]) {
      done = true;
      body.classList.add('solved');
      cell.classList.add('hit');
      audio.play('solve');
      msg.textContent = 'ザクッ……かたい物に当たった！';
      setTimeout(() => onSolved(panel), 1100);
      return;
    }
    audio.play('wrong');
    cell.classList.add('dug');
    onDig && onDig(`${c},${r}`);
    const near = Math.abs(c - MAP.answer[0]) + Math.abs(r - MAP.answer[1]) <= 2;
    const list = ['ねぼけたミミズが顔を出した。「ここじゃないよ〜」', 'からっぽ。土のにおいがするだけ。', 'どんぐりのからが出てきた。……ちがうみたい。'];
    msg.textContent = near ? 'カエル「なんだか、近い気がするケロ……！」' : list[(c + r) % list.length];
  };
  const panel = ui.openPanel({ title: '宝さがし', body });
  requestAnimationFrame(() => { body.querySelector('.dg-wrap').scrollTop = Math.max(0, MAP.stump[1] * 46 - 220); });
  return panel;
}

// ---------------------------------------------------------------
// 影絵：二つの影を組み合わせ、向きと灯りの距離を考える。
// 影の大きさ ＝ 物の大きさ ×（ホタル〜巣）÷（ホタル〜物）
// ---------------------------------------------------------------
const HORN = 'M-0.16 0.9 L0.16 0.9 Q0.14 0.1 0.1 -0.15 Q0.33 -0.4 0.53 -0.84 L0.4 -0.9 Q0.18 -0.55 0 -0.38 Q-0.18 -0.55 -0.4 -0.9 L-0.53 -0.84 Q-0.33 -0.4 -0.1 -0.15 Q-0.14 0.1 -0.16 0.9 Z';
const OBJS = {
  cap: { name: 'どんぐりのぼうし', path: 'M-0.8 0.3 Q-0.8 -0.6 0 -0.62 Q0.8 -0.6 0.8 0.3 Z M-0.05 -0.6 L0.05 -0.6 L0.05 -0.9 L-0.05 -0.9 Z', turn: 0 },
  bent: { name: '曲がった小枝', path: 'M-0.16 0.9 L0 0.9 L0 -0.38 Q-0.18 -0.55 -0.4 -0.9 L-0.53 -0.84 Q-0.33 -0.4 -0.1 -0.15 Q-0.14 0.1 -0.16 0.9 Z', turn: 1 },
  ytwig: { name: 'ふたまたの小枝', path: 'M-0.1 0.9 L0.1 0.9 L0.1 -0.15 L0.8 -0.7 L0.7 -0.85 L0 -0.45 L-0.7 -0.85 L-0.8 -0.7 L-0.1 -0.15 Z', turn: 0 },
  stick: { name: 'まっすぐな小枝', path: 'M-0.1 0.9 L0.1 0.9 L0.08 -0.9 L-0.08 -0.9 Z', turn: 0 },
  hook: { name: 'かぎ形の小枝', path: 'M0 0.9 L0.16 0.9 Q0.14 0.1 0.1 -0.15 Q0.33 -0.4 0.53 -0.84 L0.4 -0.9 Q0.18 -0.55 0 -0.38 Z', turn: 3 },
};
export const SHADOW_GOAL = 1.25;
const GAP = 2;
export const shadowScale = L => 0.5 * (L + GAP) / L;
export function shadowReady(pieces) {
  if (pieces.length !== 2 || !pieces.some(p => p.obj === 'bent') || !pieces.some(p => p.obj === 'hook')) return false;
  // 型は左右対称。二つをまとめて左右反転した形も正解にする。
  const facing = pieces.map(p => p.turn % 4 === 0 && !p.flip ? 1 : p.turn % 4 === 2 && p.flip ? -1 : 0);
  return facing[0] !== 0 && facing[0] === facing[1];
}

export function shadowPanel(ui, audio, { onChange, onSolved }) {
  let pieces = [{ obj: 'cap', turn: 0, flip: false }, { obj: 'stick', turn: 0, flip: false }];
  let active = 0, L = 3.0, done = false;
  const body = el('div', 'shadowp');
  body.innerHTML = `
    <div class="plaque">ホタルの影絵<br><small>二つの影を重ね、型と同じ<b>つの</b>に。<br>向きと灯りの距離を調整しよう。</small></div>
    <div class="sh-layout"><div class="sh-preview">
    <svg class="sh-screen" viewBox="-150 -115 300 230" role="img" aria-label="二つの影と、つのの型">
      <defs><clipPath id="shc"><circle cx="0" cy="0" r="112"/></clipPath></defs>
      <circle cx="0" cy="0" r="112" fill="#f6f0e0" stroke="#c8b890" stroke-width="3"/>
      <g class="sh-web" stroke="#d8ccb0" stroke-width="1" fill="none"></g>
      <g clip-path="url(#shc)"><g class="sh-shadow" fill="#2a2234" opacity="0.82"><path/><path/></g></g>
      <path class="sh-stencil" d="${HORN}" fill="none" stroke="#e8603a" stroke-width="0.035" stroke-dasharray="0.08 0.06" transform="scale(${SHADOW_GOAL * 50})"/>
    </svg>
    </div><div class="sh-controls">
    <div class="sh-row sh-slots"><button class="btn small-btn" data-slot="0"></button><button class="btn small-btn" data-slot="1"></button></div>
    <div class="sh-row sh-objs"></div>
    <div class="sh-row"><button class="btn small-btn sh-turn" aria-label="選んだ影を90度回す">↻ 90°回す</button><button class="btn small-btn sh-flip" aria-label="選んだ影を上下反転">↕ 上下反転</button></div>
    <div class="sh-rail"><span>🕸 巣</span><i class="sh-obj">▲</i><i class="sh-fly">✨</i></div>
    <label class="sh-sl">ホタルの位置　<small>巣に近い</small><input type="range" min="0.5" max="4" step="0.05" value="3" aria-label="ホタルと小枝の距離"><small>巣から遠い</small></label>
    <div class="ml-foot"><button class="btn primary sh-go">これでうつす</button></div>
    <p class="panel-note small sh-msg">影①・影②を選んで、物と向きを変えよう。同じ物は一つだけ。</p></div></div>`;
  const web = body.querySelector('.sh-web');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; web.insertAdjacentHTML('beforeend', `<line x1="0" y1="0" x2="${Math.cos(a) * 112}" y2="${Math.sin(a) * 112}"/>`); }
  for (let k = 1; k < 6; k++) web.insertAdjacentHTML('beforeend', `<circle cx="0" cy="0" r="${k * 20}"/>`);
  const shadows = body.querySelectorAll('.sh-shadow path');
  const msg = body.querySelector('.sh-msg');
  const slots = [...body.querySelectorAll('[data-slot]')];
  const btns = Object.entries(OBJS).map(([id, o]) => {
    const b = el('button', 'btn small-btn sh-choice', `<svg viewBox="-1 -1 2 2" aria-hidden="true"><path d="${o.path}" transform="rotate(${o.turn * 90})"/></svg><span>${o.name}</span>`);
    b.dataset.obj = id;
    b.onclick = () => {
      if (done || pieces[active].obj === id || pieces[1 - active].obj === id) return;
      pieces[active] = { obj: id, turn: o.turn, flip: false };
      audio.play('click'); paint();
    };
    body.querySelector('.sh-objs').appendChild(b);
    return [id, b];
  });
  slots.forEach((b, i) => b.onclick = () => { if (!done) { active = i; audio.play('click'); paint(); } });
  const slider = body.querySelector('input');
  slider.oninput = () => { if (!done) { L = +slider.value; paint(); } };
  body.querySelector('.sh-turn').onclick = () => { if (!done) { pieces[active].turn = (pieces[active].turn + 1) % 4; audio.play('click'); paint(); } };
  body.querySelector('.sh-flip').onclick = () => { if (!done) { pieces[active].flip = !pieces[active].flip; audio.play('click'); paint(); } };
  const paint = () => {
    const s = shadowScale(L);
    pieces.forEach((p, i) => {
      shadows[i].setAttribute('d', OBJS[p.obj].path);
      shadows[i].setAttribute('transform', `scale(${s * 50}) rotate(${p.turn * 90}) scale(1 ${p.flip ? -1 : 1})`);
      slots[i].textContent = `影${i + 1}：${OBJS[p.obj].name}`;
      slots[i].classList.toggle('on', active === i);
      slots[i].setAttribute('aria-pressed', String(active === i));
    });
    btns.forEach(([id, b]) => { b.classList.toggle('on', id === pieces[active].obj); b.disabled = done || id === pieces[1 - active].obj; });
    const W = 100 / (GAP + 4);
    body.querySelector('.sh-obj').style.left = `${GAP * W + 12}%`;
    body.querySelector('.sh-fly').style.left = `${Math.min(96, (GAP + L) * W + 12)}%`;
    onChange && onChange({ pieces: pieces.map(p => ({ ...p })), s, ready: shadowReady(pieces) });
  };
  body.querySelector('.sh-go').onclick = () => {
    if (done) return;
    const s = shadowScale(L);
    if (shadowReady(pieces) && Math.abs(s - SHADOW_GOAL) <= 0.07) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = '二つの影が、ひとつの大きなつのになった！';
      body.querySelectorAll('button, input').forEach(b => b.disabled = true);
      setTimeout(() => onSolved(panel), 1200);
      return;
    }
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    msg.textContent = !shadowReady(pieces)
      ? 'クモ「左右のつのと、下へ伸びる一本の軸。二つの影で作れるかしら？」'
      : 'クモ「形はよさそうね。今度は型と影の大きさを見比べて」';
  };
  const panel = ui.openPanel({ title: '影絵', body, cls: 'wide shadow-panel' });
  paint();
  return panel;
}
