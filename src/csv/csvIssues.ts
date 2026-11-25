import type { LoadedCsv } from "./loadCsvFile";
import type { ColumnMapping } from "./match";

/**
 * 読み込めたが確かめてほしいこと（文字化けの疑い、引用符の閉じ忘れ、同じ見出しの列など）。
 * 1 つが 1 文。手順②の中と、閉じた手順②の 1 行の両方で使う
 */
export function csvIssues(csv: LoadedCsv, mapping: ColumnMapping): string[] {
  const issues: string[] = [];
  if (csv.suspicious) {
    issues.push(
      "文字コードを判別できず、文字化けしているかもしれません。Google フォームから CSV をダウンロードし直し、" +
        "Excel などで開いて保存し直さずに、そのまま読み込んでください。",
    );
  }
  issues.push(...csv.warnings);
  const duplicateHeaders = new Set(mapping.duplicateColumns.map((i) => csv.headers[i]!.trim()));
  for (const header of duplicateHeaders) {
    issues.push(
      `「${header}」という見出しの列が複数あります（フォームで質問を消して作り直すと起きます）。` +
        "左の列から順に見て、空でない値を使います。",
    );
  }
  return issues;
}
