import { el } from '../../core/ui.js';

// 勇者の城下町の謎解きパネル（HTML）

// ---------------------------------------------------------------
// 魔界文字（星座の形）。教会のステンドグラスに対応表がある
// ---------------------------------------------------------------
export const GLYPHS = {
  あ: [[[3, 4], [10, 2], [17, 6], [10, 17]], [[0, 1], [1, 2], [1, 3]]],
  い: [[[4, 3], [4, 16], [16, 5], [16, 14]], [[0, 1], [2, 3]]],
  う: [[[10, 2], [4, 9], [16, 9], [10, 18]], [[0, 1], [0, 2], [1, 3], [2, 3]]],
  え: [[[3, 3], [17, 3], [10, 10], [3, 17], [17, 17]], [[0, 1], [1, 2], [2, 3], [3, 4]]],
  お: [[[10, 2], [10, 18], [3, 9], [17, 12]], [[0, 1], [2, 3]]],
  さ: [[[3, 6], [17, 3], [12, 11], [5, 17]], [[0, 1], [1, 2], [2, 3]]],
  し: [[[5, 2], [5, 14], [16, 17]], [[0, 1], [1, 2]]],
  た: [[[3, 5], [10, 2], [17, 5], [3, 15], [17, 15]], [[0, 1], [1, 2], [0, 3], [2, 4]]],
  と: [[[6, 2], [6, 17], [16, 8]], [[0, 1], [1, 2]]],
  び: [[[3, 3], [10, 17], [17, 3], [14, 2], [18, 6]], [[0, 1], [1, 2]]],
  へ: [[[2, 13], [9, 4], [18, 15]], [[0, 1], [1, 2]]],
  ま: [[[3, 4], [17, 4], [10, 11], [4, 17], [16, 17]], [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4]]],
};
export const LETTER_LINES = [['お', 'と', 'う', 'と', 'へ'], ['さ', 'び', 'し', 'い'], ['あ', 'い', 'た', 'い']];
export const ANSWER = ['あ', 'い', 'た', 'い'];
/** ステンドグラスにある対応表（「た」だけは欠けている） */
export const GLASS_TABLE = ['あ', 'い', 'う', 'え', 'お', 'さ', 'し', 'と', 'び', 'へ', 'ま'];

export function glyphSVG(ch, size = 26, color = '#f8e070') {
  const g = GLYPHS[ch];
  if (!g) return '';
  const [pts, edges] = g;
  const lines = edges.map(([a, b]) => `<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="${color}" stroke-width="1.2" opacity=".7"/>`).join('');
  const dots = pts.map(([x, y]) => `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" fill="${color}"/>`).join('');
  return `<svg viewBox="0 0 20 20" width="${size}" height="${size}" class="glyph">${lines}${dots}</svg>`;
}

/** 魔界の手紙（読みもの） */
export function letterHTML(decoded = false) {
  const lines = LETTER_LINES.map((ln, i) => `<div class="lt-line">${ln.map((c) => `<span class="lt-g">${glyphSVG(c, 30)}${decoded || i < 2 && decoded ? `<small>${c}</small>` : ''}</span>`).join('')}</div>`).join('');
  return `<div class="maletter"><div class="lt-seal">魔</div>${lines}<p class="panel-note small">${decoded ? '「おとうとへ　さびしい　あいたい」' : '星をつないだような、ふしぎな文字……。'}</p></div>`;
}

/** ステンドグラスの対応表 */
export function glassTableHTML() {
  return `<div class="gtable">${GLASS_TABLE.map((c) => `<div class="gt-cell">${glyphSVG(c, 28, '#2a1a40')}<b>${c}</b></div>`).join('')}<div class="gt-cell broken"><span aria-hidden="true">◌</span><b>？</b></div></div>
  <p class="panel-note small">ひとつだけ、ガラスが欠けて読めない。</p>`;
}

export function decodePanel(ui, audio, { onSolved }) {
  const slots = [null, null, null, null];
  let cur = 0;
  let done = false;
  const body = el('div', 'decodep');
  const kana = ['あ', 'い', 'う', 'え', 'お', 'さ', 'し', 'た', 'と', 'び', 'へ', 'ま'];
  body.innerHTML = `
    <div class="plaque">魔界の手紙を読む<br><small>最後の行の4文字を、ひらがなにおきかえよう。</small></div>
    ${letterHTML(false)}
    <div class="dc-slots"></div>
    <div class="dc-kana"></div>
    <div class="ml-foot"><button class="btn primary dc-check">これで読む</button></div>
    <p class="panel-note small dc-msg">ステンドグラスの対応表が手がかり（旅のメモ）。</p>`;
  const slotsEl = body.querySelector('.dc-slots');
  const msg = body.querySelector('.dc-msg');
  const slotBtns = ANSWER.map((ch, i) => {
    const b = el('button', 'dc-slot');
    b.onclick = () => { if (done) return; cur = i; audio.play('click'); paint(); };
    slotsEl.appendChild(b);
    return b;
  });
  const kb = body.querySelector('.dc-kana');
  for (const k of kana) {
    const b = el('button', 'btn dc-k', k);
    b.onclick = () => {
      if (done) return;
      slots[cur] = k;
      cur = Math.min(3, cur + 1);
      audio.play('dial');
      paint();
    };
    kb.appendChild(b);
  }
  const paint = () => {
    slotBtns.forEach((b, i) => {
      b.innerHTML = `${glyphSVG(ANSWER[i], 24)}<b>${slots[i] || '？'}</b>`;
      b.classList.toggle('cur', i === cur && !done);
    });
  };
  body.querySelector('.dc-check').onclick = () => {
    if (done) return;
    if (slots.some((s) => !s)) { msg.textContent = 'まだ読めていない文字がある。'; audio.play('wrong'); return; }
    if (slots.every((s, i) => s === ANSWER[i])) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = '「あいたい」……！';
      paint();
      setTimeout(() => onSolved(panel), 1200);
      return;
    }
    audio.play('wrong');
    msg.textContent = 'うーん、意味の通る言葉にならない。';
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
  };
  const panel = ui.openPanel({ title: '魔界の手紙', body, cls: 'wide' });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// 鍛冶：ふいごで熱し、色を見て打つ。打つと熱は一段さがる
// 手引き：「白で一度、黄で二度、橙で一度。そして水」
// ---------------------------------------------------------------
export const FORGE_HEAT = ['黒', '赤', '橙', '黄', '白'];
const HEAT_COL = ['#3a3440', '#c8302a', '#f07a2a', '#f8d040', '#fbf8f0'];
export const FORGE_RECIPE = [4, 3, 3, 2];

export function forgePanel(ui, audio, { onSolved }) {
  let heat = 0;
  let rec = [];
  let done = false;
  const body = el('div', 'forgep');
  body.innerHTML = `
    <div class="plaque">勇者の剣を鍛える<br><small>ふいごで熱すると色が変わる。打つたびに、熱は一段さがる。</small></div>
    <div class="fg-metal"><div class="fg-bar"></div><b class="fg-name"></b></div>
    <div class="fg-rec"></div>
    <div class="tk-btns">
      <button class="btn fg-bel">🔥 ふいご</button>
      <button class="btn primary fg-hit">🔨 打つ</button>
      <button class="btn fg-water">💧 水へ</button>
    </div>
    <button class="btn small-btn fg-reset">はじめから</button>
    <p class="panel-note small fg-msg">手引きのとおりに、打つ色の順番をそろえよう。</p>`;
  const bar = body.querySelector('.fg-bar');
  const name = body.querySelector('.fg-name');
  const recEl = body.querySelector('.fg-rec');
  const msg = body.querySelector('.fg-msg');
  const instruction = msg.textContent;
  const paint = () => {
    bar.style.background = HEAT_COL[heat];
    bar.style.boxShadow = heat ? `0 0 ${heat * 6}px ${HEAT_COL[heat]}` : 'none';
    name.textContent = FORGE_HEAT[heat];
    recEl.innerHTML = rec.length ? rec.map((h) => `<span style="background:${HEAT_COL[h]}">${FORGE_HEAT[h]}</span>`).join('') : '<span class="tk-empty">まだ打っていない</span>';
  };
  const reset = () => { heat = 0; rec = []; msg.textContent = instruction; paint(); };
  const fail = (t) => {
    reset();
    audio.play('wrong');
    msg.textContent = t;
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
  };
  body.querySelector('.fg-bel').onclick = () => {
    if (done) return;
    if (heat >= 4) { fail('熱しすぎて、鉄がとろけてしまった！ はじめから。'); return; }
    heat++;
    msg.textContent = instruction;
    audio.play('fire');
    paint();
  };
  body.querySelector('.fg-hit').onclick = () => {
    if (done) return;
    if (heat === 0) { msg.textContent = '冷たい鉄は打てない。まず熱そう。'; return; }
    rec.push(heat);
    heat--;
    audio.play('clang');
    paint();
    const i = rec.length - 1;
    if (rec[i] !== FORGE_RECIPE[i]) fail(`${FORGE_HEAT[rec[i]]}で打ってしまった……手引きとちがう。はじめから。`);
  };
  body.querySelector('.fg-water').onclick = () => {
    if (done) return;
    if (rec.length < FORGE_RECIPE.length) { fail('まだ鍛え足りない……。'); return; }
    done = true;
    audio.play('steam');
    body.classList.add('solved');
    msg.textContent = 'じゅわっ！ ……刃が青白くかがやいている！';
    setTimeout(() => onSolved(panel), 1300);
  };
  body.querySelector('.fg-reset').onclick = () => { if (done) return; reset(); audio.play('click'); };
  const panel = ui.openPanel({ title: '鍛冶', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// 道具屋の壁の貼り紙「調合の心得」（なぞなぞで配合が書いてある）
export function recipeHTML() {
  return `<div class="recipe">
    <div class="rc-head">調合の心得</div>
    <div class="rc-row"><b>回復薬</b>おひさま ふたつに、空 ひとつ</div>
    <div class="rc-row"><b>毒消し</b>夕やけ ひとつに、海 ふたつ</div>
    <div class="rc-row"><b>元気の素</b>りんご ふたつに、レモン ひとつ</div>
    <div class="rc-foot">しずくは きっちり 数えること。　―スライム</div>
  </div>`;
}

// 薬の色まぜ：赤・黄・青のしずくを入れて、注文の色をつくる
// ---------------------------------------------------------------
const RYB = [[1, 1, 1], [1, 0, 0], [1, 1, 0], [1, 0.5, 0], [0.163, 0.373, 0.6], [0.5, 0, 0.5], [0, 0.66, 0.2], [0.2, 0.094, 0]];
function ryb2rgb(r, y, b) {
  // Gossett & Chen の RYB 立方体を三線形補間
  const c = (i) => RYB[i];
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const x0 = c(0)[k] * (1 - r) + c(1)[k] * r;
    const x1 = c(2)[k] * (1 - r) + c(3)[k] * r;
    const x2 = c(4)[k] * (1 - r) + c(5)[k] * r;
    const x3 = c(6)[k] * (1 - r) + c(7)[k] * r;
    const y0 = x0 * (1 - y) + x1 * y;
    const y1 = x2 * (1 - y) + x3 * y;
    out[k] = y0 * (1 - b) + y1 * b;
  }
  return out;
}
export function mixColor(r, y, b) {
  const m = Math.max(r, y, b);
  if (!m) return '#e8eef4';
  const [R, G, B] = ryb2rgb(r / m, y / m, b / m);
  return `rgb(${Math.round(R * 255)},${Math.round(G * 255)},${Math.round(B * 255)})`;
}
export const ORDERS = [
  { name: '回復薬', rec: [0, 2, 1] },
  { name: '毒消し', rec: [1, 0, 2] },
  { name: '元気の素', rec: [2, 1, 0] },
];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const norm = (v) => { const g = v.reduce((a, b) => gcd(a, b), 0) || 1; return v.map((x) => x / g).join(','); };

export function mixPanel(ui, audio, { onSolved }) {
  let step = 0;
  let drops = [0, 0, 0];
  let done = false;
  const body = el('div', 'mixp');
  body.innerHTML = `
    <div class="plaque">スライムの薬づくり<br><small>しずくを入れて、注文の見本と同じ色にしよう（ちょうど3てき）。</small></div>
    <div class="mx-orders"></div>
    <div class="mx-row">
      <div class="mx-pot"><div class="mx-liquid"></div><b class="mx-count"></b></div>
    </div>
    <div class="tk-btns">
      <button class="btn mx-d" data-i="0" style="--c:#e83a3a">🔴 赤</button>
      <button class="btn mx-d" data-i="1" style="--c:#f8d040">🟡 黄</button>
      <button class="btn mx-d" data-i="2" style="--c:#3a6ae8">🔵 青</button>
    </div>
    <div class="tk-btns"><button class="btn small-btn mx-empty">すてる</button><button class="btn primary mx-ok">びんにつめる</button></div>
    <details class="mx-recipe"><summary>📜 調合の心得を見る</summary>${recipeHTML()}</details>
    <p class="panel-note small mx-msg"></p>`;
  const orders = body.querySelector('.mx-orders');
  const liquid = body.querySelector('.mx-liquid');
  const count = body.querySelector('.mx-count');
  const msg = body.querySelector('.mx-msg');
  const paint = () => {
    orders.innerHTML = ORDERS.map((o, i) => `<div class="mx-o${i === step ? ' cur' : ''}${i < step ? ' ok' : ''}"><span class="mx-sw" style="background:${mixColor(...o.rec)}"></span>${o.name}${i < step ? ' ✓' : ''}</div>`).join('');
    liquid.style.background = mixColor(...drops);
    const n = drops[0] + drops[1] + drops[2];
    count.textContent = n ? `${n}てき` : 'からっぽ';
    if (!done) msg.textContent = `いまの注文：${ORDERS[step].name}（左の見本の色）`;
  };
  body.querySelectorAll('.mx-d').forEach((b) => {
    b.onclick = () => {
      if (done) return;
      if (drops[0] + drops[1] + drops[2] >= 3) { msg.textContent = 'びんは3てきでいっぱい。ちがったら、いちどすてよう。'; return; }
      drops[+b.dataset.i]++;
      audio.play('pop');
      paint();
    };
  });
  body.querySelector('.mx-empty').onclick = () => { if (done) return; drops = [0, 0, 0]; audio.play('water'); paint(); };
  body.querySelector('.mx-ok').onclick = () => {
    if (done) return;
    if (!drops.some(Boolean)) return;
    if (drops.join(',') === ORDERS[step].rec.join(',')) {
      audio.play('solve');
      step++;
      drops = [0, 0, 0];
      if (step >= ORDERS.length) {
        done = true;
        body.classList.add('solved');
        paint();
        msg.textContent = '3つの薬が、ぜんぶできあがった！';
        setTimeout(() => onSolved(panel), 1200);
        return;
      }
      paint();
      msg.textContent = `${ORDERS[step - 1].name}ができた！ つぎは${ORDERS[step].name}。`;
      return;
    }
    audio.play('wrong');
    msg.textContent = 'スライム「うーん、見本とちょっと色がちがうよ〜」';
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
  };
  const panel = ui.openPanel({ title: '薬づくり', body });
  paint();
  return panel;
}
