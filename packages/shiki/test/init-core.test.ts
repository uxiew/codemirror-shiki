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

  it('should return provided highlighter as-is', async () => {
    const loadLanguage = vi.fn(async () => {});
    const loadTheme = vi.fn(async () => {});
    const highlighter = {
      loadLanguage,
      loadTheme,
      getLanguage: vi.fn(() => undefined),
      getTheme: vi.fn(() => ({ fg: '#fff', bg: '#000' })),
      setTheme: vi.fn(() => ({ colorMap: ['#000', '#fff'] })),
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
    expect(loadLanguage).not.toHaveBeenCalled();
    expect(loadTheme).not.toHaveBeenCalled();
  });

  it('should warn when resolveLang/resolveTheme are passed with shared highlighter', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const highlighter = {
      getLanguage: vi.fn(() => undefined),
      getTheme: vi.fn(() => ({ fg: '#fff', bg: '#000' })),
      setTheme: vi.fn(() => ({ colorMap: ['#000', '#fff'] })),
    };

    const result = await initShikiCore({
      highlighter: highlighter as any,
      lang: 'typescript',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      resolveLang: async () => ({ name: 'typescript' }) as any,
      resolveTheme: async () => ({ name: 'github-dark' }) as any,
      warnings: true,
    } as any);

    expect(result).toBe(highlighter);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('resolveLang/resolveTheme'),
    );
    warn.mockRestore();
  });

  it('should fail fast for incompatible shared highlighter by default', async () => {
    const invalidHighlighter = {
      loadLanguage: vi.fn(async () => {}),
      loadTheme: vi.fn(async () => {}),
    };

    await expect(
      initShikiCore({
        highlighter: invalidHighlighter as any,
        lang: 'typescript',
        themes: { light: 'github-light', dark: 'github-dark' },
        warnings: true,
      } as any),
    ).rejects.toThrow(/Incompatible highlighter instance/i);
  });

  it('should allow skipping version guard explicitly', async () => {
    const loadLanguage = vi.fn(async () => {});
    const loadTheme = vi.fn(async () => {});
    const highlighter = {
      loadLanguage,
      loadTheme,
      getLanguage: vi.fn(() => undefined),
      getTheme: vi.fn(() => ({ fg: '#fff', bg: '#000' })),
      setTheme: vi.fn(() => ({ colorMap: ['#000', '#fff'] })),
    };

    const result = await initShikiCore({
      highlighter: highlighter as any,
      lang: 'typescript',
      themes: { light: 'github-light', dark: 'github-dark' },
      warnings: true,
      versionGuard: false,
    } as any);

    expect(result).toBe(highlighter);
    expect(loadLanguage).not.toHaveBeenCalled();
    expect(loadTheme).not.toHaveBeenCalled();
  });
});
