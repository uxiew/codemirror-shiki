import { describe, expect, it, vi } from 'vitest';
import { initShiki } from '../src/init';

describe('initShiki resolvers', () => {
  it('should use resolveLanguage and resolveTheme when bundled entries are missing', async () => {
    const resolveLanguage = vi.fn(async (lang: string) => {
      if (lang !== 'custom-js') return undefined;
      const { bundledLanguages } = await import('shiki');
      const mod = await bundledLanguages.javascript();
      return mod.default || mod;
    });

    const resolveTheme = vi.fn(async (theme: string) => {
      if (theme === 'custom-dark') {
        const { bundledThemes } = await import('shiki');
        const mod = await bundledThemes['github-dark']();
        return mod.default || mod;
      }
      if (theme === 'custom-light') {
        const { bundledThemes } = await import('shiki');
        const mod = await bundledThemes['github-light']();
        return mod.default || mod;
      }
      return undefined;
    });

    const highlighter = await initShiki({
      lang: 'custom-js',
      themes: {
        dark: 'custom-dark',
        light: 'custom-light',
      },
      defaultColor: 'dark',
      resolveLanguage,
      resolveTheme,
      warnings: true,
      themeStyle: 'cm',
      engine: 'javascript',
    } as any);

    expect(resolveLanguage).toHaveBeenCalledWith('custom-js');
    expect(resolveTheme).toHaveBeenCalledWith('custom-dark');
    expect(resolveTheme).toHaveBeenCalledWith('custom-light');
    expect(highlighter.getTheme('github-dark')).toBeTruthy();
  });
});
