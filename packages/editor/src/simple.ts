import { CodeJar, type Position } from 'codejar';
import {
    createHighlighterCore, codeToHtml,
    createWasmOnigEngine,
    createJavaScriptRegexEngine,
    type CodeOptionsSingleTheme,
} from 'shiki';
import { withLineNumbers } from 'codejar-linenumbers';
import 'codejar-linenumbers/es/codejar-linenumbers.css';

// Debounce utility function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), waitFor);
    };
}

const DEBOUNCE_DELAY = 250; // ms

type CodeJarType = Parameters<typeof CodeJar>;
type CodeJarOptions = CodeJarType['2']
type HighlightCallback = (e: HTMLElement, pos?: Position) => void

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

    const _performActualHighlight = (editorElement: HTMLElement): void => {
        const code = editorElement.textContent || '';
        const lang = options.lang!;
        const theme = options.theme!;

        const selection = CodeJar.saveSelection(editorElement);
        try {
            const html = shiki.codeToHtml(code, {
                lang,
                theme,
                transformers: [{
                    pre: () => { } // Existing transformer
                }]
            });
            editorElement.innerHTML = html;
        } catch (error) {
            console.error("Shiki highlighting error:", error);
            // Optionally, restore original code or handle error state
            // For now, just log and proceed to restore selection to avoid breaking editor
        }
        CodeJar.restoreSelection(editorElement, selection);
    };

    const debouncedHighlight = debounce(_performActualHighlight, DEBOUNCE_DELAY);

    const highlightCallbackForCodeJar: HighlightCallback = (editorElement: HTMLElement) => {
        debouncedHighlight(editorElement);
    };

    let codeEditor = CodeJar(
        el,
        withLineNumbers(highlightCallbackForCodeJar),
        options
    );

    // Initial highlight after setup
    if (options.code) {
        codeEditor.updateCode(options.code);
        // CodeJar's updateCode should trigger the highlighter,
        // so an explicit call to _performActualHighlight or debouncedHighlight might be redundant here,
        // but let's ensure it's highlighted if CodeJar's initial update doesn't trigger it for empty/initial code.
        // Safest is to let CodeJar's update cycle handle it.
        // If options.code is empty, CodeJar might not trigger.
        // For robustness, explicitly highlight initial content once if needed, or rely on CodeJar's behavior.
        // The current structure `codeEditor.updateCode(options.code);` will trigger the (debounced) highlighter.
    } else {
        // If initial code is empty, still might want to "prime" the empty editor,
        // though highlighting empty content is a no-op.
        // _performActualHighlight(el); // Not strictly needed for empty code
    }


    return Object.assign({}, codeEditor, {
        destroy: () => {
            codeEditor.destroy();
            shiki.dispose();
            // @ts-ignore
            shiki = null;
            // @ts-ignore
            codeEditor = null;
        },
        update(updateOptions: CodeJarOptions & { code?: string, lang?: Options['lang'], theme?: Options['theme'] }) {
            let needsReHighlight = false;
            if (updateOptions.code && updateOptions.code !== codeEditor.toString()) {
                codeEditor.updateCode(updateOptions.code); 
                // Highlighting will be handled by CodeJar's update cycle via highlightCallbackForCodeJar
            }
            if (updateOptions.lang && updateOptions.lang !== options.lang) {
                // setLang will handle re-highlighting
                this.setLang(updateOptions.lang);
                needsReHighlight = false; // setLang triggers its own update cycle
            }
            if (updateOptions.theme && updateOptions.theme !== options.theme) {
                // setTheme will handle re-highlighting
                this.setTheme(updateOptions.theme);
                needsReHighlight = false; // setTheme triggers its own update cycle
            }
            codeEditor.updateOptions(updateOptions); // Update other CodeJar options

            // If only non-code/lang/theme options changed that might affect display,
            // and no re-highlight was triggered by code/lang/theme setters:
            if (needsReHighlight) { // This flag logic might be tricky if setters are async
                 // This path is less likely needed if setters correctly trigger updates.
                debouncedHighlight(el);
            }
        },
        loadLanguage: shiki.loadLanguage,
        loadTheme: shiki.loadTheme,
        setTheme: async (newTheme: Options['theme']) => {
            if (newTheme === options.theme) return;
            try {
                options.theme = newTheme;
                await shiki.loadTheme(getTheme(newTheme));
                // Trigger re-highlight through CodeJar's update mechanism
                codeEditor.updateCode(codeEditor.toString());
            } catch (error) { 
                console.error("Failed to set theme:", error);
            }
        },
        setLang: async (newLang: Options['lang']) => {
            if (newLang === options.lang) return;
            try {
                options.lang = newLang;
                await shiki.loadLanguage(getLang(newLang));
                // Trigger re-highlight through CodeJar's update mechanism
                codeEditor.updateCode(codeEditor.toString());
            } catch (error) { 
                console.error("Failed to set language:", error);
            }
        }
    });
}


