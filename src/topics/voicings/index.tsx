/* 分野：ボイシングの型（シェル・ドロップ 2・ドロップ 3）。
   ルートを示して残りの音をタップで埋める「型を埋める」出題と、形を見てコードの型を答える出題。
   形は「弦の組と、低い弦からの度数の並び」で持ち、各弦でルートにいちばん近いフレットに置いて作る
   （C7 のドロップ 2 なら x3535x、G7 のドロップ 3 なら 3x343x になる）。 */
import { shuffle } from "../../drill/rng";
import type { Mark, Question, Topic } from "../../drill/topic";
import {
  type Position,
  type Tuning,
  chordType,
  degree,
  degreeLabel,
  fmt,
  midiAt,
  mod,
  note,
  pcAt,
  semitones,
  stringCount,
} from "../../theory";
import { Fretboard } from "../../ui/Fretboard";

interface Voicing {
  readonly id: string;
  readonly name: string;
  /** 低い弦から */
  readonly strings: readonly number[];
  /** 低い弦からの度数（R・3・5・7 の位置。型に合わせて ♭ を付ける） */
  readonly order: readonly ("R" | "3" | "5" | "7")[];
  readonly types: readonly string[];
}

const SEVENTH_TYPES = ["M7", "7", "m7", "m7b5"];
/** シェルは 5 度を持たないので m7 と m7(♭5) を区別できない */
const SHELL_TYPES = ["M7", "7", "m7"];

export const VOICINGS: readonly Voicing[] = [
  {
    id: "shell-6a",
    name: "シェル（6弦ルート・R 7 3）",
    strings: [6, 4, 3],
    order: ["R", "7", "3"],
    types: SHELL_TYPES,
  },
  {
    id: "shell-6b",
    name: "シェル（6弦ルート・R 3 7）",
    strings: [6, 5, 4],
    order: ["R", "3", "7"],
    types: SHELL_TYPES,
  },
  {
    id: "shell-5a",
    name: "シェル（5弦ルート・R 3 7）",
    strings: [5, 4, 3],
    order: ["R", "3", "7"],
    types: SHELL_TYPES,
  },
  {
    id: "shell-5b",
    name: "シェル（5弦ルート・R 7 3）",
    strings: [5, 3, 2],
    order: ["R", "7", "3"],
    types: SHELL_TYPES,
  },
  {
    id: "drop2-6",
    name: "ドロップ 2（6〜3弦）",
    strings: [6, 5, 4, 3],
    order: ["R", "5", "7", "3"],
    types: SEVENTH_TYPES,
  },
  {
    id: "drop2-5",
    name: "ドロップ 2（5〜2弦）",
    strings: [5, 4, 3, 2],
    order: ["R", "5", "7", "3"],
    types: SEVENTH_TYPES,
  },
  {
    id: "drop2-4",
    name: "ドロップ 2（4〜1弦）",
    strings: [4, 3, 2, 1],
    order: ["R", "5", "7", "3"],
    types: SEVENTH_TYPES,
  },
  {
    id: "drop3-6",
    name: "ドロップ 3（6弦ルート）",
    strings: [6, 4, 3, 2],
    order: ["R", "7", "3", "5"],
    types: SEVENTH_TYPES,
  },
  {
    id: "drop3-5",
    name: "ドロップ 3（5弦ルート）",
    strings: [5, 3, 2, 1],
    order: ["R", "7", "3", "5"],
    types: SEVENTH_TYPES,
  },
];
const byId = new Map(VOICINGS.map(v => [v.id, v]));

/** 形の作り方（id の頭で決まる） */
const HOW: Record<string, string> = {
  shell: "R・3・7 の 3 音だけ（5 度を省く）。型は 3 度と 7 度で決まる",
  drop2: "密集配置 5 7 R 3 の上から 2 番目（R）を 1 オクターブ下げた形",
  drop3: "密集配置 7 R 3 5 の上から 3 番目（R）を 1 オクターブ下げた形",
};
const howOf = (v: Voicing) => HOW[v.id.split("-")[0]!]!;

/** 型を決める音（R 以外。シェルは 5 度を持たない）と半音数 */
const typeTones = (v: Voicing, type: string) =>
  chordType(type)
    .degrees.filter(d => d !== "R" && v.order.some(o => d.replace(/[b#]/g, "") === o))
    .map(d => `${degreeLabel(degree(d))}（半音 ${semitones(degree(d))}）`)
    .join("・");

/** 型の度数のうち、その役（3・5・7）にあたるもの（m7 の 3 は ♭3） */
function degreeFor(type: string, role: "R" | "3" | "5" | "7"): string {
  if (role === "R") return "R";
  const d = chordType(type).degrees.find(x => x.replace(/[b#]/g, "") === role);
  if (!d) throw new Error(`${type} に ${role} 度が無い`);
  return d;
}

export interface Shape {
  readonly positions: readonly Position[];
  readonly labels: readonly string[];
}

/** ルートの位置から形を作る。届く範囲（ルートから ±4 フレット）に音が無ければ undefined */
export function shapeOf(t: Tuning, v: Voicing, type: string, rootFret: number): Shape | undefined {
  const root: Position = { string: v.strings[0]!, fret: rootFret };
  const rootPc = pcAt(t, root);
  const positions: Position[] = [root];
  const labels: string[] = ["R"];
  for (let i = 1; i < v.strings.length; i++) {
    const d = degreeFor(type, v.order[i]!);
    const want = mod(rootPc + semitones(degree(d)), 12);
    const s = v.strings[i]!;
    let best: number | undefined;
    for (let f = Math.max(0, rootFret - 4); f <= rootFret + 4; f++)
      if (
        pcAt(t, { string: s, fret: f }) === want &&
        (best === undefined || Math.abs(f - rootFret) < Math.abs(best - rootFret))
      )
        best = f;
    if (best === undefined) return undefined;
    positions.push({ string: s, fret: best });
    labels.push(degreeLabel(degree(d)));
  }
  return { positions, labels };
}

const rangeOf = (ps: readonly Position[]) => {
  const fs = ps.map(p => p.fret);
  const minFret = Math.max(0, Math.min(...fs) - 1);
  return { minFret, maxFret: minFret + 5 };
};

/** コード名で普通に使う根音の綴り（A♯7 ではなく B♭7） */
const CHORD_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const symbolOf = (type: string) => chordType(type).symbol;

/** ルートを置くフレットの候補 */
const ROOT_FRETS = Array.from({ length: 9 }, (_, i) => i + 2);

export const voicings: Topic = {
  id: "voicings",
  level: "advanced",
  title: "ボイシングの型",

  // 変則チューニングでは届く範囲に音が無い形があるので、ルートをどこに置いても作れない組み合わせは出さない
  items: ({ common: { tuning: t } }) =>
    VOICINGS.filter(v => v.strings.every(s => s <= stringCount(t))).flatMap(v =>
      v.types
        .filter(type => ROOT_FRETS.some(f => shapeOf(t, v, type, f)))
        .flatMap(type => [`${v.id}:${type}:fill`, `${v.id}:${type}:name`]),
    ),

  itemLabel(id) {
    const [vid, type] = id.split(":") as [string, string];
    return `${byId.get(vid)!.name} の ${symbolOf(type)}`;
  },

  question(id, { common: { tuning: t } }, rng): Question {
    const [vid, type, kind] = id.split(":") as [string, string, "fill" | "name"];
    const v = byId.get(vid)!;
    // ルートは 2〜10 フレットから、形が作れる位置を選ぶ
    const frets = shuffle(rng, ROOT_FRETS);
    let shape: Shape | undefined,
      rootFret = 0;
    for (const f of frets)
      if ((shape = shapeOf(t, v, type, f))) {
        rootFret = f;
        break;
      }
    if (!shape) throw new Error(`${id}: 形が作れない`);
    const range = rangeOf(shape.positions);
    const rootName = fmt(note(CHORD_ROOTS[pcAt(t, { string: v.strings[0]!, fret: rootFret })]!));
    const chord = rootName + symbolOf(type);
    const full: Mark[] = shape.positions.map((p, i) => ({
      pos: p,
      kind: i === 0 ? "root" : "tone",
      label: shape!.labels[i],
    }));
    const explanation = {
      text: [
        `${v.name}の ${chord}：低い弦から ${shape.labels.join(" ")}`,
        howOf(v),
        `R から ${typeTones(v, type)} → ${symbolOf(type)}`,
      ].join("\n"),
      board: { range, marks: full },
    };
    const sound = { notes: shape.positions.map(p => midiAt(t, p)), strum: true };
    if (kind === "fill")
      return {
        item: id,
        prompt: {
          text: `${v.name}で ${chord} を作る`,
          how: `R 以外の ${shape.positions.length - 1} 音をタップ`,
          board: { range, marks: [full[0]!] },
        },
        answer: { kind: "tap", mode: "all", range, correct: shape.positions.slice(1) },
        hint: { text: `${howOf(v)}。${chord} は R から ${typeTones(v, type)}` },
        explanation,
        sound,
      };
    const correct = symbolOf(type);
    // シェルは m7 と m7(♭5) を形で区別できないので、選択肢はその形で作れる型だけ
    const options = shuffle(rng, [correct, ...v.types.filter(x => x !== type).map(symbolOf)]);
    return {
      item: id,
      prompt: {
        text: `${v.name}。この形は R に対して何のコード？`,
        board: {
          range,
          marks: shape.positions.map((p, i) => ({
            pos: p,
            kind: i === 0 ? ("root" as const) : ("tone" as const),
            label: i === 0 ? "R" : "",
          })),
        },
      },
      answer: { kind: "choice", options, correct },
      hint: {
        text: `R から各音まで半音で数える。3 度は半音 3 か 4、7 度は半音 10 か 11${v.order.includes("5") ? "、5 度は 6 か 7" : ""}（${howOf(v)}）`,
      },
      explanation,
      sound,
    };
  },

  reference: ({ ctx }) => {
    const t = ctx.common.tuning;
    return (
      <>
        <p>
          シェルは R・3・7 の 3 音（5 度を省く）。ドロップ 2 は密集配置の上から 2 番目の音を、ドロップ 3 は 3 番目の音を
          1 オクターブ下げた形。どれも G7 の例。
        </p>
        <dl class="ref-list">
          {VOICINGS.filter(v => v.strings.every(s => s <= stringCount(t))).map(v => {
            const rootFret = v.strings[0] === 6 ? 3 : v.strings[0] === 5 ? 10 : 5;
            const s = shapeOf(t, v, "7", rootFret);
            if (!s) return null;
            const range = rangeOf(s.positions);
            return (
              <div key={v.id}>
                <dt>{v.name}</dt>
                <dd class="muted">低い弦から {s.labels.join(" ")}</dd>
                <dd class="muted">{howOf(v)}</dd>
                <dd>
                  <Fretboard
                    tuning={t}
                    range={range}
                    lefty={ctx.common.lefty}
                    label={v.name}
                    marks={s.positions.map((p, i) => ({ pos: p, kind: i === 0 ? "root" : "tone", label: s.labels[i] }))}
                  />
                </dd>
              </div>
            );
          })}
        </dl>
      </>
    );
  },
};
