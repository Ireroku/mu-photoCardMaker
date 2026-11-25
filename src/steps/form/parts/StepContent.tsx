// 手順①の、手順ごとの説明の文。
// 先にやる操作を書き、理由や「〜のときは」は小さな文（Why）で下に添える。

import type { ReactNode } from "react";
import { CopyableText } from "./CopyableText";
import { GOOGLE_FORM_TYPES, type TutorialStep } from "./tutorialSteps";

export function StepContent({ step }: { step: TutorialStep }) {
  switch (step.kind) {
    case "intro":
      return (
        <Steps>
          <li>
            ブラウザで{" "}
            <a href="https://forms.google.com/" target="_blank" rel="noopener noreferrer">
              Google フォーム
            </a>
            を開き、「空白のフォーム」を選びます。
          </li>
          <li>「無題のフォーム」をクリックして、フォームのタイトルを入力します。</li>
        </Steps>
      );
    case "settings":
      return (
        <>
          <Steps>
            <li>フォームの上にある「設定」タブを開き、「回答」を開きます。</li>
            <li>
              「回答を 1 回に制限する」と「メールアドレスを収集する」を、どちらも
              <strong>オフのまま</strong>にします。
            </li>
          </Steps>
          <Why>
            1 人で複数の作品を出すことがあるためです。回数を制限すると、回答する人に Google
            へのログインも求めることになります。メールアドレスはカードに使いません。
          </Why>
        </>
      );
    case "question": {
      const type = GOOGLE_FORM_TYPES[step.fieldType];
      return (
        <>
          <p>
            {step.number === 1
              ? "最初からある質問を使って、次のように設定します。"
              : "「＋」で質問を追加して、次のように設定します。"}
          </p>
          <ul className="tutorial-settings">
            <li>
              質問文
              <CopyableText text={step.title} name="質問文" />
            </li>
            <li>
              種類：<strong>{type.formLabel}</strong>
            </li>
            <li>
              必須：<strong>{step.required ? "オン" : "オフ"}</strong>
            </li>
            {step.description && (
              <li>
                説明（「⋮」→「説明」で出る欄）
                <CopyableText text={step.description} name="説明" />
              </li>
            )}
          </ul>
          <Why>質問文を変えずに貼り付けると、回答を読み込むときに列を自動で見つけられます。</Why>
        </>
      );
    }
    case "publish":
      return (
        <>
          <Steps>
            <li>画面の右上にある「公開」を押し、確認の画面でもう一度「公開」を押します。</li>
            <li>リンクのボタンからリンクをコピーして、回答してもらう人に送ります。</li>
          </Steps>
          <Why>
            学校や職場の Google
            アカウントで作ったときは、公開の設定で、回答できる人が「組織内の人だけ」になっていないか確かめます。
          </Why>
        </>
      );
    case "csv":
      return (
        <>
          <Steps>
            <li>フォームの上にある「回答」タブを開きます。</li>
            <li>「⋮」を押し、「回答をダウンロード（.csv）」を選びます。</li>
          </Steps>
          <Why>ZIP ファイルでダウンロードされたときは、展開して中の .csv ファイルを使います。</Why>
          <details className="tutorial-alt">
            <summary>ダウンロードできないとき（スプレッドシートを使う）</summary>
            <Steps>
              <li>
                「回答」タブで「スプレッドシートにリンク」を押します（「回答の送信先を選択」と表示されることもあります）。
              </li>
              <li>「新しいスプレッドシートを作成」を選び、「作成」を押します。</li>
              <li>
                開いたスプレッドシートで、メニューの「ファイル」→「ダウンロード」→「カンマ区切りの値（.csv）」を選びます。
              </li>
            </Steps>
          </details>
        </>
      );
    case "check":
      return (
        <>
          <Steps>
            <li>公開したフォームのリンクを開き、試しに 1 件回答を送ります。</li>
            <li>前の手順のやり方で、回答を CSV でダウンロードします。</li>
            <li>
              ダウンロードした CSV を「②
              回答を読み込む」で読み込み、カードに正しく入るか確かめます。
            </li>
            <li>
              確かめられたら、「回答」タブの「⋮」から「すべての回答を削除」を選び、試しの回答を消しておきます。
            </li>
          </Steps>
          <p className="tutorial-warning">
            回答が集まり始めたら、質問文は変えないでください。変えると、このツールがその列を自動で見つけられなくなります。
          </p>
        </>
      );
    case "nextYear":
      return (
        <>
          <p>
            フォームの画面の右上にある「⋮」から「コピーを作成」を選ぶと、質問がそのまま入った新しいフォームができます。
          </p>
          <Why>
            前の回答はコピーされません。コピーしたフォームは、もう一度「公開」からやり直します。スプレッドシートを使っていた場合は、そのリンクも作り直します。
          </Why>
          <Why>カードの設定は、ページの下の「設定ファイル」でダウンロードできます。</Why>
        </>
      );
  }
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="tutorial-instructions">{children}</ol>;
}

/** 操作の下に添える、理由や補足の小さな文 */
function Why({ children }: { children: ReactNode }) {
  return <p className="tutorial-note">{children}</p>;
}
