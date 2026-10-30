import { describe, expect, it } from "vitest";
import { href, parseRoute } from "./route";

describe("route", () => {
  it("ドリルの only（1 回だけ絞る出題範囲）を往復できる", () => {
    const only = JSON.stringify({ scales: ["dorian"], roots: [2] });
    const h = href({ name: "drill", topicId: "scale-boxes", only });
    expect(parseRoute(h)).toEqual({ name: "drill", topicId: "scale-boxes", only });
  });

  it("only が無ければ今までの形", () => {
    expect(href({ name: "drill", topicId: "diatonic" })).toBe("#/drill/diatonic");
    expect(parseRoute("#/drill/diatonic")).toEqual({ name: "drill", topicId: "diatonic" });
  });

  it("設定の open（開いておく分野）を往復できる", () => {
    expect(parseRoute(href({ name: "settings", open: "fret-notes" }))).toEqual({
      name: "settings",
      open: "fret-notes",
    });
    expect(href({ name: "settings" })).toBe("#/settings");
  });

  it("キーの画面の query を往復できる", () => {
    expect(parseRoute(href({ name: "key", query: "key=G&size=4" }))).toEqual({ name: "key", query: "key=G&size=4" });
    expect(href({ name: "key", query: "" })).toBe("#/key");
  });
});
