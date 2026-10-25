/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  // GitHub Pages の公開先（https://uekei0612.github.io/guitar-drill/）
  base: "/guitar-drill/",
  plugins: [preact()],
  // dev サーバーには NPM の TCP 転送経由（almalinux-dev.ukuenokei.duckdns.org:8008）でも入る
  server: { strictPort: true, allowedHosts: ["almalinux-dev.ukuenokei.duckdns.org"] },
  test: { include: ["src/**/*.test.ts"] },
});
