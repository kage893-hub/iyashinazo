export const Ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** ゲーム時間で進むシンプルなトゥイーン管理 */
export class Tweens {
  constructor() { this.list = []; }

  /** onUpdate(easedT, rawT) を duration 秒かけて呼ぶ。Promise を返す */
  add({ duration = 1, ease = Ease.inOut, delay = 0, onUpdate = () => {} }) {
    return new Promise((resolve) => {
      this.list.push({ t: -delay, duration: Math.max(0.0001, duration), ease, onUpdate, resolve });
    });
  }

  wait(sec) { return this.add({ duration: sec }); }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.duration);
      tw.onUpdate(tw.ease(k), k);
      if (k >= 1) {
        this.list.splice(i, 1);
        tw.resolve();
      }
    }
  }
}
