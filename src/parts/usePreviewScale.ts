import { useLayoutEffect, type RefObject } from "react";

const PX_PER_MM = 96 / 25.4;

/**
 * 用紙の幅（mm）が要素の幅に収まる倍率（最大 1）を、要素の CSS 変数 --preview-scale に入れる。
 * 画面のプレビュー用。React の状態にしないので、窓の大きさを変えても再描画は起きない
 */
export function usePreviewScale(ref: RefObject<HTMLElement | null>, paperWidthMm: number): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const style = getComputedStyle(element);
      const width =
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const scale = Math.min(1, width / (paperWidthMm * PX_PER_MM));
      element.style.setProperty("--preview-scale", String(scale));
    };
    // 最初の描画の前に一度決めておき、ちらつきを防ぐ
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, paperWidthMm]);
}
