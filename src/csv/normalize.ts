/** 見た目に出ない文字（ゼロ幅スペース、ゼロ幅接合子、Word Joiner、BOM） */
// 文字クラスにすると ZWJ が前後と結合して見えるため、選択（|）で書く
const ZERO_WIDTH_CHARS = /\u200B|\u200C|\u200D|\u2060|\uFEFF/gu;

/**
 * 見出し（CSV の列名やフィールドの label）を比べるための正規化。
 *
 * - ゼロ幅の文字を取り除く（コピー＆ペーストで紛れ込むことがある）
 * - NFKC で全角英数・半角カナ・全角かっこなどをそろえる
 * - 空白（全角スペース U+3000 を含む）の連続を 1 つの半角スペースにまとめ、前後を削る
 * - 末尾の必須マーク（"*" や "＊"）を削る
 * - 英字は小文字にそろえる（"Email Address" と "email address" を同じに扱う）
 */
export function normalizeLabel(label: string): string {
  return label
    .replace(ZERO_WIDTH_CHARS, "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/(?:\s*\*)+$/u, "")
    .trim()
    .toLowerCase();
}
