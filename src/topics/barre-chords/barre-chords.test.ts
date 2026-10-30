import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { NECK } from "../../drill/topic";
import { STANDARD, TUNINGS, chordTones, chordType, note, pc, pcAt } from "../../theory";
import { barresOf, sounding, tabText } from "../chord-shapes/shape";
import { FORMS, barreChords, barreShape, formOf } from ".";

const all = { majorSeventh: true, halfDiminished: true };
const ctx = (settings = {}, tuning = STANDARD) => ({
  common: { tuning, lefty: false },
  settings: { ...barreChords.settings!.defaults, ...settings },
});
const tab = (str: number, type: string, root: string) => tabText(barreShape(STANDARD, formOf(str, type), note(root)));

describe("ハイコードの押さえ方", () => {
  it("どのフォーム・どのルートでも、鳴る音は構成音だけでルートが最低音", () => {
    for (const f of FORMS)
      for (const r of ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]) {
        const tones = chordTones(note(r), chordType(f.type)).map(pc);
        const heard = sounding(barreShape(STANDARD, f, note(r))).map(p => pcAt(STANDARD, p));
        expect(
          heard.every(x => tones.includes(x)),
          `${f.rootString} ${f.type} ${r}`,
        ).toBe(true);
        expect(heard[0]).toBe(pc(note(r)));
        expect(sounding(barreShape(STANDARD, f, note(r))).every(p => p.fret >= 1)).toBe(true);
      }
  });

  it("よく知られた形", () => {
    expect(tab(6, "maj", "F")).toBe("133211");
    expect(tab(6, "m", "G")).toBe("355333");
    expect(tab(5, "maj", "C")).toBe("x35553");
    expect(tab(5, "m7", "C")).toBe("x35343");
    expect(tab(6, "m7b5", "B")).toBe("7x776x");
    // 1 フレット手前を押さえる形はナットを越えるので 1 オクターブ上
    expect(tab(6, "m7b5", "F")).toBe("(13)x(13)(13)(12)x");
    expect(tab(6, "maj", "E")).toBe("(12)(14)(14)(13)(12)(12)");
    expect(barresOf(barreShape(STANDARD, formOf(5, "maj"), note("C")))).toEqual([
      { fret: 3, low: 5, high: 1 },
      { fret: 5, low: 4, high: 2 },
    ]);
  });

  it("どの設定でも問題が壊れていない。レギュラー以外では出さない", () => {
    for (const s of [{}, all]) expect(checkTopic(barreChords, ctx(s), 5)).toEqual([]);
    expect(barreChords.items(ctx())).toHaveLength(4 * 2 * 12 * 3);
    expect(barreChords.items(ctx())[0]).toBe("6:maj:C:play");
    expect(
      barreChords.items(
        ctx(
          {},
          TUNINGS.find(t => t.id === "drop_d"),
        ),
      ),
    ).toEqual([]);
  });

  it("フォームを作る：指板の長い図（開放〜12 フレット）から、ルートも含めて 1 弦 1 か所ずつ。ルートはヒントで出す", () => {
    const q = barreChords.question("5:m:C:play", ctx(), seeded(1));
    expect(q.prompt.board!.marks).toEqual([]);
    expect(q.prompt.board!.range).toEqual(NECK);
    expect(q.hint!.marks).toEqual([{ pos: { string: 5, fret: 3 }, kind: "hint", label: "R" }]);
    expect(q.answer).toMatchObject({
      kind: "tap",
      range: NECK,
      frets: { minFret: 1, maxFret: 12 },
      correct: [
        { string: 5, fret: 3 },
        { string: 4, fret: 5 },
        { string: 3, fret: 5 },
        { string: 2, fret: 4 },
        { string: 1, fret: 3 },
      ],
    });
  });

  it("12 フレットより先にはみ出す形は、図をそこまで伸ばす。どのフォームも押さえ方は 1 通り（1 オクターブ上は図の外）", () => {
    const q = barreChords.question("6:maj:E:play", ctx(), seeded(1));
    expect(q.answer).toMatchObject({ range: { minFret: 0, maxFret: 14 }, frets: { minFret: 1, maxFret: 14 } });
    for (const id of barreChords.items(ctx(all)).filter(x => x.endsWith(":play"))) {
      const a = barreChords.question(id, ctx(all), seeded(1)).answer;
      if (a.kind !== "tap") throw new Error();
      expect(Math.min(...a.correct.map(p => p.fret)) + 12).toBeGreaterThan(a.range.maxFret);
    }
  });

  it("何フレット・形 → 名前（もう一方の弦で読んだ名前が引っかけ）", () => {
    expect(barreChords.question("6:maj:Bb:fret", ctx(), seeded(1)).answer).toMatchObject({ correct: "6フレット" });
    const q = barreChords.question("6:maj:G:name", ctx(), seeded(1));
    expect(q.answer).toMatchObject({ correct: "G" });
    if (q.answer.kind === "choice") expect(q.answer.options).toContain("C");
  });
});
