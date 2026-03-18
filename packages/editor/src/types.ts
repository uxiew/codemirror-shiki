import type {
  Options as CMShikiOptions,
  ThemeKey as CMShikiThemeKey,
  ThemeRegistry as CMShikiThemeRegistry,
} from '@cmshiki/shiki';
import type { EditorViewConfig, ViewUpdate } from '@codemirror/view';

export type ShikiConfigKeys = keyof CMShikiOptions;
export type CodeMirrorConfigKeys = keyof CMEditorOptions;

export type CMEditorOptions = EditorViewConfig & {
  /** listen view change, doc change, viewport change, other view update */
  onUpdate?: (u: ViewUpdate) => void;
};

export type ThemeRegistry = CMShikiThemeRegistry;
export type ThemeKey<TThemes extends ThemeRegistry = ThemeRegistry> =
  CMShikiThemeKey<TThemes>;

type BaseShikiEditorOptions<TThemes extends ThemeRegistry = ThemeRegistry> =
  Omit<CMShikiOptions<TThemes>, 'theme' | 'themes' | 'defaultColor' | 'engine'>;

/**
 * Unified options for `ShikiEditor`.
 *
 * Recommendation:
 * - Single theme: use `theme`
 * - Theme switching: use `themes + defaultColor`
 * - Avoid passing `theme` and `themes` together
 */
export interface ShikiEditorOptions<
  TThemes extends ThemeRegistry = ThemeRegistry,
>
  extends BaseShikiEditorOptions<TThemes>, CMEditorOptions {
  /**
   * Single-theme shorthand.
   *
   * Use this only when you do not need runtime theme switching.
   */
  theme?: CMShikiOptions<TThemes>['theme'];
  /**
   * Theme registry for runtime switching.
   *
   * Keys are business-side aliases, values are Shiki themes.
   *
   * @example
   * {
   *   light: 'github-light',
   *   dark: 'github-dark',
   *   nord: 'nord'
   * }
   */
  themes?: TThemes;
  /**
   * Initial theme key from `themes`.
   *
   * Important: this is a key in `themes`, not a theme value.
   * Use `'dark'` instead of `'github-dark'` when `themes.dark = 'github-dark'`.
   */
  defaultColor?: CMShikiOptions<TThemes>['defaultColor'];
  /**
   * Regex engine for tokenization.
   *
   * - `'oniguruma'`: default, better compatibility
   * - `'javascript'`: faster startup
   * - custom `RegexEngine` for advanced control
   */
  engine?: CMShikiOptions<TThemes>['engine'];
}
