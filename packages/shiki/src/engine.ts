import type { RegexEngine } from './types/shiki.types';
import type { EngineOption, JavaScriptEngineOption } from './types/types';

function isJavaScriptEngineOption(
  value: EngineOption | undefined,
): value is JavaScriptEngineOption {
  return (
    !!value &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type?: unknown }).type === 'javascript'
  );
}

/**
 * Resolve a Shiki regex engine lazily so entrypoints do not eagerly pull in
 * incompatible engine modules during import-time.
 */
export async function resolveRegexEngine(
  engineOption: EngineOption | undefined,
  defaultEngine: 'javascript' | 'oniguruma' = 'oniguruma',
): Promise<RegexEngine> {
  const resolvedEngine = engineOption ?? defaultEngine;

  if (
    resolvedEngine === 'javascript' ||
    isJavaScriptEngineOption(resolvedEngine)
  ) {
    const { createJavaScriptRegexEngine } =
      await import('shiki/engine/javascript');
    return createJavaScriptRegexEngine(
      isJavaScriptEngineOption(resolvedEngine)
        ? resolvedEngine.options
        : undefined,
    );
  }

  if (resolvedEngine === 'oniguruma') {
    const { createOnigurumaEngine } = await import('shiki/engine/oniguruma');
    return createOnigurumaEngine(import('shiki/wasm'));
  }

  return Promise.resolve(resolvedEngine);
}
