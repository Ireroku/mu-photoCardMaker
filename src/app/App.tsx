import { useMemo, useReducer, useRef } from "react";
import { checkCsvFile, checkParsedCsv } from "../csv/check";
import { matchColumns } from "../csv/match";
import { parseCsvBytes } from "../csv/parse";
import { hasOverflow } from "../print/autoFit";
import { pageCount as countPages, sheetGeometry } from "../print/geometry";
import { Sheets } from "../print/Sheets";
import { useCardFits } from "../print/useCardFits";
import { TutorialView } from "../tutorial/TutorialView";
import { CsvStep } from "./CsvStep";
import { csvIssues } from "./csvIssues";
import { mapCards, orderCards } from "./derive";
import { HandoverSection } from "./HandoverSection";
import { openStep } from "./openStep";
import { OrderStep } from "./OrderStep";
import { PrintStep } from "./PrintStep";
import { appReducer, initialState } from "./state";
import { Step } from "./Step";
import { useFileDrop, usePreventStrayFileDrop } from "./useFileDrop";
import { usePreviewScale } from "./usePreviewScale";
import "./app.css";

const cardId = (index: number) => `card-${index + 1}`;

/** 「収まりません」の一覧に出すリンクの数。残りは件数だけ出す */
const MAX_OVERFLOW_LINKS = 10;

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { template, csv, columns, order } = state;
  const preview = useRef<HTMLDivElement>(null);

  // 列の対応と並び順を分けて求める。文字の大きさは並べる前の札で測るので、並べ替えても測り直さない
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
    const file = files[0];
    if (!file) return;
    const extra =
      files.length > 1
        ? [
            `${files.length} 個のファイルが選ばれたので、最初の「${file.name}」だけを読み込みました。`,
          ]
        : [];
    const reject = (error: string) =>
      dispatch({ type: "csvRejected", fileName: file.name, error: [error, ...extra].join(" ") });

    const fileProblem = checkCsvFile(file);
    if (fileProblem) return reject(fileProblem);
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return reject(`ファイルを開けませんでした（詳細: ${detail}）。`);
    }
    const result = parseCsvBytes(bytes);
    if (!result.ok) return reject(result.error);
    const contentProblem = checkParsedCsv(result.csv, template.fields);
    if (contentProblem) return reject(contentProblem);
    dispatch({
      type: "csvLoaded",
      csv: { ...result.csv, warnings: [...extra, ...result.csv.warnings], fileName: file.name },
    });
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

  let loadStatus: string | undefined;
  if (state.csvRejected) loadStatus = `「${state.csvRejected.fileName}」を読み込めませんでした`;
  else if (csv && !csvDone) loadStatus = "必須の項目に当たる列を選んでください";
  else if (csv) {
    loadStatus = `「${csv.fileName}」 ${cards.captions.length} 枚`;
    if (issues.length > 0) loadStatus += `・確かめてほしいことが ${issues.length} 件`;
  }

  return (
    <>
      <header className="app-header screen-only">
        <h1>キャプションボード作成ツール</h1>
        <p>Google フォームの回答から、展示用のキャプション（札）を A4 に並べて印刷します。</p>
      </header>

      <div className="workspace">
        <div className="steps screen-only">
          <Step
            id="step-form"
            number={1}
            title="フォームを作る"
            status="初めての人・フォームがまだない人はこちら"
            open={false}
          >
            <TutorialView fields={template.fields} />
            <button
              type="button"
              className="next-step"
              onClick={() => openStep("step-load", "[data-csv-button]")}
            >
              回答が集まったら ② 回答を読み込む へ
            </button>
          </Step>

          <Step
            id="step-load"
            number={2}
            title="回答を読み込む"
            open={!autoComplete}
            done={csvDone && !state.csvRejected}
            status={loadStatus}
          >
            <CsvStep
              csv={csv}
              csvRejected={state.csvRejected}
              fields={template.fields}
              columns={columns}
              autoMapping={autoMapping}
              issues={issues}
              cardCount={cards.captions.length}
              skippedCount={mapped.skippedRows.length}
              onFiles={loadCsv}
              dispatch={dispatch}
            />
          </Step>

          <Step
            id="step-order"
            number={3}
            title="並べて確認"
            open={csv !== null}
            status={csv ? undefined : "CSV を読み込むと並び順を変えられます"}
          >
            {csv ? (
              <OrderStep
                csv={csv}
                fields={template.fields}
                captions={cards.captions}
                rows={cards.rows}
                sortColumn={state.sortColumn}
                overflowCards={overflowCards}
                dispatch={dispatch}
              />
            ) : (
              <p className="note">CSV を読み込むと、ここで札の並び順（展示の順）を変えられます。</p>
            )}
          </Step>

          <Step id="step-print" number={4} title="印刷" open={csv !== null}>
            <PrintStep
              template={template}
              isSample={mapped.isSample}
              savedBorderPt={state.savedBorderPt}
              cardCount={cards.captions.length}
              overflowCount={overflowCards.size}
              fitsReady={cardFits.ready || cardFits.failed}
              dispatch={dispatch}
            />
          </Step>

          <HandoverSection
            template={template}
            templateFileName={state.templateFileName}
            templateRejected={state.templateRejected}
            dispatch={dispatch}
          />
        </div>

        <section
          className="preview-pane"
          aria-label="印刷のプレビュー"
          data-over={previewDrop.isOver || undefined}
          {...previewDrop.handlers}
        >
          <div className="preview-toolbar screen-only">
            <p aria-live="polite">
              {cards.captions.length} 枚の札 → {template.page.size} {pageCount} 枚
            </p>
            {overflowList.length > 0 && (
              <div className="overflow-summary" role="status">
                <p>{overflowList.length} 枚のカードで文字が収まりません（端が「…」で切れます）：</p>
                <ul>
                  {overflowList.slice(0, MAX_OVERFLOW_LINKS).map((i) => (
                    <li key={i}>
                      <a href={`#${cardId(i)}`}>{i + 1} 番</a>
                    </li>
                  ))}
                  {overflowList.length > MAX_OVERFLOW_LINKS && (
                    <li>ほか {overflowList.length - MAX_OVERFLOW_LINKS} 枚</li>
                  )}
                </ul>
              </div>
            )}
            {cardFits.failed && (
              <p className="overflow-summary" role="status">
                文字の自動縮小ができませんでした。長い文字は端が「…」で切れます。
              </p>
            )}
          </div>
          {mapped.isSample && (
            <p className="sample-band screen-only">
              見本 — CSV を読み込むと、本物の札に置き換わります
            </p>
          )}
          <div className="preview" ref={preview} data-sample={mapped.isSample || undefined}>
            {pageCount === 0 ? (
              <p className="preview-empty screen-only">札がありません</p>
            ) : (
              <Sheets
                template={template}
                captions={cards.captions}
                fits={fits}
                cardId={cardId}
                mark={mapped.isSample ? "見本" : undefined}
                badge={(i) => (
                  <span className="card-badge" aria-hidden="true">
                    <span>{i + 1}</span>
                    {overflowCards.has(i) && (
                      <span className="card-badge-warning">収まりません</span>
                    )}
                  </span>
                )}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
