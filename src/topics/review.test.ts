import { describe, expect, it } from "vitest";
import { DAY, review } from "../drill/schedule";
import { recordKeyOf } from "../drill/topic";
import { seeded } from "../drill/rng";
import { contextOf } from "../state";
import { emptyData } from "../store/schema";
import { Store, memoryStorage } from "../store/store";
import { TOPICS } from "./index";
import { nextTopic, progressOf, reviewTopic } from "./review";

const open = TOPICS.find(t => t.id === "open-strings")!;

describe("進み具合", () => {
  it("覚えた数は期限が過ぎても減らず、期限が来た分は復習待ちになる", () => {
    const d0 = emptyData();
    const items = open.items(contextOf(open, d0.settings));
    const st = review(undefined, true, 0); // 1 日後に期限
    const d = { ...d0, items: { [`open-strings/${items[0]}`]: st } };
    expect(progressOf(open, d, 0)).toEqual({ total: items.length, learned: 1, due: 0 });
    expect(progressOf(open, d, 2 * DAY)).toEqual({ total: items.length, learned: 1, due: 1 });
  });

  it("すすめる分野は、途中の分野を先に、無ければ最初の分野", () => {
    const d0 = emptyData();
    expect(nextTopic(d0, 0)?.topic.id).toBe(TOPICS[0]!.id);
    const fret = TOPICS.find(t => t.id === "fret-notes")!;
    const id = fret.items(contextOf(fret, d0.settings))[0]!;
    const d = { ...d0, items: { [`fret-notes/${id}`]: review(undefined, true, 0) } };
    expect(nextTopic(d, 0)?.topic.id).toBe("fret-notes");
  });
});

describe("今日の復習", () => {
  it("全分野の期限切れだけを集め、記録は元の分野のキーに書く", () => {
    const st = new Store(memoryStorage());
    const fret = TOPICS.find(t => t.id === "fret-notes")!;
    const a = open.items(contextOf(open, st.data.settings))[0]!;
    const b = fret.items(contextOf(fret, st.data.settings))[0]!;
    st.update(d => ({
      ...d,
      items: {
        [`open-strings/${a}`]: review(undefined, true, 0),
        [`fret-notes/${b}`]: review(undefined, true, 0),
        // 期限前のものは入れない
        [`fret-notes/${fret.items(contextOf(fret, st.data.settings))[1]!}`]: review(undefined, true, 5 * DAY),
      },
    }));
    const r = reviewTopic(st, () => 2 * DAY);
    const items = r.items(contextOf(r, st.data.settings));
    expect(items).toEqual([`open-strings|${a}`, `fret-notes|${b}`]);
    expect(items.map(id => recordKeyOf(r, id))).toEqual([`open-strings/${a}`, `fret-notes/${b}`]);
    const q = r.question(items[1]!, contextOf(r, st.data.settings), seeded(1));
    expect(q.item).toBe(items[1]);
    expect(r.sourceOf?.(items[1]!)).toBe(fret);
  });
});
