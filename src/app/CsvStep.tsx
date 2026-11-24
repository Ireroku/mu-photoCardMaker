// 手順②：回答の CSV を読み込み、列とテンプレートの項目の対応を確かめる。

import { useEffect, useId, useRef, useState, type ChangeEvent, type Dispatch } from "react";
import {
  columnValues,
  laterDuplicateColumns,
  unusedColumns,
  type ColumnAssignments,
  type ColumnMapping,
} from "../csv/match";
import type { Field } from "../template/schema";
import type { AppAction, LoadedCsv } from "./state";
import { useFileDrop } from "./useFileDrop";

type CsvStepProps = {
  csv: LoadedCsv | null;
  csvRejected: { fileName: string; error: string } | null;
  fields: readonly Field[];
  columns: ColumnAssignments;
  /** 自動の対応付けの結果（App で 1 回だけ求める） */
  autoMapping: ColumnMapping | null;
  /** 確かめてほしいこと（csvIssues） */
  issues: readonly string[];
  cardCount: number;
  skippedCount: number;
  onFiles: (files: readonly File[]) => void;
  dispatch: Dispatch<AppAction>;
};

/** 選択肢に出す回答の例の長さ */
const EXAMPLE_LENGTH = 16;

export function CsvStep(props: CsvStepProps) {
  const { csv, csvRejected, fields, columns, autoMapping, issues, onFiles, dispatch } = props;
  const input = useRef<HTMLInputElement>(null);
  const { isOver, handlers } = useFileDrop(onFiles);

  // 読み込めなかったときは、手順が閉じていても開き、エラーの文にフォーカスを移して読み上げる
  const rejectedMessage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const message = rejectedMessage.current;
    if (!csvRejected || !message) return;
    const step = message.closest("details");
    if (step) step.open = true;
    message.focus({ preventScroll: true });
    message.scrollIntoView({ block: "nearest" });
  }, [csvRejected]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])];
    // 同じファイルを直してもう一度選んだときにも change が起きるよう、選択を空にしておく
    event.currentTarget.value = "";
    if (files.length > 0) onFiles(files);
  }

  return (
    <>
      <div className="dropzone" data-over={isOver || undefined} {...handlers}>
        <button
          type="button"
          className={csv ? undefined : "primary"}
          data-csv-button
          onClick={() => input.current?.click()}
        >
          {csv ? "別の CSV を読み込む" : "CSV を読み込む"}
        </button>
        <p>またはここに CSV ファイルをドラッグ＆ドロップ</p>
        <input
          ref={input}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          hidden
          onChange={pick}
        />
      </div>
      <p className="note">
        読み込んだ CSV はこのブラウザの中だけで使い、インターネットには送りません。
      </p>

      {csvRejected && (
        <div className="message error" role="alert" tabIndex={-1} ref={rejectedMessage}>
          <p>「{csvRejected.fileName}」を読み込めませんでした。</p>
          <p>
            {csvRejected.error}
            {csv && "前に読み込んだ CSV をそのまま使っています。"}
          </p>
        </div>
      )}

      {csv && autoMapping && (
        <>
          <p className="loaded" role="status">
            「{csv.fileName}」から <strong>{props.cardCount}</strong> 枚の札を作りました。
            {props.skippedCount > 0 && ` ${props.skippedCount} 行は空のため除外しました。`}
          </p>
          {issues.length > 0 && (
            <div className="message warning">
              {issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}
          <ColumnMapping
            csv={csv}
            fields={fields}
            columns={columns}
            auto={autoMapping}
            dispatch={dispatch}
          />
        </>
      )}
    </>
  );
}

type ColumnMappingProps = {
  csv: LoadedCsv;
  fields: readonly Field[];
  columns: ColumnAssignments;
  auto: ColumnMapping;
  dispatch: Dispatch<AppAction>;
};

function ColumnMapping({ csv, fields, columns, auto, dispatch }: ColumnMappingProps) {
  // 開いた表は、別の CSV を読み込んだら閉じる（どの CSV で開いたかを覚えておく）
  const [expandedFor, setExpandedFor] = useState<LoadedCsv | null>(null);
  const expanded = expandedFor === csv;
  // 自動で対応しなかった項目。手で選んだあとも表から消えないよう、今の選択ではなく自動の結果で決める
  const unmatched = fields.filter((field) => auto.columns[field.key] === null);

  if (unmatched.length === 0 && !expanded) {
    return (
      <p className="mapping-summary">
        <span>すべての項目に列が対応しました。</span>
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
          ? "テンプレートの項目と、CSV の列の対応です。違っていたら選び直してください。"
          : "次の項目に当たる列が見つかりませんでした。CSV の列から選んでください。"}
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">項目</th>
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
            必須の項目です。列を選ばないと、すべての札でこの項目が空になります。
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
