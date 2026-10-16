// 箱庭を起動せず、旧セーブの移行と、本編・追加の旅の往復を確認する。
import assert from 'node:assert/strict';
import { ROUTE, nextStop, stageNo } from '../src/data/route.js';
import { freshState, normalizeSave, rememberState, savedJourney, extrasUnlocked, switchJourney } from '../src/core/save-state.js';

const oldMain = {
  stage: 'japan', flags: { introDone: true, towerLit: true }, inventory: ['koBell'],
  counts: { gold: 2 }, elapsed: 720, hints: 3, cleared: ['japan'],
  notes: [{ id: 'old-note', stage: 'japan', title: '古い旅のメモ', html: 'だいじな手がかり' }],
};
const original = JSON.stringify(oldMain);
let state = normalizeSave(oldMain);
assert.equal(extrasUnlocked(state), true, '旧記録に japan だけあっても追加の旅を解放');
assert.deepEqual(savedJourney(state, 'japan').flags, oldMain.flags);
assert.equal(JSON.stringify(oldMain), original, '移行で読み込み元を変更しない');
assert.equal(extrasUnlocked(freshState()), false, '本編クリア前は解放しない');
assert.equal(ROUTE.length, 10);
assert.equal(nextStop('japan'), null, '本編終点は追加の旅へ連結しない');
assert.equal(nextStop('museum'), null, '追加の旅も本編始発へ連結しない');
assert.equal(stageNo('museum'), 'EXTRA');
console.log('OK 旧セーブ移行・追加の旅の解放・本編10駅の維持');

state = switchJourney(state, 'museum');
assert.equal(state.flags.introDone, undefined, '初回は導入から');
assert.deepEqual(state.inventory, [], '本編の持ち物を追加の旅へ持ち込まない');
state.flags.introDone = true;
state.flags.galleryOpen = true;
state.inventory.push('museumTicket');
state.elapsed = 180;
state.hints = 1;
state.notes = [{ id: 'museum-note', stage: 'museum', title: '展示のメモ', html: '展示の手がかり' }];
state = rememberState(state);
const museum = savedJourney(state, 'museum');
state = switchJourney(state, 'japan');
assert.deepEqual(state.flags, oldMain.flags);
assert.deepEqual(state.inventory, oldMain.inventory);
assert.deepEqual(state.counts, oldMain.counts);
assert.deepEqual(state.notes, oldMain.notes);
assert.equal(state.elapsed, oldMain.elapsed);
assert.equal(state.hints, oldMain.hints);
state = switchJourney(state, 'museum');
for (const key of ['flags', 'inventory', 'notes', 'elapsed', 'hints']) assert.deepEqual(state[key], museum[key]);
console.log('OK 本編と追加の旅のフラグ・持ち物・メモ・時間を個別に復帰');

state.cleared.push('museum');
state.flags.departed = true;
state = rememberState(state);
state = switchJourney(state, 'museum', { restart: true });
assert.deepEqual(state.flags, {}, 'やり直しは導入も再生する');
assert.deepEqual(state.inventory, []);
assert.equal(state.elapsed, 0);
assert.deepEqual(state.cleared, ['japan', 'museum'], 'やり直してもクリア記録は残す');
assert.deepEqual(savedJourney(state, 'japan').flags, oldMain.flags, '追加をやり直しても本編は保持');
const resumed = switchJourney(state, 'museum');
assert.deepEqual(resumed.flags, {}, '初回出発の直前に読み直しても、導入を既読にしない');
console.log('OK 最初から・初回出発・クリア記録の保全');

const saved = normalizeSave(JSON.parse(JSON.stringify(state)));
assert.deepEqual(saved, state, '保存と再読込で状態を維持する');
const older = { ...freshState('station'), cleared: ['station'] };
const merged = rememberState(older, saved);
assert.deepEqual(merged.cleared, ['japan', 'museum', 'station'], '現在の記録と保存済みクリアを統合');
assert.ok(savedJourney(merged, 'museum'), '旧形式の状態を保存しても既存の追加記録を消さない');
assert.equal(normalizeSave(null), null);
assert.equal(normalizeSave({ stage: 'museum' }), null);
console.log('OK 保存の往復・旧状態との統合・空のセーブ');
