/* 分野ごとの性質テストの道具。「全 item × N 回で、問題が壊れていない」を確かめる。
   テストから使う（vitest には依存しない。見つけた問題を文字列で返す）。 */
import { type Tuning, stringCount } from "../theory";
import { seeded } from "./rng";
import type { AnyTopic, Board, Context, Question } from "./topic";

const inBoard = (b: Pick<Board, "range">, t: Tuning) => (p: { string: number; fret: number }) =>
  p.string >= 1 && p.string <= stringCount(t) && p.fret >= b.range.minFret && p.fret <= b.range.maxFret;

export function problemsOf(q: Question, ctx: Context<unknown>): string[] {
  const out: string[] = [];
  const a = q.answer;
  if (a.kind === "choice") {
    if (a.options.length < 2) out.push(`選択肢が ${a.options.length} 個`);
    if (new Set(a.options).size !== a.options.length) out.push(`選択肢が重複: ${a.options.join(" / ")}`);
    if (!a.options.includes(a.correct)) out.push(`正解 ${a.correct} が選択肢にない: ${a.options.join(" / ")}`);
  } else {
    if (!a.correct.length) out.push("タップの正解が空");
    if (!a.correct.every(inBoard(a, ctx.common.tuning))) out.push("タップの正解が指板の範囲外");
    if (a.strings && !a.correct.every(p => a.strings!.includes(p.string))) out.push("タップの正解が押せない弦にある");
    if (a.frets && !a.correct.every(inBoard({ range: a.frets }, ctx.common.tuning)))
      out.push("タップの正解が押せないフレットにある");
  }
  for (const b of [q.prompt.board, q.explanation?.board])
    if (b && !b.marks.every(m => inBoard(b, ctx.common.tuning)(m.pos))) out.push("指板図の点が範囲外");
  return out;
}

/** 全 item × rounds 回、種を変えて出題し、壊れた問題を集める */
export function checkTopic(topic: AnyTopic, ctx: Context<unknown>, rounds = 50): string[] {
  const out: string[] = [];
  const items = topic.items(ctx);
  if (!items.length) out.push(`${topic.id}: item が無い`);
  if (new Set(items).size !== items.length) out.push(`${topic.id}: item ID が重複`);
  items.forEach((item, i) => {
    for (let n = 0; n < rounds; n++) {
      const q = topic.question(item, ctx, seeded(i * 1000 + n));
      if (q.item !== item) out.push(`${topic.id}/${item}: 問題の item が ${q.item}`);
      for (const p of problemsOf(q, ctx)) out.push(`${topic.id}/${item}: ${p}`);
    }
  });
  return out;
}
