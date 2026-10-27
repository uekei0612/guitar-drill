/* 分野：ローコードの押さえ方。基本の 8 つ（C A G E D Am Em Dm）から始め、7th・m7・M7・F を設定で足す。
   押さえ方を作る（押さえるマスと鳴らす開放弦をタップ）と、形を見てコード名（4択）。
   押さえ方はレギュラーチューニングの形なので、ほかのチューニングでは出さない。 */
import { useState } from "preact/hooks";
import { shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { type Note, type Tuning, chordSymbol, chordTones, chordType, fmt, note } from "../../theory";
import { Fretboard } from "../../ui/Fretboard";
import {
  type LabelMode,
  type Shape,
  degreesText,
  hideRoot,
  rootHint,
  shape,
  shapeBoard,
  shapeRange,
  sounding,
  strumOf,
  tabText,
  thirdTip,
} from "../chord-shapes/shape";

export interface OpenChord {
  /** 記録のキーになるので変えない */
  readonly id: string;
  readonly root: Note;
  readonly type: string;
  readonly shape: Shape;
}

const chord = (id: string, root: string, type: string, frets: string, fingers: string): OpenChord => ({
  id,
  root: note(root),
  type,
  shape: shape(frets, fingers),
});

export const OPEN_CHORDS: readonly OpenChord[] = [
  chord("C", "C", "maj", "x32010", "x32010"),
  chord("A", "A", "maj", "x02220", "x01230"),
  chord("G", "G", "maj", "320003", "210003"),
  chord("E", "E", "maj", "022100", "023100"),
  chord("D", "D", "maj", "xx0232", "xx0132"),
  chord("Am", "A", "m", "x02210", "x02310"),
  chord("Em", "E", "m", "022000", "023000"),
  chord("Dm", "D", "m", "xx0231", "xx0231"),
  chord("A7", "A", "7", "x02020", "x02030"),
  chord("B7", "B", "7", "x21202", "x21304"),
  chord("C7", "C", "7", "x32310", "x32410"),
  chord("D7", "D", "7", "xx0212", "xx0213"),
  chord("E7", "E", "7", "020100", "020100"),
  chord("G7", "G", "7", "320001", "320001"),
  chord("Am7", "A", "m7", "x02010", "x02010"),
  chord("Dm7", "D", "m7", "xx0211", "xx0211"),
  chord("Em7", "E", "m7", "020000", "020000"),
  chord("CM7", "C", "M7", "x32000", "x32000"),
  chord("FM7", "F", "M7", "xx3210", "xx3210"),
  chord("F", "F", "maj", "133211", "134211"),
];

export interface OpenChordsSettings {
  readonly seventh: boolean;
  readonly minorSeventh: boolean;
  readonly majorSeventh: boolean;
  readonly f: boolean;
}

const GROUPS: readonly { key: keyof OpenChordsSettings; label: string; ids: readonly string[] }[] = [
  { key: "seventh", label: "7th（A7 B7 C7 D7 E7 G7）", ids: ["A7", "B7", "C7", "D7", "E7", "G7"] },
  { key: "minorSeventh", label: "m7（Am7 Dm7 Em7）", ids: ["Am7", "Dm7", "Em7"] },
  { key: "majorSeventh", label: "M7（CM7 FM7）", ids: ["CM7", "FM7"] },
  { key: "f", label: "F（最初のバレー）", ids: ["F"] },
];
const BASE = ["C", "A", "G", "E", "D", "Am", "Em", "Dm"];

const DEFAULTS: OpenChordsSettings = { seventh: false, minorSeventh: false, majorSeventh: false, f: false };

export const openChordById = (id: string): OpenChord => {
  const c = OPEN_CHORDS.find(x => x.id === id);
  if (!c) throw new Error(`ローコードが無い: ${id}`);
  return c;
};

const enabled = (s: OpenChordsSettings) => [...BASE, ...GROUPS.filter(g => s[g.key]).flatMap(g => g.ids)];

const mutedText = (s: Shape) => {
  const m = s.frets.flatMap((f, i) => (f === null ? [`${6 - i}弦`] : []));
  return m.length ? m.join("・") : "なし";
};

const nameOf = (c: OpenChord) => chordSymbol(c.root, chordType(c.type));

/** 押さえ方を出せるのはレギュラーだけ */
export const isStandard = (t: Tuning) => t.id === "standard";

/** 図と構成音の説明 */
function explain(t: Tuning, c: OpenChord) {
  const type = chordType(c.type);
  return {
    text: [
      `${nameOf(c)}：${tabText(c.shape)}（6弦→1弦。点の数字は指）`,
      `鳴る音の度数（低い弦から）：${degreesText(t, c.shape, c.root, type)}`,
    ].join("\n"),
    board: shapeBoard(t, c.shape, c.root, type, "finger"),
  };
}

export const openChords: Topic<OpenChordsSettings> = {
  id: "open-chords",
  level: "beginner",
  title: "ローコードの押さえ方",
  settings: {
    defaults: DEFAULTS,
    parse(raw) {
      const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return Object.fromEntries(
        GROUPS.map(g => [g.key, typeof r[g.key] === "boolean" ? r[g.key] : false]),
      ) as unknown as OpenChordsSettings;
    },
    view: ({ value, onChange }) => (
      <fieldset class="field">
        <legend>基本の 8 つ（C A G E D Am Em Dm）に足すコード</legend>
        {GROUPS.map(g => (
          <label key={g.key} class="check">
            <input
              type="checkbox"
              checked={value[g.key]}
              onChange={e => onChange({ ...value, [g.key]: e.currentTarget.checked })}
            />
            <span>{g.label}</span>
          </label>
        ))}
      </fieldset>
    ),
  },

  items({ common: { tuning }, settings }) {
    if (!isStandard(tuning)) return [];
    // コードごとに、押さえ方を作る → 形を見て名前 の順
    return enabled(settings).flatMap(id => [`${id}:play`, `${id}:name`]);
  },

  itemLabel(id) {
    const [c, kind] = id.split(":") as [string, string];
    return kind === "play" ? `${c} の押さえ方` : `${c} の形`;
  },

  question(id, { common: { tuning: t }, settings }, rng): Question {
    const [cid, kind] = id.split(":") as [string, string];
    const c = openChordById(cid);
    const name = nameOf(c);
    const range = shapeRange(c.shape);
    if (kind === "play")
      return {
        item: id,
        prompt: {
          text: `${name} を押さえる：押さえるマスと、鳴らす開放弦（ナットの手前の欄）をタップ。鳴らさない弦は押さない`,
        },
        answer: {
          kind: "tap",
          mode: "all",
          range: { minFret: 0, maxFret: Math.max(4, range.maxFret) },
          correct: sounding(c.shape),
          orientation: "horizontal",
          onePerString: true,
        },
        hint: rootHint(
          t,
          c.shape,
          c.root,
          chordType(c.type),
          `薄い点がルート（${fmt(c.root)}）。鳴らさない弦：${mutedText(c.shape)}。構成音は ${chordTones(c.root, chordType(c.type)).map(fmt).join(" ")}`,
        ),
        explanation: explain(t, c),
        sound: strumOf(t, c.shape),
      };
    // 形 → 名前。紛らわしい選択肢：同じルートのほかの型、同じ型のほかのルート、出しているほかのコード
    const pool = OPEN_CHORDS.filter(x => x.id !== c.id);
    const sameRoot = pool.filter(x => x.root.letter === c.root.letter && x.root.acc === c.root.acc);
    const sameType = pool.filter(x => x.type === c.type);
    const on = pool.filter(x => enabled(settings).includes(x.id));
    const others = [...shuffle(rng, sameRoot), ...shuffle(rng, sameType), ...shuffle(rng, on), ...shuffle(rng, pool)];
    const options = [name];
    for (const o of others.map(nameOf)) if (!options.includes(o) && options.length < 4) options.push(o);
    const board = shapeBoard(t, c.shape, c.root, chordType(c.type), "finger");
    return {
      item: id,
      prompt: {
        text: "この押さえ方のコードは？",
        board: { ...board, marks: hideRoot(board.marks) },
      },
      answer: { kind: "choice", options: shuffle(rng, options), correct: name },
      hint: rootHint(t, c.shape, c.root, chordType(c.type), `薄い点がルート。${thirdTip}`),
      explanation: explain(t, c),
      sound: strumOf(t, c.shape),
    };
  },

  reference: ({ ctx }) => <ChordSheet tuning={ctx.common.tuning} lefty={ctx.common.lefty} />,
};

/** 参考：全部の押さえ方。指番号と度数を切り替えて見る */
function ChordSheet({ tuning, lefty }: { tuning: Tuning; lefty: boolean }) {
  const [mode, setMode] = useState<LabelMode>("finger");
  if (!isStandard(tuning))
    return <p>ローコードの押さえ方はレギュラーチューニングの形です。設定でレギュラーにすると出題します。</p>;
  return (
    <>
      <p>
        点の数字は押さえる指（1 人差し指・2 中指・3 薬指・4 小指）、白抜きの ○ は開放弦、×
        は鳴らさない弦。オレンジの点がルート。
      </p>
      <div class="segmented" role="group" aria-label="点の文字">
        <button
          class={`btn${mode === "finger" ? " primary" : ""}`}
          aria-pressed={mode === "finger"}
          onClick={() => setMode("finger")}
        >
          指番号
        </button>
        <button
          class={`btn${mode === "degree" ? " primary" : ""}`}
          aria-pressed={mode === "degree"}
          onClick={() => setMode("degree")}
        >
          度数
        </button>
      </div>
      {[{ title: "基本", ids: BASE }, ...GROUPS.map(g => ({ title: g.label, ids: g.ids }))].map(sec => (
        <section key={sec.title}>
          <h2>{sec.title}</h2>
          <div class="chord-grid">
            {sec.ids.map(openChordById).map(c => {
              const b = shapeBoard(tuning, c.shape, c.root, chordType(c.type), mode);
              return (
                <figure key={c.id} class="chord-card">
                  <figcaption>{nameOf(c)}</figcaption>
                  <Fretboard tuning={tuning} lefty={lefty} label={`${nameOf(c)} の押さえ方`} {...b} />
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
