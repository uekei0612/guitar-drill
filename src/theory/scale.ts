/* スケール。ID は guitar_chart の SCALE_REGISTRY と揃える（取り込みと「guitar_chart で開く」で使う）。 */
import { type Interval, degree, spell } from "./interval";
import type { Note } from "./note";

export type ScaleId =
  | "major"
  | "natural_minor"
  | "harmonic_minor"
  | "melodic_minor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian"
  | "major_pentatonic"
  | "minor_pentatonic"
  | "minor_blues";

export interface ScaleDef {
  readonly id: ScaleId;
  readonly name: string;
  /** ルートからの度数（guitar_chart の度数ラベルと同じ書き方） */
  readonly degrees: readonly string[];
}

const defs: ScaleDef[] = [
  { id: "major", name: "メジャー（アイオニアン）", degrees: ["R", "2", "3", "4", "5", "6", "7"] },
  { id: "natural_minor", name: "ナチュラルマイナー（エオリアン）", degrees: ["R", "2", "b3", "4", "5", "b6", "b7"] },
  { id: "harmonic_minor", name: "ハーモニックマイナー", degrees: ["R", "2", "b3", "4", "5", "b6", "7"] },
  { id: "melodic_minor", name: "メロディックマイナー", degrees: ["R", "2", "b3", "4", "5", "6", "7"] },
  { id: "dorian", name: "ドリアン", degrees: ["R", "2", "b3", "4", "5", "6", "b7"] },
  { id: "phrygian", name: "フリジアン", degrees: ["R", "b2", "b3", "4", "5", "b6", "b7"] },
  { id: "lydian", name: "リディアン", degrees: ["R", "2", "3", "#4", "5", "6", "7"] },
  { id: "mixolydian", name: "ミクソリディアン", degrees: ["R", "2", "3", "4", "5", "6", "b7"] },
  { id: "locrian", name: "ロクリアン", degrees: ["R", "b2", "b3", "4", "b5", "b6", "b7"] },
  { id: "major_pentatonic", name: "メジャーペンタトニック", degrees: ["R", "2", "3", "5", "6"] },
  { id: "minor_pentatonic", name: "マイナーペンタトニック", degrees: ["R", "b3", "4", "5", "b7"] },
  { id: "minor_blues", name: "マイナーブルース", degrees: ["R", "b3", "4", "b5", "5", "b7"] },
];

export const SCALES = Object.fromEntries(defs.map(d => [d.id, d])) as Readonly<Record<ScaleId, ScaleDef>>;

export const scaleIntervals = (id: ScaleId): Interval[] => SCALES[id].degrees.map(degree);

export const scaleNotes = (id: ScaleId, root: Note): Note[] => spell(root, scaleIntervals(id));
