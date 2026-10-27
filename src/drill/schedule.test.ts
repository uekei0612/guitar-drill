import { describe, expect, it } from "vitest";
import { seeded } from "./rng";
import { DAY, type ItemStat, MIN_EASE, RETRY_MS, isMastered, mastery, nextDue, planSession, review } from "./schedule";
import { answer, currentItem, isFinished, startSession, summarize } from "./session";

const T0 = Date.UTC(2026, 9, 25);

describe("review", () => {
  it("正解が続くと間隔が 1 → 3 → 8 日と伸びる", () => {
    let s = review(undefined, true, T0);
    expect(s).toMatchObject({ interval: 1, due: T0 + DAY, tries: 1, correct: 1 });
    s = review(s, true, s.due);
    expect(s.interval).toBe(3);
    s = review(s, true, s.due);
    expect(s.interval).toBe(8);
  });

  it("誤答で間隔が 0 に戻り、伸び率が下がり、10 分後に期限が来る", () => {
    const good: ItemStat = { ease: 2.5, interval: 30, due: T0, tries: 5, correct: 5 };
    const s = review(good, false, T0);
    expect(s).toEqual({ ease: 2.3, interval: 0, due: T0 + RETRY_MS, tries: 6, correct: 5 });
    let e = s;
    for (let i = 0; i < 20; i++) e = review(e, false, T0);
    expect(e.ease).toBe(MIN_EASE);
  });

  it("期限前の正解では間隔を延ばさない（同じセッションでの繰り返し）", () => {
    const s = review(undefined, true, T0);
    const again = review(s, true, T0 + 60_000);
    expect(again).toEqual({ ...s, tries: 2, correct: 2 });
  });

  it("習熟度は期限内の item の割合", () => {
    const stats = new Map([
      ["a", review(undefined, true, T0)],
      ["b", review(undefined, false, T0)],
    ]);
    expect(mastery(["a", "b", "c", "d"], id => stats.get(id), T0)).toBe(0.25);
    expect(mastery(["a", "b", "c", "d"], id => stats.get(id), T0 + 2 * DAY)).toBe(0);
    expect(isMastered(stats.get("b"), T0)).toBe(false);
    expect(mastery([], () => undefined, T0)).toBe(0);
  });
});

describe("planSession", () => {
  const items = Array.from({ length: 100 }, (_, i) => `i${i}`);

  it("期限切れを優先し、未出題は並び順に上限まで", () => {
    const stats = new Map<string, ItemStat>();
    for (let i = 50; i < 60; i++)
      stats.set(`i${i}`, { ease: 2.5, interval: 1, due: T0 - i * 1000, tries: 1, correct: 1 });
    for (let i = 60; i < 100; i++)
      stats.set(`i${i}`, { ease: 2.5, interval: 3, due: T0 + i * 1000, tries: 1, correct: 1 });
    const plan = planSession(items, id => stats.get(id), T0, seeded(1), { size: 20, maxNew: 8 });
    expect(plan).toHaveLength(20);
    expect(new Set(plan).size).toBe(20);
    const set = new Set(plan);
    for (let i = 50; i < 60; i++) expect(set.has(`i${i}`)).toBe(true);
    for (let i = 0; i < 8; i++) expect(set.has(`i${i}`)).toBe(true);
    expect(set.has("i8")).toBe(false);
    expect(set.has("i60") && set.has("i61")).toBe(true);
  });

  it("期限切れも期限前も無ければ未出題で埋める", () => {
    const plan = planSession(items, () => undefined, T0, seeded(2));
    expect([...plan].sort()).toEqual(items.slice(0, 20).sort());
  });

  it("item が少ない分野では繰り返すが、同じ item は続かない", () => {
    for (let seed = 0; seed < 200; seed++) {
      const plan = planSession(["a", "b", "c"], () => undefined, T0, seeded(seed));
      expect(plan).toHaveLength(20);
      for (let i = 1; i < plan.length; i++) expect(plan[i]).not.toBe(plan[i - 1]);
    }
    expect(planSession([], () => undefined, T0, seeded(1))).toEqual([]);
  });

  it("出題に偏りがない（多数回で各 item がほぼ均等）", () => {
    const count = new Map<string, number>();
    for (let seed = 0; seed < 500; seed++)
      for (const id of planSession(["a", "b", "c", "d", "e", "f", "g"], () => undefined, T0, seeded(seed)))
        count.set(id, (count.get(id) ?? 0) + 1);
    const n = [...count.values()];
    expect(Math.max(...n) / Math.min(...n)).toBeLessThan(1.2);
  });
});

describe("session", () => {
  it("誤答は 3 問あとに 1 回だけ出し直す", () => {
    let s = startSession(["a", "b", "c", "d", "e", "f"]);
    s = answer(s, false);
    expect(s.queue).toEqual(["a", "b", "c", "d", "a", "e", "f"]);
    while (currentItem(s) !== "a") s = answer(s, true);
    s = answer(s, false);
    expect(s.queue.filter(x => x === "a")).toHaveLength(2);
    while (!isFinished(s)) s = answer(s, true);
    expect(summarize(s)).toEqual({ total: 7, correct: 5, weak: ["a"] });
  });

  it("最後の問題の誤答は直後に出し直さない", () => {
    let s = startSession(["a", "b"]);
    s = answer(s, true);
    s = answer(s, false);
    expect(isFinished(s)).toBe(true);
    s = startSession(["a", "b", "c"]);
    s = answer(s, false);
    expect(s.queue).toEqual(["a", "b", "c", "a"]);
  });
});

describe("nextDue", () => {
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
  const st = (due: number) => ({ ease: 2.5, interval: 1, due, tries: 1, correct: 1 });

  it("いちばん近い日と、その日の数。期限切れは今日に数える", () => {
    const now = at(2026, 10, 28, 9);
    expect(nextDue([st(at(2026, 10, 29, 8)), st(at(2026, 10, 29, 22)), st(at(2026, 11, 2))], now)).toEqual({
      days: 1,
      count: 2,
    });
    expect(nextDue([st(now - DAY), st(at(2026, 10, 28, 23)), st(at(2026, 10, 30))], now)).toEqual({
      days: 0,
      count: 2,
    });
    expect(nextDue([undefined], now)).toBeUndefined();
  });
});
