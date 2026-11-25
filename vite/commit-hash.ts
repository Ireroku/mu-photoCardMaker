import { execFileSync } from "node:child_process";
import type { Plugin } from "vite";

/**
 * ビルドしたコミットのハッシュ（先頭 7 文字）を __COMMIT_HASH__ として埋め込む。画面の右上に出す。
 * コミットしていない変更が残っていれば後ろに「+」を付け、Git が使えない場所では "dev" にする
 */
export function commitHash(): Plugin {
  return {
    name: "commit-hash",
    config() {
      return { define: { __COMMIT_HASH__: JSON.stringify(readCommitHash()) } };
    },
  };
}

function readCommitHash(): string {
  try {
    const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
    const hash = git("rev-parse", "--short=7", "HEAD");
    const dirty = git("status", "--porcelain", "--untracked-files=no") !== "";
    return dirty ? `${hash}+` : hash;
  } catch {
    return "dev";
  }
}
