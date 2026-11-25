// 1 行の文字を、決まった幅に収まるまで小さくする計算。
// 幅の測り方（DOM や canvas）は measure として外から渡すので、ここは純粋な計算だけを持つ。

import { ABSOLUTE_MIN_PT, DEFAULT_MIN_RATIO, DEFAULT_STEP_PT } from "../../settings";

/**
 * 最小の大きさを決める。
 *
 * - min_size_pt が書いてあれば、それを使う（ただし size_pt を超えない）
 * - なければ size_pt × DEFAULT_MIN_RATIO を 0.5 pt 単位に丸めた値。ただし 6 pt を下回らず、size_pt を超えない
 *   例：24 pt → 14.5 pt、20 pt → 12 pt、11 pt → 6.5 pt、8 pt → 6 pt、5 pt → 5 pt
 */
export function resolveMinPt(item: { size_pt: number; min_size_pt?: number }): number {
  const { size_pt } = item;
  if (item.min_size_pt !== undefined) return Math.min(item.min_size_pt, size_pt);
  const scaled = Math.round(size_pt * DEFAULT_MIN_RATIO * 2) / 2;
  return Math.min(size_pt, Math.max(ABSOLUTE_MIN_PT, scaled));
}

export type FitInput = {
  /** 収まるならこの大きさで出す */
  preferredPt: number;
  /** これより小さくはしない */
  minPt: number;
  /** 縮める刻み（省略時 0.5 pt） */
  stepPt?: number;
  /** 文字を置ける幅 */
  availableWidthMm: number;
  /** 大きさ（pt）を渡すと、文字の幅（mm）を返す。大きさに対して単調に増えること */
  measure: (pt: number) => number;
};

export type FitResult = {
  /** 使う大きさ */
  sizePt: number;
  /** 最小の大きさでも収まらない（画面で警告を出す） */
  overflow: boolean;
};

/**
 * 収まる中でいちばん大きい文字の大きさを求める。
 *
 * 候補は preferredPt から stepPt ずつ下げた値と、最後の minPt。
 * measure が単調に増える前提で二分探索するので、measure を呼ぶ回数は少ない（24→14.5 pt なら 6 回ほど）。
 * 縮めずに収まるときは 1 回で済む。
 */
export function fitFontSize(input: FitInput): FitResult {
  const { preferredPt, minPt, stepPt = DEFAULT_STEP_PT, availableWidthMm, measure } = input;
  if (!(stepPt > 0)) throw new RangeError(`stepPt は正の数にしてください（${stepPt}）`);
  if (!(minPt > 0)) throw new RangeError(`minPt は正の数にしてください（${minPt}）`);

  const candidates = candidateSizes(preferredPt, minPt, stepPt);
  const fits = (i: number) => measure(candidates[i]!) <= availableWidthMm;

  // ほとんどの文字は縮めずに収まるので、まず元の大きさだけを測る
  if (fits(0)) return { sizePt: preferredPt, overflow: false };

  // 収まる候補のうち、いちばん前（大きい）ものを探す
  let lo = 1;
  let hi = candidates.length; // hi は「まだ収まると分かっていない」範囲の終わり
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (fits(mid)) hi = mid;
    else lo = mid + 1;
  }
  if (lo === candidates.length) {
    return { sizePt: candidates[candidates.length - 1]!, overflow: true };
  }
  return { sizePt: candidates[lo]!, overflow: false };
}

/** 大きい順の候補。浮動小数の誤差を残さないよう 1/1000 pt で丸める */
function candidateSizes(preferredPt: number, minPt: number, stepPt: number): number[] {
  const sizes = [preferredPt];
  for (let k = 1; ; k++) {
    const size = Math.round((preferredPt - k * stepPt) * 1000) / 1000;
    if (size <= minPt) break;
    sizes.push(size);
  }
  if (minPt < preferredPt) sizes.push(minPt);
  return sizes;
}
