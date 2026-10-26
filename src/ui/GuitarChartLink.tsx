/* 「guitar_chart で開く」。設定に guitar_chart の URL が入っているときだけ出す
   （公開ページに自宅サーバーのホスト名を埋め込まないため、URL は利用者が入れる）。 */
import { type GuitarChartRef, guitarChartUrl } from "../drill/guitar-chart-link";
import { useData } from "../state";

export function GuitarChartLink({ chart }: { chart: GuitarChartRef }) {
  const { settings } = useData();
  if (!settings.guitarChartUrl) return null;
  const href = guitarChartUrl(settings.guitarChartUrl, chart, { tuning: settings.tuning, lefty: settings.lefty });
  return (
    <p class="gc-link">
      <a href={href} target="_blank" rel="noopener">
        guitar_chart で開く{chart.box ? `（ボックス ${chart.box}）` : ""}
      </a>
      <br />
      <small class="muted">
        開けないときは、設定の URL と（自宅のサーバーなら）Tailscale の接続を確かめてください。
      </small>
    </p>
  );
}
