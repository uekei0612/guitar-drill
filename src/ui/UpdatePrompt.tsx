/* 新しい版は自動で切り替える。ただしドリルの途中で再読み込みすると解いている回が消えるので、
   ドリルの画面にいる間は待ち、ドリルを出たところで切り替える（URL はハッシュなので画面はそのまま戻る）。 */
import { useEffect } from "preact/hooks";
import { useRegisterSW } from "virtual:pwa-register/preact";

/** 「オフラインでも使えるように」は知らせるだけなので、この時間で自分で消す */
const OFFLINE_NOTICE_MS = 4000;

/** 更新を確かめる間隔 */
const CHECK_MS = 60 * 60 * 1000;

export function UpdatePrompt({ busy }: { busy: boolean }) {
  const {
    needRefresh: [needRefresh],
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
    if (needRefresh && !busy) updateServiceWorker(true);
  }, [needRefresh, busy]);

  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), OFFLINE_NOTICE_MS);
    return () => clearTimeout(id);
  }, [offlineReady]);

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
