/* 画面の SVG を PNG（2 倍）にして保存する。色は CSS 変数（明るい／暗い）で決まっているので、
   画像にする前に、要素ごとに今の色をそのまま書き込む（画像の中では CSS が効かないため）。 */

const PROPS = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "opacity",
  "fill-opacity",
  "font-size",
  "font-weight",
  "font-family",
  "text-anchor",
  "dominant-baseline",
] as const;

/** 計算済みのスタイルを書き込んだ複製 */
export function inlineStyles(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll("*")];
  const dst = [clone, ...clone.querySelectorAll("*")];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const d = dst[i] as SVGElement;
    for (const p of PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) d.style.setProperty(p, v);
    }
  });
  // 押すための透明なマスと読み上げ用の属性は画像に要らない
  clone.querySelectorAll(".fb-hit").forEach(e => e.remove());
  return clone;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** SVG を PNG にして保存する */
export function exportSvgPng(svg: SVGSVGElement, name: string, scale = 2): Promise<void> {
  const vb = svg.viewBox.baseVal;
  const clone = inlineStyles(svg);
  clone.setAttribute("width", String(vb.width));
  clone.setAttribute("height", String(vb.height));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = Object.assign(document.createElement("canvas"), {
        width: vb.width * scale,
        height: vb.height * scale,
      });
      const g = canvas.getContext("2d");
      if (!g) return reject(new Error("canvas が使えません"));
      g.fillStyle = bg;
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        b => (b ? (downloadBlob(b, name), resolve()) : reject(new Error("画像にできませんでした"))),
        "image/png",
      );
    };
    img.onerror = () => reject(new Error("画像にできませんでした"));
    img.src = url;
  });
}

/** 今の URL を共有する（共有シートがあれば使い、無ければコピー）。結果の文言を返す */
export async function shareUrl(title: string, url = location.href): Promise<string> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "リンクをコピーしました";
  } catch {
    return "コピーできませんでした";
  }
}
