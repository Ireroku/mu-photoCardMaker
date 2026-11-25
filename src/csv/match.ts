import { normalizeLabel } from "../shared/normalize";

/** 対応付けに使うフィールドの最小限の形。テンプレートの fields[] がこの形を満たせばよい */
export type FieldLike = {
  key: string;
  label: string;
};

/** フィールドの key ごとに、対応する列の番号（0 始まり）。見つからなければ null */
export type ColumnAssignments = Record<string, number | null>;

export type ColumnMapping = {
  columns: ColumnAssignments;
  /** Google フォームが自動で付ける列として、最初から無視した列の番号 */
  ignoredColumns: number[];
  /**
   * 同じ見出しが前の列にもあった列の番号。対応付けには先に出た列の番号を使い、
   * applyMapping が同じ見出しの列をまとめて読む（左から見て最初に空でない値を使う）
   */
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
    }
  });

  return { columns, ignoredColumns, duplicateColumns };
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
  /** captions のそれぞれが、入力の rows の何番目の行から来たか */
  rowIndexes: number[];
  /** 対応付けた列がすべて空だったため飛ばした行の番号（入力の rows の添字） */
  skippedRows: number[];
};

/**
 * 見出しを除いた CSV の行を、1 行 1 枚のキャプションにする。
 *
 * - 値の前後の空白は削る。対応付けた列がすべて空の行は飛ばす
 * - 対応付けた列と同じ見出しの列がほかにもあれば、左の列から順に見て、最初に空でない値を使う。
 *   Google フォームで質問を消して同じ名前で作り直すと、同じ見出しの列が 2 つでき、
 *   回答が新しい列（左）と古い列（右）に分かれるため
 */
export function applyMapping(table: Table, columns: ColumnAssignments): AppliedRows {
  const groups = sameHeaderGroups(table.headers);
  const entries = Object.entries(columns).map(
    ([key, index]) => [key, index === null ? [] : (groups.get(index) ?? [index])] as const,
  );
  const captions: Record<string, string>[] = [];
  const rowIndexes: number[] = [];
  const skippedRows: number[] = [];
  table.rows.forEach((row, rowIndex) => {
    const caption = Object.fromEntries(
      entries.map(([key, indexes]) => [key, firstNonEmpty(row, indexes)]),
    );
    if (Object.values(caption).some((value) => value !== "")) {
      captions.push(caption);
      rowIndexes.push(rowIndex);
    } else {
      skippedRows.push(rowIndex);
    }
  });
  return { captions, rowIndexes, skippedRows };
}

type Table = { headers: readonly string[]; rows: readonly (readonly string[])[] };

/**
 * 1 つの列の、行ごとの値。applyMapping と同じく、同じ見出しの列をまとめて左から見る。
 * 並び順の列で並べ替えるときなどに使う
 */
export function columnValues(table: Table, column: number): string[] {
  const indexes = sameHeaderGroups(table.headers).get(column) ?? [column];
  return table.rows.map((row) => firstNonEmpty(row, indexes));
}

/**
 * 左にも同じ見出し（正規化して比べる）の列がある列の番号。
 * こうした列は左の列とまとめて読むので、列を選ぶ画面には出さない
 */
export function laterDuplicateColumns(headers: readonly string[]): Set<number> {
  const later = new Set<number>();
  for (const group of new Set(sameHeaderGroups(headers).values())) {
    for (const index of group.slice(1)) later.add(index);
  }
  return later;
}

/** 列の番号 → 同じ見出し（正規化して比べる）の列の番号を左から並べたもの。空の見出しはまとめない */
function sameHeaderGroups(headers: readonly string[]): Map<number, number[]> {
  const byLabel = new Map<string, number[]>();
  headers.forEach((header, index) => {
    const label = normalizeLabel(header);
    if (label === "") return;
    const group = byLabel.get(label);
    if (group) group.push(index);
    else byLabel.set(label, [index]);
  });
  const groups = new Map<number, number[]>();
  for (const group of byLabel.values()) for (const index of group) groups.set(index, group);
  return groups;
}

function firstNonEmpty(row: readonly string[], indexes: readonly number[]): string {
  for (const index of indexes) {
    const value = (row[index] ?? "").trim();
    if (value !== "") return value;
  }
  return "";
}
