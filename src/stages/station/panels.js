import { el } from '../../core/ui.js';

// はざま駅の謎解きパネル（HTML）

export function timetableHTML() {
  return `
  <div class="timetable">
    <div class="tt-head">発車時刻表 <small>はざま駅</small></div>
    <table>
      <tr><td class="tt-time">3:00</td><td><span class="tt-ico">☁</span>きりのもり ゆき</td></tr>
      <tr><td class="tt-time">5:00</td><td><span class="tt-ico">🪷</span>かえるぬま ゆき</td></tr>
      <tr class="tt-hl"><td class="tt-time"><span class="smudge">?</span>:00</td><td><span class="tt-ico">★</span>てんくうのまち ゆき <small>（ほしまわり号）</small></td></tr>
      <tr><td class="tt-time">9:00</td><td><span class="tt-ico">☾</span>つきのうら ゆき</td></tr>
    </table>
    <div class="tt-note">📌 ほしまわり号は<br><b>かえるぬま行きの 3時間あと</b> に出ます。<br><span class="tt-sign">— 駅長</span></div>
    <p class="tt-foot">時刻の数字がにじんで読めない……</p>
  </div>`;
}

export function stationSignHTML() {
  return `
  <div class="ekimei">
    <div class="ek-main">はざま</div>
    <div class="ek-roma">HAZAMA</div>
    <div class="ek-bar"><span>← きりのもり</span><span>てんくうのまち →</span></div>
  </div>
  <p class="panel-note">いくつもの世界のあいだにある、小さな乗りかえ駅。</p>`;
}

/** 時計あわせ */
export function clockPanel(ui, audio, { onRing }) {
  let hour = 12;
  const body = el('div', 'clockp');
  body.innerHTML = `
    <p class="panel-note">針を動かして、鐘を鳴らそう。</p>
    <svg viewBox="-110 -110 220 220" class="clock-svg">
      <circle r="104" fill="#5b3a29"/><circle r="94" fill="#fbf3df"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
        return `<text x="${Math.cos(a) * 74}" y="${Math.sin(a) * 74 + 7}" text-anchor="middle" font-size="20" font-weight="700" fill="#3a2a1c">${i + 1}</text>`;
      }).join('')}
      <g class="hand-h"><rect x="-4" y="-50" width="8" height="56" rx="4" fill="#2a1d14"/></g>
      <rect x="-2.5" y="-80" width="5" height="86" rx="2.5" fill="#2a1d14"/>
      <circle r="7" fill="#d8b25a"/>
    </svg>
    <div class="clock-ctrl">
      <button class="btn" data-d="-1">◀ もどす</button>
      <div class="clock-read"><span class="hh">12</span>:00</div>
      <button class="btn" data-d="1">すすめる ▶</button>
    </div>
    <button class="btn primary ring">🔔 鐘を鳴らす</button>`;
  const hand = body.querySelector('.hand-h');
  const read = body.querySelector('.hh');
  const update = () => {
    hand.style.transform = `rotate(${(hour % 12) * 30}deg)`;
    read.textContent = hour;
  };
  body.querySelectorAll('[data-d]').forEach((b) => {
    b.onclick = () => {
      hour = ((hour - 1 + Number(b.dataset.d) + 12) % 12) + 1;
      audio.play('dial');
      update();
    };
  });
  update();
  const panel = ui.openPanel({ title: '壁掛け時計', body });
  body.querySelector('.ring').onclick = () => onRing(hour, panel);
  return panel;
}

/** 三色の錠前 */
export const LOCK_COLORS = [
  { name: '赤', c: '#e8443a' },
  { name: '青', c: '#3a7ee8' },
  { name: '黄', c: '#f2c33a' },
  { name: '緑', c: '#4ab06a' },
  { name: '白', c: '#f4f1ea' },
];

export function lockPanel(ui, audio, { onTry }) {
  const state = [4, 4, 4];
  const body = el('div', 'lockp');
  body.innerHTML = `
    <div class="plaque">合言葉は「駅の顔」にある<br>三つの丸窓の色。<b>左から</b>順に。</div>
    <div class="dials"></div>
    <button class="btn primary try">🔓 あける</button>`;
  const dials = body.querySelector('.dials');
  const btns = state.map((_, i) => {
    const b = el('button', 'dial');
    b.onclick = () => {
      state[i] = (state[i] + 1) % LOCK_COLORS.length;
      audio.play('dial');
      paint();
    };
    dials.appendChild(b);
    return b;
  });
  const paint = () => btns.forEach((b, i) => {
    const c = LOCK_COLORS[state[i]];
    b.style.setProperty('--c', c.c);
    b.innerHTML = `<span class="dial-ring"></span><span class="dial-name">${c.name}</span>`;
  });
  paint();
  const panel = ui.openPanel({ title: '倉庫の錠前', body });
  body.querySelector('.try').onclick = () => {
    const ok = onTry(state.map((s) => LOCK_COLORS[s].name), panel);
    if (!ok) {
      body.classList.remove('shake');
      void body.offsetWidth;
      body.classList.add('shake');
    }
  };
  return panel;
}

/** 信号所のレバー */
export const LEVERS = [
  { id: 'moon', label: 'つきのうら', ico: '☾' },
  { id: 'fog', label: 'きりのもり', ico: '☁' },
  { id: 'sky', label: 'てんくうのまち', ico: '★' },
  { id: 'frog', label: 'かえるぬま', ico: '🪷' },
];
export const LEVER_ANSWER = ['fog', 'frog', 'sky', 'moon'];

export function leverPanel(ui, audio, { onSolved, onFail }) {
  let seq = [];
  const body = el('div', 'leverp');
  body.innerHTML = `
    <div class="plaque">出発の<b>早い</b>列車の順に<br>レバーを倒すべし。</div>
    <div class="levers"></div>
    <p class="panel-note small">まちがえると、すべてのレバーが元にもどる。</p>`;
  const wrap = body.querySelector('.levers');
  const btns = LEVERS.map((L) => {
    const b = el('button', 'lever', `<span class="lv-stick"><span class="lv-knob"></span></span><span class="lv-ico">${L.ico}</span><span class="lv-label">${L.label}</span>`);
    b.onclick = async () => {
      if (b.classList.contains('down') || done) return;
      b.classList.add('down');
      audio.play('lever');
      seq.push(L.id);
      const ok = LEVER_ANSWER.slice(0, seq.length).every((v, i) => v === seq[i]);
      if (!ok) {
        busy(true);
        setTimeout(() => {
          audio.play('clunk');
          btns.forEach((x) => x.classList.remove('down'));
          seq = [];
          body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
          busy(false);
          onFail && onFail();
        }, 450);
      } else if (seq.length === LEVER_ANSWER.length) {
        done = true;
        setTimeout(() => onSolved(panel), 500);
      }
    };
    wrap.appendChild(b);
    return b;
  });
  let done = false;
  const busy = (on) => btns.forEach((b) => { b.disabled = on; });
  const panel = ui.openPanel({ title: '信号所のレバー', body });
  return panel;
}
