import { EditorView } from "@codemirror/view";
import { combineConfig, Compartment, Facet, type Extension } from "@codemirror/state";
import { createTheme, type CreateThemeOptions } from "@cmshiki/utils";
import type { BaseOptions, Highlighter, Options, ShikiToCMOptions } from "./types/types";
import type { StringLiteralUnion } from "./types/shiki.types";
import { initShikiInternal } from "@cmshiki/utils";

export const themeCompartment = new Compartment

type ThemeName = BaseOptions['theme'] | StringLiteralUnion<'light' | 'dark'>

export const configsFacet = Facet.define<ShikiToCMOptions, ShikiToCMOptions>({
    combine: values => combineConfig(values, {}, {
        themeStyle: (f, s) => s,
    })
})

export class Base {
    protected themesCache = new Map<ThemeName, Extension>()
    protected currentTheme = 'light'

    /** determines whether the theme style of the current option is `cm` or not */
    get isCmStyle() {
        return this.configs.themeStyle === 'cm'
    }


    static init(shikiCore: Highlighter, configs: ShikiToCMOptions) {
        return new Base(shikiCore, configs)
    }

    constructor(protected shikiCore: Highlighter, protected configs: ShikiToCMOptions) {
        this.loadThemes()
    }

    /** 
     * get default theme
     */
    initTheme() {
        const { defaultColor } = this.configs
        if (defaultColor === false) {
            return EditorView.baseTheme({})
        }
        // init current theme
        this.currentTheme = defaultColor || 'light'
        return this.getTheme(this.currentTheme)
    }

    async update(options: Options, view: EditorView) {
        if (options.theme) {
            options.themes = options.themes || {
                ...this.configs.themes,
                light: options.theme,
            }
        }

        const _configs = {
            ...this.configs,
        }
        // THINK: merge or override?
        this.configs = {
            ...this.configs,
            ...options,
        }

        // reload shiki core and apply the theme if related options changed
        if ((JSON.stringify(options.themes) !== JSON.stringify(_configs.themes))
            || (_configs.defaultColor !== options.defaultColor)
            || (_configs.lang !== options.lang)
            || (_configs.langAlias !== options.langAlias)
            || (_configs.warnings !== options.warnings)
        ) {
            this.shikiCore = await initShikiInternal(this.configs)
            window.requestAnimationFrame(() => {
                this.loadThemes()
                view.dispatch({
                    effects: themeCompartment.reconfigure(this.initTheme())
                })
            })
        }
    }

    /**
     * get theme
     *
     * @param {string} name `light\dark\...`
     * @returns {Extension} codemirror theme extension
     * @throws `xxxx theme not registered!`
     */
    getTheme(name: string = this.currentTheme) {
        if (this.themesCache.get(name)) {
            return this.themesCache.get(name)!
        } else {
            throw new Error(`'${name}' theme is not registered!`)
        }
    }

    /**
     * preload all registered themes and create codemirror theme extension
     */
    loadThemes() {
        let { themes, cssVariablePrefix } = this.configs
        Object.keys(themes).forEach((color) => {
            const name = themes[color]
            if (!name) throw new Error(`'${name}' theme is not registered!`);
            // internal handled cached
            const { colors, bg, fg, type } = this.shikiCore.getTheme(name)
            const prefix = cssVariablePrefix + color

            let settings: CreateThemeOptions['settings'] = {
                background: bg,
                foreground: fg,
            }

            if (colors) {
                settings = {
                    ...settings,
                    gutterBackground: bg,
                    gutterForeground: fg,
                    // fontFamily
                    // fontSize
                    // gutterActiveForeground
                    gutterBorder: 'transparent',
                    selection: colors['editor.wordHighlightBackground'] || colors['editor.selectionBackground'],
                    selectionMatch: colors['editor.wordHighlightStrongBackground'] || colors['editor.selectionBackground'],
                    caret: colors['editorCursor.foreground'] || colors['foreground'] || '#FFFFFF',
                    // dropdownBackground: colors['dropdown.background'],
                    // dropdownBorder: colors['dropdown.border'] || colors['foreground'],
                    lineHighlight: colors['editor.lineHighlightBackground'] || '#50505044',
                    // matchingBracket: colors['editorBracketMatch.background'] || colors['editor.lineHighlightBackground'] || colors['editor.selectionBackground'],
                }
            }

            const extension = createTheme({
                theme: type,
                settings,
                classes: {
                    [`& .cm-line span`]: {
                        color: `var(${prefix}) !important`,
                        // backgroundColor: `var(${prefix}-bg) !important`,
                        fontStyle: `var(${prefix}-font-style) !important`,
                        fontWeight: `var(${prefix}-font-weight) !important`,
                        textDecoration: `var(${prefix}-text-decoration) !important`
                    }
                }
            })
            this.themesCache.set(color, extension)
        })
    }
}