import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { modes } from ".";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };
const ask = (id: string) => modes.question(id, ctx, seeded(1));

describe("モードの特性音", () => {
  it("問題が壊れていない", () => {
    expect(checkTopic(modes, ctx)).toEqual([]);
    expect(modes.items(ctx)).toHaveLength(7 * 3 + 5);
  });

  it("特性音と使うコード", () => {
    expect(ask("dorian:char").answer).toMatchObject({ correct: "6" });
    expect(ask("lydian:char").answer).toMatchObject({ correct: "♯4" });
    expect(ask("mixolydian:chord").answer).toMatchObject({ correct: "Ⅴ7" });
    expect(ask("locrian:chord").answer).toMatchObject({ correct: "Ⅶm7(♭5)" });
  });

  it("構成音はルートに合わせて綴る", () => {
    for (let n = 0; n < 30; n++) {
      const q = modes.question("phrygian:tones", ctx, seeded(n));
      const root = q.prompt.text.split(" ")[0]!;
      if (q.answer.kind !== "choice") throw new Error();
      expect(q.answer.correct.split(" ")[0]).toBe(root);
      expect(new Set(q.answer.correct.split(" ").map(x => x[0])).size).toBe(7);
      expect(q.answer.correct).not.toMatch(/C♭|F♭|E♯|B♯/);
    }
  });
});
