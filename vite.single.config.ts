// 1 ファイル版のビルド。JS・CSS・フォントをすべて 1 つの HTML に埋め込み、
// file:// で直接開いても動くようにする。
// woff2Only などのプラグインは vite.config.ts から mergeConfig で引き継ぐので、ここでは足さない
// （足すと 2 回かかる）。
import { defineConfig, mergeConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import baseConfig from "./vite.config.ts";

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      outDir: "dist-single",
      emptyOutDir: true,
    },
    // useRecommendedBuildConfig（既定で有効）が base "./"、すべてのアセットの埋め込み
    // （@fontsource の woff2 も含む）、cssCodeSplit: false、Vite 8 では codeSplitting: false を設定する
    plugins: [
      viteSingleFile({
        removeViteModuleLoader: true,
        outputFileName: "caption-board.html",
      }),
    ],
  }),
);
