import type { CSSProperties, ReactNode } from "react";
import { fontFamilyCss } from "../fonts/fonts";
import type { Template } from "../template/schema";
import type { CardFit } from "./autoFit";
import { Card } from "./Card";
import { cardsPerPage, paginate, sheetGeometry, type Caption } from "./geometry";
import "./print.css";

type SheetsProps = {
  template: Template;
  captions: readonly Caption[];
  /** カードごとの文字の自動縮小の結果（captions と同じ順） */
  fits?: readonly CardFit[] | null;
  /** カードごとの要素の id（captions と同じ順の番号を受け取る） */
  cardId?: (index: number) => string;
  /** カードに重ねる、画面だけの印 */
  badge?: (index: number) => ReactNode;
  /** 各ページの右上に印刷する小さな文字（見本のときの「見本」など） */
  mark?: string;
};

/** 印刷するページをすべて並べる。画面のプレビューと印刷で同じものを使う */
export function Sheets({ template, captions, fits, cardId, badge, mark }: SheetsProps) {
  const { page, grid, card, layout } = template;
  const { paper } = sheetGeometry(template);
  const perPage = cardsPerPage(template);
  const pages = paginate(captions, perPage);

  // 寸法はすべて CSS 変数で print.css に渡す
  const style = {
    "--paper-width": `${paper.width}mm`,
    "--paper-height": `${paper.height}mm`,
    "--page-margin": `${page.margin_mm}mm`,
    "--grid-columns": grid.columns,
    "--grid-rows": grid.rows,
    "--card-border": `${card.border_pt}pt`,
    "--card-padding": `${card.padding_mm}mm`,
    fontFamily: fontFamilyCss(template.font),
  } as CSSProperties;

  return (
    <div className="sheets" style={style}>
      {/* 用紙の向きはテンプレートで変わるので、@page はここで作る。余白は .sheet の padding で取る */}
      <style>{`@page { size: ${page.size} ${page.orientation}; margin: 0; }`}</style>
      {pages.map((captionsOnPage, i) => (
        <section className="sheet" key={i} aria-label={`${i + 1} ページ目`}>
          {mark && <p className="sheet-mark">{mark}</p>}
          <div className="sheet-grid">
            {captionsOnPage.map((caption, j) => {
              const index = i * perPage + j;
              return (
                <Card
                  layout={layout}
                  caption={caption}
                  firstColumn={j % grid.columns === 0}
                  firstRow={j < grid.columns}
                  fit={fits?.[index]}
                  id={cardId?.(index)}
                  badge={badge?.(index)}
                  key={j}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
