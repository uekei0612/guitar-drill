import { describe, expect, it } from "vitest";
import { checkTopic } from "../../drill/check";
import { seeded } from "../../drill/rng";
import { STANDARD } from "../../theory";
import { tensions } from ".";

const ctx = { common: { tuning: STANDARD, lefty: false }, settings: {} };
const ask = (id: string, seed = 1) => tensions.question(id, ctx, seeded(seed));

describe("テンションの構成音", () => {
  it("問題が壊れていない", () => {
    expect(checkTopic(tensions, ctx)).toEqual([]);
  });

  it("使えるテンション", () => {
    expect(ask("avail:M7").answer).toMatchObject({ correct: "9 ♯11 13" });
    expect(ask("avail:7").answer).toMatchObject({ correct: "9 ♯11 13 ♭9 ♯9 ♭13" });
  });

  it("テンションの音名は、ルートからの度数の文字で綴る", () => {
    for (let n = 0; n < 50; n++) {
      const q = ask("note:#9", n);
      const root = q.prompt.text.match(/^(\S+?)7 /)![1]!;
      const want = {
        C: "D♯",
        D: "E♯",
        E: "F𝄪",
        F: "G♯",
        G: "A♯",
        A: "B♯",
        B: "C𝄪",
        "B♭": "C♯",
        "E♭": "F♯",
        "A♭": "B",
        "D♭": "E",
      }[root];
      expect(q.answer).toMatchObject({ correct: want });
      expect(want).not.toMatch(/𝄪|𝄫/);
    }
    expect(ask("name:b9").answer).toMatchObject({ correct: "♭9" });
  });

  it("解説は 1 オクターブ下の度数で数え、音はテンションなし→ありの順", () => {
    const q = ask("note:#11");
    expect(q.explanation!.text).toMatch(/♯11 は ♯4 度の 1 オクターブ上/);
    expect(q.sound!.chords).toHaveLength(2);
    expect(q.sound!.chords![1]!.length).toBe(q.sound!.chords![0]!.length + 1);
    const a = ask("avail:M7");
    expect(a.explanation!.strip!.filter(s => s.current).map(s => s.label)).toEqual(["9", "♯11", "13"]);
  });
});
