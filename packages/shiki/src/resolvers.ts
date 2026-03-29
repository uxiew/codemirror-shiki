import type {
  Awaitable,
  MaybeModule,
  BundledLanguage,
  BundledTheme,
  ThemeRegistrationAny,
  LanguageRegistration,
  ThemeInput,
  LanguageInput,
  MaybeArray,
  StringLiteralUnion,
} from './types/shiki.types';

export type LangModule = Awaitable<
  MaybeModule<MaybeArray<LanguageRegistration>>
>;
export type ThemeModule = Awaitable<MaybeModule<ThemeRegistrationAny>>;

// export type LangLoader = () => LangMoudle;
export type LangLoader = () => Awaitable<
  MaybeModule<MaybeArray<LanguageRegistration>>
>;

export type ThemeLoader = () => Awaitable<ThemeInput>;

function unwrapModuleDefault<T>(value: MaybeModule<T>): T {
  if (
    value &&
    typeof value === 'object' &&
    'default' in (value as Record<string, unknown>) &&
    (value as Record<string, unknown>).default !== undefined
  ) {
    return (value as { default: T }).default;
  }

  return value as T;
}

export interface LangResolver<
  TKeys extends string = StringLiteralUnion<BundledLanguage>,
> {
  /** Returns a lang loader for the given lang key. */
  (lang: TKeys): Promise<MaybeArray<LanguageRegistration> | undefined>;
  /** Returns all the language inputs registered in this resolver. */
  of: (lang?: StringLiteralUnion<TKeys>) => LanguageInput[];
  loaders: Record<TKeys, LangLoader>;
}

/**
 * Create a lang resolver from dynamic import.
 *
 * @example
 * const resolveLang = createLangResolver({
 *   javascript: () => import('@shikijs/langs/javascript'),
 *   json: () => import('@shikijs/langs/json'),
 * })
 *
 * // Access the loaders directly
 * resolveLang.loaders.javascript
 */
export function createLangResolver<TKeys extends BundledLanguage>(
  loaders: Record<TKeys, LangLoader>,
): LangResolver<TKeys> {
  const lookup = new Map<string, LangLoader>();
  (Object.keys(loaders) as TKeys[]).forEach((key) => {
    lookup.set(key, loaders[key]);
  });

  const resolver = async (lang: TKeys) => {
    const loader = lookup.get(lang);
    if (!loader) return undefined;

    const loaded = await loader();
    return unwrapModuleDefault(loaded);
  };
  resolver.of = (lang?: TKeys) =>
    lang
      ? [loaders[lang]]
      : Object.values<LangLoader>(loaders).map((loader) => loader);
  resolver.loaders = loaders;
  return resolver as unknown as LangResolver<TKeys>;
}

export interface ThemeResolver<
  TKeys extends string = StringLiteralUnion<BundledTheme>,
> {
  /** Returns a theme loader for the given theme key. */
  (theme: TKeys): Promise<ThemeInput | undefined>;
  /** Returns all the theme inputs registered in this resolver. */
  of: (theme?: StringLiteralUnion<TKeys>) => ThemeInput[];
  loaders: Record<TKeys, ThemeLoader>;
}

/**
 * Create a theme resolver from dynamic import.
 *
 * @example
 * const resolveTheme = createThemeResolver({
 *   'github-dark': () => import('@shikijs/themes/github-dark'),
 *   'github-light': () => import('@shikijs/themes/github-light'),
 * })
 */
export function createThemeResolver<TKeys extends BundledTheme>(
  loaders: Record<TKeys, ThemeLoader>,
): ThemeResolver<TKeys> {
  const lookup = new Map<string, ThemeLoader>();
  (Object.keys(loaders) as TKeys[]).forEach((key) => {
    lookup.set(key, loaders[key]);
  });

  const resolver = async (theme: TKeys) => {
    const loader = lookup.get(theme);
    if (!loader) return undefined;

    const loaded = await loader();
    return unwrapModuleDefault(loaded as MaybeModule<ThemeInput>);
  };
  resolver.of = (theme?: TKeys) =>
    theme
      ? [loaders[theme]]
      : Object.values<ThemeLoader>(loaders).map((loader) => loader);
  resolver.loaders = loaders;
  return resolver as unknown as ThemeResolver<TKeys>;
}
