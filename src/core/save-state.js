import { isExtraStage } from '../data/route.js';

export const SAVE_KEY = 'hoshimawari-save-v1';
const copy = (value) => JSON.parse(JSON.stringify(value));
const unique = (values) => [...new Set(values.filter((v) => typeof v === 'string'))];

export function freshState(stage = 'station') {
  return { stage, flags: {}, inventory: [], counts: {}, elapsed: 0, hints: 0, cleared: [] };
}

// 各旅の持ち物・メモ・時間は、その旅にだけ属する。入れ子のセーブは作らない。
function checkpoint(state) {
  const { journeys, cleared, ...progress } = state;
  return copy(progress);
}

/** 旧来の単一セーブも、そのまま現在の旅の記録として読み込む。 */
export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object' || !raw.flags || typeof raw.flags !== 'object') return null;
  const state = { ...freshState(), ...copy(raw) };
  state.cleared = unique(Array.isArray(raw.cleared) ? raw.cleared : []);
  const old = raw.journeys || {};
  state.journeys = {
    main: old.main?.flags && !isExtraStage(old.main.stage) ? checkpoint(old.main) : null,
    extras: {},
  };
  for (const [id, saved] of Object.entries(old.extras || {})) {
    if (saved?.flags && saved.stage === id && isExtraStage(id)) state.journeys.extras[id] = checkpoint(saved);
  }
  rememberCurrent(state);
  return state;
}

function rememberCurrent(state) {
  const saved = checkpoint(state);
  if (isExtraStage(state.stage)) state.journeys.extras[state.stage] = saved;
  else state.journeys.main = saved;
}

/** 現在の旅を保存。別の旅の記録と、これまでのクリア記録を保つ。 */
export function rememberState(current, previous = null) {
  const state = normalizeSave(current) || normalizeSave(previous) || normalizeSave(freshState());
  const old = normalizeSave(previous);
  state.cleared = unique([...(old?.cleared || []), ...state.cleared]);
  if (old) {
    state.journeys.extras = { ...old.journeys.extras, ...state.journeys.extras };
    if (!state.journeys.main) state.journeys.main = old.journeys.main;
  }
  rememberCurrent(state);
  return state;
}

export function savedJourney(state, id) {
  const saved = normalizeSave(state);
  if (!saved) return null;
  const progress = isExtraStage(id) ? saved.journeys.extras[id] : saved.journeys.main;
  return progress?.stage === id ? copy(progress) : null;
}

/** japan のみ記録された古いセーブも、本編クリアとして尊重する。 */
export const extrasUnlocked = (state) => !!state?.cleared?.includes('japan');

/** 別の旅へ。初回と明示的なやり直し以外では、その旅の続きを復元できる。 */
export function switchJourney(current, id, { restart = false } = {}) {
  const state = rememberState(current);
  const saved = restart ? null : savedJourney(state, id);
  const next = { ...(saved || freshState(id)), cleared: state.cleared, journeys: state.journeys };
  rememberCurrent(next);
  return next;
}
