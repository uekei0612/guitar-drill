/* 「guitar_chart で開く」の URL。guitar_chart は URL のパラメーターから画面の状態を復元する
   （web/static/app.js の restoreFromUrl）ので、出題中のスケール・キー・ボックスをそのまま渡す。 */
/** guitar_chart のルートの名前（♯表記の 12 音） */
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 問題が guitar_chart のどの図に対応するか */
export interface GuitarChartRef {
  /** guitar_chart のスケールの ID（SCALE_REGISTRY のキー） */
  readonly scale: string;
  /** ルートのピッチクラス */
  readonly rootPc: number;
  /** ボックスの番号（1 から）。無ければ全体 */
  readonly box?: number;
  /** ♭で表記する（guitar_chart の flat=1） */
  readonly flat?: boolean;
}

export function guitarChartUrl(base: string, ref: GuitarChartRef, opts: { tuning: string; lefty: boolean }): string {
  const u = new URL(base);
  const p = u.searchParams;
  p.set("chart_type", "scale");
  p.set("scale", ref.scale);
  p.set("root", NOTES[ref.rootPc]!);
  p.set("tuning", opts.tuning);
  if (ref.flat) p.set("flat", "1");
  if (opts.lefty) p.set("lefty", "1");
  if (ref.box) {
    p.set("caged", "1");
    p.set("box", String(ref.box));
  }
  return u.href;
}
