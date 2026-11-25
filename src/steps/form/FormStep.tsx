// 手順①：Google フォームの作り方を、質問 1 つずつ案内する画面。
// 手順の中身は parts/tutorialSteps.ts が fields から組み立て、手順ごとの文は parts/StepContent.tsx、
// 見本は parts/StepPreview.tsx に置く。

import { useState } from "react";
import type { Field } from "../../template/schema";
import { StepContent } from "./parts/StepContent";
import { StepPreview } from "./parts/StepPreview";
import { buildTutorialSteps, stepShortTitle } from "./parts/tutorialSteps";
import "./parts/form.css";

interface FormStepProps {
  fields: readonly Field[];
  /** 最後の手順の「次へ」の代わりに出すボタンの文字と、押したときの動き */
  finish: { label: string; onClick: () => void };
}

export function FormStep({ fields, finish }: FormStepProps) {
  const steps = buildTutorialSteps(fields);
  const [requestedIndex, setRequestedIndex] = useState(0);
  // fields が減ったときに範囲の外を指さないようにする
  const index = Math.min(requestedIndex, steps.length - 1);
  const step = steps[index]!;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // 前へ・次へではフォーカスをボタンに残し、新しい手順の名前を読み上げる
  const [announcement, setAnnouncement] = useState("");
  const move = (delta: number) => {
    const next = index + delta;
    const nextStep = steps[next];
    if (!nextStep) return;
    setRequestedIndex(next);
    setAnnouncement(`${next + 1} / ${steps.length}：${stepShortTitle(nextStep)}`);
  };

  return (
    <section className="tutorial" aria-label="Google フォームの作り方">
      <StepPreview step={step} />

      <div className="tutorial-step">
        <h3 className="tutorial-step-heading">{stepShortTitle(step)}</h3>
        <StepContent key={index} step={step} />
      </div>

      {/* 端でも disabled にしない。disabled にするとフォーカスが外れてしまうため */}
      <div className="tutorial-nav">
        <button type="button" aria-disabled={isFirst} onClick={() => move(-1)}>
          前へ
        </button>
        <span className="tutorial-progress">
          {index + 1} / {steps.length}
        </span>
        {/* 最後の手順でも同じボタンを使い、押したあとのフォーカスを保つ */}
        <button
          type="button"
          className={isLast ? "primary" : undefined}
          onClick={isLast ? finish.onClick : () => move(1)}
        >
          {isLast ? finish.label : "次へ"}
        </button>
      </div>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
    </section>
  );
}
