import type { Text } from '@codemirror/state'
import type {
    Decoration
} from '@codemirror/view'
import type {
    BundledLanguage, BundledTheme,
    CodeOptionsMultipleThemes,
    ThemeRegistrationAny,
    StringLiteralUnion,
    ShikiInternal,
    SpecialTheme,
    SpecialLanguage,
    LanguageInput,
    TokensResult,
    TokenizeWithThemeOptions
} from './shiki.types'
import type {
    CreateThemeOptions,
    ThemeSettings
} from '@cmshiki/utils'

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
    theme: (SpecialTheme | StringLiteralUnion<BundledTheme> | ThemeRegistrationAny)
}

export type CmSkUpdateOptions = Partial<Options & { theme: StringLiteralUnion<'light' | 'dark'> }>

export type ThemeOptions = {
    /**
     * The theme name defined in the options's themes.
    *
    */
    theme: BaseOptions['theme']
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
    themes?: Partial<Record<string, BaseOptions['theme']>>
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


export interface CMTheme extends CreateThemeOptions {
    theme: string;
    settings: ThemeSettings;
    classes: {
        "& .cm-line span": {
            color: string;
            fontStyle: string;
            fontWeight: string;
            textDecoration: string;
        };
    };
}

export type ShikiToCMOptions = Required<Omit<Options, 'theme' | UnknownOptions>> & Pick<Options, UnknownOptions>

// --------- Worker TYPE  -----
export type Code = {
    id?: number,
    text: Text | string,
    from: number
    to: number
}

export interface MessageEventData extends MessageEvent {
    data: {
        type: "init" | 'update' | 'highlight'
        options?: ShikiToCMOptions
        code?: Code,
        theme?: string
    }
}

export interface ResultData extends Omit<Code, 'text'> {
    type: string | MessageEventData['data']['type']
    data?: {
        registeredIds: Record<string, string>
        allThemes: CMTheme[]
    }
    tokensResult?: TokensResult
}

export interface HighlightParams {
    code: Code,
    postActions: {
        handleStyles: (params: { classes: Record<string, string> }) => void
        buildDeco: (from: number, to: number, mark: Decoration) => void
    }
}

