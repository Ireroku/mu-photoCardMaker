// 最初から用意しているテンプレート。parts/presets/ の JSON をファイル名の順に並べる。
// 足すときは、番号を付けた JSON を parts/presets/ に置くだけでよい（name は必ず書く）。

import { validateTemplate } from "./parse";
import type { Template } from "./schema";

export type TemplatePreset = {
  /** ファイル名から .json を除いたもの（例：1-standard） */
  id: string;
  template: Template & { name: string };
};

const files = import.meta.glob<unknown>("./parts/presets/*.json", {
  eager: true,
  import: "default",
});

/** 用意しているテンプレート。壊れていたら起動時に気づけるよう、読み込み時に検証する */
export const TEMPLATE_PRESETS: readonly TemplatePreset[] = Object.keys(files)
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
  .map((path) => {
    const result = validateTemplate(files[path]);
    if (!result.ok) throw new Error(`${path} が不正です:\n${result.errors.join("\n")}`);
    const { name } = result.template;
    if (name === undefined) throw new Error(`${path} に name がありません`);
    return { id: path.replace(/^.*\/|\.json$/g, ""), template: { ...result.template, name } };
  });

/** 最初に選ばれているテンプレート（並びの先頭） */
export const DEFAULT_PRESET: TemplatePreset = TEMPLATE_PRESETS[0]!;
