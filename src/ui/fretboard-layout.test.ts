import { describe, expect, it } from "vitest";
import { chooseOrientation, layout } from "./fretboard-layout";

const full = { minFret: 0, maxFret: 12 };
const box = { minFret: 5, maxFret: 8 };

describe("layout", () => {
  it("短い範囲は横、広い範囲は縦", () => {
    expect(chooseOrientation(box)).toBe("horizontal");
    expect(chooseOrientation({ minFret: 0, maxFret: 5 })).toBe("horizontal");
    expect(chooseOrientation(full)).toBe("vertical");
  });

  it("360px 幅（余白 16px ずつ）で 12 フレットまで、1 マス 44px 以上", () => {
    const L = layout(6, full, false);
    const scale = Math.min(1, 328 / L.width);
    for (const c of L.cells) {
      expect(c.w * scale).toBeGreaterThanOrEqual(44);
      expect(c.h * scale).toBeGreaterThanOrEqual(44);
    }
    expect(L.cells).toHaveLength(6 * 13);
  });

  it("ボックスを横向きで出しても 1 マス 44px 以上", () => {
    const L = layout(6, { minFret: 4, maxFret: 9 }, false);
    const scale = Math.min(1, 328 / L.width);
    for (const c of L.cells) expect(Math.min(c.w, c.h) * scale).toBeGreaterThanOrEqual(44);
  });

  it("横向き：1 弦が上、右利きはナットが左・左利きは右", () => {
    const R = layout(6, box, false),
      Lf = layout(6, box, true);
    const at = (L: typeof R, s: number, f: number) => L.cellAt({ string: s, fret: f })!.c;
    expect(at(R, 1, 5).y).toBeLessThan(at(R, 6, 5).y);
    expect(at(R, 1, 5).x).toBeLessThan(at(R, 1, 8).x);
    expect(at(Lf, 1, 5).x).toBeGreaterThan(at(Lf, 1, 8).x);
  });

  it("縦向き：ナットが上、右利きは 6 弦が左・左利きは右", () => {
    const R = layout(6, full, false),
      Lf = layout(6, full, true);
    const at = (L: typeof R, s: number, f: number) => L.cellAt({ string: s, fret: f })!.c;
    expect(at(R, 1, 0).y).toBeLessThan(at(R, 1, 12).y);
    expect(at(R, 6, 3).x).toBeLessThan(at(R, 1, 3).x);
    expect(at(Lf, 6, 3).x).toBeGreaterThan(at(Lf, 1, 3).x);
  });

  it("ナットは開放を含むときだけ。ポジションマークとフレット番号", () => {
    const L = layout(6, full, false);
    expect(L.wires.filter(w => w.nut)).toHaveLength(1);
    expect(L.inlays).toHaveLength(4 + 2);
    expect(L.fretLabels.map(f => f.fret)).toEqual([3, 5, 7, 9, 12]);
    expect(L.stringLabels.map(l => l.string)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(L.stringLabels[5]!.x).toBeLessThan(L.stringLabels[0]!.x);
    const B = layout(6, box, false);
    expect(B.wires.filter(w => w.nut)).toHaveLength(0);
    expect(B.wires).toHaveLength(5);
    expect(B.fretLabels.map(f => f.fret)).toEqual([5, 7]);
    // 横向きはヘッド側（右利きは左）に弦の番号
    expect(B.stringLabels.map(l => l.string)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(B.stringLabels[0]!.x).toBeLessThan(B.cellAt({ string: 1, fret: 5 })!.c.x);
    expect(B.stringLabels[0]!.y).toBeLessThan(B.stringLabels[5]!.y);
    expect(layout(6, box, false, "horizontal", { headLabels: false }).stringLabels).toEqual([]);
  });

  it("縦向きで弦の札を上にも置くと、上下に 1 本ずつ、上の札は点より上", () => {
    const L = layout(6, full, false, "vertical", { labelsBothEnds: true });
    const plain = layout(6, full, false, "vertical");
    expect(L.stringLabels).toHaveLength(12);
    expect(L.height).toBeGreaterThan(plain.height);
    const top = Math.min(...L.stringLabels.map(l => l.y));
    expect(top + L.r).toBeLessThanOrEqual(Math.min(...L.cells.map(c => c.c.y - L.r)) + L.r);
  });

  it("点はすべて図の中", () => {
    for (const [r, lefty] of [
      [full, false],
      [full, true],
      [box, false],
      [box, true],
    ] as const) {
      const L = layout(7, r, lefty);
      for (const c of L.cells) {
        expect(c.c.x - L.r).toBeGreaterThanOrEqual(0);
        expect(c.c.y - L.r).toBeGreaterThanOrEqual(0);
        expect(c.c.x + L.r).toBeLessThanOrEqual(L.width);
        expect(c.c.y + L.r).toBeLessThanOrEqual(L.height);
      }
    }
  });
});
