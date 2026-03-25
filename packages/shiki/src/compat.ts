const CRITICAL_HIGH_LIGHTER_METHODS = ['getLanguage', 'getTheme', 'setTheme'];
const OPTIONAL_SYNC_METHODS = ['loadLanguage', 'loadTheme'];

export function assertCompatibleHighlighter(
  highlighter: unknown,
  source: '@cmshiki/shiki' | '@cmshiki/shiki/core',
  warnings = true,
  enabled = true,
): asserts highlighter is Record<string, any> {
  if (!enabled) return;

  if (!highlighter || typeof highlighter !== 'object') {
    throw new Error(
      `${source} Incompatible highlighter instance. ` +
        'Expected an object created by `createHighlighter` or `createHighlighterCore` from shiki.',
    );
  }

  const value = highlighter as Record<string, any>;
  const missingCritical = CRITICAL_HIGH_LIGHTER_METHODS.filter(
    (method) => typeof value[method] !== 'function',
  );
  if (missingCritical.length > 0) {
    throw new Error(
      `${source} Incompatible highlighter instance. Missing critical methods: ${missingCritical.join(
        ', ',
      )}. ` +
        'Please use Shiki v3+ and pass a highlighter created by `createHighlighter` or `createHighlighterCore`.',
    );
  }

  const missingOptional = OPTIONAL_SYNC_METHODS.filter(
    (method) => typeof value[method] !== 'function',
  );
  if (missingOptional.length > 0 && warnings) {
    console.warn(
      `${source} Shared highlighter misses optional sync methods: ${missingOptional.join(
        ', ',
      )}. Runtime language/theme sync may be partial.`,
    );
  }
}

export function getVersionGuardHint(error: unknown): string | undefined {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  if (!message) return undefined;

  if (
    /Resolver\.getInjections/i.test(message) ||
    /Cannot read properties of undefined \(reading ['"]split['"]\)/i.test(
      message,
    )
  ) {
    return (
      'Likely Shiki asset version mismatch. Keep `shiki`, `@shikijs/langs`, and `@shikijs/themes` on the same major version, ' +
      'or use bundled loaders from `shiki`.'
    );
  }

  if (/Invalid flags supplied to RegExp constructor/i.test(message)) {
    return (
      'The current runtime does not support advanced RegExp flags. ' +
      'Use `engine: { type: "javascript", options: { target: "ES2018" } }` or upgrade runtime.'
    );
  }

  return undefined;
}
