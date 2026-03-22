import type { LanguageInput, ThemeInput, Awaitable } from './types/shiki.types';
import { normalizeRuntimeLanguages } from './language-normalize';
import type { RegexEngine, ShikiInternal } from './types/shiki.types';
import { createHighlighterCore } from 'shiki/core';
import { createCompatibleJavaScriptEngine } from './compat';

type MaybeDefault<T> = T | { default: T };

export type LanguageLoader = () => Awaitable<
  MaybeDefault<LanguageInput | ReadonlyArray<LanguageInput>>
>;

export type ThemeLoader = () => Awaitable<MaybeDefault<ThemeInput>>;

export type RuntimeEngineOption = 'javascript' | Awaitable<RegexEngine>;

function unwrapModuleDefault<T>(value: MaybeDefault<T>): T {
  if (
    value &&
    typeof value === 'object' &&
    'default' in (value as any) &&
    (value as any).default !== undefined
  ) {
    return (value as any).default as T;
  }
  return value as T;
}

/**
 * Create a cached language resolver from dynamic import loaders.
 *
 * @example
 * const resolveLanguage = createCachedLanguageResolver({
 *   javascript: () => import('@shikijs/langs/javascript'),
 *   json: () => import('@shikijs/langs/json'),
 * })
 */
export function createCachedLanguageResolver(
  loaders: Record<string, LanguageLoader>,
) {
  const cache = new Map<string, Promise<LanguageInput[]>>();

  return async (lang: string) => {
    const key = String(lang || '').toLowerCase();
    if (!key) return undefined;

    const loader = loaders[key];
    if (!loader) return undefined;

    if (!cache.has(key)) {
      cache.set(
        key,
        Promise.resolve(loader()).then((loaded) => {
          const unwrapped = unwrapModuleDefault(loaded as any);
          return normalizeRuntimeLanguages(unwrapped as any).filter(
            (item): item is LanguageInput => typeof item !== 'string',
          );
        }),
      );
    }

    return cache.get(key);
  };
}

/**
 * Create a cached theme resolver from dynamic import loaders.
 *
 * @example
 * const resolveTheme = createCachedThemeResolver({
 *   'github-dark': () => import('@shikijs/themes/github-dark'),
 *   'github-light': () => import('@shikijs/themes/github-light'),
 * })
 */
export function createCachedThemeResolver(
  loaders: Record<string, ThemeLoader>,
) {
  const cache = new Map<string, Promise<ThemeInput>>();

  return async (theme: string) => {
    const key = String(theme || '').toLowerCase();
    if (!key) return undefined;

    const loader = loaders[key];
    if (!loader) return undefined;

    if (!cache.has(key)) {
      cache.set(
        key,
        Promise.resolve(loader()).then((loaded) =>
          unwrapModuleDefault(loaded as any),
        ),
      );
    }

    return cache.get(key);
  };
}

export interface SharedHighlighterManagerOptions<
  LangKey extends string = string,
  ThemeKey extends string = string,
> {
  languageLoaders: Record<LangKey, LanguageLoader>;
  themeLoaders: Record<ThemeKey, ThemeLoader>;
  preloadLanguage?: LangKey;
  preloadThemes: readonly ThemeKey[];
  langAlias?: Record<string, string>;
  engine?: RuntimeEngineOption;
  warnings?: boolean;
}

export interface SharedHighlighterManager {
  getHighlighter: () => Promise<ShikiInternal<never, never>>;
  resolveLanguage: ReturnType<typeof createCachedLanguageResolver>;
  resolveTheme: ReturnType<typeof createCachedThemeResolver>;
}

async function resolveEngine(
  engineOption: RuntimeEngineOption | undefined,
  warnings: boolean,
): Promise<RegexEngine> {
  if (engineOption === 'javascript' || engineOption == null) {
    return createCompatibleJavaScriptEngine(warnings);
  }
  return Promise.resolve(engineOption);
}

/**
 * Create a shared highlighter manager for fine-grained bundling.
 *
 * It encapsulates:
 * - cached language/theme resolvers
 * - one shared highlighter promise (`getHighlighter`)
 * - runtime-compatible engine resolution
 */
export function createSharedHighlighterManager<
  LangKey extends string = string,
  ThemeKey extends string = string,
>(
  options: SharedHighlighterManagerOptions<LangKey, ThemeKey>,
): SharedHighlighterManager {
  const warnings = options.warnings ?? true;
  const resolveLanguage = createCachedLanguageResolver(
    options.languageLoaders as Record<string, LanguageLoader>,
  );
  const resolveTheme = createCachedThemeResolver(
    options.themeLoaders as Record<string, ThemeLoader>,
  );

  let highlighterPromise: Promise<ShikiInternal<never, never>> | null = null;

  async function resolveLanguageForPreload(lang: string) {
    const languages = await Promise.resolve(resolveLanguage(lang));
    if (!languages || languages.length === 0) {
      throw new Error(
        `[@cmshiki/shiki] Failed to preload language "${lang}". ` +
          'Please check your languageLoaders map.',
      );
    }
    return languages;
  }

  async function resolveThemeForPreload(theme: string) {
    const themeInput = await Promise.resolve(resolveTheme(theme));
    if (!themeInput) {
      throw new Error(
        `[@cmshiki/shiki] Failed to preload theme "${theme}". ` +
          'Please check your themeLoaders map.',
      );
    }
    return themeInput;
  }

  async function getHighlighter() {
    if (!highlighterPromise) {
      highlighterPromise = (async () => {
        const preloadLanguage =
          options.preloadLanguage ||
          (Object.keys(options.languageLoaders)[0] as LangKey | undefined);
        if (!preloadLanguage) {
          throw new Error(
            '[@cmshiki/shiki] `preloadLanguage` is missing and languageLoaders is empty.',
          );
        }
        if (!options.preloadThemes || options.preloadThemes.length === 0) {
          throw new Error(
            '[@cmshiki/shiki] `preloadThemes` must contain at least one theme key.',
          );
        }

        const [preloadedLangs, preloadedThemes, engine] = await Promise.all([
          resolveLanguageForPreload(String(preloadLanguage)),
          Promise.all(
            options.preloadThemes.map((themeKey) =>
              resolveThemeForPreload(String(themeKey)),
            ),
          ),
          resolveEngine(options.engine, warnings),
        ]);

        return createHighlighterCore({
          langs: preloadedLangs,
          themes: preloadedThemes,
          langAlias: options.langAlias,
          warnings,
          engine,
        });
      })();
    }

    return highlighterPromise;
  }

  return {
    getHighlighter,
    resolveLanguage,
    resolveTheme,
  };
}
