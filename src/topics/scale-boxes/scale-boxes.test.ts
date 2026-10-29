import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { grade } from "../../drill/topic";
import { STANDARD, TUNINGS } from "../../theory";
import { BOX_SCALES, boxNotes, scaleBoxes } from ".";

const all = { scales: BOX_SCALES, roots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const ctx = (settings = scaleBoxes.settings!.defaults, tuning = STANDARD) => ({
  common: { tuning, lefty: false },
  settings,
});

describe("スケールのボックス", () => {
  it("既定は A マイナーペンタの 5 ボックス", () => {
    expect(scaleBoxes.items(ctx())).toEqual([
      "minor_pentatonic:9:1",
      "minor_pentatonic:9:2",
      "minor_pentatonic:9:3",
      "minor_pentatonic:9:4",
      "minor_pentatonic:9:5",
    ]);
  });

  it("全スケール × 全キー × どのチューニングでも問題が壊れていない", () => {
    for (const t of TUNINGS) expect(checkTopic(scaleBoxes, ctx(all, t), 4)).toEqual([]);
  }, 20_000);

  it("A マイナーペンタのボックス 1 は guitar_chart と同じ 5〜8 フレットの形", () => {
    const ns = boxNotes(STANDARD, "minor_pentatonic", 9, [5, 8]);
    const tab = (s: number) =>
      ns
        .filter(n => n.pos.string === s)
        .map(n => `${n.pos.fret}${n.label}`)
        .join(" ");
    expect(tab(6)).toBe("5R 8♭3");
    expect(tab(4)).toBe("5♭7 7R");
    expect(tab(1)).toBe("5R 8♭3");
  });

  it("どの形式でも、解説の図の音で答えると正解になる", () => {
    for (let n = 0; n < 60; n++) {
      const q = scaleBoxes.question("minor_pentatonic:9:1", ctx(), seeded(n));
      expect(q.chart).toEqual({ scale: "minor_pentatonic", rootPc: 9, box: 1, flat: false });
      const marks = q.explanation!.board!.marks;
      if (q.answer.kind === "choice") {
        const target = q.prompt.board!.marks.find(m => m.kind === "target")!;
        expect(marks.find(m => m.pos.string === target.pos.string && m.pos.fret === target.pos.fret)!.label).toBe(
          q.answer.correct,
        );
      } else {
        expect(grade(q.answer, { kind: "tap", positions: q.answer.correct })).toBe(true);
        for (const p of q.answer.correct)
          expect(marks.some(m => m.pos.string === p.string && m.pos.fret === p.fret)).toBe(true);
      }
    }
  });

  it("高いボックスは 1 オクターブ下に寄せる", () => {
    // E マイナーペンタのボックス 5 は 21〜24 フレット → 9〜12 フレット
    const q = scaleBoxes.question("minor_pentatonic:4:5", ctx(all), seeded(1));
    const r = q.answer.kind === "tap" ? q.answer.range : q.prompt.board!.range;
    expect(r).toEqual({ minFret: 9, maxFret: 12 });
  });

  it("壊れた設定は既定値に戻す", () => {
    expect(scaleBoxes.settings!.parse({ scales: ["nope"], roots: [99] })).toEqual(scaleBoxes.settings!.defaults);
    expect(scaleBoxes.settings!.parse({ scales: ["major", "minor_pentatonic"], roots: [2, 2, 0] })).toEqual({
      scales: ["minor_pentatonic", "major"],
      roots: [0, 2],
    });
  });
});
