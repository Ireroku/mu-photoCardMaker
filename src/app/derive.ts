// 状態から画面に出すものを求める（純粋な計算）。結果は状態に入れず、毎回ここで求める。
// 列の対応（mapCards）と並び順（orderCards）を分けておき、並べ替えただけでは文字の測り直しが起きないようにする。

import { applyMapping, type ColumnAssignments } from "../csv/match";
import type { Caption } from "../print/geometry";
import { identityOrder } from "./order";
import { SAMPLE_CAPTIONS } from "./sampleCaptions";
import type { AppState, LoadedCsv } from "./state";

export type MappedCards = {
  /** CSV を読み込む前で、見本を出している */
  isSample: boolean;
  /** 読み込んだ順のキャプション（空の行は除く） */
  captions: Caption[];
  /** captions のそれぞれが、CSV の何番目の行（0 始まり、見出しを除く）から来たか */
  rowIndexes: number[];
  /** 対応付けた列がすべて空だったため除いた行の番号 */
  skippedRows: number[];
};

/** 列の対応に従って、1 行 1 枚のキャプションにする。CSV がなければ見本 */
export function mapCards(csv: LoadedCsv | null, columns: ColumnAssignments): MappedCards {
  if (csv === null) {
    return {
      isSample: true,
      captions: SAMPLE_CAPTIONS,
      rowIndexes: identityOrder(SAMPLE_CAPTIONS.length),
      skippedRows: [],
    };
  }
  return { isSample: false, ...applyMapping(csv, columns) };
}

export type OrderedCards = {
  /** 並び順どおりのキャプション */
  captions: Caption[];
  /** captions のそれぞれの、CSV の行の番号 */
  rows: number[];
  /** captions のそれぞれが、mapped.captions の何番目か */
  positions: number[];
};

/** 並び順（行の番号の並び。null なら読み込んだ順）に並べる */
export function orderCards(mapped: MappedCards, order: readonly number[] | null): OrderedCards {
  const positionOfRow = new Map(mapped.rowIndexes.map((row, i) => [row, i]));
  const rows = (order ?? mapped.rowIndexes).filter((row) => positionOfRow.has(row));
  const positions = rows.map((row) => positionOfRow.get(row)!);
  return { captions: positions.map((i) => mapped.captions[i]!), rows, positions };
}

/** mapCards と orderCards をまとめて行う（テスト用） */
export function deriveCards(state: Pick<AppState, "csv" | "columns" | "order">) {
  const mapped = mapCards(state.csv, state.columns);
  return { ...mapped, ...orderCards(mapped, state.order) };
}
