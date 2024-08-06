import { type ShikiHighlighter } from '../highlighter'
import {
    BundledLanguage, BundledTheme,
    CodeOptionsMultipleThemes,
    ThemeRegistrationAny,
    StringLiteralUnion,
    ShikiInternal,
    CodeToTokensWithThemesOptions,
    SpecialTheme,
    SpecialLanguage,
    CodeToTokensOptions,
    LanguageInput
} from './shiki.types'

export type ExtraOptions = {
    /** 
     * shiki inline style or codemirror class style
     * @default 'cm'
    */
    themeStyle: 'cm' | 'shiki'

    // Sync with shiki Settings
    /**
     * The default theme applied to the code (via inline `color` style).
     * The rest of the themes are applied via CSS variables, and toggled by CSS overrides.
     *
     * For example, if `defaultColor` is `light`, then `light` theme is applied to the code,
     * and the `dark` theme and other custom themes are applied via CSS variables:
     *
     * ```html
     * <span style="color:#{light};--shiki-dark:#{dark};--shiki-custom:#{custom};">code</span>
     * ```
     *
     * When set to `false`, no default styles will be applied, and totally up to users to apply the styles:
     *
     * ```html
     * <span style="--shiki-light:#{light};--shiki-dark:#{dark};--shiki-custom:#{custom};">code</span>
     * ```
     */
    defaultColor: Required<CodeOptionsMultipleThemes>['defaultColor']
    /**
     * Prefix of CSS variables used to store the color of the other theme.
     *
     */
    cssVariablePrefix: Required<CodeOptionsMultipleThemes>['cssVariablePrefix']
} & Partial<Omit<CodeToTokensWithThemesOptions, 'lang'>>

export interface BaseOptions {
    lang: (LanguageInput | StringLiteralUnion<BundledLanguage> | SpecialLanguage),
    theme?: (SpecialTheme | StringLiteralUnion<BundledTheme> | ThemeRegistrationAny)
}

type Options<L extends string = string, T extends string = string> = Omit<CodeToTokensOptions<L, T>, 'lang' | 'theme'> & BaseOptions

export type CmSkOptions<Languages extends string = string, Themes extends string = string> = Omit<Options<Languages, Themes>, 'includeExplanation'> & Partial<ExtraOptions>

export type CmSHOptions<Languages extends string = string, Themes extends string = string> = Options<Languages, Themes> & ExtraOptions

// export type CmSkUpdateOptions = Partial<CodeToTokensOptions & Partial<Omit<ExtraOptions, 'themeStyle'>>>
/** 
 * current only support `lang`、`themeId` to update options
 */
export type CmSkUpdateOptions = Partial<BaseOptions & { theme: string }>

export type ThemeOptions = {
    /**
     * The theme name defined in the options's themes.
     *
     */
    theme: BaseOptions['theme']
}

export type Highlighter = ShikiInternal<any, any>
