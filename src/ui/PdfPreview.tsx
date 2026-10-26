/* PDF のページを SVG で見せる（PDF と同じ図形の並びを描くので、見た目は PDF と同じ）。 */
import { PAGE_H, PAGE_W, type Page, cssColor } from "../chart/pdf/page";

export function PdfPage({ page, label }: { page: Page; label: string }) {
  return (
    <svg class="pdf-page" viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} role="img" aria-label={label}>
      <rect width={PAGE_W} height={PAGE_H} fill="#ffffff" />
      {page.shapes.map((s, i) => {
        switch (s.t) {
          case "line":
            return (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={cssColor(s.color)} stroke-width={s.width} />
            );
          case "rect":
            return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.radius} fill={cssColor(s.fill)} />;
          case "circle":
            return (
              <circle
                key={i}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={cssColor(s.fill)}
                stroke={s.stroke ? cssColor(s.stroke) : undefined}
                stroke-width={s.width}
              />
            );
          case "text":
            return (
              <text
                key={i}
                x={s.x}
                y={s.y}
                font-family="Helvetica, Arial, sans-serif"
                font-size={s.size}
                font-weight={s.bold ? 700 : 400}
                fill={cssColor(s.color)}
                text-anchor={s.align === "center" ? "middle" : s.align === "right" ? "end" : "start"}
              >
                {s.text}
              </text>
            );
        }
      })}
    </svg>
  );
}

export function PdfPreview({ pages }: { pages: readonly Page[] }) {
  return (
    <div class="pdf-pages">
      {pages.map((p, i) => (
        <figure key={i}>
          <PdfPage page={p} label={`${i + 1} ページ目`} />
          <figcaption class="muted small">
            {i + 1} / {pages.length}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
