import {
  type ThemeInput,
  type LanguageInput,
  type RegexEngine,
} from '@shikijs/core';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { Options } from './types/types';
import { syncSharedHighlighter } from './shared-highlighter';
import {
  getRuntimeLanguageLabel,
  normalizeRuntimeLanguages,
} from './language-normalize';
import {
  assertCompatibleHighlighter,
  createCompatibleJavaScriptEngine,
} from './compat';

// Narrow the type to what we need, removing extended properties not in internal options if any
type ShikiOptions = Omit<Options, 'theme' | 'themeStyle'>;

/**
 * Get the appropriate regex engine based on the engine option
 */
function getEngine(
  engineOption: Options['engine'],
  warnings = true,
): RegexEngine | Promise<RegexEngine> {
  if (engineOption === 'javascript') {
    return createCompatibleJavaScriptEngine(warnings);
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
    assertCompatibleHighlighter(
      options.highlighter,
      '@cmshiki/shiki',
      options.warnings,
      options.versionGuard !== false,
    );
    return syncSharedHighlighter(options);
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

      const { bundledThemes } = await import('shiki');
      const loader = bundledThemes[themeName as keyof typeof bundledThemes];
      if (!loader) {
        if (options.resolveTheme) {
          const resolvedTheme = await Promise.resolve(
            options.resolveTheme(themeName),
          );
          if (resolvedTheme) {
            return resolvedTheme;
          }
        }

        if (options.warnings) {
          console.warn(
            `[@cmshiki/shiki] Theme \`${themeName}\` is not bundled and resolveTheme returned empty value.`,
          );
        }
        throw new Error(
          `[@cmshiki/shiki] Theme \`${themeName}\` cannot be loaded.`,
        );
      }
      const m = await loader();
      return m.default;
    }),
  );

  const langsMap = new Map<string, Promise<LanguageInput>>();
  let customLangId = 0;

  async function loadLangs(lang: string | LanguageInput) {
    if (typeof lang !== 'string') {
      const key =
        (lang as any).name ||
        (lang as any).scopeName ||
        `custom-lang-${++customLangId}`;
      if (!langsMap.has(key)) {
        langsMap.set(key, Promise.resolve(lang));
      }
      return langsMap.get(key);
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
      if (options.resolveLanguage) {
        const resolved = await Promise.resolve(options.resolveLanguage(lang));
        const runtimeLanguages = normalizeRuntimeLanguages(resolved).filter(
          (item): item is LanguageInput => typeof item !== 'string',
        );
        if (runtimeLanguages.length > 0) {
          const [firstLanguage] = runtimeLanguages;
          langsMap.set(lang, Promise.resolve(firstLanguage));
          for (const item of runtimeLanguages) {
            const key =
              (item as any).name ||
              (item as any).scopeName ||
              `custom-lang-${++customLangId}`;
            if (!langsMap.has(key)) {
              langsMap.set(key, Promise.resolve(item));
            }
          }
          return Promise.resolve(firstLanguage);
        }
      }

      if (options.warnings) {
        console.warn(
          `[@cmshiki/shiki] Language \`${lang}\` is not bundled and resolveLanguage returned empty value.`,
        );
      }
      return undefined;
    }

    const promise = loader().then((m) => (m.default || m) as LanguageInput);
    langsMap.set(lang, promise);
    return promise;
  }

  if (options.lang) {
    const langs = normalizeRuntimeLanguages(options.lang);
    for (const lang of langs) {
      await loadLangs(lang);
    }
  }

  // Get the appropriate engine
  const engine = await getEngine(options.engine, options.warnings);

  const resolvedLangs = (
    await Promise.all(Array.from(langsMap.values()))
  ).filter(Boolean) as LanguageInput[];

  if (resolvedLangs.length === 0 && options.warnings) {
    console.warn(
      `[@cmshiki/shiki] No runtime language loaded for \`${getRuntimeLanguageLabel(
        options.lang,
      )}\`.`,
    );
  }

  return createHighlighterCore({
    langs: resolvedLangs,
    themes: resolvedThemes,
    langAlias: options.langAlias,
    warnings: options.warnings,
    engine,
  });
}
