
import {
  shikiViewPlugin,
} from "./viewPlugin"
import type {
  Highlighter,
  ShikiToCMOptions,
} from './types/types'
import { Base, themeCompartment } from "./base"
import { type EditorView } from "@codemirror/view"
import { ShikiHighlighter } from "./highlighter"



export const shikiPlugin = async (highlighter: Highlighter, ctOptions: ShikiToCMOptions) => {

  const shikiHighlighter = new ShikiHighlighter(
    highlighter,
    ctOptions,
  )
  const { viewPlugin } = shikiViewPlugin(shikiHighlighter, ctOptions)

  const BaseCore = Base.init(highlighter, ctOptions)
  // const highlighter = Base.init(highlighter, ctOptions)

  return {
    /**
 * get theme
 *
 * @param { string } name `light\dark\...`
 * @returns { Extension } codemirror theme extension
 * @throws `xxxx theme not registered!`
 */
    getTheme(name?: string, view?: EditorView) {
      return view
        ? shikiHighlighter.setView(view).getTheme(name)
        : BaseCore.getTheme(name)
    },
    shiki: [
      themeCompartment.of(BaseCore.initTheme()),
      viewPlugin,
    ]
  }
}
