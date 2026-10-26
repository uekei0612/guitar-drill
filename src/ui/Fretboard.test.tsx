// @vitest-environment happy-dom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { STANDARD, type Position } from "../theory";
import { Fretboard } from "./Fretboard";

const root = () => document.body.appendChild(document.createElement("div"));
afterEach(() => {
  document.body.innerHTML = "";
});

describe("Fretboard", () => {
  it("点とラベルを描く。タップしない図は img", () => {
    const el = root();
    render(
      <Fretboard
        tuning={STANDARD}
        range={{ minFret: 5, maxFret: 8 }}
        label="A マイナーペンタ ボックス 1"
        marks={[
          { pos: { string: 6, fret: 5 }, kind: "root", label: "R" },
          { pos: { string: 6, fret: 8 }, kind: "tone", label: "♭3" },
          { pos: { string: 1, fret: 20 }, kind: "tone" },
        ]}
      />,
      el,
    );
    const svg = el.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("A マイナーペンタ ボックス 1");
    expect(el.querySelectorAll(".fb-mark")).toHaveLength(2);
    expect([...el.querySelectorAll(".fb-mark text")].map(t => t.textContent)).toEqual(["R", "♭3"]);
    expect(el.querySelectorAll(".fb-hit")).toHaveLength(0);
  });

  it("タップで (弦, フレット) を返し、矢印キーで動ける", async () => {
    const el = root();
    const taps: Position[] = [];
    await act(() =>
      render(
        <Fretboard tuning={STANDARD} range={{ minFret: 0, maxFret: 12 }} label="指板" onTap={p => taps.push(p)} />,
        el,
      ),
    );
    const hits = [...el.querySelectorAll<SVGRectElement>(".fb-hit")];
    expect(hits).toHaveLength(78);
    expect(hits.filter(h => h.getAttribute("tabindex") === "0")).toHaveLength(1);
    const a = hits.find(h => h.getAttribute("aria-label") === "5弦 開放")!;
    await act(() => void a.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(taps).toEqual([{ string: 5, fret: 0 }]);
    // 縦向き：下はフレットが上がる
    await act(() => void a.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(document.activeElement?.getAttribute("aria-label")).toBe("5弦 1フレット");
    await act(
      () => void document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    expect(taps.at(-1)).toEqual({ string: 5, fret: 1 });
  });

  it("押した点は aria-pressed", () => {
    const el = root();
    render(
      <Fretboard
        tuning={STANDARD}
        range={{ minFret: 5, maxFret: 8 }}
        label="指板"
        selected={[{ string: 3, fret: 7 }]}
        onTap={() => {}}
      />,
      el,
    );
    const pressed = [...el.querySelectorAll(".fb-hit")].filter(h => h.getAttribute("aria-pressed") === "true");
    expect(pressed.map(h => h.getAttribute("aria-label"))).toEqual(["3弦 7フレット"]);
    expect(el.querySelectorAll(".fb-selected")).toHaveLength(1);
  });

  it("押せる弦・フレットを絞ると、ほかのマスは押せず薄く出る", () => {
    const el = root();
    render(
      <Fretboard
        tuning={STANDARD}
        range={{ minFret: 0, maxFret: 3 }}
        label="開放弦"
        onTap={() => {}}
        tapStrings={[6, 5]}
        tapFrets={{ minFret: 0, maxFret: 0 }}
      />,
      el,
    );
    expect([...el.querySelectorAll(".fb-hit")].map(h => h.getAttribute("aria-label"))).toEqual([
      "5弦 開放",
      "6弦 開放",
    ]);
    expect(el.querySelectorAll(".fb-string.off")).toHaveLength(4);
    expect(el.querySelectorAll(".fb-off")).toHaveLength(1);
  });

  it("横向きの図にも弦の番号を書く", () => {
    const el = root();
    render(<Fretboard tuning={STANDARD} range={{ minFret: 3, maxFret: 7 }} label="5 フレット" />, el);
    expect([...el.querySelectorAll(".fb-fretno")].map(t => t.textContent)).toEqual(
      expect.arrayContaining(["1", "2", "3", "4", "5", "6"]),
    );
  });
});
