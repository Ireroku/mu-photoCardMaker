// 手順②：回答の CSV を読み込み、列とフォームの質問の対応を確かめる。

import { useEffect, useRef, type Dispatch } from "react";
import type { LoadedCsv } from "../../csv/loadCsvFile";
import type { ColumnAssignments, ColumnMapping as AutoMapping } from "../../csv/match";
import { useFileDrop } from "../../shared/useFileDrop";
import { takePickedFiles } from "../../shared/takePickedFiles";
import type { AppAction } from "../../state/state";
import type { Field } from "../../template/schema";
import { ColumnMapping } from "./parts/ColumnMapping";
import "./parts/load.css";

type LoadStepProps = {
  csv: LoadedCsv | null;
  csvRejected: { fileName: string; error: string } | null;
  fields: readonly Field[];
  columns: ColumnAssignments;
  /** 自動の対応付けの結果（App で 1 回だけ求める） */
  autoMapping: AutoMapping | null;
  /** 確かめてほしいこと（csvIssues） */
  issues: readonly string[];
  cardCount: number;
  skippedCount: number;
  onFiles: (files: readonly File[]) => void;
  dispatch: Dispatch<AppAction>;
};

export function LoadStep(props: LoadStepProps) {
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
          onChange={(event) => {
            const files = takePickedFiles(event);
            if (files.length > 0) onFiles(files);
          }}
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
            「{csv.fileName}」からカードを <strong>{props.cardCount}</strong> 枚作りました。
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
