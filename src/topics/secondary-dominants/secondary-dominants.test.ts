import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { secondaryDominants } from ".";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };
const ask = (id: string) => secondaryDominants.question(id, ctx, seeded(1)).answer;

describe("セカンダリードミナントと裏コード", () => {
  it("問題が壊れていない", () => {
    expect(checkTopic(secondaryDominants, ctx)).toEqual([]);
    expect(secondaryDominants.items(ctx)).toHaveLength(12 * 6 * 2);
  });

  it("キー C", () => {
    expect(ask("C:1:sec")).toMatchObject({ correct: "A7" });
    expect(ask("C:1:sub")).toMatchObject({ correct: "E♭7" });
    expect(ask("C:5:sec")).toMatchObject({ correct: "E7" });
    expect(ask("C:4:sub")).toMatchObject({ correct: "A♭7" });
    expect(ask("C:0:sub")).toMatchObject({ correct: "D♭7" });
    expect(ask("C:3:sec")).toMatchObject({ correct: "C7" });
  });

  it("♯系・♭系のキーでも綴りが崩れない", () => {
    expect(ask("E:5:sec")).toMatchObject({ correct: "G♯7" });
    expect(ask("E:5:sub")).toMatchObject({ correct: "D7" });
    expect(ask("Db:2:sec")).toMatchObject({ correct: "C7" });
  });

  it("解説は表と裏と解決先を並べ、裏は 3 度と 7 度の共有を言う", () => {
    const q = secondaryDominants.question("C:1:sub", ctx, seeded(1));
    expect(q.explanation!.strip!.map(s => s.label)).toEqual(["A7", "E♭7", "Dm"]);
    expect(q.explanation!.strip!.find(s => s.current)!.label).toBe("E♭7");
    expect(q.explanation!.text).toContain("A7 の 3 度 C♯ は E♭7 の 7 度 D♭（＝C♯）、7 度 G は 3 度 G");
    expect(q.sound!.chords).toHaveLength(2);
  });
});
