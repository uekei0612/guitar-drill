import { LEVELS } from "../../drill/topic";
import { useData } from "../../state";
import { TOPICS } from "../../topics";
import { REVIEW_ID, nextTopic, progressOf } from "../../topics/review";
import { href } from "../route";

/** 覚えた割合の輪（行の右端）。数は行の文字で読み上げるので、輪は飾り */
function Ring({ frac }: { frac: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <svg class="ring" viewBox="0 0 28 28" aria-hidden="true">
      <circle class="ring-track" cx="14" cy="14" r={r} />
      {frac > 0 && (
        <circle
          class="ring-bar"
          cx="14"
          cy="14"
          r={r}
          stroke-dasharray={`${c * frac} ${c}`}
          transform="rotate(-90 14 14)"
        />
      )}
    </svg>
  );
}

export function Home({ now = Date.now() }: { now?: number }) {
  const data = useData();
  const rows = TOPICS.map(t => ({ t, p: progressOf(t, data, now) }));
  const due = rows.reduce((n, x) => n + x.p.due, 0);
  const dueTopics = rows.filter(x => x.p.due > 0).length;
  const next = due ? undefined : nextTopic(data, now);
  return (
    <>
      <header class="bar home-head">
        <img class="app-icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={32} height={32} />
        <h1 tabIndex={-1}>guitar-drill</h1>
      </header>

      {/* 次にやること：期限の来た問題があれば全分野まとめて復習、無ければ続きの分野 */}
      <section class="today" aria-labelledby="today-h">
        {due > 0 ? (
          <>
            <h2 id="today-h">今日の復習</h2>
            <p class="today-count">
              <strong>{due}</strong> 問<span class="muted">（{dueTopics} 分野）</span>
            </p>
            <a class="btn primary" href={href({ name: "drill", topicId: REVIEW_ID })}>
              復習を始める
            </a>
          </>
        ) : next ? (
          <>
            <h2 id="today-h">{next.progress.learned > 0 ? "続きから" : "はじめる"}</h2>
            <p class="today-count">
              <strong>{next.topic.title}</strong>
              {next.progress.learned > 0 && (
                <span class="muted">
                  （覚えた {next.progress.learned} / {next.progress.total}）
                </span>
              )}
            </p>
            {/* まだ何も解いていないときは「復習が無い」と言っても意味が無いので出さない */}
            {Object.keys(data.items).length > 0 && <p class="muted small">今日の復習はありません。</p>}
            <a class="btn primary" href={href({ name: "drill", topicId: next.topic.id })}>
              {next.progress.learned > 0 ? "続きをやる" : "始める"}
            </a>
          </>
        ) : (
          <>
            <h2 id="today-h">今日の復習はありません</h2>
            <p class="muted small">全分野を覚えました。期限が来たらここに出ます。</p>
          </>
        )}
      </section>

      {LEVELS.map(level => {
        const list = rows.filter(x => x.t.level === level.id);
        return (
          <section key={level.id} aria-labelledby={`lv-${level.id}`}>
            <h2 id={`lv-${level.id}`}>{level.label}</h2>
            {list.length ? (
              <ul class="topics">
                {list.map(({ t, p }) => (
                  <li key={t.id}>
                    <a class="topic-row" href={href({ name: "drill", topicId: t.id })}>
                      <span class="topic-text">
                        <span class="topic-title">{t.title}</span>
                        <span class="topic-sub">
                          覚えた {p.learned} / {p.total}
                          {p.due > 0 && <span class="due-badge">復習 {p.due}</span>}
                        </span>
                      </span>
                      <Ring frac={p.total ? p.learned / p.total : 0} />
                    </a>
                  </li>
                ))}
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
