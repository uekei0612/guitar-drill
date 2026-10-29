// @vitest-environment happy-dom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { contextOf, store } from "../../state";
import { DAY } from "../../drill/schedule";
import { TOPICS } from "../../topics";
import { Home } from "./Home";

afterEach(() => {
  document.body.innerHTML = "";
});

/** 最初の分野の item を n 個、期限切れにする */
function seedDue(n: number, now: number) {
  const t = TOPICS[0]!;
  const ids = t.items(contextOf(t, store.data.settings)).slice(0, n);
  store.update(d => ({
    ...d,
    items: Object.fromEntries(
      ids.map(id => [`${t.id}/${id}`, { ease: 2.5, interval: 1, due: now - DAY, tries: 1, correct: 1 }]),
    ),
  }));
  return ids.length;
}

describe("Home", () => {
  it("分野の行の右端から、その分野の参考へ行ける（参考の無い分野には出さない）", async () => {
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Home />, el));
    const refs = [...el.querySelectorAll<HTMLAnchorElement>("a.topic-ref")];
    expect(refs).toHaveLength(TOPICS.filter(t => t.reference).length);
    const t = TOPICS.find(x => x.reference)!;
    const a = refs.find(r => r.getAttribute("aria-label") === `${t.title}の参考`)!;
    expect(a.getAttribute("href")).toBe(`#/reference/${t.id}`);
  });

  it("今日の復習が 1 回の問題数より多いときは、1 回に解く数を添える", async () => {
    const now = Date.UTC(2026, 9, 28, 3);
    const n = seedDue(30, now);
    store.update(d => ({ ...d, settings: { ...d.settings, sessionSize: 10 } }));
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Home now={now} />, el));
    expect(el.querySelector(".today-count")!.textContent).toContain(`${n} 問`);
    expect(el.querySelector(".today")!.textContent).toContain("1 回 10 問ずつ");

    store.update(d => ({ ...d, settings: { ...d.settings, sessionSize: 30 } }));
    await act(() => render(<Home now={now} />, el));
    expect(el.querySelector(".today")!.textContent).not.toContain("問ずつ");
  });
});
