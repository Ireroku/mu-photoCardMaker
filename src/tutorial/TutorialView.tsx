// Google フォームの作り方を、質問 1 つずつ案内する画面。
// 手順の中身は steps.ts が fields から組み立てる。

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Field } from "../template/schema";
import { FormCardPreview, FormHeaderPreview } from "./FormCardPreview";
import { buildTutorialSteps, GOOGLE_FORM_TYPES, stepShortTitle, type TutorialStep } from "./steps";
import "./tutorial.css";

interface TutorialViewProps {
  fields: readonly Field[];
}

export function TutorialView({ fields }: TutorialViewProps) {
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

const PASTE = "⌘V（Windows は Ctrl+V）";

function StepContent({ step }: { step: TutorialStep }) {
  switch (step.kind) {
    case "intro":
      return (
        <Steps>
          <li>
            ブラウザで{" "}
            <a href="https://forms.google.com/" target="_blank" rel="noopener noreferrer">
              Google フォーム（forms.google.com）
            </a>
            を開き、「空白のフォーム」を選んで新しいフォームを作ります。
          </li>
          <li>
            最初のカードの「無題のフォーム」と書かれたところをクリックして、フォームのタイトルを入力します。タイトルは自由に決めてかまいません。
          </li>
          <li>
            このあと設定を確かめてから、質問を 1 つずつ {step.questionCount}{" "}
            個追加していきます。「次へ」を押して進んでください。
          </li>
        </Steps>
      );
    case "settings":
      return (
        <Steps>
          <li>フォームの上にある「設定」タブを開き、「回答」の項目を開きます。</li>
          <li>
            「回答を 1 回に制限する」は<strong>オフのまま</strong>にします。1
            人で複数の作品を出すことがあるためです。オンにすると、回答する人に Google
            へのログインも求めることになります。
          </li>
          <li>
            「メールアドレスを収集する」も<strong>オフのまま</strong>
            にします。キャプションを作るのに、メールアドレスは必要ありません。
          </li>
        </Steps>
      );
    case "question": {
      const type = GOOGLE_FORM_TYPES[step.fieldType];
      return (
        <Steps>
          <li>
            {step.number === 1
              ? "フォームには最初から「無題の質問」というカードが 1 つ入っています。そのカードを使います。"
              : "画面の右側に並んでいる「＋」（質問を追加）のボタンを押して、「無題の質問」のカードを 1 つ増やします。"}
          </li>
          <li>
            下のボタンで質問文をコピーし、「無題の質問」と書かれた欄をクリックして {PASTE}{" "}
            で貼り付けます。
            <CopyableText text={step.title} name="質問文" />
            <p className="tutorial-note">
              文を変えずに貼り付けておくと、あとで回答を読み込むときに項目を自動で見つけられます。
            </p>
          </li>
          <li>
            カードの右上にある「ラジオボタン」と表示されている欄をクリックし、「
            <strong>{type.formLabel}</strong>」を選びます。
          </li>
          <li>
            カードの右下にある「必須」のスイッチは、
            {step.required ? <strong>オンにします</strong> : <strong>オフのままにします</strong>}。
          </li>
          {step.description && (
            <li>
              カードの右下にある「⋮」（その他のオプション）から「説明」を選び、出てきた説明の欄に、コピーした次の文を{" "}
              {PASTE} で貼り付けます。
              <CopyableText text={step.description} name="説明" />
            </li>
          )}
        </Steps>
      );
    }
    case "publish":
      return (
        <Steps>
          <li>画面の右上にある「公開」を押し、確認の画面でもう一度「公開」を押します。</li>
          <li>
            公開できたら、回答してもらうためのリンクをコピーして部員に送ります。リンクは「公開」の近くにあるリンクのボタンからコピーできます。
          </li>
          <li>
            学校や職場の Google
            アカウントで作った場合は、回答できる人が「組織内の人だけ」に制限されていないか、公開の設定で確かめてください。制限されていると、ほかの人が回答できません。
          </li>
        </Steps>
      );
    case "csv":
      return (
        <>
          <h5>ふつうのやり方</h5>
          <Steps>
            <li>フォームの上にある「回答」タブを開きます。</li>
            <li>「⋮」（その他のオプション）を押し、「回答をダウンロード（.csv）」を選びます。</li>
            <li>
              ZIP ファイルでダウンロードされたときは、ダブルクリックなどで展開し、中の .csv
              ファイルを使います。
            </li>
          </Steps>
          <h5>うまくいかないとき（スプレッドシートを使うやり方）</h5>
          <Steps>
            <li>
              「回答」タブで「スプレッドシートにリンク」を押します（「回答の送信先を選択」と表示されることもあります）。
            </li>
            <li>「新しいスプレッドシートを作成」を選び、「作成」を押します。</li>
            <li>
              開いたスプレッドシートで、メニューの「ファイル」→「ダウンロード」→「カンマ区切りの値（.csv）」を選びます。
            </li>
          </Steps>
        </>
      );
    case "check":
      return (
        <>
          <Steps>
            <li>公開したフォームのリンクを開き、試しに 1 件回答を送ります。</li>
            <li>前の手順のやり方で、回答を CSV でダウンロードします。</li>
            <li>
              ダウンロードした CSV
              をこのツールで読み込み、それぞれの項目が正しく読み込まれるか確かめます。
            </li>
            <li>
              確かめられたら、「回答」タブの「⋮」から「すべての回答を削除」を選び、試しの回答を消しておきます。
            </li>
          </Steps>
          <p className="tutorial-warning">
            回答が集まり始めたら、質問文は変えないでください。変えると、このツールがその項目を自動で見つけられなくなります。
          </p>
        </>
      );
    case "nextYear":
      return (
        <>
          <p>
            来年以降はこのフォームを「コピーを作成」して使い回してください。フォームの画面の右上にある「⋮」（その他のオプション）から「コピーを作成」を選ぶと、質問がそのまま入った新しいフォームができます。
          </p>
          <ul className="tutorial-instructions">
            <li>前の年の回答はコピーされません。</li>
            <li>
              コピーしたフォームは、もう一度「公開」の手順をやり直してください。スプレッドシートを使っていた場合は、スプレッドシートへのリンクも作り直します。
            </li>
          </ul>
        </>
      );
  }
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="tutorial-instructions">{children}</ol>;
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

const NO_BREAK_SPACE = "\u00A0";

type CopyStatus = "idle" | "copied" | "failed";

const COPY_MESSAGES: Record<CopyStatus, string> = {
  idle: "",
  copied: "コピーしました",
  failed: "コピーできませんでした。文字を選んで手動でコピーしてください",
};

function CopyableText({ text, name }: { text: string; name: string }) {
  const [result, setResult] = useState<{ status: CopyStatus; count: number }>({
    status: "idle",
    count: 0,
  });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    const ok = await copyToClipboard(text);
    setResult((r) => ({ status: ok ? "copied" : "failed", count: r.count + 1 }));
    timer.current = window.setTimeout(() => setResult((r) => ({ ...r, status: "idle" })), 3000);
  };

  // 同じ結果が続いても読み上げられるよう、回ごとに見えない空白を付けたり外したりする
  const message = COPY_MESSAGES[result.status];
  const liveText = message && result.count % 2 === 0 ? message + NO_BREAK_SPACE : message;

  return (
    <div className="tutorial-copyable">
      <span className="tutorial-copyable-text">{text}</span>
      <button
        type="button"
        className="tutorial-copy-button"
        data-status={result.status}
        onClick={copy}
      >
        {name}をコピー
      </button>
      <span className="tutorial-copy-status" role="status" data-status={result.status}>
        {liveText}
      </span>
    </div>
  );
}

/** クリックの処理の中で呼ぶ。古い方法へ切り替えるかどうかを同期的に決める */
function copyToClipboard(text: string): Promise<boolean> {
  // file:// で開いたときなど、Clipboard API がない環境では古い方法を直接使う
  if (!navigator.clipboard?.writeText) return Promise.resolve(legacyCopy(text));
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => legacyCopy(text),
  );
}

function legacyCopy(text: string): boolean {
  const previousFocus = document.activeElement as HTMLElement | null;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(field);
  field.select();
  // iOS の Safari は select() だけでは選択されないことがある
  field.setSelectionRange(0, text.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    previousFocus?.focus({ preventScroll: true });
  }
}
