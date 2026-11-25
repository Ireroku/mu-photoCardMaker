import { describe, expect, it } from "vitest";
import type { LoadedCsv } from "../csv/loadCsvFile";
import { deriveCards } from "./derive";
import { adjustTemplate, appReducer, initialState, type AppAction, type AppState } from "./state";

const CSV: LoadedCsv = {
  fileName: "answers.csv",
  headers: ["タイムスタンプ", "題名", "撮影者名", "並び順"],
  rows: [
    ["t1", "A", "a", "3"],
    ["t2", "", "", "1"],
    ["t3", "C", "c", ""],
    ["t4", "D", "d", "2"],
  ],
  encoding: "utf-8",
  suspicious: false,
  warnings: [],
};

const run = (...actions: AppAction[]): AppState => actions.reduce(appReducer, initialState);
const titles = (state: AppState) => deriveCards(state).captions.map((c) => c.title);

describe("appReducer と deriveCards", () => {
  it("CSV を読む前は見本を出す", () => {
    expect(deriveCards(initialState).isSample).toBe(true);
  });

  it("CSV を読むと列を対応付け、「並び順」の列で並べ、空の行を除く", () => {
    const state = run({ type: "csvLoaded", csv: CSV });
    expect(state.columns).toMatchObject({ title: 1, author: 2, place: null, camera: null });
    expect(state.sortColumn).toBe(3);
    const cards = deriveCards(state);
    expect(cards.isSample).toBe(false);
    expect(cards.captions.map((c) => c.title)).toEqual(["D", "A", "C"]);
    expect(cards.rows).toEqual([3, 0, 2]);
    expect(cards.skippedRows).toEqual([1]);
  });

  it("手で動かすと、並び替えの列の選択を外す", () => {
    const loaded = run({ type: "csvLoaded", csv: CSV });
    const moved = appReducer(loaded, {
      type: "cardMoved",
      visibleRows: deriveCards(loaded).rows,
      from: 2,
      to: 0,
    });
    expect(titles(moved)).toEqual(["C", "D", "A"]);
    expect(moved.sortColumn).toBeNull();
  });

  it("除いていた行が、列の対応を変えて現れても、手で並べた順は崩れない", () => {
    const loaded = run({ type: "csvLoaded", csv: CSV }, { type: "sortedByColumn", column: null });
    const moved = appReducer(loaded, {
      type: "cardMoved",
      visibleRows: deriveCards(loaded).rows,
      from: 2,
      to: 0,
    });
    expect(titles(moved)).toEqual(["D", "A", "C"]);
    // タイムスタンプを題名に当てると、2 行目も空ではなくなる
    const remapped = appReducer(moved, { type: "columnAssigned", key: "place", column: 0 });
    expect(titles(remapped)).toEqual(["D", "A", "C", ""]);
  });

  it("切り取り線を消して付け直すと、前の太さに戻る", () => {
    const state = run({ type: "borderChanged", pt: 0.5 }, { type: "cutLinesToggled", on: false });
    expect(state.template.card.border_pt).toBe(0);
    expect(appReducer(state, { type: "cutLinesToggled", on: true }).template.card.border_pt).toBe(
      0.5,
    );
  });

  it("テンプレートとして正しくない余白は受け付けない", () => {
    expect(run({ type: "marginChanged", mm: 51 }).template).toBe(initialState.template);
    expect(run({ type: "marginChanged", mm: 8 }).template.page.margin_mm).toBe(8);
  });

  it("余白を変えても layout は同じオブジェクトのまま", () => {
    expect(run({ type: "marginChanged", mm: 8 }).template.layout).toBe(
      initialState.template.layout,
    );
  });

  it("同じ項目のテンプレートを読み込んでも、手で選んだ列を残す", () => {
    const edited = run(
      { type: "csvLoaded", csv: CSV },
      { type: "columnAssigned", key: "place", column: 0 },
    );
    const same = appReducer(edited, {
      type: "templateLoaded",
      template: { ...edited.template },
      fileName: "t.json",
    });
    expect(same.columns.place).toBe(0);
    const fields = edited.template.fields.map((f) =>
      f.key === "place" ? { ...f, label: "場所" } : f,
    );
    const changed = appReducer(edited, {
      type: "templateLoaded",
      template: { ...edited.template, fields },
      fileName: "t.json",
    });
    expect(changed.columns.place).toBeNull();
  });

  it("並び順の列が重複していれば、左から空でない値で並べる", () => {
    const csv: LoadedCsv = {
      ...CSV,
      headers: ["題名", "並び順", "並び順"],
      rows: [
        ["A", "", "2"],
        ["B", "1", ""],
      ],
    };
    expect(titles(run({ type: "csvLoaded", csv }))).toEqual(["B", "A"]);
  });

  it("adjustTemplate は、札が小さくなりすぎる値なら null", () => {
    // 20 行・padding 3 mm なら、余白 50 mm でカードの高さ（5.5 mm）が padding と罫線に足りない
    const dense = {
      ...initialState.template,
      grid: { columns: 20, rows: 20 },
      card: { border_pt: 1, padding_mm: 3 },
    };
    expect(adjustTemplate(dense, { margin_mm: 0 })).not.toBeNull();
    expect(adjustTemplate(dense, { margin_mm: 50 })).toBeNull();
  });
});
