/* 分野：モードの特性音。チャーチモード 7 種の構成音、特性音（ドリアンの 6、リディアンの ♯4 …）、
   どのコードの上で使うか（メジャーキーのどの度数から始まるか）。 */
import { pick, shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { type ScaleId, SCALES, degree, degreeLabel, fmt, note, noteId, scaleNotes } from "../../theory";

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
const degreesOf = (m: Mode) => SCALES[m.id].degrees.map(d => degreeLabel(degree(d))).join(" ");

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
    const explanation = {
      text: `${rootName} ${m.name}：${tonesOf(m, root)}（${degreesOf(m)}）／メジャーキーの ${m.chord} から始まる${
        m.char ? `／${m.char.vs}との違いは ${degreeLabel(degree(m.char.degree))}` : ""
      }`,
    };
    const choice = (text: string, correct: string, candidates: string[]): Question => ({
      item: id,
      prompt: { text },
      answer: { kind: "choice", options: shuffle(rng, fill(correct, candidates)), correct },
      explanation,
    });
    switch (kind) {
      case "tones":
        return choice(
          `${rootName} ${m.name}の構成音は？`,
          tonesOf(m, root),
          others.map(x => tonesOf(x, root)),
        );
      case "name":
        return choice(
          `${tonesOf(m, root)} は ${rootName} の何モード？`,
          m.name,
          others.map(x => x.name),
        );
      case "char": {
        const correct = degreeLabel(degree(m.char!.degree));
        const pool = MODES.filter(x => x.char && x.id !== m.id).map(x => degreeLabel(degree(x.char!.degree)));
        return choice(`${m.name}の特性音は？（${m.char!.vs}との違い）`, correct, shuffle(rng, pool));
      }
      case "chord":
        return choice(
          `${m.name}はメジャーキーのどのコードから始まるスケール？`,
          m.chord,
          others.map(x => x.chord),
        );
    }
  },

  reference: () => (
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
  ),
};
