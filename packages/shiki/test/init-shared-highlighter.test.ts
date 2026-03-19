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

  it('should skip string language loading when language is already ready', async () => {
    const loadLanguage = vi.fn(async () => {
      throw new Error('should not be called');
    });
    const loadTheme = vi.fn(async () => {});
    const getLanguage = vi.fn((lang: string) =>
      lang === 'javascript' ? { scopeName: 'source.js' } : undefined,
    );
    const highlighter = {
      loadLanguage,
      loadTheme,
      getLanguage,
    };

    const result = await initShiki({
      highlighter: highlighter as any,
      lang: 'javascript',
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
    expect(loadLanguage).not.toHaveBeenCalled();
    expect(loadTheme).toHaveBeenCalledTimes(2);
  });

  it('should continue when string language loading fails', async () => {
    const loadLanguageError = new Error('split failed');
    const loadLanguage = vi.fn(async () => {
      throw loadLanguageError;
    });
    const loadTheme = vi.fn(async () => {});
    const getLanguage = vi.fn(() => {
      throw new Error('language not found');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const highlighter = {
      loadLanguage,
      loadTheme,
      getLanguage,
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
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to load language on shared highlighter: dart',
      ),
      loadLanguageError,
    );

    warn.mockRestore();
  });
});
