// CSS は App.css を手順ごとの CSS より先に読み込む。同じ強さの指定（例：order.css の .order-buttons button）で手順側を勝たせるため
import { cardId } from "./shared/cardId";
import { Sheets } from "./sheets/Sheets";
import { FormStep } from "./steps/form/FormStep";
import "./App.css";
import { LoadStep } from "./steps/load/LoadStep";
import { OrderStep } from "./steps/order/OrderStep";
import { PrintStep } from "./steps/print/PrintStep";
import { HandoverSection } from "./steps/handover/HandoverSection";
import { openStep } from "./parts/openStep";
import { Step } from "./parts/Step";
import { useCaptionBoard } from "./parts/useCaptionBoard";

export function App() {
  // ref を含むので、オブジェクトのまま持たず取り出して使う（react-hooks/refs のため）
  const {
    state,
    dispatch,
    mapped,
    cards,
    cardFits,
    overflowCards,
    autoComplete,
    autoMapping,
    csvDone,
    fits,
    issues,
    loadCsv,
    loadStatus,
    moreOverflowCount,
    overflowLinks,
    pageCount,
    preview,
    previewDrop,
  } = useCaptionBoard();
  const { template, csv } = state;

  return (
    <>
      <header className="app-header screen-only">
        <h1>キャプションボード作成ツール</h1>
      </header>

      <div className="workspace">
        <div className="steps screen-only">
          <Step id="step-form" number={1} title="フォームを作る" open={false}>
            <FormStep
              fields={template.fields}
              finish={{
                label: "② 回答を読み込む へ",
                onClick: () => openStep("step-load", "[data-csv-button]"),
              }}
            />
          </Step>

          <Step
            id="step-load"
            number={2}
            title="回答を読み込む"
            open={!autoComplete}
            done={csvDone && !state.csvRejected}
            status={loadStatus}
          >
            <LoadStep
              csv={csv}
              csvRejected={state.csvRejected}
              fields={template.fields}
              columns={state.columns}
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
            disabled={csv === null}
          >
            {csv && (
              <OrderStep
                csv={csv}
                fields={template.fields}
                captions={cards.captions}
                rows={cards.rows}
                sortColumn={state.sortColumn}
                overflowCards={overflowCards}
                dispatch={dispatch}
              />
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
              カード {cards.captions.length} 枚 → {template.page.size} {pageCount} 枚
            </p>
            {overflowCards.size > 0 && (
              <div className="overflow-summary" role="status">
                <p>{overflowCards.size} 枚のカードで文字が収まらず、省略されます：</p>
                <ul>
                  {overflowLinks.map((i) => (
                    <li key={i}>
                      <a href={`#${cardId(i)}`}>{i + 1} 番</a>
                    </li>
                  ))}
                  {moreOverflowCount > 0 && <li>ほか {moreOverflowCount} 枚</li>}
                </ul>
              </div>
            )}
            {cardFits.failed && (
              <p className="overflow-summary" role="status">
                文字の自動縮小ができませんでした。長い文字は省略されます。
              </p>
            )}
          </div>
          {mapped.isSample && <p className="sample-band screen-only">見本</p>}
          <div className="preview" ref={preview} data-sample={mapped.isSample || undefined}>
            {pageCount === 0 ? (
              <p className="preview-empty screen-only">カードがありません</p>
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
