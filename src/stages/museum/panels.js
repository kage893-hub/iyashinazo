import { el } from '../../core/ui.js';

// 展示の掲示・旅のメモ・装置の中で、同じ手がかりを使う。
// パネルの途中経過は JSON にできる draft だけで復元できる。
const SVG_NS = 'http://www.w3.org/2000/svg';
let waterId = 0;
const symbolPaths = {
  shell: '<path d="M9 25Q3 12 15 7Q24 1 33 7Q45 12 39 25L30 39H18Z"/><path d="M24 8V37M15 12l6 25M33 12l-6 25M9 20l10 16M39 20L29 36M18 39h12"/>',
  fish: '<path d="M9 24Q22 5 38 24Q22 43 9 24L3 15v18Z"/><circle cx="31" cy="22" r="1.5"/><path d="M19 14l3 8-3 11M21 13l5-6 3 7"/>',
  leaf: '<path d="M9 37Q1 7 39 6Q43 39 9 37Z"/><path d="M7 41L34 12M15 33l-3-12M22 26l-2-11M22 26l12 1M15 33l13 1"/>',
  feather: '<path d="M10 38Q6 16 34 5Q45 26 10 38Z"/><path d="M6 43L34 10M14 33l-1-10M21 26l-1-11M21 26l11-1M14 33l13-1"/>',
  footprint: '<path d="M13 26q10-11 19 0q8 15-9 15Q6 41 13 26Z"/><ellipse cx="9" cy="17" rx="4" ry="6"/><ellipse cx="19" cy="10" rx="4" ry="6"/><ellipse cx="29" cy="10" rx="4" ry="6"/><ellipse cx="39" cy="18" rx="4" ry="6"/>',
  star: '<path d="m24 4 6 13 14 2-10 10 2 15-12-7-13 7 3-15L3 19l15-2Z"/><path d="M24 13v16m-7-7h14"/>',
};

export function museumSymbol(id, size = 40) {
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${symbolPaths[id] || symbolPaths.star}</svg>`;
}

export const SEALS = {
  fossil: { icon: museumSymbol('shell'), name: '貝のしるし', clue: '南から、時計回りに2目盛。' },
  archive: { icon: museumSymbol('feather'), name: '羽のしるし', clue: '東から、反時計回りに1目盛。' },
  garden: { icon: museumSymbol('leaf'), name: '葉のしるし', clue: '西から、時計回りに2目盛。' },
  prism: { icon: museumSymbol('star'), name: '星のしるし', clue: '北から、時計回りに3目盛。' },
};
export const SEAL_ORDER = ['fossil', 'archive', 'garden', 'prism'];
export const FOSSILS = [
  { id: 'shell', name: '貝' }, { id: 'fish', name: '魚' }, { id: 'leaf', name: '葉' },
  { id: 'feather', name: '羽' }, { id: 'footprint', name: '足跡' },
];
export const FOSSIL_ANSWER = FOSSILS.map((f) => f.id);
const FOSSIL_START = ['feather', 'fish', 'footprint', 'shell', 'leaf'];

export function fossilClueHTML() {
  return `<section class="museum-clue"><h3>地層が覚えていること</h3>
    <div class="mu-strata-guide"><svg viewBox="0 0 180 100" role="img" aria-label="地層は下ほど古く、上ほど新しい。"><path d="M8 18h124v18H8z" fill="#d8c9a1"/><path d="M8 36h124v20H8z" fill="#b79f74"/><path d="M8 56h124v20H8z" fill="#958565"/><path d="M8 76h124v18H8z" fill="#756c58"/><path d="M148 86V18m-6 7 6-8 6 8" fill="none" stroke="#3b514d" stroke-width="3"/><text x="89" y="14" text-anchor="middle">上＝新しい</text><text x="89" y="92" text-anchor="middle" fill="#fff7df">下＝古い</text></svg>
    <p>この展示では、地層は<b>下ほど古く、上ほど新しい</b>。5つの化石は、それぞれ別の地層から見つかった。</p></div>
    <ul><li>魚は貝より新しく、葉より古い。</li><li>羽は、葉のすぐ上の地層にあった。</li><li>足跡は、いちばん新しい地層にあった。</li></ul></section>`;
}

export function prismClueHTML() {
  return `<section class="museum-clue"><h3>鏡の実験ノート</h3><p>光はまっすぐ進み、鏡で直角に曲がる。鏡を押すと、向きが「／」と「＼」に切りかわる。</p>
    <svg class="mu-reflection-guide" viewBox="0 0 360 96" role="img" aria-label="右向きの光は、斜線の鏡で上へ、逆斜線の鏡で下へ曲がる。"><g fill="none" stroke-linecap="round" stroke-width="3"><path d="M18 61h66V14m-6 7 6-8 6 8M200 32h66v47m-6-7 6 8 6-8" stroke="#a36a21"/><path d="m66 79 36-36m146-29 36 36" stroke="#456c79" stroke-width="5"/></g><g fill="#354b47" font-size="13"><text x="111" y="63">／の鏡</text><text x="291" y="38">＼の鏡</text></g></svg>
    <p><b>5枚すべての鏡</b>に光を当ててから、北側の<b>星の出口</b>へ。途中で盤の外に出たり、同じ所を回りつづけたりすると、星には届かない。</p></section>`;
}

export const ARCHIVE_NODES = [
  { id: 'sea', name: '貝の棚', x: 50, y: 50, shelf: 'shell' },
  { id: 'dome', name: '丸窓', x: 200, y: 50 },
  { id: 'bird', name: '羽の棚', x: 350, y: 50, shelf: 'feather' },
  { id: 'west', name: '西通路', x: 50, y: 150 },
  { id: 'center', name: '中央', x: 200, y: 150 },
  { id: 'east', name: '東通路', x: 350, y: 150 },
  { id: 'entry', name: '受付', x: 50, y: 250 },
  { id: 'exit', name: '搬出口', x: 200, y: 250 },
  { id: 'forest', name: '葉の棚', x: 350, y: 250, shelf: 'leaf' },
];
export const ARCHIVE_EDGES = [
  ['entry', 'west'], ['west', 'sea'], ['sea', 'dome'], ['dome', 'bird'], ['bird', 'east'],
  ['east', 'forest'], ['forest', 'exit'], ['west', 'center'], ['center', 'east'], ['center', 'exit'],
  ['sea', 'center', 'stairs'], ['dome', 'center', 'stairs'],
];
export const ARCHIVE_RULES = { from: 'entry', to: 'exit', via: ['sea', 'bird', 'forest'], maxSteps: 9 };
const nodeById = (id) => ARCHIVE_NODES.find((n) => n.id === id);
const archiveEdge = (a, b) => ARCHIVE_EDGES.find(([x, y]) => (a === x && b === y) || (a === y && b === x));

export function checkArchiveRoute(route) {
  const validArray = Array.isArray(route) && route.length > 0;
  const start = validArray && route[0] === ARCHIVE_RULES.from;
  const steps = validArray ? route.length - 1 : 0;
  let connected = validArray, stairs = false;
  if (validArray) for (let i = 1; i < route.length; i++) {
    const edge = archiveEdge(route[i - 1], route[i]);
    if (!edge) connected = false;
    if (edge?.[2] === 'stairs') stairs = true;
  }
  const missing = ARCHIVE_RULES.via.filter((id) => !validArray || !route.includes(id));
  const end = validArray && route[route.length - 1] === ARCHIVE_RULES.to;
  const tooLong = steps > ARCHIVE_RULES.maxSteps;
  return { ok: !!(start && connected && !stairs && !missing.length && end && !tooLong), start: !!start, connected: !!connected, stairs, missing, end: !!end, steps, tooLong };
}

export function archiveClueHTML() {
  return `<section class="museum-clue"><h3>夜の返却係へ</h3><p>受付の3冊を、表紙と同じ印の棚へ。<b>貝・羽・葉の棚をすべて通り、搬出口で返却を終える</b>こと。</p>
    <div class="mu-book-key">${[['shell', '貝の本 → 貝の棚'], ['feather', '羽の本 → 羽の棚'], ['leaf', '葉の本 → 葉の棚']].map(([id, label]) => `<span>${museumSymbol(id, 28)}${label}</span>`).join('')}</div>
    <ul><li>台車は<b>階段（点線）を通れない</b>。実線の通路を進もう。</li><li>バッテリーは<b>通路9本ぶん</b>。同じ通路を戻ると、もう1本として数える。</li><li>棚を通ると、その本は自動で返却される。どの棚から返してもよい。</li></ul></section>`;
}

export function gardenClueHTML() {
  return `<section class="museum-clue"><h3>ふたつの花の育てかた</h3><p>露の花には<b>2L</b>、月の花には<b>4L</b>。雨水タンクの<b>6Lだけ</b>を、ふたつの花に分けよう。</p>
    <ul><li>使える容器は<b>5Lのじょうろ</b>と<b>3Lのバケツ</b>。花に注げるのは、じょうろからだけ。</li><li>タンクから汲むと、容器が満杯になるか、タンクが空になるまで入る。</li><li>容器同士では、移す側が空になるか、受ける側が満杯になるまで注ぐ。</li><li>花には必要な量を<b>一度で</b>届ける。目分量や、少しずつの継ぎ足しはできない。</li><li>水は捨てずにタンクへ戻せる。失敗しても何度でもやり直せる。時間制限はない。</li></ul></section>`;
}

export function orreryClueHTML() {
  return `<section class="museum-clue"><h3>天球儀の読みかた</h3><p>北から時計回りに、北・北東・東・南東・南・南西・西・北西。<b>隣の方位までが1目盛</b>。4つの印に刻まれた言葉を、それぞれの環に合わせよう。</p>
    <p>「時計回り＋」は時計の針の向き。「反時計回り−」は、その逆。印の言葉は、集めたあとも天球儀で読み返せる。</p></section>`;
}

function puzzleBody(kind, number, intro, clue) {
  const body = el('div', `museum-puzzle museum-${kind}`);
  body.innerHTML = `<div class="mu-kicker"><span>星あかりの博物館</span><span>展示 ${number}</span></div><p class="mu-intro">${intro}</p><div class="mu-workspace"></div><details class="mu-reference"><summary>展示の解説を読む</summary>${clue}</details><p class="mu-message" role="status" aria-live="polite"></p>`;
  return body;
}

function panelActions(body, html) {
  const actions = el('div', 'mu-actions', html);
  body.querySelector('.mu-workspace').appendChild(actions);
  return actions;
}

function finishOnce(body, audio, onSolved, panel, state) {
  if (state.done) return;
  state.done = true;
  body.classList.add('solved');
  body.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  audio.play('solve');
  onSolved?.(panel);
}

function message(body, audio, text, wrong = false) {
  body.querySelector('.mu-message').textContent = text;
  if (wrong) audio.play('wrong');
}

/** ① 化石：下（古い）から上（新しい）へ、2枚を選んで交換する。 */
export function fossilPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let order = Array.isArray(draft.order) && draft.order.length === 5 && new Set(draft.order).size === 5 && draft.order.every((id) => FOSSIL_ANSWER.includes(id)) ? [...draft.order] : [...FOSSIL_START];
  let selected = Number.isInteger(draft.selected) && draft.selected >= 0 && draft.selected < 5 ? draft.selected : null;
  const state = { done: false };
  const body = puzzleBody('fossil', '01', 'ばらばらになった化石を、見つかった地層へ戻そう。2枚を押すと、位置を入れかえられる。', fossilClueHTML());
  const box = el('div', 'mu-fossil-strata');
  body.querySelector('.mu-workspace').appendChild(box);
  const actions = panelActions(body, '<button class="btn mu-reset">最初の並びに戻す</button><button class="btn primary mu-check">地層と照合する</button>');
  const emit = () => onChange({ order: [...order], selected });
  const rows = [];
  for (let slot = 4; slot >= 0; slot--) {
    const row = el('div', 'mu-fossil-row');
    row.innerHTML = `<span class="mu-layer-age">${slot === 4 ? '新しい ↑' : slot === 0 ? '古い ↓' : `${slot + 1}層`}</span>`;
    const button = el('button', 'mu-fossil-tile');
    button.dataset.slot = slot;
    button.onclick = () => {
      if (state.done) return;
      if (selected === null) selected = slot;
      else if (selected === slot) selected = null;
      else { [order[selected], order[slot]] = [order[slot], order[selected]]; selected = null; }
      audio.play('click'); emit(); paint();
      message(body, audio, selected === null ? '2枚を選んで交換。下が古く、上が新しい。' : '入れかえる、もう1枚の化石を選ぼう。');
    };
    row.appendChild(button); box.appendChild(row); rows[slot] = button;
  }
  const paint = () => rows.forEach((button, slot) => {
    const fossil = FOSSILS.find((f) => f.id === order[slot]);
    button.innerHTML = `${museumSymbol(fossil.id, 38)}<span>${fossil.name}</span><small>${selected === slot ? '選択中' : '押して選ぶ'}</small>`;
    button.setAttribute('aria-pressed', String(selected === slot));
    button.setAttribute('aria-label', `下から${slot + 1}層目、${fossil.name}${selected === slot ? '、選択中' : ''}`);
    button.classList.toggle('selected', selected === slot);
  });
  actions.querySelector('.mu-reset').onclick = () => { if (state.done) return; order = [...FOSSIL_START]; selected = null; audio.play('click'); emit(); paint(); };
  actions.querySelector('.mu-check').onclick = () => {
    if (state.done) return;
    if (!order.every((id, index) => id === FOSSIL_ANSWER[index])) { message(body, audio, '地層の記録と、まだ合っていない。魚の前後と、葉・羽の並びをくらべよう。', true); return; }
    message(body, audio, '化石の時間が、ひとつながりになった。');
    finishOnce(body, audio, onSolved, panel, state);
  };
  const panel = ui.openPanel({ title: '時を重ねる化石室', body, cls: 'museum-panel' });
  paint(); message(body, audio, '2枚を選んで交換。下が古く、上が新しい。');
  return panel;
}

export const PRISM_MIRRORS = [{ x: 2, y: 2 }, { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 1, y: 4 }];
export const PRISM_ANSWER = ['/', '/', '\\', '/', '\\'];

/** 光を1マスずつ追う。向きを含めた再訪を循環として検出する。 */
export function tracePrism(orientations) {
  let x = 0, y = 2, dx = 1, dy = 0;
  const points = [[x, y]], visited = new Set(), states = new Set();
  for (let step = 0; step < 128; step++) {
    const key = `${x},${y},${dx},${dy}`;
    if (states.has(key)) return { ok: false, loop: true, points, visited: [...visited], exit: false };
    states.add(key);
    const mirror = PRISM_MIRRORS.findIndex((m) => m.x === x && m.y === y);
    if (mirror >= 0) {
      visited.add(mirror);
      if (orientations[mirror] === '/') [dx, dy] = [-dy, -dx];
      else [dx, dy] = [dy, dx];
    }
    x += dx; y += dy;
    points.push([x, y]);
    if (x < 0 || x > 4 || y < 0 || y > 4) {
      const exit = x === 1 && y === -1 && dy === -1;
      return { ok: exit && visited.size === PRISM_MIRRORS.length, loop: false, points, visited: [...visited], exit };
    }
  }
  return { ok: false, loop: true, points, visited: [...visited], exit: false };
}

/** ② 光：鏡の向きと、現在の実際の光路を同じ盤に描く。 */
export function prismPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let mirrors = Array.isArray(draft.mirrors) && draft.mirrors.length === 5 && draft.mirrors.every((m) => m === '/' || m === '\\') ? [...draft.mirrors] : ['\\', '/', '/', '\\', '/'];
  const state = { done: false };
  const body = puzzleBody('prism', '02', '5枚の鏡で、星まで光をつなごう。鏡を押すたびに向きが変わり、光の道が見える。', prismClueHTML());
  const board = el('div', 'mu-light-board');
  board.innerHTML = `<div class="mu-light-exit">${museumSymbol('star', 24)}<span>星の出口</span></div><div class="mu-light-grid"><svg class="mu-light-svg" viewBox="0 0 300 300" role="img" aria-label="光の通り道"><g class="mu-light-lines">${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 60} 0v300M0 ${i * 60}h300"/>`).join('')}</g><path class="mu-light-path" d=""/><path class="mu-source-arrow" d="M3 150h35m-8-7 8 7-8 7"/></svg></div><div class="mu-light-caption"><span>→ 光源</span><span class="mu-light-count"></span></div>`;
  const grid = board.querySelector('.mu-light-grid');
  const buttons = PRISM_MIRRORS.map((m, i) => {
    const button = el('button', 'mu-mirror');
    button.style.left = `${(m.x + .5) * 20}%`; button.style.top = `${(m.y + .5) * 20}%`;
    button.dataset.mirror = i;
    button.onclick = () => { if (state.done) return; mirrors[i] = mirrors[i] === '/' ? '\\' : '/'; audio.play('dial'); onChange({ mirrors: [...mirrors] }); paint(); };
    grid.appendChild(button); return button;
  });
  body.querySelector('.mu-workspace').appendChild(board);
  const actions = panelActions(body, '<button class="btn mu-reset">鏡を最初に戻す</button><button class="btn primary mu-check">星へ光を送る</button>');
  const paint = () => {
    const result = tracePrism(mirrors);
    const points = [[-.5, 2], ...result.points].map(([x, y]) => [Math.max(0, Math.min(300, (x + .5) * 60)), Math.max(0, Math.min(300, (y + .5) * 60))]);
    board.querySelector('.mu-light-path').setAttribute('d', points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '));
    board.classList.toggle('connected', result.ok);
    buttons.forEach((button, i) => {
      button.innerHTML = `<span aria-hidden="true">${mirrors[i] === '/' ? '／' : '＼'}</span><small>${i + 1}</small>`;
      button.setAttribute('aria-label', `鏡${i + 1}、${mirrors[i] === '/' ? '右上がり' : '右下がり'}。押すと向きを変える`);
      button.classList.toggle('lit', result.visited.includes(i));
    });
    board.querySelector('.mu-light-count').textContent = `光が通った鏡 ${result.visited.length} / 5枚`;
    message(body, audio, result.ok ? '5枚を通って、星まで光がつながった。光を送ろう。' : result.loop ? '光が輪になっている。どこかの鏡を切りかえよう。' : result.exit ? '星には届いたけれど、まだ光が通っていない鏡がある。' : '光は、盤の外へ出ている。星の出口までつなごう。');
  };
  actions.querySelector('.mu-reset').onclick = () => { if (state.done) return; mirrors = ['\\', '/', '/', '\\', '/']; audio.play('click'); onChange({ mirrors: [...mirrors] }); paint(); };
  actions.querySelector('.mu-check').onclick = () => {
    if (state.done) return;
    if (!tracePrism(mirrors).ok) { message(body, audio, '5枚すべての鏡を通って、北の星へ。光の曲がる向きをたどろう。', true); return; }
    finishOnce(body, audio, onSolved, panel, state);
  };
  const panel = ui.openPanel({ title: '星を運ぶ光の実験室', body, cls: 'museum-panel' });
  paint(); return panel;
}

/** ③ 返却：距離と階段を意識して、3冊を届ける経路を組む。 */
export function archivePanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  const incoming = checkArchiveRoute(draft.route);
  let route = incoming.start && incoming.connected && !incoming.stairs && !incoming.tooLong ? [...draft.route] : ['entry'];
  const state = { done: false };
  const body = puzzleBody('archive', '03', '夜の書庫は返却の時間。台車に3冊の本をのせて、棚を回り、搬出口へ向かおう。', archiveClueHTML());
  const map = el('div', 'mu-archive-map');
  map.innerHTML = `<svg viewBox="0 0 400 300" aria-hidden="true"><g class="mu-map-passages">${ARCHIVE_EDGES.map(([a, b, kind]) => { const p = nodeById(a), q = nodeById(b); return `<path class="${kind === 'stairs' ? 'stairs' : ''}" d="M${p.x} ${p.y}L${q.x} ${q.y}"/>`; }).join('')}</g><path class="mu-archive-route" d=""/><g class="mu-stair-labels"><text x="97" y="108" transform="rotate(34 97 108)">階段</text><text x="210" y="103">階段</text></g></svg>`;
  const buttons = ARCHIVE_NODES.map((node) => {
    const button = el('button', `mu-map-node ${node.shelf ? 'shelf' : ''}`, `${node.shelf ? museumSymbol(node.shelf, 22) : ''}<span>${node.name}</span>`);
    button.style.left = `${node.x / 4}%`; button.style.top = `${node.y / 3}%`; button.dataset.node = node.id;
    button.onclick = () => {
      if (state.done) return;
      const current = route[route.length - 1];
      if (node.id === current) return;
      const edge = archiveEdge(current, node.id);
      if (!edge) { message(body, audio, 'いまいる場所から、通路で直接つながった場所を選ぼう。', true); return; }
      if (edge[2] === 'stairs') { message(body, audio, 'その道は階段。台車が通れる実線の通路を選ぼう。', true); return; }
      if (route.length - 1 >= ARCHIVE_RULES.maxSteps) { message(body, audio, '9本ぶんの電池を使いきった。「ひとつ戻す」で道順を考えなおそう。', true); return; }
      route.push(node.id); audio.play('dial'); onChange({ route: [...route] }); paint();
    };
    map.appendChild(button); return button;
  });
  const workspace = body.querySelector('.mu-workspace'); workspace.appendChild(map);
  const status = el('div', 'mu-archive-status'); workspace.appendChild(status);
  const history = el('div', 'mu-route-history'); history.setAttribute('aria-label', '選んだ道順'); workspace.appendChild(history);
  const actions = panelActions(body, '<button class="btn mu-back">ひとつ戻す</button><button class="btn mu-reset">受付からやり直す</button><button class="btn primary mu-check">この道順で届ける</button>');
  const paint = () => {
    const result = checkArchiveRoute(route), current = route[route.length - 1];
    map.querySelector('.mu-archive-route').setAttribute('d', route.map((id, i) => { const n = nodeById(id); return `${i ? 'L' : 'M'}${n.x} ${n.y}`; }).join(' '));
    buttons.forEach((button, i) => {
      const n = ARCHIVE_NODES[i], edge = archiveEdge(current, n.id), returned = !!n.shelf && route.includes(n.id);
      button.classList.toggle('here', n.id === current); button.classList.toggle('visited', returned); button.classList.toggle('reachable', !!edge && edge[2] !== 'stairs');
      button.setAttribute('aria-current', n.id === current ? 'location' : 'false');
      button.setAttribute('aria-label', `${n.name}${n.id === current ? '、いまここ' : returned ? '、返却ずみ' : ''}${edge?.[2] === 'stairs' ? '、この道は階段' : ''}`);
    });
    status.innerHTML = `<b>通路 ${result.steps} / ${ARCHIVE_RULES.maxSteps}本</b><span>返却 ${ARCHIVE_RULES.via.length - result.missing.length} / 3冊</span>`;
    history.textContent = route.map((id) => nodeById(id).name).join(' → ');
    actions.querySelector('.mu-back').disabled = route.length < 2;
    message(body, audio, result.ok ? '3冊を返して搬出口へ。道順を決めたら、台車を出発させよう。' : `いまは${nodeById(current).name}。${result.missing.length ? `残りの棚：${result.missing.map((id) => nodeById(id).name).join('・')}` : '本はすべて返せた。搬出口へ向かおう。'}`);
  };
  actions.querySelector('.mu-back').onclick = () => { if (state.done || route.length < 2) return; route.pop(); audio.play('click'); onChange({ route: [...route] }); paint(); };
  actions.querySelector('.mu-reset').onclick = () => { if (state.done) return; route = ['entry']; audio.play('click'); onChange({ route: [...route] }); paint(); };
  actions.querySelector('.mu-check').onclick = () => {
    if (state.done) return;
    const result = checkArchiveRoute(route);
    if (!result.ok) {
      message(body, audio, result.missing.length ? `まだ${result.missing.map((id) => nodeById(id).name).join('・')}へ本を返せていない。` : !result.end ? '3冊を返したら、最後は搬出口へ。' : '台車が通れる道で、通路9本以内にまとめよう。', true);
      return;
    }
    message(body, audio, '3冊の本が、夜の書庫の居場所へ戻った。'); finishOnce(body, audio, onSolved, panel, state);
  };
  const panel = ui.openPanel({ title: '夜の書庫の返却便', body, cls: 'museum-panel museum-panel-wide' });
  paint(); return panel;
}

const gardenFresh = () => ({ version: 2, a: 0, b: 0, reserve: 6, watered: [false, false] });
export function restoreGarden(draft) {
  const a = draft?.a, b = draft?.b;
  if (![a, b].every(Number.isInteger) || a < 0 || a > 5 || b < 0 || b > 3) return gardenFresh();
  if (draft.version !== 2) {
    // 旧版の量りかけも、6L以内なら容器の水を引き継ぐ。達成済みの展示フラグは変更しない。
    return a + b <= 6 ? { ...gardenFresh(), a, b, reserve: 6 - a - b } : gardenFresh();
  }
  if (!Array.isArray(draft.watered) || draft.watered.length !== 2 || !draft.watered.every(v => typeof v === 'boolean')) return gardenFresh();
  const { reserve, watered } = draft;
  if (!Number.isInteger(reserve) || reserve < 0 || reserve > 6 || a + b + reserve + (watered[0] ? 2 : 0) + (watered[1] ? 4 : 0) !== 6) return gardenFresh();
  return { version: 2, a, b, reserve, watered: [...watered] };
}

export function gardenStep(amounts, action) {
  const next = restoreGarden(amounts);
  let { a, b, reserve, watered } = next;
  if (action === 'fill5') { const n = Math.min(5 - a, reserve); a += n; reserve -= n; }
  else if (action === 'fill3') { const n = Math.min(3 - b, reserve); b += n; reserve -= n; }
  else if (action === 'empty5') { reserve += a; a = 0; }
  else if (action === 'empty3') { reserve += b; b = 0; }
  else if (action === 'pour5to3') { const n = Math.min(a, 3 - b); a -= n; b += n; }
  else if (action === 'pour3to5') { const n = Math.min(b, 5 - a); b -= n; a += n; }
  else if (action === 'waterDew' && !watered[0] && a === 2) { a = 0; watered[0] = true; }
  else if (action === 'waterMoon' && !watered[1] && a === 4) { a = 0; watered[1] = true; }
  return { version: 2, a, b, reserve, watered };
}

/** ④ 水量：操作はすべて離散的。端数やタイミングを要求しない。 */
export function gardenPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let amounts = restoreGarden(draft);
  let moves = Number.isInteger(draft.moves) && draft.moves >= 0 ? draft.moves : 0;
  const state = { done: false };
  const body = puzzleBody('garden', '04', '雨水は6Lだけ。露の花に2L、月の花に4Lを、一度ずつ届けよう。', gardenClueHTML());
  const id = `mu-water-${++waterId}`;
  const vessels = el('div', 'mu-vessels');
  vessels.innerHTML = `<svg viewBox="0 0 360 230" role="img" aria-label="じょうろとバケツの水量"><defs><clipPath id="${id}-a"><path d="M27 48h104v143H27z"/></clipPath><clipPath id="${id}-b"><path d="M227 86h105l-13 105h-79Z"/></clipPath></defs><path d="M28 47h104v145H28Zm104 24 32-22 10 12-42 54M28 71C-2 62-2 129 28 125" class="mu-vessel-outline"/><path d="M227 86h105l-13 106h-79Zm9-2c0-72 87-72 87 0" class="mu-vessel-outline"/><rect class="mu-water-a" x="27" y="191" width="105" height="0" clip-path="url(#${id}-a)"/><rect class="mu-water-b" x="225" y="191" width="110" height="0" clip-path="url(#${id}-b)"/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M31 ${191 - i * 28.4}h12" class="mu-volume-tick"/><text x="48" y="${195 - i * 28.4}" class="mu-volume-label">${i}</text>`).join('')}
    ${Array.from({ length: 4 }, (_, i) => `<path d="M244 ${191 - i * 35}h12" class="mu-volume-tick"/><text x="260" y="${195 - i * 35}" class="mu-volume-label">${i}</text>`).join('')}
    <text x="80" y="219" text-anchor="middle" class="mu-vessel-name">5L じょうろ</text><text x="280" y="219" text-anchor="middle" class="mu-vessel-name">3L バケツ</text></svg><div class="mu-water-readings"><b class="mu-water-reading-a"></b><b class="mu-water-reading-b"></b></div>`;
  const workspace = body.querySelector('.mu-workspace');
  const reserve = el('p', 'mu-reserve'); workspace.appendChild(reserve);
  workspace.appendChild(vessels);
  const flowers = el('div', 'mu-flowers');
  flowers.innerHTML = '<button class="btn mu-flower" data-action="waterDew">✿ 露の花へ 2L</button><button class="btn mu-flower" data-action="waterMoon">☾ 月の花へ 4L</button>';
  workspace.appendChild(flowers);
  const controls = el('div', 'mu-water-controls');
  const operations = [['fill5', 'タンク → じょうろ'], ['fill3', 'タンク → バケツ'], ['empty5', 'じょうろ → タンク'], ['empty3', 'バケツ → タンク'], ['pour5to3', 'じょうろ → バケツ'], ['pour3to5', 'バケツ → じょうろ']];
  const buttons = operations.map(([action, label]) => {
    const button = el('button', 'btn', label); button.dataset.action = action;
    button.onclick = () => {
      if (state.done) return;
      const next = gardenStep(amounts, action);
      if (JSON.stringify(next) === JSON.stringify(amounts)) return;
      amounts = next; moves++; audio.play('water'); onChange({ ...amounts, moves }); paint();
    };
    controls.appendChild(button); return button;
  });
  workspace.appendChild(controls);
  const actions = panelActions(body, '<button class="btn mu-reset">水やりを最初から</button><button class="btn primary mu-check">花のようすを見る</button>');
  const paint = () => {
    const a = vessels.querySelector('.mu-water-a'), b = vessels.querySelector('.mu-water-b');
    a.setAttribute('height', amounts.a * 28.4); a.setAttribute('y', 191 - amounts.a * 28.4);
    b.setAttribute('height', amounts.b * 35); b.setAttribute('y', 191 - amounts.b * 35);
    vessels.querySelector('svg').setAttribute('aria-label', `5Lじょうろに${amounts.a}L、3Lバケツに${amounts.b}L`);
    vessels.querySelector('.mu-water-reading-a').textContent = `${amounts.a} / 5 L`;
    vessels.querySelector('.mu-water-reading-b').textContent = `${amounts.b} / 3 L`;
    buttons.forEach((button, i) => { const next = gardenStep(amounts, operations[i][0]); button.disabled = JSON.stringify(next) === JSON.stringify(amounts); });
    reserve.textContent = `雨水タンク　残り ${amounts.reserve} / 6 L`;
    flowers.querySelectorAll('button').forEach((button, i) => {
      button.classList.toggle('watered', amounts.watered[i]);
      button.textContent = `${i ? '☾ 月' : '✿ 露'}の花　${amounts.watered[i] ? '✓ 水やり済み' : `${i ? 4 : 2}L を届ける`}`;
      button.disabled = amounts.watered[i];
    });
    message(body, audio, amounts.watered.every(Boolean) ? 'ふたつの花に、雨水がぴったり届いた。花のようすを見てみよう。' : 'タンクの6Lを、ふたつの花へ。一度に注ぐ量を考えよう。');
  };
  actions.querySelector('.mu-reset').onclick = () => { if (state.done) return; amounts = gardenFresh(); moves = 0; audio.play('click'); onChange({ ...amounts, moves }); paint(); };
  actions.querySelector('.mu-check').onclick = () => {
    if (state.done) return;
    if (!amounts.watered.every(Boolean)) { message(body, audio, '露の花に2L、月の花に4L。ふたつの花へ、じょうろから水を届けよう。', true); return; }
    finishOnce(body, audio, onSolved, panel, state);
  };
  flowers.querySelectorAll('button').forEach((button, i) => {
    button.onclick = () => {
      if (state.done || amounts.watered[i]) return;
      const target = i ? 4 : 2;
      if (amounts.a !== target) { message(body, audio, `この花には一度で${target}L。じょうろは今${amounts.a}Lだから、量を整えよう。`, true); return; }
      amounts = gardenStep(amounts, button.dataset.action); moves++; audio.play('water'); onChange({ ...amounts, moves }); paint();
    };
  });
  const panel = ui.openPanel({ title: 'ふたつの花の温室', body, cls: 'museum-panel' });
  paint(); return panel;
}

export const DIRECTIONS = [
  { jp: '北', en: 'N' }, { jp: '北東', en: 'NE' }, { jp: '東', en: 'E' }, { jp: '南東', en: 'SE' },
  { jp: '南', en: 'S' }, { jp: '南西', en: 'SW' }, { jp: '西', en: 'W' }, { jp: '北西', en: 'NW' },
];
export const ORRERY_ANSWER = [6, 1, 0, 3];
const sealPresent = (seals, key) => Array.isArray(seals) ? seals.includes(key) : !!seals?.[key];

/** ⑤ 天球儀：集めた4つの印を、8方位の4環に読み替える。 */
export function orreryPanel(ui, audio, { onSolved, draft = {}, onChange = () => {}, seals = [] } = {}) {
  const values = SEAL_ORDER.map((_, i) => Number.isInteger(draft.values?.[i]) && draft.values[i] >= 0 && draft.values[i] < 8 ? draft.values[i] : 0);
  const present = SEAL_ORDER.map((key) => sealPresent(seals, key));
  const state = { done: false };
  const body = puzzleBody('orrery', '05', '4つの展示から届いた言葉を、天球儀へ。1目盛ずつ回して、印が指す方位を合わせよう。', orreryClueHTML());
  const compass = el('div', 'mu-orrery-compass');
  const colors = ['#a87532', '#6579a3', '#537862', '#965c78'];
  compass.innerHTML = `<svg viewBox="0 0 360 360" role="img" aria-label="4つの環を重ねた天球儀"><circle cx="180" cy="180" r="147" class="mu-compass-edge"/>${[125, 101, 77, 53].map((r, i) => `<circle cx="180" cy="180" r="${r}" class="mu-orbit" style="stroke:${colors[i]}"/>`).join('')}${DIRECTIONS.map((d, i) => { const a = (i * 45 - 90) * Math.PI / 180; return `<path d="M${180 + Math.cos(a) * 138} ${180 + Math.sin(a) * 138}L${180 + Math.cos(a) * 148} ${180 + Math.sin(a) * 148}" class="mu-compass-tick"/><text x="${180 + Math.cos(a) * 165}" y="${185 + Math.sin(a) * 165}" text-anchor="middle" class="mu-compass-label">${d.jp}</text>`; }).join('')}<g class="mu-orrery-hands"></g><circle cx="180" cy="180" r="14" class="mu-compass-hub"/><path d="m180 172 3 5 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z" fill="#f7e6b5"/></svg>`;
  const workspace = body.querySelector('.mu-workspace'); workspace.appendChild(compass);
  const rows = el('div', 'mu-orrery-controls'); workspace.appendChild(rows);
  const displays = SEAL_ORDER.map((key, i) => {
    const seal = SEALS[key], row = el('div', `mu-ring-control${present[i] ? '' : ' locked'}`);
    row.innerHTML = `<div class="mu-ring-icon" style="--seal-color:${colors[i]}">${seal.icon}</div><div class="mu-ring-info"><b>${seal.name}</b><p>${present[i] ? seal.clue : 'まだ、この展示の印がない。'}</p></div><div class="mu-ring-dial"><button class="btn mu-ring-minus" aria-label="${seal.name}を反時計回りに1目盛">−</button><output></output><button class="btn mu-ring-plus" aria-label="${seal.name}を時計回りに1目盛">＋</button></div>`;
    const change = (delta) => { if (state.done || !present[i]) return; values[i] = (values[i] + delta + 8) % 8; audio.play('dial'); onChange({ values: [...values] }); paint(); };
    const minus = row.querySelector('.mu-ring-minus'), plus = row.querySelector('.mu-ring-plus');
    minus.dataset.ring = key; plus.dataset.ring = key;
    minus.onclick = () => change(-1); plus.onclick = () => change(1);
    minus.disabled = !present[i]; plus.disabled = !present[i];
    rows.appendChild(row); return row.querySelector('output');
  });
  const actions = panelActions(body, '<button class="btn mu-reset">環を北へ戻す</button><button class="btn primary mu-check">星をつなぐ</button>');
  const paint = () => {
    compass.querySelector('.mu-orrery-hands').innerHTML = values.map((v, i) => {
      if (!present[i]) return '';
      const angle = (v * 45 - 90) * Math.PI / 180, r = [125, 101, 77, 53][i];
      const x = 180 + Math.cos(angle) * r, y = 180 + Math.sin(angle) * r;
      return `<path d="M180 180L${x} ${y}" fill="none" stroke="${colors[i]}" stroke-width="3" stroke-dasharray="${i % 2 ? '7 3' : 'none'}"/><circle cx="${x}" cy="${y}" r="11" fill="${colors[i]}" stroke="#fff7df" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="white" font-size="12">${i + 1}</text>`;
    }).join('');
    displays.forEach((display, i) => { const d = DIRECTIONS[values[i]]; display.innerHTML = present[i] ? `<b>${d.jp}</b><small>${d.en} · ${i + 1}の環</small>` : '<b>未入手</b><small>展示の印</small>'; });
    compass.querySelector('svg').setAttribute('aria-label', values.map((v, i) => `${SEALS[SEAL_ORDER[i]].name}は${present[i] ? DIRECTIONS[v].jp : '未入手'}`).join('、'));
  };
  actions.querySelector('.mu-reset').onclick = () => { if (state.done) return; values.fill(0); audio.play('click'); onChange({ values: [...values] }); paint(); message(body, audio, '環を北へ戻した。印の言葉を読み、出発する方位から数えよう。'); };
  actions.querySelector('.mu-check').onclick = () => {
    if (state.done) return;
    if (!present.every(Boolean)) { message(body, audio, 'まだ足りない印がある。4つの展示をめぐってみよう。', true); return; }
    if (!values.every((v, i) => v === ORRERY_ANSWER[i])) { message(body, audio, 'まだ、星の道は結ばれない。各印の「出発する方位」と「回す向き」を確かめよう。', true); return; }
    finishOnce(body, audio, onSolved, panel, state);
  };
  const panel = ui.openPanel({ title: '星あかりの天球儀', body, cls: 'museum-panel museum-panel-wide' });
  paint(); message(body, audio, '1目盛は隣の方位まで。＋は時計回り、−は反時計回り。');
  return panel;
}
