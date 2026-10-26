# guitar-drill

ギタリストが覚えること（指板の音名、度数の位置、コードの型、ダイアトニック、モード…）を
初心者→中級者→上級者の順に覚えていく暗記ドリル。iPhone のホーム画面アプリ（PWA）として使う。

- 設計：[docs/design.md](docs/design.md)
- 前身の diatonic-drill から引き継ぐもの：[docs/reference-diatonic-drill.md](docs/reference-diatonic-drill.md)

## 開発

dev VM の Node は 16 で Vite が動かないので、Node 22 のコンテナで動かす。

```sh
docker compose up -d     # http://almalinux-dev.ukuenokei.duckdns.org:8008/guitar-drill/
docker compose run --rm dev npm run check   # 型検査・整形・テスト・ビルド
```

画面上部のオレンジの帯は開発版の印で、本番（GitHub Pages）では出ない。

### guitar_chart の定義の取り込み

スケールの分野は [guitar_chart](https://github.com/uekei0612/guitar-chart) の定義とボックスの位置を
`src/data/guitar-chart.json` として持つ（guitar-chart は private なので、CI からは取りに行かず commit する）。
guitar_chart 側でスケールやボックスが変わったら、手元（`../guitar_chart` を clone 済み）で取り込み直す。

```sh
npm run sync:guitar-chart   # guitar_chart の書き出しコマンドを Docker で実行（Node 16 でも動く）
```

理論コアとずれていたら `src/data/guitar-chart.test.ts` が落ちる。
