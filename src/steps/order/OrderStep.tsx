// 手順③：カードの展示順を決める。
// 一覧の行を、つまみのドラッグか「先頭へ」「上へ」「下へ」「末尾へ」のボタンで動かす。
// 数字の入った列で一度に並べ替えることもできる。

import { useEffect, useId, useLayoutEffect, useRef, useState, type Dispatch } from "react";
import type { LoadedCsv } from "../../csv/loadCsvFile";
import { laterDuplicateColumns } from "../../csv/match";
import { ANNOUNCE_DELAY_MS, ORDER_HEADER } from "../../settings";
import { cardId } from "../../shared/cardId";
import type { Caption } from "../../sheets/geometry";
import type { AppAction } from "../../state/state";
import type { Field } from "../../template/schema";
import { usePointerReorder } from "./parts/usePointerReorder";
import "./parts/order.css";

type OrderStepProps = {
  csv: LoadedCsv;
  fields: readonly Field[];
  captions: readonly Caption[];
  /** captions のそれぞれの、CSV の行の番号 */
  rows: readonly number[];
  sortColumn: number | null;
  /** 一覧で手で動かしたあと（列で並べ替えた順でも、読み込んだ順でもない） */
  manuallyOrdered: boolean;
  /** 文字が収まらないカードの番号（0 始まり） */
  overflowCards: ReadonlySet<number>;
  dispatch: Dispatch<AppAction>;
};

/** 手で動かしたあとの選択肢の値。列の番号と重ならない値にする */
const MANUAL = "manual";

type Direction = "first" | "up" | "down" | "last";

const MOVE_BUTTONS: { direction: Direction; label: string }[] = [
  { direction: "first", label: "先頭へ" },
  { direction: "up", label: "上へ" },
  { direction: "down", label: "下へ" },
  { direction: "last", label: "末尾へ" },
];

/** 端まで動かしてボタンが使えなくなったときに、代わりにフォーカスするボタン */
const FALLBACK_FOCUS: Record<Direction, Direction> = {
  first: "down",
  up: "down",
  down: "up",
  last: "up",
};

export function OrderStep(props: OrderStepProps) {
  const { csv, fields, captions, rows, sortColumn, manuallyOrdered, overflowCards, dispatch } =
    props;
  const selectId = useId();
  const list = useRef<HTMLOListElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const announceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(announceTimer.current), []);

  // 動かしたあと、同じカードの同じボタンにフォーカスを戻す（行が入れ替わるとフォーカスが外れることがあるため）
  const pendingFocus = useRef<{ row: number; direction: Direction } | null>(null);
  useLayoutEffect(() => {
    const request = pendingFocus.current;
    if (!request || !list.current) return;
    pendingFocus.current = null;
    const item = list.current.querySelector(`[data-row="${request.row}"]`);
    const same = item?.querySelector<HTMLButtonElement>(`[data-direction="${request.direction}"]`);
    const other = item?.querySelector<HTMLButtonElement>(
      `[data-direction="${FALLBACK_FOCUS[request.direction]}"]`,
    );
    // 端まで動かしたら、反対向きのボタンへ
    const target = same?.getAttribute("aria-disabled") === "true" ? other : same;
    target?.focus({ preventScroll: true });
    item?.scrollIntoView({ block: "nearest" });
  });

  const [titleField, subField] = fields;
  const nameOf = (caption: Caption) => (titleField && caption[titleField.key]) || "（題名なし）";

  function move(from: number, to: number, focus?: Direction) {
    if (to < 0 || to >= captions.length || from === to) return;
    const row = rows[from]!;
    if (focus) pendingFocus.current = { row, direction: focus };
    dispatch({ type: "cardMoved", visibleRows: rows, from, to });
    // フォーカスの移動の読み上げに消されないよう、少し待ってから知らせる
    setAnnouncement("");
    window.clearTimeout(announceTimer.current);
    const name = nameOf(captions[from]!);
    announceTimer.current = window.setTimeout(
      () => setAnnouncement(`「${name}」を ${to + 1} 番目に動かしました`),
      ANNOUNCE_DELAY_MS,
    );
  }

  const drag = usePointerReorder(list, "li[data-row]", (from, to) => move(from, to));
  const last = captions.length - 1;
  const targetOf: Record<Direction, (index: number) => number> = {
    first: () => 0,
    up: (index) => index - 1,
    down: (index) => index + 1,
    last: () => last,
  };
  const hiddenColumns = laterDuplicateColumns(csv.headers);

  return (
    <>
      <div className="order-controls">
        <label htmlFor={selectId}>並び替えに使う列</label>
        <select
          id={selectId}
          value={sortColumn ?? (manuallyOrdered ? MANUAL : "")}
          onChange={(event) => {
            const value = event.currentTarget.value;
            dispatch({ type: "sortedByColumn", column: value === "" ? null : Number(value) });
          }}
        >
          <option value="">読み込んだ順</option>
          {/* 今の状態を示すだけの項目。選び直すことはできない */}
          {manuallyOrdered && (
            <option value={MANUAL} disabled>
              手で並べた順
            </option>
          )}
          {csv.headers.map((header, i) =>
            // 同じ見出しの列は左の列とまとめて読むので、1 つだけ出す
            hiddenColumns.has(i) ? null : (
              <option key={i} value={i}>
                {header.trim() || `（見出しなし・${i + 1} 列目）`}
              </option>
            ),
          )}
        </select>
      </div>
      <p className="note">
        数字の入った列（「{ORDER_HEADER}
        」など）を選ぶと、小さい順に並べます。数字でない値や空欄のカードは最後に回ります。並べたあと、下の一覧で手で動かすこともできます。
      </p>

      <ol
        className="order-list"
        ref={list}
        data-dragging={drag.state ? "" : undefined}
        aria-label="展示順"
      >
        {captions.map((caption, index) => {
          const row = rows[index]!;
          const name = nameOf(caption);
          const dropBefore = drag.state?.insert === index && drag.showMarker;
          return (
            <li
              key={row}
              data-row={row}
              data-drop-before={dropBefore || undefined}
              data-lifted={drag.state?.from === index || undefined}
            >
              <span
                className="order-handle"
                aria-hidden="true"
                title="ドラッグして動かす"
                {...drag.handleProps(index)}
              >
                ⠿
              </span>
              <a className="order-number" href={`#${cardId(index)}`}>
                {index + 1}
              </a>
              <span className="order-text">
                <span className="order-title">{name}</span>
                {subField && caption[subField.key] && (
                  <span className="order-sub">{caption[subField.key]}</span>
                )}
              </span>
              {overflowCards.has(index) && <span className="order-warning">収まりません</span>}
              <span className="order-buttons">
                {MOVE_BUTTONS.map(({ direction, label }) => {
                  const atEdge =
                    direction === "first" || direction === "up" ? index === 0 : index === last;
                  return (
                    <button
                      type="button"
                      key={direction}
                      data-direction={direction}
                      aria-disabled={atEdge}
                      aria-label={`${index + 1} 番目「${name}」を${label}`}
                      onClick={() => move(index, targetOf[direction](index), direction)}
                    >
                      {label}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
        {drag.state?.insert === captions.length && drag.showMarker && (
          <li className="order-drop-end" aria-hidden="true" />
        )}
      </ol>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
    </>
  );
}
