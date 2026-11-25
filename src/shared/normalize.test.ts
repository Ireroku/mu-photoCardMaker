import { describe, expect, it } from "vitest";
import { normalizeLabel } from "./normalize";

describe("normalizeLabel", () => {
  it("前後の空白を削る", () => {
    expect(normalizeLabel("  題名  ")).toBe("題名");
  });

  it("全角スペースを含む空白の連続を 1 つにまとめる", () => {
    expect(normalizeLabel("撮影\u3000\u3000者名")).toBe("撮影 者名");
    expect(normalizeLabel("\u3000題名\u3000")).toBe("題名");
    expect(normalizeLabel("a\t\nb")).toBe("a b");
  });

  it("全角英数と半角カナをそろえる", () => {
    expect(normalizeLabel("ＡＢＣ１２３")).toBe("abc123");
    expect(normalizeLabel("ｶﾒﾗ")).toBe("カメラ");
  });

  it("全角かっこは半角になるが、（必須）の文字そのものは残す", () => {
    expect(normalizeLabel("題名（必須）")).toBe("題名(必須)");
    expect(normalizeLabel("題名（必須）")).toBe(normalizeLabel("題名(必須)"));
  });

  it("末尾の必須マークを削る", () => {
    expect(normalizeLabel("題名 *")).toBe("題名");
    expect(normalizeLabel("題名*")).toBe("題名");
    expect(normalizeLabel("題名＊")).toBe("題名");
  });

  it("途中の * は残す", () => {
    expect(normalizeLabel("a*b")).toBe("a*b");
  });

  it("ゼロ幅の文字を取り除く", () => {
    expect(normalizeLabel("題\u200B名")).toBe("題名");
    expect(normalizeLabel("\u200C題\u200D名\u2060")).toBe("題名");
  });

  it("BOM（U+FEFF）は空白にせず取り除く", () => {
    expect(normalizeLabel("\uFEFFタイムスタンプ")).toBe("タイムスタンプ");
    expect(normalizeLabel("題\uFEFF名")).toBe("題名");
  });

  it("英字の大文字小文字を区別しない", () => {
    expect(normalizeLabel("Email Address")).toBe("email address");
  });

  it("空文字は空文字のまま", () => {
    expect(normalizeLabel("")).toBe("");
    expect(normalizeLabel("\u3000 \u200B")).toBe("");
  });
});
