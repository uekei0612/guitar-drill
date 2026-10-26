import { describe, expect, it } from "vitest";
import { STANDARD, TUNINGS, midiAt, openMidis, openNote, pcAt, positionsOf, tuningById } from "./fretboard";
import { note, noteId, pc } from "./note";

describe("fretboard", () => {
  it("開放弦は 1 弦から数える", () => {
    expect([1, 2, 3, 4, 5, 6].map(s => noteId(openNote(STANDARD, s)))).toEqual(["E", "B", "G", "D", "A", "E"]);
    expect(
      noteId(
        openNote(
          TUNINGS.find(t => t.id === "drop_d")!,
          6,
        ),
      ),
    ).toBe("D");
    expect(() => openNote(STANDARD, 7)).toThrow();
  });

  it("(弦, フレット) → 音", () => {
    expect(pcAt(STANDARD, { string: 6, fret: 5 })).toBe(pc(note("A")));
    expect(pcAt(STANDARD, { string: 3, fret: 2 })).toBe(pc(note("A")));
    expect(pcAt(STANDARD, { string: 1, fret: 12 })).toBe(pc(note("E")));
  });

  it("音 → 位置の一覧", () => {
    const as = positionsOf(STANDARD, pc(note("A")));
    expect(as).toEqual([
      { string: 1, fret: 5 },
      { string: 2, fret: 10 },
      { string: 3, fret: 2 },
      { string: 4, fret: 7 },
      { string: 5, fret: 0 },
      { string: 5, fret: 12 },
      { string: 6, fret: 5 },
    ]);
    expect(positionsOf(STANDARD, pc(note("E")), { minFret: 1, maxFret: 24 }).filter(p => p.string === 1)).toEqual([
      { string: 1, fret: 12 },
      { string: 1, fret: 24 },
    ]);
    for (const t of TUNINGS)
      for (let p = 0; p < 12; p++)
        for (const pos of positionsOf(t, p, { minFret: 0, maxFret: 15 })) expect(pcAt(t, pos)).toBe(p);
  });
});

describe("音の高さ", () => {
  const m = (id: string) => openMidis(tuningById(id)!);
  it("開放弦（E2 = 40、C4 = 60）", () => {
    expect(m("standard")).toEqual([40, 45, 50, 55, 59, 64]);
    expect(m("drop_d")[0]).toBe(38);
    expect(m("half_step_down")[0]).toBe(39);
    expect(m("7_string")[0]).toBe(35);
    expect(m("8_string")[0]).toBe(30);
    expect(m("math_facgce")).toEqual([41, 45, 48, 55, 60, 64]);
    expect(m("bass_4")).toEqual([28, 33, 38, 43]);
    expect(m("bass_6")).toEqual([23, 28, 33, 38, 43, 48]);
  });
  it("フレットを足す", () => {
    expect(midiAt(STANDARD, { string: 6, fret: 8 })).toBe(48);
    expect(midiAt(STANDARD, { string: 5, fret: 3 })).toBe(48);
    expect(midiAt(STANDARD, { string: 1, fret: 12 })).toBe(76);
  });
});
