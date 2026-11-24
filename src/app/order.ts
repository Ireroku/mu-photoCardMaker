// キャプションの並び順。
// 並び順は「元の行番号（CSV の何行目か、0 始まり）」の配列で持ち、キャプションのデータそのものは並べ替えない。

/** 読み込んだ順のまま（[0, 1, 2, ...]） */
export function identityOrder(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

/**
 * 「並び順」の値を数として読む。空欄や数として読めないときは undefined。
 * 全角の数字や空白も受け付ける（例：「１２」「 3 」）
 */
export function parseOrderKey(value: string | undefined): number | undefined {
  const text = (value ?? "").normalize("NFKC").trim();
  if (text === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 「並び順」の値で並べた順番を返す。
 * 小さい順。空欄（と数として読めない値）は最後に回す。同じ値どうしや空欄どうしは元の順を保つ
 */
export function orderByKeys(values: readonly (string | undefined)[]): number[] {
  const keys = values.map(parseOrderKey);
  // Array.prototype.sort は安定ソートなので、比べて 0 なら元の順が残る
  return identityOrder(values.length).sort((a, b) => {
    const ka = keys[a];
    const kb = keys[b];
    if (ka === undefined || kb === undefined) {
      return Number(ka === undefined) - Number(kb === undefined);
    }
    return ka - kb;
  });
}

/**
 * from 番目の項目を to 番目へ動かした新しい順番を返す（元の配列は変えない）。
 * to が範囲の外なら、先頭か末尾に寄せる
 */
export function moveItem(order: readonly number[], from: number, to: number): number[] {
  if (!Number.isInteger(from) || from < 0 || from >= order.length) {
    throw new RangeError(`from が範囲の外です（${from}）`);
  }
  const target = Math.min(Math.max(Math.trunc(to), 0), order.length - 1);
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}

/** 順番どおりに並べた配列を返す */
export function applyOrder<T>(items: readonly T[], order: readonly number[]): T[] {
  return order.map((i) => items[i]!);
}
