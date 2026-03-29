import type {
  BundledLanguage,
  BundledTheme,
  CodeOptionsMultipleThemes,
  StringLiteralUnion,
  SpecialLanguage,
  LanguageInput,
  TokenizeWithThemeOptions,
  ThemeInput,
} from './shiki.types';
import type { LangResolver, ThemeResolver } from '../resolvers';
export type InitShikiFn = (
  options: Omit<Options, 'theme' | 'themeStyle'>,
) => Promise<Highlighter>;
/**
 * A compatibility-first Shiki highlighter shape.
 *
 * We intentionally avoid binding to a single `@shikijs/types` instance,
 * otherwise monorepos with mixed Shiki subpackages can hit nominal mismatch
 * errors during type-checking.
 */
export interface Highlighter {
  getLanguage: (...args: any[]) => any;
  getTheme: (...args: any[]) => any;
  setTheme: (...args: any[]) => any;
  loadLanguage?: (...args: any[]) => any;
  loadTheme?: (...args: any[]) => any;
  getLoadedLanguages?: (...args: any[]) => string[];
  getLoadedThemes?: (...args: any[]) => string[];
  [key: string]: any;
}

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

export type CmSHOptions<TThemes extends ThemeRegistry = ThemeRegistry> =
  Required<Omit<ShikiToCMOptions<TThemes>, 'theme'>>;

export interface Options<
  TThemes extends ThemeRegistry = ThemeRegistry,
> extends Partial<Omit<BaseOptions, 'lang' | 'theme'> & ExtraOptions<TThemes>> {
  theme?: BaseOptions['theme'];
  /**
   * Language resolver function specifically for lazy-loading.
   *
   * It is highly recommended to provide this so `codemirror-shiki` can
   * automatically resolve and inject missing languages when the editor's
   * language is switched dynamically via `updateEffect.of({ lang: 'xxx' })`.
   *
   * Usually created via `createLangResolver`.
   */
  resolveLang?: LangResolver<any>;
  /**
   * Theme resolver function specifically for lazy-loading.
   *
   * Highly recommended when themes are expected to switch dynamically.
   * Automatically triggered when missing themes are requested.
   *
   * Usually created via `createThemeResolver`.
   */
  resolveTheme?: ThemeResolver<any>;
  /**
   * Active language for highlighting.
   *
   * This follows Shiki's normal language input contract.
   *
   * Array/module forms are normalized internally, so callers usually only need
   * a language name or a single Shiki language object.
   */
  lang?: BaseOptions['lang'];
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
  /**
   * Runtime compatibility guard for external shared highlighter instances.
   *
   * When enabled, incompatible highlighter objects will fail fast with
   * actionable errors (for example, wrong Shiki major version or invalid object).
   *
   * @default true
   */
  versionGuard?: boolean;
}

type UnknownOptions =
  | 'langAlias'
  | 'colorReplacements'
  | 'grammarState'
  | 'grammarContextCode'
  | 'highlighter'
  | 'versionGuard';

export type ShikiToCMOptions<TThemes extends ThemeRegistry = ThemeRegistry> =
  Required<Omit<Options<TThemes>, 'theme' | UnknownOptions>> &
    Pick<Options<TThemes>, UnknownOptions>;
