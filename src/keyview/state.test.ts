import { describe, expect, it } from "vitest";
import { fmt, note } from "../theory";
import {
  DEFAULT_KEY_VIEW,
  changedNotes,
  chordsOf,
  dimLabel,
  fromParams,
  inFan,
  keyById,
  placeOf,
  slotOf,
  toParams,
} from "./state";

const roundTrip = (s: typeof DEFAULT_KEY_VIEW) => fromParams(new URLSearchParams(toParams(s).toString()));

describe("キーの画面の状態", () => {
  it("URL と往復する", () => {
    expect(roundTrip(DEFAULT_KEY_VIEW)).toEqual(DEFAULT_KEY_VIEW);
    const s = { key: keyById("F#m")!, size: 3 as const, func: true, borrow: true, chord: 4, board: "roots" as const };
    expect(roundTrip(s)).toEqual(s);
  });

  it("読めない値は既定値のまま", () => {
    expect(fromParams(new URLSearchParams("key=H&size=5&chord=9"))).toEqual(DEFAULT_KEY_VIEW);
  });

  it("どのキーも、7 つのコードが主音を真ん中にした扇形に収まる", () => {
    for (const id of ["C", "G", "F#", "Db", "Bb", "Am", "Ebm", "C#m"]) {
      const s = { ...DEFAULT_KEY_VIEW, key: keyById(id)! };
      const center = slotOf(s.key);
      const places = chordsOf(s).map(placeOf);
      expect(places.every(p => inFan(center, p))).toBe(true);
      // 扇形の 7 つの場所を 1 つずつ使う
      expect(new Set(places.map(p => `${p.ring}${p.slot}`)).size).toBe(7);
    }
  });

  it("C のキーは、外に F C G、中に Dm Am Em、内に Bdim", () => {
    const places = chordsOf(DEFAULT_KEY_VIEW).map(placeOf);
    expect(places.map(p => `${p.ring}:${p.slot}`)).toEqual([
      "major:0",
      "minor:11",
      "minor:1",
      "major:11",
      "major:1",
      "minor:0",
      "dim:0",
    ]);
  });

  it("マイナーで Ⅴ・Ⅶ を借りると、その 2 つは扇形の外", () => {
    const s = { ...DEFAULT_KEY_VIEW, key: keyById("Am")!, borrow: true };
    const out = chordsOf(s).filter(c => !inFan(slotOf(s.key), placeOf(c)));
    expect(out.map(c => c.symbol)).toEqual(["E7", "G♯dim7"]);
  });

  it("内の輪の dim は、外のメジャーキーの綴りで書く", () => {
    expect(dimLabel(0)).toBe("Bdim");
    expect(dimLabel(6)).toBe("E♯dim");
    expect(dimLabel(11)).toBe("Edim");
  });

  it("5 度上へ動くと 1 音だけ変わる", () => {
    const c = changedNotes(keyById("C")!, keyById("G")!);
    expect([c.from.map(fmt), c.to.map(fmt)]).toEqual([["F"], ["F♯"]]);
    const f = changedNotes(keyById("F")!, keyById("Bb")!);
    expect([f.from.map(fmt), f.to.map(fmt)]).toEqual([["E"], ["E♭"]]);
    // 平行調は同じ音
    expect(changedNotes(keyById("C")!, keyById("Am")!).to).toEqual([]);
  });

  it("異名同音のキーも同じ位置", () => {
    expect(slotOf({ mode: "major", tonic: note("Gb") })).toBe(slotOf(keyById("F#")!));
  });
});
