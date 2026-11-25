import { describe, expect, it } from "vitest";
import { FIT_SAFETY_MM } from "../settings";
import { MM_PER_PT } from "../shared/units";
import { DEFAULT_TEMPLATE } from "../template/default";
import type { LayoutEntry } from "../template/schema";
import { fitCards, hasOverflow, textBoxMm, textItems, type TextBox } from "./autoFit";

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

/** 高さは十分にある箱 */
const BOX: TextBox = { width: 60, sectionHeight: 100 };

describe("textBoxMm", () => {
  it("カードの大きさから padding・罫線・余裕を引き、段の高さは区切り線を除いて等分する", () => {
    // A4 横・余白 5 mm・3 列 3 行 → 287 / 3 × 200 / 3 mm。padding 2 mm、罫線 1 pt
    const inset = 4 + MM_PER_PT * 2 + FIT_SAFETY_MM;
    const box = textBoxMm(DEFAULT_TEMPLATE);
    expect(box.width).toBeCloseTo(287 / 3 - inset);
    // 段 2 つと、1 pt の区切り線 1 本
    expect(box.sectionHeight).toBeCloseTo((200 / 3 - inset - MM_PER_PT) / 2);
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
      BOX,
      measure,
    );
    expect(fits[0]).toEqual({
      "0.0": { sizePt: 24, overflow: false, lines: 1 },
      "2.0": { sizePt: 16, overflow: false, lines: 1 },
    });
    // 10 文字 × 20 pt × 0.3 = 60 mm でちょうど収まる
    expect(fits[1]?.["0.0"]).toEqual({ sizePt: 20, overflow: false, lines: 1 });
    // min_size_pt 12 でも 72 mm で収まらない
    expect(fits[1]?.["2.0"]).toEqual({ sizePt: 12, overflow: true, lines: 1 });
    expect(hasOverflow(fits[0])).toBe(false);
    expect(hasOverflow(fits[1])).toBe(true);
  });

  it("キャプションにない項目は空として扱う", () => {
    expect(fitCards(LAYOUT, [{}], BOX, measure)).toEqual([{}]);
  });
});

describe("fitCards の折り返し（max_lines）", () => {
  const wrapLayout = (maxLines: number): LayoutEntry[] => [
    {
      kind: "section",
      items: [{ kind: "text", field: "title", size_pt: 20, min_size_pt: 10, max_lines: maxLines }],
    },
  ];

  it("1 行で縮めきっても入らないときだけ、最小の大きさで折り返す", () => {
    const [short, long] = fitCards(
      wrapLayout(2),
      // 15 文字は 13.5 pt で 1 行に入る。30 文字は 10 pt でも 90 mm なので 2 行にする
      [{ title: "あ".repeat(15) }, { title: "あ".repeat(30) }],
      BOX,
      measure,
    );
    expect(short?.["0.0"]).toEqual({ sizePt: 13, overflow: false, lines: 1 });
    expect(long?.["0.0"]).toEqual({ sizePt: 10, overflow: false, lines: 2 });
  });

  it("行の終わりの空きを 1 文字分見込み、それでも入らなければ収まらないとする", () => {
    // 10 pt の 1 文字は約 3.5 mm。2 行で使える幅は 120 - 3.5 mm
    const [fits, overflows] = fitCards(
      wrapLayout(2),
      [{ title: "あ".repeat(38) }, { title: "あ".repeat(39) }],
      BOX,
      measure,
    );
    expect(fits?.["0.0"]?.overflow).toBe(false);
    expect(overflows?.["0.0"]).toEqual({ sizePt: 10, overflow: true, lines: 2 });
  });

  it("折り返して段の高さを超えるときは、収まらないとする", () => {
    // 10 pt × 1.3 × 2 行 は約 9.2 mm
    const caption = { title: "あ".repeat(30) };
    const [tall] = fitCards(wrapLayout(2), [caption], { width: 60, sectionHeight: 9 }, measure);
    const [roomy] = fitCards(wrapLayout(2), [caption], { width: 60, sectionHeight: 10 }, measure);
    expect(tall?.["0.0"]?.overflow).toBe(true);
    expect(roomy?.["0.0"]?.overflow).toBe(false);
  });
});
