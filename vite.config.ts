/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

/* develop 版（vite build --mode develop）は本番と同じ Pages の /guitar-drill/dev/ に置く。
   記録の保存先は src/store/store.ts で分ける（同じドメインなので localStorage は共有される） */
export default defineConfig(({ mode }) => {
  const develop = mode === "develop";
  return {
    // GitHub Pages の公開先（https://uekei0612.github.io/guitar-drill/、develop 版は …/guitar-drill/dev/）
    base: develop ? "/guitar-drill/dev/" : "/guitar-drill/",
    plugins: [
      preact(),
      VitePWA({
        // 新しい版は UpdatePrompt が切り替える（ドリルの途中は待つので autoUpdate にはしない）
        registerType: "prompt",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          // ホーム画面に置いたとき本番と見分けられるように
          name: develop ? "guitar-drill dev" : "guitar-drill",
          short_name: develop ? "drill dev" : "guitar-drill",
          description: "ギタリストが覚えることを、初心者→中級者→上級者の順に覚えていく暗記ドリル",
          lang: "ja",
          start_url: "./",
          scope: "./",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#c2410c",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // 画面はハッシュで切り替えるので、取っておくのはビルドした一式だけでよい
          globPatterns: ["**/*.{js,css,html,svg,png,json}"],
          // jsPDF の任意の依存（HTML・SVG を画像にする機能用）。使わないので取っておかない
          globIgnores: ["**/html2canvas-*.js", "**/purify.es-*.js", "**/index.es-*.js"],
          cleanupOutdatedCaches: true,
          // 本番の service worker は /guitar-drill/ の下を全部受け持つので、/dev/ を開いたときに
          // 本番の画面を返さないよう外す（develop 版は自分の service worker が受け持つ）
          navigateFallbackDenylist: develop ? [] : [/^\/guitar-drill\/dev\//],
        },
      }),
    ],
    // dev サーバーには NPM の TCP 転送経由（almalinux-dev.ukuenokei.duckdns.org:8008）でも入る
    server: { strictPort: true, allowedHosts: ["almalinux-dev.ukuenokei.duckdns.org"] },
    test: { include: ["src/**/*.test.{ts,tsx}"] },
  };
});
