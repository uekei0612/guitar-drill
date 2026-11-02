/* 参考を、今の画面の上に重ねて開く（下から出るシート）。ページを移らないので、閉じれば元の画面の続きに戻る
   （ドリルはセッションが、チャートとキーは選んだものとスクロールがそのまま）。
   groups を渡すと、まず関係のある参考の一覧を出し、選んだものを同じシートの中で読む */
import { useEffect, useRef, useState } from "preact/hooks";
import type { AnyTopic, Context } from "../drill/topic";
import { contextOf, useData } from "../state";
import { topicById } from "../topics";
import { LessonBoard } from "./LessonFigures";
import type { RefGroup } from "./refGuide";

export function ReferenceSheet({
  topic,
  ctx,
  groups,
  onClose,
}: {
  /** 最初から開いておく参考 */
  topic?: AnyTopic;
  /** 参考に渡す設定（ドリルは出題範囲を絞ったもの）。無ければ保存してある設定 */
  ctx?: Context<unknown>;
  groups?: readonly RefGroup[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const data = useData();
  const [open, setOpen] = useState(topic);
  useEffect(() => {
    const d = ref.current;
    d?.showModal?.();
    return () => d?.close?.();
  }, []);
  // 一覧と参考を行き来したら、シートの上から読む（見出しへ移って、読み上げもそこから）
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.scrollTo?.(0, 0);
    head.current?.focus();
  }, [open]);
  const Ref = open?.reference;
  const c = ctx ?? (open ? contextOf(open, data.settings) : undefined);
  return (
    <dialog
      ref={ref}
      class="sheet"
      aria-labelledby="sheet-h"
      onClose={onClose}
      // 外側（暗くした背景）を押しても閉じる
      onClick={e => e.target === ref.current && ref.current?.close()}
    >
      <div class="sheet-inner">
        <div class="sheet-head">
          {open && groups && (
            <button class="link-btn sheet-back" onClick={() => setOpen(undefined)} aria-label="参考の一覧に戻る">
              ‹ 一覧
            </button>
          )}
          <h2 id="sheet-h" ref={head} tabIndex={-1}>
            {open ? `${open.title}の参考` : "参考"}
          </h2>
          <button class="btn" onClick={() => ref.current?.close()}>
            閉じる
          </button>
        </div>
        {open && Ref && c ? (
          <LessonBoard.Provider value={{ tuning: c.common.tuning, lefty: c.common.lefty }}>
            <Ref ctx={c} />
          </LessonBoard.Provider>
        ) : (
          groups?.map(g => (
            <section key={g.label} class="ref-index" aria-label={g.label}>
              <h3>{g.label}</h3>
              <ul>
                {g.items.map(it => {
                  const t = topicById(it.id);
                  if (!t?.reference) return null;
                  return (
                    <li key={it.id}>
                      <button class="ref-index-row" onClick={() => setOpen(t)}>
                        <span class="ref-index-text">
                          <span class="ref-index-title">{t.title}</span>
                          <span class="ref-index-note">{it.note}</span>
                        </span>
                        <span class="ref-index-go" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </dialog>
  );
}
