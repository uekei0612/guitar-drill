/* 取り込んだ guitar_chart の定義が、このアプリの理論コアと一致しているか。
   ずれていたら（guitar_chart 側でスケールが変わった・足された）CI で落とす。 */
import { describe, expect, it } from "vitest";
import { SCALES, type ScaleId, TUNINGS, degree, degreeId, note, pc, semitones } from "../theory";
import { GUITAR_CHART, boxesOf, parseGuitarChart } from "./guitar-chart";

describe("guitar_chart の定義の取り込み", () => {
  it("出所のコミットを持つ", () => {
    expect(GUITAR_CHART.source.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("スケールの音程と度数ラベルが理論コアと一致する", () => {
    for (const [id, s] of Object.entries(GUITAR_CHART.scales)) {
      const ours = SCALES[id as ScaleId];
      expect(ours, `${id} が理論コアに無い`).toBeDefined();
      const ivs = ours.degrees.map(degree);
      expect(s.intervals, id).toEqual(ivs.map(semitones));
      expect(
        s.intervals.map(i => s.degree_labels[String(i)]),
        id,
      ).toEqual(ivs.map(degreeId));
    }
  });

  it("このアプリのチューニングはすべて取り込まれ、開放弦が一致する", () => {
    for (const t of TUNINGS) {
      const theirs = GUITAR_CHART.tunings[t.id];
      expect(theirs, `${t.id} が取り込まれていない（scripts/sync-guitar-chart.mjs の TUNINGS）`).toBeDefined();
      expect(
        theirs!.map(n => GUITAR_CHART.notes.indexOf(n)),
        t.id,
      ).toEqual(t.open.map(pc));
    }
  });

  it("ボックスは、ボックスのあるスケール × チューニング × 12 ルートぶんある", () => {
    for (const [id, s] of Object.entries(GUITAR_CHART.scales)) {
      if (!s.has_boxes) continue;
      for (const t of TUNINGS)
        for (let p = 0; p < 12; p++) expect(boxesOf(id, t.id, p)?.length, `${id} ${t.id} ${p}`).toBeGreaterThan(0);
    }
    // A マイナーペンタのボックス 1 は 5〜8 フレット（guitar_chart の印刷物と同じ）
    expect(boxesOf("minor_pentatonic", "standard", 9)![0]).toEqual([5, 8]);
    // ボックスのキー（♯表記の 12 音）は、ピッチクラスの順に並んでいる
    GUITAR_CHART.notes.forEach((n, i) => expect(pc(note(n))).toBe(i));
  });

  it("壊れた JSON は読み込みで投げる", () => {
    expect(() => parseGuitarChart({})).toThrow(/format/);
    const broken = structuredClone(GUITAR_CHART) as unknown as {
      boxes: Record<string, Record<string, Record<string, unknown>>>;
    };
    broken.boxes.minor_pentatonic!.standard!.A = [[8, 5]];
    expect(() => parseGuitarChart(broken)).toThrow(/minor_pentatonic\.standard\.A/);
  });
});
