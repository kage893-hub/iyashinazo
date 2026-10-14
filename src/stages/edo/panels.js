import { el } from '../../core/ui.js';

// 江戸の宿場町の謎解きパネル（HTML）

// ---------------------------------------------------------------
// 浮世絵（版木）合わせ：3×3 のこまを入れかえて、一枚の絵にもどす
// ---------------------------------------------------------------
let _ukiyoe = null;
function ukiyoeImage() {
  if (_ukiyoe) return _ukiyoe;
  const S = 300;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  // 空（夜明け）
  const sky = x.createLinearGradient(0, 0, 0, S * 0.65);
  sky.addColorStop(0, '#2b3a6a'); sky.addColorStop(0.55, '#e88a6a'); sky.addColorStop(1, '#f4d8a0');
  x.fillStyle = sky; x.fillRect(0, 0, S, S);
  // 赤い朝日
  x.fillStyle = '#d8302a'; x.beginPath(); x.arc(S * 0.78, S * 0.24, S * 0.09, 0, Math.PI * 2); x.fill();
  // 富士山
  x.fillStyle = '#3a4a7a';
  x.beginPath(); x.moveTo(S * 0.18, S * 0.62); x.lineTo(S * 0.45, S * 0.2); x.lineTo(S * 0.52, S * 0.2); x.lineTo(S * 0.82, S * 0.62); x.fill();
  x.fillStyle = '#fbf8f0';
  x.beginPath(); x.moveTo(S * 0.36, S * 0.34); x.lineTo(S * 0.45, S * 0.2); x.lineTo(S * 0.52, S * 0.2); x.lineTo(S * 0.61, S * 0.34);
  for (let i = 0; i < 5; i++) x.lineTo(S * (0.58 - i * 0.05), S * (i % 2 ? 0.31 : 0.36));
  x.fill();
  // 雲のすじ
  x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 5; x.lineCap = 'round';
  for (const [y, x0, x1] of [[0.12, 0.05, 0.32], [0.44, 0.6, 0.95], [0.08, 0.6, 0.72]]) { x.beginPath(); x.moveTo(S * x0, S * y); x.lineTo(S * x1, S * y); x.stroke(); }
  // 五重塔（右）
  x.fillStyle = '#5a1a14';
  for (let i = 0; i < 5; i++) {
    const w = 0.13 - i * 0.015, yy = 0.62 - i * 0.075;
    x.fillRect(S * (0.86 - w / 2), S * yy, S * w, S * 0.02);
    x.fillRect(S * (0.86 - 0.025), S * (yy - 0.055), S * 0.05, S * 0.055);
  }
  x.fillRect(S * 0.855, S * 0.2, S * 0.01, S * 0.08);
  // 大波（左下）
  x.fillStyle = '#1e3a7a';
  x.beginPath(); x.moveTo(0, S); x.lineTo(0, S * 0.55);
  x.bezierCurveTo(S * 0.15, S * 0.42, S * 0.38, S * 0.45, S * 0.42, S * 0.62);
  x.bezierCurveTo(S * 0.34, S * 0.56, S * 0.26, S * 0.62, S * 0.3, S * 0.72);
  x.bezierCurveTo(S * 0.5, S * 0.7, S * 0.7, S * 0.8, S, S * 0.74);
  x.lineTo(S, S); x.fill();
  x.fillStyle = '#3a6ab8';
  x.beginPath(); x.moveTo(0, S); x.lineTo(0, S * 0.8); x.bezierCurveTo(S * 0.3, S * 0.76, S * 0.6, S * 0.9, S, S * 0.86); x.lineTo(S, S); x.fill();
  // 波しぶき
  x.fillStyle = '#fbf8f0';
  for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(S * (0.05 + i * 0.045), S * (0.53 - Math.sin(i / 2.6) * 0.07), S * 0.018, 0, Math.PI * 2); x.fill(); }
  // 小舟
  x.fillStyle = '#c89a5a'; x.beginPath(); x.moveTo(S * 0.5, S * 0.8); x.lineTo(S * 0.7, S * 0.8); x.lineTo(S * 0.66, S * 0.84); x.lineTo(S * 0.53, S * 0.84); x.fill();
  // 題箋（左上）
  x.fillStyle = '#f4ead2'; x.fillRect(S * 0.04, S * 0.04, S * 0.11, S * 0.3);
  x.strokeStyle = '#2a1a14'; x.lineWidth = 2; x.strokeRect(S * 0.04, S * 0.04, S * 0.11, S * 0.3);
  x.fillStyle = '#2a1a14'; x.font = `900 ${S * 0.07}px "Zen Maru Gothic", sans-serif`; x.textAlign = 'center';
  ['江', '戸', '名', '所'].forEach((ch, i) => x.fillText(ch, S * 0.095, S * (0.1 + i * 0.07)));
  // 外わく
  x.strokeStyle = '#2a1a14'; x.lineWidth = 6; x.strokeRect(3, 3, S - 6, S - 6);
  _ukiyoe = c.toDataURL();
  return _ukiyoe;
}

export function ukiyoePanel(ui, audio, { onSolved }) {
  // 最初のならび（どれも正しい位置にない）
  let order = [6, 4, 1, 8, 2, 0, 5, 3, 7];
  let picked = -1;
  let done = false;
  const img = ukiyoeImage();
  const body = el('div', 'ukiyop');
  body.innerHTML = `
    <div class="plaque">けさの瓦版の版木が、風でばらばらに……<br><small>こまを2つ選ぶと入れかわる。一枚の絵にもどそう。</small></div>
    <div class="uk-grid"></div>
    <div class="uk-foot"><span class="uk-count"></span></div>`;
  const grid = body.querySelector('.uk-grid');
  const cells = order.map((_, i) => {
    const b = el('button', 'uk-cell');
    b.onclick = () => {
      if (done) return;
      if (picked < 0) { picked = i; audio.play('dial'); paint(); return; }
      if (picked === i) { picked = -1; paint(); return; }
      [order[picked], order[i]] = [order[i], order[picked]];
      picked = -1;
      audio.play('paper');
      paint();
    };
    grid.appendChild(b);
    return b;
  });
  const paint = () => {
    cells.forEach((b, i) => {
      const p = order[i];
      b.style.backgroundImage = `url(${img})`;
      b.style.backgroundPosition = `${(p % 3) * 50}% ${Math.floor(p / 3) * 50}%`;
      b.classList.toggle('picked', picked === i);
      b.classList.toggle('ok', p === i);
    });
    const n = order.filter((p, i) => p === i).length;
    body.querySelector('.uk-count').textContent = `正しい場所：${n} / 9`;
    if (n === 9 && !done) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      // 完成した絵をゆっくり見てから、自分で「刷る」
      const foot = body.querySelector('.uk-foot');
      foot.innerHTML = '<span class="uk-count">一枚の絵にもどった！『江戸名所』</span>';
      const go = el('button', 'btn primary uk-go', 'ぺったん、刷る！');
      go.onclick = () => { go.disabled = true; onSolved(panel); };
      foot.appendChild(go);
    }
  };
  const panel = ui.openPanel({ title: '版木合わせ', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// 時の鐘：捨て鐘 三つ → 間をおいて → 刻の数（明け六つ＝六つ）
// ---------------------------------------------------------------
export const BELL_PATTERN = ['g', 'g', 'g', 'p', 'g', 'g', 'g', 'g', 'g', 'g'];

export function bellPanel(ui, audio, { onStrike, onSolved }) {
  let seq = [];
  let done = false;
  let lock = false;
  const body = el('div', 'tokip');
  body.innerHTML = `
    <div class="plaque">時の鐘<br><small>夜明けを告げる「明け六つ」の鐘を撞こう。</small></div>
    <div class="tk-seq"></div>
    <div class="tk-btns">
      <button class="btn primary tk-gong">🔔 撞く（ゴーン）</button>
      <button class="btn tk-pause">… 間をおく</button>
    </div>
    <button class="btn small-btn tk-reset">はじめから</button>
    <p class="panel-note small tk-msg">鐘の撞きかたは、瓦版に書いてあったはず。</p>`;
  const seqEl = body.querySelector('.tk-seq');
  const msg = body.querySelector('.tk-msg');
  const paint = () => {
    seqEl.innerHTML = seq.length
      ? seq.map((s) => (s === 'g' ? '<span class="tk-g">●</span>' : '<span class="tk-p">／</span>')).join('')
      : '<span class="tk-empty">まだ撞いていない</span>';
  };
  const check = () => {
    const ok = seq.every((s, i) => s === BELL_PATTERN[i]);
    if (!ok) {
      lock = true;
      audio.play('wrong');
      msg.textContent = '鐘の音が乱れてしまった……。はじめから撞きなおそう。';
      body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
      setTimeout(() => { seq = []; lock = false; paint(); }, 900);
      return;
    }
    if (seq.length === BELL_PATTERN.length) {
      done = true;
      body.classList.add('solved');
      msg.textContent = 'ゴーン……ゴーン……。明け六つの鐘が、江戸の町にひびきわたる。';
      setTimeout(() => onSolved(panel), 1400);
    }
  };
  body.querySelector('.tk-gong').onclick = () => {
    if (done || lock) return;
    seq.push('g');
    audio.play('gong');
    onStrike && onStrike();
    paint();
    check();
  };
  body.querySelector('.tk-pause').onclick = () => {
    if (done || lock) return;
    if (!seq.length) { msg.textContent = 'まずは鐘を撞こう。'; return; }
    if (seq[seq.length - 1] === 'p') return;
    seq.push('p');
    audio.play('click');
    paint();
    check();
  };
  body.querySelector('.tk-reset').onclick = () => { if (done) return; seq = []; audio.play('click'); msg.textContent = '鐘の撞きかたは、瓦版に書いてあったはず。'; paint(); };
  const panel = ui.openPanel({ title: '時の鐘', body });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// 瓦版（読みもの）
// ---------------------------------------------------------------
export function kawarabanHTML() {
  return `
  <div class="kawaraban">
    <div class="kb-head">瓦版<small>えどのしゅく　けさの知らせ</small></div>
    <div class="kb-cols">
      <div class="kb-art">
        <div class="kb-t">時の鐘の撞きかた</div>
        はじめに<b>捨て鐘を三つ</b>。<br>ひと息<b>間をおいて</b>、<br>刻の数だけ撞くべし。<br>夜明けの<b>明け六つ</b>なら<b>六つ</b>。
      </div>
      <div class="kb-art">
        <div class="kb-t">岡っ引きの親分、十手をなくす</div>
        ゆうべ太鼓橋のうえで居眠り。<br>十手を川へ、ぽちゃん。<br>夜が明けて明るくなれば、<br>川底に光って見えるかも？
      </div>
      <div class="kb-art kb-small">
        <div class="kb-t">りす屋の団子</div>
        明け六つより開店。<br>朝いちばんのお客には、<br>おまけあり。
      </div>
    </div>
  </div>`;
}
