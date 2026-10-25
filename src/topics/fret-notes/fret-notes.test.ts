import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { grade } from "../../drill/topic";
import { STANDARD, TUNINGS } from "../../theory";
import { type FretNotesSettings, fretNotes, pcName } from ".";

const ctx = (settings: Partial<FretNotesSettings> = {}, tuning = STANDARD) => ({
  common: { tuning, lefty: false },
  settings: { ...fretNotes.settings!.defaults, ...settings },
});

describe("指板の音名", () => {
  it("どの設定・チューニングでも問題が壊れていない", () => {
    for (const t of TUNINGS)
      for (const s of [
        {},
        { accidentals: true, strings: [1, 2, 3, 4, 5, 6], maxFret: 12 },
        { maxFret: 5, strings: [3] },
      ])
        expect(checkTopic(fretNotes, ctx(s, t), 10)).toEqual([]);
  });

  it("既定は 6弦・5弦の自然音、12 フレットまで", () => {
    const items = fretNotes.items(ctx());
    const pos = items.filter(i => !i.includes(":note:"));
    // 各弦 13 マスのうち自然音は 8（開放と 12 フレットが同じ音）
    expect(pos).toHaveLength(16);
    expect(pos[0]).toBe("standard:6:0");
    expect(items.filter(i => i.includes(":note:"))).toHaveLength(7);
    expect(fretNotes.items(ctx({ accidentals: true }))).toHaveLength(26 + 12);
    expect(items.slice(0, 4)).toEqual(["standard:6:0", "standard:6:1", "standard:6:3", "standard:note:0"]);
  });

  it("異名同音は 1 つの選択肢にまとめる", () => {
    expect(pcName(6)).toBe("F♯/G♭");
    expect(pcName(4)).toBe("E");
    const q = fretNotes.question("standard:6:2", ctx({ accidentals: true }), seeded(1));
    expect(q.answer).toMatchObject({ kind: "choice", correct: "F♯/G♭" });
  });

  it("自然音だけのときは選択肢も自然音", () => {
    for (let n = 0; n < 50; n++) {
      const q = fretNotes.question("standard:5:3", ctx(), seeded(n));
      if (q.answer.kind !== "choice") throw new Error();
      expect(q.answer.options.every(o => /^[A-G]$/.test(o))).toBe(true);
      expect(q.answer.correct).toBe("C");
    }
  });

  it("音名 → 位置は、出題する弦の範囲だけを全部", () => {
    const q = fretNotes.question("standard:note:9", ctx(), seeded(1));
    expect(q.answer).toMatchObject({
      kind: "tap",
      mode: "all",
      correct: [
        { string: 5, fret: 0 },
        { string: 5, fret: 12 },
        { string: 6, fret: 5 },
      ],
    });
    expect(
      grade(q.answer, {
        kind: "tap",
        positions: [
          { string: 6, fret: 5 },
          { string: 5, fret: 0 },
          { string: 5, fret: 12 },
        ],
      }),
    ).toBe(true);
  });

  it("壊れた設定は既定値に戻す", () => {
    const p = fretNotes.settings!.parse;
    expect(p({ strings: [], maxFret: 9, accidentals: "y" })).toEqual(fretNotes.settings!.defaults);
    expect(p({ strings: [1, 1, 3, 99], maxFret: 7, accidentals: true })).toEqual({
      strings: [3, 1],
      maxFret: 7,
      accidentals: true,
    });
  });
});
