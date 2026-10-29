/* ボックスの位置（guitar_chart の theory.compute_box_fret_ranges を移したもの）。
   ボックス 1 は最低弦のルートを左端にし、以降はスケールの音の間隔ぶんずつ右へ動かす。
   guitar_chart の全組み合わせと一致することは boxes.test.ts で確かめている。 */
import { type Tuning, mod, pc, tuningById } from "../theory";
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

/** 高すぎるボックスは 1 オクターブ下の同じ形にする（15 フレットより上は弾きにくく、チャートの指板にも出ない）。
    ドリルの出題とチャートの表示で同じ規則を使い、ボックスの位置を揃える */
export const playableSpan = ([lo, hi]: FretSpan): FretSpan => (hi > 15 && lo >= 12 ? [lo - 12, hi - 12] : [lo, hi]);

const STANDARD = tuningById("standard")!.open.map(pc);

/** ボックスを Box 1 から並べ直す。Box 1 は最低弦のルートがいちばん左に来る形（画面のボックス 1 と同じ決め方）。
    手で決めた範囲はほとんどこの順だが、ロクリアンだけ並びがずれている */
export function fromBox1(ranges: readonly FretSpan[], root: number, lowOpen: number): FretSpan[] {
  const rootFret = mod(root - lowOpen, 12);
  let start = 0;
  let best = Infinity;
  ranges.forEach(([lo, hi], i) => {
    const off = mod(rootFret - lo, 12);
    if (off <= hi - lo && off < best) [start, best] = [i, off];
  });
  return [...ranges.slice(start), ...ranges.slice(0, start)];
}

/** ボックスの幅（フレット。手で決めた範囲と同じ。ペンタは 3＝4 フレットぶん、7 音のスケールは 4＝5 フレットぶん） */
export const boxWidthOf = (chart: ChartDef): number => Math.max(...chart.boxRanges.map(([lo, hi]) => hi - lo));

/** 2 音に足りない弦があれば、範囲を右に広げる（2 フレットまで）。ペンタの形は 2 弦で 1 フレットずれるので、
    4 フレットの長方形で切ると 2 弦の音が 1 つ欠ける（A マイナーペンタのボックス 3 は 9〜13 フレット） */
function widen(span: FretSpan, intervals: readonly number[], rootPc: number, openPcs: readonly number[]): FretSpan {
  const notesOn = (open: number, lo: number, hi: number) => {
    let k = 0;
    for (let f = lo; f <= hi; f++) if (intervals.includes(mod(open + f - rootPc, 12))) k++;
    return k;
  };
  let [lo, hi] = span;
  for (let i = 0; i < 2 && openPcs.some(o => notesOn(o, lo, hi) < 2); i++) hi++;
  return [lo, hi];
}

/** 範囲を 0〜15 フレットに収まるオクターブへ動かす */
function fold([lo, hi]: FretSpan): FretSpan {
  while (lo >= 12 && hi > 15) [lo, hi] = [lo - 12, hi - 12];
  return [lo, hi];
}

/** チャートのボックス（指板のボックス表示・ドリル用）。ボックスの無いチャートは空 */
export function boxesFor(chart: ChartDef, rootPc: number, tuning: Tuning): FretSpan[] {
  return boxesForOpen(chart, rootPc, tuning.open.map(pc));
}

/** 開放弦のピッチクラスの並び（低い弦から）から。
    - レギュラー：手で決めた範囲（PDF と同じ。スケールの形に合わせた幅と位置）をキーに合わせて動かす
    - それ以外：計算する。幅は手で決めた範囲と同じにする（ペンタの幅で 7 音のスケールを切ると、端の音が欠ける）
    どちらも、2 音に足りない弦があれば右に広げる（widen） */
export function boxesForOpen(chart: ChartDef, rootPc: number, openPcs: readonly number[]): FretSpan[] {
  if (!chart.boxRanges.length || !openPcs.length) return [];
  const standard = openPcs.length === STANDARD.length && openPcs.every((p, i) => p === STANDARD[i]);
  if (standard) {
    const d = mod(rootPc - chart.canonicalRoot, 12);
    return fromBox1(chart.boxRanges, chart.canonicalRoot, STANDARD[0]!).map(([lo, hi]) =>
      fold(widen([lo + d, hi + d], chart.intervals, rootPc, openPcs)),
    );
  }
  return computeBoxRanges(chart.intervals, rootPc, openPcs[0]!, {
    numBoxes: chart.boxRanges.length,
    boxWidth: boxWidthOf(chart),
  }).map(span => widen(span, chart.intervals, rootPc, openPcs));
}
