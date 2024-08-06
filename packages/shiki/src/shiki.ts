import {
    applyColorReplacements,
    getTokenStyleObject,
    resolveColorReplacements, splitLines,
    stringifyTokenStyle,
    type ThemedTokenWithVariants,
    type ThemedToken,
    codeToTokens
} from "@shikijs/core"
import { StackElementMetadata, StateStack } from "@shikijs/core/textmate"
import {
    type CmSHOptions,
    type Highlighter,
} from "./types/types"


interface Options {
    theme: any
    themes: any
    tokenizeMaxLineLength: any
    tokenizeTimeLimit: any
}

type Theme = { color: string, theme: Required<CmSHOptions>['theme'] }

/**
 * Break tokens from multiple themes into same tokenization.
 *
 * For example, given two themes that tokenize `console.log("hello")` as:
 *
 * - `console . log (" hello ")` (6 tokens)
 * - `console .log ( "hello" )` (5 tokens)
 *
 * This function will return:
 *
 * - `console . log ( " hello " )` (8 tokens)
 * - `console . log ( " hello " )` (8 tokens)
 */
export function syncThemesTokenization(...themes: ThemedToken[][][]) {
    const outThemes = themes.map<ThemedToken[][]>(() => [])
    const count = themes.length

    for (let i = 0; i < themes[0].length; i++) {
        const lines = themes.map(t => t[i])

        const outLines = outThemes.map<ThemedToken[]>(() => [])
        outThemes.forEach((t, i) => t.push(outLines[i]))

        const indexes = lines.map(() => 0)
        const current = lines.map(l => l[0])

        while (current.every(t => t)) {
            const minLength = Math.min(...current.map(t => t.content.length))

            for (let n = 0; n < count; n++) {
                const token = current[n]
                if (token.content.length === minLength) {
                    outLines[n].push(token)
                    indexes[n] += 1
                    current[n] = lines[n][indexes[n]]
                }
                else {
                    outLines[n].push({
                        ...token,
                        content: token.content.slice(0, minLength),
                    })
                    current[n] = {
                        ...token,
                        content: token.content.slice(minLength),
                        offset: token.offset + minLength,
                    }
                }
            }
        }
    }

    return outThemes
}

function mergeToken(
    merged: ThemedTokenWithVariants,
    variantsOrder: string[],
    cssVariablePrefix: string,
    defaultColor: string | boolean,
) {
    const token: ThemedToken = {
        content: merged.content,
        explanation: merged.explanation,
        offset: merged.offset,
    }

    const styles = variantsOrder.map(t => getTokenStyleObject(merged.variants[t]))

    // Get all style keys, for themes that missing some style, we put `inherit` to override as needed
    const styleKeys = new Set(styles.flatMap(t => Object.keys(t)))
    const mergedStyles = styles.reduce((acc, cur, idx) => {
        for (const key of styleKeys) {
            const value = cur[key] || 'inherit'

            if (idx === 0 && defaultColor) {
                acc[key] = value
            }
            else {
                const keyName = key === 'color' ? '' : key === 'background-color' ? '-bg' : `-${key}`
                const varKey = cssVariablePrefix + variantsOrder[idx] + (key === 'color' ? '' : keyName)
                if (acc[key])
                    acc[key] += `;${varKey}:${value}`
                else
                    acc[key] = `${varKey}:${value}`
            }
        }
        return acc
    }, {} as Record<string, string>)

    token.htmlStyle = defaultColor
        ? stringifyTokenStyle(mergedStyles)
        : Object.values(mergedStyles).join(';')
    return token
}



/**
 *  most of the source code comes from 
 *  [`@shiki/core`](https://github.com/shikijs/shiki/tree/main/packages/core)
 */
class ShikiTokenizer {
    ruleStack: StateStack | null = null

    private themeData: Theme = { color: 'light', theme: 'none' }

    constructor(private highlighter: Highlighter, private options: CmSHOptions) {
        this.initTheme()
    }

    setTheme(theme: Theme['theme']) {
        this.themeData = { color: 'light', theme: theme }
    }

    private initTheme() {
        this.themeData = this.getThemes()[0]
    }

    private getThemes() {
        let themes: Theme[] = []
        const { theme, themes: athemes, defaultColor } = this.options
        if (theme) {
            themes = [{ color: 'light', theme }]
        }
        if (athemes) {
            themes = Object.entries(athemes)
                .filter(i => i[1])
                .map(i => ({ color: i[0], theme: i[1]! }))
                .sort((a, b) => a.color === defaultColor ? -1 : b.color === defaultColor ? 1 : 0)
        }

        if (defaultColor && !themes.find(t => t.color === defaultColor))
            throw new Error('[@cmshiki/shiki] ' + `\`themes\` option must contain the defaultColor key \`${defaultColor}\``)

        if (themes.length === 0) {
            throw new Error('[@cmshiki/shiki] ' + 'Invalid options, either `theme` or `themes` must be provided')
        }
        return themes
    }

    codeToTokens(code: string) {
        // return codeToTokens(this.highlighter, code, this.options)

        let bg: string
        let fg: string
        let tokens: ThemedToken[][]
        let themeName: string
        let rootStyle: string | undefined
        const {
            defaultColor = 'light',
            cssVariablePrefix = '--shiki-',
        } = this.options

        const themes = this.getThemes()

        const themeRegs = themes.map(t => this.highlighter.getTheme(t.theme))
        const themesOrder = themes.map(t => t.color)
        tokens = this.tokenizeWithThemes(code, themes)
            .map(line => line.map(token => mergeToken(token, themesOrder, cssVariablePrefix, defaultColor)))

        const themeColorReplacements = themes.map(t => resolveColorReplacements(t.theme, this.options))

        fg = themes.map((t, idx) => (idx === 0 && defaultColor
            ? ''
            : `${cssVariablePrefix + t.color}:`) + (applyColorReplacements(themeRegs[idx].fg, themeColorReplacements[idx]) || 'inherit')).join(';')
        bg = themes.map((t, idx) => (idx === 0 && defaultColor
            ? ''
            : `${cssVariablePrefix + t.color}-bg:`) + (applyColorReplacements(themeRegs[idx].bg, themeColorReplacements[idx]) || 'inherit')).join(';')
        themeName = `shiki-themes ${themeRegs.map(t => t.name).join(' ')}`
        rootStyle = defaultColor ? undefined : [fg, bg].join(';')

        return {
            tokens,
            fg,
            bg,
            themeName,
            rootStyle,
        }
    }

    private tokenizeWithThemes(code: string, themes: Theme[]) {
        const tokens = syncThemesTokenization(
            ...themes.map(t => this._baseTokenize(code, t.theme)),
        )

        const mergedTokens: ThemedTokenWithVariants[][] = tokens[0]
            .map((line, lineIdx) => line
                .map((_token, tokenIdx) => {
                    const mergedToken: ThemedTokenWithVariants = {
                        content: _token.content,
                        variants: {},
                        offset: _token.offset,
                    }

                    tokens.forEach((t, themeIdx) => {
                        const {
                            content: _,
                            explanation: __,
                            offset: ___,
                            ...styles
                        } = t[lineIdx][tokenIdx]

                        mergedToken.variants[themes[themeIdx].color] = styles
                    })

                    return mergedToken
                }),
            )
        return mergedTokens
    }
    private _baseTokenize(code: string, themeData: Theme['theme']) {
        let actual: ThemedToken[] = [], tokens: ThemedToken[][] = []
        const {
            tokenizeMaxLineLength = 0,
            tokenizeTimeLimit = 500,
        } = this.options
        const grammar = this.highlighter.getLanguage(this.options.lang as string)

        const { theme, colorMap } = this.highlighter.setTheme(themeData)
        const colorReplacements = resolveColorReplacements(theme, this.options)

        const lines = splitLines(code)

        for (let i = 0, len = lines.length; i < len; i++) {
            const [line, lineOffset] = lines[i]
            if (line === '') {
                actual = []
                tokens.push([])
                continue
            }
            // Do not attempt to tokenize if the line length is longer than the `tokenizationMaxLineLength`
            if (tokenizeMaxLineLength > 0 && line.length >= tokenizeMaxLineLength) {
                actual = []
                tokens.push([])
                continue
            }

            const result = grammar.tokenizeLine2(line, this.ruleStack, tokenizeTimeLimit)

            if (result.stoppedEarly)
                console.warn('[@cmshiki/shiki] ' + `Time limit reached when tokenizing line: ${line.substring(0, 100)}...`)

            const tokensLength = result.tokens.length / 2
            for (let j = 0; j < tokensLength; j++) {
                const startIndex = result.tokens[2 * j]
                const nextStartIndex = j + 1 < tokensLength ? result.tokens[2 * j + 2] : line.length
                if (startIndex === nextStartIndex)
                    continue

                const metadata = result.tokens[2 * j + 1]
                const token: ThemedToken = {
                    content: line.substring(startIndex, nextStartIndex),
                    offset: lineOffset + startIndex,
                    color: applyColorReplacements(
                        colorMap[StackElementMetadata.getForeground(metadata)],
                        colorReplacements,
                    ),
                    fontStyle: StackElementMetadata.getFontStyle(metadata),
                }

                actual.push(token)
            }
            tokens.push(actual)
            actual = []
            this.ruleStack = result.ruleStack;
        }

        return tokens
    }

}

export {
    ShikiTokenizer
}