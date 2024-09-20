import type {
    Options,
    ShikiToCMOptions,
} from "./types/types";
import {
    shikiPlugin,
} from "./plugin";
import defaultOptions from "./config";
import { initShikiInternal } from "@cmshiki/utils";

export * from "./types/types";
export { updateEffect } from "./viewPlugin";
export { themeCompartment, configsFacet } from "./base";
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

    const shikiInternalCore = await initShikiInternal(options)

    return shikiPlugin(shikiInternalCore, options)
}
