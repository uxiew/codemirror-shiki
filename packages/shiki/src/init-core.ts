import type { Options } from './types/types';
import { syncSharedHighlighter } from './shared-highlighter';
import { assertCompatibleHighlighter } from './compat';

type ShikiOptions = Omit<Options, 'theme' | 'themeStyle'>;

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

  return syncSharedHighlighter(options);
}
