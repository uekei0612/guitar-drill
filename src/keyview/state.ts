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
}

const ALL: readonly Key[] = [...KEYS.major, ...KEYS.minor];
export const keyById = (id: string): Key | undefined => ALL.find(k => keyId(k) === id);

export const DEFAULT_KEY_VIEW: KeyViewState = {
  key: { mode: "major", tonic: note("C") },
  size: 4,
  func: false,
  borrow: false,
  chord: null,
};

export function toParams(s: KeyViewState): URLSearchParams {
  const p = new URLSearchParams();
  p.set("key", keyId(s.key));
  p.set("size", String(s.size));
  if (s.func) p.set("func", "1");
  if (s.borrow) p.set("borrow", "1");
  if (s.chord != null) p.set("chord", String(s.chord + 1));
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
    マイナーは Ⅰ・♭Ⅲ が T、Ⅱ・Ⅳ・♭Ⅵ・♭Ⅶ が SD、Ⅴ が D（♭Ⅵ を T、♭Ⅶ を D とする本もある） */
const FUNCS: Readonly<Record<KeyMode, readonly Func[]>> = {
  major: ["T", "SD", "T", "SD", "D", "T", "D"],
  minor: ["T", "SD", "T", "SD", "D", "SD", "SD"],
};
export const funcOf = (k: Key, degree: number): Func => FUNCS[k.mode][degree]!;

export const scaleOfKey = (k: Key) => (k.mode === "major" ? "major" : "natural_minor");

/** 前のキーから変わった音（ピッチクラスで比べる）。from は前のキーにあって今は無い音、to は今のキーで増えた音 */
export function changedNotes(prev: Key, next: Key) {
  const a = scaleNotes(scaleOfKey(prev), prev.tonic);
  const b = scaleNotes(scaleOfKey(next), next.tonic);
  const pa = new Set(a.map(pc)),
    pb = new Set(b.map(pc));
  return { from: a.filter(n => !pb.has(pc(n))), to: b.filter(n => !pa.has(pc(n))) };
}
