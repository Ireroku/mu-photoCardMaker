// テンプレート JSON のファイルを読み込む・保存する。手順①（読み込む）と手順⑤（保存する）で使う。

import { TEMPLATE_FILE_PREFIX } from "../settings";
import type { AppAction } from "../state/state";
import { parseTemplate, stringifyTemplate } from "./parse";
import type { Template } from "./schema";

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
    ? { type: "templateLoaded", template: result.template, source: { fileName: file.name } }
    : { type: "templateRejected", errors: result.errors, fileName: file.name };
}

/** テンプレートを JSON のファイルとしてダウンロードさせる。name はファイルの名前に入れる */
export function saveTemplateFile(template: Template, name: string): void {
  const blob = new Blob([stringifyTemplate(template)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  // 読み込んだファイルの名前を使うときは、接頭辞と拡張子が重ならないように外す
  const stem = name.replace(/\.json$/i, "");
  const base = stem.startsWith(TEMPLATE_FILE_PREFIX)
    ? stem.slice(TEMPLATE_FILE_PREFIX.length)
    : stem;
  link.download = `${TEMPLATE_FILE_PREFIX}${base}.json`;
  // Firefox などは文書の中にない a 要素のクリックを無視することがあるので、一度入れてから押す
  document.body.append(link);
  link.click();
  link.remove();
  // すぐに消すとダウンロードが始まる前に URL が無効になるブラウザがあるので、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
