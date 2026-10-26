import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { type Rng, randomRng } from "../../drill/rng";
import { planSession, review } from "../../drill/schedule";
import { type Session, answer, currentItem, isFinished, startSession, summarize } from "../../drill/session";
import { type AnyTopic, type Mark, type Question, type Response, grade, itemKey } from "../../drill/topic";
import { contextOf, store, useData } from "../../state";
import type { Store } from "../../store/store";
import type { Position } from "../../theory";
import { Fretboard, posLabel } from "../Fretboard";
import { ChartLink } from "../ChartLink";
import { playMidi } from "../../chart/audio";
import { href } from "../route";

export interface DrillProps {
  readonly topic: AnyTopic;
  readonly rng?: Rng;
  readonly clock?: () => number;
  readonly store?: Store;
}

const same = (a: Position, b: Position) => a.string === b.string && a.fret === b.fret;

/** タップの答え合わせ：正しく押した点・押し間違えた点・押し忘れた点 */
function tapMarks(correct: readonly Position[], taps: readonly Position[]): Mark[] {
  return [
    ...correct.map(p => ({
      pos: p,
      kind: taps.some(t => same(t, p)) ? ("ok" as const) : ("target" as const),
      label: "",
    })),
    ...taps.filter(t => !correct.some(c => same(c, t))).map(p => ({ pos: p, kind: "wrong" as const })),
  ];
}

export function Drill({ topic, rng = randomRng, clock = Date.now, store: st = store }: DrillProps) {
  const data = useData(st);
  const ctx = contextOf(topic, data.settings);
  const [session, setSession] = useState<Session>(() => newSession());
  const [result, setResult] = useState<{ ok: boolean; response: Response } | null>(null);
  const [taps, setTaps] = useState<Position[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);

  function newSession(): Session {
    const d = st.data;
    return startSession(
      planSession(topic.items(contextOf(topic, d.settings)), id => d.items[itemKey(topic.id, id)], clock(), rng, {
        size: d.settings.sessionSize,
      }),
    );
  }

  const item = currentItem(session);
  // 問題は 1 問ごとに 1 回だけ作る（描き直しで選択肢が入れ替わらないように）。
  // ctx は描くたびに作り直すので依存に入れない（記録が変わっても出題中の問題は変えない）
  const q: Question | undefined = useMemo(
    () => (item === undefined ? undefined : topic.question(item, ctx, rng)),
    [session.index, session.queue],
  );

  // 答えたら「次へ」に、次の問題に進んだら問題文に（キーボードと読み上げで続けて解けるように）
  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);
  useEffect(() => {
    if (session.index > 0) promptRef.current?.focus();
  }, [session.index]);

  function submit(response: Response) {
    if (!q || result) return;
    const ok = grade(q.answer, response);
    const key = itemKey(topic.id, q.item);
    st.update(d => ({ ...d, items: { ...d.items, [key]: review(d.items[key], ok, clock()) } }));
    setResult({ ok, response });
  }

  function next() {
    setSession(s => answer(s, result!.ok));
    setResult(null);
    setTaps([]);
  }

  if (!session.queue.length)
    return (
      <>
        <header class="bar">
          <a class="bar-link" href={href({ name: "home" })}>
            ← ホーム
          </a>
          <h1 tabIndex={-1}>{topic.title}</h1>
        </header>
        <p>
          今のチューニング（{ctx.common.tuning.name}）では出せる問題がありません。設定でチューニングを変えてください。
        </p>
        <div class="actions">
          <a class="btn" href={href({ name: "settings" })}>
            設定へ
          </a>
        </div>
      </>
    );

  if (isFinished(session) || !q) {
    const sum = summarize(session);
    const pct = sum.total ? Math.round((sum.correct / sum.total) * 100) : 0;
    return (
      <>
        <header class="bar">
          <a class="bar-link" href={href({ name: "home" })}>
            ← ホーム
          </a>
          <h1 tabIndex={-1}>{topic.title}</h1>
        </header>
        <section class="result" aria-live="polite">
          <h2>結果</h2>
          <p class="score">
            {sum.correct} / {sum.total}（{pct}%）
          </p>
          {sum.weak.length > 0 && (
            <>
              <h3>間違えたもの</h3>
              <ul class="weak">
                {sum.weak.map(id => (
                  <li key={id}>{topic.itemLabel(id, ctx)}</li>
                ))}
              </ul>
              {topic.reference && (
                <p>
                  <a href={href({ name: "reference", topicId: topic.id })}>参考で見直す →</a>
                </p>
              )}
            </>
          )}
          <div class="actions">
            <button class="btn primary" onClick={() => setSession(newSession())}>
              もう一度
            </button>
            <a class="btn" href={href({ name: "home" })}>
              ホームへ
            </a>
          </div>
        </section>
      </>
    );
  }

  const a = q.answer;
  const board = q.prompt.board;
  const tapping = a.kind === "tap" && !result;
  const shownMarks =
    a.kind === "tap" && result ? [...(board?.marks ?? []), ...tapMarks(a.correct, taps)] : board?.marks;
  const correctText = a.kind === "choice" ? a.correct : a.correct.map(posLabel).join("、");

  return (
    <>
      <header class="bar">
        <a class="bar-link" href={href({ name: "home" })}>
          ← やめる
        </a>
        <h1 tabIndex={-1}>{topic.title}</h1>
        <span class="progress" aria-label={`${session.index + 1} 問目 / ${session.queue.length} 問`}>
          {session.index + 1}/{session.queue.length}
        </span>
      </header>
      <section class="question">
        <p class="prompt" ref={promptRef} tabIndex={-1}>
          {q.prompt.text}
        </p>
        {(board || a.kind === "tap") && (
          <Fretboard
            tuning={ctx.common.tuning}
            lefty={ctx.common.lefty}
            range={a.kind === "tap" ? a.range : board!.range}
            label={q.prompt.text}
            marks={shownMarks}
            selected={tapping ? taps : []}
            tapStrings={a.kind === "tap" ? a.strings : undefined}
            tapFrets={a.kind === "tap" ? a.frets : undefined}
            onTap={
              tapping
                ? p => {
                    if (a.mode === "any") {
                      setTaps([p]);
                      submit({ kind: "tap", positions: [p] });
                    } else setTaps(ts => (ts.some(t => same(t, p)) ? ts.filter(t => !same(t, p)) : [...ts, p]));
                  }
                : undefined
            }
          />
        )}
        {a.kind === "choice" && (
          <div class={`choices${a.options.some(o => o.length > 10) ? " wide" : ""}`} role="group" aria-label="選択肢">
            {a.options.map(o => {
              const picked = result?.response.kind === "choice" && result.response.value === o;
              const cls = result ? (o === a.correct ? "ok" : picked ? "ng" : "") : "";
              return (
                <button
                  key={o}
                  class={`btn choice ${cls}`}
                  disabled={!!result}
                  onClick={() => submit({ kind: "choice", value: o })}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}
        {a.kind === "tap" && a.mode === "all" && !result && (
          <div class="actions">
            <button class="btn primary" onClick={() => submit({ kind: "tap", positions: taps })}>
              答え合わせ（{taps.length}）
            </button>
          </div>
        )}
      </section>
      <div class="feedback" aria-live="assertive">
        {result && <p class={result.ok ? "ok" : "ng"}>{result.ok ? "正解" : `不正解：正解は ${correctText}`}</p>}
      </div>
      {result && (
        <section class="explain">
          {q.explanation && (
            <>
              <p>{q.explanation.text}</p>
              {q.explanation.board && (
                <Fretboard
                  tuning={ctx.common.tuning}
                  lefty={ctx.common.lefty}
                  range={q.explanation.board.range}
                  label={q.explanation.text}
                  marks={q.explanation.board.marks}
                />
              )}
            </>
          )}
          {q.chart && <ChartLink chart={q.chart} />}
          <div class="actions">
            <button ref={nextRef} class="btn primary" onClick={next}>
              次へ
            </button>
            {q.sound && (
              <button class="btn" onClick={() => playMidi(q.sound!.notes, { chord: q.sound!.chord })}>
                ♪ 音を聴く
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
