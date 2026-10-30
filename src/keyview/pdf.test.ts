import { describe, expect, it } from "vitest";
import type { Page } from "../chart/pdf/page";
import { renderPdf } from "../chart/pdf/render-pdf";
import { asciiRoman, buildKeyPrintPages, keyPrintFileName, keyPrintPageCount, printKeys } from "./pdf";
import { keyLabel } from "../theory";

const texts = (p: Page) => p.shapes.flatMap(s => (s.t === "text" ? [s.text] : []));
const BOTH = { modes: ["major", "minor"] as const, chords: "both" as const, borrow: false };

describe("コードの一覧表の PDF", () => {
  it("メジャーとマイナーで 1 ページずつ", () => {
    const pages = buildKeyPrintPages(BOTH);
    expect(pages).toHaveLength(2);
    expect(keyPrintPageCount(BOTH)).toBe(2);
    expect(texts(pages[0]!)).toContain("Diatonic Chords — Major Keys");
    expect(texts(pages[1]!)).toContain("Diatonic Chords — Minor Keys");
    expect(texts(pages[1]!)).toContain("Page 2 / 2");
    expect(buildKeyPrintPages({ ...BOTH, modes: ["minor"] })).toHaveLength(1);
  });

  it("行は五度圏を時計回りの 12 キー", () => {
    expect(printKeys("major").map(keyLabel)).toEqual(["C", "G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F"]);
    expect(printKeys("minor").map(keyLabel)[0]).toBe("Am");
  });

  it("C の行に 7 つのコード（三和音と四和音）。度数の見出しは ASCII のローマ数字", () => {
    const t = texts(buildKeyPrintPages(BOTH)[0]!);
    for (const sym of ["C", "Dm", "Em", "F", "G", "Am", "Bdim", "CM7", "Dm7", "G7", "Bm7(b5)"])
      expect(t).toContain(sym);
    expect(t).toEqual(expect.arrayContaining(["I", "IIm", "VIIdim", "IM7", "VIIm7(b5)"]));
    expect(t).toContain("1#  rel. Em");
    expect(asciiRoman("♭ⅦM7")).toBe("♭VIIM7");
  });

  it("三和音だけ・四和音だけも選べる", () => {
    const tri = texts(buildKeyPrintPages({ ...BOTH, modes: ["major"], chords: "triad" })[0]!);
    expect(tri).toContain("Bdim");
    expect(tri).not.toContain("CM7");
    const sev = texts(buildKeyPrintPages({ ...BOTH, modes: ["major"], chords: "seventh" })[0]!);
    expect(sev).toContain("CM7");
    expect(sev).not.toContain("Bdim");
  });

  it("マイナーで借りると、Ⅴ と Ⅶ がハーモニックマイナーのコードになって色が付く", () => {
    const page = buildKeyPrintPages({ ...BOTH, modes: ["minor"], borrow: true })[0]!;
    const t = texts(page);
    expect(t).toEqual(expect.arrayContaining(["E", "G#dim", "E7", "G#dim7"]));
    const colored = page.shapes.flatMap(s => (s.t === "text" && s.color.r > 0.6 && s.color.g < 0.2 ? [s.text] : []));
    expect(colored).toEqual(expect.arrayContaining(["E", "G#dim", "E7", "G#dim7"]));
    // 12 キー × Ⅴ・Ⅶ × 三和音・四和音、と見出しの 2 つ（Ⅰ などは黒のまま）
    expect(colored).toHaveLength(12 * 2 * 2 + 2);
    expect(colored).not.toContain("Am");
    // 借りなければナチュラルマイナーのまま
    expect(texts(buildKeyPrintPages({ ...BOTH, modes: ["minor"] })[0]!)).toContain("Em7");
  });

  it("ファイル名", () => {
    expect(keyPrintFileName(BOTH)).toBe("Diatonic_Chords.pdf");
    expect(keyPrintFileName({ ...BOTH, modes: ["minor"] })).toBe("Diatonic_Chords_Minor.pdf");
  });

  it("PDF にできる", async () => {
    const blob = await renderPdf(buildKeyPrintPages(BOTH));
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe("%PDF-");
  });
});
