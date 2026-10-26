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
});
