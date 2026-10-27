import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./store/schema";
import { scoped } from "./state";
import { topicById } from "./topics";

describe("scoped", () => {
  const topic = topicById("scale-boxes")!;

  it("only の範囲で分野の設定を差し替える（記録の設定は変えない）", () => {
    const st = scoped(topic, DEFAULT_SETTINGS, JSON.stringify({ scales: ["major"], roots: [0] }));
    expect(st.topics["scale-boxes"]).toEqual({ scales: ["major"], roots: [0] });
    expect(DEFAULT_SETTINGS.topics["scale-boxes"]).toBeUndefined();
  });

  it("読めない only は無視する", () => {
    expect(scoped(topic, DEFAULT_SETTINGS, "{")).toBe(DEFAULT_SETTINGS);
  });
});
