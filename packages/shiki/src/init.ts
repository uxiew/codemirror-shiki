import type { Highlighter, Options } from './types/types';
import type { BundledLanguage, StringLiteralUnion } from './types/shiki.types';
import { assertCompatibleHighlighter } from './compat';

/**
 * Narrow the type to what we need, removing extended properties not in internal options if any
 */
type ShikiOptions = Options;

export async function syncSharedHighlighter(
  highlighter: Highlighter,
  lang: string,
  options: ShikiOptions,
) {
  if (!highlighter || !lang) return;

  const results: Promise<any>[] = [];

  if (options.resolveLang) {
    const loadedLangs = highlighter.getLoadedLanguages?.() || [];
    if (!loadedLangs.includes(lang)) {
      results.push(
        Promise.resolve(options.resolveLang(lang)).then(async (toRegister) => {
          if (!toRegister || !highlighter.loadLanguage) {
            return;
          }

          const langs = Array.isArray(toRegister) ? toRegister : [toRegister];
          for (const item of langs) {
            if (typeof item !== 'string') {
              await highlighter.loadLanguage(item);
            }
          }
        }),
      );
    }
  }

  const themes = options.themes || {};
  if (options.resolveTheme) {
    const loadedThemes = highlighter.getLoadedThemes?.() || [];
    for (const themeKey of Object.keys(themes)) {
      const themeVal = themes[themeKey];
      if (
        themeVal &&
        typeof themeVal === 'string' &&
        !loadedThemes.includes(themeVal)
      ) {
        results.push(
          Promise.resolve(options.resolveTheme(themeVal)).then(
            async (themeInput) => {
              if (themeInput && highlighter.loadTheme) {
                await highlighter.loadTheme(themeInput);
              }
            },
          ),
        );
      }
    }
  }

  if (results.length > 0) {
    await Promise.all(results);
  }
}

/**
 * Initialize Shiki highlighter for CodeMirror.
 *
 * This implementation requires a pre-initialized `highlighter` instance.
 * Bundled langs and themes from the `shiki` package are no longer loaded automatically
 * to ensure fine-grained bundling and better performance.
 */
export async function initShiki(options: ShikiOptions) {
  if (!options.highlighter) {
    throw new Error(
      '[@cmshiki/shiki] `highlighter` is required. ' +
        'Create it with `createHighlighterCore` (from shiki/core) and explicit langs/themes to enable fine-grained bundling. ' +
        'See https://shiki.style/guide/best-performance for details.',
    );
  }

  assertCompatibleHighlighter(
    options.highlighter,
    '@cmshiki/shiki',
    options.warnings,
    options.versionGuard !== false,
  );

  if (options.lang) {
    await syncSharedHighlighter(
      options.highlighter,
      options.lang as string,
      options,
    );
  }

  return options.highlighter;
}
