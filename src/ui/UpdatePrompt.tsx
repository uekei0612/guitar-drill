/* 新しい版の知らせ。切り替えは利用者が押したときだけ（ドリルの途中で勝手に再読み込みしない）。 */
import { useEffect } from "preact/hooks";
import { useRegisterSW } from "virtual:pwa-register/preact";

/** 「オフラインでも使えるように」は知らせるだけなので、この時間で自分で消す */
const OFFLINE_NOTICE_MS = 4000;

/** 更新を確かめる間隔 */
const CHECK_MS = 60 * 60 * 1000;

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      if (!r) return;
      // ホーム画面版は起動し直さず復帰することが多く、そのままでは更新に気づかない。
      // 表に出るたびと 1 時間ごとに確かめる
      const check = () => {
        if (!r.installing && navigator.onLine) r.update().catch(() => {});
      };
      setInterval(check, CHECK_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), OFFLINE_NOTICE_MS);
    return () => clearTimeout(id);
  }, [offlineReady]);

  if (needRefresh)
    return (
      <div class="toast" role="alert">
        <span>新しい版があります</span>
        <button class="btn primary" onClick={() => updateServiceWorker(true)}>
          更新する
        </button>
        <button class="btn" onClick={() => setNeedRefresh(false)}>
          あとで
        </button>
      </div>
    );
  if (offlineReady)
    return (
      <div class="toast" role="status">
        <span>オフラインでも使えるようになりました</span>
        <button class="btn" onClick={() => setOfflineReady(false)}>
          閉じる
        </button>
      </div>
    );
  return null;
}
