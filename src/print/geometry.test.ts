import { describe, expect, it } from "vitest";
import { pageCount, paginate, sheetGeometry } from "./geometry";

describe("paginate", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("3×3 で 9 件なら 1 ページ", () => {
    expect(paginate(items(9), 9)).toHaveLength(1);
  });

  it("3×3 で 10 件なら 2 ページで、2 ページ目は 1 件", () => {
    const pages = paginate(items(10), 9);
    expect(pages).toHaveLength(2);
    expect(pages[1]).toEqual([9]);
  });

  it("0 件なら 0 ページ", () => {
    expect(paginate([], 9)).toEqual([]);
  });
});

describe("pageCount", () => {
  const grid = { columns: 3, rows: 3 };

  it.each([
    [0, 0],
    [1, 1],
    [9, 1],
    [10, 2],
    [18, 2],
    [19, 3],
  ])("3×3 で %d 件なら %d ページ", (count, pages) => {
    expect(pageCount(count, { grid })).toBe(pages);
  });
});

describe("sheetGeometry", () => {
  it("A4 横・余白 5 mm・3×3", () => {
    const g = sheetGeometry({
      page: { size: "A4", orientation: "landscape", margin_mm: 5 },
      grid: { columns: 3, rows: 3 },
    });
    expect(g.paper).toEqual({ width: 297, height: 210 });
    expect(g.inner).toEqual({ width: 287, height: 200 });
    expect(g.card.width).toBeCloseTo(287 / 3);
    expect(g.card.height).toBeCloseTo(200 / 3);
  });

  it("A4 縦・余白 0・2×4", () => {
    const g = sheetGeometry({
      page: { size: "A4", orientation: "portrait", margin_mm: 0 },
      grid: { columns: 2, rows: 4 },
    });
    expect(g.paper).toEqual({ width: 210, height: 297 });
    expect(g.card).toEqual({ width: 105, height: 74.25 });
  });
});
