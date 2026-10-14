import { ROUTE } from '../data/route.js';
import { StationStage } from './station/index.js';
import { SkyStage } from './sky/index.js';
import { OnsenStage } from './onsen/index.js';

// 実装ずみのステージ。まだ無いものは Stage: null（準備中）
const IMPL = { station: StationStage, sky: SkyStage, onsen: OnsenStage };

export const STAGES = ROUTE.map((s) => ({ ...s, Stage: IMPL[s.id] || null }));
export const isPlayable = (id) => !!IMPL[id];
