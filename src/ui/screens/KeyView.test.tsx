// @vitest-environment happy-dom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { KeyView } from "./KeyView";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

async function mount(query: string) {
  const el = document.body.appendChild(document.createElement("div"));
  await act(() => render(<KeyView query={query} />, el));
  return el;
}

const cards = (el: Element) => [...el.querySelectorAll<HTMLButtonElement>(".kv-card")];
const cellOrNull = (el: Element, label: string) =>
  [...el.querySelectorAll<SVGGElement>(".kv-cell[role=button]")].find(g => g.getAttribute("aria-label") === label);
const cell = (el: Element, label: string) => cellOrNull(el, label)!;
/** 五度圏の図（画面の座標を viewBox と同じにしておく） */
function circleOf(el: Element) {
  const svg = el.querySelector<SVGSVGElement>(".kv-side .kv-circle")!;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 360 }) as DOMRect;
  return svg;
}
/** 中心から見た向き（真上が 0、時計回りの度）と半径の点 */
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { clientX: 180 + r * Math.sin(a), clientY: 180 - r * Math.cos(a) };
};
const pointer = (type: string, p: { clientX: number; clientY: number }) =>
  new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, button: 0, ...p });
/** 図の上で、from 度から to 度まで、半径 r を通って動かす */
async function drag(svg: SVGSVGElement, from: number, to: number, r = 146) {
  await act(() => {
    svg.dispatchEvent(pointer("pointerdown", at(from, r)));
  });
  const n = 10;
  for (let i = 1; i <= n; i++)
    await act(() => {
      window.dispatchEvent(pointer("pointermove", at(from + ((to - from) * i) / n, r)));
    });
  await act(() => {
    window.dispatchEvent(pointer("pointerup", at(to, r)));
  });
}
/** マスを押したまま長押しの時間だけ待ち、離して click まで送る（moveTo があれば、押してすぐそこへ動かす） */
async function hold(
  g: Element,
  p: { clientX: number; clientY: number },
  moveTo?: { clientX: number; clientY: number },
  click = true,
) {
  await act(() => {
    g.dispatchEvent(pointer("pointerdown", p));
    if (moveTo) window.dispatchEvent(pointer("pointermove", moveTo));
  });
  await act(() => new Promise(r => setTimeout(r, 600)));
  await act(() => {
    window.dispatchEvent(pointer("pointerup", moveTo ?? p));
    if (click) g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
const center = (el: Element) => el.querySelector(".kv-side .kv-center")!.textContent;

const inCells = (el: Element) =>
  [...el.querySelectorAll(".kv-cell.in")].map(g => g.querySelector("text")!.textContent).sort();

describe("キーの画面", () => {
  it("五度圏の扇形にキーの 7 つのコードが出て、札にも同じ 7 つが並ぶ", async () => {
    const el = await mount("key=G&size=3");
    expect(inCells(el)).toEqual(["Am", "Bm", "C", "D", "Em", "F♯dim", "G"].sort());
    expect(el.querySelector(".kv-cell.tonic text")!.textContent).toBe("G");
    expect(cards(el).map(c => c.querySelector(".kv-card-name")!.textContent!.replace("\u200b", ""))).toEqual([
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

  it("扇形の外の文字を押すとキーが変わる（中の輪はマイナー）", async () => {
    const el = await mount("key=C");
    await act(() => {
      cell(el, "キー F♯m にする").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(el.querySelector(".kv-cell.tonic text")!.textContent).toBe("F♯m");
  });

  it("扇形の中を押すと、札と同じくそのコードを選ぶ（キーは変わらない）", async () => {
    const el = await mount("key=C&size=4");
    // 扇形の中の G は、キーを変えるボタンではない
    expect(cellOrNull(el, "キー G にする")).toBeUndefined();
    await act(() => {
      cell(el, "Ⅴ7（G7）を鳴らす").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(el.querySelector(".kv-cell.tonic text")!.textContent).toBe("C");
    expect(cards(el)[4]!.getAttribute("aria-pressed")).toBe("true");
    // 内の dim も、キーのコードなら押せる
    await act(() => {
      cell(el, "Ⅶm7(♭5)（Bm7(♭5)）を鳴らす").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(cards(el)[6]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("扇形をつかんで回すと、離したところに近いキーになる（コードは鳴らさない）", async () => {
    const el = await mount("key=C&size=4");
    const svg = circleOf(el);
    expect(el.querySelector(".kv-hint")).not.toBeNull();
    // C の位置から時計回りに 1 つ分（G のところまで）
    await drag(svg, 0, 30);
    expect(center(el)).toBe("G");
    expect(location.hash).toContain("key=G");
    expect(el.querySelector(".kv-change")!.textContent).toContain("F が F♯ に変わる");
    expect(cards(el).some(c => c.getAttribute("aria-pressed") === "true")).toBe(false);
    // 1 度回したら、回し方の案内は出さない（次に開いたときも）
    expect(el.querySelector(".kv-hint")).toBeNull();
    expect(localStorage.length).toBe(1);
    // 中の輪から反時計回りに 2.6 つ分 → 3 つ戻って B♭
    await drag(svg, 30, 30 - 78, 100);
    expect(center(el)).toBe("B♭");
    // 半分に満たなければ元のキーのまま
    await drag(svg, -60, -50);
    expect(center(el)).toBe("B♭");
  });

  it("回しているあいだは、行き先のキーのコードを扇形に出す", async () => {
    const el = await mount("key=C&size=3");
    const svg = circleOf(el);
    await act(() => {
      svg.dispatchEvent(pointer("pointerdown", at(0, 146)));
    });
    await act(() => {
      window.dispatchEvent(pointer("pointermove", at(32, 146)));
    });
    expect(svg.classList.contains("turning")).toBe(true);
    expect(center(el)).toBe("G");
    expect(inCells(el)).toEqual(["Am", "Bm", "C", "D", "Em", "F♯dim", "G"].sort());
    // 札はまだ元のキー
    expect(cards(el)[0]!.textContent).toContain("C");
    await act(() => {
      window.dispatchEvent(pointer("pointercancel", at(32, 146)));
    });
    // 取り消されたら元のキーに戻る
    expect(center(el)).toBe("C");
  });

  it("扇形の上の小さなぶれはドラッグにせず、押したコードを鳴らす", async () => {
    const el = await mount("key=C&size=4");
    const svg = circleOf(el);
    const g = cell(el, "Ⅴ7（G7）を鳴らす");
    await act(() => {
      g.dispatchEvent(pointer("pointerdown", at(30, 146)));
      window.dispatchEvent(pointer("pointermove", at(31, 147)));
      window.dispatchEvent(pointer("pointerup", at(31, 147)));
      g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(svg.classList.contains("turning")).toBe(false);
    expect(center(el)).toBe("C");
    expect(cards(el)[4]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("回したあとの click ではコードを鳴らさない", async () => {
    const el = await mount("key=C&size=4");
    const svg = circleOf(el);
    await drag(svg, 30, 60);
    // 押したところと離したところが同じマスなら、ブラウザはそのマスに click を送る
    await act(() => {
      svg.querySelector(".kv-cell.tonic")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(center(el)).toBe("G");
    expect(cards(el).some(c => c.getAttribute("aria-pressed") === "true")).toBe(false);
  });

  it("扇形の中のコードを長押しすると、そのキーへ移る（離してもコードは鳴らさない）", async () => {
    const el = await mount("key=C&size=4");
    circleOf(el);
    await hold(cell(el, "Ⅴ7（G7）を鳴らす"), at(30, 146));
    expect(center(el)).toBe("G");
    expect(location.hash).toContain("key=G");
    expect(cards(el).some(c => c.getAttribute("aria-pressed") === "true")).toBe(false);
    // 回し方の案内は、回すまで出しておく
    expect(el.querySelector(".kv-hint")).not.toBeNull();
    // 中の輪はマイナーキーへ
    await hold(cell(el, "Ⅵm7（Em7）を鳴らす"), at(30, 100));
    expect(el.querySelector(".kv-cell.tonic text")!.textContent).toBe("Em");
  });

  it("主音を長押ししても、動かして回し始めても、長押しにはしない", async () => {
    const el = await mount("key=C&size=4");
    circleOf(el);
    await hold(cell(el, "ⅠM7（CM7）を鳴らす"), at(0, 146));
    expect(center(el)).toBe("C");
    expect(cards(el)[0]!.getAttribute("aria-pressed")).toBe("true");
    // G を押して少し回し、そのまま待ってから戻して離す
    await hold(cell(el, "Ⅴ7（G7）を鳴らす"), at(30, 146), at(36, 146), false);
    expect(center(el)).toBe("C");
  });

  it("扇形の外から動かしても回らない", async () => {
    const el = await mount("key=C");
    await drag(circleOf(el), 120, 150);
    expect(center(el)).toBe("C");
  });

  it("図の中で ← → を押すと 5 度ずつ回る", async () => {
    const el = await mount("key=C");
    const g = cell(el, "キー A にする");
    await act(() => {
      g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(center(el)).toBe("G");
    for (let i = 0; i < 2; i++)
      await act(() => {
        g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      });
    expect(center(el)).toBe("F");
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

  it("進行を選ぶと札が並び、五度圏に矢印が出る（Ⅱ–Ⅴ–Ⅰ は 5 度下が 2 回）", async () => {
    const el = await mount("key=C&prog=251");
    expect([...el.querySelectorAll(".kv-steps .kv-card-name")].map(e => e.textContent)).toEqual(["Dm7", "G7", "CM7"]);
    expect([...el.querySelectorAll(".kv-motion.strong")].length).toBe(2);
    expect(el.querySelectorAll(".kv-side .kv-arrows path").length).toBe(2);
    // 進行のそばにも、押せない五度圏の写しを出す（スマホで上の五度圏が画面の外でも矢印が見える）
    const mini = el.querySelector(".kv-prog .kv-circle.mini")!;
    expect(mini.querySelectorAll(".kv-arrows path").length).toBe(2);
    expect(mini.querySelector("[role=button]")).toBeNull();
  });

  it("自分で作る進行は、札を押した順に足していく", async () => {
    const el = await mount("key=C&prog=custom");
    for (const i of [0, 5, 3, 4]) await act(() => cards(el)[i]!.click());
    expect([...el.querySelectorAll(".kv-steps .kv-card-roman")].map(e => e.textContent)).toEqual(["Ⅰ", "Ⅵ", "Ⅳ", "Ⅴ"]);
    expect(location.hash).toContain("seq=1-6-4-5");
    await act(() =>
      [...el.querySelectorAll<HTMLButtonElement>(".kv-prog button")].find(b => b.textContent === "1 つ戻す")!.click(),
    );
    expect(el.querySelectorAll(".kv-steps li").length).toBe(3);
  });

  it("マイナーキーに移ると、メジャーの進行は外れる", async () => {
    const el = await mount("key=C&prog=ohdo");
    await act(() => el.querySelector<HTMLButtonElement>(".kv-related button")!.click());
    expect(el.querySelector<HTMLSelectElement>(".kv-prog select")!.value).toBe("");
  });

  it("内の dim の輪はキーの dim だけを書き、中心と選択欄はキーの名前を省略しない", async () => {
    const el = await mount("key=G&size=3");
    expect([...el.querySelectorAll(".kv-cell--dim text:first-of-type")].map(t => t.textContent)).toEqual(["F♯dim"]);
    expect([...el.querySelectorAll(".kv-center, .kv-center-sub")].map(t => t.textContent)).toEqual([
      "G",
      "メジャー",
      "調号♯1つ",
    ]);
    const opts = [...el.querySelectorAll("option")].map(o => o.textContent);
    expect(opts).toContain("C メジャー（♯♭なし）");
    expect(opts).toContain("F♯ マイナー（♯3つ）");
  });

  it("扇形の外のコードは、輪の綴りでなく札と同じ綴りで出す（F♯m の Ⅴ は C♯）", async () => {
    const el = await mount("key=F%23m&size=3&borrow=1");
    expect([...el.querySelectorAll(".kv-cell.borrowed text:first-of-type")].map(t => t.textContent).sort()).toEqual([
      "C♯",
      "E♯dim",
    ]);
  });
});
