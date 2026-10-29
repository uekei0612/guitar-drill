/* 参考ページを簡単な教科書にするための部品。どの分野も同じ順に並べる：
   要点（Points）→ 早見（今までの表・図）→ 仕組み → 覚え方のコツ（Tips）→ よくある間違い（Pitfalls）→ 練習のしかた。
   見出しは h2（参考ページの h1 の下）。 */
import type { ComponentChildren } from "preact";

/** いちばん上の要点。2〜4 行で、このページで覚えることを言い切る */
export function Points({ children }: { children: ComponentChildren }) {
  return (
    <section class="lesson-points" aria-label="要点">
      <p class="lesson-label">要点</p>
      <ul>{children}</ul>
    </section>
  );
}

/** 本文の節（仕組み・練習のしかた など） */
export function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="lesson-sec">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** 覚え方のコツ。1 つずつ短い見出しと説明 */
export function Tips({ children }: { children: ComponentChildren }) {
  return (
    <section class="lesson-sec">
      <h2>覚え方のコツ</h2>
      <dl class="lesson-tips">{children}</dl>
    </section>
  );
}

export function Tip({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <div class="lesson-tip">
      <dt>{title}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** よくある間違い */
export function Pitfalls({ children }: { children: ComponentChildren }) {
  return (
    <section class="lesson-sec lesson-pitfalls">
      <h2>よくある間違い</h2>
      <ul>{children}</ul>
    </section>
  );
}

/** レギュラーチューニングでしか成り立たない話の代わりに出す一言 */
export function StandardOnly() {
  return <p class="muted small">指板の上の位置関係のコツは、レギュラーチューニングで成り立つものです。</p>;
}
