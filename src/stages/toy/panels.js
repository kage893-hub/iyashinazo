import { el } from '../../core/ui.js';
import { MAZE, NOTE_COLORS, SCORE } from './diorama.js';

// からくりおもちゃの街の謎解きパネル（HTML）

// ---------------------------------------------------------------
// 歯車の塔：大ゼンマイ（歯12・右回り）から、時計の針の歯車まで
//  ・かみあう歯車は、となりと反対に回る
//  ・回る速さは、はじめと終わりの歯の数だけで決まる（あいだの歯車は向きだけ変える）
//  答え：あいだの歯車が奇数こ（1か3）、針の歯車は歯24
// ---------------------------------------------------------------
export const MOTOR_TEETH = 12;
const STOCK = { 8: 2, 12: 1, 24: 2 };

function gearSVG(n, r, color) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    for (const [k, rr] of [[0, 0.82], [0.25, 1], [0.5, 1], [0.75, 0.82]]) {
      const a = ((i + k) / n) * Math.PI * 2;
      pts.push(`${(Math.cos(a) * r * rr).toFixed(1)},${(Math.sin(a) * r * rr).toFixed(1)}`);
    }
  }
  return `<polygon points="${pts.join(' ')}" fill="${color}" stroke="#5a3a14" stroke-width="1.5"/><circle r="${(r * 0.22).toFixed(1)}" fill="#f8f0d8" stroke="#5a3a14" stroke-width="1.5"/><line x1="0" y1="0" x2="${(r * 0.6).toFixed(1)}" y2="0" stroke="#5a3a14" stroke-width="3" stroke-linecap="round"/>`;
}
const R_OF = (n) => n * 2.1 + 7;

export function gearPanel(ui, audio, { onSolved, onTest }) {
  let mids = [null, null, null];
  let hand = 12;
  let done = false;
  let anim = null;
  const body = el('div', 'gearp');
  body.innerHTML = `
    <div class="plaque">時計塔の歯車<br><small>「かみあう歯車は、となりと<b>反対</b>に回る」<br>時計の針：<b>右回り</b>に、大ゼンマイが<b>2回</b>まわるあいだに<b>1回</b>。</small></div>
    <svg class="gr-svg" viewBox="0 0 340 150"></svg>
    <div class="gr-row gr-mids"></div>
    <div class="gr-row gr-hand"></div>
    <div class="gr-stock"></div>
    <div class="ml-foot"><button class="btn primary gr-go">回してみる</button></div>
    <p class="panel-note small gr-msg">あいだの歯車を、左からはめていこう。</p>`;
  const svg = body.querySelector('.gr-svg');
  const msg = body.querySelector('.gr-msg');
  const midsEl = body.querySelector('.gr-mids');
  const handEl = body.querySelector('.gr-hand');
  const stockEl = body.querySelector('.gr-stock');
  const chain = () => { const c = []; for (const m of mids) { if (!m) break; c.push(m); } return c; };
  const used = () => { const u = { 8: 0, 12: 0, 24: 0 }; for (const m of chain()) u[m]++; u[hand]++; return u; };
  const midBtns = mids.map((_, i) => {
    const b = el('button', 'btn small-btn');
    b.onclick = () => {
      if (done) return;
      const order = [null, 8, 12, 24];
      let k = order.indexOf(mids[i]);
      for (let t = 0; t < 4; t++) {
        k = (k + 1) % 4;
        mids[i] = order[k];
        const u = used();
        if (!mids[i] || u[mids[i]] <= STOCK[mids[i]]) break;
      }
      audio.play('click');
      paint();
    };
    midsEl.appendChild(b);
    return b;
  });
  handEl.insertAdjacentHTML('beforeend', '<span class="gr-lbl">針の歯車：</span>');
  const handBtns = [8, 12, 24].map((n) => {
    const b = el('button', 'btn small-btn', `歯 ${n}`);
    b.onclick = () => { if (done) return; hand = n; audio.play('click'); paint(); };
    handEl.appendChild(b);
    return [n, b];
  });
  const layout = () => {
    const list = [MOTOR_TEETH, ...chain(), hand];
    let x = 10;
    return list.map((n, i) => {
      const r = R_OF(n);
      if (i === 0) x += r; else x += R_OF(list[i - 1]) + r - 2;
      return { n, r, x, y: 70 };
    });
  };
  let angle = 0;
  const draw = () => {
    const L = layout();
    const width = L[L.length - 1].x + L[L.length - 1].r + 10;
    const scale = Math.min(1, 330 / width);
    const ox = (340 - width * scale) / 2;
    let html = `<g transform="translate(${ox}, ${(1 - scale) * 62}) scale(${scale})">`;
    L.forEach((g, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const a = (angle * MOTOR_TEETH / g.n) * dir * (180 / Math.PI);
      const col = i === 0 ? '#e2b54a' : i === L.length - 1 ? '#c8ccd4' : '#e8c25a';
      html += `<g transform="translate(${g.x},${g.y}) rotate(${a.toFixed(1)})">${gearSVG(g.n, g.r, col)}</g>`;
      if (i === 0) html += `<text x="${g.x}" y="${g.y + g.r + 14}" text-anchor="middle" class="gr-t">大ゼンマイ</text>`;
      if (i === L.length - 1) html += `<text x="${g.x}" y="${g.y + g.r + 14}" text-anchor="middle" class="gr-t">針</text>`;
    });
    html += '</g>';
    svg.innerHTML = html;
  };
  const paint = () => {
    const c = chain();
    midBtns.forEach((b, i) => {
      const active = i <= c.length;
      b.textContent = mids[i] ? `あいだ${i + 1}：歯 ${mids[i]}` : `あいだ${i + 1}：なし`;
      b.disabled = !active;
      b.classList.toggle('on', !!mids[i] && i < c.length);
    });
    handBtns.forEach(([n, b]) => b.classList.toggle('on', n === hand));
    const u = used();
    stockEl.innerHTML = '歯車箱：' + [8, 12, 24].map((n) => `<span class="${u[n] > STOCK[n] ? 'over' : ''}">歯${n}×${STOCK[n] - u[n]}</span>`).join('');
    draw();
  };
  body.querySelector('.gr-go').onclick = () => {
    if (done || anim) return;
    const u = used();
    if ([8, 12, 24].some((n) => u[n] > STOCK[n])) { msg.textContent = '歯車箱の歯車が足りない。'; audio.play('wrong'); return; }
    const m = chain().length;
    const handDir = m % 2 === 1 ? '右回り' : '左回り';
    const ratio = MOTOR_TEETH / hand;
    audio.play('crank');
    const t0 = performance.now();
    anim = setInterval(() => {
      angle = ((performance.now() - t0) / 1000) * 2.2;
      draw();
      if (performance.now() - t0 > 2400) {
        clearInterval(anim); anim = null;
        onTest && onTest({ m, hand });
        const rText = ratio === 0.5 ? '2回まわるあいだに1回' : ratio === 1 ? '1回まわるあいだに1回' : ratio > 1 ? `1回まわるあいだに${ratio}回` : `${1 / ratio}回まわるあいだに1回`;
        if (m % 2 === 1 && hand === 24) {
          done = true;
          body.classList.add('solved');
          audio.play('solve');
          msg.textContent = 'カチ、カチ……針が右回りに、ゆっくり動きだした！';
          setTimeout(() => onSolved(panel), 1300);
          return;
        }
        audio.play('wrong');
        msg.textContent = `針は${handDir}。大ゼンマイが${rText}。${m % 2 === 1 ? '' : '……向きが反対だ。'}${hand === 24 ? '' : '速さがちがう。'}`;
      }
    }, 40);
  };
  const panel = ui.openPanel({ title: '歯車の塔', body, onClose: () => { if (anim) clearInterval(anim); } });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// オルゴール：8つの音にピンを打って、街の歌をとりもどす
// ---------------------------------------------------------------
export const NOTE_NAMES = ['ド', 'レ', 'ミ', 'ソ', 'ラ'];
export const NOTE_MIDI = [72, 74, 76, 79, 81];
export const SONG = [...SCORE[0], ...SCORE[1]];

export function musicPanel(ui, audio, { onSolved, play }) {
  const pins = Array(8).fill(null);
  let done = false;
  const body = el('div', 'musicp');
  body.innerHTML = `
    <div class="plaque">オルゴールの太鼓<br><small>8つの音に、ピンを打とう。ひとつの列に、ピンはひとつ。</small></div>
    <div class="mu-grid"></div>
    <div class="ml-foot"><button class="btn small-btn mu-play">♪ 鳴らしてみる</button> <button class="btn primary mu-go">これで決める</button></div>
    <p class="panel-note small mu-msg">楽譜は、積み木の色の並び。どの色がどの音かは……？</p>`;
  const grid = body.querySelector('.mu-grid');
  const msg = body.querySelector('.mu-msg');
  const cells = [];
  for (let row = 4; row >= 0; row--) {
    grid.appendChild(el('div', 'mu-lbl', NOTE_NAMES[row]));
    for (let col = 0; col < 8; col++) {
      const b = el('button', 'mu-c');
      b.onclick = () => {
        if (done) return;
        pins[col] = pins[col] === row ? null : row;
        if (pins[col] != null) play([NOTE_MIDI[row]]);
        paint();
      };
      grid.appendChild(b);
      cells.push({ b, row, col });
    }
  }
  const paint = () => cells.forEach(({ b, row, col }) => b.classList.toggle('pin', pins[col] === row));
  body.querySelector('.mu-play').onclick = () => { play(pins.map((p) => (p == null ? null : NOTE_MIDI[p]))); };
  body.querySelector('.mu-go').onclick = () => {
    if (done) return;
    if (pins.some((p) => p == null)) { msg.textContent = 'まだピンのない列がある。'; audio.play('wrong'); return; }
    const ok = pins.filter((p, i) => p === SONG[i]).length;
    if (ok === 8) {
      done = true;
      body.classList.add('solved');
      play(SONG.map((k) => NOTE_MIDI[k]));
      msg.textContent = '♪ ……街の歌だ！ ウサギが、うれしそうにくるりと回った。';
      setTimeout(() => onSolved(panel), 3200);
      return;
    }
    audio.play('wrong');
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    msg.textContent = `ウサギ「うーん……8つのうち、${ok}つは あってる気がする」`;
  };
  const panel = ui.openPanel({ title: 'オルゴール', body });
  paint();
  return panel;
}

/** 楽譜の積み木（メモ用の HTML） */
export const scoreHTML = (i) => `<span class="sc-die">${i === 0 ? '⚀' : '⚁'}</span>${SCORE[i].map((k) => `<span class="sc-b" style="background:${NOTE_COLORS[k]}"></span>`).join('')}`;

// ---------------------------------------------------------------
// ゼンマイ行進：矢印タイルを置いて、巻く回数を決める
//  ・ネズミはまっすぐ歩き、矢印タイルの上で、その向きに曲がる
//  ・1巻き＝1歩。ちょうどハンドルの上で止まれば成功
// ---------------------------------------------------------------
const DIRS = { N: [0, -1, '↑'], E: [1, 0, '→'], S: [0, 1, '↓'], W: [-1, 0, '←'] };
const CYCLE = [null, 'N', 'E', 'S', 'W'];
export const MAX_TILES = 3;

export function simulateMarch(tiles, n) {
  let x = 2, y = 4, d = 'N';
  const path = [];
  for (let i = 0; i < n; i++) {
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (nx < 0 || nx > 4 || ny < 0 || ny > 4 || MAZE[ny][nx] === '#') return { path, end: 'bump' };
    x = nx; y = ny;
    if (tiles[`${x},${y}`]) d = tiles[`${x},${y}`];
    path.push([x, y]);
    if (MAZE[y][x] === 'G' && i < n - 1) return { path, end: 'pass' };
  }
  return { path, end: MAZE[y][x] === 'G' ? 'goal' : 'short' };
}

export function marchPanel(ui, audio, { onSolved }) {
  const tiles = {};
  let winds = 3;
  let done = false, running = false;
  const body = el('div', 'marchp');
  body.innerHTML = `
    <div class="plaque">ゼンマイ行進<br><small>ネズミは<b>まっすぐ</b>歩き、<b>矢印タイル</b>の上でその向きに曲がる。<br><b>1巻き＝1歩</b>。ちょうどハンドルの上で止まろう。</small></div>
    <div class="mc-grid"></div>
    <div class="mc-row"><span class="mc-tiles"></span></div>
    <div class="mc-row">ゼンマイ <button class="btn small-btn mc-minus">−</button><b class="mc-n"></b>巻き<button class="btn small-btn mc-plus">＋</button></div>
    <div class="ml-foot"><button class="btn small-btn mc-reset">タイルをはがす</button> <button class="btn primary mc-go">歩かせる</button></div>
    <p class="panel-note small mc-msg">マスを押すと、矢印タイルの向きが変わる。</p>`;
  const grid = body.querySelector('.mc-grid');
  const msg = body.querySelector('.mc-msg');
  const cells = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
    const ch = MAZE[y][x];
    const b = el('button', `mc-c ${ch === '#' ? 'wall' : ''} ${ch === 'S' ? 'start' : ''} ${ch === 'G' ? 'goal' : ''}`);
    b.onclick = () => {
      if (done || running || ch !== '.') return;
      const k = `${x},${y}`;
      let i = CYCLE.indexOf(tiles[k] || null);
      i = (i + 1) % CYCLE.length;
      if (!tiles[k] && Object.keys(tiles).length >= MAX_TILES) { msg.textContent = `矢印タイルは ${MAX_TILES}まいまで。`; audio.play('wrong'); return; }
      if (CYCLE[i]) tiles[k] = CYCLE[i]; else delete tiles[k];
      audio.play('click');
      paint();
    };
    grid.appendChild(b);
    cells.push({ b, x, y, ch });
  }
  const paint = (mouseAt = [2, 4], trail = []) => {
    cells.forEach(({ b, x, y, ch }) => {
      const k = `${x},${y}`;
      const t = tiles[k];
      const here = mouseAt[0] === x && mouseAt[1] === y;
      b.innerHTML = here ? '🐭' : t ? DIRS[t][2] : ch === 'G' ? '🔧' : ch === '#' ? '' : '';
      b.classList.toggle('tile', !!t);
      b.classList.toggle('trail', trail.some(([a, c]) => a === x && c === y));
    });
    body.querySelector('.mc-n').textContent = winds;
    body.querySelector('.mc-tiles').textContent = `矢印タイル：のこり ${MAX_TILES - Object.keys(tiles).length}まい`;
  };
  body.querySelector('.mc-minus').onclick = () => { if (done || running) return; winds = Math.max(1, winds - 1); audio.play('dial'); paint(); };
  body.querySelector('.mc-plus').onclick = () => { if (done || running) return; winds = Math.min(10, winds + 1); audio.play('dial'); paint(); };
  body.querySelector('.mc-reset').onclick = () => { if (done || running) return; for (const k of Object.keys(tiles)) delete tiles[k]; audio.play('click'); paint(); };
  body.querySelector('.mc-go').onclick = () => {
    if (done || running) return;
    running = true;
    audio.play('crank');
    const res = simulateMarch(tiles, winds);
    let i = 0;
    const step = () => {
      if (i < res.path.length) {
        paint(res.path[i], res.path.slice(0, i));
        audio.play('dial');
        i++;
        setTimeout(step, 320);
        return;
      }
      running = false;
      if (res.end === 'goal') {
        done = true;
        body.classList.add('solved');
        audio.play('solve');
        msg.textContent = 'カシャン！ ネズミがハンドルの上で、ぴたりと止まった！';
        setTimeout(() => onSolved(panel, { tiles: { ...tiles }, path: res.path }), 1200);
        return;
      }
      audio.play('wrong');
      msg.textContent = { bump: 'ゴツン！ 積み木にぶつかって止まった。', pass: 'ハンドルの上を通りすぎて……行きすぎた！', short: 'ゼンマイがほどけて、とちゅうで止まった。' }[res.end];
      setTimeout(() => paint(), 900);
    };
    step();
  };
  const panel = ui.openPanel({ title: 'つみきめいろ', body });
  paint();
  return panel;
}
