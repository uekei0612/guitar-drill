/* 1 セッションの進み方。間違えた item は数問あとにもう一度出す。 */
import type { ItemId } from "./topic";

export interface Session {
  readonly queue: readonly ItemId[];
  readonly index: number;
  readonly results: readonly { readonly item: ItemId; readonly ok: boolean }[];
}

/** 間違えた item を何問あとに出し直すか */
export const RETRY_GAP = 3;

export const startSession = (queue: readonly ItemId[]): Session => ({ queue, index: 0, results: [] });

export const currentItem = (s: Session): ItemId | undefined => s.queue[s.index];

export const isFinished = (s: Session): boolean => s.index >= s.queue.length;

/** 答えを記録して次へ。誤答は 1 回だけ出し直す（直後になってしまう場合は出し直さない） */
export function answer(s: Session, ok: boolean): Session {
  const item = currentItem(s);
  if (item === undefined) return s;
  const results = [...s.results, { item, ok }];
  const queue = [...s.queue];
  const misses = results.filter(r => r.item === item && !r.ok).length;
  if (!ok && misses === 1) {
    const at = Math.min(s.index + 1 + RETRY_GAP, queue.length);
    if (at > s.index + 1 && queue[at - 1] !== item && queue[at] !== item) queue.splice(at, 0, item);
  }
  return { queue, index: s.index + 1, results };
}

export interface Summary {
  readonly total: number;
  readonly correct: number;
  /** 間違えた item（間違えた回数の多い順） */
  readonly weak: readonly ItemId[];
}

export function summarize(s: Session): Summary {
  const miss = new Map<ItemId, number>();
  for (const r of s.results) if (!r.ok) miss.set(r.item, (miss.get(r.item) ?? 0) + 1);
  return {
    total: s.results.length,
    correct: s.results.filter(r => r.ok).length,
    weak: [...miss].sort((a, b) => b[1] - a[1]).map(([id]) => id),
  };
}
