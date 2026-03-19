import type { Options } from './types/types';
import {
  getRuntimeLanguageLabel,
  normalizeRuntimeLanguages,
} from './language-normalize';

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

export async function syncSharedHighlighter(options: ShikiOptions) {
  const highlighter = options.highlighter as any;
  const tasks: Promise<unknown>[] = [];

  // For shared highlighter instances, eagerly load runtime lang/theme updates.
  if (options.lang && typeof highlighter.loadLanguage === 'function') {
    const runtimeLanguages = normalizeRuntimeLanguages(options.lang);
    const languageObjects = runtimeLanguages.filter(
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
                  .map((lang) => getRuntimeLanguageLabel(lang))
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
            if (options.warnings) {
              console.warn(
                `[@cmshiki/shiki] Failed to load language on shared highlighter: ${languageName}`,
                error,
              );
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
