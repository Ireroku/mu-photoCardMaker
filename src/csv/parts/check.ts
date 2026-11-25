// 読み込む前と読み込んだ直後の確かめ。ここで断ったファイルは使わず、今の CSV と並び順をそのまま残す。

import { MAX_CSV_BYTES } from "../../settings";
import { matchColumns, type FieldLike } from "../match";
import type { ParsedCsv } from "./parse";

/** 受け付ける拡張子（小文字） */
export const CSV_EXTENSIONS = [".csv", ".tsv", ".txt"] as const;

/** ファイルの名前と大きさを確かめる。問題があれば理由の文、なければ null */
export function checkCsvFile(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (!CSV_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `CSV ファイル（${CSV_EXTENSIONS.join("、")}）を選んでください。`;
  }
  if (file.size > MAX_CSV_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `ファイルが大きすぎます（${mb} MB）。${MAX_CSV_BYTES / 1024 / 1024} MB までの CSV を選んでください。`;
  }
  return null;
}

/** 文字化けしたときの直し方。読み込めたときの警告と、断るときのエラーの両方で使う */
export const REDOWNLOAD_ADVICE =
  "Google フォームから CSV をダウンロードし直し、Excel などで開いて保存し直さずに、そのまま読み込んでください。";

/**
 * 読み込んだ中身を確かめる。文字化けの疑いがあり、しかもどの見出しも項目に当たらないときは、
 * 違うファイルか、読めない文字コードとみなして断る
 */
export function checkParsedCsv(csv: ParsedCsv, fields: readonly FieldLike[]): string | null {
  if (!csv.suspicious) return null;
  const { columns } = matchColumns(csv.headers, fields);
  if (Object.values(columns).some((column) => column !== null)) return null;
  return `文字化けしていて、見出しを読み取れませんでした。${REDOWNLOAD_ADVICE}`;
}
