import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { NECK } from "../../drill/topic";
import { seeded } from "../../drill/rng";
import { STANDARD, TUNINGS, mod, pcAt, positionsOf } from "../../theory";
import { intervals, shapeHint } from ".";

const ctx = (tuning = STANDARD) => ({ common: { tuning, lefty: false }, settings: {} });

describe("度数の位置", () => {
  it("どのチューニングでも問題が壊れていない", () => {
    for (const t of TUNINGS) expect(checkTopic(intervals, ctx(t))).toEqual([]);
  });

  it("タップは指板の長い図（開放〜12 フレット）で、正解はその中にあるその度数の位置すべて", () => {
    for (let n = 0; n < 100; n++) {
      const q = intervals.question("tap:3", ctx(), seeded(n));
      const root = q.prompt.board!.marks[0]!.pos;
      if (q.answer.kind !== "tap") throw new Error();
      expect(q.answer.range).toEqual(NECK);
      expect(q.prompt.board!.range).toEqual(NECK);
      expect(q.answer.correct).toHaveLength(positionsOf(STANDARD, mod(pcAt(STANDARD, root) + 4, 12), NECK).length);
      for (const p of q.answer.correct) expect(mod(pcAt(STANDARD, p) - pcAt(STANDARD, root), 12)).toBe(4);
    }
    // 「何度？」は今までどおり R のまわりだけ
    const r = intervals.question("name:3", ctx(), seeded(1)).prompt.board!.range;
    expect(r.maxFret - r.minFret + 1).toBe(6);
  });

  it("「何度？」の正解は、示した点とルートの半音差", () => {
    for (let n = 0; n < 100; n++) {
      const q = intervals.question("name:b7", ctx(), seeded(n));
      expect(q.answer).toMatchObject({ kind: "choice", correct: "♭7" });
      const [root, target] = q.prompt.board!.marks.map(m => m.pos);
      expect(mod(pcAt(STANDARD, target!) - pcAt(STANDARD, root!), 12)).toBe(10);
    }
  });

  it("形の言い方：弦の太さとフレットの向き。2弦と3弦をまたぐとずれると添える", () => {
    expect(shapeHint({ string: 6, fret: 5 }, { string: 5, fret: 7 })).toBe("1 本細い弦・2 フレット ボディ側");
    expect(shapeHint({ string: 4, fret: 7 }, { string: 6, fret: 5 })).toBe("2 本太い弦・2 フレット ヘッド側");
    expect(shapeHint({ string: 5, fret: 3 }, { string: 5, fret: 3 })).toBe("同じ弦・同じフレット");
    for (let n = 0; n < 30; n++) {
      const q = intervals.question("tap:3", ctx(), seeded(n));
      const lines = q.explanation!.text.split("\n");
      expect(lines[0]).toBe("R から 3：長3度（半音 4）");
      expect(q.sound?.notes[1]! - q.sound!.notes[0]!).toSatisfy((d: number) => mod(d, 12) === 4);
    }
  });
});
