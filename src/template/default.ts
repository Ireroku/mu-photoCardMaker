import defaultJson from "./parts/default.json";
import { validateTemplate } from "./parse";
import type { Template } from "./schema";

/** 既定のテンプレート。壊れていたら起動時に気づけるよう、読み込み時に検証する */
export const DEFAULT_TEMPLATE: Template = (() => {
  const result = validateTemplate(defaultJson);
  if (!result.ok) throw new Error(`default.json が不正です:\n${result.errors.join("\n")}`);
  return result.template;
})();
