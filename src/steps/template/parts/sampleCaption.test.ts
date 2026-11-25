import { describe, expect, it } from "vitest";
import { TEMPLATE_PRESETS } from "../../../template/presets";
import { sampleCaption } from "./sampleCaption";

describe("sampleCaption", () => {
  it("質問の文を繰り返し、大きい文字の項目ほど短くする", () => {
    const caption = sampleCaption(TEMPLATE_PRESETS[0]!.template);
    expect(caption.title).toMatch(/^(題名)+題?$/);
    expect(caption.place!.length).toBeGreaterThan(caption.title!.length);
  });

  it("どのテンプレートでも、layout にある項目すべてに文字が入る", () => {
    for (const { template } of TEMPLATE_PRESETS) {
      const caption = sampleCaption(template);
      for (const field of template.fields) expect(caption[field.key]).toBeTruthy();
    }
  });
});
