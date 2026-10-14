import { ROUTE } from '../data/route.js';
import { StationStage } from './station/index.js';
import { SkyStage } from './sky/index.js';
import { OnsenStage } from './onsen/index.js';
import { EdoStage } from './edo/index.js';
import { PortStage } from './port/index.js';
import { HeroStage } from './hero/index.js';
import { MaouStage } from './maou/index.js';
import { KinokoStage } from './kinoko/index.js';

// 実装ずみのステージ。まだ無いものは Stage: null（準備中）
const IMPL = { station: StationStage, sky: SkyStage, edo: EdoStage, port: PortStage, hero: HeroStage, maou: MaouStage, onsen: OnsenStage, kinoko: KinokoStage };

export const STAGES = ROUTE.map((s) => ({ ...s, Stage: IMPL[s.id] || null }));
export const isPlayable = (id) => !!IMPL[id];
