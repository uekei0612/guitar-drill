/* ドリルからチャートを開くリンク。出題中のスケール・キー・ボックスを、チャートの URL にする。 */
import { href } from "../ui/route";
import { DEFAULT_CHART, toParams } from "./state";

/** 問題がチャートのどの図に対応するか */
export interface ChartRef {
  /** チャートのスケールの ID */
  readonly scale: string;
  /** ルートのピッチクラス */
  readonly rootPc: number;
  /** ボックスの番号（1 から）。無ければ全体 */
  readonly box?: number;
  /** ♭で表記する */
  readonly flat?: boolean;
}

export function chartHref(ref: ChartRef, opts: { tuning: string; lefty: boolean }): string {
  const s = {
    ...DEFAULT_CHART,
    chartType: "scale" as const,
    scale: ref.scale,
    root: ref.rootPc,
    tuning: opts.tuning,
    lefty: opts.lefty,
    flat: !!ref.flat,
    caged: true,
    box: ref.box ?? null,
  };
  return href({ name: "chart", query: toParams(s).toString() });
}
