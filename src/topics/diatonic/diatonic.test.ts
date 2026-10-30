import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { type DiatonicSettings, diatonic } from ".";

const ctx = (s: Partial<DiatonicSettings> = {}) => ({
  common: { tuning: STANDARD, lefty: false },
  settings: { ...diatonic.settings!.defaults, ...s },
});

describe("ダイアトニックコード", () => {
  it("全キー × 全形式 × 三和音／四和音 × 借りる設定で、問題が壊れていない", () => {
    for (const size of [3, 4] as const)
      for (const borrowDominant of [false, true])
        expect(checkTopic(diatonic, ctx({ size, borrowDominant }), 20)).toEqual([]);
  });

  it("item はキーごと、三和音と四和音で別", () => {
    const items = diatonic.items(ctx());
    expect(items).toHaveLength(24 * (14 + 6));
    expect(items[0]).toBe("C:4:d2c:0");
    expect(items[20]).toBe("Am:4:d2c:0");
    expect(diatonic.items(ctx({ size: 3 }))[0]).toBe("C:3:d2c:0");
  });

  it("キーを絞ると、そのキーの item だけ（キーの画面から 1 回だけ絞るとき）", () => {
    const items = diatonic.items(ctx({ keys: ["G", "Em"] }));
    expect(items).toHaveLength(2 * (14 + 6));
    expect(new Set(items.map(i => i.split(":")[0]))).toEqual(new Set(["G", "Em"]));
    // 知らないキーは捨てる（全部捨てたら全キー）
    expect(diatonic.settings!.parse({ keys: ["H", "G"] }).keys).toEqual(["G"]);
    expect(diatonic.items(ctx({ ...diatonic.settings!.parse({ keys: ["H"] }) }))).toHaveLength(24 * 20);
  });

  it("旧アプリと同じ答え", () => {
    expect(diatonic.question("C:4:d2c:4", ctx(), seeded(1)).answer).toMatchObject({ correct: "G7" });
    expect(diatonic.question("F#:3:d2c:6", ctx({ size: 3 }), seeded(1)).answer).toMatchObject({ correct: "E♯dim" });
    expect(diatonic.question("Am:4:c2d:2", ctx(), seeded(1)).answer).toMatchObject({ correct: "♭ⅢM7" });
    expect(diatonic.question("Am:4:d2c:4", ctx({ borrowDominant: true }), seeded(1)).answer).toMatchObject({
      correct: "E7",
    });
    expect(diatonic.question("G#m:3:d2c:6", ctx({ size: 3, borrowDominant: true }), seeded(1)).answer).toMatchObject({
      correct: "F𝄪dim",
    });
    expect(diatonic.question("Ebm:4:note:5", ctx(), seeded(1)).answer).toMatchObject({ correct: "C♭" });
  });
});
