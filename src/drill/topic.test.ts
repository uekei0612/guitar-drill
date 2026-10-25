import { describe, expect, it } from "vitest";
import { STANDARD } from "../theory";
import { TOPICS } from "../topics";
import { checkTopic, problemsOf } from "./check";
import { pick, seeded, shuffle } from "./rng";
import { type Question, type Topic, grade } from "./topic";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };
const range = { minFret: 0, maxFret: 12 };

describe("rng", () => {
  it("同じ種なら同じ並び", () => {
    const a = seeded(42),
      b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(shuffle(seeded(1), [1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(() => pick(seeded(1), [])).toThrow();
  });
});

describe("grade", () => {
  it("4択", () => {
    const a = { kind: "choice", options: ["C", "D"], correct: "C" } as const;
    expect(grade(a, { kind: "choice", value: "C" })).toBe(true);
    expect(grade(a, { kind: "choice", value: "D" })).toBe(false);
    expect(grade(a, { kind: "tap", positions: [] })).toBe(false);
  });

  it("指板タップ：any はどれか 1 つ、all は過不足なく", () => {
    const correct = [
      { string: 6, fret: 5 },
      { string: 3, fret: 2 },
    ];
    const any = { kind: "tap", mode: "any", range, correct } as const;
    const all = { ...any, mode: "all" } as const;
    expect(grade(any, { kind: "tap", positions: [{ string: 3, fret: 2 }] })).toBe(true);
    expect(grade(any, { kind: "tap", positions: [{ string: 3, fret: 3 }] })).toBe(false);
    expect(grade(all, { kind: "tap", positions: [...correct].reverse() })).toBe(true);
    expect(grade(all, { kind: "tap", positions: [correct[0]!, correct[0]!, correct[1]!] })).toBe(true);
    expect(grade(all, { kind: "tap", positions: [correct[0]!] })).toBe(false);
    expect(grade(all, { kind: "tap", positions: [...correct, { string: 1, fret: 0 }] })).toBe(false);
  });
});

describe("checkTopic", () => {
  it("壊れた問題を見つける", () => {
    const bad: Question = {
      item: "x",
      prompt: { text: "?", board: { range, marks: [{ pos: { string: 7, fret: 0 }, kind: "target" }] } },
      answer: { kind: "choice", options: ["A", "A"], correct: "B" },
    };
    expect(problemsOf(bad, ctx)).toHaveLength(3);
    const topic: Topic = {
      id: "t",
      level: "beginner",
      title: "t",
      items: () => ["x", "x"],
      itemLabel: x => x,
      question: () => bad,
    };
    expect(checkTopic(topic, ctx, 1).length).toBeGreaterThan(0);
  });

  it("登録した分野は ID が重複せず、どの問題も壊れていない", () => {
    expect(new Set(TOPICS.map(t => t.id)).size).toBe(TOPICS.length);
    for (const t of TOPICS) expect(checkTopic(t, { ...ctx, settings: t.settings?.defaults ?? {} })).toEqual([]);
  });
});
