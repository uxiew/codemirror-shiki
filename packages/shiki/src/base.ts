import { EditorView } from '@codemirror/view';
import {
  combineConfig,
  Compartment,
  Facet,
  type Extension,
} from '@codemirror/state';
import { createTheme, type CreateThemeOptions } from '@cmshiki/utils';
import type {
  BaseOptions,
  Highlighter,
  Options,
  ShikiToCMOptions,
} from './types/types';
import type { StringLiteralUnion } from './types/shiki.types';
import { initShiki } from './init';

export const themeCompartment = new Compartment();

type ThemeName = BaseOptions['theme'] | StringLiteralUnion<'light' | 'dark'>;

export const configsFacet = Facet.define<ShikiToCMOptions, ShikiToCMOptions>({
  combine: (values) =>
    combineConfig(
      values,
      {},
      {
        themeStyle: (f, s) => s,
      },
    ),
});

export class Base {
  protected themesCache = new Map<ThemeName, Extension>();
  protected currentTheme = 'light';

  /** determines whether the theme style of the current option is `cm` or not */
  get isCmStyle() {
    return this.configs.themeStyle === 'cm';
  }

  static init(shikiCore: Highlighter, configs: ShikiToCMOptions) {
    return new Base(shikiCore, configs);
  }

  constructor(
    protected shikiCore: Highlighter,
    protected configs: ShikiToCMOptions,
  ) {
    this.loadThemes();
  }

  /**
   * get default theme
   */
  initTheme() {
    const { defaultColor } = this.configs;
    if (defaultColor === false) {
      return EditorView.baseTheme({});
    }
    // init current theme
    this.currentTheme = defaultColor || 'light';
    return this.getTheme(this.currentTheme);
  }

  async update(options: Options, view: any) {
    if (options.theme) {
      options.themes = options.themes || {
        ...this.configs.themes,
        light: options.theme,
      };
    }

    const _configs = {
      ...this.configs,
    };
    // THINK: merge or override?
    this.configs = {
      ...this.configs,
      ...options,
    };

    // reload shiki core only when the caller explicitly changes related options
    const shouldReload =
      (options.themes !== undefined &&
        JSON.stringify(options.themes) !== JSON.stringify(_configs.themes)) ||
      (options.defaultColor !== undefined &&
        _configs.defaultColor !== options.defaultColor) ||
      (options.lang !== undefined && _configs.lang !== options.lang) ||
      (options.langAlias !== undefined &&
        JSON.stringify(_configs.langAlias) !==
          JSON.stringify(options.langAlias)) ||
      (options.engine !== undefined && _configs.engine !== options.engine) ||
      (options.warnings !== undefined &&
        _configs.warnings !== options.warnings);

    if (shouldReload) {
      this.shikiCore = await initShiki(this.configs);
      window.requestAnimationFrame(() => {
        this.loadThemes();
        view.dispatch({
          effects: themeCompartment.reconfigure(this.initTheme()),
        });
      });
    }
  }

  /**
   * get theme
   *
   * @param {string} name `light\dark\...`
   * @returns {Extension} codemirror theme extension
   * @throws `xxxx theme not registered!`
   */
  getTheme(name: string = this.currentTheme) {
    if (this.themesCache.get(name)) {
      // Keep highlighter theme alias in sync with runtime theme switching.
      this.currentTheme = name as any;
      return this.themesCache.get(name)!;
    } else {
      throw new Error(`'${name}' theme is not registered!`);
    }
  }

  /**
   * preload all registered themes and create codemirror theme extension
   */
  loadThemes() {
    let { themes } = this.configs;
    Object.keys(themes).forEach((color) => {
      const name = themes[color];
      if (!name) throw new Error(`'${name}' theme is not registered!`);
      // internal handled cached
      const { colors, bg, fg, type } = this.shikiCore.getTheme(name as any);
      let settings: CreateThemeOptions['settings'] = {
        background: bg,
        foreground: fg,
      };

      if (colors) {
        // Get selection color with fallbacks, prioritize selectionBackground
        // Provide visible defaults for dark/light themes to avoid transparent colors
        const defaultSelection =
          type === 'dark'
            ? '#264f78' // VSCode dark theme selection blue
            : '#add6ff'; // VSCode light theme selection blue
        const selectionColor =
          colors['editor.selectionBackground'] ||
          colors['editor.wordHighlightBackground'] ||
          defaultSelection;

        settings = {
          ...settings,
          gutterBackground: bg,
          gutterForeground: fg,
          // fontFamily
          // fontSize
          // gutterActiveForeground
          gutterBorder: 'transparent',
          selection: selectionColor,
          selectionMatch:
            colors['editor.wordHighlightStrongBackground'] ||
            colors['editor.selectionHighlightBackground'] ||
            selectionColor,
          caret:
            colors['editorCursor.foreground'] ||
            colors['foreground'] ||
            '#FFFFFF',
          // dropdownBackground: colors['dropdown.background'],
          // dropdownBorder: colors['dropdown.border'] || colors['foreground'],
          lineHighlight:
            colors['editor.lineHighlightBackground'] ||
            (type === 'dark' ? '#ffffff0a' : '#0000000a'),
          // matchingBracket: colors['editorBracketMatch.background'] || colors['editor.lineHighlightBackground'] || colors['editor.selectionBackground'],
        };
      }

      // In `cm` mode, token colors/styles are provided by per-token classes
      // from ShikiHighlighter. Avoid broad `.cm-line span` rules here to
      // prevent theme-switch overrides that flatten token contrast.
      const classes = undefined;

      const extension = createTheme({
        theme: type,
        settings,
        classes,
      });
      this.themesCache.set(color, extension);
    });
  }
}
