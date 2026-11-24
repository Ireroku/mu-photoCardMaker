// ページの下の「来年に引き継ぐ」：テンプレート（項目・見た目・余白・切り取り線）をファイルに保存し、読み込む。

import { useRef, type ChangeEvent, type Dispatch } from "react";
import { parseTemplate, stringifyTemplate } from "../template/parse";
import type { Template } from "../template/schema";
import type { AppAction } from "./state";

/** 画面に出すエラーの最大数。多すぎると読めないので、残りは件数だけ出す */
const MAX_SHOWN_ERRORS = 10;

type HandoverSectionProps = {
  template: Template;
  templateFileName: string | undefined;
  templateRejected: { fileName: string; errors: readonly string[] } | null;
  dispatch: Dispatch<AppAction>;
};

export function HandoverSection(props: HandoverSectionProps) {
  const { template, templateFileName, templateRejected, dispatch } = props;
  const fileInput = useRef<HTMLInputElement>(null);

  async function load(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // 同じファイルを直してもう一度選んだときにも change が起きるよう、選択を空にしておく
    input.value = "";
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      dispatch({
        type: "templateRejected",
        errors: [`ファイルを読み込めませんでした（詳細: ${detail}）`],
        fileName: file.name,
      });
      return;
    }
    const result = parseTemplate(text);
    if (result.ok) {
      dispatch({ type: "templateLoaded", template: result.template, fileName: file.name });
    } else {
      dispatch({ type: "templateRejected", errors: result.errors, fileName: file.name });
    }
  }

  function save() {
    const blob = new Blob([stringifyTemplate(template)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // 年を入れておくと、来年どのファイルを使えばよいか分かりやすい
    link.download = `caption-template-${new Date().getFullYear()}.json`;
    // Firefox などは文書の中にない a 要素のクリックを無視することがあるので、一度入れてから押す
    document.body.append(link);
    link.click();
    link.remove();
    // すぐに消すとダウンロードが始まる前に URL が無効になるブラウザがあるので、少し待つ
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const shownErrors = templateRejected?.errors.slice(0, MAX_SHOWN_ERRORS) ?? [];
  const hiddenErrorCount = (templateRejected?.errors.length ?? 0) - shownErrors.length;

  return (
    <section className="handover" aria-labelledby="handover-title">
      <h2 id="handover-title">来年に引き継ぐ</h2>
      <p>
        項目や文字の大きさ、余白、切り取り線の設定をファイルに保存できます。来年はこのファイルを読み込めば、同じ設定で作れます。
      </p>
      <div className="buttons">
        <button type="button" onClick={save}>
          この設定をファイルに保存
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          保存した設定を読み込む
        </button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={load} />
      </div>
      {templateFileName && (
        <p className="note" role="status">
          「{templateFileName}」の設定を使っています。
        </p>
      )}
      {templateRejected && (
        <div className="message error" role="alert">
          <p>
            「{templateRejected.fileName}
            」を読み込めませんでした。今の設定をそのまま使っています。
          </p>
          <details>
            <summary>くわしく（ファイルを手で書き換えたときに起きやすい誤りです）</summary>
            <ul>
              {shownErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {hiddenErrorCount > 0 && <li>ほか {hiddenErrorCount} 件</li>}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}
