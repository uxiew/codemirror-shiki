import type { LanguageInput, ThemeInput, Awaitable } from './types/shiki.types';
import { normalizeRuntimeLangs } from './language-normalize';
import type { ShikiInternal } from './types/shiki.types';
import { createHighlighterCore } from 'shiki/core';
import type { EngineOption } from './types/types';
import { resolveRegexEngine } from './engine';

type MaybeDefault<T> = T | { default: T };

export type LangLoader = () => Awaitable<
  MaybeDefault<LanguageInput | ReadonlyArray<LanguageInput>>
>;

export type ThemeLoader = () => Awaitable<MaybeDefault<ThemeInput>>;

export type RuntimeEngineOption = EngineOption;

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
 * const resolveLang = createCachedLangResolver({
 *   javascript: () => import('@shikijs/langs/javascript'),
 *   json: () => import('@shikijs/langs/json'),
 * })
 */
export function createCachedLangResolver(loaders: Record<string, LangLoader>) {
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
          return normalizeRuntimeLangs(unwrapped as any).filter(
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
  /**
   * Preferred field name.
   */
  langLoaders?: Record<LangKey, LangLoader>;
  themeLoaders: Record<ThemeKey, ThemeLoader>;
  /**
   * Regex engine used by the shared highlighter.
   *
   * This is intentionally required to align the fine-grained helper API with
   * `shiki/core`, where callers explicitly control the engine/runtime tradeoff.
   */
  engine: RuntimeEngineOption;
  preloadLangs?: LangKey;
  preloadThemes: readonly ThemeKey[];
  langAlias?: Record<string, string>;
  warnings?: boolean;
}

export interface SharedHighlighterManager {
  /**
   * Get a highlighter instance.
   * - no arg: return shared/preloaded instance
   * - with lang: return language-scoped cached instance
   */
  getHighlighter: (lang?: string) => Promise<ShikiInternal<never, never>>;
  resolveLang: ReturnType<typeof createCachedLangResolver>;
  resolveTheme: ReturnType<typeof createCachedThemeResolver>;
}

/**
 * Create a shared highlighter manager for fine-grained bundling.
 *
 * It encapsulates:
 * - cached language/theme resolvers
 * - one shared highlighter promise (`getHighlighter`)
 * - shared highlighter initialization for fine-grained bundling
 */
export function createHighlighterManager<
  LangKey extends string = string,
  ThemeKey extends string = string,
>(
  options: SharedHighlighterManagerOptions<LangKey, ThemeKey>,
): SharedHighlighterManager {
  const warnings = options.warnings ?? true;
  const langLoaders = options.langLoaders || ({} as any);

  const resolveLang = createCachedLangResolver(
    langLoaders as Record<string, LangLoader>,
  );
  const resolveTheme = createCachedThemeResolver(
    options.themeLoaders as Record<string, ThemeLoader>,
  );

  let sharedHighlighterPromise: Promise<ShikiInternal<never, never>> | null =
    null;
  const perLanguageHighlighterCache = new Map<
    string,
    Promise<ShikiInternal<never, never>>
  >();
  const resolvedThemesPromise = Promise.all(
    options.preloadThemes.map((themeKey) =>
      resolveThemeForPreload(String(themeKey)),
    ),
  );
  const resolvedEnginePromise = resolveRegexEngine(options.engine);

  async function resolveLangForPreload(lang: string) {
    const languages = await Promise.resolve(resolveLang(lang));
    if (!languages || languages.length === 0) {
      throw new Error(
        `[@cmshiki/shiki] Failed to preload language "${lang}". ` +
          'Please check your langLoaders map.',
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

  async function createHighlighterForLang(lang: string) {
    const [langs, themes, engine] = await Promise.all([
      resolveLangForPreload(lang),
      resolvedThemesPromise,
      resolvedEnginePromise,
    ]);

    return createHighlighterCore({
      langs,
      themes,
      langAlias: options.langAlias,
      engine,
      warnings,
    });
  }

  async function getSharedHighlighter() {
    if (!sharedHighlighterPromise) {
      sharedHighlighterPromise = (async () => {
        const preloadLanguage =
          options.preloadLangs ||
          (Object.keys(langLoaders)[0] as LangKey | undefined);
        if (!preloadLanguage || String(preloadLanguage).trim().length === 0) {
          throw new Error(
            '[@cmshiki/shiki] `preloadLangs` is missing and langLoaders is empty.',
          );
        }
        if (!options.preloadThemes || options.preloadThemes.length === 0) {
          throw new Error(
            '[@cmshiki/shiki] `preloadThemes` must contain at least one theme key.',
          );
        }
        if (!options.engine) {
          throw new Error(
            '[@cmshiki/shiki] `engine` is required in createSharedHighlighterManager().',
          );
        }
        return createHighlighterForLang(String(preloadLanguage));
      })();
    }

    return sharedHighlighterPromise;
  }

  async function getHighlighter(lang?: string) {
    const key = String(lang || '')
      .trim()
      .toLowerCase();
    if (!key) return getSharedHighlighter();

    if (!perLanguageHighlighterCache.has(key)) {
      perLanguageHighlighterCache.set(key, createHighlighterForLang(key));
    }
    return perLanguageHighlighterCache.get(key)!;
  }

  return {
    getHighlighter,
    resolveLang,
    resolveTheme,
  };
}
