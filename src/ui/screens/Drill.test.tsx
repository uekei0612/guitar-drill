// @vitest-environment happy-dom
import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seeded } from "../../drill/rng";
import type { Topic } from "../../drill/topic";
import { Store, memoryStorage } from "../../store/store";
import { playSound } from "../../chart/audio";
import { AUTO_NEXT_MS, Drill } from "./Drill";

vi.mock("../../chart/audio", async orig => ({ ...(await orig<object>()), playSound: vi.fn() }));

/** 「x の答えは x」の 4択と、「1 弦の開放をタップ」 */
const topic: Topic = {
  id: "stub",
  level: "beginner",
  title: "テスト",
  items: () => ["a", "b", "tap"],
  itemLabel: id => `item ${id}`,
  question: id =>
    id === "tap"
      ? {
          item: id,
          prompt: { text: "1弦の開放は？" },
          answer: { kind: "tap", mode: "any", range: { minFret: 0, maxFret: 3 }, correct: [{ string: 1, fret: 0 }] },
        }
      : {
          item: id,
          prompt: { text: `${id} は？` },
          answer: { kind: "choice", options: ["a", "b", "c", "d"], correct: id },
          explanation: { text: `${id} だから` },
        },
};

afterEach(() => {
  document.body.innerHTML = "";
});

const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
/** ボタンの文字（選択肢の番号 .key-hint は除く） */
const label = (b: Element) => b.textContent!.slice(b.querySelector(".key-hint")?.textContent?.length ?? 0);
const button = (el: Element, text: string) => [...el.querySelectorAll("button")].find(b => label(b).startsWith(text))!;

describe("Drill", () => {
  it("出題 → 回答 → 正誤と解説 → 次へ → 結果、記録も残る", async () => {
    const st = new Store(memoryStorage());
    st.update(d => ({ ...d, settings: { ...d.settings, sessionSize: 10 } }));
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={topic} store={st} rng={seeded(1)} clock={() => 0} />, el));

    let missed = false;
    for (let i = 0; i < 20 && el.querySelector(".prompt"); i++) {
      const text = el.querySelector(".prompt")!.textContent!;
      if (text.startsWith("1弦")) {
        const hit = el.querySelector('[aria-label="1弦 開放"]')!;
        await click(hit);
      } else {
        const id = text[0]!;
        // 最初の 1 問だけわざと間違える
        await click(button(el, missed ? id : id === "a" ? "b" : "a"));
        if (!missed) {
          const wrong = id === "a" ? "b" : "a";
          expect(el.querySelector(".feedback")!.textContent).toBe(`不正解：あなたの答え ${wrong} ／ 正解 ${id}`);
          // 答えたあとは選択肢をしまい、「次へ」を出す（スマホで 1 画面に収める）
          // 見た目の行は短く（読み上げは上の .feedback で自分の答えも含めて全部）
          expect(el.querySelector(".feedback-line")!.textContent).toBe(`不正解（${wrong}）→ ${id}`);
          expect(el.querySelector(".next-bar button")!.textContent).toBe("次へ");
          expect(el.querySelector(".explain")!.textContent).toContain(`${id} だから`);
          missed = true;
        }
      }
      expect(el.querySelector(".feedback")!.getAttribute("aria-live")).toBe("assertive");
      await click(button(el, "次へ"));
    }
    expect(el.querySelector(".result h2")!.textContent).toBe("結果");
    // 10 問＋間違えた 1 問の出し直し
    expect(el.querySelector(".score")!.textContent).toMatch(/^10 \/ 11/);
    expect([...el.querySelectorAll(".weak li")].map(li => li.textContent)).toHaveLength(1);
    expect(Object.keys(st.data.items).sort()).toEqual(["stub/a", "stub/b", "stub/tap"]);
  });

  it("fitSize の分野（今日の復習）は item の数で終わり、記録は recordKey に書く", async () => {
    const st = new Store(memoryStorage());
    const fit: Topic = {
      ...topic,
      items: () => ["a", "b"],
      fitSize: true,
      recordKey: id => `orig/${id}`,
      sourceOf: () => ({ ...topic, title: "元の分野", reference: () => <p>元の分野の参考</p> }),
    };
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={fit} store={st} rng={seeded(1)} clock={() => 0} />, el));
    expect(el.querySelector(".q-source")!.textContent).toBe("元の分野");
    // 参考は出題元の分野のものを開く
    expect(el.querySelector('[aria-label="元の分野の参考を見る"]')).not.toBeNull();
    for (let i = 0; i < 2; i++) {
      const id = el.querySelector(".prompt")!.textContent![0]!;
      await click(button(el, id));
      await click(button(el, "次へ"));
    }
    expect(el.querySelector(".score")!.textContent).toMatch(/^2 \/ 2/);
    expect(Object.keys(st.data.items).sort()).toEqual(["orig/a", "orig/b"]);
  });

  it("選択肢の問題で正解したら少し待って次へ。不正解は止まる。1〜4 キーで選べる", async () => {
    vi.useFakeTimers();
    try {
      const st = new Store(memoryStorage());
      const el = document.body.appendChild(document.createElement("div"));
      const choices: Topic = { ...topic, items: () => ["a", "b"] };
      await act(() => render(<Drill topic={choices} store={st} rng={seeded(1)} clock={() => 0} />, el));
      const progress = () => el.querySelector(".progress")!.textContent;
      const id = el.querySelector(".prompt")!.textContent![0]!;
      const n = [...el.querySelectorAll(".choice")].findIndex(b => label(b) === id) + 1;
      await act(() => void dispatchEvent(new KeyboardEvent("keydown", { key: String(n) })));
      expect(el.querySelector(".feedback-line")!.textContent).toMatch(/^正解/);
      await act(() => void vi.advanceTimersByTime(AUTO_NEXT_MS));
      expect(progress()).toMatch(/^2\//);
      // 不正解は自動で進まない
      const id2 = el.querySelector(".prompt")!.textContent![0]!;
      await click(button(el, id2 === "a" ? "b" : "a"));
      await act(() => void vi.advanceTimersByTime(AUTO_NEXT_MS * 3));
      expect(progress()).toMatch(/^2\//);
    } finally {
      vi.useRealTimers();
    }
  });

  it("やめると途中までの結果。間違えたものだけもう一度解け、前回の点数と比べる", async () => {
    const st = new Store(memoryStorage());
    st.update(d => ({ ...d, settings: { ...d.settings, autoNext: false } }));
    const el = document.body.appendChild(document.createElement("div"));
    const choices: Topic = { ...topic, items: () => ["a", "b"] };
    await act(() => render(<Drill topic={choices} store={st} rng={seeded(1)} clock={() => 0} />, el));
    // 1 問目は正解して次へ、2 問目は間違えて「次へ」を押さずにやめる
    const id1 = el.querySelector(".prompt")!.textContent![0]!;
    await click(button(el, id1));
    await click(button(el, "次へ"));
    const id2 = el.querySelector(".prompt")!.textContent![0]!;
    await click(button(el, id2 === "a" ? "b" : "a"));
    await click(el.querySelector('[aria-label="やめる"]')!);
    expect(el.querySelector(".result h2")!.textContent).toBe("途中までの結果");
    expect(el.querySelector(".score")!.textContent).toMatch(/^1 \/ 2/);
    expect(st.data.scores.stub).toEqual({ correct: 1, total: 2, at: 0 });
    // 間違えた 1 問だけで、もう一度
    await click(button(el, "間違えたものだけもう一度"));
    expect(el.querySelector(".progress")!.textContent).toBe("1/1");
    await click(button(el, el.querySelector(".prompt")!.textContent![0]!));
    await click(button(el, "次へ"));
    expect(el.querySelector(".result h2")!.textContent).toBe("結果");
    expect(el.querySelector(".result")!.textContent).toContain("前回 1 / 2");
  });

  it("1 問も答えずにやめるとホームへ（結果は出さない）", async () => {
    const st = new Store(memoryStorage());
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={topic} store={st} rng={seeded(1)} clock={() => 0} />, el));
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(() => void el.querySelector('[aria-label="やめる"]')!.dispatchEvent(ev));
    expect(ev.defaultPrevented).toBe(false);
    expect(el.querySelector(".result")).toBeNull();
    expect(st.data.scores).toEqual({});
  });

  it("設定で、答えたら音を自動で鳴らす（既定は鳴らさない）", async () => {
    const sounding: Topic = {
      ...topic,
      items: () => ["a"],
      question: id => ({ ...topic.question(id, undefined as never, seeded(1)), sound: { notes: [60, 64, 67] } }),
    };
    for (const autoSound of [false, true]) {
      vi.mocked(playSound).mockClear();
      const st = new Store(memoryStorage());
      st.update(d => ({ ...d, settings: { ...d.settings, autoSound } }));
      const el = document.body.appendChild(document.createElement("div"));
      await act(() => render(<Drill topic={sounding} store={st} rng={seeded(1)} clock={() => 0} />, el));
      await click(button(el, "a"));
      expect(vi.mocked(playSound).mock.calls.length).toBe(autoSound ? 1 : 0);
      render(null, el);
    }
  });

  it("出題範囲を出し、設定のその分野の欄へ。答え始めたら出さない", async () => {
    const st = new Store(memoryStorage());
    const scoped: Topic<{ n: number }> = {
      ...(topic as unknown as Topic<{ n: number }>),
      items: () => ["a", "b"],
      settings: { defaults: { n: 3 }, parse: () => ({ n: 3 }), describe: s => `${s.n} 個` },
    };
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={scoped} store={st} rng={seeded(1)} clock={() => 0} />, el));
    const chip = el.querySelector<HTMLAnchorElement>(".scope-chip")!;
    expect(chip.textContent).toContain("3 個");
    expect(chip.getAttribute("href")).toBe("#/settings?open=stub");
    await click(button(el, el.querySelector(".prompt")!.textContent![0]!));
    expect(el.querySelector(".scope-chip")).toBeNull();
  });

  it("ヒント：開くと問題文の下に出て、正解しても覚えていない扱い（あとでもう一度出る）", async () => {
    const hinted: Topic = {
      ...topic,
      items: () => ["a", "b"],
      question: id => ({
        item: id,
        prompt: { text: `${id} は？` },
        answer: { kind: "choice", options: ["a", "b", "c", "d"], correct: id },
        hint: { text: `${id} の手がかり` },
      }),
    };
    const st = new Store(memoryStorage());
    st.update(d => ({ ...d, settings: { ...d.settings, sessionSize: 4 } }));
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={hinted} store={st} rng={seeded(1)} clock={() => 0} />, el));

    const id = el.querySelector(".prompt")!.textContent![0]!;
    expect(el.querySelector(".hint-text")!.textContent).toBe("");
    await click(button(el, "ヒント"));
    expect(el.querySelector(".hint-text")!.textContent).toBe(`${id} の手がかり`);
    expect(button(el, "ヒント")).toBeUndefined();
    await click(button(el, id));
    expect(el.querySelector(".feedback-line")!.textContent).toBe(`正解（ヒントあり）：${id}`);
    // 答えたらヒントはしまう
    expect(el.querySelector(".hint-text")!.textContent).toBe("");
    expect(st.data.items[`stub/${id}`]!.interval).toBe(0);
    await click(button(el, "次へ"));
    // 次の問題ではヒントは閉じている
    expect(button(el, "ヒント")).toBeDefined();
    expect(el.querySelector(".hint-text")!.textContent).toBe("");
  });
  it("コードの押さえ方：最初から開放弦を押した状態。開放の欄で × と切り替え、押さえたマスは弦ごとに 1 つ", async () => {
    // C（x32010）
    const chord: Topic = {
      ...topic,
      items: () => ["C"],
      question: id => ({
        item: id,
        prompt: { text: "C を押さえる" },
        answer: {
          kind: "tap",
          mode: "all",
          range: { minFret: 0, maxFret: 4 },
          correct: [
            { string: 5, fret: 3 },
            { string: 4, fret: 2 },
            { string: 3, fret: 0 },
            { string: 2, fret: 1 },
            { string: 1, fret: 0 },
          ],
          onePerString: true,
          openDefault: true,
        },
      }),
    };
    const st = new Store(memoryStorage());
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={chord} store={st} rng={seeded(1)} clock={() => 0} />, el));
    const cell = (label: string) => el.querySelector(`[aria-label="${label}"]`)!;
    const pressed = () =>
      [...el.querySelectorAll('.fb-hit[aria-pressed="true"]')].map(e => e.getAttribute("aria-label")).sort();

    expect(pressed()).toEqual(["1弦 開放", "2弦 開放", "3弦 開放", "4弦 開放", "5弦 開放", "6弦 開放"]);
    expect(el.querySelectorAll(".fb-muted")).toHaveLength(0);
    // 6 弦を鳴らさない：× が出る。もう一度押すと開放に戻り、また押すと ×
    await click(cell("6弦 開放"));
    expect(el.querySelectorAll(".fb-muted")).toHaveLength(1);
    await click(cell("6弦 開放"));
    expect(el.querySelectorAll(".fb-muted")).toHaveLength(0);
    await click(cell("6弦 開放"));
    // 押さえたマスは開放を置き換え、もう一度押すと開放に戻る
    await click(cell("2弦 2フレット"));
    await click(cell("2弦 2フレット"));
    expect(pressed()).toContain("2弦 開放");
    for (const l of ["5弦 3フレット", "4弦 2フレット", "2弦 1フレット"]) await click(cell(l));
    expect(pressed()).toEqual(["1弦 開放", "2弦 1フレット", "3弦 開放", "4弦 2フレット", "5弦 3フレット"]);
    await click(button(el, "答え合わせ"));
    expect(el.querySelector(".feedback-line")!.textContent).toMatch(/^正解/);
  });

  it("全部押す問題の答え合わせ：押し忘れは点線の輪、答えでない点は薄く、開放のままの弦は赤い ○ と赤い ×", async () => {
    // Am（x02210）。開放のまま答える：6 弦は × のはず、4・3 弦は押さえるはず
    const am = [
      { string: 5, fret: 0 },
      { string: 4, fret: 2 },
      { string: 3, fret: 2 },
      { string: 2, fret: 1 },
      { string: 1, fret: 0 },
    ];
    const chord: Topic = {
      ...topic,
      items: () => ["Am"],
      question: id => ({
        item: id,
        prompt: { text: "Am を押さえる" },
        answer: {
          kind: "tap",
          mode: "all",
          range: { minFret: 0, maxFret: 4 },
          correct: am,
          onePerString: true,
          openDefault: true,
        },
        explanation: {
          text: "Am",
          board: {
            range: { minFret: 0, maxFret: 4 },
            muted: [6],
            marks: [
              ...am.map(pos => ({ pos, kind: "tone" as const })),
              { pos: { string: 6, fret: 3 }, kind: "hint" as const },
            ],
          },
        },
      }),
    };
    const st = new Store(memoryStorage());
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={chord} store={st} rng={seeded(1)} clock={() => 0} />, el));
    // 開放から始めるので、押していない数（6）は出さない
    expect(button(el, "答え合わせ").textContent).toBe("答え合わせ");
    await click(el.querySelector('[aria-label="2弦 1フレット"]')!);
    await click(button(el, "答え合わせ"));
    expect(el.querySelector(".feedback-line")!.textContent).toBe("不正解：押し忘れ 2・押し間違い 3");
    expect(el.querySelector(".feedback-legend")!.textContent).toBe("点線の輪＝押し忘れ　赤＝押し間違い");
    expect(el.querySelectorAll(".fb-missed")).toHaveLength(2);
    // 4・3 弦の開放は赤い ○、6 弦は点を重ねず × を赤く
    expect(el.querySelectorAll(".fb-mark--wrongOpen")).toHaveLength(2);
    expect(el.querySelectorAll(".fb-mark--wrong")).toHaveLength(0);
    expect(el.querySelectorAll(".fb-muted.wrong")).toHaveLength(1);
    // 答えでない点は薄く
    expect(el.querySelectorAll(".fb-mark.dim")).toHaveLength(1);
  });

  it("鳴らさない弦だけ違う：△（惜しい）で見せ、記録は覚えていない扱い", async () => {
    // Am（x02210）。6 弦を × にし忘れた
    const am = [
      { string: 5, fret: 0 },
      { string: 4, fret: 2 },
      { string: 3, fret: 2 },
      { string: 2, fret: 1 },
      { string: 1, fret: 0 },
    ];
    const chord: Topic = {
      ...topic,
      items: () => ["Am"],
      question: id => ({
        item: id,
        prompt: { text: "Am を押さえる" },
        answer: {
          kind: "tap",
          mode: "all",
          range: { minFret: 0, maxFret: 4 },
          correct: am,
          onePerString: true,
          openDefault: true,
        },
        explanation: { text: "Am", board: { range: { minFret: 0, maxFret: 4 }, muted: [6], marks: [] } },
      }),
    };
    const st = new Store(memoryStorage());
    const el = document.body.appendChild(document.createElement("div"));
    await act(() => render(<Drill topic={chord} store={st} rng={seeded(1)} clock={() => 0} />, el));
    for (const l of ["4弦 2フレット", "3弦 2フレット", "2弦 1フレット"])
      await click(el.querySelector(`[aria-label="${l}"]`)!);
    await click(button(el, "答え合わせ"));
    const line = el.querySelector(".feedback-line")!;
    expect(line.classList.contains("near")).toBe(true);
    expect(line.textContent).toBe("惜しい：鳴らさない弦（×）だけ違います");
    expect(el.querySelector(".feedback.sr-only")!.textContent).toMatch(/^惜しい：押さえるマスは合っています/);
    expect(el.querySelector(".feedback-legend")!.textContent).toBe("赤＝鳴らさない弦");
    expect(el.querySelectorAll(".fb-muted.wrong")).toHaveLength(1);
    expect(Object.values(st.data.items)[0]!.interval).toBe(0);
  });
});
