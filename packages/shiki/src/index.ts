import {
    type ThemeInput,
    LanguageInput,
    createShikiInternal,
    getSingletonHighlighterCore
} from "@shikijs/core";
import wasmInlined from "@shikijs/core/wasm-inlined";
import type {
    Options,
    ShikiToCMOptions,
} from "./types/types";
import {
    shikiPlugin,
} from "./plugin";
import defaultOptions from "./config";

export { type ShikiPluginActions } from "./plugin";
export { shikiViewPlugin } from "./viewPlugin";


function getShikiInternal(options: ShikiToCMOptions) {
    const themes: ThemeInput[] = Object.values(options.themes).map((theme) => import(
        `../node_modules/tm-themes/themes/${theme}.json`
    ).then((m) => m.default))

    const langs: LanguageInput[] = [import(
        `../node_modules/tm-grammars/grammars/${options.lang}.json`)
        .then((m) => m.default)]

    return createShikiInternal({
        langs,
        themes,
        langAlias: options.langAlias,
        warnings: options.warnings,
        loadWasm: wasmInlined
    })
}

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

    const shikiMiniCore = await getShikiInternal(options)

    return shikiPlugin(shikiMiniCore, options)
}
