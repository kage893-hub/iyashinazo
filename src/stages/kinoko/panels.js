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
    <div class="dg-wrap"><div class="dg-n">北 ▲</div><div class="dg-grid"></div><div class="dg-e">東 ▶</div></div>
    <div class="dg-legend">1マス ＝ 🐜アリ 1ぴき</div>
    <div class="ml-foot"><button class="btn primary dg-go">ここを掘る</button></div>
    <p class="panel-note small dg-msg">掘る場所をえらんでね。</p>`;
  const grid = body.querySelector('.dg-grid');
  grid.style.gridTemplateColumns = `repeat(${MAP.cols}, 1fr)`;
  const msg = body.querySelector('.dg-msg');
  const marks = { [`${MAP.stump[0]},${MAP.stump[1]}`]: '🪵' };
  const cells = [];
  for (let r = 0; r < MAP.rows; r++) {
    for (let c = 0; c < MAP.cols; c++) {
      const b = el('button', 'dg-c', marks[`${c},${r}`] || '');
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
  return panel;
}

// ---------------------------------------------------------------
// 影絵：ホタルの灯りで、クモの巣の型にぴったりの影をうつす
//  影の大きさ ＝ 物の大きさ ×（ホタル〜巣）÷（ホタル〜物）
// ---------------------------------------------------------------
const HORN = 'M-0.16 0.9 L0.16 0.9 Q0.14 0.1 0.1 -0.15 Q0.35 -0.4 0.55 -0.85 L0.42 -0.9 Q0.22 -0.55 0.02 -0.38 Q-0.18 -0.55 -0.4 -0.9 L-0.53 -0.84 Q-0.33 -0.4 -0.1 -0.15 Q-0.14 0.1 -0.16 0.9 Z';
const OBJS = {
  cap: { name: 'どんぐりのぼうし', path: 'M-0.8 0.3 Q-0.8 -0.6 0 -0.62 Q0.8 -0.6 0.8 0.3 Z M-0.05 -0.6 L0.05 -0.6 L0.05 -0.9 L-0.05 -0.9 Z', k: 0.5 },
  stick: { name: 'まっすぐな小枝', path: 'M-0.1 0.9 L0.1 0.9 L0.08 -0.9 L-0.08 -0.9 Z', k: 0.5 },
  ytwig: { name: 'ふたまたの小枝', path: HORN, k: 0.5 },
};
export const SHADOW_GOAL = 1.25; // 型の大きさ（つのの高さ 1.8 × 1.25）
const GAP = 2; // 物から巣までの距離

export function shadowPanel(ui, audio, { onChange, onSolved }) {
  let obj = 'cap', flip = false, L = 3.0, done = false;
  const body = el('div', 'shadowp');
  body.innerHTML = `
    <div class="plaque">ホタルの影絵<br><small>クモの巣に編まれた<b>型</b>に、ぴったり重なる影をうつそう。</small></div>
    <svg class="sh-screen" viewBox="-150 -115 300 230">
      <defs><clipPath id="shc"><circle cx="0" cy="0" r="112"/></clipPath></defs>
      <circle cx="0" cy="0" r="112" fill="#f6f0e0" stroke="#c8b890" stroke-width="3"/>
      <g class="sh-web" stroke="#d8ccb0" stroke-width="1" fill="none"></g>
      <g clip-path="url(#shc)"><path class="sh-shadow" fill="#2a2234" opacity="0.82"/></g>
      <path class="sh-stencil" d="${HORN}" fill="none" stroke="#e8603a" stroke-width="0.035" stroke-dasharray="0.08 0.06" transform="scale(${SHADOW_GOAL * 50})"/>
    </svg>
    <div class="sh-row sh-objs"></div>
    <div class="sh-row"><button class="btn small-btn sh-flip">↕ 上下を入れかえる</button></div>
    <div class="sh-rail"><span>🕸 巣</span><i class="sh-obj">▲</i><i class="sh-fly">✨</i></div>
    <label class="sh-sl">ホタルの位置　<small>巣に近い</small><input type="range" min="0.5" max="4" step="0.05" value="3"><small>巣から遠い</small></label>
    <div class="ml-foot"><button class="btn primary sh-go">これでうつす</button></div>
    <p class="panel-note small sh-msg">ホタルを動かすと、影の大きさが変わる。</p>`;
  const web = body.querySelector('.sh-web');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; web.insertAdjacentHTML('beforeend', `<line x1="0" y1="0" x2="${Math.cos(a) * 112}" y2="${Math.sin(a) * 112}"/>`); }
  for (let k = 1; k < 6; k++) web.insertAdjacentHTML('beforeend', `<circle cx="0" cy="0" r="${k * 20}"/>`);
  const shadow = body.querySelector('.sh-shadow');
  const msg = body.querySelector('.sh-msg');
  const objsEl = body.querySelector('.sh-objs');
  const btns = Object.entries(OBJS).map(([id, o]) => {
    const b = el('button', 'btn small-btn', o.name);
    b.onclick = () => { if (done) return; obj = id; audio.play('click'); paint(); };
    objsEl.appendChild(b);
    return [id, b];
  });
  const slider = body.querySelector('input');
  slider.oninput = () => { if (done) return; L = +slider.value; paint(); };
  body.querySelector('.sh-flip').onclick = () => { if (done) return; flip = !flip; audio.play('click'); paint(); };
  const scale = () => OBJS[obj].k * (L + GAP) / L;
  const paint = () => {
    const s = scale();
    shadow.setAttribute('d', OBJS[obj].path);
    shadow.setAttribute('transform', `scale(${s * 50}, ${s * 50 * (flip ? -1 : 1)})`);
    btns.forEach(([id, b]) => b.classList.toggle('on', id === obj));
    // 横から見た図：巣 ― 物 ― ホタル
    const W = 100 / (GAP + 4);
    body.querySelector('.sh-obj').style.left = `${GAP * W + 12}%`;
    body.querySelector('.sh-fly').style.left = `${Math.min(96, (GAP + L) * W + 12)}%`;
    onChange && onChange({ obj, flip, s });
  };
  body.querySelector('.sh-go').onclick = () => {
    if (done) return;
    const s = scale();
    const ok = obj === 'ytwig' && !flip && Math.abs(s - SHADOW_GOAL) <= 0.07;
    if (ok) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = 'ぴったり！ 巣いっぱいに、大きなつのの影がうかびあがった！';
      setTimeout(() => onSolved(panel), 1200);
      return;
    }
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    if (obj !== 'ytwig') msg.textContent = 'クモ「形がちがうわね。型をよーく見て」';
    else if (flip) msg.textContent = 'クモ「あら、さかさまよ」';
    else if (s < SHADOW_GOAL) msg.textContent = 'クモ「影がちいさいわ。型にとどいていないもの」';
    else msg.textContent = 'クモ「影が大きすぎて、型からはみ出しちゃう」';
  };
  const panel = ui.openPanel({ title: '影絵', body });
  paint();
  return panel;
}
