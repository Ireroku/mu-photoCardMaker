import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, TEMPLATE_PRESETS } from "./presets";

describe("TEMPLATE_PRESETS", () => {
  it("ファイル名の順に並び、先頭が最初に選ばれる", () => {
    expect(TEMPLATE_PRESETS.map((p) => p.id)).toEqual([
      "1-standard",
      "2-simple",
      "3-standard-2-lines",
      "4-lens-2-lines",
    ]);
    expect(DEFAULT_PRESET.template.name).toBe("標準");
  });

  it("名前が重ならない", () => {
    const names = TEMPLATE_PRESETS.map((p) => p.template.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // テンプレートを替えても列の対応を引き継げるよう、同じ key は同じ意味（必須かどうかも同じ）にする
  it("同じ key の項目は、どのテンプレートでも必須かどうかが同じ", () => {
    const required = new Map<string, boolean>();
    for (const { template } of TEMPLATE_PRESETS) {
      for (const field of template.fields) {
        expect(required.get(field.key) ?? field.required).toBe(field.required);
        required.set(field.key, field.required);
      }
    }
  });
});
