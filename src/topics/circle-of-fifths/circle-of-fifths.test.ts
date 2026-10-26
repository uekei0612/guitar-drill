import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD, keyLabel, note } from "../../theory";
import { circleOfFifths, relative, sigLabel } from ".";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };
const ask = (id: string) => circleOfFifths.question(id, ctx, seeded(1)).answer;

describe("五度圏と調号", () => {
  it("問題が壊れていない", () => {
    expect(checkTopic(circleOfFifths, ctx)).toEqual([]);
    expect(circleOfFifths.items(ctx)).toHaveLength(24 * 5);
  });

  it("調号・平行調・隣のキー", () => {
    expect(sigLabel(0)).toBe("なし");
    expect(ask("sig:E")).toMatchObject({ correct: "♯4つ" });
    expect(ask("sig:Ebm")).toMatchObject({ correct: "♭6つ" });
    expect(ask("key:Ab")).toMatchObject({ correct: "A♭" });
    expect(ask("rel:C")).toMatchObject({ correct: "Am" });
    expect(ask("rel:F#m")).toMatchObject({ correct: "A" });
    expect(ask("up:C")).toMatchObject({ correct: "G" });
    expect(ask("down:C")).toMatchObject({ correct: "F" });
    expect(ask("up:F")).toMatchObject({ correct: "C" });
    expect(ask("up:F#")).toMatchObject({ correct: "D♭" });
    expect(ask("down:Am")).toMatchObject({ correct: "Dm" });
    expect(keyLabel(relative({ mode: "major", tonic: note("Db") }))).toBe("B♭m");
  });
});
