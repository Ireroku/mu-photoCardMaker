// カードごとに、文字の項目の大きさを決める（文字の自動縮小）。
// 幅の測り方は measure として外から渡すので、ここは純粋な計算だけを持つ（ブラウザでは measure.ts を使う）。

import { FIT_SAFETY_MM } from "../settings";
import { MM_PER_PT } from "../shared/units";
import type { LayoutEntry, Template, TextItem } from "../template/schema";
import { sheetGeometry, type Caption } from "./geometry";
import { fitFontSize, resolveMinPt, type FitResult } from "./parts/fit";

/** layout の中の文字の項目を指す名前。「段の番号.段の中の番号」 */
export type TextItemId = `${number}.${number}`;

export function textItemId(entryIndex: number, itemIndex: number): TextItemId {
  return `${entryIndex}.${itemIndex}`;
}

/** layout の中の文字の項目を、上から順にすべて返す */
export function textItems(layout: readonly LayoutEntry[]): { id: TextItemId; item: TextItem }[] {
  return layout.flatMap((entry, i) =>
    entry.kind === "section"
      ? entry.items.flatMap((item, j) =>
          item.kind === "text" ? [{ id: textItemId(i, j), item }] : [],
        )
      : [],
  );
}

/**
 * カードの中で文字を置ける幅（mm）。
 * 左右の罫線（左端の列は両側に引くので、多いほうの 2 本で見る）と padding を除き、さらに少し余裕を取る
 */
export function textWidthMm(template: Pick<Template, "page" | "grid" | "card">): number {
  const { card } = sheetGeometry(template);
  const { padding_mm, border_pt } = template.card;
  return card.width - padding_mm * 2 - border_pt * MM_PER_PT * 2 - FIT_SAFETY_MM;
}

/** 1 枚分の結果。空の項目は入らない */
export type CardFit = Partial<Record<TextItemId, FitResult>>;

/** 文字・項目・大きさ（pt）を渡すと、幅（mm）を返す */
export type TextMeasure = (text: string, item: TextItem, sizePt: number) => number;

/** すべてのカードについて、文字の項目ごとの大きさを決める */
export function fitCards(
  layout: readonly LayoutEntry[],
  captions: readonly Caption[],
  availableWidthMm: number,
  measure: TextMeasure,
): CardFit[] {
  const items = textItems(layout);
  return captions.map((caption) => {
    const fit: CardFit = {};
    for (const { id, item } of items) {
      const text = captionText(caption, item.field);
      if (text === "") continue;
      fit[id] = fitFontSize({
        preferredPt: item.size_pt,
        minPt: resolveMinPt(item),
        availableWidthMm,
        measure: (pt) => measure(text, item, pt),
      });
    }
    return fit;
  });
}

/** 最小の大きさでも収まらない項目があるか */
export function hasOverflow(fit: CardFit | undefined): boolean {
  return fit !== undefined && Object.values(fit).some((result) => result?.overflow);
}

/** キャプションの値。"constructor" などで Object.prototype の値を拾わないよう、自分のキーだけを見る */
export function captionText(caption: Caption, field: string): string {
  return Object.hasOwn(caption, field) ? (caption[field] ?? "") : "";
}
