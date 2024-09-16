
import {
  shikiViewPlugin,
} from "./viewPlugin"
import type {
  Highlighter,
  ShikiToCMOptions,
} from './types/types'
import { Base, themeCompartment } from "./base"

export const shikiPlugin = async (coreHighlighter: Highlighter, ctOptions: ShikiToCMOptions) => {

  const { viewPlugin } = shikiViewPlugin(coreHighlighter, ctOptions)

  return {
    /**
     * get theme
     */
    getTheme: Base.init(coreHighlighter, ctOptions).getTheme,
    shiki: [
      themeCompartment.of(Base.init(coreHighlighter, ctOptions).initTheme()),
      viewPlugin,
    ]
  }
}
