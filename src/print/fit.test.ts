import { describe, expect, it } from "vitest";
import { fitFontSize, resolveMinPt } from "./fit";

/** 1 pt あたり perPt mm の幅になる、まっすぐな測り方。呼ばれた大きさを記録する */
function linear(perPt: number) {
  const calls: number[] = [];
  const measure = (pt: number) => {
    calls.push(pt);
    return pt * perPt;
  };
  return { measure, calls };
}

describe("fitFontSize", () => {
  it("収まるなら元の大きさのまま、1 回だけ測る", () => {
    const { measure, calls } = linear(2);
    expect(fitFontSize({ preferredPt: 24, minPt: 14, availableWidthMm: 80, measure })).toEqual({
      sizePt: 24,
      overflow: false,
    });
    expect(calls).toEqual([24]);
  });

  it("はみ出すなら、収まる中でいちばん大きい刻みの値にする", () => {
    // 幅 60 mm、1 pt あたり 3 mm なら 20 pt まで
    const { measure } = linear(3);
    expect(fitFontSize({ preferredPt: 24, minPt: 14, availableWidthMm: 60, measure })).toEqual({
      sizePt: 20,
      overflow: false,
    });
  });

  it("刻みの途中で収まるときは、刻みに合わせて切り下げる", () => {
    // 61 mm / 3 = 20.33 pt → 0.5 刻みで 20 pt
    const { measure } = linear(3);
    expect(fitFontSize({ preferredPt: 24, minPt: 14, availableWidthMm: 61, measure }).sizePt).toBe(
      20,
    );
  });

  it("刻みを変えられる", () => {
    const { measure } = linear(3);
    const result = fitFontSize({
      preferredPt: 24,
      minPt: 14,
      stepPt: 0.25,
      availableWidthMm: 61,
      measure,
    });
    expect(result.sizePt).toBe(20.25);
  });

  it("最小でも収まらなければ、最小の大きさで overflow", () => {
    const { measure } = linear(10);
    expect(fitFontSize({ preferredPt: 24, minPt: 14, availableWidthMm: 100, measure })).toEqual({
      sizePt: 14,
      overflow: true,
    });
  });

  it("刻みに乗らない最小の大きさでも、ちょうど収まれば使う", () => {
    // 14.3 pt でちょうど 143 mm
    const { measure } = linear(10);
    expect(fitFontSize({ preferredPt: 24, minPt: 14.3, availableWidthMm: 143, measure })).toEqual({
      sizePt: 14.3,
      overflow: false,
    });
  });

  it("小数の刻みでも誤差が残らない", () => {
    const { measure } = linear(1);
    const result = fitFontSize({
      preferredPt: 11,
      minPt: 6,
      stepPt: 0.1,
      availableWidthMm: 9.7,
      measure,
    });
    expect(result.sizePt).toBe(9.7);
  });

  it("minPt が preferredPt 以上なら縮めない", () => {
    const { measure } = linear(10);
    expect(fitFontSize({ preferredPt: 12, minPt: 12, availableWidthMm: 100, measure })).toEqual({
      sizePt: 12,
      overflow: true,
    });
  });

  it("測る回数は候補の数の log 程度", () => {
    // 候補は 24, 23.5, ..., 14.5, 14 の 21 個
    const { measure, calls } = linear(3);
    fitFontSize({ preferredPt: 24, minPt: 14, availableWidthMm: 45, measure });
    expect(calls.length).toBeLessThanOrEqual(6);
  });

  it("刻みや最小が正でなければ RangeError", () => {
    const { measure } = linear(1);
    const base = { preferredPt: 10, minPt: 6, availableWidthMm: 5, measure };
    expect(() => fitFontSize({ ...base, stepPt: 0 })).toThrow(RangeError);
    expect(() => fitFontSize({ ...base, minPt: 0 })).toThrow(RangeError);
  });
});

describe("resolveMinPt", () => {
  it.each([
    [24, 14.5],
    [20, 12],
    [11, 6.5],
    [8, 6],
    [5, 5],
  ])("%d pt の既定の最小は %d pt", (size_pt, expected) => {
    expect(resolveMinPt({ size_pt })).toBe(expected);
  });

  it("min_size_pt が書いてあればそれを使う", () => {
    expect(resolveMinPt({ size_pt: 24, min_size_pt: 18 })).toBe(18);
  });

  it("min_size_pt は size_pt を超えない", () => {
    expect(resolveMinPt({ size_pt: 12, min_size_pt: 20 })).toBe(12);
  });
});
