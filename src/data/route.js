// ほしまわり号の路線（ステージの順番）。
// 順番を入れかえるときはここだけ直せばよい（ステージの番号・次の駅・クリア画面に反映される）。
// pass：その駅から始められる「あいことば」。ひとつ前の駅の思い出のことば（クリア画面とメニューに出る）。
export const ROUTE = [
  { id: 'station', name: 'はざま駅', emoji: '🚉', sub: '世界のあいだの小さな駅' },
  { id: 'sky', pass: 'ほしのきっぷ', name: '天空の街', emoji: '☁️', sub: '雲の上の風車の街' },
  { id: 'edo', pass: 'かざぐるま', name: '江戸の宿場町', emoji: '🏯', sub: '夜明け前の宿場と浅草寺' },
  { id: 'port', pass: 'ときのかね', name: '潮の港町', emoji: '⚓', sub: '潮の満ち引きの港' },
  { id: 'hero', pass: 'しおさい', name: '勇者の城下町', emoji: '🏰', sub: 'お城と市場のにぎわい' },
  { id: 'maou', pass: 'つきあかり', name: '魔王城', emoji: '🦇', sub: '紫の炎の城' },
  { id: 'onsen', pass: 'むらさきのひ', name: '寂れた温泉街', emoji: '♨️', sub: '湯けむりと提灯の路地' },
  { id: 'kinoko', pass: 'ゆけむり', name: '巨大キノコの森', emoji: '🍄', sub: '雨上がりの小さな世界' },
  { id: 'toy', pass: 'あまつぶ', name: 'からくりおもちゃの街', emoji: '🧸', sub: 'ゼンマイじかけの街' },
  { id: 'japan', pass: 'ぜんまい', name: '東京', emoji: '🗼', sub: 'いつか見た、あの町' },
].map((s, i) => ({ ...s, no: i + 1 }));

export const routeIndex = (id) => ROUTE.findIndex((s) => s.id === id);

// 終点の先は自由に選ぶ「追加の旅」。本編の路線・あいことばには連結しない。
export const EXTRA_ROUTE = [
  { id: 'museum', name: '星あかりの博物館', emoji: '🏛️', sub: '夜の展示に、もう一度星を灯す', extra: true },
  { id: 'saga', name: '田舎の寄り道', emoji: '🌾', sub: '屋根とクリークと、広い空', extra: true },
];
export const stageInfo = (id) => ROUTE.find((s) => s.id === id) || EXTRA_ROUTE.find((s) => s.id === id) || null;
export const isExtraStage = (id) => EXTRA_ROUTE.some((s) => s.id === id);
export const stageNo = (id) => isExtraStage(id) ? 'EXTRA' : routeIndex(id) + 1;
export const stageLabel = (id) => isExtraStage(id) ? '追加の旅' : `STAGE ${stageNo(id)}`;
export const nextStop = (id) => {
  const i = routeIndex(id);
  return i >= 0 ? ROUTE[i + 1] || null : null;
};

/** あいことばのカタカナ・空白・全角半角のちがいをそろえる。 */
export const normalizePass = (word) => String(word || '').normalize('NFKC').replace(/[\s・ー-]/g, '')
  .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 入力されたあいことばの駅。無ければ null */
export function stageByPass(word) {
  const w = normalizePass(word);
  return (w && ROUTE.find((s) => s.pass && normalizePass(s.pass) === w)) || null;
}
