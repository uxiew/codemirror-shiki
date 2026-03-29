import { describe, expect, it, vi } from 'vitest';

import { initShiki } from '../src/init';

describe('initShiki: shared highlighter passthrough', () => {
  it('should throw when highlighter is missing', async () => {
    await expect(
      initShiki({
        lang: 'typescript',
        themes: { light: 'github-light', dark: 'github-dark' },
        warnings: true,
      } as any),
    ).rejects.toThrow(/`highlighter` is required/i);
  });

  it('should return provided highlighter without syncing language/theme', async () => {
    const loadLanguage = vi.fn(async () => {});
    const loadTheme = vi.fn(async () => {});
    const highlighter = {
      loadLanguage,
      loadTheme,
      getLanguage: vi.fn(() => undefined),
      getTheme: vi.fn(() => ({ fg: '#fff', bg: '#000' })),
      setTheme: vi.fn(() => ({ colorMap: ['#000', '#fff'] })),
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
    expect(loadLanguage).not.toHaveBeenCalled();
    expect(loadTheme).not.toHaveBeenCalled();
  });

  it('should still fail fast for incompatible highlighter by default', async () => {
    const invalidHighlighter = {
      loadLanguage: vi.fn(async () => {}),
      loadTheme: vi.fn(async () => {}),
    };

    await expect(
      initShiki({
        highlighter: invalidHighlighter as any,
        lang: 'typescript',
        themes: { light: 'github-light', dark: 'github-dark' },
        warnings: true,
      } as any),
    ).rejects.toThrow(/Incompatible highlighter instance/i);
  });

  it('should allow skipping version guard explicitly', async () => {
    const highlighter = {
      loadLanguage: vi.fn(async () => {}),
      loadTheme: vi.fn(async () => {}),
    };

    const result = await initShiki({
      highlighter: highlighter as any,
      lang: 'typescript',
      themes: { light: 'github-light', dark: 'github-dark' },
      warnings: true,
      versionGuard: false,
    } as any);

    expect(result).toBe(highlighter);
  });
});
