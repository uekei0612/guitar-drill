/* ボックスの位置（guitar_chart の theory.compute_box_fret_ranges を移したもの）。
   ボックス 1 は最低弦のルートを左端にし、以降はスケールの音の間隔ぶんずつ右へ動かす。
   guitar_chart の全組み合わせと一致することは boxes.test.ts で確かめている。 */
import { type Tuning, mod, pc } from "../theory";
import type { ChartDef } from "./registry";

export type FretSpan = readonly [number, number];

export interface BoxOptions {
  readonly numBoxes?: number;
  /** ボックスの幅（フレット。3 なら 4 フレットぶん） */
  readonly boxWidth?: number;
  /** ボックス 1 のルートを置きたいフレット */
  readonly preferredLowRootFret?: number;
}

/** 開放弦（低い弦から、ピッチクラス）とルートからボックスの範囲を計算する */
export function computeBoxRanges(
  intervals: readonly number[],
  rootPc: number,
  lowestOpenPc: number,
  { numBoxes = 5, boxWidth = 3, preferredLowRootFret = 5 }: BoxOptions = {},
): FretSpan[] {
  const target = mod(rootPc - lowestOpenPc, 12);
  let candidates = [-1, 0, 1, 2].map(k => target + 12 * k).filter(f => f >= 1 && f <= 17);
  if (!candidates.length) candidates = [target];
  // いちばん近いもの（同じ距離なら先に見つかったもの。Python の min と同じ）
  let rootFret = candidates[0]!;
  for (const f of candidates)
    if (Math.abs(f - preferredLowRootFret) < Math.abs(rootFret - preferredLowRootFret)) rootFret = f;

  const n = intervals.length;
  const gaps = intervals.map((iv, i) => mod(intervals[(i + 1) % n]! - iv, 12) || 12);
  const boxes: FretSpan[] = [[rootFret, rootFret + boxWidth]];
  let lo = rootFret;
  for (let i = 1; i < numBoxes; i++) {
    lo += gaps[(i - 1) % n]!;
    boxes.push([lo, lo + boxWidth]);
  }
  return boxes;
}

/** チャートのボックス（指板のボックス表示・ドリル用）。ボックスの無いチャートは空 */
export function boxesFor(chart: ChartDef, rootPc: number, tuning: Tuning): FretSpan[] {
  if (!chart.boxRanges.length) return [];
  return computeBoxRanges(chart.intervals, rootPc, pc(tuning.open[0]!), { numBoxes: chart.boxRanges.length });
}

/** 開放弦のピッチクラスの並び（低い弦から）で計算する版（自分で決めたチューニング用） */
export function boxesForOpen(chart: ChartDef, rootPc: number, openPcs: readonly number[]): FretSpan[] {
  if (!chart.boxRanges.length || !openPcs.length) return [];
  return computeBoxRanges(chart.intervals, rootPc, openPcs[0]!, { numBoxes: chart.boxRanges.length });
}
