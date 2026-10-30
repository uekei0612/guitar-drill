/* キーの画面（五度圏とダイアトニックコード）の状態と URL、五度圏の上の位置。
   五度圏は 3 重の輪：外がメジャー、中がマイナー（平行調と同じ位置）、内が dim（外のメジャーの Ⅶ）。
   キーのダイアトニックコード 7 つは、主音の位置を真ん中にした扇形（外と中の 3 つずつと、内の 1 つ）に収まる。 */
import {
  type DiatonicChord,
  type Key,
  type KeyMode,
  FIFTHS,
  KEYS,
  diatonicChords,
  keyId,
  mod,
  note,
  pc,
  scaleNotes,
} from "../theory";

export interface KeyViewState {
  readonly key: Key;
  readonly size: 3 | 4;
  /** 札に機能（T・SD・D）を出す */
  readonly func: boolean;
  /** マイナーキーの Ⅴ・Ⅶ をハーモニックマイナーから借りる */
  readonly borrow: boolean;
  /** 選んでいるコード（0 = Ⅰ … 6 = Ⅶ）。無ければ null */
  readonly chord: number | null;
  /** 指板に出すもの：スケール（選んだコードの構成音を重ねる）か、7 つのコードのルートの位置か */
  readonly board: "scale" | "roots";
  /** 出している進行（KEY_PROGRESSIONS の id か "custom"）。無ければ null */
  readonly prog: string | null;
  /** 自分で作った進行（0 = Ⅰ … 6 = Ⅶ） */
  readonly custom: readonly number[];
}

const ALL: readonly Key[] = [...KEYS.major, ...KEYS.minor];
export const keyById = (id: string): Key | undefined => ALL.find(k => keyId(k) === id);

export const DEFAULT_KEY_VIEW: KeyViewState = {
  key: { mode: "major", tonic: note("C") },
  size: 4,
  func: false,
  borrow: false,
  chord: null,
  board: "scale",
  prog: null,
  custom: [],
};

/** 自分で作る進行の長さの上限 */
export const MAX_CUSTOM = 8;

export function toParams(s: KeyViewState): URLSearchParams {
  const p = new URLSearchParams();
  p.set("key", keyId(s.key));
  p.set("size", String(s.size));
  if (s.func) p.set("func", "1");
  if (s.borrow) p.set("borrow", "1");
  if (s.chord != null) p.set("chord", String(s.chord + 1));
  if (s.board === "roots") p.set("board", "roots");
  if (s.prog) p.set("prog", s.prog);
  if (s.prog === "custom" && s.custom.length) p.set("seq", s.custom.map(d => d + 1).join("-"));
  return p;
}

/** URL から状態を戻す。読めない値は既定値のまま */
export function fromParams(p: URLSearchParams, base: KeyViewState = DEFAULT_KEY_VIEW): KeyViewState {
  const key = keyById(p.get("key") ?? "") ?? base.key;
  const size = p.get("size") === "3" ? 3 : p.get("size") === "4" ? 4 : base.size;
  const chord = Number.parseInt(p.get("chord") ?? "", 10);
  return {
    key,
    size,
    func: p.has("func") ? p.get("func") === "1" : base.func,
    borrow: p.has("borrow") ? p.get("borrow") === "1" : base.borrow,
    chord: chord >= 1 && chord <= 7 ? chord - 1 : null,
    board: p.get("board") === "roots" ? "roots" : p.get("board") === "scale" ? "scale" : base.board,
    ...progFromParams(p, key, base),
  };
}

function progFromParams(p: URLSearchParams, key: Key, base: KeyViewState): Pick<KeyViewState, "prog" | "custom"> {
  const id = p.get("prog");
  if (id === "custom") {
    const seq = (p.get("seq") ?? "")
      .split("-")
      .map(x => Number.parseInt(x, 10) - 1)
      .filter(d => d >= 0 && d <= 6)
      .slice(0, MAX_CUSTOM);
    return { prog: "custom", custom: seq };
  }
  // 進行はキーの種類（メジャー／マイナー）ごと。合わないものは出さない
  if (id && progressionsFor(key).some(x => x.id === id)) return { prog: id, custom: base.custom };
  return {
    prog: base.prog && progressionsFor(key).some(x => x.id === base.prog) ? base.prog : null,
    custom: base.custom,
  };
}

/** 五度圏の位置（C / Am = 0、時計回りに ♯ が増える） */
export const slotOf = (k: Key): number => FIFTHS[k.mode].findIndex(r => pc(note(r)) === pc(k.tonic));

/** 位置のキー（同じ位置のメジャーとマイナーは平行調） */
export const keyAt = (mode: KeyMode, slot: number): Key => ({ mode, tonic: note(FIFTHS[mode][mod(slot, 12)]!) });

/** 輪：外（メジャー）・中（マイナー）・内（dim） */
export type Ring = "major" | "minor" | "dim";

export interface Place {
  readonly ring: Ring;
  readonly slot: number;
}

/** コードの響き（三和音の部分）。7th でも ♭3 と ♭5 で決める */
export const qualityOf = (c: DiatonicChord): Ring =>
  c.toneLabels.includes("♭5") ? "dim" : c.toneLabels.includes("♭3") ? "minor" : "major";

/** 内の輪の位置の dim のルート（外のメジャーの Ⅶ ＝ 主音の半音下） */
const dimRootPc = (slot: number) => mod(pc(note(FIFTHS.major[mod(slot, 12)]!)) - 1, 12);

/** コードが五度圏のどこにあるか（ルートのピッチクラスで探すので、異名同音でも同じ位置） */
export function placeOf(c: DiatonicChord): Place {
  const ring = qualityOf(c);
  const r = pc(c.root);
  const slot = [...Array(12).keys()].find(i =>
    ring === "dim" ? dimRootPc(i) === r : pc(note(FIFTHS[ring][i]!)) === r,
  )!;
  return { ring, slot };
}

/** 内の輪に書く dim の名前（外のメジャーキーの Ⅶ の三和音。B dim、E♯dim のように綴りはキーに合わせる） */
export const dimLabel = (slot: number): string => diatonicChords(keyAt("major", slot), 3)[6]!.symbol;

/** 扇形に入るか（外と中は主音の位置と両隣、内は主音の位置だけ） */
export const inFan = (center: number, p: Place): boolean => {
  const d = mod(p.slot - center + 6, 12) - 6;
  return p.ring === "dim" ? d === 0 : Math.abs(d) <= 1;
};

export const chordsOf = (s: KeyViewState): DiatonicChord[] =>
  diatonicChords(s.key, s.size, { borrowDominant: s.borrow });

export type Func = "T" | "SD" | "D";
/** 機能。メジャーは Ⅰ・Ⅲ・Ⅵ が T、Ⅱ・Ⅳ が SD、Ⅴ・Ⅶ が D。
    マイナーは Ⅰ・♭Ⅲ が T、Ⅱ・Ⅳ・♭Ⅵ・♭Ⅶ が SD、Ⅴ が D（♭Ⅵ を T、♭Ⅶ を D とする本もある）。
    ハーモニックマイナーから借りた Ⅶdim は導音の上のコードなので D */
const FUNCS: Readonly<Record<KeyMode, readonly Func[]>> = {
  major: ["T", "SD", "T", "SD", "D", "T", "D"],
  minor: ["T", "SD", "T", "SD", "D", "SD", "SD"],
};
export const funcOf = (k: Key, degree: number, borrow = false): Func =>
  borrow && k.mode === "minor" && degree === 6 ? "D" : FUNCS[k.mode][degree]!;

export const scaleOfKey = (k: Key) => (k.mode === "major" ? "major" : "natural_minor");

/** 前のキーから変わった音（ピッチクラスで比べる）。from は前のキーにあって今は無い音、to は今のキーで増えた音 */
export function changedNotes(prev: Key, next: Key) {
  const a = scaleNotes(scaleOfKey(prev), prev.tonic);
  const b = scaleNotes(scaleOfKey(next), next.tonic);
  const pa = new Set(a.map(pc)),
    pb = new Set(b.map(pc));
  return { from: a.filter(n => !pb.has(pc(n))), to: b.filter(n => !pa.has(pc(n))) };
}

/** 進行の 1 つのコード。scale を付けると、借りる設定によらずそのスケールのコードにする */
export interface ProgStep {
  readonly degree: number;
  readonly scale?: "natural" | "harmonic";
}

export interface KeyProgression {
  readonly id: string;
  readonly name: string;
  readonly mode: KeyMode;
  readonly steps: readonly ProgStep[];
}

const steps = (s: string): ProgStep[] =>
  s.split(" ").map(x => ({
    degree: Number(x[0]) - 1,
    ...(x[1] === "n" && { scale: "natural" as const }),
    ...(x[1] === "h" && { scale: "harmonic" as const }),
  }));

/** キーの画面で鳴らす定番の進行（度数で持ち、三和音／四和音は画面の設定に合わせる） */
export const KEY_PROGRESSIONS: readonly KeyProgression[] = [
  { id: "1451", name: "Ⅰ–Ⅳ–Ⅴ–Ⅰ（終止）", mode: "major", steps: steps("1 4 5 1") },
  { id: "251", name: "Ⅱ–Ⅴ–Ⅰ", mode: "major", steps: steps("2 5 1") },
  { id: "1625", name: "Ⅰ–Ⅵ–Ⅱ–Ⅴ（循環）", mode: "major", steps: steps("1 6 2 5") },
  { id: "1564", name: "Ⅰ–Ⅴ–Ⅵ–Ⅳ", mode: "major", steps: steps("1 5 6 4") },
  { id: "ohdo", name: "王道進行（Ⅳ–Ⅴ–Ⅲ–Ⅵ）", mode: "major", steps: steps("4 5 3 6") },
  { id: "komuro", name: "小室進行（Ⅵ–Ⅳ–Ⅴ–Ⅰ）", mode: "major", steps: steps("6 4 5 1") },
  { id: "canon", name: "カノン進行", mode: "major", steps: steps("1 5 6 3 4 1 4 5") },
  { id: "m1451", name: "Ⅰm–Ⅳm–Ⅴ–Ⅰm（終止）", mode: "minor", steps: steps("1 4 5h 1") },
  { id: "m251", name: "マイナーの Ⅱ–Ⅴ–Ⅰ", mode: "minor", steps: steps("2 5h 1") },
  { id: "m1673", name: "Ⅰm–♭Ⅵ–♭Ⅲ–♭Ⅶ", mode: "minor", steps: steps("1 6 3 7n") },
  { id: "andalusian", name: "アンダルシア進行（Ⅰm–♭Ⅶ–♭Ⅵ–Ⅴ）", mode: "minor", steps: steps("1 7n 6 5h") },
];

export const progressionsFor = (k: Key): KeyProgression[] => KEY_PROGRESSIONS.filter(x => x.mode === k.mode);

/** 出している進行のコード（無ければ空） */
export function progChords(s: KeyViewState): DiatonicChord[] {
  const base = chordsOf(s);
  if (s.prog === "custom") return s.custom.map(d => base[d]!);
  const pr = KEY_PROGRESSIONS.find(x => x.id === s.prog && x.mode === s.key.mode);
  if (!pr) return [];
  const nat = diatonicChords(s.key, s.size);
  const har = diatonicChords(s.key, s.size, { borrowDominant: true });
  return pr.steps.map(st => (st.scale === "natural" ? nat : st.scale === "harmonic" ? har : base)[st.degree]!);
}

/** ルートの動き（次のコードのルートまで）。5 度下は強く進む動き */
export function rootMotion(from: DiatonicChord, to: DiatonicChord): { label: string; strong: boolean } {
  const d = mod(pc(to.root) - pc(from.root), 12);
  const label = [
    "同じ",
    "半音上",
    "2度上",
    "3度上",
    "3度上",
    "5度下",
    "増4度",
    "5度上",
    "3度下",
    "3度下",
    "2度下",
    "半音下",
  ][d]!;
  return { label, strong: d === 5 };
}
