/* チャート（旧 guitar_chart）で扱うスケールとアルペジオ。
   音程と度数は理論コア（SCALES・コードの型）から出し、guitar_chart にしか無いもの
   （英語名・短い名前・canonical root・手で決めたボックスの範囲）だけをここに持つ。
   guitar_chart と同じであることは registry.test.ts が fixtures/guitar-chart.json と照合する。 */
import { type ScaleId, SCALES, chordType, degree, note, pc, semitones } from "../theory";

export type ChartKind = "scale" | "arpeggio" | "custom";

export interface ChartDef {
  readonly kind: ChartKind;
  /** guitar_chart の ID（カスタムは "custom"） */
  readonly id: string;
  /** 画面の名前 */
  readonly name: string;
  /** PDF の名前（英語。今の guitar_chart の資料と同じ） */
  readonly nameEn: string;
  readonly shortName: string;
  /** ルートからの半音数（昇順） */
  readonly intervals: readonly number[];
  /** 度数（ASCII：R、b3、#4、bb7）。intervals と同じ並び */
  readonly degrees: readonly string[];
  /** 例に使うルート（ピッチクラス） */
  readonly canonicalRoot: number;
  /** 手で決めたボックスの範囲（標準チューニング・canonical root 用）。ボックスが無ければ空 */
  readonly boxRanges: readonly (readonly [number, number])[];
}

interface ScaleMeta {
  readonly id: ScaleId;
  readonly nameEn: string;
  readonly shortName: string;
  readonly root: string;
  readonly boxes: readonly (readonly [number, number])[];
}

const SCALE_META: readonly ScaleMeta[] = [
  {
    id: "minor_pentatonic",
    nameEn: "Minor Pentatonic",
    shortName: "Min Pent.",
    root: "A",
    boxes: [
      [5, 8],
      [7, 10],
      [9, 12],
      [12, 15],
      [14, 17],
    ],
  },
  {
    id: "major_pentatonic",
    nameEn: "Major Pentatonic",
    shortName: "Maj Pent.",
    root: "C",
    boxes: [
      [7, 10],
      [9, 12],
      [12, 15],
      [14, 17],
      [5, 8],
    ],
  },
  {
    id: "major",
    nameEn: "Major Scale (Ionian)",
    shortName: "Major",
    root: "C",
    boxes: [
      [7, 11],
      [9, 13],
      [12, 16],
      [14, 18],
      [5, 9],
    ],
  },
  {
    id: "natural_minor",
    nameEn: "Natural Minor (Aeolian)",
    shortName: "Nat Min",
    root: "A",
    boxes: [
      [4, 8],
      [7, 11],
      [9, 13],
      [12, 16],
      [14, 18],
    ],
  },
  {
    id: "dorian",
    nameEn: "Dorian",
    shortName: "Dorian",
    root: "D",
    boxes: [
      [9, 13],
      [12, 16],
      [14, 18],
      [4, 8],
      [7, 11],
    ],
  },
  {
    id: "mixolydian",
    nameEn: "Mixolydian",
    shortName: "Mixo",
    root: "G",
    boxes: [
      [2, 6],
      [5, 9],
      [7, 11],
      [10, 14],
      [12, 16],
    ],
  },
  {
    id: "phrygian",
    nameEn: "Phrygian",
    shortName: "Phryg",
    root: "E",
    boxes: [
      [0, 4],
      [3, 7],
      [5, 9],
      [7, 11],
      [10, 14],
    ],
  },
  {
    id: "lydian",
    nameEn: "Lydian",
    shortName: "Lydian",
    root: "F",
    boxes: [
      [1, 5],
      [3, 7],
      [5, 9],
      [8, 12],
      [10, 14],
    ],
  },
  {
    id: "locrian",
    nameEn: "Locrian",
    shortName: "Locr",
    root: "B",
    boxes: [
      [2, 6],
      [4, 8],
      [7, 11],
      [9, 13],
      [12, 16],
    ],
  },
  {
    id: "minor_blues",
    nameEn: "Minor Blues",
    shortName: "Blues",
    root: "A",
    boxes: [
      [5, 8],
      [7, 10],
      [9, 12],
      [12, 15],
      [14, 17],
    ],
  },
  {
    id: "harmonic_minor",
    nameEn: "Harmonic Minor",
    shortName: "Harm Min",
    root: "A",
    boxes: [
      [4, 8],
      [7, 11],
      [9, 13],
      [12, 16],
      [14, 18],
    ],
  },
];

interface ArpMeta {
  readonly id: string;
  readonly chord: string;
  readonly name: string;
  readonly nameEn: string;
  readonly shortName: string;
  readonly root: string;
}

const ARP_META: readonly ArpMeta[] = [
  {
    id: "major_triad",
    chord: "maj",
    name: "メジャートライアド",
    nameEn: "Major Triad Arpeggio",
    shortName: "Maj",
    root: "C",
  },
  {
    id: "minor_triad",
    chord: "m",
    name: "マイナートライアド",
    nameEn: "Minor Triad Arpeggio",
    shortName: "min",
    root: "A",
  },
  {
    id: "diminished_triad",
    chord: "dim",
    name: "ディミニッシュトライアド",
    nameEn: "Diminished Triad Arpeggio",
    shortName: "dim",
    root: "B",
  },
  {
    id: "augmented_triad",
    chord: "aug",
    name: "オーギュメントトライアド",
    nameEn: "Augmented Triad Arpeggio",
    shortName: "aug",
    root: "C",
  },
  { id: "major_7", chord: "M7", name: "メジャー 7th", nameEn: "Major 7th Arpeggio", shortName: "maj7", root: "C" },
  { id: "dominant_7", chord: "7", name: "ドミナント 7th", nameEn: "Dominant 7th Arpeggio", shortName: "7", root: "G" },
  { id: "minor_7", chord: "m7", name: "マイナー 7th", nameEn: "Minor 7th Arpeggio", shortName: "m7", root: "A" },
  {
    id: "minor_7_flat_5",
    chord: "m7b5",
    name: "マイナー 7th(♭5)",
    nameEn: "Minor 7♭5 Arpeggio",
    shortName: "m7b5",
    root: "B",
  },
  {
    id: "diminished_7",
    chord: "dim7",
    name: "ディミニッシュ 7th",
    nameEn: "Diminished 7th Arpeggio",
    shortName: "dim7",
    root: "B",
  },
  {
    id: "minor_major_7",
    chord: "mM7",
    name: "マイナーメジャー 7th",
    nameEn: "Minor-Major 7th Arpeggio",
    shortName: "mMaj7",
    root: "A",
  },
];

/** 度数を半音数の昇順に並べる（理論コアの並びは度数の順なので、ブルースの b5 と 5 などは同じ順になる） */
function sorted(degrees: readonly string[]) {
  const pairs = degrees.map(d => ({ d, s: ((semitones(degree(d)) % 12) + 12) % 12 }));
  pairs.sort((a, b) => a.s - b.s);
  return { intervals: pairs.map(p => p.s), degrees: pairs.map(p => p.d) };
}

export const CHART_SCALES: readonly ChartDef[] = SCALE_META.map(m => ({
  kind: "scale",
  id: m.id,
  name: SCALES[m.id].name,
  nameEn: m.nameEn,
  shortName: m.shortName,
  ...sorted(SCALES[m.id].degrees),
  canonicalRoot: pc(note(m.root)),
  boxRanges: m.boxes,
}));

export const CHART_ARPEGGIOS: readonly ChartDef[] = ARP_META.map(m => ({
  kind: "arpeggio",
  id: m.id,
  name: `${m.name}（アルペジオ）`,
  nameEn: m.nameEn,
  shortName: m.shortName,
  ...sorted(chordType(m.chord).degrees),
  canonicalRoot: pc(note(m.root)),
  boxRanges: [],
}));

/** カスタムで 12 の半音につける度数（♭で書く。guitar_chart の DEGREE_LABELS_CHROMATIC） */
export const CHROMATIC_DEGREES = ["R", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"] as const;

/** カスタムのスケール（R は必ず含める） */
export function customChart(intervals: readonly number[]): ChartDef {
  const ivs = [...new Set([0, ...intervals.filter(i => Number.isInteger(i) && i >= 0 && i < 12)])].sort(
    (a, b) => a - b,
  );
  return {
    kind: "custom",
    id: "custom",
    name: "カスタム",
    nameEn: "Custom Scale",
    shortName: "Custom",
    intervals: ivs,
    degrees: ivs.map(i => CHROMATIC_DEGREES[i]!),
    canonicalRoot: 0,
    boxRanges: [],
  };
}

export const scaleChart = (id: string): ChartDef | undefined => CHART_SCALES.find(c => c.id === id);
export const arpeggioChart = (id: string): ChartDef | undefined => CHART_ARPEGGIOS.find(c => c.id === id);
