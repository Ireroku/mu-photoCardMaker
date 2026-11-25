// 画面全体の状態。状態は App の useCaptionBoard にある useReducer の 1 か所だけに持ち、キャプションや並び順の表示は derive.ts で求める。

import type { LoadedCsv } from "../csv/loadCsvFile";
import { columnValues, matchColumns, type ColumnAssignments } from "../csv/match";
import { DEFAULT_BORDER_PT, ORDER_HEADER } from "../settings";
import { normalizeLabel } from "../shared/normalize";
import { DEFAULT_PRESET } from "../template/presets";
import { validateTemplate } from "../template/parse";
import type { Field, Template } from "../template/schema";
import { moveItem, orderByKeys } from "./parts/order";

export type AppState = {
  template: Template;
  /** 今使っているテンプレートの出どころ。用意したもの（id）か、読み込んだファイル（名前） */
  templateSource: TemplateSource;
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

export type TemplateSource = { presetId: string } | { fileName: string };

export type AppAction =
  | { type: "templateLoaded"; template: Template; source: TemplateSource }
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

export const initialState: AppState = {
  template: DEFAULT_PRESET.template,
  templateSource: { presetId: DEFAULT_PRESET.id },
  templateRejected: null,
  csv: null,
  csvRejected: null,
  columns: {},
  order: null,
  sortColumn: null,
  savedBorderPt: DEFAULT_PRESET.template.card.border_pt || DEFAULT_BORDER_PT,
};

/** 並び順の列の見出し（正規化したもの）。この列があれば、読み込んだときにその列で並べる */
const orderHeader = normalizeLabel(ORDER_HEADER);

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "templateLoaded": {
      const { template } = action;
      return {
        ...state,
        template,
        templateSource: action.source,
        templateRejected: null,
        columns: state.csv ? carryColumns(state, template.fields) : state.columns,
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
      const sortColumn = csv.headers.findIndex((h) => normalizeLabel(h) === orderHeader);
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

/**
 * テンプレートを替えたときの列の対応。同じ key の項目は、今の列をそのまま使う
 * （「機材名」と「機種名」のように質問の文が違っても、同じ key なら同じ列）。
 * 今の列がない項目だけ、見出しから自動で選ぶ。並び順はそのまま
 */
function carryColumns(state: AppState, fields: readonly Field[]): ColumnAssignments {
  const auto = state.csv ? matchColumns(state.csv.headers, fields).columns : {};
  return Object.fromEntries(
    fields.map(({ key }) => [key, state.columns[key] ?? auto[key] ?? null]),
  );
}

/** 画面に出すテンプレートの名前。JSON に name がなければ、読み込んだファイルの名前を使う */
export function templateName(template: Template, source: TemplateSource): string {
  return template.name ?? ("fileName" in source ? source.fileName : source.presetId);
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
