import type { CSSProperties } from "react";
import { fontFamilyCss } from "../../fonts/fonts";
import type { Template } from "../../template/schema";
import { sheetGeometry } from "../geometry";

/** 寸法とフォント。すべて CSS 変数で sheets.css に渡す。見本のカード（CardSample.tsx）でも使う */
export function sheetStyle(template: Template): CSSProperties {
  const { page, grid, card } = template;
  const { paper } = sheetGeometry(template);
  return {
    "--paper-width": `${paper.width}mm`,
    "--paper-height": `${paper.height}mm`,
    "--page-margin": `${page.margin_mm}mm`,
    "--grid-columns": grid.columns,
    "--grid-rows": grid.rows,
    "--card-border": `${card.border_pt}pt`,
    "--card-padding": `${card.padding_mm}mm`,
    fontFamily: fontFamilyCss(template.font),
  } as CSSProperties;
}
