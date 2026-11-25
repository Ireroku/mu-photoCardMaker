import { describe, expect, it } from "vitest";
import { MAX_CSV_BYTES } from "../../settings";
import { checkCsvFile, checkParsedCsv } from "./check";
import type { ParsedCsv } from "./parse";

describe("checkCsvFile", () => {
  it.each(["answers.csv", "ANSWERS.CSV", "excel.tsv", "unicode.txt"])("%s は受け付ける", (name) => {
    expect(checkCsvFile({ name, size: 100 })).toBeNull();
  });

  it("CSV でない拡張子は断る", () => {
    expect(checkCsvFile({ name: "photo.jpg", size: 100 })).toMatch(/CSV ファイル/);
  });

  it("大きすぎるファイルは断る", () => {
    expect(checkCsvFile({ name: "a.csv", size: MAX_CSV_BYTES })).toBeNull();
    expect(checkCsvFile({ name: "a.csv", size: MAX_CSV_BYTES + 1 })).toMatch(/大きすぎます/);
  });
});

describe("checkParsedCsv", () => {
  const fields = [{ key: "title", label: "題名" }];
  const csv = (headers: string[], suspicious: boolean): ParsedCsv => ({
    headers,
    rows: [],
    encoding: "shift_jis",
    suspicious,
    warnings: [],
  });

  it("文字化けの疑いがなければ通す", () => {
    expect(checkParsedCsv(csv(["感想"], false), fields)).toBeNull();
  });

  it("文字化けの疑いがあっても、見出しが 1 つでも当たれば通す", () => {
    expect(checkParsedCsv(csv(["題名", "�"], true), fields)).toBeNull();
  });

  it("文字化けの疑いがあり、どの見出しも当たらなければ断る", () => {
    expect(checkParsedCsv(csv(["��"], true), fields)).toMatch(/文字化け/);
  });
});
