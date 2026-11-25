// 手順①：Google フォームの作り方を、質問 1 つずつ案内する画面。
// 手順の中身は parts/tutorialSteps.ts が fields から組み立て、手順ごとの文は parts/StepContent.tsx に置く。

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Field } from "../../template/schema";
import { FormCardPreview, FormHeaderPreview } from "./parts/FormCardPreview";
import { StepContent } from "./parts/StepContent";
import {
  buildTutorialSteps,
  GOOGLE_FORM_TYPES,
  stepShortTitle,
  type TutorialStep,
} from "./parts/tutorialSteps";
import "./parts/form.css";

interface FormStepProps {
  fields: readonly Field[];
}

export function FormStep({ fields }: FormStepProps) {
  const steps = buildTutorialSteps(fields);
  const [requestedIndex, setRequestedIndex] = useState(0);
  // fields が減ったときに範囲の外を指さないようにする
  const index = Math.min(requestedIndex, steps.length - 1);
  const step = steps[index]!;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // 一覧から手順を選んだときだけ、見出しへフォーカスを移す。
  // 数を増やすたびに 1 回だけ動くので、ほかの理由で index が変わってもフォーカスを奪わない
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [headingFocusRequest, setHeadingFocusRequest] = useState(0);
  useEffect(() => {
    if (headingFocusRequest > 0) headingRef.current?.focus();
  }, [headingFocusRequest]);

  // 前へ・次へではフォーカスをボタンに残し、新しい手順の名前を読み上げる
  const [announcement, setAnnouncement] = useState("");

  const selectFromList = (next: number) => {
    setRequestedIndex(next);
    setAnnouncement("");
    setHeadingFocusRequest((n) => n + 1);
  };

  const move = (delta: number) => {
    const next = index + delta;
    const nextStep = steps[next];
    if (!nextStep) return;
    setRequestedIndex(next);
    setAnnouncement(`手順 ${next + 1} / ${steps.length}：${stepShortTitle(nextStep)}`);
  };

  return (
    <section className="tutorial" aria-labelledby="tutorial-title">
      <h3 id="tutorial-title">Google フォームの作り方</h3>

      <nav className="tutorial-steplist" aria-label="手順の一覧">
        <ol>
          {steps.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                aria-current={i === index ? "step" : undefined}
                onClick={() => selectFromList(i)}
              >
                {stepShortTitle(s)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="tutorial-body">
        <div className="tutorial-step">
          <h4 ref={headingRef} tabIndex={-1} className="tutorial-step-heading">
            {stepShortTitle(step)}
          </h4>
          <StepContent key={index} step={step} />
        </div>
        <StepPreview step={step} />
      </div>

      {/* 端でも disabled にしない。disabled にするとフォーカスが外れてしまうため */}
      <div className="tutorial-nav">
        <button type="button" aria-disabled={isFirst} onClick={() => move(-1)}>
          前へ
        </button>
        <button type="button" aria-disabled={isLast} onClick={() => move(1)}>
          次へ
        </button>
      </div>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
    </section>
  );
}

function StepPreview({ step }: { step: TutorialStep }) {
  let card: ReactNode;
  if (step.kind === "intro") {
    card = <FormHeaderPreview title="（ここにタイトルを入力）" />;
  } else if (step.kind === "question") {
    const type = GOOGLE_FORM_TYPES[step.fieldType];
    card = (
      <FormCardPreview
        title={step.title}
        typeLabel={type.formLabel}
        answerPlaceholder={type.answerPlaceholder}
        required={step.required}
        description={step.description}
      />
    );
  } else {
    return null;
  }
  return (
    <figure className="tutorial-preview">
      {card}
      <figcaption>できあがりの見本（実際の画面とは少し違います）</figcaption>
    </figure>
  );
}
