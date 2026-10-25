import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { triads } from ".";

type TriadSettings = { dim: boolean; aug: boolean; sus: boolean };

const ctx = (s: Partial<TriadSettings> = {}) => ({
  common: { tuning: STANDARD, lefty: false },
  settings: { ...triads.settings!.defaults, ...s },
});

describe("トライアドの構成音", () => {
  it("どの設定でも問題が壊れていない", () => {
    for (const s of [{}, { dim: true, aug: true, sus: true }]) expect(checkTopic(triads, ctx(s))).toEqual([]);
  });

  it("既定はメジャーとマイナーだけ、設定で型が増える", () => {
    expect(triads.items(ctx())).toHaveLength(2 * 12 * 3);
    expect(triads.items(ctx({ dim: true, aug: true, sus: true }))).toHaveLength(6 * 12 * 3);
    expect(triads.items(ctx())[0]).toBe("maj:C:tones");
  });

  it("綴りと、異名同音で書いた紛らわしい選択肢", () => {
    const q = triads.question("m:Eb:tones", ctx(), seeded(3));
    expect(q.answer).toMatchObject({ kind: "choice", correct: "E♭ G♭ B♭" });
    if (q.answer.kind !== "choice") throw new Error();
    expect(q.answer.options).toContain("E♭ F♯ B♭");
    expect(triads.question("m:G#:tones", ctx(), seeded(1)).answer).toMatchObject({ correct: "G♯ B D♯" });
    expect(triads.question("dim:B:name", ctx({ dim: true }), seeded(1)).answer).toMatchObject({ correct: "Bdim" });
    expect(triads.question("aug:Ab:tones", ctx({ aug: true }), seeded(1)).answer).toMatchObject({ correct: "A♭ C E" });
    expect(triads.question("maj:C:name", ctx(), seeded(1)).explanation?.text).toBe("C = C（R） E（3） G（5）");
  });

  it("壊れた設定は既定値に戻す", () => {
    expect(triads.settings!.parse({ dim: "yes", aug: true })).toEqual({ dim: false, aug: true, sus: false });
    expect(triads.settings!.parse(null)).toEqual(triads.settings!.defaults);
  });
});
