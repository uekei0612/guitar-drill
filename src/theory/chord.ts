/* コードの型。型は「ルートからの度数の並び」で定義し、判定も度数で照合する。 */
import { type Interval, degree, degreeId, degreeLabel, intervalBetween, spell } from "./interval";
import { type Note, fmt } from "./note";

export interface ChordType {
  /** 記録のキーに使う ASCII の ID（変えない） */
  readonly id: string;
  /** 表記（ルートの後ろに付ける部分） */
  readonly symbol: string;
  readonly degrees: readonly string[];
}

const t = (id: string, symbol: string, degrees: string): ChordType => ({ id, symbol, degrees: degrees.split(" ") });

export const TRIADS: readonly ChordType[] = [
  t("maj", "", "R 3 5"),
  t("m", "m", "R b3 5"),
  t("dim", "dim", "R b3 b5"),
  t("aug", "aug", "R 3 #5"),
  t("sus2", "sus2", "R 2 5"),
  t("sus4", "sus4", "R 4 5"),
];

export const SEVENTHS: readonly ChordType[] = [
  t("M7", "M7", "R 3 5 7"),
  t("7", "7", "R 3 5 b7"),
  t("m7", "m7", "R b3 5 b7"),
  t("m7b5", "m7(♭5)", "R b3 b5 b7"),
  t("dim7", "dim7", "R b3 b5 bb7"),
  t("mM7", "mM7", "R b3 5 7"),
  t("aug7", "aug7", "R 3 #5 b7"),
  t("augM7", "augM7", "R 3 #5 7"),
  t("7sus4", "7sus4", "R 4 5 b7"),
  t("6", "6", "R 3 5 6"),
  t("m6", "m6", "R b3 5 6"),
];

export const TENSIONS: readonly ChordType[] = [
  t("add9", "add9", "R 3 5 9"),
  t("M9", "M9", "R 3 5 7 9"),
  t("9", "9", "R 3 5 b7 9"),
  t("m9", "m9", "R b3 5 b7 9"),
  t("7b9", "7(♭9)", "R 3 5 b7 b9"),
  t("7#9", "7(♯9)", "R 3 5 b7 #9"),
  t("7#11", "7(♯11)", "R 3 5 b7 #11"),
  t("7b13", "7(♭13)", "R 3 5 b7 b13"),
  t("13", "7(13)", "R 3 5 b7 13"),
  t("m11", "m11", "R b3 5 b7 11"),
  t("M7#11", "M7(♯11)", "R 3 5 7 #11"),
];

export const CHORD_TYPES: readonly ChordType[] = [...TRIADS, ...SEVENTHS, ...TENSIONS];

const byId = new Map(CHORD_TYPES.map(c => [c.id, c]));

export function chordType(id: string): ChordType {
  const c = byId.get(id);
  if (!c) throw new Error(`コードの型がない: ${id}`);
  return c;
}

export const chordIntervals = (type: ChordType): Interval[] => type.degrees.map(degree);

export const chordTones = (root: Note, type: ChordType): Note[] => spell(root, chordIntervals(type));

export const chordSymbol = (root: Note, type: ChordType): string => fmt(root) + type.symbol;

/** 構成音の度数の表記（R ♭3 ♭5 ♭♭7） */
export const chordToneLabels = (type: ChordType): string[] => chordIntervals(type).map(degreeLabel);

/** ルートからの度数の並びが一致する型（3 度ずつ積んだ音から型を決めるのに使う） */
export function detectChord(ivs: readonly Interval[]): ChordType | undefined {
  const key = ivs.map(degreeId).join(" ");
  return CHORD_TYPES.find(c => chordIntervals(c).map(degreeId).join(" ") === key);
}

/** 実際の音の並び（先頭がルート）から型を決める */
export const detectChordFromNotes = (notes: readonly Note[]): ChordType | undefined =>
  notes.length ? detectChord(notes.map(n => intervalBetween(notes[0]!, n))) : undefined;
