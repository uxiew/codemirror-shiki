
import {
  shikiViewPlugin,
} from "./shikiViewPlugin"
import { ShikiHighlighter } from "./shikiHighlighter"
import {
  type Highlighter,
  type CmSHOptions,
  type CmSkOptions,
} from './types/types'
import { type Extension } from "@codemirror/state";
import useActions from "./actions";

// export type ThemeOptions = { bg: string, fg: string, rootStyle?: string }
export type ShikiPluginActions = Awaited<ReturnType<typeof shikiPlugin>>["actions"]

export const shikiPlugin = async (highlighter: Highlighter, ctOptions: CmSkOptions) => {

  const { getShikiHighlighter, viewPlugin } = shikiViewPlugin(highlighter, ctOptions)

  return {
    actions: useActions(getShikiHighlighter, ctOptions),
    shiki: [
      ShikiHighlighter.init(highlighter, ctOptions as CmSHOptions).initDefaultTheme(),
      viewPlugin as Extension,
    ]
  }
}
