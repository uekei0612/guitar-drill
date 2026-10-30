/* 画面の切り替えは URL のハッシュで持つ（ホーム画面版にはブラウザの戻るボタンが無いので、
   画面の中に戻る操作を置き、ハッシュは履歴とリロードのために使う）。 */
import { useEffect, useState } from "preact/hooks";

export type Route =
  | { readonly name: "home" }
  /** only は 1 回だけ出題範囲を絞る（分野の設定と同じ形の JSON。設定そのものは変えない） */
  | { readonly name: "drill"; readonly topicId: string; readonly only?: string }
  | { readonly name: "reference"; readonly topicId: string }
  /** open は開いておく分野の出題設定（ドリルの「範囲」から来たとき） */
  | { readonly name: "settings"; readonly open?: string }
  /** チャート。query は guitar_chart と同じ形の URL パラメーター */
  | { readonly name: "chart"; readonly query: string }
  /** キー（五度圏とダイアトニックコード）。query は keyview/state.ts の形 */
  | { readonly name: "key"; readonly query: string };

export function parseRoute(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  if (path === "chart") return { name: "chart", query };
  if (path === "key") return { name: "key", query };
  const [name, id] = path.split("/").map(decodeURIComponent);
  if (name === "drill" && id) {
    const only = new URLSearchParams(query).get("only");
    return only ? { name, topicId: id, only } : { name, topicId: id };
  }
  if (name === "reference" && id) return { name, topicId: id };
  if (name === "settings") {
    const open = new URLSearchParams(query).get("open");
    return open ? { name, open } : { name };
  }
  return { name: "home" };
}

export function href(r: Route): string {
  switch (r.name) {
    case "home":
      return "#/";
    case "settings":
      return r.open ? `#/settings?${new URLSearchParams({ open: r.open })}` : "#/settings";
    case "chart":
      return r.query ? `#/chart?${r.query}` : "#/chart";
    case "key":
      return r.query ? `#/key?${r.query}` : "#/key";
    case "drill":
      return `#/drill/${encodeURIComponent(r.topicId)}${r.only ? `?${new URLSearchParams({ only: r.only })}` : ""}`;
    default:
      return `#/${r.name}/${encodeURIComponent(r.topicId)}`;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

/** ホーム画面アプリとして開いているか（iPhone は navigator.standalone、ほかは display-mode） */
export const isStandalone = (): boolean =>
  (navigator as { standalone?: boolean }).standalone === true ||
  (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);

/** ホーム画面アプリでは、アプリの中のリンク（#/…）での移動を履歴に積まない（location.replace）。
    iPhone の端からの横スワイプは履歴を戻る・進むので、積まなければスワイプで画面が変わらない。
    移動は画面のボタン（← ホーム、下のタブ）でできる。Safari のタブで開いたときは、戻るボタンが使えるように積む */
export function keepHistoryFlat(standalone = isStandalone()): void {
  if (!standalone) return;
  document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target instanceof Element ? e.target.closest("a") : null;
    const to = a?.getAttribute("href");
    if (!a || !to?.startsWith("#") || a.target) return;
    e.preventDefault();
    if (to !== location.hash) location.replace(to);
  });
}
