// 一覧の行を、つまみのドラッグで動かす。
// 動かしている間は行を入れ替えず、落とす場所に線を出すだけにし、離したときに 1 回だけ onMove を呼ぶ。
// Esc で取り消せる。つまみ以外（ボタンなど）の操作は邪魔しない。

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";

type DragState = {
  /** つかんだ行の番号 */
  from: number;
  /** 何番目の行の前に入れるか（行の数と同じなら末尾） */
  insert: number;
};

export function usePointerReorder(
  list: RefObject<HTMLElement | null>,
  /** 行を表す要素を選ぶセレクタ（list の直下） */
  itemSelector: string,
  onMove: (from: number, to: number) => void,
) {
  const [state, setState] = useState<DragState | null>(null);
  // pointerup の処理で古い state を読まないよう、最新の値は ref にも持つ
  const latest = useRef<DragState | null>(null);
  const pointerId = useRef<number | null>(null);

  const update = (next: DragState | null) => {
    latest.current = next;
    setState(next);
  };
  const end = () => {
    pointerId.current = null;
    update(null);
  };

  useEffect(() => {
    if (!state) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      pointerId.current = null;
      latest.current = null;
      setState(null);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [state]);

  /** 指の位置から、何番目の行の前に入れるかを求める。行の上下の真ん中より上なら、その行の前 */
  function insertionIndex(clientY: number): number {
    const items = [
      ...(list.current?.querySelectorAll<HTMLElement>(`:scope > ${itemSelector}`) ?? []),
    ];
    const index = items.findIndex((item) => {
      const rect = item.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    return index === -1 ? items.length : index;
  }

  return {
    state,
    /** 元の場所の前後に落としても何も変わらないので、線を出さない */
    showMarker: state !== null && state.insert !== state.from && state.insert !== state.from + 1,
    /** つまみの要素に付ける */
    handleProps: (index: number) => ({
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || pointerId.current !== null) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointerId.current = event.pointerId;
        update({ from: index, insert: index });
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = latest.current;
        if (event.pointerId !== pointerId.current || !current) return;
        const insert = insertionIndex(event.clientY);
        if (insert !== current.insert) update({ ...current, insert });
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        const current = latest.current;
        if (event.pointerId !== pointerId.current || !current) return;
        end();
        const { from, insert } = current;
        onMove(from, insert > from ? insert - 1 : insert);
      },
      onPointerCancel: end,
      onLostPointerCapture(event: PointerEvent<HTMLElement>) {
        if (event.pointerId === pointerId.current) end();
      },
    }),
  };
}
