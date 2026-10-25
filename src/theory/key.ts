/* 調。扱うキーは五度圏の並びが正本で、♯系→♭系の並びは調号の数から導く。 */
import { type ChordType, detectChord } from "./chord";
import { type Interval, degreeLabel, intervalBetween } from "./interval";
import { type Note, fmt, note, noteId } from "./note";
import { scaleIntervals, scaleNotes } from "./scale";

export type KeyMode = "major" | "minor";

export interface Key {
  readonly mode: KeyMode;
  readonly tonic: Note;
}

/** 同じ位置のメジャーとマイナーは平行調（F♯ と E♭m は異名同音で揃える） */
export const FIFTHS: Readonly<Record<KeyMode, readonly string[]>> = {
  major: ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"],
  minor: ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"],
};

const scaleOf = (mode: KeyMode) => (mode === "major" ? "major" : "natural_minor");

/** 調号の数（♯は正、♭は負） */
export const keySignature = (key: Key): number =>
  scaleNotes(scaleOf(key.mode), key.tonic).reduce((a, n) => a + n.acc, 0);

/** ♯系（調号なしを含む）を ♯の少ない順に、続けて♭系を ♭の少ない順に */
export const KEYS: Readonly<Record<KeyMode, readonly Key[]>> = {
  major: orderKeys("major"),
  minor: orderKeys("minor"),
};

function orderKeys(mode: KeyMode): Key[] {
  const ks = FIFTHS[mode].map(r => ({ mode, tonic: note(r) }));
  const sig = new Map(ks.map(k => [k, keySignature(k)]));
  return [
    ...ks.filter(k => sig.get(k)! >= 0),
    ...ks.filter(k => sig.get(k)! < 0).sort((a, b) => sig.get(b)! - sig.get(a)!),
  ];
}

/** 画面の表記（C、A♭、F♯m） */
export const keyLabel = (key: Key): string => fmt(key.tonic) + (key.mode === "minor" ? "m" : "");

/** 記録のキーに使う ID（C、Ab、F#m）。メジャーとマイナーで衝突しない */
export const keyId = (key: Key): string => noteId(key.tonic) + (key.mode === "minor" ? "m" : "");

export const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"] as const;

export interface DiatonicChord {
  /** スケール上の位置（0 = Ⅰ … 6 = Ⅶ） */
  readonly degree: number;
  readonly root: Note;
  readonly type: ChordType;
  /** ♭Ⅲ など（型を除いた度数） */
  readonly roman: string;
  /** ♭ⅢM7 など */
  readonly label: string;
  /** E♭M7 など */
  readonly symbol: string;
  readonly tones: readonly Note[];
  /** 構成音のルートから見た度数（R ♭3 ♭5 ♭♭7） */
  readonly toneLabels: readonly string[];
}

export interface DiatonicOptions {
  /** マイナーキーの Ⅴ と Ⅶ だけハーモニックマイナーから借りる（Am なら E / E7、G♯dim / G♯dim7） */
  readonly borrowDominant?: boolean;
}

function chordOn(notes: readonly Note[], ivs: readonly Interval[], i: number, size: 3 | 4): DiatonicChord {
  const tones = [0, 2, 4, 6].slice(0, size).map(k => notes[(i + k) % 7]!);
  const chordIvs = tones.map(n => intervalBetween(tones[0]!, n));
  const type = detectChord(chordIvs);
  if (!type) throw new Error(`型が決まらない: ${tones.map(fmt).join(" ")}`);
  const alt = ivs[i]!.alt;
  const roman = (alt < 0 ? "♭" : alt > 0 ? "♯" : "") + ROMAN[i];
  return {
    degree: i,
    root: tones[0]!,
    type,
    roman,
    label: roman + type.symbol,
    symbol: fmt(tones[0]!) + type.symbol,
    tones,
    toneLabels: chordIvs.map(degreeLabel),
  };
}

/** キーのダイアトニックコード（Ⅰ〜Ⅶ） */
export function diatonicChords(key: Key, size: 3 | 4, opts: DiatonicOptions = {}): DiatonicChord[] {
  const build = (id: "major" | "natural_minor" | "harmonic_minor") => {
    const notes = scaleNotes(id, key.tonic),
      ivs = scaleIntervals(id);
    return notes.map((_, i) => chordOn(notes, ivs, i, size));
  };
  const nat = build(scaleOf(key.mode));
  if (!(opts.borrowDominant && key.mode === "minor")) return nat;
  const har = build("harmonic_minor");
  return nat.map((c, i) => (i === 4 || i === 6 ? har[i]! : c));
}
