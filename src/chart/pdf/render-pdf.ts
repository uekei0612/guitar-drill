/* ページを jsPDF で PDF にする。jsPDF は大きいので、PDF を作るときだけ読み込む。 */
import { PAGE_H, PAGE_W, type Page, type Rgba } from "./page";

export async function renderPdf(pages: readonly Page[]): Promise<Blob> {
  const { jsPDF, GState } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [PAGE_W, PAGE_H], compress: true });
  const rgb = (c: Rgba) => [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)] as const;
  const alpha = (a: number | undefined) => doc.setGState(new GState({ opacity: a ?? 1, "stroke-opacity": a ?? 1 }));

  pages.forEach((page, i) => {
    if (i > 0) doc.addPage([PAGE_W, PAGE_H], "landscape");
    for (const s of page.shapes) {
      switch (s.t) {
        case "line":
          alpha(s.color.a);
          doc.setDrawColor(...rgb(s.color));
          doc.setLineWidth(s.width);
          doc.line(s.x1, s.y1, s.x2, s.y2);
          break;
        case "rect":
          alpha(s.fill.a);
          doc.setFillColor(...rgb(s.fill));
          if (s.radius) doc.roundedRect(s.x, s.y, s.w, s.h, s.radius, s.radius, "F");
          else doc.rect(s.x, s.y, s.w, s.h, "F");
          break;
        case "circle":
          alpha(s.fill.a);
          doc.setFillColor(...rgb(s.fill));
          if (s.stroke) {
            doc.setDrawColor(...rgb(s.stroke));
            doc.setLineWidth(s.width ?? 1);
          }
          doc.circle(s.cx, s.cy, s.r, s.stroke ? "FD" : "F");
          break;
        case "text":
          alpha(s.color.a);
          doc.setFont("helvetica", s.bold ? "bold" : "normal");
          doc.setFontSize(s.size);
          doc.setTextColor(...rgb(s.color));
          doc.text(s.text, s.x, s.y, { align: s.align ?? "left", baseline: "alphabetic" });
          break;
      }
    }
    alpha(1);
  });
  return doc.output("blob");
}
