/* 参考の本文に挟むコードの図（ローコード・ハイコード）。押さえ方は参考の一覧と同じ描き方で、
   変わる音（em：輪）や動かさない指（keep：緑）を目立たせる。 */
import type { ComponentChildren } from "preact";
import type { Mark } from "../../drill/topic";
import { type Note, type Position, STANDARD, chordSymbol, chordType } from "../../theory";
import { Board, Fig } from "../../ui/LessonFigures";
import { type LabelMode, type Shape, shapeBoard } from "./shape";

const at = (ps: readonly Position[], p: Position) => ps.some(q => q.string === p.string && q.fret === p.fret);

export function ChordFig({
  shape,
  root,
  type,
  mode = "finger",
  title,
  caption,
  em = [],
  keep = [],
  mutedWrong = [],
  verdict,
}: {
  shape: Shape;
  root: Note;
  type: string;
  mode?: LabelMode;
  /** 無ければコード名 */
  title?: string;
  caption?: ComponentChildren;
  em?: readonly Position[];
  keep?: readonly Position[];
  /** 鳴らしてしまう × の弦（赤い ×） */
  mutedWrong?: readonly number[];
  verdict?: "ok" | "ng";
}) {
  const name = chordSymbol(root, chordType(type));
  const b = shapeBoard(STANDARD, shape, root, chordType(type), mode);
  // 2 列に並べても字が読めるよう、見せるフレットは 4 つに詰める（一覧の図は 5 つ）
  const fretted = shape.frets.filter((f): f is number => f !== null && f > 0);
  const lo = Math.min(...fretted);
  const minFret = shape.frets.includes(0) || lo <= 1 ? 0 : lo;
  const range = { minFret, maxFret: Math.max(minFret + 3, ...fretted) };
  const marks: Mark[] = b.marks.map(m =>
    at(em, m.pos) ? { ...m, kind: "target" } : at(keep, m.pos) ? { ...m, kind: "ok" } : m,
  );
  return (
    <Fig title={title ?? name} caption={caption} verdict={verdict}>
      <Board
        tuning={STANDARD}
        label={`${name} の押さえ方`}
        {...b}
        range={range}
        marks={marks}
        mutedWrong={mutedWrong}
      />
    </Fig>
  );
}
