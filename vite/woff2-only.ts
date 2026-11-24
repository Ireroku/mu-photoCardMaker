import type { Plugin } from "vite";

/**
 * @fontsource の CSS は各フォントで .woff2 の後ろに .woff を予備として書いている。
 * このアプリが動くブラウザはすべて woff2 に対応しているので予備を消し、
 * 使われない .woff がビルドに入らないようにする（1 ファイル版ではおよそ半分の大きさになる）。
 */
export function woff2Only(): Plugin {
  return {
    name: "woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]@fontsource[\\/].*\.css$/.test(id)) return null;
      return code.replace(/,\s*url\([^)]+\.woff\)\s*format\(["']woff["']\)/g, "");
    },
  };
}
