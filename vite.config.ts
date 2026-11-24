import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { woff2Only } from "./vite/woff2-only.ts";

export default defineConfig({
  // 相対パスにして、GitHub Pages のサブパスでも、1 ファイル版でも動くようにする
  base: "./",
  plugins: [woff2Only(), react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
