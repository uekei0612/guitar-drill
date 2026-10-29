/* 分野：モードの特性音。チャーチモード 7 種の構成音、特性音（ドリアンの 6、リディアンの ♯4 …）、
   どのコードの上で使うか（メジャーキーのどの度数から始まるか）。 */
import { scaleMidis } from "../../chart/audio";
import { pick, shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import {
  type ScaleId,
  SCALES,
  degree,
  degreeLabel,
  fmt,
  note,
  noteId,
  pc,
  scaleIntervals,
  scaleNotes,
  semitones,
} from "../../theory";
import * as Lesson from "./lesson";

interface Mode {
  readonly id: ScaleId;
  readonly name: string;
  /** メジャーキーで何番目から始まるか（0 = Ⅰ） */
  readonly index: number;
  /** 上に載るコード */
  readonly chord: string;
  /** 特性音と、何と比べての違いか（アイオニアン・エオリアンは比べる基準なので無い） */
  readonly char?: { readonly degree: string; readonly vs: string };
}

export const MODES: readonly Mode[] = [
  { id: "major", name: "アイオニアン", index: 0, chord: "ⅠM7" },
  { id: "dorian", name: "ドリアン", index: 1, chord: "Ⅱm7", char: { degree: "6", vs: "ナチュラルマイナー" } },
  { id: "phrygian", name: "フリジアン", index: 2, chord: "Ⅲm7", char: { degree: "b2", vs: "ナチュラルマイナー" } },
  { id: "lydian", name: "リディアン", index: 3, chord: "ⅣM7", char: { degree: "#4", vs: "メジャー" } },
  { id: "mixolydian", name: "ミクソリディアン", index: 4, chord: "Ⅴ7", char: { degree: "b7", vs: "メジャー" } },
  { id: "natural_minor", name: "エオリアン", index: 5, chord: "Ⅵm7" },
  { id: "locrian", name: "ロクリアン", index: 6, chord: "Ⅶm7(♭5)", char: { degree: "b5", vs: "フリジアン" } },
];
const byId = new Map(MODES.map(m => [m.id, m]));

/** 出題に使うルート */
const ROOTS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb"];

/** そのモードで出すルート（C♭・F♭・E♯・B♯ が出てくるルートは避ける） */
const rootsFor = (m: Mode) =>
  ROOTS.filter(r => !scaleNotes(m.id, note(r)).some(n => ["Cb", "Fb", "E#", "B#"].includes(noteId(n))));

const tonesOf = (m: Mode, root: string) => scaleNotes(m.id, note(root)).map(fmt).join(" ");
/** 明るい順（隣とは 1 音だけ違い、右へ行くほど ♭ が 1 つ増える） */
export const BRIGHTNESS: readonly ScaleId[] = [
  "lydian",
  "major",
  "mixolydian",
  "dorian",
  "natural_minor",
  "phrygian",
  "locrian",
];

/** 元のメジャーキーの主音（D ドリアンなら C）。モードの音を index だけ戻ったところ */
export const parentOf = (m: Mode, root: string) => fmt(scaleNotes(m.id, note(root))[(7 - m.index) % 7]!);

const degreesOf = (m: Mode) => SCALES[m.id].degrees.map(d => degreeLabel(degree(d))).join(" ");

/** 明るい順の言い方（ヒント） */
const BRIGHT_TEXT =
  "リディアン（♯4）→ アイオニアン → ミクソリディアン（♭7）→ ドリアン（♭3 ♭7）→ エオリアン（♭3 ♭6 ♭7）→ フリジアン（さらに ♭2）→ ロクリアン（さらに ♭5）";

/** コードの型（Ⅱm7 → m7） */
const typeOfChord = (chord: string) => chord.replace(/^[ⅠⅡⅢⅣⅤⅥⅦ]+/, "");

/** ヒント：3・5・7 度からコードの型を出す（メジャーキーの型の並びと照らす） */
function chordHint(m: Mode): string {
  const ds = [2, 4, 6].map(i => degreeLabel(degree(SCALES[m.id].degrees[i]!)));
  return `${m.name}の 3・5・7 度は ${ds.join(" ")} → ${typeOfChord(m.chord)}。メジャーキーのコードの型は Ⅰ から順に ${MODES.map(x => typeOfChord(x.chord)).join(" ")}`;
}

const VS_ID: Readonly<Record<string, ScaleId>> = {
  メジャー: "major",
  ナチュラルマイナー: "natural_minor",
  フリジアン: "phrygian",
};

/** ヒント：比べる相手より明るいか暗いか（明るい順で隣どうしは 1 音だけ違う） */
function charHint(m: Mode): string {
  const vs = byId.get(VS_ID[m.char!.vs]!)!;
  const brighter = BRIGHTNESS.indexOf(m.id) < BRIGHTNESS.indexOf(vs.id);
  return `明るい順で隣どうしは 1 音だけ違う。${m.name}は${m.char!.vs}より${brighter ? "明るい（どれか 1 音が半音上がる）" : "暗い（どれか 1 音が半音下がる）"}。${m.char!.vs}の度数：${degreesOf(vs)}`;
}

type Kind = "tones" | "name" | "char" | "chord";

function fill(correct: string, candidates: readonly string[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (!out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

export const modes: Topic = {
  id: "modes",
  level: "advanced",
  title: "モードの特性音",

  items: () =>
    MODES.flatMap(m => [`${m.id}:tones`, `${m.id}:name`, ...(m.char ? [`${m.id}:char`] : []), `${m.id}:chord`]),

  itemLabel(id) {
    const [mid, kind] = id.split(":") as [ScaleId, Kind];
    const m = byId.get(mid)!;
    return {
      tones: `${m.name}の構成音`,
      name: `${m.name}を見分ける`,
      char: `${m.name}の特性音`,
      chord: `${m.name}を使うコード`,
    }[kind];
  },

  question(id, _ctx, rng): Question {
    const [mid, kind] = id.split(":") as [ScaleId, Kind];
    const m = byId.get(mid)!;
    const root = pick(rng, rootsFor(m));
    const rootName = fmt(note(root));
    // 似たモード（特性音 1 つ違い）を先に
    const neighbors = MODES.filter(x => x.id !== m.id).sort(
      (a, b) =>
        Math.min(Math.abs(a.index - m.index), 7 - Math.abs(a.index - m.index)) -
        Math.min(Math.abs(b.index - m.index), 7 - Math.abs(b.index - m.index)),
    );
    const others = [...shuffle(rng, neighbors.slice(0, 4)), ...shuffle(rng, neighbors.slice(4))];
    const ns = scaleNotes(m.id, note(root));
    const parent = parentOf(m, root);
    const explanation = {
      text: [
        m.index === 0
          ? `${rootName} ${m.name}：${rootName} メジャースケールそのもの（${m.chord} の上）`
          : `${rootName} ${m.name}：${parent} メジャーの音を ${rootName}（${m.index + 1} 番目＝${m.chord}）から並べたもの`,
        m.char
          ? `${m.char.vs}との違いは ${degreeLabel(degree(m.char.degree))}（強調の札）。明るい順で隣のモードとは 1 音だけ違う`
          : `${m.name}は比べる基準。明るい順で隣のモードとは 1 音だけ違う`,
      ].join("\n"),
      strip: ns.map((n, i) => ({
        label: fmt(n),
        sub: degreeLabel(degree(SCALES[m.id].degrees[i]!)),
        current: !!m.char && SCALES[m.id].degrees[i] === m.char.degree,
      })),
      stripLabel: `${rootName} ${m.name}の音と度数`,
    };
    const sound = { notes: scaleMidis(pc(note(root)), scaleIntervals(m.id).map(semitones)) };
    // モードはチャートにも同じ ID である（指板の上でどこに特性音があるかを見に行ける）
    const chart = { scale: m.id, rootPc: pc(note(root)), flat: rootName.includes("♭") };
    const choice = (text: string, correct: string, candidates: string[], hint: string): Question => ({
      item: id,
      prompt: { text },
      answer: { kind: "choice", options: shuffle(rng, fill(correct, candidates)), correct },
      hint: { text: hint },
      explanation,
      sound,
      chart,
    });
    switch (kind) {
      case "tones":
        return choice(
          `${rootName} ${m.name}の構成音は？`,
          tonesOf(m, root),
          others.map(x => tonesOf(x, root)),
          `${m.name}の度数：${degreesOf(m)}。${rootName} から度数の数だけ文字を進めて綴る`,
        );
      case "name":
        return choice(
          `${tonesOf(m, root)} は ${rootName} の何モード？`,
          m.name,
          others.map(x => x.name),
          `${rootName} メジャー（${tonesOf(MODES[0]!, root)}）と比べて、変わった音を探す。明るい順：${BRIGHT_TEXT}`,
        );
      case "char": {
        const correct = degreeLabel(degree(m.char!.degree));
        const pool = MODES.filter(x => x.char && x.id !== m.id).map(x => degreeLabel(degree(x.char!.degree)));
        return choice(`${m.name}の特性音は？（${m.char!.vs}との違い）`, correct, shuffle(rng, pool), charHint(m));
      }
      case "chord":
        return choice(
          `${m.name}はメジャーキーのどのコードから始まるスケール？`,
          m.chord,
          others.map(x => x.chord),
          chordHint(m),
        );
    }
  },

  reference: () => (
    <>
      <Lesson.Intro />
      <p class="muted small">
        一覧は、メジャースケールの 1 番目（アイオニアン）から 7 番目（ロクリアン）の順。音名は、どれも C
        を主音にした場合。
      </p>
      <dl class="ref-list">
        {MODES.map(m => (
          <div key={m.id}>
            <dt>
              {m.name}（{m.chord}）
            </dt>
            <dd>{degreesOf(m)}</dd>
            <dd class="muted">
              C {m.name}：{tonesOf(m, "C")}
              {m.char && `／特性音 ${degreeLabel(degree(m.char.degree))}（${m.char.vs}との違い）`}
            </dd>
          </div>
        ))}
      </dl>
      <Lesson.Body />
    </>
  ),
};
