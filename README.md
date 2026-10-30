# guitar-drill

ギタリストが覚えること（指板の音名、度数の位置、コードの型、ダイアトニック、モード…）を
初心者→中級者→上級者の順に覚えていく暗記ドリル。iPhone のホーム画面アプリ（PWA）として使う。

「チャート」（`#/chart`）では、スケール・アルペジオを指板で見て、A4 横の PDF 資料にできる
（旧 [guitar_chart](https://github.com/uekei0612/guitar-chart) を取り込んだもの）。

- 設計：[docs/design.md](docs/design.md)
- 前身の diatonic-drill から引き継ぐもの：[docs/reference-diatonic-drill.md](docs/reference-diatonic-drill.md)

## 開発

dev VM の Node は 16 で Vite が動かないので、Node 22 のコンテナで動かす。

```sh
docker compose up -d     # http://almalinux-dev.ukuenokei.duckdns.org:8008/guitar-drill/
docker compose run --rm dev npm run check   # 型検査・整形・テスト・ビルド
```

画面上部のオレンジの帯は開発版の印で、本番（GitHub Pages）では出ない。

## 公開

| ブランチ | URL | 記録の保存先 |
|---|---|---|
| `main`（本番） | https://uekei0612.github.io/guitar-drill/ | `guitar-drill` |
| `develop` | https://uekei0612.github.io/guitar-drill/dev/ | `guitar-drill-dev`（本番とは混ざらない） |

どちらに push しても、`.github/workflows/pages.yml` が両方をビルドして 1 つのサイトとして公開し直す。
develop 版は `npm run build:develop`（`vite build --mode develop`、設定は `.env.develop`）で作り、オレンジの帯が出る。
