import {
    createShikiInternal,
    type LanguageInput,
    type ThemeInput,
} from "@shikijs/core"
import wasmInlined from "@shikijs/core/wasm-inlined";

import type {
    ShikiToCMOptions,
} from "../types/types"


export function getShikiInternal(options: ShikiToCMOptions) {
    const themes: ThemeInput[] = Object.values(options.themes).map((theme) => import(
        `../../node_modules/tm-themes/themes/${theme}.json`
    ).then((m) => m.default))

    const langs: LanguageInput[] = [import(
        `../../node_modules/tm-grammars/grammars/${options.lang}.json`)
        .then((m) => m.default)]

    return createShikiInternal({
        langs,
        themes,
        langAlias: options.langAlias,
        warnings: options.warnings,
        loadWasm: wasmInlined
    })
}



