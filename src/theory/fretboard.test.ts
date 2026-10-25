import { describe, expect, it } from "vitest";
import { STANDARD, TUNINGS, openNote, pcAt, positionsOf } from "./fretboard";
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
