# guitar-drill 設計

ギタリストが覚えること（指板の音名、度数の位置、コードの型、ダイアトニック、モード…）を、
初心者→中級者→上級者の順に覚えていく暗記ドリル。iPhone のホーム画面アプリ（PWA）として
GitHub Pages から配る。

旧アプリ [diatonic-drill](https://github.com/uekei0612/diatonic-drill) はこのアプリの
「ダイアトニックコード」1 分野にあたる。コードは持ち込まず、計算の考え方とテストの事例だけを参考にする
（[reference-diatonic-drill.md](reference-diatonic-drill.md)）。

## 決めたこと

| 項目 | 決定 | 理由 |
|---|---|---|
| 配り方 | PWA（GitHub Pages、`main` への push で公開） | 主な使い方が iPhone のホーム画面。オフラインでも動かす |
| 言語・ビルド | TypeScript + Vite | 分野が増えても型で守る。ビルドは GitHub Actions で行う |
| UI | Preact | 画面が多くなるので部品化したい。実行時 4KB 程度で軽い |
| テスト | Vitest（理論・出題・記録）、Playwright（画面） | 理論は DOM に触らない純粋関数にして単体テストで固める |
| PWA | vite-plugin-pwa（更新は「新しい版があります」を出して利用者が再読み込み） | word-sprint で、更新の反映が遅れる問題を経験済み |
| 記録 | localStorage、版付きスキーマ＋移行関数、JSON の書き出し／読み込み | ホーム画面版は Safari と保存領域が別なので、最初から移せるようにする |
| 開発環境 | Docker の `node:22-alpine`（dev VM の Node は 16 で Vite が動かない） | dev サーバーは 8008 番（HTTP）。実機で SW を試すときは NPM で HTTPS を被せる |
| ブランチ | feature → develop → main | `main` への push がそのまま本番 |
| スケールの定義 | [guitar_chart](https://github.com/uekei0612/guitar-chart) から JSON で取り込む | 印刷する資料とドリルで、スケール・度数表記・ボックスの位置を一致させる（下の「guitar_chart との連携」） |

## 構成

```
src/
  theory/        音楽理論。DOM に触らない純粋関数（音名・音程・スケール・コード・キー・指板）
  topics/        分野。1 分野 = 1 ディレクトリ（出題・参考ページ）
  drill/         出題エンジン（分野の共通インターフェース、出題順、採点）
  store/         記録（スキーマ、移行、書き出し／読み込み）
  ui/            画面と部品（指板 SVG、4択、結果）
```

### 理論（`src/theory`）

音は「音名（文字＋変化記号）」で持ち、ピッチクラス（0〜11）は計算で出す。
F♯ と G♭ を区別しないと調の綴りが壊れるため（旧アプリで実証済み）。

- `Note`：`{ letter: 0..6, acc: -2..2 }`。`pc()`、`fmt()`（♯♭表記）
- `Interval`：度数（1〜13）と質（P/M/m/A/d）。半音数と相互変換
- `spell(root, intervals)`：ルート＋音程の並び → 正しく綴った音名の並び
- `Scale`：メジャー、ナチュラル／ハーモニック／メロディックマイナー、チャーチモード、ペンタ、ブルース
- `Chord`：型（構成音程の並び）と表記。トライアド、4和音、テンション
- `Key`：調号、ダイアトニックコード（マイナーの Ⅴ・Ⅶ を借りる設定は旧アプリから引き継ぐ）
- `Fretboard`：チューニング（既定は標準）、`(弦, フレット) → 音`、`音 → 指板上の位置一覧`

### 分野（`src/topics`）

すべての分野が同じインターフェースを実装する。新しい分野を足しても出題エンジンと記録は変えない。

```ts
interface Topic {
  id: string;               // "fret-notes" など。記録のキーになるので変えない
  level: "beginner" | "intermediate" | "advanced";
  title: string;
  items(settings): ItemId[]; // 覚える単位（例：「6弦 5f」「C メジャーの Ⅴ」）
  question(item, settings, rng): Question;
  reference?: Component;     // 参考ページ（旧アプリの「覚え方」にあたる）
}

type Question = {
  prompt: Prompt;            // 文 or 指板図つき
  answer: ChoiceAnswer | FretTapAnswer; // 4択 or 指板をタップ
};
```

`rng` を渡すのは、出題をテストで再現できるようにするため。

### 出題順（`src/drill`）

覚える単位（item）ごとに、間を空けて繰り返す（簡易 SM-2）。
旧アプリはキー単位で苦手を優先していたが、指板の音名などは item が数百あるため、
「まだ出していないもの」と「忘れかけたもの（期限切れ）」から出す方式にする。

- item ごとに `{ ease, interval, due, tries, correct }`
- 正解で間隔を延ばし、誤答で短く戻す。1 セッションは 20 問程度
- 分野ごとの「習熟度」＝期限内の item の割合を一覧に出す

### 記録（`src/store`）

- localStorage のキーは 1 つ。`{ version, settings, items: { "<topicId>/<itemId>": stat } }`
- 読み込み時に版を見て移行し、値は 1 つずつ検証する（壊れた値は既定値に戻す）
- 設定画面から JSON を書き出し／読み込みできる（Safari ↔ ホーム画面版の移行用）

### guitar_chart との連携

スケールの暗記は guitar_chart と組にする。**guitar_chart で見て覚え、guitar-drill で覚えたか確かめる**。

guitar_chart は Python のサーバー（自宅の tailnet 内と Google Cloud Run）なので、実行時にその API を呼ぶ形にはしない。
呼ぶ形にすると、オフラインのときやサーバーが止まっているときにスケールの分野が動かなくなる。
代わりに次の 2 段で使う。

1. **定義の取り込み（ビルド時）**
   - guitar_chart に、ドリル用の定義を JSON で書き出すコマンドを足す（`python -m cli --export-drill-data`）
   - 中身：スケールとアルペジオ（音程・度数ラベル・名前）、チューニング、
     スケール × 12 ルート × チューニングごとのボックスの範囲（`compute_box_fret_ranges_for_root` の結果）
   - guitar-drill は `src/data/guitar-chart.json` として取り込んで commit する（guitar-chart は private で、
     CI からは取りに行けないため）。取り込みスクリプト `npm run sync:guitar-chart` が、出所のコミットも JSON に書く
   - 音名は guitar-drill の理論コアで綴る（guitar_chart は ♯ 表記の 12 音だけなので、音名は取り込まない）
   - CI で「取り込んだスケールの音程と度数ラベルが、理論コアの定義と一致する」ことを確かめ、ずれたら落とす
2. **guitar_chart を開くリンク（実行時・任意）**
   - スケールの問題の解説と参考ページに「guitar_chart で開く」を出す。
     URL に `scale` / `root` / `tuning` / `caged=1&box=N` を付け、出題中のスケール・キー・ボックスで開く
   - guitar_chart の URL は設定で入れる（空なら出さない）。どのサーバーを使うか（自宅／Cloud Run／dev）を利用者が選べるようにし、
     公開ページに自宅のホスト名を埋め込まないため

guitar_chart の側の作業は guitar-chart リポジトリの Issue で扱う。

### 画面

1. **ホーム**：レベル別の分野一覧と、それぞれの習熟度
2. **ドリル**：問題 → 回答 → 正誤と解説（指板図で答えの位置を示す）
3. **参考**：分野ごとの覚え方（図つき）
4. **設定**：チューニング、左利き表示、ライト／ダーク、記録の書き出し／読み込み

指板 SVG は 1 つの部品にして、表示・出題・回答（タップ）・解説のすべてで使う。

アクセシビリティは旧アプリで整えたもの（タブのキーボード操作、`aria-live` での正誤読み上げ、
44px 以上のタップ領域）を最初から入れる。

## 分野の予定

| レベル | 分野 |
|---|---|
| 初心者 | 開放弦の音名 ／ 指板の音名（自然音・12 フレットまで） ／ メジャー・マイナーの構成音 |
| 中級者 | スケールのボックス（guitar_chart 連携） ／ 指板の音名（全音） ／ 度数の位置 ／ ダイアトニックコード ／ 4和音の構成音 ／ 五度圏と調号 ／ 定番の進行 |
| 上級者 | モードの特性音 ／ テンションの構成音 ／ ドミナントで使うスケール ／ セカンダリードミナントと裏コード |

スケールの分野（ペンタ、メジャー／マイナー、モード、ブルース、ハーモニックマイナー）は、
guitar_chart の定義とボックスを使い、「ボックス N の中で、この点は何度？」「ボックス N の R を全部タップ」
「このボックスで抜けている音をタップ」を出題する。

指板の型のうちボイシング（ドロップ 2 など）は、指板タップで「型を埋める」出題として
上の分野が揃ったあとで足す。
