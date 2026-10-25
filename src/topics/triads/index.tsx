/* 分野：トライアドの構成音。コード名 → 構成音、構成音 → コード名（どちらも 4択）。
   メジャー・マイナーから始め、dim・aug・sus を設定で足す。 */
import { shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import {
  type ChordType,
  chordSymbol,
  chordToneLabels,
  chordTones,
  chordType,
  fmt,
  note,
  spellings,
  pc,
} from "../../theory";

export interface TriadSettings {
  readonly dim: boolean;
  readonly aug: boolean;
  readonly sus: boolean;
}

const DEFAULTS: TriadSettings = { dim: false, aug: false, sus: false };

function parse(raw: unknown): TriadSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const b = (k: keyof TriadSettings) => (typeof r[k] === "boolean" ? (r[k] as boolean) : DEFAULTS[k]);
  return { dim: b("dim"), aug: b("aug"), sus: b("sus") };
}

/** 型ごとのルート。よく使う綴りにする（マイナーは C♯m・G♯m、メジャーは D♭・A♭） */
const MAJOR_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
const ROOTS: Record<string, readonly string[]> = {
  maj: MAJOR_ROOTS,
  m: MINOR_ROOTS,
  dim: MINOR_ROOTS,
  aug: MAJOR_ROOTS,
  sus2: MAJOR_ROOTS,
  sus4: MAJOR_ROOTS,
};
const ALL_TYPES = ["maj", "m", "dim", "aug", "sus2", "sus4"];

const typesOf = (s: TriadSettings) => [
  "maj",
  "m",
  ...(s.dim ? ["dim"] : []),
  ...(s.aug ? ["aug"] : []),
  ...(s.sus ? ["sus2", "sus4"] : []),
];

const tonesText = (root: string, t: ChordType) => chordTones(note(root), t).map(fmt).join(" ");

/** 構成音のうち 1 つを異名同音に書き換えたもの（E♭ を D♯ と書く間違い） */
function misspelled(root: string, t: ChordType): string | undefined {
  const tones = chordTones(note(root), t);
  for (let i = 1; i < tones.length; i++) {
    const alt = spellings(pc(tones[i]!)).find(n => n.letter !== tones[i]!.letter);
    if (alt) return tones.map((n, j) => fmt(j === i ? alt : n)).join(" ");
  }
  return undefined;
}

function fill(correct: string, candidates: readonly (string | undefined)[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (c && !out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

export const triads: Topic<TriadSettings> = {
  id: "triads",
  level: "beginner",
  title: "トライアドの構成音",
  settings: {
    defaults: DEFAULTS,
    parse,
    view: ({ value, onChange }) => (
      <fieldset class="field">
        <legend>メジャー・マイナーに足す型</legend>
        {(
          [
            ["dim", "dim（ディミニッシュ）"],
            ["aug", "aug（オーギュメント）"],
            ["sus", "sus2・sus4"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} class="check">
            <input
              type="checkbox"
              checked={value[k]}
              onChange={e => onChange({ ...value, [k]: e.currentTarget.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
    ),
  },

  items({ settings }) {
    // 型ごとに、構成音を答える → コード名を答える の順
    return typesOf(settings).flatMap(t => ROOTS[t]!.flatMap(r => [`${t}:${r}:tones`, `${t}:${r}:name`]));
  },

  itemLabel(id) {
    const [t, r, kind] = id.split(":");
    const sym = chordSymbol(note(r!), chordType(t!));
    return kind === "tones" ? `${sym} の構成音` : `${tonesText(r!, chordType(t!))} のコード名`;
  },

  question(id, { settings }, rng): Question {
    const [t, r, kind] = id.split(":") as [string, string, string];
    const type = chordType(t);
    const root = note(r);
    const sym = chordSymbol(root, type);
    const tones = tonesText(r, type);
    // 同じルートのほかの型（有効なものを先に）
    const others = shuffle(
      rng,
      typesOf(settings).filter(x => x !== t),
    ).concat(
      shuffle(
        rng,
        ALL_TYPES.filter(x => x !== t && !typesOf(settings).includes(x)),
      ),
    );
    const labels = chordToneLabels(type);
    const explanation = {
      text: `${sym} = ${chordTones(root, type)
        .map((n, i) => `${fmt(n)}（${labels[i]}）`)
        .join(" ")}`,
    };
    if (kind === "tones") {
      const options = fill(tones, [misspelled(r, type), ...others.map(x => tonesText(r, chordType(x)))]);
      return {
        item: id,
        prompt: { text: `${sym} の構成音は？` },
        answer: { kind: "choice", options: shuffle(rng, options), correct: tones },
        explanation,
      };
    }
    const options = fill(
      sym,
      others.map(x => chordSymbol(root, chordType(x))),
    );
    return {
      item: id,
      prompt: { text: `${tones}（ルートから）は何のコード？` },
      answer: { kind: "choice", options: shuffle(rng, options), correct: sym },
      explanation,
    };
  },

  reference: ({ ctx }) => (
    <>
      <p>トライアドはルートに 3 度と 5 度を重ねた 3 音。3 度と 5 度の高さで型が決まる。</p>
      <table class="ref-table">
        <thead>
          <tr>
            <th scope="col">型</th>
            <th scope="col">度数</th>
            <th scope="col">C の例</th>
          </tr>
        </thead>
        <tbody>
          {typesOf(ctx.settings).map(t => (
            <tr key={t}>
              <td>{t === "maj" ? "メジャー" : chordType(t).symbol}</td>
              <td>{chordToneLabels(chordType(t)).join(" ")}</td>
              <td>
                {chordSymbol(note("C"), chordType(t))}：{tonesText("C", chordType(t))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="muted">音名は度数の文字で綴る（E♭m の 3 度は F♯ ではなく G♭）。</p>
    </>
  ),
};
