/* チャート（旧 guitar_chart）。スケール・アルペジオ・カスタムを指板で見て、ボックスを確かめ、PDF にする。
   状態は URL（#/chart?…、guitar_chart と同じパラメーター）に持つので、リロードやリンクで同じ図に戻る。 */
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { playAscending } from "../../chart/audio";
import { buildPdfPages, keysPerPage, keysPerPageChoices, pageCount, pdfFileName, pdfPlan } from "../../chart/pdf/build";
import { boxesForOpen, playableSpan } from "../../chart/boxes";
import { CHART_ARPEGGIOS, CHART_SCALES, CHROMATIC_DEGREES } from "../../chart/registry";
import {
  type ChartState,
  DEFAULT_CHART,
  KEYS_PER_PAGE,
  MAX_CAPO,
  NOTE_NAMES,
  addLowString,
  boxChartOf,
  chartOf,
  fromParams,
  noteName,
  removeLowString,
  toParams,
  toggleDegree,
  tuningOf,
  tuningPcs,
} from "../../chart/state";
import type { Mark } from "../../drill/topic";
import { useData } from "../../state";
import { type Position, degree, degreeLabel, mod, pcAt, stringCount } from "../../theory";
import { type Band, Fretboard, posLabel } from "../Fretboard";
import { layout } from "../fretboard-layout";
import { HScroll } from "../HScroll";
import { downloadBlob, exportSvgPng, shareUrl } from "../export-image";
import { PdfPreview } from "../PdfPreview";
import { href } from "../route";
import { TuningOptions } from "./Settings";
import { BOX_SCALES } from "../../topics/scale-boxes";

/** 指板に出すフレット（guitar_chart と同じ 15 まで） */
export const CHART_FRETS = 15;
/** 指板の 1 マスのフレット方向の長さ（弦の間隔より長い長方形にして、実物の指板に近づける） */
const CELL_ALONG = 64;

/** on のとき、指板図を横スクロールの枠に入れる（focus の位置までスクロール） */
function ChartScroll({ on, focus, children }: { on: boolean; focus?: number; children: ComponentChildren }) {
  return on ? <HScroll focus={focus}>{children}</HScroll> : <>{children}</>;
}

/** 横幅の広い画面では横向き、スマホでは縦向き */
function useWide(): boolean {
  const q = "(min-width: 720px)";
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

const degreeText = (d: string) => degreeLabel(degree(d));

export interface ChartDots {
  readonly marks: Mark[];
  readonly boxes: readonly (readonly [number, number])[];
}

/** 指板に置く点とボックス（画面と画像保存で同じものを使う） */
export function chartDots(s: ChartState): ChartDots {
  const chart = chartOf(s);
  const t = tuningOf(s);
  // カスタムにしたときは、元のスケールのボックスの位置に今の音を並べる
  const boxChart = boxChartOf(s);
  const boxes = s.caged && boxChart ? boxesForOpen(boxChart, s.root, tuningPcs(s)).map(playableSpan) : [];
  const iso = s.box != null ? boxes[s.box - 1] : undefined;
  const marks: Mark[] = [];
  for (let string = 1; string <= stringCount(t); string++)
    for (let fret = 0; fret <= CHART_FRETS; fret++) {
      if (s.capo && fret < s.capo) continue; // カポより手前は弾けない（PDF と同じ）
      // 1 つだけ出すときは、ほかの点を消す（横スクロールで指板全体を見るときは、薄くして残す）
      const outside = !!iso && (fret < iso[0] || fret > iso[1]);
      if (outside && !s.scroll) continue;
      const p = pcAt(t, { string, fret });
      const semi = mod(p - s.root, 12);
      const i = chart.intervals.indexOf(semi);
      if (i < 0) continue;
      const label = s.label === "note" ? noteName(p, s.flat) : semi === 0 ? "R" : degreeText(chart.degrees[i]!);
      marks.push({ pos: { string, fret }, kind: semi === 0 ? "root" : "tone", label, ...(outside && { dim: true }) });
    }
  return { marks, boxes };
}

export function Chart({ query }: { query: string }) {
  const { settings } = useData();
  const [s, setS] = useState<ChartState>(() =>
    fromParams(new URLSearchParams(query), { ...DEFAULT_CHART, lefty: settings.lefty }),
  );
  const wide = useWide();
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");

  // 状態を URL に書く（履歴は増やさない）
  useEffect(() => {
    history.replaceState(null, "", href({ name: "chart", query: toParams(s).toString() }));
  }, [s]);

  const set = (patch: Partial<ChartState>) => setS(x => ({ ...x, ...patch }));
  const chart = chartOf(s);
  const t = tuningOf(s);
  const { marks, boxes } = chartDots(s);
  const boxChart = boxChartOf(s);
  const hasBoxes = !!boxChart;
  const bands: Band[] = boxes.map(([lo, hi], i) => ({
    lo,
    hi,
    color: i,
    label: String(i + 1),
    selected: s.box === i + 1,
    dimmed: s.box != null && s.box !== i + 1,
  }));
  // ボックスを 1 つだけ出すときは、そのボックスの前後 1 フレットまでに寄せて大きく描く。
  // 横スクロールで見るときは寄せずに指板全体を描き、そのボックスまでスクロールする
  const scrollView = s.caged && s.scroll;
  const iso = s.box != null ? boxes[s.box - 1] : undefined;
  const range =
    iso && !scrollView
      ? { minFret: Math.max(0, iso[0] - 1), maxFret: Math.min(CHART_FRETS, iso[1] + 1) }
      : { minFret: 0, maxFret: CHART_FRETS };
  // 横スクロールで見るとき、選んだボックスが真ん中に来る位置（指板図の幅に対する割合）
  const scrollFocus = (() => {
    if (!scrollView || !iso) return undefined;
    const L = layout(stringCount(t), range, s.lefty, "horizontal", { labelsBothEnds: true, along: CELL_ALONG });
    const r = L.span(iso[0], iso[1]);
    return r ? (r.x + r.w / 2) / L.width : undefined;
  })();
  const inChart = (p: Position) => chart.intervals.includes(mod(pcAt(t, p) - s.root, 12));
  const presetValue = s.chartType === "arpeggio" ? `arp:${s.arpeggio}` : `scale:${s.scale}`;

  return (
    <>
      <header class="bar">
        <h1 tabIndex={-1}>チャート</h1>
        <button
          class="bar-link link-btn"
          onClick={() => playAscending(chart.intervals, s.root)}
          aria-label={`${chart.name} ${noteName(s.root, s.flat)} を試聴`}
        >
          ▶ 試聴
        </button>
      </header>

      {/* 指板の上は、よく変えるもの（スケール・キー・点の文字・ボックス）だけ。ほかは下にたたむ */}
      <section class="chart-view" aria-label="指板">
        <div class="chart-quick">
          <label class="field grow">
            <span>スケール／アルペジオ</span>
            <select
              value={s.chartType === "custom" ? "custom" : presetValue}
              onChange={e => {
                const [kind, id] = e.currentTarget.value.split(":") as [string, string];
                const c =
                  kind === "arp" ? CHART_ARPEGGIOS.find(x => x.id === id)! : CHART_SCALES.find(x => x.id === id)!;
                // 一覧で選んだものをカスタムの出発点にもする（guitar_chart と同じ）
                set(
                  kind === "arp"
                    ? { chartType: "arpeggio", arpeggio: id, custom: c.intervals, box: null }
                    : { chartType: "scale", scale: id, custom: c.intervals, box: null },
                );
              }}
            >
              {/* カスタムのときは「カスタム」と出す（一覧から選び直すと一覧に戻る） */}
              {s.chartType === "custom" && (
                <option value="custom" disabled>
                  カスタム
                </option>
              )}
              <optgroup label="スケール">
                {CHART_SCALES.map(c => (
                  <option key={c.id} value={`scale:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="アルペジオ（コードトーン）">
                {CHART_ARPEGGIOS.map(c => (
                  <option key={c.id} value={`arp:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label class="field">
            <span>キー</span>
            <select value={s.root} onChange={e => set({ root: Number(e.currentTarget.value) })}>
              {NOTE_NAMES.map((_, p) => (
                <option key={p} value={p}>
                  {noteName(p, s.flat)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* 構成音は指板の点と同じ見た目の小さな丸で（名前は上の選択と同じなので繰り返さない） */}
        <p class="chart-tones">
          <span class="sr-only">構成音：</span>
          {chart.degrees.map((d, i) => (
            <span key={d} class={`tone-dot${i === 0 ? " root" : ""}`}>
              {i === 0 ? "R" : degreeText(d)}
            </span>
          ))}
          {s.capo > 0 && <span class="muted small">カポ {s.capo}f</span>}
        </p>
        <div class="chart-bar">
          <div class="toggle-group" role="group" aria-label="点の文字">
            <button aria-pressed={s.label === "degree"} onClick={() => set({ label: "degree" })}>
              度数
            </button>
            <button aria-pressed={s.label === "note"} onClick={() => set({ label: "note" })}>
              音名
            </button>
          </div>
          {hasBoxes && (
            <div class="toggle-group">
              <button aria-pressed={s.caged} onClick={() => set({ caged: !s.caged, box: null })}>
                CAGED ボックス
              </button>
            </div>
          )}
        </div>
        {s.caged && boxes.length > 0 && (
          <label class="check chart-scroll-opt">
            <input type="checkbox" checked={s.scroll} onChange={e => set({ scroll: e.currentTarget.checked })} />
            <span>横向き・横スクロールで見る</span>
          </label>
        )}
        {s.caged && boxes.length > 0 && (
          <div class="toggle-group box-select" role="group" aria-label="ボックスを 1 つだけ出す">
            <button aria-pressed={s.box == null} onClick={() => set({ box: null })}>
              全部
            </button>
            {boxes.map((_, i) => (
              <button
                key={i}
                aria-pressed={s.box === i + 1}
                aria-label={`ボックス ${i + 1}`}
                onClick={() => set({ box: s.box === i + 1 ? null : i + 1 })}
              >
                <span class={`box-dot box-dot--${i}`} aria-hidden="true" />
                {i + 1}
              </button>
            ))}
          </div>
        )}
        {/* 音を足し外ししてカスタムにしたら、どのスケールのボックスかを添える */}
        {s.caged && boxes.length > 0 && s.chartType === "custom" && (
          <p class="muted small">ボックスの位置は、元の{boxChart!.name}のものです。</p>
        )}
        <div class="chart-board">
          <ChartScroll on={scrollView} focus={scrollFocus}>
            <Fretboard
              tuning={t}
              range={range}
              orientation={scrollView || wide ? "horizontal" : "vertical"}
              // 横スクロールで見るときは縮めずに描く
              scale={scrollView ? 1 : undefined}
              // 1 マスを正方形でなく、フレット方向に長い長方形にする（実物の指板に近づける。弦の間隔はそのまま）
              cellAlong={CELL_ALONG}
              lefty={s.lefty}
              label={`${chart.name} ${noteName(s.root, s.flat)} の指板`}
              marks={marks}
              // 1 つに寄せたときは、隣のボックスの帯を重ねない（横スクロールで全体を見るときは薄くして残す）
              bands={iso && !scrollView ? bands.filter(b => b.selected) : bands}
              capo={s.capo}
              stringNames={t.open.map((_, i) => noteName(pcAt(t, { string: i + 1, fret: 0 }), s.flat))}
              labelsBothEnds
              hitLabel={p =>
                `${posLabel(p)} ${noteName(pcAt(t, p), s.flat)}${
                  mod(pcAt(t, p) - s.root, 12) === 0 ? "（R）" : inChart(p) ? "：タップで外す" : "：タップで足す"
                }`
              }
              onTap={p => {
                const next = toggleDegree(s, mod(pcAt(t, p) - s.root, 12));
                if (next) setS(next);
              }}
            />
          </ChartScroll>
        </div>
        <p class="muted small">指板をタップすると、その音を足したり外したりできます（カスタムになります）。</p>
        {/* 見て覚えたら、同じスケール・キーだけでドリルを 1 回（設定の出題範囲は変えない） */}
        {s.chartType === "scale" && BOX_SCALES.includes(s.scale) && (
          <a
            class="chart-drill"
            href={href({
              name: "drill",
              topicId: "scale-boxes",
              only: JSON.stringify({ scales: [s.scale], roots: [s.root] }),
            })}
          >
            {/* ボックスを出していないときは「この」ボックスが無いので、キーで言う */}
            {s.caged ? "このボックスをドリルで確かめる" : "このキーのボックスをドリルで確かめる"}
            <span aria-hidden="true"> ›</span>
          </a>
        )}
      </section>

      {/* たまにしか変えない設定は、たたんでおく */}
      <details class="chart-pdf">
        <summary>
          <h2 id="chart-settings-h">詳しい設定</h2>
        </summary>
        <section class="form" aria-labelledby="chart-settings-h">
          <fieldset class="field">
            <legend>構成音（押して足す・外す。R は固定）</legend>
            <div class="degree-chips">
              {CHROMATIC_DEGREES.map((d, semi) => {
                const on = semi === 0 || chart.intervals.includes(semi);
                return (
                  <button
                    key={d}
                    class={`degree-chip${on ? " on" : ""}${semi === 0 ? " root" : ""}`}
                    aria-pressed={on}
                    disabled={semi === 0}
                    onClick={() => {
                      const next = toggleDegree(s, semi);
                      if (next) setS(next);
                    }}
                  >
                    {semi === 0 ? "R" : degreeText(d)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div class="row3">
            <label class="field">
              <span>チューニング</span>
              <select
                value={s.tuning}
                onChange={e => {
                  const v = e.currentTarget.value;
                  // 自分で決めるときは、今のチューニングから始める
                  set(v === "custom" ? { tuning: "custom", customTuning: tuningPcs(s) } : { tuning: v });
                }}
              >
                <TuningOptions />
                <optgroup label="カスタム">
                  <option value="custom">自分で決める…</option>
                </optgroup>
              </select>
            </label>
            <label class="field">
              <span>カポ</span>
              <select value={s.capo} onChange={e => set({ capo: Number(e.currentTarget.value) })}>
                {Array.from({ length: MAX_CAPO + 1 }, (_, f) => (
                  <option key={f} value={f}>
                    {f === 0 ? "なし" : `${f} フレット`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {s.tuning === "custom" && (
            <fieldset class="field">
              <legend>自分で決めるチューニング（左が低い弦）</legend>
              <div class="chips">
                {s.customTuning.map((p, i) => (
                  <select
                    key={i}
                    aria-label={`低い方から ${i + 1} 本目`}
                    value={p}
                    onChange={e =>
                      set({ customTuning: s.customTuning.map((x, j) => (j === i ? Number(e.currentTarget.value) : x)) })
                    }
                  >
                    {NOTE_NAMES.map((_, q) => (
                      <option key={q} value={q}>
                        {noteName(q, s.flat)}
                      </option>
                    ))}
                  </select>
                ))}
                <button class="btn" disabled={s.customTuning.length <= 4} onClick={() => setS(removeLowString)}>
                  − 弦
                </button>
                <button class="btn" disabled={s.customTuning.length >= 8} onClick={() => setS(addLowString)}>
                  ＋ 弦
                </button>
              </div>
            </fieldset>
          )}
          <div class="seg">
            <label class="check">
              <input type="checkbox" checked={s.flat} onChange={e => set({ flat: e.currentTarget.checked })} />
              <span>♭で書く（A♯ でなく B♭）</span>
            </label>
            <label class="check">
              <input type="checkbox" checked={s.lefty} onChange={e => set({ lefty: e.currentTarget.checked })} />
              <span>左利き</span>
            </label>
          </div>
        </section>
      </details>

      {/* 保存・共有・PDF は使うときだけ開く */}
      <details class="chart-pdf chart-share">
        <summary>
          <h2 id="share-h">保存・共有・PDF</h2>
        </summary>
        <section class="form" aria-labelledby="share-h">
          <div class="actions">
            <button
              class="btn"
              onClick={() => {
                const svg = document.querySelector<SVGSVGElement>(".chart-board svg");
                if (svg)
                  exportSvgPng(svg, `${chart.nameEn} - ${noteName(s.root, s.flat)}.png`).catch((e: Error) =>
                    setMsg(e.message),
                  );
              }}
            >
              指板を画像で保存
            </button>
            <button class="btn" onClick={() => void shareUrl(`${chart.name} ${noteName(s.root, s.flat)}`).then(setMsg)}>
              リンクを共有
            </button>
          </div>
          <p class="muted small" role="status">
            {msg}
          </p>
          <h3 id="pdf-h">PDF の資料</h3>
          <p class="muted small">
            上の設定（スケール・キー・チューニング・カポ）で A4 横の資料を作ります。資料の文字は英語です。
          </p>
          <fieldset class="field">
            <legend>含めるセクション</legend>
            {chart.kind === "scale" && hasBoxes && (
              <label class="check">
                <input
                  type="checkbox"
                  checked={s.includeBoxes}
                  onChange={e => set({ includeBoxes: e.currentTarget.checked })}
                />
                <span>ボックス図（5 パターン）</span>
              </label>
            )}
            <label class="check">
              <input
                type="checkbox"
                checked={s.includeDegrees}
                onChange={e => set({ includeDegrees: e.currentTarget.checked })}
              />
              <span>度数付き全指板（キー {noteName(s.root, s.flat)}）</span>
            </label>
            <label class="check">
              <input
                type="checkbox"
                checked={s.includeAllKeys}
                onChange={e => set({ includeAllKeys: e.currentTarget.checked })}
              />
              <span>全 12 キー</span>
            </label>
            <label class="field">
              <span>1 ページあたりのキー数</span>
              <select
                value={keysPerPage(s)}
                disabled={!s.includeAllKeys}
                onChange={e => set({ keysPerPage: Number(e.currentTarget.value) })}
              >
                {keysPerPageChoices(s).map(k => (
                  <option key={k} value={k}>
                    {k} キー（{Math.ceil(12 / k)} ページ）
                  </option>
                ))}
              </select>
            </label>
            {keysPerPageChoices(s).length < KEYS_PER_PAGE.length && (
              <p class="muted small">
                弦が多いので、点が重ならないよう 1 ページ {keysPerPageChoices(s).length} キーまでにしています。
              </p>
            )}
          </fieldset>
          {(() => {
            const plan = pdfPlan(s);
            const none = !plan.boxes && !plan.degrees && !plan.allKeys;
            const make = async (open: boolean) => {
              // 新しいタブは押したその場で開いておく（PDF を作り終えてから開くと、Safari はポップアップとして止める）
              const tab = open ? window.open("", "_blank") : null;
              if (open && !tab) {
                setPdfMsg("新しいタブを開けませんでした（ポップアップを許可してください）");
                return;
              }
              try {
                if (tab) tab.document.body.textContent = "PDF を作っています…";
              } catch {
                // 中身を書けなくても、あとで PDF に切り替えるので構わない
              }
              setPdfBusy(true);
              setPdfMsg("");
              try {
                const { renderPdf } = await import("../../chart/pdf/render-pdf");
                const blob = await renderPdf(buildPdfPages(s));
                if (tab) {
                  const url = URL.createObjectURL(blob);
                  tab.location.href = url;
                  setTimeout(() => URL.revokeObjectURL(url), 60_000);
                  setPdfMsg("新しいタブに開きました。そこから印刷できます。");
                } else {
                  const name = pdfFileName(s);
                  downloadBlob(blob, name);
                  setPdfMsg(`PDF を作りました（${name}）`);
                }
              } catch (e) {
                tab?.close();
                setPdfMsg(`PDF を作れませんでした：${(e as Error).message}`);
              } finally {
                setPdfBusy(false);
              }
            };
            return (
              <>
                {none && <p class="ng">少なくとも 1 つのセクションを選んでください。</p>}
                <div class="actions">
                  <button class="btn" disabled={none} aria-expanded={preview} onClick={() => setPreview(v => !v)}>
                    {preview ? "プレビューを閉じる" : `プレビュー（${pageCount(s)} ページ）`}
                  </button>
                  <button class="btn primary" disabled={none || pdfBusy} onClick={() => void make(false)}>
                    {pdfBusy ? "作成中…" : "PDF をダウンロード"}
                  </button>
                  <button class="btn" disabled={none || pdfBusy} onClick={() => void make(true)}>
                    開いて印刷
                  </button>
                </div>
                {/* 結果はボタンのすぐ下に出す（画像保存・共有の知らせとは分ける） */}
                <p class="muted small" role="status">
                  {pdfMsg}
                </p>
                {preview && !none && <PdfPreview pages={buildPdfPages(s)} />}
              </>
            );
          })()}
        </section>
      </details>
    </>
  );
}
