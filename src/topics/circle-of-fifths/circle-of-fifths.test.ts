import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD, keyLabel, note } from "../../theory";
import { accidentals, circleOfFifths, relative, sigLabel } from ".";

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

  it("調号の音と、解説の五度圏の並び", () => {
    expect(accidentals(3)).toEqual(["F♯", "C♯", "G♯"]);
    expect(accidentals(-2)).toEqual(["B♭", "E♭"]);
    expect(accidentals(0)).toEqual([]);
    const q = circleOfFifths.question("sig:C", ctx, seeded(1));
    expect(q.explanation?.strip?.map(x => x.label)).toEqual(["B♭", "F", "C", "G", "D"]);
    expect(q.explanation?.strip?.find(x => x.current)?.label).toBe("C");
    expect(circleOfFifths.question("sig:Eb", ctx, seeded(1)).explanation?.text).toContain(
      "最後から 2 つ目の♭（E♭）が主音",
    );
    expect(circleOfFifths.question("sig:A", ctx, seeded(1)).explanation?.text).toContain("最後の♯（G♯）の半音上");
  });
});
