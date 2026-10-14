// ほしまわり号の路線（ステージの順番）。
// 順番を入れかえるときはここだけ直せばよい（ステージの番号・次の駅・クリア画面に反映される）。
export const ROUTE = [
  { id: 'station', name: 'はざま駅', emoji: '🚉', sub: '世界のあいだの小さな駅' },
  { id: 'sky', name: '天空の街', emoji: '☁️', sub: '雲の上の風車の街' },
  { id: 'edo', name: '江戸の宿場町', emoji: '🏯', sub: '夜明け前の宿場と浅草寺' },
  { id: 'port', name: '潮の港町', emoji: '⚓', sub: '潮の満ち引きの港' },
  { id: 'hero', name: '勇者の城下町', emoji: '🏰', sub: 'お城と市場のにぎわい' },
  { id: 'maou', name: '魔王城', emoji: '🦇', sub: '紫の炎の城' },
  { id: 'onsen', name: '寂れた温泉街', emoji: '♨️', sub: '湯けむりと提灯の路地' },
  { id: 'kinoko', name: '巨大キノコの森', emoji: '🍄', sub: '雨上がりの小さな世界' },
  { id: 'toy', name: 'からくりおもちゃの街', emoji: '🧸', sub: 'ゼンマイじかけの街' },
  { id: 'japan', name: '現代日本', emoji: '🗼', sub: 'いつか見た、あの町' },
].map((s, i) => ({ ...s, no: i + 1 }));

export const routeIndex = (id) => ROUTE.findIndex((s) => s.id === id);
export const stageNo = (id) => routeIndex(id) + 1;
export const nextStop = (id) => ROUTE[routeIndex(id) + 1] || null;
