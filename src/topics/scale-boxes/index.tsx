/* 分野：スケールのボックス（guitar_chart 連携）。guitar_chart で見て覚え、ここで覚えたか確かめる。
   スケールの度数とボックスの位置は guitar_chart から取り込んだもの（src/data/guitar-chart.json）を使い、
   印刷した資料と同じ形で出題する。item はスケール × ルート × ボックスで、形式は毎回選ぶ：
   - ボックスの中の点を示して「何度？」（4択）
   - 「ボックスの R を全部タップ」
   - 「このボックスで抜けている音をタップ」 */
import { pick, shuffle } from "../../drill/rng";
import type { Mark, Question, Topic } from "../../drill/topic";
import { type FretSpan, GUITAR_CHART, boxesOf } from "../../data/guitar-chart";
import {
  type Position,
  type ScaleId,
  type Tuning,
  SCALES,
  degree,
  degreeLabel,
  mod,
  pcAt,
  stringCount,
} from "../../theory";
import { Fretboard } from "../../ui/Fretboard";
import { GuitarChartLink } from "../../ui/GuitarChartLink";

export interface ScaleBoxSettings {
  /** guitar_chart のスケールの ID */
  readonly scales: readonly string[];
  /** ルートのピッチクラス */
  readonly roots: readonly number[];
}

/** ボックスのあるスケール（guitar_chart の並び順） */
export const BOX_SCALES = Object.entries(GUITAR_CHART.scales)
  .filter(([, s]) => s.has_boxes)
  .map(([id]) => id);

const DEFAULTS: ScaleBoxSettings = { scales: ["minor_pentatonic"], roots: [9] };

function parse(raw: unknown): ScaleBoxSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const scales = Array.isArray(r.scales) ? BOX_SCALES.filter(s => (r.scales as unknown[]).includes(s)) : [];
  const roots = Array.isArray(r.roots)
    ? [...new Set(r.roots.filter((p): p is number => Number.isInteger(p) && p >= 0 && p < 12))].sort((a, b) => a - b)
    : [];
  return { scales: scales.length ? scales : DEFAULTS.scales, roots: roots.length ? roots : DEFAULTS.roots };
}

const scaleName = (id: string) => SCALES[id as ScaleId]?.name ?? GUITAR_CHART.scales[id]!.name;
const isMinorish = (id: string) => Object.values(GUITAR_CHART.scales[id]!.degree_labels).includes("b3");
/** ルートの表記。短 3 度を含むスケールは C♯・G♯、それ以外は D♭・A♭ */
const MAJOR_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const MINOR_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
const rootName = (scale: string, p: number) => (isMinorish(scale) ? MINOR_NAMES : MAJOR_NAMES)[p]!;

/** 高すぎるボックスは 1 オクターブ下の同じ形にする（15 フレットより上は弾きにくく、図も長くなる） */
const playable = ([lo, hi]: FretSpan): FretSpan => (hi > 15 && lo >= 12 ? [lo - 12, hi - 12] : [lo, hi]);

export interface BoxNote {
  readonly pos: Position;
  /** 度数（画面の表記：R、♭3 …） */
  readonly label: string;
}

/** ボックスの中のスケールの音（guitar_chart と同じく lo〜hi フレットを含む） */
export function boxNotes(t: Tuning, scale: string, rootPc: number, span: FretSpan): BoxNote[] {
  const labels = GUITAR_CHART.scales[scale]!.degree_labels;
  const out: BoxNote[] = [];
  for (let string = 1; string <= stringCount(t); string++)
    for (let fret = span[0]; fret <= span[1]; fret++) {
      const l = labels[String(mod(pcAt(t, { string, fret }) - rootPc, 12))];
      if (l) out.push({ pos: { string, fret }, label: degreeLabel(degree(l)) });
    }
  return out;
}

const toMarks = (ns: readonly BoxNote[]): Mark[] =>
  ns.map(n => ({ pos: n.pos, kind: n.label === "R" ? "root" : "tone", label: n.label }));

function parseItem(id: string) {
  const [scale, p, box] = id.split(":") as [string, string, string];
  return { scale, rootPc: Number(p), box: Number(box) };
}

export const scaleBoxes: Topic<ScaleBoxSettings> = {
  id: "scale-boxes",
  level: "intermediate",
  title: "スケールのボックス",
  settings: {
    defaults: DEFAULTS,
    parse,
    view: ({ value, onChange }) => (
      <>
        <fieldset class="field">
          <legend>スケール</legend>
          {BOX_SCALES.map(s => (
            <label key={s} class="check">
              <input
                type="checkbox"
                checked={value.scales.includes(s)}
                onChange={e => {
                  const scales = e.currentTarget.checked ? [...value.scales, s] : value.scales.filter(x => x !== s);
                  if (scales.length) onChange({ ...value, scales: BOX_SCALES.filter(x => scales.includes(x)) });
                }}
              />
              <span>{scaleName(s)}</span>
            </label>
          ))}
        </fieldset>
        <fieldset class="field">
          <legend>キー（ルート）</legend>
          <div class="chips">
            {MAJOR_NAMES.map((_, p) => (
              <label key={p} class="check">
                <input
                  type="checkbox"
                  checked={value.roots.includes(p)}
                  onChange={e => {
                    const roots = e.currentTarget.checked ? [...value.roots, p] : value.roots.filter(x => x !== p);
                    if (roots.length) onChange({ ...value, roots: [...roots].sort((a, b) => a - b) });
                  }}
                />
                <span>
                  {MINOR_NAMES[p] === MAJOR_NAMES[p] ? MAJOR_NAMES[p] : `${MINOR_NAMES[p]}/${MAJOR_NAMES[p]}`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </>
    ),
  },

  items({ common: { tuning: t }, settings }) {
    return settings.scales.flatMap(scale =>
      settings.roots.flatMap(p => (boxesOf(scale, t.id, p) ?? []).map((_, i) => `${scale}:${p}:${i + 1}`)),
    );
  },

  itemLabel(id) {
    const { scale, rootPc, box } = parseItem(id);
    return `${rootName(scale, rootPc)} ${scaleName(scale)} ボックス ${box}`;
  },

  question(id, { common: { tuning: t } }, rng): Question {
    const { scale, rootPc, box } = parseItem(id);
    const span = playable(boxesOf(scale, t.id, rootPc)![box - 1]!);
    const range = { minFret: span[0], maxFret: span[1] };
    const notes = boxNotes(t, scale, rootPc, span);
    const title = `${rootName(scale, rootPc)} ${scaleName(scale)} ボックス ${box}`;
    const roots = notes.filter(n => n.label === "R");
    const base = {
      item: id,
      explanation: { text: `${title}（${span[0]}〜${span[1]} フレット）`, board: { range, marks: toMarks(notes) } },
      guitarChart: { scale, rootPc, box, flat: rootName(scale, rootPc).includes("♭") },
    };
    // ボックスに R が無いことは無いが、念のため「何度？」に寄せる
    const kind = pick(rng, roots.length ? (["deg", "roots", "missing"] as const) : (["deg", "missing"] as const));
    if (kind === "roots")
      return {
        ...base,
        prompt: { text: `${title}：R（${rootName(scale, rootPc)}）を全部タップ（${roots.length} か所）` },
        answer: { kind: "tap", mode: "all", range, correct: roots.map(n => n.pos) },
      };
    if (kind === "missing") {
      const hidden = shuffle(rng, notes).slice(0, notes.length > 6 ? 2 : 1);
      const shown = notes.filter(n => !hidden.includes(n));
      return {
        ...base,
        prompt: {
          text: `${title}：抜けている音を全部タップ（${hidden.length} か所）`,
          board: { range, marks: toMarks(shown) },
        },
        answer: { kind: "tap", mode: "all", range, correct: hidden.map(n => n.pos) },
      };
    }
    const target = pick(
      rng,
      notes.filter(n => n.label !== "R"),
    );
    const labels = [...new Set(notes.map(n => n.label))].filter(l => l !== "R" && l !== target.label);
    return {
      ...base,
      prompt: {
        text: `${title}：? は何度？`,
        board: {
          range,
          marks: [
            ...roots.map(n => ({ pos: n.pos, kind: "hint" as const, label: "R" })),
            { pos: target.pos, kind: "target" },
          ],
        },
      },
      answer: {
        kind: "choice",
        options: shuffle(rng, [target.label, ...shuffle(rng, labels).slice(0, 3)]),
        correct: target.label,
      },
    };
  },

  reference: ({ ctx }) => {
    const t = ctx.common.tuning;
    const scale = ctx.settings.scales[0]!;
    const rootPc = ctx.settings.roots[0]!;
    const spans = (boxesOf(scale, t.id, rootPc) ?? []).map(playable);
    const title = `${rootName(scale, rootPc)} ${scaleName(scale)}`;
    return (
      <>
        <p>{title}のボックス（設定で選んだ最初のスケールとキー）。度数とボックスの位置は guitar_chart の資料と同じ。</p>
        <GuitarChartLink chart={{ scale, rootPc, flat: rootName(scale, rootPc).includes("♭") }} />
        <dl class="ref-list">
          {spans.map((span, i) => (
            <div key={i}>
              <dt>
                ボックス {i + 1}（{span[0]}〜{span[1]} フレット）
              </dt>
              <dd>
                <Fretboard
                  tuning={t}
                  range={{ minFret: span[0], maxFret: span[1] }}
                  lefty={ctx.common.lefty}
                  label={`${title} ボックス ${i + 1}`}
                  marks={toMarks(boxNotes(t, scale, rootPc, span))}
                />
              </dd>
            </div>
          ))}
        </dl>
      </>
    );
  },
};
