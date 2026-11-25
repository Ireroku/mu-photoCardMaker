// 手順①：テンプレートを選ぶ。用意したテンプレートを見本のカードで並べ、最後に自分のテンプレート JSON を読み込む枠を置く。
// 最初から先頭のテンプレートが選ばれているので、そのままでよければ飛ばせる。

import { useMemo, useRef, type Dispatch } from "react";
import { MAX_SHOWN_ERRORS } from "../../settings";
import { takePickedFiles } from "../../shared/takePickedFiles";
import { CardSample } from "../../sheets/CardSample";
import type { AppAction, TemplateSource } from "../../state/state";
import { TEMPLATE_PRESETS } from "../../template/presets";
import type { Template } from "../../template/schema";
import { readTemplateFile } from "../../template/templateFile";
import { sampleCaption } from "./parts/sampleCaption";
import "./parts/template-step.css";

type TemplateStepProps = {
  source: TemplateSource;
  templateRejected: { fileName: string; errors: readonly string[] } | null;
  dispatch: Dispatch<AppAction>;
};

export function TemplateStep({ source, templateRejected, dispatch }: TemplateStepProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const shownErrors = templateRejected?.errors.slice(0, MAX_SHOWN_ERRORS) ?? [];
  const hiddenErrorCount = (templateRejected?.errors.length ?? 0) - shownErrors.length;
  const loadedFile = "fileName" in source ? source.fileName : undefined;

  return (
    <>
      <div className="template-gallery" role="radiogroup" aria-label="テンプレート">
        {TEMPLATE_PRESETS.map(({ id, template }) => (
          <label className="template-tile" key={id}>
            <input
              type="radio"
              name="template"
              className="visually-hidden"
              checked={"presetId" in source && source.presetId === id}
              onChange={() =>
                dispatch({ type: "templateLoaded", template, source: { presetId: id } })
              }
            />
            <PresetSample template={template} />
            <span className="template-name">{template.name}</span>
            <span className="template-fields">{fieldSummary(template)}</span>
          </label>
        ))}
        <button
          type="button"
          className="template-tile template-load"
          data-selected={loadedFile !== undefined || undefined}
          onClick={() => fileInput.current?.click()}
        >
          <span className="template-name">テンプレート JSON を読み込む</span>
          {loadedFile && <span className="template-fields">「{loadedFile}」を使っています</span>}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (event) => {
            const file = takePickedFiles(event)[0];
            if (file) dispatch(await readTemplateFile(file));
          }}
        />
      </div>
      {templateRejected && (
        <div className="message error" role="alert">
          <p>
            「{templateRejected.fileName}
            」を読み込めませんでした。今のテンプレートをそのまま使っています。
          </p>
          <details>
            <summary>くわしく（ファイルを手で書き換えたときに起きやすい誤りです）</summary>
            <ul>
              {shownErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {hiddenErrorCount > 0 && <li>ほか {hiddenErrorCount} 件</li>}
            </ul>
          </details>
        </div>
      )}
    </>
  );
}

function PresetSample({ template }: { template: Template }) {
  const caption = useMemo(() => sampleCaption(template), [template]);
  return (
    <span className="template-sample">
      <CardSample template={template} caption={caption} />
    </span>
  );
}

/** 「題名（2行）・撮影者名・撮影場所」。layout の順に、折り返す項目には行の数を添える */
function fieldSummary(template: Template): string {
  const labels = new Map(template.fields.map((f) => [f.key, f.label]));
  return template.layout
    .flatMap((entry) => (entry.kind === "section" ? entry.items : []))
    .flatMap((item) => {
      if (item.kind !== "text") return [];
      const label = labels.get(item.field) ?? item.field;
      return [(item.max_lines ?? 1) > 1 ? `${label}（${item.max_lines}行）` : label];
    })
    .join("・");
}
