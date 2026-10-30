// @vitest-environment happy-dom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { KeyView } from "./KeyView";

afterEach(() => {
  document.body.innerHTML = "";
});

async function mount(query: string) {
  const el = document.body.appendChild(document.createElement("div"));
  await act(() => render(<KeyView query={query} />, el));
  return el;
}

const cards = (el: Element) => [...el.querySelectorAll<HTMLButtonElement>(".kv-card")];
const inCells = (el: Element) =>
  [...el.querySelectorAll(".kv-cell.in")].map(g => g.querySelector("text")!.textContent).sort();

describe("キーの画面", () => {
  it("五度圏の扇形にキーの 7 つのコードが出て、札にも同じ 7 つが並ぶ", async () => {
    const el = await mount("key=G&size=3");
    expect(inCells(el)).toEqual(["Am", "Bm", "C", "D", "Em", "F♯dim", "G"].sort());
    expect(el.querySelector(".kv-cell.tonic text")!.textContent).toBe("G");
    expect(cards(el).map(c => c.querySelector(".kv-card-name")!.textContent)).toEqual([
      "G",
      "Am",
      "Bm",
      "C",
      "D",
      "Em",
      "F♯dim",
    ]);
  });

  it("5 度上へ進むと、変わった音（F → F♯）を知らせ、URL も変わる", async () => {
    const el = await mount("key=C");
    await act(() => el.querySelector<HTMLButtonElement>("button[aria-label^='5 度上']")!.click());
    expect(el.querySelector(".kv-change")!.textContent).toContain("F が F♯ に変わる");
    expect(el.querySelector(".tone-dot.changed")!.textContent).toBe("F♯");
    expect(location.hash).toContain("key=G");
  });

  it("輪の文字を押すとキーが変わる（中の輪はマイナー）", async () => {
    const el = await mount("key=C");
    const em = [...el.querySelectorAll<SVGGElement>(".kv-cell[role=button]")].find(
      g => g.getAttribute("aria-label") === "キー Em にする",
    )!;
    await act(() => {
      em.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(el.querySelector(".kv-cell.tonic text")!.textContent).toBe("Em");
  });

  it("札を押すと、そのコードの構成音と機能が出る", async () => {
    const el = await mount("key=C&size=4");
    await act(() => cards(el)[4]!.click());
    expect(cards(el)[4]!.getAttribute("aria-pressed")).toBe("true");
    const detail = el.querySelector(".kv-detail")!;
    expect([...detail.querySelectorAll(".kv-tone > span")].map(e => e.textContent)).toEqual(["G", "B", "D", "F"]);
    expect(detail.textContent).toContain("ドミナント");
    expect(el.querySelector(".kv-cell.selected text")!.textContent).toBe("G");
  });

  it("マイナーで借りたコードは、点線の札と扇形の外の印になる", async () => {
    const el = await mount("key=Am&size=4&borrow=1");
    expect(cards(el).filter(c => c.classList.contains("borrowed")).length).toBe(2);
    expect([...el.querySelectorAll(".kv-cell.borrowed text:first-of-type")].map(t => t.textContent).sort()).toEqual([
      "E",
      "G♯dim",
    ]);
  });

  it("指板：コードを選ぶと構成音を度数で、ほかのスケールの音を薄く出す", async () => {
    const el = await mount("key=C&size=4&chord=5");
    const marks = [...el.querySelectorAll(".kv-board .fb-mark")];
    const labels = new Set(marks.filter(m => !m.classList.contains("dim")).map(m => m.textContent));
    expect([...labels].sort()).toEqual(["3", "5", "R", "♭7"]);
  });

  it("指板：ルートの位置は低い 2 本の弦に、7 つのコードの度数で出す", async () => {
    const el = await mount("key=C&board=roots");
    const board = el.querySelector(".kv-board")!;
    const romans = new Set([...board.querySelectorAll(".fb-mark")].map(m => m.textContent));
    expect(romans).toEqual(new Set(["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"]));
  });

  it("ドリルへのリンクは、このキーと和音の数だけに絞る", async () => {
    const el = await mount("key=Em&size=3");
    const a = [...el.querySelectorAll<HTMLAnchorElement>(".kv-links a")].find(x => x.href.includes("drill"))!;
    const only = new URLSearchParams(a.getAttribute("href")!.split("?")[1]).get("only")!;
    expect(JSON.parse(only)).toEqual({ size: 3, borrowDominant: false, keys: ["Em"] });
  });
});
