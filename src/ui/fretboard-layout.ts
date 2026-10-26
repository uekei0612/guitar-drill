/* 指板図の座標計算（DOM に触らない）。
   横向き：1 弦が上、ナットが左（左利きは右）。ボックスのような短い範囲に使う。
   縦向き：ナットが上、6 弦が左（左利きは右）。コードダイアグラムと同じ向きで、360px 幅でも
   12 フレットまで 1 マス 44px 以上を取れるので、範囲が広いときはこちらにする。

   計算は「ネックに沿う軸（along）」と「弦を横切る軸（across）」で行い、最後に x / y に割り当てる。 */
import type { FretRange, Position } from "../theory";

export type Orientation = "horizontal" | "vertical";

/** 横向きにする最大のフレット数（開放を含む）。これを超えたら縦向き */
export const MAX_HORIZONTAL_FRETS = 6;

/** 1 マスの大きさ（SVG の座標。画面では幅いっぱいに伸縮する） */
const SIZE = {
  horizontal: { along: 56, across: 48 },
  vertical: { along: 48, across: 52 },
} as const;
const PAD = 8;
/** フレット番号を書く帯の幅 */
const LABEL = 22;
/** 横向きの図が 1 マス 44px 以上を保てる幅（360px 幅の画面で 328px に縮めるとき 48 → 44 になる上限） */
const FIT_WIDTH = 358;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Cell {
  readonly pos: Position;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** 点を置く中心 */
  readonly c: Point;
}

export interface Line {
  readonly a: Point;
  readonly b: Point;
}

export interface Layout {
  readonly orientation: Orientation;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Cell[];
  /** フレットを押さえる部分（開放の欄を除く） */
  readonly board: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly strings: readonly Line[];
  readonly wires: readonly (Line & { readonly nut: boolean })[];
  readonly inlays: readonly Point[];
  readonly fretLabels: readonly (Point & { readonly fret: number })[];
  /** 弦の札（縦向きは指板の下、横向きはヘッド側。headLabels: false の横向きは無し） */
  readonly stringLabels: readonly (Point & { readonly string: number })[];
  /** 点の半径 */
  readonly r: number;
  cellAt(pos: Position): Cell | undefined;
  /** ナットの手前で、その弦の × や ○ を書く点（開放の欄があればその欄の中心） */
  headPoint(string: number): Point;
  /** lo〜hi フレットの欄を全弦ぶん覆う四角（ボックスの帯）。範囲外は切る。見えなければ undefined */
  span(
    lo: number,
    hi: number,
  ): { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | undefined;
}

export interface LayoutOptions {
  /** 横向きのヘッド側に弦ごとの札を置く場所を取る（既定は取る。弦の番号か、開放弦の音名などを書く） */
  readonly headLabels?: boolean;
  /** 縦向きで開放の欄が無いときも、ナット側に × などを書く帯を取る */
  readonly headRow?: boolean;
}

export const chooseOrientation = (range: FretRange): Orientation =>
  range.maxFret - range.minFret + 1 > MAX_HORIZONTAL_FRETS ? "vertical" : "horizontal";

const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAYS = [12, 24];

export function layout(
  strings: number,
  range: FretRange,
  lefty: boolean,
  orientation: Orientation = chooseOrientation(range),
  { headLabels = true, headRow = false }: LayoutOptions = {},
): Layout {
  const horizontal = orientation === "horizontal";
  const n = range.maxFret - range.minFret + 1;
  const { across: AC } = SIZE[orientation];
  // 横向きの短い図は、札の幅を足しても画面に収まるようにネック方向を少し詰める
  const AL =
    horizontal && headLabels && n <= MAX_HORIZONTAL_FRETS
      ? Math.min(SIZE.horizontal.along, Math.floor((FIT_WIDTH - 2 * PAD - LABEL) / n))
      : SIZE[orientation].along;
  // 横向きの左利きはネックの向きを、縦向きの右利きは弦の並び（6 弦を左）を反転する
  const flipAlong = horizontal && lefty;
  const flipAcross = !horizontal && !lefty;

  // 横向きで札を置くときは、ヘッド側（右利きは左、左利きは右）に札の幅を足す
  const headPad = horizontal && headLabels ? LABEL : 0;
  const hasOpen = range.minFret === 0;
  const topPad = !horizontal && headRow && !hasOpen ? LABEL : 0;
  const along0 = PAD + topPad + (flipAlong ? 0 : headPad);
  const across0 = horizontal ? PAD : LABEL;
  const alongEnd = along0 + n * AL;

  /** ネック上の位置（フレット欄の番号 a）→ その欄の始まり */
  const alongStart = (a: number) => along0 + (flipAlong ? n - 1 - a : a) * AL;
  const alongMid = (a: number) => alongStart(a) + AL / 2;
  /** 欄のヘッド側／ボディ側の縁 */
  const headEdge = (a: number) => alongStart(a) + (flipAlong ? AL : 0);
  const bodyEdge = (a: number) => alongStart(a) + (flipAlong ? 0 : AL);
  /** 弦（0 = 1 弦）→ その弦の欄の始まり */
  const acrossStart = (s: number) => across0 + (flipAcross ? strings - 1 - s : s) * AC;
  const acrossMid = (s: number) => acrossStart(s) + AC / 2;
  const acrossLo = across0 + AC / 2;
  const acrossHi = across0 + (strings - 0.5) * AC;

  const pt = (along: number, across: number): Point => (horizontal ? { x: along, y: across } : { x: across, y: along });

  const cells: Cell[] = [];
  for (let s = 0; s < strings; s++)
    for (let a = 0; a < n; a++) {
      const p = pt(alongStart(a), acrossStart(s));
      cells.push({
        pos: { string: s + 1, fret: range.minFret + a },
        x: p.x,
        y: p.y,
        w: horizontal ? AL : AC,
        h: horizontal ? AC : AL,
        c: pt(alongMid(a), acrossMid(s)),
      });
    }

  // 開放の欄があるときは、押さえる部分と弦はナットから（弦は開放の点の位置から引く）
  const first = hasOpen ? 1 : 0;
  const boardFrom = hasOpen ? headEdge(1) : headEdge(0);
  const boardTo = bodyEdge(n - 1);
  const stringFrom = hasOpen ? alongMid(0) : headEdge(0);
  const b1 = pt(Math.min(boardFrom, boardTo), acrossLo);
  const b2 = pt(Math.max(boardFrom, boardTo), acrossHi);
  const board = { x: b1.x, y: b1.y, w: b2.x - b1.x, h: b2.y - b1.y };

  const stringLines = Array.from({ length: strings }, (_, s) => ({
    a: pt(stringFrom, acrossMid(s)),
    b: pt(boardTo, acrossMid(s)),
  }));

  // フレットの線：見えている最初の欄のヘッド側の縁（＝前のフレット）から、最後の欄のボディ側まで
  const wires: (Line & { nut: boolean })[] = [];
  if (!hasOpen) wires.push({ a: pt(headEdge(0), acrossLo), b: pt(headEdge(0), acrossHi), nut: range.minFret === 1 });
  for (let a = 0; a < n; a++) {
    const f = range.minFret + a;
    wires.push({ a: pt(bodyEdge(a), acrossLo), b: pt(bodyEdge(a), acrossHi), nut: f === 0 });
  }

  const mid = (acrossLo + acrossHi) / 2;
  const inlays: Point[] = [];
  const fretLabels: (Point & { fret: number })[] = [];
  for (let a = first; a < n; a++) {
    const f = range.minFret + a;
    if (INLAYS.includes(f)) inlays.push(pt(alongMid(a), mid));
    if (DOUBLE_INLAYS.includes(f)) inlays.push(pt(alongMid(a), mid - AC), pt(alongMid(a), mid + AC));
    // フレット番号：ポジションマークのあるフレットと、範囲の最初のフレット
    if (INLAYS.includes(f) || DOUBLE_INLAYS.includes(f) || (a === 0 && !hasOpen))
      fretLabels.push({ ...pt(alongMid(a), horizontal ? across0 + strings * AC + LABEL / 2 : LABEL / 2), fret: f });
  }

  const labelAlong = horizontal ? (flipAlong ? alongEnd + LABEL / 2 : PAD + LABEL / 2) : alongEnd + LABEL / 2;
  const stringLabels =
    horizontal && !headLabels
      ? []
      : Array.from({ length: strings }, (_, s) => ({ ...pt(labelAlong, acrossMid(s)), string: s + 1 }));

  const span = (lo: number, hi: number) => {
    const a1 = Math.max(lo, range.minFret) - range.minFret,
      a2 = Math.min(hi, range.maxFret) - range.minFret;
    if (a1 > a2) return undefined;
    const e1 = Math.min(headEdge(a1), bodyEdge(a2)),
      e2 = Math.max(headEdge(a1), bodyEdge(a2));
    const p1 = pt(e1, across0),
      p2 = pt(e2, across0 + strings * AC);
    return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w: Math.abs(p2.x - p1.x), h: Math.abs(p2.y - p1.y) };
  };

  const byKey = new Map(cells.map(c => [`${c.pos.string}:${c.pos.fret}`, c]));
  return {
    orientation,
    width: horizontal ? alongEnd + PAD + (flipAlong ? headPad : 0) : across0 + strings * AC + PAD,
    height: horizontal ? across0 + strings * AC + LABEL : alongEnd + LABEL,
    cells,
    board,
    strings: stringLines,
    wires,
    inlays,
    fretLabels,
    stringLabels,
    r: Math.min(AL, AC) * 0.36,
    cellAt: pos => byKey.get(`${pos.string}:${pos.fret}`),
    headPoint: string =>
      hasOpen
        ? byKey.get(`${string}:${range.minFret}`)!.c
        : pt(flipAlong ? alongEnd + LABEL / 2 : along0 - LABEL / 2, acrossMid(string - 1)),
    span,
  };
}
