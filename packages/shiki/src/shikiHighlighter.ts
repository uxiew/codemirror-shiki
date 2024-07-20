import { Compartment } from "@codemirror/state"
import { Decoration, EditorView } from "@codemirror/view"
import {
    type TokensResult,
    codeToTokens,
    getTokenStyleObject,
    stringifyTokenStyle,
} from "shiki/core"
import {
    type Highlighter,
    type ThemeOptions,
    type CmSHOptions,
    type CmSkUpdateOptions
} from "./types/types"
import { toStyleObject } from "./utils"
import {
    mountStyles, StyleModule,
    createTheme,
    type CreateThemeOptions
} from "@cmshiki/utils"

export const themeCompartment = new Compartment

export class ShikiHighlighter {
    /** Shiki core highlighter */

    private genTokens: (code: string) => TokensResult
    private currentTheme: string = 'light'
    private themeCache = new Map<string, CreateThemeOptions>()

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
    initDefaultTheme() {
        const { getTheme } = this.loadThemes()
        const { defaultColor } = this.options
        if (defaultColor === false) {
            return themeCompartment.of(EditorView.baseTheme({}))
        } else {
            // init current theme
            this.currentTheme = defaultColor
        }
        return themeCompartment.of(createTheme(getTheme(this.currentTheme)))
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
        if (this.currentTheme === name) return
        if (typeof name !== 'string') throw new Error("Theme name must be a string!")
        if (!this.options.themes) return console.warn(`thmes not setting, can change theme!`)

        const { currentThemes, getTheme, registeredThemes } = this.loadThemes()

        // TODO
        // if (registeredThemes.includes(name)) 

        if (!this.options.themes[name] && !currentThemes[name]) return console.warn(`Theme ${name} not found!`)
        name = (currentThemes[name] || this.options.themes[name] && name) as string

        this.view?.dispatch({
            effects: themeCompartment.reconfigure(createTheme(getTheme(name)))
        })

        // update relative option
        this.currentTheme = name
    }

    /**
     * TODO when theme == RawTheme
     */
    loadThemes() {
        const themeIds = this.highlighter.getLoadedThemes()
        let { theme, themes, cssVariablePrefix, defaultColor } = this.options

        const defaultThemeName = theme ? theme : themes?.light || (themes && defaultColor) ? themes[defaultColor as string] : null
        if (defaultThemeName === null) throw new Error("shiki's default theme not found!")
        if (typeof defaultThemeName !== 'string') {
            // TODO defaultThemeName?.settings
            throw new Error("Shiki's TextMate theme Object not currently supported!")
        }

        themes = {
            light: defaultThemeName,
            ...themes
        }
        const themeIndex = themeIds.indexOf(defaultThemeName)
        const themesIds = Object.keys(themes)
        const currentThemes: Record<string, string> = {}

        themesIds.reduce((t, id) => {
            const prefix = cssVariablePrefix + id
            currentThemes[themes[id] as string] = id
            if (this.themeCache.get(id)) {
                t[id] = this.themeCache.get(id)!
                return t
            }

            const theme = this.highlighter.getTheme(themes[id]!)
            t[id] = {
                theme: themes[id]! as string,
                settings: {
                    background: theme.bg,
                    foreground: theme.fg
                },
                classes: {
                    [`& .cm-line span`]: {
                        color: `var(${prefix}) !important`,
                        // backgroundColor: `var(${prefix}-bg) !important`,
                        fontStyle: `var(${prefix}-font-style) !important`,
                        fontWeight: `var(${prefix}-font-weight) !important`,
                        textDecoration: `var(${prefix}-text-decoration) !important`
                    }
                }
            }
            this.themeCache.set(id, t[id])
            return t
        }, {} as Record<string, CreateThemeOptions>)

        return {
            currentThemes,
            registeredThemes: themeIds,
            themesCssVars: themesIds.map((id) => cssVariablePrefix + id),
            defaultThemeId: themeIds[themeIndex],
            getTheme: (name: string): CreateThemeOptions => {
                const cmTheme = this.themeCache.get(name)
                if (cmTheme === null) throw new Error(`${themes[name]} theme not found, check options!`)
                return cmTheme!
            }
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
    highlight(builder: any, text: string, offset: number) {
        const { cssVariablePrefix, defaultColor } = this.options
        const { tokens, fg = '', bg = '', rootStyle = '' } = this.genTokens(text);

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

                cmClasses[style] = cmClasses[style] || StyleModule.newName()

                let from = pos;
                let to = pos + token.content.length;
                builder.add(from, to, Decoration.mark({
                    tagName: 'span',
                    attributes: {
                        [this.isCmStyle ? 'class' : 'style']:
                            this.isCmStyle ? cmClasses[style] : style,
                    },
                }));
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
    }
    /**
    * add highlighting to text
    *
    * @param builder 范围集合构建器，用于添加装饰
    * @param doc 内容
    * @param offset 文本偏移量
    */
    highlight1(text: string, offset: number) {
        const { cssVariablePrefix, defaultColor } = this.options
        const { tokens, fg = '', bg = '', rootStyle = '' } = this.genTokens(text);

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

                console.log("highlight", pos, token.content, offset);


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