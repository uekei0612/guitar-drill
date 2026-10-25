/* 指板。弦は 1 弦（高い E）から数え、チューニングは guitar_chart と同じく低い弦から並べる。
   指板上の音はピッチクラスで扱い、綴りは出題する側がキーやスケールに合わせて決める。 */
import { type Note, mod, note, pc } from "./note";

export interface Tuning {
  /** guitar_chart の TUNING_REGISTRY と同じ ID */
  readonly id: string;
  readonly name: string;
  /** 開放弦の音。低い弦（6 弦）から */
  readonly open: readonly Note[];
}

export interface Position {
  /** 1 = 1 弦（いちばん高い弦） */
  readonly string: number;
  readonly fret: number;
}

const tuning = (id: string, name: string, notes: string): Tuning => ({ id, name, open: notes.split(" ").map(note) });

export const TUNINGS: readonly Tuning[] = [
  tuning("standard", "レギュラー", "E A D G B E"),
  tuning("half_step_down", "半音下げ", "Eb Ab Db Gb Bb Eb"),
  tuning("drop_d", "ドロップ D", "D A D G B E"),
];

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
