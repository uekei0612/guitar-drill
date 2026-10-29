import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { type Rng, randomRng } from "../../drill/rng";
import { nextDue, planSession, review } from "../../drill/schedule";
import { addDay } from "../../drill/streak";
import { type Session, answer, currentItem, isFinished, startSession, summarize } from "../../drill/session";
import {
  type AnyTopic,
  type Context,
  type Mark,
  type Question,
  type Response,
  grade,
  nearMiss,
  recordKeyOf,
} from "../../drill/topic";
import { contextOf, scoped, store, useData } from "../../state";
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
  /** 1 回だけ出題範囲を絞る（分野の設定と同じ形の JSON） */
  readonly only?: string;
}

/** タップで答える図の最小の拡大率（1 マス 48 を 44px 以上に保つ） */
const MIN_TAP_SCALE = 44 / 48;
/** 図の下のヒントのボタンが取る高さ（style.css の .hint-btn の高さ＋上の余白） */
const HINT_BUTTON_HEIGHT = 56;
const same = (a: Position, b: Position) => a.string === b.string && a.fret === b.fret;

/** タップの答え合わせ（解説の図が無いとき）：正しく押した点と押し忘れた点。押し間違いは別に足す */
function tapMarks(correct: readonly Position[], taps: readonly Position[]): Mark[] {
  return correct.map(p => ({
    pos: p,
    kind: taps.some(t => same(t, p)) ? ("ok" as const) : ("target" as const),
    label: "",
  }));
}

/** on のとき、中身（広い指板図）を横スクロールの枠に入れる。問題が変わったら、ナットの側（左利きは右端）に戻す */
function ScrollX({
  on,
  lefty,
  at,
  children,
}: {
  on: boolean;
  lefty: boolean;
  at: number;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = lefty ? el.scrollWidth : 0;
  }, [on, lefty, at]);
  return on ? (
    <div class="board-scroll" ref={ref}>
      {children}
    </div>
  ) : (
    <>{children}</>
  );
}

/** 参考を、ドリルの上に重ねて開く（ページを移るとセッションが消えるので）。閉じるとドリルの続きに戻る */
function ReferenceSheet({ topic, ctx, onClose }: { topic: AnyTopic; ctx: Context<unknown>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal?.();
    return () => d?.close?.();
  }, []);
  const Ref = topic.reference!;
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
          <h2 id="sheet-h">{topic.title}の参考</h2>
          <button class="btn" onClick={() => ref.current?.close()}>
            閉じる
          </button>
        </div>
        <Ref ctx={ctx} />
      </div>
    </dialog>
  );
}

export function Drill({ topic, rng = randomRng, clock = Date.now, store: st = store, only }: DrillProps) {
  const data = useData(st);
  const ctx = contextOf(topic, scoped(topic, data.settings, only));
  const [session, setSession] = useState<Session>(() => newSession());
  const [result, setResult] = useState<{ ok: boolean; near: boolean; response: Response } | null>(null);
  /** 押したマス（null はまだ触っていない。問題ごとの初期状態を使う） */
  const [touched, setTaps] = useState<Position[] | null>(null);
  /** ヒントを開いた（正解しても覚えていない扱いにし、このセッションの中でもう一度出す） */
  const [hinted, setHinted] = useState(false);
  // 図の下のヒント（ボタン、開いたら文）の高さ。図の大きさはこの分を引いて決める
  const hintRef = useRef<HTMLDivElement>(null);
  const [hintHeight, setHintHeight] = useState(HINT_BUTTON_HEIGHT);
  const nextRef = useRef<HTMLButtonElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  /** 答えたあと：画面の残りの高さと、図に使える枠 */
  const [fillHeight, setFillHeight] = useState<number>();
  const [measured, setBoardBox] = useState<{ width: number; height: number; at: string }>();
  /** 縦長の図でも、画面に縦の余裕があれば解説を横に並べず下に置く（そのほうが図が大きい） */
  const [stack, setStack] = useState(false);
  /** タップで答える図が、画面いっぱいに収めると 1 マス 44px を割るときは広げずに元の大きさで出す */
  const [noFill, setNoFill] = useState(false);
  /** 答える前の拡大率。答えたあとはこれより大きくしない（答えた瞬間に図の大きさが変わらないように） */
  const questionScale = useRef<{ index: number; key: string; k: number } | undefined>(undefined);
  /** 答える前、図が横幅で決まって下に高さが余るとき：図の枠を図の高さに縮め、余りを選択肢のボタンに回す。
      at は問題とヒントの開閉（変わったら縮める前の枠で測り直す）、k はそのとき決めた拡大率 */
  const [snug, setSnug] = useState<{ at: string; k: number }>();
  const promptRef = useRef<HTMLParagraphElement>(null);
  const [refOpen, setRefOpen] = useState(false);
  /** 「やめる」で途中までの結果を出している */
  const [quit, setQuit] = useState(false);
  /** このセッションを始めたときの前回の点数（終えると上書きするので、始めに取っておく） */
  const [prevScore, setPrevScore] = useState(() => st.data.scores[topic.id]);

  function newSession(): Session {
    const d = st.data;
    const items = topic.items(contextOf(topic, scoped(topic, d.settings, only)));
    return startSession(
      planSession(items, id => d.items[recordKeyOf(topic, id)], clock(), rng, {
        size: topic.fitSize ? Math.min(d.settings.sessionSize, items.length) : d.settings.sessionSize,
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
  // 答える前に収まらなかった（スクロールさせた）問題は、答えたあとも同じ大きさのままスクロールで見せる。
  // 答えた瞬間に画面に収めると、解説の分だけ図が縮んで読めなくなる（長い問題文のローコードなど）。
  // 7 フレット以上の縦長の図は、答えたあと解説を横に並べて収めるので除く
  const wideTap =
    q?.answer.kind === "tap" && q.answer.range.maxFret - q.answer.range.minFret + 1 > MAX_HORIZONTAL_FRETS;
  const fill = textOnly || (hasBoard && (!!result ? !(noFill && !wideTap) : !noFill));
  const snugAt = `${session.index}-${hinted}`;
  const isSnug = !result && snug?.at === snugAt;
  const boxAt = `${session.index}-${!!result}-${isSnug}`;
  // 1 画面に収めているあいだは、ページのスクロール（iOS の引っぱり・跳ね返りも）を止める
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("no-scroll", fill);
    return () => document.documentElement.classList.remove("no-scroll");
  }, [fill]);
  useLayoutEffect(() => {
    const h = hintRef.current?.offsetHeight;
    if (h) setHintHeight(h + 8);
  });
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
          if (b) setBoardBox({ width: b.clientWidth, height: b.clientHeight, at: boxAt });
        })
      : undefined;
    if (boardRef.current) ro?.observe(boardRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [fill, !!result, session.index, isSnug]);

  function submit(response: Response) {
    if (!q || result) return;
    const ok = grade(q.answer, response);
    // 惜しい（鳴らさない弦だけ違う）は △ で見せるが、記録は不正解と同じ（× まで含めて覚えるまで出し直す）
    const near = !ok && nearMiss(q.answer, response);
    const key = recordKeyOf(topic, q.item);
    st.update(d => ({
      ...d,
      items: { ...d.items, [key]: review(d.items[key], ok && !hinted, clock()) },
      days: addDay(d.days, clock()),
    }));
    setResult({ ok, near, response });
    // 答えた操作の中で鳴らす（iOS は操作の外では音を出させない）
    if (q.sound && st.data.settings.autoSound) playSound(q.sound);
  }

  function next() {
    setSession(s => answer(s, result!.ok && !hinted));
    setResult(null);
    setTaps(null);
    setHinted(false);
    setHintHeight(HINT_BUTTON_HEIGHT);
    setStack(false);
    setNoFill(false);
  }

  // 選択肢の問題で正解したら、少し待って次へ（不正解は解説を読むので止める）。参考を開いたら待つ
  const autoNext = !!result && result.ok && q?.answer.kind === "choice" && data.settings.autoNext && !refOpen;
  useEffect(() => {
    if (!autoNext) return;
    const id = setTimeout(next, data.settings.autoNextMs);
    return () => clearTimeout(id);
  }, [autoNext, session.index]);

  /** 新しいセッションを始める（queue を渡せばその並びで。間違えたものだけもう一度） */
  function restart(queue?: readonly string[]) {
    setPrevScore(st.data.scores[topic.id]);
    setSession(queue ? startSession(queue) : newSession());
    setQuit(false);
    setRefOpen(false);
  }

  // 終えたら（途中でやめたときも）点数を残す。1 問も答えていなければ残さない
  const finished = isFinished(session) || quit || (!q && session.queue.length > 0);
  useEffect(() => {
    if (!finished) return;
    const sum = summarize(session);
    if (sum.total)
      st.update(d => ({
        ...d,
        scores: { ...d.scores, [topic.id]: { correct: sum.correct, total: sum.total, at: clock() } },
      }));
  }, [finished]);

  // キーボード：1〜9 で選択肢を選び、答えたあとは Enter で次へ（PC 向け）
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!q || refOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      if (!result && q.answer.kind === "choice" && /^[1-9]$/.test(e.key)) {
        const o = q.answer.options[Number(e.key) - 1];
        if (o !== undefined) {
          e.preventDefault();
          submit({ kind: "choice", value: o });
        }
      } else if (result && e.key === "Enter" && !(el && /^(BUTTON|A)$/.test(el.tagName))) {
        // ボタンにフォーカスがあるときは、そのボタンの Enter に任せる
        e.preventDefault();
        next();
      }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  });

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
        {topic.emptyText ? (
          <p>{topic.emptyText}</p>
        ) : (
          <>
            <p>
              今のチューニング（{ctx.common.tuning.name}
              ）では出せる問題がありません。設定でチューニングを変えてください。
            </p>
            <div class="actions">
              <a class="btn" href={href({ name: "settings" })}>
                設定へ
              </a>
            </div>
          </>
        )}
      </>
    );

  if (finished || !q) {
    const sum = summarize(session);
    const pct = sum.total ? Math.round((sum.correct / sum.total) * 100) : 0;
    const now = clock();
    // 次の復習の予告：今日の復習は全分野、ほかはこの分野の item で
    const keys = topic.fitSize ? Object.keys(data.items) : topic.items(ctx).map(id => recordKeyOf(topic, id));
    const upcoming = nextDue(
      keys.map(k => data.items[k]),
      now,
    );
    const when = upcoming && (upcoming.days === 0 ? "今日" : upcoming.days === 1 ? "明日" : `${upcoming.days} 日後`);
    const diff = prevScore && sum.total ? pct - Math.round((prevScore.correct / prevScore.total) * 100) : undefined;
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
          <h2>{quit ? "途中までの結果" : "結果"}</h2>
          {sum.total ? (
            <p class="score">
              <strong>{sum.correct}</strong> / {sum.total}
              <span class="muted">（{pct}%）</span>
            </p>
          ) : (
            <p class="muted">まだ 1 問も答えていません。</p>
          )}
          {prevScore && sum.total > 0 && (
            <p class="muted small">
              前回 {prevScore.correct} / {prevScore.total}
              {diff !== undefined && diff !== 0 && (
                <span class={diff > 0 ? "ok" : "ng"}>
                  （{diff > 0 ? "+" : "−"}
                  {Math.abs(diff)} ポイント）
                </span>
              )}
            </p>
          )}
          {upcoming && (
            <p class="next-review">
              次の復習は<strong>{when}</strong> {upcoming.count} 問
            </p>
          )}
          {sum.weak.length > 0 && (
            <>
              <h3>間違えた・ヒントを見たもの</h3>
              <ul class="weak">
                {sum.weak.map(id => (
                  <li key={id}>{topic.itemLabel(id, ctx)}</li>
                ))}
              </ul>
              {topic.reference && (
                <button class="link-btn" onClick={() => setRefOpen(true)}>
                  参考で見直す
                </button>
              )}
            </>
          )}
          <div class="actions">
            {sum.weak.length > 0 && (
              <button class="btn primary" onClick={() => restart(sum.weak)}>
                間違えたものだけもう一度（{sum.weak.length} 問）
              </button>
            )}
            <button class={`btn${sum.weak.length ? "" : " primary"}`} onClick={() => restart()}>
              もう一度
            </button>
            <a class="btn" href={href({ name: "home" })}>
              ホームへ
            </a>
          </div>
        </section>
        {refOpen && <ReferenceSheet topic={topic} ctx={ctx} onClose={() => setRefOpen(false)} />}
      </>
    );
  }

  const a = q.answer;
  // 参考は、今日の復習なら出題元の分野のものを開く
  const refTopic = topic.sourceOf?.(q.item) ?? topic;
  const refCtx = refTopic === topic ? ctx : contextOf(refTopic, data.settings);
  const scopeText = [
    ctx.common.tuning.id !== "standard" && ctx.common.tuning.name,
    topic.settings?.describe?.(ctx.settings),
  ]
    .filter(Boolean)
    .join("／");
  const board = q.prompt.board;
  const tapping = a.kind === "tap" && !result;
  const tapStrings =
    a.kind === "tap" ? (a.strings ?? Array.from({ length: stringCount(ctx.common.tuning) }, (_, i) => i + 1)) : [];
  const openDefault = a.kind === "tap" && !!a.openDefault;
  const taps = touched ?? (openDefault ? tapStrings.map(s => ({ string: s, fret: 0 })) : []);
  // 開放から始める問題で、何も押していない弦は鳴らさない（×）
  const mutedNow = tapping && openDefault ? tapStrings.filter(s => !taps.some(t => t.string === s)) : undefined;
  function tap(p: Position) {
    if (a.kind !== "tap") return;
    if (a.mode === "any") {
      setTaps([p]);
      submit({ kind: "tap", positions: [p] });
      return;
    }
    const others = a.onePerString ? taps.filter(t => t.string !== p.string) : taps;
    const on = taps.some(t => same(t, p));
    if (openDefault)
      // 開放の欄：開放と × を切り替える。押さえたマスをもう一度押すと開放に戻す
      setTaps(
        p.fret === 0
          ? on
            ? others
            : [...others, p]
          : on
            ? [...others, { string: p.string, fret: 0 }]
            : [...others, p],
      );
    else setTaps(on ? taps.filter(t => !same(t, p)) : [...others, p]);
  }
  const hintMarks = hinted && !result ? (q.hint?.marks ?? []) : [];
  // 答え合わせ：押し間違えた点と、押し忘れた正解（全部押す問題で間違えたときだけ。どれか 1 つの問題は正解の点で足りる）
  const wrongTaps = a.kind === "tap" ? taps.filter(t => !a.correct.some(c => same(c, t))) : [];
  const missed =
    result && !result.ok && a.kind === "tap" && a.mode === "all"
      ? a.correct.filter(c => !taps.some(t => same(t, c)))
      : [];
  // コードの押さえ方で、鳴らさない弦を開放のままにした：その弦の × を赤くする（開放の欄に点を重ねると × が隠れる）
  const answerMuted = q.explanation?.board?.muted ?? board?.muted ?? [];
  const mutedWrong =
    result && openDefault
      ? wrongTaps.filter(t => t.fret === 0 && answerMuted.includes(t.string)).map(t => t.string)
      : [];
  // 押し間違いは灰色にして、正解の点と混ざらないようにする。開放の押し間違い（押さえる弦を開放のままにした）は、
  // 開放の ○ と同じ形の灰色の輪にする
  const wrongMarks: Mark[] = wrongTaps
    .filter(t => !(t.fret === 0 && mutedWrong.includes(t.string)))
    .map(p => ({ pos: p, kind: openDefault && p.fret === 0 ? "wrongOpen" : "wrong" }));
  // 答えたあとは図を 1 枚にする：解説の図があればそれに置き換え、押したところを重ねる
  // （問題の図と解説の図を縦に並べるとスマホで画面に収まらないため）
  const ex = result ? q.explanation?.board : undefined;
  const shown =
    result && ex
      ? {
          range: a.kind === "tap" ? a.range : ex.range,
          orientation: ex.orientation ?? (a.kind === "tap" ? a.orientation : board?.orientation) ?? "horizontal",
          muted: ex.muted,
          barres: ex.barres,
          marks:
            a.kind === "tap"
              ? [
                  // 全部押す問題は、答えでない点（問題で見せた点・音の並び）を薄くして、答えの点を目立たせる
                  ...ex.marks.map(m =>
                    a.mode === "all" && !a.correct.some(c => same(c, m.pos)) ? { ...m, dim: true } : m,
                  ),
                  ...wrongMarks,
                ]
              : ex.marks,
        }
      : board || a.kind === "tap"
        ? {
            range: a.kind === "tap" ? a.range : board!.range,
            // ドリルの図は横向き（6 弦が下）にそろえる。広い範囲は縮めずに横スクロールで見せる（scrollX）
            orientation: (a.kind === "tap" ? a.orientation : undefined) ?? board?.orientation ?? "horizontal",
            muted: mutedNow ?? board?.muted,
            barres: board?.barres,
            marks:
              a.kind === "tap" && result
                ? [...(board?.marks ?? []), ...tapMarks(a.correct, taps), ...wrongMarks]
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
  // 横向きで 7 フレット以上の図（指板の音名の 12 フレットまでなど）は、画面の幅に縮めるとマスが潰れて
  // 押せないので、本来の大きさのまま横スクロールで見せる
  const scrollX =
    !!shown &&
    (shown.orientation ?? chooseOrientation(shown.range)) === "horizontal" &&
    shown.range.maxFret - shown.range.minFret + 1 > MAX_HORIZONTAL_FRETS;
  const tall = tallBoard && !stack;
  // 横に並べたときと下に置いたときで、図が大きくなるほうを選ぶ（横に並べた状態で測ってから一度だけ決める）
  // 測った枠がこの問題（答える前／あと）のものか。「次へ」の直後は前の問題の枠が残っていて、それで決めると誤る
  const boardBox = measured?.at === boxAt ? measured : undefined;
  if (tall && shown && boardBox) {
    const L = layout(stringCount(ctx.common.tuning), shown.range, ctx.common.lefty, "vertical");
    const TEXT = 110;
    const side = Math.min((boardBox.width * 0.6) / L.width, boardBox.height / L.height);
    const below = Math.min(boardBox.width / L.width, (boardBox.height - TEXT) / L.height);
    if (below > side) queueMicrotask(() => setStack(true));
  }
  // 拡大率：図の枠に収まるいちばん大きい値（広げすぎると点と文字だけが大きくなるので 1.6 倍まで）
  const L =
    fill && shown && boardBox
      ? layout(
          stringCount(ctx.common.tuning),
          shown.range,
          ctx.common.lefty,
          shown.orientation ?? chooseOrientation(shown.range),
          {
            headRow: (shown.muted?.length ?? 0) > 0,
          },
        )
      : undefined;
  const fitScale = (reserve: number) =>
    L && boardBox
      ? scrollX
        ? // 横スクロールの図は幅で縮めない。高さに収まる範囲で、本来の大きさ（1 マス 56×48）まで
          Math.min((boardBox.height - reserve) / L.height, 1)
        : Math.min(
            (tall ? boardBox.width * 0.6 : boardBox.width) / L.width,
            (boardBox.height - reserve) / L.height,
            1.6,
          )
      : undefined;
  // ヒントは図のすぐ下に置き、ボタンを押すと同じ場所で文に変わる（答えるまで）。
  // そこに置くとタップのマスが小さくなりすぎるときだけ、ボタンは「答え合わせ」の横、文はその上に置く
  const hintInRow =
    tapping &&
    a.kind === "tap" &&
    a.mode === "all" &&
    (fitScale(HINT_BUTTON_HEIGHT) ?? 1) < MIN_TAP_SCALE &&
    (fitScale(0) ?? 0) >= MIN_TAP_SCALE;
  const hintBelow = !!q.hint && !result && !!shown && !hintInRow;
  const hintButton = (
    <button
      class="btn hint-btn"
      style={hinted ? { visibility: "hidden" } : undefined}
      onClick={() => setHinted(true)}
      aria-label="ヒントを見る（見た問題はあとでもう一度出ます）"
    >
      ヒント
    </button>
  );
  let scale: number | undefined;
  // 答えたあと、図が答える前と同じなら同じ大きさのまま描き、図の枠を図の高さに縮める。
  // 余った高さは画面のいちばん下へ回し、正誤・解説・「次へ」を図のすぐ下に続ける
  const boardKey =
    shown && `${shown.range.minFret}-${shown.range.maxFret}-${shown.orientation ?? chooseOrientation(shown.range)}`;
  const keep =
    fill &&
    !!result &&
    !tallShape &&
    questionScale.current?.index === session.index &&
    questionScale.current.key === boardKey;
  if (keep) scale = questionScale.current!.k;
  else if (isSnug) scale = snug!.k;
  else if (fill && shown && boardBox) {
    const key = boardKey!;
    scale = fitScale(hintBelow ? hintHeight : 0)!;
    if (!result) {
      // ヒントを開いて少し縮んだだけなら広げ直さない（画面からはみ出してスクロールになるより、少し小さいほうがよい）
      if (tapping && scale < MIN_TAP_SCALE && !hinted) queueMicrotask(() => setNoFill(true));
      questionScale.current = { index: session.index, key, k: scale };
      const reserve = hintBelow ? hintHeight : 0;
      const slack = boardBox.height - reserve - L!.height * scale;
      if (!tallShape && !hintInRow && scale >= (tapping ? MIN_TAP_SCALE : 0) && slack > 8) {
        const k = scale;
        queueMicrotask(() => setSnug({ at: snugAt, k }));
      }
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
      : result.near
        ? "惜しい：押さえるマスは合っています。鳴らさない弦（×）だけ違います"
        : a.kind === "choice"
          ? `不正解：あなたの答え ${picked} ／ 正解 ${a.correct}`
          : a.mode === "all"
            ? `不正解：${[
                missed.length && `押し忘れ ${missed.length}`,
                wrongTaps.length && `押し間違い ${wrongTaps.length}`,
              ]
                .filter(Boolean)
                .join("・")}`
            : "不正解：灰色が押したところ";
  // 見た目の行は短く：自分の答えが下の札に出るなら（点線の ✕）書かない。読み上げは feedback のまま全部
  const pickedInStrip = !!q.explanation?.strip?.some(x => x.label === picked);
  const feedbackLine = result?.near
    ? "惜しい：鳴らさない弦（×）だけ違います"
    : result && !result.ok && a.kind === "choice"
      ? pickedInStrip
        ? `不正解 → ${a.correct}`
        : `不正解（${picked}）→ ${a.correct}`
      : feedback;

  return (
    <div
      ref={screenRef}
      class={`drill-screen${fill ? " fill" : ""}${textOnly ? " text-only" : ""}`}
      style={fill && fillHeight ? { height: `${fillHeight}px` } : undefined}
    >
      <header class="bar">
        {/* やめるは補助の操作なので、色を付けない ✕ にする（題名と同じ重さにしない） */}
        {/* 1 問でも答えていたら、ホームへ戻らずに途中までの結果を出す */}
        <a
          class="icon-btn"
          href={href({ name: "home" })}
          aria-label="やめる"
          onClick={e => {
            if (!session.results.length && !result) return;
            e.preventDefault();
            // 答えて「次へ」を押す前なら、その 1 問も結果に入れる（記録は答えたときに残っている）
            if (result) setSession(x => answer(x, result.ok && !hinted));
            setResult(null);
            setQuit(true);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </a>
        <h1 tabIndex={-1} style={{ "--len": topic.title.length }}>
          {topic.title}
        </h1>
        {/* 参考はホームの行から外したので、ここから（解いている途中でも重ねて開ける） */}
        {refTopic.reference && (
          <button
            class="bar-link link-btn"
            onClick={() => setRefOpen(true)}
            aria-label={`${refTopic.title}の参考を見る`}
          >
            参考
          </button>
        )}
        <span class="progress" aria-label={`${session.index + 1} 問目 / ${session.queue.length} 問`}>
          {session.index + 1}/{session.queue.length}
        </span>
      </header>
      {/* 出題範囲（設定の奥にあって気づきにくい）。押すと設定のこの分野の欄へ。
          移るとこのセッションは終わるので、まだ 1 問も答えていないあいだだけ出す */}
      {scopeText && !session.results.length && !result && (
        <a class="scope-chip" href={href({ name: "settings", open: topic.id })}>
          <span class="muted">範囲</span> {scopeText}
          <span aria-hidden="true"> ›</span>
        </a>
      )}
      {/* 進み具合（数は上の「1/20」で読み上げるので、バーは飾り） */}
      <div class="progress-track" aria-hidden="true">
        <span style={{ width: `${(session.index / session.queue.length) * 100}%` }} />
      </div>
      <section
        class={`question${result ? " answered" : ""}${tall ? " tall" : ""}${keep ? " keep" : ""}${isSnug ? " snug" : ""}`}
      >
        {refTopic !== topic && <p class="q-source">{refTopic.title}</p>}
        <p class="prompt" ref={promptRef} tabIndex={-1}>
          {q.prompt.text}
          {/* 答え方は問いと分けて小さく（問いが埋もれないように。読み上げは問いに続けて） */}
          {q.prompt.how && <span class="prompt-how">{q.prompt.how}</span>}
        </p>
        {/* 図の無い問題のヒントは、問題文のすぐ下（開くと同じ場所に文が出る） */}
        {q.hint && !shown && (
          <div class="hint-block">
            {!hinted && !result && hintButton}
            <p class="hint-text" aria-live="polite">
              {hinted && !result ? q.hint.text : ""}
            </p>
          </div>
        )}
        {shown && (
          <div class={`board-wrap${hintBelow ? " with-hint" : ""}`} ref={boardRef}>
            <ScrollX on={scrollX} lefty={ctx.common.lefty} at={session.index}>
              <Fretboard
                tuning={ctx.common.tuning}
                lefty={ctx.common.lefty}
                {...shown}
                scale={scale ?? (scrollX ? 1 : undefined)}
                label={
                  result && q.explanation
                    ? q.explanation.text
                    : [q.prompt.text, q.prompt.how].filter(Boolean).join("。")
                }
                selected={
                  result && ex && a.kind === "choice"
                    ? (board?.marks ?? []).filter(m => m.kind === "target").map(m => m.pos)
                    : result
                      ? // 答えたあとは押したところを輪で出さない（正解の点・押し間違いの灰色・押し忘れの点線で見せる）
                        []
                      : taps
                }
                missed={missed}
                mutedWrong={mutedWrong}
                tapStrings={tapping && a.kind === "tap" ? a.strings : undefined}
                tapFrets={tapping && a.kind === "tap" ? a.frets : undefined}
                onTap={tapping ? tap : undefined}
              />
            </ScrollX>
            {tall && q.explanation && <p class="side-explain">{q.explanation.text}</p>}
            {hintBelow && (
              <div class="hint-block" ref={hintRef}>
                {!hinted && hintButton}
                <p class="hint-text" aria-live="polite">
                  {hinted ? q.hint!.text : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      {/* 選択肢（答える前）と、正誤・解説・「次へ」（答えたあと）は同じ場所に重ねて置き、高いほうの高さを
          最初から取っておく。図の枠が答える前後で同じになり、答えても図が動かない */}
      <div class={`dock${dock ? " stacked" : ""}`}>
        {(!result || dock) && (
          <div class={`dock-q${result ? " off" : ""}`} aria-hidden={result ? true : undefined}>
            {q.hint && hintInRow && (
              <p class="hint-text" aria-live="polite">
                {hinted && !result ? q.hint.text : ""}
              </p>
            )}
            {a.kind === "choice" && (
              <div
                class={`choices${a.options.some(o => o.length > 10) ? " wide" : ""}`}
                style={{
                  "--rows": a.options.some(o => o.length > 10) ? a.options.length : Math.ceil(a.options.length / 2),
                }}
                role="group"
                aria-label="選択肢"
              >
                {a.options.map((o, i) => (
                  <button key={o} class="btn choice" onClick={() => submit({ kind: "choice", value: o })}>
                    {/* PC では 1〜9 キーで選べるので番号を添える（タッチの画面では出さない） */}
                    {i < 9 && (
                      <span class="key-hint" aria-hidden="true">
                        {i + 1}
                      </span>
                    )}
                    {o}
                  </button>
                ))}
              </div>
            )}
            {a.kind === "tap" && a.mode === "all" && (
              <div class="actions">
                {/* 開放から始める問題は、最初から開放を押した状態なので数を出さない（押していないのに 6 と出る） */}
                <button
                  class="btn primary"
                  disabled={taps.length === 0}
                  onClick={() => submit({ kind: "tap", positions: taps })}
                >
                  {openDefault ? "答え合わせ" : `答え合わせ（${taps.length}）`}
                </button>
                {q.hint && hintInRow && hintButton}
              </div>
            )}
          </div>
        )}
        {(result || dock) && (
          <div
            class={`dock-a${result ? (result.ok ? " is-ok" : result.near ? " is-near" : " is-ng") : " off"}`}
            aria-hidden={result ? undefined : true}
          >
            <p
              class={`feedback-line ${result ? (result.ok ? "ok" : result.near ? "near" : "ng") : ""}`}
              aria-hidden="true"
            >
              {feedbackLine ?? "\u3000"}
            </p>
            {/* 全部押す問題で間違えたときの図の見方（行を短く保つため、正誤の行とは分ける） */}
            {result && !result.ok && a.kind === "tap" && a.mode === "all" && (
              <p class="feedback-legend muted small" aria-hidden="true">
                {[
                  missed.length && "点線＝押し忘れ",
                  wrongMarks.length && "灰色＝押し間違い",
                  mutedWrong.length && "赤い ×＝鳴らさない弦",
                ]
                  .filter(Boolean)
                  .join("　")}
              </p>
            )}
            <section class="explain">
              {q.explanation?.strip && (
                <ol class="strip" aria-label={q.explanation.stripLabel}>
                  {q.explanation.strip.map((x, i) => (
                    <li
                      key={i}
                      class={
                        x.current
                          ? "current"
                          : result && !result.ok && picked !== undefined && x.label === picked
                            ? "picked"
                            : undefined
                      }
                    >
                      <span class="strip-label">{x.label}</span>
                      {x.sub && <span class="strip-sub">{x.sub}</span>}
                    </li>
                  ))}
                </ol>
              )}
              {q.explanation?.text && !tall && <p>{q.explanation.text}</p>}
              {(refTopic.reference || q.chart) && (
                <div class="explain-links">
                  {refTopic.reference && (
                    <button class="link-btn" onClick={() => setRefOpen(true)}>
                      参考を見る
                    </button>
                  )}
                  {q.chart && <ChartLink chart={q.chart} />}
                </div>
              )}
            </section>
            <div class="actions next-bar">
              <button
                ref={nextRef}
                class={`btn primary${autoNext ? " auto" : ""}`}
                // 進むまでの帯は、設定の時間で伸ばす
                style={autoNext ? { "--auto-next": `${data.settings.autoNextMs}ms` } : undefined}
                onClick={next}
              >
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
      {refOpen && <ReferenceSheet topic={refTopic} ctx={refCtx} onClose={() => setRefOpen(false)} />}
      {/* 正誤の読み上げ（見た目の行は上の feedback-line） */}
      <div class="feedback sr-only" aria-live="assertive">
        {result && `${feedback}${!result.ok && a.kind === "tap" ? `（${correctText}）` : ""}`}
      </div>
    </div>
  );
}
