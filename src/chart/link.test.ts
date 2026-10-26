import { describe, expect, it } from "vitest";
import { chartHref } from "./link";
import { fromParams } from "./state";

describe("チャートを開くリンク", () => {
  it("チャートが同じスケール・キー・ボックスで開く", () => {
    const h = chartHref({ scale: "minor_pentatonic", rootPc: 9, box: 2 }, { tuning: "drop_d", lefty: true });
    expect(h.startsWith("#/chart?")).toBe(true);
    const s = fromParams(new URLSearchParams(h.split("?")[1]));
    expect(s).toMatchObject({
      chartType: "scale",
      scale: "minor_pentatonic",
      root: 9,
      tuning: "drop_d",
      lefty: true,
      caged: true,
      box: 2,
    });
  });

  it("ボックス無し・♭表記", () => {
    const s = fromParams(
      new URLSearchParams(
        chartHref({ scale: "dorian", rootPc: 10, flat: true }, { tuning: "standard", lefty: false }).split("?")[1],
      ),
    );
    expect(s).toMatchObject({ scale: "dorian", root: 10, flat: true, caged: true, box: null });
  });
});
