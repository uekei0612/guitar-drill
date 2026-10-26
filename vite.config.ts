/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages の公開先（https://uekei0612.github.io/guitar-drill/）
  base: "/guitar-drill/",
  plugins: [
    preact(),
    VitePWA({
      // 新しい版は勝手に切り替えず、「新しい版があります」を出して利用者が切り替える
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "guitar-drill",
        short_name: "guitar-drill",
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
      },
    }),
  ],
  // dev サーバーには NPM の TCP 転送経由（almalinux-dev.ukuenokei.duckdns.org:8008）でも入る
  server: { strictPort: true, allowedHosts: ["almalinux-dev.ukuenokei.duckdns.org"] },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
