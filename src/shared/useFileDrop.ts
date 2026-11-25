import { useEffect, useRef, useState, type DragEvent } from "react";

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

/**
 * 要素にファイルを落とせるようにする。返り値の handlers を要素に付け、isOver で見た目を変える。
 * 落とされたファイルはすべて onFiles に渡す（どれを使うかは呼び出し側が決める）。
 * 子要素をまたぐと dragenter と dragleave が交互に起きるので、入った回数を数えて判断する
 */
export function useFileDrop(onFiles: (files: readonly File[]) => void) {
  const [isOver, setIsOver] = useState(false);
  const depth = useRef(0);
  const handlers = {
    onDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return;
      depth.current += 1;
      setIsOver(true);
    },
    onDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsOver(false);
    },
    onDragOver(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setIsOver(false);
      const files = [...event.dataTransfer.files];
      if (files.length > 0) onFiles(files);
    },
  };
  return { isOver, handlers };
}

/**
 * 落とせる場所の外にファイルを落としたとき、ブラウザがそのファイルを開いて
 * 作業中の画面が消えてしまうのを防ぐ
 */
export function usePreventStrayFileDrop(): void {
  useEffect(() => {
    const prevent = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);
}
