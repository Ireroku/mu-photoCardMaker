import { useId, useState, type KeyboardEvent } from "react";

type NumberFieldProps = {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  /** 値を確定する。使えない値なら、その理由の文を返す（使えれば null） */
  onCommit: (value: number) => string | null;
};

/**
 * 数を入れる欄。打っている間は何も変えず、欄から離れたときか Enter を押したときに確定する。
 * 使えない値なら元の値に戻し、理由を欄の下に出す（次に打ち始めるまで残す）
 */
export function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step,
  disabled,
  onCommit,
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const n = Number(draft);
    let problem: string | null;
    if (draft.trim() === "" || !Number.isFinite(n) || n < min || n > max) {
      problem = `${min}〜${max} の数を入れてください。`;
    } else if (n === value) {
      problem = null;
    } else {
      problem = onCommit(n);
    }
    setDraft(null);
    setError(
      problem === null ? null : `${draft.trim() || "空欄"} ${unit} は使えません。${problem}`,
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
  }

  return (
    <div className="number-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={draft ?? String(value)}
        aria-invalid={error !== null || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <span className="number-field-unit">{unit}</span>
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
