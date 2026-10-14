import { el } from '../../core/ui.js';

// 天空の街の謎解きパネル（HTML）

export const BELLS = [
  { sym: '☀', name: 'ド', color: '#e8443a', midi: 72 },
  { sym: '☁', name: 'レ', color: '#c8d0e0', midi: 74 },
  { sym: '★', name: 'ミ', color: '#f2c33a', midi: 76 },
  { sym: '☾', name: 'ソ', color: '#3a7ee8', midi: 79 },
  { sym: '❀', name: 'ラ', color: '#4ab06a', midi: 81 },
];
// そらのうた：☾ ★ ☁ ☀ ☁ ★
export const SONG = [3, 2, 1, 0, 1, 2];

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function letterHTML() {
  const notes = SONG.map((i) => `<span class="ln" style="--c:${BELLS[i].color}">${BELLS[i].sym}</span>`).join('');
  return `
  <div class="letter">
    <p>おじいちゃんへ</p>
    <p>おげんきですか。<br>宝箱のあけかた、また忘れていませんか？<br>ふたの鈴を「そらのうた」の順に鳴らすと、ひらきますよ。</p>
    <div class="letter-song">${notes}</div>
    <p class="letter-sign">うみのまちの まごより</p>
  </div>`;
}

/** 鈴の宝箱 */
export function bellPanel(ui, audio, { onPlay, onSolved }) {
  let seq = [];
  let done = false;
  const body = el('div', 'bellp');
  body.innerHTML = `
    <div class="plaque">ふたの鈴を「そらのうた」の順に鳴らせ</div>
    <div class="bell-seq"></div>
    <div class="bells"></div>
    <button class="btn small-btn reset">はじめから</button>`;
  const seqEl = body.querySelector('.bell-seq');
  const paintSeq = () => {
    seqEl.innerHTML = Array.from({ length: SONG.length }, (_, i) => {
      const b = seq[i] !== undefined ? BELLS[seq[i]] : null;
      return `<span class="bs ${b ? 'on' : ''}" style="--c:${b ? b.color : '#ddd'}">${b ? b.sym : '・'}</span>`;
    }).join('');
  };
  paintSeq();
  const wrap = body.querySelector('.bells');
  BELLS.forEach((b, i) => {
    const btn = el('button', 'bellbtn', `<span class="bb-bell" style="--c:${b.color}">${b.sym}</span><span class="bb-name">${b.name}</span>`);
    btn.onclick = () => {
      if (done) return;
      audio.bellTone(hz(b.midi), { dur: 1.6, gain: 0.12, partials: [1, 2.0, 3.0, 4.2] });
      onPlay && onPlay(i);
      btn.classList.remove('ring'); void btn.offsetWidth; btn.classList.add('ring');
      seq.push(i);
      if (seq.length > SONG.length) seq = seq.slice(-SONG.length);
      paintSeq();
      if (seq.length === SONG.length) {
        if (seq.every((v, k) => v === SONG[k])) {
          done = true;
          body.classList.add('solved');
          setTimeout(() => onSolved(panel), 700);
        } else {
          setTimeout(() => {
            if (done) return;
            audio.play('wrong');
            body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
            seq = [];
            paintSeq();
          }, 450);
        }
      }
    };
    wrap.appendChild(btn);
  });
  body.querySelector('.reset').onclick = () => { seq = []; paintSeq(); audio.play('click'); };
  const panel = ui.openPanel({ title: '鈴の宝箱', body });
  return panel;
}

// ---------------- 風の配管パズル ----------------
// 開いている方向のビット：上=1 右=2 下=4 左=8
const N = 1, E = 2, S = 4, W = 8;
const rot = (m) => ((m << 1) | (m >> 3)) & 15;
const rotN = (m, n) => { for (let i = 0; i < n; i++) m = rot(m); return m; };
const BASE = { I: N | S, L: N | E, T: N | E | S, X: 15 };
// [種類, 正解の向き, はじめのずれ]
const LAYOUT = [
  [['L', 1, 1], ['L', 1, 2], ['L', 2, 1], ['T', 0, 2]],
  [['I', 1, 1], ['L', 3, 2], ['I', 0, 1], ['L', 2, 3]],
  [['T', 1, 1], ['I', 0, 1], ['L', 0, 3], ['I', 1, 1]],
  [['L', 0, 2], ['T', 2, 1], ['I', 1, 1], ['L', 3, 2]],
];
const SRC_ROW = 1; // 左から風が入る
const DST_ROW = 2; // 右から風車へ

export function pipePanel(ui, audio, { hasWind, onSolved }) {
  const rows = LAYOUT.length, cols = LAYOUT[0].length;
  const tiles = LAYOUT.map((r) => r.map(([k, sol, off]) => ({ base: BASE[k], r: (sol + off) % 4 })));
  const mask = (t) => rotN(t.base, t.r);
  let done = false;
  const body = el('div', 'pipep');
  body.innerHTML = `
    <p class="panel-note">パイプをクリックして回し、<b>風穴</b>から<b>大風車</b>まで風の道をつなごう。</p>
    <div class="pipe-wrap">
      <div class="pipe-io src" style="--row:${SRC_ROW}">🌬<small>風穴</small></div>
      <div class="pipe-grid" style="--cols:${cols}"></div>
      <div class="pipe-io dst" style="--row:${DST_ROW}">🌀<small>風車</small></div>
    </div>
    ${hasWind ? '' : '<p class="panel-note small warn">いまは風穴から風が来ていない……</p>'}`;
  const grid = body.querySelector('.pipe-grid');
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = el('button', 'pipe-cell');
      b.onclick = () => {
        if (done) return;
        tiles[r][c].r = (tiles[r][c].r + 1) % 4;
        audio.play('dial');
        paint();
      };
      grid.appendChild(b);
      cells.push(b);
    }
  }
  // 風の流れを調べる
  const flow = () => {
    const lit = new Set();
    let reached = false;
    if (!(mask(tiles[SRC_ROW][0]) & W)) return { lit, reached };
    const q = [[SRC_ROW, 0]];
    lit.add(`${SRC_ROW},0`);
    const dirs = [[N, -1, 0, S], [E, 0, 1, W], [S, 1, 0, N], [W, 0, -1, E]];
    while (q.length) {
      const [r, c] = q.shift();
      const m = mask(tiles[r][c]);
      if (r === DST_ROW && c === cols - 1 && (m & E)) reached = true;
      for (const [d, dr, dc, opp] of dirs) {
        if (!(m & d)) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!(mask(tiles[nr][nc]) & opp)) continue;
        const k = `${nr},${nc}`;
        if (!lit.has(k)) { lit.add(k); q.push([nr, nc]); }
      }
    }
    return { lit, reached };
  };
  const svgFor = (m, on) => {
    const col = on ? (hasWind ? '#5ad8ff' : '#e8c86a') : '#9a8a6a';
    const seg = [];
    if (m & N) seg.push('M32 32 L32 0');
    if (m & E) seg.push('M32 32 L64 32');
    if (m & S) seg.push('M32 32 L32 64');
    if (m & W) seg.push('M32 32 L0 32');
    return `<svg viewBox="0 0 64 64"><path d="${seg.join(' ')}" stroke="#5a4a3a" stroke-width="18" stroke-linecap="square" fill="none"/>
      <path d="${seg.join(' ')}" stroke="${col}" stroke-width="11" stroke-linecap="square" fill="none"/>
      ${m ? `<circle cx="32" cy="32" r="9" fill="${col}" stroke="#5a4a3a" stroke-width="3"/>` : ''}</svg>`;
  };
  const paint = () => {
    const { lit, reached } = flow();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      cells[r * cols + c].innerHTML = svgFor(mask(tiles[r][c]), lit.has(`${r},${c}`));
    }
    body.querySelector('.dst').classList.toggle('on', reached);
    if (reached && !done) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      setTimeout(() => onSolved(panel), 900);
    }
  };
  const panel = ui.openPanel({ title: '風の配管盤', body, cls: 'wide' });
  paint();
  return panel;
}
