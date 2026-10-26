/* 分野：定番の進行。Ⅱ–Ⅴ–Ⅰ や王道進行を、指定したキーのコード名で答える（4択）。
   コードは「主音からの度数＋型」で持つので、♭Ⅶ や借りたコードも同じ書き方で足せる。 */
import { voiced } from "../../chart/audio";
import { pick, shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import {
  type Key,
  type KeyMode,
  type Note,
  KEYS,
  ROMAN,
  chordIntervals,
  chordSymbol,
  chordType,
  degree,
  keyId,
  keyLabel,
  note,
  pc,
  semitones,
  spellings,
  transpose,
} from "../../theory";

interface ProgChord {
  /** 主音からの度数（"2"、"b7" など） */
  readonly deg: string;
  readonly type: string;
}

interface Progression {
  readonly id: string;
  readonly name: string;
  readonly mode: KeyMode;
  readonly chords: readonly ProgChord[];
  /** 進行の形の説明（12 小節ブルースのように、答えるコードと並びが違うとき） */
  readonly form?: string;
}

const p = (s: string): ProgChord[] =>
  s.split(" ").map(x => {
    const [deg, type] = x.split("/") as [string, string];
    return { deg, type };
  });

export const PROGRESSIONS: readonly Progression[] = [
  { id: "251", name: "Ⅱ–Ⅴ–Ⅰ", mode: "major", chords: p("2/m7 5/7 1/M7") },
  { id: "1625", name: "Ⅰ–Ⅵ–Ⅱ–Ⅴ（循環）", mode: "major", chords: p("1/M7 6/m7 2/m7 5/7") },
  { id: "ohdo", name: "王道進行", mode: "major", chords: p("4/M7 5/7 3/m7 6/m") },
  { id: "komuro", name: "小室進行", mode: "major", chords: p("6/m 4/maj 5/maj 1/maj") },
  { id: "canon", name: "カノン進行", mode: "major", chords: p("1/maj 5/maj 6/m 3/m 4/maj 1/maj 4/maj 5/maj") },
  {
    id: "blues",
    name: "12 小節ブルース",
    mode: "major",
    chords: p("1/7 4/7 5/7"),
    form: "Ⅰ7 Ⅰ7 Ⅰ7 Ⅰ7 ｜ Ⅳ7 Ⅳ7 Ⅰ7 Ⅰ7 ｜ Ⅴ7 Ⅳ7 Ⅰ7 Ⅴ7",
  },
  { id: "minor251", name: "マイナーの Ⅱ–Ⅴ–Ⅰ", mode: "minor", chords: p("2/m7b5 5/7 1/m7") },
  { id: "minor-andalusian", name: "アンダルシア進行", mode: "minor", chords: p("1/m b7/maj b6/maj 5/maj") },
];
const progById = new Map(PROGRESSIONS.map(x => [x.id, x]));

const romanOf = (c: ProgChord) => {
  const iv = degree(c.deg);
  return (iv.alt < 0 ? "♭" : iv.alt > 0 ? "♯" : "") + ROMAN[iv.num - 1] + chordType(c.type).symbol;
};
export const romanText = (pr: Progression) => pr.chords.map(romanOf).join(" – ");

const rootOf = (k: Key, c: ProgChord) => transpose(k.tonic, degree(c.deg));
const symbols = (k: Key, chords: readonly ProgChord[], roots?: readonly Note[]) =>
  chords.map((c, i) => chordSymbol(roots?.[i] ?? rootOf(k, c), chordType(c.type)));
const join = (xs: readonly string[]) => xs.join(" – ");

/** 型の取り違え（M7 と 7、m7 と m7(♭5)、メジャーとマイナー） */
const SIBLING: Record<string, string> = { M7: "7", "7": "M7", m7: "m7b5", m7b5: "m7", maj: "m", m: "maj" };

/** 度数の書き方をキーのコード名に置きかえた形（12 小節ブルースの並び） */
const formIn = (k: Key, pr: Progression) =>
  pr.form?.replace(/\S+/g, tok => {
    const j = pr.chords.findIndex(c => romanOf(c) === tok);
    return j < 0 ? tok : symbols(k, [pr.chords[j]!])[0]!;
  });

/** 進行を順に鳴らす音（ブルースは 12 小節の並びで） */
function progressionSound(k: Key, pr: Progression) {
  const chordOf = (c: ProgChord) => {
    const r = pc(rootOf(k, c));
    return voiced(
      r,
      chordIntervals(chordType(c.type)).map(iv => r + semitones(iv)),
    );
  };
  const order = pr.form
    ? pr.form
        .split(/\s+/)
        .map(tok => pr.chords.find(c => romanOf(c) === tok))
        .filter((c): c is ProgChord => !!c)
    : pr.chords;
  return { notes: [], chords: order.map(chordOf) };
}

const keysOf = (mode: KeyMode) => KEYS[mode];
const keyById = new Map([...KEYS.major, ...KEYS.minor].map(k => [keyId(k), k]));

export const progressions: Topic = {
  id: "progressions",
  level: "intermediate",
  title: "定番の進行",

  // 進行ごとに、♯系→♭系の順
  items: () => PROGRESSIONS.flatMap(pr => keysOf(pr.mode).map(k => `${pr.id}:${keyId(k)}`)),

  itemLabel(id) {
    const [pid, kid] = id.split(":") as [string, string];
    return `キー ${keyLabel(keyById.get(kid)!)} の ${progById.get(pid)!.name}`;
  },

  question(id, _ctx, rng): Question {
    const [pid, kid] = id.split(":") as [string, string];
    const pr = progById.get(pid)!;
    const k = keyById.get(kid)!;
    const correct = join(symbols(k, pr.chords));
    const roots = pr.chords.map(c => rootOf(k, c));
    const i = Math.floor(rng() * pr.chords.length);
    const changeAt = <T,>(xs: readonly T[], j: number, v: T) => xs.map((x, n) => (n === j ? v : x));

    const candidates: string[] = [];
    // 1 つだけ型を取り違えた
    const withSibling = pr.chords.map((c, n) => (SIBLING[c.type] ? n : -1)).filter(n => n >= 0);
    const j = withSibling.length ? pick(rng, withSibling) : -1;
    if (j >= 0)
      candidates.push(
        join(symbols(k, changeAt(pr.chords, j, { ...pr.chords[j]!, type: SIBLING[pr.chords[j]!.type]! }))),
      );
    // 1 つだけルートを半音ずらした
    const r = roots[i]!;
    candidates.push(
      join(symbols(k, pr.chords, changeAt(roots, i, { letter: r.letter, acc: r.acc + pick(rng, [1, -1]) }))),
    );
    // 1 つだけ異名同音で書いた
    const enh = spellings(pc(roots[i]!)).find(n => n.letter !== roots[i]!.letter);
    if (enh) candidates.push(join(symbols(k, pr.chords, changeAt(roots, i, enh))));
    // 5 度隣のキーの同じ進行
    const ks = keysOf(pr.mode);
    const at = ks.indexOf(k);
    for (const d of shuffle(rng, [1, -1])) candidates.push(join(symbols(ks[(at + d + 12) % 12]!, pr.chords)));

    const options = [correct];
    for (const c of shuffle(rng, candidates)) if (!options.includes(c) && options.length < 4) options.push(c);

    const form = pr.form ? `（${pr.form}）` : "";
    return {
      item: id,
      prompt: { text: `キー ${keyLabel(k)} の ${pr.name}：${romanText(pr)}${form} は？` },
      answer: { kind: "choice", options: shuffle(rng, options), correct },
      explanation: {
        text: pr.form ? `12 小節：${formIn(k, pr)}` : "",
        strip: pr.chords.map(c => ({ label: symbols(k, [c])[0]!, sub: romanOf(c) })),
        stripLabel: `キー ${keyLabel(k)} の ${pr.name}`,
      },
      sound: progressionSound(k, pr),
    };
  },

  reference: () => (
    <dl class="ref-list">
      {PROGRESSIONS.map(pr => {
        const k: Key = { mode: pr.mode, tonic: note(pr.mode === "major" ? "C" : "A") };
        return (
          <div key={pr.id}>
            <dt>{pr.name}</dt>
            <dd>{romanText(pr)}</dd>
            {pr.form && <dd class="muted">{pr.form}</dd>}
            <dd class="muted">
              {keyLabel(k)}：{join(symbols(k, pr.chords))}
            </dd>
          </div>
        );
      })}
    </dl>
  ),
};
