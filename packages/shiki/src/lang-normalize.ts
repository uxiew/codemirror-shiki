import type { LanguageInput } from './types/shiki.types';

export type RuntimeLangInput = string | LanguageInput;

function pushNormalized(value: unknown, output: RuntimeLangInput[]): void {
  if (value == null) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      pushNormalized(item, output);
    }
    return;
  }

  if (typeof value === 'string') {
    output.push(value);
    return;
  }

  if (typeof value === 'object') {
    output.push(value as LanguageInput);
  }
}

/**
 * Normalize unknown lang inputs to runtime-supported values.
 * Supports string/object and nested array forms.
 */
export function normalizeRuntimeLangs(value: unknown): RuntimeLangInput[] {
  const output: RuntimeLangInput[] = [];
  pushNormalized(value, output);
  return output;
}

/**
 * Pick the primary lang from normalized runtime lang inputs.
 */
export function getPrimaryRuntimeLang(
  value: unknown,
): RuntimeLangInput | undefined {
  return normalizeRuntimeLangs(value)[0];
}

/**
 * Human-readable lang label for logs/debugging.
 */
export function getRuntimeLangLabel(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const name = (value as any).name;
    if (typeof name === 'string' && name.length > 0) return name;
    const scopeName = (value as any).scopeName;
    if (typeof scopeName === 'string' && scopeName.length > 0) {
      return scopeName;
    }
    return 'custom-lang';
  }
  if (Array.isArray(value)) {
    const labels = normalizeRuntimeLangs(value).map(getRuntimeLangLabel);
    return labels.join(', ') || 'unknown-lang';
  }
  return 'unknown-lang';
}

/**
 * Get the unique lang ID from normalized runtime lang inputs.
 */
export function getPrimaryRuntimeLangId(value: unknown): string | undefined {
  const primary = getPrimaryRuntimeLang(value);
  if (!primary) return undefined;
  if (typeof primary === 'string') return primary;
  return (primary as any).name || (primary as any).scopeName || 'custom-lang';
}
