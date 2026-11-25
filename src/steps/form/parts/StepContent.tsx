// 手順①の、手順ごとの説明の文。

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
            質問文をコピーし、「無題の質問」の欄に貼り付けます。
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
              カードの右下にある「⋮」から「説明」を選び、出てきた欄に説明を貼り付けます。
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
            公開できたら、回答してもらうためのリンクをコピーして、回答する人に送ります。リンクは「公開」の近くにあるリンクのボタンからコピーできます。
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
          <Steps>
            <li>フォームの上にある「回答」タブを開きます。</li>
            <li>「⋮」を押し、「回答をダウンロード（.csv）」を選びます。</li>
            <li>
              ZIP ファイルでダウンロードされたときは、ダブルクリックなどで展開し、中の .csv
              ファイルを使います。
            </li>
          </Steps>
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
              ダウンロードした CSV を「② 回答を読み込む」で読み込み、項目が正しく入るか確かめます。
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
            来年以降は、このフォームをコピーして使います。フォームの画面の右上にある「⋮」から「コピーを作成」を選ぶと、質問がそのまま入った新しいフォームができます。
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
