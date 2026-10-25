/* 画面の切り替えは URL のハッシュで持つ（ホーム画面版にはブラウザの戻るボタンが無いので、
   画面の中に戻る操作を置き、ハッシュは履歴とリロードのために使う）。 */
import { useEffect, useState } from "preact/hooks";

export type Route =
  | { readonly name: "home" }
  | { readonly name: "drill"; readonly topicId: string }
  | { readonly name: "reference"; readonly topicId: string }
  | { readonly name: "settings" };

export function parseRoute(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
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
