import type { Caption } from "../print/geometry";

// 画面の確認用のダミー。人名・場所・機材はすべて架空の、見本と分かるもの
export const SAMPLE_CAPTIONS: Caption[] = [
  { title: "朝の光", author: "写真 太郎", place: "近所の公園", camera: "ミラーレス一眼" },
  { title: "雨上がり", author: "撮影 花子", place: "駅前の通り", camera: "コンパクトカメラ" },
  {
    title: "とても長い題名がカードの幅に収まりきらないときにどう見えるかを確かめるための作品",
    author: "見本 一郎",
    place: "川沿いの遊歩道",
    camera: "一眼レフ",
  },
  { title: "夕暮れ", author: "例示 次郎", place: "", camera: "スマートフォン" },
  { title: "猫の昼寝", author: "仮名 三郎", place: "どこかの家", camera: "" },
  { title: "影", author: "試写 さくら", place: "学校の中庭", camera: "フィルムカメラ" },
  { title: "冬の海", author: "名無 健", place: "海岸", camera: "ミラーレス一眼" },
  { title: "花", author: "見本 葵", place: "植物園", camera: "マクロレンズ" },
  { title: "夜景", author: "写真 翔", place: "展望台", camera: "一眼レフ" },
];
