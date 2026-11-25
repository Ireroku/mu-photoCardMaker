import type { ReactNode } from "react";

type StepProps = {
  id: string;
  number: number;
  title: string;
  /** 閉じているときにも見せる、1 行の状態（「読み込み済み：…」など） */
  status?: ReactNode;
  /** 最初に開いておくか。この値が変わったときだけ開け閉めが切り替わり、それ以外は利用者が自由に開け閉めできる */
  open: boolean;
  done?: boolean;
  children: ReactNode;
};

/** 番号付きの手順 1 つ。閉じると 1 行になる */
export function Step({ id, number, title, status, open, done, children }: StepProps) {
  return (
    <details className="step" id={id} open={open} data-done={done || undefined}>
      <summary>
        <span className="step-number" aria-hidden="true">
          {done ? "✓" : number}
        </span>
        <h2 className="step-title">
          <span className="visually-hidden">手順 {number}：</span>
          {title}
        </h2>
        {status && <span className="step-status">{status}</span>}
      </summary>
      <div className="step-body">{children}</div>
    </details>
  );
}
