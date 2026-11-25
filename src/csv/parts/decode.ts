export type CsvEncoding = "utf-8" | "utf-16le" | "utf-16be" | "shift_jis";

export type DecodedCsv = {
  text: string;
  encoding: CsvEncoding;
  /**
   * 文字化けの疑いがあるか。Shift_JIS として読み直した結果に
   * 置換文字（U+FFFD）や NUL（U+0000）が含まれていれば true。
   * 画面で「文字コードを判別できませんでした」と出すために使う。
   */
  suspicious: boolean;
};

/** BOM で判別できる UTF-16。TextDecoder が BOM を取り除く */
function sniffUtf16(bytes: Uint8Array): "utf-16le" | "utf-16be" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";
  return null;
}

/**
 * CSV のバイト列を文字列にする。
 *
 * Google フォームの CSV は UTF-8 だが、Excel で保存し直すと Shift_JIS（CP932）や
 * UTF-16（「Unicode テキスト」形式）になることがある。
 * BOM で UTF-16 を判別し、次に UTF-8 として厳密に読み、壊れていれば Shift_JIS として読み直す。
 * 先頭の BOM は TextDecoder が既定（ignoreBOM: false）で取り除く。
 */
export function decodeCsvBytes(bytes: Uint8Array): DecodedCsv {
  const utf16 = sniffUtf16(bytes);
  if (utf16 !== null) {
    return { text: new TextDecoder(utf16).decode(bytes), encoding: utf16, suspicious: false };
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text, encoding: "utf-8", suspicious: false };
  } catch {
    // WHATWG の shift_jis は CP932（Windows の拡張文字を含む）として読む
    const text = new TextDecoder("shift_jis").decode(bytes);
    return {
      text,
      encoding: "shift_jis",
      suspicious: text.includes("\uFFFD") || text.includes("\u0000"),
    };
  }
}
