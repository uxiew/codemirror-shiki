import type { LanguageInput, ThemeInput, Awaitable } from './types/shiki.types';
import { normalizeRuntimeLanguages } from './language-normalize';

type MaybeDefault<T> = T | { default: T };

export type LanguageLoader = () => Awaitable<
  MaybeDefault<LanguageInput | ReadonlyArray<LanguageInput>>
>;

export type ThemeLoader = () => Awaitable<MaybeDefault<ThemeInput>>;

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
export function createCachedThemeResolver(loaders: Record<string, ThemeLoader>) {
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
