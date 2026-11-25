// 手順④：印刷する。印刷の前に、印刷の画面で確かめる設定を短い一覧で見せる。
// 余白と切り取り線の調整は「印刷がずれたとき」の中にしまっておく（既定のままでよい人が多いため）。

import { useRef, type Dispatch } from "react";
import { BORDER_PT, MARGIN_MM } from "../../settings";
import { sheetGeometry } from "../../sheets/geometry";
import { adjustTemplate, type AppAction, type TemplateAdjustment } from "../../state/state";
import type { Template } from "../../template/schema";
import { NumberField } from "./parts/NumberField";
import "./parts/print-step.css";

type PrintStepProps = {
  template: Template;
  isSample: boolean;
  savedBorderPt: number;
  cardCount: number;
  /** 文字が省略されるカードがあるときの知らせ */
  overflowMessage: string | undefined;
  /** 文字の自動縮小が今の設定で測り終わっている */
  fitsReady: boolean;
  dispatch: Dispatch<AppAction>;
};

const TOO_SMALL = "この値だとカードが小さくなりすぎます。";

export function PrintStep(props: PrintStepProps) {
  const { template, isSample, savedBorderPt, cardCount, overflowMessage, fitsReady, dispatch } =
    props;
  const dialog = useRef<HTMLDialogElement>(null);
  const { card } = sheetGeometry(template);
  const cutLines = template.card.border_pt > 0;

  /** テンプレートとして使える値なら反映し、使えなければ理由を返す */
  const tryAdjust = (change: TemplateAdjustment, action: AppAction): string | null => {
    if (adjustTemplate(template, change) === null) return TOO_SMALL;
    dispatch(action);
    return null;
  };

  async function onClose() {
    const element = dialog.current;
    if (!element) return;
    const choice = element.returnValue;
    // Esc で閉じたときは値が入らず、ブラウザによっては前の値が残るので、毎回空に戻す
    element.returnValue = "";
    if (choice !== "print") return;
    // フォントの読み込みが終わる前に印刷すると、別のフォントで出ることがある
    await document.fonts.ready;
    window.print();
  }

  return (
    <>
      <button
        type="button"
        className={isSample ? undefined : "primary"}
        disabled={cardCount === 0}
        onClick={() => dialog.current?.showModal()}
      >
        {isSample ? "見本を印刷 / PDF に保存" : "印刷 / PDF に保存"}
      </button>
      {cardCount === 0 && <p className="note">カードが 1 枚もないので印刷できません。</p>}

      <details className="adjust">
        <summary>印刷がずれたとき・切り取り線を変えたいとき</summary>
        <div className="adjust-body">
          <NumberField
            label="外側の余白"
            unit="mm"
            value={template.page.margin_mm}
            min={MARGIN_MM.min}
            max={MARGIN_MM.max}
            step={MARGIN_MM.step}
            onCommit={(mm) => tryAdjust({ margin_mm: mm }, { type: "marginChanged", mm })}
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={cutLines}
              onChange={(event) =>
                dispatch({ type: "cutLinesToggled", on: event.currentTarget.checked })
              }
            />
            切り取り線を引く
          </label>
          <NumberField
            label="切り取り線の太さ"
            unit="pt"
            value={cutLines ? template.card.border_pt : savedBorderPt}
            min={BORDER_PT.inputMin}
            max={BORDER_PT.max}
            step={BORDER_PT.step}
            disabled={!cutLines}
            onCommit={(pt) => tryAdjust({ border_pt: pt }, { type: "borderChanged", pt })}
          />
          <p className="note">
            カード 1 枚は 約 {card.width.toFixed(1)} × {card.height.toFixed(1)} mm
            です。ここで変えた値は、ページの下の「設定ファイル」でダウンロードするファイルにも入ります。
          </p>
        </div>
      </details>

      <dialog
        ref={dialog}
        className="print-dialog"
        aria-labelledby="print-dialog-title"
        onClose={onClose}
      >
        <h2 id="print-dialog-title">印刷の画面で確かめること</h2>
        {/*
          未確認：項目名（倍率・余白など）と「余白：なし」が要るかどうかは、ブラウザ（Chrome / Safari / Edge）の
          実際の印刷の画面ではまだ確かめていない。@page { margin: 0 } で余白が自動で効くなら、3 つ目は消せる
        */}
        <ol className="checklist">
          <li>
            PDF にするときは、送信先を<strong>「PDF に保存」</strong>にする
          </li>
          <li>
            倍率を<strong>100%</strong>にする（「実際のサイズ」と書かれていることもある）
          </li>
          <li>
            余白を<strong>「なし」</strong>にする
          </li>
        </ol>
        {overflowMessage && <p className="field-error">{overflowMessage}。</p>}
        {isSample && (
          <p className="note">今は見本のカードです。各ページに「見本」と印刷されます。</p>
        )}
        <form method="dialog" className="dialog-buttons">
          <button value="print" className="primary" disabled={!fitsReady} autoFocus>
            {fitsReady ? "印刷の画面を開く" : "文字の大きさを計算中…"}
          </button>
          <button value="">やめる</button>
        </form>
      </dialog>
    </>
  );
}
