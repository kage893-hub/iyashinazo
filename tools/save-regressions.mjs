// 箱庭を起動せず、旧セーブの移行と、本編・追加の旅の往復を確認する。
import assert from 'node:assert/strict';
import { ROUTE, EXTRA_ROUTE, nextStop, stageNo } from '../src/data/route.js';
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
assert.ok(EXTRA_ROUTE.some((s) => s.id === 'saga'), '佐賀を追加の旅に登録する');
assert.equal(nextStop('saga'), null, '佐賀も本編の路線へ連結しない');
assert.equal(stageNo('saga'), 'EXTRA');
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
const oldMuseumSave = JSON.parse(JSON.stringify(state));
state = switchJourney(state, 'saga');
assert.deepEqual(state.flags, {}, '博物館の途中からでも、佐賀は初回の導入から');
assert.deepEqual(state.inventory, [], '別の追加の旅の持ち物も持ち込まない');
state.flags.introDone = true;
state.flags.testSagaStamp = true;
state.inventory.push('marble');
state.counts = { sagaTest: 4 };
state.elapsed = 240;
state.hints = 2;
state.notes = [{ id: 'saga-note', stage: 'saga', title: '街角のメモ', html: '佐賀の手がかり' }];
state = rememberState(state);
const saga = savedJourney(state, 'saga');
state = switchJourney(state, 'museum');
for (const key of ['flags', 'inventory', 'counts', 'notes', 'elapsed', 'hints']) assert.deepEqual(state[key], museum[key]);
state = switchJourney(state, 'japan');
assert.deepEqual(state.flags, oldMain.flags);
assert.deepEqual(state.inventory, oldMain.inventory);
assert.deepEqual(state.counts, oldMain.counts);
assert.deepEqual(state.notes, oldMain.notes);
assert.equal(state.elapsed, oldMain.elapsed);
assert.equal(state.hints, oldMain.hints);
state = switchJourney(state, 'saga');
for (const key of ['flags', 'inventory', 'counts', 'notes', 'elapsed', 'hints']) assert.deepEqual(state[key], saga[key]);
state = switchJourney(state, 'museum');
for (const key of ['flags', 'inventory', 'counts', 'notes', 'elapsed', 'hints']) assert.deepEqual(state[key], museum[key]);
console.log('OK 博物館→佐賀→博物館→本編→佐賀の順でも、3つの旅を個別に復帰');

const migratedMuseum = normalizeSave(oldMuseumSave);
assert.deepEqual(savedJourney(migratedMuseum, 'museum'), museum, '佐賀の登録後も、旧博物館の途中データを移行できる');
assert.equal(savedJourney(migratedMuseum, 'saga'), null, '旧博物館の記録から佐賀を勝手に開始しない');
const sagaFirst = switchJourney(normalizeSave(oldMain), 'saga');
assert.equal(sagaFirst.stage, 'saga', '追加の旅は佐賀を先に選べる');
assert.deepEqual(sagaFirst.flags, {});
assert.equal(savedJourney(sagaFirst, 'museum'), null, '博物館を先に開始する必要はない');
console.log('OK 旧博物館セーブの移行・佐賀を先に選ぶ順不同の出発');

state.cleared.push('museum');
state.flags.departed = true;
state = rememberState(state);
state = switchJourney(state, 'museum', { restart: true });
assert.deepEqual(state.flags, {}, 'やり直しは導入も再生する');
assert.deepEqual(state.inventory, []);
assert.equal(state.elapsed, 0);
assert.deepEqual(state.cleared, ['japan', 'museum'], 'やり直してもクリア記録は残す');
assert.deepEqual(savedJourney(state, 'japan').flags, oldMain.flags, '追加をやり直しても本編は保持');
assert.deepEqual(savedJourney(state, 'saga'), saga, '博物館をやり直しても佐賀の途中データは保持');
const resumed = switchJourney(state, 'museum');
assert.deepEqual(resumed.flags, {}, '初回出発の直前に読み直しても、導入を既読にしない');
console.log('OK 博物館のやり直し・初回出発・本編と佐賀とクリア記録の保全');

const sagaCleared = switchJourney(state, 'saga');
sagaCleared.cleared.push('saga');
sagaCleared.flags.departed = true;
const restartedSaga = switchJourney(rememberState(sagaCleared), 'saga', { restart: true });
assert.deepEqual(restartedSaga.flags, {});
assert.deepEqual(restartedSaga.inventory, []);
assert.deepEqual(savedJourney(restartedSaga, 'museum'), savedJourney(state, 'museum'), '佐賀のやり直しでも博物館は保持');
assert.deepEqual(savedJourney(restartedSaga, 'japan').flags, oldMain.flags);
assert.deepEqual(restartedSaga.cleared, ['japan', 'museum', 'saga']);
console.log('OK 佐賀のやり直し・博物館と本編と両方のクリア記録の保全');

const saved = normalizeSave(JSON.parse(JSON.stringify(state)));
assert.deepEqual(saved, state, '保存と再読込で状態を維持する');
const older = { ...freshState('station'), cleared: ['station'] };
const merged = rememberState(older, saved);
assert.deepEqual(merged.cleared, ['japan', 'museum', 'station'], '現在の記録と保存済みクリアを統合');
assert.ok(savedJourney(merged, 'museum'), '旧形式の状態を保存しても既存の追加記録を消さない');
assert.deepEqual(savedJourney(merged, 'saga'), saga, '旧形式の状態を保存しても佐賀の途中データを消さない');
assert.equal(normalizeSave(null), null);
assert.equal(normalizeSave({ stage: 'museum' }), null);
console.log('OK 保存の往復・旧状態との統合・空のセーブ');
