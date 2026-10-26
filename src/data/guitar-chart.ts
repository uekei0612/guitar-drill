/* guitar_chart から取り込んだ定義（src/data/guitar-chart.json。npm run sync:guitar-chart で更新）。
   スケールの音程・度数ラベル・ボックスの位置を、印刷する資料とドリルで一致させるために使う。
   読み込み時に形を検証し、壊れていたら投げる（テストで落ちるので、壊れた JSON は配られない）。 */
import raw from "./guitar-chart.json";

export interface GuitarChartScale {
  readonly name: string;
  readonly intervals: readonly number[];
  /** 半音数（文字列）→ 度数ラベル（R、b3、#4 …） */
  readonly degree_labels: Readonly<Record<string, string>>;
  readonly has_boxes: boolean;
}

/** [低いフレット, 高いフレット] */
export type FretSpan = readonly [number, number];

export interface GuitarChartData {
  readonly format: 1;
  readonly source: {
    readonly repo: string;
    readonly commit: string;
    readonly exported_at: string;
    readonly branch?: string;
  };
  /** ルートの名前（♯表記の 12 音。ボックスのキー） */
  readonly notes: readonly string[];
  readonly scales: Readonly<Record<string, GuitarChartScale>>;
  /** チューニング → 開放弦（低い弦から） */
  readonly tunings: Readonly<Record<string, readonly string[]>>;
  /** スケール → チューニング → ルート → ボックスの範囲 */
  readonly boxes: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, readonly FretSpan[]>>>>>>;
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => Number.isInteger(x);

function fail(path: string, why: string): never {
  throw new Error(`guitar-chart.json の ${path} が不正: ${why}`);
}

/** 形を検証して返す */
export function parseGuitarChart(d: unknown): GuitarChartData {
  if (!isObj(d)) fail("(全体)", "オブジェクトでない");
  if (d.format !== 1) fail("format", `知らない版 ${String(d.format)}`);
  if (!isObj(d.source) || typeof d.source.commit !== "string") fail("source", "commit が無い");
  if (!Array.isArray(d.notes) || d.notes.length !== 12) fail("notes", "12 音でない");
  if (!isObj(d.scales)) fail("scales", "オブジェクトでない");
  for (const [k, s] of Object.entries(d.scales)) {
    if (!isObj(s) || !Array.isArray(s.intervals) || !s.intervals.every(i => isInt(i) && i >= 0 && i < 12))
      fail(`scales.${k}.intervals`, "0〜11 の整数の並びでない");
    if (
      !isObj(s.degree_labels) ||
      !(s.intervals as number[]).every(i => typeof (s.degree_labels as Obj)[String(i)] === "string")
    )
      fail(`scales.${k}.degree_labels`, "音程ごとのラベルが揃っていない");
  }
  if (!isObj(d.tunings)) fail("tunings", "オブジェクトでない");
  if (!isObj(d.boxes)) fail("boxes", "オブジェクトでない");
  for (const [sk, byTuning] of Object.entries(d.boxes)) {
    if (!isObj(byTuning)) fail(`boxes.${sk}`, "オブジェクトでない");
    for (const [tk, byRoot] of Object.entries(byTuning)) {
      if (!isObj(byRoot)) fail(`boxes.${sk}.${tk}`, "オブジェクトでない");
      for (const n of d.notes as string[]) {
        const spans = byRoot[n];
        if (!Array.isArray(spans) || !spans.length) fail(`boxes.${sk}.${tk}.${n}`, "ボックスが無い");
        for (const sp of spans)
          if (!Array.isArray(sp) || sp.length !== 2 || !isInt(sp[0]) || !isInt(sp[1]) || sp[0] < 0 || sp[1] < sp[0])
            fail(`boxes.${sk}.${tk}.${n}`, `範囲が不正 ${JSON.stringify(sp)}`);
      }
    }
  }
  return d as unknown as GuitarChartData;
}

export const GUITAR_CHART: GuitarChartData = parseGuitarChart(raw);

/** そのスケール・チューニング・ルート（ピッチクラス）のボックス。無ければ undefined */
export function boxesOf(scale: string, tuning: string, rootPc: number): readonly FretSpan[] | undefined {
  return GUITAR_CHART.boxes[scale]?.[tuning]?.[GUITAR_CHART.notes[rootPc]!];
}
