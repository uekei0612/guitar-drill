import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { dominantScales } from ".";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };

describe("ドミナントで使うスケール", () => {
  it("問題が壊れていない", () => {
    expect(checkTopic(dominantScales, ctx)).toEqual([]);
    expect(dominantScales.items(ctx)).toHaveLength(16);
  });

  it("度数と使いどころ", () => {
    expect(dominantScales.question("altered:degrees", ctx, seeded(1)).answer).toMatchObject({
      correct: "R ♭9 ♯9 3 ♯11 ♭13 ♭7",
    });
    expect(dominantScales.question("phrygian_dominant:use", ctx, seeded(1)).answer).toMatchObject({
      correct: "マイナーキーの Ⅴ7（Ⅴ7 → Ⅰm）",
    });
  });

  it("構成音に 𝄪・𝄫 を出さない", () => {
    for (let n = 0; n < 50; n++) {
      const a = dominantScales.question("altered:tones", ctx, seeded(n)).answer;
      if (a.kind !== "choice") throw new Error();
      for (const o of a.options) expect(o).not.toMatch(/𝄪|𝄫/);
    }
  });

  it("ミクソリディアンと違う音を強調し、覚え方を添える", () => {
    const q = dominantScales.question("altered:degrees", ctx, seeded(1));
    expect(q.explanation!.strip!.filter(s => s.current).map(s => s.sub)).toEqual(["♭9", "♯9", "♯11", "♭13"]);
    expect(q.explanation!.text).toMatch(/メロディックマイナー/);
    const l = dominantScales.question("lydian_dominant:degrees", ctx, seeded(1));
    expect(l.explanation!.strip!.filter(s => s.current).map(s => s.sub)).toEqual(["♯11"]);
  });
});
