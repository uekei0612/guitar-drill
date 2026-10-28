import { describe, expect, it } from "vitest";
import { DEFAULT_CHART } from "../state";
import { buildPdfPages, keysPerPage, keysPerPageChoices, pageCount, pdfBoxes, pdfFileName } from "./build";
import { renderPdf } from "./render-pdf";
import type { Page } from "./page";
import { pdfText } from "./page";
import { renumberBoxes, rootStringLabel } from "./sections";

const texts = (p: Page) => p.shapes.flatMap(s => (s.t === "text" ? [s.text] : []));
const amPent = { ...DEFAULT_CHART, scale: "minor_pentatonic", root: 9 };

describe("PDF の組み立て", () => {
  it("セクションとページ数（ボックス図 → 度数付き全指板 → 全 12 キー）", () => {
    const pages = buildPdfPages(amPent);
    expect(pages).toHaveLength(1 + 1 + 4);
    expect(pageCount(amPent)).toBe(6);
    expect(texts(pages[0]!)).toContain("Minor Pentatonic — Box Positions");
    expect(texts(pages[1]!)).toContain("Minor Pentatonic — Full Fretboard with Degrees");
    expect(texts(pages[2]!)).toContain("Minor Pentatonic — Full Fretboard (All Keys)");
    expect(texts(pages[5]!)).toContain("Page 6 / 6");
    expect(texts(pages[2]!)).toEqual(expect.arrayContaining(["C Min Pent.", "C# Min Pent.", "D Min Pent."]));
  });

  it("アルペジオにはボックス図を出さない。キー数でページ数が変わる", () => {
    const arp = { ...DEFAULT_CHART, chartType: "arpeggio" as const, arpeggio: "dominant_7", keysPerPage: 4 };
    expect(pageCount(arp)).toBe(1 + 3);
    expect(texts(buildPdfPages(arp)[0]!)).toContain("Dominant 7th Arpeggio — Full Fretboard with Degrees");
  });

  it("1 ページのキー数は、点が重ならない数まで（弦が多いと減る）", () => {
    expect(keysPerPageChoices(DEFAULT_CHART)).toEqual([1, 2, 3, 4]);
    const seven = { ...DEFAULT_CHART, tuning: "custom", customTuning: [11, 4, 9, 2, 7, 11, 4], keysPerPage: 4 };
    expect(keysPerPageChoices(seven)).toEqual([1, 2, 3]);
    expect(keysPerPage(seven)).toBe(3);
    expect(pageCount({ ...seven, includeBoxes: false, includeDegrees: false })).toBe(4);
    // 各段の弦の間隔は、いちばん小さい点 2 つぶんより広い
    for (const s of [DEFAULT_CHART, seven]) {
      const page = buildPdfPages({ ...s, includeBoxes: false, includeDegrees: false })[0]!;
      const ys = [...new Set(page.shapes.flatMap(x => (x.t === "circle" && x.r > 6 ? [Math.round(x.cy * 10)] : [])))];
      ys.sort((a, b) => a - b);
      const gaps = ys.slice(1).map((y, i) => (y - ys[i]!) / 10);
      expect(Math.min(...gaps)).toBeGreaterThan(2 * 2.4 * (72 / 25.4));
    }
  });

  it("ボックス図の番号と、根音の弦の説明（guitar_chart と同じ）", () => {
    // メジャースケールの手で決めた範囲 (7,11)(9,13)(12,16)(14,18)(5,9)。1〜18 フレットでは (14,18) が
    // 1 オクターブ下の 2〜6 にも見えるので Box 1 になる（guitar_chart の _renumber_boxes と同じ）
    const m = renumberBoxes([
      [7, 11],
      [9, 13],
      [12, 16],
      [14, 18],
      [5, 9],
    ]);
    expect([0, 1, 2, 3, 4].map(i => m.get(i))).toEqual([3, 4, 5, 1, 2]);
    expect(rootStringLabel([0, 2, 5], 6)).toBe("Roots on 6th, 4th & 1st strings");
    expect(rootStringLabel([1], 6)).toBe("Root on the 5th string");
    const boxPage = texts(buildPdfPages(amPent)[0]!);
    expect(boxPage).toEqual(expect.arrayContaining(["Box 1", "Box 5", "Roots on 6th, 4th & 1st strings"]));
  });

  it("標準チューニングの度数付き全指板の帯は、キーに合わせて動く（guitar_chart からの修正）", () => {
    expect(pdfBoxes(amPent).degreeRanges.map(r => [...r])).toEqual([
      [5, 8],
      [7, 10],
      [9, 12],
      [12, 15],
      [14, 17],
    ]);
    const c = pdfBoxes({ ...amPent, root: 0 });
    expect(c.degreeRanges[0]).toEqual([8, 11]);
    // ボックス図は canonical root（キーに依らない形）のまま
    expect(c.boxRoot).toBe(9);
    // 標準以外は例のキーで計算し直す
    const d = pdfBoxes({ ...amPent, tuning: "drop_d", root: 2 });
    expect(d.boxRoot).toBe(2);
    expect(d.boxRanges[0]).toEqual([12, 15]);
  });

  it("PDF の標準フォントに無い文字は置き換える", () => {
    expect(pdfText("Minor 7♭5 — F♯")).toBe("Minor 7b5 — F#");
    expect(pdfFileName(amPent)).toBe("Minor_Pentatonic_A.pdf");
  });
});

describe("PDF に描く", () => {
  it("ページ数ぶんの PDF ができる", async () => {
    const blob = await renderPdf(buildPdfPages({ ...amPent, includeAllKeys: false, capo: 2 }));
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe("%PDF-");
    expect(blob.size).toBeGreaterThan(5000);
  });
});
