import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET } from "../../../template/presets";
import type { Field } from "../../../template/schema";
import { buildTutorialSteps, GOOGLE_FORM_TYPES, stepShortTitle } from "./tutorialSteps";

const fields: Field[] = [
  { key: "title", label: "作品の題名", type: "text", required: true },
  {
    key: "place",
    label: "撮影場所",
    type: "text",
    required: false,
    hint: "  分からなければ空欄でかまいません ",
  },
];

describe("buildTutorialSteps", () => {
  it("作成・設定・質問ごと・公開・CSV・確認・来年以降の順に並べる", () => {
    const steps = buildTutorialSteps(fields);
    expect(steps.map((s) => s.kind)).toEqual([
      "intro",
      "settings",
      "question",
      "question",
      "publish",
      "csv",
      "check",
      "nextYear",
    ]);
    expect(steps[0]).toEqual({ kind: "intro" });
  });

  it("質問の手順に、質問文・種類・必須・説明を入れる", () => {
    const questions = buildTutorialSteps(fields).filter((s) => s.kind === "question");
    expect(questions).toEqual([
      {
        kind: "question",
        number: 1,
        fieldType: "text",
        title: "作品の題名",
        required: true,
        description: undefined,
      },
      {
        kind: "question",
        number: 2,
        fieldType: "text",
        title: "撮影場所",
        required: false,
        description: "分からなければ空欄でかまいません",
      },
    ]);
  });

  it("空白だけの hint は説明として扱わない", () => {
    const [question] = buildTutorialSteps([{ ...fields[0]!, hint: "  " }]).filter(
      (s) => s.kind === "question",
    );
    expect(question).toMatchObject({ description: undefined });
  });

  it("fields が空でも、質問以外の手順は出す", () => {
    expect(buildTutorialSteps([]).map((s) => s.kind)).toEqual([
      "intro",
      "settings",
      "publish",
      "csv",
      "check",
      "nextYear",
    ]);
  });
});

describe("GOOGLE_FORM_TYPES", () => {
  it("既定のテンプレートの fields の種類すべてに、名前と回答欄の文字がある", () => {
    for (const field of DEFAULT_PRESET.template.fields) {
      const entry = GOOGLE_FORM_TYPES[field.type];
      expect(entry.formLabel).not.toBe("");
      expect(entry.answerPlaceholder).not.toBe("");
    }
  });
});

describe("stepShortTitle", () => {
  it("質問の手順は「質問 n」と質問文を出す", () => {
    const titles = buildTutorialSteps(fields).map(stepShortTitle);
    expect(titles).toContain("質問 1：作品の題名");
    expect(titles).toContain("質問 2：撮影場所");
  });
});
