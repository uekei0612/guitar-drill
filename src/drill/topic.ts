/* 分野の共通インターフェース。新しい分野はこれを実装して src/topics/index.ts に足すだけで、
   出題エンジンと記録は変えない。 */
import type { ComponentType } from "preact";
import type { FretRange, Position, Tuning } from "../theory";
import type { ChartRef } from "../chart/link";
import type { Rng } from "./rng";

export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: readonly { readonly id: Level; readonly label: string }[] = [
  { id: "beginner", label: "初心者" },
  { id: "intermediate", label: "中級者" },
  { id: "advanced", label: "上級者" },
];

/** 覚える単位の ID。記録のキー（`<topicId>/<itemId>`）になるので、一度出したら変えない */
export type ItemId = string;

/** 指板図の点 */
export interface Mark {
  readonly pos: Position;
  /** 点の中の文字（R、♭3、F♯ など） */
  readonly label?: string;
  /** root = ルート、tone = そのほかの音、target = 問われている点、hint = 薄く出す参考の点、
      ok / wrong = 答え合わせ（正しく押した点／押し間違えた点）、
      open / openRoot = コードの押さえ方で鳴らす開放弦（白抜きの ○。openRoot はルート） */
  readonly kind: "root" | "tone" | "target" | "hint" | "ok" | "wrong" | "open" | "openRoot";
}

/** 指で押さえるバレー（セーハ）。low〜high 弦を fret で */
export interface Barre {
  readonly fret: number;
  readonly low: number;
  readonly high: number;
}

/** 問題や解説に出す指板図 */
export interface Board {
  readonly range: FretRange;
  readonly marks: readonly Mark[];
  /** 図の向き（無ければ範囲の広さで決める。コードの押さえ方は縦） */
  readonly orientation?: "horizontal" | "vertical";
  /** 鳴らさない弦（ナットの上に × を出す） */
  readonly muted?: readonly number[];
  readonly barres?: readonly Barre[];
}

/** 横に並べる札（五度圏の並び、進行のコード）。label が大きく、sub が下に小さく出る */
export interface StripItem {
  readonly label: string;
  readonly sub?: string;
  /** 問われているもの（強調する） */
  readonly current?: boolean;
}

export interface Prompt {
  readonly text: string;
  readonly board?: Board;
  /** 解説で文字の前に出す札の並び */
  readonly strip?: readonly StripItem[];
  /** 札の並びの読み上げ用の名前（「五度圏の並び」など） */
  readonly stripLabel?: string;
}

/** 4択（選択肢は 2 つ以上、重複なし、正解を含む） */
export interface ChoiceAnswer {
  readonly kind: "choice";
  readonly options: readonly string[];
  readonly correct: string;
}

/** 指板をタップ。any = どれか 1 つ、all = 全部（過不足なく） */
export interface FretTapAnswer {
  readonly kind: "tap";
  readonly mode: "any" | "all";
  readonly range: FretRange;
  readonly correct: readonly Position[];
  /** 押せる弦（無ければ全部）。ほかの弦は薄く出して押せなくする */
  readonly strings?: readonly number[];
  /** 押せるフレット（無ければ range 全部）。開放弦だけ押させたいときなど */
  readonly frets?: FretRange;
  readonly orientation?: "horizontal" | "vertical";
  /** 1 本の弦に 1 か所だけ（同じ弦の別のマスを押すと置き換える。コードの押さえ方） */
  readonly onePerString?: boolean;
}

export type Answer = ChoiceAnswer | FretTapAnswer;

export interface Question {
  readonly item: ItemId;
  readonly prompt: Prompt;
  readonly answer: Answer;
  /** 答えのあとに出す解説 */
  readonly explanation?: Prompt;
  /** 解説から開くチャートの図 */
  readonly chart?: ChartRef;
  /** 解説で鳴らせる音（MIDI ノート番号。順に鳴らし、chord なら最後に重ねる。chords は和音を順に＝進行） */
  readonly sound?: {
    readonly notes: readonly number[];
    readonly chord?: boolean;
    readonly strum?: boolean;
    readonly chords?: readonly (readonly number[])[];
  };
}

export type Response =
  | { readonly kind: "choice"; readonly value: string }
  | { readonly kind: "tap"; readonly positions: readonly Position[] };

/** 全分野に共通の設定（画面の設定から変える） */
export interface CommonSettings {
  readonly tuning: Tuning;
  readonly lefty: boolean;
}

/** 分野ごとの設定。既定値と、保存値の検証を分野が持つ */
export interface TopicSettingsDef<S> {
  readonly defaults: S;
  /** 保存値を検証して返す。読めない値は既定値に戻す */
  parse(raw: unknown): S;
  /** 設定画面に出す部品（無ければ設定画面には出さない） */
  readonly view?: ComponentType<{ value: S; onChange: (v: S) => void; common: CommonSettings }>;
}

export interface Context<S> {
  readonly common: CommonSettings;
  readonly settings: S;
}

export interface Topic<S = Record<string, never>> {
  /** 記録のキーになるので変えない */
  readonly id: string;
  readonly level: Level;
  readonly title: string;
  readonly settings?: TopicSettingsDef<S>;
  /** 覚える単位。並び順は「先に覚えるもの」順（未出題のものはこの順に出す） */
  items(ctx: Context<S>): ItemId[];
  /** item を人が読む名前（結果画面の「苦手」に出す。例：「6弦 5f」「C メジャーの Ⅴ」） */
  itemLabel(item: ItemId, ctx: Context<S>): string;
  question(item: ItemId, ctx: Context<S>, rng: Rng): Question;
  /** 参考ページ（覚え方・一覧） */
  readonly reference?: ComponentType<{ ctx: Context<S> }>;
}

/** 分野の一覧に入れるときの型（分野ごとに設定の型が違うので消す） */
export type AnyTopic = Topic<any>;

export const itemKey = (topicId: string, item: ItemId): string => `${topicId}/${item}`;

const samePos = (a: Position, b: Position) => a.string === b.string && a.fret === b.fret;

/** 採点 */
export function grade(answer: Answer, res: Response): boolean {
  if (answer.kind === "choice") return res.kind === "choice" && res.value === answer.correct;
  if (res.kind !== "tap") return false;
  const hit = (p: Position) => answer.correct.some(c => samePos(c, p));
  if (answer.mode === "any") return res.positions.length === 1 && hit(res.positions[0]!);
  const uniq = res.positions.filter((p, i) => res.positions.findIndex(q => samePos(p, q)) === i);
  return uniq.length === answer.correct.length && uniq.every(hit);
}
