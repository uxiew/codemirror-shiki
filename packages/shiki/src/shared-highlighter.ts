import type { Options } from './types/types';
import type { LanguageInput } from './types/shiki.types';
import {
  getRuntimeLangLabel,
  normalizeRuntimeLangs,
} from './language-normalize';
import { getVersionGuardHint } from './compat';

type ShikiOptions = Omit<Options, 'theme' | 'themeStyle'>;

async function isLanguageReady(
  highlighter: any,
  languageName: string,
): Promise<boolean> {
  if (typeof highlighter.getLanguage !== 'function') {
    return false;
  }
  try {
    const maybeLanguage = await Promise.resolve(
      highlighter.getLanguage(languageName),
    );
    return Boolean(maybeLanguage);
  } catch {
    return false;
  }
}

/**
 * 动态加载语言
 * @param options
 * @param highlighter
 * @param languageName
 * @returns
 */
async function loadResolvedLanguages(
  options: ShikiOptions,
  highlighter: any,
  languageName: string,
): Promise<boolean> {
  if (!options.resolveLang || typeof highlighter.loadLanguage !== 'function') {
    return false;
  }

  const resolved = await Promise.resolve(options.resolveLang(languageName));
  const languageObjects = normalizeRuntimeLangs(resolved).filter(
    (lang): lang is LanguageInput => typeof lang !== 'string',
  );
  if (languageObjects.length === 0) {
    return false;
  }

  await Promise.resolve(highlighter.loadLanguage(...languageObjects));
  return true;
}

async function loadResolvedTheme(
  options: ShikiOptions,
  highlighter: any,
  themeName: string,
): Promise<boolean> {
  if (!options.resolveTheme || typeof highlighter.loadTheme !== 'function') {
    return false;
  }
  const resolved = await Promise.resolve(options.resolveTheme(themeName));
  if (!resolved) return false;
  await Promise.resolve(highlighter.loadTheme(resolved));
  return true;
}

export async function syncSharedHighlighter(options: ShikiOptions) {
  const highlighter = options.highlighter as any;
  const tasks: Promise<unknown>[] = [];

  // For shared highlighter instances, eagerly load runtime lang/theme updates.
  if (options.lang && typeof highlighter.loadLanguage === 'function') {
    const runtimeLangs = normalizeRuntimeLangs(options.lang);
    const languageObjects = runtimeLangs.filter(
      (lang) => typeof lang !== 'string',
    );
    const languageNames = runtimeLanguages.filter(
      (lang): lang is string => typeof lang === 'string',
    );

    if (languageObjects.length > 0) {
      tasks.push(
        Promise.resolve(highlighter.loadLanguage(...languageObjects)).catch(
          (error) => {
            if (options.warnings) {
              console.warn(
                `[@cmshiki/shiki] Failed to load language objects on shared highlighter: ${languageObjects
                  .map((lang) => getRuntimeLangLabel(lang))
                  .join(', ')}`,
                error,
              );
            }
          },
        ),
      );
    }

    for (const languageName of languageNames) {
      tasks.push(
        (async () => {
          if (await isLanguageReady(highlighter, languageName)) {
            return;
          }

          try {
            await Promise.resolve(highlighter.loadLanguage(languageName));
          } catch (error) {
            // If it becomes available after the failed load call, treat it as non-fatal.
            if (await isLanguageReady(highlighter, languageName)) {
              return;
            }
            try {
              const resolved = await loadResolvedLanguages(
                options,
                highlighter,
                languageName,
              );
              if (resolved) return;
            } catch (resolveError) {
              if (options.warnings) {
                const hint = getVersionGuardHint(resolveError);
                console.warn(
                  `[@cmshiki/shiki] Failed to resolve language on shared highlighter: ${languageName}`,
                  resolveError,
                );
                if (hint) {
                  console.warn(`[@cmshiki/shiki] ${hint}`);
                }
              }
            }
            if (options.warnings) {
              const hint = getVersionGuardHint(error);
              console.warn(
                `[@cmshiki/shiki] Failed to load language on shared highlighter: ${languageName}`,
                error,
              );
              if (hint) {
                console.warn(`[@cmshiki/shiki] ${hint}`);
              }
            }
          }
        })(),
      );
    }
  }

  if (options.themes && typeof highlighter.loadTheme === 'function') {
    for (const themeValue of Object.values(options.themes)) {
      tasks.push(
        Promise.resolve(highlighter.loadTheme(themeValue as any)).catch(
          async (error) => {
            const themeName = String(
              typeof themeValue === 'string'
                ? themeValue
                : (themeValue as any)?.name || 'custom-theme',
            );
            try {
              if (typeof themeValue === 'string') {
                const resolved = await loadResolvedTheme(
                  options,
                  highlighter,
                  themeValue,
                );
                if (resolved) return;
              }
            } catch (resolveError) {
              if (options.warnings) {
                const hint = getVersionGuardHint(resolveError);
                console.warn(
                  `[@cmshiki/shiki] Failed to resolve theme on shared highlighter: ${themeName}`,
                  resolveError,
                );
                if (hint) {
                  console.warn(`[@cmshiki/shiki] ${hint}`);
                }
              }
            }
            if (options.warnings) {
              const hint = getVersionGuardHint(error);
              console.warn(
                `[@cmshiki/shiki] Failed to load theme on shared highlighter: ${themeName}`,
                error,
              );
              if (hint) {
                console.warn(`[@cmshiki/shiki] ${hint}`);
              }
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
