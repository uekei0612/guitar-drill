/* チャートとキーの画面から開く参考の一覧。今の表示に関係するものを先に、残りを種類ごとに並べる */
import type { ChartState } from "../chart/state";
import type { KeyViewState } from "../keyview/state";

/** 参考の 1 行：分野の id と、何が載っているかの短い説明 */
export interface RefItem {
  readonly id: string;
  readonly note: string;
}
export interface RefGroup {
  readonly label: string;
  readonly items: readonly RefItem[];
}

const NOTE: Readonly<Record<string, string>> = {
  "fret-notes": "ドレミ（C D E…）がどのフレットか。用語の説明つき",
  intervals: "ルートから見た度数の形（ルートが動いても形は同じ）",
  "scale-boxes": "スケールを 5 つの箱に分けた押さえ方（CAGED）",
  modes: "7 つのモードの度数と、メジャー・マイナーとの違い（特性音）",
  "dominant-scales": "ドミナント 7th の上で弾くスケールと、使いどころ",
  triads: "コードの中身の 3 つの音。メジャーとマイナーの違い",
  sevenths: "M7・7・m7・m7♭5・dim7・6 などの構成音",
  tensions: "コードごとに使えるテンション（9・11・13）",
  voicings: "シェル・ドロップ 2・ドロップ 3 の押さえ方の型",
  "circle-of-fifths": "五度圏と、キーごとの調号の数",
  diatonic: "キーごとのダイアトニックコードとスケール",
  progressions: "定番の進行の度数と、C・Am での例",
  "secondary-dominants": "解決先ごとのドミナント（Ⅴ/Ⅴ など）と裏コード",
};

const item = (id: string): RefItem => ({ id, note: NOTE[id]! });

/** 関係するもの（related）を先頭のまとまりにし、種類ごとのまとまりからは除く（同じものを 2 度出さない） */
function arrange(related: readonly string[], groups: readonly { label: string; ids: readonly string[] }[]): RefGroup[] {
  const first = [...new Set(related)];
  return [
    ...(first.length ? [{ label: "今の表示に関係するもの", items: first.map(item) }] : []),
    ...groups
      .map(g => ({ label: g.label, items: g.ids.filter(id => !first.includes(id)).map(item) }))
      .filter(g => g.items.length),
  ];
}

const MODE_SCALES = ["dorian", "phrygian", "lydian", "mixolydian", "locrian"];
const TRIADS = ["major_triad", "minor_triad", "diminished_triad", "augmented_triad"];

/** チャート：スケールならボックスやモード、アルペジオなら構成音やボイシング */
export function chartRefs(s: Pick<ChartState, "chartType" | "scale" | "arpeggio">, boxScales: readonly string[]) {
  const related: string[] = [];
  if (s.chartType === "scale") {
    if (boxScales.includes(s.scale)) related.push("scale-boxes");
    if (MODE_SCALES.includes(s.scale)) related.push("modes");
    if (s.scale === "mixolydian" || s.scale === "harmonic_minor") related.push("dominant-scales");
  } else if (s.chartType === "arpeggio") {
    if (TRIADS.includes(s.arpeggio)) related.push("triads");
    else {
      related.push("sevenths", "tensions");
      if (s.arpeggio === "dominant_7") related.push("dominant-scales");
    }
  } else related.push("intervals");
  return arrange(related, [
    { label: "スケール", ids: ["scale-boxes", "modes", "dominant-scales"] },
    { label: "コード", ids: ["triads", "sevenths", "tensions", "voicings"] },
    { label: "指板", ids: ["fret-notes", "intervals"] },
  ]);
}

/** キー：いつもはキーとコード。進行を出していれば進行、借りたコードがあればセカンダリードミナント */
export function keyRefs(s: Pick<KeyViewState, "size" | "borrow" | "prog" | "chord">) {
  const related = ["diatonic", "circle-of-fifths"];
  if (s.chord != null) related.push(s.size === 3 ? "triads" : "sevenths");
  if (s.prog) related.push("progressions");
  if (s.borrow) related.push("secondary-dominants");
  return arrange(related, [
    { label: "キーとコード", ids: ["diatonic", "circle-of-fifths", "triads", "sevenths"] },
    { label: "進行", ids: ["progressions", "secondary-dominants"] },
    { label: "スケール", ids: ["modes", "scale-boxes"] },
  ]);
}
