// アプリ全体の決まった値。値を変えたいときは、まずここを見る。
// 変えたくなりそうなものから順に並べている。

// ---- 文字の自動縮小（長くて収まらない文字を小さくする） ----

/** min_size_pt を書かなかったとき、元の大きさのこの割合まで縮める */
export const DEFAULT_MIN_RATIO = 0.6;

/** 上の割合で決めた最小の大きさの下限。これより小さい文字は印刷すると読みにくい */
export const ABSOLUTE_MIN_PT = 6;

/** 縮めるときの刻み（pt） */
export const DEFAULT_STEP_PT = 0.5;

/** テンプレートの max_lines（折り返して使える行の数）に書ける最大の値 */
export const MAX_TEXT_LINES = 3;

/** 測った幅と実際の描画のずれを吸収する余裕（mm）。sheets/parts/measure.ts の注意を参照 */
export const FIT_SAFETY_MM = 0.5;

// ---- ファイルと列の名前 ----

/** 「設定ファイル」でダウンロードするファイルの名前の頭。後ろに年と .json が付く */
export const TEMPLATE_FILE_PREFIX = "caption-template-";

/** この見出しの列が CSV にあれば、読み込んだときにその列で並べる */
export const ORDER_HEADER = "並び順";

// ---- 余白と切り取り線の値の範囲（テンプレートの検証と、手順④の入力欄の両方で使う） ----

/** 用紙の端からカードの並びまでの余白（mm） */
export const MARGIN_MM = { min: 0, max: 50, step: 0.5 } as const;

/** 切り取り線の太さ（pt）。0 は線を引かない。入力欄は線を引くときだけ使うので inputMin から */
export const BORDER_PT = { min: 0, inputMin: 0.1, max: 10, step: 0.1 } as const;

/** テンプレートで切り取り線を消してあるとき、もう一度線を付けるときの太さ（pt） */
export const DEFAULT_BORDER_PT = 1;

// ---- 画面に出す数 ----

/** プレビューの「収まりません」の一覧に出すリンクの数。残りは件数だけ出す */
export const MAX_OVERFLOW_LINKS = 10;

/** 手順②の列の選択肢に出す、回答の例の長さ（文字数） */
export const EXAMPLE_LENGTH = 16;

/** テンプレートを読み込めなかったときに出すエラーの最大数。残りは件数だけ出す */
export const MAX_SHOWN_ERRORS = 10;

// ---- 読み込む CSV ----

/** 受け付ける CSV の大きさの上限。回答の CSV は数百件でも数百 KB ほどなので、十分に大きい */
export const MAX_CSV_BYTES = 10 * 1024 * 1024;

// ---- 表示の時間（ミリ秒） ----

/** 「コピーしました」などを出しておく時間 */
export const COPY_STATUS_MS = 3000;

/** カードを動かしたあと、読み上げの知らせを出すまで待つ時間。フォーカスの移動の読み上げに消されないようにする */
export const ANNOUNCE_DELAY_MS = 500;
