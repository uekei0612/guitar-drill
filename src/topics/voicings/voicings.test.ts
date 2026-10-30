import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { NECK } from "../../drill/topic";
import { STANDARD, TUNINGS } from "../../theory";
import { VOICINGS, shapeOf, voicings } from ".";

const ctx = (tuning = STANDARD) => ({ common: { tuning, lefty: false }, settings: {} });
const v = (id: string) => VOICINGS.find(x => x.id === id)!;
/** 6弦→1弦のフレット表記（x は鳴らさない弦） */
const tab = (id: string, type: string, rootFret: number) => {
  const s = shapeOf(STANDARD, v(id), type, rootFret)!;
  return [6, 5, 4, 3, 2, 1].map(str => s.positions.find(p => p.string === str)?.fret ?? "x").join("");
};

describe("ボイシングの型", () => {
  it("どのチューニングでも問題が壊れていない", () => {
    // 弦が足りない・変則チューニングで作れない形は出さない（4 弦ベースは 4〜1 弦のドロップ 2 だけ）
    for (const t of TUNINGS) if (voicings.items(ctx(t)).length) expect(checkTopic(voicings, ctx(t), 10)).toEqual([]);
    expect(voicings.items(ctx(TUNINGS.find(t => t.id === "bass_4")))).toEqual(
      ["M7", "7", "m7", "m7b5"].flatMap(x => [`drop2-4:${x}:fill`, `drop2-4:${x}:name`]),
    );
  });

  it("よく知られた形になる", () => {
    expect(tab("drop2-5", "7", 3)).toBe("x3535x"); // C7
    expect(tab("drop2-4", "7", 3)).toBe("xx3545"); // F7
    expect(tab("drop3-6", "7", 3)).toBe("3x343x"); // G7
    expect(tab("drop3-5", "M7", 3)).toBe("x3x453"); // CM7
    expect(tab("shell-6a", "7", 3)).toBe("3x34xx"); // G7
    expect(tab("shell-5a", "m7", 3)).toBe("x313xx"); // Cm7
    expect(tab("drop2-6", "m7b5", 7)).toBe("7877xx"); // Bm7(♭5)
  });

  it("作る問題は指板の長い図（開放〜12 フレット）から R も含めて選ぶ（R はヒントで出す）。「何のコード？」は形のまわりだけ", () => {
    for (const id of voicings.items(ctx())) {
      const q = voicings.question(id, ctx(), seeded(1));
      if (id.endsWith(":fill")) {
        if (q.answer.kind !== "tap") throw new Error();
        expect(q.answer.range).toEqual(NECK);
        expect(q.prompt.board!.marks).toEqual([]);
        expect(q.answer.correct[0]).toEqual(q.hint!.marks![0]!.pos);
        expect(q.answer.correct).toEqual(q.explanation!.board!.marks.map(m => m.pos));
      } else expect(q.prompt.board!.range.maxFret - q.prompt.board!.range.minFret).toBe(5);
    }
  });

  it("シェルの「何のコード？」に m7(♭5) は出さない", () => {
    const a = voicings.question("shell-6a:m7:name", ctx(), seeded(1)).answer;
    if (a.kind !== "choice") throw new Error();
    expect(a.options).not.toContain("m7(♭5)");
    expect(a.correct).toBe("m7");
  });

  it("解説は作り方と型を決める音、音はジャランと", () => {
    const q = voicings.question("drop2-5:m7:name", ctx(), seeded(1));
    expect(q.explanation!.text).toContain("上から 2 番目");
    expect(q.explanation!.text).toContain("♭3（半音 3）・5（半音 7）・♭7（半音 10）");
    expect(q.sound!.strum).toBe(true);
    expect(q.sound!.notes).toHaveLength(4);
    const s = voicings.question("shell-6a:M7:name", ctx(), seeded(1));
    expect(s.explanation!.text).toContain("3（半音 4）・7（半音 11）");
  });
});
