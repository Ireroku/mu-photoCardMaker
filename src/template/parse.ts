import type { z } from "zod";
import { templateSchema, type Template } from "./schema";

export type ParseResult = { ok: true; template: Template } | { ok: false; errors: string[] };

/** テンプレート JSON の文字列を読み、検証する。エラーは画面にそのまま出せる日本語の文 */
export function parseTemplate(text: string): ParseResult {
  if (text.trim() === "") return { ok: false, errors: ["ファイルが空です"] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [jsonSyntaxMessage(text, error)] };
  }
  return validateTemplate(json);
}

/** JSON.parse 済みの値を検証する */
export function validateTemplate(json: unknown): ParseResult {
  const result = templateSchema.safeParse(json, { reportInput: true });
  if (result.success) return { ok: true, template: result.data };
  return { ok: false, errors: result.error.issues.map(formatIssue) };
}

/** 書き出し用の JSON 文字列 */
export function stringifyTemplate(template: Template): string {
  return JSON.stringify(template, null, 2) + "\n";
}

/** ["layout", 2, "items", 0, "field"] → "layout の 3 番目 → items の 1 番目 → field" */
export function formatPath(path: readonly PropertyKey[]): string {
  const parts: string[] = [];
  for (const key of path) {
    if (typeof key === "number") {
      const last = parts.pop() ?? "";
      parts.push(`${last} の ${key + 1} 番目`.trim());
    } else {
      parts.push(String(key));
    }
  }
  return parts.join(" → ");
}

function formatIssue(issue: z.core.$ZodIssue): string {
  const where = issue.path.length > 0 ? formatPath(issue.path) : "テンプレート全体";
  return `${where}: ${issueMessage(issue)}`;
}

/** プログラミングに詳しくない人にも分かる言い方にする。当てはまらないものは zod の日本語のまま */
function issueMessage(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case "invalid_type": {
      const input = (issue as { input?: unknown }).input;
      if (input === undefined) return "必要な項目がありません";
      if (typeof input === "number" && !Number.isFinite(input)) {
        return `ふつうの数にしてください（今は ${String(input)}）`;
      }
      const expected = EXPECTED_NAMES[issue.expected] ?? issue.expected;
      return `${expected}にしてください（今は ${describeValue(input)}）`;
    }
    case "too_small":
      if (issue.origin === "array") return `${String(issue.minimum)} 個以上必要です`;
      if (issue.origin === "string") return "空にしないでください";
      return issue.inclusive
        ? `${String(issue.minimum)} 以上にしてください`
        : `${String(issue.minimum)} より大きくしてください`;
    case "too_big":
      if (issue.origin === "array") return `${String(issue.maximum)} 個以下にしてください`;
      if (issue.origin === "string") return `${String(issue.maximum)} 文字以下にしてください`;
      return issue.inclusive
        ? `${String(issue.maximum)} 以下にしてください`
        : `${String(issue.maximum)} より小さくしてください`;
    case "invalid_value":
      return `${issue.values.map(quote).join("、")} ${issue.values.length === 1 ? "に" : "のいずれかに"}してください`;
    case "unrecognized_keys":
      return `${issue.keys.map(quote).join("、")} は使えない項目名です（書き間違いかもしれません）`;
    case "invalid_union":
      // 種類（kind や type）が知らない値のとき、使える値を示す
      if ("options" in issue && issue.options) {
        return `${issue.options.map(quote).join("、")} のいずれかにしてください`;
      }
      return issue.message;
    default:
      return issue.message;
  }
}

const EXPECTED_NAMES: Partial<Record<string, string>> = {
  number: "数値",
  int: "整数",
  string: '文字列（"" で囲んだもの）',
  boolean: "true か false のどちらか",
  object: "{ } で囲んだまとまり",
  array: "[ ] で囲んだ並び",
};

function quote(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : String(value);
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "[ ] で囲んだ並び";
  switch (typeof value) {
    case "string":
      return `文字列 "${value}"`;
    case "number":
    case "boolean":
      return String(value);
    case "object":
      return "{ } で囲んだまとまり";
    default:
      return typeof value;
  }
}

function jsonSyntaxMessage(text: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  const where = jsonErrorLocation(text, detail);
  return (
    `JSON の書き方が正しくありません${where ? `（${where}付近）` : ""}。` +
    `カンマ、括弧、引用符の過不足を確かめてください。（詳細: ${detail}）`
  );
}

/** ブラウザごとに違うエラー文から、場所を「3 行目 5 文字目」の形で取り出す。取れなければ undefined */
function jsonErrorLocation(text: string, detail: string): string | undefined {
  const lineColumn = /line (\d+) column (\d+)/.exec(detail);
  if (lineColumn) return `${lineColumn[1]} 行目 ${lineColumn[2]} 文字目`;
  const position = /position (\d+)/.exec(detail);
  if (position) {
    const before = text.slice(0, Number(position[1])).split("\n");
    return `${before.length} 行目 ${(before.at(-1)?.length ?? 0) + 1} 文字目`;
  }
  return undefined;
}
