import type {
    BundledLanguage, BundledTheme,
    CodeOptionsMultipleThemes,
    StringLiteralUnion,
    ShikiInternal,
    SpecialLanguage,
    LanguageInput,
    RegexEngine,
    TokenizeWithThemeOptions,
    Awaitable,
    ThemeInput,
} from './shiki.types'

export interface ExtraOptions extends Omit<CodeOptionsMultipleThemes, 'themes'>, TokenizeWithThemeOptions {
    /** 
     * shiki inline style or codemirror class style
     * @default 'cm'
    */
    themeStyle?: 'cm' | 'shiki'
    themes?: Record<string, BaseOptions['theme']>
}

export interface BaseOptions {
    /**
     * The language to use.
     *
     * @example 'javascript'
     */
    lang: (LanguageInput | StringLiteralUnion<BundledLanguage> | SpecialLanguage),
    // theme: (SpecialTheme | StringLiteralUnion<BundledTheme> | ThemeRegistrationAny)
    theme: StringLiteralUnion<BundledTheme> | ThemeInput
}

export type Highlighter = ShikiInternal<never, never>

export type CmSHOptions = Required<Omit<ShikiToCMOptions, 'theme'>>

export interface Options extends Partial<BaseOptions & ExtraOptions> {
    /**
     * A map of color names to themes.
     *
     * `light` and `dark` are required, and arbitrary color names can be added.
     *
     * @example
     * ```ts
     * themes: {
     *   light: 'vitesse-light',
     *   dark: 'vitesse-dark',
     *   soft: 'nord',
     *   // custom colors
     * }
     * ```
     */
    themes?: Record<string, BaseOptions['theme']>
    /**
    * Alias of languages
    * @example { 'my-lang': 'javascript' }
    */
    langAlias?: Record<string, string>
    /**
     * Emit console warnings to alert users of potential issues.
     * @default true
     */
    warnings?: boolean
    /**
     * Regex engine to use for tokenization.
     * - Pass `'javascript'` to use the JavaScript RegExp engine (faster startup, smaller bundle)
     * - Pass `'oniguruma'` to use the Oniguruma engine via WASM (better compatibility, default)
     * - Pass a custom RegexEngine for full control
     * @default 'oniguruma'
     */
    engine?: 'javascript' | 'oniguruma' | Awaitable<RegexEngine>
    /**
     * Pre-initialized Shiki highlighter instance.
     * When provided, the internal initialization is skipped, enabling zero-delay editor creation.
     * 
     * Use this to:
     * - Reuse the same highlighter across multiple editors
     * - Pre-load themes/languages at app startup
     * - Full control over Shiki configuration
     * 
     * @example
     * ```ts
     * import { createHighlighterCore } from 'shiki/core'
     * 
     * const sharedHighlighter = await createHighlighterCore({
     *   themes: [import('@shikijs/themes/github-dark')],
     *   langs: [import('@shikijs/langs/javascript')],
     *   engine: createJavaScriptRegexEngine()
     * })
     * 
     * // Zero-delay creation
     * const editor = await ShikiEditor.create({
     *   highlighter: sharedHighlighter,
     *   ...
     * })
     * ```
     */
    highlighter?: Highlighter
}

type UnknownOptions = 'langAlias'
    | 'engine'
    | 'colorReplacements'
    | 'grammarState'
    | 'grammarContextCode'
    | 'highlighter'

export type ShikiToCMOptions = Required<Omit<Options, 'theme' | UnknownOptions>> & Pick<Options, UnknownOptions>
