#!/usr/bin/env node
/* guitar_chart の定義を src/data/guitar-chart.json に取り込む。
   guitar-chart は private で CI からは取りに行けないので、手元で実行して結果を commit する。

     npm run sync:guitar-chart            # ../guitar_chart を使う
     GUITAR_CHART_DIR=/path npm run sync:guitar-chart

   guitar_chart の書き出しコマンド（python -m cli --export-drill-data）を Docker で実行し、
   ドリルで使う部分（スケールの定義と、このアプリのチューニングのボックス）だけを残す。
   dev VM の Node は 16 なので、この台本は Node 16 で動く書き方にしている。 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../src/data/guitar-chart.json");
const dir = resolve(process.env.GUITAR_CHART_DIR ?? resolve(here, "../../guitar_chart"));
const image = process.env.GUITAR_CHART_IMAGE ?? "guitar-chart:dev";

/** このアプリで選べるチューニング（src/theory/fretboard.ts の TUNINGS。足したらここにも足す。
    ずれはテスト（src/data/guitar-chart.test.ts）で見つかる） */
const TUNINGS = ["standard", "half_step_down", "drop_d"];

const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
const commit = git("rev-parse", "HEAD");
const dirty = git("status", "--porcelain", "--", "guitar_chart", "cli", "web");
if (dirty) {
  console.error(`guitar_chart に commit していない変更があります（出所のコミットと中身がずれる）:\n${dirty}`);
  process.exit(1);
}

const raw = execFileSync(
  "docker",
  [
    "run",
    "--rm",
    "-v",
    `${dir}:/app:ro`,
    "-w",
    "/app",
    "-e",
    "PYTHONPATH=/app",
    "-e",
    `GUITAR_CHART_COMMIT=${commit}`,
    image,
    "python",
    "-m",
    "cli",
    "--export-drill-data",
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
const data = JSON.parse(raw);
if (data.format !== 1) throw new Error(`知らない形式の版: ${data.format}`);

const missing = TUNINGS.filter(t => !data.tunings[t]);
if (missing.length) throw new Error(`guitar_chart に無いチューニング: ${missing.join(", ")}`);

const picked = {
  format: data.format,
  source: { ...data.source, branch: git("rev-parse", "--abbrev-ref", "HEAD") },
  notes: data.notes,
  scales: Object.fromEntries(
    Object.entries(data.scales).map(([k, s]) => [
      k,
      { name: s.name, intervals: s.intervals, degree_labels: s.degree_labels, has_boxes: s.has_boxes },
    ]),
  ),
  tunings: Object.fromEntries(TUNINGS.map(t => [t, data.tunings[t]])),
  boxes: Object.fromEntries(
    Object.entries(data.boxes).map(([scale, byTuning]) => [
      scale,
      Object.fromEntries(TUNINGS.map(t => [t, byTuning[t]])),
    ]),
  ),
};

// ボックスは 1 ルート 1 行にして、差分を読みやすくする
const text = JSON.stringify(picked, null, 2).replace(
  /\[\s+(\[[\d,\s[\]]+\])\s+\]/g,
  (_, inner) => `[${inner.replace(/\s+/g, "")}]`,
);
writeFileSync(out, text + "\n");
console.log(
  `取り込みました: ${out}\n  guitar_chart ${commit.slice(0, 7)}（${picked.source.branch}）、スケール ${Object.keys(picked.scales).length}、ボックス ${Object.keys(picked.boxes).length}`,
);
