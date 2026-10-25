/* 音名。F♯ と G♭ を区別しないと調の綴りが壊れるので、音は「文字＋変化記号」で持ち、
   ピッチクラス（0〜11）は計算で出す。 */

export const LETTERS = "CDEFGAB";
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const;

/** letter は C=0 … B=6、acc は変化記号（♯=+1、♭=-1、𝄪=+2、𝄫=-2） */
export interface Note {
  readonly letter: number;
  readonly acc: number;
}

/** 負の数でも 0〜m-1 に収める剰余 */
export const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** 剰余を -6〜5 に寄せる（変化記号の向きを決めるのに使う） */
export const signedMod12 = (n: number): number => mod(n + 6, 12) - 6;

export const letterPc = (letter: number): number => LETTER_PC[mod(letter, 7)]!;

/** "C" "F#" "Bb" "F##" "Fx" "B♭" "F𝄪" などを読む */
export function note(name: string): Note {
  const m = /^([A-G])(#{1,2}|b{1,2}|♯{1,2}|♭{1,2}|x|𝄪|𝄫)?$/.exec(name);
  if (!m) throw new Error(`音名が読めない: ${name}`);
  const s = m[2] ?? "";
  const acc =
    s === "x" || s === "𝄪" ? 2 : s === "𝄫" ? -2 : [...s].reduce((a, c) => a + (c === "#" || c === "♯" ? 1 : -1), 0);
  return { letter: LETTERS.indexOf(m[1]!), acc };
}

export const pc = (n: Note): number => mod(letterPc(n.letter) + n.acc, 12);

export const equals = (a: Note, b: Note): boolean => a.letter === b.letter && a.acc === b.acc;

/** 画面に出す表記（F♯、B♭、F𝄪、B𝄫） */
export function fmt(n: Note): string {
  const a = n.acc === 2 ? "𝄪" : n.acc === -2 ? "𝄫" : (n.acc > 0 ? "♯" : "♭").repeat(Math.abs(n.acc));
  return LETTERS[n.letter] + a;
}

/** ASCII の表記（F#、Bb）。記録のキーなど、変えてはいけない ID に使う */
export const noteId = (n: Note): string => LETTERS[n.letter] + (n.acc > 0 ? "#" : "b").repeat(Math.abs(n.acc));

/** ピッチクラスの綴り方のうち、変化記号が 1 つまでのもの（F♯ なら F♯ と G♭、E なら E と F♭） */
export function spellings(p: number): Note[] {
  const out: Note[] = [];
  for (let letter = 0; letter < 7; letter++) {
    const acc = signedMod12(p - letterPc(letter));
    if (Math.abs(acc) <= 1) out.push({ letter, acc });
  }
  return out.sort((a, b) => Math.abs(a.acc) - Math.abs(b.acc) || b.acc - a.acc);
}
