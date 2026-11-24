import Papa from "papaparse";
import { decodeCsvBytes, type CsvEncoding } from "./decode";

/** 見出しと、見出しを除いた行。行の長さは見出しと同じとは限らない */
export type CsvTable = {
  headers: string[];
  rows: string[][];
};

export type ParsedCsv = CsvTable & {
  encoding: CsvEncoding;
  /** 文字化けの疑いがある（decodeCsvBytes を参照） */
  suspicious: boolean;
  /** 読めたが確かめてほしいこと（引用符の閉じ忘れなど）。画面にそのまま出せる日本語の文 */
  warnings: string[];
};

export type ParseCsvResult = { ok: true; csv: ParsedCsv } | { ok: false; error: string };

/**
 * CSV のバイト列を、見出しと行に分ける。
 *
 * - 文字コードは decodeCsvBytes が判別する
 * - 区切り文字は Papa Parse に判別させる（Excel の「Unicode テキスト」はタブ区切りになるため、カンマに固定しない）
 * - 中身のない行（空白だけの行や、カンマだけの行）は飛ばす
 */
export function parseCsvBytes(bytes: Uint8Array): ParseCsvResult {
  const { text, encoding, suspicious } = decodeCsvBytes(bytes);
  const { data, errors } = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", "\t"],
  });
  const [headers, ...rows] = data;
  if (headers === undefined) {
    return { ok: false, error: "ファイルが空です。回答をダウンロードした CSV を選んでください。" };
  }
  // 区切り文字を判別できない（列が 1 つだけの）ときも、カンマ区切りとして読めているので知らせない
  const warnings = errors
    .filter((error) => error.type === "Quotes")
    .map(
      (error) =>
        `${error.row === undefined ? "" : `${error.row + 1} 行目（見出しを 1 行目として数えます）の付近で、`}` +
        '引用符（"）が閉じていません。その行から後ろの値がずれているかもしれません。',
    );
  return { ok: true, csv: { headers, rows, encoding, suspicious, warnings } };
}
