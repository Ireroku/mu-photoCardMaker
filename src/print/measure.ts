// canvas で文字の幅を測る（ブラウザの中だけで使う）。
//
// 注意:
// - 先に ensureFontLoaded でフォントを読み込んでおくこと。読み込む前に測ると、代わりのフォントの幅になる
// - canvas は CSS の letter-spacing や font-feature-settings（palt など）を反映しない。
//   カードの文字にそれらを足したら、この測り方は合わなくなる
// - DOM の描画とは小数点以下でずれることがある。呼び出し側で幅に少し余裕（0.5 mm ほど）を持たせる
// - 画面のプレビューの zoom には影響されない（canvas は CSS の大きさそのままで測る）

const MM_PER_PX = 25.4 / 96;

export type FontSpec = {
  /** CSS の font-family（例：fontFamilyCss(template.font)） */
  family: string;
  /** 400 か 700 */
  weight: number;
};

let context: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D {
  context ??= document.createElement("canvas").getContext("2d");
  if (context === null) throw new Error("canvas が使えません");
  return context;
}

/** 文字の幅（mm）を測る */
export function measureTextMm(text: string, font: FontSpec, sizePt: number): number {
  const ctx = getContext();
  ctx.font = `${font.weight} ${sizePt}pt ${font.family}`;
  return ctx.measureText(text).width * MM_PER_PX;
}

/** fitFontSize の measure に渡す形にする */
export function textMeasurer(text: string, font: FontSpec): (pt: number) => number {
  return (pt) => measureTextMm(text, font, pt);
}

/**
 * 文字を描くのに要るフォントを読み込む。読み込めたら true。
 * @fontsource は文字の範囲ごとにファイルが分かれているので、実際に測る文字を text に渡すこと
 */
export async function ensureFontLoaded(font: FontSpec, text: string): Promise<boolean> {
  const faces = await document.fonts.load(`${font.weight} 16px ${font.family}`, text);
  return faces.length > 0;
}
