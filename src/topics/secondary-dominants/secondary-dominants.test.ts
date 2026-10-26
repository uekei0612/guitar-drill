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
});
