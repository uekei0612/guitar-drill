import { useState } from "preact/hooks";
import { commonOf, store, useData } from "../../state";
import { TOPICS } from "../../topics";
import { SESSION_SIZES, type Settings as S, type Theme, emptyData } from "../../store/schema";
import { exportJson, importJson } from "../../store/store";
import { TUNINGS, fmt } from "../../theory";

const THEMES: { id: Theme; label: string }[] = [
  { id: "system", label: "端末に合わせる" },
  { id: "light", label: "明るい" },
  { id: "dark", label: "暗い" },
];

const set = (patch: Partial<S>) => store.update(d => ({ ...d, settings: { ...d.settings, ...patch } }));

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** チューニングの選択肢（分類ごと） */
export function TuningOptions() {
  const groups = [...new Set(TUNINGS.map(t => t.group))];
  return (
    <>
      {groups.map(g => (
        <optgroup key={g} label={g}>
          {TUNINGS.filter(t => t.group === g).map(t => (
            <option key={t.id} value={t.id}>
              {t.name}（{t.open.map(fmt).join(" ")}）
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function Settings() {
  const { settings: st, items } = useData();
  const [msg, setMsg] = useState("");
  const count = Object.keys(items).length;

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const r = importJson(await file.text());
    if (!r.ok) return setMsg(r.error);
    const n = Object.keys(r.data.items).length;
    if (!confirm(`今の記録（${count} 件）を、ファイルの記録（${n} 件）で置き換えます。よろしいですか？`)) return;
    store.update(() => r.data);
    setMsg(`読み込みました（${n} 件）`);
  }

  return (
    <>
      <header class="bar">
        <h1 tabIndex={-1}>設定</h1>
      </header>

      <section class="form">
        <label class="field">
          <span>チューニング</span>
          <select value={st.tuning} onChange={e => set({ tuning: e.currentTarget.value })}>
            <TuningOptions />
          </select>
        </label>
        <label class="field check">
          <input type="checkbox" checked={st.lefty} onChange={e => set({ lefty: e.currentTarget.checked })} />
          <span>左利きの表示</span>
        </label>
        <fieldset class="field">
          <legend>画面の色</legend>
          {THEMES.map(t => (
            <label key={t.id} class="check">
              <input type="radio" name="theme" checked={st.theme === t.id} onChange={() => set({ theme: t.id })} />
              <span>{t.label}</span>
            </label>
          ))}
        </fieldset>
        <label class="field">
          <span>1 回の問題数</span>
          <select value={st.sessionSize} onChange={e => set({ sessionSize: Number(e.currentTarget.value) })}>
            {SESSION_SIZES.map(n => (
              <option key={n} value={n}>
                {n} 問
              </option>
            ))}
          </select>
        </label>
        <label class="field check">
          <input type="checkbox" checked={st.autoNext} onChange={e => set({ autoNext: e.currentTarget.checked })} />
          <span>選択肢の問題で正解したら、自動で次へ進む</span>
        </label>
      </section>

      <h2>分野ごとの出題</h2>
      {TOPICS.filter(t => t.settings?.view).map(t => {
        const View = t.settings!.view!;
        return (
          // 分野ごとの出題設定は折りたたむ（全部開くと縦に長く、目的の分野を探すことになる）
          <details key={t.id} class="topic-settings">
            <summary>{t.title}</summary>
            <div class="form">
              <View
                value={t.settings!.parse(st.topics[t.id])}
                common={commonOf(st)}
                onChange={v => set({ topics: { ...st.topics, [t.id]: v } })}
              />
            </div>
          </details>
        );
      })}

      <section class="form">
        <h2>記録（{count} 件）</h2>
        <p class="muted">
          Safari とホーム画面のアプリでは記録が別々です。移すときは、片方で書き出してもう片方で読み込みます。
        </p>
        {!store.persistent && <p class="ng">この端末では記録を保存できません（プライベートモードなど）。</p>}
        <div class="actions">
          <button
            class="btn"
            onClick={() =>
              download(`guitar-drill-${new Date().toISOString().slice(0, 10)}.json`, exportJson(store.data))
            }
          >
            書き出す
          </button>
          <label class="btn">
            読み込む
            <input class="visually-hidden" type="file" accept="application/json,.json" onChange={onImport} />
          </label>
          <button
            class="btn danger"
            onClick={() => {
              if (confirm(`記録（${count} 件）をすべて消します。設定は残ります。よろしいですか？`)) {
                store.update(d => ({ ...emptyData(), settings: d.settings }));
                setMsg("記録を消しました");
              }
            }}
          >
            記録を消す
          </button>
        </div>
        <p class="feedback" role="status">
          {msg}
        </p>
      </section>
    </>
  );
}
