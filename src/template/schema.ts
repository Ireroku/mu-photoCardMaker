import { z } from "zod";
import { FONT_IDS } from "../fonts/fonts";
import { BORDER_PT, MARGIN_MM, MAX_TEXT_LINES } from "../settings";
import { normalizeLabel } from "../shared/normalize";
import { MM_PER_PT } from "../shared/units";
import { sheetGeometry } from "../sheets/geometry";
import { PAPER_SIZES_MM, type PaperSize } from "./paper";

// zod のエラーを日本語にする（アプリ全体に効く設定）。
// よく出るものは parse.ts の issueMessage がさらに言い換える
z.config(z.locales.ja());

// テンプレート JSON（version 1）の形。
// 書き間違えたキーを黙って捨てないよう、オブジェクトはすべて strictObject にする。
// 種類を足すときは、fieldSchema や layout の判別ユニオンに 1 つ足す。

/** min 以上 max 以下の数 */
const between = (min: number, max: number) => z.number().min(min).max(max);
/** 0 より大きく max 以下の数 */
const positiveUpTo = (max: number) => z.number().positive().max(max);

const PAPER_SIZES = Object.keys(PAPER_SIZES_MM) as [PaperSize, ...PaperSize[]];

const pageSchema = z.strictObject({
  size: z.enum(PAPER_SIZES),
  orientation: z.enum(["landscape", "portrait"]),
  /** 用紙の端からカードの並びまでの余白 */
  margin_mm: between(MARGIN_MM.min, MARGIN_MM.max),
});

const gridSchema = z.strictObject({
  columns: z.int().min(1).max(20),
  rows: z.int().min(1).max(20),
});

const cardSchema = z.strictObject({
  /** カードの罫線（切り取り線を兼ねる）。0 なら線を引かない */
  border_pt: between(BORDER_PT.min, BORDER_PT.max),
  /** 罫線から中身までの余白 */
  padding_mm: between(0, 20),
});

/** CSV の列や layout から指す名前。プログラムで扱いやすいよう半角英数字と _ に限る */
const fieldKey = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, {
  error: "半角の英字・数字・_ だけで書き、先頭は英字か _ にしてください（例: title, photo_place）",
});

const textFieldSchema = z.strictObject({
  key: fieldKey,
  /** フォームの質問文。CSV の列名との突き合わせにも使う */
  label: z.string().trim().min(1),
  type: z.literal("text"),
  required: z.boolean(),
  /** フォームの説明文 */
  hint: z.string().optional(),
});

const fieldSchema = z.discriminatedUnion("type", [textFieldSchema]);

/** layout の text が指してよい fields の type */
const TEXT_COMPATIBLE_TYPES: ReadonlySet<Field["type"]> = new Set(["text"]);

const textItemSchema = z.strictObject({
  kind: z.literal("text"),
  field: z.string().min(1),
  size_pt: positiveUpTo(200),
  /** 長くて収まらないとき、この大きさまで縮める。省略時は settings.ts の DEFAULT_MIN_RATIO から求める（sheets/parts/fit.ts の resolveMinPt） */
  min_size_pt: positiveUpTo(200).optional(),
  /** min_size_pt まで縮めても 1 行に収まらないとき、この行の数まで折り返す。省略時は 1（折り返さない） */
  max_lines: z.number().int().min(1).max(MAX_TEXT_LINES).optional(),
  bold: z.boolean().optional(),
});

const lineSchema = z.strictObject({
  kind: z.literal("line"),
  /** カードの中身の幅に対する長さ */
  width_percent: positiveUpTo(100).default(100),
  thickness_pt: positiveUpTo(10).default(1),
});

const sectionItemSchema = z.discriminatedUnion("kind", [textItemSchema, lineSchema]);

const sectionSchema = z.strictObject({
  kind: z.literal("section"),
  // 空の段（items: []）も認める。中身のない段は、高さを等分する空白として使える
  items: z.array(sectionItemSchema),
});

const layoutEntrySchema = z.discriminatedUnion("kind", [sectionSchema, lineSchema]);

const baseTemplateSchema = z.strictObject({
  version: z.literal(1),
  page: pageSchema,
  grid: gridSchema,
  card: cardSchema,
  font: z.enum(FONT_IDS),
  fields: z.array(fieldSchema).min(1),
  // layout で使わない fields があってもよい（フォームで集めるだけの項目）
  layout: z.array(layoutEntrySchema).min(1),
});

// 項目どうしを見比べる検証。各項目の形が正しいときだけ走る
export const templateSchema = baseTemplateSchema.check((payload) => {
  const template = payload.value;
  const report = (path: PropertyKey[], message: string) =>
    payload.issues.push({ code: "custom", input: template, path, message });

  // 余白・罫線・padding を除いて、カードの中身を置く場所が残ること
  const { card } = sheetGeometry(template);
  const inset = (template.card.padding_mm + template.card.border_pt * MM_PER_PT) * 2;
  if (card.width - inset <= 0 || card.height - inset <= 0) {
    report(
      [],
      `カードが小さすぎます（今 約 ${card.width.toFixed(1)}×${card.height.toFixed(1)} mm。` +
        "列数・行数・余白・padding を減らしてください）",
    );
  }

  // fields の key は重複させない
  const typeByKey = new Map<string, Field["type"]>();
  template.fields.forEach((field, i) => {
    if (typeByKey.has(field.key)) {
      report(["fields", i, "key"], `「${field.key}」がほかの項目と重複しています`);
    }
    typeByKey.set(field.key, field.type);
  });

  // label も重複させない。CSV の列名と label を正規化して突き合わせるので、正規化した後で比べる
  const labelOwners = new Map<string, number>();
  template.fields.forEach((field, i) => {
    const normalized = normalizeLabel(field.label);
    const first = labelOwners.get(normalized);
    if (first === undefined) {
      labelOwners.set(normalized, i);
      return;
    }
    const other = template.fields[first];
    report(
      ["fields", i, "label"],
      `「${field.label}」（key: ${field.key}）が fields の ${first + 1} 番目の` +
        `「${other?.label}」（key: ${other?.key}）と同じ見出しとして扱われます`,
    );
  });

  // layout の text が指す field は、fields にある文字の項目であること
  const keys = [...typeByKey.keys()];
  const available = keys.length > 0 ? `（使えるのは ${keys.join("、")}）` : "";
  template.layout.forEach((entry, i) => {
    if (entry.kind !== "section") return;
    entry.items.forEach((item, j) => {
      if (item.kind !== "text") return;
      if (item.min_size_pt !== undefined && item.min_size_pt > item.size_pt) {
        report(
          ["layout", i, "items", j, "min_size_pt"],
          `size_pt（${item.size_pt}）以下にしてください`,
        );
      }
      const path = ["layout", i, "items", j, "field"];
      const type = typeByKey.get(item.field);
      if (type === undefined) {
        report(path, `「${item.field}」は fields にありません${available}`);
      } else if (!TEXT_COMPATIBLE_TYPES.has(type)) {
        report(path, `「${item.field}」は type が "${type}" なので、文字として表示できません`);
      }
    });
  });
});

/** 読み込んだあとのテンプレート（省略できる値は既定値で埋まっている） */
export type Template = z.output<typeof templateSchema>;
export type Field = z.output<typeof fieldSchema>;
export type LayoutEntry = Template["layout"][number];
export type SectionItem = z.output<typeof sectionItemSchema>;
export type TextItem = z.output<typeof textItemSchema>;
export type LineItem = z.output<typeof lineSchema>;
