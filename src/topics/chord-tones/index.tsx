/* コードの構成音の分野を作る道具。トライアドと 4和音で共通。
   コード名 → 構成音、構成音 → コード名、「Cm7 の ♭7 は？」の 3 形式（どれも 4択）。
   基本の型から始め、ほかの型は設定で足す。 */
import { shuffle } from "../../drill/rng";
import type { Level, Question, Topic } from "../../drill/topic";
import {
  type ChordType,
  type Note,
  chordSymbol,
  chordToneLabels,
  chordTones,
  chordType,
  fmt,
  note,
  pc,
  spellings,
} from "../../theory";

export interface ChordGroup {
  /** 設定のキー（保存されるので変えない） */
  readonly key: string;
  readonly label: string;
  readonly types: readonly string[];
}

export interface ChordTonesConfig {
  readonly id: string;
  readonly level: Level;
  readonly title: string;
  readonly intro: string;
  /** いつも出す型 */
  readonly base: readonly string[];
  /** 設定で足す型 */
  readonly groups: readonly ChordGroup[];
}

/** 足す型のオン／オフ（キーは ChordGroup.key） */
export type ChordTonesSettings = Readonly<Record<string, boolean>>;

/** ルートはよく使う綴りにする（短 3 度を含む型は C♯・G♯、それ以外は D♭・A♭） */
const MAJOR_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
const rootsOf = (t: ChordType) => (t.degrees.includes("b3") ? MINOR_ROOTS : MAJOR_ROOTS);

const tonesText = (root: Note, t: ChordType) => chordTones(root, t).map(fmt).join(" ");

/** 構成音のうち 1 つを異名同音に書き換えたもの（E♭ を D♯ と書く間違い） */
function misspelled(root: Note, t: ChordType): string | undefined {
  const tones = chordTones(root, t);
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

const nameOf = (t: ChordType) => (t.symbol === "" ? "メジャー" : t.symbol);

export function chordTonesTopic(cfg: ChordTonesConfig): Topic<ChordTonesSettings> {
  const defaults = Object.fromEntries(cfg.groups.map(g => [g.key, false]));
  const typesOf = (s: ChordTonesSettings) => [...cfg.base, ...cfg.groups.filter(g => s[g.key]).flatMap(g => g.types)];
  const allTypes = [...cfg.base, ...cfg.groups.flatMap(g => g.types)];

  return {
    id: cfg.id,
    level: cfg.level,
    title: cfg.title,
    settings: {
      defaults,
      parse(raw) {
        const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
        return Object.fromEntries(
          cfg.groups.map(g => [g.key, typeof r[g.key] === "boolean" ? (r[g.key] as boolean) : false]),
        );
      },
      view: ({ value, onChange }) => (
        <fieldset class="field">
          <legend>{cfg.base.map(t => nameOf(chordType(t))).join("・")} に足す型</legend>
          {cfg.groups.map(g => (
            <label key={g.key} class="check">
              <input
                type="checkbox"
                checked={!!value[g.key]}
                onChange={e => onChange({ ...value, [g.key]: e.currentTarget.checked })}
              />
              <span>{g.label}</span>
            </label>
          ))}
        </fieldset>
      ),
    },

    items({ settings }) {
      // 型ごとに、構成音を答える → コード名を答える → 度数の音を答える の順
      return typesOf(settings).flatMap(t =>
        rootsOf(chordType(t)).flatMap(r => [`${t}:${r}:tones`, `${t}:${r}:name`, `${t}:${r}:deg`]),
      );
    },

    itemLabel(id) {
      const [t, r, kind] = id.split(":") as [string, string, string];
      const type = chordType(t);
      const sym = chordSymbol(note(r), type);
      if (kind === "name") return `${tonesText(note(r), type)} のコード名`;
      return kind === "tones" ? `${sym} の構成音` : `${sym} の度数`;
    },

    question(id, { settings }, rng): Question {
      const [t, r, kind] = id.split(":") as [string, string, string];
      const type = chordType(t);
      const root = note(r);
      const sym = chordSymbol(root, type);
      const tones = chordTones(root, type);
      const text = tones.map(fmt).join(" ");
      const labels = chordToneLabels(type);
      // 同じルートのほかの型（設定で出しているものを先に）
      const on = typesOf(settings);
      const others = [
        ...shuffle(
          rng,
          on.filter(x => x !== t && chordType(x).degrees.length === type.degrees.length),
        ),
        ...shuffle(
          rng,
          allTypes.filter(x => x !== t && !on.includes(x)),
        ),
        ...shuffle(
          rng,
          on.filter(x => x !== t && chordType(x).degrees.length !== type.degrees.length),
        ),
      ].map(chordType);
      const explanation = { text: `${sym} = ${tones.map((n, i) => `${fmt(n)}（${labels[i]}）`).join(" ")}` };

      if (kind === "tones")
        return {
          item: id,
          prompt: { text: `${sym} の構成音は？` },
          answer: {
            kind: "choice",
            options: shuffle(rng, fill(text, [misspelled(root, type), ...others.map(x => tonesText(root, x))])),
            correct: text,
          },
          explanation,
        };
      if (kind === "name") {
        const options = fill(
          sym,
          others.map(x => chordSymbol(root, x)),
        );
        return {
          item: id,
          prompt: { text: `${text}（ルートから）は何のコード？` },
          answer: { kind: "choice", options: shuffle(rng, options), correct: sym },
          explanation,
        };
      }
      // 度数の音：R 以外から 1 つ
      const i = 1 + Math.floor(rng() * (tones.length - 1));
      const n = tones[i]!;
      const correct = fmt(n);
      const flat = { letter: n.letter, acc: n.acc - 1 },
        sharp = { letter: n.letter, acc: n.acc + 1 };
      const enh = spellings(pc(n)).find(m => m.letter !== n.letter);
      // 紛らわしい選択肢：半音ずらした綴り（𝄪・𝄫 にはしない）、異名同音、ほかの構成音
      const candidates = [
        ...shuffle(rng, [flat, sharp].filter(m => Math.abs(m.acc) <= 1).map(fmt)),
        enh && fmt(enh),
        ...shuffle(rng, tones.filter((_, j) => j !== i).map(fmt)),
      ];
      return {
        item: id,
        prompt: { text: `${sym} の ${labels[i]} の音は？` },
        answer: { kind: "choice", options: shuffle(rng, fill(correct, candidates)), correct },
        explanation,
      };
    },

    reference: ({ ctx }) => (
      <>
        <p>{cfg.intro}</p>
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
                <td>{nameOf(chordType(t))}</td>
                <td>{chordToneLabels(chordType(t)).join(" ")}</td>
                <td>{tonesText(note("C"), chordType(t))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="muted">音名は度数の文字で綴る（E♭m の 3 度は F♯ ではなく G♭、dim7 の 7 度は ♭♭7）。</p>
      </>
    ),
  };
}
