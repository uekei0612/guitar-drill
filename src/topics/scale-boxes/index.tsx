/* 分野：スケールのボックス（guitar_chart 連携）。guitar_chart で見て覚え、ここで覚えたか確かめる。
   スケールの度数とボックスの位置はチャート（src/chart。旧 guitar_chart）と同じ計算を使い、
   チャートの図や PDF と同じ形で出題する。item はスケール × ルート × ボックスで、形式は毎回選ぶ：
   - ボックスの中の点を示して「何度？」（4択）
   - 「ボックスの R を全部タップ」
   - 「このボックスで抜けている音をタップ」 */
import { useState } from "preact/hooks";
import { pick, shuffle } from "../../drill/rng";
import type { Mark, Question, Topic } from "../../drill/topic";
import { type FretSpan, boxesFor, playableSpan } from "../../chart/boxes";
import { CHART_SCALES, scaleChart } from "../../chart/registry";
import { type Position, type Tuning, degree, degreeLabel, midiAt, mod, pcAt, stringCount } from "../../theory";
import { Fretboard } from "../../ui/Fretboard";
import { ChartLink } from "../../ui/ChartLink";

export interface ScaleBoxSettings {
  /** guitar_chart のスケールの ID */
  readonly scales: readonly string[];
  /** ルートのピッチクラス */
  readonly roots: readonly number[];
}

/** ボックスのあるスケール（guitar_chart の並び順） */
export const BOX_SCALES = CHART_SCALES.filter(c => c.boxRanges.length).map(c => c.id);

const DEFAULTS: ScaleBoxSettings = { scales: ["minor_pentatonic"], roots: [9] };

function parse(raw: unknown): ScaleBoxSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const scales = Array.isArray(r.scales) ? BOX_SCALES.filter(s => (r.scales as unknown[]).includes(s)) : [];
  const roots = Array.isArray(r.roots)
    ? [...new Set(r.roots.filter((p): p is number => Number.isInteger(p) && p >= 0 && p < 12))].sort((a, b) => a - b)
    : [];
  return { scales: scales.length ? scales : DEFAULTS.scales, roots: roots.length ? roots : DEFAULTS.roots };
}

const scaleName = (id: string) => scaleChart(id)!.name;
const isMinorish = (id: string) => scaleChart(id)!.degrees.includes("b3");
/** スケール・チューニング・ルートのボックス（チャートと同じ計算） */
const boxesOf = (scale: string, t: Tuning, rootPc: number) => boxesFor(scaleChart(scale)!, rootPc, t);
/** ルートの表記。短 3 度を含むスケールは C♯・G♯、それ以外は D♭・A♭ */
const MAJOR_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const MINOR_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
const rootName = (scale: string, p: number) => (isMinorish(scale) ? MINOR_NAMES : MAJOR_NAMES)[p]!;

/** 高すぎるボックスは 1 オクターブ下の同じ形にする（15 フレットより上は弾きにくく、図も長くなる） */
const playable = playableSpan;

export interface BoxNote {
  readonly pos: Position;
  /** 度数（画面の表記：R、♭3 …） */
  readonly label: string;
}

/** ボックスの中のスケールの音（guitar_chart と同じく lo〜hi フレットを含む） */
export function boxNotes(t: Tuning, scale: string, rootPc: number, span: FretSpan): BoxNote[] {
  const c = scaleChart(scale)!;
  const labels: Record<string, string> = Object.fromEntries(c.intervals.map((iv, i) => [String(iv), c.degrees[i]!]));
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

/** ボックスの中の音を低い順に（同じ高さは 1 つ） */
const ascending = (t: Tuning, ns: readonly BoxNote[]) =>
  [...new Map(ns.map(n => [midiAt(t, n.pos), n])).entries()].sort((a, b) => a[0] - b[0]);

/** いちばん低い R から 1 オクターブ上の R まで、ボックスの音で上がる */
function scaleRun(t: Tuning, ns: readonly BoxNote[]): number[] {
  const up = ascending(t, ns);
  const lo = up.find(([, n]) => n.label === "R")?.[0] ?? up[0]![0];
  return up.map(([m]) => m).filter(m => m >= lo && m <= lo + 12);
}

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
      settings.roots.flatMap(p => boxesOf(scale, t, p).map((_, i) => `${scale}:${p}:${i + 1}`)),
    );
  },

  itemLabel(id) {
    const { scale, rootPc, box } = parseItem(id);
    return `${rootName(scale, rootPc)} ${scaleName(scale)} ボックス ${box}`;
  },

  question(id, { common: { tuning: t } }, rng): Question {
    const { scale, rootPc, box } = parseItem(id);
    const span = playable(boxesOf(scale, t, rootPc)[box - 1]!);
    const range = { minFret: span[0], maxFret: span[1] };
    const notes = boxNotes(t, scale, rootPc, span);
    const title = `${rootName(scale, rootPc)} ${scaleName(scale)} ボックス ${box}`;
    const roots = notes.filter(n => n.label === "R");
    const degrees = scaleChart(scale)!.degrees.map(d => degreeLabel(degree(d)));
    const base = {
      item: id,
      explanation: {
        text: `${title}（${span[0]}〜${span[1]} フレット）\n${scaleName(scale)}の度数：${degrees.join(" ")}`,
        board: { range, marks: toMarks(notes) },
      },
      chart: { scale, rootPc, box, flat: rootName(scale, rootPc).includes("♭") },
      sound: { notes: scaleRun(t, notes) },
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
    // 何度？は、いちばん近い R と ? の 2 音
    const tm = midiAt(t, target.pos);
    const rm = roots.map(n => midiAt(t, n.pos)).sort((a, b) => Math.abs(a - tm) - Math.abs(b - tm))[0];
    return {
      ...base,
      ...(rm !== undefined && { sound: { notes: [rm, tm], chord: true } }),
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

  reference: ({ ctx }) => <BoxSheet tuning={ctx.common.tuning} lefty={ctx.common.lefty} settings={ctx.settings} />,
};

/** 参考：設定で選んだスケール × キーをめくって見る */
function BoxSheet({ tuning: t, lefty, settings }: { tuning: Tuning; lefty: boolean; settings: ScaleBoxSettings }) {
  const pages = settings.scales.flatMap(scale => settings.roots.map(rootPc => ({ scale, rootPc })));
  const [idx, setIdx] = useState(0);
  const { scale, rootPc } = pages[idx % pages.length]!;
  const go = (d: number) => setIdx(i => (i + d + pages.length) % pages.length);
  const spans = boxesOf(scale, t, rootPc).map(playable);
  const title = `${rootName(scale, rootPc)} ${scaleName(scale)}`;
  const degrees = scaleChart(scale)!.degrees.map(d => degreeLabel(degree(d)));
  return (
    <>
      {pages.length > 1 && (
        <div class="pager" role="group" aria-label="スケールとキーをめくる">
          <button class="btn" onClick={() => go(-1)} aria-label="前へ">
            ←
          </button>
          <h2 aria-live="polite">{title}</h2>
          <button class="btn" onClick={() => go(1)} aria-label="次へ">
            →
          </button>
        </div>
      )}
      <p>
        {pages.length > 1 ? "" : `${title}。`}度数：{degrees.join(" ")}
        。ボックスの位置はチャートと同じ（設定で選んだスケールとキーをめくれる）。
      </p>
      <ChartLink chart={{ scale, rootPc, flat: rootName(scale, rootPc).includes("♭") }} />
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
                lefty={lefty}
                label={`${title} ボックス ${i + 1}`}
                marks={toMarks(boxNotes(t, scale, rootPc, span))}
              />
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
