// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { keepHistoryFlat } from "./route";

describe("ホーム画面アプリの履歴", () => {
  it("アプリの中のリンクは、履歴を積まない移動（location.replace）にする（横スワイプで戻る・進むが起きない）", () => {
    keepHistoryFlat(true);
    const replace = vi.spyOn(location, "replace").mockImplementation(() => {});
    const a = document.body.appendChild(document.createElement("a"));
    a.href = "#/settings";
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    a.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(replace).toHaveBeenCalledWith("#/settings");
    // 自分で移動を止めたリンク（ドリルの「やめる」など）と、外へのリンクには触らない
    const b = document.body.appendChild(document.createElement("a"));
    b.href = "#/chart";
    b.addEventListener("click", e => e.preventDefault());
    b.click();
    const c = document.body.appendChild(document.createElement("a"));
    c.href = "https://example.com/";
    c.addEventListener("click", e => e.preventDefault(), { once: true });
    c.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
