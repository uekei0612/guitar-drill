import { describe, expect, it } from "vitest";
import { addDay, localDay, streakOf } from "./streak";

const at = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).getTime();

describe("練習した日と連続日数", () => {
  it("日は端末のローカル時刻で区切り、同じ日は 1 つ", () => {
    expect(localDay(at(10, 28, 0))).toBe("2026-10-28");
    expect(localDay(at(10, 28, 23))).toBe("2026-10-28");
    expect(addDay(addDay([], at(10, 28, 1)), at(10, 28, 23))).toEqual(["2026-10-28"]);
  });

  it("今日やっていなくても、昨日まで続いていれば連続のまま。1 日空くと 0", () => {
    const days = ["2026-10-25", "2026-10-26", "2026-10-27"];
    expect(streakOf(days, at(10, 27))).toEqual({ streak: 3, last: "2026-10-27" });
    expect(streakOf(days, at(10, 28))).toEqual({ streak: 3, last: "2026-10-27" });
    expect(streakOf(days, at(10, 29))).toEqual({ streak: 0, last: "2026-10-27" });
    // 月をまたぐ
    expect(streakOf(["2026-10-31", "2026-11-01"], at(11, 1)).streak).toBe(2);
    expect(streakOf([], at(10, 28))).toEqual({ streak: 0, last: undefined });
  });
});
