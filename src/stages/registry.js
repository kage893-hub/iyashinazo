import { StationStage } from './station/index.js';
import { SkyStage } from './sky/index.js';
import { OnsenStage } from './onsen/index.js';

// 旅の路線図。ステージは順番に追加していく予定。
export const STAGES = [
  { id: 'station', no: 1, name: 'はざま駅', sub: '世界のあいだの小さな駅', emoji: '🚉', Stage: StationStage },
  { id: 'sky', no: 2, name: '天空の街', sub: '雲の上の風車の街', emoji: '☁️', Stage: SkyStage },
  { id: 'onsen', no: 3, name: '寂れた温泉街', sub: '湯けむりと提灯の路地', emoji: '♨️', Stage: OnsenStage },
  { id: 'hero', no: 4, name: '勇者の城下町', sub: 'お城と市場のにぎわい', emoji: '🏰', Stage: null },
  { id: 'japan', no: 5, name: '現代日本', sub: 'いつか見た、あの町', emoji: '🏙️', Stage: null },
];
