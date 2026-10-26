/* PDF の 1 ページを「図形の並び」で持つ。単位は pt（A4 横 = 841.89 × 595.28）、原点は左上。
   同じ並びを画面のプレビュー（SVG）と PDF（jsPDF）の両方に描くので、両者の見た目がずれない。 */

export const PAGE_W = 841.89;
export const PAGE_H = 595.28;
/** 1 mm を pt で */
export const MM = 72 / 25.4;

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

export type Shape =
  | {
      readonly t: "line";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly color: Rgba;
      readonly width: number;
    }
  | {
      readonly t: "rect";
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly fill: Rgba;
      /** 角の丸み */
      readonly radius?: number;
    }
  | {
      readonly t: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly fill: Rgba;
      readonly stroke?: Rgba;
      readonly width?: number;
    }
  | {
      readonly t: "text";
      readonly x: number;
      /** ベースライン */
      readonly y: number;
      readonly text: string;
      readonly size: number;
      readonly bold?: boolean;
      readonly color: Rgba;
      readonly align?: "left" | "center" | "right";
    };

export interface Page {
  readonly shapes: readonly Shape[];
}

export const hex = (h: string, a?: number): Rgba => ({
  r: Number.parseInt(h.slice(1, 3), 16) / 255,
  g: Number.parseInt(h.slice(3, 5), 16) / 255,
  b: Number.parseInt(h.slice(5, 7), 16) / 255,
  a,
});
export const rgb = (r: number, g: number, b: number, a?: number): Rgba => ({ r, g, b, a });
export const opaque = (c: Rgba): Rgba => ({ ...c, a: undefined });
export const cssColor = (c: Rgba): string =>
  `rgb(${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)}${c.a === undefined ? "" : ` / ${c.a}`})`;

/** PDF の標準フォント（Helvetica）に無い文字を置き換える。♭♯は guitar_chart の資料と同じく b と # にする */
export const pdfText = (s: string): string =>
  s
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/𝄪/g, "##")
    .replace(/𝄫/g, "bb")
    .replace(/[^\x20-\x7e—]/g, "?");

/** ページを作る道具。座標は guitar_chart（reportlab）と同じ左下原点で受け取り、左上原点にして貯める */
export class Canvas {
  readonly pages: Page[] = [];
  #shapes: Shape[] = [];

  #y = (y: number) => PAGE_H - y;

  line(x1: number, y1: number, x2: number, y2: number, color: Rgba, width: number) {
    this.#shapes.push({ t: "line", x1, y1: this.#y(y1), x2, y2: this.#y(y2), color, width });
  }

  /** 左下 (x, y) から幅 w・高さ h */
  rect(x: number, y: number, w: number, h: number, fill: Rgba, radius?: number) {
    this.#shapes.push({ t: "rect", x, y: this.#y(y + h), w, h, fill, radius });
  }

  circle(cx: number, cy: number, r: number, fill: Rgba, stroke?: Rgba, width?: number) {
    this.#shapes.push({ t: "circle", cx, cy: this.#y(cy), r, fill, stroke, width });
  }

  text(
    x: number,
    y: number,
    text: string,
    size: number,
    color: Rgba,
    opts: { bold?: boolean; align?: "left" | "center" | "right" } = {},
  ) {
    this.#shapes.push({ t: "text", x, y: this.#y(y), text: pdfText(text), size, color, ...opts });
  }

  showPage() {
    this.pages.push({ shapes: this.#shapes });
    this.#shapes = [];
  }
}
