// 同梱するフォントの一覧。テンプレート JSON の "font" には、ここの id を書く。
//
// フォントを足す手順（例：@fontsource/kosugi-maru）:
//   1. npm install @fontsource/kosugi-maru
//   2. このファイルの下に import を 2 行足す（"@fontsource/kosugi-maru/400.css" と ".../700.css"）。
//      パッケージに 700 がなければ 400 だけでよい（太字はブラウザが擬似的に作る）
//   3. FONTS に 1 項目を足す。family は node_modules/@fontsource/kosugi-maru/400.css の
//      font-family と同じ名前にする。キー（id）がテンプレート JSON の "font" に書く値になる
//   4. node_modules/@fontsource/kosugi-maru/LICENSE を public/licenses/OFL-kosugi-maru.txt にコピーする
//      （OFL はフォントといっしょにライセンス文を配ることを求めている）
//
// 太さは 400（標準）と 700（太字）だけを読み込む。
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/zen-maru-gothic/400.css";
import "@fontsource/zen-maru-gothic/700.css";

export type FontInfo = {
  /** CSS の font-family。@fontsource の CSS が定義する名前と同じにする */
  family: string;
};

export const FONTS = {
  "noto-sans-jp": { family: "'Noto Sans JP'" },
  "zen-maru-gothic": { family: "'Zen Maru Gothic'" },
} as const satisfies Record<string, FontInfo>;

export type FontId = keyof typeof FONTS;

export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]];

/** フォントが読み込めなかったときにも文字が出るよう、OS のゴシック体を後ろに付ける */
export function fontFamilyCss(id: FontId): string {
  return `${FONTS[id].family}, sans-serif`;
}
