/* 画面の切り替えは URL のハッシュで持つ（ホーム画面版にはブラウザの戻るボタンが無いので、
   画面の中に戻る操作を置き、ハッシュは履歴とリロードのために使う）。 */
import { useEffect, useState } from "preact/hooks";

export type Route =
  | { readonly name: "home" }
  | { readonly name: "drill"; readonly topicId: string }
  | { readonly name: "reference"; readonly topicId: string }
  | { readonly name: "settings" }
  /** チャート。query は guitar_chart と同じ形の URL パラメーター */
  | { readonly name: "chart"; readonly query: string };

export function parseRoute(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  if (path === "chart") return { name: "chart", query };
  const [name, id] = path.split("/").map(decodeURIComponent);
  if (name === "drill" && id) return { name, topicId: id };
  if (name === "reference" && id) return { name, topicId: id };
  if (name === "settings") return { name };
  return { name: "home" };
}

export function href(r: Route): string {
  switch (r.name) {
    case "home":
      return "#/";
    case "settings":
      return "#/settings";
    case "chart":
      return r.query ? `#/chart?${r.query}` : "#/chart";
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
