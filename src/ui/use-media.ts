/* メディアクエリに合っているか（画面の幅が変わると描き直す）。CSS の @media と同じ条件で、描き方を変えるときに使う */
import { useEffect, useState } from "preact/hooks";

export function useMedia(q: string): boolean {
  const [on, setOn] = useState(() => typeof matchMedia === "function" && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia(q);
    const change = () => setOn(m.matches);
    change();
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, [q]);
  return on;
}
