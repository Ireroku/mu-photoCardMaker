// 手順③の、フォームの質問と CSV の列の対応の表。

import { useId, useState, type Dispatch } from "react";
import type { LoadedCsv } from "../../../csv/loadCsvFile";
import {
  columnValues,
  laterDuplicateColumns,
  unusedColumns,
  type ColumnAssignments,
  type ColumnMapping,
} from "../../../csv/match";
import { EXAMPLE_LENGTH } from "../../../settings";
import type { AppAction } from "../../../state/state";
import type { Field } from "../../../template/schema";

type ColumnMappingProps = {
  csv: LoadedCsv;
  fields: readonly Field[];
  columns: ColumnAssignments;
  auto: ColumnMapping;
  dispatch: Dispatch<AppAction>;
};

export function ColumnMapping({ csv, fields, columns, auto, dispatch }: ColumnMappingProps) {
  // 開いた表は、別の CSV を読み込んだら閉じる（どの CSV で開いたかを覚えておく）
  const [expandedFor, setExpandedFor] = useState<LoadedCsv | null>(null);
  const expanded = expandedFor === csv;
  // 自動で対応しなかった項目。手で選んだあとも表から消えないよう、今の選択ではなく自動の結果で決める
  const unmatched = fields.filter((field) => auto.columns[field.key] === null);

  if (unmatched.length === 0 && !expanded) {
    return (
      <p className="mapping-summary">
        <span>すべての質問に列が対応しました。</span>
        <button type="button" className="link" onClick={() => setExpandedFor(csv)}>
          対応を確認
        </button>
      </p>
    );
  }

  const shown = expanded ? fields : unmatched;
  // 同じ見出しの列は左の列とまとめて読むので、選択肢には左の列だけを出し、例もまとめた値から取る
  const hiddenColumns = laterDuplicateColumns(csv.headers);
  const examples = csv.headers.map((_, i) => columnValues(csv, i).find((v) => v !== "") ?? "");
  return (
    <div className="mapping">
      <p>
        {expanded
          ? "フォームの質問と、CSV の列の対応です。違っていたら選び直してください。"
          : "次の質問に当たる列が見つかりませんでした。CSV の列から選んでください。"}
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">質問</th>
            <th scope="col">CSV の列</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((field) => (
            <MappingRow
              key={field.key}
              field={field}
              csv={csv}
              columns={columns}
              hiddenColumns={[...auto.ignoredColumns, ...hiddenColumns]}
              examples={examples}
              dispatch={dispatch}
            />
          ))}
        </tbody>
      </table>
      {expanded && (
        <button type="button" className="link" onClick={() => setExpandedFor(null)}>
          閉じる
        </button>
      )}
    </div>
  );
}

function MappingRow({
  field,
  csv,
  columns,
  hiddenColumns,
  examples,
  dispatch,
}: {
  field: Field;
  csv: LoadedCsv;
  columns: ColumnAssignments;
  /** 選択肢に出さない列（自動で付く列と、左に同じ見出しがある列） */
  hiddenColumns: readonly number[];
  examples: readonly string[];
  dispatch: Dispatch<AppAction>;
}) {
  const id = useId();
  const current = columns[field.key] ?? null;
  // 選べるのは、ほかの項目に使っていない列と、今この項目に選んでいる列
  const choices = unusedColumns(csv.headers.length, columns, hiddenColumns);
  if (current !== null && !choices.includes(current)) choices.push(current);
  choices.sort((a, b) => a - b);
  const missing = current === null && field.required;
  return (
    <tr data-missing={missing || undefined}>
      <th scope="row">
        <label htmlFor={id}>{field.label}</label>
        {field.required && <span className="required">必須</span>}
      </th>
      <td>
        <select
          id={id}
          value={current ?? ""}
          aria-invalid={missing || undefined}
          aria-describedby={missing ? `${id}-missing` : undefined}
          onChange={(event) => {
            const value = event.currentTarget.value;
            dispatch({
              type: "columnAssigned",
              key: field.key,
              column: value === "" ? null : Number(value),
            });
          }}
        >
          <option value="">（使わない）</option>
          {choices.map((i) => (
            <option key={i} value={i}>
              {columnLabel(csv.headers[i] ?? "", examples[i] ?? "")}
            </option>
          ))}
        </select>
        {missing && (
          <p className="field-error" id={`${id}-missing`}>
            必須の質問です。列を選ばないと、すべてのカードでここが空になります。
          </p>
        )}
      </td>
    </tr>
  );
}

function columnLabel(header: string, example: string): string {
  const name = header.trim() || "（見出しなし）";
  if (example === "") return `${name}（回答なし）`;
  const short = example.length > EXAMPLE_LENGTH ? `${example.slice(0, EXAMPLE_LENGTH)}…` : example;
  return `${name}（例：${short}）`;
}
