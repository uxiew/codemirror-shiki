import {
  type ThemeInput,
  type LanguageInput,
  type RegexEngine,
} from '@shikijs/core';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { Options } from './types/types';

// Narrow the type to what we need, removing extended properties not in internal options if any
type ShikiOptions = Omit<Options, 'theme' | 'themeStyle'>;

/**
 * Get the appropriate regex engine based on the engine option
 */
function getEngine(
  engineOption: Options['engine'],
): RegexEngine | Promise<RegexEngine> {
  if (engineOption === 'javascript') {
    return createJavaScriptRegexEngine();
  }
  if (engineOption === 'oniguruma' || !engineOption) {
    return createOnigurumaEngine(import('shiki/wasm'));
  }
  // User provided a custom engine
  return engineOption;
}

export async function initShiki(options: ShikiOptions) {
  // If user provides a pre-initialized highlighter, use it directly (zero delay)
  if (options.highlighter) {
    const highlighter = options.highlighter as any;
    const tasks: Promise<unknown>[] = [];

    // For shared highlighter instances, eagerly load runtime lang/theme updates.
    if (options.lang && typeof highlighter.loadLanguage === 'function') {
      tasks.push(
        Promise.resolve(highlighter.loadLanguage(options.lang)).catch(
          (error) => {
            if (options.warnings) {
              console.warn(
                `[@cmshiki/shiki] Failed to load language on shared highlighter: ${String(options.lang)}`,
                error,
              );
            }
          },
        ),
      );
    }

    if (options.themes && typeof highlighter.loadTheme === 'function') {
      for (const themeValue of Object.values(options.themes)) {
        tasks.push(
          Promise.resolve(highlighter.loadTheme(themeValue as any)).catch(
            (error) => {
              if (options.warnings) {
                console.warn(
                  `[@cmshiki/shiki] Failed to load theme on shared highlighter: ${String(
                    typeof themeValue === 'string'
                      ? themeValue
                      : (themeValue as any)?.name || 'custom-theme',
                  )}`,
                  error,
                );
              }
            },
          ),
        );
      }
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }

    return highlighter;
  }

  if (!options.themes || Object.keys(options.themes).length === 0) {
    throw new Error(
      '[@cmshiki/shiki]' + 'Invalid options, `themes` must be provided',
    );
  }

  const themeNames = Object.values(options.themes);
  const resolvedThemes: ThemeInput[] = await Promise.all(
    themeNames.map(async (themeName) => {
      if (typeof themeName !== 'string') return themeName;

      // Dynamic import to avoid bundling all themes by default
      console.log('[@cmshiki/shiki] Loading theme:', themeName);
      const { bundledThemes } = await import('shiki');
      const loader = bundledThemes[themeName as keyof typeof bundledThemes];
      if (!loader) {
        console.error(
          `[@cmshiki/shiki] Theme \`${themeName}\` not found in bundledThemes`,
        );
        throw new Error(
          `[@cmshiki/shiki] Theme \`${themeName}\` is not bundled in shiki. Make sure it is a valid theme name.`,
        );
      }
      const m = await loader();
      console.log('[@cmshiki/shiki] Theme loaded:', themeName);
      return m.default;
    }),
  );

  const langsMap = new Map<string, LanguageInput>();

  async function loadLangs(lang: string | LanguageInput) {
    if (typeof lang !== 'string') {
      return Promise.resolve(lang);
    }

    if (langsMap.has(lang)) return langsMap.get(lang);

    // Dynamic import to avoid bundling all languages by default
    const { bundledLanguages } = await import('shiki');

    const candidates = Array.from(new Set([lang, lang.toLowerCase()]));
    let loader: (() => Promise<any>) | undefined;
    for (const name of candidates) {
      const maybeLoader =
        bundledLanguages[name as keyof typeof bundledLanguages];
      if (maybeLoader) {
        loader = maybeLoader;
        break;
      }
    }
    if (!loader) {
      console.warn(
        `[@cmshiki/shiki] Language \`${lang}\` is not bundled in shiki.`,
      );
      return undefined;
    }

    const promise = loader().then((m) => m.default || m);
    langsMap.set(lang, promise);
    return promise;
  }

  if (options.lang) {
    await loadLangs(options.lang);
  }

  // Get the appropriate engine
  const engine = await getEngine(options.engine);

  return createHighlighterCore({
    langs: await Promise.all(Array.from(langsMap.values())),
    themes: resolvedThemes,
    langAlias: options.langAlias,
    warnings: options.warnings,
    engine,
  });
}
