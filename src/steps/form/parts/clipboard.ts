// クリップボードへのコピー。Clipboard API が使えない環境では古い方法に切り替える。

/** クリックの処理の中で呼ぶ。古い方法へ切り替えるかどうかを同期的に決める */
export function copyToClipboard(text: string): Promise<boolean> {
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
