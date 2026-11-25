// カードごとに、文字の項目の大きさを決める（文字の自動縮小）。
// 幅の測り方は measure として外から渡すので、ここは純粋な計算だけを持つ（ブラウザでは measure.ts を使う）。

import { FIT_SAFETY_MM } from "../settings";
import { MM_PER_PT } from "../shared/units";
import type { LayoutEntry, SectionItem, Template, TextItem } from "../template/schema";
import { sheetGeometry, type Caption } from "./geometry";
import { fitFontSize, resolveMinPt, type FitResult } from "./parts/fit";

export { resolveMinPt };

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

/** カードの文字の行の高さ（文字の大きさに対する倍率）。描画（parts/Card.tsx）と高さの計算の両方で使う */
export const TEXT_LINE_HEIGHT = 1.3;

/** カードの中で文字を置ける場所の大きさ（mm） */
export type TextBox = {
  /** 文字を置ける幅 */
  width: number;
  /** 段 1 つ分の高さ。段は、区切り線を除いた残りの高さを等分する */
  sectionHeight: number;
};

/**
 * カードの中で文字を置ける場所の大きさ。
 * 上下左右の罫線（端の列や行は両側に引くので、多いほうの 2 本で見る）と padding を除き、さらに少し余裕を取る
 */
export function textBoxMm(template: Pick<Template, "page" | "grid" | "card" | "layout">): TextBox {
  const { card } = sheetGeometry(template);
  const { padding_mm, border_pt } = template.card;
  const inset = padding_mm * 2 + border_pt * MM_PER_PT * 2 + FIT_SAFETY_MM;
  const lines = template.layout.filter((entry) => entry.kind === "line");
  const sectionCount = template.layout.length - lines.length;
  const linesHeight = lines.reduce((sum, line) => sum + line.thickness_pt * MM_PER_PT, 0);
  return {
    width: card.width - inset,
    sectionHeight: sectionCount === 0 ? 0 : (card.height - inset - linesHeight) / sectionCount,
  };
}

/** 1 項目分の結果。lines は使う行の数 */
export type TextFit = FitResult & { lines: number };

/** 1 枚分の結果。空の項目は入らない */
export type CardFit = Partial<Record<TextItemId, TextFit>>;

/** 文字・項目・大きさ（pt）を渡すと、幅（mm）を返す */
export type TextMeasure = (text: string, item: TextItem, sizePt: number) => number;

/**
 * 1 項目の大きさと行の数を決める。
 * まず 1 行のまま min_size_pt まで縮め、それでも収まらなければ、その大きさのまま max_lines まで折り返す。
 * 縮める前に折り返すと、少しだけ長い文字が大きいまま 2 行になり、カードごとに大きさがばらつくため
 */
function fitText(item: TextItem, text: string, widthMm: number, measure: TextMeasure): TextFit {
  const minPt = resolveMinPt(item);
  const single = fitFontSize({
    preferredPt: item.size_pt,
    minPt,
    availableWidthMm: widthMm,
    measure: (pt) => measure(text, item, pt),
  });
  const maxLines = item.max_lines ?? 1;
  if (!single.overflow || maxLines === 1) return { ...single, lines: 1 };
  const textWidth = measure(text, item, minPt);
  // 行の終わりで折り返すと、1 文字分ほど空くことがあるので、その分を見込む
  const charWidth = minPt * MM_PER_PT;
  for (let lines = 2; lines <= maxLines; lines++) {
    if (textWidth <= widthMm * lines - charWidth * (lines - 1)) {
      return { sizePt: minPt, overflow: false, lines };
    }
  }
  return { sizePt: minPt, overflow: true, lines: maxLines };
}

/** 段の中身の高さ（mm）。空の項目も 1 行分の高さを取る（parts/Card.tsx と同じ） */
function sectionContentHeight(
  items: readonly SectionItem[],
  fitOf: (j: number) => TextFit | undefined,
) {
  return items.reduce((sum, item, j) => {
    if (item.kind === "line") return sum + item.thickness_pt * MM_PER_PT;
    const fit = fitOf(j);
    const sizePt = fit?.sizePt ?? item.size_pt;
    return sum + sizePt * MM_PER_PT * TEXT_LINE_HEIGHT * (fit?.lines ?? 1);
  }, 0);
}

/** すべてのカードについて、文字の項目ごとの大きさと行の数を決める */
export function fitCards(
  layout: readonly LayoutEntry[],
  captions: readonly Caption[],
  box: TextBox,
  measure: TextMeasure,
): CardFit[] {
  return captions.map((caption) => {
    const fit: CardFit = {};
    layout.forEach((entry, i) => {
      if (entry.kind !== "section") return;
      entry.items.forEach((item, j) => {
        if (item.kind !== "text") return;
        const text = captionText(caption, item.field);
        if (text !== "") fit[textItemId(i, j)] = fitText(item, text, box.width, measure);
      });
      // 折り返した段だけ高さを確かめる。入らなければ、折り返した項目の下が切れるので「収まらない」にする
      const fitOf = (j: number) => fit[textItemId(i, j)];
      const wrapped = entry.items.some((_, j) => (fitOf(j)?.lines ?? 1) > 1);
      if (!wrapped || sectionContentHeight(entry.items, fitOf) <= box.sectionHeight) return;
      entry.items.forEach((_, j) => {
        const result = fitOf(j);
        if (result && result.lines > 1) fit[textItemId(i, j)] = { ...result, overflow: true };
      });
    });
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
