// ほしまわり号の路線（ステージの順番）。
// 順番を入れかえるときはここだけ直せばよい（ステージの番号・次の駅・クリア画面に反映される）。
export const ROUTE = [
  { id: 'station', name: 'はざま駅' },
  { id: 'sky', name: '天空の街' },
  { id: 'edo', name: '江戸の宿場町' },
  { id: 'port', name: '潮の港町' },
  { id: 'hero', name: '勇者の城下町' },
  { id: 'maou', name: '魔王城' },
  { id: 'onsen', name: '寂れた温泉街' },
  { id: 'kinoko', name: '巨大キノコの森' },
  { id: 'toy', name: 'からくりおもちゃの街' },
  { id: 'japan', name: '現代日本' },
].map((s, i) => ({ ...s, no: i + 1 }));

export const routeIndex = (id) => ROUTE.findIndex((s) => s.id === id);
export const stageNo = (id) => routeIndex(id) + 1;
export const nextStop = (id) => ROUTE[routeIndex(id) + 1] || null;
