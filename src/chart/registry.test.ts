/* チャートの定義とボックスの計算が guitar_chart と同じか。
   fixtures/guitar-chart.json は guitar_chart（40a3260）の書き出しを、全チューニング・全スケール・12 ルートぶん保存したもの。 */
import { describe, expect, it } from "vitest";
import { TUNINGS, TUNING_ALIASES, mod, note, pc, pcAt, tuningById } from "../theory";
import { boxWidthOf, boxesFor, boxesForOpen, computeBoxRanges } from "./boxes";
import fixture from "./fixtures/guitar-chart.json";
import { CHART_ARPEGGIOS, CHART_SCALES, customChart } from "./registry";

type Fixture = {
  tunings: Record<string, string[]>;
  boxes: Record<string, Record<string, Record<string, number[][]>>>;
  canonical: Record<string, { root: string; short_name: string; name: string; box_fret_ranges: number[][] }>;
  arpeggios: Record<
    string,
    { name: string; short_name: string; intervals: number[]; degree_labels: Record<string, string>; root: string }
  >;
};
const F = fixture as unknown as Fixture;
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

describe("チャートの定義（guitar_chart と同じ）", () => {
  it("チューニング：guitar_chart の全キーが（別名も含めて）引け、開放弦が同じ", () => {
    for (const [id, open] of Object.entries(F.tunings)) {
      const t = tuningById(id);
      expect(t, id).toBeDefined();
      expect(t!.open.map(pc), id).toEqual(open.map(n => NOTES.indexOf(n)));
    }
    expect(TUNINGS.length + Object.keys(TUNING_ALIASES).length).toBe(Object.keys(F.tunings).length);
  });

  it("スケール：並び・名前・canonical root・手で決めたボックスが同じ", () => {
    expect(CHART_SCALES.map(c => c.id)).toEqual(Object.keys(F.canonical));
    for (const c of CHART_SCALES) {
      const f = F.canonical[c.id]!;
      expect(c.nameEn).toBe(f.name);
      expect(c.shortName).toBe(f.short_name);
      expect(c.canonicalRoot).toBe(NOTES.indexOf(f.root));
      expect(c.boxRanges.map(r => [...r])).toEqual(f.box_fret_ranges);
    }
  });

  it("アルペジオ：音程・度数ラベル・名前が同じ", () => {
    expect(CHART_ARPEGGIOS.map(c => c.id)).toEqual(Object.keys(F.arpeggios));
    for (const c of CHART_ARPEGGIOS) {
      const f = F.arpeggios[c.id]!;
      expect(c.intervals).toEqual(f.intervals);
      expect(c.intervals.map(i => f.degree_labels[String(i)])).toEqual(c.degrees);
      expect(c.nameEn).toBe(f.name);
      expect(c.shortName).toBe(f.short_name);
      expect(c.canonicalRoot).toBe(pc(note(f.root)));
    }
  });

  it("カスタム：R を必ず含み、♭で書く", () => {
    expect(customChart([4, 7, 7, 13, -1]).degrees).toEqual(["R", "3", "5"]);
    expect(customChart([6, 1]).degrees).toEqual(["R", "b2", "b5"]);
  });
});

describe("ボックスの計算", () => {
  it("computeBoxRanges は guitar_chart の /boxes と、全スケール × 全チューニング（別名を含む）× 12 ルートで一致する", () => {
    let n = 0;
    for (const c of CHART_SCALES)
      for (const [tid, open] of Object.entries(F.tunings))
        for (let p = 0; p < 12; p++) {
          const want = F.boxes[c.id]![tid]![NOTES[p]!];
          expect(
            computeBoxRanges(c.intervals, p, NOTES.indexOf(open[0]!), { numBoxes: c.boxRanges.length }).map(r => [
              ...r,
            ]),
            `${c.id} ${tid} ${NOTES[p]}`,
          ).toEqual(want);
          n++;
        }
    expect(n).toBe(11 * 23 * 12);
  });

  // guitar_chart の計算は幅がペンタと同じ 4 フレットで、ボックス 2 以降の位置も形とずれていたので、
  // 1 つだけ選ぶと端の音が切れていた（A マイナーペンタのボックス 2 が 8〜11 で、7 フレットの音が欠ける）
  it("レギュラーのボックスは、どのスケール・キーでも形が切れない（全部の音があり、どの弦にも 2 音以上）", () => {
    const t = tuningById("standard")!;
    for (const c of CHART_SCALES)
      for (let p = 0; p < 12; p++) {
        const boxes = boxesFor(c, p, t);
        expect(boxes).toHaveLength(c.boxRanges.length);
        boxes.forEach(([lo, hi], i) => {
          const at = `${c.id} ${NOTES[p]} box ${i + 1} [${lo},${hi}]`;
          expect(lo >= 0 && hi <= 17, at).toBe(true);
          const seen = new Set<number>();
          for (let string = 1; string <= 6; string++) {
            let k = 0;
            for (let fret = lo; fret <= hi; fret++) {
              const semi = mod(pcAt(t, { string, fret }) - p, 12);
              if (c.intervals.includes(semi)) {
                k++;
                seen.add(semi);
              }
            }
            expect(k, `${at} ${string}弦`).toBeGreaterThanOrEqual(2);
          }
          expect(seen.size, at).toBe(c.intervals.length);
        });
      }
  });

  it("レギュラーは PDF と同じ手で決めた範囲をキーに合わせて動かし、ほかのチューニングは同じ幅で計算する", () => {
    const am = CHART_SCALES.find(c => c.id === "minor_pentatonic")!;
    expect(boxesFor(am, 9, tuningById("standard")!).map(r => [...r])).toEqual([
      [5, 8],
      [7, 10],
      [9, 13],
      [12, 15],
      [2, 5],
    ]);
    const major = CHART_SCALES.find(c => c.id === "major")!;
    expect(boxWidthOf(major)).toBe(4);
    for (const [lo, hi] of boxesFor(major, 2, tuningById("drop_d")!)) expect(hi - lo).toBeGreaterThanOrEqual(4);
    // 開放弦の並びで渡しても同じ
    expect(boxesForOpen(am, 9, [4, 9, 2, 7, 11, 4])).toEqual(boxesFor(am, 9, tuningById("standard")!));
  });

  it("ボックスの無いもの（アルペジオ・カスタム）は空", () => {
    expect(boxesFor(CHART_ARPEGGIOS[0]!, 0, TUNINGS[0]!)).toEqual([]);
    expect(boxesFor(customChart([3, 7]), 0, TUNINGS[0]!)).toEqual([]);
  });
});
