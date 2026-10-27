/* 練習した日と連続日数。日の区切りは端末のローカル時刻。 */

/** その時刻の、端末の暦での日付（YYYY-MM-DD） */
export function localDay(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 覚えておく日数（連続日数と「最後に練習した日」にはこれで足りる） */
export const MAX_DAYS = 400;

/** 練習した日を足す（並びは古い順、重複なし） */
export function addDay(days: readonly string[], t: number): string[] {
  const d = localDay(t);
  if (days[days.length - 1] === d) return [...days];
  return [...days.filter(x => x !== d), d].sort().slice(-MAX_DAYS);
}

const prevDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return localDay(new Date(y, m - 1, d - 1, 12).getTime());
};

/** 連続日数（今日まだやっていなくても、昨日まで続いていれば途切れていない）と、最後に練習した日 */
export function streakOf(days: readonly string[], now: number): { readonly streak: number; readonly last?: string } {
  const set = new Set(days);
  const last = days[days.length - 1];
  const today = localDay(now);
  let d = set.has(today) ? today : prevDay(today);
  let streak = 0;
  while (set.has(d)) {
    streak++;
    d = prevDay(d);
  }
  return { streak, last };
}
