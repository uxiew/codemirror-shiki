import { Extension, Compartment, Facet } from "@codemirror/state"
import { Decoration, EditorView } from "@codemirror/view"
import {
    ThemeRegistrationAny,
    type TokensResult,
    codeToTokens,
    getTokenStyleObject,
    stringifyTokenStyle,
} from "shiki/core"
import {
    type Highlighter,
    type ThemeOptions,
    type CmSHOptions,
    type CmSkUpdateOptions,
} from "./types/types"
import { toStyleObject } from "./utils"
import {
    mountStyles, StyleModule,
    createTheme,
    type CreateThemeOptions,
} from "@cmshiki/utils"

export const themeCompartment = new Compartment


export class ShikiHighlighter {
    /** Shiki core highlighter */

    private genTokens: (code: string) => TokensResult
    private themesCache = new Map<string, Extension>()
    private currentTheme = 'light'
    private defaultTheme = EditorView.baseTheme({})

    /** determines whether the theme style of the current option is `cm` or not */
    get isCmStyle() {
        return this.options.themeStyle === 'cm'
    }

    static init(highlighter: Highlighter, options: CmSHOptions, view?: EditorView) {
        return new ShikiHighlighter(highlighter, options, view)
    }

    /** 
     *  default theme extension
     */
    of() {
        const { getTheme } = this.loadThemes()
        const { defaultColor } = this.options
        if (defaultColor === false) {
            return themeCompartment.of(this.defaultTheme)
        }
        // init current theme
        this.currentTheme = defaultColor || 'light'
        return [themeCompartment.of(getTheme(this.currentTheme))]
    }

    /**
     * get the applied theme
     */
    getCurrentTheme() {
        return this.currentTheme
    }

    /**
     * user can change theme by calling this method
     * toggle cmStyle css and className
     * 
     * @param highlighter Shiki highlighter
     */
    setTheme({ theme: name }: ThemeOptions) {
        const { themes } = this.options
        const { getTheme, registeredIds } = this.loadThemes()

        if (this.currentTheme === name || !themes) return
        if (typeof name !== 'string') throw new Error("Theme name must be a string!")

        if (!themes[name] && !registeredIds[name])
            return console.warn(`Theme ${name} not registered!`)

        name = registeredIds[name] || name

        this.view?.dispatch({
            effects: themeCompartment.reconfigure(getTheme(name))
        })

        // update relative option
        this.currentTheme = name
    }

    loadThemes() {
        const themeIds = this.highlighter.getLoadedThemes()
        let { theme, themes, cssVariablePrefix, defaultColor } = this.options

        const defaultTheme = theme ? theme : themes?.light || (themes && defaultColor) ? themes[defaultColor as string] : null
        if (!defaultTheme) throw new Error("shiki's default theme not found!")
        if (typeof defaultTheme !== 'string') {
            // TODO a textmate theme?
            throw new Error("Shiki's TextMate theme Object not currently supported!")
        }

        const _themes: Record<string, string | ThemeRegistrationAny> = {
            light: defaultTheme,
            ...themes
        }

        // const themeIndex = themeIds.indexOf(defaultTheme)
        const registeredIds = themeIds.reduce((n, c) => { n[c] = ''; return n },
            {} as Record<string, string>)

        const getThemeName = (theme: string | ThemeRegistrationAny) => typeof theme === 'string' ? theme : theme.name


        Object.keys(_themes).forEach((k) => {
            const name = getThemeName(_themes[k])
            if (!name) throw new Error(`a textmate theme must have a name`);
            registeredIds[name] = themeIds.indexOf(name) > -1 ? k : ''
        })

        /**
         * 获取主题
         *
         * @param {string} name `light\dark\...`
         * @returns {Extension} codemirror theme extension
         * @throws `Theme not registered!`
         */
        const getTheme = (name: string) => {
            if (!_themes[name]) {
                console.warn(`Theme ${name} is not set!`)
                return this.defaultTheme
            }
            const prefix = cssVariablePrefix + name
            // internal handled cached
            const { colors, bg, fg, } = this.highlighter.getTheme(_themes[name])

            console.log(theme);
            const _name = getThemeName(_themes[name])!;
            if (this.themesCache.get(_name)) {
                return this.themesCache.get(_name)!
            }

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
                    caret: colors['editorCursor.foreground'] || colors['foreground'],
                    // dropdownBackground: colors['dropdown.background'],
                    // dropdownBorder: colors['dropdown.border'] || colors['foreground'],
                    lineHighlight: colors['editor.lineHighlightBackground'] || colors['editor.background'],
                    // matchingBracket: colors['editorBracketMatch.background'] || colors['editor.lineHighlightBackground'] || colors['editor.selectionBackground'],
                }
            }

            const extension = createTheme({
                theme: name,
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
            this.themesCache.set(_name, extension)
            return extension
        }

        return {
            /** 
             * The theme id corresponds to themes name
             * 
             * @example
             *
             * ```ts
             * {
             *  'github-light': light,
             *  ....
             * }
             * ```
             * 
             */
            registeredIds,
            getTheme
        }
    }

    constructor(public highlighter: Highlighter, public options: CmSHOptions, public view?: EditorView) {
        this.loadThemes()
        this.genTokens = (code: string) => {
            try {
                // @ts-expect-error params type redefined.
                return codeToTokens(this.highlighter, code, this.options)
            } catch (error) {
                throw new Error
            }
        }
    }

    /**
    * add highlighting to text
    *
    * @param builder 范围集合构建器，用于添加装饰
    * @param doc 内容
    * @param offset 文本偏移量
    */
    highlight(text: string, offset: number) {
        const { cssVariablePrefix, defaultColor } = this.options
        const { tokens, fg = '', bg = '', rootStyle = '' } = this.genTokens(text);
        console.log("highlight1", this.genTokens(text))

        const decorations: { from: number, to: number, mark: Decoration }[] = []
        // this.themeCache.get
        let cmClasses: Record<string, string> = {};

        let pos = offset;
        tokens.forEach((lines) => {
            lines.forEach((token) => {
                let style = (token.htmlStyle || stringifyTokenStyle(getTokenStyleObject(token)))
                    .replace(/color/g, cssVariablePrefix + defaultColor);

                ['font-style', 'font-weight', 'text-decoration'].forEach((s) => {
                    style = style.replace(new RegExp(`;` + s, 'g'), `;${cssVariablePrefix + defaultColor}-${s}`)
                });

                console.log("highlight1", token);


                cmClasses[style] = cmClasses[style] || StyleModule.newName()

                let to = pos + token.content.length;
                decorations.push({
                    from: pos,
                    to,
                    mark: Decoration.mark({
                        tagName: 'span',
                        attributes: {
                            [this.isCmStyle ? 'class' : 'style']:
                                this.isCmStyle ? cmClasses[style] : style,
                        },
                    })
                })
                pos = to;
            })
            pos++; // 为换行符增加位置
        })

        if (this.isCmStyle) {
            Object.entries(cmClasses).forEach(([k, v]) => {
                mountStyles(this.view!, {
                    [`& .cm-line .${v}`]: toStyleObject(k)
                })
            })
        }

        return { decorations }
    }

    // TODO some option cannot be updated
    update(options: CmSkUpdateOptions) {
        this.options = {
            ...this.options,
            ...options
        }
    }

}