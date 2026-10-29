import { describe, expect, it } from "vitest";
import { DEFAULT_CHART } from "../../chart/state";
import { chartDots } from "./Chart";

/** その弦の「フレット＋ラベル」の並び */
const row = (s: typeof DEFAULT_CHART, string: number) =>
  chartDots(s)
    .marks.filter(m => m.pos.string === string)
    .map(m => `${m.pos.fret}${m.label}`)
    .join(" ");

const amPent = { ...DEFAULT_CHART, scale: "minor_pentatonic", root: 9 };

describe("チャートの点", () => {
  it("度数で出す（6 弦の A マイナーペンタ）", () => {
    expect(row(amPent, 6)).toBe("05 3♭7 5R 8♭3 104 125 15♭7");
  });

  it("音名で出す（♭表記の切り替え）", () => {
    const s = { ...amPent, scale: "major", root: 3, label: "note" as const };
    expect(row(s, 6).split(" ").slice(0, 3)).toEqual(["1F", "3G", "4G♯"]);
    expect(
      row({ ...s, flat: true }, 6)
        .split(" ")
        .slice(0, 3),
    ).toEqual(["1F", "3G", "4A♭"]);
  });

  it("カポより手前は出さない", () => {
    expect(row({ ...amPent, capo: 4 }, 6)).toBe("5R 8♭3 104 125 15♭7");
  });

  it("CAGED：ボックスを返し（15 フレットより上はドリルと同じく 1 オクターブ下）、1 つだけ選ぶとその範囲だけ", () => {
    const s = { ...amPent, caged: true };
    expect(chartDots(s).boxes.map(b => [...b])).toEqual([
      [5, 8],
      [7, 10],
      [9, 13],
      [12, 15],
      [2, 5],
    ]);
    expect(row({ ...s, box: 1 }, 6)).toBe("5R 8♭3");
    // 横スクロールで指板全体を見るときは、ほかの点を消さずに薄くする
    const all = chartDots({ ...s, box: 1, scroll: true }).marks.filter(m => m.pos.string === 6);
    expect(all.filter(m => !m.dim).map(m => m.pos.fret)).toEqual([5, 8]);
    expect(all.filter(m => m.dim)).toHaveLength(5);
    // アルペジオとカスタムにはボックスが無い
    expect(chartDots({ ...s, chartType: "arpeggio" }).boxes).toEqual([]);
  });
});
