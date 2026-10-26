/* 分野：度数の位置。ルートを指板に示し、「3度はどこ？」をタップで答える（オクターブ違いもすべて正解）。
   逆に、点を示して「ルートから何度？」を 4択で答える。ルートの位置は毎回変える（形で覚えるため）。 */
import { pick, shuffle } from "../../drill/rng";
import type { Hint, Mark, Question, Topic } from "../../drill/topic";
import {
  type FretRange,
  type Position,
  type Tuning,
  degree,
  degreeLabel,
  midiAt,
  mod,
  openMidis,
  pcAt,
  positionsOf,
  semitones,
  stringCount,
} from "../../theory";
import { Fretboard } from "../../ui/Fretboard";
import { intervalName } from "../chord-tones";

/** 覚える順（5 度・3 度から） */
export const DEGREES = ["5", "3", "b3", "b7", "7", "4", "2", "6", "b6", "b2", "b5"] as const;
/** 半音数 → 度数の表記（選択肢に使う） */
const LABEL_BY_SEMIS = ["R", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"].map(d =>
  degreeLabel(degree(d)),
);

/** ルートを置く弦 */
const ROOT_STRINGS = [6, 5, 4, 3];
const WIDTH = 6;

function setup(t: Tuning, rng: () => number) {
  const string = pick(
    rng,
    ROOT_STRINGS.filter(s => s <= stringCount(t)),
  );
  const fret = 2 + Math.floor(rng() * 9); // 2〜10 フレット
  const root: Position = { string, fret };
  const range: FretRange = { minFret: fret - 2, maxFret: fret - 2 + WIDTH - 1 };
  return { root, range, rootPc: pcAt(t, root) };
}

/** R から見た位置の言い方（「1 本細い弦・2 フレット ヘッド側」）。左利きの図でも通じるよう左右は使わない */
export function shapeHint(root: Position, p: Position): string {
  const ds = root.string - p.string,
    df = p.fret - root.fret;
  const str = ds === 0 ? "同じ弦" : `${Math.abs(ds)} 本${ds > 0 ? "細い" : "太い"}弦`;
  const fret = df === 0 ? "同じフレット" : `${Math.abs(df)} フレット ${df > 0 ? "ボディ側" : "ヘッド側"}`;
  return `${str}・${fret}`;
}

/** R から近い順（弦をまたぐ数とフレットの差が小さい順） */
const nearest = (root: Position, ps: readonly Position[]) =>
  [...ps]
    .filter(p => Math.abs(p.string - root.string) <= 2)
    .sort(
      (a, b) =>
        Math.abs(a.string - root.string) +
        Math.abs(a.fret - root.fret) -
        (Math.abs(b.string - root.string) + Math.abs(b.fret - root.fret)),
    );

/** R と p の間で、隣の弦との差が半音 5 つでない所（レギュラーなら 3弦→2弦）。形がずれる */
function crossNote(t: Tuning, root: Position, p: Position): string | undefined {
  const open = openMidis(t);
  const lo = Math.min(root.string, p.string),
    hi = Math.max(root.string, p.string);
  for (let s = hi; s > lo; s--) {
    const k = open[stringCount(t) - (s - 1)]! - open[stringCount(t) - s]!;
    if (k !== 5)
      return `${s}弦と${s - 1}弦の間は半音 ${k}（ほかは 5）なので、またぐと形が ${Math.abs(5 - k)} フレットずれる`;
  }
  return undefined;
}

/** レギュラーで 3弦→2弦だけ 4 になる注意書き */
const standardTail = (t: Tuning) => (t.id === "standard" ? "（3弦→2弦だけは 4 フレット手前）" : "");

/** ヒント：? と同じ音名を R の弦の上に置き直して見せる（同じ弦ならフレットを数えるだけ） */
function sameStringHint(t: Tuning, root: Position, target: Position, range: FretRange): Hint {
  if (target.string === root.string)
    return { text: "R と同じ弦。R から何フレット離れているか（1 フレット＝半音 1 つ）を数える" };
  const pc = pcAt(t, target);
  const on = positionsOf(t, pc, range).filter(p => p.string === root.string && p.fret !== root.fret);
  // ボディ側（R より高い音）を先に。ヘッド側しか無ければ 12 から引く
  const p = [...on].sort((a, b) => Number(a.fret < root.fret) - Number(b.fret < root.fret) || a.fret - b.fret)[0];
  const tip =
    target.string < root.string
      ? `1 本細い弦の音は、同じ弦の 5 フレット先と同じ${standardTail(t).replace("手前", "先")}`
      : `1 本太い弦の音は、同じ弦の 5 フレット手前と同じ${standardTail(t).replace("3弦→2弦", "2弦→3弦")}`;
  if (!p) return { text: `${tip}。? を R の弦の上に置き直して、R から何フレットかを数える` };
  return {
    text: `? と同じ音名を R の弦に置き直すと薄い点。R から何フレット離れているかを数える${p.fret < root.fret ? "（ヘッド側にあるので、離れた数を 12 から引く）" : ""}`,
    marks: [{ pos: p, kind: "hint", label: "?" }],
  };
}

export const intervals: Topic = {
  id: "intervals",
  level: "intermediate",
  title: "度数の位置",

  items: () => DEGREES.flatMap(d => [`tap:${d}`, `name:${d}`]),

  itemLabel(id) {
    const [kind, d] = id.split(":") as [string, string];
    const label = degreeLabel(degree(d));
    return kind === "tap" ? `${label} の位置` : `${label} を見分ける`;
  },

  question(id, { common: { tuning: t } }, rng): Question {
    const [kind, d] = id.split(":") as [string, string];
    const semis = semitones(degree(d));
    const label = degreeLabel(degree(d));
    const { root, range, rootPc } = setup(t, rng);
    const targets = positionsOf(t, mod(rootPc + semis, 12), range);
    const roots = positionsOf(t, rootPc, range);
    const rootMark: Mark = { pos: root, kind: "root", label: "R" };
    // 「何度？」は示した点、タップは R にいちばん近い点で、形の言い方と音を出す
    const target = kind === "tap" ? (nearest(root, targets)[0] ?? targets[0]!) : pick(rng, targets);
    const cross = crossNote(t, root, target);
    const explanation = {
      text: [
        `R から ${label}：${intervalName(degree(d))}（半音 ${semis}）`,
        `${kind === "tap" ? "近い形" : "? の位置"}：R から ${shapeHint(root, target)}`,
        ...(cross ? [cross] : []),
      ].join("\n"),
      board: {
        range,
        marks: [
          ...roots.map(p => ({ pos: p, kind: "root" as const, label: "R" })),
          ...targets.map(p => ({ pos: p, kind: "tone" as const, label })),
        ],
      },
    };
    const sound = { notes: [midiAt(t, root), midiAt(t, target)], chord: true };
    if (kind === "tap")
      return {
        item: id,
        prompt: {
          text: `R から ${label}（${intervalName(degree(d))}）の位置をタップ（どのオクターブでもよい）`,
          board: { range, marks: [rootMark] },
        },
        answer: { kind: "tap", mode: "any", range, correct: targets },
        hint: {
          text: `${label}は半音 ${semis}。R と同じ弦なら ${semis} フレット先。1 本細い弦へ移ると同じ音は 5 フレット手前${standardTail(t)}`,
        },
        explanation,
        sound,
      };
    const correct = LABEL_BY_SEMIS[semis]!;
    const near = shuffle(
      rng,
      [1, -1, 2, -2].map(x => LABEL_BY_SEMIS[mod(semis + x, 12)]!).filter(x => x !== "R"),
    );
    return {
      item: id,
      prompt: {
        text: "R から見て ? は何度？",
        board: { range, marks: [rootMark, { pos: target, kind: "target" }] },
      },
      answer: { kind: "choice", options: shuffle(rng, [correct, ...near.slice(0, 3)]), correct },
      hint: sameStringHint(t, root, target, range),
      explanation,
      sound,
    };
  },

  reference: ({ ctx }) => {
    const t = ctx.common.tuning;
    const root: Position = { string: Math.min(6, stringCount(t)), fret: 5 };
    const range = { minFret: 3, maxFret: 8 };
    const rootPc = pcAt(t, root);
    const marks: Mark[] = [];
    for (let s = 1; s <= stringCount(t); s++)
      for (let f = range.minFret; f <= range.maxFret; f++) {
        const semis = mod(pcAt(t, { string: s, fret: f }) - rootPc, 12);
        marks.push({ pos: { string: s, fret: f }, kind: semis === 0 ? "root" : "hint", label: LABEL_BY_SEMIS[semis] });
      }
    return (
      <>
        <p>
          6弦 5フレットをルートにしたときの度数。ルートが動いても形は同じ（3弦から2弦に移るところだけ 1
          フレット右にずれる）。
        </p>
        <Fretboard tuning={t} range={range} lefty={ctx.common.lefty} label="度数の位置" marks={marks} />
      </>
    );
  },
};
