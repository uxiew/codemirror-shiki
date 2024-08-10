import type {
    Options,
    ShikiToCMOptions,
} from "./types/types";
import {
    shikiPlugin,
} from "./plugin";
import defaultOptions from "./config";
import { Facet } from "@codemirror/state";
import { HighlightWorker } from "./highlighter";

export { type ShikiPluginActions } from "./plugin";
export { shikiViewPlugin } from "./viewPlugin";

// 用于配置高亮的 Facet
const cmShikiConfig = Facet.define<ShikiToCMOptions, ShikiToCMOptions>({
    combine: values => values[0] // 使用第一个配置
});

/**
 * integrate the Shiki highlighter to CodeMirror
 * @param { Highlighter } highlighter Shiki Highlighter instance
 * @param  { GenerateOptions } options
 */
export async function shikiToCodeMirror(shikiOptions: Options) {
    const { theme, themes } = shikiOptions
    if (!themes) {
        if (theme) {
            shikiOptions.themes = {
                light: theme,
            }
        } else {
            throw new Error('[@cmshiki/shiki]' + 'Invalid options, either `theme` or `themes` must be provided')
        }
    }

    const options = {
        ...defaultOptions,
        ...shikiOptions
    } as ShikiToCMOptions

    return shikiPlugin(new HighlightWorker("./workers/index.ts", options), options)
}
