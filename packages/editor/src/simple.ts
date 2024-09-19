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
type Highlight = (e: HTMLElement, pos?: Position, updateOptions?: {
    lang: Options['lang']
    theme: Options['theme']
}) => void

type Options = {
    code: string
    useJSEngine?: boolean,
    lang?: Parameters<typeof codeToHtml>[1]['lang']
} & Partial<CodeOptionsSingleTheme>

const getTheme = (theme: Options['theme']) => import(`../node_modules/shiki/dist/themes/${theme}.mjs`)
const getLang = (lang: Options['lang']) => import(`../node_modules/shiki/dist/langs/${lang}.mjs`)


export async function createEditor(el: HTMLElement, options: CodeJarOptions & Options = {
    code: ''
}) {

    const shiki = await createHighlighterCore({
        themes: [getTheme(options.theme)],
        langs: [getLang(options.lang)],
        engine: options.useJSEngine ? createJavaScriptRegexEngine({
            forgiving: true
        }) : createWasmOnigEngine(import('shiki/wasm'))
    });

    const setHighlight: Highlight = (editor, _pos, updateOptions) => {
        const html = shiki.codeToHtml(editor.textContent || '', {
            lang: options.lang!,
            theme: options.theme!,
            transformers: [{
                pre: () => { }
            }]
        })
        editor.innerHTML = html;
    }

    const codeEditor = CodeJar(
        el,
        withLineNumbers(setHighlight),
        options
    )

    codeEditor.updateCode(options.code);

    return Object.assign({}, codeEditor, {
        loadLanguage: shiki.loadLanguage,
        loadTheme: shiki.loadTheme,
        setTheme: async (theme: Options['theme']) => {
            try {
                options.theme = theme;
                await shiki.loadTheme(getTheme(theme));
                setHighlight(el, undefined, { lang: options.lang, theme: options.theme });
            } catch (error) { }
        },
        setLang: async (lang: Options['lang']) => {
            try {
                options.lang = lang;
                await shiki.loadLanguage(getLang(lang));
                setHighlight(el, undefined, { lang: options.lang, theme: options.theme });
            } catch (error) { }

        }
    });
}


