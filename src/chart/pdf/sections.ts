/* PDF の 3 種のセクション（guitar_chart の sections.py・drawing.py・style.py を移したもの）。
   1. 全 12 キー：キーごとに全指板を 1 段ずつ
   2. ボックス図：キーに依らない 5 つの形
   3. 度数付き全指板：1 つのキーで、ボックスの帯つき
   座標・大きさ・色は guitar_chart と同じ値を使う（左下原点、pt）。 */
import { mod } from "../../theory";
import type { ChartDef } from "../registry";
import { CHROMATIC_DEGREES } from "../registry";
import { Canvas, MM, PAGE_H, PAGE_W, type Rgba, hex, opaque, rgb } from "./page";

// ---- 色・マーク（style.py） ----
const DOT_COLOR = hex("#1a1a1a");
const ROOT_FILL = hex("#D32F2F");
const ROOT_RING = hex("#8B1A1A");
const FRET_LINE = hex("#888888");
const STRING_LINE = hex("#333333");
const BLACK = hex("#000000");
const WHITE = hex("#ffffff");
const CAPO_BAR = rgb(0.35, 0.35, 0.35, 0.32);
const MARKER = hex("#cfcfcf");
const SUBTLE = hex("#666666");
const FRET_NUM = hex("#1976D2");
const BOX_COLORS: readonly Rgba[] = [
  rgb(1.0, 0.78, 0.78, 0.45),
  rgb(1.0, 0.92, 0.65, 0.45),
  rgb(0.75, 0.93, 0.78, 0.45),
  rgb(0.75, 0.85, 1.0, 0.45),
  rgb(0.9, 0.78, 1.0, 0.45),
];
const SINGLE_MARKERS = new Set([3, 5, 7, 9, 15, 17, 21]);
const DOUBLE_MARKERS = new Set([12, 24]);

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 1 つのチャート（スケール・アルペジオ・カスタム）を描くのに要るもの */
export interface Subject {
  readonly chart: ChartDef;
  /** 開放弦（低い弦から、ピッチクラス） */
  readonly tuning: readonly number[];
  readonly capo: number;
}

/** ASCII の度数ラベル（半音数 → R, b3 …） */
function labelsOf(chart: ChartDef): Map<number, string> {
  return new Map(chart.intervals.map((iv, i) => [iv, chart.degrees[i] ?? CHROMATIC_DEGREES[iv]!]));
}
const degreeString = (chart: ChartDef) => chart.degrees.join(" - ");
const tuningDescription = (t: readonly number[]) => t.map(p => NOTES[p]).join("");
const tuningHeader = (s: Subject) =>
  s.capo ? `Tuning: ${tuningDescription(s.tuning)}, Capo: fret ${s.capo}` : `Tuning: ${tuningDescription(s.tuning)}`;

interface Ctx {
  pageNum: number;
  readonly totalPages: number;
  sectionName: string;
}

// ---- drawing.py ----
interface Geom {
  readonly nutX: number;
  readonly fretSpacing: number;
  readonly stringSpacing: number;
  readonly openXCenter: number | null;
}

function drawFretboardGrid(
  c: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  numFrets: number,
  openAreaWidth: number,
  fretNumberYOffset: number,
  numStrings: number,
  capo: number,
): Geom {
  const nutX = x + openAreaWidth;
  const gridW = w - openAreaWidth;
  const fretSpacing = gridW / numFrets;
  const stringSpacing = numStrings > 1 ? h / (numStrings - 1) : h;
  for (let i = 0; i < numFrets; i++) {
    const f = i + 1;
    const cx = nutX + (i + 0.5) * fretSpacing;
    if (SINGLE_MARKERS.has(f)) c.circle(cx, y + h / 2, 1.5 * MM, MARKER);
    else if (DOUBLE_MARKERS.has(f)) {
      c.circle(cx, y + h * 0.3, 1.5 * MM, MARKER);
      c.circle(cx, y + h * 0.7, 1.5 * MM, MARKER);
    }
  }
  for (let i = 0; i <= numFrets; i++) {
    const fx = nutX + i * fretSpacing;
    c.line(fx, y, fx, y + h, FRET_LINE, 0.6);
  }
  c.line(nutX, y, nutX, y + h, BLACK, 2.5);
  for (let s = 0; s < numStrings; s++) {
    const sy = y + s * stringSpacing;
    c.line(x, sy, nutX + gridW, sy, STRING_LINE, 0.6);
  }
  if (capo > 0 && capo <= numFrets) {
    const center = nutX + (capo - 0.5) * fretSpacing;
    const bw = fretSpacing * 0.5;
    const over = numStrings > 1 ? stringSpacing * 0.45 : 2 * MM;
    c.rect(center - bw / 2, y - over, bw, h + 2 * over, CAPO_BAR, Math.min(bw, 3 * MM) / 2);
  }
  for (let i = 0; i < numFrets; i++) {
    const f = i + 1;
    if (SINGLE_MARKERS.has(f) || DOUBLE_MARKERS.has(f))
      c.text(nutX + (i + 0.5) * fretSpacing, y + fretNumberYOffset, String(f), 8.5, FRET_NUM, {
        bold: true,
        align: "center",
      });
  }
  return { nutX, fretSpacing, stringSpacing, openXCenter: openAreaWidth > 0 ? x + openAreaWidth / 2 : null };
}

function drawNoteDot(c: Canvas, cx: number, sy: number, radius: number, isRoot: boolean, label: string) {
  if (isRoot) {
    c.circle(cx, sy, radius, ROOT_FILL, ROOT_RING, 1.0);
    c.text(cx, sy - 2.3, label || "R", 8, WHITE, { bold: true, align: "center" });
  } else {
    c.circle(cx, sy, radius, DOT_COLOR, DOT_COLOR, 0.5);
    if (label) c.text(cx, sy - 2.3, label, label.length > 1 ? 7 : 8, WHITE, { bold: true, align: "center" });
  }
}

function placeScaleDots(
  c: Canvas,
  geom: Geom,
  y: number,
  root: number,
  chart: ChartDef,
  numFrets: number,
  tuning: readonly number[],
  capo: number,
) {
  const r0 = Math.min(geom.stringSpacing, geom.fretSpacing) * 0.42;
  const radius = Math.max(Math.min(r0, 3.6 * MM), 2.4 * MM);
  const labels = labelsOf(chart);
  tuning.forEach((open, sIdx) => {
    const sy = y + sIdx * geom.stringSpacing;
    for (let fret = 0; fret <= numFrets; fret++) {
      const semi = mod(open + fret - root, 12);
      if (!labels.has(semi)) continue;
      if (capo && fret < capo) continue;
      let cx: number;
      if (fret === 0 && geom.openXCenter !== null) cx = geom.openXCenter;
      else {
        if (fret < 1 || fret > numFrets) continue;
        cx = geom.nutX + (fret - 0.5) * geom.fretSpacing;
      }
      drawNoteDot(c, cx, sy, radius, semi === 0, labels.get(semi)!);
    }
  });
}

function drawFooter(c: Canvas, ctx: Ctx) {
  c.text(12 * MM, 7 * MM, ctx.sectionName, 8, SUBTLE);
  c.text(PAGE_W - 12 * MM, 7 * MM, `Page ${ctx.pageNum} / ${ctx.totalPages}`, 8, SUBTLE, { align: "right" });
}

function drawLegend(c: Canvas, x: number, y: number) {
  c.circle(x + 2.5 * MM, y + 1.5, 2.4 * MM, ROOT_FILL, ROOT_RING, 1.0);
  c.text(x + 2.5 * MM, y + 1.5 - 2.0, "R", 7, WHITE, { bold: true, align: "center" });
  c.text(x + 7 * MM, y, "Root", 9, BLACK);
  const x2 = x + 22 * MM;
  c.circle(x2, y + 1.5, 2.4 * MM, DOT_COLOR, DOT_COLOR, 0.5);
  c.text(x2, y + 1.5 - 2.0, "n", 7, WHITE, { bold: true, align: "center" });
  c.text(x2 + 5 * MM, y, "Scale tone (number = degree)", 9, BLACK);
}

function finishPage(c: Canvas, ctx: Ctx) {
  drawFooter(c, ctx);
  c.showPage();
  ctx.pageNum++;
}

// ---- ボックスの番号（sections._renumber_boxes） ----
const RENUMBER_FRETS = 18;

/** 1〜numFrets の指板で最初に見える位置の低い順に、ボックスに番号を振り直す（古い番号 0 始まり → 新しい番号 1 始まり） */
export function renumberBoxes(
  ranges: readonly (readonly [number, number])[],
  numFrets = RENUMBER_FRETS,
): Map<number, number> {
  const firstLo = new Map<number, number>();
  ranges.forEach(([lo, hi], i) => {
    for (const k of [-2, -1, 0, 1, 2]) {
      const a = lo + 12 * k,
        b = hi + 12 * k;
      if (a >= 1 && b <= numFrets && (!firstLo.has(i) || a < firstLo.get(i)!)) firstLo.set(i, a);
    }
  });
  const order = ranges.map((_, i) => i).sort((a, b) => (firstLo.get(a) ?? Infinity) - (firstLo.get(b) ?? Infinity));
  return new Map(order.map((old, n) => [old, n + 1]));
}

// ---- 1. 全 12 キー ----
export function sectionAllKeys(c: Canvas, s: Subject, ctx: Ctx, keysPerPage: number, numFrets = 15) {
  const marginX = 12 * MM,
    marginTop = 12 * MM;
  const keys = NOTES.map((_, p) => p);
  for (let i = 0; i < keys.length; i += keysPerPage) {
    const chunk = keys.slice(i, i + keysPerPage);
    c.text(marginX, PAGE_H - marginTop, `${s.chart.nameEn} — Full Fretboard (All Keys)`, 15, BLACK, { bold: true });
    const legendY = PAGE_H - marginTop - 4 * MM;
    c.text(marginX, legendY, `${tuningHeader(s)} (highest string on top).`, 8.5, BLACK);
    drawLegend(c, marginX + 88 * MM, legendY);
    const topY = PAGE_H - marginTop - 10 * MM;
    const bottomY = 21 * MM;
    const slotH = (topY - bottomY) / chunk.length;
    const fbW = PAGE_W - 2 * marginX;
    chunk.forEach((key, j) => {
      const slotTop = topY - j * slotH;
      const y = slotTop - slotH + 8 * MM;
      const h = slotH - 13 * MM;
      c.text(marginX, y + h + 3 * MM, `${NOTES[key]} ${s.chart.shortName}`, 11, BLACK, { bold: true });
      const geom = drawFretboardGrid(c, marginX, y, fbW, h, numFrets, 6 * MM, -4 * MM, s.tuning.length, s.capo);
      placeScaleDots(c, geom, y, key, s.chart, numFrets, s.tuning, s.capo);
    });
    c.text(marginX, 13 * MM, `Intervals: ${degreeString(s.chart)}`, 7, SUBTLE);
    finishPage(c, ctx);
  }
}

// ---- 2. ボックス図 ----
interface BoxData {
  num: number;
  readonly width: number;
  readonly notes: readonly { s: number; f: number; isRoot: boolean; label: string }[];
}

function buildBoxData(s: Subject, root: number, ranges: readonly (readonly [number, number])[]): BoxData[] {
  const labels = labelsOf(s.chart);
  return ranges.map(([lo, hi], i) => {
    const notes: BoxData["notes"][number][] = [];
    s.tuning.forEach((open, sIdx) => {
      for (let f = lo; f <= hi; f++) {
        const semi = mod(open + f - root, 12);
        if (labels.has(semi)) notes.push({ s: sIdx, f: f - lo, isRoot: semi === 0, label: labels.get(semi)! });
      }
    });
    return { num: i + 1, width: hi - lo, notes };
  });
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

/** 「Roots on 6th, 4th & 1st strings」（theory.root_string_label） */
export function rootStringLabel(stringIdx: readonly number[], numStrings: number): string {
  const parts = [...stringIdx].sort((a, b) => a - b).map(i => ordinal(numStrings - i));
  if (!parts.length) return "(no root)";
  if (parts.length === 1) return `Root on the ${parts[0]} string`;
  return `Roots on ${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]} strings`;
}

function drawBoxDiagram(
  c: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  box: BoxData,
  title: string,
  sub: string,
  numStrings: number,
) {
  c.text(x, y + h + 9 * MM, title, 12, BLACK, { bold: true });
  c.text(x, y + h + 4.5 * MM, sub, 8.5, SUBTLE);
  const numFrets = box.width + 1;
  const ss = numStrings > 1 ? h / (numStrings - 1) : h;
  const fs = w / numFrets;
  for (let i = 0; i <= numFrets; i++) c.line(x + i * fs, y, x + i * fs, y + h, FRET_LINE, 0.6);
  for (let s = 0; s < numStrings; s++) c.line(x, y + s * ss, x + w, y + s * ss, STRING_LINE, 0.6);
  const r = Math.max(Math.min(Math.min(ss, fs) * 0.42, 3.6 * MM), 2.6 * MM);
  for (const n of box.notes) drawNoteDot(c, x + (n.f + 0.5) * fs, y + n.s * ss, r, n.isRoot, n.label);
}

export function sectionBoxPositions(
  c: Canvas,
  s: Subject,
  ctx: Ctx,
  root: number,
  ranges: readonly (readonly [number, number])[],
) {
  const numStrings = s.tuning.length;
  const marginX = 14 * MM,
    marginTop = 14 * MM;
  c.text(marginX, PAGE_H - marginTop, `${s.chart.nameEn} — Box Positions`, 17, BLACK, { bold: true });
  let ty = PAGE_H - marginTop - 6 * MM;
  for (const line of [
    `Degrees: ${degreeString(s.chart)}   (${ranges.length} overlapping shapes covering the neck).`,
    `${tuningHeader(s)}. Move the shape so the R lands on your target note.`,
  ]) {
    c.text(marginX, ty, line, 9.5, SUBTLE);
    ty -= 4 * MM;
  }
  const legendY = ty - 2 * MM;
  drawLegend(c, marginX, legendY);

  const boxes = buildBoxData(s, root, ranges);
  const renumber = renumberBoxes(ranges);
  for (const b of boxes) b.num = renumber.get(b.num - 1)!;
  boxes.sort((a, b) => a.num - b.num);

  const cols = 3,
    rows = 2;
  const gridTop = legendY - 8 * MM;
  const gridBottom = 18 * MM;
  const cellW = (PAGE_W - 2 * marginX) / cols;
  const cellH = (gridTop - gridBottom) / rows;
  boxes.forEach((box, i) => {
    const col = i % cols,
      row = Math.floor(i / cols);
    const cx = marginX + col * cellW;
    const cy = gridTop - (row + 1) * cellH;
    const roots = [...new Set(box.notes.filter(n => n.isRoot).map(n => n.s))];
    drawBoxDiagram(
      c,
      cx + 8 * MM,
      cy + 12 * MM,
      cellW - 14 * MM,
      cellH - 26 * MM,
      box,
      `Box ${box.num}`,
      rootStringLabel(roots, numStrings),
      numStrings,
    );
  });
  c.text(
    marginX,
    13 * MM,
    "Abstract / key-agnostic: positions are relative — shift the entire shape to place the root on the desired note.",
    7.5,
    SUBTLE,
  );
  finishPage(c, ctx);
}

// ---- 3. 度数付き全指板 ----
export function sectionFullWithDegrees(
  c: Canvas,
  s: Subject,
  ctx: Ctx,
  root: number,
  ranges: readonly (readonly [number, number])[],
  numFrets = 18,
) {
  const marginX = 14 * MM,
    marginTop = 12 * MM;
  const hasBoxes = ranges.length > 0;
  c.text(marginX, PAGE_H - marginTop, `${s.chart.nameEn} — Full Fretboard with Degrees`, 17, BLACK, { bold: true });
  let ty = PAGE_H - marginTop - 6 * MM;
  const bandNote = hasBoxes ? ` Background bands mark the ${ranges.length} box positions.` : "";
  for (const line of [`All notes labeled by degree (${degreeString(s.chart)}).`, `${tuningHeader(s)}.${bandNote}`]) {
    c.text(marginX, ty, line, 10, SUBTLE);
    ty -= 4.5 * MM;
  }
  const legendY = ty - 2 * MM;
  drawLegend(c, marginX, legendY);
  if (hasBoxes) c.text(marginX + 80 * MM, legendY, `Background colors mark the ${ranges.length} boxes.`, 9.5, BLACK);

  const x = marginX,
    w = PAGE_W - 2 * marginX,
    h = 80 * MM,
    y = 45 * MM;
  c.text(
    x,
    y + h + 6 * MM,
    `Example shown in the key of ${NOTES[root]} (${s.chart.nameEn}). Shift the entire pattern to play any key.`,
    10,
    SUBTLE,
  );

  const openW = 8 * MM;
  const nutX = x + openW;
  const fretSpacing = (w - openW) / numFrets;
  const bandH = 5 * MM;
  const bandYBase = y - 11 * MM - bandH;
  const instances: { i: number; lo: number; hi: number }[] = [];
  ranges.forEach(([lo, hi], i) => {
    for (const k of [-2, -1, 0, 1, 2]) {
      const a = lo + 12 * k,
        b = hi + 12 * k;
      if (a >= 1 && b <= numFrets) instances.push({ i, lo: a, hi: b });
    }
  });
  const renumber = renumberBoxes(ranges, numFrets);
  const bandX = (lo: number, hi: number) =>
    [Math.max(x, nutX + (lo - 1) * fretSpacing), nutX + hi * fretSpacing] as const;
  for (const { i, lo, hi } of instances) {
    const [x1, x2] = bandX(lo, hi);
    const col = BOX_COLORS[i % BOX_COLORS.length]!;
    c.rect(x1, y, x2 - x1, h, col);
    c.line(x1, y, x2, y, opaque(col), 1.4);
    c.line(x1, y + h, x2, y + h, opaque(col), 1.4);
  }
  // 帯の名札：位置の順に 2 段へ交互に振り分ける
  const rank = instances.map((_, j) => j).sort((a, b) => instances[a]!.lo - instances[b]!.lo);
  const rowOf = new Map(rank.map((j, n) => [j, n % 2]));
  instances.forEach(({ i, lo, hi }, j) => {
    const [x1, x2] = bandX(lo, hi);
    const col = opaque(BOX_COLORS[i % BOX_COLORS.length]!);
    const by = bandYBase + (rowOf.get(j) === 0 ? 0 : -bandH - 1 * MM);
    c.rect(x1, by, x2 - x1, bandH, col);
    c.text((x1 + x2) / 2, by + 1.6 * MM, `Box ${renumber.get(i)}`, 9, BLACK, { bold: true, align: "center" });
  });

  const geom = drawFretboardGrid(c, x, y, w, h, numFrets, openW, -7 * MM, s.tuning.length, s.capo);
  placeScaleDots(c, geom, y, root, s.chart, numFrets, s.tuning, s.capo);
  finishPage(c, ctx);
}

export type { Ctx };
