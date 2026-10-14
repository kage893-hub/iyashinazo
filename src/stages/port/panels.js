import { el } from '../../core/ui.js';
import { TIDE_NAME } from './diorama.js';

// 潮の港町の謎解きパネル（HTML）

// ---------------------------------------------------------------
// 郵便の仕分け：宛名がにじんだ郵便を、中身の手がかりから正しい宛先へ
// ---------------------------------------------------------------
export const MAIL_DEST = [
  { id: 'shed', icon: '⚓', name: '網小屋' },
  { id: 'market', icon: '🐟', name: '魚市場' },
  { id: 'clock', icon: '☾', name: '潮見やぐら' },
  { id: 'light', icon: '✦', name: '灯台' },
];
export const MAIL = [
  { id: 'a', kind: '小包', feel: 'ずっしり重い。ふると、カチャリと金属の音。', text: '「ご注文の品です。歯の数は二十八。月がひとめぐりする日数に、ぴたりと合わせました。」', to: 'clock' },
  { id: 'b', kind: 'はがき', feel: 'すみっこが少しつめたい。', text: '「あすの朝いち、冷たいのを三箱とどけます。とけないうちに、ならべてね。　―北の氷屋より」', to: 'market' },
  { id: 'c', kind: '小包', feel: 'やわらかくて、ほんのり油のにおい。', text: '「夜どおし燃えても、すすの出にくい品です。夜の海を、どうぞあかるく。」', to: 'light' },
  { id: 'd', kind: 'はがき', feel: '細い糸くずがくっついている。', text: '「目のあらくなったところを、これでつくろってください。糸は三巻き入れておきます。」', to: 'shed' },
];

export function mailPanel(ui, audio, { onSolved }) {
  const put = {}; // mail id → dest id
  let picked = null;
  let done = false;
  const body = el('div', 'mailp');
  body.innerHTML = `
    <div class="plaque">満潮のしぶきで、宛名がにじんでしまった郵便。<br><small>郵便を選んでから、宛先のポストを押そう。中身の手がかりがたより。</small></div>
    <div class="ml-list"></div>
    <div class="ml-dests"></div>
    <div class="ml-foot"><button class="btn primary ml-check">仕分けおわり！</button></div>
    <p class="panel-note small ml-msg">4通ぜんぶ、宛先を決めよう。</p>`;
  const list = body.querySelector('.ml-list');
  const dests = body.querySelector('.ml-dests');
  const msg = body.querySelector('.ml-msg');
  const cards = MAIL.map((m) => {
    const b = el('button', 'ml-card');
    b.innerHTML = `<div class="ml-top"><span class="ml-kind">${m.kind}</span><span class="ml-smudge">宛名：<i>〜〜〜</i></span><span class="ml-to"></span></div>
      <div class="ml-feel">${m.feel}</div><div class="ml-text">${m.text}</div>`;
    b.onclick = () => { if (done) return; picked = picked === m.id ? null : m.id; audio.play('paper'); paint(); };
    list.appendChild(b);
    return b;
  });
  const destBtns = MAIL_DEST.map((d) => {
    const b = el('button', 'ml-dest');
    b.innerHTML = `<span class="ml-ic">${d.icon}</span>${d.name}`;
    b.onclick = () => {
      if (done) return;
      if (!picked) { msg.textContent = 'まず、郵便を1通選ぼう。'; return; }
      for (const k of Object.keys(put)) if (put[k] === d.id) delete put[k];
      put[picked] = d.id;
      picked = null;
      audio.play('dial');
      paint();
    };
    dests.appendChild(b);
    return b;
  });
  const paint = () => {
    MAIL.forEach((m, i) => {
      cards[i].classList.toggle('picked', picked === m.id);
      const d = MAIL_DEST.find((x) => x.id === put[m.id]);
      cards[i].querySelector('.ml-to').textContent = d ? `→ ${d.icon} ${d.name}` : '';
      cards[i].classList.toggle('set', !!d);
    });
    destBtns.forEach((b, i) => b.classList.toggle('used', Object.values(put).includes(MAIL_DEST[i].id)));
  };
  body.querySelector('.ml-check').onclick = () => {
    if (done) return;
    if (Object.keys(put).length < MAIL.length) { msg.textContent = 'まだ宛先の決まっていない郵便がある。'; audio.play('wrong'); return; }
    const ok = MAIL.filter((m) => put[m.id] === m.to).length;
    if (ok === MAIL.length) {
      done = true;
      body.classList.add('solved');
      audio.play('solve');
      msg.textContent = 'ぜんぶ正しい宛先に仕分けできた！';
      setTimeout(() => onSolved(panel), 1100);
      return;
    }
    audio.play('wrong');
    msg.textContent = `タコ「うーん、${ok}通は合ってると思うけど……」`;
    body.classList.remove('shake'); void body.offsetWidth; body.classList.add('shake');
  };
  const panel = ui.openPanel({ title: '郵便の仕分け', body, cls: 'wide' });
  paint();
  return panel;
}

// ---------------------------------------------------------------
// 潮時計：満潮・中潮・干潮を選ぶ
// ---------------------------------------------------------------
export function tidePanel(ui, audio, { current, onSet }) {
  const body = el('div', 'tidep');
  body.innerHTML = `
    <div class="plaque">潮時計<br><small>針を合わせると、港の潮がそのとおりに満ち引きする。</small></div>
    <div class="td-btns"></div>
    <p class="panel-note small">いまは <b>${TIDE_NAME[current]}</b>。</p>`;
  const box = body.querySelector('.td-btns');
  const info = [
    [2, '満潮', '🌊🌊🌊', '海がいちばん高い'],
    [1, '中潮', '🌊🌊', 'まんなかの高さ'],
    [0, '干潮', '🌊', '海がいちばん低い'],
  ];
  let panel = null;
  for (const [lv, name, waves, desc] of info) {
    const b = el('button', `td-btn${lv === current ? ' cur' : ''}`);
    b.innerHTML = `<span class="td-w">${waves}</span><b>${name}</b><small>${desc}</small>`;
    b.onclick = () => {
      if (lv === current) { panel.close(); return; }
      audio.play('crank');
      panel.close();
      onSet(lv);
    };
    box.appendChild(b);
  }
  panel = ui.openPanel({ title: '潮時計', body });
  return panel;
}

// ---------------------------------------------------------------
// 灯台のレンズ：三つの輪を回して、金のしるしを海のほうへそろえる
// ボタンはどれも「二つの輪」をいっしょに回してしまう
// ---------------------------------------------------------------
export const LENS_START = [4, 3, 5]; // 外・中・内（0 がそろった位置）
const LENS_BTNS = [
  { label: '外と中', rings: [0, 1] },
  { label: '中と内', rings: [1, 2] },
  { label: '内と外', rings: [2, 0] },
];

export function lensPanel(ui, audio, { onSolved }) {
  let pos = [...LENS_START];
  let turns = [0, 0, 0]; // 見た目の回転（ぐるっと回りすぎないよう累積）
  let done = false;
  const body = el('div', 'lensp');
  const R = [92, 66, 40];
  const ring = (i) => `
    <g class="ln-ring ln-r${i}">
      <circle cx="110" cy="118" r="${R[i]}" fill="none" stroke="${['#7ab0d8', '#a8cce8', '#d4e8f4'][i]}" stroke-width="20"/>
      <circle cx="110" cy="118" r="${R[i]}" fill="none" stroke="#2a5aa0" stroke-width="1.5" stroke-dasharray="3 9"/>
      <path d="M110 ${118 - R[i] - 9} l7 9 l-7 9 l-7 -9 z" fill="#f0c040" stroke="#8a6416" stroke-width="1.5"/>
    </g>`;
  body.innerHTML = `
    <div class="plaque">灯台のレンズ<br><small>三つの輪の金のしるしを、ぜんぶ上の「海」にそろえよう。<br>ボタンはどれも、二つの輪をいっしょに回してしまう。</small></div>
    <div class="ln-wrap">
      <svg viewBox="0 0 220 230" class="ln-svg">
        <text x="110" y="12" text-anchor="middle" font-size="12" font-weight="900" fill="#2a5aa0">▼ 海</text>
        ${ring(0)}${ring(1)}${ring(2)}
        <circle cx="110" cy="118" r="16" fill="#fff8e0" stroke="#d8b04a" stroke-width="3" class="ln-core"/>
      </svg>
    </div>
    <div class="ln-btns"></div>
    <button class="btn small-btn ln-reset">はじめから</button>
    <p class="panel-note small ln-msg">ひと押しで、60°ずつ右へ回る。</p>`;
  const groups = [0, 1, 2].map((i) => body.querySelector(`.ln-r${i}`));
  const msg = body.querySelector('.ln-msg');
  const paint = () => {
    groups.forEach((g, i) => { g.style.transform = `rotate(${(pos[i] + turns[i] * 6) * 60}deg)`; });
    const ok = pos.filter((p) => p === 0).length;
    msg.textContent = done ? 'カチリ。レンズの輪がぴたりとそろった！' : `そろっている輪：${ok} / 3`;
  };
  const box = body.querySelector('.ln-btns');
  for (const b of LENS_BTNS) {
    const btn = el('button', 'btn ln-btn');
    btn.textContent = `⟳ ${b.label}`;
    btn.onclick = () => {
      if (done) return;
      for (const r of b.rings) { pos[r] += 1; if (pos[r] >= 6) { pos[r] -= 6; turns[r] += 1; } }
      audio.play('dial');
      paint();
      if (pos.every((p) => p === 0)) {
        done = true;
        body.classList.add('solved');
        audio.play('solve');
        paint();
        setTimeout(() => onSolved(panel), 1300);
      }
    };
    box.appendChild(btn);
  }
  body.querySelector('.ln-reset').onclick = () => {
    if (done) return;
    pos = [...LENS_START];
    audio.play('click');
    paint();
  };
  const panel = ui.openPanel({ title: '灯台のレンズ', body });
  paint();
  return panel;
}
