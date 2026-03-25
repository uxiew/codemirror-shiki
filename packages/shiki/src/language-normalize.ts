import type { LanguageInput } from './types/shiki.types';

export type RuntimeLanguageInput = string | LanguageInput;

function pushNormalized(value: unknown, output: RuntimeLanguageInput[]): void {
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
 * Normalize unknown language inputs to runtime-supported values.
 * Supports string/object and nested array forms.
 */
export function normalizeRuntimeLangs(value: unknown): RuntimeLanguageInput[] {
  const output: RuntimeLanguageInput[] = [];
  pushNormalized(value, output);
  return output;
}

/**
 * Pick the primary language from normalized runtime language inputs.
 */
export function getPrimaryRuntimeLang(
  value: unknown,
): RuntimeLanguageInput | undefined {
  return normalizeRuntimeLangs(value)[0];
}

/**
 * Human-readable language label for logs/debugging.
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
    return 'custom-language';
  }
  if (Array.isArray(value)) {
    const labels = normalizeRuntimeLangs(value).map(getRuntimeLangLabel);
    return labels.join(', ') || 'unknown-language';
  }
  return 'unknown-language';
}
