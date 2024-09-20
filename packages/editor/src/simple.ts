import { CodeJar, type Position } from 'codejar';
import {
    createHighlighterCore, codeToHtml,
    createWasmOnigEngine,
    createJavaScriptRegexEngine,
    type CodeOptionsSingleTheme,
} from 'shiki';
import { withLineNumbers } from 'codejar-linenumbers';
import 'codejar-linenumbers/es/codejar-linenumbers.css';

type CodeJarType = Parameters<typeof CodeJar>;
type CodeJarOptions = CodeJarType['2']
type Highlight = (e: HTMLElement, pos?: Position) => void

type Options = {
    /** editor's content */
    code?: string
    /** Use the modern JavaScript RegExp engine to implement the OnigScanner. */
    useJSEngine?: boolean,
    /** code's language*/
    lang?: Parameters<typeof codeToHtml>[1]['lang']
} & Partial<CodeOptionsSingleTheme>

const getTheme = (theme: Options['theme']) => import(`../node_modules/shiki/dist/themes/${theme}.mjs`)
const getLang = (lang: Options['lang']) => import(`../node_modules/shiki/dist/langs/${lang}.mjs`)


export type SimpleEditor = Awaited<ReturnType<typeof createEditor>>

export async function createEditor(el: HTMLElement, options: CodeJarOptions & Options) {
    if (!options.lang || !options.theme) {
        throw new Error('lang and theme are required')
    }
    if (!options.code) options.code = ''

    let shiki = await createHighlighterCore({
        themes: [getTheme(options.theme)],
        langs: [getLang(options.lang)],
        engine: options.useJSEngine ? createJavaScriptRegexEngine({
            forgiving: true
        }) : createWasmOnigEngine(import('shiki/wasm'))
    });

    const setHighlight: Highlight = (editor, _pos) => {
        const html = shiki.codeToHtml(editor.textContent || '', {
            lang: options.lang!,
            theme: options.theme!,
            transformers: [{
                pre: () => { }
            }]
        })
        editor.innerHTML = html;
    }

    let codeEditor = CodeJar(
        el,
        withLineNumbers(setHighlight),
        options
    )

    codeEditor.updateCode(options.code);

    return Object.assign({}, codeEditor, {
        destroy: () => {
            codeEditor.destroy();
            shiki.dispose();
            // @ts-ignore
            shiki = null;
            // @ts-ignore
            codeEditor = null;
        },
        update(options: CodeJarOptions & { code?: string, lang?: Options['lang'], theme?: Options['theme'] }) {
            if (options.code) codeEditor.updateCode(options.code)
            if (options.lang) this.setLang(options.lang)
            if (options.theme) this.setTheme(options.theme)
            codeEditor.updateOptions(options)
        },
        loadLanguage: shiki.loadLanguage,
        loadTheme: shiki.loadTheme,
        setTheme: async (theme: Options['theme']) => {
            try {
                options.theme = theme;
                await shiki.loadTheme(getTheme(theme));
                setHighlight(el);
            } catch (error) { }
        },
        setLang: async (lang: Options['lang']) => {
            try {
                options.lang = lang;
                await shiki.loadLanguage(getLang(lang));
                setHighlight(el);
            } catch (error) { }
        }
    });
}


