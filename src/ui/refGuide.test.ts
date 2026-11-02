import { describe, expect, it } from "vitest";
import { topicById } from "../topics";
import { BOX_SCALES } from "../topics/scale-boxes";
import { chartRefs, keyRefs } from "./refGuide";
import { DEFAULT_KEY_VIEW } from "../keyview/state";

const ids = (groups: ReturnType<typeof chartRefs>) => groups.map(g => [g.label, g.items.map(i => i.id)]);
const all = (groups: ReturnType<typeof chartRefs>) => groups.flatMap(g => g.items.map(i => i.id));

describe("チャートとキーから開く参考の一覧", () => {
  it("チャート：スケールの種類で、関係するものが先頭に来る", () => {
    const mixo = chartRefs({ chartType: "scale", scale: "mixolydian", arpeggio: "" }, BOX_SCALES);
    expect(mixo[0]!.label).toBe("今の表示に関係するもの");
    expect(mixo[0]!.items.map(i => i.id)).toEqual(
      [BOX_SCALES.includes("mixolydian") && "scale-boxes", "modes", "dominant-scales"].filter(Boolean),
    );
    expect(chartRefs({ chartType: "arpeggio", scale: "", arpeggio: "minor_triad" }, BOX_SCALES)[0]!.items[0]!.id).toBe(
      "triads",
    );
    expect(ids(chartRefs({ chartType: "arpeggio", scale: "", arpeggio: "dominant_7" }, BOX_SCALES))[0]).toEqual([
      "今の表示に関係するもの",
      ["sevenths", "tensions", "dominant-scales"],
    ]);
    expect(chartRefs({ chartType: "custom", scale: "", arpeggio: "" }, BOX_SCALES)[0]!.items[0]!.id).toBe("intervals");
  });

  it("キー：進行を出したり借りたりすると、進行やセカンダリードミナントが先頭に入る", () => {
    expect(ids(keyRefs(DEFAULT_KEY_VIEW))[0]).toEqual(["今の表示に関係するもの", ["diatonic", "circle-of-fifths"]]);
    const busy = keyRefs({ size: 3, chord: 4, prog: "251", borrow: true });
    expect(busy[0]!.items.map(i => i.id)).toEqual([
      "diatonic",
      "circle-of-fifths",
      "triads",
      "progressions",
      "secondary-dominants",
    ]);
  });

  it("同じ参考を 2 度出さず、どれも参考ページと説明がある", () => {
    for (const groups of [
      chartRefs({ chartType: "scale", scale: "major", arpeggio: "" }, BOX_SCALES),
      chartRefs({ chartType: "arpeggio", scale: "", arpeggio: "major_7" }, BOX_SCALES),
      keyRefs({ size: 4, chord: 0, prog: "x", borrow: true }),
    ]) {
      const list = all(groups);
      expect(new Set(list).size).toBe(list.length);
      for (const g of groups) expect(g.items.length).toBeGreaterThan(0);
      for (const i of groups.flatMap(g => g.items)) {
        expect(topicById(i.id)?.reference, i.id).toBeDefined();
        expect(i.note).toBeTruthy();
      }
    }
  });
});
