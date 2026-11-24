import { useReducer, useRef, type ChangeEvent } from "react";
import { Sheets } from "../print/Sheets";
import { pageCount as countPages, sheetGeometry } from "../print/geometry";
import { parseTemplate, stringifyTemplate } from "../template/parse";
import { appReducer, initialState } from "./state";
import { usePreviewScale } from "./usePreviewScale";
import "./app.css";

/** 画面に出すエラーの最大数。多すぎると読めないので、残りは件数だけ出す */
const MAX_SHOWN_ERRORS = 10;

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { template, captions, loadedFileName, rejected } = state;
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLElement>(null);

  const geometry = sheetGeometry(template);
  const pageCount = countPages(captions.length, template);
  usePreviewScale(preview, geometry.paper.width);

  async function loadTemplate(event: ChangeEvent<HTMLInputElement>) {
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

  function exportTemplate() {
    const blob = new Blob([stringifyTemplate(template)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "caption-template.json";
    // Firefox などは文書の中にない a 要素のクリックを無視することがあるので、一度入れてから押す
    document.body.append(link);
    link.click();
    link.remove();
    // すぐに消すとダウンロードが始まる前に URL が無効になるブラウザがあるので、少し待つ
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function print() {
    // フォントの読み込みが終わる前に印刷すると、別のフォントで出ることがある
    await document.fonts.ready;
    window.print();
  }

  const shownErrors = rejected?.errors.slice(0, MAX_SHOWN_ERRORS) ?? [];
  const hiddenErrorCount = (rejected?.errors.length ?? 0) - shownErrors.length;

  return (
    <>
      <header className="controls">
        <h1>キャプションボード作成ツール</h1>
        <div className="controls-buttons">
          <button type="button" className="primary" onClick={print} disabled={pageCount === 0}>
            印刷
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            テンプレートを読み込む
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={loadTemplate}
          />
          <button type="button" onClick={exportTemplate}>
            テンプレートを書き出す
          </button>
        </div>
        <p className="controls-summary" aria-live="polite">
          {captions.length} 枚 / {pageCount} ページ（カード 1 枚 約 {geometry.card.width.toFixed(1)}{" "}
          × {geometry.card.height.toFixed(1)} mm）
          {loadedFileName && `／テンプレート: ${loadedFileName}`}
        </p>
        <p className="controls-hint">
          PDF にするときは、印刷の画面で送信先を「PDF に保存」にし、倍率を 100%
          （「実際のサイズ」）、余白を「なし」にしてください。
        </p>
        {rejected && (
          <div className="errors" role="alert">
            <p>
              「{rejected.fileName}
              」を読み込めませんでした。今のテンプレートをそのまま使っています。
            </p>
            <ul>
              {shownErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {hiddenErrorCount > 0 && <li>ほか {hiddenErrorCount} 件</li>}
            </ul>
          </div>
        )}
      </header>
      <main className="preview" ref={preview}>
        {pageCount === 0 ? (
          <p className="preview-empty">キャプションがありません</p>
        ) : (
          <Sheets template={template} captions={captions} />
        )}
      </main>
    </>
  );
}
