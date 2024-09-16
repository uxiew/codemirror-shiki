import { TokenizeWithThemeOptions } from '@shikijs/core'
import type {
    BundledLanguage, BundledTheme,
    CodeOptionsMultipleThemes,
    ThemeRegistrationAny,
    StringLiteralUnion,
    ShikiInternal,
    SpecialTheme,
    SpecialLanguage,
    LanguageInput
} from './shiki.types'

export interface ExtraOptions extends CodeOptionsMultipleThemes, TokenizeWithThemeOptions {
    /** 
     * shiki inline style or codemirror class style
     * @default 'cm'
    */
    themeStyle?: 'cm' | 'shiki'
}

export interface BaseOptions {
    /**
     * The language to use.
     *
     * @example 'javascript'
     */
    lang: (LanguageInput | StringLiteralUnion<BundledLanguage> | SpecialLanguage),
    // theme: (SpecialTheme | StringLiteralUnion<BundledTheme> | ThemeRegistrationAny)
    theme: StringLiteralUnion<BundledTheme>
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
}

type UnknownOptions = 'langAlias'
    | 'colorReplacements'
    | 'grammarState'
    | 'grammarContextCode'

export type ShikiToCMOptions = Required<Omit<Options, 'theme' | UnknownOptions>> & Pick<Options, UnknownOptions>
