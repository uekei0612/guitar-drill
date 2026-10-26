import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { grade } from "../../drill/topic";
import { STANDARD, TUNINGS, chordType, chordTones, fmt, pcAt, pc } from "../../theory";
import { barresOf, mutedOf, sounding, tabText } from "../chord-shapes/shape";
import { OPEN_CHORDS, type OpenChordsSettings, openChordById, openChords } from ".";

const all: OpenChordsSettings = { seventh: true, minorSeventh: true, majorSeventh: true, f: true };
const ctx = (settings: Partial<OpenChordsSettings> = {}, tuning = STANDARD) => ({
  common: { tuning, lefty: false },
  settings: { ...openChords.settings!.defaults, ...settings },
});

describe("ローコードの押さえ方", () => {
  it("どの押さえ方も、鳴る音がコードの構成音だけで、全部の構成音を含む", () => {
    for (const c of OPEN_CHORDS) {
      const tones = chordTones(c.root, chordType(c.type)).map(pc);
      const heard = sounding(c.shape).map(p => pcAt(STANDARD, p));
      expect(
        heard.every(x => tones.includes(x)),
        c.id,
      ).toBe(true);
      // 5 度を省くことはあっても、R と 3 度（と 7 度）は必ず鳴る
      const needed = tones.filter((_, i) => i !== 2);
      expect(
        needed.every(x => heard.includes(x)),
        c.id,
      ).toBe(true);
      // いちばん低い音はルート
      expect(heard[0], c.id).toBe(pc(c.root));
    }
  });

  it("よく知られた形と、×・バレー", () => {
    expect(tabText(openChordById("C").shape)).toBe("x32010");
    expect(mutedOf(openChordById("D").shape)).toEqual([6, 5]);
    expect(barresOf(openChordById("F").shape)).toEqual([{ fret: 1, low: 6, high: 1 }]);
    expect(barresOf(openChordById("Dm7").shape)).toEqual([{ fret: 1, low: 2, high: 1 }]);
    expect(barresOf(openChordById("G").shape)).toEqual([]);
  });

  it("どの設定でも問題が壊れていない。レギュラー以外では出さない", () => {
    for (const s of [{}, all]) expect(checkTopic(openChords, ctx(s))).toEqual([]);
    expect(openChords.items(ctx({}))).toHaveLength(16);
    expect(openChords.items(ctx(all))).toHaveLength(40);
    for (const t of TUNINGS.filter(t => t.id !== "standard")) expect(openChords.items(ctx(all, t))).toEqual([]);
  });

  it("押さえ方：開放弦も含めて 1 弦 1 か所、鳴らさない弦は押さない", () => {
    const q = openChords.question("C:play", ctx(), seeded(1));
    expect(q.answer).toMatchObject({ kind: "tap", mode: "all", onePerString: true, orientation: "vertical" });
    const ok = [
      { string: 5, fret: 3 },
      { string: 4, fret: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 1 },
      { string: 1, fret: 0 },
    ];
    expect(grade(q.answer, { kind: "tap", positions: ok })).toBe(true);
    expect(grade(q.answer, { kind: "tap", positions: [...ok, { string: 6, fret: 0 }] })).toBe(false);
    expect(q.explanation?.text).toContain("鳴る音の度数（低い弦から）：R 3 5 R 3");
    expect(q.sound).toEqual({ notes: [48, 52, 55, 60, 64], strum: true });
  });

  it("形 → 名前：問題の図はルートの色を出さない（答えが見えないように）", () => {
    const q = openChords.question("Am:name", ctx(), seeded(1));
    expect(q.answer).toMatchObject({ kind: "choice", correct: "Am" });
    expect(q.prompt.board!.marks.every(m => m.kind === "tone" || m.kind === "open")).toBe(true);
    expect(q.prompt.board!.muted).toEqual([6]);
    if (q.answer.kind === "choice") expect(q.answer.options).toHaveLength(4);
    expect(fmt(openChordById("Am").root)).toBe("A");
  });

  it("壊れた設定は既定値に戻す", () => {
    expect(openChords.settings!.parse({ seventh: true, f: "y" })).toEqual({
      ...openChords.settings!.defaults,
      seventh: true,
    });
    expect(openChords.settings!.parse(null)).toEqual(openChords.settings!.defaults);
  });
});
