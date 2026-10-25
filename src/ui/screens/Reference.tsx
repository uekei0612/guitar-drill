import type { AnyTopic } from "../../drill/topic";
import { contextOf, useData } from "../../state";
import { href } from "../route";

export function Reference({ topic }: { topic: AnyTopic }) {
  const data = useData();
  const Ref = topic.reference;
  return (
    <>
      <header class="bar">
        <a class="bar-link" href={href({ name: "home" })}>
          ← ホーム
        </a>
        <h1 tabIndex={-1}>{topic.title}（参考）</h1>
      </header>
      {Ref ? <Ref ctx={contextOf(topic, data.settings)} /> : <p class="muted">参考ページはまだありません。</p>}
      <div class="actions">
        <a class="btn primary" href={href({ name: "drill", topicId: topic.id })}>
          ドリルへ
        </a>
      </div>
    </>
  );
}
