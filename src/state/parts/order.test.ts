import { describe, expect, it } from "vitest";
import { identityOrder, moveItem, orderByKeys, parseOrderKey } from "./order";

describe("parseOrderKey", () => {
  it.each([
    ["3", 3],
    ["１２", 12],
    [" 7 ", 7],
    ["　５　", 5],
    ["2.5", 2.5],
  ])("「%s」は %d", (value, expected) => {
    expect(parseOrderKey(value)).toBe(expected);
  });

  it.each([[""], ["  "], ["abc"], ["3番"], [undefined]])("「%s」は空欄扱い", (value) => {
    expect(parseOrderKey(value)).toBeUndefined();
  });
});

describe("orderByKeys", () => {
  it("小さい順に並べる（全角の数字も数として比べる）", () => {
    expect(orderByKeys(["3", "１", "10", "2"])).toEqual([1, 3, 0, 2]);
  });

  it("空欄は最後に回し、空欄どうしは元の順を保つ", () => {
    expect(orderByKeys(["", "2", undefined, "1", "x"])).toEqual([3, 1, 0, 2, 4]);
  });

  it("同じ値どうしは元の順を保つ", () => {
    expect(orderByKeys(["2", "1", "2", "1"])).toEqual([1, 3, 0, 2]);
  });

  it("0 件なら空", () => {
    expect(orderByKeys([])).toEqual([]);
  });
});

describe("moveItem", () => {
  const order = [0, 1, 2, 3];

  it("後ろへ動かす", () => {
    expect(moveItem(order, 0, 2)).toEqual([1, 2, 0, 3]);
  });

  it("前へ動かす", () => {
    expect(moveItem(order, 3, 1)).toEqual([0, 3, 1, 2]);
  });

  it("同じ位置なら変わらない", () => {
    expect(moveItem(order, 2, 2)).toEqual(order);
  });

  it("元の配列は変えない", () => {
    moveItem(order, 0, 3);
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it("to が範囲の外なら端に寄せる", () => {
    expect(moveItem(order, 1, -1)).toEqual([1, 0, 2, 3]);
    expect(moveItem(order, 1, 99)).toEqual([0, 2, 3, 1]);
  });

  it("from が範囲の外なら RangeError", () => {
    expect(() => moveItem(order, 4, 0)).toThrow(RangeError);
    expect(() => moveItem(order, -1, 0)).toThrow(RangeError);
  });
});

describe("identityOrder", () => {
  it("読み込んだ順の番号を並べる", () => {
    expect(identityOrder(3)).toEqual([0, 1, 2]);
    expect(identityOrder(0)).toEqual([]);
  });
});
