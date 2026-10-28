/* チャート画面の状態と URL。パラメーター名は guitar_chart と同じ
   （chart_type / scale / arpeggio / custom / root / tuning / strings / capo / label / flat / lefty / caged / box /
   boxes / degrees / allkeys / kpp）。ルートと開放弦の音名は ♯ 表記の 12 音で書く。 */
import { type Note, type Tuning, mod, pc, spellings, tuningById } from "../theory";
import { type ChartDef, type ChartKind, arpeggioChart, customChart, scaleChart } from "./registry";

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

export interface ChartState {
  readonly chartType: ChartKind;
  readonly scale: string;
  readonly arpeggio: string;
  /** カスタムの半音数（R を含む） */
  readonly custom: readonly number[];
  /** ルートのピッチクラス */
  readonly root: number;
  /** チューニングの ID、または "custom" */
  readonly tuning: string;
  /** 自分で決めたチューニング（低い弦から、ピッチクラス。4〜8 弦） */
  readonly customTuning: readonly number[];
  readonly capo: number;
  readonly label: "degree" | "note";
  readonly flat: boolean;
  readonly lefty: boolean;
  readonly caged: boolean;
  /** 1 つだけ出すボックス（1 から）。null ならすべて */
  readonly box: number | null;
  // PDF のセクション
  readonly includeBoxes: boolean;
  readonly includeDegrees: boolean;
  readonly includeAllKeys: boolean;
  readonly keysPerPage: number;
}

export const DEFAULT_CHART: ChartState = {
  chartType: "scale",
  scale: "major_pentatonic",
  arpeggio: "major_7",
  custom: [0, 2, 4, 5, 7, 9, 11],
  root: 9,
  tuning: "standard",
  customTuning: [4, 9, 2, 7, 11, 4],
  capo: 0,
  label: "degree",
  flat: false,
  lefty: false,
  caged: false,
  box: null,
  includeBoxes: true,
  includeDegrees: true,
  includeAllKeys: true,
  keysPerPage: 3,
};

export const MAX_CAPO = 12;
/** 1 ページのキー数の選択肢（5 以上は A4 横に入れると点が重なって読めない） */
export const KEYS_PER_PAGE = [1, 2, 3, 4] as const;

/** ルートや開放弦の表示名（♭表記の切り替えだけ。綴りの理論は使わない：guitar_chart と同じ） */
export const noteName = (p: number, flat: boolean): string =>
  (flat ? FLAT_NAMES : NOTE_NAMES)[mod(p, 12)]!.replace("#", "♯").replace("b", "♭");

const noteIndex = (s: string | null) => (s === null ? -1 : (NOTE_NAMES as readonly string[]).indexOf(s));

export function chartOf(s: ChartState): ChartDef {
  if (s.chartType === "arpeggio") return arpeggioChart(s.arpeggio) ?? arpeggioChart(DEFAULT_CHART.arpeggio)!;
  if (s.chartType === "custom") return customChart(s.custom);
  return scaleChart(s.scale) ?? scaleChart(DEFAULT_CHART.scale)!;
}

/** 実際のチューニング（自分で決めたものも Tuning にする） */
export function tuningOf(s: ChartState): Tuning {
  if (s.tuning === "custom")
    return {
      id: "custom",
      name: "自分で決めたチューニング",
      group: "オープン・変則",
      open: s.customTuning.map((p): Note => spellings(p)[0]!),
    };
  return tuningById(s.tuning) ?? tuningById("standard")!;
}

export const tuningPcs = (s: ChartState): number[] => tuningOf(s).open.map(pc);

export function toParams(s: ChartState): URLSearchParams {
  const p = new URLSearchParams();
  p.set("chart_type", s.chartType);
  if (s.chartType === "arpeggio") p.set("arpeggio", s.arpeggio);
  else if (s.chartType === "custom") p.set("custom", s.custom.join(","));
  else p.set("scale", s.scale);
  p.set("root", NOTE_NAMES[s.root]!);
  p.set("tuning", s.tuning);
  if (s.tuning === "custom") p.set("strings", s.customTuning.map(x => NOTE_NAMES[x]).join(","));
  if (s.capo) p.set("capo", String(s.capo));
  if (s.label === "note") p.set("label", "note");
  if (s.flat) p.set("flat", "1");
  if (s.lefty) p.set("lefty", "1");
  if (s.caged) p.set("caged", "1");
  if (s.caged && s.box != null) p.set("box", String(s.box));
  if (!s.includeBoxes) p.set("boxes", "0");
  if (!s.includeDegrees) p.set("degrees", "0");
  if (!s.includeAllKeys) p.set("allkeys", "0");
  p.set("kpp", String(s.keysPerPage));
  return p;
}

/** URL から状態を戻す。読めない値は既定値（base）のまま */
export function fromParams(p: URLSearchParams, base: ChartState = DEFAULT_CHART): ChartState {
  let s = { ...base };
  const ct = p.get("chart_type");
  if (ct === "scale" || ct === "arpeggio" || ct === "custom") s = { ...s, chartType: ct };
  const sc = p.get("scale");
  if (sc && scaleChart(sc)) s = { ...s, scale: sc };
  const ar = p.get("arpeggio");
  if (ar && arpeggioChart(ar)) s = { ...s, arpeggio: ar };
  const cu = p.get("custom");
  if (cu !== null) {
    const ivs = cu
      .split(",")
      .map(x => Number.parseInt(x, 10))
      .filter(x => x >= 0 && x <= 11);
    if (ivs.length) s = { ...s, custom: customChart(ivs).intervals };
  }
  const root = noteIndex(p.get("root"));
  if (root >= 0) s = { ...s, root };
  const tu = p.get("tuning");
  if (tu === "custom") {
    const strings = (p.get("strings") ?? "").split(",").map(noteIndex);
    if (strings.length >= 4 && strings.length <= 8 && strings.every(x => x >= 0))
      s = { ...s, tuning: "custom", customTuning: strings };
  } else if (tu && tuningById(tu)) s = { ...s, tuning: tuningById(tu)!.id };
  const capo = Number.parseInt(p.get("capo") ?? "", 10);
  if (capo >= 0 && capo <= MAX_CAPO) s = { ...s, capo };
  if (p.get("label") === "note") s = { ...s, label: "note" };
  if (p.has("flat")) s = { ...s, flat: p.get("flat") === "1" };
  if (p.has("lefty")) s = { ...s, lefty: p.get("lefty") === "1" };
  s = { ...s, caged: p.get("caged") === "1" };
  const box = Number.parseInt(p.get("box") ?? "", 10);
  s = { ...s, box: s.caged && box >= 1 && box <= 5 ? box : null };
  s = {
    ...s,
    includeBoxes: p.get("boxes") !== "0",
    includeDegrees: p.get("degrees") !== "0",
    includeAllKeys: p.get("allkeys") !== "0",
  };
  const kpp = Number.parseInt(p.get("kpp") ?? "", 10);
  if (kpp >= 1) s = { ...s, keysPerPage: Math.min(kpp, Math.max(...KEYS_PER_PAGE)) };
  return s;
}

/** 指板の度数を 1 つ足す／外す（カスタムになる）。R は外せず、2 音未満にもしない。変わらなければ null */
export function toggleDegree(s: ChartState, semi: number): ChartState | null {
  if (semi === 0) return null;
  const ivs = new Set(chartOf(s).intervals);
  if (ivs.has(semi)) {
    ivs.delete(semi);
    if (ivs.size < 2) return null;
  } else ivs.add(semi);
  return { ...s, chartType: "custom", custom: customChart([...ivs]).intervals, caged: false, box: null };
}

/** 低い弦を 1 本足す（今の最低弦の 4 度下。7 弦の B の付け方）／外す */
export const addLowString = (s: ChartState): ChartState =>
  s.customTuning.length >= 8 ? s : { ...s, customTuning: [mod(s.customTuning[0]! - 5, 12), ...s.customTuning] };
export const removeLowString = (s: ChartState): ChartState =>
  s.customTuning.length <= 4 ? s : { ...s, customTuning: s.customTuning.slice(1) };
