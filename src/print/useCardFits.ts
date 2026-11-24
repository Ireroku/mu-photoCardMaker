import { useEffect, useState } from "react";
import { fontFamilyCss } from "../fonts/fonts";
import type { Template } from "../template/schema";
import { captionText, fitCards, textItems, textWidthMm, type CardFit } from "./autoFit";
import type { Caption } from "./geometry";
import { ensureFontLoaded, measureTextMm, type FontSpec } from "./measure";

export type CardFits = {
  /** captions と同じ順の結果。まだ一度も測れていなければ null（カードは元の大きさで描く） */
  fits: readonly CardFit[] | null;
  /** 今のテンプレートとキャプションで測り終えている。印刷はこれが true になってから */
  ready: boolean;
  /** 測るのに失敗した（カードは元の大きさで描き、はみ出した分は「…」になる） */
  failed: boolean;
};

type Computed = {
  template: Template;
  captions: readonly Caption[];
  fontsVersion: number;
  fits: CardFit[] | null;
};

/**
 * カードごとの文字の大きさを、フォントを読み込んでから canvas で測って決める。
 * 余白などを変えて測り直している間は、layout とキャプションが同じなら前の結果を返し、ちらつきを防ぐ。
 * あとからフォントが読み込まれたら（document.fonts の loadingdone）、測り直す
 */
export function useCardFits(template: Template, captions: readonly Caption[]): CardFits {
  const [computed, setComputed] = useState<Computed | null>(null);
  const [fontsVersion, setFontsVersion] = useState(0);

  useEffect(() => {
    const remeasure = () => setFontsVersion((n) => n + 1);
    document.fonts.addEventListener("loadingdone", remeasure);
    return () => document.fonts.removeEventListener("loadingdone", remeasure);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const family = fontFamilyCss(template.font);
    const fontOf = (bold: boolean | undefined): FontSpec => ({ family, weight: bold ? 700 : 400 });
    const measure = async (): Promise<CardFit[]> => {
      // @fontsource は文字の範囲ごとにファイルが分かれているので、実際に測る文字を渡して読み込む
      const textByWeight = new Map<number, string>();
      for (const { item } of textItems(template.layout)) {
        const weight = fontOf(item.bold).weight;
        const text = captions.map((caption) => captionText(caption, item.field)).join("");
        textByWeight.set(weight, (textByWeight.get(weight) ?? "") + text);
      }
      // 読み込めなくても測る（代わりのフォントの幅になるが、何もしないよりよい）
      await Promise.all(
        [...textByWeight].map(([weight, text]) =>
          ensureFontLoaded({ family, weight }, text).catch(() => false),
        ),
      );
      return fitCards(template.layout, captions, textWidthMm(template), (text, item, pt) =>
        measureTextMm(text, fontOf(item.bold), pt),
      );
    };
    measure().then(
      (fits) => {
        if (!cancelled) setComputed({ template, captions, fontsVersion, fits });
      },
      (error: unknown) => {
        console.error("文字の自動縮小ができませんでした", error);
        if (!cancelled) setComputed({ template, captions, fontsVersion, fits: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [template, captions, fontsVersion]);

  const reusable =
    computed !== null &&
    computed.captions === captions &&
    computed.template.layout === template.layout &&
    computed.template.font === template.font;
  return {
    fits: reusable ? computed.fits : null,
    ready: reusable && computed.template === template,
    failed: reusable && computed.fits === null,
  };
}
