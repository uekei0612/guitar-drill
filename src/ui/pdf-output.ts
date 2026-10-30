/* ページを PDF にして、ダウンロードするか新しいタブで開く（チャートとキーの画面で共通）。 */
import type { Page } from "../chart/pdf/page";
import { downloadBlob } from "./export-image";

/** 押したその場で呼ぶこと（新しいタブは await より前に開かないと、Safari がポップアップとして止める）。
    戻り値は画面に出す知らせ */
export async function outputPdf(pages: () => readonly Page[], name: string, open: boolean): Promise<string> {
  const tab = open ? window.open("", "_blank") : null;
  if (open && !tab) return "新しいタブを開けませんでした（ポップアップを許可してください）";
  try {
    if (tab) tab.document.body.textContent = "PDF を作っています…";
  } catch {
    // 中身を書けなくても、あとで PDF に切り替えるので構わない
  }
  try {
    const { renderPdf } = await import("../chart/pdf/render-pdf");
    const blob = await renderPdf(pages());
    if (tab) {
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return "新しいタブに開きました。そこから印刷できます。";
    }
    downloadBlob(blob, name);
    return `PDF を作りました（${name}）`;
  } catch (e) {
    tab?.close();
    return `PDF を作れませんでした：${(e as Error).message}`;
  }
}
