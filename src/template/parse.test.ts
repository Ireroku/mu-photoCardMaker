import { describe, expect, it } from "vitest";
import { MAX_TEXT_LINES } from "../settings";
import defaultJson from "./parts/default.json";
import { formatPath, parseTemplate, stringifyTemplate, validateTemplate } from "./parse";

// 壊れた JSON をわざと作るため、型を付けずに書き換える
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseJson = any;

/** default.json を深くコピーし、一部を書き換えた JSON 文字列を作る */
function modified(edit: (t: LooseJson) => void): string {
  const t: LooseJson = structuredClone(defaultJson);
  edit(t);
  return JSON.stringify(t);
}

function errorsOf(text: string): string[] {
  const result = parseTemplate(text);
  if (result.ok) throw new Error("検証が通ってしまった");
  return result.errors;
}

describe("parseTemplate", () => {
  it("default.json を受け入れ、省略できる値を埋める", () => {
    const result = parseTemplate(JSON.stringify(defaultJson));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.fields).toHaveLength(4);
    expect(result.template.layout[1]).toEqual({
      kind: "line",
      width_percent: 72,
      thickness_pt: 1,
    });
  });

  it("書き出した JSON をもう一度読める", () => {
    const first = parseTemplate(JSON.stringify(defaultJson));
    if (!first.ok) throw new Error("default.json が通らない");
    const again = parseTemplate(stringifyTemplate(first.template));
    expect(again).toEqual(first);
  });

  it("横線の長さと太さを省くと 100% と 1pt になる", () => {
    const result = parseTemplate(modified((t) => (t.layout[1] = { kind: "line" })));
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.template.layout[1]).toEqual({
      kind: "line",
      width_percent: 100,
      thickness_pt: 1,
    });
  });

  it("空の段を認める", () => {
    expect(parseTemplate(modified((t) => (t.layout[0].items = []))).ok).toBe(true);
  });

  it("layout で使わない fields があってもよい", () => {
    expect(parseTemplate(modified((t) => t.layout[2].items.pop())).ok).toBe(true);
  });

  it("min_size_pt を書ける", () => {
    const result = parseTemplate(modified((t) => (t.layout[0].items[0].min_size_pt = 18)));
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.template.layout[0]).toMatchObject({ items: [{ min_size_pt: 18 }] });
  });

  it("max_lines は 1 から MAX_TEXT_LINES までの整数だけを受け付ける", () => {
    const withLines = (n: number) =>
      parseTemplate(modified((t) => (t.layout[0].items[0].max_lines = n))).ok;
    expect(withLines(2)).toBe(true);
    expect(withLines(MAX_TEXT_LINES)).toBe(true);
    expect(withLines(0)).toBe(false);
    expect(withLines(1.5)).toBe(false);
    expect(withLines(MAX_TEXT_LINES + 1)).toBe(false);
  });

  it("min_size_pt が size_pt より大きければ知らせる", () => {
    const errors = errorsOf(modified((t) => (t.layout[0].items[0].min_size_pt = 30)));
    expect(errors).toEqual([
      "layout の 1 番目 → items の 1 番目 → min_size_pt: size_pt（24）以下にしてください",
    ]);
  });

  it("min_size_pt が 0 以下なら知らせる", () => {
    const errors = errorsOf(modified((t) => (t.layout[0].items[0].min_size_pt = 0)));
    expect(errors).toEqual([
      "layout の 1 番目 → items の 1 番目 → min_size_pt: 0 より大きくしてください",
    ]);
  });

  it("知らない kind は、場所と使える値を示す", () => {
    const errors = errorsOf(modified((t) => (t.layout[1].kind = "circle")));
    expect(errors).toEqual(['layout の 2 番目 → kind: "section"、"line" のいずれかにしてください']);
  });

  it("section の中の知らない kind も同じように示す", () => {
    const errors = errorsOf(modified((t) => (t.layout[2].items[0].kind = "image")));
    expect(errors).toEqual([
      'layout の 3 番目 → items の 1 番目 → kind: "text"、"line" のいずれかにしてください',
    ]);
  });

  it("必要な項目がないと、その場所を示す", () => {
    const errors = errorsOf(modified((t) => delete t.layout[0].items[0].size_pt));
    expect(errors).toEqual([
      "layout の 1 番目 → items の 1 番目 → size_pt: 必要な項目がありません",
    ]);
  });

  it.each<[string, (t: LooseJson) => void, string]>([
    [
      "型の違い",
      (t) => (t.grid.columns = "3"),
      'grid → columns: 数値にしてください（今は 文字列 "3"）',
    ],
    ["整数でない", (t) => (t.grid.columns = 1.5), "grid → columns: 整数にしてください（今は 1.5）"],
    ["小さすぎる", (t) => (t.grid.columns = 0), "grid → columns: 1 以上にしてください"],
    ["大きすぎる", (t) => (t.grid.rows = 21), "grid → rows: 20 以下にしてください"],
    ["負の数", (t) => (t.card.padding_mm = -1), "card → padding_mm: 0 以上にしてください"],
    ["太すぎる罫線", (t) => (t.card.border_pt = 11), "card → border_pt: 10 以下にしてください"],
    [
      "0 より大きくない",
      (t) => (t.layout[0].items[0].size_pt = 0),
      "layout の 1 番目 → items の 1 番目 → size_pt: 0 より大きくしてください",
    ],
    [
      "true / false でない",
      (t) => (t.layout[0].items[0].bold = "yes"),
      'layout の 1 番目 → items の 1 番目 → bold: true か false のどちらかにしてください（今は 文字列 "yes"）',
    ],
    [
      "空の label",
      (t) => (t.fields[0].label = "  "),
      "fields の 1 番目 → label: 空にしないでください",
    ],
    ["知らない用紙", (t) => (t.page.size = "B5"), 'page → size: "A4" にしてください'],
    ["version が 1 でない", (t) => (t.version = 2), "version: 1 にしてください"],
    [
      "知らないフォント",
      (t) => (t.font = "comic-sans"),
      'font: "noto-sans-jp"、"zen-maru-gothic" のいずれかにしてください',
    ],
    [
      "書き間違えたキー",
      (t) => (t.card.border = 1),
      'card: "border" は使えない項目名です（書き間違いかもしれません）',
    ],
  ])("%s を分かりやすい言葉で知らせる", (_, edit, expected) => {
    expect(errorsOf(modified(edit))).toEqual([expected]);
  });

  it("空の fields を知らせる", () => {
    expect(errorsOf(modified((t) => (t.fields = [])))).toContain("fields: 1 個以上必要です");
  });

  it("有限でない数を知らせる（JSON を通さずに検証したとき）", () => {
    const json: LooseJson = structuredClone(defaultJson);
    json.card.padding_mm = Infinity;
    const result = validateTemplate(json);
    expect(result.ok ? [] : result.errors).toEqual([
      "card → padding_mm: ふつうの数にしてください（今は Infinity）",
    ]);
  });

  it("key に使えない文字を知らせる", () => {
    const errors = errorsOf(modified((t) => (t.fields[3].key = "機材")));
    expect(errors).toEqual([
      "fields の 4 番目 → key: 半角の英字・数字・_ だけで書き、先頭は英字か _ にしてください（例: title, photo_place）",
      "layout の 3 番目 → items の 3 番目 → field: 「camera」は fields にありません（使えるのは title、author、place、機材）",
    ]);
  });

  it("fields の key の重複を知らせる", () => {
    const errors = errorsOf(modified((t) => (t.fields[3].key = "place")));
    expect(errors).toContain("fields の 4 番目 → key: 「place」がほかの項目と重複しています");
  });

  it("正規化すると同じになる label の重複を、両方の項目を示して知らせる", () => {
    const errors = errorsOf(
      modified((t) => {
        // 全角・大文字・空白の違いだけの 2 つの label
        t.fields[0].label = "Title";
        t.fields[3].label = " ＴＩＴＬＥ　 ";
      }),
    );
    expect(errors).toEqual([
      "fields の 4 番目 → label: 「ＴＩＴＬＥ」（key: camera）が fields の 1 番目の「Title」（key: title）と同じ見出しとして扱われます",
    ]);
  });

  it("fields にない field を使う layout を知らせる", () => {
    const errors = errorsOf(modified((t) => (t.layout[2].items[1].field = "plce")));
    expect(errors).toEqual([
      "layout の 3 番目 → items の 2 番目 → field: 「plce」は fields にありません（使えるのは title、author、place、camera）",
    ]);
  });

  it("カードの中身を置く場所がなければ知らせる", () => {
    const errors = errorsOf(
      modified((t) => {
        t.grid.columns = 20;
        t.grid.rows = 20;
        t.card.padding_mm = 10;
      }),
    );
    expect(errors).toEqual([
      "テンプレート全体: カードが小さすぎます（今 約 14.3×10.0 mm。列数・行数・余白・padding を減らしてください）",
    ]);
  });

  it("JSON の文法の誤りを、日本語と行の位置で知らせる", () => {
    const errors = errorsOf('{\n  "version": 1,\n}');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^JSON の書き方が正しくありません（3 行目 1 文字目付近）。/);
  });

  it("空のファイルを知らせる", () => {
    expect(errorsOf("  \n")).toEqual(["ファイルが空です"]);
  });

  it("JSON の一番外側がオブジェクトでなければ知らせる", () => {
    expect(errorsOf("[]")).toEqual([
      "テンプレート全体: { } で囲んだまとまりにしてください（今は [ ] で囲んだ並び）",
    ]);
  });
});

describe("formatPath", () => {
  it("番号を「n 番目」にする", () => {
    expect(formatPath(["layout", 2, "items", 0, "field"])).toBe(
      "layout の 3 番目 → items の 1 番目 → field",
    );
  });
});
