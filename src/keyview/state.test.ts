import { describe, expect, it } from "vitest";
import { fmt, note } from "../theory";
import {
  DEFAULT_KEY_VIEW,
  changedNotes,
  chordsOf,
  dimLabel,
  fromParams,
  funcOf,
  inFan,
  keyById,
  placeOf,
  progChords,
  rootMotion,
  slotOf,
  toParams,
} from "./state";

const roundTrip = (s: typeof DEFAULT_KEY_VIEW) => fromParams(new URLSearchParams(toParams(s).toString()));

describe("キーの画面の状態", () => {
  it("URL と往復する", () => {
    expect(roundTrip(DEFAULT_KEY_VIEW)).toEqual(DEFAULT_KEY_VIEW);
    const s = {
      key: keyById("F#m")!,
      size: 3 as const,
      func: true,
      borrow: true,
      chord: 4,
      board: "roots" as const,
      prog: "custom",
      custom: [0, 4, 5, 3],
    };
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

  it("進行はキーの種類に合うものだけ戻す（メジャーの王道進行はマイナーでは出さない）", () => {
    expect(fromParams(new URLSearchParams("key=G&prog=ohdo")).prog).toBe("ohdo");
    expect(fromParams(new URLSearchParams("key=Em&prog=ohdo")).prog).toBeNull();
    expect(fromParams(new URLSearchParams("key=C&prog=custom&seq=2-5-9-1")).custom).toEqual([1, 4, 0]);
  });

  it("進行のコードは画面の和音の数に合わせ、借りる指定のあるコードはそのスケールから", () => {
    const g = { ...DEFAULT_KEY_VIEW, key: keyById("G")!, prog: "251" };
    expect(progChords(g).map(c => c.symbol)).toEqual(["Am7", "D7", "GM7"]);
    expect(progChords({ ...g, size: 3 }).map(c => c.symbol)).toEqual(["Am", "D", "G"]);
    // アンダルシア進行は ♭Ⅶ をナチュラルマイナー、Ⅴ をハーモニックマイナーから（借りる設定によらない）
    const am = { ...DEFAULT_KEY_VIEW, key: keyById("Am")!, size: 3 as const, prog: "andalusian" };
    expect(progChords(am).map(c => c.symbol)).toEqual(["Am", "G", "F", "E"]);
    expect(progChords({ ...am, borrow: true }).map(c => c.symbol)).toEqual(["Am", "G", "F", "E"]);
  });

  it("ルートの動き：5 度下を強い動きとして見分ける", () => {
    const [ii, v, i] = progChords({ ...DEFAULT_KEY_VIEW, prog: "251" });
    expect(rootMotion(ii!, v!)).toEqual({ label: "5度下", strong: true });
    expect(rootMotion(v!, i!)).toEqual({ label: "5度下", strong: true });
    const [, , , iv] = progChords({ ...DEFAULT_KEY_VIEW, prog: "1564" });
    const [one, five] = progChords({ ...DEFAULT_KEY_VIEW, prog: "1564" });
    expect(rootMotion(one!, five!).label).toBe("5度上");
    expect(rootMotion(five!, iv!).label).toBe("2度下");
  });

  it("異名同音のキーも同じ位置", () => {
    expect(slotOf({ mode: "major", tonic: note("Gb") })).toBe(slotOf(keyById("F#")!));
  });

  it("機能：マイナーの ♭Ⅶ は SD、ハーモニックマイナーから借りた Ⅶdim は D", () => {
    const am = keyById("Am")!;
    expect(funcOf(am, 6)).toBe("SD");
    expect(funcOf(am, 6, true)).toBe("D");
    expect(funcOf(am, 4, true)).toBe("D");
    expect(funcOf(keyById("C")!, 6, true)).toBe("D");
    expect(funcOf(keyById("C")!, 5, true)).toBe("T");
  });
});
