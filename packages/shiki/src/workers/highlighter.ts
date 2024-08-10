import { EditorView } from "@codemirror/view"
import {
    type ThemeRegistrationAny,
} from '@shikijs/core'

import type {
    Highlighter,
    CmSkUpdateOptions,
    ShikiToCMOptions,
} from "../types/types"
import {
    type CreateThemeOptions,
} from "@cmshiki/utils"

export class ShikiHighlighter {

    loadThemes() {
        const themeIds = this.highlighter.getLoadedThemes()
        let { themes, cssVariablePrefix, defaultColor } = this.options

        const defaultTheme = themes?.light || (themes && defaultColor) ? themes[defaultColor as string] : null

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

        /**
        * load all themes  
        *
        * @param {string} name `light\dark\...`
        * @returns {Extension} codemirror theme extension
        * @throws `Theme not registered!`
        */
        const loadAllThemes = (color: string) => {
            const themeData = _themes[color]
            const themeName = getThemeName(themeData)
            const prefix = cssVariablePrefix + color
            // internal handled cached
            const { colors, bg, fg } = this.highlighter.getTheme(themeData)

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

            return {
                theme: color,
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
            }
        }

        const allThemes = Object.keys(_themes).map((k) => {
            const name = getThemeName(_themes[k])
            if (!name) throw new Error(`a textmate theme must have a name`);
            registeredIds[name] = themeIds.indexOf(name) > -1 ? k : ''
            return loadAllThemes(k)
        })


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
            allThemes
        }
    }

    constructor(public highlighter: Highlighter, private options: ShikiToCMOptions, public view?: EditorView) {
    }

    // TODO some option cannot be updated
    update(options: CmSkUpdateOptions) {
        this.options = {
            ...this.options,
            ...options
        }
    }
}