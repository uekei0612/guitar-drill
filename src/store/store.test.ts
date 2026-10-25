import { describe, expect, it } from "vitest";
import { review } from "../drill/schedule";
import { DEFAULT_SETTINGS, VERSION, emptyData, parseData, parseSettings, parseStat, parseUrl } from "./schema";
import { STORAGE_KEY, Store, exportJson, importJson, memoryStorage } from "./store";

const T0 = Date.UTC(2026, 9, 25);
const stat = review(undefined, true, T0);

describe("schema", () => {
  it("壊れた値・知らない値は既定値に戻す", () => {
    expect(parseData(null)).toEqual(emptyData());
    expect(parseData("x")).toEqual(emptyData());
    expect(parseSettings({ tuning: "nope", lefty: "yes", theme: "pink", sessionSize: 7, topics: [] })).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(
      parseSettings({ tuning: "drop_d", lefty: true, theme: "dark", sessionSize: 30, topics: { a: { x: 1 }, b: 3 } }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      tuning: "drop_d",
      lefty: true,
      theme: "dark",
      sessionSize: 30,
      topics: { a: { x: 1 } },
    });
  });

  it("成績は 1 件ずつ検証し、壊れたものだけ捨てる", () => {
    expect(parseStat(stat)).toEqual(stat);
    expect(parseStat({ ...stat, ease: 9 })).toBeUndefined();
    expect(parseStat({ ...stat, correct: 5, tries: 2 })).toBeUndefined();
    expect(parseStat({ ...stat, due: "tomorrow" })).toBeUndefined();
    expect(parseStat({ ...stat, interval: Number.NaN })).toBeUndefined();
    const d = parseData({
      version: 1,
      items: { "fret-notes/6-5": stat, "fret-notes/x": { ease: 1 }, "no-slash": stat },
    });
    expect(d.items).toEqual({ "fret-notes/6-5": stat });
  });

  it("guitar_chart の URL は http(s) だけ", () => {
    expect(parseUrl("https://guitar-chart.example/")).toBe("https://guitar-chart.example/");
    expect(parseUrl(" http://h:8002 ")).toBe("http://h:8002/");
    expect(parseUrl("javascript:alert(1)")).toBe("");
    expect(parseUrl("not a url")).toBe("");
    expect(parseUrl(3)).toBe("");
  });

  it("版が無い・古い値でも今の版で返す", () => {
    expect(parseData({ items: { "a/b": stat } })).toEqual({ ...emptyData(), items: { "a/b": stat } });
    expect(parseData({ version: 0 }).version).toBe(VERSION);
  });
});

describe("Store", () => {
  it("保存して読み直せる", () => {
    const kv = memoryStorage();
    const s = new Store(kv);
    expect(s.persistent).toBe(true);
    s.update(d => ({ ...d, items: { ...d.items, "a/b": stat } }));
    expect(new Store(kv).data.items).toEqual({ "a/b": stat });
  });

  it("保存値が JSON として壊れていても落ちない", () => {
    const kv = memoryStorage();
    kv.setItem(STORAGE_KEY, "{oops");
    expect(new Store(kv).data).toEqual(emptyData());
  });

  it("localStorage が使えない・書き込みに失敗しても落ちない", () => {
    const s = new Store(null);
    expect(s.persistent).toBe(false);
    s.update(d => ({ ...d, items: { "a/b": stat } }));
    expect(s.data.items).toEqual({ "a/b": stat });

    const full = new Store({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    full.update(d => d);
    expect(full.persistent).toBe(false);
  });
});

describe("書き出し／読み込み", () => {
  it("往復する", () => {
    const d = { ...emptyData(), items: { "a/b": stat }, settings: { ...DEFAULT_SETTINGS, lefty: true } };
    const r = importJson(exportJson(d));
    expect(r).toEqual({ ok: true, data: d });
  });

  it("別物のファイルや新しい版は断る", () => {
    expect(importJson("{").ok).toBe(false);
    expect(importJson(JSON.stringify({ version: 1 })).ok).toBe(false);
    expect(importJson(JSON.stringify({ app: "guitar-drill", version: VERSION + 1 }))).toMatchObject({ ok: false });
  });
});
