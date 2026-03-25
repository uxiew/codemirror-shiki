import { EditorView } from '@codemirror/view';
import { Compartment, Extension } from '@codemirror/state';
import {
  type Options as CoreOptions,
  type Options,
  type ThemeKey,
  type ThemeRegistry,
  shikiToCodeMirror,
  themeCompartment,
  updateEffect,
} from '@cmshiki/shiki/core';
import type { CMEditorOptions, ShikiEditorOptions } from './types';
import { partitionOptions } from './utils';

export {
  createCachedLanguageResolver,
  createCachedThemeResolver,
  createSharedHighlighterManager,
} from '@cmshiki/shiki/core';

const shikiComp = new Compartment();

type CoreBaseEditorOptions<TThemes extends ThemeRegistry = ThemeRegistry> =
  Omit<CoreOptions<TThemes>, 'theme' | 'themes' | 'defaultColor' | 'engine'>;

interface CoreShikiEditorOptions<TThemes extends ThemeRegistry = ThemeRegistry>
  extends CoreBaseEditorOptions<TThemes>, CMEditorOptions {
  theme?: CoreOptions<TThemes>['theme'];
  themes?: TThemes;
  defaultColor?: CoreOptions<TThemes>['defaultColor'];
  engine?: CoreOptions<TThemes>['engine'];
}

interface PreloadedShiki {
  shiki: Extension;
  getTheme: (name?: string, view?: EditorView) => Extension;
}

function resolveInitialThemeKey(
  options: CoreShikiEditorOptions,
): string | undefined {
  if (options.defaultColor === false) return undefined;

  const themes = options.themes;
  if (!themes) {
    return typeof options.theme === 'string' ? options.theme : undefined;
  }

  if (
    typeof options.defaultColor === 'string' &&
    themes[options.defaultColor]
  ) {
    return options.defaultColor;
  }

  if (themes.dark) return 'dark';
  if (themes.light) return 'light';
  return Object.keys(themes)[0];
}

export class ShikiEditor<TThemes extends ThemeRegistry = ThemeRegistry> {
  view: EditorView;
  getTheme: Promise<(name?: string, view?: EditorView) => Extension>;

  /**
   * 静态工厂方法 - 推荐使用，无闪烁
   * 先异步加载 Shiki，然后创建带有完整高亮的编辑器
   *
   * @example
   * const editor = await ShikiEditor.create({
   *   parent: document.getElementById('editor'),
   *   doc: 'const x = 1',
   *   lang: 'javascript',
   *   themes: {
   *     light: 'github-light',
   *     dark: 'github-dark',
   *   },
   *   defaultColor: 'dark',
   *   engine: 'javascript',
   * })
   */
  static async create<TThemes extends ThemeRegistry = ThemeRegistry>(
    options: CoreShikiEditorOptions<TThemes>,
  ): Promise<ShikiEditor<TThemes>> {
    const { shikiOptions } = partitionOptions(
      options as ShikiEditorOptions<TThemes>,
    );

    // 1. 先异步加载 Shiki
    const { shiki, getTheme } = await shikiToCodeMirror(shikiOptions);

    // 2. 创建时直接包含高亮扩展
    const editor = new ShikiEditor<TThemes>(options, { shiki, getTheme });
    const initialThemeKey = resolveInitialThemeKey(options);

    // Ensure the first rendered frame uses the expected runtime theme key.
    if (initialThemeKey) {
      await editor.changeTheme(initialThemeKey);
    }

    return editor;
  }

  /**
   * 构造函数
   *
   * @param options - 编辑器选项
   * @param preloaded - 内部使用，预加载的 Shiki 数据
   */
  constructor(
    private readonly options: CoreShikiEditorOptions<TThemes>,
    preloaded?: PreloadedShiki,
  ) {
    const { shikiOptions, CodeMirrorOptions: cmOptions } = partitionOptions(
      options as ShikiEditorOptions<TThemes>,
    );

    if (preloaded) {
      // 使用预加载的 Shiki（来自 create() 静态方法）
      const extensions = [
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const callback = options.onDocChanged;
            callback?.(u);
          }
        }),
        preloaded.shiki,
      ];

      this.view = new EditorView({
        ...cmOptions,
        extensions: Array.isArray(cmOptions.extensions)
          ? [...cmOptions.extensions, shikiComp.of(extensions)]
          : shikiComp.of(extensions),
      });

      this.getTheme = Promise.resolve(preloaded.getTheme);
    } else {
      // 兼容旧的同步构造方式（会有闪烁）
      this.view = new EditorView({
        ...cmOptions,
        extensions: Array.isArray(cmOptions.extensions)
          ? cmOptions.extensions.concat(shikiComp.of([]))
          : undefined,
      });

      this.getTheme = this.registerInternal(shikiOptions).then(
        ({ getTheme, extensions }) => {
          this.view.dispatch({
            effects: shikiComp.reconfigure(extensions),
          });
          return getTheme;
        },
      );
    }
  }

  private async registerInternal(options: CoreShikiEditorOptions<TThemes>) {
    const { shiki, getTheme } = await shikiToCodeMirror(options);
    return {
      getTheme,
      extensions: [
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const callback = options.onDocChanged;
            callback?.(u);
          }
        }),
        shiki,
      ],
    };
  }

  /**
   * Dynamically set listening events,listen when the document changed.
   * @param {(u: ViewUpdate)}
   */
  onDocChanged(callback: CoreShikiEditorOptions<TThemes>['onDocChanged']) {
    this.options.onDocChanged = callback;
  }

  /**
   * Destroy the editor
   */
  destroy() {
    this.view.destroy();
  }

  update(options: Options) {
    this.view.dispatch({
      effects: updateEffect.of(options),
    });
  }

  /**
   * change theme
   *
   * @param {string} name - theme style name,like `light`、`dark`、`dim`
   */
  async changeTheme(name: ThemeKey<TThemes> | (string & {})) {
    const theme = (await this.getTheme)(name, this.view);
    this.view.dispatch({
      effects: [themeCompartment.reconfigure(theme), updateEffect.of({})],
    });
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(newCode: string) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: newCode },
    });
  }
}
