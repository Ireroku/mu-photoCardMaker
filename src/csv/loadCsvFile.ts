// 選ばれたファイルから CSV を読み込む。確かめに通らなかったときは、理由の文を返す。

import type { FieldLike } from "./match";
import { checkCsvFile, checkParsedCsv } from "./parts/check";
import { parseCsvBytes, type ParsedCsv } from "./parts/parse";

/** 読み込んだ CSV と、そのファイルの名前 */
export type LoadedCsv = ParsedCsv & { fileName: string };

export type LoadCsvResult =
  { ok: true; csv: LoadedCsv } | { ok: false; fileName: string; error: string };

/**
 * 最初のファイルを CSV として読み込む。ファイルが 1 つもなければ null。
 * 複数のファイルが選ばれたときは、最初のものだけを使い、そのことを警告（またはエラーの文）に足す
 */
export async function loadCsvFile(
  files: readonly File[],
  fields: readonly FieldLike[],
): Promise<LoadCsvResult | null> {
  const file = files[0];
  if (!file) return null;
  const extra =
    files.length > 1
      ? [`${files.length} 個のファイルが選ばれたので、最初の「${file.name}」だけを読み込みました。`]
      : [];
  const reject = (error: string): LoadCsvResult => ({
    ok: false,
    fileName: file.name,
    error: [error, ...extra].join(" "),
  });

  const fileProblem = checkCsvFile(file);
  if (fileProblem) return reject(fileProblem);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return reject(`ファイルを開けませんでした（詳細: ${detail}）。`);
  }
  const result = parseCsvBytes(bytes);
  if (!result.ok) return reject(result.error);
  const contentProblem = checkParsedCsv(result.csv, fields);
  if (contentProblem) return reject(contentProblem);
  return {
    ok: true,
    csv: { ...result.csv, warnings: [...extra, ...result.csv.warnings], fileName: file.name },
  };
}
