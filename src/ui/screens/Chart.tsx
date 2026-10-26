/* チャート（旧 guitar_chart）。スケール・アルペジオ・カスタムを指板で見て、ボックスを確かめ、PDF にする。
   状態は URL（#/chart?…、guitar_chart と同じパラメーター）に持つので、リロードやリンクで同じ図に戻る。 */
import { useEffect, useState } from "preact/hooks";
import { playAscending } from "../../chart/audio";
import { buildPdfPages, pageCount, pdfFileName, pdfPlan } from "../../chart/pdf/build";
import { boxesForOpen, playableSpan } from "../../chart/boxes";
import { CHART_ARPEGGIOS, CHART_SCALES, CHROMATIC_DEGREES } from "../../chart/registry";
import {
  type ChartState,
  DEFAULT_CHART,
  KEYS_PER_PAGE,
  MAX_CAPO,
  NOTE_NAMES,
  addLowString,
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
import { downloadBlob, exportSvgPng, shareUrl } from "../export-image";
import { PdfPreview } from "../PdfPreview";
import { href } from "../route";
import { TuningOptions } from "./Settings";

/** 指板に出すフレット（guitar_chart と同じ 15 まで） */
export const CHART_FRETS = 15;

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
  const boxes = s.caged && chart.kind === "scale" ? boxesForOpen(chart, s.root, tuningPcs(s)).map(playableSpan) : [];
  const iso = s.box != null ? boxes[s.box - 1] : undefined;
  const marks: Mark[] = [];
  for (let string = 1; string <= stringCount(t); string++)
    for (let fret = 0; fret <= CHART_FRETS; fret++) {
      if (s.capo && fret < s.capo) continue; // カポより手前は弾けない（PDF と同じ）
      if (iso && (fret < iso[0] || fret > iso[1])) continue;
      const p = pcAt(t, { string, fret });
      const semi = mod(p - s.root, 12);
      const i = chart.intervals.indexOf(semi);
      if (i < 0) continue;
      const label = s.label === "note" ? noteName(p, s.flat) : semi === 0 ? "R" : degreeText(chart.degrees[i]!);
      marks.push({ pos: { string, fret }, kind: semi === 0 ? "root" : "tone", label });
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

  // 状態を URL に書く（履歴は増やさない）
  useEffect(() => {
    history.replaceState(null, "", href({ name: "chart", query: toParams(s).toString() }));
  }, [s]);

  const set = (patch: Partial<ChartState>) => setS(x => ({ ...x, ...patch }));
  const chart = chartOf(s);
  const t = tuningOf(s);
  const { marks, boxes } = chartDots(s);
  const hasBoxes = chart.kind === "scale" && chart.boxRanges.length > 0;
  const bands: Band[] = boxes.map(([lo, hi], i) => ({
    lo,
    hi,
    color: i,
    label: String(i + 1),
    selected: s.box === i + 1,
    dimmed: s.box != null && s.box !== i + 1,
  }));
  const inChart = (p: Position) => chart.intervals.includes(mod(pcAt(t, p) - s.root, 12));
  const presetValue = s.chartType === "arpeggio" ? `arp:${s.arpeggio}` : `scale:${s.scale}`;

  return (
    <>
      <header class="bar">
        <a class="bar-link" href={href({ name: "home" })}>
          ← ホーム
        </a>
        <h1 tabIndex={-1}>チャート</h1>
      </header>
      <p class="muted">スケール・アルペジオを指板で確かめ、PDF の資料にする（旧 guitar_chart）。</p>

      <section class="form chart-form" aria-label="何を出すか">
        <div class="seg" role="radiogroup" aria-label="選び方">
          <label class="check">
            <input
              type="radio"
              name="source"
              checked={s.chartType !== "custom"}
              onChange={() => set({ chartType: presetValue.startsWith("arp:") ? "arpeggio" : "scale" })}
            />
            <span>一覧から選ぶ</span>
          </label>
          <label class="check">
            <input
              type="radio"
              name="source"
              checked={s.chartType === "custom"}
              onChange={() => set({ chartType: "custom" })}
            />
            <span>カスタムで作る</span>
          </label>
        </div>
        <label class="field">
          <span>スケール／アルペジオ</span>
          <select
            value={presetValue}
            disabled={s.chartType === "custom"}
            onChange={e => {
              const [kind, id] = e.currentTarget.value.split(":") as [string, string];
              const c = kind === "arp" ? CHART_ARPEGGIOS.find(x => x.id === id)! : CHART_SCALES.find(x => x.id === id)!;
              // 一覧で選んだものをカスタムの出発点にもする（guitar_chart と同じ）
              set(
                kind === "arp"
                  ? { chartType: "arpeggio", arpeggio: id, custom: c.intervals, box: null }
                  : { chartType: "scale", scale: id, custom: c.intervals, box: null },
              );
            }}
          >
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
        <fieldset class="field" disabled={s.chartType !== "custom"}>
          <legend>含める度数（R は固定）</legend>
          <div class="chips">
            {CHROMATIC_DEGREES.map((d, semi) => (
              <label key={d} class="check">
                <input
                  type="checkbox"
                  checked={semi === 0 || s.custom.includes(semi)}
                  disabled={semi === 0}
                  onChange={e => {
                    const on = e.currentTarget.checked;
                    const next = on ? [...s.custom, semi] : s.custom.filter(x => x !== semi);
                    if (next.length >= 2) set({ custom: [...new Set([0, ...next])].sort((a, b) => a - b) });
                  }}
                />
                <span>{degreeText(d)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div class="row3">
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
      </section>

      <section aria-label="指板">
        <p class="chart-meta">
          {chart.name}（{noteName(s.root, s.flat)}）　構成音：{chart.degrees.map(degreeText).join(" - ")}
          {s.capo ? `　カポ ${s.capo}f` : ""}
        </p>
        <div class="chips chart-toggles">
          <label class="check">
            <input type="radio" name="label" checked={s.label === "degree"} onChange={() => set({ label: "degree" })} />
            <span>度数</span>
          </label>
          <label class="check">
            <input type="radio" name="label" checked={s.label === "note"} onChange={() => set({ label: "note" })} />
            <span>音名</span>
          </label>
          <label class="check">
            <input type="checkbox" checked={s.flat} onChange={e => set({ flat: e.currentTarget.checked })} />
            <span>♭表記</span>
          </label>
          <label class="check">
            <input type="checkbox" checked={s.lefty} onChange={e => set({ lefty: e.currentTarget.checked })} />
            <span>左利き</span>
          </label>
          {hasBoxes && (
            <label class="check">
              <input
                type="checkbox"
                checked={s.caged}
                onChange={e => set({ caged: e.currentTarget.checked, box: null })}
              />
              <span>CAGED ボックス</span>
            </label>
          )}
        </div>
        {s.caged && boxes.length > 0 && (
          <div class="chips box-select" role="group" aria-label="ボックスを 1 つだけ出す">
            <button
              class={`btn${s.box == null ? " primary" : ""}`}
              aria-pressed={s.box == null}
              onClick={() => set({ box: null })}
            >
              すべて
            </button>
            {boxes.map((_, i) => (
              <button
                key={i}
                class={`btn box-btn box-btn--${i}${s.box === i + 1 ? " primary" : ""}`}
                aria-pressed={s.box === i + 1}
                onClick={() => set({ box: s.box === i + 1 ? null : i + 1 })}
              >
                Box {i + 1}
              </button>
            ))}
          </div>
        )}
        <div class="actions chart-actions">
          <button class="btn" onClick={() => playAscending(chart.intervals, s.root)}>
            ▶ 試聴
          </button>
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
            画像保存
          </button>
          <button class="btn" onClick={() => void shareUrl(`${chart.name} ${noteName(s.root, s.flat)}`).then(setMsg)}>
            リンクを共有
          </button>
          <span class="muted small" role="status">
            {msg}
          </span>
        </div>
        <div class="chart-board">
          <Fretboard
            tuning={t}
            range={{ minFret: 0, maxFret: CHART_FRETS }}
            orientation={wide ? "horizontal" : "vertical"}
            lefty={s.lefty}
            label={`${chart.name} ${noteName(s.root, s.flat)} の指板`}
            marks={marks}
            bands={bands}
            capo={s.capo}
            stringNames={t.open.map((_, i) => noteName(pcAt(t, { string: i + 1, fret: 0 }), s.flat))}
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
        </div>
        <p class="muted small">
          指板をタップすると構成音を足し引きできます（カスタムになります）。キーは上の「キー」で変えます。
        </p>
      </section>

      <section class="form" aria-labelledby="pdf-h">
        <h2 id="pdf-h">PDF の資料</h2>
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
              value={s.keysPerPage}
              disabled={!s.includeAllKeys}
              onChange={e => set({ keysPerPage: Number(e.currentTarget.value) })}
            >
              {KEYS_PER_PAGE.map(k => (
                <option key={k} value={k}>
                  {k} キー（{Math.ceil(12 / k)} ページ）
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        {(() => {
          const plan = pdfPlan(s);
          const none = !plan.boxes && !plan.degrees && !plan.allKeys;
          const make = async (open: boolean) => {
            setPdfBusy(true);
            try {
              const { renderPdf } = await import("../../chart/pdf/render-pdf");
              const blob = await renderPdf(buildPdfPages(s));
              if (open) {
                const url = URL.createObjectURL(blob);
                if (!window.open(url, "_blank"))
                  setMsg("新しいタブを開けませんでした（ポップアップを許可してください）");
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
              } else downloadBlob(blob, pdfFileName(s));
            } catch (e) {
              setMsg(`PDF を作れませんでした：${(e as Error).message}`);
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
              {preview && !none && <PdfPreview pages={buildPdfPages(s)} />}
            </>
          );
        })()}
      </section>
    </>
  );
}
