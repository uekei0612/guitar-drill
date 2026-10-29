/* チャートの状態から PDF のページを組み立てる（guitar_chart の web/params.py build_specs と builder.py）。
   順番はボックス図 → 度数付き全指板 → 全 12 キー。 */
import { mod, pc, tuningById } from "../../theory";
import { boxWidthOf, computeBoxRanges, fromBox1, widen } from "../boxes";
import { type ChartState, KEYS_PER_PAGE, chartOf, tuningPcs } from "../state";
import { Canvas, type Page } from "./page";
import {
  type Ctx,
  type Subject,
  maxKeysPerPage,
  pdfNoteName,
  sectionAllKeys,
  sectionBoxPositions,
  sectionFullWithDegrees,
} from "./sections";

const STANDARD = tuningById("standard")!.open.map(pc);

export interface PdfPlan {
  readonly boxes: boolean;
  readonly degrees: boolean;
  readonly allKeys: boolean;
}

/** 出すセクション（ボックス図はボックスのあるスケールのときだけ） */
export function pdfPlan(s: ChartState): PdfPlan {
  const chart = chartOf(s);
  return {
    boxes: s.includeBoxes && chart.kind === "scale" && chart.boxRanges.length > 0,
    degrees: s.includeDegrees,
    allKeys: s.includeAllKeys,
  };
}

export { fromBox1 };

/** PDF に描くボックス。
    - 標準チューニング：手で決めた範囲（canonical root 用）。ボックス図は canonical root のまま、
      度数付き全指板はキーに合わせて動かす（guitar_chart では帯が canonical root の位置のままだった）
    - それ以外：例のキーで計算し直す（guitar_chart と同じ） */
export function pdfBoxes(s: ChartState) {
  const chart = chartOf(s);
  const tuning = tuningPcs(s);
  if (!chart.boxRanges.length) return { boxRoot: s.root, boxRanges: [], degreeRanges: [] };
  const standard = tuning.length === STANDARD.length && tuning.every((p, i) => p === STANDARD[i]);
  if (standard) {
    const d = mod(s.root - chart.canonicalRoot, 12);
    // 2 音に足りない弦があるボックスは右に広げる（画面と同じ。ペンタは 2 弦で形がずれる）
    const ranges = fromBox1(chart.boxRanges, chart.canonicalRoot, tuning[0]!).map(r =>
      widen(r, chart.intervals, chart.canonicalRoot, tuning),
    );
    return {
      boxRoot: chart.canonicalRoot,
      boxRanges: ranges,
      degreeRanges: ranges.map(([lo, hi]) => [lo + d, hi + d] as const),
    };
  }
  const computed = computeBoxRanges(chart.intervals, s.root, tuning[0]!, {
    numBoxes: chart.boxRanges.length,
    boxWidth: boxWidthOf(chart),
  }).map(r => widen(r, chart.intervals, s.root, tuning));
  return { boxRoot: s.root, boxRanges: computed, degreeRanges: computed };
}

/** 選べる 1 ページのキー数（弦が多いと、多く並べると点が重なるので減らす） */
export const keysPerPageChoices = (s: ChartState): number[] => {
  const max = maxKeysPerPage(tuningPcs(s).length, KEYS_PER_PAGE);
  return KEYS_PER_PAGE.filter(k => k <= max);
};

/** 実際に使う 1 ページのキー数（選んだ数が今の弦の数では入らなければ、入る数まで減らす） */
export const keysPerPage = (s: ChartState): number => Math.min(s.keysPerPage, Math.max(...keysPerPageChoices(s)));

export const pageCount = (s: ChartState): number => {
  const p = pdfPlan(s);
  return (p.boxes ? 1 : 0) + (p.degrees ? 1 : 0) + (p.allKeys ? Math.ceil(12 / keysPerPage(s)) : 0);
};

export function buildPdfPages(s: ChartState): Page[] {
  const plan = pdfPlan(s);
  const subject: Subject = { chart: chartOf(s), tuning: tuningPcs(s), capo: s.capo, flat: s.flat };
  const { boxRoot, boxRanges, degreeRanges } = pdfBoxes(s);
  const c = new Canvas();
  const ctx: Ctx = { pageNum: 1, totalPages: pageCount(s), sectionName: "" };
  if (plan.boxes) {
    ctx.sectionName = "Section: Box positions (abstract)";
    sectionBoxPositions(c, subject, ctx, boxRoot, boxRanges);
  }
  if (plan.degrees) {
    ctx.sectionName = "Section: Full fretboard with degrees";
    // 帯はボックス図を出さないときも描く（guitar_chart と同じ。アルペジオ・カスタムは範囲が空）
    sectionFullWithDegrees(c, subject, ctx, s.root, degreeRanges);
  }
  if (plan.allKeys) {
    ctx.sectionName = "Section: All 12 keys";
    sectionAllKeys(c, subject, ctx, keysPerPage(s));
  }
  return c.pages;
}

/** ダウンロードのファイル名（Minor_Pentatonic_A.pdf。♭表記なら Bb） */
export const pdfFileName = (s: ChartState): string =>
  `${chartOf(s)
    .nameEn.replace(/[^\w#-]+/g, "_")
    .replace(/^_+|_+$/g, "")}_${pdfNoteName(s.root, s.flat)}.pdf`;
