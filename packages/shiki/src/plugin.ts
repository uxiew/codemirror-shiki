
import {
  shikiViewPlugin,
} from "./viewPlugin"
import { Theme } from "./theme"
import type {
  Highlighter,
  ShikiToCMOptions,
} from './types/types'
import useActions from "./actions";
import { HighlightWorker } from "./highlighter";

// export type ThemeOptions = { bg: string, fg: string, rootStyle?: string }
export type ShikiPluginActions = Awaited<ReturnType<typeof shikiPlugin>>["actions"]

export const shikiPlugin = async (shikiWorker: HighlightWorker, ctOptions: ShikiToCMOptions) => {

  const { data } = await shikiWorker.init()
  if (!data) throw new Error('[@cmshiki/shiki] ' + `shikiWorker must be initialized!`)

  const { getShikiHighlighter, viewPlugin } = shikiViewPlugin(shikiWorker, ctOptions)

  return {
    actions: useActions(getShikiHighlighter),
    shiki: [
      Theme.init(data, ctOptions).of(),
      viewPlugin,
    ]
  }
}
