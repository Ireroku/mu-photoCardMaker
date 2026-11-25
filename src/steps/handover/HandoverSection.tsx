// ページの下の「来年に引き継ぐ」：テンプレート（項目・見た目・余白・切り取り線）をファイルに保存し、読み込む。

import { useRef, type Dispatch } from "react";
import { MAX_SHOWN_ERRORS } from "../../settings";
import { takePickedFiles } from "../../shared/takePickedFiles";
import type { AppAction } from "../../state/state";
import type { Template } from "../../template/schema";
import "./parts/handover.css";
import { readTemplateFile, saveTemplateFile } from "./parts/templateFile";

type HandoverSectionProps = {
  template: Template;
  templateFileName: string | undefined;
  templateRejected: { fileName: string; errors: readonly string[] } | null;
  dispatch: Dispatch<AppAction>;
};

export function HandoverSection(props: HandoverSectionProps) {
  const { template, templateFileName, templateRejected, dispatch } = props;
  const fileInput = useRef<HTMLInputElement>(null);

  const shownErrors = templateRejected?.errors.slice(0, MAX_SHOWN_ERRORS) ?? [];
  const hiddenErrorCount = (templateRejected?.errors.length ?? 0) - shownErrors.length;

  return (
    <section className="handover" aria-labelledby="handover-title">
      <h2 id="handover-title">来年に引き継ぐ</h2>
      <div className="buttons">
        <button type="button" onClick={() => saveTemplateFile(template)}>
          設定をファイルに保存
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          保存した設定を読み込む
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (event) => {
            const file = takePickedFiles(event)[0];
            if (file) dispatch(await readTemplateFile(file));
          }}
        />
      </div>
      <p className="note">保存されるもの：項目・文字の大きさ・余白・切り取り線</p>
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
