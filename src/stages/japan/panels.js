import { el } from '../../core/ui.js';

// 現代日本（とうきょう）の謎解きパネル（HTML）

// ---------------------------------------------------------------
// ① 二百年後の名所あわせ：江戸の名所が、いまの何になったか
// ---------------------------------------------------------------
export const MEISHO = [
  { edo: '火の見やぐら', icon: '🔥', a: '東京タワー' },
  { edo: '番所', icon: '🏮', a: '交番' },
  { edo: '町木戸', icon: '🚪', a: '踏切' },
  { edo: '井戸', icon: '💧', a: '自動販売機' },
  { edo: '茶店', icon: '🍵', a: '喫茶店' },
  { edo: '瓦版屋', icon: '📰', a: '大型ビジョン' },
  { edo: '団子屋', icon: '🍡', a: 'ラーメン屋' },
];
export const MODERN = ['東京タワー', '交番', '踏切', '自動販売機', '喫茶店', '大型ビジョン', 'ラーメン屋', 'ファッションビル', 'コンビニ'];

export function meishoPanel(ui, audio, { onSolved }) {
  const pick = MEISHO.map(() => null);
  let done = false;
  const orders = [];
  const body = el('div', 'meishop');
  body.innerHTML = `
    <div class="plaque">大型ビジョン『江戸名所　二百年後』<br><small>江戸の名所があった場所に、いまは何が建っている？</small></div>
    <div class="ms-list"></div>
    <div class="ml-foot"><button class="btn primary ms-go">これで放送する</button></div>
    <p class="panel-note small ms-msg">名所を押すたびに、いまの建物が切りかわる。</p>`;
  const list = body.querySelector('.ms-list');
  const msg = body.querySelector('.ms-msg');
  const rows = MEISHO.map((m, i) => {
    const row = el('div', 'ms-row');
    row.innerHTML = `<span class="ms-edo">${m.icon} ${m.edo}</span><span class="ms-arrow">→</span>`;
    // 各行の候補は開いた時だけ並べ替え、押している間は順番を固定する。
    const options = [...MODERN];
    for (let k = options.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [options[k], options[j]] = [options[j], options[k]];
    }
    const sameOrder = order => order.every((value, k) => value === options[k]);
    while (sameOrder(MODERN) || orders.some(sameOrder)) options.push(options.shift());
    orders.push(options);
    const b = el('button', 'btn small-btn ms-pick', '？');
    b.onclick = () => {
      if (done) return;
      const k = pick[i] == null ? 0 : (options.indexOf(pick[i]) + 1) % (options.length + 1);
      pick[i] = k === options.length ? null : options[k];
      audio.play('click');
      paint();
    };
    row.appendChild(b);
    list.appendChild(row);
    return b;
  });
  const paint = () => rows.forEach((b, i) => { b.textContent = pick[i] || '？'; b.classList.toggle('on', !!pick[i]); });
  body.querySelector('.ms-go').onclick = () => {
    if (done) return;
    if (pick.some((p) => !p)) { msg.textContent = 'まだ決めていない名所がある。'; audio.play('wrong'); return; }
    const ok = pick.filter((p, i) => p === MEISHO[i].a).length;
    if (ok === MEISHO.length) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = 'ネコ「ぜんぶ正解！ 二百年前と、いまがつながりましたニャ！」';
      setTimeout(() => onSolved(panel), 1300);
      return;
    }
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    msg.textContent = `ネコ「うーん、${MEISHO.length}つのうち ${ok}つ正解ですニャ。むかしの町を、もう一度よく見てニャ」`;
  };
  const panel = ui.openPanel({ title: '江戸名所　二百年後', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// 江戸の時刻（手ぬぐい）
// ---------------------------------------------------------------
export const EDO_HOURS = [
  ['明け六つ', '朝6時'], ['五つ', '朝8時'], ['四つ', '朝10時'], ['九つ', '昼12時'], ['八つ', '昼2時'], ['七つ', '夕方4時'],
  ['暮れ六つ', '夕方6時'], ['五つ', '夜8時'], ['四つ', '夜10時'], ['九つ', '夜12時'], ['八つ', '夜中2時'], ['七つ', '明け方4時'],
];
export function tenuguiHTML() {
  return `<div class="tenugui">
    <div class="tn-t">江戸の時の数えかた</div>
    <div class="tn-grid">${EDO_HOURS.map(([e, m], i) => `<div class="tn-c ${i < 6 ? 'day' : 'night'}"><b>${e}</b><small>${m}</small></div>`).join('')}</div>
    <div class="tn-foot">二時（いまの二時間）ごとに、数がひとつずつ へっていく。</div>
  </div>`;
}

// ---------------------------------------------------------------
// ② 時の鐘：いまの時刻を、江戸の数えかたで撞く
//  捨て鐘3つ → 間 → 時の数（夜8時＝五つ）
// ---------------------------------------------------------------
export const BELL2 = ['g', 'g', 'g', 'p', 'g', 'g', 'g', 'g', 'g'];
export function bellPanel2(ui, audio, { onStrike, onSolved }) {
  let seq = [];
  let done = false, lock = false;
  const body = el('div', 'tokip');
  body.innerHTML = `
    <div class="plaque">時の鐘<br><small>「いまの時刻を、江戸の数えかたで撞け」</small></div>
    <div class="tk-seq"></div>
    <div class="tk-btns"><button class="btn primary tk-gong">🔔 撞く（ゴーン）</button><button class="btn tk-pause">… 間をおく</button></div>
    <div class="ml-foot"><button class="btn small-btn tk-reset">はじめから</button> <button class="btn tk-done">これで撞きおわる</button></div>
    <p class="panel-note small tk-msg">鐘の撞きかたは、ご先祖さまのころと同じ。</p>`;
  const seqEl = body.querySelector('.tk-seq');
  const msg = body.querySelector('.tk-msg');
  const paint = () => {
    seqEl.innerHTML = seq.length ? seq.map((s) => (s === 'g' ? '<span class="tk-g">●</span>' : '<span class="tk-p">／</span>')).join('') : '<span class="tk-empty">まだ撞いていない</span>';
  };
  body.querySelector('.tk-gong').onclick = () => {
    if (done || lock) return;
    if (seq.length >= 14) return;
    seq.push('g'); audio.play('gong'); onStrike && onStrike(); paint();
  };
  body.querySelector('.tk-pause').onclick = () => {
    if (done || lock || !seq.length || seq[seq.length - 1] === 'p') return;
    seq.push('p'); audio.play('click'); paint();
  };
  body.querySelector('.tk-reset').onclick = () => { if (done) return; seq = []; audio.play('click'); paint(); };
  body.querySelector('.tk-done').onclick = () => {
    if (done || lock) return;
    const ok = seq.length === BELL2.length && seq.every((s, i) => s === BELL2[i]);
    if (ok) {
      done = true;
      body.classList.add('solved');
      msg.textContent = 'ゴーン……。二百年前と同じ鐘の音が、東京の夜にひびいた。';
      setTimeout(() => onSolved(panel), 1500);
      return;
    }
    lock = true;
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    const strokes = seq.filter((s) => s === 'g').length;
    msg.textContent = strokes && !seq.includes('p') ? 'ツル「はじめの捨て鐘のあとに、間をおかねばなりません」' : 'ツル「……いまの時刻と、ちがう鐘のようです」';
    setTimeout(() => { seq = []; lock = false; paint(); }, 1200);
  };
  const panel = ui.openPanel({ title: '時の鐘', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// ③ 銀座線のおつかい：地下鉄の路線図で道順を決める
//  浅草 → 渋谷。とちゅうで秋葉原と東京に寄る。乗りかえは3回まで。
// ---------------------------------------------------------------
export const LINES = {
  G: { name: '銀座線', color: '#f39a1a', st: ['浅草', '上野', '神田', '日本橋', '銀座', '新橋', '赤坂見附', '表参道', '渋谷'] },
  M: { name: '丸ノ内線', color: '#e8402e', st: ['池袋', '御茶ノ水', '東京', '銀座', '霞ケ関', '赤坂見附', '新宿'] },
  H: { name: '日比谷線', color: '#9aa4ae', st: ['北千住', '上野', '秋葉原', '人形町', '銀座', '六本木', '恵比寿'] },
  Z: { name: '半蔵門線', color: '#8a5ac8', st: ['押上', '大手町', '九段下', '表参道', '渋谷'] },
};
const POS = {
  浅草: [318, 52], 上野: [262, 56], 神田: [236, 104], 日本橋: [240, 140], 銀座: [210, 172], 新橋: [196, 206], 赤坂見附: [128, 182], 表参道: [92, 214], 渋谷: [52, 246],
  池袋: [70, 26], 御茶ノ水: [174, 78], 東京: [222, 124], 霞ケ関: [168, 190], 新宿: [28, 150],
  北千住: [318, 14], 秋葉原: [258, 94], 人形町: [276, 152], 六本木: [140, 226], 恵比寿: [82, 268],
  押上: [354, 96], 大手町: [204, 102], 九段下: [150, 120],
};
export const ERRAND = { from: '浅草', to: '渋谷', via: ['秋葉原', '東京'], maxTransfers: 3 };

function edgeLine(a, b) {
  for (const [k, L] of Object.entries(LINES)) {
    const i = L.st.indexOf(a), j = L.st.indexOf(b);
    if (i >= 0 && j >= 0 && Math.abs(i - j) === 1) return k;
  }
  return null;
}

export function checkRoute(route) {
  if (route[0] !== ERRAND.from) return { ok: false, why: 'start' };
  const lines = [];
  for (let i = 1; i < route.length; i++) lines.push(edgeLine(route[i - 1], route[i]));
  let transfers = 0;
  for (let i = 1; i < lines.length; i++) if (lines[i] !== lines[i - 1]) transfers++;
  const visits = ERRAND.via.every((v) => route.includes(v));
  const end = route[route.length - 1] === ERRAND.to;
  return { ok: end && visits && transfers <= ERRAND.maxTransfers, transfers, visits, end, lines };
}

export function subwayPanel(ui, audio, { onSolved }) {
  let route = ['浅草'];
  let done = false;
  const body = el('div', 'subp');
  body.innerHTML = `
    <div class="plaque">地下鉄の路線図<br><small>人形焼を、<b>浅草</b>から<b>渋谷</b>のネコへ。とちゅう<b>秋葉原</b>のカラスと、<b>東京</b>の駅長にも、ひとつずつ。<br>乗りかえは<b>3回まで</b>。</small></div>
    <svg class="sb-map" viewBox="0 0 380 290"></svg>
    <div class="sb-route"></div>
    <div class="ml-foot"><button class="btn small-btn sb-back">ひとつもどる</button> <button class="btn small-btn sb-reset">はじめから</button> <button class="btn primary sb-go">この道順で行く</button></div>
    <p class="panel-note small sb-msg">となりの駅を順に押して、道順をつくろう。</p>`;
  const svg = body.querySelector('.sb-map');
  const msg = body.querySelector('.sb-msg');
  const routeEl = body.querySelector('.sb-route');
  const draw = () => {
    let h = '';
    for (const L of Object.values(LINES)) {
      h += `<polyline points="${L.st.map((s) => POS[s].join(',')).join(' ')}" fill="none" stroke="${L.color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    }
    for (let i = 1; i < route.length; i++) {
      const a = POS[route[i - 1]], b = POS[route[i]];
      h += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#2a2a30" stroke-width="3" stroke-dasharray="5 4"/>`;
    }
    const cur = route[route.length - 1];
    for (const [s, [x, y]] of Object.entries(POS)) {
      const on = route.includes(s), here = s === cur, adj = !!edgeLine(cur, s);
      const key = ERRAND.via.includes(s) || s === ERRAND.to || s === ERRAND.from;
      h += `<g class="sb-st ${adj ? 'adj' : ''}" data-s="${s}"><circle cx="${x}" cy="${y}" r="${here ? 9 : 7}" fill="${here ? '#2a2a30' : on ? '#ffe08a' : '#ffffff'}" stroke="#2a2a30" stroke-width="2.5"/>`;
      h += `<text x="${x}" y="${y - 12}" text-anchor="middle" class="sb-t ${key ? 'key' : ''}">${s}</text></g>`;
    }
    svg.innerHTML = h;
    svg.querySelectorAll('.sb-st').forEach((g) => { g.onclick = () => tap(g.dataset.s); });
    const res = checkRoute(route);
    routeEl.innerHTML = route.map((s, i) => (i ? `<span class="sb-ln" style="background:${LINES[res.lines[i - 1]].color}"></span>` : '') + `<span class="sb-rs">${s}</span>`).join('') + `<span class="sb-tr">乗りかえ ${res.transfers}回</span>`;
  };
  const tap = (s) => {
    if (done) return;
    const cur = route[route.length - 1];
    if (s === cur) return;
    if (!edgeLine(cur, s)) { msg.textContent = `${cur}から${s}へは、1駅では行けない。`; audio.play('wrong'); return; }
    route.push(s);
    audio.play('dial');
    msg.textContent = 'となりの駅を順に押して、道順をつくろう。';
    draw();
  };
  body.querySelector('.sb-back').onclick = () => { if (done || route.length < 2) return; route.pop(); audio.play('click'); draw(); };
  body.querySelector('.sb-reset').onclick = () => { if (done) return; route = ['浅草']; audio.play('click'); draw(); };
  body.querySelector('.sb-go').onclick = () => {
    if (done) return;
    const res = checkRoute(route);
    if (res.ok) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = 'ゴトン、ゴトン……人形焼を、ぶじにとどけた！';
      setTimeout(() => onSolved(panel, route), 1300);
      return;
    }
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    if (!res.end) msg.textContent = 'まだ渋谷に着いていない。';
    else if (!res.visits) msg.textContent = `寄り道をわすれている（${ERRAND.via.filter((v) => !route.includes(v)).join('・')}）。`;
    else msg.textContent = `乗りかえが ${res.transfers}回。3回までにしないと、人形焼がさめてしまう。`;
  };
  const panel = ui.openPanel({ title: '銀座線のおつかい', body, cls: 'wide' });
  draw();
  return panel;
}

// ---------------------------------------------------------------
// ④ 自動販売機：見出しが読める向きに、井戸の札の番号を読む
// ---------------------------------------------------------------
export const VEND_PLAQUE = Object.freeze({
  heading: '札の戸井',
  numbers: '四 七 弐',
});
export const VEND = [2, 7, 4];
const DRINKS = ['お茶', 'ラムネ', 'コーヒー', 'サイダー', 'みず', 'ココア', 'いちご牛乳', 'むぎ茶', 'オレンジ'];
export function vendingPanel(ui, audio, { onSolved }) {
  let seq = [];
  let done = false, lock = false;
  const body = el('div', 'vendp');
  body.innerHTML = `
    <div class="plaque">自動販売機<br><small>番号のボタンが9つ。……どこかに「ひみつの押しかた」がありそうだ。</small></div>
    <div class="vd-grid"></div>
    <div class="vd-seq" role="status" aria-live="polite" aria-label="押した番号"></div>
    <div class="ml-foot"><button class="btn small-btn vd-reset">押した番号を消す</button></div>
    <p class="panel-note small vd-msg">ボタンを3つ押すと、何かが出てくる……かもしれない。</p>`;
  const grid = body.querySelector('.vd-grid');
  const msg = body.querySelector('.vd-msg');
  const seqEl = body.querySelector('.vd-seq');
  const paint = () => { seqEl.textContent = Array.from({ length: 3 }, (_, i) => seq[i] ?? '—').join(' · '); };
  body.querySelector('.vd-reset').onclick = () => {
    if (done || lock) return;
    seq = []; audio.play('click'); paint();
  };
  DRINKS.forEach((d, i) => {
    const b = el('button', 'vd-b', `<i class="vd-can c${i}"></i><small>${d}</small><b>${i + 1}</b>`);
    b.setAttribute('aria-label', `${i + 1} ${d}`);
    b.onclick = () => {
      if (done || lock) return;
      seq.push(i + 1);
      audio.play('dial');
      paint();
      if (seq.length < 3) return;
      if (seq.every((v, k) => v === VEND[k])) {
        done = true;
        body.classList.add('solved');
        audio.play('solve');
        msg.textContent = 'ピピピッ……ガコン！ 見たことのない緑のびんが出てきた。「キュウリ味ラムネ」！';
        setTimeout(() => onSolved(panel), 1400);
        return;
      }
      lock = true;
      audio.play('wrong');
      msg.textContent = seq.join('') === '472'
        ? 'ピピッ……何も出てこない。札の見出しが読める向きに、数字もたどってみよう。'
        : 'ピピッ……何も出てこない。むかしの札に、数字と読む向きの手がかりがありそうだ。';
      setTimeout(() => { seq = []; lock = false; paint(); }, 700);
    };
    grid.appendChild(b);
  });
  const panel = ui.openPanel({ title: '自動販売機', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// ⑤ 水上バス：干潮の時刻に、太鼓橋の下へ着く便をえらぶ
//  干潮＝夜四つ（夜10時）。乗り場から橋の下まで20分 → 21:40の便
// ---------------------------------------------------------------
export const DEPARTS = ['21:00', '21:20', '21:40', '22:00', '22:20'];
export const DEPART_OK = '21:40';
export function tidePanel(ui, audio, { onSolved }) {
  let sel = null;
  let done = false;
  const body = el('div', 'tidep');
  body.innerHTML = `
    <div class="plaque">水上バスの時刻表<br><small>カッパ「十手は、潮がいちばん引いたときでないと、深くて潜れねえ。どの便で行く？」</small></div>
    <div class="td-list"></div>
    <div class="ml-foot"><button class="btn primary td-go">この便で出発</button></div>
    <p class="panel-note small td-msg">潮見表と時刻表は、乗り場の看板にある。</p>`;
  const list = body.querySelector('.td-list');
  const msg = body.querySelector('.td-msg');
  const btns = DEPARTS.map((t) => {
    const b = el('button', 'btn td-b', `🚤 ${t} 発`);
    b.onclick = () => { if (done) return; sel = t; audio.play('click'); btns.forEach((x) => x.classList.toggle('on', x === b)); };
    list.appendChild(b);
    return b;
  });
  body.querySelector('.td-go').onclick = () => {
    if (done) return;
    if (!sel) { msg.textContent = 'まず便をえらぼう。'; audio.play('wrong'); return; }
    if (sel === DEPART_OK) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = 'カッパ「よし、その便なら、着いたときにちょうど潮が引ききる！」';
      setTimeout(() => onSolved(panel), 1300);
      return;
    }
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    const [h, m] = sel.split(':').map(Number);
    const arrive = h * 60 + m + 20;
    msg.textContent = arrive < 22 * 60 ? 'カッパ「その便じゃ、着いてもまだ潮が満ちてて深すぎる」' : 'カッパ「その便じゃ、着いたころには潮がまた満ちてきちまう」';
  };
  const panel = ui.openPanel({ title: '水上バス', body });
  return panel;
}

/** 乗り場の看板（読みもの） */
export function pierBoardHTML(kind) {
  if (kind === 'tide') {
    return `<div class="pier-board"><div class="pb-h">隅田川　潮見表</div>
      <p>本日の干潮：<b>夜四つ</b></p><p>本日の満潮：九つ（夜）</p>
      <p class="pb-s">※ むかしからの書きかたで書いています　―　水上バス組合</p></div>`;
  }
  return `<div class="pier-board"><div class="pb-h">水上バス　時刻表（夜）</div>
    <p>${DEPARTS.join('　')}</p>
    <p>乗り場 → <b>太鼓橋の下</b>　<b>20分</b></p>
    <p class="pb-s">太鼓橋の下 → お台場　15分</p></div>`;
}
