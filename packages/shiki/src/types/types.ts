import type {
  BundledLanguage,
  BundledTheme,
  CodeOptionsMultipleThemes,
  StringLiteralUnion,
  ShikiInternal,
  SpecialLanguage,
  LanguageInput,
  RegexEngine,
  TokenizeWithThemeOptions,
  Awaitable,
  ThemeInput,
} from './shiki.types';

export interface BaseOptions {
  /**
   * The language to use.
   *
   * @example 'javascript'
   */
  lang: LanguageInput | StringLiteralUnion<BundledLanguage> | SpecialLanguage;
  /**
   * Single-theme shorthand.
   *
   * If `themes` is not provided, this value will be mapped to `themes.light`.
   * If `themes` is provided, this field is treated as auxiliary/fallback input
   * and `themes` remains the source of truth.
   */
  theme: StringLiteralUnion<BundledTheme> | ThemeInput;
}

/** Theme registry map: `{ dark: 'github-dark', light: 'github-light', ... }` */
export type ThemeRegistry = Record<string, BaseOptions['theme']>;
/** Theme key union inferred from `themes` */
export type ThemeKey<TThemes extends ThemeRegistry = ThemeRegistry> = Extract<
  keyof TThemes,
  string
>;

/** Regex engine option for Shiki tokenization */
export type EngineOption = 'javascript' | 'oniguruma' | Awaitable<RegexEngine>;

export interface ExtraOptions<TThemes extends ThemeRegistry = ThemeRegistry>
  extends
    Omit<CodeOptionsMultipleThemes, 'themes' | 'defaultColor' | 'engine'>,
    TokenizeWithThemeOptions {
  /**
   * shiki inline style or codemirror class style
   * @default 'cm'
   */
  themeStyle?: 'cm' | 'shiki';
  /**
   * Theme registry used for runtime theme switching.
   *
   * Keys are runtime color aliases (`light`, `dark`, `nord`, ...),
   * values are Shiki theme names or theme objects.
   */
  themes?: TThemes;
}

export type Highlighter = ShikiInternal<never, never>;

export type CmSHOptions<TThemes extends ThemeRegistry = ThemeRegistry> =
  Required<Omit<ShikiToCMOptions<TThemes>, 'theme'>>;

export interface Options<
  TThemes extends ThemeRegistry = ThemeRegistry,
> extends Partial<BaseOptions & ExtraOptions<TThemes>> {
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
  themes?: TThemes;
  /**
   * Initial theme key from `themes`.
   *
   * Common values are `'light'` and `'dark'`, but any key in `themes` works.
   * Set to `false` to disable default theme mounting.
   *
   * @default 'light'
   */
  defaultColor?: ThemeKey<TThemes> | (string & {}) | false;
  /**
   * Alias of languages
   * @example { 'my-lang': 'javascript' }
   */
  langAlias?: Record<string, string>;
  /**
   * Emit console warnings to alert users of potential issues.
   * @default true
   */
  warnings?: boolean;
  /**
   * Regex engine to use for tokenization.
   * - Pass `'javascript'` to use the JavaScript RegExp engine (faster startup, smaller bundle)
   * - Pass `'oniguruma'` to use the Oniguruma engine via WASM (better compatibility, default)
   * - Pass a custom RegexEngine for full control
   * @default 'oniguruma'
   */
  engine?: EngineOption;
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
  highlighter?: Highlighter;
}

type UnknownOptions =
  | 'langAlias'
  | 'engine'
  | 'colorReplacements'
  | 'grammarState'
  | 'grammarContextCode'
  | 'highlighter';

export type ShikiToCMOptions<TThemes extends ThemeRegistry = ThemeRegistry> =
  Required<Omit<Options<TThemes>, 'theme' | UnknownOptions>> &
    Pick<Options<TThemes>, UnknownOptions>;
