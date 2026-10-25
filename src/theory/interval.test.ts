import { describe, expect, it } from "vitest";
import {
  degree,
  degreeId,
  degreeLabel,
  fromQuality,
  intervalBetween,
  quality,
  semitones,
  spell,
  transpose,
} from "./interval";
import { note, noteId } from "./note";

describe("interval", () => {
  it("度数の読み書きが往復する", () => {
    for (const s of [
      "R",
      "b2",
      "2",
      "b3",
      "3",
      "4",
      "#4",
      "b5",
      "5",
      "#5",
      "6",
      "bb7",
      "b7",
      "7",
      "b9",
      "9",
      "#9",
      "11",
      "#11",
      "b13",
      "13",
    ])
      expect(degreeId(degree(s))).toBe(s);
    expect(degree("1")).toEqual(degree("R"));
    expect(degree("♭3")).toEqual(degree("b3"));
    expect(degreeLabel(degree("bb7"))).toBe("♭♭7");
    expect(degreeLabel(degree("#11"))).toBe("♯11");
    expect(() => degree("14")).toThrow();
  });

  it("半音数", () => {
    expect(
      ["R", "b3", "3", "#4", "b5", "5", "bb7", "b7", "7", "b9", "9", "#9", "11", "13"].map(s => semitones(degree(s))),
    ).toEqual([0, 3, 4, 6, 6, 7, 9, 10, 11, 13, 14, 15, 17, 21]);
  });

  it("質と相互に変換できる", () => {
    expect(quality(degree("b3"))).toBe("m");
    expect(quality(degree("5"))).toBe("P");
    expect(quality(degree("#4"))).toBe("A");
    expect(quality(degree("b5"))).toBe("d");
    expect(quality(degree("bb7"))).toBe("d");
    expect(fromQuality(7, "d")).toEqual(degree("bb7"));
    expect(fromQuality(11, "A")).toEqual(degree("#11"));
    expect(() => fromQuality(5, "M")).toThrow();
    expect(() => quality(degree("bb5"))).toThrow();
  });

  it("移調は文字を度数で、変化記号を半音数で決める", () => {
    expect(noteId(transpose(note("G#"), degree("7")))).toBe("F##");
    expect(noteId(transpose(note("C"), degree("#11")))).toBe("F#");
    expect(noteId(transpose(note("Eb"), degree("b6")))).toBe("Cb");
    expect(spell(note("A"), ["R", "b3", "4", "b5", "5", "b7"].map(degree)).map(noteId)).toEqual([
      "A",
      "C",
      "D",
      "Eb",
      "E",
      "G",
    ]);
  });

  it("2 音の間の度数", () => {
    expect(degreeId(intervalBetween(note("G#"), note("F")))).toBe("bb7");
    expect(degreeId(intervalBetween(note("B"), note("F")))).toBe("b5");
    expect(degreeId(intervalBetween(note("F"), note("B")))).toBe("#4");
    expect(degreeId(intervalBetween(note("E"), note("E")))).toBe("R");
  });
});
