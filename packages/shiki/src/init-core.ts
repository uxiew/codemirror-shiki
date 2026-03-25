import type { Options } from './types/types';
import { assertCompatibleHighlighter } from './compat';

type ShikiOptions = Omit<Options, 'theme' | 'themeStyle'>;

function warnIgnoredResolvers(options: ShikiOptions) {
  if (!options.warnings) return;
  if (!options.resolveLanguage && !options.resolveTheme) return;

  console.warn(
    '[@cmshiki/shiki/core] `resolveLanguage/resolveTheme` are ignored when `highlighter` is provided. ' +
      'Use `createSharedHighlighterManager().getHighlighter(lang)` for dynamic language loading.',
  );
}

/**
 * Core-only initializer.
 *
 * This path intentionally avoids importing `shiki` bundled registries,
 * so consumers can control language/theme bundling with `shiki/core`.
 */
export async function initShikiCore(options: ShikiOptions) {
  if (!options.highlighter) {
    throw new Error(
      '[@cmshiki/shiki/core] `highlighter` is required. ' +
        'Create it with `createHighlighterCore` and explicit langs/themes to enable fine-grained bundling.',
    );
  }

  assertCompatibleHighlighter(
    options.highlighter,
    '@cmshiki/shiki/core',
    options.warnings,
    options.versionGuard !== false,
  );

  warnIgnoredResolvers(options);
  return options.highlighter;
}
