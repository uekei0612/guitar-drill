import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { TUNINGS } from "../../theory";
import { openStrings } from ".";

const ctxOf = (id: string) => ({ common: { tuning: TUNINGS.find(t => t.id === id)!, lefty: false }, settings: {} });

describe("開放弦の音名", () => {
  it("どのチューニングでも問題が壊れていない", () => {
    for (const t of TUNINGS) expect(checkTopic(openStrings, ctxOf(t.id))).toEqual([]);
  });

  it("item は 6 弦から、チューニングごとに分かれる", () => {
    const std = openStrings.items(ctxOf("standard"));
    expect(std).toEqual([
      "standard:name:6",
      "standard:name:5",
      "standard:name:4",
      "standard:name:3",
      "standard:name:2",
      "standard:name:1",
      "standard:string:E",
      "standard:string:A",
      "standard:string:D",
      "standard:string:G",
      "standard:string:B",
    ]);
    expect(openStrings.items(ctxOf("drop_d"))[0]).toBe("drop_d:name:6");
  });

  it("E は 1 弦と 6 弦の両方をタップ、ドロップ D の D は 4 弦と 6 弦", () => {
    const q = openStrings.question("standard:string:E", ctxOf("standard"), seeded(1));
    expect(q.answer).toMatchObject({ kind: "tap", mode: "all", correct: [{ string: 1 }, { string: 6 }] });
    const d = openStrings.question("drop_d:string:D", ctxOf("drop_d"), seeded(1));
    expect(d.answer).toMatchObject({ kind: "tap", mode: "all", correct: [{ string: 4 }, { string: 6 }] });
    const a = openStrings.question("standard:string:A", ctxOf("standard"), seeded(1));
    expect(a.answer).toMatchObject({ kind: "tap", mode: "any", correct: [{ string: 5, fret: 0 }] });
  });

  it("半音下げは ♭ で答える", () => {
    const q = openStrings.question("half_step_down:name:6", ctxOf("half_step_down"), seeded(1));
    expect(q.answer).toMatchObject({ kind: "choice", correct: "E♭" });
    expect(openStrings.itemLabel("half_step_down:string:Ab", ctxOf("half_step_down"))).toBe("A♭ の弦");
  });

  it("タップは開放の列だけ。鳴らす音は低い弦から", () => {
    const q = openStrings.question("standard:string:E", ctxOf("standard"), seeded(1));
    expect(q.answer).toMatchObject({ frets: { minFret: 0, maxFret: 0 } });
    expect(q.sound).toEqual({ notes: [40, 64] });
    expect(openStrings.question("standard:name:5", ctxOf("standard"), seeded(1)).sound).toEqual({ notes: [45] });
  });

  it("解説は弦の本数から数える（7 弦は 7弦から）", () => {
    const q = openStrings.question("7_string:name:7", ctxOf("7_string"), seeded(1));
    expect(q.explanation?.text).toBe("7 弦：7弦から B E A D G B E");
  });
});
