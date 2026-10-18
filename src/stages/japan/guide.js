import * as THREE from 'three';
import { el } from '../../core/ui.js';
import { layoutPoint } from './layout.js';

// カメラで街を見渡すための案内。移動先は模型と同じ旧街区の座標で定義する。
export const JAPAN_AREAS = [
  { id: 'asakusa', name: '浅草寺・仲見世', icon: '🏯', sub: '参道と本堂、五重塔', at: [-10.8, 1.3, 2.5], dist: 29, portraitScale: 1.5, polar: .72, theta: .18 },
  { id: 'shibuya', name: '渋谷・時の鐘', icon: '📺', sub: 'スクランブル交差点とハチ公口', at: [1.35, 3.4, .7], dist: 37, portraitScale: 1.55, polar: .98, theta: -.12 },
  { id: 'platform', name: '浅草駅・ホーム', icon: '🚂', sub: 'ほしまわり号と、ホームの時計', at: [-21.5, 1.7, -3.6], dist: 25, portraitScale: 1.7, polar: 1.04, theta: .08 },
  { id: 'tower', name: '東京タワー・船着き場', icon: '🗼', sub: 'タワーの庭と隅田川', at: [12.2, 9, 3.4], dist: 66, polar: 1.18, theta: .25 },
  { id: 'station', name: '東京駅', icon: '🚉', sub: '赤レンガの駅舎と駅前広場', at: [22.5, 2.0, 0], dist: 29, portraitScale: 1.5, polar: 1.06, theta: .12 },
  { id: 'ueno', name: '上野公園', icon: '🌳', sub: '池と夏まつりのやぐら', at: [-23.4, .8, 16.1], dist: 28, polar: .85, theta: .12 },
  { id: 'shitamachi', name: '下町の路地', icon: '🏮', sub: '銭湯と小さな家並み', at: [-7.4, 1.1, 16.1], dist: 28, polar: .95, theta: .2 },
  { id: 'odaiba', name: 'お台場', icon: '🌉', sub: '海辺と白いつり橋', at: [18.2, 2.3, 17.6], dist: 38, polar: .85, theta: .14 },
  { id: 'skyline', name: '新宿・高層ビル街', icon: '🏙️', sub: '双子の塔と、いろいろなビルの屋根', at: [0, 7, -17], portraitAt: [-9, 7, -17], dist: 88, portraitScale: 1, polar: 1.05, theta: .08 },
];

export function showAreaGuide(game) {
  const body = el('div', 'japan-area-guide');
  body.appendChild(el('p', 'panel-note', '見たいエリアを選ぶと、その街角を見渡せます。'));
  const list = el('div', 'stage-list');
  let panel;
  for (const area of JAPAN_AREAS) {
    const button = el('button', 'stage-card open', `<div class="sc-emoji">${area.icon}</div><div class="sc-name">${area.name}</div><div class="sc-sub">${area.sub}</div>`);
    button.dataset.area = area.id;
    button.onclick = async () => {
      game.audio.play('click');
      panel.close();
      if (innerWidth < innerHeight || area.id === 'skyline') { game.ui.questsCollapsed = true; game.refreshQuests(); }
      const at = innerWidth < innerHeight ? (area.portraitAt ?? area.at) : area.at;
      await game.focusOn(layoutPoint(new THREE.Vector3(...at)), {
        dist: area.dist * (innerWidth < innerHeight ? (area.portraitScale ?? 1.24) : 1),
        polar: area.polar, theta: area.theta, keepAngle: true, duration: .8,
      });
    };
    list.appendChild(button);
  }
  body.appendChild(list);
  panel = game.ui.openPanel({ title: '東京さんぽ案内', body, cls: 'wide japan-area-panel' });
  return panel;
}
