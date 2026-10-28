/* 分野：指板の音名。位置 → 音名（4択）と、音名 → 位置（指板をタップ）。
   初心者は自然音・6 弦と 5 弦から始め、設定で弦・フレット・♯♭を広げる。
   ♯♭を含めるときは異名同音をまとめて 1 つの選択肢にする（F♯/G♭ はどちらでも正解）。 */
import { shuffle } from "../../drill/rng";
import type { Hint, Mark, Question, Topic } from "../../drill/topic";
import {
  type FretRange,
  type Position,
  type Tuning,
  midiAt,
  mod,
  noteId,
  pcAt,
  positionsOf,
  spellings,
  fmt,
  stringCount,
} from "../../theory";
import { Fretboard } from "../../ui/Fretboard";
import { chooseOrientation } from "../../ui/fretboard-layout";

export interface FretNotesSettings {
  /** 出題する弦 */
  readonly strings: readonly number[];
  readonly maxFret: number;
  /** ♯♭の付く音も出す */
  readonly accidentals: boolean;
}

export const MAX_FRETS = [5, 7, 12] as const;

const DEFAULTS: FretNotesSettings = { strings: [6, 5], maxFret: 12, accidentals: false };

function parse(raw: unknown): FretNotesSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const strings = Array.isArray(r.strings)
    ? [...new Set(r.strings.filter((s): s is number => Number.isInteger(s) && s >= 1 && s <= 8))].sort((a, b) => b - a)
    : [];
  return {
    strings: strings.length ? strings : DEFAULTS.strings,
    maxFret: (MAX_FRETS as readonly unknown[]).includes(r.maxFret) ? (r.maxFret as number) : DEFAULTS.maxFret,
    accidentals: typeof r.accidentals === "boolean" ? r.accidentals : DEFAULTS.accidentals,
  };
}

const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
const isNatural = (pc: number) => NATURAL_PCS.includes(pc);

/** ピッチクラスの表記。♯♭の付く音は「F♯/G♭」 */
export const pcName = (pc: number): string =>
  isNatural(pc) ? fmt(spellings(pc)[0]!) : spellings(pc).map(fmt).join("/");

/** 出題する弦のうち、今のチューニングにある弦 */
const activeStrings = (s: FretNotesSettings, t: Tuning) => {
  const on = s.strings.filter(x => x <= stringCount(t));
  // 選んだ弦がこのチューニングに無い（4 弦ベースで 6 弦・5 弦など）ときは、低い 2 本で出す
  return on.length ? on : [stringCount(t), stringCount(t) - 1].filter(x => x >= 1);
};

const posId = (t: Tuning, p: Position) => `${t.id}:${p.string}:${p.fret}`;

function parseItem(id: string): { kind: "pos"; pos: Position } | { kind: "note"; pc: number } {
  const [, a, b] = id.split(":");
  if (a === "note") return { kind: "note", pc: Number(b) };
  return { kind: "pos", pos: { string: Number(a), fret: Number(b) } };
}

/** 位置のまわり 5 フレットの窓 */
function windowAround(fret: number, maxFret: number): FretRange {
  const minFret = Math.max(0, Math.min(fret - 2, maxFret - 4));
  return { minFret, maxFret: minFret + 4 };
}

const stringLabel = (strings: readonly number[]) => strings.map(s => `${s}弦`).join("・");

const OCTAVES = ["いちばん低い", "1 オクターブ上", "2 オクターブ上", "3 オクターブ上", "4 オクターブ上"];

/** 同じ音名の位置を高さでまとめる（低いほうから）。同じ高さの位置が別の弦にあることと、
    オクターブの関係が見えるように */
export function octaveGroups(t: Tuning, positions: readonly Position[]): Position[][] {
  const byMidi = new Map<number, Position[]>();
  for (const p of positions) byMidi.set(midiAt(t, p), [...(byMidi.get(midiAt(t, p)) ?? []), p]);
  return [...byMidi].sort((a, b) => a[0] - b[0]).map(([, ps]) => [...ps].sort((a, b) => b.string - a.string));
}

/** ヒント：同じ弦の目印（開放・5・7・12 フレットなどの自然音）から何フレット離れているか */
function anchorHint(t: Tuning, pos: Position, range: FretRange): Hint {
  const anchors = [0, 3, 5, 7, 9, 12, 15]
    .filter(f => f !== pos.fret && f >= range.minFret && f <= range.maxFret)
    .filter(f => isNatural(pcAt(t, { string: pos.string, fret: f })))
    .sort((a, b) => Math.abs(a - pos.fret) - Math.abs(b - pos.fret));
  const f = anchors[0];
  const tail = "（E と F、B と C の間だけは半音、ほかの隣り合う自然音は全音）";
  if (f === undefined)
    return {
      text: `${pos.string}弦の開放は ${pcName(pcAt(t, { string: pos.string, fret: 0 }))}。そこから 1 フレット＝半音で数える${tail}`,
    };
  const d = pos.fret - f;
  const a = { string: pos.string, fret: f };
  return {
    text: `${posText(a)}は ${pcName(pcAt(t, a))}（薄い点）。そこから ${Math.abs(d)} フレット${d > 0 ? "ボディ側" : "ヘッド側"}${tail}`,
    marks: [{ pos: a, kind: "hint", label: pcName(pcAt(t, a)) }],
  };
}

const posText = (p: Position) => `${p.string}弦 ${p.fret === 0 ? "開放" : `${p.fret}フレット`}`;

export const fretNotes: Topic<FretNotesSettings> = {
  id: "fret-notes",
  level: "beginner",
  title: "指板の音名",
  settings: {
    defaults: DEFAULTS,
    describe: s => `${s.strings.join("・")} 弦／${s.maxFret} フレットまで${s.accidentals ? "／♯♭も" : ""}`,
    parse,
    view: ({ value, onChange, common }) => (
      <>
        <fieldset class="field">
          <legend>出題する弦</legend>
          <div class="chips">
            {Array.from({ length: stringCount(common.tuning) }, (_, i) => stringCount(common.tuning) - i).map(s => (
              <label key={s} class="check">
                <input
                  type="checkbox"
                  checked={value.strings.includes(s)}
                  onChange={e => {
                    const on = e.currentTarget.checked;
                    const strings = on ? [...value.strings, s] : value.strings.filter(x => x !== s);
                    if (strings.length) onChange({ ...value, strings: [...strings].sort((a, b) => b - a) });
                  }}
                />
                <span>{s}弦</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label class="field">
          <span>フレット</span>
          <select value={value.maxFret} onChange={e => onChange({ ...value, maxFret: Number(e.currentTarget.value) })}>
            {MAX_FRETS.map(f => (
              <option key={f} value={f}>
                {f} フレットまで
              </option>
            ))}
          </select>
        </label>
        <label class="field check">
          <input
            type="checkbox"
            checked={value.accidentals}
            onChange={e => onChange({ ...value, accidentals: e.currentTarget.checked })}
          />
          <span>♯♭の付く音も出す</span>
        </label>
      </>
    ),
  },

  items({ common: { tuning: t }, settings: s }) {
    const strings = activeStrings(s, t);
    const ok = (pc: number) => s.accidentals || isNatural(pc);
    const pos: string[] = [];
    const seen = new Set<number>();
    for (const string of strings)
      for (let fret = 0; fret <= s.maxFret; fret++) {
        const pc = pcAt(t, { string, fret });
        if (!ok(pc)) continue;
        pos.push(posId(t, { string, fret }));
        seen.add(pc);
      }
    // 音名 → 位置は、範囲の中にある音だけ（3 弦だけ・5 フレットまでなら D は出さない）
    const notes = Array.from({ length: 12 }, (_, pc) => pc)
      .filter(pc => seen.has(pc))
      .map(pc => `${t.id}:note:${pc}`);
    // 未出題はこの順に出るので、位置 → 音名 3 つごとに音名 → 位置を 1 つ挟む
    const out: string[] = [];
    for (let i = 0; i < Math.max(pos.length, notes.length * 3); i += 3) {
      out.push(...pos.slice(i, i + 3));
      if (notes[i / 3]) out.push(notes[i / 3]!);
    }
    return out;
  },

  itemLabel(id) {
    const it = parseItem(id);
    return it.kind === "pos" ? `${it.pos.string}弦 ${it.pos.fret}フレット` : `${pcName(it.pc)} の位置`;
  },

  question(id, { common: { tuning: t }, settings: s }, rng): Question {
    const it = parseItem(id);
    const ok = (pc: number) => s.accidentals || isNatural(pc);
    if (it.kind === "pos") {
      const pc = pcAt(t, it.pos);
      const range = windowAround(it.pos.fret, Math.max(s.maxFret, 4));
      // 図の向きは「全部タップ」の問題（0〜maxFret）にそろえる。同じ分野で向きが変わると読み直しになる
      const orientation = chooseOrientation({ minFret: 0, maxFret: s.maxFret });
      const correct = pcName(pc);
      // 紛らわしい選択肢：近い音（半音・全音のずれ）から
      const near = [1, -1, 2, -2, 3, -3, 4, -4].map(d => mod(pc + d, 12)).filter(ok);
      const options = shuffle(rng, [correct, ...shuffle(rng, near.slice(0, 4)).slice(0, 3).map(pcName)]);
      // 解説：同じ弦の自然音を並べる
      const marks: Mark[] = [];
      for (let f = range.minFret; f <= range.maxFret; f++) {
        const p = pcAt(t, { string: it.pos.string, fret: f });
        if (f === it.pos.fret) marks.push({ pos: it.pos, kind: "root", label: fmt(spellings(p)[0]!) });
        else if (isNatural(p)) marks.push({ pos: { string: it.pos.string, fret: f }, kind: "hint", label: pcName(p) });
      }
      return {
        item: id,
        prompt: {
          text: `${it.pos.string}弦 ${it.pos.fret === 0 ? "開放" : `${it.pos.fret}フレット`}の音は？`,
          board: { range, orientation, marks: [{ pos: it.pos, kind: "target" }] },
        },
        answer: { kind: "choice", options, correct },
        hint: anchorHint(t, it.pos, range),
        explanation: { text: `${it.pos.string}弦の音の並び（${correct}）`, board: { range, orientation, marks } },
        sound: { notes: [midiAt(t, it.pos)] },
      };
    }
    const strings = activeStrings(s, t);
    const range = { minFret: 0, maxFret: s.maxFret };
    const correct = positionsOf(t, it.pc, range).filter(p => strings.includes(p.string));
    const name = pcName(it.pc);
    const groups = octaveGroups(t, correct);
    const lines = groups.map(
      (g, i) =>
        `${OCTAVES[i] ?? `${i} オクターブ上`}：${g.map(posText).join(" ＝ ")}${g.length > 1 ? "（同じ高さ）" : ""}`,
    );
    return {
      item: id,
      prompt: {
        text: `${stringLabel(strings)}（${s.maxFret}フレットまで）の ${name} はどこ？`,
        how: `全部タップ（${correct.length} か所）`,
      },
      answer: { kind: "tap", mode: "all", range, correct, strings },
      // いちばん低い 1 か所を見せて、残りはオクターブの形で探させる
      hint: {
        text: `薄い点がいちばん低い ${name}。オクターブ上は 2 本細い弦の 2 フレット先（3弦→2弦は 3）、同じ弦なら 12 フレット先`,
        marks: [{ pos: groups[0]![0]!, kind: "hint", label: fmt(spellings(it.pc)[0]!) }],
      },
      sound: { notes: groups.map(g => midiAt(t, g[0]!)) },
      explanation: {
        text: [`${name} の位置（低いほうから）`, ...lines].join("\n"),
        board: {
          range,
          // 高さごとに色を交互に変える（同じ色＝同じ高さ）
          marks: groups.flatMap((g, i) =>
            g.map(p => ({
              pos: p,
              kind: i % 2 ? ("tone" as const) : ("root" as const),
              label: fmt(spellings(it.pc)[0]!),
            })),
          ),
        },
      },
    };
  },

  reference: ({ ctx }) => {
    const t = ctx.common.tuning;
    const range = { minFret: 0, maxFret: 12 };
    const marks: Mark[] = [];
    for (let string = 1; string <= stringCount(t); string++)
      for (let fret = 0; fret <= 12; fret++) {
        const pc = pcAt(t, { string, fret });
        if (isNatural(pc))
          marks.push({ pos: { string, fret }, kind: pc === 0 ? "root" : "tone", label: noteId(spellings(pc)[0]!) });
      }
    return (
      <>
        <p>
          自然音（C D E F G A B）の位置。E–F と B–C の間だけが半音（隣のフレット）で、ほかは全音（1 フレット空く）。 12
          フレットで開放弦と同じ音に戻る。
        </p>
        <Fretboard tuning={t} range={range} lefty={ctx.common.lefty} label="自然音の位置" marks={marks} />
      </>
    );
  },
};
