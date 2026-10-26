/* 指板図。表示・出題（点を示す）・回答（タップ）・解説のすべてで使う。 */
import { useRef, useState } from "preact/hooks";
import type { Mark } from "../drill/topic";
import { type FretRange, type Position, type Tuning, stringCount } from "../theory";
import { type Cell, type Orientation, chooseOrientation, layout } from "./fretboard-layout";

export interface FretboardProps {
  readonly tuning: Tuning;
  readonly range: FretRange;
  /** 図全体の説明（読み上げ用） */
  readonly label: string;
  readonly marks?: readonly Mark[];
  /** 回答中に押した点 */
  readonly selected?: readonly Position[];
  readonly lefty?: boolean;
  readonly orientation?: Orientation;
  /** 渡すとタップで答えられる */
  readonly onTap?: (pos: Position) => void;
  /** タップするマスの読み上げ（既定は「6弦 5フレット」） */
  readonly hitLabel?: (pos: Position) => string;
  /** ボックスの帯（チャート）。color は 0〜4 */
  readonly bands?: readonly Band[];
  /** カポのフレット（0 なら無し） */
  readonly capo?: number;
  /** 押せる弦（無ければ全部）。ほかの弦は薄く出す */
  readonly tapStrings?: readonly number[];
  /** 押せるフレット（無ければ range 全部）。ほかのフレットは薄く覆う */
  readonly tapFrets?: FretRange;
  /** 弦ごとの札（1 弦から。開放弦の音名など）。無ければ弦の番号を書く */
  readonly stringNames?: readonly string[];
}

export interface Band {
  readonly lo: number;
  readonly hi: number;
  readonly color: number;
  readonly label: string;
  readonly selected?: boolean;
  readonly dimmed?: boolean;
}

const same = (a: Position, b: Position) => a.string === b.string && a.fret === b.fret;

export const posLabel = (p: Position): string => `${p.string}弦 ${p.fret === 0 ? "開放" : `${p.fret}フレット`}`;

/** 矢印キーで、画面上その向きにいちばん近いマスへ */
function neighbor(cells: readonly Cell[], from: Cell, key: string): Cell | undefined {
  const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
  if (!dir) return undefined;
  const [dx, dy] = dir as [number, number];
  let best: Cell | undefined,
    bestD = Infinity;
  for (const c of cells) {
    const vx = c.c.x - from.c.x,
      vy = c.c.y - from.c.y;
    const forward = vx * dx + vy * dy;
    const side = Math.abs(vx * dy - vy * dx);
    if (forward <= 0 || side > 1) continue;
    if (forward < bestD) [best, bestD] = [c, forward];
  }
  return best;
}

export function Fretboard({
  tuning,
  range,
  label,
  marks = [],
  selected = [],
  lefty = false,
  orientation,
  onTap,
  hitLabel = posLabel,
  bands = [],
  capo = 0,
  stringNames,
  tapStrings,
  tapFrets,
}: FretboardProps) {
  const L = layout(stringCount(tuning), range, lefty, orientation ?? chooseOrientation(range));
  const canTap = (p: Position) =>
    (!tapStrings || tapStrings.includes(p.string)) &&
    (!tapFrets || (p.fret >= tapFrets.minFret && p.fret <= tapFrets.maxFret));
  const hits = L.cells.filter(c => canTap(c.pos));
  // 押せないフレットを覆う帯（押せる範囲の手前と先）
  const offSpans = tapFrets
    ? [L.span(range.minFret, tapFrets.minFret - 1), L.span(tapFrets.maxFret + 1, range.maxFret)].filter(r => !!r)
    : [];
  const capoCells = capo > 0 ? L.cells.filter(c => c.pos.fret === capo) : [];
  const [focus, setFocus] = useState(0);
  const refs = useRef<(SVGRectElement | null)[]>([]);

  const onKey = (i: number, e: KeyboardEvent) => {
    const cell = hits[i]!;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap?.(cell.pos);
      return;
    }
    const next = neighbor(hits, cell, e.key);
    if (!next) return;
    e.preventDefault();
    const j = hits.indexOf(next);
    setFocus(j);
    refs.current[j]?.focus();
  };

  return (
    <svg
      class={`fretboard fretboard--${L.orientation}`}
      viewBox={`0 0 ${L.width} ${L.height}`}
      style={{ maxWidth: `${L.width}px` }}
      role={onTap ? "group" : "img"}
      aria-label={label}
    >
      <rect class="fb-board" x={L.board.x} y={L.board.y} width={L.board.w} height={L.board.h} />
      {bands.map((b, i) => {
        const r = L.span(b.lo, b.hi);
        if (!r) return null;
        return (
          <g
            key={`b${i}`}
            class={`fb-band fb-band--${b.color % 5}${b.selected ? " selected" : ""}${b.dimmed ? " dimmed" : ""}`}
          >
            <rect x={r.x} y={r.y} width={r.w} height={r.h} />
            <text x={r.x + 4} y={r.y + 4} aria-hidden="true">
              {b.label}
            </text>
          </g>
        );
      })}
      {L.inlays.map((p, i) => (
        <circle key={`i${i}`} class="fb-inlay" cx={p.x} cy={p.y} r={L.r * 0.4} />
      ))}
      {L.wires.map((w, i) => (
        <line key={`w${i}`} class={w.nut ? "fb-nut" : "fb-wire"} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} />
      ))}
      {L.strings.map((s, i) => (
        <line
          key={`s${i}`}
          class={`fb-string${tapStrings && !tapStrings.includes(i + 1) ? " off" : ""}`}
          x1={s.a.x}
          y1={s.a.y}
          x2={s.b.x}
          y2={s.b.y}
          style={{ strokeWidth: 1 + i * 0.3 }}
        />
      ))}
      {offSpans.map((r, i) => (
        <rect key={`off${i}`} class="fb-off" x={r.x} y={r.y} width={r.w} height={r.h} aria-hidden="true" />
      ))}
      {capoCells.length > 0 && (
        <line
          class="fb-capo"
          x1={capoCells[0]!.c.x}
          y1={capoCells[0]!.c.y}
          x2={capoCells[capoCells.length - 1]!.c.x}
          y2={capoCells[capoCells.length - 1]!.c.y}
          aria-hidden="true"
        />
      )}
      {L.fretLabels.map(f => (
        <text key={`f${f.fret}`} class="fb-fretno" x={f.x} y={f.y} aria-hidden="true">
          {f.fret}
        </text>
      ))}
      {L.stringLabels.map(l => (
        <text
          key={`sl${l.string}`}
          class={stringNames ? "fb-stringname" : "fb-fretno"}
          x={l.x}
          y={l.y}
          aria-hidden="true"
        >
          {stringNames ? stringNames[l.string - 1] : l.string}
        </text>
      ))}
      {marks.map(m => {
        const c = L.cellAt(m.pos);
        if (!c) return null;
        return (
          <g key={`m${m.pos.string}:${m.pos.fret}`} class={`fb-mark fb-mark--${m.kind}`} aria-hidden="true">
            <circle cx={c.c.x} cy={c.c.y} r={L.r} />
            {(m.label ?? (m.kind === "target" ? "?" : "")) && (
              <text x={c.c.x} y={c.c.y}>
                {m.label ?? "?"}
              </text>
            )}
          </g>
        );
      })}
      {selected.map(p => {
        const c = L.cellAt(p);
        return c ? (
          <circle
            key={`sel${p.string}:${p.fret}`}
            class="fb-selected"
            cx={c.c.x}
            cy={c.c.y}
            r={L.r + 3}
            aria-hidden="true"
          />
        ) : null;
      })}
      {onTap &&
        hits.map((c, i) => (
          <rect
            key={`h${i}`}
            ref={el => void (refs.current[i] = el)}
            class="fb-hit"
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            role="button"
            tabindex={i === focus ? 0 : -1}
            aria-label={hitLabel(c.pos)}
            aria-pressed={selected.some(p => same(p, c.pos))}
            onClick={() => {
              setFocus(i);
              onTap(c.pos);
            }}
            onKeyDown={e => onKey(i, e)}
          />
        ))}
    </svg>
  );
}
