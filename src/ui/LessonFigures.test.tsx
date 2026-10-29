// @vitest-environment happy-dom
import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { contextOf } from "../state";
import { emptyData } from "../store/schema";
import { TUNINGS, type Tuning } from "../theory";
import { TOPICS } from "../topics";
import { LessonBoard } from "./LessonFigures";

const root = () => document.body.appendChild(document.createElement("div"));
afterEach(() => {
  document.body.innerHTML = "";
});

const BEGINNER = TOPICS.filter(t => t.level === "beginner");

/** 参考ページを、参考の画面と同じく LessonBoard を渡して描く */
function renderRef(id: string, tuning?: Tuning) {
  const topic = TOPICS.find(t => t.id === id)!;
  const base = contextOf(topic, emptyData().settings);
  const ctx = tuning ? { ...base, common: { ...base.common, tuning } } : base;
  const Ref = topic.reference!;
  const el = root();
  render(
    <LessonBoard.Provider value={{ tuning: ctx.common.tuning, lefty: ctx.common.lefty }}>
      <Ref ctx={ctx} />
    </LessonBoard.Provider>,
    el,
  );
  return el;
}

describe("参考の図（初心者）", () => {
  it("どの分野にも、仕組み・コツ・間違いの図がある", () => {
    for (const t of BEGINNER) expect(renderRef(t.id).querySelectorAll(".lesson-fig").length).toBeGreaterThan(5);
  });

  it("目立たせた音（輪）と動かさない指（緑）は、押さえ方の中の音を指している", () => {
    // 輪：ローコードはメジャー／マイナー 6・7th 4、ハイコードは m の 4。緑：C ↔ Am の 2 × 2、バレーの 3
    const open = renderRef("open-chords");
    expect(open.querySelectorAll(".lesson-fig .fb-mark--target").length).toBe(10);
    expect(open.querySelectorAll(".lesson-fig .fb-mark--ok").length).toBe(4);
    const barre = renderRef("barre-chords");
    expect(barre.querySelectorAll(".lesson-fig .fb-mark--target").length).toBe(4);
    expect(barre.querySelectorAll(".lesson-fig .fb-mark--ok").length).toBe(3);
  });

  it("ほかのチューニングでも描ける（レギュラーだけの図は出さない）", () => {
    // 弦の数・並びの違う代表（7 弦・ベース 4 弦・オープン G）
    const some = TUNINGS.filter(t => ["7_string", "bass_4", "open_g"].includes(t.id));
    for (const tuning of some)
      for (const t of BEGINNER) {
        const el = renderRef(t.id, tuning);
        expect(el.textContent).not.toBe("");
      }
    // 弦 1 本の図は開放弦の音から数える（ドロップ D の 6 弦は D）
    const dropD = TUNINGS.find(t => t.id === "drop_d")!;
    const fret = renderRef("fret-notes", dropD);
    expect(fret.querySelector(".lesson-fig .fb-mark text")?.textContent).toBe("D");
  });
});
