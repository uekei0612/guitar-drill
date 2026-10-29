/* 参考ページの本文に挟む図。仕組み・覚え方のコツ・よくある間違いを、文の横で目に見えるようにする。
   指板図は Fretboard をそのまま使い、鍵盤・音の並び・弦の向き・押さえる位置はここで描く。 */
import { type ComponentChildren, Fragment, createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Mark } from "../drill/topic";
import { type Position, STANDARD, type Tuning, fmt, mod, pcAt, spellings, stringCount } from "../theory";
import { Fretboard, type FretboardProps } from "./Fretboard";

/** 参考ページの指板図が従う設定（チューニングと左利き）。参考を出す画面で渡す */
export const LessonBoard = createContext<{ readonly tuning: Tuning; readonly lefty: boolean }>({
  tuning: STANDARD,
  lefty: false,
});

/** 図 1 つ。title は図の上に太字で、caption は下に説明。verdict を付けると ○／× の枠になる（よくある間違い） */
export function Fig({
  title,
  caption,
  verdict,
  children,
}: {
  title?: string;
  caption?: ComponentChildren;
  verdict?: "ok" | "ng";
  children: ComponentChildren;
}) {
  return (
    <figure class={`lesson-fig${verdict ? ` lesson-fig--${verdict}` : ""}`}>
      {verdict && <span class="lesson-verdict">{verdict === "ok" ? "○ 正しい" : "× 間違い"}</span>}
      {title && <p class="lesson-fig-title">{title}</p>}
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** 図を並べる（スマホで 2 列）。wide は 1 列（指板の長い図） */
export function Figs({ wide = false, children }: { wide?: boolean; children: ComponentChildren }) {
  return <div class={`lesson-figs${wide ? " wide" : ""}`}>{children}</div>;
}

/** 参考ページの指板図。チューニングと左利きは LessonBoard から */
export function Board(props: Omit<FretboardProps, "tuning" | "lefty"> & { tuning?: Tuning }) {
  const ctx = useContext(LessonBoard);
  return <Fretboard {...props} tuning={props.tuning ?? ctx.tuning} lefty={ctx.lefty} />;
}

/** 一部の弦だけの指板（6 弦だけ、6・5 弦だけ）。図の点は元の弦の番号で渡す */
export function SomeStrings({
  strings,
  marks = [],
  ...rest
}: Omit<FretboardProps, "tuning" | "lefty" | "stringNames"> & { strings: readonly number[] }) {
  const { tuning } = useContext(LessonBoard);
  // 低い弦から並べる（Tuning.open と同じ向き）
  const low = [...strings].sort((a, b) => b - a);
  const sub: Tuning = {
    ...tuning,
    id: `${tuning.id}:${low.join("")}`,
    open: low.map(s => tuning.open[stringCount(tuning) - s]!),
  };
  // 新しい弦の番号（1 が高い弦）
  const no = (s: number) => low.length - low.indexOf(s);
  return (
    <Board
      {...rest}
      tuning={sub}
      stringNames={[...low].reverse().map(s => `${s}弦`)}
      marks={marks.map(m => ({ ...m, pos: { string: no(m.pos.string), fret: m.pos.fret } }))}
    />
  );
}

/** 指板上の音名（♯ で書く） */
export const nameAt = (t: Tuning, p: Position): string => fmt(spellings(pcAt(t, p))[0]!);

/** 1 本の弦の音を開放から並べた点（自然音は濃く、♯ は薄く） */
export function stringRun(t: Tuning, string: number, from: number, to: number): Mark[] {
  const out: Mark[] = [];
  for (let fret = from; fret <= to; fret++) {
    const name = nameAt(t, { string, fret });
    out.push({ pos: { string, fret }, kind: name.length > 1 ? "hint" : "tone", label: name });
  }
  return out;
}

/* ---- 音の並び（札を横に並べ、間に半音の数などを書く） ---- */

export interface StepItem {
  readonly label: string;
  /** 下に小さく */
  readonly sub?: string;
  /** hl = 強調、dim = 飛ばす音、ng = 間違い */
  readonly kind?: "hl" | "dim" | "ng";
}

export function Steps({
  items,
  gaps,
  label,
}: {
  items: readonly StepItem[];
  /** 札と札の間（items より 1 つ少ない）。hl で強調 */
  gaps?: readonly { readonly label: string; readonly hl?: boolean }[];
  label?: string;
}) {
  return (
    <div class="steps" role="img" aria-label={label ?? items.map(i => i.label).join(" ")}>
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && gaps && <span class={`step-gap${gaps[i - 1]?.hl ? " hl" : ""}`}>{gaps[i - 1]?.label}</span>}
          <span class={`step-item${it.kind ? ` ${it.kind}` : ""}`}>
            {it.label}
            {it.sub && <small>{it.sub}</small>}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/* ---- 鍵盤 ---- */

const NATURAL = [true, false, true, false, true, true, false, true, false, true, false, true];
const NAMES = ["C", "", "D", "", "E", "F", "", "G", "", "A", "", "B"];

export interface KeyMark {
  /** C からの半音（0〜） */
  readonly semi: number;
  readonly label: string;
  /** root = ルート（オレンジ）、tone = 構成音、em = 目立たせる（輪） */
  readonly kind?: "root" | "tone" | "em";
}

export interface KeyArc {
  readonly from: number;
  readonly to: number;
  readonly label: string;
  /** 鍵盤の下に書く（半音の印など） */
  readonly below?: boolean;
  readonly hl?: boolean;
}

/** C から始まる鍵盤。keys は鍵の数（12 で C〜B、13 で次の C まで） */
export function Keys({
  keys = 12,
  marks = [],
  arcs = [],
  label,
}: {
  keys?: number;
  marks?: readonly KeyMark[];
  arcs?: readonly KeyArc[];
  label: string;
}) {
  const W = 30,
    H = 92,
    BW = 18,
    BH = 56,
    NAME = 18;
  const top = arcs.some(a => !a.below) ? 34 : 4;
  const bottom = arcs.some(a => a.below) ? 34 : 4;
  // 各鍵の左端と、点を置く中心
  const keyList: { semi: number; white: boolean; x: number }[] = [];
  let whites = 0;
  for (let semi = 0; semi < keys; semi++) {
    const white = NATURAL[mod(semi, 12)]!;
    keyList.push({ semi, white, x: white ? whites * W : whites * W - BW / 2 });
    if (white) whites++;
  }
  const cx = (semi: number) => {
    const k = keyList[semi]!;
    return k.x + (k.white ? W : BW) / 2 + 1;
  };
  const cy = (semi: number) => top + (keyList[semi]!.white ? H - 18 : BH - 14);
  // 最後が黒鍵なら、はみ出す半分を足す
  const width = whites * W + (keyList.at(-1)!.white ? 0 : BW / 2 + 6) + 2,
    height = top + H + NAME + bottom;
  const keyY = top;
  return (
    <svg
      class="keys"
      viewBox={`0 0 ${width} ${height}`}
      style={{ maxWidth: `${width * 1.5}px` }}
      role="img"
      aria-label={label}
    >
      {keyList
        .filter(k => k.white)
        .map(k => (
          <rect key={`w${k.semi}`} class="key-white" x={k.x + 1} y={keyY} width={W} height={H} rx={3} />
        ))}
      {keyList
        .filter(k => !k.white)
        .map(k => (
          <rect key={`b${k.semi}`} class="key-black" x={k.x + 1} y={keyY} width={BW} height={BH} rx={2} />
        ))}
      {keyList
        .filter(k => k.white)
        .map(k => (
          <text key={`n${k.semi}`} class="key-name" x={k.x + 1 + W / 2} y={keyY + H + NAME / 2 + 2} aria-hidden="true">
            {NAMES[mod(k.semi, 12)]}
          </text>
        ))}
      {arcs.map((a, i) => {
        const x1 = cx(a.from),
          x2 = cx(a.to),
          mid = (x1 + x2) / 2;
        const y0 = a.below ? keyY + H + NAME + 2 : keyY - 2;
        const dir = a.below ? 1 : -1;
        return (
          <g key={`a${i}`} class={`key-arc${a.hl ? " hl" : ""}`} aria-hidden="true">
            <path d={`M ${x1} ${y0} Q ${mid} ${y0 + dir * 24} ${x2} ${y0}`} />
            <text x={mid} y={y0 + dir * (a.below ? 22 : 20)}>
              {a.label}
            </text>
          </g>
        );
      })}
      {marks.map(m => (
        <g key={`m${m.semi}`} class={`key-mark key-mark--${m.kind ?? "tone"}`} aria-hidden="true">
          <circle cx={cx(m.semi)} cy={cy(m.semi)} r={10} />
          <text x={cx(m.semi)} y={cy(m.semi)}>
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** C をルートにしたコードの鍵盤。音と、隣の音との間の半音の数（弧）。tones は [度数, C からの半音] */
export function ChordKeys({
  name,
  tones,
  caption,
  verdict,
  em = [],
}: {
  name: string;
  tones: readonly (readonly [string, number])[];
  caption?: ComponentChildren;
  verdict?: "ok" | "ng";
  /** 輪で目立たせる音（C からの半音） */
  em?: readonly number[];
}) {
  const marks: KeyMark[] = tones.map(([label, semi]) => ({
    semi,
    label,
    kind: em.includes(semi) ? "em" : semi === 0 ? "root" : "tone",
  }));
  const arcs = tones.slice(1).map(([, semi], i) => ({ from: tones[i]![1], to: semi, label: `${semi - tones[i]![1]}` }));
  const keys = Math.max(12, ...tones.map(t => t[1] + 1));
  return (
    <Fig title={name} caption={caption} verdict={verdict}>
      <Keys keys={keys} marks={marks} arcs={arcs} label={`${name}：${tones.map(t => t[0]).join(" ")}`} />
    </Fig>
  );
}

/* ---- 弦の向き（構えて見下ろしたとき／TAB 譜） ---- */

/** 6 本の弦を横に描き、上に来る弦を選ぶ。太さは実物と同じ向き（6 弦が太い） */
export function StringOrder({ top, label }: { top: 6 | 1; label: string }) {
  const { tuning } = useContext(LessonBoard);
  const n = Math.min(6, stringCount(tuning));
  const rows = Array.from({ length: n }, (_, i) => (top === 6 ? n - i : i + 1));
  const G = 22,
    y0 = 14;
  return (
    <svg class="string-order" viewBox={`0 0 150 ${y0 * 2 + (n - 1) * G}`} role="img" aria-label={label}>
      {rows.map((s, i) => (
        <g key={s}>
          <text class={`so-name${s === 1 || s === n ? " end" : ""}`} x={2} y={y0 + i * G}>
            {s}弦 {fmt(tuning.open[stringCount(tuning) - s]!)}
          </text>
          <line
            class="so-line"
            x1={58}
            y1={y0 + i * G}
            x2={148}
            y2={y0 + i * G}
            style={{ strokeWidth: 0.8 + s * 0.55 }}
          />
        </g>
      ))}
    </svg>
  );
}

/* ---- 押さえる位置（フレットのすぐ手前か、真ん中か） ---- */

export function PressSpot({ at, barre = false, label }: { at: "near" | "middle"; barre?: boolean; label: string }) {
  const { lefty } = useContext(LessonBoard);
  const strings = [20, 40, 60];
  // ヘッド側を左に描き、押さえるフレット（右の線）の手前に点を置く。左利きは左右反転
  const W = 160;
  const fx = (x: number) => (lefty ? W - x : x);
  const x = at === "near" ? 116 : 80;
  return (
    <svg class="press-spot" viewBox={`0 0 ${W} 100`} role="img" aria-label={label}>
      <rect class="fb-board" x={0} y={6} width={W} height={68} />
      {[30, 134].map(w => (
        <line key={w} class="fb-wire" x1={fx(w)} y1={6} x2={fx(w)} y2={74} style={{ strokeWidth: 5 }} />
      ))}
      {strings.map(y => (
        <line key={y} class="fb-string" x1={0} y1={y} x2={W} y2={y} style={{ strokeWidth: 1.5 }} />
      ))}
      {barre ? (
        <rect class="press-dot" x={fx(x) - 9} y={9} width={18} height={62} rx={9} />
      ) : (
        <circle class="press-dot" cx={fx(x)} cy={40} r={11} />
      )}
      <text class="press-note" x={fx(30)} y={92}>
        {lefty ? "ヘッド→" : "←ヘッド"}
      </text>
      <text class="press-note" x={fx(134)} y={92}>
        フレット
      </text>
    </svg>
  );
}
