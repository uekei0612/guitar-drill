/* 画面から使う状態：記録（Store）と、そこから組み立てる分野ごとの文脈。 */
import { useEffect, useState } from "preact/hooks";
import type { AnyTopic, CommonSettings, Context } from "./drill/topic";
import type { SaveData, Settings } from "./store/schema";
import { Store } from "./store/store";
import { STANDARD, TUNINGS } from "./theory";

export const store = new Store();

/** 記録を読み、変わったら描き直す */
export function useData(s: Store = store): SaveData {
  const [data, setData] = useState(s.data);
  useEffect(() => s.subscribe(() => setData(s.data)), [s]);
  return data;
}

export const commonOf = (st: Settings): CommonSettings => ({
  tuning: TUNINGS.find(t => t.id === st.tuning) ?? STANDARD,
  lefty: st.lefty,
});

/** 分野の文脈。分野ごとの設定は分野が検証する */
export const contextOf = (topic: AnyTopic, st: Settings): Context<unknown> => ({
  common: commonOf(st),
  settings: topic.settings ? topic.settings.parse(st.topics[topic.id]) : {},
});

/** 1 回だけ出題範囲を絞った設定（ドリルの URL の only。読めなければ元の設定のまま）。記録には書かない */
export function scoped(topic: AnyTopic, st: Settings, only: string | undefined): Settings {
  if (!only || !topic.settings) return st;
  try {
    return { ...st, topics: { ...st.topics, [topic.id]: JSON.parse(only) as unknown } };
  } catch {
    return st;
  }
}
