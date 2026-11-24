import { describe, expect, it } from "vitest";
import { decodeCsvBytes } from "./decode";

const utf8 = (s: string) => new TextEncoder().encode(s);

/** 文字列を UTF-16 のバイト列にする（BOM 付き） */
function utf16(s: string, littleEndian: boolean): Uint8Array {
  const view = new DataView(new ArrayBuffer((s.length + 1) * 2));
  view.setUint16(0, 0xfeff, littleEndian);
  for (let i = 0; i < s.length; i++) view.setUint16((i + 1) * 2, s.charCodeAt(i), littleEndian);
  return new Uint8Array(view.buffer);
}

// "題名,撮影者名\n山田太郎" を Shift_JIS で表したバイト列
const SJIS_SAMPLE = new Uint8Array([
  0x91, 0xe8, 0x96, 0xbc, 0x2c, 0x8e, 0x42, 0x89, 0x65, 0x8e, 0xd2, 0x96, 0xbc, 0x0a, 0x8e, 0x52,
  0x93, 0x63, 0x91, 0xbe, 0x98, 0x59,
]);

describe("decodeCsvBytes", () => {
  it("UTF-8 をそのまま読む", () => {
    expect(decodeCsvBytes(utf8("題名,撮影者名\n夕焼け,山田太郎"))).toEqual({
      text: "題名,撮影者名\n夕焼け,山田太郎",
      encoding: "utf-8",
      suspicious: false,
    });
  });

  it("UTF-8 の BOM を取り除く", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("題名")]);
    expect(decodeCsvBytes(bytes)).toEqual({ text: "題名", encoding: "utf-8", suspicious: false });
  });

  it("BOM 付きの UTF-16LE を読む（タブ区切り）", () => {
    expect(decodeCsvBytes(utf16("題名\t撮影者名\n夕焼け\t山田太郎", true))).toEqual({
      text: "題名\t撮影者名\n夕焼け\t山田太郎",
      encoding: "utf-16le",
      suspicious: false,
    });
  });

  it("BOM 付きの UTF-16BE を読む", () => {
    expect(decodeCsvBytes(utf16("題名", false))).toEqual({
      text: "題名",
      encoding: "utf-16be",
      suspicious: false,
    });
  });

  it("UTF-8 として壊れていれば Shift_JIS として読む", () => {
    expect(decodeCsvBytes(SJIS_SAMPLE)).toEqual({
      text: "題名,撮影者名\n山田太郎",
      encoding: "shift_jis",
      suspicious: false,
    });
  });

  it("半角カナの Shift_JIS も読む", () => {
    // "ｶﾒﾗ"
    expect(decodeCsvBytes(new Uint8Array([0xb6, 0xd2, 0xd7]))).toEqual({
      text: "ｶﾒﾗ",
      encoding: "shift_jis",
      suspicious: false,
    });
  });

  it("CP932 の拡張文字（①、髙）を読む", () => {
    expect(decodeCsvBytes(new Uint8Array([0x87, 0x40, 0xfb, 0xfc]))).toEqual({
      text: "①髙",
      encoding: "shift_jis",
      suspicious: false,
    });
  });

  it("Shift_JIS としても読めないバイト列は suspicious になる", () => {
    expect(decodeCsvBytes(new Uint8Array([0xff, 0xfd, 0x81]))).toMatchObject({
      encoding: "shift_jis",
      suspicious: true,
    });
  });

  it("NUL を含むバイナリは suspicious になる", () => {
    // PNG の先頭 8 バイト
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(decodeCsvBytes(png)).toMatchObject({ encoding: "shift_jis", suspicious: true });
  });

  it("ASCII だけなら UTF-8 として扱う", () => {
    expect(decodeCsvBytes(utf8("a,b\n1,2"))).toEqual({
      text: "a,b\n1,2",
      encoding: "utf-8",
      suspicious: false,
    });
  });

  it("空のバイト列は空文字", () => {
    expect(decodeCsvBytes(new Uint8Array())).toEqual({
      text: "",
      encoding: "utf-8",
      suspicious: false,
    });
  });
});
