/** 手順を開き、その中の要素（なければ手順の見出し）へ移る */
export function openStep(id: string, focusSelector?: string): void {
  const step = document.getElementById(id);
  if (!(step instanceof HTMLDetailsElement)) return;
  step.open = true;
  const target =
    (focusSelector && step.querySelector<HTMLElement>(focusSelector)) ||
    step.querySelector("summary");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  step.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  target?.focus({ preventScroll: true });
}
