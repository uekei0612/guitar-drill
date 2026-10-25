import { describe, expect, it } from "vitest";
import { fmt, note, noteId, pc, spellings } from "./note";

describe("note", () => {
  it("読み書きが往復する", () => {
    for (const s of ["C", "F#", "Bb", "F##", "Bbb", "E#", "Cb"]) expect(noteId(note(s))).toBe(s);
    expect(note("F𝄪")).toEqual(note("F##"));
    expect(note("B♭")).toEqual(note("Bb"));
    expect(note("Fx")).toEqual(note("F##"));
    expect(() => note("H")).toThrow();
  });

  it("ピッチクラス", () => {
    expect(pc(note("C"))).toBe(0);
    expect(pc(note("B#"))).toBe(0);
    expect(pc(note("Cb"))).toBe(11);
    expect(pc(note("F##"))).toBe(7);
  });

  it("表記", () => {
    expect(["F#", "Bb", "F##", "Bbb", "C"].map(s => fmt(note(s)))).toEqual(["F♯", "B♭", "F𝄪", "B𝄫", "C"]);
  });

  it("ピッチクラスの綴り方は変化記号の少ない順", () => {
    expect(spellings(6).map(noteId)).toEqual(["F#", "Gb"]);
    expect(spellings(4).map(noteId)).toEqual(["E", "Fb"]);
    expect(spellings(0).map(noteId)).toEqual(["C", "B#"]);
    for (let p = 0; p < 12; p++) for (const n of spellings(p)) expect(pc(n)).toBe(p);
  });
});
