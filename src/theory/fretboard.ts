/* 指板。弦は 1 弦（高い E）から数え、チューニングは guitar_chart と同じく低い弦から並べる。
   指板上の音はピッチクラスで扱い、綴りは出題する側がキーやスケールに合わせて決める。 */
import { type Note, mod, note, pc } from "./note";

export interface Tuning {
  /** guitar_chart の TUNING_REGISTRY と同じ ID */
  readonly id: string;
  readonly name: string;
  /** 選ぶ画面での分類 */
  readonly group: TuningGroup;
  /** 開放弦の音。低い弦（6 弦）から */
  readonly open: readonly Note[];
}

export type TuningGroup = "スタンダード系" | "ドロップ系" | "オープン・変則" | "多弦ギター" | "ベース";

export interface Position {
  /** 1 = 1 弦（いちばん高い弦） */
  readonly string: number;
  readonly fret: number;
}

const tuning = (id: string, name: string, group: TuningGroup, notes: string): Tuning => ({
  id,
  name,
  group,
  open: notes.split(" ").map(note),
});

/** チューニング（guitar_chart の 23 種から別名を除いたもの。並びは選ぶ画面の順） */
export const TUNINGS: readonly Tuning[] = [
  tuning("standard", "レギュラー", "スタンダード系", "E A D G B E"),
  tuning("half_step_down", "半音下げ", "スタンダード系", "Eb Ab Db Gb Bb Eb"),
  tuning("whole_step_down", "全音下げ", "スタンダード系", "D G C F A D"),
  tuning("drop_d", "ドロップ D", "ドロップ系", "D A D G B E"),
  tuning("drop_c", "ドロップ C", "ドロップ系", "C G C F A D"),
  tuning("drop_b", "ドロップ B", "ドロップ系", "B F# B E G# C#"),
  tuning("open_g", "オープン G", "オープン・変則", "D G D G B D"),
  tuning("open_d", "オープン D", "オープン・変則", "D A D F# A D"),
  tuning("open_e", "オープン E", "オープン・変則", "E B E G# B E"),
  tuning("dadgad", "DADGAD", "オープン・変則", "D A D G A D"),
  tuning("open_cmaj7", "オープン CM7", "オープン・変則", "C G C G B E"),
  tuning("math_facgce", "オープン FM9（マスロック）", "オープン・変則", "F A C G C E"),
  tuning("math_eacgsbd", "E A C♯ G♯ B D", "オープン・変則", "E A C# G# B D"),
  tuning("math_facgbd", "F A C G B D", "オープン・変則", "F A C G B D"),
  tuning("math_cgdgad", "C G D G A D", "オープン・変則", "C G D G A D"),
  tuning("7_string", "7 弦", "多弦ギター", "B E A D G B E"),
  tuning("7_string_drop_a", "7 弦ドロップ A", "多弦ギター", "A E A D G B E"),
  tuning("8_string", "8 弦", "多弦ギター", "F# B E A D G B E"),
  tuning("bass_4", "ベース 4 弦", "ベース", "E A D G"),
  tuning("bass_5", "ベース 5 弦", "ベース", "B E A D G"),
  tuning("bass_6", "ベース 6 弦", "ベース", "B E A D G C"),
];

/** guitar_chart の別名（URL で受け取ることがある） */
export const TUNING_ALIASES: Readonly<Record<string, string>> = { eb: "half_step_down", d_standard: "whole_step_down" };

/** ID（別名も可）からチューニング */
export const tuningById = (id: string): Tuning | undefined => TUNINGS.find(t => t.id === (TUNING_ALIASES[id] ?? id));

export const STANDARD = TUNINGS[0]!;

export const stringCount = (t: Tuning): number => t.open.length;

/** その弦の開放弦の音 */
export function openNote(t: Tuning, string: number): Note {
  const n = t.open[t.open.length - string];
  if (!n || string < 1) throw new Error(`${string} 弦はない`);
  return n;
}

/** (弦, フレット) のピッチクラス */
export const pcAt = (t: Tuning, pos: Position): number => mod(pc(openNote(t, pos.string)) + pos.fret, 12);

export interface FretRange {
  readonly minFret: number;
  readonly maxFret: number;
}

/** ピッチクラスの指板上の位置。1 弦から、低いフレットから */
export function positionsOf(t: Tuning, p: number, range: FretRange = { minFret: 0, maxFret: 12 }): Position[] {
  const out: Position[] = [];
  for (let string = 1; string <= stringCount(t); string++) {
    const first = mod(p - pc(openNote(t, string)), 12);
    for (let fret = first; fret <= range.maxFret; fret += 12) if (fret >= range.minFret) out.push({ string, fret });
  }
  return out;
}
