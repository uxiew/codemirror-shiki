import { describe, expect, it, vi } from 'vitest';

import { initShikiCore } from '../src/init-core';

describe('initShikiCore', () => {
  it('should throw when highlighter is missing', async () => {
    await expect(
      initShikiCore({
        lang: 'typescript',
        themes: { light: 'github-light', dark: 'github-dark' },
      } as any),
    ).rejects.toThrow(/`highlighter` is required/i);
  });

  it('should sync language/theme on shared highlighter', async () => {
    const loadLanguage = vi.fn(async () => {});
    const loadTheme = vi.fn(async () => {});
    const highlighter = {
      loadLanguage,
      loadTheme,
    };

    const result = await initShikiCore({
      highlighter: highlighter as any,
      lang: 'typescript',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      warnings: true,
    } as any);

    expect(result).toBe(highlighter);
    expect(loadLanguage).toHaveBeenCalledWith('typescript');
    expect(loadTheme).toHaveBeenCalledTimes(2);
  });

  it('should normalize array language inputs on shared highlighter', async () => {
    const loadLanguage = vi.fn(async () => {});
    const loadTheme = vi.fn(async () => {});
    const highlighter = {
      loadLanguage,
      loadTheme,
    };

    const jsLang = { name: 'javascript' } as any;
    const tsLang = { name: 'typescript' } as any;

    const result = await initShikiCore({
      highlighter: highlighter as any,
      lang: [jsLang, tsLang] as any,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      warnings: true,
    } as any);

    expect(result).toBe(highlighter);
    expect(loadLanguage).toHaveBeenCalledWith(jsLang, tsLang);
    expect(loadTheme).toHaveBeenCalledTimes(2);
  });
});
