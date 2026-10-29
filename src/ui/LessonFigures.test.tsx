// @vitest-environment happy-dom
import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { contextOf } from "../state";
import { emptyData } from "../store/schema";
import { TUNINGS, type Tuning } from "../theory";
import { TOPICS } from "../topics";
import { LessonBoard } from "./LessonFigures";

/** 参考ページを何枚も描くテストの制限時間（ほかのテストと並んで走ると 5 秒を超える） */
const SLOW = 20_000;

const root = () => document.body.appendChild(document.createElement("div"));
afterEach(() => {
  document.body.innerHTML = "";
});

const BEGINNER = TOPICS.filter(t => t.level === "beginner");
const INTERMEDIATE = TOPICS.filter(t => t.level === "intermediate");

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

  it(
    "ほかのチューニングでも描ける（レギュラーだけの図は出さない）",
    () => {
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
    },
    SLOW,
  );
});

describe("参考の図（中級）", () => {
  it("どの分野にも、仕組み・コツ・間違いの図がある", () => {
    expect(INTERMEDIATE.length).toBe(6);
    for (const t of INTERMEDIATE) expect(renderRef(t.id).querySelectorAll(".lesson-fig").length).toBeGreaterThan(5);
  });

  it(
    "ほかのチューニングでも描ける（レギュラーだけの図は出さない）",
    () => {
      const some = TUNINGS.filter(t => ["7_string", "bass_4", "open_g"].includes(t.id));
      for (const tuning of some)
        for (const t of INTERMEDIATE) {
          const el = renderRef(t.id, tuning);
          expect(el.textContent).not.toBe("");
        }
      // ボックスの図は設定のチューニングで描く（ベースは 4 弦）
      const bass = TUNINGS.find(t => t.id === "bass_4")!;
      const boxes = renderRef("scale-boxes", bass);
      expect(boxes.querySelector(".lesson-fig .fretboard")).not.toBeNull();
    },
    SLOW,
  );

  it("ダイアトニックの積み上げは、C のキーの 7 つのコード", () => {
    const el = renderRef("diatonic");
    const names = [...el.querySelectorAll(".stack-name")].map(e => e.textContent);
    expect(names).toEqual(["Ⅰ", "Ⅱm", "Ⅲm", "Ⅳ", "Ⅴ", "Ⅵm", "Ⅶdim"]);
    expect(el.querySelectorAll(".stack--maj").length).toBe(3);
  });

  it("進行の札は、ルートが 5 度下へ進む所を強調する", () => {
    const el = renderRef("progressions");
    // Ⅱ–Ⅴ–Ⅰ の 2 つ
    const first = el.querySelector(".lesson-sec li .steps")!;
    expect([...first.querySelectorAll(".step-gap.hl")].map(e => e.textContent)).toEqual(["5度下", "5度下"]);
  });
});

describe("参考の図（上級）", () => {
  const ADVANCED = TOPICS.filter(t => t.level === "advanced");

  it("どの分野にも、仕組み・コツ・間違いの図がある", () => {
    expect(ADVANCED.length).toBe(5);
    for (const t of ADVANCED) expect(renderRef(t.id).querySelectorAll(".lesson-fig").length).toBeGreaterThan(5);
  });

  it(
    "ほかのチューニングでも描ける（レギュラーだけの図は出さない）",
    () => {
      const some = TUNINGS.filter(t => ["7_string", "bass_4", "open_g"].includes(t.id));
      for (const tuning of some)
        for (const t of ADVANCED) {
          const el = renderRef(t.id, tuning);
          expect(el.textContent).not.toBe("");
        }
      // ベース 4 弦には 6 弦ルートのシェルが無いので、その図は出さない
      const bass = TUNINGS.find(t => t.id === "bass_4")!;
      expect(renderRef("voicings", bass).querySelectorAll(".lesson-fig .fretboard").length).toBeLessThan(
        renderRef("voicings").querySelectorAll(".lesson-fig .fretboard").length,
      );
    },
    SLOW,
  );

  it("モードの表は、明るい順に 1 行ごとに 1 音ずつ下がる", () => {
    const el = renderRef("modes");
    const grid = el.querySelector(".dgrid")!;
    const rows = [...grid.querySelectorAll(".dgrid-row")];
    expect(rows.map(r => r.querySelector(".dgrid-name")!.textContent)).toEqual([
      "リディアン",
      "アイオニアン",
      "ミクソリディアン",
      "ドリアン",
      "エオリアン",
      "フリジアン",
      "ロクリアン",
    ]);
    expect(rows.map(r => [...r.querySelectorAll(".em")].map(c => c.textContent))).toEqual([
      [],
      ["4"],
      ["♭7"],
      ["♭3"],
      ["♭6"],
      ["♭2"],
      ["♭5"],
    ]);
  });

  it("ドミナントのスケールの表は、ミクソリディアンと違う音を目立たせる", () => {
    const el = renderRef("dominant-scales");
    const rows = [...el.querySelector(".dgrid")!.querySelectorAll(".dgrid-row")];
    const em = rows.map(r => [...r.querySelectorAll(".em")].map(c => c.textContent));
    expect(em).toEqual([[], ["♯11"], ["♭9", "♭13"], ["♭9", "♯9", "♯11"], ["♭9", "♯9", "♯11", "♭13"]]);
  });
});
