import { resolveMinPt, textBoxMm, textItems } from "../../../sheets/autoFit";
import type { Caption } from "../../../sheets/geometry";
import { MM_PER_PT } from "../../../shared/units";
import type { Template } from "../../../template/schema";

/** 1 行に入る文字数に対する、見本の文字の長さ。1 行の項目は縮み、折り返す項目は 2 行になる長さ */
const SAMPLE_LENGTH_RATIO = 1.5;

/**
 * テンプレートを選ぶ画面に出す見本のキャプション。項目ごとに、質問の文（label）を繰り返して作る。
 * 文字が縮む・折り返す様子が分かるよう、1 行に入る文字数より少し長くする（全角の幅で数える）。
 * 折り返す項目は最小の大きさまで縮めてから折り返すので、最小の大きさで 1 行に入る文字数を基にする
 */
export function sampleCaption(template: Template): Caption {
  const { width } = textBoxMm(template);
  const caption: Record<string, string> = {};
  for (const { item } of textItems(template.layout)) {
    const label = template.fields.find((f) => f.key === item.field)?.label ?? item.field;
    const sizePt = (item.max_lines ?? 1) > 1 ? resolveMinPt(item) : item.size_pt;
    const length = Math.ceil((width / (sizePt * MM_PER_PT)) * SAMPLE_LENGTH_RATIO);
    const text = label.repeat(Math.ceil(length / label.length)).slice(0, length);
    if (text.length > (caption[item.field]?.length ?? 0)) caption[item.field] = text;
  }
  return caption;
}
