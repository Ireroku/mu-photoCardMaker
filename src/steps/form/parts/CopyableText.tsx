import { useEffect, useRef, useState } from "react";
import { COPY_STATUS_MS } from "../../../settings";
import { copyToClipboard } from "./clipboard";

const NO_BREAK_SPACE = "\u00A0";

type CopyStatus = "idle" | "copied" | "failed";

const COPY_MESSAGES: Record<CopyStatus, string> = {
  idle: "",
  copied: "コピーしました",
  failed: "コピーできませんでした。文字を選んで手動でコピーしてください",
};

export function CopyableText({ text, name }: { text: string; name: string }) {
  const [result, setResult] = useState<{ status: CopyStatus; count: number }>({
    status: "idle",
    count: 0,
  });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    const ok = await copyToClipboard(text);
    setResult((r) => ({ status: ok ? "copied" : "failed", count: r.count + 1 }));
    timer.current = window.setTimeout(
      () => setResult((r) => ({ ...r, status: "idle" })),
      COPY_STATUS_MS,
    );
  };

  // 同じ結果が続いても読み上げられるよう、回ごとに見えない空白を付けたり外したりする
  const message = COPY_MESSAGES[result.status];
  const liveText = message && result.count % 2 === 0 ? message + NO_BREAK_SPACE : message;

  return (
    <div className="tutorial-copyable">
      <span className="tutorial-copyable-text">{text}</span>
      <button
        type="button"
        className="tutorial-copy-button"
        data-status={result.status}
        onClick={copy}
      >
        {name}をコピー
      </button>
      <span className="tutorial-copy-status" role="status" data-status={result.status}>
        {liveText}
      </span>
    </div>
  );
}
