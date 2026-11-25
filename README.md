# キャプションボード作成ツール

Google フォームで集めた作品の情報から、写真展示のキャプションを作り、A4 に並べて印刷できる Web アプリです。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Papa Parse](https://img.shields.io/badge/Papa_Parse-5-2C3E50)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)

## 🚀 アプリの起動

### Web 版（推奨）

[GitHub Pages](https://ireroku.github.io/mu-photoCardMaker/) をブラウザで開いてください。

### オフライン版（1 ファイル）

[Releases](https://github.com/Ireroku/mu-photoCardMaker/releases/latest) から `caption-board.html` をダウンロードし、ブラウザで開いてください。

## 🖨️ 使い方

1. アプリを開く
2. 手順①「フォームを作る」に従って、回答用の Google フォームを作る
3. Google フォームの回答を CSV でダウンロードし、手順②「回答を読み込む」で読み込む
4. 手順③「並べて確認」で、カードを展示する順番に並べる
5. 手順④「印刷」で印刷する（印刷画面から PDF にも保存できる）

> [!WARNING]
> ページを閉じると、読み込んだ CSV と並べた順は消えます。

次も同じ設定で作る予定がある場合は、ページ下部の「設定ファイル」にある「ダウンロード」で設定を保存してください。次回は「読み込む」で読み込みます。

## 🧾 テンプレート JSON の形式

- フォームで集める質問と、カードの見た目を決めるファイル
- 「設定ファイル」でダウンロードするファイルもこの形式。書き換えてから読み込むと、カードの見た目を変えられる
- この節を LLM に渡すと、カードのデザインを作ってもらえます

```json
{
  "version": 1,
  "page": { "size": "A4", "orientation": "landscape", "margin_mm": 5 },
  "grid": { "columns": 3, "rows": 3 },
  "card": { "border_pt": 1, "padding_mm": 2 },
  "font": "noto-sans-jp",
  "fields": [
    { "key": "title", "label": "題名", "type": "text", "required": true },
    { "key": "author", "label": "撮影者名", "type": "text", "required": true },
    { "key": "place", "label": "撮影場所", "type": "text", "required": false },
    { "key": "camera", "label": "機材名", "type": "text", "required": false }
  ],
  "layout": [
    {
      "kind": "section",
      "items": [{ "kind": "text", "field": "title", "size_pt": 24, "bold": true }]
    },
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
}
```

| 項目 | 内容 |
| --- | --- |
| `version` | テンプレート JSON の形式の番号。今は `1` だけ（将来、形式を変えるときのために予約） |
| `page` | 用紙の設定。サイズ（`size`）は `"A4"`、向き（`orientation`）は `"landscape"`（横）か `"portrait"`（縦）、余白（`margin_mm`）は用紙の端からカードまでの距離 |
| `grid` | 1 ページに並べるカードの列数（`columns`）と行数（`rows`） |
| `card` | カード 1 枚の枠。切り取り線の太さ（`border_pt`、0 なら線なし）と、線から文字までの余白（`padding_mm`） |
| `font` | フォント。`"noto-sans-jp"` か `"zen-maru-gothic"` |
| `fields` | フォームの質問。`label` は質問文で、CSV の列を探すのにも使う。`required` はフォームで必須にするか。`hint` を書くと、手順①で質問の「説明」に貼る文として出る（省略可） |
| `layout` | カードに載せる文字と線の並べ方。上から縦に積み、中央にそろえる。`section` は段、`line` は横線 |
| `items` | 段の中に並べる文字。`field` に `fields` の `key` を書く。長くて入らない時は `min_size_pt` まで縮める（省くと少し小さくなるまで。割合は `settings.ts` の `DEFAULT_MIN_RATIO`） |

- 省略できる項目は [`src/template/schema.ts`](./src/template/schema.ts)、余白や罫線の太さの範囲などの値は [`src/settings.ts`](./src/settings.ts) にあります
- 書き間違えると、読み込んだ時に画面にエラーが出ます

## 🛠️ 開発

> [!NOTE]
> Requirements:
>
> - [Node.js](https://nodejs.org/) 22（22.13 以降）、24、26 以降

```sh
npm ci
npm run dev
```

### 新バージョンの公開方法

- Web 版：`main` に push すると自動で GitHub Pages に公開されます
- オフライン版：`v2026.11.25` のような日付のタグを push すると自動で Releases に反映されます

### ドキュメント類

- [プロジェクトガイド](AGENTS.md)（方針・規約・ディレクトリ構成・確認用のコマンド）

## 📄 ライセンス

- コード：[CC0 1.0](./LICENSE)
- 同梱のフォント：[SIL Open Font License 1.1](./public/licenses/)
