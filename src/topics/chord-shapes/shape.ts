/* コードの押さえ方（ローコード・ハイコード）で共通の道具。
   押さえ方は「6弦→1弦のフレット（x は鳴らさない）」と「指番号」の 2 つの文字列で持つ（C = x32010 / x32010）。
   レギュラーチューニングの形なので、ほかのチューニングでは出題しない。 */
import type { Barre, Board, Hint, Mark } from "../../drill/topic";
import {
  type ChordType,
  type FretRange,
  type Note,
  type Position,
  type Tuning,
  chordIntervals,
  degreeLabel,
  midiAt,
  mod,
  pc,
  pcAt,
  semitones,
} from "../../theory";

export interface Shape {
  /** 6弦→1弦のフレット。null は鳴らさない弦 */
  readonly frets: readonly (number | null)[];
  /** 6弦→1弦の指番号（0 は開放、null は鳴らさない） */
  readonly fingers: readonly (number | null)[];
}

const STRINGS = [6, 5, 4, 3, 2, 1] as const;

/** "x32010" / "x32010" から。2 桁のフレットは使わない（ハイコードは shift で動かす） */
export function shape(frets: string, fingers: string): Shape {
  const read = (s: string) => [...s].map(c => (c === "x" ? null : Number(c)));
  const f = read(frets),
    g = read(fingers);
  if (f.length !== 6 || g.length !== 6) throw new Error(`押さえ方は 6 弦ぶん: ${frets} ${fingers}`);
  return { frets: f, fingers: g };
}

/** フレットをずらす（ハイコードのフォームを根音のフレットへ） */
export const shift = (s: Shape, by: number): Shape => ({
  frets: s.frets.map(f => (f === null ? null : f + by)),
  fingers: s.fingers,
});

/** 鳴る位置（低い弦から） */
export const sounding = (s: Shape): Position[] =>
  STRINGS.flatMap((string, i) => (s.frets[i] === null ? [] : [{ string, fret: s.frets[i]! }]));

export const mutedOf = (s: Shape): number[] => STRINGS.filter((_, i) => s.frets[i] === null);

/** 同じ指が同じフレットで 2 本以上を押さえていればバレー */
export function barresOf(s: Shape): Barre[] {
  const out: Barre[] = [];
  for (const finger of [1, 2, 3, 4]) {
    const at = STRINGS.filter((_, i) => s.fingers[i] === finger);
    const frets = new Set(at.map(st => s.frets[STRINGS.indexOf(st)]));
    if (at.length >= 2 && frets.size === 1)
      out.push({ fret: [...frets][0]!, low: Math.max(...at), high: Math.min(...at) });
  }
  return out;
}

/** 押さえ方を見せる範囲（縦 5 フレット）。開放があればナットから */
export function shapeRange(s: Shape): FretRange {
  const fretted = s.frets.filter((f): f is number => f !== null && f > 0);
  const lo = Math.min(...fretted);
  const minFret = s.frets.some(f => f === 0) || lo <= 2 ? 0 : lo - 1;
  return { minFret, maxFret: Math.max(minFret + 4, ...fretted) };
}

/** 位置の度数（ルートからの半音でコードの型の度数を引く） */
export function degreeAt(t: Tuning, p: Position, root: Note, type: ChordType): string {
  const d = mod(pcAt(t, p) - pc(root), 12);
  const iv = chordIntervals(type).find(iv => mod(semitones(iv), 12) === d);
  return iv ? degreeLabel(iv) : "?";
}

export type LabelMode = "finger" | "degree";

/** 図の点。指番号か度数を書き、ルートは色を変える。開放弦は白抜きの ○（度数のときは中に度数） */
/** ルートの色を消す（形を見て名前を答える問題で、答えが見えないように） */
export const hideRoot = (marks: readonly Mark[]): Mark[] =>
  marks.map(m => ({ ...m, kind: m.kind === "root" ? "tone" : m.kind === "openRoot" ? "open" : m.kind }));

export function shapeMarks(t: Tuning, s: Shape, root: Note, type: ChordType, mode: LabelMode): Mark[] {
  return sounding(s).map(p => {
    const deg = degreeAt(t, p, root, type);
    const finger = s.fingers[STRINGS.indexOf(p.string as (typeof STRINGS)[number])];
    const open = p.fret === 0;
    const label = mode === "degree" ? deg : open ? "" : String(finger ?? "");
    const kind = open ? (deg === "R" ? "openRoot" : "open") : deg === "R" ? "root" : "tone";
    return { pos: p, kind, label };
  });
}

export function shapeBoard(t: Tuning, s: Shape, root: Note, type: ChordType, mode: LabelMode): Board {
  return {
    range: shapeRange(s),
    marks: shapeMarks(t, s, root, type, mode),
    orientation: "vertical",
    muted: mutedOf(s),
    barres: mode === "finger" ? barresOf(s) : [],
  };
}

/** ヒント：ルートの位置（薄い点）。形を見て名前を答える問題で、伏せたルートを見せる */
export function rootHint(t: Tuning, s: Shape, root: Note, type: ChordType, text: string): Hint {
  return {
    text,
    marks: sounding(s)
      .filter(p => degreeAt(t, p, root, type) === "R")
      .map(p => ({ pos: p, kind: "hint" as const, label: "R" })),
  };
}

/** 3 度の高さで型を見分ける言い方 */
export const thirdTip =
  "R から 3 度が半音 4 ならメジャー系、半音 3 ならマイナー系。7 度があれば半音 10（7）か 11（M7）";

/** 低い弦から高い弦へジャランと */
export const strumOf = (t: Tuning, s: Shape) => ({ notes: sounding(s).map(p => midiAt(t, p)), strum: true });

/** 低い弦から、鳴る音の度数（「R 3 5 R 3」） */
export const degreesText = (t: Tuning, s: Shape, root: Note, type: ChordType) =>
  sounding(s)
    .map(p => degreeAt(t, p, root, type))
    .join(" ");

export const tabText = (s: Shape) => s.frets.map(f => (f === null ? "x" : f > 9 ? `(${f})` : String(f))).join("");
