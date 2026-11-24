// Google フォームの画面を HTML/CSS でざっくり再現した見本。
// 本物の画面とは細部が違ってよい。見た目の雰囲気だけを伝えるためのもの。
// 手順の文で同じ内容を説明しているので、見本は読み上げの対象から外す（aria-hidden）。

interface FormHeaderPreviewProps {
  title: string;
}

/** フォームのいちばん上にある、タイトルを書くカード */
export function FormHeaderPreview({ title }: FormHeaderPreviewProps) {
  return (
    <div className="gf-card gf-card--header gf-card--active" aria-hidden="true">
      <p className="gf-header-title">{title}</p>
      <p className="gf-header-desc">フォームの説明</p>
    </div>
  );
}

interface FormCardPreviewProps {
  title: string;
  typeLabel: string;
  answerPlaceholder: string;
  required: boolean;
  description?: string;
  active?: boolean;
}

/** 質問 1 つ分のカード */
export function FormCardPreview({
  title,
  typeLabel,
  answerPlaceholder,
  required,
  description,
  active = true,
}: FormCardPreviewProps) {
  return (
    <div className={active ? "gf-card gf-card--active" : "gf-card"} aria-hidden="true">
      <div className="gf-question-row">
        <p className="gf-question-title">
          {title}
          {required && <span className="gf-required"> *</span>}
        </p>
        <span className="gf-type-select">{typeLabel}</span>
      </div>
      {description && <p className="gf-question-desc">{description}</p>}
      <p className="gf-answer">{answerPlaceholder}</p>
      <div className="gf-card-footer">
        <span>必須</span>
        <span className={required ? "gf-switch gf-switch--on" : "gf-switch"}>
          {required ? "ON" : "OFF"}
        </span>
        <span className="gf-more">⋮</span>
      </div>
    </div>
  );
}
