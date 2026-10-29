import type { AnyTopic } from "../../drill/topic";
import { contextOf, useData } from "../../state";
import { LessonBoard } from "../LessonFigures";
import { href } from "../route";

export function Reference({ topic }: { topic: AnyTopic }) {
  const data = useData();
  const Ref = topic.reference;
  const ctx = contextOf(topic, data.settings);
  return (
    <>
      {/* 戻るは上の行に分け、題名は 1 行に収める（横に並べると題名が 2 行に折れる） */}
      <a class="back-link" href={href({ name: "home" })}>
        ← ホーム
      </a>
      <header class="page-head">
        <span class="tag">参考</span>
        <h1 tabIndex={-1} style={{ "--len": topic.title.length }}>
          {topic.title}
        </h1>
      </header>
      {Ref ? (
        <LessonBoard.Provider value={{ tuning: ctx.common.tuning, lefty: ctx.common.lefty }}>
          <Ref ctx={ctx} />
        </LessonBoard.Provider>
      ) : (
        <p class="muted">参考ページはまだありません。</p>
      )}
      <div class="actions">
        <a class="btn primary" href={href({ name: "drill", topicId: topic.id })}>
          ドリルへ
        </a>
      </div>
    </>
  );
}
