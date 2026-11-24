// 画面全体の状態。状態はここの useReducer の 1 か所だけに持ち、キャプションや並び順の表示は derive.ts で求める。

import { columnValues, matchColumns, type ColumnAssignments } from "../csv/match";
import { normalizeLabel } from "../csv/normalize";
import type { ParsedCsv } from "../csv/parse";
import { DEFAULT_TEMPLATE } from "../template/default";
import { validateTemplate } from "../template/parse";
import type { Field, Template } from "../template/schema";
import { moveItem, orderByKeys } from "./order";

export type LoadedCsv = ParsedCsv & { fileName: string };

export type AppState = {
  template: Template;
  /** 今使っているテンプレートを読み込んだファイルの名前。既定のテンプレートなら undefined */
  templateFileName: string | undefined;
  /** 最後に読み込もうとして失敗したテンプレートとエラー。失敗していなければ null */
  templateRejected: { fileName: string; errors: readonly string[] } | null;
  /** 読み込んだ CSV。読み込む前は null（画面は見本を出す） */
  csv: LoadedCsv | null;
  /** 最後に読み込もうとして失敗した CSV。失敗していなければ null */
  csvRejected: { fileName: string; error: string } | null;
  /** フィールドの key → CSV の列の番号。CSV を読み込んだときに自動で決め、画面で付け替えられる */
  columns: ColumnAssignments;
  /**
   * 並び順。CSV の行の番号（0 始まり、見出しを除く）を並べたもの。null なら読み込んだ順。
   * すべての行を含むので、列の対応を変えて空の行が増減しても、手で並べた順は崩れない
   */
  order: number[] | null;
  /** 並び替えに使った列の番号。手で動かしたら null に戻す */
  sortColumn: number | null;
  /** 切り取り線を消す前の太さ。もう一度線を付けるときに使う */
  savedBorderPt: number;
};

export type AppAction =
  | { type: "templateLoaded"; template: Template; fileName: string }
  | { type: "templateRejected"; errors: string[]; fileName: string }
  | { type: "csvLoaded"; csv: LoadedCsv }
  | { type: "csvRejected"; fileName: string; error: string }
  | { type: "columnAssigned"; key: string; column: number | null }
  | { type: "sortedByColumn"; column: number | null }
  /** 表示している順で from 番目のカードを to 番目へ動かす。visibleRows はその表示順の行の番号 */
  | { type: "cardMoved"; visibleRows: readonly number[]; from: number; to: number }
  | { type: "marginChanged"; mm: number }
  | { type: "cutLinesToggled"; on: boolean }
  | { type: "borderChanged"; pt: number };

const DEFAULT_BORDER_PT = 1;

export const initialState: AppState = {
  template: DEFAULT_TEMPLATE,
  templateFileName: undefined,
  templateRejected: null,
  csv: null,
  csvRejected: null,
  columns: {},
  order: null,
  sortColumn: null,
  savedBorderPt: DEFAULT_TEMPLATE.card.border_pt || DEFAULT_BORDER_PT,
};

/** 「並び順」という見出しの列があれば、読み込んだときにその列で並べる */
const ORDER_HEADER = normalizeLabel("並び順");

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "templateLoaded": {
      const { template } = action;
      return {
        ...state,
        template,
        templateFileName: action.fileName,
        templateRejected: null,
        // 項目が変わったときだけ列の対応を付け直す（同じなら手で選んだ列を残す）。並び順はそのまま
        columns:
          state.csv && !sameFields(state.template.fields, template.fields)
            ? matchColumns(state.csv.headers, template.fields).columns
            : state.columns,
        savedBorderPt: template.card.border_pt || state.savedBorderPt,
      };
    }
    case "templateRejected":
      // 読み込めなかったときは、今のテンプレートをそのまま使い続ける
      return {
        ...state,
        templateRejected: { fileName: action.fileName, errors: action.errors },
      };
    case "csvLoaded": {
      const { csv } = action;
      const sortColumn = csv.headers.findIndex((h) => normalizeLabel(h) === ORDER_HEADER);
      return {
        ...state,
        csv,
        csvRejected: null,
        columns: matchColumns(csv.headers, state.template.fields).columns,
        ...sortedBy(csv, sortColumn === -1 ? null : sortColumn),
      };
    }
    case "csvRejected":
      return { ...state, csvRejected: { fileName: action.fileName, error: action.error } };
    case "columnAssigned":
      return { ...state, columns: { ...state.columns, [action.key]: action.column } };
    case "sortedByColumn":
      return state.csv ? { ...state, ...sortedBy(state.csv, action.column) } : state;
    case "cardMoved": {
      const { visibleRows, from, to } = action;
      if (!state.csv || from === to) return state;
      // 画面に出していない（空のため除いた）行は、後ろにまとめておく
      const visible = new Set(visibleRows);
      const hidden = (state.order ?? state.csv.rows.map((_, i) => i)).filter(
        (row) => !visible.has(row),
      );
      return { ...state, order: [...moveItem(visibleRows, from, to), ...hidden], sortColumn: null };
    }
    case "marginChanged":
      return withTemplate(state, adjustTemplate(state.template, { margin_mm: action.mm }));
    case "cutLinesToggled":
      return withTemplate(
        state,
        adjustTemplate(state.template, { border_pt: action.on ? state.savedBorderPt : 0 }),
      );
    case "borderChanged":
      return withTemplate(state, adjustTemplate(state.template, { border_pt: action.pt }));
  }
}

/** key と label（正規化して比べる）が同じ順に並んでいれば、同じ項目とみなす */
function sameFields(a: readonly Field[], b: readonly Field[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (field, i) =>
        field.key === b[i]?.key && normalizeLabel(field.label) === normalizeLabel(b[i].label),
    )
  );
}

function sortedBy(csv: LoadedCsv, column: number | null): Pick<AppState, "order" | "sortColumn"> {
  if (column === null) return { order: null, sortColumn: null };
  // 同じ見出しの列が複数あれば、列の対応と同じく左から空でない値を使う
  return { order: orderByKeys(columnValues(csv, column)), sortColumn: column };
}

export type TemplateAdjustment = { margin_mm?: number; border_pt?: number };

/**
 * 画面で変えた余白や罫線をテンプレートに書き込んだものを返す。書き出せば翌年に引き継げる。
 * テンプレートとして正しくならない値（カードが小さくなりすぎるなど）なら null。
 * 検証の結果ではなく元の値を使い、layout などを同じオブジェクトのままにする（文字の測り直しを減らす）
 */
export function adjustTemplate(template: Template, change: TemplateAdjustment): Template | null {
  const next: Template = {
    ...template,
    page:
      change.margin_mm === undefined
        ? template.page
        : { ...template.page, margin_mm: change.margin_mm },
    card:
      change.border_pt === undefined
        ? template.card
        : { ...template.card, border_pt: change.border_pt },
  };
  return validateTemplate(next).ok ? next : null;
}

function withTemplate(state: AppState, template: Template | null): AppState {
  if (template === null) return state;
  return { ...state, template, savedBorderPt: template.card.border_pt || state.savedBorderPt };
}
