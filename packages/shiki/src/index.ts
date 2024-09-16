import type {
    Options,
    ShikiToCMOptions,
} from "./types/types";
import {
    shikiPlugin,
} from "./plugin";
import defaultOptions from "./config";

export * from "./types/types";
export { shikiViewPlugin, updateEffect } from "./viewPlugin";
export { getShikiInternal, themeCompartment, configsFacet } from "./base";
import { getShikiInternal } from "./base";
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

    const shikiInternalCore = await getShikiInternal(options)

    return shikiPlugin(shikiInternalCore, options)
}
