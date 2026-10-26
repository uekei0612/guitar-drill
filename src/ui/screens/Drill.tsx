import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { type Rng, randomRng } from "../../drill/rng";
import { planSession, review } from "../../drill/schedule";
import { type Session, answer, currentItem, isFinished, startSession, summarize } from "../../drill/session";
import { type AnyTopic, type Mark, type Question, type Response, grade, itemKey } from "../../drill/topic";
import { contextOf, store, useData } from "../../state";
import type { Store } from "../../store/store";
import type { Position } from "../../theory";
import { Fretboard, posLabel } from "../Fretboard";
import { MAX_HORIZONTAL_FRETS, chooseOrientation, layout } from "../fretboard-layout";
import { stringCount } from "../../theory";
import { ChartLink } from "../ChartLink";
import { playSound } from "../../chart/audio";
import { href } from "../route";

export interface DrillProps {
  readonly topic: AnyTopic;
  readonly rng?: Rng;
  readonly clock?: () => number;
  readonly store?: Store;
}

/** タップで答える図の最小の拡大率（1 マス 48 を 44px 以上に保つ） */
const MIN_TAP_SCALE = 44 / 48;

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
  /** ヒントを開いた（正解しても覚えていない扱いにし、このセッションの中でもう一度出す） */
  const [hinted, setHinted] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  /** 答えたあと：画面の残りの高さと、図に使える枠 */
  const [fillHeight, setFillHeight] = useState<number>();
  const [boardBox, setBoardBox] = useState<{ width: number; height: number }>();
  /** 縦長の図でも、画面に縦の余裕があれば解説を横に並べず下に置く（そのほうが図が大きい） */
  const [stack, setStack] = useState(false);
  /** タップで答える図が、画面いっぱいに収めると 1 マス 44px を割るときは広げずに元の大きさで出す */
  const [noFill, setNoFill] = useState(false);
  /** 答える前の拡大率。答えたあとはこれより大きくしない（答えた瞬間に図の大きさが変わらないように） */
  const questionScale = useRef<{ index: number; key: string; k: number } | undefined>(undefined);
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
    if (session.index > 0) {
      window.scrollTo(0, 0);
      promptRef.current?.focus({ preventScroll: true });
    }
  }, [session.index]);

  // 画面いっぱいに使う：画面の高さから上の位置を引いた分を、この画面の高さにし、
  // 図のある問題は図の枠の大きさを測って拡大率を決める。図の無い問題は選択肢を画面の下（親指の届く所）に置く
  const hasBoard = !!q && (!!q.prompt.board || q.answer.kind === "tap" || (!!result && !!q.explanation?.board));
  const textOnly = !!q && !hasBoard;
  const fill = textOnly || (hasBoard && (!!result || !noFill));
  useLayoutEffect(() => {
    setBoardBox(undefined);
    if (!fill) {
      setFillHeight(undefined);
      return;
    }
    const measure = () => {
      const el = screenRef.current;
      if (!el) return;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setFillHeight(Math.floor(vh - el.getBoundingClientRect().top));
    };
    window.scrollTo(0, 0);
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const RO = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    const ro = RO
      ? new RO(() => {
          const b = boardRef.current;
          if (b) setBoardBox({ width: b.clientWidth, height: b.clientHeight });
        })
      : undefined;
    if (boardRef.current) ro?.observe(boardRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [fill, !!result, session.index]);

  function submit(response: Response) {
    if (!q || result) return;
    const ok = grade(q.answer, response);
    const key = itemKey(topic.id, q.item);
    st.update(d => ({ ...d, items: { ...d.items, [key]: review(d.items[key], ok && !hinted, clock()) } }));
    setResult({ ok, response });
  }

  function next() {
    setSession(s => answer(s, result!.ok && !hinted));
    setResult(null);
    setTaps([]);
    setHinted(false);
    setStack(false);
    setNoFill(false);
  }

  if (!session.queue.length)
    return (
      <>
        <header class="bar">
          <a class="bar-link" href={href({ name: "home" })}>
            ← ホーム
          </a>
          <h1 tabIndex={-1} style={{ "--len": topic.title.length }}>
            {topic.title}
          </h1>
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
          <h1 tabIndex={-1} style={{ "--len": topic.title.length }}>
            {topic.title}
          </h1>
        </header>
        <section class="result" aria-live="polite">
          <h2>結果</h2>
          <p class="score">
            {sum.correct} / {sum.total}（{pct}%）
          </p>
          {sum.weak.length > 0 && (
            <>
              <h3>間違えた・ヒントを見たもの</h3>
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
  const hintMarks = hinted && !result ? (q.hint?.marks ?? []) : [];
  // 答えたあとは図を 1 枚にする：解説の図があればそれに置き換え、押したところを重ねる
  // （問題の図と解説の図を縦に並べるとスマホで画面に収まらないため）
  const ex = result ? q.explanation?.board : undefined;
  const shown =
    result && ex
      ? {
          range: a.kind === "tap" ? a.range : ex.range,
          orientation: ex.orientation ?? (a.kind === "tap" ? a.orientation : board?.orientation),
          muted: ex.muted,
          barres: ex.barres,
          marks:
            a.kind === "tap"
              ? [
                  ...ex.marks,
                  ...taps.filter(t => !a.correct.some(c => same(c, t))).map(p => ({ pos: p, kind: "wrong" as const })),
                ]
              : ex.marks,
        }
      : board || a.kind === "tap"
        ? {
            range: a.kind === "tap" ? a.range : board!.range,
            orientation: (a.kind === "tap" ? a.orientation : undefined) ?? board?.orientation,
            muted: board?.muted,
            barres: board?.barres,
            marks:
              a.kind === "tap" && result
                ? [...(board?.marks ?? []), ...tapMarks(a.correct, taps)]
                : hintMarks.length
                  ? [...hintMarks, ...(board?.marks ?? [])]
                  : board?.marks,
          }
        : undefined;
  // 答えたあとの縦長の図（12 フレットまでなど）は、縮めると読めなくなるので解説を横に並べる
  const tallShape =
    !!shown &&
    (shown.orientation ?? chooseOrientation(shown.range)) === "vertical" &&
    shown.range.maxFret - shown.range.minFret + 1 > MAX_HORIZONTAL_FRETS;
  const tallBoard = !!result && tallShape;
  const tall = tallBoard && !stack;
  // 横に並べたときと下に置いたときで、図が大きくなるほうを選ぶ（横に並べた状態で測ってから一度だけ決める）
  if (tall && shown && boardBox) {
    const L = layout(stringCount(ctx.common.tuning), shown.range, ctx.common.lefty, "vertical");
    const TEXT = 110;
    const side = Math.min((boardBox.width * 0.6) / L.width, boardBox.height / L.height);
    const below = Math.min(boardBox.width / L.width, (boardBox.height - TEXT) / L.height);
    if (below > side) queueMicrotask(() => setStack(true));
  }
  // 拡大率：図の枠に収まるいちばん大きい値（広げすぎると点と文字だけが大きくなるので 1.6 倍まで）
  let scale: number | undefined;
  if (fill && shown && boardBox) {
    const orient = shown.orientation ?? chooseOrientation(shown.range);
    const L = layout(stringCount(ctx.common.tuning), shown.range, ctx.common.lefty, orient, {
      headRow: (shown.muted?.length ?? 0) > 0,
    });
    const key = `${shown.range.minFret}-${shown.range.maxFret}-${orient}`;
    scale = Math.min((tall ? boardBox.width * 0.6 : boardBox.width) / L.width, boardBox.height / L.height, 1.6);
    if (!result) {
      // ヒントを開いて少し縮んだだけなら広げ直さない（画面からはみ出してスクロールになるより、少し小さいほうがよい）
      if (tapping && scale < MIN_TAP_SCALE && !hinted) queueMicrotask(() => setNoFill(true));
      questionScale.current = { index: session.index, key, k: scale };
    } else if (questionScale.current?.index === session.index && questionScale.current.key === key)
      scale = Math.min(scale, questionScale.current.k);
  }
  // 選択肢と答えの欄を重ねて高さを取るのは、画面いっぱいに描くとき（縦長の図は答えたあと並びが変わるので除く）
  const dock = fill && !tallShape;
  const correctText = a.kind === "choice" ? a.correct : a.correct.map(posLabel).join("、");
  const picked = result?.response.kind === "choice" ? result.response.value : undefined;
  const feedback = !result
    ? undefined
    : result.ok
      ? `正解${hinted ? "（ヒントあり）" : ""}：${a.kind === "choice" ? a.correct : "全部合っています"}`
      : a.kind === "choice"
        ? `不正解：あなたの答え ${picked} ／ 正解 ${a.correct}`
        : `不正解：正解は図の点${taps.some(t => !a.correct.some(c => same(c, t))) ? "（赤は押し間違い）" : ""}`;

  return (
    <div
      ref={screenRef}
      class={`drill-screen${fill ? " fill" : ""}${textOnly ? " text-only" : ""}`}
      style={fill && fillHeight ? { height: `${fillHeight}px` } : undefined}
    >
      <header class="bar">
        <a class="bar-link" href={href({ name: "home" })}>
          ← やめる
        </a>
        <h1 tabIndex={-1} style={{ "--len": topic.title.length }}>
          {topic.title}
        </h1>
        <span class="progress" aria-label={`${session.index + 1} 問目 / ${session.queue.length} 問`}>
          {session.index + 1}/{session.queue.length}
        </span>
      </header>
      <section class={`question${result ? " answered" : ""}${tall ? " tall" : ""}`}>
        <div class="prompt-row">
          <p class="prompt" ref={promptRef} tabIndex={-1}>
            {q.prompt.text}
          </p>
          {q.hint && !result && !hinted && (
            <button
              class="btn hint-btn"
              onClick={() => setHinted(true)}
              aria-label="ヒントを見る（見た問題はあとでもう一度出ます）"
            >
              ヒント
            </button>
          )}
        </div>
        {shown && (
          <div class="board-wrap" ref={boardRef}>
            <Fretboard
              tuning={ctx.common.tuning}
              lefty={ctx.common.lefty}
              {...shown}
              scale={scale}
              label={result && q.explanation ? q.explanation.text : q.prompt.text}
              selected={
                result && ex && a.kind === "choice"
                  ? (board?.marks ?? []).filter(m => m.kind === "target").map(m => m.pos)
                  : taps
              }
              tapStrings={tapping && a.kind === "tap" ? a.strings : undefined}
              tapFrets={tapping && a.kind === "tap" ? a.frets : undefined}
              onTap={
                tapping
                  ? p => {
                      if (a.mode === "any") {
                        setTaps([p]);
                        submit({ kind: "tap", positions: [p] });
                      } else
                        setTaps(ts =>
                          ts.some(t => same(t, p))
                            ? ts.filter(t => !same(t, p))
                            : [...(a.onePerString ? ts.filter(t => t.string !== p.string) : ts), p],
                        );
                    }
                  : undefined
              }
            />
            {tall && q.explanation && <p class="side-explain">{q.explanation.text}</p>}
          </div>
        )}
      </section>
      {/* 選択肢（答える前）と、正誤・解説・「次へ」（答えたあと）は同じ場所に重ねて置き、高いほうの高さを
          最初から取っておく。図の枠が答える前後で同じになり、答えても図が動かない */}
      <div class={`dock${dock ? " stacked" : ""}`}>
        {(!result || dock) && (
          <div class={`dock-q${result ? " off" : ""}`} aria-hidden={result ? true : undefined}>
            {/* ヒントは答えたあとの解説の場所（最初から高さを取ってある）に出す。図の大きさを変えない */}
            {q.hint && (
              <p class="hint-text" aria-live="polite">
                {hinted && !result ? q.hint.text : ""}
              </p>
            )}
            {a.kind === "choice" && (
              <div
                class={`choices${a.options.some(o => o.length > 10) ? " wide" : ""}`}
                role="group"
                aria-label="選択肢"
              >
                {a.options.map(o => (
                  <button key={o} class="btn choice" onClick={() => submit({ kind: "choice", value: o })}>
                    {o}
                  </button>
                ))}
              </div>
            )}
            {a.kind === "tap" && a.mode === "all" && (
              <div class="actions">
                <button class="btn primary" onClick={() => submit({ kind: "tap", positions: taps })}>
                  答え合わせ（{taps.length}）
                </button>
              </div>
            )}
          </div>
        )}
        {(result || dock) && (
          <div class={`dock-a${result ? "" : " off"}`} aria-hidden={result ? undefined : true}>
            <p class={`feedback-line ${result ? (result.ok ? "ok" : "ng") : ""}`} aria-hidden="true">
              {feedback ?? "\u3000"}
            </p>
            <section class="explain">
              {q.explanation?.strip && (
                <ol class="strip" aria-label={q.explanation.stripLabel}>
                  {q.explanation.strip.map((x, i) => (
                    <li key={i} class={x.current ? "current" : undefined}>
                      <span class="strip-label">{x.label}</span>
                      {x.sub && <span class="strip-sub">{x.sub}</span>}
                    </li>
                  ))}
                </ol>
              )}
              {q.explanation?.text && !tall && <p>{q.explanation.text}</p>}
              {q.chart && <ChartLink chart={q.chart} />}
            </section>
            <div class="actions next-bar">
              <button ref={nextRef} class="btn primary" onClick={next}>
                次へ
              </button>
              {q.sound && (
                <button class="btn" onClick={() => playSound(q.sound!)}>
                  ♪ 音を聴く
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* 正誤の読み上げ（見た目の行は上の feedback-line） */}
      <div class="feedback sr-only" aria-live="assertive">
        {result && `${feedback}${!result.ok && a.kind === "tap" ? `（${correctText}）` : ""}`}
      </div>
    </div>
  );
}
