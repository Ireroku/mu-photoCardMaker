// 用紙の大きさ（縦向きのときの幅と高さ）
export const PAPER_SIZES_MM = {
  A4: { width: 210, height: 297 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES_MM;
export type Orientation = "landscape" | "portrait";

/** 向きを反映した用紙の大きさ */
export function paperSizeMm(size: PaperSize, orientation: Orientation) {
  const { width, height } = PAPER_SIZES_MM[size];
  return orientation === "landscape" ? { width: height, height: width } : { width, height };
}
