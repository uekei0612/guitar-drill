import { LEVELS } from "../../drill/topic";
import { mastery } from "../../drill/schedule";
import { contextOf, useData } from "../../state";
import { TOPICS } from "../../topics";
import { itemKey } from "../../drill/topic";
import { href } from "../route";

export function Home({ now = Date.now() }: { now?: number }) {
  const data = useData();
  return (
    <>
      <header class="bar">
        <h1 tabIndex={-1}>guitar-drill</h1>
      </header>
      <a class="chart-entry" href={href({ name: "chart", query: "" })}>
        <span class="topic-title">チャート</span>
        <span class="muted small">
          {/* 句の途中で折り返さないように、句ごとにまとめる */}
          <span class="phrase">スケール・アルペジオを指板で見る、</span>
          <span class="phrase">PDF の資料にする</span>
        </span>
      </a>
      {LEVELS.map(level => {
        const topics = TOPICS.filter(t => t.level === level.id);
        return (
          <section key={level.id} aria-labelledby={`lv-${level.id}`}>
            <h2 id={`lv-${level.id}`}>{level.label}</h2>
            {topics.length ? (
              <ul class="topics">
                {topics.map(t => {
                  const ctx = contextOf(t, data.settings);
                  const m = mastery(t.items(ctx), id => data.items[itemKey(t.id, id)], now);
                  const pct = Math.round(m * 100);
                  return (
                    <li key={t.id} class="topic">
                      <a class="topic-main" href={href({ name: "drill", topicId: t.id })}>
                        <span class="topic-title">{t.title}</span>
                        <span
                          class="meter"
                          role="meter"
                          aria-label="習熟度"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                        >
                          <span class="meter-bar" style={{ width: `${pct}%` }} />
                        </span>
                        <span class="topic-pct">{pct}%</span>
                      </a>
                      {t.reference && (
                        <a
                          class="topic-ref"
                          href={href({ name: "reference", topicId: t.id })}
                          aria-label={`${t.title}の参考`}
                        >
                          参考
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p class="muted">準備中</p>
            )}
          </section>
        );
      })}
    </>
  );
}
