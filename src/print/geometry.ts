import { paperSizeMm } from "../template/paper";
import type { Template } from "../template/schema";

export type Size = { width: number; height: number };

/** 1 枚分のキャプション。キーはテンプレートの fields[].key */
export type Caption = Readonly<Record<string, string>>;

export type SheetGeometry = {
  /** 用紙の大きさ（向きを反映） */
  paper: Size;
  /** 余白を除いた、カードを並べる範囲 */
  inner: Size;
  /** カード 1 枚の大きさ。罫線の太さは無視した目安（罫線の重ね方は print.css を参照） */
  card: Size;
};

/** 用紙・余白・行と列の数から、各部の大きさ（mm）を求める */
export function sheetGeometry(template: Pick<Template, "page" | "grid">): SheetGeometry {
  const { page, grid } = template;
  const paper = paperSizeMm(page.size, page.orientation);
  const inner = {
    width: paper.width - page.margin_mm * 2,
    height: paper.height - page.margin_mm * 2,
  };
  const card = { width: inner.width / grid.columns, height: inner.height / grid.rows };
  return { paper, inner, card };
}

/** 1 ページに並ぶ枚数 */
export function cardsPerPage(template: Pick<Template, "grid">): number {
  return template.grid.columns * template.grid.rows;
}

/** ページ数。0 件なら 0 ページ */
export function pageCount(captionCount: number, template: Pick<Template, "grid">): number {
  return Math.ceil(captionCount / cardsPerPage(template));
}

/** 1 ページに収まる枚数ずつに分ける。0 件なら 0 ページ */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}
