// テンプレートのファイルを読み込む・保存する。

import { TEMPLATE_FILE_PREFIX } from "../../../settings";
import type { AppAction } from "../../../state/state";
import { parseTemplate, stringifyTemplate } from "../../../template/parse";
import type { Template } from "../../../template/schema";

/** ファイルを読んでテンプレートとして確かめ、結果を状態に送る action にする */
export async function readTemplateFile(file: File): Promise<AppAction> {
  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      type: "templateRejected",
      errors: [`ファイルを読み込めませんでした（詳細: ${detail}）`],
      fileName: file.name,
    };
  }
  const result = parseTemplate(text);
  return result.ok
    ? { type: "templateLoaded", template: result.template, fileName: file.name }
    : { type: "templateRejected", errors: result.errors, fileName: file.name };
}

/** テンプレートを JSON のファイルとしてダウンロードさせる */
export function saveTemplateFile(template: Template): void {
  const blob = new Blob([stringifyTemplate(template)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  // 年を入れておくと、来年どのファイルを使えばよいか分かりやすい
  link.download = `${TEMPLATE_FILE_PREFIX}${new Date().getFullYear()}.json`;
  // Firefox などは文書の中にない a 要素のクリックを無視することがあるので、一度入れてから押す
  document.body.append(link);
  link.click();
  link.remove();
  // すぐに消すとダウンロードが始まる前に URL が無効になるブラウザがあるので、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
