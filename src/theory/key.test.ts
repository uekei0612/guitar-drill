import { describe, expect, it } from "vitest";
import { FIFTHS, KEYS, type KeyMode, diatonicChords, keyId, keyLabel, keySignature } from "./key";
import { note, noteId, pc } from "./note";
import { scaleNotes } from "./scale";

const ALL = [...KEYS.major, ...KEYS.minor];
const key = (mode: KeyMode, r: string) => ({ mode, tonic: note(r) });

describe("key", () => {
  it("扱うキーは各 12、五度圏と ♯系→♭系 で同じ集合", () => {
    for (const m of ["major", "minor"] as const) {
      expect(FIFTHS[m]).toHaveLength(12);
      expect(KEYS[m].map(k => noteId(k.tonic)).sort()).toEqual([...FIFTHS[m]].sort());
    }
  });

  it("♯系→♭系 の並び", () => {
    expect(KEYS.major.map(k => noteId(k.tonic))).toEqual([
      "C",
      "G",
      "D",
      "A",
      "E",
      "B",
      "F#",
      "F",
      "Bb",
      "Eb",
      "Ab",
      "Db",
    ]);
    expect(KEYS.minor.map(k => noteId(k.tonic))).toEqual([
      "A",
      "E",
      "B",
      "F#",
      "C#",
      "G#",
      "D",
      "G",
      "C",
      "F",
      "Bb",
      "Eb",
    ]);
  });

  it("五度圏で同じ位置のマイナーは平行調（メジャーの Ⅵ）", () => {
    FIFTHS.major.forEach((r, i) => {
      expect(pc(scaleNotes("major", note(r))[5]!)).toBe(pc(note(FIFTHS.minor[i]!)));
    });
  });

  it("全キーのスケールは 7 つの文字を 1 回ずつ使い、ダブル♯/♭ を含まない", () => {
    for (const k of ALL) {
      const ns = scaleNotes(k.mode === "major" ? "major" : "natural_minor", k.tonic);
      expect(new Set(ns.map(n => n.letter)).size, keyId(k)).toBe(7);
      expect(
        ns.every(n => Math.abs(n.acc) <= 1),
        keyId(k),
      ).toBe(true);
      expect(ns[0]).toEqual(k.tonic);
    }
  });

  it("調号の数", () => {
    expect(keySignature(key("major", "C"))).toBe(0);
    expect(keySignature(key("major", "F#"))).toBe(6);
    expect(keySignature(key("major", "Db"))).toBe(-5);
    expect(keySignature(key("minor", "Eb"))).toBe(-6);
    expect(keySignature(key("minor", "G#"))).toBe(5);
  });

  it("ID と表記はメジャーとマイナーで衝突しない", () => {
    expect(new Set(ALL.map(keyId)).size).toBe(24);
    expect(keyLabel(key("minor", "F#"))).toBe("F♯m");
    expect(keyId(key("minor", "F#"))).toBe("F#m");
  });

  const QUALITY = {
    major: { 3: ["", "m", "m", "", "", "m", "dim"], 4: ["M7", "m7", "m7", "M7", "7", "m7", "m7(♭5)"] },
    minor: { 3: ["m", "dim", "", "m", "m", "", ""], 4: ["m7", "m7(♭5)", "M7", "m7", "m7", "M7", "7"] },
  } as const;
  const DEG = {
    major: ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"],
    minor: ["Ⅰ", "Ⅱ", "♭Ⅲ", "Ⅳ", "Ⅴ", "♭Ⅵ", "♭Ⅶ"],
  } as const;

  it("コードの型と度数表記は全キー共通", () => {
    for (const k of ALL)
      for (const size of [3, 4] as const) {
        const ch = diatonicChords(k, size);
        expect(
          ch.map(c => c.type.symbol),
          `${keyId(k)} ${size}`,
        ).toEqual(QUALITY[k.mode][size]);
        expect(
          ch.map(c => c.label),
          `${keyId(k)} ${size}`,
        ).toEqual(DEG[k.mode].map((d, i) => d + QUALITY[k.mode][size][i]));
      }
  });

  it("構成音の例", () => {
    expect(diatonicChords(key("major", "C"), 4)[4]!.tones.map(noteId)).toEqual(["G", "B", "D", "F"]);
    expect(diatonicChords(key("major", "F#"), 3)[6]!.symbol).toBe("E♯dim");
    expect(diatonicChords(key("minor", "A"), 3)[2]!.symbol).toBe("C");
    expect(diatonicChords(key("major", "C"), 4)[6]!.toneLabels).toEqual(["R", "♭3", "♭5", "♭7"]);
  });

  it("マイナーの Ⅴ・Ⅶ をハーモニックから借りると、その 2 つだけ変わる", () => {
    for (const k of KEYS.minor)
      for (const size of [3, 4] as const) {
        const nat = diatonicChords(k, size),
          dom = diatonicChords(k, size, { borrowDominant: true });
        const want = size === 3 ? ["", "dim"] : ["7", "dim7"];
        expect([dom[4]!.type.symbol, dom[6]!.type.symbol]).toEqual(want);
        expect([dom[4]!.label, dom[6]!.label]).toEqual(["Ⅴ" + want[0], "Ⅶ" + want[1]]);
        for (const i of [0, 1, 2, 3, 5]) expect(dom[i]).toEqual(nat[i]);
        expect(pc(dom[6]!.root), `${keyId(k)} の Ⅶ は導音`).toBe((pc(k.tonic) + 11) % 12);
      }
    expect(diatonicChords(key("major", "C"), 4, { borrowDominant: true })[4]!.symbol).toBe("G7");
  });

  it("借りた Ⅴ・Ⅶ の構成音", () => {
    const am = diatonicChords(key("minor", "A"), 4, { borrowDominant: true });
    expect(am[4]!.tones.map(noteId)).toEqual(["E", "G#", "B", "D"]);
    expect(am[6]!.tones.map(noteId)).toEqual(["G#", "B", "D", "F"]);
    expect(am[6]!.toneLabels).toEqual(["R", "♭3", "♭5", "♭♭7"]);
    expect(diatonicChords(key("minor", "G#"), 3, { borrowDominant: true })[6]!.symbol).toBe("F𝄪dim");
    expect(diatonicChords(key("minor", "Eb"), 4, { borrowDominant: true })[4]!.symbol).toBe("B♭7");
  });
});
