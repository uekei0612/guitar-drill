/* 分野：ダイアトニックコード（旧 diatonic-drill を 1 分野として作り直したもの）。
   度数 → コード、コード → 度数、スケールの音。三和音／四和音と、マイナーの Ⅴ・Ⅶ を借りる設定。 */
import { useState } from "preact/hooks";
import { type Rng, pick, shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import {
  type Key,
  type Note,
  KEYS,
  SEVENTHS,
  TRIADS,
  chordSymbol,
  diatonicChords,
  fmt,
  keyId,
  keyLabel,
  keySignature,
  note,
  scaleIntervals,
  scaleNotes,
  spellings,
  pc,
  degreeLabel,
  semitones,
} from "../../theory";
import { voiced } from "../../chart/audio";
import { accidentals, sigLabel } from "../circle-of-fifths";
import * as Lesson from "./lesson";

/** 調号の言い方（♯2つ：F♯ C♯） */
const sigText = (k: Key) => {
  const n = keySignature(k);
  return `キー ${keyLabel(k)} の調号は${sigLabel(n)}${n ? `（${accidentals(n).join(" ")}）` : ""}`;
};

export interface DiatonicSettings {
  readonly size: 3 | 4;
  /** マイナーキーの Ⅴ・Ⅶ をハーモニックマイナーから借りる */
  readonly borrowDominant: boolean;
  /** 出すキー（keyId）。空ならすべて（キーの画面から 1 回だけ絞るときに使う） */
  readonly keys: readonly string[];
}

const DEFAULTS: DiatonicSettings = { size: 4, borrowDominant: false, keys: [] };

function parse(raw: unknown): DiatonicSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    size: r.size === 3 || r.size === 4 ? r.size : DEFAULTS.size,
    borrowDominant: typeof r.borrowDominant === "boolean" ? r.borrowDominant : DEFAULTS.borrowDominant,
    keys: Array.isArray(r.keys) ? r.keys.filter((k): k is string => typeof k === "string" && keyById.has(k)) : [],
  };
}

/** ♯系→♭系の順に、同じ位置のメジャーとマイナーを交互に */
export const ALL_KEYS: readonly Key[] = KEYS.major.flatMap((k, i) => [k, KEYS.minor[i]!]);
const keyById = new Map(ALL_KEYS.map(k => [keyId(k), k]));

/** 型の呼び名（記号の無いメジャーの三和音は「メジャー」） */
const typeWord = (symbol: string) => symbol || "メジャー";
const modeWord = (k: Key) => (k.mode === "major" ? "メジャー" : "マイナー");

const scaleOf = (k: Key) => (k.mode === "major" ? "major" : "natural_minor");
/** 主音から見た度数（R 2 ♭3 …） */
const degreeNames = (k: Key) => scaleIntervals(scaleOf(k)).map(degreeLabel);

/** 変化記号を 1 つずらした音（♯♭が 2 つにならない向きで） */
function alter(n: Note, rng: Rng): Note {
  const ds = [1, -1].filter(d => Math.abs(n.acc + d) <= 1);
  return { letter: n.letter, acc: n.acc + pick(rng, ds.length ? ds : [1, -1]) };
}
/** 異名同音（文字の違う綴り） */
const enharmonic = (n: Note): Note | undefined => spellings(pc(n)).find(m => m.letter !== n.letter);

function fill(correct: string, candidates: readonly (string | undefined)[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (c && !out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

/** キー × 設定ごとのダイアトニックコード（出題のたびに作り直さない） */
const chordCache = new Map<string, ReturnType<typeof diatonicChords>>();
function chordsOf(key: Key, size: 3 | 4, s: DiatonicSettings) {
  const k = `${keyId(key)}:${size}:${s.borrowDominant}`;
  let c = chordCache.get(k);
  if (!c) chordCache.set(k, (c = diatonicChords(key, size, s)));
  return c;
}

type Kind = "d2c" | "c2d" | "note";

function parseItem(id: string) {
  const [k, size, kind, i] = id.split(":") as [string, string, Kind, string];
  return { key: keyById.get(k)!, size: Number(size) as 3 | 4, kind, i: Number(i) };
}

export const diatonic: Topic<DiatonicSettings> = {
  id: "diatonic",
  level: "intermediate",
  title: "ダイアトニックコード",
  settings: {
    defaults: DEFAULTS,
    describe: s =>
      `${s.size === 4 ? "4和音" : "3和音"}${s.borrowDominant ? "／マイナーの Ⅴ・Ⅶ を借りる" : ""}${
        s.keys.length ? `／キー ${s.keys.map(k => keyLabel(keyById.get(k)!)).join("・")}` : ""
      }`,
    parse,
    view: ({ value, onChange }) => (
      <>
        <label class="field">
          <span>コード</span>
          <select
            value={value.size}
            onChange={e => onChange({ ...value, size: Number(e.currentTarget.value) as 3 | 4 })}
          >
            <option value={3}>三和音（C、Dm …）</option>
            <option value={4}>四和音（CM7、Dm7 …）</option>
          </select>
        </label>
        <label class="field check">
          <input
            type="checkbox"
            checked={value.borrowDominant}
            onChange={e => onChange({ ...value, borrowDominant: e.currentTarget.checked })}
          />
          <span>マイナーの Ⅴ・Ⅶ をハーモニックマイナーから借りる（Am なら E7・G♯dim7）</span>
        </label>
      </>
    ),
  },

  items({ settings: { size, keys } }) {
    return ALL_KEYS.filter(k => !keys.length || keys.includes(keyId(k))).flatMap(k => {
      const id = keyId(k);
      const chords = [0, 1, 2, 3, 4, 5, 6].flatMap(i => [`${id}:${size}:d2c:${i}`, `${id}:${size}:c2d:${i}`]);
      const notes = [1, 2, 3, 4, 5, 6].map(i => `${id}:${size}:note:${i}`);
      return [...chords, ...notes];
    });
  },

  itemLabel(id, { settings }) {
    const { key, size, kind, i } = parseItem(id);
    const c = chordsOf(key, size, settings)[i]!;
    if (kind === "note") return `キー ${keyLabel(key)} の ${degreeNames(key)[i]}`;
    return kind === "d2c" ? `キー ${keyLabel(key)} の ${c.label}` : `キー ${keyLabel(key)} の ${c.symbol}`;
  },

  question(id, { settings }, rng): Question {
    const { key, size, kind, i } = parseItem(id);
    const ch = chordsOf(key, size, settings);
    const c = ch[i]!;
    const kl = keyLabel(key);
    const tones = `${c.symbol} = ${c.tones.map(fmt).join(" ")}（${c.toneLabels.join(" ")}）`;
    const pattern = `${modeWord(key)}キーの ${c.roman} はどのキーでも ${typeWord(c.type.symbol)}`;
    const strip = {
      strip: ch.map(x => ({ label: x.symbol, sub: x.roman, current: x.degree === i })),
      stripLabel: `キー ${kl} のダイアトニックコード`,
    };
    const chordSound = { notes: [], chords: [voiced(pc(c.root), c.tones.map(pc))] };
    if (kind === "d2c") {
      const types = (size === 3 ? TRIADS.slice(0, 3) : SEVENTHS.slice(0, 5)).filter(t => t.id !== c.type.id);
      const sameRoot = shuffle(
        rng,
        types.map(t => chordSymbol(c.root, t)),
      );
      const shifted = fmt(alter(c.root, rng)) + c.type.symbol;
      const otherChords = shuffle(
        rng,
        ch.filter(x => x.degree !== i).map(x => x.symbol),
      );
      const options = fill(c.symbol, [sameRoot[0], shifted, otherChords[0], ...sameRoot, ...otherChords]);
      return {
        item: id,
        prompt: { text: `キー ${kl} で ${c.label} は？` },
        answer: { kind: "choice", options: shuffle(rng, options), correct: c.symbol },
        hint: {
          text: `ルートは主音 ${fmt(key.tonic)} から文字で数えて ${i + 1} 番目の音（${fmt(key.tonic)} が 1）。${sigText(key)}`,
        },
        explanation: { text: [tones, pattern].join("\n"), ...strip },
        sound: chordSound,
      };
    }
    if (kind === "c2d")
      return {
        item: id,
        prompt: { text: `キー ${kl} で ${c.symbol} は何度？` },
        answer: { kind: "choice", options: ch.map(x => x.label), correct: c.label },
        hint: {
          text: `ルート ${fmt(c.root)} が、主音 ${fmt(key.tonic)} から文字で数えて何番目か（${fmt(key.tonic)} が 1）。型は ${typeWord(c.type.symbol)}`,
        },
        explanation: {
          text: [`ルート ${fmt(c.root)} はキー ${kl} のスケールの ${i + 1} 番目 → ${c.roman}`, pattern].join("\n"),
          ...strip,
        },
        sound: chordSound,
      };
    const notes = scaleNotes(scaleOf(key), key.tonic);
    const n = notes[i]!;
    const correct = fmt(n);
    const e = enharmonic(n);
    const options = fill(correct, [
      fmt(alter(n, rng)),
      e && fmt(e),
      fmt(notes[(i + pick(rng, [1, 6])) % 7]!),
      ...shuffle(rng, notes.map(fmt)),
      fmt(alter(n, rng)),
    ]);
    return {
      item: id,
      prompt: { text: `キー ${kl} の ${degreeNames(key)[i]} の音は？` },
      answer: { kind: "choice", options: shuffle(rng, options), correct },
      hint: { text: `主音 ${fmt(key.tonic)} から文字で ${i + 1} つ目（${fmt(key.tonic)} が 1）。${sigText(key)}` },
      explanation: {
        text: "",
        strip: notes.map((x, j) => ({ label: fmt(x), sub: degreeNames(key)[j], current: j === i })),
        stripLabel: `キー ${kl} のスケール`,
      },
      // 主音と、その音
      sound: {
        notes: [60 + pc(key.tonic), 60 + pc(key.tonic) + semitones(scaleIntervals(scaleOf(key))[i]!)],
        chord: true,
      },
    };
  },

  reference: ({ ctx }) => {
    const [idx, setIdx] = useState(0);
    const key = ALL_KEYS[idx]!;
    const ch = diatonicChords(key, ctx.settings.size, ctx.settings);
    const notes = scaleNotes(scaleOf(key), key.tonic);
    const go = (d: number) => setIdx(i => (i + d + ALL_KEYS.length) % ALL_KEYS.length);
    return (
      <>
        <Lesson.Intro />
        <div class="pager" role="group" aria-label="キーをめくる">
          <button class="btn" onClick={() => go(-1)} aria-label="前のキー">
            ←
          </button>
          <h2 aria-live="polite">キー {keyLabel(key)}</h2>
          <button class="btn" onClick={() => go(1)} aria-label="次のキー">
            →
          </button>
        </div>
        <p>
          スケール：{notes.map(fmt).join(" ")}
          <br />
          <span class="muted">（{degreeNames(key).join(" ")}）</span>
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">度数</th>
              <th scope="col">コード</th>
              <th scope="col">構成音</th>
            </tr>
          </thead>
          <tbody>
            {ch.map(c => (
              <tr key={c.degree}>
                <td>{c.label}</td>
                <td>{c.symbol}</td>
                <td>{c.tones.map(fmt).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="muted">
          Ⅰ〜Ⅶ の型はどのキーでも同じ。メジャー：
          {diatonicChords({ mode: "major", tonic: note("C") }, ctx.settings.size)
            .map(c => c.label)
            .join(" ")}
        </p>
        <Lesson.Body standard={ctx.common.tuning.id === "standard"} />
      </>
    );
  },
};
