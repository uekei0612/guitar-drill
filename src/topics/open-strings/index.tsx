/* 分野：開放弦の音名。弦番号 → 音名（4択）と、音名 → 弦（指板をタップ）。
   item はチューニングごとに分ける（ドロップ D の 6 弦と、レギュラーの 6 弦の成績を混ぜない）。 */
import { shuffle } from "../../drill/rng";
import type { Context, Question, Topic } from "../../drill/topic";
import { type Tuning, equals, fmt, midiAt, note, noteId, openNote, stringCount } from "../../theory";
import { Fretboard } from "../../ui/Fretboard";

const RANGE = { minFret: 0, maxFret: 3 };
/** タップで答えるのは開放の列だけ（1〜3 フレットは見せるだけ） */
const OPEN = { minFret: 0, maxFret: 0 };

/** 弦の音（低い弦から） */
const openSound = (t: Tuning, strings: readonly number[]) => ({
  notes: [...strings].sort((a, b) => b - a).map(s => midiAt(t, { string: s, fret: 0 })),
});

/** 開放弦の音（重複を除く、低い弦から） */
function openNotes(t: Tuning) {
  return t.open.filter((n, i) => t.open.findIndex(m => equals(m, n)) === i);
}

/** ヒント：隣の弦の開放から数える（a 弦の開放は、b 弦の何フレット目と同じ音か） */
function neighborHint(t: Tuning, s: number): string {
  const n = stringCount(t);
  const other = s < n ? s + 1 : s - 1;
  const d = midiAt(t, { string: s, fret: 0 }) - midiAt(t, { string: other, fret: 0 });
  return d > 0
    ? `${other}弦の開放は ${fmt(openNote(t, other))}。${s}弦の開放は、${other}弦の ${d} フレットと同じ音`
    : `${other}弦の開放は ${fmt(openNote(t, other))}。${s}弦の開放は、そこから半音 ${-d} 下`;
}

const stringsOf = (t: Tuning, n: ReturnType<typeof note>) =>
  Array.from({ length: stringCount(t) }, (_, i) => i + 1).filter(s => equals(openNote(t, s), n));

type Item = { kind: "name"; string: number } | { kind: "string"; note: string };

function parseItem(id: string): Item {
  const [, kind, x] = id.split(":");
  return kind === "name" ? { kind, string: Number(x) } : { kind: "string", note: x! };
}

/** 解説の図：全部の弦の開放の音。聞かれた弦（focus）は色を変えて目立たせる */
function openBoard(t: Tuning, focus: readonly number[]) {
  return {
    range: RANGE,
    marks: Array.from({ length: stringCount(t) }, (_, i) => ({
      pos: { string: i + 1, fret: 0 },
      kind: focus.includes(i + 1) ? ("root" as const) : ("tone" as const),
      label: fmt(openNote(t, i + 1)),
    })),
  };
}

export const openStrings: Topic = {
  id: "open-strings",
  level: "beginner",
  title: "開放弦の音名",

  items({ common: { tuning: t } }) {
    // 6 弦から順に覚える
    const names = Array.from({ length: stringCount(t) }, (_, i) => `${t.id}:name:${stringCount(t) - i}`);
    const strings = openNotes(t).map(n => `${t.id}:string:${noteId(n)}`);
    return [...names, ...strings];
  },

  itemLabel(id) {
    const it = parseItem(id);
    return it.kind === "name" ? `${it.string}弦の音名` : `${fmt(note(it.note))} の弦`;
  },

  question(id, ctx: Context<Record<string, never>>, rng): Question {
    const t = ctx.common.tuning;
    const it = parseItem(id);
    if (it.kind === "name") {
      const correct = fmt(openNote(t, it.string));
      // 紛らわしい選択肢：ほかの開放弦の音、それでも足りなければ自然音から
      const pool = [...openNotes(t).map(fmt), ..."CDEFGAB".split("")].filter(x => x !== correct);
      const others = shuffle(rng, [...new Set(pool)]).slice(0, 3);
      return {
        item: id,
        prompt: {
          text: `${it.string}弦の開放弦の音は？`,
          board: { range: RANGE, marks: [{ pos: { string: it.string, fret: 0 }, kind: "target" }] },
        },
        answer: { kind: "choice", options: shuffle(rng, [correct, ...others]), correct },
        hint: { text: neighborHint(t, it.string) },
        explanation: {
          text: `${t.name}：${stringCount(t)}弦から ${t.open.map(fmt).join(" ")}`,
          board: openBoard(t, [it.string]),
        },
        sound: openSound(t, [it.string]),
      };
    }
    const n = note(it.note);
    const strings = stringsOf(t, n);
    return {
      item: id,
      prompt: {
        text: `開放弦が ${fmt(n)} の弦は？`,
        how: strings.length > 1 ? `全部タップ（${strings.length} 本）` : "タップで答える",
      },
      answer: {
        kind: "tap",
        mode: strings.length > 1 ? "all" : "any",
        range: RANGE,
        frets: OPEN,
        correct: strings.map(s => ({ string: s, fret: 0 })),
      },
      // 答えの弦を伏せて、太い弦からの並びを見せる
      hint: {
        text: `${stringCount(t)}弦から：${Array.from({ length: stringCount(t) }, (_, i) => stringCount(t) - i)
          .map(s => (strings.includes(s) ? "?" : fmt(openNote(t, s))))
          .join(" ")}`,
      },
      explanation: { text: `${fmt(n)} は ${strings.map(s => `${s}弦`).join("と")}`, board: openBoard(t, strings) },
      sound: openSound(t, strings),
    };
  },

  reference: ({ ctx }) => {
    const t = ctx.common.tuning;
    return (
      <>
        <p>
          {t.name}の開放弦は、{stringCount(t)}弦（いちばん太い弦）から <strong>{t.open.map(fmt).join(" ")}</strong>。
        </p>
        <Fretboard
          tuning={t}
          range={RANGE}
          lefty={ctx.common.lefty}
          label={`${t.name}の開放弦`}
          marks={openBoard(t, []).marks}
        />
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">弦</th>
              <th scope="col">音名</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: stringCount(t) }, (_, i) => stringCount(t) - i).map(s => (
              <tr key={s}>
                <td>{s}弦</td>
                <td>{fmt(openNote(t, s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  },
};
