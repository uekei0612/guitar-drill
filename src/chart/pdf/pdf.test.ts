import { describe, expect, it } from "vitest";
import { DEFAULT_CHART } from "../state";
import { CHART_SCALES } from "../registry";
import { buildPdfPages, fromBox1, keysPerPage, keysPerPageChoices, pageCount, pdfBoxes, pdfFileName } from "./build";
import { renderPdf } from "./render-pdf";
import type { Page } from "./page";
import { pdfText } from "./page";
import { rootStringLabel } from "./sections";

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

  it("ボックスの番号は形の並びのまま。キーを変えても両ページで同じ（Box 1 は最低弦にルート）", () => {
    expect(rootStringLabel([0, 2, 5], 6)).toBe("Roots on 6th, 4th & 1st strings");
    expect(rootStringLabel([1], 6)).toBe("Root on the 5th string");
    const cPent = { ...amPent, root: 0, includeAllKeys: false };
    const [boxPage, degreePage] = buildPdfPages(cPent);
    const box = texts(boxPage!);
    expect(box.filter(t => /^Box \d$/.test(t))).toEqual(["Box 1", "Box 2", "Box 3", "Box 4", "Box 5"]);
    expect(box[box.indexOf("Box 1") + 1]).toBe("Roots on 6th, 4th & 1st strings");
    // 度数付き全指板の名札を左から：C の Box 1 は 6 弦 8 フレットのルートから（3〜6 は Box 4、5〜8 は Box 5 の 1 オクターブ下）
    const labels = degreePage!.shapes
      .flatMap(x => (x.t === "text" && /^Box \d$/.test(x.text) ? [x] : []))
      .sort((a, b) => a.x - b.x)
      .map(x => x.text);
    expect(labels).toEqual(["Box 4", "Box 5", "Box 1", "Box 2", "Box 3", "Box 4"]);
  });

  it("どのスケールも Box 1 は最低弦にルートがある形（ロクリアンは手で決めた範囲の並びがずれているので並べ直す）", () => {
    for (const c of CHART_SCALES) {
      const box = texts(
        buildPdfPages({ ...DEFAULT_CHART, scale: c.id, includeDegrees: false, includeAllKeys: false })[0]!,
      );
      expect(box[box.indexOf("Box 1") + 1], c.id).toMatch(/^Roots? on (the )?6th/);
    }
    expect(
      fromBox1(
        [
          [2, 6],
          [4, 8],
          [7, 11],
          [9, 13],
          [12, 16],
        ],
        11,
        4,
      )[0],
    ).toEqual([7, 11]);
  });

  it("ボックス図はどのスケールも形が切れない（どの弦にも 2 音以上。ペンタのボックス 3 は 2 弦で 1 フレット広い）", () => {
    for (const c of CHART_SCALES) {
      const { boxRoot, boxRanges } = pdfBoxes({ ...DEFAULT_CHART, scale: c.id });
      for (const [lo, hi] of boxRanges)
        for (const open of [4, 9, 2, 7, 11, 4]) {
          let k = 0;
          for (let f = lo; f <= hi; f++) if (c.intervals.includes((((open + f - boxRoot) % 12) + 12) % 12)) k++;
          expect(k, `${c.id} [${lo},${hi}]`).toBeGreaterThanOrEqual(2);
        }
    }
  });

  it("標準チューニングの度数付き全指板の帯は、キーに合わせて動く（guitar_chart からの修正）", () => {
    expect(pdfBoxes(amPent).degreeRanges.map(r => [...r])).toEqual([
      [5, 8],
      [7, 10],
      [9, 13],
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

  it("音名は画面の「♭で書く」に合わせる（ファイル名も）", () => {
    const bb = { ...DEFAULT_CHART, scale: "major", root: 10, includeBoxes: false };
    expect(pdfFileName(bb)).toBe("Major_Scale_Ionian_A#.pdf");
    expect(pdfFileName({ ...bb, flat: true })).toBe("Major_Scale_Ionian_Bb.pdf");
    const flat = buildPdfPages({ ...bb, flat: true }).flatMap(texts);
    expect(flat).toEqual(expect.arrayContaining(["Bb Major", "Eb Major", "Db Major"]));
    expect(flat.some(t => t.startsWith("Example shown in the key of Bb."))).toBe(true);
    expect(buildPdfPages(bb).flatMap(texts)).toContain("A# Major");
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
