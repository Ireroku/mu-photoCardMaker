import type { ReactNode } from "react";
import type { Template } from "../template/schema";
import type { CardFit } from "./autoFit";
import { Card } from "./parts/Card";
import { cardsPerPage, paginate, type Caption } from "./geometry";
import { sheetStyle } from "./parts/sheetStyle";
import "./parts/sheets.css";

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
  const { page, grid, layout } = template;
  const perPage = cardsPerPage(template);
  const pages = paginate(captions, perPage);

  return (
    <div className="sheets" style={sheetStyle(template)}>
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
