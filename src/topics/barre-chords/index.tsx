/* 分野：ハイコード（バレーコード）の押さえ方。6弦ルート（E 型）と 5弦ルート（A 型）のフォームを、
   メジャー・m・7・m7 から始め、M7・m7(♭5) を設定で足す。
   フォームを作る（ルートを示して残りをタップ）、何フレットでバレーするか（4択）、形を見てコード名（4択）。
   フォームは根音のフレットを 0 にした押さえ方で持ち、根音のフレットだけずらす。 */
import { useState } from "preact/hooks";
import { shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { type Note, type Tuning, chordSymbol, chordType, fmt, mod, note, openNote, pc, spellings } from "../../theory";
import { Fretboard } from "../../ui/Fretboard";
import {
  type LabelMode,
  type Shape,
  degreesText,
  hideRoot,
  rootHint,
  shapeBoard,
  shapeRange,
  shift,
  sounding,
  strumOf,
  tabText,
  thirdTip,
} from "../chord-shapes/shape";
import { isStandard } from "../open-chords";

export interface BarreForm {
  /** ルートの弦 */
  readonly rootString: 6 | 5;
  readonly type: string;
  /** 根音のフレットを 0 にした押さえ方（-1 は根音の 1 フレット手前） */
  readonly frets: readonly (number | null)[];
  readonly fingers: readonly (number | null)[];
}

const form = (rootString: 6 | 5, type: string, frets: string, fingers: string): BarreForm => {
  const read = (s: string) => s.split(" ").map(c => (c === "x" ? null : Number(c)));
  return { rootString, type, frets: read(frets), fingers: read(fingers) };
};

/** 6弦→1弦。E 型は開放の E・Em・E7… を、A 型は A・Am・A7… を人差し指のバレーでずらしたもの */
export const FORMS: readonly BarreForm[] = [
  form(6, "maj", "0 2 2 1 0 0", "1 3 4 2 1 1"),
  form(6, "m", "0 2 2 0 0 0", "1 3 4 1 1 1"),
  form(6, "7", "0 2 0 1 0 0", "1 3 1 2 1 1"),
  form(6, "m7", "0 2 0 0 0 0", "1 3 1 1 1 1"),
  form(6, "M7", "0 x 1 1 0 x", "1 x 3 4 2 x"),
  form(6, "m7b5", "0 x 0 0 -1 x", "2 x 3 4 1 x"),
  form(5, "maj", "x 0 2 2 2 0", "x 1 3 3 3 1"),
  form(5, "m", "x 0 2 2 1 0", "x 1 3 4 2 1"),
  form(5, "7", "x 0 2 0 2 0", "x 1 3 1 4 1"),
  form(5, "m7", "x 0 2 0 1 0", "x 1 3 1 2 1"),
  form(5, "M7", "x 0 2 1 2 0", "x 1 3 2 4 1"),
  form(5, "m7b5", "x 0 1 0 1 x", "x 1 3 2 4 x"),
];

const BASE_TYPES = ["maj", "m", "7", "m7"];

export interface BarreChordsSettings {
  readonly majorSeventh: boolean;
  readonly halfDiminished: boolean;
}
const DEFAULTS: BarreChordsSettings = { majorSeventh: false, halfDiminished: false };

const typesOf = (s: BarreChordsSettings) => [
  ...BASE_TYPES,
  ...(s.majorSeventh ? ["M7"] : []),
  ...(s.halfDiminished ? ["m7b5"] : []),
];

/** ルートはよく使う綴り（短 3 度を含む型は C♯・G♯、それ以外は D♭・A♭） */
const MAJOR_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
const rootsOf = (type: string) => (chordType(type).degrees.includes("b3") ? MINOR_ROOTS : MAJOR_ROOTS);

export const formOf = (rootString: number, type: string): BarreForm => {
  const f = FORMS.find(x => x.rootString === rootString && x.type === type);
  if (!f) throw new Error(`フォームが無い: ${rootString} ${type}`);
  return f;
};

/** その弦でルートを押さえるフレット（1〜12。開放になるときは 12 フレットで） */
export const rootFret = (t: Tuning, rootString: number, root: Note): number =>
  mod(pc(root) - pc(openNote(t, rootString)), 12) || 12;

/** フォームの根音のフレット。根音より手前を押さえる形（m7(♭5) の E 型）がナットを越えるときは 1 オクターブ上 */
export function formFret(t: Tuning, f: BarreForm, root: Note): number {
  const fret = rootFret(t, f.rootString, root);
  const lowest = Math.min(...f.frets.filter((x): x is number => x !== null));
  return fret + lowest < 1 ? fret + 12 : fret;
}

/** フォームを根音のフレットに置いた押さえ方 */
export function barreShape(t: Tuning, f: BarreForm, root: Note): Shape {
  return shift({ frets: f.frets, fingers: f.fingers }, formFret(t, f, root));
}

/** ヒント：フォームの作り方。基本の 4 つは開放のコード（E 型の m なら Em = 022000）をバレーでずらしたもの */
function formHint(f: BarreForm, fret: number): string {
  const tab = f.frets.map(x => (x === null ? "x" : String(x))).join(" ");
  if (!BASE_TYPES.includes(f.type)) return `根音のフレットを 0 とした形（6弦→1弦。x は鳴らさない）：${tab}`;
  const open = `${f.rootString === 6 ? "E" : "A"}${chordType(f.type).symbol}`;
  return `開放の ${open}（${tab.replace(/ /g, "")}）の形を、${fret}フレットで人差し指のバレーにしてずらしたもの`;
}

/** ヒント：ルートの弦の目印（開放・5・7・12 フレット） */
const landmarks = (t: Tuning, string: number) =>
  [0, 5, 7, 12]
    .map(f => `${f === 0 ? "開放" : `${f}f`} ${fmt(spellings(mod(pc(openNote(t, string)) + f, 12))[0]!)}`)
    .join("・");

const formName = (rootString: number) => (rootString === 6 ? "6弦ルート（E 型）" : "5弦ルート（A 型）");
const nameOf = (root: Note, type: string) => chordSymbol(root, chordType(type));

function explain(t: Tuning, f: BarreForm, root: Note) {
  const s = barreShape(t, f, root);
  const fret = formFret(t, f, root);
  const type = chordType(f.type);
  return {
    text: [
      `${nameOf(root, f.type)}：${formName(f.rootString)}、ルートは ${f.rootString}弦 ${fret}フレット（開放の ${fmt(openNote(t, f.rootString))} から半音 ${fret} つ）`,
      `押さえ方（6弦→1弦）：${tabText(s)}`,
      `鳴る音の度数（低い弦から）：${degreesText(t, s, root, type)}`,
    ].join("\n"),
    board: shapeBoard(t, s, root, type, "finger"),
  };
}

export const barreChords: Topic<BarreChordsSettings> = {
  id: "barre-chords",
  level: "beginner",
  title: "ハイコードの押さえ方",
  settings: {
    defaults: DEFAULTS,
    describe: s => ["基本 4 型", s.majorSeventh && "M7", s.halfDiminished && "m7(♭5)"].filter(Boolean).join("＋"),
    parse(raw) {
      const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        majorSeventh: typeof r.majorSeventh === "boolean" ? r.majorSeventh : false,
        halfDiminished: typeof r.halfDiminished === "boolean" ? r.halfDiminished : false,
      };
    },
    view: ({ value, onChange }) => (
      <fieldset class="field">
        <legend>メジャー・m・7・m7 に足すフォーム</legend>
        <label class="check">
          <input
            type="checkbox"
            checked={value.majorSeventh}
            onChange={e => onChange({ ...value, majorSeventh: e.currentTarget.checked })}
          />
          <span>M7</span>
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={value.halfDiminished}
            onChange={e => onChange({ ...value, halfDiminished: e.currentTarget.checked })}
          />
          <span>m7(♭5)</span>
        </label>
      </fieldset>
    ),
  },

  items({ common: { tuning }, settings }) {
    if (!isStandard(tuning)) return [];
    // 型ごと・弦ごとに、ルートを C から。フォームを作る → 何フレット → 形を見て名前
    return typesOf(settings).flatMap(type =>
      [6, 5].flatMap(str =>
        rootsOf(type).flatMap(r => [
          `${str}:${type}:${r}:play`,
          `${str}:${type}:${r}:fret`,
          `${str}:${type}:${r}:name`,
        ]),
      ),
    );
  },

  itemLabel(id) {
    const [str, type, r, kind] = id.split(":") as [string, string, string, string];
    const name = `${nameOf(note(r), type)}（${str}弦ルート）`;
    return kind === "play" ? `${name} の押さえ方` : kind === "fret" ? `${name} のフレット` : `${name} の形`;
  },

  question(id, { common: { tuning: t }, settings }, rng): Question {
    const [str, type, r, kind] = id.split(":") as [string, string, string, string];
    const f = formOf(Number(str), type);
    const root = note(r);
    const name = nameOf(root, type);
    const s = barreShape(t, f, root);
    const fret = formFret(t, f, root);
    const ex = explain(t, f, root);
    const sound = strumOf(t, s);

    if (kind === "play") {
      const rootPos = { string: f.rootString, fret };
      const strings = [6, 5, 4, 3, 2, 1].filter(x => x !== f.rootString);
      return {
        item: id,
        prompt: {
          text: `${formName(f.rootString)}で ${name} を押さえる`,
          how: `ルートは ${f.rootString}弦 ${fret}フレット。ほかに押さえるマスを全部タップ`,
          board: {
            range: shapeRange(s),
            marks: [{ pos: rootPos, kind: "root", label: "R" }],
            orientation: "horizontal",
          },
        },
        answer: {
          kind: "tap",
          mode: "all",
          range: shapeRange(s),
          correct: sounding(s).filter(p => p.string !== f.rootString),
          strings,
          orientation: "horizontal",
          onePerString: true,
        },
        hint: { text: formHint(f, fret) },
        explanation: ex,
        sound,
      };
    }

    if (kind === "fret") {
      const near = [1, -1, 2, -2, 3, -3, 5, 7].map(d => fret + d).filter(x => x >= 1 && x <= 15);
      const options = [fret, ...shuffle(rng, near.slice(0, 5)).slice(0, 3)].map(x => `${x}フレット`);
      return {
        item: id,
        prompt: {
          text: `${formName(f.rootString)}で ${name} を押さえるとき、ルート（${f.rootString}弦）は何フレット？`,
        },
        answer: { kind: "choice", options: shuffle(rng, options), correct: `${fret}フレット` },
        hint: {
          text: `${f.rootString}弦の目印：${landmarks(t, f.rootString)}。いちばん近い目印から半音（1 フレット）ずつ数える`,
        },
        explanation: ex,
        sound,
      };
    }

    // 形 → 名前。紛らわしい選択肢：同じ形でルートをもう一方の弦で読んだもの、同じルートのほかの型、隣のルート
    const other = f.rootString === 6 ? 5 : 6;
    const misread = (() => {
      const pcOther = mod(pc(openNote(t, other)) + fret, 12);
      const r2 = rootsOf(type).find(x => pc(note(x)) === pcOther)!;
      return nameOf(note(r2), type);
    })();
    const sameRoot = typesOf(settings)
      .filter(x => x !== type)
      .map(x => nameOf(root, x));
    const neighbors = [1, -1].map(d => {
      const p2 = mod(pc(root) + d, 12);
      return nameOf(note(rootsOf(type).find(x => pc(note(x)) === p2)!), type);
    });
    const options = [name];
    for (const o of [misread, ...shuffle(rng, sameRoot), ...shuffle(rng, neighbors)])
      if (!options.includes(o) && options.length < 4) options.push(o);
    const board = shapeBoard(t, s, root, chordType(type), "finger");
    return {
      item: id,
      prompt: {
        text: "この押さえ方のコードは？（ルートの弦とフレットから）",
        board: { ...board, marks: hideRoot(board.marks) },
      },
      answer: { kind: "choice", options: shuffle(rng, options), correct: name },
      hint: rootHint(
        t,
        s,
        root,
        chordType(type),
        `薄い点がルート（${f.rootString}弦 ${fret}フレット）。${f.rootString}弦の目印：${landmarks(t, f.rootString)}。型は ${thirdTip}`,
      ),
      explanation: ex,
      sound,
    };
  },

  reference: ({ ctx }) => <FormSheet tuning={ctx.common.tuning} lefty={ctx.common.lefty} />,
};

/** 参考：フォームの一覧と、ルートのフレット表 */
function FormSheet({ tuning, lefty }: { tuning: Tuning; lefty: boolean }) {
  const [mode, setMode] = useState<LabelMode>("finger");
  if (!isStandard(tuning))
    return <p>ハイコードのフォームはレギュラーチューニングの形です。設定でレギュラーにすると出題します。</p>;
  // 例は 6弦ルートを G（3 フレット）、5弦ルートを C（3 フレット）に置く
  const example = { 6: note("G"), 5: note("C") } as const;
  return (
    <>
      <p>
        ハイコードは、開放弦のコードの形（E・A）を人差し指のバレーで平行移動したもの。形はそのままで、ルートのある弦の音名でコード名が決まる。
      </p>
      <h2>ルートのフレット</h2>
      <table class="ref-table">
        <thead>
          <tr>
            <th scope="col">ルート</th>
            <th scope="col">6弦（E 型）</th>
            <th scope="col">5弦（A 型）</th>
          </tr>
        </thead>
        <tbody>
          {MAJOR_ROOTS.map(r => (
            <tr key={r}>
              <td>{fmt(note(r))}</td>
              <td>{rootFret(tuning, 6, note(r))}</td>
              <td>{rootFret(tuning, 5, note(r))}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      {([6, 5] as const).map(str => (
        <section key={str}>
          <h2>
            {formName(str)}（例：{fmt(example[str])} ＝ 3 フレット）
          </h2>
          <div class="chord-grid">
            {FORMS.filter(f => f.rootString === str).map(f => {
              const b = shapeBoard(tuning, barreShape(tuning, f, example[str]), example[str], chordType(f.type), mode);
              const name = nameOf(example[str], f.type);
              return (
                <figure key={f.type} class="chord-card">
                  <figcaption>{name}</figcaption>
                  <Fretboard tuning={tuning} lefty={lefty} label={`${name} の押さえ方`} {...b} />
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
