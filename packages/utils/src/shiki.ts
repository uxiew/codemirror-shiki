import {
    type ThemeInput,
    LanguageInput,
    createShikiInternal,
} from "@shikijs/core";
import wasmInlined from "@shikijs/core/wasm-inlined";
import { grammars, injections } from 'tm-grammars';
import { Options } from "../../shiki/src/types/types";

type ShikiOptions = Omit<Options, 'theme' | 'themeStyle'>

export function initShikiInternal(options: ShikiOptions) {
    if (!options.themes) {
        throw new Error('[@cmshiki/shiki]' + 'Invalid options, `themes` must be provided')
    }

    const langs = new Map<string, LanguageInput>();
    const themes: ThemeInput[] = Object.values(options.themes).map((theme) => import(
        `../node_modules/tm-themes/themes/${theme}.json`
    ).then((m) => m.default))

    function loadLangs(lang: string) {
        if (langs.has(lang)) return langs.get(lang);
        const info =
            grammars.find((g) => g.name === lang) ||
            injections.find((g) => g.name === lang);

        langs.set(
            lang,
            import(`../node_modules/tm-grammars/grammars/${lang}.json`).then(
                (m) => m.default
            )
        );
        info?.embedded?.forEach(loadLangs);
        return langs.get(lang);
    }

    loadLangs(options.lang as string)

    return createShikiInternal({
        langs: Array.from(langs.values()),
        themes,
        langAlias: options.langAlias,
        warnings: options.warnings,
        engine: options.engine,
        loadWasm: wasmInlined,
    })
}