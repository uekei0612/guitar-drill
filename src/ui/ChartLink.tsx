/* 「チャートで開く」。ドリルの解説と参考ページから、同じスケール・キー・ボックスのチャートへ。 */
import { type ChartRef, chartHref } from "../chart/link";
import { useData } from "../state";

export function ChartLink({ chart }: { chart: ChartRef }) {
  const { settings } = useData();
  return (
    <p class="chart-link">
      <a href={chartHref(chart, { tuning: settings.tuning, lefty: settings.lefty })}>
        チャートで開く{chart.box ? `（ボックス ${chart.box}）` : ""}
      </a>
    </p>
  );
}
