
import {
  shikiViewPlugin,
} from "./viewPlugin"
import { ShikiHighlighter } from "./highlighter"
import type {
  Highlighter,
  ShikiToCMOptions,
} from './types/types'
import useActions from "./actions";

// export type ThemeOptions = { bg: string, fg: string, rootStyle?: string }
export type ShikiPluginActions = Awaited<ReturnType<typeof shikiPlugin>>["actions"]

export const shikiPlugin = async (highlighter: Highlighter, ctOptions: ShikiToCMOptions) => {

  const { getShikiHighlighter, viewPlugin } = shikiViewPlugin(highlighter, ctOptions)

  return {
    actions: useActions(getShikiHighlighter),
    shiki: [
      ShikiHighlighter.init(highlighter, ctOptions).of(),
      viewPlugin,
    ]
  }
}
