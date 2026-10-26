// @vitest-environment happy-dom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { seeded } from "../../drill/rng";
import type { Topic } from "../../drill/topic";
import { Store, memoryStorage } from "../../store/store";
import { Drill } from "./Drill";

/** 「x の答えは x」の 4択と、「1 弦の開放をタップ」 */
const topic: Topic = {
  id: "stub",
  level: "beginner",
  title: "テスト",
  items: () => ["a", "b", "tap"],
  itemLabel: id => `item ${id}`,
  question: id =>
    id === "tap"
      ? {
          item: id,
          prompt: { text: "1弦の開放は？" },
          answer: { kind: "tap", mode: "any", range: { minFret: 0, maxFret: 3 }, correct: [{ string: 1, fret: 0 }] },
        }
      : {
          item: id,
          prompt: { text: `${id} は？` },
          answer: { kind: "choice", options: ["a", "b", "c", "d"], correct: id },
          explanation: { text: `${id} だから` },
        },
};

afterEach(() => {
  document.body.innerHTML = "";
});

const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const button = (el: Element, text: string) =>
  [...el.querySelectorAll("button")].find(b => b.textContent?.startsWith(text))!;

describe("Drill", () => {
  it("出題 → 回答 → 正誤と解説 → 次へ → 結果、記録も残る", async () => {
    const st = new Store(memoryStorage());
    st.update(d => ({ ...d, settings: { ...d.settings, sessionSize: 10 } }));
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={topic} store={st} rng={seeded(1)} clock={() => 0} />, el));

    let missed = false;
    for (let i = 0; i < 20 && el.querySelector(".prompt"); i++) {
      const text = el.querySelector(".prompt")!.textContent!;
      if (text.startsWith("1弦")) {
        const hit = el.querySelector('[aria-label="1弦 開放"]')!;
        await click(hit);
      } else {
        const id = text[0]!;
        // 最初の 1 問だけわざと間違える
        await click(button(el, missed ? id : id === "a" ? "b" : "a"));
        if (!missed) {
          const wrong = id === "a" ? "b" : "a";
          expect(el.querySelector(".feedback")!.textContent).toBe(`不正解：あなたの答え ${wrong} ／ 正解 ${id}`);
          // 答えたあとは選択肢をしまい、「次へ」を出す（スマホで 1 画面に収める）
          expect(el.querySelector(".feedback-line")!.textContent).toBe(`不正解：あなたの答え ${wrong} ／ 正解 ${id}`);
          expect(el.querySelector(".next-bar button")!.textContent).toBe("次へ");
          expect(el.querySelector(".explain")!.textContent).toContain(`${id} だから`);
          missed = true;
        }
      }
      expect(el.querySelector(".feedback")!.getAttribute("aria-live")).toBe("assertive");
      await click(button(el, "次へ"));
    }
    expect(el.querySelector(".result h2")!.textContent).toBe("結果");
    // 10 問＋間違えた 1 問の出し直し
    expect(el.querySelector(".score")!.textContent).toMatch(/^10 \/ 11/);
    expect([...el.querySelectorAll(".weak li")].map(li => li.textContent)).toHaveLength(1);
    expect(Object.keys(st.data.items).sort()).toEqual(["stub/a", "stub/b", "stub/tap"]);
  });
});
