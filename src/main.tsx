import { render } from "preact";
import { App } from "./app";
import "./style.css";

// iOS Safari は viewport の user-scalable=no を無視するので、ピンチのジェスチャーを止めて画面を固定する
for (const type of ["gesturestart", "gesturechange", "gestureend"])
  document.addEventListener(type, e => e.preventDefault(), { passive: false });

// ページを固定しているあいだ（html.no-scroll）は、指でのスクロールも止める。
// ただし上に重ねて開いたもの（ドリルの参考のシート）の中と、横スクロールの指板図の中はスクロールさせる
document.addEventListener(
  "touchmove",
  e => {
    if (!document.documentElement.classList.contains("no-scroll")) return;
    if (e.target instanceof Element && e.target.closest("dialog[open], .board-scroll")) return;
    e.preventDefault();
  },
  { passive: false },
);

render(<App />, document.getElementById("app")!);
