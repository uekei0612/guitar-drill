/* 出題順。item ごとに間を空けて繰り返す（簡易 SM-2）。時刻は引数で受け取り、テストで差し替える。 */
import { type Rng, shuffle } from "./rng";
import type { ItemId } from "./topic";

export interface ItemStat {
  /** 間隔の伸び率 */
  readonly ease: number;
  /** 次に出すまでの日数（0 = 覚えていない） */
  readonly interval: number;
  /** 次に出す時刻（ms） */
  readonly due: number;
  readonly tries: number;
  readonly correct: number;
}

export const DAY = 24 * 60 * 60 * 1000;
export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3;
export const MAX_INTERVAL = 180;
/** 間違えた item は 10 分後に期限が来る（同じセッションの中では別に出し直す） */
export const RETRY_MS = 10 * 60 * 1000;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** 1 回答えたあとの記録。正解なら間隔を延ばし、誤答なら 0 に戻す。
    期限前の正解（同じセッションでの 2 回目や先取りの練習）では間隔を延ばさない */
export function review(prev: ItemStat | undefined, ok: boolean, now: number): ItemStat {
  const s = prev ?? { ease: START_EASE, interval: 0, due: now, tries: 0, correct: 0 };
  const tries = s.tries + 1;
  if (!ok)
    return {
      ease: clamp(s.ease - 0.2, MIN_EASE, MAX_EASE),
      interval: 0,
      due: now + RETRY_MS,
      tries,
      correct: s.correct,
    };
  const correct = s.correct + 1;
  if (prev && s.interval > 0 && s.due > now) return { ...s, tries, correct };
  const interval = clamp(s.interval < 1 ? 1 : s.interval < 3 ? 3 : Math.round(s.interval * s.ease), 1, MAX_INTERVAL);
  return { ease: clamp(s.ease + 0.05, MIN_EASE, MAX_EASE), interval, due: now + interval * DAY, tries, correct };
}

/** 覚えている（期限内の）item か */
export const isMastered = (s: ItemStat | undefined, now: number): boolean => !!s && s.interval >= 1 && s.due > now;

/** 習熟度：期限内の item の割合（0〜1） */
export function mastery(items: readonly ItemId[], statOf: (id: ItemId) => ItemStat | undefined, now: number): number {
  if (!items.length) return 0;
  return items.filter(id => isMastered(statOf(id), now)).length / items.length;
}

export interface PlanOptions {
  /** 1 セッションの問題数 */
  readonly size?: number;
  /** 1 セッションに入れる未出題の item の数（期限切れが少ないときは足りない分を未出題で埋める） */
  readonly maxNew?: number;
}

/** 1 セッションで出す item の並び。期限切れ（古い順）→ 未出題（分野の並び順）→ 期限前（近い順）から選び、
    同じ item が続かないように混ぜる。item が少ない分野では繰り返して埋める */
export function planSession(
  items: readonly ItemId[],
  statOf: (id: ItemId) => ItemStat | undefined,
  now: number,
  rng: Rng,
  { size = 20, maxNew = 8 }: PlanOptions = {},
): ItemId[] {
  if (!items.length) return [];
  const byDue = (a: ItemId, b: ItemId) => statOf(a)!.due - statOf(b)!.due;
  const due = items.filter(id => statOf(id) && statOf(id)!.due <= now).sort(byDue);
  const fresh = items.filter(id => !statOf(id));
  const ahead = items.filter(id => statOf(id) && statOf(id)!.due > now).sort(byDue);

  const pool = due.slice(0, size);
  const take = (xs: ItemId[], n: number) => pool.push(...xs.splice(0, Math.max(0, n)));
  take(fresh, Math.min(maxNew, size - pool.length));
  take(ahead, size - pool.length);
  take(fresh, size - pool.length);

  const out: ItemId[] = [];
  while (out.length < size) {
    const block = shuffle(rng, pool);
    if (block.length > 1 && block[0] === out[out.length - 1]) [block[0], block[1]] = [block[1]!, block[0]!];
    out.push(...block);
  }
  return out.slice(0, size);
}

/** その時刻の、端末の暦での日の番号 */
const dayNo = (t: number) => {
  const d = new Date(t);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
};

/** 次に復習する日（今日＝0）と、その日に期限が来る数。期限切れのものは今日に数える。記録が無ければ undefined */
export function nextDue(
  stats: readonly (ItemStat | undefined)[],
  now: number,
): { readonly days: number; readonly count: number } | undefined {
  const days = stats.filter((s): s is ItemStat => !!s).map(s => Math.max(0, dayNo(Math.max(s.due, now)) - dayNo(now)));
  if (!days.length) return undefined;
  const first = Math.min(...days);
  return { days: first, count: days.filter(d => d === first).length };
}
