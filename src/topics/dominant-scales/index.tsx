/* 分野：ドミナントで使うスケール。オルタード、HMP5↓、コンビネーション・ディミニッシュ、リディアン ♭7 の
   構成音・度数と、どの状況で使うか。比べる基準としてミクソリディアンも選択肢に混ぜる。 */
import { pick, shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { type ScaleId, SCALES, degree, degreeLabel, fmt, note, scaleNotes } from "../../theory";

interface DomScale {
  readonly id: ScaleId;
  /** 使う場面 */
  readonly use: string;
}

export const DOMINANT_SCALES: readonly DomScale[] = [
  { id: "altered", use: "Ⅴ7 → Ⅰ で、♭9・♯9・♯11・♭13 を全部使って強く解決したいとき" },
  { id: "phrygian_dominant", use: "マイナーキーの Ⅴ7（Ⅴ7 → Ⅰm）" },
  { id: "combination_diminished", use: "Ⅴ7 で ♭9・♯9・♯11 と、ナチュラルの 13 を使いたいとき" },
  { id: "lydian_dominant", use: "解決しない 7th（Ⅳ7・♭Ⅶ7・裏コード）" },
];
const MIXO: ScaleId = "mixolydian";
const byId = new Map(DOMINANT_SCALES.map(d => [d.id, d]));

const ROOTS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb", "Ab"];
/** 𝄪・𝄫 が出てくるルートは避ける */
const rootsFor = (id: ScaleId) => ROOTS.filter(r => scaleNotes(id, note(r)).every(n => Math.abs(n.acc) <= 1));

const nameOf = (id: ScaleId) => SCALES[id].name;
const degreesOf = (id: ScaleId) => SCALES[id].degrees.map(d => degreeLabel(degree(d))).join(" ");
const tonesOf = (id: ScaleId, root: string) => scaleNotes(id, note(root)).map(fmt).join(" ");

type Kind = "tones" | "name" | "degrees" | "use";

function fill(correct: string, candidates: readonly string[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (!out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

export const dominantScales: Topic = {
  id: "dominant-scales",
  level: "advanced",
  title: "ドミナントで使うスケール",

  items: () => DOMINANT_SCALES.flatMap(d => (["degrees", "tones", "name", "use"] as const).map(k => `${d.id}:${k}`)),

  itemLabel(id) {
    const [sid, kind] = id.split(":") as [ScaleId, Kind];
    return `${nameOf(sid)}の${{ tones: "構成音", name: "見分け", degrees: "度数", use: "使いどころ" }[kind]}`;
  },

  question(id, _ctx, rng): Question {
    const [sid, kind] = id.split(":") as [ScaleId, Kind];
    const d = byId.get(sid)!;
    const others = shuffle(rng, [...DOMINANT_SCALES.map(x => x.id).filter(x => x !== sid), MIXO]);
    const root = pick(
      rng,
      rootsFor(sid).filter(r => others.every(o => rootsFor(o).includes(r))),
    );
    const chord = `${fmt(note(root))}7`;
    const explanation = { text: `${nameOf(sid)}：${degreesOf(sid)}／${chord} なら ${tonesOf(sid, root)}／${d.use}` };
    const choice = (text: string, correct: string, candidates: string[]): Question => ({
      item: id,
      prompt: { text },
      answer: { kind: "choice", options: shuffle(rng, fill(correct, candidates)), correct },
      explanation,
    });
    switch (kind) {
      case "degrees":
        return choice(`${nameOf(sid)}の度数は？`, degreesOf(sid), others.map(degreesOf));
      case "tones":
        return choice(
          `${chord} の上の${nameOf(sid)}の構成音は？`,
          tonesOf(sid, root),
          others.map(o => tonesOf(o, root)),
        );
      case "name":
        return choice(`${chord} の上で ${tonesOf(sid, root)} は何のスケール？`, nameOf(sid), others.map(nameOf));
      case "use":
        return choice(
          `${nameOf(sid)}を使うのは？`,
          d.use,
          shuffle(
            rng,
            DOMINANT_SCALES.filter(x => x.id !== sid).map(x => x.use),
          ),
        );
    }
  },

  reference: () => (
    <>
      <p>
        どれも 3 度と ♭7 を持つ（7th コードの上で使える）。違いは 9・11・13 の高さ。基準はミクソリディアン（
        {degreesOf(MIXO)}）。
      </p>
      <dl class="ref-list">
        {DOMINANT_SCALES.map(d => (
          <div key={d.id}>
            <dt>{nameOf(d.id)}</dt>
            <dd>{degreesOf(d.id)}</dd>
            <dd class="muted">G7：{tonesOf(d.id, "G")}</dd>
            <dd class="muted">{d.use}</dd>
          </div>
        ))}
      </dl>
    </>
  ),
};
