import { describe, expect, it, vi } from 'vitest';

import { initShiki } from '../src/init';

describe('initShiki: shared highlighter sync', () => {
  it('should load runtime language and themes on shared highlighter', async () => {
    const loadLanguage = vi.fn(async () => {});
    const loadTheme = vi.fn(async () => {});
    const highlighter = {
      loadLanguage,
      loadTheme,
    };

    const result = await initShiki({
      highlighter: highlighter as any,
      lang: 'dart',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'dark',
      warnings: true,
      themeStyle: 'cm',
      includeExplanation: false,
      tokenizeMaxLineLength: 20000,
      tokenizeTimeLimit: 500,
    } as any);

    expect(result).toBe(highlighter);
    expect(loadLanguage).toHaveBeenCalledWith('dart');
    expect(loadTheme).toHaveBeenCalledTimes(2);
    expect(loadTheme).toHaveBeenCalledWith('github-light');
    expect(loadTheme).toHaveBeenCalledWith('github-dark');
  });
});
