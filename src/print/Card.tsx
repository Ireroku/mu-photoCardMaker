import type { CSSProperties } from "react";
import type { Caption } from "./geometry";
import type { LayoutEntry, LineItem, SectionItem } from "../template/schema";

type CardProps = {
  layout: readonly LayoutEntry[];
  caption: Caption;
  /** 左端の列か。罫線を 1 回だけ引くため、左の線はこの列だけが引く（print.css を参照） */
  firstColumn: boolean;
  /** 上端の行か。上の線はこの行だけが引く */
  firstRow: boolean;
};

/** キャプション 1 枚。layout を上から順に縦に積む */
export function Card({ layout, caption, firstColumn, firstRow }: CardProps) {
  const className = ["card", firstColumn && "first-column", firstRow && "first-row"]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      {layout.map((entry, i) =>
        entry.kind === "section" ? (
          <div className="card-section" key={i}>
            {entry.items.map((item, j) => (
              <Item item={item} caption={caption} key={j} />
            ))}
          </div>
        ) : (
          <Line line={entry} key={i} />
        ),
      )}
    </div>
  );
}

function Item({ item, caption }: { item: SectionItem; caption: Caption }) {
  if (item.kind === "line") return <Line line={item} />;
  // "constructor" などの名前で Object.prototype の値を拾わないよう、自分のキーだけを見る
  const text = Object.hasOwn(caption, item.field) ? (caption[item.field] ?? "") : "";
  // 空の項目は何も描かない（ほかの行が詰まって中央に寄る）
  if (text === "") return null;
  const style: CSSProperties = {
    fontSize: `${item.size_pt}pt`,
    fontWeight: item.bold ? 700 : 400,
  };
  return (
    <p className="card-text" style={style}>
      {text}
    </p>
  );
}

function Line({ line }: { line: LineItem }) {
  const style: CSSProperties = {
    width: `${line.width_percent}%`,
    borderTopWidth: `${line.thickness_pt}pt`,
  };
  return <div className="card-line" style={style} />;
}
