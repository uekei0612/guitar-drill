/* チャートの定義とボックスの計算が guitar_chart と同じか。
   fixtures/guitar-chart.json は guitar_chart（40a3260）の書き出しを、全チューニング・全スケール・12 ルートぶん保存したもの。 */
import { describe, expect, it } from "vitest";
import { TUNINGS, TUNING_ALIASES, note, pc, tuningById } from "../theory";
import { boxesFor, boxesForOpen } from "./boxes";
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

describe("ボックスの計算（guitar_chart の /boxes と同じ）", () => {
  it("全スケール × 全チューニング（別名を含む）× 12 ルートで一致する", () => {
    let n = 0;
    for (const c of CHART_SCALES)
      for (const [tid, open] of Object.entries(F.tunings))
        for (let p = 0; p < 12; p++) {
          const want = F.boxes[c.id]![tid]![NOTES[p]!];
          expect(
            boxesFor(c, p, tuningById(tid)!).map(r => [...r]),
            `${c.id} ${tid} ${NOTES[p]}`,
          ).toEqual(want);
          expect(
            boxesForOpen(
              c,
              p,
              open.map(x => NOTES.indexOf(x)),
            ).map(r => [...r]),
          ).toEqual(want);
          n++;
        }
    expect(n).toBe(11 * 23 * 12);
  });

  it("ボックスの無いもの（アルペジオ・カスタム）は空", () => {
    expect(boxesFor(CHART_ARPEGGIOS[0]!, 0, TUNINGS[0]!)).toEqual([]);
    expect(boxesFor(customChart([3, 7]), 0, TUNINGS[0]!)).toEqual([]);
  });
});
