/* 度数（音程）。ルートの文字から数えた度数（1〜13）と、メジャースケールの同じ度数からのずれで持つ。
   ♭3 = { num: 3, alt: -1 }、♯11 = { num: 11, alt: 1 }、dim7 の第7音 ♭♭7 = { num: 7, alt: -2 }。 */
import { type Note, letterPc, mod, pc, signedMod12 } from "./note";

export interface Interval {
  readonly num: number;
  readonly alt: number;
}

/** 質。完全系（1・4・5 度）は P/A/d、長短系は M/m/A/d */
export type Quality = "P" | "M" | "m" | "A" | "d";

const MAJOR = [0, 2, 4, 5, 7, 9, 11] as const;

/** 度数の幹（1〜7） */
const stem = (num: number): number => ((num - 1) % 7) + 1;

export const isPerfect = (num: number): boolean => [1, 4, 5].includes(stem(num));

/** メジャースケールでその度数にあたる半音数（9 度なら 14） */
const majorSemis = (num: number): number => MAJOR[(num - 1) % 7]! + 12 * Math.floor((num - 1) / 7);

export const semitones = (iv: Interval): number => majorSemis(iv.num) + iv.alt;

/** 度数と半音数から（オクターブのずれは無視する。度数が文字を、半音数が変化を決める） */
export const intervalFromSemis = (num: number, semis: number): Interval => ({
  num,
  alt: signedMod12(semis - majorSemis(num)),
});

export function quality(iv: Interval): Quality {
  const q = isPerfect(iv.num)
    ? ({ 0: "P", 1: "A", [-1]: "d" } as const)[iv.alt]
    : ({ 0: "M", [-1]: "m", [-2]: "d", 1: "A" } as const)[iv.alt];
  if (!q) throw new Error(`質で表せない度数: ${degreeId(iv)}`);
  return q;
}

export function fromQuality(num: number, q: Quality): Interval {
  const alt = isPerfect(num) ? { P: 0, A: 1, d: -1 }[q as "P" | "A" | "d"] : { M: 0, m: -1, d: -2, A: 1 }[q as "M"];
  if (alt === undefined) throw new Error(`${num} 度に ${q} はない`);
  return { num, alt };
}

/** "R" "1" "b3" "#4" "bb7" "9" "#11" "♭13" などを読む（guitar_chart の度数ラベルもこの形） */
export function degree(s: string): Interval {
  const m = /^(b{1,2}|#{1,2}|♭{1,2}|♯{1,2})?(R|[1-9]|1[0-3])$/.exec(s);
  if (!m) throw new Error(`度数が読めない: ${s}`);
  const alt = [...(m[1] ?? "")].reduce((a, c) => a + (c === "#" || c === "♯" ? 1 : -1), 0);
  return { num: m[2] === "R" ? 1 : Number(m[2]), alt };
}

/** 画面に出す表記（R、♭3、♯11、♭♭7） */
export function degreeLabel(iv: Interval): string {
  if (iv.num === 1 && iv.alt === 0) return "R";
  return (iv.alt > 0 ? "♯" : "♭").repeat(Math.abs(iv.alt)) + iv.num;
}

/** ASCII の表記（R、b3、#11、bb7）。guitar_chart の度数ラベルと同じ形 */
export function degreeId(iv: Interval): string {
  if (iv.num === 1 && iv.alt === 0) return "R";
  return (iv.alt > 0 ? "#" : "b").repeat(Math.abs(iv.alt)) + iv.num;
}

/** 音を度数だけ上げる。文字は度数で、変化記号は半音数の差で決まる */
export function transpose(n: Note, iv: Interval): Note {
  const letter = mod(n.letter + iv.num - 1, 7);
  return { letter, acc: signedMod12(pc(n) + semitones(iv) - letterPc(letter)) };
}

/** ルート＋度数の並び → 正しく綴った音名の並び */
export const spell = (root: Note, ivs: readonly Interval[]): Note[] => ivs.map(iv => transpose(root, iv));

/** a から上に b までの度数（1 オクターブ内） */
export const intervalBetween = (a: Note, b: Note): Interval =>
  intervalFromSemis(mod(b.letter - a.letter, 7) + 1, pc(b) - pc(a));
