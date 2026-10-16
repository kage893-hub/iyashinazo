// 箱庭・ブラウザを起動せず、各掲示の条件だけで解けることを確かめる。
import assert from 'node:assert/strict';
import {
  BUS_ANSWER, BUS_LEGS, BUS_RULES, checkBusPlan,
  SHOP_ANSWER, checkShopping, SLUICE_ANSWER, SLUICE_GATES, SLUICE_START, SLUICE_TARGETS, traceSluice,
  BALLOON_ANSWER, BALLOON_RULES, BALLOON_WINDS, WIND_DIRECTIONS, checkBalloonRoute,
  SKETCH_ANSWER, checkSketch,
} from '../src/stages/saga/panels.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`OK ${name}`); };
function* combinations(size, length, prefix = []) {
  if (prefix.length === length) { yield prefix; return; }
  for (let i = 0; i < size; i++) yield* combinations(size, length, [...prefix, i]);
}

test('臨時便: 27通りを時刻計算すると、掲示の4条件を満たす旅程は1通り', () => {
  const plans = [...combinations(3, 3)], solutions = [];
  for (const plan of plans) {
    const result = checkBusPlan(plan);
    const dep = plan.map((n, i) => BUS_LEGS[i].departures[n]);
    const arrive = dep.map((d, i) => d + BUS_LEGS[i].duration);
    const satisfies = dep[0] >= BUS_RULES.ready && dep[1] >= arrive[0] + BUS_RULES.shopping
      && dep[2] - arrive[1] >= BUS_RULES.waitMin && dep[2] - arrive[1] <= BUS_RULES.waitMax && arrive[2] <= BUS_RULES.deadline;
    assert.equal(result.ok, satisfies);
    assert.equal(result.complete, true);
    if (result.ok) solutions.push(plan);
  }
  assert.equal(plans.length, 27);
  assert.deepEqual(solutions, [BUS_ANSWER]);
  const answer = checkBusPlan(BUS_ANSWER);
  assert.equal(answer.shopReady, 600); assert.equal(answer.wait, 10); assert.equal(answer.legs[2].arrival, 655);
  assert.match(checkBusPlan([0, 1, 1]).issues[0], /9:10/);
  assert.match(checkBusPlan([1, 0, 1]).issues[0], /買物/);
  assert.match(checkBusPlan([1, 1, 0]).issues[0], /少なくとも5分/);
  assert.match(checkBusPlan([1, 1, 2]).issues[0], /15分以内/);
  assert.match(checkBusPlan([2, 2, 2]).issues[0], /11:00/);
});

test('買物: 0〜5個の1296通りから、6個・1000円・同数2組で一意に決まる', () => {
  const candidates = [...combinations(6, 4)], answers = candidates.filter((counts) => checkShopping(counts).ok);
  assert.equal(candidates.length, 1296); assert.deepEqual(answers, [SHOP_ANSWER]);
  assert.deepEqual(checkShopping([0, 0, 0, 0]), { ok: false, valid: true, count: 0, total: 0 });
  assert.equal(checkShopping([1, 2, 2, 1]).total, 1100);
  assert.equal(checkShopping([0, 0, 4, 0]).ok, false, '合計金額だけが合っても受け付けない');
  assert.equal(checkShopping([0, 0, 0, 6]).ok, false, '品数だけが合っても受け付けない');
});

test('水門: 全243通りの接続を追跡し、3田への到達と住宅への流入を判定', () => {
  const answers = [];
  for (const values of combinations(3, 5)) {
    const result = traceSluice(values), visited = new Set(), stack = ['A'];
    while (stack.length) {
      const id = stack.pop(); if (visited.has(id)) continue; visited.add(id);
      const gate = SLUICE_GATES.findIndex((g) => g.id === id);
      if (gate >= 0) stack.push(...SLUICE_GATES[gate].options[values[gate]].to);
    }
    const targetCondition = SLUICE_TARGETS.every((f) => visited.has(f.id)) && !visited.has('house');
    assert.equal(result.ok, targetCondition);
    assert.equal(result.residential, visited.has('house'));
    assert.ok(result.edges.length <= 10, '水路追跡は有限で止まる');
    for (const [from, to] of result.edges) { assert.ok(visited.has(from)); assert.ok(visited.has(to)); }
    if (result.ok) answers.push(values);
  }
  assert.deepEqual(answers, [SLUICE_ANSWER]);
  assert.equal(traceSluice(SLUICE_START).residential, true);
  assert.equal(traceSluice([0, 0, 1, 2, 0]).reached.includes('house'), false, '入口で東を閉じると、その先の住宅用水門へ水は来ない');
  assert.deepEqual(traceSluice([2, 0, 2, 2, 0]).reached, ['field1'], '閉じた水門から先へ水が漏れない');
  for (let i = 0; i < 5; i++) {
    const values = [...SLUICE_ANSWER]; values[i] = (values[i] + 1) % 3;
    assert.equal(traceSluice(values).ok, false, `水門${SLUICE_GATES[i].id}にも意味がある`);
  }
});

test('風読み: 最大9手の高度列を探索し、目印3つと着地点へ安全に到達できる', () => {
  const queue = [[]], solutions = []; let prefixes = 0;
  while (queue.length) {
    const heights = queue.pop(), result = checkBalloonRoute(heights); prefixes++;
    assert.equal(result.valid, true);
    assert.ok(result.points.every(([x, y]) => x >= 0 && x < 6 && y >= 0 && y < 6));
    assert.ok(result.points.every(([x, y]) => !BALLOON_RULES.hazards.some(([a, b]) => a === x && b === y)));
    if (result.ok) { assert.equal(result.visited.length, 3); assert.deepEqual(result.points.at(-1), BALLOON_RULES.goal); solutions.push(heights); }
    if (heights.length === BALLOON_RULES.maxTurns) continue;
    for (let h = 0; h < 3; h++) {
      const next = [...heights, h], candidate = checkBalloonRoute(next);
      if (candidate.valid) {
        const [x, y] = result.points.at(-1), wind = WIND_DIRECTIONS[BALLOON_WINDS[heights.length][h]];
        assert.deepEqual(candidate.points.at(-1), [x + wind.dx, y + wind.dy]); queue.push(next);
      }
    }
  }
  assert.ok(prefixes > 100, '1本の固定経路だけでなく、分岐を探索した');
  assert.ok(solutions.length > 0);
  assert.equal(checkBalloonRoute(BALLOON_ANSWER).ok, true);
  assert.equal(Math.min(...solutions.map((s) => s.length)), 8);
  assert.equal(checkBalloonRoute([2]).valid, false, '最初の西風は盤外なので拒否');
  assert.match(checkBalloonRoute([2]).reason, /盤の外/);
  assert.equal(checkBalloonRoute([0, 0, 2]).valid, false, '水車から北は強風域なので拒否');
  assert.match(checkBalloonRoute([0, 0, 2]).reason, /強風域/);
  assert.equal(checkBalloonRoute([0, 0]).ok, false, '目印1つだけでは着地完了にならない');
  const withoutMarks = solutions[0].slice(0, -1); assert.equal(checkBalloonRoute(withoutMarks).ok, false);
  console.log(`  安全な途中経路 ${prefixes}通り・解答 ${solutions.length}通り`);
});

test('絵葉書: 屋根・腰壁・松・塀の4項目を、すべて選んで初めて照合できる', () => {
  const answers = [...combinations(4, 4)].filter(checkSketch);
  assert.deepEqual(answers, [SKETCH_ANSWER]);
  for (let i = 0; i < 4; i++) { const values = [...SKETCH_ANSWER]; values[i] = null; assert.equal(checkSketch(values), false); }
});

test('全パズル: JSON保存の欠損・範囲外・小数・型違いを安全に拒否', () => {
  for (const bad of [undefined, null, '1,1,1', {}, [], Array(3), [-1, 0, 0], [3, 0, 0], [0.5, 0, 0], ['1', 1, 1]]) assert.equal(checkBusPlan(bad).ok, false);
  for (const bad of [undefined, null, '2,1,1,2', {}, [], Array(4), [-1, 1, 1, 2], [6, 1, 1, 2], [2.5, 1, 1, 2]]) assert.equal(checkShopping(bad).valid, false);
  for (const bad of [undefined, null, {}, [], Array(5), [2, 0, 3, 2, 0], [2, 0, -1, 2, 0]]) assert.equal(traceSluice(bad).valid, false);
  for (const bad of [undefined, null, {}, Array(2), [3], [-1], [0.5], Array(10).fill(0)]) assert.equal(checkBalloonRoute(bad).valid, false);
  for (const bad of [undefined, null, {}, [], Array(4), [1, 2, 0], [1, 2, 0, 1, 0], ['1', 2, 0, 1]]) assert.equal(checkSketch(bad), false);
});

console.log(`PASS ${passed} checks`);
