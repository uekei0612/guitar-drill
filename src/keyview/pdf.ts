/* キーの画面の印刷：ダイアトニックコードの一覧表（A4 横）。
   メジャーとマイナーで 1 ページずつ。行は五度圏の順（時計回り）の 12 キー、列は Ⅰ〜Ⅶ。
   図形の並びはチャートの PDF と同じ Canvas で作るので、プレビューと jsPDF の描き方も共通。 */
import { Canvas, MM, PAGE_H, PAGE_W, type Page, type Rgba, hex } from "../chart/pdf/page";
import { type DiatonicChord, type Key, type KeyMode, ROMAN, diatonicChords, keyLabel, keySignature } from "../theory";
import { type Func, funcOf, keyAt } from "./state";

/** 表に書くコード：三和音・四和音・両方（上に三和音、下に四和音） */
export type PrintChords = "triad" | "seventh" | "both";

export interface KeyPrintOptions {
  readonly modes: readonly KeyMode[];
  readonly chords: PrintChords;
  /** マイナーの Ⅴ・Ⅶ をハーモニックマイナーから借りる */
  readonly borrow: boolean;
}

const BLACK = hex("#000000");
const WHITE = hex("#ffffff");
const SUBTLE = hex("#666666");
const GRID = hex("#cccccc");
const STRIPE = hex("#f3f3f3");
/** 借りたコード（画面の「借りた」と同じく目立たせる） */
const BORROWED = hex("#ad1457");
/** 機能の色（画面の札と同じ） */
const FUNC_COLOR: Readonly<Record<Func, Rgba>> = { T: hex("#16a34a"), SD: hex("#2563eb"), D: hex("#dc2626") };
const FUNC_NAME: Readonly<Record<Func, string>> = { T: "Tonic", SD: "Subdominant", D: "Dominant" };

const MODE_NAME: Readonly<Record<KeyMode, string>> = { major: "Major", minor: "Minor" };

/** Ⅰ〜Ⅶ を ASCII のローマ数字に（PDF の標準フォントには無い） */
const ASCII_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const asciiRoman = (s: string): string =>
  s.replace(/[ⅠⅡⅢⅣⅤⅥⅦ]/g, r => ASCII_ROMAN[ROMAN.indexOf(r as (typeof ROMAN)[number])]!);

const sigText = (n: number) => (n === 0 ? "no # / b" : n > 0 ? `${n}#` : `${-n}b`);

/** 行のキー（五度圏を C／Am から時計回り） */
export const printKeys = (mode: KeyMode): Key[] => Array.from({ length: 12 }, (_, i) => keyAt(mode, i));

const sizesOf = (c: PrintChords): readonly (3 | 4)[] => (c === "triad" ? [3] : c === "seventh" ? [4] : [3, 4]);

/** 借りたコードか（ナチュラルマイナーのコードと違う） */
const borrowedAt = (k: Key, size: 3 | 4, chords: readonly DiatonicChord[], i: number) =>
  chords[i]!.symbol !== diatonicChords(k, size)[i]!.symbol;

export const keyPrintPageCount = (o: KeyPrintOptions): number => o.modes.length;

export function buildKeyPrintPages(o: KeyPrintOptions): Page[] {
  const c = new Canvas();
  o.modes.forEach((mode, i) => modePage(c, o, mode, i + 1));
  return c.pages;
}

function modePage(c: Canvas, o: KeyPrintOptions, mode: KeyMode, pageNum: number) {
  const sizes = sizesOf(o.chords);
  const borrow = o.borrow && mode === "minor";
  const chordsOf = (k: Key, size: 3 | 4) => diatonicChords(k, size, { borrowDominant: borrow });
  const keys = printKeys(mode);
  const marginX = 14 * MM;

  // ---- 見出し ----
  c.text(marginX, PAGE_H - 14 * MM, `Diatonic Chords — ${MODE_NAME[mode]} Keys`, 17, BLACK, { bold: true });
  const kind = sizes.length === 2 ? "triads (top) and 7th chords (below)" : sizes[0] === 3 ? "triads" : "7th chords";
  const scale = mode === "major" ? "major scale" : "natural minor scale";
  const lines = [
    `The ${kind} built on each note of the ${scale}.`,
    "Keys run clockwise around the circle of fifths: each row moves a 5th up (one more # or one less b).",
  ];
  if (borrow) lines.push("V and VII in color are borrowed from the harmonic minor (raised 7th = leading tone).");
  let ty = PAGE_H - 20 * MM;
  for (const line of lines) {
    c.text(marginX, ty, line, 9.5, SUBTLE);
    ty -= 4 * MM;
  }

  // 機能の凡例（右上）
  let lx = PAGE_W - marginX - 92 * MM;
  for (const f of ["T", "SD", "D"] as const) {
    c.rect(lx, PAGE_H - 15.5 * MM, 7 * MM, 4 * MM, FUNC_COLOR[f], 1.5);
    c.text(lx + 3.5 * MM, PAGE_H - 14.6 * MM, f, 7.5, WHITE, { bold: true, align: "center" });
    c.text(lx + 8.5 * MM, PAGE_H - 14.6 * MM, FUNC_NAME[f], 8.5, BLACK);
    lx += 31 * MM;
  }

  // ---- 表 ----
  const keyW = 32 * MM;
  const x0 = marginX;
  const colW = (PAGE_W - 2 * marginX - keyW) / 7;
  const colX = (i: number) => x0 + keyW + i * colW;
  const headTop = ty - 2 * MM;
  const headH = (sizes.length === 2 ? 11 : 7.5) * MM;
  const funcH = 5 * MM;
  const bodyTop = headTop - headH - funcH;
  const bodyBottom = 18 * MM;
  const rowH = (bodyTop - bodyBottom) / keys.length;

  // 列の見出し（度数は先頭のキーのコードの書き方から。型はどのキーでも同じ）
  const head = sizes.map(size => chordsOf(keys[0]!, size));
  c.text(x0 + 2 * MM, headTop - 5.5 * MM, "Key", 11, BLACK, { bold: true });
  for (let i = 0; i < 7; i++) {
    const cx = colX(i) + colW / 2;
    const color = borrow && borrowedAt(keys[0]!, sizes[0]!, head[0]!, i) ? BORROWED : BLACK;
    c.text(cx, headTop - 5.5 * MM, asciiRoman(head[0]![i]!.label), 12, color, { bold: true, align: "center" });
    if (head[1]) c.text(cx, headTop - 9.5 * MM, asciiRoman(head[1][i]!.label), 9, SUBTLE, { align: "center" });
    const f = funcOf(keys[0]!, i, borrow);
    c.rect(colX(i) + 1, bodyTop + 0.8 * MM, colW - 2, funcH - 1.6 * MM, FUNC_COLOR[f], 1.5);
    c.text(cx, bodyTop + 1.75 * MM, f, 7.5, WHITE, { bold: true, align: "center" });
  }
  c.line(x0, bodyTop, PAGE_W - marginX, bodyTop, BLACK, 1);

  keys.forEach((k, r) => {
    const top = bodyTop - r * rowH;
    if (r % 2 === 1) c.rect(x0, top - rowH, PAGE_W - 2 * marginX, rowH, STRIPE);
    const mid = top - rowH / 2;
    // キーの欄：キー名と、調号・平行調
    const rel = keyAt(mode === "major" ? "minor" : "major", r);
    c.text(x0 + 2 * MM, mid + 0.5, keyLabel(k), 13, BLACK, { bold: true });
    c.text(x0 + 2 * MM, mid - 3.6 * MM, `${sigText(keySignature(k))}  rel. ${keyLabel(rel)}`, 7.5, SUBTLE);
    const rows = sizes.map(size => chordsOf(k, size));
    for (let i = 0; i < 7; i++) {
      const cx = colX(i) + colW / 2;
      const color = (size: 3 | 4, cs: readonly DiatonicChord[]) =>
        borrow && borrowedAt(k, size, cs, i) ? BORROWED : BLACK;
      if (rows.length === 2) {
        c.text(cx, mid + 0.6 * MM, rows[0]![i]!.symbol, 12, color(3, rows[0]!), { bold: true, align: "center" });
        c.text(cx, mid - 3.8 * MM, rows[1]![i]!.symbol, 9.5, color(4, rows[1]!), { align: "center" });
      } else {
        c.text(cx, mid - 1.5 * MM, rows[0]![i]!.symbol, 12.5, color(sizes[0]!, rows[0]!), {
          bold: true,
          align: "center",
        });
      }
    }
    c.line(x0, top - rowH, PAGE_W - marginX, top - rowH, GRID, 0.5);
  });
  // 縦の線（キーの欄と Ⅰ の間は太く）
  for (let i = 0; i <= 7; i++) c.line(colX(i), headTop, colX(i), bodyBottom, i === 0 ? BLACK : GRID, i === 0 ? 1 : 0.5);

  // ---- 下の注記とページ番号 ----
  const note =
    mode === "major"
      ? "T = rest (home), SD = moving away, D = tension that pulls back to I. Same row = same key signature."
      : borrow
        ? "In minor, bVI is counted as SD here (some books call it tonic). The borrowed VIIdim sits on the leading tone, so it is D."
        : "In minor, bVI and bVII are counted as SD here (some books call bVI tonic and bVII dominant).";
  c.text(marginX, 12.5 * MM, note, 7.5, SUBTLE);
  c.text(marginX, 7 * MM, `Diatonic chords — ${MODE_NAME[mode].toLowerCase()} keys`, 8, SUBTLE);
  c.text(PAGE_W - marginX, 7 * MM, `Page ${pageNum} / ${o.modes.length}`, 8, SUBTLE, { align: "right" });
  c.showPage();
}

/** ダウンロードのファイル名 */
export const keyPrintFileName = (o: KeyPrintOptions): string =>
  o.modes.length === 1 ? `Diatonic_Chords_${MODE_NAME[o.modes[0]!]}.pdf` : "Diatonic_Chords.pdf";
