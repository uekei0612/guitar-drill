/* 分野：テンションの構成音。コードの型ごとに使えるテンションと、テンションの音名（4択）。 */
import { pick, shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { degree, degreeLabel, fmt, intervalBetween, note, noteId, pc, spellings, transpose } from "../../theory";

/** コードの型ごとに使えるテンション（ジャズ理論の一般的なもの） */
export const AVAILABLE: readonly {
  readonly type: string;
  readonly symbol: string;
  readonly tensions: readonly string[];
  readonly note?: string;
}[] = [
  { type: "M7", symbol: "M7", tensions: ["9", "#11", "13"], note: "11 は 3 度と半音でぶつかるのでアボイド" },
  { type: "m7", symbol: "m7", tensions: ["9", "11", "13"], note: "Ⅱm7 のとき。Ⅲm7・Ⅵm7 では 13・9 に注意" },
  {
    type: "7",
    symbol: "7",
    tensions: ["9", "#11", "13", "b9", "#9", "b13"],
    note: "♭9・♯9・♭13 はオルタード（解決先がマイナーのときなど）",
  },
  { type: "m7b5", symbol: "m7(♭5)", tensions: ["9", "11", "b13"] },
];

/** テンション（度数）の並び */
export const TENSIONS = ["b9", "9", "#9", "11", "#11", "b13", "13"] as const;
const label = (d: string) => degreeLabel(degree(d));
const setText = (ds: readonly string[]) => ds.map(label).join(" ");

/** ルートの候補。テンションに 𝄪・𝄫 が出ないものだけ使う */
const ROOTS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb", "Ab", "Db"];
const rootsFor = (d: string) => ROOTS.filter(r => Math.abs(transpose(note(r), degree(d)).acc) <= 1);

/** テンションごとに、それを載せる代表のコード */
const HOST: Record<string, string> = { b9: "7", "9": "7", "#9": "7", "11": "m7", "#11": "M7", b13: "7", "13": "7" };
const HOST_SYMBOL: Record<string, string> = { "7": "7", m7: "m7", M7: "M7" };

function fill(correct: string, candidates: readonly string[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (!out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

export const tensions: Topic = {
  id: "tensions",
  level: "advanced",
  title: "テンションの構成音",

  items: () => [...AVAILABLE.map(a => `avail:${a.type}`), ...TENSIONS.flatMap(t => [`note:${t}`, `name:${t}`])],

  itemLabel(id) {
    const [kind, x] = id.split(":") as [string, string];
    if (kind === "avail") return `${AVAILABLE.find(a => a.type === x)!.symbol} で使えるテンション`;
    return kind === "note" ? `${label(x)} の音名` : `${label(x)} を見分ける`;
  },

  question(id, _ctx, rng): Question {
    const [kind, x] = id.split(":") as [string, string];
    if (kind === "avail") {
      const a = AVAILABLE.find(v => v.type === x)!;
      const correct = setText(a.tensions);
      // 1 つだけ取り違えた組（9 と ♭9、11 と ♯11、13 と ♭13）
      const swap: Record<string, string> = {
        "9": "b9",
        b9: "9",
        "11": "#11",
        "#11": "11",
        "13": "b13",
        b13: "13",
        "#9": "9",
      };
      const variants = a.tensions.map((_, i) => setText(a.tensions.map((d, j) => (j === i ? swap[d]! : d))));
      const others = AVAILABLE.filter(v => v.type !== x).map(v => setText(v.tensions));
      return {
        item: id,
        prompt: { text: `${a.symbol} の上で使えるテンションは？` },
        answer: {
          kind: "choice",
          options: shuffle(rng, fill(correct, [...shuffle(rng, variants), ...others])),
          correct,
        },
        explanation: { text: `${a.symbol}：${correct}${a.note ? `（${a.note}）` : ""}` },
      };
    }
    const host = HOST[x]!;
    const root = note(pick(rng, rootsFor(x)));
    const chord = fmt(root) + HOST_SYMBOL[host];
    const t = transpose(root, degree(x));
    const explanation = {
      text: `${chord} の ${label(x)} は ${fmt(t)}（ルートから半音 ${(pc(t) - pc(root) + 12) % 12} 個）`,
    };
    if (kind === "note") {
      const near = [
        { letter: t.letter, acc: t.acc - 1 },
        { letter: t.letter, acc: t.acc + 1 },
        ...spellings(pc(t)).filter(n => n.letter !== t.letter),
      ].filter(n => Math.abs(n.acc) <= 1);
      const correct = fmt(t);
      return {
        item: id,
        prompt: { text: `${chord} の ${label(x)} の音は？` },
        answer: {
          kind: "choice",
          options: shuffle(
            rng,
            fill(correct, [
              ...shuffle(rng, near.map(fmt)),
              ...shuffle(
                rng,
                TENSIONS.map(d => fmt(transpose(root, degree(d)))),
              ),
            ]),
          ),
          correct,
        },
        explanation,
      };
    }
    // 音 → テンション名（度数は文字で決まるので、綴りから一意に決まる）
    const correct = label(x);
    const got = intervalBetween(root, t);
    return {
      item: id,
      prompt: { text: `${chord} の上の ${fmt(t)} は何のテンション？` },
      answer: {
        kind: "choice",
        options: shuffle(
          rng,
          fill(
            correct,
            shuffle(rng, TENSIONS.filter(d => d !== x && noteId(transpose(root, degree(d))) !== noteId(t)).map(label)),
          ),
        ),
        correct,
      },
      explanation: { text: `${explanation.text}。文字の距離が ${got.num} 度なので ${label(x)}` },
    };
  },

  reference: () => (
    <>
      <p>テンションはコードの 7 度より上に積む音。9 = 2、11 = 4、13 = 6 の 1 オクターブ上。</p>
      <dl class="ref-list">
        {AVAILABLE.map(a => (
          <div key={a.type}>
            <dt>{a.symbol}</dt>
            <dd>{setText(a.tensions)}</dd>
            {a.note && <dd class="muted">{a.note}</dd>}
            <dd class="muted">
              C{a.symbol}：{a.tensions.map(d => `${label(d)}=${fmt(transpose(note("C"), degree(d)))}`).join(" ")}
            </dd>
          </div>
        ))}
      </dl>
    </>
  ),
};
