import { describe, expect, it } from "vitest";
import { applyMapping, matchColumns, type FieldLike } from "../match";
import { parseCsvBytes, type ParsedCsv } from "./parse";
// fixtures はどちらも UTF-8 なので、文字列として読み込んでからバイト列に戻す
import animeSpotsCsv from "../fixtures/anime-spots.csv?raw";
import googleFormCsv from "../fixtures/google-form.csv?raw";

const FIELDS: FieldLike[] = [
  { key: "title", label: "題名" },
  { key: "author", label: "撮影者名" },
  { key: "place", label: "撮影場所" },
  { key: "camera", label: "機材名" },
];

const utf8 = (s: string) => new TextEncoder().encode(s);

function parsed(bytes: Uint8Array): ParsedCsv {
  const result = parseCsvBytes(bytes);
  if (!result.ok) throw new Error(result.error);
  return result.csv;
}

/** 文字列を BOM 付きの UTF-16LE にする */
function utf16le(s: string): Uint8Array {
  const view = new DataView(new ArrayBuffer((s.length + 1) * 2));
  view.setUint16(0, 0xfeff, true);
  for (let i = 0; i < s.length; i++) view.setUint16((i + 1) * 2, s.charCodeAt(i), true);
  return new Uint8Array(view.buffer);
}

describe("parseCsvBytes", () => {
  it("引用符の中のカンマと改行を保つ", () => {
    const csv = parsed(utf8('題名,撮影者名\r\n"雨, そして\n晴れ",山田\r\n'));
    expect(csv.headers).toEqual(["題名", "撮影者名"]);
    expect(csv.rows).toEqual([["雨, そして\n晴れ", "山田"]]);
  });

  it("UTF-16 のタブ区切り（Excel の「Unicode テキスト」）も読む", () => {
    const csv = parsed(utf16le("題名\t撮影者名\n夕焼け\t山田"));
    expect(csv).toEqual({
      headers: ["題名", "撮影者名"],
      rows: [["夕焼け", "山田"]],
      encoding: "utf-16le",
      suspicious: false,
      warnings: [],
    });
  });

  it("セミコロンでは区切らない", () => {
    expect(parsed(utf8("題名;撮影者名\n夕焼け;山田\n")).headers).toEqual(["題名;撮影者名"]);
  });

  it("閉じていない引用符を、行の番号つきで知らせる", () => {
    const csv = parsed(utf8('題名,撮影者名\n夕焼け,山田\n"朝の川,佐藤\n'));
    expect(csv.warnings).toHaveLength(1);
    expect(csv.warnings[0]).toMatch(/^3 行目/);
  });

  it("列が 1 つだけでも読む", () => {
    expect(parsed(utf8("題名\n夕焼け\n")).rows).toEqual([["夕焼け"]]);
  });

  it("空のファイルはエラー", () => {
    expect(parseCsvBytes(new Uint8Array()).ok).toBe(false);
    expect(parseCsvBytes(utf8("\n \n")).ok).toBe(false);
  });
});

describe("fixtures/google-form.csv", () => {
  it("読み込んで対応付けまで通る。カンマだけの行はパースの時点で消える", () => {
    const csv = parsed(utf8(googleFormCsv));
    expect(csv.encoding).toBe("utf-8");
    const mapping = matchColumns(csv.headers, FIELDS);
    expect(mapping.ignoredColumns).toEqual([0]);
    expect(applyMapping(csv, mapping.columns)).toEqual({
      captions: [
        { title: "夕焼けの道", author: "山田太郎", place: "近所の公園", camera: "カメラA" },
        { title: "朝の川", author: "佐藤花子", place: "川沿いの遊歩道", camera: "" },
        { title: "雨, そして晴れ", author: "鈴木一郎", place: "駅前の広場", camera: "カメラB" },
      ],
      rowIndexes: [0, 1, 3],
      skippedRows: [2],
    });
  });
});

describe("fixtures/anime-spots.csv", () => {
  it("30 件を読み、すべての項目が自動で対応する", () => {
    const csv = parsed(utf8(animeSpotsCsv));
    expect(csv.rows).toHaveLength(30);
    const mapping = matchColumns(csv.headers, FIELDS);
    expect(mapping.columns).toEqual({ title: 1, author: 2, place: 3, camera: 4 });
    expect(mapping.unmatchedColumns).toEqual([]);
    const { captions, skippedRows } = applyMapping(csv, mapping.columns);
    expect(skippedRows).toEqual([]);
    expect(captions[3]?.title).toBe("夕暮れ, 坂道の途中で");
    // 機材名が空欄の回答もある
    expect(captions.filter((c) => c.camera === "").length).toBeGreaterThan(0);
  });
});
