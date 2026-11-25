import { describe, expect, it } from "vitest";
import {
  applyMapping,
  columnValues,
  laterDuplicateColumns,
  matchColumns,
  unusedColumns,
  type FieldLike,
} from "./match";

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

  it("見つからないフィールドは null", () => {
    const mapping = matchColumns(["題名", "感想"], FIELDS);
    expect(mapping.columns).toEqual({ title: 0, author: null, place: null, equipment: null });
  });

  it("同じ見出しが複数あれば先の列を使い、後の列を報告する", () => {
    const mapping = matchColumns(["題名", "撮影者名", "題名 "], FIELDS);
    expect(mapping.columns.title).toBe(0);
    expect(mapping.duplicateColumns).toEqual([2]);
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
  });

  it("フィールドがなければ何も対応付けない", () => {
    expect(matchColumns(["題名"], [])).toEqual({
      columns: {},
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
  const headers = ["タイムスタンプ", "題名", "撮影者名"];
  const columns = { title: 1, author: 2, place: null };

  it("1 行を 1 枚のキャプションにし、値の前後の空白を削る", () => {
    expect(applyMapping({ headers, rows: [["t", " 夕焼け ", "山田太郎\u3000"]] }, columns)).toEqual(
      {
        captions: [{ title: "夕焼け", author: "山田太郎", place: "" }],
        rowIndexes: [0],
        skippedRows: [],
      },
    );
  });

  it("列が足りない行は空文字で埋める", () => {
    expect(applyMapping({ headers, rows: [["t", "夕焼け"]] }, columns).captions).toEqual([
      { title: "夕焼け", author: "", place: "" },
    ]);
  });

  it("対応付けた列がすべて空の行は飛ばし、その番号を返す", () => {
    const rows = [["2026/04/01", " ", ""], [], ["", "朝", ""]];
    expect(applyMapping({ headers, rows }, columns)).toEqual({
      captions: [{ title: "朝", author: "", place: "" }],
      rowIndexes: [2],
      skippedRows: [0, 1],
    });
  });

  describe("同じ見出しの列", () => {
    const dupHeaders = ["題名", "撮影者名", "題名 *"];
    const dupColumns = matchColumns(dupHeaders, FIELDS).columns;

    it("左の列が空なら、右の列の値を使う", () => {
      const rows = [
        ["新しい題名", "山田", "古い題名"],
        ["", "佐藤", "古い題名だけ"],
        [" ", "鈴木", ""],
      ];
      expect(applyMapping({ headers: dupHeaders, rows }, dupColumns).captions).toEqual([
        { title: "新しい題名", author: "山田", place: "", equipment: "" },
        { title: "古い題名だけ", author: "佐藤", place: "", equipment: "" },
        { title: "", author: "鈴木", place: "", equipment: "" },
      ]);
    });

    it("手で右の列を選んでも、左から順に見る", () => {
      const rows = [["左", "山田", "右"]];
      const { captions } = applyMapping({ headers: dupHeaders, rows }, { ...dupColumns, title: 2 });
      expect(captions[0]?.title).toBe("左");
    });

    it("空の見出しどうしはまとめない", () => {
      const rows = [["", "値"]];
      const { captions } = applyMapping({ headers: ["", ""], rows }, { title: 0 });
      expect(captions).toEqual([]);
    });
  });
});

describe("columnValues", () => {
  it("同じ見出しの列をまとめ、左から空でない値を使う", () => {
    const table = {
      headers: ["並び順", "題名", "並び順"],
      rows: [
        ["1", "a", "9"],
        ["", "b", "2"],
        [" ", "c", ""],
      ],
    };
    expect(columnValues(table, 0)).toEqual(["1", "2", ""]);
    expect(columnValues(table, 2)).toEqual(["1", "2", ""]);
    expect(columnValues(table, 1)).toEqual(["a", "b", "c"]);
  });
});

describe("laterDuplicateColumns", () => {
  it("左に同じ見出しがある列だけを返す。空の見出しは数えない", () => {
    expect([...laterDuplicateColumns(["題名", "", "題名 *", "", "撮影者名"])]).toEqual([2]);
  });
});
