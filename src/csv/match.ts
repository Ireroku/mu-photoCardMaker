import { normalizeLabel } from "./normalize";

/** 対応付けに使うフィールドの最小限の形。テンプレートの fields[] がこの形を満たせばよい */
export type FieldLike = {
  key: string;
  label: string;
};

/** フィールドの key ごとに、対応する列の番号（0 始まり）。見つからなければ null */
export type ColumnAssignments = Record<string, number | null>;

export type ColumnMapping = {
  columns: ColumnAssignments;
  /** どのフィールドにも対応しなかった列の番号（無視した列と重複した列は含まない） */
  unmatchedColumns: number[];
  /** Google フォームが自動で付ける列として、最初から無視した列の番号 */
  ignoredColumns: number[];
  /** 同じ見出しが前の列にもあったため使わなかった列の番号（先に出た列を使う） */
  duplicateColumns: number[];
};

/** Google フォームが自動で付ける列の見出し。正規化してから比べる */
const AUTO_GENERATED_HEADERS = new Set(
  ["タイムスタンプ", "メールアドレス", "スコア", "Timestamp", "Email Address", "Score"].map(
    normalizeLabel,
  ),
);

/**
 * CSV の見出しとテンプレートのフィールドを、正規化した見出しの一致で対応付ける。
 * フィールドの label との一致を先に調べるので、「メールアドレス」という名前のフィールドも対応付く。
 * 同じ label のフィールドが複数あれば、先のフィールドだけが列を得る。
 */
export function matchColumns(
  headers: readonly string[],
  fields: readonly FieldLike[],
): ColumnMapping {
  const keyByLabel = new Map<string, string>();
  for (const field of fields) {
    const label = normalizeLabel(field.label);
    if (label !== "" && !keyByLabel.has(label)) keyByLabel.set(label, field.key);
  }

  const columns: ColumnAssignments = Object.fromEntries(fields.map((field) => [field.key, null]));
  const unmatchedColumns: number[] = [];
  const ignoredColumns: number[] = [];
  const duplicateColumns: number[] = [];

  headers.forEach((header, index) => {
    const label = normalizeLabel(header);
    const key = keyByLabel.get(label);
    if (key !== undefined) {
      if (columns[key] === null) columns[key] = index;
      else duplicateColumns.push(index);
    } else if (AUTO_GENERATED_HEADERS.has(label)) {
      ignoredColumns.push(index);
    } else {
      unmatchedColumns.push(index);
    }
  });

  return { columns, unmatchedColumns, ignoredColumns, duplicateColumns };
}

/**
 * どのフィールドにも割り当てられておらず、無視もしていない列の番号。
 * 手で対応付けを変えたあと、選択肢に出す列を求めるのに使う。
 */
export function unusedColumns(
  headerCount: number,
  columns: ColumnAssignments,
  ignoredColumns: readonly number[],
): number[] {
  const taken = new Set<number | null>([...Object.values(columns), ...ignoredColumns]);
  return Array.from({ length: headerCount }, (_, index) => index).filter(
    (index) => !taken.has(index),
  );
}

export type AppliedRows = {
  /** 1 行 1 枚のキャプション（key → 値） */
  captions: Record<string, string>[];
  /** 対応付けた列がすべて空だったため飛ばした行の番号（入力の rows の添字） */
  skippedRows: number[];
};

/**
 * 見出しを除いた CSV の行を、1 行 1 枚のキャプションにする。
 * 値の前後の空白は削る。対応付けた列がすべて空の行は飛ばす。
 */
export function applyMapping(
  rows: readonly (readonly string[])[],
  mapping: Pick<ColumnMapping, "columns">,
): AppliedRows {
  const entries = Object.entries(mapping.columns);
  const captions: Record<string, string>[] = [];
  const skippedRows: number[] = [];
  rows.forEach((row, rowIndex) => {
    const caption = Object.fromEntries(
      entries.map(([key, index]) => [key, index === null ? "" : (row[index] ?? "").trim()]),
    );
    if (Object.values(caption).some((value) => value !== "")) captions.push(caption);
    else skippedRows.push(rowIndex);
  });
  return { captions, skippedRows };
}
