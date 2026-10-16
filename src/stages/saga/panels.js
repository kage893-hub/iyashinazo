import { el } from '../../core/ui.js';

// 掲示・旅のメモ・操作盤で、同じ説明と同じルールを使う。
// 実在のダイヤ・販売価格ではなく、この旅だけの臨時便・催事の設定。
const SVG = 'http://www.w3.org/2000/svg';
const integer = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const selections = (values, length, max) => Array.isArray(values) && values.length === length && Array.from(values).every((n) => integer(n, max));
const svg = (content, viewBox = '0 0 128 80', label = '') => `<svg xmlns="${SVG}" viewBox="${viewBox}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} focusable="false">${content}</svg>`;
export const timeLabel = (minutes) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

export const BUS_LEGS = [
  { from: '佐賀駅', to: 'モラージュ佐賀', duration: 20, departures: [540, 555, 570] },
  { from: 'モラージュ佐賀', to: 'クリーク広場', duration: 20, departures: [590, 600, 620] },
  { from: 'クリーク広場', to: '川久保', duration: 25, departures: [620, 630, 645] },
];
export const BUS_RULES = { ready: 550, shopping: 25, waitMin: 5, waitMax: 15, deadline: 660 };
export const BUS_ANSWER = [1, 1, 1];

/** 選んだ便の実時刻を計算する。配列の中身は、各区間の便の添字。 */
export function checkBusPlan(choices) {
  if (!selections(choices, 3, 2)) return { ok: false, complete: false, legs: [], issues: ['3区間それぞれの便を選ぼう。'] };
  const legs = BUS_LEGS.map((leg, i) => ({ ...leg, departure: leg.departures[choices[i]], arrival: leg.departures[choices[i]] + leg.duration }));
  const shopReady = legs[0].arrival + BUS_RULES.shopping;
  const wait = legs[2].departure - legs[1].arrival;
  const issues = [];
  if (legs[0].departure < BUS_RULES.ready) issues.push('佐賀駅を出られるのは9:10以降。最初の便を見直そう。');
  if (legs[1].departure < shopReady) issues.push(`買物が終わるのは${timeLabel(shopReady)}。モール発の便に間に合わない。`);
  if (wait < BUS_RULES.waitMin) issues.push(`広場での乗換待ちは${wait}分。少なくとも5分の余裕が必要。`);
  if (wait > BUS_RULES.waitMax) issues.push(`広場での乗換待ちは${wait}分。15分以内におさめよう。`);
  if (legs[2].arrival > BUS_RULES.deadline) issues.push(`川久保には${timeLabel(legs[2].arrival)}着。約束は11:00まで。`);
  return { ok: issues.length === 0, complete: true, legs, shopReady, wait, issues };
}

export function busClueHTML() {
  return `<section class="sa-clue"><h3>ほしまわり臨時便の旅程メモ</h3><p class="sa-fiction">この旅のための架空の臨時便です。</p><ul><li>佐賀駅を出発できるのは<b>9:10以降</b>。</li><li>モラージュ佐賀では、着いてから<b>25分間</b>買物をする。</li><li>クリーク広場では、到着から次の便まで<b>5分以上・15分以内</b>あける。</li><li>川久保の約束には<b>11:00まで</b>に着く。</li></ul><p>各区間で1便ずつ選ぼう。時刻は同じ日の午前。到着時刻は「出発＋所要時間」で求められる。</p></section>`;
}

export const SHOP_ITEMS = [
  { id: 'nori', name: '有明のり', price: 200 },
  { id: 'bouro', name: '丸ぼうろ', price: 150 },
  { id: 'tea', name: '和紅茶', price: 250 },
  { id: 'card', name: 'バルーン絵葉書', price: 100 },
];
export const SHOP_ANSWER = [2, 1, 1, 2];
export function checkShopping(counts) {
  if (!selections(counts, 4, 5)) return { ok: false, valid: false, count: 0, total: 0 };
  const count = counts.reduce((a, b) => a + b, 0), total = counts.reduce((a, n, i) => a + n * SHOP_ITEMS[i].price, 0);
  return { ok: count === 6 && total === 1000 && counts[0] === counts[3] && counts[1] === counts[2], valid: true, count, total };
}
export function shoppingClueHTML() {
  return `<section class="sa-clue"><h3>旅のおみやげ市・買物メモ</h3><p class="sa-fiction">価格はゲーム内の臨時催事の設定です。</p><ul><li>4種類から、合わせて<b>6個</b>を買う。</li><li>代金の合計は<b>ちょうど1,000円</b>。</li><li><b>有明のりとバルーン絵葉書は同じ個数</b>。</li><li><b>丸ぼうろと和紅茶も同じ個数</b>。</li></ul><p>単価：有明のり200円、丸ぼうろ150円、和紅茶250円、バルーン絵葉書100円。個数を増減して、レシートで確認しよう。</p></section>`;
}

const gate = (id, name, x, y, options) => ({ id, name, x, y, options });
export const SLUICE_GATES = [
  gate('A', '入口の分かれ道', 230, 58, [{ name: '西へ', to: ['B'] }, { name: '東へ', to: ['C'] }, { name: '両側へ', to: ['B', 'C'] }]),
  gate('B', '西の水門', 90, 160, [{ name: '①の田へ', to: ['field1'] }, { name: '中央へ', to: ['D'] }, { name: '閉じる', to: [] }]),
  gate('C', '東の水門', 350, 160, [{ name: '中央へ', to: ['D'] }, { name: '住宅へ', to: ['house'] }, { name: '閉じる', to: [] }]),
  gate('D', '中央の分かれ道', 230, 282, [{ name: '②の田へ', to: ['field2'] }, { name: '下流へ', to: ['E'] }, { name: '両側へ', to: ['field2', 'E'] }]),
  gate('E', '下流の水門', 350, 370, [{ name: '③の田へ', to: ['field3'] }, { name: '住宅へ', to: ['house'] }, { name: '閉じる', to: [] }]),
];
export const SLUICE_TARGETS = [
  { id: 'field1', name: '① ひばり田', x: 65, y: 285 },
  { id: 'field2', name: '② 朝日田', x: 155, y: 398 },
  { id: 'field3', name: '③ 夕なぎ田', x: 350, y: 465 },
];
export const SLUICE_START = [1, 1, 1, 1, 1];
export const SLUICE_ANSWER = [2, 0, 0, 2, 0];

/** 分岐ごとの実際の接続を追跡し、届いた出口と流路を返す。 */
export function traceSluice(values) {
  if (!selections(values, 5, 2)) return { ok: false, valid: false, reached: [], edges: [], wet: [], residential: false };
  const reached = new Set(), wet = new Set(), edges = [], queue = ['A'];
  while (queue.length) {
    const id = queue.shift();
    if (wet.has(id)) continue;
    wet.add(id);
    const index = SLUICE_GATES.findIndex((g) => g.id === id);
    if (index < 0) { reached.add(id); continue; }
    for (const to of SLUICE_GATES[index].options[values[index]].to) { edges.push([id, to]); queue.push(to); }
  }
  const residential = reached.has('house');
  return { ok: !residential && SLUICE_TARGETS.every((f) => reached.has(f.id)), valid: true, reached: [...reached], edges, wet: [...wet], residential };
}
export function sluiceClueHTML() {
  return `<section class="sa-clue"><h3>クリークの水番の約束</h3><p>上流から来る水を、<b>①ひばり田・②朝日田・③夕なぎ田のすべて</b>へ届けよう。<b>住宅（×印）へは流さない</b>こと。</p><ul><li>A〜Eの水門で、流す先を選ぶ。分かれ道の「両側へ」は、水を2方向へ分ける。</li><li>水が来ていない水門を開けても、その先には流れない。</li><li>水色の太線が現在の流れ。田には「届いた」、住宅には「× 水が流入」と表示される。</li></ul><p>流れは止めずに試せる。時間制限はない。</p></section>`;
}

export const WIND_DIRECTIONS = {
  N: { dx: 0, dy: -1, arrow: '↑', name: '北' }, E: { dx: 1, dy: 0, arrow: '→', name: '東' },
  S: { dx: 0, dy: 1, arrow: '↓', name: '南' }, W: { dx: -1, dy: 0, arrow: '←', name: '西' },
};
export const BALLOON_WINDS = [
  ['N', 'E', 'W'], ['E', 'S', 'N'], ['S', 'E', 'N'], ['E', 'W', 'N'], ['N', 'E', 'S'],
  ['W', 'N', 'E'], ['E', 'S', 'N'], ['N', 'W', 'E'], ['S', 'E', 'W'],
];
export const BALLOON_HEIGHTS = ['低い空', '中ほど', '高い空'];
export const BALLOON_RULES = { size: 6, start: [0, 5], goal: [4, 1], maxTurns: 9,
  marks: [{ name: '① 水車', x: 1, y: 4 }, { name: '② 橋', x: 3, y: 3 }, { name: '③ 風見', x: 3, y: 2 }],
  hazards: [[1, 3], [2, 2], [4, 3], [5, 2], [0, 2]],
};
export const BALLOON_ANSWER = [0, 0, 1, 2, 1, 1, 0, 0];

/** 高度列から毎手の風を読み、盤外・危険域・目印を同じ規則で検証。 */
export function checkBalloonRoute(heights) {
  const { start, goal, size, maxTurns, marks, hazards } = BALLOON_RULES;
  const points = [[...start]], visited = new Set();
  if (!Array.isArray(heights) || heights.length > maxTurns || !Array.from(heights).every((n) => integer(n, 2))) return { ok: false, valid: false, reason: '高度の記録を読み直そう。', points, visited: [], turns: 0 };
  let [x, y] = start;
  for (let i = 0; i < heights.length; i++) {
    const wind = WIND_DIRECTIONS[BALLOON_WINDS[i][heights[i]]];
    x += wind.dx; y += wind.dy;
    if (x < 0 || x >= size || y < 0 || y >= size) return { ok: false, valid: false, reason: 'その風では、盤の外に出てしまう。別の高度を選ぼう。', points, visited: [...visited], turns: i };
    if (hazards.some(([a, b]) => a === x && b === y)) return { ok: false, valid: false, reason: '×の強風域には入れない。予報を読み直そう。', points, visited: [...visited], turns: i };
    points.push([x, y]);
    marks.forEach((mark, m) => { if (mark.x === x && mark.y === y) visited.add(m); });
  }
  const landed = x === goal[0] && y === goal[1];
  return { ok: landed && visited.size === marks.length, valid: true, points, visited: [...visited], turns: heights.length, landed,
    reason: landed && visited.size < marks.length ? '着地点には来たけれど、まだ通っていない目印がある。' : heights.length === maxTurns ? '9回ぶんの風を使った。戻すか、やり直して道を考えよう。' : '' };
}
export function balloonClueHTML() {
  return `<section class="sa-clue"><h3>バルーンの風読み帳</h3><p>この小さな飛行盤では、<b>高度を1つ選ぶと、その回の風向へ1マス</b>流れる。矢印は「風が向かう先」。高度を変えても、マスの移動は風にまかせる。</p><ul><li>南西の出発点から、<b>①水車・②橋・③風見</b>の3つを通り、旗の<b>着地点</b>へ。</li><li>使える風は<b>9回まで</b>。目印の順番は自由。</li><li><b>×の強風域と盤外</b>には進めない。</li><li>予報は回ごとに変わる。次の回の3高度を見比べよう。</li></ul><p>「ひとつ戻す」で前の回へ戻れる。実際の飛行・気象とは異なるゲーム内の仕組みです。</p></section>`;
}

export const SKETCH_ANSWER = [1, 2, 0, 1];
const ink = '#505e65', roof = '#6b777d', paper = '#f8f2df';
const roofShapes = [
  `<path d="M16 31h96v12H16z" fill="${roof}"/><path d="M23 44h82v28H23z" fill="${paper}"/>`,
  `<path d="m48 23 32-17 34 17" fill="none" stroke="${roof}" stroke-width="6"/><path d="M54 24V40h55V24" fill="${paper}"/><path d="m8 43 53-20 59 20" fill="none" stroke="${roof}" stroke-width="6"/><path d="M18 45h93v27H18z" fill="${paper}"/>`,
  `<path d="m10 37 24-19h60l24 19-18 7H29Z" fill="${roof}"/><path d="M25 46h78v26H25z" fill="${paper}"/>`,
  `<path d="m12 25 22-15 23 15m14 0 22-15 23 15" fill="none" stroke="${roof}" stroke-width="5"/><path d="M16 29h36v41H16zm59 0h36v41H75z" fill="${paper}"/>`,
];
const wallShapes = [
  '<path d="M13 14h102v54H13z" fill="#dce0d8"/><path d="M13 27h102M13 41h102M13 55h102M37 14v13m29 0v14m29-27v13M37 41v14m29 0v13m29-27v14" fill="none" stroke="#7f8b89" stroke-width="3"/>',
  '<path d="M13 14h102v54H13z" fill="#dedfd6"/>' + Array.from({ length: 7 }, (_, i) => `<path d="M${20 + i * 14} 15v52" stroke="#7f8b89" stroke-width="4"/>`).join(''),
  '<path d="M13 14h102v54H13z" fill="#e3e3da"/>' + Array.from({ length: 5 }, (_, j) => Array.from({ length: 7 }, (_, i) => `<path d="m${13 + i * 15 + (j % 2) * 7.5} ${19 + j * 10} 7-6 7 6-7 6z" fill="${(i + j) % 2 ? '#bec6c0' : '#768784'}"/><path d="m${13 + i * 15 + (j % 2) * 7.5} ${19 + j * 10} 7-6" stroke="#f5f3e7" stroke-width="2"/>`).join('')).join(''),
  '<path d="M13 14h102v54H13z" fill="#dce0d8"/>' + Array.from({ length: 4 }, (_, j) => Array.from({ length: 7 }, (_, i) => `<circle cx="${20 + i * 15}" cy="${21 + j * 13}" r="3" fill="#7c8d87"/>`).join('')).join(''),
];
const pineShapes = [
  '<path d="M57 72q8-18 2-52m3 29 27-9M59 38 33 30m28-5 18-9" fill="none" stroke="#79654b" stroke-width="5"/><g fill="#628450"><ellipse cx="41" cy="32" rx="24" ry="8"/><ellipse cx="86" cy="43" rx="24" ry="8"/><ellipse cx="58" cy="56" rx="23" ry="7"/><ellipse cx="72" cy="20" rx="17" ry="9"/><ellipse cx="40" cy="15" rx="10" ry="13"/></g>',
  '<path d="M60 74V55" stroke="#79654b" stroke-width="7"/><path d="m60 8 34 53H26z" fill="#628450"/><path d="m60 29 39 38H21z" fill="#799258"/>',
  '<path d="M62 74V26m0 11-26-8m26 18 27-6" stroke="#79654b" stroke-width="6"/><g fill="#628450"><circle cx="62" cy="18" r="14"/><circle cx="34" cy="30" r="14"/><circle cx="90" cy="40" r="14"/></g>',
  '<path d="M61 75V20m0 1Q21 11 12 59m49-38q33-12 49 37m-49-37Q34 26 30 69m31-48q19 6 24 49" fill="none" stroke="#628450" stroke-width="6"/>',
];
const fenceShapes = [
  '<path d="M11 17h106v50H11z" fill="#d9c89c"/><g fill="#5e7975"><circle cx="37" cy="42" r="14"/><circle cx="90" cy="42" r="14"/></g>',
  '<path d="M8 17h112v50H8z" fill="#d9c89c"/><path d="M17 57V31q23-21 46 0 23-21 46 0v26Z" fill="#59746e"/><path d="M15 54q22-42 47 0 23-42 49 0M15 54q19-20 33 0m-2 0q17-29 32 0m-1 0q17-20 34 0" fill="none" stroke="#e5d6ac" stroke-width="6"/><path d="M9 19h110M62 20v43M10 64h109" stroke="#d9c89c" stroke-width="6"/>',
  '<path d="M10 17h108v50H10z" fill="#d9c89c"/>' + [20, 43, 66, 89].map((x) => `<path d="M${x} 29h15v25H${x}z" fill="#59746e"/>`).join(''),
  '<path d="M10 17h108v50H10z" fill="#d9c89c"/><path d="m35 27 15 15-15 15-15-15zm56 0 15 15-15 15-15-15z" fill="#59746e"/>',
];
export const SKETCH_GROUPS = [
  { name: '屋根の重なり', choices: ['平らな屋根', '高さの違う三角屋根', '四方へ下がる屋根', '左右に並ぶ三角屋根'], shapes: roofShapes },
  { name: '窓の下の腰壁', choices: ['横長の石積み', '縦の筋', '斜めの織り模様', '丸い点の模様'], shapes: wallShapes },
  { name: '玄関わきの松', choices: ['横に段々の枝', '円すいの形', '丸い玉の枝', '下へしだれる枝'], shapes: pineShapes },
  { name: '塀の透かし模様', choices: ['丸い穴', '重なる扇のアーチ', '縦長の四角', 'ひし形の穴'], shapes: fenceShapes },
];
export function checkSketch(choices) { return selections(choices, 4, 3) && SKETCH_ANSWER.every((n, i) => n === choices[i]); }
export function sketchClueHTML() {
  return `<section class="sa-clue"><h3>町並みの絵葉書・観察メモ</h3><p>川久保の街角を外から眺めて、<b>屋根・腰壁・松・塀の透かし</b>の4か所を写し取ろう。</p><ul><li>それぞれの欄で、見た形と同じ候補を1枚選ぶ。</li><li>屋根は、手前と奥の重なりにも注目。</li><li>「建物を見直す」で街角へ戻れる。選んだ形は覚えている。</li></ul><p>4か所すべて選んでから照合しよう。</p></section>`;
}

function puzzleBody(kind, number, intro, clue) {
  const body = el('div', `saga-puzzle saga-${kind}`);
  body.innerHTML = `<div class="sa-kicker"><span>佐賀のまち・旅の便り</span><span>${number} / 05</span></div><p class="sa-intro">${intro}</p><div class="sa-workspace"></div><details class="sa-reference"><summary>手がかりを読み返す</summary>${clue}</details><p class="sa-message" role="status" aria-live="polite"></p>`;
  return body;
}
function actions(body, label, reset = '最初から考える') {
  const row = el('div', 'sa-actions', `<button type="button" class="btn sa-reset">${reset}</button><button type="button" class="btn primary sa-check">${label}</button>`);
  body.querySelector('.sa-workspace').appendChild(row); return row;
}
function message(body, audio, text, wrong = false) { body.querySelector('.sa-message').textContent = text; if (wrong) audio.play('wrong'); }
function finish(body, audio, onSolved, panel, state, text) {
  if (state.done) return;
  state.done = true; message(body, audio, text); body.classList.add('solved');
  body.querySelectorAll('button').forEach((b) => { b.disabled = true; }); audio.play('solve'); onSolved?.(panel);
}
function open(ui, title, body) { return ui.openPanel({ title, body, cls: 'saga-panel' }); }

export function busPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let choices = BUS_LEGS.map((_, i) => integer(draft.choices?.[i], 2) ? draft.choices[i] : null);
  const state = { done: false }, body = puzzleBody('bus', '01', '佐賀駅から、おみやげ市を経て川久保へ。3区間の時刻を組み合わせて、約束に間に合う旅程を作ろう。', busClueHTML());
  const space = body.querySelector('.sa-workspace');
  space.innerHTML = `<p class="sa-fiction">この旅だけの架空の臨時便です。</p><div class="sa-route-picture">${svg('<path d="M28 34h304" fill="none" stroke="#8bacb0" stroke-width="5"/>' + [28,130,232,332].map((x, i) => `<circle cx="${x}" cy="34" r="12" fill="#faf4df" stroke="#456c74" stroke-width="3"/><text x="${x}" y="39" text-anchor="middle">${i + 1}</text>`).join('') + '<g text-anchor="middle"><text x="28" y="70">佐賀駅</text><text x="130" y="70">モール</text><text x="232" y="70">広場</text><text x="332" y="70">川久保</text></g>', '0 0 360 85', '佐賀駅、モラージュ佐賀、クリーク広場、川久保の順に向かう。')}</div><div class="sa-rule-summary">出発 9:10以降 ／ 買物 25分<br>広場の待ち 5〜15分 ／ 川久保 11:00まで</div>`;
  const cards = BUS_LEGS.map((leg, i) => {
    const card = el('fieldset', 'sa-bus-leg');
    card.innerHTML = `<legend>${i + 1}　${leg.from} → ${leg.to}</legend><p>所要 ${leg.duration}分</p><div class="sa-bus-options">${leg.departures.map((d, j) => `<button type="button" data-leg="${i}" data-bus="${j}" aria-pressed="false"><b>${timeLabel(d)} 発</b><span>${timeLabel(d + leg.duration)} 着</span></button>`).join('')}</div>`;
    card.querySelectorAll('button').forEach((button, j) => { button.onclick = () => { if (state.done) return; choices[i] = choices[i] === j ? null : j; audio.play('click'); emit(); paint(); }; });
    space.appendChild(card); return card;
  });
  const receipt = el('div', 'sa-bus-receipt'); space.appendChild(receipt);
  const row = actions(body, 'この旅程で出かける', '便を選び直す');
  const emit = () => onChange({ choices: [...choices] });
  const paint = () => {
    cards.forEach((card, i) => card.querySelectorAll('button').forEach((b, j) => { b.setAttribute('aria-pressed', String(choices[i] === j)); }));
    const result = checkBusPlan(choices);
    receipt.textContent = result.complete ? `買物終了 ${timeLabel(result.shopReady)} ／ 広場の待ち ${result.wait}分 ／ 川久保 ${timeLabel(result.legs[2].arrival)}着` : `選んだ区間 ${choices.filter((n) => n !== null).length} / 3`;
    message(body, audio, '時刻を押すと選択。同じ便をもう一度押すと、選択を外せる。');
  };
  row.querySelector('.sa-reset').onclick = () => { if (state.done) return; choices = [null, null, null]; emit(); paint(); audio.play('click'); };
  row.querySelector('.sa-check').onclick = () => { if (state.done) return; const result = checkBusPlan(choices); if (!result.ok) { message(body, audio, result.issues[0], true); return; } finish(body, audio, onSolved, panel, state, '買物も乗り継ぎも、ちょうどよく。川久保には10:55に着く旅になった。'); };
  const panel = open(ui, 'ほしまわり臨時便・旅程づくり', body); paint(); return panel;
}

function shopIcon(id) {
  const shapes = {
    nori: '<path d="M28 12h72v57H28z" fill="#d9c98b"/><path d="M35 20h58v39H35z" fill="#405f4a"/><path d="M39 24h50m-50 9h50m-50 9h50m-50 9h50" stroke="#607951"/><path d="M44 56h40v16H44z" fill="#faf4df"/><text x="64" y="68" text-anchor="middle">のり</text>',
    bouro: '<g fill="#c99d5c" stroke="#9d733e" stroke-width="2"><ellipse cx="44" cy="43" rx="24" ry="20"/><ellipse cx="82" cy="43" rx="24" ry="20"/></g><g fill="#e5c789"><ellipse cx="43" cy="39" rx="16" ry="11"/><ellipse cx="81" cy="39" rx="16" ry="11"/></g>',
    tea: '<path d="M28 14h66v57H28z" fill="#f4e8c2" stroke="#8c9b72" stroke-width="2"/><path d="M30 15h63v12H30z" fill="#78906c"/><path d="M51 55q-5-22 24-24 3 23-24 24m0 0 20-19" fill="#758a62" stroke="#5f7857" stroke-width="2"/>',
    card: '<path d="m15 18 97-6 4 55-97 7z" fill="#fff7df" stroke="#a5a18b" stroke-width="2"/><path d="M25 30h73v29H25z" fill="#b8d9dc"/><path d="M65 22q-25 0-18 18l13 14h10l13-14q7-18-18-18" fill="#d69c6b"/><path d="M64 23q-9 14 0 31m2-31q9 14 0 31" fill="none" stroke="#f5d492" stroke-width="3"/><path d="M61 58h9v7h-9z" fill="#947657"/>',
  }; return svg(shapes[id]);
}
export function shoppingPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let counts = SHOP_ITEMS.map((_, i) => integer(draft.counts?.[i], 5) ? draft.counts[i] : 0);
  const state = { done: false }, body = puzzleBody('shopping', '02', 'モラージュ佐賀のおみやげ市。買物メモの4条件を満たすように、品物の数を決めよう。', shoppingClueHTML());
  const space = body.querySelector('.sa-workspace');
  space.innerHTML = '<p class="sa-fiction">価格は、この旅のおみやげ市だけの設定です。</p><div class="sa-rule-summary">6個で1,000円<br>のり＝絵葉書 ／ 丸ぼうろ＝和紅茶</div><div class="sa-shop-shelves"></div>';
  const cards = SHOP_ITEMS.map((item, i) => {
    const card = el('section', 'sa-shop-item', `${shopIcon(item.id)}<h3>${item.name}</h3><p>1個 ${item.price}円</p><div class="sa-quantity"><button type="button" class="btn" data-item="${i}" data-delta="-1" aria-label="${item.name}を1個減らす">−</button><output aria-label="${item.name}の個数">0</output><button type="button" class="btn" data-item="${i}" data-delta="1" aria-label="${item.name}を1個増やす">＋</button></div>`);
    card.querySelectorAll('button').forEach((b) => { b.onclick = () => { if (state.done) return; const n = counts[i] + Number(b.dataset.delta); if (!integer(n, 5)) return; counts[i] = n; audio.play('click'); emit(); paint(); }; });
    space.querySelector('.sa-shop-shelves').appendChild(card); return card;
  });
  const receipt = el('div', 'sa-receipt'); space.appendChild(receipt);
  const row = actions(body, 'レシートとメモを照合', 'かごを空にする');
  const emit = () => onChange({ counts: [...counts] });
  const paint = () => {
    cards.forEach((card, i) => { card.querySelector('output').textContent = `${counts[i]}個`; card.querySelector('[data-delta="-1"]').disabled = counts[i] === 0; card.querySelector('[data-delta="1"]').disabled = counts[i] === 5; });
    const result = checkShopping(counts);
    receipt.innerHTML = `<h3>旅のレシート</h3>${SHOP_ITEMS.map((item, i) => `<div><span>${item.name} × ${counts[i]}</span><span>${item.price * counts[i]}円</span></div>`).join('')}<div class="sa-receipt-total"><b>合計 ${result.count}個</b><b>${result.total.toLocaleString('ja-JP')}円</b></div>`;
    message(body, audio, '品物の数は0〜5個。合計と、同じ個数の組を見比べよう。');
  };
  row.querySelector('.sa-reset').onclick = () => { if (state.done) return; counts = [0, 0, 0, 0]; emit(); paint(); audio.play('click'); };
  row.querySelector('.sa-check').onclick = () => { if (state.done) return; if (!checkShopping(counts).ok) { message(body, audio, '買物メモと、まだ合っていない。6個・1,000円・同じ個数の2組を確かめよう。', true); return; } finish(body, audio, onSolved, panel, state, '6個で、ちょうど1,000円。旅のおみやげがそろった。'); };
  const panel = open(ui, '旅のおみやげ市', body); paint(); return panel;
}

const sluiceNode = (id) => SLUICE_GATES.find((g) => g.id === id) || SLUICE_TARGETS.find((f) => f.id === id) || { id: 'house', x: 425, y: 270 };
const sluicePath = (a, b) => { const p = sluiceNode(a), q = sluiceNode(b); return `M${p.x} ${p.y}C${p.x} ${(p.y + q.y) / 2} ${q.x} ${(p.y + q.y) / 2} ${q.x} ${q.y}`; };
export function sluicePanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let values = SLUICE_GATES.map((_, i) => integer(draft.values?.[i], 2) ? draft.values[i] : SLUICE_START[i]);
  const state = { done: false }, body = puzzleBody('sluice', '03', 'クリークを巡る水の道をつなごう。A〜Eの水門を切り替えて、3枚の田へ水を届ける。住宅側には流さないように。', sluiceClueHTML());
  const space = body.querySelector('.sa-workspace'), map = el('div', 'sa-sluice-map');
  const edges = SLUICE_GATES.flatMap((g) => [...new Set(g.options.flatMap((o) => o.to))].map((to) => [g.id, to]));
  map.innerHTML = svg(`<path d="M230 5v53" class="sa-canal wet"/><text x="247" y="23">上流 ↓</text>${edges.map(([a, b]) => `<path d="${sluicePath(a, b)}" class="sa-canal" data-water-edge="${a}-${b}"/>`).join('')}${SLUICE_TARGETS.map((f) => `<g class="sa-field" data-field="${f.id}"><rect x="${f.x - 53}" y="${f.y - 28}" width="106" height="55" rx="10"/><path d="M${f.x - 39} ${f.y + 8}h78m-78 8h78"/><text x="${f.x}" y="${f.y - 9}" text-anchor="middle">${f.name}</text><text class="sa-field-status" x="${f.x}" y="${f.y + 6}" text-anchor="middle">まだ</text></g>`).join('')}<g class="sa-house"><path d="m392 246 33-25 33 25v46h-66z"/><text x="425" y="261" text-anchor="middle">× 住宅</text><text class="sa-house-status" x="425" y="279" text-anchor="middle">流さない</text></g>${SLUICE_GATES.map((g) => `<g class="sa-gate" data-gate-node="${g.id}"><circle cx="${g.x}" cy="${g.y}" r="22"/><text x="${g.x}" y="${g.y + 6}" text-anchor="middle">${g.id}</text></g>`).join('')}`, '0 0 490 505', '上流からAで西Bと東Cへ。Bから①の田またはD。CからDまたは住宅。Dから②の田またはE。Eから③の田または住宅。');
  space.appendChild(map);
  const controls = el('div', 'sa-gate-controls'); space.appendChild(controls);
  const rows = SLUICE_GATES.map((g, i) => {
    const row = el('fieldset', 'sa-gate-control', `<legend>${g.id}　${g.name}</legend><div>${g.options.map((o, j) => `<button type="button" data-gate="${i}" data-setting="${j}" aria-pressed="false">${o.name}</button>`).join('')}</div>`);
    row.querySelectorAll('button').forEach((b, j) => { b.onclick = () => { if (state.done) return; values[i] = j; audio.play('click'); emit(); paint(); }; }); controls.appendChild(row); return row;
  });
  const row = actions(body, 'この流れで水を届ける', '水門を元に戻す');
  const emit = () => onChange({ values: [...values] });
  const paint = () => {
    const result = traceSluice(values), active = new Set(result.edges.map(([a, b]) => `${a}-${b}`));
    rows.forEach((r, i) => r.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(values[i] === j))));
    map.querySelectorAll('[data-water-edge]').forEach((e) => e.classList.toggle('wet', active.has(e.dataset.waterEdge)));
    map.querySelectorAll('[data-gate-node]').forEach((e) => e.classList.toggle('wet', result.wet.includes(e.dataset.gateNode)));
    map.querySelectorAll('[data-field]').forEach((e) => { const reached = result.reached.includes(e.dataset.field); e.classList.toggle('wet', reached); e.querySelector('.sa-field-status').textContent = reached ? '✓ 届いた' : 'まだ'; });
    map.querySelector('.sa-house').classList.toggle('flooded', result.residential); map.querySelector('.sa-house-status').textContent = result.residential ? '× 水が流入' : '流さない';
    message(body, audio, result.residential ? '住宅側へ水が流れている。×の出口につながる水門を見直そう。' : `田へ届いた水 ${result.reached.filter((id) => id.startsWith('field')).length} / 3。入口から流れをたどろう。`);
  };
  row.querySelector('.sa-reset').onclick = () => { if (state.done) return; values = [...SLUICE_START]; audio.play('click'); emit(); paint(); };
  row.querySelector('.sa-check').onclick = () => { if (state.done) return; if (!traceSluice(values).ok) { message(body, audio, '3枚の田すべてに届け、住宅には流さない。水が来ている分かれ道から確かめよう。', true); return; } finish(body, audio, onSolved, panel, state, '3枚の田へ、穏やかな水の道がつながった。住宅側も安心だ。'); };
  const panel = open(ui, 'クリークの水番', body); paint(); return panel;
}

const balloonPoint = ([x, y]) => [36 + x * 48, 36 + y * 48];
export function balloonPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let heights = checkBalloonRoute(draft.heights).valid ? [...draft.heights] : [];
  const state = { done: false }, body = puzzleBody('balloon', '04', 'バルーンで3つの目印を巡ろう。次の風の予報を読み、高度を選ぶと、その風の向きに1マス流れる。', balloonClueHTML());
  const space = body.querySelector('.sa-workspace'), board = el('div', 'sa-balloon-board');
  const { size, hazards, marks, start, goal } = BALLOON_RULES;
  board.innerHTML = svg(`<rect x="12" y="12" width="288" height="288" rx="8" class="sa-flight-background"/>${Array.from({ length: size + 1 }, (_, i) => `<path d="M${12 + i * 48} 12v288M12 ${12 + i * 48}h288" class="sa-flight-grid"/>`).join('')}${hazards.map(([x, y]) => { const [cx, cy] = balloonPoint([x, y]); return `<rect x="${cx - 21}" y="${cy - 21}" width="42" height="42" rx="6" class="sa-flight-hazard"/><text x="${cx}" y="${cy + 7}" text-anchor="middle" class="sa-hazard-cross">×</text>`; }).join('')}<text x="16" y="9" class="sa-compass">北 ↑</text><text x="304" y="161" class="sa-compass">東</text>${marks.map((m, i) => { const [x, y] = balloonPoint([m.x, m.y]); return `<g class="sa-flight-mark" data-mark="${i}"><circle cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y + 5}" text-anchor="middle">${i + 1}</text></g>`; }).join('')}${[[start, '出発'], [goal, '着地']].map(([point, label]) => { const [x, y] = balloonPoint(point); return `<g class="sa-flight-place"><path d="M${x - 17} ${y + 16}h34v-30h-34z"/><text x="${x}" y="${y + 5}" text-anchor="middle">${label}</text></g>`; }).join('')}<path class="sa-flight-path" d=""/><g class="sa-balloon-token"><path d="M0-18c-15 0-17 15-8 23l5 6h6l5-6C17-3 15-18 0-18Z"/><path d="M-4 14h8v7h-8z"/></g>`, '0 0 320 318', '6行6列の飛行盤。北が上。南西から出発し、①水車・②橋・③風見を通って着地点へ。×は強風域。');
  space.appendChild(board);
  space.appendChild(el('p', 'sa-map-key', '① 水車　② 橋　③ 風見　／　× 強風域'));
  const status = el('div', 'sa-flight-status'); space.appendChild(status);
  const altitude = el('div', 'sa-altitude-controls', BALLOON_HEIGHTS.map((name, i) => `<button type="button" data-height="${i}"><b>${name}</b><span></span></button>`).join('')); space.appendChild(altitude);
  const forecast = el('details', 'sa-forecast', `<summary>9回ぶんの風の予報</summary><table><caption>矢印は流れる先。高度を選ぶ前に、先の風も読もう。</caption><thead><tr><th scope="col">回</th>${BALLOON_HEIGHTS.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${BALLOON_WINDS.map((winds, t) => `<tr data-turn="${t}"><th scope="row">${t + 1}</th>${winds.map((id) => `<td>${WIND_DIRECTIONS[id].arrow} ${WIND_DIRECTIONS[id].name}</td>`).join('')}</tr>`).join('')}</tbody></table>`); forecast.open = true; space.appendChild(forecast);
  const history = el('p', 'sa-flight-history'); space.appendChild(history);
  const row = actions(body, 'ここに着地する', '飛行をやり直す');
  const back = el('button', 'btn sa-back', 'ひとつ戻す'); back.type = 'button'; row.prepend(back);
  const emit = () => onChange({ heights: [...heights] });
  const paint = () => {
    const result = checkBalloonRoute(heights), next = heights.length;
    const points = result.points.map(balloonPoint);
    board.querySelector('.sa-flight-path').setAttribute('d', points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '));
    board.querySelector('.sa-balloon-token').setAttribute('transform', `translate(${points.at(-1)[0]},${points.at(-1)[1]})`);
    board.querySelectorAll('[data-mark]').forEach((m, i) => m.classList.toggle('visited', result.visited.includes(i)));
    status.innerHTML = `<span>使った風 <b>${next} / 9回</b></span><span>目印 <b>${result.visited.length} / 3</b></span>`;
    altitude.querySelectorAll('button').forEach((b, i) => { b.disabled = next >= BALLOON_RULES.maxTurns; const wind = next < BALLOON_WINDS.length ? WIND_DIRECTIONS[BALLOON_WINDS[next][i]] : null; b.querySelector('span').textContent = wind ? `${next + 1}回目 ${wind.arrow} ${wind.name}へ` : '風を使い切った'; });
    forecast.querySelectorAll('[data-turn]').forEach((tr, i) => { tr.classList.toggle('current', i === next); tr.setAttribute('aria-current', i === next ? 'step' : 'false'); });
    history.textContent = heights.length ? `選んだ高度：${heights.map((h, i) => `${i + 1}.${BALLOON_HEIGHTS[h]}`).join(' → ')}` : 'まだ風に乗っていない。①水車 → ②橋 → ③風見は、どの順でもよい。';
    back.disabled = !heights.length;
    message(body, audio, result.ok ? '3つの目印を通って着地点へ。ここに着地しよう。' : result.reason || `次は${next + 1}回目。高度ごとの矢印を比べよう。`);
  };
  altitude.querySelectorAll('button').forEach((b, i) => { b.onclick = () => { if (state.done || heights.length >= BALLOON_RULES.maxTurns) return; const candidate = [...heights, i], result = checkBalloonRoute(candidate); if (!result.valid) { message(body, audio, result.reason, true); return; } heights = candidate; audio.play('click'); emit(); paint(); }; });
  back.onclick = () => { if (state.done || !heights.length) return; heights.pop(); audio.play('click'); emit(); paint(); };
  row.querySelector('.sa-reset').onclick = () => { if (state.done) return; heights = []; audio.play('click'); emit(); paint(); };
  row.querySelector('.sa-check').onclick = () => { if (state.done) return; if (!checkBalloonRoute(heights).ok) { message(body, audio, '①水車・②橋・③風見をすべて通り、9回以内に旗の着地点へ向かおう。', true); return; } finish(body, audio, onSolved, panel, state, '水車も橋も風見も、空から見つけた。バルーンはふわりと着地した。'); };
  const panel = open(ui, '空を渡るバルーン', body); paint(); return panel;
}

export function sketchPanel(ui, audio, { onSolved, draft = {}, onChange = () => {} } = {}) {
  let choices = SKETCH_GROUPS.map((_, i) => integer(draft.choices?.[i], 3) ? draft.choices[i] : null);
  const state = { done: false }, body = puzzleBody('sketch', '05', '川久保で見つけた町並みを絵葉書にしよう。屋根、腰壁、松、塀の透かしを外から観察して、見た形を選んでね。', sketchClueHTML());
  const space = body.querySelector('.sa-workspace');
  const groups = SKETCH_GROUPS.map((g, i) => {
    const group = el('fieldset', 'sa-sketch-group', `<legend>${i + 1}　${g.name}</legend><div class="sa-sketch-options">${g.choices.map((label, j) => `<button type="button" data-sketch="${i}" data-shape="${j}" aria-pressed="false">${svg(g.shapes[j])}<span>${label}</span></button>`).join('')}</div>`);
    group.querySelectorAll('button').forEach((b, j) => { b.onclick = () => { if (state.done) return; choices[i] = choices[i] === j ? null : j; audio.play('click'); emit(); paint(); }; }); space.appendChild(group); return group;
  });
  const row = actions(body, '4か所を照合する', '選択を消す');
  const revisit = el('button', 'btn sa-revisit', '建物を見直す'); revisit.type = 'button'; row.prepend(revisit);
  const emit = () => onChange({ choices: [...choices] });
  const paint = () => { groups.forEach((g, i) => g.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(choices[i] === j)))); message(body, audio, `選んだ形 ${choices.filter((n) => n !== null).length} / 4。迷ったら、建物をゆっくり見直そう。`); };
  revisit.onclick = () => { if (state.done) return; emit(); audio.play('close'); panel.close(); };
  row.querySelector('.sa-reset').onclick = () => { if (state.done) return; choices = [null, null, null, null]; audio.play('click'); emit(); paint(); };
  row.querySelector('.sa-check').onclick = () => { if (state.done) return; if (choices.includes(null)) { message(body, audio, '4か所すべての形を選んでから、照合しよう。', true); return; } if (!checkSketch(choices)) { message(body, audio, '写し取った形が、町並みとまだ合っていない。4か所をもう一度見比べよう。', true); return; } finish(body, audio, onSolved, panel, state, '屋根も松も、街角で見たとおり。川久保の絵葉書ができあがった。'); };
  const panel = open(ui, '川久保・町並みの絵葉書', body); paint(); return panel;
}
