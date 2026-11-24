import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATE } from "../template/default";
import type { LayoutEntry } from "../template/schema";
import { FIT_SAFETY_MM, fitCards, hasOverflow, textItems, textWidthMm } from "./autoFit";

const LAYOUT: LayoutEntry[] = [
  { kind: "section", items: [{ kind: "text", field: "title", size_pt: 24, bold: true }] },
  { kind: "line", width_percent: 72, thickness_pt: 1 },
  {
    kind: "section",
    items: [
      { kind: "text", field: "author", size_pt: 16, min_size_pt: 12 },
      { kind: "line", width_percent: 50, thickness_pt: 1 },
      { kind: "text", field: "place", size_pt: 11 },
    ],
  },
];

/** 1 文字 1 pt あたり 0.3 mm になる、まっすぐな測り方 */
const measure = (text: string, _item: unknown, pt: number) => text.length * pt * 0.3;

describe("textItems", () => {
  it("文字の項目だけを、段と段の中の番号で返す", () => {
    expect(textItems(LAYOUT).map((x) => x.id)).toEqual(["0.0", "2.0", "2.2"]);
  });
});

describe("textWidthMm", () => {
  it("カードの幅から padding・左右の罫線・余裕を引く", () => {
    // A4 横・余白 5 mm・3 列 → 287 / 3 mm。padding 2 mm、罫線 1 pt
    const expected = 287 / 3 - 4 - (25.4 / 72) * 2 - FIT_SAFETY_MM;
    expect(textWidthMm(DEFAULT_TEMPLATE)).toBeCloseTo(expected);
  });
});

describe("fitCards", () => {
  it("収まる文字は元の大きさ、長い文字は縮め、空の項目は入れない", () => {
    const fits = fitCards(
      LAYOUT,
      [
        { title: "短い", author: "名前", place: "" },
        { title: "あ".repeat(10), author: "い".repeat(20), place: "う" },
      ],
      60,
      measure,
    );
    expect(fits[0]).toEqual({
      "0.0": { sizePt: 24, overflow: false },
      "2.0": { sizePt: 16, overflow: false },
    });
    // 10 文字 × 20 pt × 0.3 = 60 mm でちょうど収まる
    expect(fits[1]?.["0.0"]).toEqual({ sizePt: 20, overflow: false });
    // min_size_pt 12 でも 72 mm で収まらない
    expect(fits[1]?.["2.0"]).toEqual({ sizePt: 12, overflow: true });
    expect(hasOverflow(fits[0])).toBe(false);
    expect(hasOverflow(fits[1])).toBe(true);
  });

  it("キャプションにない項目は空として扱う", () => {
    expect(fitCards(LAYOUT, [{}], 60, measure)).toEqual([{}]);
  });
});
