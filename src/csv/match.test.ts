import { describe, expect, it } from "vitest";
import { decodeCsvBytes } from "./decode";
import googleFormCsv from "./fixtures/google-form.csv?raw";
import { applyMapping, matchColumns, unusedColumns, type FieldLike } from "./match";

const FIELDS: FieldLike[] = [
  { key: "title", label: "題名" },
  { key: "author", label: "撮影者名" },
  { key: "place", label: "撮影場所" },
  { key: "equipment", label: "機材名" },
];

describe("matchColumns", () => {
  it("Google フォーム形式の見出しを対応付け、タイムスタンプは無視する", () => {
    const mapping = matchColumns(
      ["タイムスタンプ", "題名", "撮影者名", "撮影場所", "機材名"],
      FIELDS,
    );
    expect(mapping).toEqual({
      columns: { title: 1, author: 2, place: 3, equipment: 4 },
      unmatchedColumns: [],
      ignoredColumns: [0],
      duplicateColumns: [],
    });
  });

  it("英語の自動生成列も無視する", () => {
    const mapping = matchColumns(["Timestamp", "Email Address", "Score", "題名"], FIELDS);
    expect(mapping.ignoredColumns).toEqual([0, 1, 2]);
    expect(mapping.columns.title).toBe(3);
  });

  it("メールアドレスとスコアの列も無視する", () => {
    expect(matchColumns(["メールアドレス", "スコア"], FIELDS).ignoredColumns).toEqual([0, 1]);
  });

  it("自動生成列と同じ名前のフィールドがあれば、無視せず対応付ける", () => {
    const mapping = matchColumns(
      ["タイムスタンプ", "メールアドレス", "題名"],
      [...FIELDS, { key: "email", label: "メールアドレス" }],
    );
    expect(mapping.columns.email).toBe(1);
    expect(mapping.ignoredColumns).toEqual([0]);
  });

  it("正規化した見出しで比べる", () => {
    const mapping = matchColumns(
      [" 題名 *", "撮影\u3000者名"],
      [
        { key: "title", label: "題名" },
        { key: "author", label: "撮影 者名" },
      ],
    );
    expect(mapping.columns).toEqual({ title: 0, author: 1 });
  });

  it("見つからないフィールドは null、使わない列は unmatchedColumns に入る", () => {
    const mapping = matchColumns(["題名", "感想"], FIELDS);
    expect(mapping.columns).toEqual({ title: 0, author: null, place: null, equipment: null });
    expect(mapping.unmatchedColumns).toEqual([1]);
  });

  it("同じ見出しが複数あれば先の列を使い、後の列を報告する", () => {
    const mapping = matchColumns(["題名", "撮影者名", "題名 "], FIELDS);
    expect(mapping.columns.title).toBe(0);
    expect(mapping.duplicateColumns).toEqual([2]);
    expect(mapping.unmatchedColumns).toEqual([]);
  });

  it("同じ label のフィールドが複数あれば、先のフィールドだけが列を得る", () => {
    const mapping = matchColumns(
      ["題名"],
      [
        { key: "first", label: "題名" },
        { key: "second", label: "題名" },
      ],
    );
    expect(mapping.columns).toEqual({ first: 0, second: null });
  });

  it("空の見出しは空の label と対応付けない", () => {
    const mapping = matchColumns([""], [{ key: "empty", label: " " }]);
    expect(mapping.columns).toEqual({ empty: null });
    expect(mapping.unmatchedColumns).toEqual([0]);
  });

  it("フィールドがなければすべて unmatched", () => {
    expect(matchColumns(["題名"], [])).toEqual({
      columns: {},
      unmatchedColumns: [0],
      ignoredColumns: [],
      duplicateColumns: [],
    });
  });
});

describe("unusedColumns", () => {
  it("割り当て済みの列と無視した列を除く", () => {
    expect(unusedColumns(5, { title: 1, author: null, place: 3 }, [0])).toEqual([2, 4]);
  });

  it("手で付け替えたあとの割り当てに従う（重複していた列も選べる）", () => {
    const mapping = matchColumns(["タイムスタンプ", "題名", "題名", "感想"], FIELDS);
    expect(unusedColumns(4, mapping.columns, mapping.ignoredColumns)).toEqual([2, 3]);
    const edited = { ...mapping.columns, title: 3 };
    expect(unusedColumns(4, edited, mapping.ignoredColumns)).toEqual([1, 2]);
  });

  it("列がなければ空", () => {
    expect(unusedColumns(0, {}, [])).toEqual([]);
  });
});

describe("applyMapping", () => {
  const columns = { title: 1, author: 2, place: null };

  it("1 行を 1 枚のキャプションにし、値の前後の空白を削る", () => {
    expect(applyMapping([["t", " 夕焼け ", "山田太郎\u3000"]], { columns })).toEqual({
      captions: [{ title: "夕焼け", author: "山田太郎", place: "" }],
      skippedRows: [],
    });
  });

  it("列が足りない行は空文字で埋める", () => {
    expect(applyMapping([["t", "夕焼け"]], { columns }).captions).toEqual([
      { title: "夕焼け", author: "", place: "" },
    ]);
  });

  it("対応付けた列がすべて空の行は飛ばし、その番号を返す", () => {
    expect(applyMapping([["2026/04/01", " ", ""], [], ["", "朝", ""]], { columns })).toEqual({
      captions: [{ title: "朝", author: "", place: "" }],
      skippedRows: [0, 1],
    });
  });
});

describe("fixtures/google-form.csv", () => {
  it("読み込んで対応付けまで通る", () => {
    const { text, encoding } = decodeCsvBytes(new TextEncoder().encode(googleFormCsv));
    expect(encoding).toBe("utf-8");
    // パースは Papa Parse の担当なので、ここでは引用符を含む最後の行を除いて簡易に分ける
    const lines = text.trimEnd().split("\n").slice(0, -1);
    const [headers = [], ...rows] = lines.map((line) => line.split(","));
    const mapping = matchColumns(headers, FIELDS);
    expect(mapping.ignoredColumns).toEqual([0]);
    expect(applyMapping(rows, mapping)).toEqual({
      captions: [
        { title: "夕焼けの道", author: "山田太郎", place: "近所の公園", equipment: "カメラA" },
        { title: "朝の川", author: "佐藤花子", place: "川沿いの遊歩道", equipment: "" },
      ],
      skippedRows: [2, 3],
    });
  });
});
