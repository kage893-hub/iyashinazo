import { el } from '../../core/ui.js';

// 寂れた温泉街の謎解きパネル（HTML）

export const YAGURA_CHARS = ['ゆ', 'げ', 'の', 'さ', 'と', '湯', '灯', '火', '宿'];

/**
 * 提灯やぐら（3×3）：ひとつに火を入れると、上下左右のとなりも切りかわる。
 * 9つ全部ともせば成功。
 */
export function yaguraPanel(ui, audio, { onChange, onSolved }) {
  let on = Array(9).fill(false);
  let done = false;
  const body = el('div', 'yagurap');
  body.innerHTML = `
    <div class="plaque">からくり提灯やぐら<br><small>ひとつに火を入れると、上下左右のとなりも入れかわる。<br>九つ すべてを灯せ。</small></div>
    <div class="yg-grid"></div>
    <div class="yg-foot"><span class="yg-count"></span><button class="btn small-btn reset">ぜんぶ消す</button></div>`;
  const grid = body.querySelector('.yg-grid');
  const cells = YAGURA_CHARS.map((ch, i) => {
    const b = el('button', 'yg-cell', `<span class="yg-lamp">${ch}</span>`);
    b.onclick = () => {
      if (done) return;
      const r = Math.floor(i / 3), c = i % 3;
      for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) on[nr * 3 + nc] = !on[nr * 3 + nc];
      }
      audio.play('dial');
      paint();
    };
    grid.appendChild(b);
    return b;
  });
  const paint = () => {
    cells.forEach((b, i) => b.classList.toggle('lit', on[i]));
    const n = on.filter(Boolean).length;
    body.querySelector('.yg-count').textContent = `灯った提灯：${n} / 9`;
    onChange && onChange(on);
    if (n === 9 && !done) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      setTimeout(() => onSolved(panel), 900);
    }
  };
  body.querySelector('.reset').onclick = () => { on = Array(9).fill(false); audio.play('click'); paint(); };
  const panel = ui.openPanel({ title: '提灯やぐら', body });
  paint();
  return panel;
}

/**
 * 湯分けの升：五合升と三合升で、ちょうど四合の湯を樋へ流す（水差しパズル）
 */
export function masuPanel(ui, audio, { onSolved }) {
  const CAP = { a: 5, b: 3 };
  let v = { a: 0, b: 0 };
  let done = false;
  let moves = 0;
  const body = el('div', 'masup');
  body.innerHTML = `
    <div class="plaque">湯の神さまへ<br><b>ちょうど 四合</b> の湯を、樋に流すべし。</div>
    <div class="masu-row">
      <div class="masu" data-k="a"><div class="masu-box"><div class="masu-water"></div><div class="masu-lines"></div></div><div class="masu-name">五合升</div><div class="masu-val"></div>
        <div class="masu-btns"><button class="btn small-btn" data-act="fill">汲む</button><button class="btn small-btn" data-act="pour">↔ 移す</button><button class="btn small-btn" data-act="empty">捨てる</button></div></div>
      <div class="masu" data-k="b"><div class="masu-box"><div class="masu-water"></div><div class="masu-lines"></div></div><div class="masu-name">三合升</div><div class="masu-val"></div>
        <div class="masu-btns"><button class="btn small-btn" data-act="fill">汲む</button><button class="btn small-btn" data-act="pour">↔ 移す</button><button class="btn small-btn" data-act="empty">捨てる</button></div></div>
    </div>
    <button class="btn primary flow">🌊 五合升の湯を樋へ流す</button>
    <p class="panel-note small msg">湯口から汲めるのは、升いっぱいまで。</p>`;
  const msg = body.querySelector('.msg');
  const paint = () => {
    for (const k of ['a', 'b']) {
      const box = body.querySelector(`.masu[data-k="${k}"]`);
      box.querySelector('.masu-water').style.height = `${(v[k] / CAP[k]) * 100}%`;
      box.querySelector('.masu-val').textContent = `${v[k]} / ${CAP[k]} 合`;
      box.querySelector('.masu-lines').innerHTML = Array.from({ length: CAP[k] - 1 }, (_, i) => `<i style="bottom:${((i + 1) / CAP[k]) * 100}%"></i>`).join('');
    }
  };
  body.querySelectorAll('.masu').forEach((m) => {
    const k = m.dataset.k, o = k === 'a' ? 'b' : 'a';
    m.querySelectorAll('[data-act]').forEach((btn) => {
      btn.onclick = () => {
        if (done) return;
        const act = btn.dataset.act;
        if (act === 'fill') { v[k] = CAP[k]; audio.play('water'); }
        if (act === 'empty') { v[k] = 0; audio.play('splash'); }
        if (act === 'pour') {
          const n = Math.min(v[k], CAP[o] - v[o]);
          v[k] -= n; v[o] += n;
          audio.play('splash');
        }
        moves++;
        msg.textContent = `手数：${moves}`;
        paint();
      };
    });
  });
  body.querySelector('.flow').onclick = () => {
    if (done) return;
    if (v.a === 4) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = 'ちょうど四合！ 湯口がごうごうと鳴りはじめた……';
      setTimeout(() => onSolved(panel), 1100);
    } else {
      audio.play('wrong');
      msg.textContent = v.a === 0 ? '五合升はからっぽだ。' : `${v.a} 合では、湯の神さまは納得しないようだ……（湯はもとに戻った）`;
      v = { a: 0, b: 0 };
      paint();
      body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
    }
  };
  const panel = ui.openPanel({ title: '湯分けの升', body });
  paint();
  return panel;
}
