import { describe, expect, it } from "vitest";
import { playAscending, rootFrequency } from "./audio";

describe("試聴", () => {
  it("A は 440Hz、C はその下の C4", () => {
    expect(rootFrequency(9)).toBe(440);
    expect(rootFrequency(0)).toBeCloseTo(261.63, 1);
  });

  it("R から上行して 1 オクターブ上の R まで（音の出ない環境でも落ちない）", () => {
    expect(playAscending([0, 3, 5, 7, 10], 9)).toEqual([0, 3, 5, 7, 10, 12]);
  });
});
