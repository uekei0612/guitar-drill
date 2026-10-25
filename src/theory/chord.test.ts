import { describe, expect, it } from "vitest";
import {
  CHORD_TYPES,
  chordIntervals,
  chordSymbol,
  chordToneLabels,
  chordTones,
  chordType,
  detectChord,
  detectChordFromNotes,
} from "./chord";
import { note, noteId } from "./note";

describe("chord", () => {
  it("ID は重複しない", () => {
    expect(new Set(CHORD_TYPES.map(c => c.id)).size).toBe(CHORD_TYPES.length);
    expect(new Set(CHORD_TYPES.map(c => c.degrees.join())).size).toBe(CHORD_TYPES.length);
  });

  it("構成音と表記", () => {
    expect(chordTones(note("G"), chordType("7")).map(noteId)).toEqual(["G", "B", "D", "F"]);
    expect(chordTones(note("G#"), chordType("dim7")).map(noteId)).toEqual(["G#", "B", "D", "F"]);
    expect(chordTones(note("C"), chordType("7#11")).map(noteId)).toEqual(["C", "E", "G", "Bb", "F#"]);
    expect(chordSymbol(note("E#"), chordType("dim"))).toBe("E♯dim");
    expect(chordSymbol(note("B"), chordType("m7b5"))).toBe("Bm7(♭5)");
    expect(chordToneLabels(chordType("dim7"))).toEqual(["R", "♭3", "♭5", "♭♭7"]);
  });

  it("度数の並びから型を決める", () => {
    for (const c of CHORD_TYPES) expect(detectChord(chordIntervals(c))).toBe(c);
    expect(detectChordFromNotes(["C", "E", "G", "B"].map(note))?.id).toBe("M7");
    expect(detectChordFromNotes(["B", "D", "F", "A"].map(note))?.id).toBe("m7b5");
    expect(detectChordFromNotes(["C", "E", "G#"].map(note))?.id).toBe("aug");
    expect(detectChordFromNotes(["C", "E", "Ab"].map(note))).toBeUndefined();
  });
});
