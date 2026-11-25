// 手順①の各手順で、本文の上に出す Google フォームの画面の見本。
// HTML/CSS でざっくり再現したもので、本物の画面とは細部が違ってよい。
// 手順の文で同じ内容を説明しているので、見本は読み上げの対象から外す（aria-hidden）。

import { GOOGLE_FORM_TYPES, type TutorialStep } from "./tutorialSteps";

export function StepPreview({ step }: { step: TutorialStep }) {
  return (
    <div className="tutorial-preview" aria-hidden="true">
      <PreviewOf step={step} />
    </div>
  );
}

function PreviewOf({ step }: { step: TutorialStep }) {
  switch (step.kind) {
    case "intro":
      return (
        <div className="gf-card gf-card--header gf-card--active">
          <p className="gf-header-title">無題のフォーム</p>
          <p className="gf-header-desc">フォームの説明</p>
        </div>
      );
    case "settings":
      return (
        <div className="gf-card">
          <p className="gf-card-heading">回答</p>
          <SwitchRow label="回答を 1 回に制限する" on={false} />
          <SwitchRow label="メールアドレスを収集する" on={false} />
        </div>
      );
    case "question": {
      const type = GOOGLE_FORM_TYPES[step.fieldType];
      return (
        <div className="gf-card gf-card--active">
          <div className="gf-question-row">
            <p className="gf-question-title">
              {step.title}
              {step.required && <span className="gf-required"> *</span>}
            </p>
            <span className="gf-type-select">{type.formLabel}</span>
          </div>
          {step.description && <p className="gf-question-desc">{step.description}</p>}
          <p className="gf-answer">{type.answerPlaceholder}</p>
          <div className="gf-card-footer">
            <span>必須</span>
            <Switch on={step.required} />
            <span className="gf-more">⋮</span>
          </div>
        </div>
      );
    }
    case "publish":
      return (
        <div className="gf-toolbar">
          <span className="gf-toolbar-icon">🔗</span>
          <span className="gf-toolbar-button gf-highlight">公開</span>
          <span className="gf-more">⋮</span>
        </div>
      );
    case "csv":
      return (
        <Menu tab="回答" items={["回答をダウンロード（.csv）", "すべての回答を削除"]} pick={0} />
      );
    case "check":
      return (
        <Menu tab="回答" items={["回答をダウンロード（.csv）", "すべての回答を削除"]} pick={1} />
      );
    case "nextYear":
      return <Menu items={["コピーを作成", "印刷", "削除"]} pick={0} />;
  }
}

function Switch({ on }: { on: boolean }) {
  return <span className={on ? "gf-switch gf-switch--on" : "gf-switch"}>{on ? "ON" : "OFF"}</span>;
}

function SwitchRow({ label, on }: { label: string; on: boolean }) {
  return (
    <p className="gf-switch-row">
      <span>{label}</span>
      <Switch on={on} />
    </p>
  );
}

/** 「⋮」を押したときに開くメニュー。pick 番目を、押すところとして目立たせる */
function Menu({ tab, items, pick }: { tab?: string; items: readonly string[]; pick: number }) {
  return (
    <div className="gf-menu-wrap">
      <div className="gf-menu-header">
        {tab && <span className="gf-tab">{tab}</span>}
        <span className="gf-more">⋮</span>
      </div>
      <ul className="gf-menu">
        {items.map((item, i) => (
          <li key={item} className={i === pick ? "gf-highlight" : undefined}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
