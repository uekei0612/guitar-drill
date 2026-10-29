/* 横スクロールの枠（広い指板図用）と、その下に常に出すスクロールバー。
   iPhone の Safari は標準のスクロールバーをスクロール中しか出さず、常に出す方法も無いので、自前で描く。
   バーは今見ている範囲を示し、つまんで動かす・押した所へ飛ぶこともできる。 */
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

/** バーが取る高さ（px。押せる高さを含む）。図の拡大率を決めるときに差し引く */
export const HSCROLL_BAR_HEIGHT = 24;

interface Props {
  /** 変わったら、始めの位置（ナットの側）に戻す */
  readonly resetKey?: unknown;
  /** 始めの位置を右端にする（左利きの横向きは、ナットが右） */
  readonly startAtEnd?: boolean;
  /** 中身の幅に対するこの位置（0〜1）が真ん中に来るまでスクロールする（変わるたびに） */
  readonly focus?: number;
  readonly children: ComponentChildren;
}

export function HScroll({ resetKey, startAtEnd = false, focus, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // はみ出していなければバーは出さない
    if (scrollWidth <= clientWidth + 1) return setBar(null);
    setBar({ left: scrollLeft / scrollWidth, width: clientWidth / scrollWidth });
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = startAtEnd ? el.scrollWidth : 0;
    update();
  }, [resetKey, startAtEnd]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || focus == null) return;
    const left = focus * el.scrollWidth - el.clientWidth / 2;
    if (typeof el.scrollTo === "function") el.scrollTo({ left, behavior: "smooth" });
    else el.scrollLeft = left;
  }, [focus]);

  // 図の大きさ（拡大率）や画面の幅が変わったら、バーの長さを測り直す
  useEffect(() => {
    const el = ref.current;
    const RO = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    if (!el || !RO) return;
    const ro = new RO(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  /** バーの上の位置（0〜1）に、見ている範囲の中央を合わせる */
  const seek = (clientX: number) => {
    const el = ref.current,
      track = trackRef.current;
    if (!el || !track || !bar) return;
    const r = track.getBoundingClientRect();
    const at = (clientX - r.left) / r.width - bar.width / 2;
    el.scrollLeft = at * el.scrollWidth;
  };

  return (
    <div class="hscroll">
      <div class="board-scroll" ref={ref} onScroll={update}>
        {children}
      </div>
      {bar && (
        <div
          class="hscroll-track"
          ref={trackRef}
          aria-hidden="true"
          onPointerDown={e => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            seek(e.clientX);
          }}
          onPointerMove={e => {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) seek(e.clientX);
          }}
        >
          <span class="hscroll-thumb" style={{ left: `${bar.left * 100}%`, width: `${bar.width * 100}%` }} />
        </div>
      )}
    </div>
  );
}
