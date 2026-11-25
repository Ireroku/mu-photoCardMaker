import type { ChangeEvent } from "react";

/**
 * ファイルを選ぶ欄で選ばれたファイルを取り出す。
 * 同じファイルを直してもう一度選んだときにも change が起きるよう、選択を空にしておく
 */
export function takePickedFiles(event: ChangeEvent<HTMLInputElement>): File[] {
  const input = event.currentTarget;
  const files = [...(input.files ?? [])];
  input.value = "";
  return files;
}
