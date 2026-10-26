import { describe, expect, it } from "vitest";
import { note, noteId } from "./note";
import { SCALES, type ScaleId, scaleNotes } from "./scale";

const names = (id: ScaleId, root: string) => scaleNotes(id, note(root)).map(noteId).join(" ");

describe("scale", () => {
  it("綴りの例", () => {
    expect(names("major", "E")).toBe("E F# G# A B C# D#");
    expect(names("natural_minor", "Eb")).toBe("Eb F Gb Ab Bb Cb Db");
    expect(names("harmonic_minor", "G#")).toBe("G# A# B C# D# E F##");
    expect(names("melodic_minor", "C")).toBe("C D Eb F G A B");
    expect(names("dorian", "D")).toBe("D E F G A B C");
    expect(names("phrygian", "E")).toBe("E F G A B C D");
    expect(names("lydian", "F")).toBe("F G A B C D E");
    expect(names("mixolydian", "G")).toBe("G A B C D E F");
    expect(names("locrian", "B")).toBe("B C D E F G A");
    expect(names("major_pentatonic", "C")).toBe("C D E G A");
    expect(names("minor_pentatonic", "A")).toBe("A C D E G");
    expect(names("minor_blues", "A")).toBe("A C D Eb E G");
    expect(names("altered", "G")).toBe("G Ab A# B C# Eb F");
    expect(names("phrygian_dominant", "E")).toBe("E F G# A B C D");
    expect(names("combination_diminished", "C")).toBe("C Db D# E F# G A Bb");
    expect(names("lydian_dominant", "F")).toBe("F G A B C D Eb");
  });

  it("7 音のスケールはどのルートでも 7 つの文字を 1 回ずつ使う", () => {
    const roots = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb"];
    // ドミナントのスケール（オルタードなど）は ♭9 と ♯9 が同じ文字になるので除く
    const dominant = ["altered", "phrygian_dominant", "combination_diminished", "lydian_dominant"];
    for (const def of Object.values(SCALES))
      if (def.degrees.length === 7 && !dominant.includes(def.id))
        for (const r of roots) {
          const ns = scaleNotes(def.id, note(r));
          expect(new Set(ns.map(n => n.letter)).size, `${def.id} ${r}`).toBe(7);
        }
  });
});
