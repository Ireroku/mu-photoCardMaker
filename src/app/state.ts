import type { Caption } from "../print/geometry";
import { DEFAULT_TEMPLATE } from "../template/default";
import type { Template } from "../template/schema";
import { SAMPLE_CAPTIONS } from "./sampleCaptions";

export type AppState = {
  template: Template;
  captions: readonly Caption[];
  /** 今使っているテンプレートを読み込んだファイルの名前。既定のテンプレートなら undefined */
  loadedFileName: string | undefined;
  /** 最後に読み込もうとして失敗したファイルとエラー。失敗していなければ null */
  rejected: { fileName: string; errors: readonly string[] } | null;
};

export type AppAction =
  | { type: "templateLoaded"; template: Template; fileName: string }
  | { type: "templateRejected"; errors: string[]; fileName: string };

export const initialState: AppState = {
  template: DEFAULT_TEMPLATE,
  captions: SAMPLE_CAPTIONS,
  loadedFileName: undefined,
  rejected: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "templateLoaded":
      return {
        ...state,
        template: action.template,
        loadedFileName: action.fileName,
        rejected: null,
      };
    case "templateRejected":
      // 読み込めなかったときは、今のテンプレートをそのまま使い続ける
      return { ...state, rejected: { fileName: action.fileName, errors: action.errors } };
  }
}
