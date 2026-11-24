# キャプションボード作成ツール

Google フォームの回答 CSV から、展示用のキャプションを A4 に敷き詰めて印刷できるページにする Web アプリ。

読み込んだ CSV はブラウザの中だけで処理し、どこにも送らない。1 つの HTML ファイルにまとめた版は、インターネットにつながっていなくても動く。

> [!NOTE]
> 印刷の結果（余白のずれ、フォント、改ページ）は、まだ実機で確かめていない。

---

## 🖨️ 使い方

使うには、GitHub Pages で公開した版を開くか、1 つの HTML にまとめた版（`caption-board.html`）をダブルクリックで開く。1 ファイル版は GitHub Actions の「Deploy」の実行結果から `caption-board-single-html` としてダウンロードできる。画面は番号付きの手順を上から順に進める。

1. **フォームを作る**：初めてのときは「① フォームを作る」を開き、手順どおりに Google フォームを作る。質問文はコピーボタンで貼り付けると、あとで列を自動で見つけられる
2. **回答を読み込む**：Google フォームの「回答」タブから CSV をダウンロードし、「CSV を読み込む」で選ぶ（画面にドラッグ＆ドロップしてもよい）。読み込めるのは `.csv`・`.tsv`・`.txt` で 10 MB まで。項目に当たる列が見つからないときは、その項目だけ一覧が出るので、列を選ぶ。すべて自動で対応したときも、「対応を確認」で中身を確かめて選び直せる
3. **並べて確認**：一覧の行を、左のつまみのドラッグか「先頭へ」「上へ」「下へ」「末尾へ」で動かし、展示の順に並べる。「並び替えに使う列」で数字の入った列を選ぶと小さい順に並び、「読み込んだ順に戻す」で元に戻る。CSV に「並び順」の列があれば、読み込んだときにその順に並ぶ。右のプレビューで「収まりません」と出た札は、題名などが長すぎて最小の大きさでも入らないので、回答を短くするか、テンプレートの `min_size_pt` を下げる
4. **印刷**：「印刷 / PDF に保存」を押し、確認の一覧のとおりに倍率 100%・余白なしで印刷するか、PDF に保存する

CSV を読み込む前は、見本の札が薄く表示される。見本のまま印刷すると、各ページに「見本」と入る。

> [!IMPORTANT]
> 読み込んだ CSV と並び順は、ページを閉じたり再読み込みしたりすると消える。手で並べ替えたときは、印刷か PDF への保存を済ませてから閉じる。

印刷がずれるときは、「④ 印刷」の「印刷がずれたとき・切り取り線を変えたいとき」で外側の余白と切り取り線を変える。変えた値と項目の設定は、ページの下の「来年に引き継ぐ」でファイル（`caption-template-<年>.json`）に保存でき、次の年に読み込めば同じ設定で作れる。

## 🛠️ 開発

> [!NOTE]
> Requirements:
>
> - [Node.js](https://nodejs.org/) 22.13 以降の 22、24、26 以降（`package.json` の `engines`）

```sh
npm install
npm run dev           # 開発用サーバー（http://localhost:5173）
npm test              # テスト（Vitest）
npm run typecheck     # 型チェック
npm run lint          # ESLint
npm run format        # Prettier で整形（確認だけなら format:check）
npm run build         # GitHub Pages 用のビルド（dist/）
npm run build:single  # 1 ファイル版のビルド（dist-single/caption-board.html）
```

`main` に push すると、GitHub Actions がテストとビルドをして GitHub Pages に公開する。

## 📄 テンプレート JSON

札の項目と見た目は、テンプレート JSON に書く。既定のテンプレートは [`src/template/default.json`](./src/template/default.json)。画面の「来年に引き継ぐ」で書き出したファイルも同じ形になる。

- `fields` は「何を集めるか」。フォームの作り方の手順と、CSV の列の対応付けに使う
- `layout` は「どう並べるか」。カードの描画だけに使う。上から順に縦に積み、中央にそろえる
- 書き間違えた項目名はエラーになる。エラーは読み込んだときに画面に日本語で出る

| 場所 | 項目 | 内容 |
| --- | --- | --- |
| （一番外） | `version` | `1` |
| | `font` | `"noto-sans-jp"` か `"zen-maru-gothic"`（[`src/fonts/fonts.ts`](./src/fonts/fonts.ts) に足せる） |
| `page` | `size` | `"A4"` |
| | `orientation` | `"landscape"`（横）か `"portrait"`（縦） |
| | `margin_mm` | 用紙の端からカードまでの余白。0〜50 mm |
| `grid` | `columns`、`rows` | 1 ページに並べる列と行の数。1〜20 |
| `card` | `border_pt` | カードの罫線（切り取り線）の太さ。0〜10 pt。0 なら線を引かない |
| | `padding_mm` | 罫線から中身までの余白。0〜20 mm |
| `fields[]` | `key` | 項目の名前。半角英数字と `_` |
| | `label` | フォームの質問文。CSV の見出しとの対応付けにも使う |
| | `type` | `"text"` |
| | `required` | フォームで必須にするか |
| | `hint` | フォームの説明文（省略可） |
| `layout[]` | `{ "kind": "section", "items": [...] }` | 段。段どうしで高さを等分し、中身を上下中央に寄せる |
| | `{ "kind": "line", "width_percent", "thickness_pt" }` | 横線。長さはカード幅に対する %（省略時 100）、太さは pt（省略時 1） |
| `items[]` | `{ "kind": "text", "field", "size_pt", "min_size_pt", "bold" }` | 文字。`field` は `fields[].key`。1 行で表示し、収まらなければ 0.5 pt ずつ `min_size_pt` まで縮める。`min_size_pt` は `size_pt` 以下にする。省略時は `size_pt` の 60% を 0.5 pt 単位に丸めた値で、6 pt を下回らない（`size_pt` が 6 pt 以下なら縮めない）。それでも入らなければ末尾を「…」にする |
| | `{ "kind": "line", ... }` | 段の中の横線 |

空欄の項目も 1 行分の高さを取るので、撮影場所などが空でも、ほかの行の位置は札ごとにずれない。

例（既定のテンプレートの `layout`）：

```json
[
  { "kind": "section", "items": [{ "kind": "text", "field": "title", "size_pt": 24, "bold": true }] },
  { "kind": "line", "width_percent": 72, "thickness_pt": 1 },
  {
    "kind": "section",
    "items": [
      { "kind": "text", "field": "author", "size_pt": 16, "bold": true },
      { "kind": "text", "field": "place", "size_pt": 11 },
      { "kind": "text", "field": "camera", "size_pt": 11 }
    ]
  }
]
```

## 📁 ディレクトリ構成

機能ごとにフォルダを分け、同じフォルダの中で純粋なロジック（`*.ts`）と画面（`*.tsx`）を分ける。

```
src/
  app/        画面全体（手順①〜④、来年に引き継ぐ）、状態（state.ts）、状態から札を求める計算（derive.ts）、並び順（order.ts）
  csv/        文字コードの判別、CSV の読み込みと確かめ、列の対応付け、テスト用の fixtures/
  tutorial/   Google フォームの作り方の手順
  print/      ページとカード、印刷用 CSS、文字の自動縮小（fit.ts、autoFit.ts、measure.ts）
  template/   テンプレート JSON の型と検証（zod）、既定のテンプレート（default.json）
  fonts/      同梱するフォントの一覧
public/licenses/  フォントのライセンス文
vite/             ビルド用のプラグイン
```

## ⚖️ ライセンス

- コード：[CC0 1.0](./LICENSE)
- 同梱のフォント：SIL Open Font License 1.1（フォントと同じ場所にライセンス文を置く）
