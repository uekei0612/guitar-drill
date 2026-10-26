import { describe, expect, it } from "vitest";
import { guitarChartUrl } from "./guitar-chart-link";

describe("guitar_chart で開く", () => {
  it("guitar_chart が復元できるパラメーターを付ける", () => {
    const u = new URL(
      guitarChartUrl(
        "https://gc.example/",
        { scale: "minor_pentatonic", rootPc: 9, box: 2 },
        { tuning: "standard", lefty: false },
      ),
    );
    expect(Object.fromEntries(u.searchParams)).toEqual({
      chart_type: "scale",
      scale: "minor_pentatonic",
      root: "A",
      tuning: "standard",
      caged: "1",
      box: "2",
    });
  });

  it("♭表記・左利き・ボックス無し、URL にパスがあっても壊さない", () => {
    const u = new URL(
      guitarChartUrl(
        "http://h:8002/app/?lang=en",
        { scale: "dorian", rootPc: 10, flat: true },
        { tuning: "drop_d", lefty: true },
      ),
    );
    expect(u.pathname).toBe("/app/");
    expect(u.searchParams.get("lang")).toBe("en");
    expect(u.searchParams.get("root")).toBe("A#");
    expect(u.searchParams.get("flat")).toBe("1");
    expect(u.searchParams.get("lefty")).toBe("1");
    expect(u.searchParams.has("caged")).toBe(false);
  });
});
