// 画面全体の状態と、そこから求めるカード・文字の大きさ・手順の状態をまとめる。App.tsx はここが返すものを並べるだけ。

import { useMemo, useReducer, useRef } from "react";
import { csvIssues } from "../csv/csvIssues";
import { loadCsvFile } from "../csv/loadCsvFile";
import { matchColumns } from "../csv/match";
import { MAX_OVERFLOW_LINKS } from "../settings";
import { useFileDrop, usePreventStrayFileDrop } from "../shared/useFileDrop";
import { hasOverflow } from "../sheets/autoFit";
import { pageCount as countPages, sheetGeometry } from "../sheets/geometry";
import { useCardFits } from "../sheets/useCardFits";
import { mapCards, orderCards } from "../state/derive";
import { appReducer, initialState } from "../state/state";
import { usePreviewScale } from "./usePreviewScale";

export function useCaptionBoard() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { template, csv, columns, order } = state;
  const preview = useRef<HTMLDivElement>(null);

  // 列の対応と並び順を分けて求める。文字の大きさは並べる前のカードで測るので、並べ替えても測り直さない
  const mapped = useMemo(() => mapCards(csv, columns), [csv, columns]);
  const cards = useMemo(() => orderCards(mapped, order), [mapped, order]);
  const cardFits = useCardFits(template, mapped.captions);
  const fits = useMemo(
    () => cardFits.fits && cards.positions.map((i) => cardFits.fits?.[i] ?? {}),
    [cardFits.fits, cards.positions],
  );
  const overflowCards = useMemo(
    () => new Set(fits?.flatMap((fit, i) => (hasOverflow(fit) ? [i] : [])) ?? []),
    [fits],
  );
  const overflowList = [...overflowCards];

  const autoMapping = useMemo(
    () => (csv ? matchColumns(csv.headers, template.fields) : null),
    [csv, template.fields],
  );
  const issues = csv && autoMapping ? csvIssues(csv, autoMapping) : [];

  const geometry = sheetGeometry(template);
  const pageCount = countPages(cards.captions.length, template);
  usePreviewScale(preview, geometry.paper.width);
  usePreventStrayFileDrop();

  /** CSV を読み込む。確かめに通らなかったときは、今の CSV と並び順をそのまま残す */
  async function loadCsv(files: readonly File[]) {
    const result = await loadCsvFile(files, template.fields);
    if (!result) return;
    if (result.ok) dispatch({ type: "csvLoaded", csv: result.csv });
    else dispatch({ type: "csvRejected", fileName: result.fileName, error: result.error });
  }
  const previewDrop = useFileDrop(loadCsv);

  const missingRequired = template.fields.filter(
    (f) => f.required && (columns[f.key] ?? null) === null,
  );
  const csvDone = csv !== null && missingRequired.length === 0;
  // 手順②を自動で閉じるかは、自動の対応付けの結果と警告で決める。
  // 手で列を選んだ途端に閉じて、操作中の欄が消えないようにするため
  const autoComplete =
    autoMapping !== null &&
    issues.length === 0 &&
    template.fields.every((f) => !f.required || autoMapping.columns[f.key] !== null);

  /** 閉じた手順②にも出す 1 行の状態 */
  let loadStatus: string | undefined;
  if (state.csvRejected) loadStatus = `「${state.csvRejected.fileName}」を読み込めませんでした`;
  else if (csv && !csvDone) loadStatus = "必須の質問に当たる列を選んでください";
  else if (csv) {
    loadStatus = `「${csv.fileName}」 ${cards.captions.length} 枚`;
    if (issues.length > 0) loadStatus += `・確かめてほしいことが ${issues.length} 件`;
  }

  return {
    state,
    dispatch,
    mapped,
    cards,
    cardFits,
    fits,
    overflowCards,
    /** 「収まりません」の一覧にリンクで出すカードの番号 */
    overflowLinks: overflowList.slice(0, MAX_OVERFLOW_LINKS),
    /** リンクにせず件数だけ出すカードの数 */
    moreOverflowCount: Math.max(0, overflowList.length - MAX_OVERFLOW_LINKS),
    autoMapping,
    issues,
    pageCount,
    csvDone,
    autoComplete,
    loadStatus,
    loadCsv,
    preview,
    previewDrop,
  };
}
