import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHART,
  addLowString,
  chartOf,
  fromParams,
  removeLowString,
  toParams,
  toggleDegree,
  tuningOf,
} from "./state";

const roundTrip = (s: typeof DEFAULT_CHART) => fromParams(new URLSearchParams(toParams(s).toString()));

describe("チャートの状態", () => {
  it("URL と往復する", () => {
    expect(roundTrip(DEFAULT_CHART)).toEqual(DEFAULT_CHART);
    const s = {
      ...DEFAULT_CHART,
      chartType: "custom" as const,
      custom: [0, 3, 6],
      root: 1,
      tuning: "custom",
      customTuning: [11, 4, 9, 2, 7, 11, 4],
      capo: 3,
      label: "note" as const,
      flat: true,
      lefty: true,
      caged: true,
      box: 2,
      includeAllKeys: false,
      keysPerPage: 4,
    };
    expect(roundTrip(s)).toEqual(s);
  });

  it("guitar_chart の URL をそのまま読める（別名のチューニングも）", () => {
    const s = fromParams(new URLSearchParams("chart_type=scale&scale=minor_pentatonic&root=A&tuning=eb&caged=1&box=2"));
    expect(s).toMatchObject({
      chartType: "scale",
      scale: "minor_pentatonic",
      root: 9,
      tuning: "half_step_down",
      caged: true,
      box: 2,
    });
    expect(chartOf(s).id).toBe("minor_pentatonic");
  });

  it("読めない値は既定値のまま", () => {
    const s = fromParams(
      new URLSearchParams("chart_type=x&scale=nope&root=H&tuning=custom&strings=E,A&capo=99&box=7&kpp=0"),
    );
    expect(s).toEqual({ ...DEFAULT_CHART });
    // 前の版の 6・12 キーのリンクは、選べるいちばん多い数にする
    expect(fromParams(new URLSearchParams("kpp=12")).keysPerPage).toBe(4);
  });

  it("度数のタップ：足す・外すとカスタムになり、R と 2 音未満は守る", () => {
    const s = toggleDegree(DEFAULT_CHART, 1)!;
    expect(s.chartType).toBe("custom");
    expect(s.custom).toEqual([0, 1, 2, 4, 7, 9]);
    expect(toggleDegree(DEFAULT_CHART, 0)).toBeNull();
    const two = { ...DEFAULT_CHART, chartType: "custom" as const, custom: [0, 7] };
    expect(toggleDegree(two, 7)).toBeNull();
  });

  it("自分で決めたチューニング：低い弦を足す（4 度下）・外す、4〜8 弦", () => {
    const s = { ...DEFAULT_CHART, tuning: "custom" };
    expect(addLowString(s).customTuning).toEqual([11, 4, 9, 2, 7, 11, 4]);
    expect(addLowString(addLowString(addLowString(s))).customTuning).toHaveLength(8);
    expect(removeLowString(removeLowString(removeLowString(s))).customTuning).toHaveLength(4);
    expect(tuningOf(s).open).toHaveLength(6);
  });
});
