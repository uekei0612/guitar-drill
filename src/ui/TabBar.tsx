/* 画面の下のタブ（ドリル／チャート／設定）。ホーム画面版は片手で持つので、行き来の入口を親指の届く下に置く。
   ドリルを解いているあいだは出さない（問題に集中させ、下の「次へ」と重ねない） */
import type { Route } from "./route";
import { href } from "./route";

type Tab = "drill" | "chart" | "settings";

/** 今の画面がどのタブに属するか（参考はドリルの一部） */
export function tabOf(r: Route): Tab | undefined {
  if (r.name === "home" || r.name === "reference") return "drill";
  if (r.name === "chart") return "chart";
  if (r.name === "settings") return "settings";
  return undefined;
}

const ICONS: Record<Tab, preact.JSX.Element> = {
  // 選択肢のカード 4 枚
  drill: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  // 指板（弦とフレット）
  chart: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9.3 3v18M14.7 3v18M4 9h16M4 15h16" />
    </>
  ),
  // 歯車の代わりに、つまみ 3 本（設定）
  settings: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2.2" class="tab-knob" />
      <circle cx="15" cy="12" r="2.2" class="tab-knob" />
      <circle cx="7" cy="18" r="2.2" class="tab-knob" />
    </>
  ),
};

const TABS: readonly { id: Tab; label: string; route: Route }[] = [
  { id: "drill", label: "ドリル", route: { name: "home" } },
  { id: "chart", label: "チャート", route: { name: "chart", query: "" } },
  { id: "settings", label: "設定", route: { name: "settings" } },
];

export function TabBar({ route }: { route: Route }) {
  const current = tabOf(route);
  if (!current) return null;
  return (
    <nav class="tabbar" aria-label="画面の切り替え">
      {TABS.map(t => (
        <a
          key={t.id}
          class={`tab${t.id === current ? " current" : ""}`}
          href={href(t.route)}
          // 開いている画面のタブは、押しても作り直さずに上へ戻すだけ（チャートの設定を捨てない）
          onClick={
            t.route.name === route.name
              ? e => {
                  e.preventDefault();
                  scrollTo({ top: 0, behavior: "smooth" });
                }
              : undefined
          }
          aria-current={t.id === current ? "page" : undefined}
        >
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            {ICONS[t.id]}
          </svg>
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
