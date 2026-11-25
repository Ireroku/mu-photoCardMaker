// Google フォームの作り方の手順を、テンプレート JSON の fields から組み立てる。
// 画面から切り離した純粋なロジックだけを置く。

import type { Field } from "../../../template/schema";

/** fields[].type の種類。schema.ts に種類を足すと、ここも自動で増える */
export type FieldType = Field["type"];

interface GoogleFormType {
  /** Google フォームでの「質問の種類」の名前 */
  formLabel: string;
  /** 見本のカードで、回答欄に出す文字 */
  answerPlaceholder: string;
}

/**
 * fields[].type と、Google フォームの質問の種類の対応。
 * Record で型の union を網羅しているので、FieldType に種類を足すと
 * ここに書き忘れたときに型エラーになる。
 * 例：将来 "paragraph" を足すなら
 * `paragraph: { formLabel: "段落", answerPlaceholder: "長文回答" },` を追加する。
 */
export const GOOGLE_FORM_TYPES: Record<FieldType, GoogleFormType> = {
  text: { formLabel: "記述式", answerPlaceholder: "回答を入力" },
};

export type TutorialStep =
  | { kind: "intro" }
  | { kind: "settings" }
  | {
      kind: "question";
      /** 1 から数えた質問の番号 */
      number: number;
      fieldType: FieldType;
      /** フォームに貼り付ける質問文 */
      title: string;
      required: boolean;
      /** 質問の「説明」に貼り付ける文（前後の空白は取る）。hint がなければ undefined */
      description: string | undefined;
    }
  | { kind: "publish" }
  | { kind: "csv" }
  | { kind: "check" }
  | { kind: "nextYear" };

/**
 * fields から手順を並べる。
 * フォームを作る → 設定 → 質問ごと → 公開 → CSV の取り出し方 → 試しに回答 → 次の展示でも使うとき
 */
export function buildTutorialSteps(fields: readonly Field[]): TutorialStep[] {
  const questions = fields.map((field, i): TutorialStep => {
    const hint = field.hint?.trim();
    return {
      kind: "question",
      number: i + 1,
      fieldType: field.type,
      title: field.label,
      required: field.required,
      description: hint ? hint : undefined,
    };
  });
  return [
    { kind: "intro" },
    { kind: "settings" },
    ...questions,
    { kind: "publish" },
    { kind: "csv" },
    { kind: "check" },
    { kind: "nextYear" },
  ];
}

/** 手順の一覧と見出しに出す短い名前 */
export function stepShortTitle(step: TutorialStep): string {
  switch (step.kind) {
    case "intro":
      return "空白のフォームを開く";
    case "settings":
      return "フォームの設定";
    case "question":
      return `質問 ${step.number}：${step.title}`;
    case "publish":
      return "フォームを公開する";
    case "csv":
      return "回答を CSV でダウンロードする";
    case "check":
      return "試しに回答して確かめる";
    case "nextYear":
      return "次の展示でも使うとき";
  }
}
