import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { sevenths } from ".";

const all = { dim7: true, minorMajor: true, sixth: true, sus: true };
const ctx = (s: Record<string, boolean> = {}) => ({
  common: { tuning: STANDARD, lefty: false },
  settings: { ...sevenths.settings!.defaults, ...s },
});

describe("4和音の構成音", () => {
  it("どの設定でも問題が壊れていない", () => {
    for (const s of [{}, all]) expect(checkTopic(sevenths, ctx(s), 20)).toEqual([]);
  });

  it("既定は M7・7・m7・m7(♭5)", () => {
    expect(sevenths.items(ctx())).toHaveLength(4 * 12 * 3);
    expect(sevenths.items(ctx(all))).toHaveLength(11 * 12 * 3);
  });

  it("綴りと度数", () => {
    expect(sevenths.question("dim7:G#:tones", ctx(all), seeded(1)).answer).toMatchObject({ correct: "G♯ B D F" });
    expect(sevenths.question("m7b5:B:name", ctx(), seeded(1)).answer).toMatchObject({ correct: "Bm7(♭5)" });
    expect(sevenths.question("dim7:C#:tones", ctx(all), seeded(1)).explanation?.text).toBe(
      "C♯dim7 = C♯（R） E（♭3） G（♭5） B♭（♭♭7）",
    );
    for (let n = 0; n < 30; n++) {
      const q = sevenths.question("7:Bb:deg", ctx(), seeded(n));
      const want = { "3": "D", "5": "F", "♭7": "A♭" }[q.prompt.text.match(/の (.+) の音は/)![1]!];
      expect(q.answer).toMatchObject({ correct: want });
    }
  });

  it("壊れた設定は既定値に戻す", () => {
    expect(sevenths.settings!.parse({ dim7: 1, sixth: true, unknown: true })).toEqual({
      dim7: false,
      minorMajor: false,
      sixth: true,
      sus: false,
    });
  });
});
