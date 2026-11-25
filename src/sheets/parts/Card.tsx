import type { CSSProperties, ReactNode } from "react";
import type { LayoutEntry, LineItem, SectionItem } from "../../template/schema";
import { captionText, hasOverflow, textItemId, type CardFit } from "../autoFit";
import type { Caption } from "../geometry";

type CardProps = {
  layout: readonly LayoutEntry[];
  caption: Caption;
  /** 左端の列か。罫線を 1 回だけ引くため、左の線はこの列だけが引く（sheets/parts/sheets.css を参照） */
  firstColumn: boolean;
  /** 上端の行か。上の線はこの行だけが引く */
  firstRow: boolean;
  /** 文字の自動縮小の結果。なければ layout の大きさのまま */
  fit?: CardFit;
  /** 要素の id（画面の警告から飛ぶ先） */
  id?: string;
  /** 画面だけに出す印（カードの番号など）。印刷には出ない */
  badge?: ReactNode;
};

/** キャプション 1 枚。layout を上から順に縦に積む */
export function Card({ layout, caption, firstColumn, firstRow, fit, id, badge }: CardProps) {
  const className = [
    "card",
    firstColumn && "first-column",
    firstRow && "first-row",
    hasOverflow(fit) && "overflow",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className} id={id}>
      {badge}
      {layout.map((entry, i) =>
        entry.kind === "section" ? (
          <div className="card-section" key={i}>
            {entry.items.map((item, j) => (
              <Item
                item={item}
                caption={caption}
                sizePt={fit?.[textItemId(i, j)]?.sizePt}
                key={j}
              />
            ))}
          </div>
        ) : (
          <Line line={entry} key={i} />
        ),
      )}
    </div>
  );
}

function Item({
  item,
  caption,
  sizePt,
}: {
  item: SectionItem;
  caption: Caption;
  sizePt: number | undefined;
}) {
  if (item.kind === "line") return <Line line={item} />;
  const text = captionText(caption, item.field);
  const style: CSSProperties = {
    fontSize: `${sizePt ?? item.size_pt}pt`,
    fontWeight: item.bold ? 700 : 400,
  };
  // 空の項目も 1 行分の高さを取る。ほかの行の位置がカードごとにずれないようにするため
  if (text === "") {
    return (
      <p className="card-text" style={style} aria-hidden="true">
        {" "}
      </p>
    );
  }
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
