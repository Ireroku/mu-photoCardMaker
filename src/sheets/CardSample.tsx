import { useMemo } from "react";
import type { Template } from "../template/schema";
import { sheetGeometry, type Caption } from "./geometry";
import { Card } from "./parts/Card";
import "./parts/sheets.css";
import { sheetStyle } from "./parts/sheetStyle";
import { useCardFits } from "./useCardFits";

/** カード 1 枚の見本。印刷するカードと同じ大きさで描き、CSS の zoom で縮めて見せる */
export function CardSample({ template, caption }: { template: Template; caption: Caption }) {
  const { card } = sheetGeometry(template);
  const captions = useMemo(() => [caption], [caption]);
  const { fits } = useCardFits(template, captions);
  return (
    <div
      className="card-sample"
      style={{ ...sheetStyle(template), width: `${card.width}mm`, height: `${card.height}mm` }}
      aria-hidden="true"
    >
      <Card layout={template.layout} caption={caption} firstColumn firstRow fit={fits?.[0]} />
    </div>
  );
}
