// @vitest-environment happy-dom
import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { TabBar } from "./TabBar";

afterEach(() => render(null, document.body));

describe("TabBar", () => {
  it("参考はドリルのタブにいる扱い", () => {
    render(<TabBar route={{ name: "reference", topicId: "diatonic" }} />, document.body);
    const cur = document.querySelector('[aria-current="page"]');
    expect(cur?.textContent).toBe("ドリル");
    expect(cur?.getAttribute("href")).toBe("#/");
  });

  it("ドリルを解いているあいだは出さない", () => {
    render(<TabBar route={{ name: "drill", topicId: "diatonic" }} />, document.body);
    expect(document.querySelector(".tabbar")).toBeNull();
  });

  it("開いている画面のタブを押しても移らない（チャートの設定を捨てない）", () => {
    render(<TabBar route={{ name: "chart", query: "key=A" }} />, document.body);
    const tab = document.querySelector<HTMLAnchorElement>('[aria-current="page"]')!;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    tab.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
