/* 乱数。出題は乱数を引数で受け取り、テストでは種を固定して再現する。 */

/** 0 以上 1 未満を返す */
export type Rng = () => number;

/** 種から作る乱数（mulberry32） */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomRng: Rng = Math.random;

export function pick<T>(rng: Rng, xs: readonly T[]): T {
  if (!xs.length) throw new Error("空の配列からは選べない");
  return xs[Math.floor(rng() * xs.length)]!;
}

/** 並べ替えた新しい配列を返す（元は変えない） */
export function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
