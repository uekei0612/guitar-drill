/* 分野ごとの進み具合と、分野をまたぐ「今日の復習」。
   ホームはここで数を出し、「今日の復習」は期限の来た item を全分野から集めて 1 回のセッションにする。 */
import type { ItemStat } from "../drill/schedule";
import { type AnyTopic, type ItemId, itemKey } from "../drill/topic";
import { contextOf } from "../state";
import type { SaveData } from "../store/schema";
import type { Store } from "../store/store";
import { TOPICS } from "./index";

export interface Progress {
  /** 今の設定で出る item の数 */
  readonly total: number;
  /** 覚えた数：一度は間隔が付いた（最後に間違えていない）item。時間が経っても減らない */
  readonly learned: number;
  /** 復習待ち：期限が来た item */
  readonly due: number;
}

const isDue = (s: ItemStat | undefined, now: number) => !!s && s.due <= now;

function dueItems(t: AnyTopic, data: SaveData, now: number): ItemId[] {
  return t.items(contextOf(t, data.settings)).filter(id => isDue(data.items[itemKey(t.id, id)], now));
}

export function progressOf(t: AnyTopic, data: SaveData, now: number): Progress {
  const items = t.items(contextOf(t, data.settings));
  const stats = items.map(id => data.items[itemKey(t.id, id)]);
  return {
    total: items.length,
    learned: stats.filter(s => !!s && s.interval >= 1).length,
    due: stats.filter(s => isDue(s, now)).length,
  };
}

/** 復習がないときにすすめる分野：途中の分野（覚えた数が 1 以上で全部ではない）を先に、無ければ未着手の最初 */
export function nextTopic(data: SaveData, now: number): { topic: AnyTopic; progress: Progress } | undefined {
  const all = TOPICS.map(topic => ({ topic, progress: progressOf(topic, data, now) }));
  const open = all.filter(x => x.progress.learned < x.progress.total);
  return open.find(x => x.progress.learned > 0) ?? open[0];
}

export const REVIEW_ID = "review";
const SEP = "|";

/** 「今日の復習」。item は「分野 ID|元の item」。記録は元の分野のキーに書く */
export function reviewTopic(st: Store, clock: () => number = Date.now): AnyTopic {
  const split = (id: ItemId) => {
    const i = id.indexOf(SEP);
    const t = TOPICS.find(x => x.id === id.slice(0, i))!;
    return { t, item: id.slice(i + 1) };
  };
  return {
    id: REVIEW_ID,
    level: "beginner",
    title: "今日の復習",
    fitSize: true,
    emptyText: "今日の復習はありません。ホームから分野を選んで進めましょう。",
    // 設定は分野ごとのものを使う（渡される ctx は共通の部分だけ使う）
    items: () => TOPICS.flatMap(t => dueItems(t, st.data, clock()).map(id => `${t.id}${SEP}${id}`)),
    itemLabel: id => {
      const { t, item } = split(id);
      return `${t.title}：${t.itemLabel(item, contextOf(t, st.data.settings))}`;
    },
    question: (id, _ctx, rng) => {
      const { t, item } = split(id);
      return { ...t.question(item, contextOf(t, st.data.settings), rng), item: id };
    },
    sourceOf: id => split(id).t.title,
    recordKey: id => {
      const { t, item } = split(id);
      return itemKey(t.id, item);
    },
  };
}
