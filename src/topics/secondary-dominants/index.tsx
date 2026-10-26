/* 分野：セカンダリードミナントと裏コード。キーと解決先を示して、そこへ解決するドミナント 7th
   （解決先の 5 度上）と、その裏コード（解決先の半音上）のコード名を答える。 */
import { voiced } from "../../chart/audio";
import { shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import {
  type Key,
  KEYS,
  type Note,
  degree,
  diatonicChords,
  fmt,
  keyId,
  keyLabel,
  pc,
  semitones,
  spellings,
  transpose,
} from "../../theory";

/** 解決先（メジャーキーの度数。0 = Ⅰ） */
const TARGETS = [1, 2, 3, 4, 5, 0];
const keyById = new Map(KEYS.major.map(k => [keyId(k), k]));

const dom = (n: Note) => `${fmt(n)}7`;
/** 解決先の 5 度上 */
const secondaryRoot = (target: Note) => transpose(target, degree("5"));
/** 解決先の半音上（文字は 1 つ上：D への裏は E♭7 で D♯7 ではない） */
const tritoneRoot = (target: Note) => transpose(target, degree("b2"));

/** ドミナント 7th の 3 度と 7 度（裏コードと共有する 2 音） */
const guideTones = (r: Note) => [transpose(r, degree("3")), transpose(r, degree("b7"))] as const;

const DOM7 = ["R", "3", "5", "b7"].map(d => semitones(degree(d)));
const domVoiced = (r: Note) =>
  voiced(
    pc(r),
    DOM7.map(s => pc(r) + s),
  );

const romanOf = (k: Key, i: number) => diatonicChords(k, 3)[i]!.roman;

function fill(correct: string, candidates: readonly (string | undefined)[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (c && !out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

export const secondaryDominants: Topic = {
  id: "secondary-dominants",
  level: "advanced",
  title: "セカンダリードミナントと裏コード",

  items: () => KEYS.major.flatMap(k => TARGETS.flatMap(i => [`${keyId(k)}:${i}:sec`, `${keyId(k)}:${i}:sub`])),

  itemLabel(id) {
    const [kid, i, kind] = id.split(":") as [string, string, string];
    const k = keyById.get(kid)!;
    const target = diatonicChords(k, 3)[Number(i)]!;
    return `キー ${keyLabel(k)} の ${target.symbol} への${kind === "sec" ? "ドミナント" : "裏コード"}`;
  },

  question(id, _ctx, rng): Question {
    const [kid, is, kind] = id.split(":") as [string, string, "sec" | "sub"];
    const k = keyById.get(kid)!;
    const i = Number(is);
    const chords = diatonicChords(k, 3);
    const target = chords[i]!;
    const sec = secondaryRoot(target.root),
      sub = tritoneRoot(target.root);
    const roman = romanOf(k, i);
    const secName = i === 0 ? "Ⅴ7" : `Ⅴ7/${roman}`;
    const correctRoot = kind === "sec" ? sec : sub;
    const correct = dom(correctRoot);
    const enh = spellings(pc(correctRoot)).find(n => n.letter !== correctRoot.letter);
    // ほかの解決先へのドミナント、同じ根音の別の型、裏と表の取り違え、異名同音
    const otherTargets = shuffle(
      rng,
      TARGETS.filter(j => j !== i).map(j => dom((kind === "sec" ? secondaryRoot : tritoneRoot)(chords[j]!.root))),
    );
    const options = fill(correct, [
      dom(kind === "sec" ? sub : sec),
      enh && dom(enh),
      `${fmt(correctRoot)}m7`,
      ...otherTargets,
    ]);
    return {
      item: id,
      prompt: {
        text: `キー ${keyLabel(k)} で ${target.symbol}（${target.label}）へ解決する${kind === "sec" ? "ドミナント 7th" : "裏コード"}は？`,
      },
      answer: { kind: "choice", options: shuffle(rng, options), correct },
      hint: {
        text:
          kind === "sec"
            ? `ドミナント 7th は、解決先の 5 度上（${fmt(target.root)} を 1 として文字で 5 つ目・半音 7 上）を根音にした 7th`
            : `裏コードは、表のドミナント（解決先の 5 度上の 7th）から半音 6 離れた 7th。解決先 ${fmt(target.root)} へ半音上から下りてくる`,
      },
      explanation: {
        text: [
          kind === "sec"
            ? `${target.symbol} の 5 度上 ${fmt(sec)} を根音にした 7th → ${dom(sec)}（${secName}）`
            : `${target.symbol} の半音上 ${fmt(sub)} を根音にした 7th → ${dom(sub)}（${dom(sec)} の裏）`,
          (() => {
            const [s3, s7] = guideTones(sec),
              [u3, u7] = guideTones(sub);
            const same = (a: Note, b: Note) => (fmt(a) === fmt(b) ? fmt(a) : `${fmt(a)}（＝${fmt(b)}）`);
            return `${dom(sec)} の 3 度 ${fmt(s3)} は ${dom(sub)} の 7 度 ${same(u7, s3)}、7 度 ${fmt(s7)} は 3 度 ${same(u3, s7)}。同じ 2 音を持つので置き換えられる`;
          })(),
        ].join("\n"),
        strip: [
          { label: dom(sec), sub: secName, current: kind === "sec" },
          { label: dom(sub), sub: "裏コード", current: kind === "sub" },
          { label: target.symbol, sub: `解決先 ${target.label}` },
        ],
        stripLabel: `どちらも ${target.symbol} へ解決する`,
      },
      sound: {
        notes: [],
        chords: [domVoiced(correctRoot), voiced(pc(target.root), target.tones.map(pc))],
      },
    };
  },

  reference: () => {
    const k = KEYS.major[0]!;
    const chords = diatonicChords(k, 3);
    return (
      <>
        <p>
          セカンダリードミナント：解決先の 5 度上を根音にした 7th。裏コード：その減 5 度上（＝解決先の半音上）の 7th
          で、3 度と 7 度を共有するので置き換えられる。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">解決先（C）</th>
              <th scope="col">ドミナント</th>
              <th scope="col">裏コード</th>
            </tr>
          </thead>
          <tbody>
            {TARGETS.map(i => (
              <tr key={i}>
                <td>
                  {chords[i]!.symbol}（{chords[i]!.label}）
                </td>
                <td>{dom(secondaryRoot(chords[i]!.root))}</td>
                <td>{dom(tritoneRoot(chords[i]!.root))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  },
};
