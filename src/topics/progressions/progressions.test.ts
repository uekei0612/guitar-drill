import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { PROGRESSIONS, progressions, romanText } from ".";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };
const ask = (id: string) => progressions.question(id, ctx, seeded(1)).answer;

describe("定番の進行", () => {
  it("問題が壊れていない", () => {
    expect(checkTopic(progressions, ctx)).toEqual([]);
    expect(progressions.items(ctx)).toHaveLength(PROGRESSIONS.length * 12);
  });

  it("度数の表記とコード名", () => {
    expect(romanText(PROGRESSIONS.find(p => p.id === "ohdo")!)).toBe("ⅣM7 – Ⅴ7 – Ⅲm7 – Ⅵm");
    expect(romanText(PROGRESSIONS.find(p => p.id === "minor-andalusian")!)).toBe("Ⅰm – ♭Ⅶ – ♭Ⅵ – Ⅴ");
    expect(ask("251:C")).toMatchObject({ correct: "Dm7 – G7 – CM7" });
    expect(ask("251:Db")).toMatchObject({ correct: "E♭m7 – A♭7 – D♭M7" });
    expect(ask("minor251:Am")).toMatchObject({ correct: "Bm7(♭5) – E7 – Am7" });
    expect(ask("blues:E")).toMatchObject({ correct: "E7 – A7 – B7" });
    expect(ask("minor-andalusian:Am")).toMatchObject({ correct: "Am – G – F – E" });
    expect(ask("ohdo:F#")).toMatchObject({ correct: "BM7 – C♯7 – A♯m7 – D♯m" });
  });
});
