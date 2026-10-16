// 箱庭を起動せず、展示の解答の一意性・別解・不正経路・水量の保存を調べる。
import assert from 'node:assert/strict';
import {
  FOSSIL_ANSWER, PRISM_ANSWER, tracePrism, ARCHIVE_RULES, ARCHIVE_EDGES,
  checkArchiveRoute, gardenStep,
} from '../src/stages/museum/panels.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`OK ${name}`); };
function* permutations(values) {
  if (!values.length) { yield []; return; }
  for (let i = 0; i < values.length; i++) {
    for (const tail of permutations(values.filter((_, j) => i !== j))) yield [values[i], ...tail];
  }
}

test('化石: 掲示の3条件だけで120通りから1つの並びに決まる', () => {
  const candidates = [...permutations(['shell', 'fish', 'leaf', 'feather', 'footprint'])];
  assert.equal(candidates.length, 120);
  const answers = candidates.filter((order) => {
    const at = (id) => order.indexOf(id);
    return at('shell') < at('fish') && at('fish') < at('leaf')
      && at('feather') === at('leaf') + 1 && at('footprint') === 4;
  });
  assert.deepEqual(answers, [FOSSIL_ANSWER]);
});

test('鏡: 全32通りを追跡し、5枚すべてを経由する出口への光路が一意', () => {
  const solutions = [];
  for (let n = 0; n < 32; n++) {
    const mirrors = Array.from({ length: 5 }, (_, i) => (n & (1 << i)) ? '/' : '\\');
    const result = tracePrism(mirrors);
    assert.ok(result.points.length < 130, 'どの配置でも光路の計算が止まる');
    assert.equal(new Set(result.visited).size, result.visited.length, '経由枚数は重複を含まない');
    assert.ok(result.visited.every((i) => i >= 0 && i < 5));
    if (result.ok) { assert.equal(result.exit, true); assert.equal(result.visited.length, 5); solutions.push(mirrors); }
  }
  assert.deepEqual(solutions, [PRISM_ANSWER]);
  assert.deepEqual(tracePrism(PRISM_ANSWER).points.at(-1), [1, -1]);
  assert.equal(tracePrism(['\\', '/', '/', '\\', '/']).ok, false);
});

test('書庫: 3棚を回る7本の経路と、別の9本の経路を両方受け付ける', () => {
  const outer = ['entry', 'west', 'sea', 'dome', 'bird', 'east', 'forest', 'exit'];
  const inner = ['entry', 'west', 'sea', 'dome', 'bird', 'east', 'center', 'exit', 'forest', 'exit'];
  assert.equal(checkArchiveRoute(outer).ok, true);
  assert.equal(checkArchiveRoute(inner).ok, true);
  const queue = [['entry']], solutions = [];
  while (queue.length) {
    const route = queue.shift(), result = checkArchiveRoute(route);
    if (result.ok) solutions.push(route);
    if (result.steps === ARCHIVE_RULES.maxSteps) continue;
    const current = route.at(-1);
    for (const [a, b, kind] of ARCHIVE_EDGES) {
      if (kind === 'stairs' || (a !== current && b !== current)) continue;
      queue.push([...route, a === current ? b : a]);
    }
  }
  assert.ok(solutions.length > 1, '正解は固定された1本の道だけではない');
  assert.equal(Math.min(...solutions.map((route) => route.length - 1)), 7);
  assert.ok(solutions.some((route) => route.length - 1 === 9));
});

test('書庫: 階段・未返却・切断・距離超過・受付以外からの出発を拒否する', () => {
  const stair = checkArchiveRoute(['entry', 'west', 'sea', 'center', 'east', 'bird', 'east', 'forest', 'exit']);
  assert.equal(stair.stairs, true); assert.equal(stair.ok, false);
  const missing = checkArchiveRoute(['entry', 'west', 'center', 'exit']);
  assert.equal(missing.missing.length, 3); assert.equal(missing.ok, false);
  const broken = checkArchiveRoute(['entry', 'forest', 'exit']);
  assert.equal(broken.connected, false); assert.equal(broken.ok, false);
  const long = checkArchiveRoute(['entry', 'west', 'sea', 'dome', 'bird', 'east', 'forest', 'exit', 'forest', 'exit', 'forest', 'exit']);
  assert.equal(long.tooLong, true); assert.equal(long.ok, false);
  assert.equal(checkArchiveRoute(['west', 'sea', 'dome', 'bird', 'east', 'forest', 'exit']).ok, false);
  assert.equal(checkArchiveRoute([]).ok, false);
  assert.equal(checkArchiveRoute(null).ok, false);
});

test('温室: 全容量・全操作で境界を守り、移す操作は水の総量を保つ', () => {
  const operations = ['fill5', 'fill3', 'empty5', 'empty3', 'pour5to3', 'pour3to5'];
  for (let a = 0; a <= 5; a++) for (let b = 0; b <= 3; b++) for (const action of operations) {
    const next = gardenStep({ a, b }, action);
    assert.ok(Number.isInteger(next.a) && next.a >= 0 && next.a <= 5);
    assert.ok(Number.isInteger(next.b) && next.b >= 0 && next.b <= 3);
    if (action === 'pour5to3') { assert.equal(next.a + next.b, a + b); assert.ok(next.a === 0 || next.b === 3); }
    if (action === 'pour3to5') { assert.equal(next.a + next.b, a + b); assert.ok(next.b === 0 || next.a === 5); }
  }
  const queue = [{ a: 0, b: 0, path: [] }], seen = new Set(['0,0']);
  let solution;
  while (queue.length) {
    const current = queue.shift();
    if (current.a === 4) { solution = current; break; }
    for (const action of operations) {
      const next = gardenStep(current, action), key = `${next.a},${next.b}`;
      if (!seen.has(key)) { seen.add(key); queue.push({ ...next, path: [...current.path, action] }); }
    }
  }
  assert.equal(solution?.a, 4);
  assert.equal(solution.path.length, 6, '時間待ちや途中停止なしの6操作で4Lを量れる');
  assert.deepEqual(gardenStep({ a: 5, b: 2 }, 'pour5to3'), { a: 4, b: 3 });
  assert.deepEqual(gardenStep({ a: -1, b: 9 }, 'restore'), { a: 0, b: 0 });
});

console.log(`PASS ${passed} checks`);
